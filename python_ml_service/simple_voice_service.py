#!/usr/bin/env python3
"""
Simple Ghana Voice Recognition Service
Simplified version without problematic C++ dependencies
"""

import os
import json
import tempfile
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import speech_recognition as sr
from pydub import AudioSegment
import io

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Ghana-specific pronunciation mappings
GHANA_PRONUNCIATIONS = {
    'cut': 'cart',
    'card': 'cart',
    'cards': 'cart', 
    'cat': 'cart',
    'cats': 'cart',
    'carre': 'cart',
    'vieux': 'view',
    'sho': 'show', 
    'gins': 'jeans',
    'sneekas': 'sneakers',
    'chekout': 'checkout',
    'profil': 'profile',
    'hom': 'home',
    'serch': 'search',
    'find': 'find',
    'ad': 'add',
    'remov': 'remove',
    'clea': 'clear',
    'go': 'go',
    'naviget': 'navigate',
    'bak': 'back',
    'nex': 'next',
    'plas': 'place',
    'orda': 'order',
    'pai': 'pay',
    'chek': 'check'
}

def normalize_ghana_accent(text):
    """Normalize Ghana accent pronunciations"""
    if not text:
        return text
    
    # First handle the full text for common phrase replacements
    text_lower = text.lower()
    
    # Handle common cart-related phrases first
    if 'to cats' in text_lower:
        text = text.replace('to cats', 'to cart').replace('to Cats', 'to cart')
    if 'to cat' in text_lower:
        text = text.replace('to cat', 'to cart').replace('to Cat', 'to cart')
    if 'to cut' in text_lower:
        text = text.replace('to cut', 'to cart').replace('to Cut', 'to cart')
    
    # Now handle individual words
    words = text.split()
    normalized_words = []
    
    for word in words:
        # Remove punctuation for matching
        clean_word = word.lower().strip('.,!?;:')
        
        # Check for Ghana pronunciation mappings
        if clean_word in GHANA_PRONUNCIATIONS:
            # Preserve original capitalization if it was capitalized
            if word[0].isupper() and len(word) > 1:
                normalized_words.append(GHANA_PRONUNCIATIONS[clean_word].capitalize())
            else:
                normalized_words.append(GHANA_PRONUNCIATIONS[clean_word])
        else:
            normalized_words.append(word)
    
    return ' '.join(normalized_words)

def parse_voice_command(text):
    """Parse voice command into actionable intent"""
    if not text:
        return {"type": "unknown", "confidence": 0.0}
    
    # First normalize Ghana accent pronunciations
    original_text = text
    text = normalize_ghana_accent(text)
    logger.info(f"🔄 Normalized '{original_text}' → '{text}'")
    text = text.lower().strip()
    
    # Navigation commands
    if any(word in text for word in ['go to', 'navigate', 'open', 'show', 'view']):
        if any(word in text for word in ['home', 'main']):
            return {"type": "navigate", "screen": "home", "confidence": 0.9}
        elif any(word in text for word in ['cart', 'basket', 'shopping']):
            return {"type": "navigate", "screen": "cart", "confidence": 0.9}
        elif any(word in text for word in ['profile', 'account']):
            return {"type": "navigate", "screen": "profile", "confidence": 0.9}
        elif any(word in text for word in ['catalog', 'products', 'shop']):
            return {"type": "navigate", "screen": "catalog", "confidence": 0.9}
    
    # Direct cart commands (without "go to" prefix)
    if any(phrase in text for phrase in ['open cart', 'view cart', 'show cart', 'cart please']):
        return {"type": "navigate", "screen": "cart", "confidence": 0.9}
    
    # Search commands
    if any(word in text for word in ['search', 'find', 'look for', 'show']):
        # Extract search query
        for trigger in ['search for', 'find', 'look for', 'show me']:
            if trigger in text:
                query = text.split(trigger, 1)[-1].strip()
                if query:
                    return {"type": "search", "query": query, "confidence": 0.8}
        
        # Fallback search
        return {"type": "search", "query": text, "confidence": 0.7}
    
    # Cart commands
    cart_triggers = ['add to cart', 'add cart', 'buy this', 'purchase this']
    has_cart_phrase = any(phrase in text for phrase in cart_triggers)
    has_add_and_cart = 'add' in text and any(word in text for word in ['cart', 'basket'])
    
    logger.info(f"🛒 Cart command check: text='{text}', has_cart_phrase={has_cart_phrase}, has_add_and_cart={has_add_and_cart}")
    
    if has_cart_phrase or has_add_and_cart:
        logger.info("✅ Detected cart command, extracting product...")
        
        # Enhanced product name extraction
        product_query = None
        
        # Pattern 1: "add [product] to cart"
        import re
        patterns = [
            r'add\s+(.+?)\s+to\s+(?:cart|basket)',
            r'buy\s+(.+?)\s+(?:now|please)?$',
            r'purchase\s+(.+?)(?:\s+now|\s+please)?$',
            r'add\s+(.+?)(?:\s+now|\s+please)?$'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                product_query = match.group(1).strip()
                # Clean up common words
                cleanup_words = ['the', 'a', 'an', 'some', 'this', 'that']
                words = product_query.split()
                words = [w for w in words if w.lower() not in cleanup_words]
                if words:
                    product_query = ' '.join(words)
                    break
        
        # Fallback: extract between 'add' and cart-related words
        if not product_query:
            for trigger in ['add', 'buy', 'purchase']:
                if trigger in text:
                    parts = text.split(trigger, 1)
                    if len(parts) > 1:
                        remaining = parts[1].strip()
                        for ending in ['to cart', 'cart', 'to basket', 'basket', 'now', 'please']:
                            remaining = remaining.replace(ending, '').strip()
                        if remaining:
                            product_query = remaining
                            break
        
        result = {"type": "add_to_cart", "confidence": 0.85}
        if product_query:
            result["product_query"] = product_query
            logger.info(f"🎯 Extracted product: '{product_query}'")
        else:
            logger.info("⚠️ No product extracted from cart command")
        
        logger.info(f"🎯 Final cart command result: {result}")
        return result
    
    if any(word in text for word in ['clear cart', 'empty cart', 'remove all', 'delete all']):
        return {"type": "clear_cart", "confidence": 0.8}
    
    # Checkout commands
    if any(phrase in text for phrase in ['checkout', 'check out', 'pay now', 'purchase', 'buy now', 'proceed to payment', 'proceed to checkout']):
        return {"type": "checkout", "confidence": 0.8}
    
    # Category browsing commands
    if any(word in text for word in ['show me', 'browse', 'view']):
        categories = ['sneakers', 'shoes', 'clothes', 'clothing', 'accessories', 'bags', 'wallets']
        for category in categories:
            if category in text:
                return {"type": "category", "category": category, "confidence": 0.85}
    
    # Default fallback
    return {"type": "unknown", "text": text, "confidence": 0.3}

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "Ghana Voice Recognition",
        "version": "1.0.0"
    })

@app.route('/process_audio', methods=['POST'])
def process_audio():
    """Process audio file and return voice command"""
    try:
        logger.info("🎤 Received audio processing request")
        
        # Check if audio file is present
        if 'audio' not in request.files:
            logger.error("❌ No audio file in request")
            return jsonify({
                "success": False,
                "error": "No audio file provided"
            }), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            logger.error("❌ Empty audio filename")
            return jsonify({
                "success": False,
                "error": "Empty audio file"
            }), 400
        
        logger.info(f"📁 Processing audio file: {audio_file.filename}")
        
        # Create temporary file for audio processing
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            # Read audio data
            audio_data = audio_file.read()
            logger.info(f"📊 Audio data size: {len(audio_data)} bytes")
            
            # Convert audio to WAV format using pydub
            try:
                # Try to load audio with pydub
                audio_segment = AudioSegment.from_file(io.BytesIO(audio_data))
                
                # Convert to WAV format
                audio_segment = audio_segment.set_frame_rate(16000).set_channels(1)
                audio_segment.export(temp_file.name, format="wav")
                
                logger.info("🔄 Audio converted to WAV format")
                
            except Exception as e:
                logger.error(f"❌ Audio conversion failed: {e}")
                # Fallback: write raw audio data
                temp_file.write(audio_data)
                temp_file.flush()
        
        # Initialize speech recognizer
        recognizer = sr.Recognizer()
        
        # Process audio file
        try:
            with sr.AudioFile(temp_file.name) as source:
                logger.info("🎧 Loading audio for recognition...")
                audio = recognizer.record(source)
                
                # Try Google Speech Recognition first
                try:
                    logger.info("🔍 Attempting Google Speech Recognition...")
                    text = recognizer.recognize_google(audio)
                    logger.info(f"✅ Google recognition successful: '{text}'")
                    
                except sr.UnknownValueError:
                    logger.warning("⚠️ Google could not understand audio")
                    text = ""
                except sr.RequestError as e:
                    logger.warning(f"⚠️ Google recognition error: {e}")
                    
                    # Fallback to offline recognition
                    try:
                        logger.info("🔍 Attempting offline recognition...")
                        text = recognizer.recognize_sphinx(audio)
                        logger.info(f"✅ Offline recognition successful: '{text}'")
                    except:
                        logger.warning("⚠️ Offline recognition also failed")
                        text = ""
        
        except Exception as e:
            logger.error(f"❌ Audio processing error: {e}")
            text = ""
        
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_file.name)
            except:
                pass
        
        # Normalize Ghana accent
        if text:
            original_text = text
            text = normalize_ghana_accent(text)
            if text != original_text:
                logger.info(f"🇬🇭 Ghana accent normalized: '{original_text}' → '{text}'")
        
        # Parse voice command
        command = parse_voice_command(text)
        
        logger.info(f"🎯 Voice command parsed: {command}")
        
        # Return results
        return jsonify({
            "success": True,
            "transcript": text,
            "command": command,
            "processing_info": {
                "audio_size_bytes": len(audio_data),
                "recognition_engine": "google" if text else "failed",
                "ghana_accent_applied": text != original_text if text else False
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/', methods=['GET'])
def root():
    """Root endpoint with service info"""
    return jsonify({
        "service": "Ghana Voice Recognition Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "/health": "Health check",
            "/process_audio": "Process audio file (POST)"
        },
        "features": [
            "Ghana accent normalization",
            "Multi-engine speech recognition",
            "Voice command parsing",
            "Audio format conversion"
        ]
    })

if __name__ == '__main__':
    print("🚀 Starting Ghana Voice ML Service...")
    print("🎤 Simple version without C++ dependencies")
    print("🌐 Service will be available at: http://localhost:5000")
    print("🇬🇭 Optimized for Ghana accents and pronunciations")
    print()
    
    # Start the Flask development server
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        threaded=True
    )

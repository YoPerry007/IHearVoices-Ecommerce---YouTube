# 🎤 IHearVoices - Ghana Voice-Activated Ecommerce App

A premium voice-activated ecommerce application built with React Native and Expo, specifically designed for the Ghana market with AI-powered voice recognition optimized for Ghanaian accents.

## 🌟 Features

- **🎤 Voice-Activated Shopping**: Add products to cart, navigate, and search using voice commands
- **🇬🇭 Ghana-Optimized**: Pronunciation mappings for Ghanaian accents ("cut" → "cart", "cats" → "cart")
- **🤖 Real AI Processing**: Google Speech Recognition with Ghana accent normalization
- **💳 Paystack Integration**: Complete payment processing with Mobile Money support (MTN MoMo, Vodafone Cash)
- **👨‍💼 Admin Panel**: Full product, order, and user management system
- **🎨 Modern UI**: Premium dark theme with Ghana-inspired colors (emerald green, amber gold)
- **📱 Real-time Cart**: Database-integrated shopping cart with live updates
- **🔐 Secure Auth**: Supabase authentication with role-based access control

## 🛠 Tech Stack

- **Frontend**: React Native with Expo SDK 53, TypeScript
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **Voice AI**: Python ML service with Google Speech Recognition
- **Payments**: Paystack (Card, Mobile Money, Bank Transfer)
- **Navigation**: React Navigation 7
- **Animations**: React Native Reanimated

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- Expo CLI (`npm install -g @expo/cli`)
- Supabase account
- Paystack account

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/ihearvoices.git
cd ihearvoices
npm install
```

### 2. Environment Setup

Create `.env` file:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Paystack Configuration
EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_test_public_key
PAYSTACK_SECRET_KEY=sk_test_your_test_secret_key
```

### 3. Database Setup

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run:

```sql
-- Copy contents from supabase/schema.sql and paste here
```

### 4. Python ML Service

```bash
cd python_ml_service
pip install -r requirements_simple.txt
python simple_voice_service.py
```

Service runs on `http://localhost:5000`

### 5. Start App

```bash
npx expo start
```

## 🎤 Voice Commands

Natural voice commands optimized for Ghanaian accents:

- **Navigation**: "Go to home", "Open cart", "Show profile"
- **Search**: "Search for sneakers", "Find leather bags"  
- **Cart**: "Add Jordan to cart", "Add leather wallets to cart"
- **Checkout**: "Checkout", "Pay now"

## 💳 Payment Testing

**Test Cards**:
- Card: 4084 0840 8408 4081
- CVV: Any 3 digits
- Expiry: Any future date

**Mobile Money**: Use Paystack test numbers

## 👨‍💼 Admin Access

1. Register account
2. In Supabase → profiles table → change `role` to `admin`
3. Restart app for admin interface

## 📁 Project Structure

```
src/
├── components/         # UI components
├── screens/           # App screens
│   ├── admin/        # Admin panel
│   └── auth/         # Authentication
├── services/         # API services
├── contexts/         # React contexts
└── constants/        # Theme & config

python_ml_service/    # Voice AI service
supabase/            # Database schema
```

## 🔧 Key Services

### Voice Recognition
- Google Speech Recognition
- Ghana accent mappings
- Real-time command parsing
- Offline Sphinx fallback

### Database
- PostgreSQL with RLS
- Real-time subscriptions  
- Secure authentication
- Role-based access

### Payments
- Paystack integration
- Mobile Money support
- Ghana Cedis (GHS)
- Secure transactions

## 🚀 Deployment

### Mobile App
```bash
npx expo build:android
npx expo build:ios
```

### ML Service
Deploy Python service to Heroku/Railway/DigitalOcean and update URL in `ExpoVoiceService.ts`

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🙏 Support

- Create GitHub issues for bugs
- Follow YouTube channel for tutorials
- Join community discussions

---


# LiveLikePerry
perrycodesy@gmail.com

**🇬🇭 Made with ❤️ for Ghana's digital commerce future**

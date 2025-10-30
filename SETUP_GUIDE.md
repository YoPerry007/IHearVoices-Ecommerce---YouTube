# 🚀 IHearVoices Setup Guide

Complete setup instructions for the Ghana Voice-Activated Ecommerce App.

## 📋 Prerequisites

- **Node.js 18+** and npm
- **Python 3.8+**
- **Expo CLI**: `npm install -g @expo/cli`
- **Supabase account**: [supabase.com](https://supabase.com)
- **Paystack account**: [paystack.com](https://paystack.com)

## 🔧 Environment Configuration

Create `.env` file in project root:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Paystack Configuration (Test Keys)
EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_test_public_key
PAYSTACK_SECRET_KEY=sk_test_your_test_secret_key
```

## 🗄️ Database Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and enter project details
4. Wait for project to be ready

### 2. Apply Database Schema
1. Go to **SQL Editor** in Supabase dashboard
2. Copy entire contents of `supabase/schema.sql`
3. Paste and click **Run**
4. Verify tables are created in **Table Editor**

### 3. Get API Keys
1. Go to **Settings** → **API**
2. Copy **Project URL** and **anon public** key
3. Add to your `.env` file

## 🎤 Python ML Service Setup

### 1. Install Dependencies
```bash
cd python_ml_service
pip install -r requirements_simple.txt
```

### 2. Start Service
```bash
python simple_voice_service.py
```

Service will run on `http://localhost:5000`

### 3. Test Service
Open browser to `http://localhost:5000/health` - should return:
```json
{
  "status": "healthy",
  "service": "Ghana Voice Recognition",
  "version": "1.0.0"
}
```

## 💳 Paystack Setup

### 1. Create Account
1. Sign up at [paystack.com](https://paystack.com)
2. Complete business verification
3. Go to **Settings** → **API Keys & Webhooks**

### 2. Get Test Keys
- **Test Public Key**: Starts with `pk_test_`
- **Test Secret Key**: Starts with `sk_test_`
- Add both to `.env` file

### 3. Test Cards
Use these for testing payments:
- **Card Number**: 4084 0840 8408 4081
- **CVV**: Any 3 digits
- **Expiry**: Any future date
- **PIN**: 0000

## 📱 Mobile App Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npx expo start
```

### 3. Run on Device
- **iOS**: Scan QR code with Camera app
- **Android**: Scan QR code with Expo Go app
- **Simulator**: Press `i` for iOS or `a` for Android

## 👨‍💼 Admin Access Setup

### 1. Register Account
1. Open app and register new account
2. Complete registration process

### 2. Grant Admin Role
1. Go to Supabase dashboard
2. Navigate to **Table Editor** → **profiles**
3. Find your user record
4. Change `role` from `user` to `admin`
5. Save changes

### 3. Access Admin Panel
1. Restart the app
2. You'll now see admin interface instead of user interface
3. Access all admin features: products, orders, users, analytics

## 🔍 Troubleshooting

### Voice Service Issues
- Ensure Python service is running on port 5000
- Check firewall settings
- Verify network connectivity between app and service

### Database Connection Issues
- Verify Supabase URL and API key in `.env`
- Check if schema was applied correctly
- Ensure RLS policies are active

### Payment Issues
- Use test keys for development
- Verify Paystack account is active
- Check network connectivity for payment verification

### App Build Issues
- Clear Expo cache: `npx expo start --clear`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Update Expo CLI: `npm install -g @expo/cli@latest`

## 🚀 Production Deployment

### Mobile App
```bash
# Build for production
npx expo build:android
npx expo build:ios

# Submit to stores
npx expo submit:android
npx expo submit:ios
```

### ML Service
Deploy Python service to cloud provider:
- **Heroku**: Use included `Procfile`
- **Railway**: Direct GitHub deployment
- **DigitalOcean**: App Platform deployment

Update service URL in `src/services/ExpoVoiceService.ts`

### Database
- Supabase handles production scaling automatically
- Update environment variables for production
- Enable production-ready RLS policies

---

**🇬🇭 Ready to revolutionize Ghana's ecommerce with voice technology!**

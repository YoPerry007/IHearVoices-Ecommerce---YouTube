# 🚀 IHearVoices Setup Guide

Complete setup instructions for the Ghana Voice-Activated Ecommerce App.

## 📋 Prerequisites

- **Node.js 18+** and npm
- **Python 3.8+**
- **Expo CLI**: `npm install -g @expo/cli`
- **Supabase account**: [supabase.com](https://supabase.com)
- **Groq account**: [console.groq.com](https://console.groq.com)
- **Paystack account**: [paystack.com](https://paystack.com)

## 🔧 Environment Configuration

Create `.env` file in project root:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Paystack Configuration (Test Keys)
EXPO_PUBLIC_PAYSTACK_TEST_MODE=true
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

## ✨ Groq AI Shopping Assistant Setup

The shopping assistant runs in an authenticated Supabase Edge Function so the
Groq API key is never bundled into the mobile or web app.

### 1. Create a Groq API Key

1. Open the Groq Console and create an API key.
2. Do not add this key to the app's root `.env` file and never prefix it with
   `EXPO_PUBLIC_`.

### 2. Configure and Deploy the Edge Function

```bash
npx supabase login
npx supabase link --project-ref ateiysixigcfpuopjhlb
npx supabase secrets set GROQ_API_KEY=gsk_your_key
npx supabase functions deploy shopping-assistant
```

The default model is `openai/gpt-oss-20b`, which supports the strict structured
response used by the app. To configure another compatible model:

```bash
npx supabase secrets set GROQ_MODEL=openai/gpt-oss-20b
```

### 3. Verify

1. Sign in to the app with a normal buyer account.
2. Open the **Assistant** tab.
3. Try “Find sneakers under GH₵500” and “Track my latest order.”
4. Confirm product cards open existing products and order cards only show the
   signed-in buyer's orders.

For local function development, copy
`supabase/functions/shopping-assistant/.env.example` to a git-ignored local env
file, add your key, and serve the function with the Supabase CLI.

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

The service listens on `0.0.0.0`, and a standalone Android build automatically
looks for it on the phone's current Wi-Fi network. Keep the phone and computer
on the same Wi-Fi and allow inbound TCP port 5000 through Windows Firewall. You
do not need to rebuild the APK when the computer's local IP address changes.

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
- Keep the secret server-side. Configure it and deploy the authenticated payment
  function:

```bash
npx supabase secrets set PAYSTACK_SECRET_KEY=sk_test_your_test_secret_key
npx supabase functions deploy payment-gateway
```

Never put a Paystack secret in an `EXPO_PUBLIC_*` variable or mobile source file.

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

### 4. Build an Installable Android APK

```bash
npm run build:android:apk
```

The `preview` profile creates an APK that can be downloaded and installed
directly. Once installed, the app does not need the Expo development server.
Only start `python_ml_service/start_simple_service.bat` when you want the local
voice backend; Supabase, the shopping assistant, and payment functions are
hosted remotely.

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
# Installable Android preview APK
npm run build:android:apk

# Store builds
npx eas build --platform android --profile production
npx eas build --platform ios --profile production

# Submit to stores
npx expo submit:android
npx expo submit:ios
```

### ML Service
Deploy Python service to cloud provider:
- **Heroku**: Use included `Procfile`
- **Railway**: Direct GitHub deployment
- **DigitalOcean**: App Platform deployment

Set `EXPO_PUBLIC_ML_SERVICE_URL` to the deployed HTTPS service URL when building.

### Database
- Supabase handles production scaling automatically
- Update environment variables for production
- Enable production-ready RLS policies

---

**🇬🇭 Ready to revolutionize Ghana's ecommerce with voice technology!**

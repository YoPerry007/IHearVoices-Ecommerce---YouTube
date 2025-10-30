# IHearVoices Email Verification Page

This is a standalone HTML page for handling email verification redirects from Supabase. It will be deployed on Netlify to provide a seamless email confirmation experience.

## 🌟 Features

- **Beautiful UI**: Ghana-inspired design matching your app theme
- **Token Extraction**: Automatically extracts tokens from URL hash
- **Email Verification**: Confirms email with Supabase API
- **Deep Linking**: Attempts to open the IHearVoices app after verification
- **Fallback Handling**: Redirects to website if app isn't installed
- **Mobile Responsive**: Works perfectly on all devices
- **Security**: Clears sensitive tokens from URL after verification

## 🚀 Deployment Instructions

### Option 1: Netlify Drag & Drop (Easiest)

1. **Prepare Files**:
   - Zip the entire `email-confirmation` folder
   - Or just drag the folder directly to Netlify

2. **Deploy to Netlify**:
   - Go to [netlify.com](https://netlify.com)
   - Sign in to your account
   - Drag the `email-confirmation` folder to the deploy area
   - Netlify will automatically deploy your site

3. **Get Your URL**:
   - Netlify will provide a URL like: `https://amazing-name-123456.netlify.app`
   - You can customize this in Site Settings → Domain Management

### Option 2: Git-based Deployment

1. **Create Repository**:
   ```bash
   cd email-confirmation
   git init
   git add .
   git commit -m "Initial email verification page"
   ```

2. **Push to GitHub**:
   - Create a new repository on GitHub
   - Push your code to the repository

3. **Connect to Netlify**:
   - In Netlify, click "New site from Git"
   - Connect your GitHub repository
   - Netlify will auto-deploy on every push

## ⚙️ Configuration

### Update Supabase Settings

Once deployed, update your Supabase project:

1. **Go to Supabase Dashboard**:
   - Navigate to Authentication → Settings

2. **Update Redirect URLs**:
   - Add your Netlify URL to "Site URL"
   - Add to "Redirect URLs": `https://your-site.netlify.app`

3. **Update Email Templates**:
   - Go to Authentication → Templates
   - Update the "Confirm signup" template
   - Change the redirect URL to: `https://your-site.netlify.app`

### Example Supabase Email Template

```html
<h2>Confirm your signup</h2>

<p>Follow this link to confirm your user:</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm your account</a></p>

<p>Welcome to IHearVoices - Premium Voice Shopping for Ghana! 🇬🇭</p>
```

## 🔧 Customization

### Update App Deep Links

In `index.html`, update the app scheme:

```javascript
const APP_SCHEME = 'ihearvoices://';  // Your app's custom URL scheme
```

### Update Branding

- **Colors**: Modify CSS variables for your brand colors
- **Logo**: Replace the logo section with your actual logo
- **Text**: Update welcome messages and copy
- **Links**: Update fallback URLs to your actual website

### Update Supabase Config

Make sure the Supabase configuration matches your project:

```javascript
const SUPABASE_URL = 'https://jodlypsnizdowjogpgxl.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

## 📱 How It Works

### User Flow

1. **User Registers**: In your app, user creates account
2. **Email Sent**: Supabase sends verification email
3. **User Clicks Link**: Email contains link to your Netlify page
4. **Page Loads**: Verification page extracts tokens from URL
5. **API Call**: Page verifies tokens with Supabase
6. **Success**: Shows success message and tries to open app
7. **Deep Link**: Attempts to open app with verified tokens
8. **Fallback**: If app not installed, redirects to website

### URL Structure

The page handles URLs like:
```
https://your-site.netlify.app/#access_token=xxx&refresh_token=yyy&expires_at=zzz&type=signup
```

### Security Features

- **Token Clearing**: Removes sensitive tokens from URL after verification
- **HTTPS Only**: Netlify provides free SSL certificates
- **CSP Headers**: Content Security Policy prevents XSS attacks
- **No Storage**: Tokens are not stored locally

## 🛠 Testing

### Test Locally

1. **Serve Files**:
   ```bash
   # Using Python
   python -m http.server 3000
   
   # Using Node.js
   npx serve .
   ```

2. **Test URL**:
   - Open: `http://localhost:3000`
   - Add test tokens to URL hash for testing

### Test on Netlify

1. **Deploy to Netlify**
2. **Update Supabase redirect URL** to your Netlify URL
3. **Register a test user** in your app
4. **Check email** and click verification link
5. **Verify the flow** works end-to-end

## 📊 Analytics (Optional)

Add Google Analytics or other tracking:

```html
<!-- Add before closing </head> tag -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## 🚨 Troubleshooting

### Common Issues

1. **"Verification Failed"**:
   - Check Supabase URL and anon key
   - Verify redirect URL is correct in Supabase
   - Check browser console for errors

2. **App Doesn't Open**:
   - Verify app URL scheme is correct
   - Test deep linking on actual device
   - Check app is installed and scheme is registered

3. **Page Not Loading**:
   - Check Netlify deployment status
   - Verify DNS settings if using custom domain
   - Check browser console for errors

### Debug Mode

Add this to enable debug logging:

```javascript
// Add after the Supabase config
const DEBUG = true;

function log(...args) {
  if (DEBUG) console.log('[EmailVerification]', ...args);
}
```

## 🎉 Success!

Once deployed and configured, your users will have a beautiful, seamless email verification experience that matches your app's branding and automatically tries to return them to the IHearVoices app!

The page is optimized for the Ghanaian market with appropriate styling, messaging, and user experience considerations.

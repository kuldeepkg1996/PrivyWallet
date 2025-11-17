# Privy Wallet - Passkey Authentication & Wallet Management

A modern React application with Privy integration for passkey-based authentication and embedded wallet management. Designed to work seamlessly in React Native WebView.

## Features

- 🔐 **Passkey Authentication**: Passwordless, phishing-resistant login and signup
- 💼 **Embedded Wallets**: Automatically create wallets for users
- 📱 **WebView Compatible**: Wallet address extraction for React Native apps
- 🎨 **Modern UI**: Smooth, responsive design with gradient backgrounds
- ⚡ **Single Page App**: Conditional rendering based on authentication state

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Privy App ID

Create a `.env` file in the root directory:

```env
VITE_PRIVY_APP_ID=your_privy_app_id_here
```

Get your Privy App ID from the [Privy Dashboard](https://dashboard.privy.io/).

### 3. Run the Development Server

```bash
npm run dev
```

## React Native WebView Integration

The app automatically posts wallet address messages to React Native WebView when available:

```javascript
// In your React Native app
<WebView
  source={{ uri: 'your-app-url' }}
  onMessage={(event) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'WALLET_ADDRESS') {
      console.log('Wallet Address:', data.address);
      // Handle wallet address in your native app
    }
  }}
/>
```

## Project Structure

```
src/
  ├── App.jsx          # Main application component with auth & wallet logic
  ├── App.css          # Modern styling with animations
  ├── main.jsx         # PrivyProvider setup
  └── index.css        # Global styles
```

## Authentication Flow

1. **Not Authenticated**: Shows login/signup buttons with passkey option
2. **Authenticated**: Automatically creates wallet if none exists
3. **Wallet Display**: Shows wallet address with copy functionality

## Technologies

- React 19
- Vite
- Privy (@privy-io/react-auth)
- WebAuthn/Passkeys

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready to be hosted and used in your React Native WebView.

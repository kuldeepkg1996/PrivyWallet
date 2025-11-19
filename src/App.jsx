// App.tsx or App.jsx
import { useState, useEffect } from 'react';
import {
  usePrivy,
  useWallets,
  useCreateWallet,
  useSignupWithPasskey,
  useLoginWithPasskey,
} from '@privy-io/react-auth';
import './App.css';

function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { authenticated, logout, ready: privyReady } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { createWallet } = useCreateWallet();

  const { signupWithPasskey } = useSignupWithPasskey({
    onComplete: async (user) => {
      console.log('User signed up:', user);
      // Automatically create wallet after signup
      try {
        await createWallet();
      } catch (error) {
        console.error('Failed to create wallet:', error);
        setError('Failed to create wallet after signup');
      }
    },
    onError: (error) => {
      console.error('Signup failed:', error);
      setError('Failed to sign up with passkey');
    },
  });

  const { loginWithPasskey } = useLoginWithPasskey({
    onComplete: (user) => {
      console.log('User logged in:', user);
    },
    onError: (error) => {
      console.error('Login failed:', error);
      setError('Failed to login with passkey');
    },
  });

  // Extract wallet address when wallets are ready
  useEffect(() => {
    const sendWalletToNative = (address) => {
      // Clear any errors before redirecting
      setError('');
      
      // Redirect immediately without delay
      console.log('Redirecting to mobile app with address:', address);

      // 1) Main path for InAppBrowser: deep link
      try {
        console.log('Redirecting to deep link with address:', address);
        // orbitxpay is your custom scheme. Make sure it matches native config.
        window.location.href = `orbitxpay://walletscreen?address=${encodeURIComponent(
          address,
        )}`;
      } catch (e) {
        console.error('Failed to redirect to deep link:', e);
      }

      // 2) Fallback: if running inside a React Native WebView
      try {
        if (window?.ReactNativeWebView) {
          console.log('Posting wallet address to ReactNativeWebView');
          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              type: 'WALLET_ADDRESS',
              address,
            }),
          );
        }
      } catch (e) {
        console.error('Failed to post to ReactNativeWebView:', e);
      }
    };

    if (walletsReady && wallets.length > 0) {
      const address = wallets[0].address;
      console.log('Wallets ready, address:', address);
      // Clear error before redirecting
      setError('');
      sendWalletToNative(address);
    } else if (walletsReady && wallets.length === 0 && authenticated) {
      // User is authenticated but has no wallet, create one
      console.log('Authenticated but no wallets. Creating wallet...');
      const createWalletAsync = async () => {
        setLoading(true);
        setError('');
        try {
          await createWallet();
        } catch (err) {
          console.error('Error creating wallet:', err);
          setError(err?.message || 'Failed to create wallet');
        } finally {
          setLoading(false);
        }
      };
      createWalletAsync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletsReady, wallets, authenticated]);

  const handleSignup = async () => {
    setLoading(true);
    setError('');
    try {
      await signupWithPasskey();
    } catch (err) {
      console.error('Signup error:', err);
      setError(err?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithPasskey();
    } catch (err) {
      console.error('Login error:', err);
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWallet = async () => {
    setLoading(true);
    setError('');
    try {
      await createWallet();
    } catch (err) {
      console.error('Create wallet error:', err);
      setError(err?.message || 'Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    setError('');
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
      setError(err?.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Address copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Loading state - show loading for max 10 seconds, then show error
  const [initTimeout, setInitTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!walletsReady && !privyReady) {
        setInitTimeout(true);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [walletsReady, privyReady]);

  // Show loading if system or wallets aren't ready
  if ((!walletsReady || !privyReady) && !initTimeout) {
    return (
      <div className="app-container">
        <div className="loading-container">
          <div className="spinner" />
          <p>Initializing wallet system...</p>
          <p
            style={{
              fontSize: '0.875rem',
              marginTop: '10px',
              opacity: 0.8,
            }}
          >
            System Ready: {privyReady ? 'Yes' : 'No'} | Wallets Ready:{' '}
            {walletsReady ? 'Yes' : 'No'}
          </p>
        </div>
      </div>
    );
  }

  if (initTimeout && (!walletsReady || !privyReady)) {
    return (
      <div className="app-container">
        <div className="auth-container">
          <div className="auth-card">
            <h1 className="app-title">⚠️ Initialization Error</h1>
            <p className="app-subtitle">
              The system is taking longer than expected to initialize.
            </p>
            <p className="info-text">
              Please refresh the page or check your configuration.
            </p>
            <p
              className="info-text"
              style={{ fontSize: '0.75rem', marginTop: '10px' }}
            >
              System Ready: {privyReady ? 'Yes' : 'No'} | Wallets Ready:{' '}
              {walletsReady ? 'Yes' : 'No'}
            </p>
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated - show login/signup
  if (!authenticated) {
    return (
      <div className="app-container">
        <div className="auth-container">
          <div className="auth-card">
            <h1 className="app-title">🔐 Create Your Self-Custodial Wallet</h1>
            <p className="app-subtitle">
              Secure Web3 Authentication with Passkeys and generate your self-custodial wallet
            </p>
            {error && <div className="error-message">{error}</div>}
            <div className="auth-buttons">
              <button
                className="btn btn-primary"
                onClick={handleSignup}
                disabled={loading}
              >
                {loading ? 'Signing up...' : 'Sign Up with Passkey'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleLogin}
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login with Passkey'}
              </button>
            </div>
            <p className="info-text">
              Passkeys provide passwordless, phishing-resistant authentication
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - show wallet info
  return (
    <div className="app-container">
      <div className="wallet-container">
        <div className="wallet-card">
          <div className="wallet-header">
            <h1 className="wallet-title">✨ Your Wallet</h1>
            {/* <button
              className="btn-logout"
              onClick={handleLogout}
              disabled={loading}
            >
              Logout
            </button> */}
          </div>

          {error && <div className="error-message">{error}</div>}

          {wallets.length === 0 && (
            <div className="no-wallet">
              <p>No wallet found. Creating one for you...</p>
              {loading && <div className="spinner-small" />}
            </div>
          )}

          {wallets.length === 0 && !loading && (
            <button
              className="btn btn-primary"
              onClick={handleCreateWallet}
              disabled={loading}
            >
              Create Wallet
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

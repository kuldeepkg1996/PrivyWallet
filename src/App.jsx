// App.jsx
import { useState, useEffect } from 'react';
import {
  usePrivy,
  useWallets as useEvmWallets,
  useCreateWallet as useCreateEvmWallet,
  useSignupWithPasskey,
  useLoginWithPasskey,
} from '@privy-io/react-auth';

import {
  useWallets as useSolanaWallets,
  useCreateWallet as useCreateSolanaWallet,
} from '@privy-io/react-auth/solana';

import './App.css';

function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initTimeout, setInitTimeout] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  const { authenticated, logout, ready: privyReady } = usePrivy();

  // EVM wallets
  const {
    wallets: evmWallets,
    ready: evmWalletsReady,
  } = useEvmWallets();

  const { createWallet: createEvmWallet } = useCreateEvmWallet();

  // Solana wallets
  const {
    wallets: solanaWallets,
    ready: solanaWalletsReady,
  } = useSolanaWallets();

  const { createWallet: createSolanaWallet } = useCreateSolanaWallet();

  const allWalletsReady = evmWalletsReady && solanaWalletsReady;

  /**
   * Send both EVM + Solana addresses to native (deep link + WebView fallback)
   */
  const sendWalletsToNative = (evmAddress, solanaAddress) => {
    if (hasRedirected) return;

    setError('');
    setHasRedirected(true);

    console.log('🌉 Sending wallets to native:', { evmAddress, solanaAddress });

    // Deep link with simple query params
    try {
      const url =
        `orbitxpay://walletscreen` +
        `?evmAddress=${encodeURIComponent(evmAddress || '')}` +
        `&solanaAddress=${encodeURIComponent(solanaAddress || '')}`;

      console.log('Redirecting to deep link:', url);
      window.location.href = url;
    } catch (e) {
      console.error('Failed to redirect to deep link:', e);
    }

    // Fallback for ReactNative WebView
    try {
      if (window.ReactNativeWebView) {
        console.log('Posting wallet addresses to ReactNativeWebView');
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'WALLET_ADDRESS',
            address: evmAddress, // legacy
            evmAddress,
            solanaAddress,
          }),
        );
      }
    } catch (e) {
      console.error('Failed to post to ReactNativeWebView:', e);
    }
  };

  const { signupWithPasskey } = useSignupWithPasskey({
    onComplete: async (user) => {
      console.log('User signed up:', user);
      // After signup, wallets will be ensured in the effect below
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

  /**
   * Ensure both EVM + Solana wallets exist, then send to native once.
   */
  useEffect(() => {
    if (!authenticated) return;
    if (!allWalletsReady) return;
    if (hasRedirected) return;
    if (loading) return;

   const ensureWalletsAndSend = async () => {
  setLoading(true);
  setError('');

  try {
    console.log('🔎 EVM wallets from hook:', evmWallets);
    console.log('🔎 Solana wallets from hook:', solanaWallets);

    let evmWallet = evmWallets[0];
    let solWallet = solanaWallets[0];

    if (!evmWallet) {
      console.log('No EVM wallet found. Creating EVM wallet...');
      const createdEvm = await createEvmWallet();
      console.log('✅ createEvmWallet result:', createdEvm);
      evmWallet = createdEvm || evmWallets[0];
    }

    if (!solWallet) {
      console.log('No Solana wallet found. Creating Solana wallet...');
      const createdSol = await createSolanaWallet();
      console.log('✅ createSolanaWallet result:', createdSol);
      console.log('🔎 Solana wallets from hook AFTER create:', solanaWallets);
      solWallet = createdSol || solanaWallets[0];
    }

    console.log('Final EVM wallet object:', evmWallet);
    console.log('Final Solana wallet object:', solWallet);

    const evmAddress = evmWallet?.address || '';
    const solanaAddress = solWallet?.address || '';

    console.log('📍 EVM address =', evmAddress);
    console.log('📍 Solana address =', solanaAddress);

    if (!evmAddress && !solanaAddress) {
      throw new Error('No wallet addresses found even after creation');
    }

    sendWalletsToNative(evmAddress, solanaAddress);
  } catch (err) {
    console.error('❌ Error ensuring wallets:', err);
    setError(err?.message || 'Failed to create wallet(s)');
  } finally {
    setLoading(false);
  }
};


    ensureWalletsAndSend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    authenticated,
    allWalletsReady,
    evmWallets,
    solanaWallets,
    createEvmWallet,
    createSolanaWallet,
    hasRedirected,
  ]);

  /**
   * Loading timeout (10s)
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!allWalletsReady && !privyReady) {
        setInitTimeout(true);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [allWalletsReady, privyReady]);

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

  // Show loading if system or wallets aren't ready
  if ((!allWalletsReady || !privyReady) && !initTimeout) {
    return (
      <div className="app-container">
        <div className="loading-container">
          <div className="spinner" />
          <p>Initializing wallet system...</p>
        </div>
      </div>
    );
  }

  if (initTimeout && (!allWalletsReady || !privyReady)) {
    return (
      <div className="app-container">
        <div className="auth-container">
          <div className="auth-card">
            <h1 className="app-title">⚠️ Initialization Error</h1>
            <p className="app-subtitle">
              The system is taking longer than expected to initialize.
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
              Secure Web3 Authentication with Passkeys and generate your EVM +
              Solana self-custodial wallets
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
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - at this point effect will ensure wallets and redirect
  return (
    <div className="app-container">
      <div className="loading-container">
        <div className="spinner" />
        <p>Preparing your wallets and redirecting...</p>
        {error && (
          <div className="error-message" style={{ marginTop: '20px' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

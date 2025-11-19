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

  const { signupWithPasskey } = useSignupWithPasskey({
    onComplete: async (user) => {
      console.log('User signed up:', user);
      // Automatically create EVM + Solana wallets after signup
      try {
        console.log('🔄 Creating EVM + Solana wallets after signup...');
        const [evmResult, solResult] = await Promise.all([
          createEvmWallet(),
          createSolanaWallet(),
        ]);

        console.log('✅ EVM wallet created after signup:', evmResult);
        console.log('✅ Solana wallet created after signup:', solResult);

        console.log('📝 EVM wallet details:', {
          address: evmResult?.address,
          chainId: evmResult?.chainId,
          chainIdNumber: evmResult?.chainIdNumber,
          walletType: evmResult?.walletType,
          walletClientType: evmResult?.walletClientType,
          chainType: evmResult?.chainType,
        });

        console.log('📝 Solana wallet details:', {
          address: solResult?.address,
          chainType: solResult?.chainType,
          walletType: solResult?.walletType,
          walletClientType: solResult?.walletClientType,
        });
      } catch (error) {
        console.error('❌ Failed to create wallets after signup:', error);
        setError('Failed to create wallets after signup');
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

  /**
   * Send both EVM + Solana addresses to native
   */
  const sendWalletsToNative = (evmAddress, solanaAddress) => {
    // Prevent multiple redirects
    if (hasRedirected) return;
    
    // Clear any errors before redirecting
    setError('');
    setHasRedirected(true);

    const payload = {
      evmAddress: evmAddress || null,
      solanaAddress: solanaAddress || null,
    };

    console.log('Redirecting to mobile app with payload:', payload);

    // 1) Main path for InAppBrowser: deep link with both addresses
    try {
      const encodedPayload = encodeURIComponent(JSON.stringify(payload));
      const url = `orbitxpay://walletscreen?payload=${encodedPayload}`;
      console.log('Redirecting to deep link:', url);
      window.location.href = url;
    } catch (e) {
      console.error('Failed to redirect to deep link:', e);
    }

    // 2) Fallback: if running inside a React Native WebView
    try {
      if (window.ReactNativeWebView) {
        console.log('Posting wallet addresses to ReactNativeWebView');
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'WALLET_ADDRESS', // legacy type
            address: evmAddress, // legacy field
            evmAddress,
            solanaAddress,
          }),
        );
      }
    } catch (e) {
      console.error('Failed to post to ReactNativeWebView:', e);
    }
  };

  /**
   * Ensure both EVM + Solana wallets exist, then send to native
   */
  useEffect(() => {
    if (!authenticated) return;
    if (!allWalletsReady) return;
    if (loading) return; // avoid double-create loops

    const evmWallet = evmWallets[0];
    const solWallet = solanaWallets[0];

    // If both exist, just send addresses to native
    if (evmWallet && solWallet) {
      console.log('✅ EVM and Solana wallets ready!');
      console.log('📍 EVM address:', evmWallet.address);
      console.log('📍 Solana address:', solWallet.address);
      sendWalletsToNative(evmWallet.address, solWallet.address);
      return;
    }

    // If any is missing, create missing wallets
    const createMissingWallets = async () => {
      setError('');
      setLoading(true);
      try {
        if (!evmWallet) {
          console.log(
            '🔐 Authenticated but no EVM wallets found. Creating EVM wallet...',
          );
          const res = await createEvmWallet();
          console.log('✅ EVM wallet created:', res);
        }

        if (!solWallet) {
          console.log(
            '🔐 Authenticated but no Solana wallets found. Creating Solana wallet...',
          );
          const res = await createSolanaWallet();
          console.log('✅ Solana wallet created:', res);
        }
      } catch (err) {
        console.error('❌ Error creating wallet(s):', err);
        setError(err?.message || 'Failed to create wallet(s)');
      } finally {
        setLoading(false);
      }
    };

    createMissingWallets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    authenticated,
    allWalletsReady,
    evmWallets,
    solanaWallets,
    createEvmWallet,
    createSolanaWallet,
    loading,
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
          <p
            style={{
              fontSize: '0.875rem',
              marginTop: '10px',
              opacity: 0.8,
            }}
          >
            System Ready: {privyReady ? 'Yes' : 'No'} | EVM Wallets Ready:{' '}
            {evmWalletsReady ? 'Yes' : 'No'} | Solana Wallets Ready:{' '}
            {solanaWalletsReady ? 'Yes' : 'No'}
          </p>
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
            <p className="info-text">
              Please refresh the page or check your configuration.
            </p>
            <p
              className="info-text"
              style={{ fontSize: '0.75rem', marginTop: '10px' }}
            >
              System Ready: {privyReady ? 'Yes' : 'No'} | EVM Wallets Ready:{' '}
              {evmWalletsReady ? 'Yes' : 'No'} | Solana Wallets Ready:{' '}
              {solanaWalletsReady ? 'Yes' : 'No'}
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
            <p className="info-text">
              Passkeys provide passwordless, phishing-resistant authentication
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - automatically redirect when wallets are ready
  const primaryEvm = evmWallets[0];
  const primarySol = solanaWallets[0];

  // Show loading/redirecting message while wallets are being created or redirecting
  return (
    <div className="app-container">
      <div className="loading-container">
        <div className="spinner" />
        <p>
          {primaryEvm && primarySol
            ? 'Redirecting with wallet addresses...'
            : 'Creating wallets and redirecting...'}
        </p>
        {error && <div className="error-message" style={{ marginTop: '20px' }}>{error}</div>}
      </div>
    </div>
  );
}

export default App;

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  usePrivy,
  useWallets as useEvmWallets,
  useLoginWithPasskey,
  useSignupWithPasskey,
} from '@privy-io/react-auth';
import './SignTransaction.css';

function EvmSignMessage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { authenticated, ready } = usePrivy();
  const { wallets: evmWallets } = useEvmWallets();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [signature, setSignature] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const message = searchParams.get('message') || '';
  const chainId = searchParams.get('chainId') || '1';

  const { loginWithPasskey } = useLoginWithPasskey({
    onComplete: () => {
      setShowLoginPrompt(false);
    },
    onError: (error) => {
      setError('Failed to login with passkey');
      setLoading(false);
    },
  });

  const { signupWithPasskey } = useSignupWithPasskey({
    onComplete: () => {
      setShowLoginPrompt(false);
    },
    onError: (error) => {
      setError('Failed to sign up with passkey');
      setLoading(false);
    },
  });

  useEffect(() => {
    if (ready && !authenticated) {
      setShowLoginPrompt(true);
    }
  }, [ready, authenticated]);

  const handleSignMessage = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setSignature('');

    try {
      const wallet = evmWallets[0];
      if (!wallet) throw new Error('No EVM wallet found');
      if (!message) throw new Error('Message is required');

      const provider = await wallet.getEthereumProvider();
      const sig = await provider.request({
        method: 'personal_sign',
        params: [message, wallet.address],
      });

      setSignature(sig as string);
      setSuccess('Message signed successfully!');
      sendResultToNative(sig as string, 'success');
    } catch (err: any) {
      setError(err?.message || 'Failed to sign message');
    } finally {
      setLoading(false);
    }
  };

  const sendResultToNative = (sig: string, status: string) => {
    try {
      window.location.href = `orbitxpay://signMessage?signature=${encodeURIComponent(sig)}&status=${status}`;
    } catch (e) {}

    try {
      if ((window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'EVM_SIGN_MESSAGE_RESULT', signature: sig, status, message, chainId })
        );
      }
    } catch (e) {}
  };

  const handleCancel = () => {
    sendResultToNative('', 'cancelled');
    navigate('/');
  };

  const getChainName = (id: string) => {
    const chains: Record<string, string> = {
      '1': 'Ethereum Mainnet',
      '56': 'BSC',
      '137': 'Polygon',
      '42161': 'Arbitrum',
      '10': 'Optimism',
      '8453': 'Base',
    };
    return chains[id] || `Chain ${id}`;
  };

  if (!ready) {
    return (
      <div className="sign-tx-container">
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (showLoginPrompt && !authenticated) {
    return (
      <div className="sign-tx-container">
        <div className="sign-tx-card">
          <h1 className="sign-tx-title">🔐 Login Required</h1>
          <p className="login-subtitle">Please login to sign the message</p>
          <div className="tx-details">
            <div className="detail-row">
              <span className="detail-label">Chain:</span>
              <span className="detail-value chain-badge">{getChainName(chainId)}</span>
            </div>
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="action-buttons">
            <button className="btn btn-primary" onClick={() => loginWithPasskey()} disabled={loading}>
              {loading ? 'Logging in...' : 'Login with Passkey'}
            </button>
            <button className="btn btn-secondary" onClick={() => signupWithPasskey()} disabled={loading}>
              {loading ? 'Signing up...' : 'Sign Up with Passkey'}
            </button>
          </div>
          <button className="btn-cancel-link" onClick={handleCancel} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sign-tx-container">
      <div className="sign-tx-card">
        <h1 className="sign-tx-title">✍️ Sign Message</h1>
        <div className="tx-details">
          <div className="detail-row">
            <span className="detail-label">Chain:</span>
            <span className="detail-value chain-badge">{getChainName(chainId)}</span>
          </div>
          {evmWallets[0] && (
            <div className="detail-row">
              <span className="detail-label">Wallet:</span>
              <span className="detail-value address-text">{evmWallets[0].address}</span>
            </div>
          )}
          {message && (
            <div className="detail-row" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none' }}>
              <span className="detail-label" style={{ marginBottom: '8px' }}>Message:</span>
              <div className="message-box" style={{ color: '#ffffff' }}>{message}</div>
            </div>
          )}
        </div>
        {error && <div className="error-message">{error}</div>}
        {success && (
          <div className="success-message">
            {success}
            {signature && (
              <div className="tx-hash">
                <span className="tx-hash-label">Signature:</span>
                <span className="tx-hash-value">{signature}</span>
              </div>
            )}
          </div>
        )}
        <div className="action-buttons">
          <button className="btn btn-primary" onClick={handleSignMessage} disabled={loading || !message}>
            {loading ? 'Signing...' : 'Sign Message'}
          </button>
          <button className="btn btn-secondary" onClick={handleCancel} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default EvmSignMessage;

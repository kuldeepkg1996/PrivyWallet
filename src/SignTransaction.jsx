import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePrivy, useWallets as useEvmWallets } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import './SignTransaction.css';

function SignTransaction() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { authenticated, ready } = usePrivy();
  const { wallets: evmWallets } = useEvmWallets();
  const { wallets: solanaWallets } = useSolanaWallets();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [txHash, setTxHash] = useState('');

  // Extract parameters from URL query
  const network = searchParams.get('network') || 'ethereum';
  const token = searchParams.get('token') || '';
  const amount = searchParams.get('amount') || '';
  const fee = searchParams.get('fee') || '';
  const recipientAddress = searchParams.get('recipientAddress') || '';

  useEffect(() => {
    if (ready && !authenticated) {
      navigate('/');
    }
  }, [ready, authenticated, navigate]);

  const handleSignAndSend = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setTxHash('');

    try {
      if (network.toLowerCase().includes('solana')) {
        await handleSolanaTransaction();
      } else {
        await handleEvmTransaction();
      }
    } catch (err) {
      console.error('Transaction error:', err);
      setError(err?.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEvmTransaction = async () => {
    const selectedWallet = evmWallets[0];
    if (!selectedWallet) {
      throw new Error('No EVM wallet found');
    }

    if (!recipientAddress) {
      throw new Error('Recipient address is required');
    }

    if (!amount) {
      throw new Error('Amount is required');
    }

    const provider = await selectedWallet.getEthereumProvider();
    
    // Build transaction object
    const txRequest = {
      to: recipientAddress,
      from: selectedWallet.address,
    };

    // If token address is provided, it's an ERC20 transfer
    if (token && token !== '') {
      // ERC20 transfer function signature: transfer(address,uint256)
      const transferMethodId = '0xa9059cbb';
      
      // Pad recipient address to 32 bytes (remove 0x, pad to 64 chars, add 0x)
      const paddedRecipient = recipientAddress.slice(2).padStart(64, '0');
      
      // Convert amount to wei and pad to 32 bytes
      const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
      const paddedAmount = amountInWei.toString(16).padStart(64, '0');
      
      // Construct data payload
      txRequest.data = `${transferMethodId}${paddedRecipient}${paddedAmount}`;
      txRequest.to = token; // Send to token contract
    } else {
      // Native token transfer (ETH, BNB, etc.)
      const valueInWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
      txRequest.value = `0x${valueInWei.toString(16)}`;
    }

    // Add gas price/fee if provided
    if (fee && fee !== '') {
      const gasPrice = BigInt(Math.floor(parseFloat(fee) * 1e9)); // Convert to Gwei
      txRequest.gasPrice = `0x${gasPrice.toString(16)}`;
    }

    console.log('Sending transaction:', txRequest);

    const hash = await provider.request({
      method: 'eth_sendTransaction',
      params: [txRequest],
    });

    console.log('Transaction result:', hash);
    setTxHash(hash);
    setSuccess('Transaction sent successfully!');
    sendResultToNative(hash, 'success');
  };

  const handleSolanaTransaction = async () => {
    const wallet = solanaWallets[0];
    if (!wallet) {
      throw new Error('No Solana wallet found');
    }

    if (!recipientAddress) {
      throw new Error('Recipient address is required');
    }

    // For Solana, you'd need to construct the transaction
    // This is a simplified example - you'll need @solana/web3.js for full implementation
    throw new Error('Solana transaction signing coming soon - needs @solana/web3.js integration');
  };

  const sendResultToNative = (hash, status) => {
    try {
      const url = `orbitxpay://transaction?hash=${encodeURIComponent(hash)}&status=${status}`;
      window.location.href = url;
    } catch (e) {
      console.error('Failed to redirect:', e);
    }

    try {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'TRANSACTION_RESULT',
            hash,
            status,
            network,
          })
        );
      }
    } catch (e) {
      console.error('Failed to post to ReactNativeWebView:', e);
    }
  };

  const handleCancel = () => {
    sendResultToNative('', 'cancelled');
    navigate('/');
  };

  // Determine if it's a token transfer
  const isTokenTransfer = token && token !== '';
  const displayNetwork = network || 'Ethereum';

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

  return (
    <div className="sign-tx-container">
      <div className="sign-tx-card">
        <h1 className="sign-tx-title">🔐 Sign Transaction</h1>
        
        <div className="tx-details">
          <div className="detail-row">
            <span className="detail-label">Network:</span>
            <span className="detail-value chain-badge">{displayNetwork.toUpperCase()}</span>
          </div>

          {recipientAddress && (
            <div className="detail-row">
              <span className="detail-label">Recipient:</span>
              <span className="detail-value address-text">{recipientAddress}</span>
            </div>
          )}

          {amount && (
            <div className="detail-row">
              <span className="detail-label">Amount:</span>
              <span className="detail-value amount-text">
                {amount} {isTokenTransfer ? 'Tokens' : displayNetwork === 'ethereum' ? 'ETH' : 'Native'}
              </span>
            </div>
          )}

          {isTokenTransfer && (
            <div className="detail-row">
              <span className="detail-label">Token Contract:</span>
              <span className="detail-value address-text">{token}</span>
            </div>
          )}

          {fee && (
            <div className="detail-row">
              <span className="detail-label">Gas Fee:</span>
              <span className="detail-value">{fee} Gwei</span>
            </div>
          )}

          {!network.toLowerCase().includes('solana') && evmWallets[0] && (
            <div className="detail-row">
              <span className="detail-label">From:</span>
              <span className="detail-value address-text">{evmWallets[0].address}</span>
            </div>
          )}

          {network.toLowerCase().includes('solana') && solanaWallets[0] && (
            <div className="detail-row">
              <span className="detail-label">From:</span>
              <span className="detail-value address-text">{solanaWallets[0].address}</span>
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && (
          <div className="success-message">
            {success}
            {txHash && (
              <div className="tx-hash">
                <span className="tx-hash-label">Transaction Hash:</span>
                <span className="tx-hash-value">{txHash}</span>
              </div>
            )}
          </div>
        )}

        <div className="action-buttons">
          <button
            className="btn btn-primary"
            onClick={handleSignAndSend}
            disabled={loading || !recipientAddress || !amount}
          >
            {loading ? 'Signing...' : 'Sign & Send'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignTransaction;

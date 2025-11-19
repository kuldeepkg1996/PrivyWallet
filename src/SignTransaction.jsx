import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  usePrivy,
  useWallets as useEvmWallets,
  useLoginWithPasskey,
  useSignupWithPasskey,
  useSendTransaction,
} from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import { encodeFunctionData, erc20Abi, parseEther } from 'viem';
import './SignTransaction.css';

function SignTransaction() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { authenticated, ready } = usePrivy();
  const { wallets: evmWallets } = useEvmWallets();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { sendTransaction } = useSendTransaction();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [txHash, setTxHash] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [switchingNetwork, setSwitchingNetwork] = useState(false);

  // Extract parameters from URL query
  const network = searchParams.get('network') || 'ethereum';
  const tokenSymbol = searchParams.get('tokenSymbol') || '';
  const tokenAddress = searchParams.get('tokenAddress') || '';
  const tokenDecimals = searchParams.get('tokenDecimals') || '18';
  const amount = searchParams.get('amount') || '';
  const fee = searchParams.get('fee') || '';
  const recipientAddress = searchParams.get('recipientAddress') || '';
  const chainId = searchParams.get('chainId') || '1';

  const { loginWithPasskey } = useLoginWithPasskey({
    onComplete: () => {
      console.log('User logged in, proceeding with transaction');
      setShowLoginPrompt(false);
    },
    onError: (error) => {
      console.error('Login failed:', error);
      setError('Failed to login with passkey');
      setLoading(false);
    },
  });

  const { signupWithPasskey } = useSignupWithPasskey({
    onComplete: () => {
      console.log('User signed up, proceeding with transaction');
      setShowLoginPrompt(false);
    },
    onError: (error) => {
      console.error('Signup failed:', error);
      setError('Failed to sign up with passkey');
      setLoading(false);
    },
  });

  useEffect(() => {
    if (ready && !authenticated) {
      setShowLoginPrompt(true);
    }
  }, [ready, authenticated]);

  const handleSwitchNetwork = async (wallet, targetChainId) => {
    try {
      setSwitchingNetwork(true);
      console.log(`Switching to chain ${targetChainId}...`);
      await wallet.switchChain(targetChainId);
      console.log(`Successfully switched to chain ${targetChainId}`);
      return true;
    } catch (error) {
      console.error('Failed to switch network:', error);
      throw new Error(`Failed to switch to chain ${targetChainId}: ${error.message}`);
    } finally {
      setSwitchingNetwork(false);
    }
  };

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

    // Switch to the correct network if chainId is provided
    const targetChainId = parseInt(chainId, 10);
    if (chainId && targetChainId) {
      console.log(`Target chain ID: ${targetChainId}`);
      
      // Check if we need to switch networks
      const currentChainId = selectedWallet.chainId;
      if (currentChainId && currentChainId !== targetChainId) {
        console.log(`Current chain: ${currentChainId}, switching to: ${targetChainId}`);
        await handleSwitchNetwork(selectedWallet, targetChainId);
      }
    }

    let txRequest = {};

    // If token address is provided, it's an ERC20 transfer
    if (tokenAddress && tokenAddress !== '') {
      console.log('Preparing ERC-20 token transfer...');
      
      // Convert amount based on token decimals
      const decimals = parseInt(tokenDecimals, 10);
      const amountInSmallestUnit = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));
      
      console.log(`Amount: ${amount} ${tokenSymbol}`);
      console.log(`Decimals: ${decimals}`);
      console.log(`Amount in smallest unit: ${amountInSmallestUnit.toString()}`);
      
      // Encode the transfer function call using viem
      const encodedData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [recipientAddress, amountInSmallestUnit],
      });
      
      txRequest = {
        to: tokenAddress, // Send to token contract
        data: encodedData,
        chainId: targetChainId,
      };
      
      console.log('ERC-20 Transfer Data:', encodedData);
    } else {
      // Native token transfer (ETH, BNB, etc.)
      console.log('Preparing native token transfer...');
      
      const valueInWei = parseEther(amount);
      
      console.log(`Amount: ${amount} ETH`);
      console.log(`Value in Wei: ${valueInWei.toString()}`);
      
      txRequest = {
        to: recipientAddress,
        value: valueInWei,
        chainId: targetChainId,
      };
    }

    // Add gas price/fee if provided
    if (fee && fee !== '') {
      const gasPrice = BigInt(Math.floor(parseFloat(fee) * 1e9)); // Convert to Gwei
      txRequest.gasPrice = gasPrice;
      console.log(`Gas Price: ${fee} Gwei`);
    }

    console.log('Sending transaction:', txRequest);

    // Use Privy's sendTransaction hook
    const result = await sendTransaction(txRequest, {
      address: selectedWallet.address,
    });

    const hash = typeof result === 'string' ? result : result.transactionHash || result.hash;
    
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
  const isTokenTransfer = tokenAddress && tokenAddress !== '';
  const displayNetwork = network || 'Ethereum';
  const displayTokenSymbol = tokenSymbol || 'Tokens';
  
  // Get chain name from chainId
  const getChainName = (id) => {
    const chains = {
      '1': 'Ethereum Mainnet',
      '56': 'BSC',
      '137': 'Polygon',
      '42161': 'Arbitrum',
      '10': 'Optimism',
      '8453': 'Base',
      '1301': 'Unichain Sepolia',
      '84532': 'Base Sepolia',
    };
    return chains[id] || `Chain ${id}`;
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithPasskey();
    } catch (err) {
      console.error('Login error:', err);
      setError(err?.message || 'Login failed');
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    setError('');
    try {
      await signupWithPasskey();
    } catch (err) {
      console.error('Signup error:', err);
      setError(err?.message || 'Signup failed');
      setLoading(false);
    }
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

  // Show login prompt if not authenticated
  if (showLoginPrompt && !authenticated) {
    return (
      <div className="sign-tx-container">
        <div className="sign-tx-card">
          <h1 className="sign-tx-title">🔐 Login Required</h1>
          <p className="login-subtitle">
            Please login to continue with your transaction
          </p>

          <div className="tx-details">
            <div className="detail-row">
              <span className="detail-label">Network:</span>
              <span className="detail-value chain-badge">{getChainName(chainId)}</span>
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
                  {amount} {isTokenTransfer ? displayTokenSymbol : 'ETH'}
                </span>
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login with Passkey'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleSignup}
              disabled={loading}
            >
              {loading ? 'Signing up...' : 'Sign Up with Passkey'}
            </button>
          </div>

          <button
            className="btn-cancel-link"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel Transaction
          </button>
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
            <span className="detail-value chain-badge">{getChainName(chainId)}</span>
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
                {amount} {isTokenTransfer ? displayTokenSymbol : 'ETH'}
              </span>
            </div>
          )}

          {isTokenTransfer && (
            <div className="detail-row">
              <span className="detail-label">Token Contract:</span>
              <span className="detail-value address-text">{tokenAddress}</span>
            </div>
          )}

          {isTokenTransfer && tokenDecimals && (
            <div className="detail-row">
              <span className="detail-label">Token Decimals:</span>
              <span className="detail-value">{tokenDecimals}</span>
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
            disabled={loading || switchingNetwork || !recipientAddress || !amount}
          >
            {switchingNetwork ? 'Switching Network...' : loading ? 'Signing...' : 'Sign & Send'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleCancel}
            disabled={loading || switchingNetwork}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignTransaction;

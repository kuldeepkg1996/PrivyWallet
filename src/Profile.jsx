import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  usePrivy,
  useWallets as useEvmWallets,
  useCreateWallet as useCreateEvmWallet,
} from '@privy-io/react-auth';
import {
  useWallets as useSolanaWallets,
  useCreateWallet as useCreateSolanaWallet,
  useExportWallet
} from '@privy-io/react-auth/solana';
import { FiCopy, FiCheck, FiLogOut, FiArrowLeft } from 'react-icons/fi';
import './Profile.css';

function Profile() {
  const navigate = useNavigate();
  const { user, authenticated, ready, logout, exportWallet: exportWalletEvm  } = usePrivy();
  const { wallets: evmWallets } = useEvmWallets();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { createWallet: createEvmWallet } = useCreateEvmWallet();
  const { createWallet: createSolanaWallet } = useCreateSolanaWallet();

  const [copiedField, setCopiedField] = useState('');
  const [creatingEvmWallet, setCreatingEvmWallet] = useState(false);
  const [creatingSolanaWallet, setCreatingSolanaWallet] = useState(false);
  const [error, setError] = useState('');
  const [exportingWallet, setExportingWallet] = useState(null);
  const [exportedPrivateKey, setExportedPrivateKey] = useState('');
  const {exportWallet} = useExportWallet();


  const handleCopy = async (text, fieldName) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleCreateEvmWallet = async () => {
    setCreatingEvmWallet(true);
    setError('');
    try {
      console.log('Creating EVM wallet...');
      await createEvmWallet();
      console.log('EVM wallet created successfully');
    } catch (err) {
      console.error('Failed to create EVM wallet:', err);
      setError('Failed to create EVM wallet: ' + err.message);
    } finally {
      setCreatingEvmWallet(false);
    }
  };

  const handleCreateSolanaWallet = async () => {
    setCreatingSolanaWallet(true);
    setError('');
    try {
      console.log('Creating Solana wallet...');
      await createSolanaWallet({ createAdditional: false });
      console.log('Solana wallet created successfully');
    } catch (err) {
      console.error('Failed to create Solana wallet:', err);
      setError('Failed to create Solana wallet: ' + err.message);
    } finally {
      setCreatingSolanaWallet(false);
    }
  };

  const handleExportWallet = async (address,wallet) => {
    console.log("Wallet==>",wallet)
    if(wallet.type==='ethereum'){
      await exportWalletEvm({address:address});
    }else {
      await exportWallet({address:address});
    }
  };

  const handleCloseExport = () => {
    setExportingWallet(null);
    setExportedPrivateKey('');
  };

  if (!ready) {
    return (
      <div className="profile-container">
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!authenticated || !user) {
    navigate('/');
    return null;
  }

  const CopyButton = ({ text, fieldName }) => (
    <button
      className="btn-copy-icon"
      onClick={() => handleCopy(text, fieldName)}
      title="Copy to clipboard"
    >
      {copiedField === fieldName ? <FiCheck /> : <FiCopy />}
    </button>
  );

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <button className="btn-back" onClick={() => navigate('/')}>
            <FiArrowLeft /> Back
          </button>
          <h1 className="profile-title">👤 Profile</h1>
          <button className="btn-logout-icon" onClick={handleLogout}>
            <FiLogOut /> Logout
          </button>
        </div>

        {/* User Information */}
        <div className="profile-section">
          <h2 className="section-title">User Information</h2>
          
          <div className="info-row">
            <span className="info-label">User ID:</span>
            <div className="info-value-container">
              <span className="info-value">{user.id}</span>
              <CopyButton text={user.id} fieldName="userId" />
            </div>
          </div>

          {user.email && (
            <div className="info-row">
              <span className="info-label">Email:</span>
              <div className="info-value-container">
                <span className="info-value">{user.email.address}</span>
                <CopyButton text={user.email.address} fieldName="email" />
              </div>
            </div>
          )}

          {user.phone && (
            <div className="info-row">
              <span className="info-label">Phone:</span>
              <div className="info-value-container">
                <span className="info-value">{user.phone.number}</span>
                <CopyButton text={user.phone.number} fieldName="phone" />
              </div>
            </div>
          )}

          {user.wallet && (
            <div className="info-row">
              <span className="info-label">Linked Wallet:</span>
              <div className="info-value-container">
                <span className="info-value address-text">{user.wallet.address}</span>
                <CopyButton text={user.wallet.address} fieldName="linkedWallet" />
              </div>
            </div>
          )}

          <div className="info-row">
            <span className="info-label">Created At:</span>
            <span className="info-value">
              {new Date(user.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message" style={{ marginTop: '20px' }}>
            {error}
          </div>
        )}

        {/* All Wallets from User Object */}
        {user.wallet && (
          <div className="profile-section">
            <h2 className="section-title">Primary Wallet</h2>
            <div className="wallet-item">
              <div className="wallet-header-row">
                <span className="wallet-badge">Primary</span>
                <span className="wallet-type-badge">{user.wallet.walletClientType || user.wallet.walletClient || 'embedded'}</span>
              </div>
              
              <div className="info-row">
                <span className="info-label">Address:</span>
                <div className="info-value-container">
                  <span className="info-value address-text">{user.wallet.address}</span>
                  <CopyButton text={user.wallet.address} fieldName="primaryWallet" />
                </div>
              </div>

              {user.wallet.chainType && (
                <div className="info-row">
                  <span className="info-label">Chain Type:</span>
                  <span className="info-value">{user.wallet.chainType}</span>
                </div>
              )}

              {user.wallet.chainId && (
                <div className="info-row">
                  <span className="info-label">Chain ID:</span>
                  <span className="info-value">{user.wallet.chainId}</span>
                </div>
              )}

              {user.wallet.connectorType && (
                <div className="info-row">
                  <span className="info-label">Connector:</span>
                  <span className="info-value">{user.wallet.connectorType}</span>
                </div>
              )}

              {user.wallet.imported !== undefined && (
                <div className="info-row">
                  <span className="info-label">Imported:</span>
                  <span className="info-value">{user.wallet.imported ? 'Yes' : 'No'}</span>
                </div>
              )}

              {user.wallet.delegated !== undefined && (
                <div className="info-row">
                  <span className="info-label">Delegated:</span>
                  <span className="info-value">{user.wallet.delegated ? 'Yes' : 'No'}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* EVM Wallets */}
        <div className="profile-section">
          <h2 className="section-title">EVM Wallets ({evmWallets.length})</h2>
          {evmWallets.length > 0 ? (
            evmWallets.map((wallet, index) => (
              <div key={wallet.address} className="wallet-item">
                <div className="wallet-header-row">
                  <span className="wallet-badge">EVM Wallet {index + 1}</span>
                  <span className="wallet-type-badge">{wallet.walletClientType}</span>
                </div>
                
                <div className="info-row">
                  <span className="info-label">Address:</span>
                  <div className="info-value-container">
                    <span className="info-value address-text">{wallet.address}</span>
                    <CopyButton text={wallet.address} fieldName={`evmWallet${index}`} />
                  </div>
                </div>

                {wallet.chainId && (
                  <div className="info-row">
                    <span className="info-label">Chain ID:</span>
                    <span className="info-value">{wallet.chainId}</span>
                  </div>
                )}

                {wallet.connectorType && (
                  <div className="info-row">
                    <span className="info-label">Connector:</span>
                    <span className="info-value">{wallet.connectorType}</span>
                  </div>
                )}

                {wallet.imported !== undefined && (
                  <div className="info-row">
                    <span className="info-label">Imported:</span>
                    <span className="info-value">{wallet.imported ? 'Yes' : 'No'}</span>
                  </div>
                )}

                {wallet.walletIndex !== undefined && (
                  <div className="info-row">
                    <span className="info-label">Wallet Index:</span>
                    <span className="info-value">{wallet.walletIndex}</span>
                  </div>
                )}

                {/* Export Wallet Button */}
                <div className="export-wallet-section">
                  <button
                    className="btn-export-wallet"
                    onClick={() => handleExportWallet(wallet.address,wallet)}
                    disabled={exportingWallet && exportingWallet !== `evm-${wallet.address}`}
                  >
                    {exportingWallet === `evm-${wallet.address}` && exportedPrivateKey
                      ? '🔒 Hide Private Key'
                      : '🔑 Export Private Key'}
                  </button>

                  {exportingWallet === `evm-${wallet.address}` && exportedPrivateKey && (
                    <div className="private-key-container">
                      <div className="warning-banner">
                        ⚠️ Never share your private key! Anyone with this key has full access to your wallet.
                      </div>
                      <div className="private-key-box">
                        <span className="private-key-text">{exportedPrivateKey}</span>
                        <CopyButton text={exportedPrivateKey} fieldName={`evmPrivateKey${index}`} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="no-wallet-container">
              <p className="no-wallet-text">No EVM wallet found</p>
              <button
                className="btn btn-create-wallet"
                onClick={handleCreateEvmWallet}
                disabled={creatingEvmWallet}
              >
                {creatingEvmWallet ? 'Creating...' : '+ Create EVM Wallet'}
              </button>
            </div>
          )}
        </div>

        {/* Solana Wallets */}
        <div className="profile-section">
          <h2 className="section-title">Solana Wallets ({solanaWallets.length})</h2>
          {solanaWallets.length > 0 ? (
            solanaWallets.map((wallet, index) => (
              <div key={wallet.address} className="wallet-item">
                <div className="wallet-header-row">
                  <span className="wallet-badge solana">Solana Wallet {index + 1}</span>
                  <span className="wallet-type-badge">{wallet.walletClientType}</span>
                </div>
                
                <div className="info-row">
                  <span className="info-label">Address:</span>
                  <div className="info-value-container">
                    <span className="info-value address-text">{wallet.address}</span>
                    <CopyButton text={wallet.address} fieldName={`solWallet${index}`} />
                  </div>
                </div>

                {wallet.connectorType && (
                  <div className="info-row">
                    <span className="info-label">Connector:</span>
                    <span className="info-value">{wallet.connectorType}</span>
                  </div>
                )}

                {wallet.imported !== undefined && (
                  <div className="info-row">
                    <span className="info-label">Imported:</span>
                    <span className="info-value">{wallet.imported ? 'Yes' : 'No'}</span>
                  </div>
                )}

                {wallet.walletIndex !== undefined && (
                  <div className="info-row">
                    <span className="info-label">Wallet Index:</span>
                    <span className="info-value">{wallet.walletIndex}</span>
                  </div>
                )}

                {wallet.publicKey && (
                  <div className="info-row">
                    <span className="info-label">Public Key:</span>
                    <div className="info-value-container">
                      <span className="info-value address-text">{wallet.publicKey}</span>
                      <CopyButton text={wallet.publicKey} fieldName={`solPubKey${index}`} />
                    </div>
                  </div>
                )}

                {/* Export Wallet Button */}
                <div className="export-wallet-section">
                  <button
                    className="btn-export-wallet solana"
                    onClick={() => handleExportWallet(wallet.address,wallet)}
                    disabled={exportingWallet && exportingWallet !== `solana-${wallet.address}`}
                  >
                    {exportingWallet === `solana-${wallet.address}` && exportedPrivateKey
                      ? '🔒 Hide Private Key'
                      : '🔑 Export Private Key'}
                  </button>

                  {exportingWallet === `solana-${wallet.address}` && exportedPrivateKey && (
                    <div className="private-key-container">
                      <div className="warning-banner">
                        ⚠️ Never share your private key! Anyone with this key has full access to your wallet.
                      </div>
                      <div className="private-key-box">
                        <span className="private-key-text">{exportedPrivateKey}</span>
                        <CopyButton text={exportedPrivateKey} fieldName={`solPrivateKey${index}`} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="no-wallet-container">
              <p className="no-wallet-text">No Solana wallet found</p>
              <button
                className="btn btn-create-wallet solana"
                onClick={handleCreateSolanaWallet}
                disabled={creatingSolanaWallet}
              >
                {creatingSolanaWallet ? 'Creating...' : '+ Create Solana Wallet'}
              </button>
            </div>
          )}
        </div>

        {/* Linked Accounts */}
        {user.linkedAccounts && user.linkedAccounts.length > 0 && (
          <div className="profile-section">
            <h2 className="section-title">Linked Accounts</h2>
            {user.linkedAccounts.map((account, index) => (
              <div key={index} className="account-item">
                <div className="info-row">
                  <span className="info-label">Type:</span>
                  <span className="info-value">{account.type}</span>
                </div>
                {account.address && (
                  <div className="info-row">
                    <span className="info-label">Address:</span>
                    <div className="info-value-container">
                      <span className="info-value address-text">{account.address}</span>
                      <CopyButton text={account.address} fieldName={`account${index}`} />
                    </div>
                  </div>
                )}
                {account.verifiedAt && (
                  <div className="info-row">
                    <span className="info-label">Verified:</span>
                    <span className="info-value">
                      {new Date(account.verifiedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;

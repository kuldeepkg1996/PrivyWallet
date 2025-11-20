import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PrivyProvider } from '@privy-io/react-auth'
import './index.css'
import App from './App'
import SignTransaction from './SignTransaction'
import SolanaSignTransaction from './SolanaSignTransaction'
import EvmSignMessage from './EvmSignMessage'
import SolanaSignMessage from './SolanaSignMessage'
import Profile from './Profile'
import { mainnet, base, optimism, polygon, arbitrum, bsc, baseSepolia } from 'viem/chains'
import { Buffer } from 'buffer';

(window as any).Buffer = Buffer;


// Your custom chain
const unichain = {
  id: 1301,
  name: 'Unichain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.unichain.org'] },
    public: { http: ['https://sepolia.unichain.org'] },
  },
  blockExplorers: {
    default: { name: 'Uniscan', url: 'https://sepolia.uniscan.xyz' },
  },
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}
createRoot(rootElement).render(
  <StrictMode>
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID || 'cmi20hx8p029ul10c880pqjfj'}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#6366f1',
        },
        loginMethods: ['passkey'],
        supportedChains: [mainnet, base, optimism, polygon, arbitrum, bsc, unichain, baseSepolia],

        // ✅ Enable embedded wallets for BOTH Ethereum and Solana
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets', // or 'all-users'
          },
          solana: {
            createOnLogin: 'users-without-wallets', // make sure Solana wallet exists for each user
          },
        },

        // ✅ Configure Solana RPC endpoint (default for embedded wallets)
        solana: {
          rpcEndpoint: 'https://api.devnet.solana.com',
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/signTransaction" element={<SignTransaction />} />
          <Route path="/evm/signMessage" element={<EvmSignMessage />} />
          <Route path="/solana/signTransaction" element={<SolanaSignTransaction />} />
          <Route path="/solana/signMessage" element={<SolanaSignMessage />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </BrowserRouter>
    </PrivyProvider>
  </StrictMode>
);

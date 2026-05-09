import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, ConnectButton, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { wagmiConfig } from "./config/wagmi";
import { OrderForm } from "./components/OrderForm";
import { BatchTimer } from "./components/BatchTimer";
import { MevComparison } from "./components/MevComparison";
import "./index.css";

const queryClient = new QueryClient();

function DocsPanel() {
  return (
    <div className="panel-overlay">
      <div className="panel-card">
        <div className="panel-title">Documentation</div>
        <div className="panel-sections">
          <div className="panel-section"><div className="panel-section-title">⬡ What is ShieldSwap?</div><p>A dark pool AMM on Zama fhEVM. Orders encrypted with FHE before hitting the mempool — sandwich attacks are structurally impossible.</p></div>
          <div className="panel-section"><div className="panel-section-title">⚡ Pool Swap</div><p>Instant swap against the encrypted liquidity pool. Uses oracle price. No relayer needed. ETH/USDC pair is live on Sepolia.</p></div>
          <div className="panel-section"><div className="panel-section-title">🔒 Private Batch</div><p>Submit FHE-encrypted orders to a 60-second batch auction. Orders matched at uniform clearing price, eliminating MEV. Requires Zama relayer.</p></div>
          <div className="panel-section"><div className="panel-section-title">◈ Vault</div><p>Deposit ETH into your encrypted vault for batch orders. Balances stored as FHE ciphertext — nobody can see your balance on-chain.</p></div>
          <div className="panel-section">
            <div className="panel-section-title">◎ Contracts (Sepolia)</div>
            <div className="panel-addresses">
              <div className="addr-row"><span>EncryptedPool</span><span className="addr">0xf69A...91f3</span></div>
              <div className="addr-row"><span>ShieldSwap</span><span className="addr">0x2797...240f</span></div>
              <div className="addr-row"><span>Oracle</span><span className="addr">0x6251...EA98</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BatchesPanel() {
  return (
    <div className="panel-overlay">
      <div className="panel-card">
        <div className="panel-title">Batch Auction</div>
        <div className="panel-sections">
          <div className="panel-section"><div className="panel-section-title">How batches work</div><p>Every 60 seconds a batch closes. All orders execute at the same uniform clearing price — no matter when in the window you submitted.</p></div>
          <div className="panel-section"><div className="panel-section-title">Why this kills MEV</div><p>A sandwich bot needs to know your order size to profit. With FHE, the order is ciphertext. Even if a bot sandwiches, the uniform price means they gain nothing — all fills are identical.</p></div>
          <div className="panel-section"><div className="panel-section-title">Settlement reward</div><p>Anyone can call settleBatch() after the window closes and earn 0.001 ETH. This creates a permissionless keeper network.</p></div>
          <div className="panel-section"><div className="panel-section-title">Current batch status</div><p>See the live countdown timer on the main screen. When a batch has at least 1 order and the window closes, it can be settled.</p></div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activePanel, setActivePanel] = useState<"none"|"batches"|"docs">("none");
  function togglePanel(panel:"batches"|"docs") { setActivePanel(p=>p===panel?"none":panel); }
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor:"#00ff88", accentColorForeground:"#000" })}>
          <div className="app">
            <header className="header">
              <div className="header-inner">
                <div className="logo">
                  <div className="logo-mark">
                    <svg width="22" height="22" viewBox="0 0 22 22">
                      <polygon points="11,2 19,6.5 19,15.5 11,20 3,15.5 3,6.5" fill="none" stroke="#000" strokeWidth="1.5"/>
                      <path d="M6,10 L14,10" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
                      <polygon points="14,8 17,10 14,12" fill="#000"/>
                      <path d="M16,14 L8,14" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
                      <polygon points="8,12 5,14 8,16" fill="#000"/>
                    </svg>
                  </div>
                  <div className="logo-text">
                    <span className="logo-name">ShieldSwap</span>
                    <span className="logo-tag">Dark Pool AMM</span>
                  </div>
                </div>
                <nav className="nav">
                  <span className="nav-item active">Swap</span>
                  <span className={`nav-item ${activePanel==="batches"?"active":""}`} onClick={()=>togglePanel("batches")}>Batches</span>
                  <span className={`nav-item ${activePanel==="docs"?"active":""}`} onClick={()=>togglePanel("docs")}>Docs</span>
                </nav>
                <ConnectButton />
              </div>
            </header>
            {activePanel==="batches"&&<BatchesPanel/>}
            {activePanel==="docs"&&<DocsPanel/>}
            <main className="main">
              <div className="hero">
                <div className="hero-badge"><span className="badge-dot"/>Live on Sepolia Testnet</div>
                <h1 className="hero-title">Private swaps.<br/><span className="hero-accent">Zero MEV.</span></h1>
                <p className="hero-sub">Orders encrypted with FHE. Batch-settled on-chain. Sandwich attacks are impossible by design.</p>
              </div>
              <div className="layout">
                <div className="layout-main"><BatchTimer/><OrderForm/></div>
                <div className="layout-side"><MevComparison/></div>
              </div>
            </main>
            <div className="grid-overlay"/>
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

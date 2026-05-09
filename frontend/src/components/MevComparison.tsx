export function MevComparison() {
  return (
    <div className="comparison-wrap">
      <div className="card comp-card">
        <div className="comp-header">
          <span className="comp-dot red" />
          <span className="comp-title">Traditional DEX</span>
          <span className="comp-tag danger">Vulnerable</span>
        </div>
        <div className="comp-timeline">
          <div className="timeline-item"><div className="tl-icon warn">1</div><div className="tl-content"><div className="tl-label">User broadcasts swap</div><div className="tl-sub">Order visible in mempool</div></div></div>
          <div className="tl-line red" />
          <div className="timeline-item"><div className="tl-icon danger">2</div><div className="tl-content"><div className="tl-label">Bot detects intention</div><div className="tl-sub">Sandwiches in ~50ms</div></div></div>
          <div className="tl-line red" />
          <div className="timeline-item"><div className="tl-icon danger">3</div><div className="tl-content"><div className="tl-label">User gets bad price</div><div className="tl-sub red">Mar 12 — $50M extracted</div></div></div>
        </div>
        <div className="comp-incident">
          <div className="incident-label">Mar 12 · Sandwich on Aave</div>
          <div className="incident-val red">$9.9M bot profit</div>
        </div>
      </div>
      <div className="card comp-card">
        <div className="comp-header">
          <span className="comp-dot green" />
          <span className="comp-title">ShieldSwap</span>
          <span className="comp-tag safe">Protected</span>
        </div>
        <div className="comp-timeline">
          <div className="timeline-item"><div className="tl-icon safe">1</div><div className="tl-content"><div className="tl-label">Order FHE-encrypted</div><div className="tl-sub">Ciphertext only on-chain</div></div></div>
          <div className="tl-line green" />
          <div className="timeline-item"><div className="tl-icon safe">2</div><div className="tl-content"><div className="tl-label">Batch accumulates</div><div className="tl-sub">Intents stay hidden</div></div></div>
          <div className="tl-line green" />
          <div className="timeline-item"><div className="tl-icon safe">3</div><div className="tl-content"><div className="tl-label">Uniform clearing price</div><div className="tl-sub green">MEV structurally impossible</div></div></div>
        </div>
        <div className="comp-incident">
          <div className="incident-label">Protected value</div>
          <div className="incident-val green">100% of notional</div>
        </div>
      </div>
      <div className="card tech-card">
        <div className="tech-title">How it works</div>
        <div className="tech-items">
          <div className="tech-item"><span className="tech-icon">⬡</span><div><div className="tech-name">Zama fhEVM</div><div className="tech-desc">Orders encrypted with TFHE, never revealed in mempool</div></div></div>
          <div className="tech-item"><span className="tech-icon">◈</span><div><div className="tech-name">Encrypted Pool</div><div className="tech-desc">Reserves stored as FHE ciphertext — pool depth hidden from bots</div></div></div>
          <div className="tech-item"><span className="tech-icon">◎</span><div><div className="tech-name">Keeper Network</div><div className="tech-desc">0.001 ETH reward for batch settlement, permissionless</div></div></div>
        </div>
      </div>
    </div>
  );
}

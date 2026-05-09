import { useCurrentBatch, useTimeUntilClose } from "../hooks/useShieldSwap";

export function BatchTimer() {
  const { data: batchRaw } = useCurrentBatch();
  const { data: timeRaw }  = useTimeUntilClose();
  const batch      = batchRaw as any;
  const seconds    = timeRaw !== undefined ? Number(timeRaw) : null;
  const circ       = 2 * Math.PI * 28;
  const dashOffset = circ * (1 - (seconds !== null ? Math.max(0, Math.min(1, seconds / 60)) : 0));
  const batchId    = batch?.batchId    !== undefined ? Number(batch.batchId)    : null;
  const orderCount = batch?.orderCount !== undefined ? Number(batch.orderCount) : null;
  const status     = batch?.status     !== undefined ? Number(batch.status)     : null;
  const label = seconds === null ? "Connecting..."
    : status === 1 ? "Settled" : status === 2 ? "Failed"
    : orderCount === 0 ? "Awaiting orders"
    : orderCount + " order" + (orderCount === 1 ? "" : "s") + " queued";
  const ringColor = seconds !== null && seconds < 10 ? "#ff4444" : "#00ff88";
  return (
    <div className="card batch-card">
      <div className="batch-inner">
        <div className="batch-ring-wrap">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="28" fill="none" stroke="#1a1a1a" strokeWidth="4" />
            <circle cx="36" cy="36" r="28" fill="none" stroke={ringColor} strokeWidth="4"
              strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dashOffset}
              transform="rotate(-90 36 36)" style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }} />
          </svg>
          <div className="batch-time">{seconds !== null ? seconds + "s" : "..."}</div>
        </div>
        <div className="batch-info">
          <div className="batch-label">Current Batch</div>
          <div className="batch-status">{label}</div>
          <div className="batch-id">{batchId !== null ? "#" + batchId : "—"}</div>
        </div>
        <div className="batch-stats">
          <div className="stat"><span className="stat-val">1</span><span className="stat-key">min orders</span></div>
          <div className="stat-sep" />
          <div className="stat"><span className="stat-val">8</span><span className="stat-key">max orders</span></div>
          <div className="stat-sep" />
          <div className="stat"><span className="stat-val">0.001</span><span className="stat-key">ETH reward</span></div>
        </div>
      </div>
    </div>
  );
}

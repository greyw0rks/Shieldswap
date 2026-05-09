import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { parseEther, formatUnits } from "viem";
import { useFhevm } from "../hooks/useFhevm";
import { useSubmitOrder, useDepositEth, useWithdrawEth } from "../hooks/useShieldSwap";
import { useSwapEthForUsdc, usePoolHasLiquidity, usePoolTrackEth, usePoolTrackUsdc } from "../hooks/usePool";
import ShieldSwapABI from "../constants/ShieldSwap.json";
import EncryptedPoolABI from "../constants/EncryptedPool.json";
import { SHIELDSWAP_ADDRESS, POOL_ADDRESS } from "../config/wagmi";

type Tab = "swap"|"deposit"|"withdraw";
type SwapMode = "pool"|"batch";

const TOKENS = [
  { symbol:"ETH",  name:"Ethereum",       icon:"⟠", live:true  },
  { symbol:"USDC", name:"USD Coin",        icon:"◎", live:true  },
  { symbol:"WBTC", name:"Wrapped Bitcoin", icon:"₿", live:false },
  { symbol:"DAI",  name:"Dai Stablecoin",  icon:"◈", live:false },
  { symbol:"LINK", name:"Chainlink",       icon:"⬡", live:false },
  { symbol:"UNI",  name:"Uniswap",         icon:"◆", live:false },
];
const ORACLE_PRICE = 2000;

function TokenSelect({ value, onChange, exclude }:{ value:string; onChange:(t:string)=>void; exclude:string }) {
  const [open, setOpen] = useState(false);
  const token = TOKENS.find(t=>t.symbol===value)!;
  return (
    <div className="token-select-wrap">
      <button className="token-select-btn" onClick={()=>setOpen(o=>!o)}>
        <span className="token-icon">{token.icon}</span>
        <span className="token-symbol">{token.symbol}</span>
        <span className="token-chevron">▾</span>
      </button>
      {open && (<>
        <div className="token-dropdown-backdrop" onClick={()=>setOpen(false)} />
        <div className="token-dropdown">
          {TOKENS.filter(t=>t.symbol!==exclude).map(t=>(
            <button key={t.symbol} className={`token-option ${!t.live?"disabled":""} ${t.symbol===value?"selected":""}`}
              onClick={()=>{ if(t.live){onChange(t.symbol);setOpen(false);} }}>
              <span className="token-icon">{t.icon}</span>
              <div className="token-option-info">
                <span className="token-option-symbol">{t.symbol}</span>
                <span className="token-option-name">{t.name}</span>
              </div>
              {!t.live?<span className="token-soon">Soon</span>:t.symbol===value&&<span className="token-check">✓</span>}
            </button>
          ))}
        </div>
      </>)}
    </div>
  );
}

function calcReceive(tokenIn:string, tokenOut:string, amount:string):string {
  const a=parseFloat(amount); if(!a||isNaN(a)) return "";
  const FEE=1-0.003;
  if(tokenIn==="ETH"&&tokenOut==="USDC") return (a*ORACLE_PRICE*FEE).toFixed(2);
  if(tokenIn==="USDC"&&tokenOut==="ETH") return (a/ORACLE_PRICE*FEE).toFixed(6);
  return "";
}

export function OrderForm() {
  const { address } = useAccount();
  const { isReady:fheReady, error:fheError, encryptOrder } = useFhevm();
  const { data:poolHasLiq } = usePoolHasLiquidity();
  const { data:trackEth }   = usePoolTrackEth();
  const { data:trackUsdc }  = usePoolTrackUsdc();
  const submitOrderHook = useSubmitOrder();
  const depositEthHook  = useDepositEth();
  const withdrawEthHook = useWithdrawEth();
  const swapPoolHook    = useSwapEthForUsdc();

  const [tokenIn,setTokenIn]   = useState("ETH");
  const [tokenOut,setTokenOut] = useState("USDC");
  const [amountIn,setAmountIn] = useState("");
  const [slippage,setSlippage] = useState("0.5");
  const [depositAmt,setDepositAmt]   = useState("");
  const [withdrawAmt,setWithdrawAmt] = useState("");
  const [status,setStatus]   = useState<string|null>(null);
  const [busy,setBusy]       = useState(false);
  const [tab,setTab]         = useState<Tab>("swap");
  const [swapMode,setSwapMode] = useState<SwapMode>("pool");

  const amountOut = calcReceive(tokenIn,tokenOut,amountIn);
  const BALANCE_KEY = `shieldswap_vault_${address??"anon"}`;
  const [localBalance,setLocalBalance] = useState<number>(0);

  useEffect(()=>{
    if(!address) return;
    try { setLocalBalance(parseFloat(localStorage.getItem(`shieldswap_vault_${address}`)??"0")||0); }
    catch { setLocalBalance(0); }
  },[address]);

  function updateBalance(val:number) {
    setLocalBalance(val);
    try { localStorage.setItem(BALANCE_KEY,val.toString()); } catch {}
  }

  const pairIsLive=(tokenIn==="ETH"&&tokenOut==="USDC")||(tokenIn==="USDC"&&tokenOut==="ETH");
  const poolEthDisplay  = trackEth  ? parseFloat(formatUnits(trackEth as bigint,9)).toFixed(4) : "—";
  const poolUsdcDisplay = trackUsdc ? (Number(trackUsdc)/1e6).toFixed(2) : "—";

  function flipTokens(){ setTokenIn(tokenOut); setTokenOut(tokenIn); setAmountIn(""); }

  async function handlePoolSwap() {
    if(!address||!amountIn) return;
    if(!pairIsLive){setStatus("⚠ This pair is not yet deployed");return;}
    setBusy(true); setStatus("Swapping via pool…");
    try {
      if(tokenIn==="ETH") {
        await swapPoolHook.writeContractAsync({ address:POOL_ADDRESS as `0x${string}`, abi:EncryptedPoolABI.abi, functionName:"swapEthForUsdc", args:[address], value:parseEther(amountIn) });
        setStatus("✓ Swapped ETH → USDC");
      } else { setStatus("⚠ USDC→ETH: approve USDC first"); }
    } catch(e:any){ setStatus(`✗ ${e.shortMessage??e.message}`); }
    finally { setBusy(false); }
  }

  async function handleBatchOrder() {
    if(!address||!amountIn) return;
    if(!fheReady){setStatus("⚠ FHE relayer offline — use Pool Swap");return;}
    setBusy(true); setStatus("Encrypting order…");
    try {
      const amtGwei=parseEther(amountIn)/1_000_000_000n;
      const slipBps=BigInt(Math.floor(parseFloat(slippage)*100));
      const minOut=amtGwei-(amtGwei*slipBps/10000n);
      const enc=await encryptOrder(address,tokenIn==="ETH"?1:0 as 0|1,amtGwei,minOut);
      setStatus("Submitting to batch…");
      await submitOrderHook.writeContractAsync({ address:SHIELDSWAP_ADDRESS as `0x${string}`, abi:ShieldSwapABI.abi, functionName:"submitOrder", args:[enc.handles[0],enc.handles[1],enc.handles[2],enc.inputProof] });
      setStatus("✓ Order submitted to batch");
    } catch(e:any){ setStatus(`✗ ${e.shortMessage??e.message}`); }
    finally { setBusy(false); }
  }

  async function handleDeposit() {
    if(!depositAmt||!address) return;
    setBusy(true); setStatus("Depositing ETH to vault…");
    try {
      await depositEthHook.writeContractAsync({ address:SHIELDSWAP_ADDRESS as `0x${string}`, abi:ShieldSwapABI.abi, functionName:"depositEth", value:parseEther(depositAmt) });
      updateBalance(localBalance+parseFloat(depositAmt));
      setStatus("✓ Deposited successfully"); setDepositAmt("");
    } catch(e:any){ setStatus(`✗ ${e.shortMessage??e.message}`); }
    finally { setBusy(false); }
  }

  async function handleWithdraw() {
    if(!withdrawAmt||!address) return;
    setBusy(true); setStatus("Withdrawing from vault…");
    try {
      const gweiAmt=parseEther(withdrawAmt)/1_000_000_000n;
      await withdrawEthHook.writeContractAsync({ address:SHIELDSWAP_ADDRESS as `0x${string}`, abi:ShieldSwapABI.abi, functionName:"withdrawEth", args:[gweiAmt] });
      updateBalance(Math.max(0,localBalance-parseFloat(withdrawAmt)));
      setStatus("✓ Withdrawn to wallet"); setWithdrawAmt("");
    } catch(e:any){ setStatus(`✗ ${e.shortMessage??e.message}`); }
    finally { setBusy(false); }
  }

  const sc=status?.startsWith("✓")?"ok":(status?.startsWith("✗")||status?.startsWith("⚠"))?"err":"";
  const btnLabel=!address?"Connect wallet":!pairIsLive?`${tokenIn}/${tokenOut} — pair not deployed`:busy?"Processing…":swapMode==="pool"?`Swap ${tokenIn} → ${tokenOut}`:"Place Order";

  return (
    <div className="card order-card">
      <div className="card-tabs">
        <button className={`tab ${tab==="swap"?"active":""}`} onClick={()=>{setTab("swap");setStatus(null);}}>Swap</button>
        <button className={`tab ${tab==="deposit"?"active":""}`} onClick={()=>{setTab("deposit");setStatus(null);}}>Deposit</button>
        <button className={`tab ${tab==="withdraw"?"active":""}`} onClick={()=>{setTab("withdraw");setStatus(null);}}>Withdraw</button>
      </div>

      {tab==="swap"&&(
        <div className="form">
          <div className="pool-stats-bar">
            <span className="pool-stat"><span className="pool-stat-label">Pool ETH</span><span className="pool-stat-val">{poolEthDisplay}</span></span>
            <span className="pool-stat-sep"/>
            <span className="pool-stat"><span className="pool-stat-label">Pool USDC</span><span className="pool-stat-val">${poolUsdcDisplay}</span></span>
            <span className="pool-stat-sep"/>
            <span className={`pool-liq-badge ${poolHasLiq?"active":"empty"}`}>{poolHasLiq?"● Liquidity available":"○ No liquidity"}</span>
          </div>
          <div className="mode-toggle">
            <button className={`mode-btn ${swapMode==="pool"?"active":""}`} onClick={()=>setSwapMode("pool")}>
              <span className="mode-icon">⚡</span><div><div className="mode-name">Pool Swap</div><div className="mode-desc">Instant · No relayer</div></div>
            </button>
            <button className={`mode-btn ${swapMode==="batch"?"active":""}`} onClick={()=>setSwapMode("batch")}>
              <span className="mode-icon">🔒</span><div><div className="mode-name">Private Batch</div><div className="mode-desc">FHE encrypted · MEV proof</div></div>
            </button>
          </div>
          <div className="swap-box-stack">
            <div className="swap-box">
              <div className="swap-box-label">You pay</div>
              <div className="swap-box-row">
                <input className="swap-box-input" type="number" placeholder="0" value={amountIn} onChange={e=>setAmountIn(e.target.value)}/>
                <TokenSelect value={tokenIn} onChange={v=>{setTokenIn(v);if(v===tokenOut)setTokenOut(v==="ETH"?"USDC":"ETH");setAmountIn("");}} exclude={tokenOut}/>
              </div>
            </div>
            <div className="swap-flip-row"><button className="swap-flip-btn" onClick={flipTokens}>↕</button></div>
            <div className="swap-box receive">
              <div className="swap-box-label">You receive</div>
              <div className="swap-box-row">
                <div className={`swap-box-input receive-val ${amountOut?"":"empty"}`}>{amountOut||"0"}</div>
                <TokenSelect value={tokenOut} onChange={v=>{setTokenOut(v);if(v===tokenIn)setTokenIn(v==="ETH"?"USDC":"ETH");setAmountIn("");}} exclude={tokenIn}/>
              </div>
              {amountOut&&pairIsLive&&<div className="swap-rate-hint">1 {tokenIn} ≈ {tokenIn==="ETH"?`${ORACLE_PRICE} USDC`:`${(1/ORACLE_PRICE).toFixed(6)} ETH`} · 0.30% fee</div>}
            </div>
          </div>
          {!pairIsLive&&tokenIn&&tokenOut&&<div className="pair-unavailable"><span>⚠</span><span>{tokenIn}/{tokenOut} pool not yet deployed — coming soon</span></div>}
          {swapMode==="batch"&&pairIsLive&&(
            <div className="input-group">
              <label className="input-label">Max slippage</label>
              <div className="slippage-row">
                {["0.1","0.5","1.0"].map(v=><button key={v} className={`slip-btn ${slippage===v?"active":""}`} onClick={()=>setSlippage(v)}>{v}%</button>)}
                <div className="input-wrap slip-wrap"><input className="input slip-input" type="number" value={slippage} onChange={e=>setSlippage(e.target.value)}/><span className="input-suffix">%</span></div>
              </div>
            </div>
          )}
          <div className="privacy-notice">
            {swapMode==="pool"?<><span className="priv-icon">⚡</span><span>Direct pool swap — instant execution at oracle price</span></>
            :<><span className="priv-icon">🔒</span><span>FHE encrypted — order invisible until settlement</span>{fheError&&<span className="priv-warn"> (relayer offline)</span>}</>}
          </div>
          <button className="submit-btn" onClick={swapMode==="pool"?handlePoolSwap:handleBatchOrder} disabled={busy||!address||!amountIn||!pairIsLive}>
            {busy&&<span className="spinner"/>}{btnLabel}
          </button>
          {status&&<div className={`status-msg ${sc}`}>{status}</div>}
        </div>
      )}

      {tab==="deposit"&&(
        <div className="form">
          <div className="vault-balance-banner"><span className="vb-label">Vault balance</span><span className="vb-value">{localBalance.toFixed(4)} ETH</span></div>
          <div className="info-box"><div className="info-icon">ℹ</div><p>Deposit ETH into the encrypted vault for use with private batch orders. Withdraw any time before matching.</p></div>
          <div className="input-group">
            <label className="input-label">Amount to deposit</label>
            <div className="input-wrap"><input className="input" type="number" placeholder="0.00" value={depositAmt} onChange={e=>setDepositAmt(e.target.value)}/><span className="input-suffix">ETH</span></div>
          </div>
          <button className="submit-btn" onClick={handleDeposit} disabled={busy||!address||!depositAmt}>{busy&&<span className="spinner"/>}{!address?"Connect wallet":busy?"Depositing…":"Deposit to Vault"}</button>
          {status&&<div className={`status-msg ${sc}`}>{status}</div>}
        </div>
      )}

      {tab==="withdraw"&&(
        <div className="form">
          <div className="vault-balance-banner"><span className="vb-label">Vault balance</span><span className="vb-value">{localBalance.toFixed(4)} ETH</span></div>
          <div className="info-box"><div className="info-icon">ℹ</div><p>Withdraw ETH from the vault back to your wallet. Funds not locked in active orders withdraw instantly.</p></div>
          <div className="input-group">
            <label className="input-label">Amount to withdraw</label>
            <div className="input-wrap"><input className="input" type="number" placeholder="0.00" value={withdrawAmt} onChange={e=>setWithdrawAmt(e.target.value)}/><span className="input-suffix">ETH</span></div>
            {localBalance>0&&<div className="input-hint"><button className="max-btn" onClick={()=>setWithdrawAmt(localBalance.toFixed(6))}>WITHDRAW MAX</button></div>}
          </div>
          <button className="submit-btn withdraw-btn" onClick={handleWithdraw} disabled={busy||!address||!withdrawAmt}>{busy&&<span className="spinner"/>}{!address?"Connect wallet":busy?"Withdrawing…":"Withdraw to Wallet"}</button>
          {status&&<div className={`status-msg ${sc}`}>{status}</div>}
        </div>
      )}
    </div>
  );
}

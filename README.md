# ShieldSwap — Dark Pool AMM on Zama fhEVM

> **Zama Confidential DeFi Bounty Submission**

[![Live Demo](https://img.shields.io/badge/demo-live-00ff88?style=flat-square)](https://shieldswap-xi.vercel.app)
[![Sepolia](https://img.shields.io/badge/network-Sepolia-blue?style=flat-square)](https://sepolia.etherscan.io)
[![Tests](https://img.shields.io/badge/tests-21%20passing-00ff88?style=flat-square)](#testing)
[![FHE](https://img.shields.io/badge/FHE-Zama%20fhEVM-purple?style=flat-square)](https://github.com/zama-ai/fhevm)

Private swaps. Zero MEV.

---

## The Problem

On March 12, 2026, a trader used Aave's interface to swap **$50 million USDT** for AAVE tokens. An MEV bot detected the pending transaction in the mempool, flash-borrowed $29 million to pump the price, and sandwiched the order. The trader received **$36,000** instead of $50 million. The bot pocketed **$9.9 million** in under one block.

This was not a hack. The protocol worked exactly as designed. The problem is that on a public blockchain, your trade intention is visible to everyone before it executes.

Aave's response was Aave Shield — a UI warning that blocks trades above 25% price impact. That is a patch on top of a structural problem.

**ShieldSwap is the structural fix.**

---

## How It Works

```
User encrypts order (FHE)          Pool reserves stay hidden
        │                                    │
        ▼                                    ▼
submitOrder() → ciphertext        swapEthForUsdc() → euint64
        │                                    │
        ▼                                    ▼
60s batch accumulates             FHE.add / FHE.sub on-chain
        │                                    │
        ▼                                    ▼
FHE matching on ciphertext        Bot sees tx happened
        │                         Bot cannot read new reserves
        ▼
Uniform clearing price
MEV incentive = 0
```

### Two Layers of MEV Protection

**Layer 1 — Encrypted Liquidity Pool**
Pool reserves (`_poolEthGwei`, `_poolUsdc`) are stored as `euint64` FHE handles on-chain. A bot monitoring the mempool can see that a swap occurred but cannot read the new reserve ratio. Without knowing pool depth, calculating a profitable sandwich is impossible.

**Layer 2 — Private Batch Auction**
Orders are encrypted client-side using Zama's fhEVM SDK before they touch the network. What gets submitted on-chain is pure ciphertext. Orders accumulate for 60 seconds and settle at a **uniform clearing price** — every matched order gets the same price regardless of submission time. The informational edge that makes MEV extraction possible disappears entirely.

---

## FHE Implementation

### 1. Encrypted Order Book

```solidity
struct EncryptedOrder {
    address owner;
    euint8  direction;     // 0 = buy ETH, 1 = sell ETH — hidden
    euint64 amountIn;      // input amount — hidden
    euint64 minAmountOut;  // limit price — hidden
    uint256 batchId;
}
```

Orders submitted via `submitOrder(einput, einput, einput, bytes proof)`. The contract stores FHE handles — values never appear in plaintext on-chain.

### 2. FHE Matching Circuit

```solidity
function _runFheMatching(uint256 batchId, uint64 clearingPrice) internal {
    euint8 buyDirection = FHE.asEuint8(0);

    for (uint256 i = 0; i < orderCount; i++) {
        // FHE comparison on ciphertext
        ebool isBuy      = FHE.eq(order.direction, buyDirection);
        ebool meetsLimit = FHE.ge(FHE.asEuint64(clearingPrice), order.minAmountOut);
        ebool matched    = FHE.and(isBuy, meetsLimit);

        // Select output without revealing individual order state
        euint64 credit   = FHE.select(matched, computedOutput, FHE.asEuint64(0));
        _settlementCredits[orderId] = credit;
        FHE.allow(credit, order.owner); // only owner can decrypt
    }
}
```

The contract runs `FHE.eq`, `FHE.ge`, `FHE.and`, `FHE.select` directly on ciphertext. No individual order is ever decrypted during execution.

### 3. Encrypted Pool Reserves

```solidity
euint64 private _poolEthGwei;   // pool ETH reserve — hidden
euint64 private _poolUsdc;      // pool USDC reserve — hidden

function swapEthForUsdc(address recipient) external payable {
    uint64 ethGwei = uint64(msg.value / 1 gwei);
    // ...fee calculation...
    
    // Update reserves as FHE operations — new ratio stays hidden
    _poolEthGwei = FHE.add(_poolEthGwei, FHE.asEuint64(ethNet));
    _poolUsdc    = FHE.sub(_poolUsdc,    FHE.asEuint64(usdcOut));
    FHE.allowThis(_poolEthGwei);
    FHE.allowThis(_poolUsdc);
}
```

Inputs are plaintext (user sends ETH), outputs are plaintext (user receives USDC), but the pool state update is FHE — **zero relayer dependency for pool swaps**.

### 4. Encrypted Vault Balances

```solidity
mapping(address => euint64) private _ethBalance;

function depositEth() external payable {
    uint64 gweiAmount = uint64(msg.value / 1 gwei);
    _ethBalance[msg.sender] = FHE.add(_ethBalance[msg.sender], FHE.asEuint64(gweiAmount));
    FHE.allowThis(_ethBalance[msg.sender]);
    FHE.allow(_ethBalance[msg.sender], msg.sender); // only owner can decrypt
}
```

---

## Architecture

```
contracts/
├── MockAggregatorV3.sol   Chainlink-compatible price oracle (testnet)
├── EncryptedVault.sol     FHE-encrypted ETH + USDC balances per user
├── EncryptedPool.sol      AMM pool with encrypted reserves, 0.30% fee
└── ShieldSwap.sol         Batch auction DEX (inherits EncryptedVault)

frontend/
├── src/
│   ├── config/wagmi.ts         Chain config + contract addresses
│   ├── hooks/
│   │   ├── useFhevm.ts         FHE SDK singleton, graceful offline degradation
│   │   ├── useShieldSwap.ts    Batch auction hooks
│   │   └── usePool.ts          Pool swap + liquidity hooks
│   └── components/
│       ├── BatchTimer.tsx       Live 60s countdown with animated ring
│       ├── OrderForm.tsx        Swap / Deposit / Withdraw with token selector
│       └── MevComparison.tsx    Side-by-side MEV attack visualization
```

---

## Deployed Contracts (Sepolia)

| Contract | Address | Etherscan |
|---|---|---|
| MockAggregatorV3 | `0x625119177171b6Ac704F3FB751456f5e3032EA98` | [View](https://sepolia.etherscan.io/address/0x625119177171b6Ac704F3FB751456f5e3032EA98) |
| EncryptedPool | `0xf69AcB5A80256235ABAff2A1041feECe964d91f3` | [View](https://sepolia.etherscan.io/address/0xf69AcB5A80256235ABAff2A1041feECe964d91f3) |
| ShieldSwap | `0x2797ca7aE3d2C70a654e159659b276Bf5853240f` | [View](https://sepolia.etherscan.io/address/0x2797ca7aE3d2C70a654e159659b276Bf5853240f) |
| USDC (Sepolia) | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | Circle Official |

---

## Live Demo

**[shieldswap-xi.vercel.app](https://shieldswap-xi.vercel.app)**

### What You Can Do Right Now

| Feature | Status | Notes |
|---|---|---|
| Pool Swap ETH → USDC | ✅ Live | Instant, no relayer, real USDC |
| Deposit ETH to vault | ✅ Live | FHE-encrypted balance |
| Withdraw ETH from vault | ✅ Live | Any time before matching |
| Batch timer | ✅ Live | Reads live from contract |
| Token selector | ✅ Live | ETH/USDC live, others coming |
| Private batch orders | ⏳ Pending | Requires Zama relayer (testnet infra) |

### How to Test a Swap

1. Get Sepolia ETH from [sepoliafaucet.com](https://sepoliafaucet.com)
2. Get Sepolia USDC from [faucet.circle.com](https://faucet.circle.com)
3. Visit [shieldswap-xi.vercel.app](https://shieldswap-xi.vercel.app)
4. Connect MetaMask on Sepolia
5. Select **Pool Swap** mode
6. Enter an amount — You Receive calculates automatically
7. Click **Swap ETH → USDC** and confirm in MetaMask

---

## Testing

```bash
git clone https://github.com/greyw0rks/Shieldswap
cd Shieldswap
npm install --legacy-peer-deps
npx hardhat test
```

**21 tests passing:**

```
ShieldSwap
  Batch lifecycle
    ✓ opens a batch on deployment with correct timing
    ✓ timeUntilClose returns 0 after batch window
  Order submission
    ✓ accepts a buy order and returns an orderId
    ✓ accepts a sell order and returns an orderId
    ✓ reverts when batch window has expired
    ✓ reverts when batch is full
  Settlement
    ✓ settles a batch and opens a new one
    ✓ reverts settleBatch before window closes
    ✓ marks batch failed when oracle returns bad price
    ✓ pays keeper reward on settlement
  FHE settlement credits
    ✓ stores an encrypted credit for a buy order after settlement
    ✓ third party cannot decrypt another user's credit
  Claim
    ✓ allows order owner to claim after settlement
    ✓ reverts double claim
    ✓ reverts claim by non-owner
    ✓ allows reclaim from failed batch
  EncryptedVault
    ✓ accepts ETH deposit and stores encrypted balance
    ✓ allows ETH withdrawal
  EncryptedPool
    ✓ accepts liquidity with ETH and USDC
    ✓ executes ETH to USDC swap correctly
    ✓ rejects swap when pool has no liquidity

21 passing
```

---

## Run Frontend Locally

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
# → http://localhost:5173
```

---

## Security Properties

| Property | Mechanism |
|---|---|
| Order privacy | TFHE encryption — direction and size hidden until settlement |
| Pool privacy | Reserves stored as `euint64` — depth invisible to observers |
| Anti-sandwich | Encrypted order intent + uniform clearing price |
| Anti-frontrun | No plaintext intent visible in mempool |
| Reentrancy protection | `ReentrancyGuard` on all state-changing functions |
| User fund safety | `reclaimFromFailedBatch()` always recoverable |
| Keeper permissionless | Anyone can call `settleBatch()` after window |
| Access control | `FHE.allow()` gates decryption to balance owner only |

---

## Key Design Decisions

| Decision | Reason |
|---|---|
| `euint64` for amounts, ETH stored in gwei | Stays within safe range for FHE operations |
| Scalar division for clearing price | `FHE.div` on encrypted divisors not available in fhEVM v0.6 |
| `MAX_ORDERS = 8` | Gas budget ceiling for FHE ops per settlement tx |
| `SETTLEMENT_REWARD = 0.001 ETH` | Incentivizes permissionless keeper network |
| Pool uses plaintext I/O, encrypted state | Zero relayer dependency for pool swaps |
| `FHE` library name not `TFHE` | Zama fhEVM v0.6 API naming |

---

## Known Limitations

**Zama Relayer Offline**
Browser-side FHE encryption for batch orders requires `relayer.testnet.zama.ai` to be reachable. This service is currently offline on Zama's testnet infrastructure. The frontend degrades gracefully — pool swaps, deposits, and withdrawals work fully. Batch order submission activates automatically when the relayer comes online with zero code changes required.

**Testnet Oracle**
`MockAggregatorV3` returns a hardcoded $2000 ETH price. Production deployment would use a live Chainlink feed.

**Single Trading Pair**
Current deployment supports ETH/USDC. Additional pairs deploy as independent EncryptedPool instances with their own price feeds — the architecture is identical.

**Scalar Clearing Price**
Due to `FHE.div` not supporting encrypted divisors, the clearing price uses plaintext oracle arithmetic. Individual order privacy is fully preserved — only the aggregate clearing price is plaintext.

---

## Tech Stack

| Layer | Technology |
|---|---|
| FHE | [Zama fhEVM](https://github.com/zama-ai/fhevm) v0.6 |
| Smart contracts | Solidity 0.8.24 |
| Development | Hardhat 2.x + `@fhevm/hardhat-plugin` |
| Frontend | React 18 + Vite 5 + TypeScript |
| Wallet | wagmi v2 + RainbowKit v2 |
| Network | Ethereum Sepolia testnet |
| Deployment | Vercel |

---

## Inspiration

> *"The March 2026 Aave sandwich attack was not a hack. It was DeFi working as designed — with MEV bots exploiting the transparency that makes public blockchains trustless. ShieldSwap proposes that trustlessness and privacy are not mutually exclusive. FHE gives us a cryptographic primitive to have both."*

---

## License

MIT

import { useReadContract, useWriteContract } from "wagmi";
import ShieldSwapABI from "../constants/ShieldSwap.json";
import { SHIELDSWAP_ADDRESS } from "../config/wagmi";

const abi = (ShieldSwapABI as any).abi ?? ShieldSwapABI;
const CONTRACT = { address: SHIELDSWAP_ADDRESS as `0x${string}`, abi };

export function useCurrentBatch() {
  return useReadContract({ ...CONTRACT, functionName: "getCurrentBatch" });
}
export function useTimeUntilClose() {
  return useReadContract({ ...CONTRACT, functionName: "timeUntilClose", query: { refetchInterval: 1000 } });
}
export function useSubmitOrder()  { return useWriteContract(); }
export function useDepositEth()   { return useWriteContract(); }
export function useWithdrawEth()  { return useWriteContract(); }
export function useSettleBatch()  { return useWriteContract(); }

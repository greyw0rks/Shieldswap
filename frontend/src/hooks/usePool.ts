import { useReadContract, useWriteContract } from "wagmi";
import EncryptedPoolABI from "../constants/EncryptedPool.json";
import { POOL_ADDRESS } from "../config/wagmi";

const abi = (EncryptedPoolABI as any).abi ?? EncryptedPoolABI;
const CONTRACT = { address: POOL_ADDRESS as `0x${string}`, abi };

export function usePoolHasLiquidity() {
  return useReadContract({ ...CONTRACT, functionName: "hasLiquidity" });
}
export function usePoolTrackEth() {
  return useReadContract({ ...CONTRACT, functionName: "trackEthGwei", query: { refetchInterval: 5000 } });
}
export function usePoolTrackUsdc() {
  return useReadContract({ ...CONTRACT, functionName: "trackUsdc", query: { refetchInterval: 5000 } });
}
export function useSwapEthForUsdc()  { return useWriteContract(); }
export function useSwapUsdcForEth()  { return useWriteContract(); }
export function useAddLiquidity()    { return useWriteContract(); }
export function useRemoveLiquidity() { return useWriteContract(); }

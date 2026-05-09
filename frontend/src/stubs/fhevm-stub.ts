// Stub for @zama-fhe/relayer-sdk — replaced at runtime if relayer is available
export const SepoliaConfig = {
  relayerUrl: "https://relayer.testnet.zama.ai",
};

export async function createInstance(_config: any): Promise<any> {
  throw new Error("Zama relayer not available");
}

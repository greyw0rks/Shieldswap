import { useEffect, useRef, useState } from "react";
import { SHIELDSWAP_ADDRESS } from "../config/wagmi";

type FhevmInstance = any;
let globalInstance: FhevmInstance | null = null;
let initDone = false;

async function getOrCreateInstance(): Promise<FhevmInstance | null> {
  if (initDone) return globalInstance;
  initDone = true;
  try {
    const { createInstance, SepoliaConfig } = await import("@zama-fhe/relayer-sdk/bundle");
    const inst = await Promise.race([
      createInstance(SepoliaConfig),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
    ]);
    globalInstance = inst;
    return inst;
  } catch { return null; }
}

export function useFhevm() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const instanceRef           = useRef<FhevmInstance | null>(null);

  useEffect(() => {
    getOrCreateInstance().then((inst) => {
      instanceRef.current = inst;
      setIsReady(!!inst);
      if (!inst) setError("Zama relayer offline");
    });
  }, []);

  async function encryptOrder(userAddress: string, direction: 0|1, amountIn: bigint, minAmountOut: bigint) {
    if (!instanceRef.current) throw new Error("fhEVM relayer not available");
    return instanceRef.current
      .createEncryptedInput(SHIELDSWAP_ADDRESS, userAddress)
      .add8(direction).add64(amountIn).add64(minAmountOut).encrypt();
  }

  return { isReady, error, instance: instanceRef.current, encryptOrder };
}

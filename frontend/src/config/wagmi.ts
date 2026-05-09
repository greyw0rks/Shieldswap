import { http, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

export const USDC_ADDRESS       = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
export const POOL_ADDRESS       = "0xf69AcB5A80256235ABAff2A1041feECe964d91f3";
export const SHIELDSWAP_ADDRESS = "0x2797ca7aE3d2C70a654e159659b276Bf5853240f";

export const wagmiConfig = getDefaultConfig({
  appName: "ShieldSwap",
  projectId: "shieldswap-demo",
  chains: [sepolia],
  transports: { [sepolia.id]: http("https://ethereum-sepolia-rpc.publicnode.com") },
});

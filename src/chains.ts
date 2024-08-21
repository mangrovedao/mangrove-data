import * as chains from "viem/chains";

export const getChains = (): number[] => {
  return [81457, 8453, 84532, 42161];
};

export enum Chain {
  Blast = 81457,
  Base = 8453,
  BaseSepolia = 84532,
  Arbitrum = 42161,
}
export const chainData = {
  [Chain.Blast]: {
    name: "blast-mainnet",
    startingBlock: 178_473n,
    address: "0xb1a49C54192Ea59B233200eA38aB56650Dfb448C",
    reader: "0x26fd9643baf1f8a44b752b28f0d90aebd04ab3f8",
    blockStep: 10_000n,
  },
  [Chain.Base]: {
    name: "base-mainnet",
    startingBlock: 15_192_144n,
    address: "0x22613524f5905Cb17cbD785b956e9238Bf725FAa",
    reader: "0xe5B118Ea1ffBC502EA7A666376d448209BFB50d3",
    blockStep: 1_000_000n,
  },
  [Chain.BaseSepolia]: {
    name: "base-sepolia",
    startingBlock: 10_695_514n,
    address: "0xBe1E54d0fC7A6044C0913013593FCd7D854C07FB",
    reader: "0xe118B2CF4e893DD8D954bB1D629e95026b5E8D5A",
    blockStep: 1_000_000n,
  },
  [Chain.Arbitrum]: {
    name: "arb-mainnet",
    startingBlock: 234_921_548n,
    address: "0x109d9CDFA4aC534354873EF634EF63C235F93f61",
    reader: "0x7E108d7C9CADb03E026075Bf242aC2353d0D1875",
    blockStep: 1_000_000n,
  },
} as const;

export const getChain = (id: number) =>
  Object.values(chains).find((x: any) => x.id === id);

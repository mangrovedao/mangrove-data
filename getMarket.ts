import type { MarketParams } from "@mangrovedao/mgv";
import type { PublicClient } from "viem";
import { getLines } from "./getLines";

const block_range = 10_000n;

export async function getMarket(
  client: PublicClient,
  market: MarketParams,
  fromBlock: bigint,
  toBlock: bigint
) {
  for (
    let startBlock = fromBlock;
    startBlock < toBlock;
    startBlock += block_range
  ) {
    let endBlock = startBlock + block_range - 1n;
    if (endBlock > toBlock) endBlock = toBlock;
    let success = false;
    while (!success) {
      try {
        await getLines(client, market, startBlock, endBlock);
        success = true;
      } catch (e) {
        console.error(e);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    const progress =
      (Number(startBlock - fromBlock) / Number(toBlock - fromBlock)) * 100;
    console.log(
      `Progress ${market.base.symbol}/${
        market.quote.symbol
      }: ${progress.toFixed(2)}%`
    );
  }
}

import type { MarketParams } from "@mangrovedao/mgv";
import type { PublicClient } from "viem";
import { getChangingBlocks } from "./getChangingBlocks";
import { getLine } from "./getLine";

export async function getLines(
  client: PublicClient,
  market: MarketParams,
  startBlock: bigint,
  endBlock: bigint
) {
  const blocks = await getChangingBlocks(client, market, startBlock, endBlock);
  const result = await Promise.all(
    blocks.map(async (block, idx) => {
      return getLine(market, block, client, idx === 0);
    })
  );

  const indexToRetry = result
    .map((r, i) => (r ? -1 : i))
    .filter((i) => i !== -1);

  if (indexToRetry.length > 0) {
    console.log(`Retrying ${indexToRetry.length} blocks in 1 second`);
    await new Promise((resolve) => setTimeout(resolve, 10000));
    const retry = await Promise.all(
      indexToRetry.map(async (i, idx) => {
        return getLine(market, blocks[i], client, idx === 0);
      })
    );
    return retry;
  }
}

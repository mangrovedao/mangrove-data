import { createPublicClient, http, parseAbiItem } from "viem";
import { Chain, chainData, getChain } from "./chains";
import * as schemas from "./schema";
import { and, eq } from "drizzle-orm";
import { db } from "./db";

//TODO  : Cache the lastest block on some store and the data of the markets
export const getMarketsOnChain = async (chain: Chain): Promise<any> => {
  const url = `https://${chainData[chain].name}.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`;
  const client = createPublicClient({
    transport: http(url),
    chain: getChain(Number(chain)),
  });

  const latestBlock = await client.getBlockNumber();

  const logs = [];

  const [blocksSeen] = await db
    .select()
    .from(schemas.blocksChecked)
    .where(
      and(
        eq(schemas.blocksChecked.chainId, chain),
        eq(schemas.blocksChecked.type, "market_logs")
      )
    )
    .execute();

  const dbStartingBlock = blocksSeen?.endingBlock ?? -Infinity;

  let fromBlock = BigInt(
    Math.max(Number(chainData[chain].startingBlock), dbStartingBlock)
  );

  while (fromBlock < latestBlock) {
    const toBlock = fromBlock + chainData[chain].blockStep;
    const newLogs = await client.getLogs({
      address: chainData[chain].address,
      fromBlock,
      toBlock,
      event: parseAbiItem(
        "event SetActive(bytes32 indexed olKeyHash, address indexed outbound_tkn, address indexed inbound_tkn, uint tickSpacing, bool value)"
      ),
    });
    logs.push(...newLogs);
    // console.log(
    // `Fetched ${newLogs.length} logs for chain ${chainData[chain].name} on blocks ${fromBlock} - ${toBlock}`
    // );
    fromBlock = toBlock + 1n;
  }

  return {
    markets: logs,
    endingBlock: Number(latestBlock),
  };
};

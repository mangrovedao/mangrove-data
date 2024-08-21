import { createPublicClient, http, parseAbiItem } from "viem";
import { db } from "./db";
import * as schemas from "./schema";
import { chainData, getChain, type Chain } from "./chains";
import { and, eq } from "drizzle-orm";

export const eventAbis = {
  OfferFail:
    "event OfferFail(bytes32 indexed olKeyHash, address indexed taker, uint indexed id, uint takerWants, uint takerGives, uint penalty, bytes32 mgvData)",
  OfferFailWithPosthookData:
    "event OfferFailWithPosthookData(bytes32 indexed olKeyHash, address indexed taker, uint indexed id, uint takerWants, uint takerGives, uint penalty, bytes32 mgvData, bytes32 posthookData)",
  OfferRetract:
    "event OfferRetract(bytes32 indexed olKeyHash, address indexed maker, uint id, bool deprovision)",
  OfferSuccess:
    "event OfferSuccess(bytes32 indexed olKeyHash, address indexed taker, uint indexed id, uint takerWants, uint takerGives)",
  OfferSuccessWithPosthookData:
    "event OfferSuccessWithPosthookData(bytes32 indexed olKeyHash, address indexed taker, uint indexed id, uint takerWants, uint takerGives, bytes32 posthookData)",
  OfferWrite:
    "event OfferWrite(bytes32 indexed olKeyHash, address indexed maker, int tick, uint gives, uint gasprice, uint gasreq, uint id)",
} as const;

export const getMarketEvents = async (
  chain: Chain,
  market: string,
  eventName: keyof typeof eventAbis,
  marketId: string
): Promise<any> => {
  const url = `https://${chainData[chain].name}.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`;
  const client = createPublicClient({
    transport: http(url),
    chain: getChain(Number(chain)),
  });

  const logs = [];

  const [blocksSeen] = await db
    .select()
    .from(schemas.blocksChecked)
    .where(
      and(
        eq(schemas.blocksChecked.chainId, chain),
        eq(
          schemas.blocksChecked.type,
          "market_offer_logs_" + eventName + "_" + market
        )
      )
    )
    .execute();

  const marketBlocks = await db
    .select()
    .from(schemas.markets)
    .where(
      and(
        eq(schemas.markets.chainId, chain),
        eq(schemas.markets.olKeyHash, market)
      )
    )
    .execute();

  let endContractBlock;
  let startContractBlock = -Infinity;

  const latestBlock = await client.getBlockNumber();

  if (marketBlocks.length === 1 && marketBlocks[0].value === "1") {
    startContractBlock = marketBlocks[0].block;
  } else if (marketBlocks.length === 1 && marketBlocks[0].value === "0") {
    startContractBlock = Number(latestBlock);
  } else if (
    marketBlocks.length === 2 &&
    marketBlocks[0].value === "1" &&
    marketBlocks[1].value === "0"
  ) {
    startContractBlock = marketBlocks[0].block;
    endContractBlock = marketBlocks[1].block;
  } else {
    throw new Error("Market has been changed states multiple times");
  }

  const dbStartingBlock = blocksSeen?.endingBlock ?? -Infinity;

  let fromBlock = BigInt(Math.max(startContractBlock, dbStartingBlock));

  const endBlock = endContractBlock ?? Number(latestBlock);

  while (fromBlock < endBlock) {
    const toBlock = fromBlock + chainData[chain].blockStep;
    //TODO getLogs cost on alquemy 75cu ( computer units) and as a free tier we have 300 cu per second so we can paralellize this in 4 threads
    const newLogs = await client.getLogs({
      address: chainData[chain].address,
      fromBlock,
      toBlock,
      args: { olKeyHash: market },
      event: parseAbiItem(eventAbis[eventName]),
    });
    const uniqueEvents = new Set(newLogs.map((x) => x.blockNumber));
    const process = (Number(fromBlock) * 100) / endBlock;
    console.log(
      `${process.toFixed(2)}% Processed ${
        uniqueEvents.size
      } events for market ${market} on chain ${
        chainData[chain].name
      } for event ${eventName}`
    );
    for (let eventblock of uniqueEvents) {
      await db
        .insert(schemas.marketEvents)
        .values({
          block: Number(eventblock),
          chainId: chain,
          market: marketId,
        })
        .onConflictDoNothing()
        .execute();
    }

    await db
      .insert(schemas.blocksChecked)
      .values({
        chainId: chain,
        endingBlock: fromBlock,
        type: "market_offer_logs_" + eventName + "_" + market,
      })
      .onConflictDoUpdate({
        target: [schemas.blocksChecked.chainId, schemas.blocksChecked.type],
        set: { endingBlock: fromBlock },
      });
    fromBlock = toBlock + 1n;
  }

  return {
    endingBlock: Number(endBlock),
  };
};

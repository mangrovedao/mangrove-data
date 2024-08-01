import {
  createPublicClient,
  http,
  JsonRpcVersionUnsupportedError,
  parseAbiItem,
} from "viem";
import * as chains from "viem/chains";
import { db } from "./db";
import * as schemas from "./schema";
import { eq, and } from "drizzle-orm";

export const getChains = (): number[] => {
  return [81457, 8453, 84532, 42161];
};

BigInt.prototype.toJSON = function () {
  return this.toString();
};

enum Chain {
  Blast = 81457,
  Base = 8453,
  BaseSepolia = 84532,
  Arbitrum = 42161,
}
const chainData = {
  [Chain.Blast]: {
    name: "blast-mainnet",
    startingBlock: 178_473n,
    address: "0xb1a49C54192Ea59B233200eA38aB56650Dfb448C",
    blockStep: 10_000n,
  },
  [Chain.Base]: {
    name: "base-mainnet",
    startingBlock: 15_192_144n,
    address: "0x22613524f5905Cb17cbD785b956e9238Bf725FAa",
    blockStep: 1_000_000n,
  },
  [Chain.BaseSepolia]: {
    name: "base-sepolia",
    startingBlock: 10_695_514n,
    address: "0xBe1E54d0fC7A6044C0913013593FCd7D854C07FB",
    blockStep: 1_000_000n,
  },
  [Chain.Arbitrum]: {
    name: "arb-mainnet",
    startingBlock: 234_921_548n,
    address: "0x109d9CDFA4aC534354873EF634EF63C235F93f61",
    blockStep: 1_000_000n,
  },
} as const;

const getChain = (id: number) =>
  Object.values(chains).find((x: any) => x.id === id);

type Market = {
  chain: Chain;
  olKeyHash: string;
  openBlock: number;
  closeBlock: number;
};

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

for (let key in chainData) {
  console.log(`Processing chain ${chainData[key].name}`);
  try {
    const { markets, endingBlock } = await getMarketsOnChain(key);
    markets.forEach((market: any) => {
      const entity = {
        block: Number(market.blockNumber),
        ...market.args,
        tickSpacing: market.args.tickSpacing.toString(),
        chainId: key,
      };

      db.insert(schemas.markets).values(entity).onConflictDoNothing().execute();
    });
    console.log(
      `Processed chain ${getChain(parseInt(key))!.name} Events ${
        markets.length
      } `
    );
    await db
      .insert(schemas.blocksChecked)
      .values({ chainId: key, endingBlock, type: "market_logs" })
      .onConflictDoUpdate({
        target: [schemas.blocksChecked.chainId, schemas.blocksChecked.type],
        set: { endingBlock },
      });
  } catch (e) {
    console.error(
      ` Error to process ${getChain(parseInt(key))!.name} : ${e.toString()}`
    );
  }
}

const eventAbis = {
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
  eventName: keyof typeof eventAbis
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
    const newLogs = await client.getLogs({
      address: chainData[chain].address,
      fromBlock,
      toBlock,
      args: { olKeyHash: market },
      event: parseAbiItem(eventAbis[eventName]),
    });
    const uniqueEvents = new Set(newLogs.map((x) => x.blockNumber));
    console.log(
      `Processed ${uniqueEvents.size} events for market ${market} on chain ${chainData[chain].name} for event ${eventName}`
    );
    for (let eventblock of uniqueEvents) {
      await db
        .insert(schemas.marketEvents)
        .values({
          block: Number(eventblock),
          chainId: chain,
          market: market,
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

    // );
    fromBlock = toBlock + 1n;
  }

  return {
    endingBlock: Number(endBlock),
  };
};

for (let key in chainData) {
  const markets = await db
    .select()
    .from(schemas.markets)
    .where(eq(schemas.markets.chainId, Number(key)))
    .execute();

  for (let market of markets) {
    const name =
      market.olKeyHash.slice(0, 5) + "..." + market.olKeyHash.slice(-3);
    console.log(
      `Processing market data for market ${name} on chain ${chainData[key].name}`
    );

    for (let event in eventAbis) {
      try {
        const { endingBlock } = await getMarketEvents(
          key,
          market.olKeyHash,
          event
        );

        console.log(`Storing block ${endingBlock} for market ${name}`);
        await db
          .insert(schemas.blocksChecked)
          .values({
            chainId: key,
            endingBlock,
            type: "market_offer_logs_" + event + "_" + market.olKeyHash,
          })
          .onConflictDoUpdate({
            target: [schemas.blocksChecked.chainId, schemas.blocksChecked.type],
            set: { endingBlock },
          });
      } catch (e) {
        console.error(
          ` Error to process market ${name} ${
            getChain(parseInt(key))!.name
          } : ${e.toString()}`
        );
      }
    }
  }
}

console.log("Processed all market events");

/*

- OfferFail
- OfferFailWithPosthookData
- OfferRetract
- OfferSuccess
- OfferSuccessWithPosthookData
- OfferWrite

*/

import { and, asc, count, desc, eq, gt, gte, lte } from "drizzle-orm";
import { books, prices } from "./schema";
import { db } from "./db";

const marketForAsset: Record<string, string | undefined> = {
  USDB: undefined,
  USDe: undefined,
  WETH: "WETH/USDB",
  BLAST: "BLAST/USDB",
  "mwstETH-WPUNKS:20": "mwstETH-WPUNKS:20/WETH",
  "mwstETH-WPUNKS:40": "mwstETH-WPUNKS:40/WETH",
};

async function getUSDPriceAtBlock(
  blockNumber: bigint,
  symbol: string
): Promise<number> {
  const market = marketForAsset[symbol];
  if (market === undefined) return 1;
  const price = await db
    .select()
    .from(prices)
    .where(
      and(lte(prices.block, Number(blockNumber)), eq(prices.market, market))
    )
    .orderBy(desc(prices.block))
    .limit(1)
    .then((r) => Number(r[0]?.price || 0));
  const nextMarket = marketForAsset[market.split("/")[1]];
  if (nextMarket === undefined) return price;
  const nextPrice = await getUSDPriceAtBlock(blockNumber, market.split("/")[1]);
  return price * nextPrice;
}

type Offer = {
  gives_display: string;
  maker: string;
  offer_type: "bid" | "ask";
};

async function getUSDPromisedAtBlock(blockNumber: bigint, market: string) {
  const bookRaw = await db
    .select()
    .from(books)
    .where(and(lte(books.block, Number(blockNumber)), eq(books.market, market)))
    .orderBy(desc(books.block))
    .limit(1);
  const book: Offer[] = JSON.parse(bookRaw[0]?.book);

  const [bidMultiplier, askMultiplier] = await Promise.all([
    getUSDPriceAtBlock(blockNumber, market.split("/")[1]),
    getUSDPriceAtBlock(blockNumber, market.split("/")[0]),
  ]);

  const map = new Map<string, number>();
  for (const { gives_display, maker: _maker, offer_type } of book) {
    const multiplier = offer_type === "bid" ? bidMultiplier : askMultiplier;
    const maker = _maker.toLowerCase();
    const usdValue = Number(gives_display) * multiplier;
    map.set(maker, (map.get(maker) || 0) + usdValue);
  }

  return map;
}

async function getNexBlockForMarket(
  currentBlock: bigint,
  market: string
): Promise<bigint | undefined> {
  const nextBlock = await db
    .select()
    .from(prices)
    .where(
      and(eq(prices.market, market), gt(prices.block, Number(currentBlock)))
    )
    .orderBy(asc(prices.block))
    .limit(1)
    .then((r) => r[0]?.block);
  return nextBlock === undefined ? undefined : BigInt(nextBlock);
}

async function getAllMarkets() {
  return db
    .selectDistinct({ market: prices.market })
    .from(prices)
    .then((r) => r.map((m) => m.market));
}

async function getEntitiesCountForMarket(
  market: string,
  fromBlock: bigint,
  toBlock: bigint
) {
  return db
    .select({ value: count() })
    .from(prices)
    .where(
      and(
        eq(prices.market, market),
        gte(prices.block, Number(fromBlock)),
        lte(prices.block, Number(toBlock))
      )
    )
    .then((r) => r[0].value);
}

async function getPromisedValueForMarketChunck(
  market: string,
  fromBlock: bigint,
  toBlock: bigint
) {
  let currentBlock = fromBlock;
  const result = new Map<string, number>();
  let done = false;
  console.log(`Processing ${market} from ${fromBlock} to ${toBlock}`);
  let step = 0;
  const total = await getEntitiesCountForMarket(market, fromBlock, toBlock);
  while (!done) {
    let [nextBlock, map] = await Promise.all([
      getNexBlockForMarket(currentBlock, market),
      getUSDPromisedAtBlock(currentBlock, market),
    ]);
    if (nextBlock === undefined || nextBlock > toBlock) {
      nextBlock = toBlock;
      done = true;
    }
    const multiplier = Number(nextBlock - currentBlock);
    for (const [maker, value] of map) {
      result.set(maker, (result.get(maker) || 0) + value * multiplier);
    }
    currentBlock = nextBlock;
    const progress = (step * 100) / total;
    console.log(`Progress: ${progress.toFixed(2)}%`);
    step++;
  }
  return result;
}

async function getPromisedValueForMarket(
  market: string,
  fromBlock: bigint,
  toBlock: bigint
) {
  const chunkSize = 100000n;
  const result = new Map<string, number>();
  const promises: Promise<Map<string, number>>[] = [];
  for (
    let currentBlock = fromBlock;
    currentBlock < toBlock;
    currentBlock += chunkSize
  ) {
    let upperBlock = currentBlock + chunkSize;
    if (upperBlock > toBlock) {
      upperBlock = toBlock;
    }
    promises.push(
      getPromisedValueForMarketChunck(market, currentBlock, upperBlock)
    );
  }
  const results = await Promise.all(promises);
  for (const map of results) {
    for (const [maker, value] of map) {
      result.set(maker, (result.get(maker) || 0) + value);
    }
  }
  return result;
}

const startBlock = 5145493n;
const endBlock = 6516730n;

console.log(await getUSDPriceAtBlock(6516550n, "mwstETH-WPUNKS:20"));

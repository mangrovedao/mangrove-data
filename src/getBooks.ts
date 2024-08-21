// import * as mgv from "@mangrovedao/mgv/addresses";
import { getSemibooksOLKeys, hash } from "@mangrovedao/mgv/lib";
import { db } from "./db";
import * as schemas from "./schema";
import { getBook } from "@mangrovedao/mgv/actions";
import type { MarketParams } from "@mangrovedao/mgv";
import {
  createClient,
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
  parseAbi,
  type PublicClient,
} from "viem";
import { Chain, chainData, getChain } from "./chains";
import { sortTokens } from "./utils";
import { asc, desc, gte } from "drizzle-orm";
// const markets = Object.values(mgv).filter(
//   (a) => typeof a === "object" && "base" in a && "quote" in a
// );

// const pairsFromDb = await db.select().from(schemas.marketPairs).execute();

// for (const market of markets) {
//   const { asksMarket, bidsMarket } = getSemibooksOLKeys(market);
//   const asksOlKeyHash = hash(asksMarket).toLowerCase();
//   const bidsOlKeyHash = hash(bidsMarket).toLowerCase();

//   const pair = pairsFromDb.find(
//     (p) =>
//       p.olKeyHash1 == asksOlKeyHash ||
//       p.olKeyHash2 == asksOlKeyHash ||
//       p.olKeyHash1 == bidsOlKeyHash ||
//       p.olKeyHash2 == bidsOlKeyHash
//   );

//   console.log(
//     `Market: ${market.base.symbol}/${market.quote.symbol}, Pair ID: ${pair.id}`
//   );
// }

export async function getBookForMarketOnBlock(
  market: MarketParams,
  blockNumber: bigint,
  client: PublicClient,
  chain: Chain
) {
  const { asks, bids, midPrice } = await getBook(
    client,
    {
      mgv: chainData[chain].address,
      mgvReader: chainData[chain].reader,
    } as any,
    market,
    {
      blockNumber,
      depth: 1000n,
    }
  );
  const book = asks
    .map((ask) => {
      const { tick, gives } = ask.offer;
      const { maker } = ask.detail;
      const gives_display = formatUnits(gives, market.base.decimals);
      const price = ask.price;
      const offer_type = "ask";
      return {
        tick,
        gives,
        gives_display,
        price,
        offer_type,
        id: ask.id,
        maker,
      };
    })
    .concat(
      bids.map((bid) => {
        const { tick, gives } = bid.offer;
        const gives_display = formatUnits(gives, market.quote.decimals);
        const price = bid.price;
        const { maker } = bid.detail;
        const offer_type = "bid";
        return {
          tick,
          gives,
          gives_display,
          price,
          offer_type,
          id: bid.id,
          maker,
        };
      })
    );

  return { book, midPrice };
}

const getToken = async (address: string, client: Client) => {
  const abi = parseAbi([
    "function name() public view returns (string memory)",
    "function symbol() view returns (string memory)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address account) public view returns (uint256)",
    "function transfer(address to, uint256 value) public returns (bool)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
  ]);
  const [decimals, symbol] = await Promise.all([
    client.readContract({
      address,
      abi,
      functionName: "decimals",
    }),
    client.readContract({
      address,
      abi,
      functionName: "symbol",
    }),
  ]);

  return {
    decimals,
    symbol,
    address,
  };
};

const marketPairs = await db.select().from(schemas.marketPairs).execute();
const books = await db
  .select()
  .from(schemas.books)
  .orderBy(desc(schemas.books.block))
  .execute();

const marketEvents = await db
  .select()
  .from(schemas.marketEvents)
  .orderBy(asc(schemas.marketEvents.block))
  .where(gte(schemas.marketEvents.block, books[0].block))
  .execute();

const WETH = "0x4300000000000000000000000000000000000004";
const USDB = "0x4300000000000000000000000000000000000003";
const PUNKS20 = "0x9a50953716bA58e3d6719Ea5c437452ac578705F";
const PUNKS40 = "0x999f220296B5843b2909Cc5f8b4204AacA5341D8";
const USDe = "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34";
const BLAST = "0xb1a5700fA2358173Fe465e6eA4Ff52E36e88E2ad";
const baseSepoliaWETH = "0x4200000000000000000000000000000000000006";
const baseSepoliaUSDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const baseSepoliaWBTC = "0x5146d560975A44B9Ad1a8bdF5f4017591a26df82";
const baseSepoliaDAI = "0x9508B3459Bc95A39CA66c385f1Ae12f03f72f8af";

const basecbETH = "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22";
const baseUSDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const arbitrumWETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const arbitrumUSDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const arbitrumUSDT = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";

const baseQuoteMap: Record<string, { base: string; quote: string }> = {};

const addBaseQoute = (base: string, quote: string) => {
  const [t1, t2] = sortTokens(base, quote);
  baseQuoteMap[`${t1}-${t2}`] = { base, quote };
};

addBaseQoute(WETH, USDB);
addBaseQoute(PUNKS20, WETH);
addBaseQoute(PUNKS40, WETH);
addBaseQoute(USDe, USDB);

addBaseQoute(BLAST, WETH);
addBaseQoute(BLAST, USDB);

addBaseQoute(baseSepoliaWBTC, baseSepoliaDAI);
addBaseQoute(baseSepoliaWETH, baseSepoliaUSDC);

addBaseQoute(arbitrumWETH, arbitrumUSDC);
addBaseQoute(arbitrumWETH, arbitrumUSDT);
addBaseQoute(arbitrumUSDC, arbitrumUSDT);

addBaseQoute(basecbETH, baseUSDC);

const tokensToBaseQuote = async (tokens: string[], client: Client) => {
  const [token1, token2] = sortTokens(...tokens);
  const mapKey = `${token1}-${token2}`;
  if (mapKey in baseQuoteMap) {
    return baseQuoteMap[mapKey];
  } else {
    const token1Details = await getToken(token1, client);
    const token2Details = await getToken(token2, client);

    throw new Error(
      `No base quote map for ${mapKey} - ${token1Details.symbol}/${token2Details.symbol}`
    );
  }
};

for (const event of marketEvents) {
  const market = marketPairs.find((m) => m.id === Number(event.market))!;

  const client = createPublicClient({
    transport: http(
      `https://${chainData[event.chainId].name}.g.alchemy.com/v2/${
        process.env.ALCHEMY_KEY
      }`
    ),
    chain: getChain(Number(event.chainId)),
  });
  console.log(
    `Processing book for block ${event.block} for market ${
      chainData[event.chainId].name
    }`
  );

  const { base, quote } = await tokensToBaseQuote(
    [market.token1, market.token2],
    client
  );

  const baseToken = await getToken(base, client);
  const quoteToken = await getToken(quote, client);

  const marketParams = {
    quote: {
      address: quoteToken.address as `0x${string}`,
      decimals: Number(quoteToken.decimals),
      symbol: quoteToken.symbol,
      displayDecimals: 4,
      priceDisplayDecimals: 4,
      mgvTestToken: false,
    },
    base: {
      address: baseToken.address as `0x${string}`,
      decimals: Number(baseToken.decimals),
      symbol: baseToken.symbol,
      displayDecimals: 4,
      priceDisplayDecimals: 4,
      mgvTestToken: false,
    },
    tickSpacing: BigInt(1),
  } as MarketParams;

  const { book, midPrice } = await getBookForMarketOnBlock(
    marketParams,
    BigInt(event.block),
    client,
    event.chainId
  );

  await db
    .insert(schemas.books)
    .values({
      block: event.block,
      market: event.market,
      book: JSON.stringify(book),
      chainId: event.chainId,
    })
    .onConflictDoNothing()
    .execute();
  await db
    .insert(schemas.prices)
    .values({
      block: event.block,
      market: event.market,
      price: midPrice.toString(),
      chainId: event.chainId,
    })
    .onConflictDoNothing()
    .execute();

  /*

export const books = sqliteTable("books", {
  block: integer("block").notNull(),
  market: text("market").notNull(),
  book: text("book").notNull(),
  chainId: integer("chainId").notNull(),
});

export const prices = sqliteTable("prices", {
  block: integer("block").notNull(),
  market: text("market").notNull(),
  price: text("price").notNull(),
  chainId: integer("chainId").notNull(),
});

  */
}
console.log("END");
// 218807

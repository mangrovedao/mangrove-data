import { db, sqlite } from "./db";
import * as schemas from "./schema";
import { eq, and } from "drizzle-orm";
import { chainData, getChain } from "./chains";
import { getMarketsOnChain } from "./getMarkets";
import { eventAbis, getMarketEvents } from "./getEvents";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

// for (let key in chainData) {
//   console.log(`Processing chain ${chainData[key].name}`);
//   try {
//     const { markets, endingBlock } = await getMarketsOnChain(key);
//     markets.forEach((market: any) => {
//       const entity = {
//         block: Number(market.blockNumber),
//         ...market.args,
//         tickSpacing: market.args.tickSpacing.toString(),
//         chainId: key,
//       };

//       db.insert(schemas.markets).values(entity).onConflictDoNothing().execute();
//     });
//     console.log(
//       `Processed chain ${getChain(parseInt(key))!.name} Events ${
//         markets.length
//       } `
//     );
//     await db
//       .insert(schemas.blocksChecked)
//       .values({ chainId: key, endingBlock, type: "market_logs" })
//       .onConflictDoUpdate({
//         target: [schemas.blocksChecked.chainId, schemas.blocksChecked.type],
//         set: { endingBlock },
//       });
//   } catch (e) {
//     console.error(
//       ` Error to process ${getChain(parseInt(key))!.name} : ${e.toString()}`
//     );
//   }
// }

const marketsFromDb = await db.select().from(schemas.markets).execute();

const pairs = [];

const isSellMarket = (
  pair: { token1: string; token2: string },
  market: { inbound_tkn: string; outbound_tkn: string }
) => pair.token1 === market.inbound_tkn && pair.token2 === market.outbound_tkn;
const isBuyMarket = (
  pair: { token1: string; token2: string },
  market: { inbound_tkn: string; outbound_tkn: string }
) => pair.token1 === market.outbound_tkn && pair.token2 === market.inbound_tkn;

export const sortTokens = (token1: string, token2: string) => {
  if (token1 < token2) {
    return [token1, token2];
  }
  return [token2, token1];
};

for (let market of marketsFromDb) {
  const [token1, token2] = sortTokens(market.inbound_tkn, market.outbound_tkn);
  const pair = pairs.find(
    (p) => isSellMarket(p, market) || isBuyMarket(p, market)
  );
  if (!pair) {
    const key = isSellMarket({ token1, token2 }, market)
      ? "olKeyHash1"
      : "olKeyHash2";
    pairs.push({
      chainId: market.chainId,
      token1,
      token2,
      [key]: market.olKeyHash,
    });
  } else {
    const key = isSellMarket(pair, market) ? "olKeyHash1" : "olKeyHash2";
    pair[key] = market.olKeyHash;
  }
}

for (let pair of pairs) {
  await db
    .insert(schemas.marketPairs)
    .values(pair)
    .onConflictDoNothing()
    .execute();
}

const pairsFromDb = await db.select().from(schemas.marketPairs).execute();

// for (let key in chainData) {
//   const chainId = parseInt(key);
//   const markets = await db
//     .select()
//     .from(schemas.markets)
//     .where(eq(schemas.markets.chainId, Number(key)))
//     .execute();

//   for (let market of markets) {
//     const name =
//       market.olKeyHash.slice(0, 5) + "..." + market.olKeyHash.slice(-3);
//     console.log(
//       `Processing market data for market ${name} on chain ${chainData[chainId].name}`
//     );

//     for (let event in eventAbis) {
//       try {
//         const { endingBlock } = await getMarketEvents(
//           chainId,
//           market.olKeyHash,
//           event,
//           pairsFromDb.find(
//             (p) =>
//               p.olKeyHash1 === market.olKeyHash ||
//               p.olKeyHash2 === market.olKeyHash
//           )!.id
//         );

//         console.log(`Storing block ${endingBlock} for market ${name}`);
//         await db
//           .insert(schemas.blocksChecked)
//           .values({
//             chainId,
//             endingBlock,
//             type: "market_offer_logs_" + event + "_" + market.olKeyHash,
//           })
//           .onConflictDoUpdate({
//             target: [schemas.blocksChecked.chainId, schemas.blocksChecked.type],
//             set: { endingBlock },
//           });
//       } catch (e) {
//         console.error(
//           ` Error to process market ${name} ${
//             getChain(parseInt(key))!.name
//           } : ${e.toString()}`
//         );
//       }
//     }
//   }
// }

console.log("Processed all market events");

/*

- OfferFail
- OfferFailWithPosthookData
- OfferRetract
- OfferSuccess
- OfferSuccessWithPosthookData
- OfferWrite

*/

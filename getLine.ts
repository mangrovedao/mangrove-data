import type { MarketParams } from "@mangrovedao/mgv";
import { getBook } from "@mangrovedao/mgv/actions";
import { blastMangrove } from "@mangrovedao/mgv/addresses";
import { formatUnits, type PublicClient } from "viem";
import { insertBook, insertPrice } from "./db";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

export async function getLine(
  market: MarketParams,
  blockNumber: bigint,
  client: PublicClient,
  check = false
) {
  try {
    const { asks, bids, midPrice } = await getBook(
      client,
      blastMangrove,
      market,
      {
        blockNumber,
        depth: 1000n,
      }
    );
    const book = asks
      .map((ask) => {
        const tick = ask.offer.tick;
        const gives = ask.offer.gives;
        const maker = ask.detail.maker;
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
          const tick = bid.offer.tick;
          const gives = bid.offer.gives;
          const gives_display = formatUnits(gives, market.quote.decimals);
          const price = bid.price;
          const maker = bid.detail.maker;
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

    // const bookLine = `${blockNumber},${JSON.stringify(book)}`;
    // const priceLine = `${blockNumber},${midPrice}`;
    await Promise.all([
      insertBook(blockNumber, market, JSON.stringify(book), check),
      insertPrice(blockNumber, market, midPrice.toString(), check),
    ]);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

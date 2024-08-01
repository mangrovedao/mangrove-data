import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { books, prices } from "./schema";
import type { MarketParams } from "@mangrovedao/mgv";
import { and, desc, eq, lte } from "drizzle-orm";

export const sqlite = new Database("sqlite.db");
export const db = drizzle(sqlite);

async function getLatestBook(
  block: bigint,
  market: MarketParams
): Promise<string> {
  const marketName = `${market.base.symbol}/${market.quote.symbol}`;
  const result = await db
    .select()
    .from(books)
    .where(and(lte(books.block, Number(block)), eq(books.market, marketName)))
    .orderBy(desc(books.block))
    .limit(1);
  return result[0]?.book || "";
}

async function getLatestPrice(
  block: bigint,
  market: MarketParams
): Promise<string> {
  const marketName = `${market.base.symbol}/${market.quote.symbol}`;
  const result = await db
    .select()
    .from(prices)
    .where(and(lte(prices.block, Number(block)), eq(prices.market, marketName)))
    .orderBy(desc(prices.block))
    .limit(1);
  return result[0]?.price || "";
}

export async function insertBook(
  block: bigint,
  market: MarketParams,
  book: string,
  check = false
) {
  if (check) {
    const latestBook = await getLatestBook(block, market);
    if (latestBook.toLowerCase() === book.toLowerCase()) return;
  }
  const marketName = `${market.base.symbol}/${market.quote.symbol}`;
  return db
    .insert(books)
    .values({ block: Number(block), market: marketName, book })
    .onConflictDoNothing()
    .execute();
}

export async function insertPrice(
  block: bigint,
  market: MarketParams,
  price: string,
  check = false
) {
  if (check) {
    const latestPrice = await getLatestPrice(block, market);
    if (latestPrice === price) return;
  }
  const marketName = `${market.base.symbol}/${market.quote.symbol}`;
  return db
    .insert(prices)
    .values({ block: Number(block), market: marketName, price })
    .onConflictDoNothing()
    .execute();
}

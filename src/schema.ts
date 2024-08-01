import {
  text,
  integer,
  sqliteTable,
  primaryKey,
} from "drizzle-orm/sqlite-core";

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

export const markets = sqliteTable("markets", {
  olKeyHash: text("olKeyHash").primaryKey().unique(),
  outbound_tkn: text("outbound_tkn").notNull(),
  inbound_tkn: text("inbound_tkn").notNull(),
  tickSpacing: text("tickSpacing").notNull(),
  value: text("value").notNull(),
  block: integer("block").notNull(),
  chainId: integer("chainId").notNull(),
});

export const blocksChecked = sqliteTable(
  "blocksChecked",
  {
    endingBlock: integer("endingBlock").notNull(),
    type: text("query_type").notNull(),
    chainId: integer("chainId").notNull(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.chainId, table.type],
    }),
  })
);

export const marketEvents = sqliteTable(
  "marketEvents",
  {
    block: integer("block").notNull(),
    market: text("market").notNull(),
    chainId: integer("chainId").notNull(),
    event: text("event").notNull(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.block, table.market],
    }),
  })
);

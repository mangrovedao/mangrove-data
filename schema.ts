import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";

export const books = sqliteTable("books", {
  block: integer("block").notNull(),
  market: text("market").notNull(),
  book: text("book").notNull(),
});

export const prices = sqliteTable("prices", {
  block: integer("block").notNull(),
  market: text("market").notNull(),
  price: text("price").notNull(),
});

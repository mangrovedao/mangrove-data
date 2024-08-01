import "dotenv/config";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "./src/db";
// This will run migrations on the database, skipping the ones already applied
migrate(db, { migrationsFolder: "./migrations" });
console.log("Migrations done");
// Don't forget to close the connection, otherwise the script will hang

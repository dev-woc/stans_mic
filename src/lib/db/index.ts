import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDb | null = null;

function getDb(): DrizzleDb {
	if (!_db) {
		const url = process.env.DATABASE_URL;
		if (!url) throw new Error("DATABASE_URL environment variable is not set");
		_db = drizzle(neon(url), { schema });
	}
	return _db;
}

export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
	get(_, prop) {
		return getDb()[prop as keyof DrizzleDb];
	},
});

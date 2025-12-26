import { db } from "../server/db";
import { candidates, internships } from "@shared/schema";
import { count } from "drizzle-orm";
import "dotenv/config";

async function verify() {
    try {
        const [cResult] = await db.select({ count: count() }).from(candidates);
        const [iResult] = await db.select({ count: count() }).from(internships);

        console.log(`Candidates in DB: ${cResult.count}`);
        console.log(`Internships in DB: ${iResult.count}`);

        process.exit(0);
    } catch (err) {
        console.error("Verification failed:", err);
        process.exit(1);
    }
}

verify();

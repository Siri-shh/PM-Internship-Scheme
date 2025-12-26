import { db } from "./server/db";
import { internships } from "./shared/schema";

async function testDrizzleReturn() {
    try {
        console.log("🔍 Testing Drizzle ORM return...\n");

        // Use Drizzle ORM to fetch (same as storage.getAllInternships)
        const result = await db.select().from(internships).limit(3);

        console.log("📊 Drizzle ORM returns:");
        result.forEach((int, i) => {
            console.log(`\nInternship ${i + 1}:`);
            console.log("  - internshipId:", int.internshipId);
            console.log("  - sector:", int.sector);
            console.log("  - tier:", int.tier);
            console.log("  - state:", int.state);
            console.log("  - capacity:", int.capacity);
        });

        console.log("\n\n📦 Full object (JSON):");
        console.log(JSON.stringify(result[0], null, 2));

    } catch (error) {
        console.error("Error:", error);
    }
}

testDrizzleReturn();

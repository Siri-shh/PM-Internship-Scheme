import { pool } from "./server/db";

async function fixAndPopulateCounts() {
    const client = await pool.connect();

    try {
        console.log("🔧 Fixing trigger and populating preference counts...\n");

        // Fix the tier sync trigger to properly handle preference_count
        console.log("Step 1: Fixing tier sync trigger...");

        // First, drop the old trigger
        await client.query(`DROP TRIGGER IF EXISTS sync_to_tier_database ON public.internships`);

        // Create improved trigger function
        await client.query(`
      CREATE OR REPLACE FUNCTION sync_to_tier_database()
      RETURNS TRIGGER AS $$
      DECLARE
        target_schema TEXT;
      BEGIN
        -- Determine target schema based on tier
        IF NEW.tier = 'Tier1' THEN
          target_schema := 'tier1_db';
        ELSIF NEW.tier = 'Tier2' THEN
          target_schema := 'tier2_db';
        ELSIF NEW.tier = 'Tier3' THEN
          target_schema := 'tier3_db';
        ELSE
          RETURN NEW;
        END IF;
        
        -- Upsert into the appropriate tier database
        EXECUTE format(
          'INSERT INTO %I.internships (internship_id, company_id, sector, tier, capacity, required_skills, stipend, location_type, state, preference_count, synced_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
           ON CONFLICT (internship_id) DO UPDATE SET
             company_id = EXCLUDED.company_id,
             sector = EXCLUDED.sector,
             tier = EXCLUDED.tier,
             capacity = EXCLUDED.capacity,
             required_skills = EXCLUDED.required_skills,
             stipend = EXCLUDED.stipend,
             location_type = EXCLUDED.location_type,
             state = EXCLUDED.state,
             preference_count = EXCLUDED.preference_count,
             synced_at = NOW()',
          target_schema
        ) USING NEW.internship_id, NEW.company_id, NEW.sector, NEW.tier, 
                NEW.capacity, NEW.required_skills, NEW.stipend, NEW.location_type, 
                NEW.state, COALESCE(NEW.preference_count, 0);
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

        // Recreate the trigger
        await client.query(`
      CREATE TRIGGER sync_to_tier_database
      AFTER INSERT OR UPDATE ON public.internships
      FOR EACH ROW
      EXECUTE FUNCTION sync_to_tier_database()
    `);
        console.log("  ✓ Fixed tier sync trigger");

        // Populate preference counts for all internships
        console.log("\nStep 2: Populating preference counts...");

        // Count preferences for each internship
        await client.query(`
      UPDATE public.internships i
      SET preference_count = (
        SELECT COUNT(*)
        FROM candidates c
        WHERE c.pref_1 = i.internship_id 
           OR c.pref_2 = i.internship_id 
           OR c.pref_3 = i.internship_id 
           OR c.pref_4 = i.internship_id 
           OR c.pref_5 = i.internship_id 
           OR c.pref_6 = i.internship_id
      )
    `);
        console.log("  ✓ Updated preference counts in public.internships");

        // Sync to tier databases
        console.log("\nStep 3: Syncing to tier databases...");

        await client.query(`
      UPDATE tier1_db.internships t
      SET preference_count = p.preference_count
      FROM public.internships p
      WHERE t.internship_id = p.internship_id
    `);
        console.log("  ✓ Synced tier1_db");

        await client.query(`
      UPDATE tier2_db.internships t
      SET preference_count = p.preference_count
      FROM public.internships p
      WHERE t.internship_id = p.internship_id
    `);
        console.log("  ✓ Synced tier2_db");

        await client.query(`
      UPDATE tier3_db.internships t
      SET preference_count = p.preference_count
      FROM public.internships p
      WHERE t.internship_id = p.internship_id
    `);
        console.log("  ✓ Synced tier3_db");

        // Show results
        console.log("\n\n✅ DONE! Top internships by preference count:\n");

        const results = await client.query(`
      SELECT internship_id, sector, tier, state, preference_count 
      FROM public.internships 
      WHERE preference_count > 0
      ORDER BY preference_count DESC 
      LIMIT 20
    `);
        console.table(results.rows);

        // Summary
        const summary = await client.query(`
      SELECT 
        COUNT(*) as total_internships,
        COUNT(*) FILTER (WHERE preference_count > 0) as with_preferences,
        SUM(preference_count) as total_preferences
      FROM public.internships
    `);
        console.log("\n📊 Summary:");
        console.table(summary.rows);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        client.release();
        await pool.end();
    }
}

fixAndPopulateCounts();

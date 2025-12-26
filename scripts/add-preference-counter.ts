import { pool } from "./server/db";

async function addCounterColumn() {
    const client = await pool.connect();

    try {
        console.log("🔧 Adding counter column to all internship tables...\n");

        // Step 1: Add counter column to all internship tables
        console.log("Step 1: Adding counter column...");

        const tables = [
            'public.internships',
            'tier1_db.internships',
            'tier2_db.internships',
            'tier3_db.internships'
        ];

        for (const table of tables) {
            try {
                await client.query(`
          ALTER TABLE ${table} 
          ADD COLUMN IF NOT EXISTS preference_count INTEGER DEFAULT 0
        `);
                console.log(`  ✓ Added preference_count to ${table}`);
            } catch (e: any) {
                if (e.message.includes('already exists')) {
                    console.log(`  ⚠ ${table} already has preference_count`);
                } else {
                    console.log(`  ❌ ${table}: ${e.message}`);
                }
            }
        }

        // Step 2: Create function to count preferences for an internship
        console.log("\nStep 2: Creating preference count function...");

        await client.query(`
      CREATE OR REPLACE FUNCTION count_internship_preferences(intern_id TEXT)
      RETURNS INTEGER AS $$
      DECLARE
        pref_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO pref_count
        FROM candidates
        WHERE pref_1 = intern_id 
           OR pref_2 = intern_id 
           OR pref_3 = intern_id 
           OR pref_4 = intern_id 
           OR pref_5 = intern_id 
           OR pref_6 = intern_id;
        RETURN pref_count;
      END;
      $$ LANGUAGE plpgsql;
    `);
        console.log("  ✓ Created count_internship_preferences function");

        // Step 3: Create trigger function to update counts when preferences change
        console.log("\nStep 3: Creating preference sync trigger function...");

        await client.query(`
      CREATE OR REPLACE FUNCTION sync_preference_counts()
      RETURNS TRIGGER AS $$
      DECLARE
        old_prefs TEXT[];
        new_prefs TEXT[];
        all_prefs TEXT[];
        pref TEXT;
      BEGIN
        -- Collect old preferences (on UPDATE or DELETE)
        IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
          old_prefs := ARRAY[OLD.pref_1, OLD.pref_2, OLD.pref_3, OLD.pref_4, OLD.pref_5, OLD.pref_6];
        ELSE
          old_prefs := ARRAY[]::TEXT[];
        END IF;
        
        -- Collect new preferences (on INSERT or UPDATE)
        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
          new_prefs := ARRAY[NEW.pref_1, NEW.pref_2, NEW.pref_3, NEW.pref_4, NEW.pref_5, NEW.pref_6];
        ELSE
          new_prefs := ARRAY[]::TEXT[];
        END IF;
        
        -- Combine and get unique internship IDs that need updating
        all_prefs := old_prefs || new_prefs;
        
        -- Update preference_count for affected internships
        FOREACH pref IN ARRAY all_prefs
        LOOP
          IF pref IS NOT NULL AND pref != '' THEN
            UPDATE public.internships 
            SET preference_count = count_internship_preferences(pref)
            WHERE internship_id = pref;
          END IF;
        END LOOP;
        
        IF TG_OP = 'DELETE' THEN
          RETURN OLD;
        ELSE
          RETURN NEW;
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);
        console.log("  ✓ Created sync_preference_counts function");

        // Step 4: Create trigger on candidates table
        console.log("\nStep 4: Creating trigger on candidates table...");

        await client.query(`DROP TRIGGER IF EXISTS trigger_sync_preference_counts ON candidates`);
        await client.query(`
      CREATE TRIGGER trigger_sync_preference_counts
      AFTER INSERT OR UPDATE OR DELETE ON candidates
      FOR EACH ROW
      EXECUTE FUNCTION sync_preference_counts()
    `);
        console.log("  ✓ Created trigger_sync_preference_counts");

        // Step 5: Initial population - calculate counts for all internships
        console.log("\nStep 5: Populating initial preference counts...");

        const internships = await client.query(`SELECT internship_id FROM public.internships`);
        let updated = 0;

        for (const row of internships.rows) {
            await client.query(`
        UPDATE public.internships 
        SET preference_count = count_internship_preferences($1)
        WHERE internship_id = $1
      `, [row.internship_id]);
            updated++;
        }
        console.log(`  ✓ Updated ${updated} internships with preference counts`);

        // Step 6: Sync to tier databases
        console.log("\nStep 6: Syncing counts to tier databases...");

        await client.query(`
      UPDATE tier1_db.internships t
      SET preference_count = p.preference_count
      FROM public.internships p
      WHERE t.internship_id = p.internship_id
    `);

        await client.query(`
      UPDATE tier2_db.internships t
      SET preference_count = p.preference_count
      FROM public.internships p
      WHERE t.internship_id = p.internship_id
    `);

        await client.query(`
      UPDATE tier3_db.internships t
      SET preference_count = p.preference_count
      FROM public.internships p
      WHERE t.internship_id = p.internship_id
    `);
        console.log("  ✓ Synced to tier databases");

        // Step 7: Update the tier sync trigger to include preference_count
        console.log("\nStep 7: Updating tier sync trigger to include preference_count...");

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
        console.log("  ✓ Updated tier sync trigger");

        // Show results
        console.log("\n\n✅ DONE! Showing internships with preference counts:\n");

        const results = await client.query(`
      SELECT internship_id, sector, tier, preference_count 
      FROM public.internships 
      ORDER BY preference_count DESC 
      LIMIT 15
    `);
        console.table(results.rows);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        client.release();
        await pool.end();
    }
}

addCounterColumn();

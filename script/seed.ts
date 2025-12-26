import "dotenv/config";
import { storage } from "../server/storage";
import fs from "fs";
import path from "path";
import { type Candidate, type Internship } from "@shared/schema";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function seed() {
    console.log("Starting seed process...");

    const candidatesPath = path.join(__dirname, "../dbms/data/pm_internship_candidates_6000.csv");
    const internshipsPath = path.join(__dirname, "../dbms/data/internships_pm_internships.csv");

    try {
        // Seed Candidates
        if (fs.existsSync(candidatesPath)) {
            console.log("Reading candidates CSV...");
            const content = fs.readFileSync(candidatesPath, "utf-8");
            const lines = content.trim().split("\n");
            // Skip header
            const dataLines = lines.slice(1);

            console.log(`Found ${dataLines.length} candidates. Inserting...`);

            let count = 0;
            for (const line of dataLines) {
                if (!line.trim()) continue;
                const cols = line.split(",");
                // student_id,gpa,skills,reservation,rural,gender,pref_1,pref_2,pref_3,pref_4,pref_5,pref_6

                // Handle "rural" boolean (1/0)
                const isRural = cols[4] === "1" || cols[4] === "true";

                const candidate: Candidate = {
                    studentId: cols[0],
                    userId: null,
                    gpa: parseFloat(cols[1]),
                    skills: cols[2],
                    reservation: cols[3],
                    rural: isRural,
                    gender: cols[5],
                    pref1: cols[6],
                    pref2: cols[7],
                    pref3: cols[8],
                    pref4: cols[9],
                    pref5: cols[10],
                    pref6: cols[11]?.trim() // Remove potential \r
                } as Candidate;

                // We use 'as Candidate' because some optional fields (name, email) are missing, which is allowed by schema
                await storage.createCandidate(candidate);
                count++;
                if (count % 100 === 0) console.log(`Inserted ${count} candidates...`);
            }
            console.log(`Finished inserting ${count} candidates.`);
        } else {
            console.error(`Candidates CSV not found at ${candidatesPath}`);
        }

        // Seed Internships
        if (fs.existsSync(internshipsPath)) {
            console.log("Reading internships CSV...");
            const content = fs.readFileSync(internshipsPath, "utf-8");
            const lines = content.trim().split("\n");
            const dataLines = lines.slice(1);

            console.log(`Found ${dataLines.length} internships. Inserting...`);

            let count = 0;
            for (const line of dataLines) {
                if (!line.trim()) continue;
                const cols = line.split(",");
                // internship_id,sector,tier,capacity,required_skills,stipend,location_type

                const internship: Internship = {
                    internshipId: cols[0],
                    companyId: null,
                    sector: cols[1],
                    tier: cols[2],
                    capacity: parseInt(cols[3]),
                    requiredSkills: cols[4],
                    stipend: parseInt(cols[5]),
                    locationType: cols[6]?.trim() // Remove potential \r
                } as Internship;

                await storage.createInternship(internship);
                count++;
            }
            console.log(`Finished inserting ${count} internships.`);
        } else {
            console.error(`Internships CSV not found at ${internshipsPath}`);
        }

        console.log("Seeding complete.");
        process.exit(0);
    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    }
}

seed();

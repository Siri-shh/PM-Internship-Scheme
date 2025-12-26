/**
 * Chat Context Generator
 * 
 * Provides safe, non-PII context data for the chatbot.
 * SECURITY: No names, emails, phone numbers, or Aadhaar are ever included.
 */

import { storage } from "./storage";
import type { User } from "@shared/schema";

export type PortalType = "student" | "company" | "admin" | "public";

/**
 * Main router function to get context based on portal type
 */
export async function getChatContext(
    user: User | undefined,
    portalType: PortalType
): Promise<string> {
    if (!user) {
        return ""; // No context for unauthenticated users
    }

    try {
        switch (portalType) {
            case "student":
                return await getStudentContext(user.id);
            case "company":
                return await getCompanyContext(user.id);
            case "admin":
                return await getAdminContext();
            default:
                return "";
        }
    } catch (error) {
        console.error("[ChatContext] Error fetching context:", error);
        return ""; // Fail silently, chatbot will work without context
    }
}

/**
 * Student context - SAFE DATA ONLY
 * Includes: allocation status, preference count, GPA tier, skill count
 * Excludes: name, email, phone, aadhaar, exact GPA value
 */
async function getStudentContext(userId: number): Promise<string> {
    const candidate = await storage.getCandidateByUserId(userId);

    if (!candidate) {
        return `
=== YOUR STATUS ===
Profile: Not yet completed
Action needed: Complete your profile to participate in allocation
`;
    }

    // Get preference count (how many preferences set)
    const preferences = [
        candidate.pref1, candidate.pref2, candidate.pref3,
        candidate.pref4, candidate.pref5, candidate.pref6
    ].filter(Boolean);

    // GPA tier (not exact value for privacy)
    const gpaTier = candidate.gpa >= 9 ? "Excellent (9+)"
        : candidate.gpa >= 8 ? "Very Good (8-9)"
            : candidate.gpa >= 7 ? "Good (7-8)"
                : candidate.gpa >= 6 ? "Average (6-7)"
                    : "Below Average (<6)";

    // Skill count
    const skillCount = candidate.skills ? candidate.skills.split(";").filter(Boolean).length : 0;

    // Check allocation status
    const allocations = await storage.getAllocations?.() || [];
    const myAllocation = allocations.find(a => a.studentId === candidate.studentId);

    // Check eligibility for boosting (rural/reservation)
    const eligibleForBoost = candidate.rural ||
        ["SC", "ST", "OBC"].includes(candidate.reservation || "");

    return `
=== YOUR PROFILE STATUS ===
Student ID: ${candidate.studentId}
Profile: Complete
GPA Tier: ${gpaTier}
Skills Registered: ${skillCount} skill(s)
Reservation Category: ${candidate.reservation || "General"}
Rural Background: ${candidate.rural ? "Yes" : "No"}
Eligible for Fairness Boost: ${eligibleForBoost ? "Yes" : "No"}

=== PREFERENCES ===
Preferences Set: ${preferences.length} out of 6
${preferences.length > 0 ? `First Choice: ${preferences[0]}` : "No preferences set yet"}

=== ALLOCATION STATUS ===
${myAllocation
            ? `✅ ALLOCATED to Internship: ${myAllocation.internshipId}
Preference Rank Matched: #${myAllocation.preferenceRank || "N/A"}`
            : `⏳ PENDING - Not yet allocated
Check back after the next allocation round.`}
`;
}

/**
 * Company context - SAFE DATA ONLY
 * Includes: internship counts, capacity, sector summary
 * Excludes: candidate names, detailed allocation info
 */
async function getCompanyContext(userId: number): Promise<string> {
    const company = await storage.getCompanyByUserId(userId);

    if (!company) {
        return `
=== YOUR STATUS ===
Company Profile: Not yet completed
Action needed: Complete registration to post internships
`;
    }

    // Get company's internships
    const allInternships = await storage.getAllInternships();
    const myInternships = allInternships.filter(i => i.companyId === company.id);

    if (myInternships.length === 0) {
        return `
=== YOUR COMPANY STATUS ===
Company ID: ${company.id}
Profile: Complete
Internships Posted: 0
Action needed: Post internships to receive candidate allocations
`;
    }

    // Calculate stats
    const totalCapacity = myInternships.reduce((sum, i) => sum + (i.capacity || 0), 0);
    const sectors = Array.from(new Set(myInternships.map(i => i.sector)));
    const tiers = Array.from(new Set(myInternships.map(i => i.tier)));

    // Get allocation count (without names)
    const allocations = await storage.getAllocations?.() || [];
    const myAllocations = allocations.filter(a =>
        myInternships.some(i => i.internshipId === a.internshipId)
    );

    return `
=== YOUR COMPANY STATUS ===
Company ID: ${company.id}
Profile: Complete

=== INTERNSHIP SUMMARY ===
Total Internships Posted: ${myInternships.length}
Total Seat Capacity: ${totalCapacity}
Sectors: ${sectors.join(", ")}
Tiers: ${tiers.join(", ")}

=== ALLOCATION STATUS ===
Candidates Allocated: ${myAllocations.length} out of ${totalCapacity} seats
Fill Rate: ${totalCapacity > 0 ? Math.round((myAllocations.length / totalCapacity) * 100) : 0}%

=== YOUR INTERNSHIPS ===
${myInternships.slice(0, 5).map(i =>
        `- ${i.internshipId}: ${i.sector} (${i.tier}) - ${i.capacity} seats`
    ).join("\n")}
${myInternships.length > 5 ? `... and ${myInternships.length - 5} more` : ""}
`;
}

/**
 * Admin context - AGGREGATE STATISTICS ONLY
 * Includes: total counts, category distributions, placement rates
 * Excludes: individual student/company data
 */
async function getAdminContext(): Promise<string> {
    const candidates = await storage.getAllCandidates();
    const internships = await storage.getAllInternships();
    const allocations = await storage.getAllocations?.() || [];

    // Category distribution
    const categoryCount: Record<string, number> = {};
    const genderCount: Record<string, number> = {};
    let ruralCount = 0;

    candidates.forEach(c => {
        const cat = c.reservation || "GEN";
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;

        const gender = c.gender || "Unknown";
        genderCount[gender] = (genderCount[gender] || 0) + 1;

        if (c.rural) ruralCount++;
    });

    // Internship stats
    const totalCapacity = internships.reduce((sum, i) => sum + (i.capacity || 0), 0);
    const sectorCount: Record<string, number> = {};
    internships.forEach(i => {
        sectorCount[i.sector] = (sectorCount[i.sector] || 0) + 1;
    });

    const placementRate = candidates.length > 0
        ? Math.round((allocations.length / candidates.length) * 100)
        : 0;

    return `
=== SYSTEM STATISTICS (LIVE) ===

STUDENTS:
- Total Registered: ${candidates.length}
- Allocated: ${allocations.length}
- Placement Rate: ${placementRate}%

CATEGORY DISTRIBUTION:
${Object.entries(categoryCount).map(([cat, count]) =>
        `- ${cat}: ${count} (${Math.round((count / candidates.length) * 100)}%)`
    ).join("\n")}

GENDER DISTRIBUTION:
${Object.entries(genderCount).map(([g, count]) =>
        `- ${g}: ${count} (${Math.round((count / candidates.length) * 100)}%)`
    ).join("\n")}

RURAL STUDENTS:
- Count: ${ruralCount}
- Percentage: ${Math.round((ruralCount / candidates.length) * 100)}%

INTERNSHIPS:
- Total Posted: ${internships.length}
- Total Capacity: ${totalCapacity}
- Capacity Utilized: ${allocations.length}/${totalCapacity} (${totalCapacity > 0 ? Math.round((allocations.length / totalCapacity) * 100) : 0}%)

TOP SECTORS:
${Object.entries(sectorCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([sector, count]) => `- ${sector}: ${count} internships`)
            .join("\n")}
`;
}

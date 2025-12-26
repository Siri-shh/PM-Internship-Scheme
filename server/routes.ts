import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { setupJWTAuth } from "./jwtRoutes";
import { insertCandidateSchema, insertInternshipSchema, type User } from "@shared/schema";
import { cacheGet, cacheSet, CACHE_KEYS, CACHE_TTL } from "./cache";
import { getChatContext, type PortalType } from "./chatContext";
import {
  initializeEmailService,
  getObjectionRequest,
  updateObjectionStatus,
  getPendingObjections,
  objectionRequests
} from "./emailService";


const ML_BASE_URL = process.env.ML_BASE_URL || "https://internship-ml-backend-production.up.railway.app";

function jsonToCsv(items: any[], fields: { key: string; label: string }[]): string {
  const header = fields.map(f => f.label).join(",");
  const rows = items.map(item =>
    fields.map(field => {
      let val = item[field.key];
      // Handle boolean for 'rural'
      if (field.label === "rural" && typeof val === "boolean") {
        return val ? "1" : "0";
      }
      if (val === null || val === undefined) return "";

      const str = String(val);
      if (str.includes(",") || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(",")
  );
  return [header, ...rows].join("\n");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);
  setupJWTAuth(app);  // JWT authentication routes

  // Initialize email service
  initializeEmailService();

  // ============== Objection API Routes ==============
  // Get objection details by token
  app.get("/api/objection/:token", (req, res) => {
    const { token } = req.params;
    const objection = getObjectionRequest(token);

    if (!objection) {
      return res.status(404).json({ error: "Objection not found or expired" });
    }

    res.json(objection);
  });

  // Submit objection with reason
  app.post("/api/objection/:token/submit", (req, res) => {
    const { token } = req.params;
    const { reason } = req.body;

    const objection = getObjectionRequest(token);
    if (!objection) {
      return res.status(404).json({ error: "Objection not found or expired" });
    }

    if (objection.status !== 'pending') {
      return res.status(400).json({ error: "Objection already processed" });
    }

    // Store the reason (extend the objection request)
    (objection as any).reason = reason;
    objectionRequests.set(token, objection);

    console.log(`[Objection] Submitted for review: ${token.substring(0, 8)}... by ${objection.email}`);
    res.json({ success: true, message: "Objection submitted for review" });
  });

  // Admin: Get pending objections
  app.get("/api/admin/objections", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== "admin") return res.status(403).send("Admin access required");

    const pending = getPendingObjections();
    res.json(pending);
  });

  // Admin: Approve/Reject objection
  app.post("/api/admin/objection/:token/:action", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== "admin") return res.status(403).send("Admin access required");

    const { token, action } = req.params;
    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ error: "Invalid action. Use 'approve' or 'reject'" });
    }

    const result = await updateObjectionStatus(token, action === 'approve' ? 'approved' : 'rejected');
    if (!result.success) {
      return res.status(404).json({ error: "Objection not found" });
    }

    console.log(`[Objection] ${action}d by admin: ${token.substring(0, 8)}... (email sent: ${result.emailSent})`);
    res.json({ success: true, message: `Objection ${action}d`, emailSent: result.emailSent });
  });

  // Student Routes
  app.get("/api/student/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== "student") return res.status(403).send("Forbidden");

    // Find candidate by userId (not username, since studentId follows S##### pattern)
    const candidate = await storage.getCandidateByUserId(user.id);
    if (!candidate) {
      // If no profile yet, return null so frontend knows to show "complete profile"
      return res.status(200).json(null);
    }
    res.json(candidate);
  });

  app.post("/api/student/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== "student") return res.status(403).send("Forbidden");

    console.log("Saving profile for user:", user.username, "userId:", user.id, "Payload keys:", Object.keys(req.body));

    const data = req.body;

    try {
      // Check if profile already exists for this user (by userId)
      const existing = await storage.getCandidateByUserId(user.id);

      if (existing) {
        // Update existing profile
        console.log("Updating existing profile for studentId:", existing.studentId);
        const result = await storage.updateCandidate(existing.studentId, {
          ...data,
          userId: user.id
        });
        return res.json(result);
      }

      // Create new profile with auto-generated student ID
      const newStudentId = await storage.getNextStudentId();
      console.log("Generated new studentId:", newStudentId);

      const candidateData = {
        ...data,
        studentId: newStudentId,
        userId: user.id
      };

      const result = await storage.createCandidate(candidateData);
      console.log("Created new candidate:", result.studentId);
      res.json(result);
    } catch (e: any) {
      console.error("Profile save error:", e);
      res.status(500).send(e.message);
    }
  });

  // Public/Protected Internships Route - WITH CACHE
  app.get("/api/internships", async (req, res) => {
    // Ideally protected, but for "browse" maybe public? 
    // Start protected as per plan
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      // Try cache first
      const cacheKey = CACHE_KEYS.internshipsAll();
      const cached = await cacheGet<any[]>(cacheKey);

      if (cached) {
        console.log(`API Fetch: Returning ${cached.length} internships from CACHE`);
        return res.json(cached);
      }

      // Cache miss - query database
      const internships = await storage.getAllInternships();
      console.log(`API Fetch: Found ${internships.length} internships from DATABASE`);

      // Store in cache for 10 minutes
      await cacheSet(cacheKey, internships, CACHE_TTL.INTERNSHIPS_ALL);

      res.json(internships);
    } catch (e: any) {
      res.status(500).send(e.message);
    }
  });

  app.post("/api/student/preferences", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== "student") return res.status(403).send("Forbidden");
    // Update preferences logic
    // Just accept body with pref1..pref6
    res.status(501).send("Use POST /api/student/profile to update preferences inside the profile object.");
  });

  // Student Predictions - Get ML predictions/allocations for the logged-in student
  app.get("/api/student/predictions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== "student") return res.status(403).send("Forbidden");

    try {
      // Get student's profile to find their studentId
      const candidate = await storage.getCandidateByUserId(user.id);
      if (!candidate) {
        return res.status(400).json({ error: "No profile found. Complete your profile first." });
      }

      // Fetch ML dashboard to get allocations
      const dashboardResponse = await fetch(`${ML_BASE_URL}/admin/dashboard`);
      if (!dashboardResponse.ok) {
        throw new Error(`ML API error: ${dashboardResponse.status}`);
      }
      const dashboardData = await dashboardResponse.json();

      // Find this student's allocation from the allocations array
      const allocations = dashboardData.allocations || [];
      const studentAllocation = allocations.find((a: any) => a.student_id === candidate.studentId);

      // Return student-specific predictions
      res.json({
        studentId: candidate.studentId,
        name: candidate.name,
        allocation: studentAllocation || null,
        fairness: dashboardData.fairness || null,
        totalPlaced: dashboardData.fairness?.total_placed || 0,
        placementRate: dashboardData.fairness?.placement_rate || 0,
        message: studentAllocation
          ? `You have been allocated to internship ${studentAllocation.internship_id}!`
          : "Allocation results pending. Check back after the next allocation round."
      });
    } catch (e: any) {
      console.error("Predictions fetch error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Delete student account - Used when discarding registration progress
  app.delete("/api/student/account", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== "student") return res.status(403).send("Forbidden");

    try {
      const userId = user.id;

      // First, try to delete candidate profile if exists
      try {
        await storage.deleteCandidateByUserId(userId);
        console.log(`Deleted candidate profile for user ${userId}`);
      } catch (e) {
        console.warn("Error deleting candidate:", e);
        // Continue even if candidate deletion fails
      }

      // Delete user account
      await storage.deleteUser(userId);
      console.log(`Deleted user account ${userId}`);

      // Logout the user
      req.logout((err) => {
        if (err) {
          console.warn("Logout error:", err);
        }
        // Destroy session
        req.session.destroy((sessionErr) => {
          if (sessionErr) {
            console.warn("Session destroy error:", sessionErr);
          }
          res.json({ success: true, message: "Account deleted successfully" });
        });
      });
    } catch (err) {
      console.error("Error deleting account:", err);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // Company Routes
  app.get("/api/company/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== "company") return res.status(403).send("Forbidden");

    // Find company by userId
    const company = await storage.getCompanyByUserId(user.id);
    if (!company) {
      return res.status(200).json(null);
    }
    res.json(company);
  });

  app.post("/api/company/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== "company") return res.status(403).send("Forbidden");

    console.log("Saving company profile for user:", user.username, "userId:", user.id);

    const data = req.body;

    try {
      // Check if profile already exists for this user
      const existing = await storage.getCompanyByUserId(user.id);

      if (existing) {
        // Update existing profile
        console.log("Updating existing company profile for id:", existing.id);
        const result = await storage.updateCompany(existing.id, {
          name: data.companyName || data.name,
          description: data.description || data.industrySector,
          website: data.website,
          contactEmail: data.contactEmail || user.username,
        });
        return res.json(result);
      }

      // Create new company profile
      const companyData = {
        userId: user.id,
        name: data.companyName || data.name,
        description: data.description || data.industrySector,
        website: data.website || null,
        contactEmail: data.contactEmail || user.username,
      };

      console.log("Creating new company profile:", companyData);
      const result = await storage.createCompany(companyData as any);
      console.log("Created company with id:", result.id);
      res.json(result);
    } catch (e: any) {
      console.error("Company profile save error:", e);
      res.status(500).send(e.message);
    }
  });

  // Company Internships - Get internships created by this company
  app.get("/api/company/internships", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== "company") return res.status(403).send("Forbidden");

    try {
      const company = await storage.getCompanyByUserId(user.id);
      if (!company) {
        return res.json([]); // No company profile yet, no internships
      }

      // Get all internships and filter by companyId
      const allInternships = await storage.getAllInternships();
      const companyInternships = allInternships.filter(
        int => int.companyId === company.id
      );

      res.json(companyInternships);
    } catch (e: any) {
      console.error("Company internships fetch error:", e);
      res.status(500).send(e.message);
    }
  });

  // Company Internships - Create new internship
  app.post("/api/company/internships", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== "company") return res.status(403).send("Forbidden");

    try {
      const company = await storage.getCompanyByUserId(user.id);
      if (!company) {
        return res.status(400).send("Please complete company registration first");
      }

      // Generate new internship ID
      const allInternships = await storage.getAllInternships();
      const maxNum = allInternships
        .map(i => {
          const match = i.internshipId.match(/^I(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .reduce((max, n) => Math.max(max, n), 0);
      const newId = `I${(maxNum + 1).toString().padStart(3, '0')}`;

      const data = req.body;

      // DEBUG: Log incoming request body to trace state
      console.log("=== DEBUG: Incoming request body ===");
      console.log("Full body:", JSON.stringify(data, null, 2));
      console.log("data.state:", data.state);
      console.log("data.tier:", data.tier);
      console.log("===================================");

      const internshipData = {
        internshipId: newId,
        companyId: company.id,
        sector: data.sector || "General",
        tier: data.tier || "Tier2",
        capacity: parseInt(data.capacity) || 1,
        requiredSkills: Array.isArray(data.requiredSkills)
          ? data.requiredSkills.join(";")
          : data.requiredSkills || "",
        stipend: parseInt(data.stipend) || 0,
        locationType: data.locationType || "Office",
        state: data.state || "MH", // Job location state (determines tier) - default to Maharashtra
      };

      console.log("Creating internship:", internshipData);
      const result = await storage.createInternship(internshipData as any);
      console.log("Created internship:", result.internshipId);
      res.json(result);
    } catch (e: any) {
      console.error("Internship create error:", e);
      res.status(500).send(e.message);
    }
  });

  // Company Allocations - Get students allocated to this company's internships
  app.get("/api/company/allocations", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== "company") return res.status(403).send("Forbidden");

    try {
      // Get company profile
      const company = await storage.getCompanyByUserId(user.id);
      if (!company) {
        return res.json({ allocations: [], internships: [] });
      }

      // Get company's internships
      const allInternships = await storage.getAllInternships();
      const companyInternships = allInternships.filter(
        int => int.companyId === company.id
      );

      if (companyInternships.length === 0) {
        return res.json({ allocations: [], internships: [] });
      }

      // Get internship IDs for this company
      const internshipIds = companyInternships.map(i => i.internshipId);

      // Fetch ML dashboard to get allocations
      const dashboardResponse = await fetch(`${ML_BASE_URL}/admin/dashboard`);
      if (!dashboardResponse.ok) {
        console.warn("ML dashboard not available for company allocations");
        return res.json({ allocations: [], internships: companyInternships });
      }

      const dashboardData = await dashboardResponse.json();
      const allAllocations = dashboardData.allocations || [];

      // Filter allocations for this company's internships
      const companyAllocations = allAllocations.filter((a: any) =>
        internshipIds.includes(a.internship_id)
      );

      // Get student details for allocated students
      const allocationsWithDetails = await Promise.all(
        companyAllocations.map(async (alloc: any) => {
          // Try to get student details from database
          const candidates = await storage.getAllCandidates();
          const student = candidates.find(c => c.studentId === alloc.student_id);

          return {
            ...alloc,
            studentDetails: student ? {
              name: student.name,
              email: student.email,
              skills: student.skills,
              gpa: student.gpa,
              gender: student.gender,
              reservation: student.reservation,
            } : null,
          };
        })
      );

      res.json({
        allocations: allocationsWithDetails,
        internships: companyInternships,
        summary: {
          totalInternships: companyInternships.length,
          totalCapacity: companyInternships.reduce((sum, i) => sum + (i.capacity || 0), 0),
          allocatedStudents: allocationsWithDetails.length,
        }
      });
    } catch (e: any) {
      console.error("Company allocations fetch error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // CSV Download Routes - for downloading database tables as CSV
  app.get("/api/download/students.csv", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== "admin") return res.status(403).send("Admin access required");

    try {
      const allCandidates = await storage.getAllCandidates();

      // CSV header matching the database schema
      const header = "student_id,name,email,gpa,skills,reservation,rural,gender,pref1,pref2,pref3,pref4,pref5,pref6";
      const rows = allCandidates.map(c => {
        return [
          c.studentId,
          `"${(c.name || '').replace(/"/g, '""')}"`,
          `"${(c.email || '').replace(/"/g, '""')}"`,
          c.gpa ?? '',
          `"${(c.skills || '').replace(/"/g, '""')}"`,
          c.reservation || '',
          c.rural ? '1' : '0',
          c.gender || '',
          c.pref1 || '',
          c.pref2 || '',
          c.pref3 || '',
          c.pref4 || '',
          c.pref5 || '',
          c.pref6 || ''
        ].join(',');
      });

      const csv = [header, ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
      res.send(csv);
    } catch (e: any) {
      console.error("CSV download error:", e);
      res.status(500).send(e.message);
    }
  });

  app.get("/api/download/internships.csv", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== "admin") return res.status(403).send("Admin access required");

    try {
      const allInternships = await storage.getAllInternships();

      // CSV header matching the database schema
      const header = "internship_id,company_id,sector,tier,capacity,required_skills,stipend,location_type";
      const rows = allInternships.map(i => {
        return [
          i.internshipId,
          i.companyId ?? '',
          `"${(i.sector || '').replace(/"/g, '""')}"`,
          i.tier || '',
          i.capacity ?? '',
          `"${(i.requiredSkills || '').replace(/"/g, '""')}"`,
          i.stipend ?? '',
          i.locationType || ''
        ].join(',');
      });

      const csv = [header, ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="internships.csv"');
      res.send(csv);
    } catch (e: any) {
      console.error("CSV download error:", e);
      res.status(500).send(e.message);
    }
  });

  // Admin / ML Routes
  app.post("/api/admin/ml/sync", async (req, res) => {
    // if (!req.isAuthenticated() || req.user?.role !== "admin") return res.status(401).send("Unauthorized");

    try {
      // 1. Fetch Data
      const candidates = await storage.getAllCandidates();
      const internships = await storage.getAllInternships();

      // 2. Convert to CSV
      // Essential Columns based on CSV inspection
      const studentFields = [
        { key: "studentId", label: "student_id" },
        { key: "gpa", label: "gpa" },
        { key: "skills", label: "skills" },
        { key: "reservation", label: "reservation" },
        { key: "rural", label: "rural" },
        { key: "gender", label: "gender" },
        { key: "pref1", label: "pref_1" },
        { key: "pref2", label: "pref_2" },
        { key: "pref3", label: "pref_3" },
        { key: "pref4", label: "pref_4" },
        { key: "pref5", label: "pref_5" },
        { key: "pref6", label: "pref_6" }
      ];
      const internshipFields = [
        { key: "internshipId", label: "internship_id" },
        { key: "sector", label: "sector" },
        { key: "tier", label: "tier" },
        { key: "capacity", label: "capacity" },
        { key: "requiredSkills", label: "required_skills" },
        { key: "stipend", label: "stipend" },
        { key: "locationType", label: "location_type" }
      ];

      const studentsCsv = jsonToCsv(candidates, studentFields);
      const internshipsCsv = jsonToCsv(internships, internshipFields);

      // 3. Upload to ML Backend
      // Construct FormData
      const studentForm = new FormData();
      studentForm.append("file", new Blob([studentsCsv]), "students.csv");

      const internshipForm = new FormData();
      internshipForm.append("file", new Blob([internshipsCsv]), "internships.csv");

      console.log("Uploading students...");
      const sRes = await fetch(`${ML_BASE_URL}/admin/upload/students`, {
        method: "POST",
        body: studentForm
      });
      if (!sRes.ok) throw new Error(`Student upload failed: ${sRes.statusText}`);

      console.log("Uploading internships...");
      const iRes = await fetch(`${ML_BASE_URL}/admin/upload/internships`, {
        method: "POST",
        body: internshipForm
      });
      if (!iRes.ok) throw new Error(`Internship upload failed: ${iRes.statusText}`);

      // 4. Trigger Training (Optional?)
      console.log("Triggering training...");
      const tRes = await fetch(`${ML_BASE_URL}/admin/train`, { method: "POST" });
      if (!tRes.ok) console.warn("Training warning:", tRes.statusText);

      res.json({ message: "Sync and Upload Successful" });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/ml/allocate", async (req, res) => {
    try {
      const response = await fetch(`${ML_BASE_URL}/admin/allocate`, { method: "POST" });
      if (!response.ok) throw new Error(`Allocation failed: ${response.statusText}`);
      const result = await response.json();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
  // ==========================================================================
  // ML API PROXY ROUTES (to avoid CORS issues)
  // ==========================================================================

  // Dashboard - Get ML dashboard data
  app.get("/api/admin/dashboard", async (req, res) => {
    console.log("Proxying: GET /admin/dashboard");
    try {
      const response = await fetch(`${ML_BASE_URL}/admin/dashboard`);
      if (!response.ok) {
        throw new Error(`ML API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log("Dashboard data received:", JSON.stringify(data).slice(0, 200));
      res.json(data);
    } catch (err: any) {
      console.error("Dashboard proxy error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Upload Students CSV
  app.post("/api/admin/upload/students", async (req, res) => {
    console.log("Proxying: POST /admin/upload/students");
    try {
      const contentType = req.headers["content-type"] || "";

      // Convert Buffer to Uint8Array for fetch body
      const bodyData = req.rawBody ? new Uint8Array(req.rawBody as Buffer) : undefined;

      const response = await fetch(`${ML_BASE_URL}/admin/upload/students`, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: bodyData,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`ML API error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      console.log("Students upload response:", data);
      res.json(data);
    } catch (err: any) {
      console.error("Students upload error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Upload Internships CSV
  app.post("/api/admin/upload/internships", async (req, res) => {
    console.log("Proxying: POST /admin/upload/internships");
    try {
      const contentType = req.headers["content-type"] || "";

      // Convert Buffer to Uint8Array for fetch body
      const bodyData = req.rawBody ? new Uint8Array(req.rawBody as Buffer) : undefined;

      const response = await fetch(`${ML_BASE_URL}/admin/upload/internships`, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: bodyData,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`ML API error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      console.log("Internships upload response:", data);
      res.json(data);
    } catch (err: any) {
      console.error("Internships upload error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Train Model
  app.post("/api/admin/train", async (req, res) => {
    console.log("Proxying: POST /admin/train");
    try {
      const response = await fetch(`${ML_BASE_URL}/admin/train`, { method: "POST" });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`ML API error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      console.log("Train response:", data);
      res.json(data);
    } catch (err: any) {
      console.error("Train error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Allocate
  app.post("/api/admin/allocate", async (req, res) => {
    console.log("Proxying: POST /admin/allocate");
    try {
      const response = await fetch(`${ML_BASE_URL}/admin/allocate`, { method: "POST" });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`ML API error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      console.log("Allocate response:", data);
      res.json(data);
    } catch (err: any) {
      console.error("Allocate error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Download ML output files
  app.get("/api/admin/ml/download/:filename", async (req, res) => {
    const { filename } = req.params;
    console.log(`Proxying: GET /admin/download/${filename}`);
    try {
      const response = await fetch(`${ML_BASE_URL}/admin/download/${filename}`);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`ML API error: ${response.status} - ${errText}`);
      }

      // Forward headers
      const contentType = response.headers.get("content-type") || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

      // Stream the response
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (err: any) {
      console.error(`Download ${filename} error:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // Student Predict
  app.post("/api/student/predict", async (req, res) => {
    console.log("Proxying: POST /student/predict");
    try {
      const response = await fetch(`${ML_BASE_URL}/student/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`ML API error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.error("Predict error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================================================
  // LOCAL DATABASE DOWNLOADS (from PostgreSQL)
  // ==========================================================================

  app.get("/api/admin/download/students.csv", async (req, res) => {
    console.log("Admin download students.csv requested");
    try {
      const candidates = await storage.getAllCandidates();
      console.log(`Exporting ${candidates.length} candidates to CSV`);
      const studentFields = [
        { key: "studentId", label: "student_id" },
        { key: "gpa", label: "gpa" },
        { key: "skills", label: "skills" },
        { key: "reservation", label: "reservation" },
        { key: "rural", label: "rural" },
        { key: "gender", label: "gender" },
        { key: "pref1", label: "pref_1" },
        { key: "pref2", label: "pref_2" },
        { key: "pref3", label: "pref_3" },
        { key: "pref4", label: "pref_4" },
        { key: "pref5", label: "pref_5" },
        { key: "pref6", label: "pref_6" }
      ];
      const csv = jsonToCsv(candidates, studentFields);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=students.csv");
      res.send(csv);
    } catch (err: any) {
      console.error("Students CSV error:", err);
      res.status(500).send(err.message);
    }
  });

  app.get("/api/admin/download/internships.csv", async (req, res) => {
    console.log("Admin download internships.csv requested");
    try {
      const internships = await storage.getAllInternships();
      console.log(`Exporting ${internships.length} internships to CSV`);
      const internshipFields = [
        { key: "internshipId", label: "internship_id" },
        { key: "sector", label: "sector" },
        { key: "tier", label: "tier" },
        { key: "capacity", label: "capacity" },
        { key: "requiredSkills", label: "required_skills" },
        { key: "stipend", label: "stipend" },
        { key: "locationType", label: "location_type" }
      ];
      const csv = jsonToCsv(internships, internshipFields);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=internships.csv");
      res.send(csv);
    } catch (err: any) {
      console.error("Internships CSV error:", err);
      res.status(500).send(err.message);
    }
  });

  // ============== Twilio OTP for e-KYC ==============
  // Map Aadhaar IDs to verified Twilio phone numbers
  const AADHAAR_PHONE_MAP: Record<string, string> = {
    '111122223333': '+917003365991',  // Aarav Sharma
    '111122223334': '+919830121021',  // Diya Patel
    '111122223335': '+917060571005',  // Rohan Gupta
    '111122223336': '+919142468747',  // Priya Verma
    '123412341234': '+917003365991',  // Test User
  };

  // In-memory OTP storage (for demo - in production use Redis/DB)
  const otpStore: Map<string, { otp: string; expires: number; phone: string }> = new Map();

  // Initialize Twilio client (using dynamic import for ESM compatibility)
  let twilioClient: { client: any; from: string } | null = null;
  (async () => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;

    if (sid && token && from) {
      try {
        const twilio = await import('twilio');
        twilioClient = { client: twilio.default(sid, token), from };
        console.log('[Twilio] Client initialized for OTP service');
      } catch (err) {
        console.error('[Twilio] Failed to initialize:', err);
      }
    } else {
      console.warn('[Twilio] Missing credentials - OTP will use mock mode');
    }
  })();

  // Generate 6-digit OTP
  function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // POST /api/ekyc/send-otp - Send OTP to phone linked to Aadhaar
  app.post("/api/ekyc/send-otp", async (req, res) => {
    try {
      const { aadhaarNumber } = req.body;

      if (!aadhaarNumber || aadhaarNumber.length !== 12) {
        return res.status(400).json({ success: false, error: 'Invalid Aadhaar number' });
      }

      // Look up phone number from Aadhaar
      const phone = AADHAAR_PHONE_MAP[aadhaarNumber];
      if (!phone) {
        // For demo, if Aadhaar not mapped, use first number as fallback
        console.log(`[OTP] Aadhaar ${aadhaarNumber} not mapped, using demo mode`);
        return res.status(400).json({
          success: false,
          error: 'Phone number not registered with this Aadhaar. Use test Aadhaar: 111122223333'
        });
      }

      // Generate OTP
      const otp = generateOTP();
      const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

      // Store OTP
      otpStore.set(aadhaarNumber, { otp, expires, phone });

      // Send SMS via Twilio
      if (twilioClient) {
        try {
          await twilioClient.client.messages.create({
            body: `Your SIH e-KYC verification code is: ${otp}. Valid for 5 minutes.`,
            from: twilioClient.from,
            to: phone
          });
          console.log(`[OTP] SMS sent to ${phone.slice(0, 5)}***`);
        } catch (smsErr: any) {
          console.error('[OTP] SMS send failed:', smsErr.message);
          // Still return success - OTP is stored for verification
          // In demo, we can verify even if SMS fails
        }
      } else {
        // Mock mode - log OTP to console
        console.log(`[OTP MOCK] Phone: ${phone}, OTP: ${otp}`);
      }

      // Return masked phone number
      const maskedPhone = phone.slice(0, 5) + '****' + phone.slice(-2);

      res.json({
        success: true,
        message: `OTP sent to ${maskedPhone}`,
        maskedPhone,
        // For demo/testing only - remove in production!
        ...(process.env.NODE_ENV === 'development' ? { debugOtp: otp } : {})
      });

    } catch (err: any) {
      console.error('[OTP] Send error:', err);
      res.status(500).json({ success: false, error: 'Failed to send OTP' });
    }
  });

  // POST /api/ekyc/verify-otp - Verify the OTP
  app.post("/api/ekyc/verify-otp", async (req, res) => {
    try {
      const { aadhaarNumber, otp } = req.body;

      if (!aadhaarNumber || !otp) {
        return res.status(400).json({ success: false, error: 'Aadhaar number and OTP required' });
      }

      const stored = otpStore.get(aadhaarNumber);

      if (!stored) {
        return res.status(400).json({ success: false, error: 'No OTP found. Please request a new one.' });
      }

      if (Date.now() > stored.expires) {
        otpStore.delete(aadhaarNumber);
        return res.status(400).json({ success: false, error: 'OTP expired. Please request a new one.' });
      }

      if (stored.otp !== otp.trim()) {
        return res.status(400).json({ success: false, error: 'Incorrect OTP. Please try again.' });
      }

      // OTP verified - clean up
      otpStore.delete(aadhaarNumber);

      console.log(`[OTP] Verification successful for Aadhaar ending ${aadhaarNumber.slice(-4)}`);

      res.json({
        success: true,
        message: 'OTP verified successfully!',
        verified: true
      });

    } catch (err: any) {
      console.error('[OTP] Verify error:', err);
      res.status(500).json({ success: false, error: 'Verification failed' });
    }
  });

  // Multi-language instruction - prepended to all prompts
  const LANGUAGE_INSTRUCTION = `
=== LANGUAGE DETECTION (STRICTLY FOLLOW) ===
ALWAYS respond in the SAME language the user writes in. DO NOT MIX LANGUAGES.

DETECTION RULES:
- If the question is in PURE ENGLISH (no Hindi/Gujarati words) → Reply ONLY in English
- If the question has Hindi words in Roman script (like "mujhe", "kaise", "kya") → Reply in Hinglish
- If the question is in Devanagari (हिंदी) → Reply in Devanagari Hindi
- If the question has Gujarati words in Roman script (like "mane", "kem", "shu") → Reply in romanized Gujarati
- If the question is in Gujarati script (ગુજરાતી) → Reply in Gujarati script

CRITICAL: If the user writes "How do I apply for internship?" - this is PURE ENGLISH. 
Reply in PURE ENGLISH only. Do NOT add any Hindi/Gujarati words.

DEFAULT: When in doubt, respond in English.
`;

  const PORTAL_SYSTEM_PROMPTS: Record<string, string> = {
    student: `You are the STUDENT PORTAL Assistant for the PM Internship Scheme (Government of India).

${LANGUAGE_INSTRUCTION}

YOU CAN ONLY ANSWER STUDENT-RELATED QUESTIONS. Use the knowledge base below to answer accurately.

=== STUDENT KNOWLEDGE BASE ===

Q: What does this platform do?
A: This platform automatically allocates students to internships using a Machine Learning + Fairness-Based Boosting Engine. It evaluates student profiles, preferences, eligibility, and applies fairness rules for balanced allocation.

Q: How does allocation work?
A: The system uses multiple layers: profile-to-internship matching, caste/rural/median uplift boosting, weighted scoring, preferential ordering, and seat-based selection with fairness logic. Merit is respected while reducing structural disadvantage.

Q: What data is used for my allocation?
A: Essential data from your profile: academic attributes, preference rankings (1-6 order), and eligibility criteria. Additional profile info is stored for analytics but not used in model computation.

Q: Is my data secure?
A: Yes. All personal information is securely stored with role-based access control. Only authorized users can view or modify sensitive information.

Q: What is boosting?
A: Boosting increases visibility of candidates within a narrow scoring window based on policy priorities (rural background, caste uplift, median tier). It does NOT override high merit - only operates when scores are close.

Q: Can I be upgraded later?
A: Yes! If you qualify for a higher preference in a later round and a seat becomes free, you may be upgraded.

Q: What if I don't get an internship in a round?
A: You remain active for subsequent rounds unless allocated, withdrawn, or found ineligible. The system mimics competitive admission dynamics.

=== ACCESS RESTRICTIONS ===

❌ COMPANY QUESTIONS: RESPOND: "I cannot answer company-related questions here. Please use the Company Portal."
❌ ADMIN QUESTIONS: RESPOND: "I cannot answer administrative questions here. Admin features are restricted."

Be encouraging and supportive. Keep responses concise and helpful.`,

    company: `You are the COMPANY PORTAL Assistant for the PM Internship Scheme (Government of India).

${LANGUAGE_INSTRUCTION}

YOU CAN ONLY ANSWER COMPANY-RELATED QUESTIONS. Use the knowledge base below to answer accurately.

=== COMPANY KNOWLEDGE BASE ===

Q: What does this platform do?
A: This platform automatically allocates students to internships using ML + Fairness-Based Boosting. Companies can register, list internships, and receive matched candidates.

Q: How does the ML matching work?
A: The system evaluates student profiles against your internship requirements using profile matching, skill matching, and weighted scoring to find the best candidates.

Q: Can I edit internship criteria?
A: Yes, before allocation starts. Once allocation begins, criteria are temporarily frozen for fairness stability.

Q: How are candidates ranked for my internships?
A: A final score is computed using match score, boost score (if eligible), and preference weightage.

=== ACCESS RESTRICTIONS ===

❌ STUDENT QUESTIONS: RESPOND: "I cannot answer student-related questions here. Please use the Student Portal."
❌ ADMIN QUESTIONS: RESPOND: "I cannot answer administrative questions here. Admin features are restricted."

Be professional and solution-oriented.`,

    admin: `You are the ADMIN PORTAL Assistant for the PM Internship Scheme (Government of India).

${LANGUAGE_INSTRUCTION}

YOU CAN ONLY ANSWER ADMINISTRATIVE QUESTIONS. Use the knowledge base below to answer accurately.

=== ADMIN KNOWLEDGE BASE ===

Q: What does this platform do?
A: Automatically allocates students to internships using ML + Fairness-Based Boosting Engine with profile matching, preference ordering, and controlled fairness logic.

Q: How does the ML model work?
A: The system fuses: profile-to-internship matching, caste/rural/median uplift boosting, weighted scoring, preferential ordering, and seat-based selection.

Q: How do I control allocation?
A: You can: upload essential CSV files, start allocation, monitor live dashboards, export detailed reports.

=== ACCESS RESTRICTIONS ===

❌ STUDENT QUESTIONS: RESPOND: "I cannot answer student questions here. Direct users to the Student Portal."
❌ COMPANY QUESTIONS: RESPOND: "I cannot answer company questions here. Direct users to the Company Portal."

Be precise and data-focused.`,

    public: `You are the GENERAL Assistant for the PM Internship Scheme portal (Government of India).

${LANGUAGE_INSTRUCTION}

YOU PROVIDE GENERAL INFORMATION ONLY.

=== GENERAL KNOWLEDGE BASE ===

Q: What does this platform do?
A: This platform automatically allocates students to internships using a Machine Learning + Fairness-Based Boosting Engine.

Q: Who can use this system?
A: Students (register, submit preferences), Companies (register, list internships), Admins (upload data, run allocation).

Q: Is data stored securely?
A: Yes. All personal information is securely stored with role-based access control.

=== ACCESS RESTRICTIONS ===

For detailed assistance, please log in to the appropriate portal (Student, Company, or Admin).

Be welcoming and guide users to register.`
  };

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, portalType, history } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        console.error("GROQ_API_KEY not configured");
        return res.status(500).json({
          error: "Chat service not configured",
          response: "I'm sorry, the chat service is not currently available. Please try again later."
        });
      }

      const basePrompt = PORTAL_SYSTEM_PROMPTS[portalType] || PORTAL_SYSTEM_PROMPTS.public;

      // Fetch live context from database (safe, non-PII data only)
      const user = req.isAuthenticated() ? req.user as User : undefined;
      const liveContext = await getChatContext(user, portalType as PortalType);

      // Combine base prompt with live context
      const systemPrompt = liveContext
        ? `${basePrompt}\n\n=== LIVE DATA (Use this to answer user questions) ===${liveContext}`
        : basePrompt;

      console.log(`[Chat] Portal: ${portalType}, User: ${user?.id || 'anonymous'}, Message: "${message.substring(0, 50)}..."`);

      // Groq API - OpenAI-compatible format
      const groqResponse = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              ...((history || []).map((msg: { role: string; content: string }) => ({
                role: msg.role === "user" ? "user" : "assistant",
                content: msg.content
              }))),
              { role: "user", content: message }
            ],
            max_tokens: 500,
            temperature: 0.7,
          }),
        }
      );

      if (!groqResponse.ok) {
        const errorData = await groqResponse.text();
        console.error("[Chat] Groq API error:", groqResponse.status, errorData);
        throw new Error(`Groq API error: ${groqResponse.status}`);
      }

      const data = await groqResponse.json();
      const response = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

      console.log(`[Chat] Response generated (${response.length} chars)`);

      res.json({ response });
    } catch (err: any) {
      console.error("[Chat] Error:", err);
      res.status(500).json({
        error: err.message,
        response: "I apologize, but I encountered an error processing your request. Please try again."
      });
    }
  });

  // ==========================================================================
  // ADMIN AUDIT ROUTES
  // ==========================================================================

  // Get all session history
  app.get("/api/admin/audit/sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== "admin") return res.status(403).send("Admin access required");

    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const sessions = await storage.getAllSessions(limit);
      res.json(sessions);
    } catch (err: any) {
      console.error("Audit sessions error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get active sessions only
  app.get("/api/admin/audit/sessions/active", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== "admin") return res.status(403).send("Admin access required");

    try {
      const sessions = await storage.getActiveSessions();
      res.json(sessions);
    } catch (err: any) {
      console.error("Active sessions error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get admin sessions only
  app.get("/api/admin/audit/sessions/admin", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== "admin") return res.status(403).send("Admin access required");

    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const sessions = await storage.getAdminSessions(limit);
      res.json(sessions);
    } catch (err: any) {
      console.error("Admin sessions error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get user events (creation/deletion log)
  app.get("/api/admin/audit/user-events", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== "admin") return res.status(403).send("Admin access required");

    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const events = await storage.getUserEvents(limit);
      res.json(events);
    } catch (err: any) {
      console.error("User events error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get allocation runs history
  app.get("/api/admin/audit/allocations", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== "admin") return res.status(403).send("Admin access required");

    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const runs = await storage.getAllocationRuns(limit);
      const count = await storage.getAllocationRunCount();
      res.json({ runs, totalCount: count });
    } catch (err: any) {
      console.error("Allocation runs error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get audit summary (aggregated stats)
  app.get("/api/admin/audit/summary", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== "admin") return res.status(403).send("Admin access required");

    try {
      const summary = await storage.getAuditSummary();
      res.json(summary);
    } catch (err: any) {
      console.error("Audit summary error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  return httpServer;
}


import { pgTable, text, serial, integer, boolean, real, primaryKey, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["student", "company", "admin"] }).notNull().default("student"),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  website: text("website"),
  contactEmail: text("contact_email"),
});

export const candidates = pgTable("candidates", {
  studentId: text("student_id").primaryKey(), // Matching S00001 format
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }), // Cascade delete when user deleted
  gpa: real("gpa").notNull(),
  skills: text("skills").notNull(), // Semicolon separated
  reservation: text("reservation").notNull(),
  rural: boolean("rural").notNull().default(false), // 0 or 1 in CSV
  gender: text("gender").notNull(),

  // Additional profile fields (optional as they might not be in CSV)
  name: text("name"),
  email: text("email"),
  state: text("state"), // For geographic partitioning

  // We can store preferences normalized or denormalized. 
  // For simplicity and alignment with ML CSV, we'll keep them here too or map them.
  // But strictly, preferences should be in a separate table for the app.
  // However, the ML needs "pref_1"..."pref_6". 
  // Let's store them here to make CSV generation easiest, 
  // OR we create a view. Storing here is fastest for now given the CSV structure.
  pref1: text("pref_1"),
  pref2: text("pref_2"),
  pref3: text("pref_3"),
  pref4: text("pref_4"),
  pref5: text("pref_5"),
  pref6: text("pref_6"),
});

export const internships = pgTable("internships", {
  internshipId: text("internship_id").primaryKey(), // Matching I001 format
  companyId: integer("company_id").references(() => companies.id, { onDelete: 'cascade' }), // Cascade delete when company deleted
  sector: text("sector").notNull(),
  tier: text("tier").notNull(),
  capacity: integer("capacity").notNull(),
  requiredSkills: text("required_skills").notNull(),
  stipend: integer("stipend").notNull(),
  locationType: text("location_type").notNull(), // Office, Remote, etc.
  state: text("state"), // Job location state - determines tier
});

// For tracking final allocations
export const allocations = pgTable("allocations", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").references(() => candidates.studentId, { onDelete: 'cascade' }).notNull(),
  internshipId: text("internship_id").references(() => internships.internshipId, { onDelete: 'cascade' }).notNull(),
  allocatedAt: timestamp("allocated_at").defaultNow(),
});

// Zod Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const insertCandidateSchema = createInsertSchema(candidates);
export const insertInternshipSchema = createInsertSchema(internships);
export const insertCompanySchema = createInsertSchema(companies);

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Candidate = typeof candidates.$inferSelect;
export type Internship = typeof internships.$inferSelect;
export type Company = typeof companies.$inferSelect;

// ============================================
// AUDIT TABLES (PIA-Compliant - No PII stored)
// ============================================

// Session Audit - tracks user login sessions (no IP addresses per PIA rules)
export const auditSessions = pgTable("audit_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'set null' }),
  username: text("username").notNull(),
  role: text("role", { enum: ["student", "company", "admin"] }).notNull(),
  loginAt: timestamp("login_at").defaultNow(),
  logoutAt: timestamp("logout_at"),
  isActive: boolean("is_active").default(true),
});

// User Events - tracks user creation and deletion
export const auditUserEvents = pgTable("audit_user_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type", { enum: ["created", "deleted"] }).notNull(),
  userId: integer("user_id"),
  username: text("username").notNull(),
  role: text("role", { enum: ["student", "company", "admin"] }).notNull(),
  performedBy: integer("performed_by"), // Admin who performed action (if applicable)
  performedByUsername: text("performed_by_username"),
  eventAt: timestamp("event_at").defaultNow(),
});

// Allocation Runs - tracks each allocation execution with counter
export const auditAllocationRuns = pgTable("audit_allocation_runs", {
  id: serial("id").primaryKey(),
  runNumber: integer("run_number").notNull(), // Sequential counter
  runBy: integer("run_by").references(() => users.id, { onDelete: 'set null' }),
  runByUsername: text("run_by_username"),
  runAt: timestamp("run_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  status: text("status", { enum: ["started", "completed", "failed"] }).notNull(),
  studentsProcessed: integer("students_processed"),
  allocationsCreated: integer("allocations_created"),
  durationMs: integer("duration_ms"),
  errorMessage: text("error_message"),
});

// Audit Types
export type AuditSession = typeof auditSessions.$inferSelect;
export type InsertAuditSession = typeof auditSessions.$inferInsert;
export type AuditUserEvent = typeof auditUserEvents.$inferSelect;
export type InsertAuditUserEvent = typeof auditUserEvents.$inferInsert;
export type AuditAllocationRun = typeof auditAllocationRuns.$inferSelect;
export type InsertAuditAllocationRun = typeof auditAllocationRuns.$inferInsert;

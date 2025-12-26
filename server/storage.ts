import {
  users, candidates, companies, internships, allocations,
  auditSessions, auditUserEvents, auditAllocationRuns,
  type User, type InsertUser, type Candidate, type Company, type Internship,
  type AuditSession, type AuditUserEvent, type AuditAllocationRun
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Candidates
  createCandidate(candidate: Candidate): Promise<Candidate>;
  getCandidate(studentId: string): Promise<Candidate | undefined>;
  getCandidateByUserId(userId: number): Promise<Candidate | undefined>;
  getAllCandidates(): Promise<Candidate[]>;
  getNextStudentId(): Promise<string>;

  // Companies & Internships
  createCompany(company: Company): Promise<Company>;
  createInternship(internship: Internship): Promise<Internship>;
  getAllInternships(): Promise<Internship[]>;
  updateCandidate(username: string, candidate: Partial<Candidate>): Promise<Candidate | undefined>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createCandidate(candidate: Candidate): Promise<Candidate> {
    const [newCandidate] = await db.insert(candidates).values(candidate).returning();
    return newCandidate;
  }

  async getCandidate(studentId: string): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.studentId, studentId));
    return candidate;
  }

  async getCandidateByUserId(userId: number): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.userId, userId));
    return candidate;
  }

  async getNextStudentId(): Promise<string> {
    // Get the highest student ID that follows the S##### pattern
    const result = await db
      .select({ studentId: candidates.studentId })
      .from(candidates)
      .where(sql`${candidates.studentId} ~ '^S[0-9]+$'`)
      .orderBy(desc(sql`CAST(SUBSTRING(${candidates.studentId}, 2) AS INTEGER)`))
      .limit(1);

    if (result.length === 0) {
      // No existing S##### IDs, start from S06001 (after seeded data S00001-S06000)
      return "S06001";
    }

    const lastId = result[0].studentId;
    const lastNum = parseInt(lastId.substring(1), 10);
    const nextNum = lastNum + 1;
    return `S${nextNum.toString().padStart(5, '0')}`;
  }

  async getAllCandidates(): Promise<Candidate[]> {
    return await db.select().from(candidates);
  }

  async createCompany(company: Company): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }

  async getCompanyByUserId(userId: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.userId, userId));
    return company;
  }

  async updateCompany(id: number, company: Partial<Company>): Promise<Company | undefined> {
    const [updated] = await db
      .update(companies)
      .set(company)
      .where(eq(companies.id, id))
      .returning();
    return updated;
  }

  async createInternship(internship: Internship): Promise<Internship> {
    const [newInternship] = await db.insert(internships).values(internship).returning();
    return newInternship;
  }

  async getAllInternships(): Promise<Internship[]> {
    return await db.select().from(internships);
  }

  async updateCandidate(username: string, candidate: Partial<Candidate>): Promise<Candidate | undefined> {
    const [updated] = await db
      .update(candidates)
      .set(candidate)
      .where(eq(candidates.studentId, username))
      .returning();
    return updated;
  }

  async deleteCandidateByUserId(userId: number): Promise<void> {
    await db.delete(candidates).where(eq(candidates.userId, userId));
  }

  async deleteUser(userId: number): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  /**
   * Get all allocations from the database
   * Used by chatbot context generator
   */
  async getAllocations(): Promise<{ studentId: string; internshipId: string; preferenceRank?: number }[]> {
    const results = await db.select().from(allocations);
    return results.map(a => ({
      studentId: a.studentId,
      internshipId: a.internshipId,
      preferenceRank: undefined // Can be extended if stored
    }));
  }

  // ============================================
  // AUDIT METHODS (PIA-Compliant)
  // ============================================

  // Session Audit Methods
  async createSessionAudit(session: { userId: number; username: string; role: string }): Promise<AuditSession> {
    const [newSession] = await db.insert(auditSessions).values({
      userId: session.userId,
      username: session.username,
      role: session.role as "student" | "company" | "admin",
      isActive: true,
    }).returning();
    return newSession;
  }

  async endSessionAudit(userId: number): Promise<void> {
    await db.update(auditSessions)
      .set({ logoutAt: new Date(), isActive: false })
      .where(eq(auditSessions.userId, userId));
  }

  async getActiveSessions(): Promise<AuditSession[]> {
    return await db.select().from(auditSessions)
      .where(eq(auditSessions.isActive, true))
      .orderBy(desc(auditSessions.loginAt));
  }

  async getAllSessions(limit: number = 100): Promise<AuditSession[]> {
    return await db.select().from(auditSessions)
      .orderBy(desc(auditSessions.loginAt))
      .limit(limit);
  }

  async getAdminSessions(limit: number = 50): Promise<AuditSession[]> {
    return await db.select().from(auditSessions)
      .where(eq(auditSessions.role, "admin"))
      .orderBy(desc(auditSessions.loginAt))
      .limit(limit);
  }

  // User Event Methods
  async logUserEvent(event: {
    eventType: "created" | "deleted";
    userId?: number;
    username: string;
    role: string;
    performedBy?: number;
    performedByUsername?: string;
  }): Promise<AuditUserEvent> {
    const [newEvent] = await db.insert(auditUserEvents).values({
      eventType: event.eventType,
      userId: event.userId,
      username: event.username,
      role: event.role as "student" | "company" | "admin",
      performedBy: event.performedBy,
      performedByUsername: event.performedByUsername,
    }).returning();
    return newEvent;
  }

  async getUserEvents(limit: number = 100): Promise<AuditUserEvent[]> {
    return await db.select().from(auditUserEvents)
      .orderBy(desc(auditUserEvents.eventAt))
      .limit(limit);
  }

  // Allocation Run Methods
  async getNextAllocationRunNumber(): Promise<number> {
    const [result] = await db.select({ maxRun: sql<number>`COALESCE(MAX(${auditAllocationRuns.runNumber}), 0)` })
      .from(auditAllocationRuns);
    return (result?.maxRun || 0) + 1;
  }

  async startAllocationRun(runBy?: number, runByUsername?: string): Promise<AuditAllocationRun> {
    const runNumber = await this.getNextAllocationRunNumber();
    const [run] = await db.insert(auditAllocationRuns).values({
      runNumber,
      runBy,
      runByUsername,
      status: "started",
    }).returning();
    return run;
  }

  async completeAllocationRun(runId: number, stats: {
    studentsProcessed?: number;
    allocationsCreated?: number;
    durationMs?: number;
  }): Promise<void> {
    await db.update(auditAllocationRuns)
      .set({
        status: "completed",
        completedAt: new Date(),
        ...stats,
      })
      .where(eq(auditAllocationRuns.id, runId));
  }

  async failAllocationRun(runId: number, errorMessage: string): Promise<void> {
    await db.update(auditAllocationRuns)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorMessage,
      })
      .where(eq(auditAllocationRuns.id, runId));
  }

  async getAllocationRuns(limit: number = 50): Promise<AuditAllocationRun[]> {
    return await db.select().from(auditAllocationRuns)
      .orderBy(desc(auditAllocationRuns.runAt))
      .limit(limit);
  }

  async getAllocationRunCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(auditAllocationRuns);
    return result?.count || 0;
  }

  // Audit Summary
  async getAuditSummary(): Promise<{
    totalSessions: number;
    activeSessions: number;
    totalUserEvents: number;
    totalAllocationRuns: number;
    lastAllocationRun: AuditAllocationRun | null;
  }> {
    const [sessionStats] = await db.select({
      total: sql<number>`COUNT(*)`,
      active: sql<number>`SUM(CASE WHEN ${auditSessions.isActive} = true THEN 1 ELSE 0 END)`,
    }).from(auditSessions);

    const [eventStats] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(auditUserEvents);

    const [runStats] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(auditAllocationRuns);

    const [lastRun] = await db.select().from(auditAllocationRuns)
      .orderBy(desc(auditAllocationRuns.runAt))
      .limit(1);

    return {
      totalSessions: sessionStats?.total || 0,
      activeSessions: sessionStats?.active || 0,
      totalUserEvents: eventStats?.count || 0,
      totalAllocationRuns: runStats?.count || 0,
      lastAllocationRun: lastRun || null,
    };
  }
}

export const storage = new DatabaseStorage();

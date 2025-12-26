import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";
import { initializeEmailService, sendRegistrationConfirmation, sendExplicitWordNotification, isWhitelisted } from "./emailService";
import { validateRegistrationContent } from "./profanityFilter";

const scryptAsync = promisify(scrypt);

// ============================================
// BRUTE FORCE PROTECTION - Rate Limiter
// ============================================
const MAX_ATTEMPTS = 5;           // Max failed attempts before lockout
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes lockout

interface LoginAttempt {
    count: number;
    lockedUntil: number | null;
    lastAttempt: number;
}

// In-memory store for login attempts (per IP)
const loginAttempts: Map<string, LoginAttempt> = new Map();

// Clean up old entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    Array.from(loginAttempts.entries()).forEach(([ip, attempt]) => {
        // Remove entries that are unlocked and haven't had activity in 30 minutes
        if (!attempt.lockedUntil && now - attempt.lastAttempt > 30 * 60 * 1000) {
            loginAttempts.delete(ip);
        }
        // Remove entries where lockout has expired and count is reset
        if (attempt.lockedUntil && now > attempt.lockedUntil) {
            loginAttempts.delete(ip);
        }
    });
}, 10 * 60 * 1000);

/**
 * Get client IP address (handles proxies)
 */
function getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Check if IP is currently locked out
 * Returns: { locked: boolean, remainingSeconds?: number }
 */
function checkLockout(ip: string): { locked: boolean; remainingSeconds?: number } {
    const attempt = loginAttempts.get(ip);
    if (!attempt || !attempt.lockedUntil) {
        return { locked: false };
    }

    const now = Date.now();
    if (now >= attempt.lockedUntil) {
        // Lockout expired, reset
        loginAttempts.delete(ip);
        return { locked: false };
    }

    const remainingMs = attempt.lockedUntil - now;
    return {
        locked: true,
        remainingSeconds: Math.ceil(remainingMs / 1000)
    };
}

/**
 * Record a failed login attempt
 * Returns: { locked: boolean, attemptsRemaining?: number, remainingSeconds?: number }
 */
function recordFailedAttempt(ip: string): { locked: boolean; attemptsRemaining?: number; remainingSeconds?: number } {
    const now = Date.now();
    let attempt = loginAttempts.get(ip);

    if (!attempt) {
        attempt = { count: 0, lockedUntil: null, lastAttempt: now };
    }

    attempt.count++;
    attempt.lastAttempt = now;

    if (attempt.count >= MAX_ATTEMPTS) {
        // Lock out this IP
        attempt.lockedUntil = now + LOCKOUT_DURATION_MS;
        loginAttempts.set(ip, attempt);
        return {
            locked: true,
            remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000)
        };
    }

    loginAttempts.set(ip, attempt);
    return {
        locked: false,
        attemptsRemaining: MAX_ATTEMPTS - attempt.count
    };
}

/**
 * Clear failed attempts for an IP (on successful login)
 */
function clearAttempts(ip: string): void {
    loginAttempts.delete(ip);
}

async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
    // If stored password doesn't have a salt, handling legacy or plain text if any (safety fallback)
    if (!stored.includes(".")) return false;

    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
    // SESSION_SECRET must be set in environment
    if (!process.env.SESSION_SECRET) {
        throw new Error("SESSION_SECRET environment variable is required");
    }

    const sessionSettings: session.SessionOptions = {
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: storage.sessionStore,
        cookie: {
            secure: process.env.NODE_ENV === "production",
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        }
    };

    app.set("trust proxy", 1);
    app.use(session(sessionSettings));
    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(
        new LocalStrategy(async (username, password, done) => {
            try {
                const user = await storage.getUserByUsername(username);
                if (!user) {
                    return done(null, false, { message: "Invalid username" });
                }

                const isValid = await comparePasswords(password, user.password);
                if (!isValid) {
                    return done(null, false, { message: "Invalid password" });
                }

                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }),
    );

    passport.serializeUser((user, done) => {
        done(null, (user as User).id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await storage.getUser(id as number);
            // If user not found, pass false to indicate session should be cleared
            if (!user) {
                return done(null, false);
            }
            done(null, user);
        } catch (err) {
            // Don't throw, just indicate no user found
            console.warn("deserializeUser error:", err);
            done(null, false);
        }
    });

    app.post("/api/register", async (req, res, next) => {
        try {
            const userEmail = req.body.email || req.body.username;
            const userName = req.body.name || req.body.username;

            console.log(`[Auth] Checking registration: name="${userName}", email="${userEmail}"`);

            // Check whitelist first (approved objections bypass profanity check)
            const whitelisted = isWhitelisted(userName, userEmail);
            console.log(`[Auth] Whitelist check: ${whitelisted}`);

            // Server-side profanity check BEFORE creating user (skip if whitelisted)
            const contentCheck = validateRegistrationContent(userName, userEmail);
            console.log(`[Auth] Profanity check result: isValid=${contentCheck.isValid}, field=${contentCheck.field}, word=${contentCheck.detectedWord}`);

            if (!contentCheck.isValid && !whitelisted) {
                console.log(`[Auth] Registration blocked for profanity: ${contentCheck.detectedWord}`);

                // Send notification email with objection URL
                if (userEmail && userEmail.includes('@')) {
                    sendExplicitWordNotification(
                        userEmail,
                        userName,
                        contentCheck.detectedWord || 'unknown'
                    ).then(result => {
                        console.log(`[Auth] Profanity notification email sent: ${result.sent}`);
                    }).catch(err => console.error('[Auth] Profanity email failed:', err));
                }

                return res.status(400).json({
                    message: "Registration blocked: Your name or email contains inappropriate content. Check your email for more information.",
                    blocked: true,
                    field: contentCheck.field
                });
            }

            if (whitelisted && !contentCheck.isValid) {
                console.log(`[Auth] Allowing registration due to whitelist approval`);
            }

            const existingUser = await storage.getUserByUsername(req.body.username);
            if (existingUser) {
                return res.status(400).json({ message: "Username already exists" });
            }

            const hashedPassword = await hashPassword(req.body.password);
            const user = await storage.createUser({
                ...req.body,
                password: hashedPassword,
            });

            // Send registration confirmation email (non-blocking)
            if (userEmail && userEmail.includes('@')) {
                sendRegistrationConfirmation(
                    userEmail,
                    userName,
                    user.role === 'company' ? 'company' : 'student'
                ).catch(err => console.error('[Auth] Email send failed:', err));
            }

            req.login(user, (err) => {
                if (err) return next(err);
                res.status(201).json(user);
            });
        } catch (err) {
            next(err);
        }
    });

    app.post("/api/login", (req, res, next) => {
        const clientIP = getClientIP(req);

        // Check if IP is locked out
        const lockoutStatus = checkLockout(clientIP);
        if (lockoutStatus.locked) {
            return res.status(429).json({
                message: `Too many failed attempts. Try again in ${Math.ceil(lockoutStatus.remainingSeconds! / 60)} minutes.`,
                locked: true,
                remainingSeconds: lockoutStatus.remainingSeconds
            });
        }

        passport.authenticate("local", (err: Error | null, user: User | false, info: { message?: string } | undefined) => {
            if (err) return next(err);

            if (!user) {
                // Record failed attempt
                const attemptResult = recordFailedAttempt(clientIP);

                if (attemptResult.locked) {
                    return res.status(429).json({
                        message: `Too many failed attempts. Try again in ${Math.ceil(attemptResult.remainingSeconds! / 60)} minutes.`,
                        locked: true,
                        remainingSeconds: attemptResult.remainingSeconds
                    });
                }

                return res.status(401).json({
                    message: info?.message || "Authentication failed",
                    attemptsRemaining: attemptResult.attemptsRemaining
                });
            }

            // Successful login - clear failed attempts
            clearAttempts(clientIP);

            req.login(user, async (err) => {
                if (err) return next(err);

                // Create session audit record
                try {
                    const sessionAudit = await storage.createSessionAudit({
                        userId: user.id,
                        username: user.username,
                        role: user.role,
                    });
                    // Store audit session ID in session for logout tracking
                    (req.session as any).auditSessionId = sessionAudit.id;
                } catch (auditErr) {
                    console.error('Failed to create session audit:', auditErr);
                    // Don't fail login if audit fails
                }

                res.json(user);
            });
        })(req, res, next);
    });

    app.post("/api/logout", async (req, res, next) => {
        // End session audit if exists
        const auditSessionId = (req.session as any)?.auditSessionId;
        if (auditSessionId) {
            try {
                await storage.endSessionAudit(auditSessionId);
            } catch (auditErr) {
                console.error('Failed to end session audit:', auditErr);
                // Don't fail logout if audit fails
            }
        }

        req.logout((err) => {
            if (err) return next(err);
            res.sendStatus(200);
        });
    });

    app.get("/api/user", (req, res) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.json(req.user);
    });
}

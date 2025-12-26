import { Express, Request, Response } from "express";
import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    authenticateJWT,
    REFRESH_TOKEN_COOKIE_NAME,
    REFRESH_TOKEN_COOKIE_OPTIONS,
} from "./jwt";

const scryptAsync = promisify(scrypt);

/**
 * Compare a supplied password with a stored hashed password
 */
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
    if (!stored.includes(".")) return false;

    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Setup JWT authentication routes
 */
export function setupJWTAuth(app: Express) {
    /**
     * POST /api/auth/login
     * Authenticate user and return tokens
     */
    app.post("/api/auth/login", async (req: Request, res: Response) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ message: "Username and password are required" });
            }

            const user = await storage.getUserByUsername(username);
            if (!user) {
                return res.status(401).json({ message: "Invalid username or password" });
            }

            const isValid = await comparePasswords(password, user.password);
            if (!isValid) {
                return res.status(401).json({ message: "Invalid username or password" });
            }

            // Generate tokens
            const accessToken = generateAccessToken(user);
            const refreshToken = generateRefreshToken(user);

            // Set refresh token as httpOnly cookie
            res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

            // Return access token and user info (without password)
            const { password: _, ...userWithoutPassword } = user;
            res.json({
                accessToken,
                user: userWithoutPassword,
            });
        } catch (error) {
            console.error("JWT login error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    /**
     * POST /api/auth/refresh
     * Issue a new access token using the refresh token from cookie
     */
    app.post("/api/auth/refresh", async (req: Request, res: Response) => {
        try {
            const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

            if (!refreshToken) {
                return res.status(401).json({ message: "No refresh token provided" });
            }

            const payload = verifyRefreshToken(refreshToken);
            if (!payload) {
                // Clear invalid refresh token
                res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { path: "/" });
                return res.status(401).json({ message: "Invalid or expired refresh token" });
            }

            // Get fresh user data
            const user = await storage.getUser(payload.userId);
            if (!user) {
                res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { path: "/" });
                return res.status(401).json({ message: "User not found" });
            }

            // Generate new access token
            const accessToken = generateAccessToken(user);

            res.json({ accessToken });
        } catch (error) {
            console.error("JWT refresh error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    /**
     * POST /api/auth/logout
     * Clear the refresh token cookie
     */
    app.post("/api/auth/logout", (_req: Request, res: Response) => {
        res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { path: "/" });
        res.status(200).json({ message: "Logged out successfully" });
    });

    /**
     * GET /api/auth/me
     * Get current authenticated user
     */
    app.get("/api/auth/me", authenticateJWT, async (req: Request, res: Response) => {
        try {
            if (!req.jwtUser) {
                return res.status(401).json({ message: "Not authenticated" });
            }

            const user = await storage.getUser(req.jwtUser.userId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            // Return user info without password
            const { password: _, ...userWithoutPassword } = user;
            res.json(userWithoutPassword);
        } catch (error) {
            console.error("JWT /me error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    console.log("[JWT] Auth routes registered");
}

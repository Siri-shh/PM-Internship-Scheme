import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { User } from "@shared/schema";

// Configuration - JWT_SECRET must be set in environment
if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
}
const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRY = "7d"; // 7 days

// Token payload interface
export interface JWTPayload {
    userId: number;
    username: string;
    role: "student" | "company" | "admin";
}

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            jwtUser?: JWTPayload;
        }
    }
}

/**
 * Generate an access token for the user
 */
export function generateAccessToken(user: User): string {
    const payload: JWTPayload = {
        userId: user.id,
        username: user.username,
        role: user.role as "student" | "company" | "admin",
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Generate a refresh token for the user
 */
export function generateRefreshToken(user: User): string {
    const payload: JWTPayload = {
        userId: user.id,
        username: user.username,
        role: user.role as "student" | "company" | "admin",
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

/**
 * Verify and decode an access token
 */
export function verifyAccessToken(token: string): JWTPayload | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        return decoded;
    } catch (error) {
        return null;
    }
}

/**
 * Verify and decode a refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        return decoded;
    } catch (error) {
        return null;
    }
}

/**
 * Middleware to authenticate JWT from Authorization header
 * Expects: Authorization: Bearer <token>
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "No authorization header provided" });
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({ message: "Invalid authorization header format" });
    }

    const token = parts[1];
    const payload = verifyAccessToken(token);

    if (!payload) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }

    req.jwtUser = payload;
    next();
}

/**
 * Optional JWT authentication - doesn't fail if no token provided
 * Useful for routes that work both authenticated and unauthenticated
 */
export function optionalJWT(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const parts = authHeader.split(" ");
        if (parts.length === 2 && parts[0] === "Bearer") {
            const token = parts[1];
            const payload = verifyAccessToken(token);
            if (payload) {
                req.jwtUser = payload;
            }
        }
    }

    next();
}

// Export constants for cookie configuration
export const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
export const REFRESH_TOKEN_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: "/",
};

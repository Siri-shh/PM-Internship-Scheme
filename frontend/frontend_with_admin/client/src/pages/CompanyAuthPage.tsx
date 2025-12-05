// src/pages/CompanyAuthPage.tsx
import React, { useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Mail, Building2, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function CompanyAuthPage(): JSX.Element {
    const { isAuthenticated, loginCompany, registerCompany, logout } = useAuth();
    const [isSignup, setIsSignup] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [sector, setSector] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const validate = () => {
        if (isSignup && !name.trim()) {
            setError("Please enter company name.");
            return false;
        }
        if (isSignup && !sector) {
            setError("Please select a sector.");
            return false;
        }
        if (!email.trim()) {
            setError("Please enter email.");
            return false;
        }
        if (!password || password.length < 6) {
            setError("Password must be at least 6 characters.");
            return false;
        }
        setError(null);
        return true;
    };

    const submit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!validate()) return;
        setLoading(true);
        setError(null);
        try {
            if (isSignup) {
                await registerCompany(name.trim(), email.trim(), password, sector);
                // Redirected to login by AuthProvider logic or we switch manually
                setIsSignup(false);
                alert("Company registered successfully! Please login.");
            } else {
                await loginCompany(email.trim(), password);
            }
        } catch (err: any) {
            console.warn("Company Auth error", err);
            setError(err.message || "Authentication failed.");
        } finally {
            setLoading(false);
        }
    };

    const continueToPortal = () => {
        window.location.href = "/company";
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Column - Company Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 text-white">
                <div className="absolute inset-0 bg-[url('/images/building.jpg')] bg-cover bg-center opacity-20" />
                <div className="relative z-10 flex flex-col justify-center items-center p-12 text-center h-full">
                    <Building2 className="h-20 w-20 text-purple-400 mb-8" />
                    <h1 className="text-4xl font-bold mb-4">Partner with Future Leaders</h1>
                    <p className="text-lg text-slate-300 max-w-md">
                        Join thousands of companies hiring top talent through the PM Internship Scheme.
                    </p>

                    <div className="mt-12 grid grid-cols-2 gap-8 text-left">
                        <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
                            <h3 className="font-semibold text-xl mb-2">Streamlined Hiring</h3>
                            <p className="text-sm text-slate-300">AI-powered matching to find the perfect interns for your needs.</p>
                        </div>
                        <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
                            <h3 className="font-semibold text-xl mb-2">Government Backed</h3>
                            <p className="text-sm text-slate-300">Official platform ensuring compliance and quality candidates.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column - Auth Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-background relative">
                <div className="w-full max-w-md">
                    {isAuthenticated ? (
                        <div className="text-center space-y-4">
                            <h2 className="text-2xl font-bold">Welcome Back</h2>
                            <p className="text-muted-foreground">You are currently logged in.</p>
                            <div className="flex gap-3 justify-center">
                                <Button onClick={continueToPortal}>Go to Dashboard</Button>
                                <Button variant="destructive" onClick={logout}>Logout</Button>
                            </div>
                        </div>
                    ) : (
                        <Card className="border-slate-200 shadow-xl">
                            <CardHeader className="space-y-1">
                                <CardTitle className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                    {isSignup ? "Register Company" : "Company Login"}
                                </CardTitle>
                                <CardDescription>
                                    {isSignup
                                        ? "Create a new company account to start hiring"
                                        : "Access your hiring dashboard"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={submit} className="space-y-4">
                                    {isSignup && (
                                        <>
                                            <div className="space-y-2">
                                                <Label htmlFor="cname">Company Name</Label>
                                                <div className="relative">
                                                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        id="cname"
                                                        placeholder="Acme Corp"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        className="pl-10"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="sector">Industry Sector</Label>
                                                <select
                                                    id="sector"
                                                    value={sector}
                                                    onChange={(e) => setSector(e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-md bg-background"
                                                    required
                                                >
                                                    <option value="">Select a sector</option>
                                                    <option value="Technology">Technology</option>
                                                    <option value="Finance">Finance</option>
                                                    <option value="Healthcare">Healthcare</option>
                                                    <option value="Manufacturing">Manufacturing</option>
                                                    <option value="Retail">Retail</option>
                                                    <option value="Education">Education</option>
                                                    <option value="Consulting">Consulting</option>
                                                    <option value="Marketing">Marketing</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                        </>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Work Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="hr@company.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="pl-10"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="pl-10 pr-10"
                                                required
                                                minLength={6}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                                            {error}
                                        </div>
                                    )}

                                    <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={loading}>
                                        {loading ? "Processing..." : isSignup ? "Register Company" : "Login"}
                                    </Button>

                                    <div className="text-center text-sm">
                                        <span className="text-muted-foreground">
                                            {isSignup ? "Already have an account?" : "New to PMIS?"}
                                        </span>{" "}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsSignup(!isSignup);
                                                setError(null);
                                                setPassword("");
                                            }}
                                            className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
                                        >
                                            {isSignup ? "Login here" : "Register here"}
                                        </button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

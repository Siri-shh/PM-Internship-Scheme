// src/pages/LoginPage.tsx
import React, { useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react";
import { Link } from "wouter";

export default function LoginPage(): JSX.Element {
  const { isAuthenticated, loginStudent, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email.trim()) {
      setError("Please enter your email.");
      return false;
    }
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email.trim())) {
      setError("Enter a valid email.");
      return false;
    }
    if (!password) {
      setError("Please enter your password.");
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
      await loginStudent(email.trim(), password);
    } catch (err: any) {
      console.warn("Login error", err);
      setError(err.message || "Failed to login.");
    } finally {
      setLoading(false);
    }
  };

  const continueToPortal = () => {
    window.location.href = "/student";
  };

  return (
    <div className="min-h-screen flex">
      {/* Beautiful Side Pattern - Left Column */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0">
          {/* Gradient Orbs */}
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

          {/* Grid Pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Floating Geometric Shapes */}
          <div className="absolute top-1/4 left-1/4 w-32 h-32 border-2 border-primary/20 rounded-lg rotate-12 animate-float" />
          <div className="absolute top-1/2 right-1/3 w-24 h-24 border-2 border-accent/20 rounded-full animate-float" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-1/3 left-1/3 w-40 h-40 border-2 border-primary/15 rounded-lg -rotate-6 animate-float" style={{ animationDelay: '1.5s' }} />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-center">
          <Sparkles className="h-16 w-16 text-primary mb-6 animate-pulse" />
          <h1 className="text-4xl font-bold mb-4">Student Portal</h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Launch your career with the Prime Minister's Internship Scheme.
          </p>
          <div className="mt-8 flex gap-4">
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-primary">50K+</div>
              <div className="text-sm text-muted-foreground">Students</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-primary">95%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form - Right Column */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background relative">
        <div className="w-full max-w-md">
          {/* Already Authenticated */}
          {isAuthenticated && (
            <div className="mb-6 flex gap-3">
              <Button onClick={continueToPortal} className="flex-1">
                Continue to Student Portal
              </Button>
              <Button
                onClick={() => {
                  logout && logout();
                }}
                variant="destructive"
              >
                Logout
              </Button>
            </div>
          )}

          {!isAuthenticated && (
            <Card>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold">Student Login</CardTitle>
                <CardDescription>Enter your credentials to access your account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submit} className="space-y-4">
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Field */}
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

                  {/* Error Message */}
                  {error && (
                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                      {error}
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Please wait..." : "Sign In"}
                  </Button>

                  {/* Link to Register */}
                  <div className="text-center text-sm">
                    <span className="text-muted-foreground">Don't have an account?</span>{" "}
                    <Link href="/register">
                      <span className="text-primary hover:underline font-medium cursor-pointer">Register</span>
                    </Link>
                  </div>

                  {/* Back to Home */}
                  <div className="text-center">
                    <Link href="/">
                      <Button variant="ghost" size="sm" type="button">
                        ← Back to Home
                      </Button>
                    </Link>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Floating Animation Styles */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

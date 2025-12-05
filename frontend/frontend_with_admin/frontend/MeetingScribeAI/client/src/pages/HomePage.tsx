// client/src/pages/HomePage.tsx
import { Header } from "@/components/Header";
import { StatsBar } from "@/components/StatsBar";
import { IndiaMap } from "@/components/IndiaMap";
import { SuccessStories } from "@/components/SuccessStories";
import { NotificationTicker } from "@/components/NotificationTicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, GraduationCap, Building2, Shield, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

export default function HomePage() {
  const [, setLocation] = useLocation();

  function enterPortal(key: "student" | "company" | "admin", path: string) {
    try {
      sessionStorage.setItem("portalSelected", key);
    } catch (e) {
      // sessionStorage may be blocked; still navigate so UX continues
    }
    setLocation(path);
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <Header />

      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              AI-Powered Internship Matching
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Launch Your Career with{" "}
              <span className="text-primary">PM Internship Scheme</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              India's largest AI-powered internship allocation platform connecting talented students with top companies across the nation
            </p>
          </motion.div>
        </div>
      </section>

      <StatsBar />

      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Internships Across India</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explore opportunities in major cities and emerging tech hubs nationwide
            </p>
          </motion.div>
          <IndiaMap />
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground">Simple steps to your dream internship</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "01",
                title: "Register & Verify",
                description: "Create your profile and verify your identity through DigiLocker",
                icon: GraduationCap,
              },
              {
                step: "02",
                title: "AI Matching",
                description: "Our AI analyzes your skills and preferences to find perfect matches",
                icon: Sparkles,
              },
              {
                step: "03",
                title: "Get Placed",
                description: "Companies review your profile and extend offers for internships",
                icon: Building2,
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover-elevate text-center" data-testid={`card-step-${item.step}`}>
                  <CardContent className="p-8">
                    <div className="text-5xl font-bold text-primary/20 mb-4">{item.step}</div>
                    <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                      <item.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <SuccessStories />

      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Choose Your Portal</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Select the appropriate portal to get started with the PM Internship Scheme
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card
                onClick={() => enterPortal("student", "/student")}
                className="h-full hover-elevate group cursor-pointer"
                data-testid="card-student-portal"
                aria-label="Enter Student Portal"
              >
                <CardContent className="p-6">
                  <div className="p-4 rounded-lg bg-blue-100 dark:bg-blue-900 w-fit mb-4 group-hover:scale-105 transition-transform">
                    <GraduationCap className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Student Portal</h3>
                  <p className="text-muted-foreground mb-4">
                    Register, build your profile, and discover internships matched to your skills
                  </p>
                  <Button variant="ghost" className="gap-2 p-0 h-auto">
                    Get Started <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Card
                onClick={() => enterPortal("company", "/company")}
                className="h-full hover-elevate group cursor-pointer"
                data-testid="card-company-portal"
                aria-label="Enter Company Portal"
              >
                <CardContent className="p-6">
                  <div className="p-4 rounded-lg bg-purple-100 dark:bg-purple-900 w-fit mb-4 group-hover:scale-105 transition-transform">
                    <Building2 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Company Portal</h3>
                  <p className="text-muted-foreground mb-4">
                    Post roles, review AI-shortlisted candidates, and manage your intern pipeline
                  </p>
                  <Button variant="ghost" className="gap-2 p-0 h-auto">
                    Register Company <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Card
                onClick={() => enterPortal("admin", "/admin")}
                className="h-full hover-elevate group cursor-pointer"
                data-testid="card-admin-portal"
                aria-label="Enter Admin Portal"
              >
                <CardContent className="p-6">
                  <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900 w-fit mb-4 group-hover:scale-105 transition-transform">
                    <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Admin Portal</h3>
                  <p className="text-muted-foreground mb-4">
                    Government oversight dashboard for monitoring and policy management
                  </p>
                  <Button variant="ghost" className="gap-2 p-0 h-auto">
                    Admin Access <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <NotificationTicker />
    </div>
  );
}

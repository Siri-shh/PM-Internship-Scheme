// client/src/pages/StudentPortal.tsx
import { useState } from "react";
import { Header } from "@/components/Header";
import { EligibilityChecker } from "@/components/EligibilityChecker";
import { QRAuth } from "@/components/QRAuth";
import { ProfileSetup } from "@/components/ProfileSetup";
import { SwipeCard } from "@/components/SwipeCard";
import { ApplicationTracker } from "@/components/ApplicationTracker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import LogoutButton from "@/components/LogoutButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"; // <-- added imports
import {
  Search,
  Heart,
  ClipboardList,
  MessageSquare,
  Send,
  Filter,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";

type PortalStage = "eligibility" | "auth" | "profile" | "dashboard";

export default function StudentPortal() {
  // NOTE: portal-level auth guard removed. App-level ProtectedRoute now handles auth & redirects.
  const [stage, setStage] = useState<PortalStage>("dashboard"); // Start at dashboard for demo
  const [activeTab, setActiveTab] = useState("match");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackText, setFeedbackText] = useState("");

  const handleEligibilityComplete = () => {
    setStage("auth");
  };

  const handleAuthComplete = () => {
    setStage("profile");
  };

  const handleProfileComplete = () => {
    setStage("dashboard");
  };

  const handleFeedbackSubmit = () => {
    console.log("Feedback submitted:", feedbackText);
    setFeedbackText("");
  };

  // Onboarding stages
  if (stage === "eligibility") {
    return (
      <div className="min-h-screen bg-background">
        <Header showNav={false} />
        <div className="container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold mb-2">Welcome to Student Portal</h1>
            <p className="text-muted-foreground">Let's verify your eligibility for the PM Internship Scheme</p>
          </motion.div>
          <EligibilityChecker onComplete={handleEligibilityComplete} />
        </div>
      </div>
    );
  }

  if (stage === "auth") {
    return (
      <div className="min-h-screen bg-background">
        <Header showNav={false} />
        <div className="container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold mb-2">Identity Verification</h1>
            <p className="text-muted-foreground">Secure authentication through DigiLocker</p>
          </motion.div>
          <QRAuth onAuthenticated={handleAuthComplete} />
        </div>
      </div>
    );
  }

  if (stage === "profile") {
    return (
      <div className="min-h-screen bg-background">
        <Header showNav={false} />
        <div className="container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold mb-2">Complete Your Profile</h1>
            <p className="text-muted-foreground">Help us find the best internship matches for you</p>
          </motion.div>
          <ProfileSetup onComplete={handleProfileComplete} />
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Student Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Discover your perfect internship</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setStage("eligibility")} data-testid="button-restart-onboarding">
              Restart Onboarding
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-feedback">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Feedback
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share Your Feedback</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Tell us about your experience..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="min-h-[150px]"
                    data-testid="textarea-feedback"
                  />
                  <Button className="w-full" onClick={handleFeedbackSubmit} data-testid="button-submit-feedback">
                    <Send className="h-4 w-4 mr-2" />
                    Submit Feedback
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Logout button placed top-right in dashboard header controls */}
            <div className="ml-2">
              <LogoutButton />
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="match" className="gap-2" data-testid="tab-match">
              <Heart className="h-4 w-4" />
              Match
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-2" data-testid="tab-search">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="tracker" className="gap-2" data-testid="tab-tracker">
              <ClipboardList className="h-4 w-4" />
              Tracker
            </TabsTrigger>
          </TabsList>

          <TabsContent value="match" className="space-y-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center mb-4"
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Sparkles className="h-4 w-4" />
                AI-Powered Matching
              </div>
              <h2 className="text-xl font-semibold">Swipe to Find Your Match</h2>
              <p className="text-muted-foreground">Swipe right if interested, left to pass</p>
            </motion.div>
            <SwipeCard />
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Internships
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by role, company, or location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-internships"
                    />
                  </div>
                  <Button variant="outline" data-testid="button-filters">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                  <Button data-testid="button-search">
                    Search
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* todo: remove mock functionality - replace with real search results */}
                  {[{ id: 1, title: "Frontend Developer Intern", company: "WebTech Solutions", location: "Remote", stipend: "20,000/month" },
                    { id: 2, title: "Backend Developer Intern", company: "CloudFirst India", location: "Bangalore", stipend: "25,000/month" },
                    { id: 3, title: "UI/UX Design Intern", company: "DesignHub", location: "Mumbai", stipend: "18,000/month" },
                    { id: 4, title: "DevOps Intern", company: "InfraTech", location: "Hyderabad", stipend: "22,000/month" }].map((internship) => (
                    <Card key={internship.id} className="hover-elevate" data-testid={`search-result-${internship.id}`}>
                      <CardContent className="p-4">
                        <h4 className="font-semibold">{internship.title}</h4>
                        <p className="text-sm text-muted-foreground">{internship.company}</p>
                        <div className="flex justify-between mt-2 text-sm">
                          <span>{internship.location}</span>
                          <span className="text-primary font-medium">{internship.stipend}</span>
                        </div>
                        <Button className="w-full mt-3" size="sm" data-testid={`button-apply-${internship.id}`}>
                          Apply Now
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracker">
            <ApplicationTracker />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Updated StudentPortal.tsx — Added Offered tab: internships offered to the user with Accept / Reject actions
import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import LogoutButton from "@/components/LogoutButton";
import { useAuth } from "@/lib/AuthProvider"; // Import useAuth
import { AuthGate } from "@/components/AuthGate"; // using the project's AuthGate for mock auth
import RegistrationWithAadhar from "@/components/RegistrationWithAadhar";
import { ApplicationTracker } from "@/components/ApplicationTracker";
import EligibilityChecker from "@/components/EligibilityChecker";
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  Heart,
  ClipboardList,
  MessageSquare,
  Send,
  Filter,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

/* --- small safe session helpers --- */
function safeGet(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch { }
}
function safeRemove(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch { }
}

/* --- SAMPLE_INTERNSHIPS: 8 items with requested fields --- */
const SAMPLE_INTERNSHIPS = [
  {
    internshipId: "INT-001",
    companyId: "CMP-1001",
    title: "Product Management Intern",
    description: "Work with product teams to define roadmaps, write PRDs, and coordinate with engineering and design.",
    requiredSkills: ["product", "communication", "research"],
    gpaRequirement: 7.0,
    sector: "Technology",
    location: "Delhi NCR",
    capacity: 3,
    duration: "3 months",
    stipend: "15,000/month",
  },
  {
    internshipId: "INT-002",
    companyId: "CMP-1002",
    title: "Frontend Developer Intern",
    description: "Build responsive user interfaces using React and collaborate with UX designers.",
    requiredSkills: ["react", "html", "css", "javascript"],
    gpaRequirement: 6.5,
    sector: "Software",
    location: "Remote",
    capacity: 4,
    duration: "6 months",
    stipend: "20,000/month",
  },
  {
    internshipId: "INT-003",
    companyId: "CMP-1003",
    title: "Data Analyst Intern",
    description: "Analyze large datasets, write SQL queries and build dashboards for insights.",
    requiredSkills: ["sql", "python", "excel"],
    gpaRequirement: 6.0,
    sector: "Data & Analytics",
    location: "Bangalore",
    capacity: 2,
    duration: "3 months",
    stipend: "18,000/month",
  },
  {
    internshipId: "INT-004",
    companyId: "CMP-1004",
    title: "Embedded Systems Intern",
    description: "Design and prototype embedded systems using microcontrollers and sensors.",
    requiredSkills: ["c", "embedded", "electronics"],
    gpaRequirement: 7.5,
    sector: "Hardware",
    location: "Pune",
    capacity: 2,
    duration: "4 months",
    stipend: "12,000/month",
  },
  {
    internshipId: "INT-005",
    companyId: "CMP-1005",
    title: "Marketing & Growth Intern",
    description: "Support growth experiments, run marketing campaigns and track metrics.",
    requiredSkills: ["analytics", "marketing", "copywriting"],
    gpaRequirement: 5.5,
    sector: "Marketing",
    location: "Mumbai",
    capacity: 5,
    duration: "3 months",
    stipend: "10,000/month",
  },
  {
    internshipId: "INT-006",
    companyId: "CMP-1006",
    title: "Machine Learning Intern",
    description: "Work on model training, evaluation and deployment for real-world datasets.",
    requiredSkills: ["python", "ml", "tensorflow"],
    gpaRequirement: 8.0,
    sector: "AI/ML",
    location: "Hyderabad",
    capacity: 2,
    duration: "6 months",
    stipend: "25,000/month",
  },
  {
    internshipId: "INT-007",
    companyId: "CMP-1007",
    title: "UX Research Intern",
    description: "Conduct user interviews, usability tests and synthesize findings for product teams.",
    requiredSkills: ["research", "empathy", "communication"],
    gpaRequirement: 6.0,
    sector: "Design",
    location: "Chennai",
    capacity: 2,
    duration: "3 months",
    stipend: "11,000/month",
  },
  {
    internshipId: "INT-008",
    companyId: "CMP-1008",
    title: "DevOps Intern",
    description: "Assist in CI/CD pipeline setup, monitoring and cloud infrastructure automation.",
    requiredSkills: ["linux", "docker", "aws"],
    gpaRequirement: 7.0,
    sector: "Cloud",
    location: "Bengaluru",
    capacity: 3,
    duration: "4 months",
    stipend: "16,000/month",
  },
];

/* ------------------ StudentPortal main component ------------------ */
export default function StudentPortal() {
  // Use AuthProvider to check authentication
  const { isAuthenticated, user } = useAuth();
  const authed = isAuthenticated && user?.role === "student";
  const hasProfile = isStudentProfileComplete();

  // Application list: maintain up to 6 preferred internships in decreasing priority order (index 0 = highest)
  const [appliedList, setAppliedList] = useState<any[]>(() => {
    try {
      const raw = safeGet("appliedInternships");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [showApplied, setShowApplied] = useState(false);

  // Preference inputs (two preferred locations)
  const [prefLoc1, setPrefLoc1] = useState("");
  const [prefLoc2, setPrefLoc2] = useState("");

  // Offered internships (offers made to the user) — persist in sessionStorage
  const [offered, setOffered] = useState<any[]>(() => {
    try {
      const raw = safeGet("offeredInternships");
      if (raw) return JSON.parse(raw);
    } catch { }
    // default: populate two offers for demo
    return [
      { ...SAMPLE_INTERNSHIPS[0], offerLetter: "Offer Letter: Congratulations! You are offered the Product Management internship.", status: "pending" },
      { ...SAMPLE_INTERNSHIPS[5], offerLetter: "Offer Letter: Congratulations! You are offered the Machine Learning internship.", status: "pending" },
    ];
  });

  // save offered list
  useEffect(() => {
    try {
      safeSet("offeredInternships", JSON.stringify(offered));
    } catch { }
  }, [offered]);

  // debug: log auth/profile as soon as component mounts (remove later if you like)
  useEffect(() => {
    console.log("StudentPortal mount -> authed:", authed, "hasProfile:", hasProfile);
  }, []); // run once

  // initialStage: explicit logic - redirect to login if not authenticated
  let initialStage: "eligibility" | "auth" | "profile" | "dashboard" = "dashboard";
  if (!authed) {
    // Will be redirected to login by useEffect below
    initialStage = "dashboard";
  } else if (!hasProfile) {
    initialStage = "profile";
  } else {
    initialStage = "dashboard";
  }

  const [stage, setStage] = useState<"eligibility" | "auth" | "profile" | "dashboard">(initialStage);
  const [activeTab, setActiveTab] = useState<"match" | "preference" | "offered" | "tracker">("match");
  const [feedbackText, setFeedbackText] = useState("");

  // keep stage in sync if sessionStorage changes elsewhere (other tabs)
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "portalAuth" || e.key === "studentProfile") {
        const nowAuthed = safeGet("portalAuth") === "student";
        if (!nowAuthed) {
          // Redirect to login instead of showing auth stage
          window.location.href = "/login";
          return;
        }
        setStage(isStudentProfileComplete() ? "dashboard" : "profile");
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // persist applied list whenever it changes
  useEffect(() => {
    try {
      safeSet("appliedInternships", JSON.stringify(appliedList));
    } catch { }
  }, [appliedList]);

  // After auth completes, go to profile if the profile isn't complete.
  function handleAuthComplete() {
    setStage(isStudentProfileComplete() ? "dashboard" : "profile");
  }

  function handleProfileComplete() {
    setStage("dashboard");
  }

  function handleFeedbackSubmit() {
    console.log("Feedback submitted:", feedbackText);
    setFeedbackText("");
  }

  function leavePortal() {
    try {
      safeRemove("portalSelected");
      safeRemove("portalAuth");
    } catch { }
    window.location.replace("/");
  }

  // Add an internship to the student's preferred list (max 6). We keep decreasing priority order
  // where index 0 is highest priority (the earliest-applied item). We append new items to the end
  // so the list shows priorities in order of application.
  function handleApply(internship: any) {
    // if already applied, toggle showApplied to true and open the list
    const exists = appliedList.some((i) => i.internshipId === internship.internshipId);
    if (exists) {
      setShowApplied(true);
      return;
    }
    if (appliedList.length >= 6) {
      alert("You can apply to a maximum of 6 internships. Remove one from your list to add another.");
      setShowApplied(true);
      return;
    }
    const next = [...appliedList, internship];
    setAppliedList(next);
    setShowApplied(true);
    alert(`Added ${internship.title} to your preferred internships (position ${next.length}).`);
  }

  function handleRemoveApplied(id: string) {
    const next = appliedList.filter((i) => i.internshipId !== id);
    setAppliedList(next);
  }

  // If the user wants to reorder priorities (move up / down)
  function moveApplied(id: string, dir: "up" | "down") {
    const idx = appliedList.findIndex((i) => i.internshipId === id);
    if (idx === -1) return;
    const copy = [...appliedList];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= copy.length) return;
    [copy[idx], copy[swapIdx]] = [copy[swapIdx], copy[idx]];
    setAppliedList(copy);
  }

  // Offer accept/reject handlers
  function acceptOffer(internshipId: string) {
    setOffered((prev) => prev.map((o) => o.internshipId === internshipId ? { ...o, status: "accepted" } : o));
    alert("You accepted the offer. Congratulations!");
  }
  function rejectOffer(internshipId: string) {
    setOffered((prev) => prev.map((o) => o.internshipId === internshipId ? { ...o, status: "rejected" } : o));
    alert("You rejected the offer.");
  }

  // If not authenticated, redirect to login page instead of showing intermediate auth page
  useEffect(() => {
    if (!authed) {
      window.location.href = "/login";
    }
  }, [authed]);

  /* ------------------- Stage: eligibility (optional) ------------------- */
  if (stage === "eligibility") {
    return (
      <div className="min-h-screen bg-background">
        <Header showNav={false} />
        <div className="container mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome to Student Portal</h1>
            <p className="text-muted-foreground">Let's verify your eligibility for the PM Internship Scheme</p>
          </motion.div>
          <EligibilityChecker onComplete={() => setStage("profile")} />
        </div>
      </div>
    );
  }

  /* ------------------- Stage: auth - REMOVED, now redirects to /login ------------------- */

  /* ------------------- Stage: profile (registration required) ------------------- */
  if (stage === "profile") {
    return (
      <div className="min-h-screen bg-background">
        <Header showNav={false} />
        <div className="container mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Complete Your Registration</h1>
            <p className="text-muted-foreground">Please complete registration to access the Student Dashboard.</p>
          </motion.div>

          <div className="mt-4">
            <RegistrationWithAadhar onComplete={handleProfileComplete} />
          </div>

          <div className="mt-6 text-center">
            <Button variant="outline" onClick={leavePortal}>← Cancel & Back to Home</Button>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------- Stage: dashboard (main) ------------------- */
  // At this point user is authed and profile is complete.
  let profile: any = null;
  try {
    const raw = safeGet("studentProfile");
    if (raw) profile = JSON.parse(raw);
  } catch { }

  const eligible = SAMPLE_INTERNSHIPS; // for now show all

  // compute internships matching preferred locations
  function matchesPreferred(job: any) {
    if (!prefLoc1 && !prefLoc2) return true; // if no preference set, show all
    const loc = (job.location || "").toLowerCase();
    const p1 = prefLoc1.trim().toLowerCase();
    const p2 = prefLoc2.trim().toLowerCase();
    if (p1 && loc.includes(p1)) return true;
    if (p2 && loc.includes(p2)) return true;
    return false;
  }

  const preferredInternships = eligible.filter(matchesPreferred);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Student Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Discover your perfect internship</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStage("profile")} data-testid="button-edit-profile">
              Set Profile
            </Button>
            <Button variant="outline" onClick={() => { /* open feedback dialog */ }}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Feedback
            </Button>
            <LogoutButton />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="match" className="gap-2" data-testid="tab-match">
              <Heart className="h-4 w-4" />
              Match
            </TabsTrigger>
            <TabsTrigger value="preference" className="gap-2" data-testid="tab-preference">
              <Filter className="h-4 w-4" />
              Preference
            </TabsTrigger>
            <TabsTrigger value="offered" className="gap-2" data-testid="tab-offered">
              <Send className="h-4 w-4" />
              Offered
            </TabsTrigger>
            <TabsTrigger value="tracker" className="gap-2" data-testid="tab-tracker">
              <ClipboardList className="h-4 w-4" />
              Tracker
            </TabsTrigger>
          </TabsList>

          {/* ----------------- MATCH (eligible internships list) ----------------- */}
          <TabsContent value="match" className="space-y-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-4">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Sparkles className="h-4 w-4" />
                AI-Powered Matching
              </div>
              <h2 className="text-xl font-semibold">Internships You Are Eligible For</h2>
              <p className="text-muted-foreground">Based on your profile — complete your profile for more accurate matches</p>
            </motion.div>

            {/* Applied / Preference list panel (shows after user clicks Apply) */}
            {/* Preference list should always be visible */}
            {(true) && (
              <div className="max-w-2xl mx-auto mb-4 p-4 rounded border bg-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Your Preferred Internships (max 6)</h3>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setShowApplied(false); }}>Close</Button>
                    <Button onClick={() => { alert('Submit preferences (mock)'); }} size="sm">Submit Preferences</Button>
                  </div>
                </div>

                {appliedList.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No internships selected yet. Click "Apply" on any internship to add it to your priority list.</div>
                ) : (
                  <ol className="list-decimal pl-5 space-y-2">
                    {appliedList.map((item, idx) => (
                      <li key={item.internshipId} className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{item.title} <span className="text-xs text-muted-foreground">({item.internshipId} • {item.companyId})</span></div>
                          <div className="text-sm text-muted-foreground">{item.location} • {item.sector} • GPA ≥ {item.gpaRequirement}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => moveApplied(item.internshipId, "up")} disabled={idx === 0}>↑</Button>
                          <Button size="sm" variant="ghost" onClick={() => moveApplied(item.internshipId, "down")} disabled={idx === appliedList.length - 1}>↓</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRemoveApplied(item.internshipId)}>Remove</Button>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            {!profile && (
              <div className="px-4 py-3 rounded bg-yellow-50 border border-yellow-100 text-sm text-yellow-800">
                Complete your profile (Set Profile) to get more accurate, AI-powered matches.
              </div>
            )}

            {eligible.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No internships match your profile yet. Try updating your profile or check back later.</div>
            ) : (
              <div className="grid gap-4">
                {eligible.map((job) => (
                  <Card key={job.internshipId} className="hover-elevate">
                    <CardContent className="p-6 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">{job.title}</h3>
                        <div className="text-sm text-muted-foreground">{job.companyId} • {job.location}</div>
                        <div className="mt-3 text-sm text-muted-foreground">{job.duration} • {job.stipend}</div>
                        <p className="mt-3 text-sm text-muted-foreground max-w-2xl">{job.description || "Short description about the internship role and responsibilities."}</p>

                        <div className="mt-3 text-sm">
                          <strong>Skills:</strong> {job.requiredSkills.join(", ")} • <strong>GPA:</strong> {job.gpaRequirement} • <strong>Sector:</strong> {job.sector} • <strong>Capacity:</strong> {job.capacity}
                        </div>
                      </div>

                      <div className="flex flex-col items-start md:items-end gap-3">
                        <div className="text-sm text-muted-foreground">ID: {job.internshipId}</div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleApply(job)} disabled={appliedList.some((i) => i.internshipId === job.internshipId)}>
                            {appliedList.some((i) => i.internshipId === job.internshipId) ? "Selected" : "Apply"}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => {
                            alert(`${job.title} — ${job.companyId}

${job.duration} · ${job.stipend}

Description: ${job.description || "—"}`);
                          }}>
                            Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ----------------- PREFERENCE (replaces SEARCH) ----------------- */}
          <TabsContent value="preference" className="space-y-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-4">
              <h2 className="text-xl font-semibold">Set Your Preferred Locations</h2>
              <p className="text-muted-foreground">Enter up to two preferred locations. Internships matching either location will be shown below.</p>
            </motion.div>

            <div className="max-w-2xl mx-auto bg-white p-4 rounded border space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Preferred Location 1</label>
                  <input value={prefLoc1} onChange={(e) => setPrefLoc1(e.target.value)} placeholder="e.g. Delhi" className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Preferred Location 2</label>
                  <input value={prefLoc2} onChange={(e) => setPrefLoc2(e.target.value)} placeholder="e.g. Bangalore" className="w-full px-3 py-2 border rounded" />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setPrefLoc1(""); setPrefLoc2(""); }}>Clear</Button>
                <Button onClick={() => setActiveTab("match")}>Show Matches</Button>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-lg font-medium">Internships matching your preferred locations</h3>
              {preferredInternships.length === 0 ? (
                <div className="p-6 text-muted-foreground">No internships found for the selected locations.</div>
              ) : (
                <div className="grid gap-4 mt-3">
                  {preferredInternships.map((job) => (
                    <Card key={job.internshipId} className="hover-elevate">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{job.title} <span className="text-xs text-muted-foreground">({job.internshipId})</span></div>
                          <div className="text-sm text-muted-foreground">{job.companyId} • {job.location} • {job.sector}</div>
                          <div className="text-sm mt-1">GPA ≥ {job.gpaRequirement} • Capacity: {job.capacity}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleApply(job)} disabled={appliedList.some((i) => i.internshipId === job.internshipId)}>
                            {appliedList.some((i) => i.internshipId === job.internshipId) ? "Selected" : "Apply"}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => alert(job.description)}>
                            Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ----------------- OFFERED ----------------- */}
          <TabsContent value="offered" className="space-y-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-4">
              <h2 className="text-xl font-semibold">Offered Internships</h2>
              <p className="text-muted-foreground">Internships that have been offered to you. You can Accept or Reject each offer below.</p>
            </motion.div>

            {offered.length === 0 ? (
              <div className="p-6 text-muted-foreground">You have no offers at the moment.</div>
            ) : (
              <div className="grid gap-4">
                {offered.map((job) => (
                  <Card key={job.internshipId} className="hover-elevate">
                    <CardContent className="p-6 md:flex md:items-start md:justify-between gap-4">
                      <div className="md:flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">{job.title}</h3>
                            <div className="text-sm text-muted-foreground">{job.companyId} • {job.location}</div>
                          </div>
                          <div className="text-sm text-muted-foreground">ID: {job.internshipId}</div>
                        </div>

                        <p className="mt-3 text-sm text-muted-foreground">{job.description}</p>

                        <div className="mt-3 text-sm">
                          <strong>Skills:</strong> {job.requiredSkills.join(", ")} • <strong>GPA:</strong> {job.gpaRequirement} • <strong>Sector:</strong> {job.sector} • <strong>Capacity:</strong> {job.capacity}
                        </div>

                        <div className="mt-4 bg-muted/30 p-3 rounded">
                          <strong>Offer Letter</strong>
                          <div className="mt-2 text-sm">{job.offerLetter}</div>
                        </div>
                      </div>

                      <div className="flex flex-col items-start md:items-end gap-3 mt-4 md:mt-0">
                        <div className="text-sm text-muted-foreground">Status: <span className={`font-medium ${job.status === 'accepted' ? 'text-green-600' : job.status === 'rejected' ? 'text-red-600' : 'text-muted-foreground'}`}>{job.status}</span></div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => acceptOffer(job.internshipId)} disabled={job.status === 'accepted'}>Accept</Button>
                          <Button size="sm" variant="destructive" onClick={() => rejectOffer(job.internshipId)} disabled={job.status === 'rejected'}>Reject</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ----------------- TRACKER ----------------- */}
          <TabsContent value="tracker">
            <ApplicationTracker />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* --- registration completeness check (updated to match RegistrationWithAadhar.tsx step 4) --- */
function isStudentProfileComplete(): boolean {
  try {
    const raw = safeGet("studentProfile");
    if (!raw) return false;
    const p = JSON.parse(raw);

    // New required fields (from RegistrationWithAadhar step 3 + 4):
    // - aadharVerified === true
    // - name exists
    // - skills is an array with at least one entry
    // - highestQualification exists
    // - marksGPA is a number between 0 and 10
    // - latestEducationInstitution exists
    // We still accept optional fields like familyIncome, itrProvided, certifications

    const hasName = !!p?.name;
    const hasAadhar = p?.aadharVerified === true;
    const hasSkills = Array.isArray(p?.skills) && p.skills.length > 0;
    const hasQualification = !!p?.highestQualification;
    const marks = p?.marksGPA;
    const hasMarks = typeof marks === "number" && !isNaN(marks) && marks >= 0 && marks <= 10;
    const hasInstitution = !!p?.latestEducationInstitution;

    return hasName && hasAadhar && hasSkills && hasQualification && hasMarks && hasInstitution;
  } catch {
    return false;
  }
}

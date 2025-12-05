import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileText, Send, Download, Eye, CheckCircle2, Mail, Rocket, Gift } from "lucide-react";
import { motion } from "framer-motion";
import { useSelectedCandidates, SelectedEntry } from "@/components/SelectedCandidates";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OnboardingSection() {
  const { rounds, removeFromSelected } = useSelectedCandidates();

  // Local state to track status changes (mocking backend)
  const [candidateStatuses, setCandidateStatuses] = useState<Record<number, string>>({});

  // Combine all selected entries across rounds (unique by candidate id)
  const allSelectedEntries: SelectedEntry[] = rounds.flatMap(r => r.selected || []);
  // Keep unique by id (but preserve source entry)
  const map = new Map<number, SelectedEntry>();
  allSelectedEntries.forEach(e => map.set(e.candidate.id, e));
  const entries = Array.from(map.values()).sort((a, b) => b.candidate.matchScore - a.candidate.matchScore);

  const offerTemplate = `Dear [Candidate Name],

We are pleased to offer you the position of [Role] at [Company Name].

Start Date: [Start Date]
Duration: 6 months
Stipend: ₹25,000/month

We were impressed by your skills in [Skills] and believe you will be a great asset to our team.

Please confirm your acceptance within 7 days.

Best regards,
HR Team
[Company Name]`;

  const welcomeKitTemplate = `Dear [Candidate Name],

Welcome to the team! We are thrilled to have you join us.

Here is your Welcome Kit information:
- Employee ID: [Employee ID]
- System Login: [Email]
- Mentor: [Mentor Name]

Please find attached the onboarding documents.

Best regards,
HR Team`;

  const getStatus = (id: number, defaultStatus?: string) => {
    return candidateStatuses[id] || defaultStatus || "pending";
  };

  const updateStatus = (id: number, status: string) => {
    setCandidateStatuses(prev => ({ ...prev, [id]: status }));
  };

  const handleSendOffer = (id: number) => {
    // Mock sending
    setTimeout(() => {
      updateStatus(id, "offer_sent");
      // Auto-accept for demo purposes after 5 seconds
      setTimeout(() => updateStatus(id, "accepted"), 5000);
    }, 1000);
  };

  const handleSendWelcomeKit = (id: number) => {
    // Mock sending
    setTimeout(() => {
      updateStatus(id, "onboarded");
    }, 1000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="secondary">Pending</Badge>;
      case "offer_sent": return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Offer Sent</Badge>;
      case "accepted": return <Badge className="bg-green-500 hover:bg-green-600 text-white">Accepted</Badge>;
      case "onboarded": return <Badge className="bg-purple-500 hover:bg-purple-600 text-white">Onboarded</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] gap-6" data-testid="onboarding-section">
      {/* Left Column: List of Candidates */}
      <Card className="w-1/3 flex flex-col h-full">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-xl">Candidates ({entries.length})</CardTitle>
        </CardHeader>
        <ScrollArea className="flex-1">
          <CardContent className="p-4 space-y-3">
            {entries.length === 0 && <p className="text-muted-foreground text-center py-8">No candidates selected from Shortlist.</p>}
            {entries.map((entry) => {
              const candidate = entry.candidate;
              const status = getStatus(candidate.id, candidate.status);
              return (
                <div key={candidate.id} className="p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10"><AvatarFallback className="bg-primary/10 text-primary">{candidate.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium truncate">{candidate.name}</h4>
                        {getStatusBadge(status)}
                      </div>
                      <div className="text-xs text-muted-foreground">{candidate.email}</div>
                      <div className="text-xs text-muted-foreground mt-1">Score: {candidate.matchScore}%</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    {/* Send Offer Button */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          className="w-full justify-start"
                          variant={status === "pending" ? "default" : "outline"}
                          disabled={status !== "pending"}
                        >
                          <Rocket className="h-4 w-4 mr-2" />
                          {status === "pending" ? "Send Offer Letter" : "Offer Sent"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Send Offer to {candidate.name}</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Role</Label>
                              <Input defaultValue={candidate.role || "Intern"} />
                            </div>
                            <div className="space-y-2">
                              <Label>Start Date</Label>
                              <Input type="date" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Offer Letter Content</Label>
                            <Textarea
                              defaultValue={offerTemplate
                                .replace("[Candidate Name]", candidate.name)
                                .replace("[Role]", candidate.role || "Intern")
                                .replace("[Company Name]", "Tech Corp")
                                .replace("[Skills]", candidate.skills?.join(", ") || "your skills")
                              }
                              className="min-h-[300px] font-mono text-sm"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline">Cancel</Button>
                          <Button onClick={() => handleSendOffer(candidate.id)}>
                            <Rocket className="h-4 w-4 mr-2" /> Send Offer
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {/* Send Welcome Kit Button (Only if Accepted) */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          className="w-full justify-start"
                          variant="outline"
                          disabled={status !== "accepted"}
                        >
                          <Gift className="h-4 w-4 mr-2" />
                          {status === "onboarded" ? "Welcome Kit Sent" : "Send Welcome Kit"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Send Welcome Kit to {candidate.name}</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Welcome Email Content</Label>
                            <Textarea
                              defaultValue={welcomeKitTemplate
                                .replace("[Candidate Name]", candidate.name)
                                .replace("[Email]", candidate.email)
                              }
                              className="min-h-[300px] font-mono text-sm"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline">Cancel</Button>
                          <Button onClick={() => handleSendWelcomeKit(candidate.id)}>
                            <Send className="h-4 w-4 mr-2" /> Send Kit
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </ScrollArea>
      </Card>

      {/* Right Column: Information / Stats */}
      <div className="flex-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted/10 rounded-lg">
                <div className="text-3xl font-bold text-primary">{entries.length}</div>
                <div className="text-sm text-muted-foreground">Selected</div>
              </div>
              <div className="p-4 bg-muted/10 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {entries.filter(e => getStatus(e.candidate.id, e.candidate.status) === "accepted" || getStatus(e.candidate.id, e.candidate.status) === "onboarded").length}
                </div>
                <div className="text-sm text-muted-foreground">Accepted</div>
              </div>
              <div className="p-4 bg-muted/10 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {entries.filter(e => getStatus(e.candidate.id, e.candidate.status) === "offer_sent").length}
                </div>
                <div className="text-sm text-muted-foreground">Offers Sent</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {entries.map(e => {
                const s = getStatus(e.candidate.id, e.candidate.status);
                if (s === "pending") return null;
                return (
                  <div key={e.candidate.id} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>
                      <strong>{e.candidate.name}</strong> -
                      {s === "offer_sent" && " Offer Letter Sent"}
                      {s === "accepted" && " Offer Accepted"}
                      {s === "onboarded" && " Welcome Kit Sent"}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">Just now</span>
                  </div>
                );
              })}
              {entries.every(e => getStatus(e.candidate.id, e.candidate.status) === "pending") && (
                <p className="text-muted-foreground text-sm">No recent activity.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

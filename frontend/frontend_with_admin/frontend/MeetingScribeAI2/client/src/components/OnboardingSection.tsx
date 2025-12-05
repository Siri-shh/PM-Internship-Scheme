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
} from "@/components/ui/dialog";
import { FileText, Send, Download, Eye, CheckCircle2, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { useSelectedCandidates, SelectedEntry } from "@/components/SelectedCandidates";

export function OnboardingSection() {
  const [activeTab, setActiveTab] = useState("offer");
  const { rounds, removeFromSelected, removeFromAllSelected } = useSelectedCandidates();

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

Please confirm your acceptance within 7 days.

Best regards,
HR Team`;

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case "pending": return <Badge variant="secondary">Pending</Badge>;
      case "offer_sent": return <Badge className="bg-blue-500 text-white">Offer Sent</Badge>;
      case "accepted": return <Badge className="bg-green-500 text-white">Accepted</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6" data-testid="onboarding-section">
      <div>
        <h2 className="text-2xl font-bold">Onboarding</h2>
        <p className="text-muted-foreground">Send offer letters to candidates (selected from Shortlist)</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Selected Candidates</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {entries.length === 0 && <p className="text-muted-foreground">No selected candidates yet. Select candidates in Shortlist.</p>}
            {entries.map((entry, index) => {
              const candidate = entry.candidate;
              return (
                <motion.div key={candidate.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className="flex items-start gap-4 p-4 border rounded-lg" data-testid={`onboarding-candidate-${candidate.id}`}>
                  <Avatar><AvatarFallback className="bg-primary/10 text-primary">{candidate.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{candidate.name}</h4>
                      {getStatusBadge(candidate.status)}
                      <div className="ml-auto text-sm text-muted-foreground">Round {entry.roundIndex + 1} • Preference-{entry.prefIndex + 1}</div>
                    </div>

                    <div className="text-xs text-muted-foreground mt-1">{candidate.email}</div>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {candidate.skills?.map(skill => <Badge key={skill} variant="outline">{skill}</Badge>)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">Score: <span className="font-semibold">{candidate.matchScore}%</span></div>
                  </div>

                  <div className="flex flex-col gap-2 items-end">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" data-testid={`button-send-letter-${candidate.id}`}>
                          <Mail className="h-4 w-4 mr-1" /> Send Offer
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Send Offer to {candidate.name}</DialogTitle></DialogHeader>
                        <Textarea defaultValue={offerTemplate.replace("[Candidate Name]", candidate.name).replace("[Role]", candidate.role ?? "")} className="min-h-[300px] font-mono text-sm" data-testid="textarea-offer-letter" />
                        <div className="flex justify-end gap-2 mt-4">
                          <Button variant="outline" data-testid="button-preview-offer"><Eye className="h-4 w-4 mr-2" /> Preview</Button>
                          <Button data-testid="button-send-offer"><Send className="h-4 w-4 mr-2" /> Send Offer</Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button variant="ghost" size="sm" onClick={() => removeFromSelected(entry.roundIndex, candidate.id)}>Remove</Button>

                    <Button variant="ghost" size="sm" onClick={() => removeFromAllSelected(candidate.id)}>Remove from all</Button>
                  </div>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Letter Templates</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg hover-elevate cursor-pointer" data-testid="template-offer">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"><FileText className="h-5 w-5" /></div>
                <div className="flex-1">
                  <h4 className="font-medium">Offer Letter Template</h4>
                  <p className="text-sm text-muted-foreground">Standard internship offer letter</p>
                </div>
                <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="p-4 border rounded-lg hover-elevate cursor-pointer" data-testid="template-welcome">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"><FileText className="h-5 w-5" /></div>
                <div className="flex-1">
                  <h4 className="font-medium">Welcome Kit</h4>
                  <p className="text-sm text-muted-foreground">Onboarding documents package</p>
                </div>
                <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
              </div>
            </div>

            <Button className="w-full" variant="outline" data-testid="button-create-template">Create Custom Template</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

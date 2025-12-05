import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  GripVertical,
  Star,
  Mail,
  XCircle,
  FileText,
  Eye,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Phone,
  Briefcase
} from "lucide-react";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { useSelectedCandidates, Candidate as CandidateType } from "@/components/SelectedCandidates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

type LocalResumeStore = Record<number, { file: File; name: string }>;

const PREFERENCE_TITLES = [
  "Preference-1 Candidates",
  "Preference-2 Candidates",
  "Preference-3 Candidates",
];

export function ShortlistPanel() {
  const { rounds, setRounds, addToSelected, removeFromSelected, removeCandidateCompletely } = useSelectedCandidates();
  const [resumes, setResumes] = useState<LocalResumeStore>({});
  const [expandedCandidate, setExpandedCandidate] = useState<number | null>(null);

  // Seed initial preferences if empty (only once)
  const [seeded, setSeeded] = useState(false);
  if (!seeded) {
    const emptyPrefs = rounds[0]?.preferences?.every((arr) => arr.length === 0);
    if (emptyPrefs) {
      const initialRound1Prefs: CandidateType[][] = [
        [
          { id: 1, name: "Aarav Sharma", email: "aarav@email.com", phone: "+91 98765 43210", matchScore: 95, skills: ["Python", "React", "SQL"], experience: "1 project" },
          { id: 2, name: "Priya Patel", email: "priya@email.com", phone: "+91 98765 43211", matchScore: 92, skills: ["Java", "Spring", "AWS"], experience: "2 internships" },
          { id: 3, name: "Rohan Kumar", email: "rohan@email.com", phone: "+91 98765 43212", matchScore: 88, skills: ["JavaScript", "Node.js", "MongoDB"], experience: "1 internship" },
        ],
        [
          { id: 4, name: "Ishita Singh", email: "ishita@email.com", phone: "+91 98765 43213", matchScore: 85, skills: ["Python", "TensorFlow", "Data Analysis"], experience: "Fresher" },
        ],
        [],
      ];
      const newRounds = [...rounds];
      newRounds[0] = { ...newRounds[0], preferences: initialRound1Prefs };
      setRounds(newRounds);
    }
    setSeeded(true);
  }

  const updatePreferenceList = (roundIndex: number, prefIndex: number, newList: CandidateType[]) => {
    const copy = rounds.map(r => ({ preferences: r.preferences.map(p => [...p]), selected: [...r.selected] }));
    copy[roundIndex].preferences[prefIndex] = newList;
    setRounds(copy);
  };

  const handleUpload = (candidateId: number, file: File | null) => {
    setResumes(prev => {
      const copy = { ...prev };
      if (file) copy[candidateId] = { file, name: file.name };
      else delete copy[candidateId];
      return copy;
    });
  };

  const viewResume = (candidateId: number) => {
    const r = resumes[candidateId];
    if (!r) return;
    const url = URL.createObjectURL(r.file);
    const win = window.open(url, "_blank");
    if (win) setTimeout(() => { try { URL.revokeObjectURL(url); } catch { } }, 20000);
    else {
      window.location.href = url;
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch { } }, 20000);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedCandidate(expandedCandidate === id ? null : id);
  };

  const CandidateCard = ({ candidate, roundIndex, prefIndex, onReject }: { candidate: CandidateType; roundIndex: number; prefIndex: number; onReject?: () => void }) => {
    const isSelected = rounds[roundIndex]?.selected?.some(s => s.candidate.id === candidate.id);
    const resume = resumes[candidate.id];
    const inputId = `resume-input-${candidate.id}`;
    const isExpanded = expandedCandidate === candidate.id;

    return (
      <motion.div layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="bg-card border rounded-lg hover-elevate mb-3 overflow-hidden" data-testid={`candidate-card-${candidate.id}`}>
        <div className="p-4 flex items-start gap-3">
          <div className="cursor-grab active:cursor-grabbing mt-2"><GripVertical className="h-5 w-5 text-muted-foreground" /></div>
          <Avatar className="h-10 w-10"><AvatarFallback className="bg-primary/10 text-primary text-sm">{candidate.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-base">{candidate.name}</h4>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold text-sm">{candidate.matchScore}%</span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">{candidate.email}</div>
          </div>

          <Button variant="ghost" size="icon" onClick={() => toggleExpand(candidate.id)}>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-4 border-t bg-muted/5 overflow-x-auto"
            >
              <div className="pt-4 grid gap-4 min-w-max">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold flex items-center gap-1 mb-1"><Phone className="h-3 w-3" /> Phone</span>
                    <span className="text-muted-foreground">{candidate.phone || "N/A"}</span>
                  </div>
                  <div>
                    <span className="font-semibold flex items-center gap-1 mb-1"><Briefcase className="h-3 w-3" /> Experience</span>
                    <span className="text-muted-foreground">{candidate.experience || "N/A"}</span>
                  </div>
                </div>

                <div>
                  <span className="font-semibold text-sm mb-2 block">Skills</span>
                  <div className="flex flex-wrap gap-1">
                    {candidate.skills?.map(skill => <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>)}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t mt-2">
                  <div className="flex gap-2">
                    <input id={inputId} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => {
                      const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                      handleUpload(candidate.id, f);
                    }} />
                    <label htmlFor={inputId}>
                      <Button variant="outline" size="sm" asChild className="h-8">
                        <span className="cursor-pointer flex items-center gap-1"><FileText className="h-3 w-3" /> {resume ? "Update Resume" : "Upload Resume"}</span>
                      </Button>
                    </label>
                    {resume && (
                      <Button variant="ghost" size="sm" onClick={() => viewResume(candidate.id)} className="h-8">
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onReject && onReject()}
                      className="h-8"
                    >
                      <XCircle className="h-3 w-3 mr-1" /> Remove
                    </Button>
                    <Button
                      size="sm"
                      className={`h-8 ${isSelected ? "bg-green-600 hover:bg-green-700" : "bg-green-500 hover:bg-green-600"}`}
                      onClick={() => addToSelected(roundIndex, prefIndex, candidate)}
                      disabled={isSelected}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" /> {isSelected ? "Selected" : "Select"}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const PreferenceColumn = ({ roundIndex, prefIndex }: { roundIndex: number; prefIndex: number; }) => {
    const list = rounds[roundIndex]?.preferences[prefIndex] || [];
    const sorted = [...list].sort((a, b) => b.matchScore - a.matchScore);

    return (
      <div className="flex-1 min-w-[300px]">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          {PREFERENCE_TITLES[prefIndex]}
          <Badge variant="outline">{sorted.length}</Badge>
        </h3>
        <div className="bg-muted/10 rounded-lg p-2 min-h-[200px]">
          <Reorder.Group values={sorted} onReorder={(newOrder) => {
            const original = rounds[roundIndex].preferences[prefIndex];
            const reordered = newOrder.map((n) => original.find(o => o.id === n.id)!).filter(Boolean);
            updatePreferenceList(roundIndex, prefIndex, reordered);
          }} className="space-y-3">
            {sorted.map(candidate => (
              <Reorder.Item key={candidate.id} value={candidate}>
                <CandidateCard candidate={candidate} roundIndex={roundIndex} prefIndex={prefIndex} onReject={() => removeCandidateCompletely(candidate.id)} />
              </Reorder.Item>
            ))}
          </Reorder.Group>
          {sorted.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No candidates in this list</p>}
        </div>
      </div>
    );
  };

  const SelectedSidebar = () => {
    // Collect all selected candidates across all rounds
    const allSelected = rounds.flatMap((r, rIdx) => r.selected.map(s => ({ ...s, roundIndex: rIdx })));

    return (
      <Card className="h-full border-l rounded-none border-y-0 border-r-0 shadow-none bg-muted/5 w-80 flex flex-col">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg flex items-center justify-between">
            Selected Candidates
            <Badge variant="secondary">{allSelected.length}</Badge>
          </CardTitle>
        </CardHeader>
        <ScrollArea className="flex-1">
          <CardContent className="p-4 space-y-3">
            {allSelected.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No candidates selected yet.</p>
                <p className="text-xs mt-1">Click "Select" on a candidate to add them here.</p>
              </div>
            )}
            {allSelected.map((s, idx) => (
              <div key={`${s.candidate.id}-${idx}`} className="p-3 bg-background border rounded-lg shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8"><AvatarFallback>{s.candidate.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{s.candidate.name}</div>
                      <div className="text-xs text-muted-foreground">Round {s.roundIndex + 1}</div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeFromSelected(s.roundIndex, s.candidate.id)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </ScrollArea>
      </Card>
    );
  };

  return (
    <div className="flex h-[calc(100vh-200px)] border rounded-lg overflow-hidden bg-background" data-testid="shortlist-panel">
      {/* Main Content - Rounds */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Candidate Shortlisting</h2>
          <p className="text-muted-foreground">Manage candidate selection across multiple rounds.</p>
        </div>

        <Tabs defaultValue="round1" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4">
            <TabsList>
              <TabsTrigger value="round1">Round 1</TabsTrigger>
              <TabsTrigger value="round2">Round 2</TabsTrigger>
              <TabsTrigger value="round3">Round 3</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6">
              <TabsContent value="round1" className="m-0 mt-0">
                <div className="flex gap-6 overflow-x-auto pb-4">
                  <PreferenceColumn roundIndex={0} prefIndex={0} />
                  <PreferenceColumn roundIndex={0} prefIndex={1} />
                  <PreferenceColumn roundIndex={0} prefIndex={2} />
                </div>
              </TabsContent>
              <TabsContent value="round2" className="m-0 mt-0">
                <div className="flex gap-6 overflow-x-auto pb-4">
                  <PreferenceColumn roundIndex={1} prefIndex={0} />
                  <PreferenceColumn roundIndex={1} prefIndex={1} />
                  <PreferenceColumn roundIndex={1} prefIndex={2} />
                </div>
              </TabsContent>
              <TabsContent value="round3" className="m-0 mt-0">
                <div className="flex gap-6 overflow-x-auto pb-4">
                  <PreferenceColumn roundIndex={2} prefIndex={0} />
                  <PreferenceColumn roundIndex={2} prefIndex={1} />
                  <PreferenceColumn roundIndex={2} prefIndex={2} />
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </div>

      {/* Right Sidebar - Selected Candidates */}
      <SelectedSidebar />
    </div>
  );
}

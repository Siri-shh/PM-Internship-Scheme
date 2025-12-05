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
  Eye
} from "lucide-react";
import { motion, Reorder } from "framer-motion";
import { useSelectedCandidates, Candidate as CandidateType } from "@/components/SelectedCandidates";

type LocalResumeStore = Record<number, { file: File; name: string }>;

const PREFERENCE_TITLES = [
  "Preference-1 Candidates",
  "Preference-2 Candidates",
  "Preference-3 Candidates",
];

export function ShortlistPanel() {
  const { rounds, setRounds, addToSelected, removeFromSelected, removeCandidateCompletely } = useSelectedCandidates();

  const [resumes, setResumes] = useState<LocalResumeStore>({});

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
    setRounds(prev => {
      const copy = prev.map(r => ({ preferences: r.preferences.map(p => [...p]), selected: [...r.selected] }));
      copy[roundIndex].preferences[prefIndex] = newList;
      return copy;
    });
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
    if (win) setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 20000);
    else {
      window.location.href = url;
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 20000);
    }
  };

  const CandidateCard = ({ candidate, roundIndex, prefIndex, onReject }: { candidate: CandidateType; roundIndex: number; prefIndex: number; onReject?: () => void }) => {
    const isSelected = rounds[roundIndex]?.selected?.some(s => s.candidate.id === candidate.id);
    const resume = resumes[candidate.id];
    const inputId = `resume-input-${candidate.id}`;

    return (
      <motion.div layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="p-4 bg-card border rounded-lg hover-elevate" data-testid={`candidate-card-${candidate.id}`}>
        <div className="flex items-start gap-3">
          <div className="cursor-grab active:cursor-grabbing"><GripVertical className="h-5 w-5 text-muted-foreground" /></div>
          <Avatar className="h-10 w-10"><AvatarFallback className="bg-primary/10 text-primary text-sm">{candidate.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium">{candidate.name}</h4>
              <div className="flex items-center gap-1 ml-auto">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold text-sm">{candidate.matchScore}%</span>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{candidate.email}</span>
            </div>

            <div className="flex flex-wrap gap-1 mt-2">
              {candidate.skills?.map(skill => <Badge key={skill} variant="outline">{skill}</Badge>)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t">
          <Button size="sm" onClick={() => addToSelected(roundIndex, prefIndex, candidate)} disabled={isSelected} data-testid={`button-select-${candidate.id}`}>
            {isSelected ? "Selected" : "Select"}
          </Button>

          <input id={inputId} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => {
            const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
            handleUpload(candidate.id, f);
          }} />
          <label htmlFor={inputId} className="inline-flex">
            <Button variant="ghost" size="sm" asChild>
              <div className="flex items-center gap-1 cursor-pointer"><FileText className="h-4 w-4 mr-1" />{resume ? "Change Resume" : "Upload"}</div>
            </Button>
          </label>

          <Button variant="outline" size="sm" onClick={() => viewResume(candidate.id)} disabled={!resume} data-testid={`button-view-${candidate.id}`}>
            <Eye className="h-4 w-4 mr-1" />
            View Resume
          </Button>

          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => onReject && onReject()} data-testid={`button-remove-${candidate.id}`}>
            <XCircle className="h-4 w-4 mr-1" />
            Remove
          </Button>
        </div>
      </motion.div>
    );
  };

  const PreferenceColumn = ({ roundIndex, prefIndex }: { roundIndex: number; prefIndex: number; }) => {
    const list = rounds[roundIndex]?.preferences[prefIndex] || [];
    const sorted = [...list].sort((a, b) => b.matchScore - a.matchScore);

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">{PREFERENCE_TITLES[prefIndex]}<Badge variant="secondary">{sorted.length}</Badge></CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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

          {sorted.length === 0 && <p className="text-center text-muted-foreground py-8">No candidates</p>}
        </CardContent>
      </Card>
    );
  };

  const SelectedCard = ({ roundIndex }: { roundIndex: number }) => {
    const selected = [...(rounds[roundIndex]?.selected || [])].sort((a, b) => b.candidate.matchScore - a.candidate.matchScore);

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">Selected Candidates<Badge variant="secondary">{selected.length}</Badge></CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {selected.length === 0 && <p className="text-center text-muted-foreground py-8">No selected candidates yet</p>}
          <div className="space-y-3">
            {selected.map(s => (
              <div key={s.candidate.id} className="p-3 bg-muted/10 rounded flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-8 w-8"><AvatarFallback>{s.candidate.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.candidate.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.candidate.email}</div>
                    <div className="text-xs text-muted-foreground mt-1">Round {s.roundIndex + 1} • Preference-{s.prefIndex + 1}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1"><Star className="h-4 w-4" /><span className="font-semibold text-sm">{s.candidate.matchScore}%</span></div>
                  <Button variant="ghost" size="sm" onClick={() => removeFromSelected(roundIndex, s.candidate.id)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6" data-testid="shortlist-panel">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Candidate Shortlisting</h2>
          <p className="text-muted-foreground">Rounds & preference lists — scores sorted descending. Use "Select" to mark a candidate as selected for the round. Upload resumes to enable "View Resume".</p>
        </div>
      </div>

      <div className="space-y-6">
        {rounds.map((round, roundIndex) => (
          <div key={roundIndex} className="space-y-4">
            <h3 className="text-xl font-semibold">Round-{roundIndex + 1}</h3>
            <div className="grid lg:grid-cols-3 gap-6">
              <PreferenceColumn roundIndex={roundIndex} prefIndex={0} />
              <PreferenceColumn roundIndex={roundIndex} prefIndex={1} />
              <PreferenceColumn roundIndex={roundIndex} prefIndex={2} />
            </div>

            <div><SelectedCard roundIndex={roundIndex} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  GripVertical, 
  Star, 
  Mail, 
  Phone,
  FileText,
  CheckCircle2,
  XCircle,
  Sparkles
} from "lucide-react";
import { motion, Reorder } from "framer-motion";

interface Candidate {
  id: number;
  name: string;
  email: string;
  phone: string;
  matchScore: number;
  skills: string[];
  experience: string;
  aiRecommended: boolean;
}

export function ShortlistPanel() {
  const [aiOverride, setAiOverride] = useState(false);
  
  // todo: remove mock functionality - replace with real candidate data
  const [aiShortlist, setAiShortlist] = useState<Candidate[]>([
    { id: 1, name: "Aarav Sharma", email: "aarav@email.com", phone: "+91 98765 43210", matchScore: 95, skills: ["Python", "React", "SQL"], experience: "1 project", aiRecommended: true },
    { id: 2, name: "Priya Patel", email: "priya@email.com", phone: "+91 98765 43211", matchScore: 92, skills: ["Java", "Spring", "AWS"], experience: "2 internships", aiRecommended: true },
    { id: 3, name: "Rohan Kumar", email: "rohan@email.com", phone: "+91 98765 43212", matchScore: 88, skills: ["JavaScript", "Node.js", "MongoDB"], experience: "1 internship", aiRecommended: true },
  ]);

  const [humanReview, setHumanReview] = useState<Candidate[]>([
    { id: 4, name: "Ishita Singh", email: "ishita@email.com", phone: "+91 98765 43213", matchScore: 85, skills: ["Python", "TensorFlow", "Data Analysis"], experience: "Fresher", aiRecommended: false },
  ]);

  const [selected, setSelected] = useState<Candidate[]>([]);

  const moveToReview = (candidate: Candidate) => {
    setAiShortlist(prev => prev.filter(c => c.id !== candidate.id));
    setHumanReview(prev => [...prev, candidate]);
  };

  const moveToSelected = (candidate: Candidate) => {
    setHumanReview(prev => prev.filter(c => c.id !== candidate.id));
    setSelected(prev => [...prev, candidate]);
  };

  const removeFromSelected = (candidate: Candidate) => {
    setSelected(prev => prev.filter(c => c.id !== candidate.id));
    setHumanReview(prev => [...prev, candidate]);
  };

  const CandidateCard = ({ 
    candidate, 
    showActions = true,
    onAccept,
    onReject 
  }: { 
    candidate: Candidate; 
    showActions?: boolean;
    onAccept?: () => void;
    onReject?: () => void;
  }) => (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="p-4 bg-card border rounded-lg hover-elevate"
      data-testid={`candidate-card-${candidate.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {candidate.name.split(" ").map(n => n[0]).join("")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium">{candidate.name}</h4>
            {candidate.aiRecommended && (
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                AI Pick
              </Badge>
            )}
            <div className="flex items-center gap-1 ml-auto">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="font-semibold text-sm">{candidate.matchScore}%</span>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {candidate.email}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {candidate.skills.map(skill => (
              <Badge key={skill} variant="outline">{skill}</Badge>
            ))}
          </div>
        </div>
      </div>
      {showActions && (
        <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t">
          <Button variant="ghost" size="sm" data-testid={`button-resume-${candidate.id}`}>
            <FileText className="h-4 w-4 mr-1" />
            Resume
          </Button>
          {onReject && (
            <Button variant="ghost" size="sm" className="text-red-500" onClick={onReject} data-testid={`button-reject-${candidate.id}`}>
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
          )}
          {onAccept && (
            <Button size="sm" onClick={onAccept} data-testid={`button-accept-${candidate.id}`}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Select
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="space-y-6" data-testid="shortlist-panel">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Candidate Shortlisting</h2>
          <p className="text-muted-foreground">Drag and drop to reorder candidates</p>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            id="ai-override"
            checked={aiOverride}
            onCheckedChange={setAiOverride}
            data-testid="switch-ai-override"
          />
          <Label htmlFor="ai-override" className="text-sm">
            Enable Human Override
          </Label>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Shortlist
              <Badge variant="secondary">{aiShortlist.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Reorder.Group values={aiShortlist} onReorder={setAiShortlist} className="space-y-3">
              {aiShortlist.map(candidate => (
                <Reorder.Item key={candidate.id} value={candidate}>
                  <CandidateCard
                    candidate={candidate}
                    onAccept={() => moveToReview(candidate)}
                  />
                </Reorder.Item>
              ))}
            </Reorder.Group>
            {aiShortlist.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No candidates in AI shortlist</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              Human Review
              <Badge variant="secondary">{humanReview.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Reorder.Group values={humanReview} onReorder={setHumanReview} className="space-y-3">
              {humanReview.map(candidate => (
                <Reorder.Item key={candidate.id} value={candidate}>
                  <CandidateCard
                    candidate={candidate}
                    onAccept={() => moveToSelected(candidate)}
                    onReject={() => moveToReview(candidate)}
                  />
                </Reorder.Item>
              ))}
            </Reorder.Group>
            {humanReview.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Drag candidates here for review</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              Selected
              <Badge variant="secondary">{selected.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Reorder.Group values={selected} onReorder={setSelected} className="space-y-3">
              {selected.map(candidate => (
                <Reorder.Item key={candidate.id} value={candidate}>
                  <CandidateCard
                    candidate={candidate}
                    showActions={true}
                    onReject={() => removeFromSelected(candidate)}
                  />
                </Reorder.Item>
              ))}
            </Reorder.Group>
            {selected.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Selected candidates appear here</p>
            )}
            {selected.length > 0 && (
              <Button className="w-full mt-4" data-testid="button-send-offers">
                Send Offer Letters ({selected.length})
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

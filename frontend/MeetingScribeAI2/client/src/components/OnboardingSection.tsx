import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  FileText, 
  Send, 
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  Mail
} from "lucide-react";
import { motion } from "framer-motion";

interface Candidate {
  id: number;
  name: string;
  role: string;
  email: string;
  status: "pending" | "offer_sent" | "accepted" | "rejected";
}

export function OnboardingSection() {
  const [activeTab, setActiveTab] = useState("offer");
  
  // todo: remove mock functionality - replace with real candidate data
  const [candidates] = useState<Candidate[]>([
    { id: 1, name: "Aarav Sharma", role: "Software Developer Intern", email: "aarav@email.com", status: "pending" },
    { id: 2, name: "Priya Patel", role: "Data Analyst Intern", email: "priya@email.com", status: "offer_sent" },
    { id: 3, name: "Rohan Kumar", role: "Software Developer Intern", email: "rohan@email.com", status: "accepted" },
  ]);

  const offerTemplate = `Dear [Candidate Name],

We are pleased to offer you the position of [Role] at [Company Name].

Start Date: [Start Date]
Duration: 6 months
Stipend: ₹25,000/month

Please confirm your acceptance within 7 days.

Best regards,
HR Team`;

  const rejectionTemplate = `Dear [Candidate Name],

Thank you for your interest in the [Role] position at [Company Name].

After careful consideration, we have decided to move forward with other candidates who more closely match our current requirements.

We appreciate your time and wish you the best in your future endeavors.

Best regards,
HR Team`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "offer_sent":
        return <Badge className="bg-blue-500 text-white">Offer Sent</Badge>;
      case "accepted":
        return <Badge className="bg-green-500 text-white">Accepted</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6" data-testid="onboarding-section">
      <div>
        <h2 className="text-2xl font-bold">Onboarding</h2>
        <p className="text-muted-foreground">Send offer letters or rejection notices to candidates</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selected Candidates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {candidates.map((candidate, index) => (
              <motion.div
                key={candidate.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-4 border rounded-lg"
                data-testid={`onboarding-candidate-${candidate.id}`}
              >
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {candidate.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium">{candidate.name}</h4>
                    {getStatusBadge(candidate.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{candidate.role}</p>
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" data-testid={`button-send-letter-${candidate.id}`}>
                        <Mail className="h-4 w-4 mr-1" />
                        Send Letter
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Send Letter to {candidate.name}</DialogTitle>
                      </DialogHeader>
                      <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="offer">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Offer Letter
                          </TabsTrigger>
                          <TabsTrigger value="rejection">
                            <XCircle className="h-4 w-4 mr-2" />
                            Rejection Letter
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="offer" className="space-y-4">
                          <Textarea
                            defaultValue={offerTemplate.replace("[Candidate Name]", candidate.name).replace("[Role]", candidate.role)}
                            className="min-h-[300px] font-mono text-sm"
                            data-testid="textarea-offer-letter"
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" data-testid="button-preview-offer">
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </Button>
                            <Button data-testid="button-send-offer">
                              <Send className="h-4 w-4 mr-2" />
                              Send Offer
                            </Button>
                          </div>
                        </TabsContent>
                        <TabsContent value="rejection" className="space-y-4">
                          <Textarea
                            defaultValue={rejectionTemplate.replace("[Candidate Name]", candidate.name).replace("[Role]", candidate.role)}
                            className="min-h-[300px] font-mono text-sm"
                            data-testid="textarea-rejection-letter"
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" data-testid="button-preview-rejection">
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </Button>
                            <Button variant="destructive" data-testid="button-send-rejection">
                              <Send className="h-4 w-4 mr-2" />
                              Send Rejection
                            </Button>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Letter Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg hover-elevate cursor-pointer" data-testid="template-offer">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Offer Letter Template</h4>
                  <p className="text-sm text-muted-foreground">Standard internship offer letter</p>
                </div>
                <Button variant="ghost" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 border rounded-lg hover-elevate cursor-pointer" data-testid="template-rejection">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Rejection Letter Template</h4>
                  <p className="text-sm text-muted-foreground">Professional rejection notice</p>
                </div>
                <Button variant="ghost" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 border rounded-lg hover-elevate cursor-pointer" data-testid="template-welcome">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Welcome Kit</h4>
                  <p className="text-sm text-muted-foreground">Onboarding documents package</p>
                </div>
                <Button variant="ghost" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button className="w-full" variant="outline" data-testid="button-create-template">
              Create Custom Template
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

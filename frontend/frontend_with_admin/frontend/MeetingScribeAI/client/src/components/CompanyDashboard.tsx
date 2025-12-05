import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Briefcase, 
  Users, 
  Clock, 
  CheckCircle2,
  ChevronRight,
  Plus,
  TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";

interface Role {
  id: number;
  title: string;
  department: string;
  openings: number;
  filled: number;
  applications: number;
  deadline: string;
}

interface Candidate {
  id: number;
  name: string;
  role: string;
  matchScore: number;
  status: "pending" | "reviewed" | "shortlisted";
  appliedDate: string;
}

export function CompanyDashboard() {
  // todo: remove mock functionality - replace with real company data
  const stats = [
    { icon: Briefcase, label: "Active Roles", value: 8, color: "text-blue-500" },
    { icon: Users, label: "Total Applications", value: 245, color: "text-green-500" },
    { icon: Clock, label: "Pending Review", value: 67, color: "text-yellow-500" },
    { icon: CheckCircle2, label: "Positions Filled", value: 12, color: "text-purple-500" },
  ];

  const roles: Role[] = [
    { id: 1, title: "Software Developer Intern", department: "Engineering", openings: 5, filled: 2, applications: 89, deadline: "2024-02-15" },
    { id: 2, title: "Data Analyst Intern", department: "Analytics", openings: 3, filled: 1, applications: 56, deadline: "2024-02-20" },
    { id: 3, title: "Product Manager Intern", department: "Product", openings: 2, filled: 0, applications: 34, deadline: "2024-02-18" },
    { id: 4, title: "Marketing Intern", department: "Marketing", openings: 4, filled: 3, applications: 45, deadline: "2024-02-10" },
  ];

  const pendingApplications: Candidate[] = [
    { id: 1, name: "Aarav Sharma", role: "Software Developer Intern", matchScore: 95, status: "pending", appliedDate: "2024-01-28" },
    { id: 2, name: "Ishita Patel", role: "Data Analyst Intern", matchScore: 88, status: "pending", appliedDate: "2024-01-27" },
    { id: 3, name: "Rohan Verma", role: "Software Developer Intern", matchScore: 92, status: "reviewed", appliedDate: "2024-01-26" },
    { id: 4, name: "Ananya Singh", role: "Product Manager Intern", matchScore: 85, status: "shortlisted", appliedDate: "2024-01-25" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "reviewed": return "bg-blue-500";
      case "shortlisted": return "bg-green-500";
      default: return "bg-muted";
    }
  };

  return (
    <div className="space-y-6" data-testid="company-dashboard">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover-elevate">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Active Roles</CardTitle>
            <Button size="sm" data-testid="button-add-role">
              <Plus className="h-4 w-4 mr-1" />
              Add Role
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {roles.map((role) => (
              <div
                key={role.id}
                className="p-3 border rounded-lg hover-elevate cursor-pointer"
                data-testid={`role-${role.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-medium text-sm">{role.title}</h4>
                    <p className="text-xs text-muted-foreground">{role.department}</p>
                  </div>
                  <Badge variant="secondary">
                    {role.applications} apps
                  </Badge>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{role.filled} / {role.openings} filled</span>
                    <span>{Math.round((role.filled / role.openings) * 100)}%</span>
                  </div>
                  <Progress value={(role.filled / role.openings) * 100} className="h-1.5" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Pending Applications</CardTitle>
            <Button variant="outline" size="sm" data-testid="button-view-all-applications">
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingApplications.map((candidate, index) => (
              <motion.div
                key={candidate.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-3 border rounded-lg hover-elevate"
                data-testid={`candidate-${candidate.id}`}
              >
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {candidate.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm truncate">{candidate.name}</h4>
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(candidate.status)}`} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{candidate.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{candidate.matchScore}%</span>
                  </div>
                  <Button variant="ghost" size="sm" data-testid={`button-review-${candidate.id}`}>
                    Review
                  </Button>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

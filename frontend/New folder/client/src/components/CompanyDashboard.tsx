// client/src/components/CompanyDashboard.tsx
import React, { useState } from "react";
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

import AddRoleDialog from "@/components/AddRoleDialog";

/**
 * Dashboard Role shape (updated with description, companyId and gpaRequirement)
 */
interface Role {
  id: number;
  internshipId: string;
  sector: string;
  tier: "Tier1" | "Tier2" | "Tier3" | "";
  capacity: number;
  req_skills: string[];
  location_type: string;
  title: string;
  description: string;
  companyId?: string;
  gpaRequirement?: number | null;
  filled: number;
  applications: number;
  deadline?: string;
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
  // Try to read companyId from saved registration (if present)
  let storedCompanyId: string | undefined;
  try {
    const raw = localStorage.getItem("companyRegistration");
    if (raw) {
      const parsed = JSON.parse(raw);
      storedCompanyId = parsed?.companyId;
    }
  } catch (e) {
    storedCompanyId = undefined;
  }

  // Initial mock roles updated to include description and gpaRequirement
  const [roles, setRoles] = useState<Role[]>([
    {
      id: 1,
      internshipId: "INT-2024-001",
      sector: "IT Services",
      tier: "Tier1",
      capacity: 5,
      req_skills: ["python", "sql", "cloud"],
      location_type: "Office",
      title: "Software Developer Intern",
      description: "Work on frontend features, collaborate with backend and cloud teams.",
      companyId: storedCompanyId ?? "CMP-1001",
      gpaRequirement: 7.0,
      filled: 2,
      applications: 89,
      deadline: "2024-02-15",
    },
    {
      id: 2,
      internshipId: "INT-2024-002",
      sector: "Finance",
      tier: "Tier2",
      capacity: 3,
      req_skills: ["excel", "analysis", "presentation"],
      location_type: "Remote",
      title: "Data Analyst Intern",
      description: "Support data cleaning, visualization and dashboard tasks.",
      companyId: storedCompanyId ?? "CMP-1001",
      gpaRequirement: 6.5,
      filled: 1,
      applications: 56,
      deadline: "2024-02-20",
    },
    {
      id: 3,
      internshipId: "INT-2024-003",
      sector: "Marketing",
      tier: "Tier3",
      capacity: 2,
      req_skills: ["communication", "presentation"],
      location_type: "Office",
      title: "Product Manager Intern",
      description: "Assist with roadmaps, user research and prioritization.",
      companyId: storedCompanyId ?? "CMP-1002",
      gpaRequirement: null,
      filled: 0,
      applications: 34,
      deadline: "2024-02-18",
    },
    {
      id: 4,
      internshipId: "INT-2024-004",
      sector: "Electronics",
      tier: "Tier2",
      capacity: 4,
      req_skills: ["pcb_design", "manufacturing"],
      location_type: "Factory",
      title: "Hardware Intern",
      description: "Prototype PCBs, support manufacturing tests.",
      companyId: storedCompanyId ?? "CMP-1003",
      gpaRequirement: 7.5,
      filled: 3,
      applications: 45,
      deadline: "2024-02-10",
    },
  ]);

  const [pendingApplications] = useState<Candidate[]>([
    { id: 1, name: "Aarav Sharma", role: "Software Developer Intern", matchScore: 95, status: "pending", appliedDate: "2024-01-28" },
    { id: 2, name: "Ishita Patel", role: "Data Analyst Intern", matchScore: 88, status: "pending", appliedDate: "2024-01-27" },
    { id: 3, name: "Rohan Verma", role: "Software Developer Intern", matchScore: 92, status: "reviewed", appliedDate: "2024-01-26" },
    { id: 4, name: "Ananya Singh", role: "Product Manager Intern", matchScore: 85, status: "shortlisted", appliedDate: "2024-01-25" },
  ]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [expandedRoleId, setExpandedRoleId] = useState<number | null>(null);

  const stats = [
    { icon: Briefcase, label: "Active Roles", value: roles.length, color: "text-blue-500" },
    { icon: Users, label: "Total Applications", value: roles.reduce((s, r) => s + r.applications, 0), color: "text-green-500" },
    { icon: Clock, label: "Pending Review", value: 67, color: "text-yellow-500" },
    { icon: CheckCircle2, label: "Positions Filled", value: roles.reduce((s, r) => s + r.filled, 0), color: "text-purple-500" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "reviewed": return "bg-blue-500";
      case "shortlisted": return "bg-green-500";
      default: return "bg-muted";
    }
  };

  // Robust normalizer: accepts multiple shapes from different dialog versions
  const handleAddRole = (data: any) => {
    // internship id: accept internship_id or internshipId
    const internshipId = (data?.internship_id ?? data?.internshipId ?? `INT-${Date.now()}`).toString();

    // sector: accept sector or sectorCategory
    const sector = (data?.sector ?? data?.sectorCategory ?? "General").toString();

    // tier: accept tier or default ""
    const tier = data?.tier ?? "";

    // capacity: accept capacity (number or string) or openings
    let capacity = 0;
    if (typeof data?.capacity === "number") capacity = data.capacity;
    else if (typeof data?.capacity === "string" && data.capacity.trim() !== "") capacity = Number(data.capacity);
    else if (typeof data?.openings === "number") capacity = data.openings;
    else capacity = 1;

    // req_skills: can be array or comma string or requiredSkills array
    let skills: string[] = [];
    if (Array.isArray(data?.req_skills)) skills = data.req_skills;
    else if (Array.isArray(data?.requiredSkills)) skills = data.requiredSkills;
    else if (typeof data?.req_skills === "string") skills = data.req_skills.split(",").map((s: string) => s.trim()).filter(Boolean);
    else if (typeof data?.requiredSkills === "string") skills = data.requiredSkills.split(",").map((s: string) => s.trim()).filter(Boolean);
    else skills = [];

    // location type: accept location_type, locationType, or location
    const location_type = (data?.location_type ?? data?.locationType ?? data?.location ?? "Remote").toString();

    // title/description/companyId/gpaRequirement may be present
    const title = data?.title ?? `${sector} Intern`;
    const description = data?.description ?? "";
    const companyId = data?.companyId ?? storedCompanyId ?? undefined;
    const gpaRequirement = typeof data?.gpaRequirement === "number" ? data.gpaRequirement : (typeof data?.gpaRequirement === "string" && data.gpaRequirement.trim() !== "" ? Number(data.gpaRequirement) : null);

    const newRole: Role = {
      id: Date.now(),
      internshipId,
      sector,
      tier,
      capacity: Number.isFinite(capacity) ? Math.max(0, Math.floor(capacity)) : 1,
      req_skills: skills,
      location_type,
      title,
      description,
      companyId,
      gpaRequirement,
      filled: 0,
      applications: 0,
      deadline: data?.deadline ?? undefined,
    };

    setRoles((prev) => [newRole, ...prev]);
    setExpandedRoleId(newRole.id);
  };

  const toggleExpand = (id: number) => {
    setExpandedRoleId((cur) => (cur === id ? null : id));
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
            <Button size="sm" data-testid="button-add-role" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Role
            </Button>
          </CardHeader>

          <CardContent className="space-y-3">
            {roles.map((role) => {
              const progress = role.capacity > 0 ? (role.filled / role.capacity) * 100 : 0;
              const isExpanded = expandedRoleId === role.id;

              return (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="p-3 border rounded-lg hover-elevate cursor-pointer"
                  data-testid={`role-${role.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div onClick={() => toggleExpand(role.id)} className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{role.title}</h4>
                      <p className="text-xs text-muted-foreground truncate">{role.sector} • {role.location_type}</p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="secondary">{role.applications} apps</Badge>
                      <div className="text-xs text-muted-foreground">{role.capacity} slots</div>
                      <div className="text-xs text-muted-foreground">{Math.round(progress)}%</div>
                    </div>
                  </div>

                  <div className="mt-2">
                    <Progress value={progress} className="h-1.5" />
                  </div>

                  {/* Expandable details */}
                  {isExpanded && (
                    <div className="mt-3 border-l-2 border-muted/40 pl-3 space-y-2">
                      <div className="text-xs">
                        <strong>Internship ID:</strong> <span className="text-muted-foreground">{role.internshipId}</span>
                      </div>
                      <div className="text-xs">
                        <strong>Company ID:</strong> <span className="text-muted-foreground">{role.companyId ?? "—"}</span>
                      </div>
                      <div className="text-xs">
                        <strong>Sector:</strong> <span className="text-muted-foreground">{role.sector}</span>
                      </div>
                      <div className="text-xs">
                        <strong>Tier:</strong> <span className="text-muted-foreground">{role.tier || "—"}</span>
                      </div>
                      <div className="text-xs">
                        <strong>Location type:</strong> <span className="text-muted-foreground">{role.location_type}</span>
                      </div>
                      <div className="text-xs">
                        <strong>Slots (capacity):</strong> <span className="text-muted-foreground">{role.capacity}</span>
                      </div>
                      <div className="text-xs flex flex-wrap gap-2 items-center">
                        <strong>Skills:</strong>
                        <div className="flex flex-wrap gap-2">
                          {role.req_skills.map((s, idx) => (
                            <span key={idx} className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-700">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-xs">
                        <strong>Description:</strong>
                        <div className="text-muted-foreground">{role.description || "No description provided."}</div>
                      </div>

                      <div className="text-xs">
                        <strong>GPA Requirement:</strong> <span className="text-muted-foreground">{role.gpaRequirement !== null && role.gpaRequirement !== undefined ? role.gpaRequirement : "—"}</span>
                      </div>

                      <div className="text-xs">
                        <strong>Applications:</strong> <span className="text-muted-foreground">{role.applications}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
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

      {/* Add Role Dialog (new fields) */}
      <AddRoleDialog open={isAddOpen} onOpenChange={setIsAddOpen} onSubmit={handleAddRole} />
    </div>
  );
}

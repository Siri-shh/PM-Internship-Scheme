// client/src/components/AddRoleDialog.tsx
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type RoleFormData = {
  internshipId?: string;
  companyId?: string;
  title?: string;
  description?: string;
  requiredSkills: string[];
  gpaRequirement?: string;
  sectorCategory?: string;
  location?: string;
  capacity?: number;
  tier?: string;
  [k: string]: any;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: RoleFormData) => void;
};

const SKILLS = [
  "python", "sql", "ml", "cloud", "frontend", "backend", "networking", "java",
  "excel", "analysis", "presentation", "communication", "financial_modeling",
  "design", "manufacturing", "pcb_design", "autocad", "cad_modelling",
  "surveying", "construction_management", "writing", "seo", "social_media",
];

const SECTORS = [
  "Finance", "Marketing", "Electronics", "Mechanical",
  "IT Services", "Healthcare", "Automobile",
];

const LOCATION_TYPES = ["Office", "Factory", "Remote"];
const TIERS = ["Tier1", "Tier2", "Tier3"];

export default function AddRoleDialog({ open, onOpenChange, onSubmit }: Props) {
  // controlled form state
  const [internshipId, setInternshipId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [title, setTitle] = useState("");

  // ✔ DESCRIPTION added (already existed)
  const [description, setDescription] = useState("");

  // ✔ GPA Requirement added
  const [gpaRequirement, setGpaRequirement] = useState("");

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [sectorCategory, setSectorCategory] = useState(SECTORS[0]);
  const [locationType, setLocationType] = useState(LOCATION_TYPES[0]);
  const [capacity, setCapacity] = useState<number | "">(1);
  const [tier, setTier] = useState(TIERS[0]);

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  function handleSubmit(e?: React.FormEvent) {
    e && e.preventDefault();
    const data: RoleFormData = {
      internshipId: internshipId || undefined,
      companyId: companyId || undefined,
      title: title || undefined,
      description: description || undefined,
      requiredSkills: selectedSkills,
      gpaRequirement: gpaRequirement || undefined,
      sectorCategory: sectorCategory || undefined,
      location: locationType,
      capacity:
        typeof capacity === "number"
          ? capacity
          : parseInt(String(capacity) || "0", 10),
      tier,
    };

    onSubmit(data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full" style={{ zIndex: 9999 }}>
        <DialogHeader>
          <DialogTitle>Internship Details</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-2">
          {/* Top grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Internship ID</label>
              <Input
                value={internshipId}
                onChange={(e) => setInternshipId(e.target.value)}
                placeholder="e.g. INT-2025-001"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Company ID</label>
              <Input
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                placeholder="e.g. CMP-1001"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Role title"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Tier</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="w-full rounded px-3 py-2 border"
              >
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ⭐ DESCRIPTION FIELD ADDED (kept original styling) */}
          <div>
            <label className="block text-sm mb-1">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the internship"
            />
          </div>

          {/* ⭐ GPA REQUIREMENT FIELD ADDED */}
          <div>
            <label className="block text-sm mb-1">GPA Requirement</label>
            <Input
              type="number"
              step="0.1"
              value={gpaRequirement}
              onChange={(e) => setGpaRequirement(e.target.value)}
              placeholder="e.g. 7.0"
            />
          </div>

          {/* Skills + other settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">
                Required Skills (multi-select)
              </label>
              <div className="max-h-40 overflow-auto border rounded p-2 bg-white">
                <div className="grid grid-cols-2 gap-2">
                  {SKILLS.map((s) => (
                    <label
                      key={s}
                      className="inline-flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSkills.includes(s)}
                        onChange={() => toggleSkill(s)}
                      />
                      <span className="capitalize">
                        {s.replace(/_/g, " ")}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Sector Category</label>
              <select
                value={sectorCategory}
                onChange={(e) => setSectorCategory(e.target.value)}
                className="w-full rounded px-3 py-2 border"
              >
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <div className="mt-4">
                <label className="block text-sm mb-1">Location Type</label>
                <select
                  value={locationType}
                  onChange={(e) => setLocationType(e.target.value)}
                  className="w-full rounded px-3 py-2 border"
                >
                  {LOCATION_TYPES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4">
                <label className="block text-sm mb-1">Capacity (slots)</label>
                <Input
                  type="number"
                  value={capacity as any}
                  min={1}
                  onChange={(e) =>
                    setCapacity(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Role</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

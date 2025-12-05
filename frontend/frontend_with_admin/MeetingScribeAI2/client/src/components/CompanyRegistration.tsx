// client/src/components/CompanyRegistration.tsx
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";

export const SECTORS = [
  "Finance",
  "Marketing",
  "Electronics",
  "Mechanical",
  "IT Services",
  "Healthcare",
  "Automobile",
] as const;

export type CompanyRegistrationShape = {
  companyId: string;
  companyName: string;
  industrySector: typeof SECTORS[number];
  hqLocation: string;
  registeredAt?: string;
};

export function CompanyRegistration({ onComplete }: { onComplete: (data: CompanyRegistrationShape) => void; }) {
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industrySector, setIndustrySector] = useState<typeof SECTORS[number] | "">("");
  const [hqLocation, setHqLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const validate = (): boolean => {
    if (!companyId.trim() || !companyName.trim() || !industrySector || !hqLocation.trim()) {
      setError("All fields are required.");
      return false;
    }
    // simple Company ID format check (optional) — ensure no spaces
    if (/\s/.test(companyId)) {
      setError("Company ID must not contain spaces.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const payload: CompanyRegistrationShape = {
      companyId: companyId.trim(),
      companyName: companyName.trim(),
      industrySector: industrySector as typeof SECTORS[number],
      hqLocation: hqLocation.trim(),
      registeredAt: new Date().toISOString(),
    };

    try {
      // persist to localStorage for now; replace with API call if needed
      localStorage.setItem("companyRegistration", JSON.stringify(payload));
      onComplete(payload);
    } catch (err) {
      console.error("Failed to save company registration", err);
      setError("Failed to save registration. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl">Company Registration</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="companyId">Company ID</Label>
              <Input id="companyId" value={companyId} onChange={(e) => setCompanyId(e.target.value)} placeholder="e.g. ACME_CORP" />
            </div>

            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Acme Technologies" />
            </div>

            <div>
              <Label htmlFor="industrySector">Industry Sector</Label>
              <Select onValueChange={(v) => setIndustrySector(v as any)} value={industrySector || ""}>
                <SelectTrigger aria-label="Industry sector" id="industrySector">
                  <SelectValue placeholder="Choose sector..." />
                </SelectTrigger>
                <SelectContent>
                  {SECTORS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="hq">Headquarters Location</Label>
              <Input id="hq" value={hqLocation} onChange={(e) => setHqLocation(e.target.value)} placeholder="City, Country" />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Complete Registration"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

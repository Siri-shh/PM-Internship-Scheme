import React, { useState } from "react";
import { Button } from "@/components/ui/button";

export default function RegistrationWithAadhar({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<number>(1);

  // Step 1 – email + phone
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2 – personal details
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [reservation, setReservation] = useState<"GEN" | "OBC" | "SC" | "ST" | "">("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [pincode, setPincode] = useState("");
  const [locationType, setLocationType] = useState<"1" | "0" | "">("");

  // Step 3 – education & finance
  const [highestQualification, setHighestQualification] = useState<
    "High School" | "Undergraduate" | "Postgraduate" | "Diploma" | ""
  >("");
  const [marksGPA, setMarksGPA] = useState("");
  const [familyIncome, setFamilyIncome] = useState("");
  const [itrFile, setItrFile] = useState<File | null>(null);
  const [skills, setSkills] = useState("");
  const [certifications, setCertifications] = useState("");
  const [latestEducationInstitution, setLatestEducationInstitution] = useState("");

  function save(key: string, value: string) {
    try {
      sessionStorage.setItem(key, value);
    } catch {}
  }

  /* ---------------- STEP 1 SUBMIT ---------------- */
  function submitStep1(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!email.trim() || !phone.trim()) {
      alert("Please enter email and phone.");
      return;
    }
    save("reg_email", email);
    save("reg_phone", phone);
    // proceed to personal details (was step 3 previously)
    setStep(2);
  }

  /* ---------------- STEP 2 SUBMIT (personal details) ---------------- */
  function submitStep2(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (!name.trim()) return alert("Enter your full name.");
    if (!gender) return alert("Select gender.");
    if (!reservation) return alert("Select reservation.");
    if (!permanentAddress.trim()) return alert("Enter permanent address.");
    if (!city.trim()) return alert("Enter city.");
    if (!stateVal.trim()) return alert("Enter state.");
    if (!/^[0-9]{6}$/.test(pincode)) return alert("Enter valid 6-digit pincode.");
    if (locationType !== "1" && locationType !== "0") return alert("Select location type.");

    const partial = {
      email,
      phone,
      name: name.trim(),
      gender,
      reservation,
      permanentAddress,
      city,
      state: stateVal,
      pincode,
      locationType: locationType === "1" ? "rural" : "urban",
      aadhaarNumber: "", // removed eKYC integration for now
      aadhaarVerifiedData: null,
      updatedAt: new Date().toISOString(),
    };

    save("studentProfile_partial", JSON.stringify(partial));
    // proceed to education & finance
    setStep(3);
  }

  /* ---------------- STEP 3 SUBMIT (education & finance) ---------------- */
  function submitStep3(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (!highestQualification) return alert("Select highest qualification.");

    const gpa = Number(marksGPA);
    if (isNaN(gpa) || gpa < 0 || gpa > 10) return alert("Enter GPA between 0 and 10.");

    if (!familyIncome.trim() || Number(familyIncome) < 0)
      return alert("Enter valid family income.");

    if (!latestEducationInstitution.trim())
      return alert("Enter latest education institution.");

    let base: any = {};
    try {
      base = JSON.parse(sessionStorage.getItem("studentProfile_partial") || "{}");
    } catch {}

    const finalProfile = {
      ...base,
      highestQualification,
      marksGPA: gpa,
      familyIncome: Number(familyIncome),
      itrProvided: !!itrFile,
      itrFileName: itrFile?.name ?? null,
      skills: skills.split(",").map((v) => v.trim()).filter(Boolean),
      certifications: certifications.split(",").map((v) => v.trim()).filter(Boolean),
      latestEducationInstitution: latestEducationInstitution.trim(),
      completedAt: new Date().toISOString(),
    };

    save("studentProfile", JSON.stringify(finalProfile));
    onComplete();
  }

  /* ---------------- RENDER: STEP 1 / STEP 2 / STEP 3 ---------------- */
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-6 space-y-6">
        <h2 className="text-xl font-semibold">Register — Step {step}</h2>

        {/* ---------------- STEP 1 ---------------- */}
        {step === 1 && (
          <form onSubmit={submitStep1} className="space-y-4">
            <div>
              <label className="text-sm">Email</label>
              <input
                className="w-full px-3 py-2 border rounded"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="text-sm">Phone</label>
              <input
                className="w-full px-3 py-2 border rounded"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9XXXXXXXXX"
              />
            </div>

            <Button type="submit" className="w-full">
              Proceed
            </Button>
          </form>
        )}

        {/* ---------------- STEP 2 (personal details) ---------------- */}
        {step === 2 && (
          <form onSubmit={submitStep2} className="space-y-4">
            <div className="text-sm text-muted-foreground">Please complete your profile.</div>

            <div>
              <label className="block text-sm mb-1">Full name</label>
              <input
                className="w-full px-3 py-2 border rounded"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Gender</label>
              <select
                className="w-full px-3 py-2 border rounded"
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Reservation Category</label>
              <select
                className="w-full px-3 py-2 border rounded"
                value={reservation}
                onChange={(e) => setReservation(e.target.value as any)}
              >
                <option value="">Select</option>
                <option value="GEN">GEN</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Permanent Address</label>
              <textarea
                className="w-full px-3 py-2 border rounded"
                rows={3}
                value={permanentAddress}
                onChange={(e) => setPermanentAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm mb-1">City</label>
                <input
                  className="w-full px-3 py-2 border rounded"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm mb-1">State</label>
                <input
                  className="w-full px-3 py-2 border rounded"
                  value={stateVal}
                  onChange={(e) => setStateVal(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Pincode</label>
                <input
                  className="w-full px-3 py-2 border rounded"
                  value={pincode}
                  maxLength={6}
                  onChange={(e) => setPincode(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Location type</label>
              <select
                className="w-full px-3 py-2 border rounded"
                value={locationType}
                onChange={(e) => setLocationType(e.target.value as any)}
              >
                <option value="">Select</option>
                <option value="1">Rural (1)</option>
                <option value="0">Urban (0)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="submit">Continue to Education</Button>
            </div>
          </form>
        )}

        {/* ---------------- STEP 3 (education & finance) ---------------- */}
        {step === 3 && (
          <form onSubmit={submitStep3} className="space-y-4">
            <div className="text-sm text-muted-foreground">Step 3 — Education & Income</div>

            <div>
              <label className="block text-sm mb-1">Highest Qualification</label>
              <select
                className="w-full px-3 py-2 border rounded"
                value={highestQualification}
                onChange={(e) => setHighestQualification(e.target.value as any)}
              >
                <option value="">Select</option>
                <option value="High School">High School</option>
                <option value="Undergraduate">Undergraduate</option>
                <option value="Postgraduate">Postgraduate</option>
                <option value="Diploma">Diploma</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm mb-1">GPA (0–10)</label>
                <input
                  className="w-full px-3 py-2 border rounded"
                  value={marksGPA}
                  onChange={(e) => setMarksGPA(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Family Income</label>
                <input
                  className="w-full px-3 py-2 border rounded"
                  value={familyIncome}
                  onChange={(e) => setFamilyIncome(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Latest Education Institution</label>
                <input
                  className="w-full px-3 py-2 border rounded"
                  value={latestEducationInstitution}
                  onChange={(e) => setLatestEducationInstitution(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Upload ITR PDF (optional)</label>
              <div className="flex items-center gap-3">
                <div className="bg-slate-50 px-3 py-2 rounded text-sm">
                  {itrFile?.name ?? "No file chosen"}
                </div>

                <input
                  id="itr-file"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setItrFile(e.target.files?.[0] ?? null)}
                />

                <Button
                  type="button"
                  onClick={() => document.getElementById("itr-file")?.click()}
                >
                  Choose PDF
                </Button>

                <Button type="button" variant="ghost" onClick={() => setItrFile(null)}>
                  Remove
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Skills (comma separated)</label>
              <input
                className="w-full px-3 py-2 border rounded"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Certifications (comma separated)</label>
              <input
                className="w-full px-3 py-2 border rounded"
                value={certifications}
                onChange={(e) => setCertifications(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button type="submit">Finish Registration</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

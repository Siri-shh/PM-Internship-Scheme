import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
// EKycSection.tsx is rendered unchanged — we only added a tiny helper to it (notifyEkycCompleted).
import EKycApp from "./EKycSection";

export default function RegistrationWithAadhar({ onComplete }: { onComplete: () => void }) {
  // steps: 1=contact, 2=ekyc, 3=personal details, 4=education & income
  const [step, setStep] = useState<number>(1);

  // STEP 1 — contact
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // STEP 3 — personal details (will be after EKYC)
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [reservation, setReservation] = useState<"GEN" | "OBC" | "SC" | "ST" | "">("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [pincode, setPincode] = useState("");
  const [locationType, setLocationType] = useState<"1" | "0" | "">("");

  // STEP 4 — education & income
  const [highestQualification, setHighestQualification] = useState<
    "High School" | "Undergraduate" | "Postgraduate" | "Diploma" | ""
  >("");
  const [marksGPA, setMarksGPA] = useState("");
  const [familyIncome, setFamilyIncome] = useState("");
  const [itrFile, setItrFile] = useState<File | null>(null);
  const [skills, setSkills] = useState("");
  const [certifications, setCertifications] = useState("");
  const [latestEducationInstitution, setLatestEducationInstitution] = useState("");

  // EKYC panel & detection
  const [ekycPanelOpen, setEkycPanelOpen] = useState(false);
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [ekycResult, setEkycResult] = useState<any>(null);
  const pollingRef = useRef<number | null>(null);

  // helper to persist small pieces to sessionStorage for cross-component flow
  function save(key: string, value: string) {
    try {
      sessionStorage.setItem(key, value);
    } catch {}
  }

  /* ---------------- STEP 1 ---------------- */
  function submitStep1(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!email.trim() || !phone.trim()) {
      alert("Please enter email and phone.");
      return;
    }
    save("reg_email", email);
    save("reg_phone", phone);
    // proceed to EKYC step
    setStep(2);
    // open EKYC panel automatically to prompt the user
    setEkycPanelOpen(true);
  }

  /* ---------------- STEP 3 SUBMIT (personal details) ---------------- */
  function submitStep3(e?: React.FormEvent) {
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
      aadhaarVerified,
      ekycResult,
      updatedAt: new Date().toISOString(),
    };

    save("studentProfile_partial", JSON.stringify(partial));
    // move to education step
    setStep(4);
  }

  /* ---------------- STEP 4 SUBMIT (education & finance) ---------------- */
  function submitStep4(e?: React.FormEvent) {
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

  /* ---------------- EKYC detection logic ----------------
     Look for:
     1) a custom window event 'ekyc:completed' (preferred)
     2) sessionStorage key 'ekyc_result'
     3) a global window.__EKYC_RESULT (if any)
  ------------------------------------------------------------------*/
  useEffect(() => {
    function tryParseMaybeJSON(value: string | null) {
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    function evaluateStorageOnce(): boolean {
      const raw = tryParseMaybeJSON(sessionStorage.getItem("ekyc_result"));
      if (raw) {
        // heuristics
        if (typeof raw === "object" && (raw.verified === true || raw.status === "success" || raw.aadhaar)) {
          setAadhaarVerified(true);
          setEkycResult(raw);
          return true;
        }
        if (typeof raw === "string" && /^[0-9]{4,}$/.test(raw)) {
          setAadhaarVerified(true);
          setEkycResult({ aadhaarNumber: raw });
          return true;
        }
      }

      // fallback: other possible keys
      const keys = ["aadhaarVerified", "aadhaar_verified", "aadhaarNumber", "aadhaar"];
      for (const k of keys) {
        const v = tryParseMaybeJSON(sessionStorage.getItem(k));
        if (!v) continue;
        if (v === true || v === "true") {
          setAadhaarVerified(true);
          setEkycResult({ source: k, value: v });
          return true;
        }
        if (typeof v === "string" && /^[0-9]{4,}$/.test(v)) {
          setAadhaarVerified(true);
          setEkycResult({ source: k, value: v });
          return true;
        }
        if (typeof v === "object" && (v.verified === true || v.status === "success" || v.aadhaar)) {
          setAadhaarVerified(true);
          setEkycResult(v);
          return true;
        }
      }

      // global var
      const g = (window as any).__EKYC_RESULT;
      if (g) {
        setAadhaarVerified(true);
        setEkycResult(g);
        return true;
      }

      return false;
    }

    function onEkycCompleted(ev: Event) {
      const detail = (ev as CustomEvent).detail;
      if (detail) {
        setAadhaarVerified(true);
        setEkycResult(detail);
        // optionally write to sessionStorage as canonical
        try {
          sessionStorage.setItem("ekyc_result", JSON.stringify(detail));
        } catch {}
      } else {
        setAadhaarVerified(true);
        setEkycResult({ verified: true });
        try {
          sessionStorage.setItem("ekyc_result", JSON.stringify({ verified: true }));
        } catch {}
      }
      // close the panel and move to personal details automatically
      setEkycPanelOpen(false);
      setStep(3);
    }

    window.addEventListener("ekyc:completed", onEkycCompleted as EventListener);

    // polling fallback for systems that write to sessionStorage only
    if (!pollingRef.current) {
      const id = window.setInterval(() => {
        const ok = evaluateStorageOnce();
        if (ok) {
          // close panel and navigate to personal details
          setEkycPanelOpen(false);
          setStep(3);
        }
      }, 800);
      pollingRef.current = id;
    }

    // initial immediate attempt
    evaluateStorageOnce();

    return () => {
      window.removeEventListener("ekyc:completed", onEkycCompleted as EventListener);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Called from the EKYC panel 'Proceed' button */
  function handleEkycProceedClick() {
    // try a one-off detection
    const ok = (() => {
      try {
        const raw = sessionStorage.getItem("ekyc_result");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.verified === true || parsed.status === "success" || parsed.aadhaar)) {
            setAadhaarVerified(true);
            setEkycResult(parsed);
            return true;
          }
        }
      } catch {}
      // fallback quick checks
      const keys = ["aadhaarVerified", "aadhaar_verified", "aadhaarNumber", "aadhaar"];
      for (const k of keys) {
        const v = sessionStorage.getItem(k);
        if (!v) continue;
        if (v === "true") {
          setAadhaarVerified(true);
          setEkycResult({ source: k, value: true });
          return true;
        }
        if (/^[0-9]{4,}$/.test(v)) {
          setAadhaarVerified(true);
          setEkycResult({ source: k, value: v });
          return true;
        }
        try {
          const parsed = JSON.parse(v);
          if (parsed && (parsed.verified === true || parsed.status === "success" || parsed.aadhaar)) {
            setAadhaarVerified(true);
            setEkycResult(parsed);
            return true;
          }
        } catch {}
      }
      // global
      if ((window as any).__EKYC_RESULT) {
        setAadhaarVerified(true);
        setEkycResult((window as any).__EKYC_RESULT);
        return true;
      }
      return false;
    })();

    if (ok || aadhaarVerified) {
      setEkycPanelOpen(false);
      setStep(3);
    } else {
      alert(
        "We couldn't detect a completed Aadhaar e-KYC. Please complete verification inside the Aadhaar panel. " +
          "If the eKYC UI has a 'Finish' button, press that. (If you control the EKYC code, call notifyEkycCompleted(result) from its success handler; a tiny helper exists in EKycSection.tsx.)"
      );
    }
  }

  function forceProceedWithoutAadhaar() {
    if (!confirm("Proceed without Aadhaar verification? You can add it later.")) return;
    setEkycPanelOpen(false);
    setStep(3);
  }

  /* ---------------- Render ---------------- */
  return (
    <div className="min-h-[60vh] flex items-start justify-center p-6 relative">
      {/* EKYC Right-side Panel */}
      {ekycPanelOpen && (
        <div
          className="fixed right-0 top-0 h-full w-[40%] max-w-[560px] bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="p-4 border-b sticky top-0 bg-white dark:bg-slate-900 z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Aadhaar e-KYC</h3>
              <div className="flex items-center gap-2">
                {aadhaarVerified ? (
                  <div className="text-sm text-green-600">Verified ✓</div>
                ) : (
                  <div className="text-sm text-amber-600">Not verified</div>
                )}
                <Button variant="ghost" onClick={() => setEkycPanelOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Complete Aadhaar verification here. When finished, click Proceed.
            </div>
          </div>

          <div className="p-4">
            <EKycApp />

            <div className="mt-4 flex gap-2">
              <Button onClick={handleEkycProceedClick}>Proceed</Button>
              <Button variant="ghost" onClick={() => setEkycPanelOpen(false)}>
                Close
              </Button>

              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" onClick={forceProceedWithoutAadhaar}>
                  Continue without Aadhaar
                </Button>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Note: If you control `EKycSection.tsx`, please call <code>notifyEkycCompleted(result)</code> from the EKYC
              success callback (a tiny helper is already available in that file). That will make the flow deterministic.
            </div>

            {ekycResult && (
              <pre className="mt-3 p-2 text-xs bg-slate-50 rounded max-h-40 overflow-auto">
                <strong>Detected EKYC result:</strong>
                <br />
                {JSON.stringify(ekycResult, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Main registration card */}
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-6 space-y-6 z-10">
        <h2 className="text-xl font-semibold">Register — Step {step}</h2>

        {/* STEP 1: Contact */}
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

            <div className="flex justify-end">
              <Button type="submit">Proceed to Aadhaar e-KYC</Button>
            </div>
          </form>
        )}

        {/* STEP 2: EKYC prompt and open panel */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Aadhaar verification (Step 2). Please complete e-KYC in the panel that opens.
            </div>

            <div className="flex items-center gap-3">
              <div>
                Aadhaar:{" "}
                {aadhaarVerified ? (
                  <span className="font-medium text-green-600">Verified</span>
                ) : (
                  <span className="font-medium text-amber-600">Not verified</span>
                )}
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Button onClick={() => setEkycPanelOpen(true)}>Open Aadhaar e-KYC</Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    // allow save of step data and leave panel closed — user must verify to continue.
                    alert(
                      "Open the Aadhaar panel and complete verification. After verification click Proceed in the Aadhaar panel to move to the next step."
                    );
                  }}
                >
                  How it works
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Personal details */}
        {step === 3 && (
          <form onSubmit={submitStep3} className="space-y-4">
            <div className="text-sm text-muted-foreground">Personal details</div>

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

            <div className="flex justify-between items-center gap-2">
              <Button variant="ghost" onClick={() => setStep(2)}>
                Back (Aadhaar)
              </Button>
              <div className="flex items-center gap-2">
                <div className="text-sm">
                  Aadhaar:{" "}
                  {aadhaarVerified ? (
                    <span className="font-medium text-green-600">Verified</span>
                  ) : (
                    <span className="font-medium text-amber-600">Not verified</span>
                  )}
                </div>
                <Button type="submit">Continue to Education</Button>
              </div>
            </div>
          </form>
        )}

        {/* STEP 4: Education & income */}
        {step === 4 && (
          <form onSubmit={submitStep4} className="space-y-4">
            <div className="text-sm text-muted-foreground">Education & Income</div>

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

                <Button type="button" onClick={() => document.getElementById("itr-file")?.click()}>
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
              <Button variant="ghost" onClick={() => setStep(3)}>
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

import React, { useState, useRef } from 'react';
import { Eye, EyeOff, Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';

// --- Reusable UI Components (inlined for single-file mandate) ---
const Button = React.forwardRef(({ className = '', variant = 'default', children, ...props }: any, ref: any) => {
  let baseClasses =
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 shadow-md";
  let variantClasses: any = {
    default: "bg-indigo-600 text-white hover:bg-indigo-700",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  };
  return (
    <button
      ref={ref}
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.default} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

const Input = React.forwardRef(({ className = '', type = 'text', ...props }: any, ref: any) => {
  return (
    <input
      ref={ref}
      type={type}
      className={`flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm ${className}`}
      {...props}
    />
  );
});

// --- Default Mock Aadhaar Database (Internal Registry) ---
const AADHAAR_DATA = [
  { id: '111122223333', name: 'Aarav Sharma', dob: '2001-05-15', registered: 'Yes' },
  { id: '111122223334', name: 'Diya Patel', dob: '2002-08-20', registered: 'Yes' },
  { id: '111122223335', name: 'Rohan Gupta', dob: '2003-01-10', registered: 'Yes' },
  { id: '111122223336', name: 'Priya Verma', dob: '1998-11-25', registered: 'Yes' },
  { id: '111122223337', name: 'Karan Singh', dob: '1995-04-03', registered: 'Yes' },
  { id: '111122223340', name: 'Sara Khan', dob: '1999-10-10', registered: 'Yes' },
  { id: '111122223350', name: 'Amit Desai', dob: '1990-01-01', registered: 'Yes' },
  { id: '111122223354', name: 'Myra Bose', dob: '2001-07-01', registered: 'No' },
  { id: '111122223360', name: 'Shruti Hegde', dob: '2001-06-12', registered: 'No' },
  { id: '999988887777', name: 'Nitya Varma', dob: '2003-03-18', registered: 'No' },
  { id: '123412341234', name: 'Test User', dob: '2000-01-01', registered: 'Yes' },
];

const FALLBACK_AADHAAR_MAP: Record<string, any> = AADHAAR_DATA.reduce((acc: any, item) => {
  acc[item.id] = item;
  return acc;
}, {});

// --- Mock QR Code Scanner Logic ---
const dynamicMockScanQRCode = (file: File | null, expectedId: string, registryMap: Record<string, any>) =>
  new Promise<{ success: boolean; message: string; data?: any }>((resolve) => {
    setTimeout(() => {
      if (!file) return resolve({ success: false, message: "No file uploaded." });

      const fileName = (file.name || "").toLowerCase();
      const match = fileName.match(/\d{12}/);
      if (!match) return resolve({ success: false, message: "QR code could not be read or is invalid (Simulated QR failure)." });

      const scannedId = match[0];
      if (scannedId !== expectedId) {
        return resolve({
          success: false,
          message: `QR content (${scannedId}) does not match entered Aadhaar ID (${expectedId}).`,
        });
      }

      const record = registryMap[scannedId];
      if (!record) {
        return resolve({ success: false, message: `Aadhaar ID ${scannedId} not found in the registry.` });
      }

      if (record.registered && record.registered.toLowerCase() === 'yes') {
        return resolve({ success: true, message: "Aadhaar verified successfully. Registration status: Yes.", data: record });
      } else {
        return resolve({ success: false, message: `Aadhaar ID ${scannedId} found, but registration status is 'No'. KYC failed.` });
      }
    }, 1200);
  });

// --- EKycSection Component (used as single step) ---
function EKycSection({ onComplete, onDataUpdate, formData, onNext }: any) {
  const [aadharNumber, setAadharNumber] = useState(formData?.aadharNumber || "");
  const [showAadhar, setShowAadhar] = useState(false);
  const [aadharFile, setAadharFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState({ state: 'initial', message: '' });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isValidAadhaarFormat = aadharNumber.length === 12 && /^\d+$/.test(aadharNumber);
  const canProceed = isValidAadhaarFormat && consent && status.state === 'success';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAadharFile(e.target.files[0]);
      setStatus({ state: 'initial', message: `File selected: ${e.target.files[0].name}. Click Verify.` });
    }
  };

  const handleVerify = async () => {
    if (!isValidAadhaarFormat) {
      return setStatus({ state: 'error', message: 'Please enter a valid 12-digit Aadhaar number first.' });
    }
    if (!aadharFile) {
      return setStatus({ state: 'error', message: 'Please upload the QR code image for verification.' });
    }

    setStatus({ state: 'loading', message: 'Verifying QR Code content against internal registry...' });

    const result = await dynamicMockScanQRCode(aadharFile, aadharNumber, FALLBACK_AADHAAR_MAP);

    if (result.success) {
      setStatus({ state: 'success', message: result.message });
      onDataUpdate({
        aadharNumber,
        kycData: result.data,
      });
      // mark complete if parent expects it
      if (typeof onComplete === 'function') onComplete(1);
    } else {
      setStatus({ state: 'error', message: result.message });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Step 1: Aadhaar E-KYC Verification</h2>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Aadhaar Number (12 Digits)</label>
        <div className="relative">
          <Input
            value={aadharNumber}
            onChange={(e: any) => setAadharNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
            placeholder="Enter 12-digit Aadhaar Number"
            type={showAadhar ? 'text' : 'password'}
            maxLength={12}
          />
          <button
            type="button"
            onClick={() => setShowAadhar(!showAadhar)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
          >
            {showAadhar ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {!isValidAadhaarFormat && aadharNumber.length > 0 && (
          <p className="text-xs text-red-500 mt-1">Aadhaar must be exactly 12 digits.</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 block">Aadhaar QR Code Image (.png or .jpg)</label>
        <div className="flex items-center justify-center w-full" onClick={() => fileInputRef.current?.click()}>
          <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 p-4 transition duration-300">
            <Upload size={24} className="text-indigo-500 mb-2" />
            <p className="mb-1 text-sm text-gray-500">{aadharFile ? aadharFile.name : "Click to upload, or drag and drop"}</p>
            <p className="text-xs text-gray-400">PNG or JPG (Max 5MB)</p>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/png, image/jpeg" onChange={handleFileChange} className="hidden" />
      </div>

      <Button onClick={handleVerify} disabled={!isValidAadhaarFormat || !aadharFile || status.state === 'loading'} className="w-full">
        {status.state === 'loading' ? (<><Loader2 size={20} className="mr-2 animate-spin" /> Verifying...</>) : 'Verify Aadhaar QR Code'}
      </Button>

      {status.state !== 'initial' && (
        <div className={`p-4 rounded-lg flex items-center space-x-3 ${status.state === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {status.state === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
          <p className="text-sm font-medium">{status.message}</p>
        </div>
      )}

      <div className="flex items-start">
        <input type="checkbox" id="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
        <label htmlFor="consent" className="ml-2 text-sm text-gray-600">I authorize the use of my Aadhaar number and QR code for KYC verification.</label>
      </div>

      <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
        <Button onClick={() => { setAadharFile(null); setStatus({ state: 'initial', message: '' }); }} className="flex-1" variant="outline">Reset</Button>
        <Button onClick={() => { if (canProceed && typeof onNext === 'function') onNext(); }} disabled={!canProceed} className="flex-1">Proceed</Button>
      </div>
    </div>
  );
}

// --- Main Application Component (only one step now) ---
const App = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<any>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  // The registry map is fixed to the internal mock data as per user request.
  const activeAadhaarMap = FALLBACK_AADHAAR_MAP;

  // Create the mock verifier function using the internal map
  const mockVerifier = (file: File | null, expectedId: string) => dynamicMockScanQRCode(file, expectedId, activeAadhaarMap);

  // Single step array
  const steps = [{ id: 1, title: 'Aadhaar E-KYC', content: 'Verify your identity using Aadhaar number and QR code.' }];

  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));
  const handleComplete = (stepId: number) => setCompletedSteps((prev) => ({ ...prev, [stepId]: true }));
  const handleDataUpdate = (data: any) => setFormData((prev: any) => ({ ...prev, ...data }));

  const renderStepContent = () => {
    // only step 1
    return (
      <EKycSection
        onComplete={handleComplete}
        onDataUpdate={(d: any) => {
          handleDataUpdate(d);
          // mark completed visually
          handleComplete(1);
        }}
        formData={formData}
        mockVerifier={mockVerifier}
        isFirstStep={true}
        onNext={() => {
          // move to next step in parent flow (if any)
          handleNext();
        }}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 sm:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-indigo-700">E-KYC Application</h1>
          <p className="text-sm text-gray-500">Aadhaar verification</p>
        </header>

        {/* Progress Tracker (single step) */}
        <div className="flex justify-between items-center mb-6">
          {steps.map((s) => (
            <div key={s.id} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${completedSteps[s.id] ? 'bg-green-500 text-white border-green-500' : currentStep === s.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-300 text-gray-500'}`}>
                {completedSteps[s.id] ? <CheckCircle size={14} /> : s.id}
              </div>
              <span className="text-xs mt-2">{s.title}</span>
            </div>
          ))}
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
};

// --- Add this near the bottom of EKycSection.tsx (top-level scope) ---
// Small, non-invasive helper: call notifyEkycCompleted(result) when EKYC finishes successfully.
// result can be any object (e.g. { verified: true, aadhaarNumber: 'xxxx xxxx xxxx', name: '...' } )
export function notifyEkycCompleted(result: any = { verified: true }) {
  try {
    // store a standard key (so parent can poll sessionStorage)
    sessionStorage.setItem("ekyc_result", JSON.stringify(result));
  } catch (e) {
    // ignore storage errors
  }

  try {
    // dispatch a custom event the parent component listens for
    window.dispatchEvent(new CustomEvent("ekyc:completed", { detail: result }));
  } catch (e) {
    // ignore
  }
}

// make it easy to call from outside (global), if necessary
;(window as any).notifyEkycCompleted = notifyEkycCompleted;

/*
  IMPORTANT: CALL THIS LINE FROM YOUR EKYC SUCCESS HANDLER
  -----------------------------------------------------
  Wherever EKYC has determined verification succeeded (your existing success callback),
  call:

    notifyEkycCompleted({ verified: true, aadhaarNumber: 'xxxx412341234', name: 'Full Name', ... })

  That single call will:
    - write a canonical "ekyc_result" key in sessionStorage
    - dispatch a window event 'ekyc:completed' with the result as detail
  The Registration form will pick this up automatically and continue the flow.

  If you want me to insert this single call directly into the exact success callback inside EKycSection.tsx, say so and I'll patch the file for you.
*/

export default App;

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CheckItem {
  id: string;
  label: string;
  status: "pending" | "checking" | "passed" | "failed";
}

interface EligibilityCheckerProps {
  onComplete?: () => void;
}

export function EligibilityChecker({ onComplete }: EligibilityCheckerProps) {
  const [checks, setChecks] = useState<CheckItem[]>([
    { id: "age", label: "Age Verification (18-25 years)", status: "pending" },
    { id: "education", label: "Educational Qualification", status: "pending" },
    { id: "residence", label: "Indian Citizenship", status: "pending" },
    { id: "income", label: "Family Income Criteria", status: "pending" },
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (currentIndex < checks.length) {
      setChecks(prev => prev.map((check, i) => 
        i === currentIndex ? { ...check, status: "checking" } : check
      ));

      const timer = setTimeout(() => {
        setChecks(prev => prev.map((check, i) => 
          i === currentIndex ? { ...check, status: "passed" } : check
        ));
        setCurrentIndex(prev => prev + 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (currentIndex === checks.length && !isComplete) {
      setIsComplete(true);
      setTimeout(() => {
        onComplete?.();
      }, 1500);
    }
  }, [currentIndex, checks.length, isComplete, onComplete]);

  const progress = (checks.filter(c => c.status === "passed").length / checks.length) * 100;

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="eligibility-checker">
      <CardHeader>
        <CardTitle className="text-center">Checking Eligibility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Progress value={progress} className="h-2" />
        
        <div className="space-y-3">
          {checks.map((check) => (
            <motion.div
              key={check.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              {check.status === "pending" && (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              {check.status === "checking" && (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              )}
              {check.status === "passed" && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              <span className={`text-sm ${check.status === "passed" ? "text-foreground" : "text-muted-foreground"}`}>
                {check.label}
              </span>
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center p-4 bg-green-500/10 rounded-lg"
            >
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="font-semibold text-green-600 dark:text-green-400">
                You are eligible!
              </p>
              <p className="text-sm text-muted-foreground">
                Proceeding to authentication...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

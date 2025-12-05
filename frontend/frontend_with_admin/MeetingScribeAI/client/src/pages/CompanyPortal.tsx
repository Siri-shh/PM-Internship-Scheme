// client/src/pages/CompanyPortal.tsx
import { useState } from "react";
import { Header } from "@/components/Header";
import { CompanyDashboard } from "@/components/CompanyDashboard";
import { ShortlistPanel } from "@/components/ShortlistPanel";
import { OnboardingSection } from "@/components/OnboardingSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LogoutButton from "@/components/LogoutButton";
import { LayoutDashboard, Users, FileText, Settings } from "lucide-react";
import { motion } from "framer-motion";

export default function CompanyPortal() {
  // NOTE: portal-level auth guard removed. App-level ProtectedRoute handles auth & redirects.
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Company Portal</h1>
            <p className="text-muted-foreground">Manage your internship programs and candidates</p>
          </div>

          {/* Logout button placed in the top-right controls */}
          <div>
            <LogoutButton />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="dashboard" className="gap-2" data-testid="tab-company-dashboard">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="shortlist" className="gap-2" data-testid="tab-shortlist">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Shortlist</span>
            </TabsTrigger>
            <TabsTrigger value="onboarding" className="gap-2" data-testid="tab-onboarding">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Onboarding</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2" data-testid="tab-settings">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <CompanyDashboard />
          </TabsContent>

          <TabsContent value="shortlist">
            <ShortlistPanel />
          </TabsContent>

          <TabsContent value="onboarding">
            <OnboardingSection />
          </TabsContent>

          <TabsContent value="settings">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="p-8 border rounded-lg bg-card text-center">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Company Settings</h3>
                <p className="text-muted-foreground">
                  Manage your company profile, team members, and notification preferences
                </p>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// client/src/pages/AdminPortal.tsx
import { useState } from "react";
import { Header } from "@/components/Header";
import { AdminDashboard } from "@/components/AdminDashboard";
import { VerificationPanel } from "@/components/VerificationPanel";
import { ModerationPanel } from "@/components/ModerationPanel";
import { OperationsCenter } from "@/components/OperationsCenter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LogoutButton from "@/components/LogoutButton";

import { 
  LayoutDashboard, 
  FileCheck, 
  Shield,
  Settings,
  Bell
} from "lucide-react";
import { motion } from "framer-motion";

export default function AdminPortal() {
  // NOTE: portal-level auth guard removed. App-level ProtectedRoute handles auth & redirects.
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-background">
      <Header showNav={false} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Government Admin Portal</h1>
              <p className="text-muted-foreground">Central oversight dashboard for PM Internship Scheme</p>
            </div>
          </div>

          {/* Logout button placed in the top-right controls */}
          <div>
            <LogoutButton />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="dashboard" className="gap-2" data-testid="tab-admin-dashboard">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="verification" className="gap-2" data-testid="tab-verification">
              <FileCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Verification</span>
            </TabsTrigger>
            <TabsTrigger value="moderation" className="gap-2" data-testid="tab-moderation">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Moderation</span>
            </TabsTrigger>
            <TabsTrigger value="operations" className="gap-2" data-testid="tab-operations">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Operations</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2" data-testid="tab-admin-settings">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AdminDashboard />
          </TabsContent>

          <TabsContent value="verification">
            <VerificationPanel />
          </TabsContent>

          <TabsContent value="moderation">
            <ModerationPanel />
          </TabsContent>

          <TabsContent value="operations">
            <OperationsCenter />
          </TabsContent>

          <TabsContent value="settings">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="p-8 border rounded-lg bg-card text-center">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Admin Settings</h3>
                <p className="text-muted-foreground">
                  Configure system settings, user permissions, and security policies
                </p>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

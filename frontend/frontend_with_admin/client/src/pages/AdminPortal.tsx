// client/src/pages/AdminPortal.tsx
import React, { useState } from 'react';
import { useAuth } from "@/lib/AuthProvider";
import { Header } from "@/components/Header";
import LogoutButton from "@/components/LogoutButton";
import {
    LayoutDashboard,
    Scale,
    Clock,
    Users,
    Tractor,
    Download,
    Settings,
    Fingerprint,
    Loader2,
    TrendingUp,
    Percent,
    ChevronDown,
    ChevronUp,
    Shield,
    Search,
    Play,
    FileText,
    Check,
    X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

// --------------------------------------------------------------------------------
// --- DASHBOARD COMPONENTS ---
// --------------------------------------------------------------------------------

const StatCard = ({ title, value, change, icon: Icon, trend }: { title: string, value: string, change: string, icon: any, trend?: "up" | "down" | "neutral" }) => (
    <Card>
        <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <h3 className="text-2xl font-bold">{value}</h3>
                <p className="text-xs text-muted-foreground">{change}</p>
            </div>
            <div className={`p-3 rounded-full ${trend === 'up' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : trend === 'down' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-primary/10 text-primary'}`}>
                <Icon className="h-5 w-5" />
            </div>
        </CardContent>
    </Card>
);

const CategoryMiniTable = () => {
    const data = [
        { category: 'GEN', eligible: 5200, placed: 3100, rate: 59.6, delta: 0.5 },
        { category: 'OBC', eligible: 3100, placed: 1750, rate: 56.5, delta: -1.2 },
        { category: 'SC', eligible: 1900, placed: 1100, rate: 57.9, delta: 2.1 },
        { category: 'ST', eligible: 950, placed: 550, rate: 57.9, delta: 0.0 },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Placement Rate by Category</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                {['Category', 'Eligible', 'Placed', 'Rate (%)', 'Delta'].map(header => (
                                    <th key={header} className="px-4 py-3 font-medium">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.map((item) => (
                                <tr key={item.category} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-4 py-3 font-medium">{item.category}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{item.eligible.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{item.placed.toLocaleString()}</td>
                                    <td className="px-4 py-3 font-semibold">{item.rate.toFixed(1)}%</td>
                                    <td className="px-4 py-3">
                                        <Badge variant={item.delta > 0 ? "default" : item.delta < 0 ? "destructive" : "secondary"} className="gap-1">
                                            {item.delta > 0 ? <ChevronUp className="h-3 w-3" /> : item.delta < 0 ? <ChevronDown className="h-3 w-3" /> : null}
                                            {Math.abs(item.delta).toFixed(1)}%
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-muted-foreground mt-4 italic">CI: The 95% Confidence Interval for the overall Placement Rate is [57.8%, 58.6%].</p>
            </CardContent>
        </Card>
    );
};


const AdminDashboard = ({ isAllocating, startAllocation, generateResults }: any) => (
    <div className="space-y-6">
        {/* KPI Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
                title="Total Applicants"
                value="11,150"
                change="Current Round"
                icon={Users}
                trend="neutral"
            />
            <StatCard
                title="Total Placed"
                value="6,500"
                change="Seats filled so far"
                icon={TrendingUp}
                trend="up"
            />
            <StatCard
                title="Placement Rate"
                value="58.3%"
                change="Target: 60.0%"
                icon={Percent}
                trend="down"
            />
        </div>

        {/* Operational Controls */}
        <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2"><Settings className="h-5 w-5" /> Allocation Controls</CardTitle>
                <CardDescription>Manage the automated allocation process and generate reports.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4">
                <Button
                    onClick={startAllocation}
                    disabled={isAllocating}
                    size="lg"
                    className="flex-1 gap-2"
                >
                    {isAllocating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                    {isAllocating ? "Allocation In Progress..." : "Start Model Allocation"}
                </Button>
                <Button
                    onClick={generateResults}
                    disabled={isAllocating}
                    variant="secondary"
                    size="lg"
                    className="flex-1 gap-2"
                >
                    <FileText className="h-5 w-5" />
                    Generate Meeting Results PDF
                </Button>
            </CardContent>
        </Card>

        {/* Mini-Table Section */}
        <CategoryMiniTable />

        <div className="h-48 flex items-center justify-center text-muted-foreground border border-dashed rounded-xl bg-muted/10">
            Simulation Visualization Placeholder: Comparative placement rates (Model vs. Previous Year).
        </div>
    </div>
);

// --------------------------------------------------------------------------------
// --- NEW TAB COMPONENTS ---
// --------------------------------------------------------------------------------

const FairnessMetricsPanel = () => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5 text-primary" /> Fairness & Model Health</CardTitle>
            <CardDescription>Audit the allocation model's performance on protected groups and predictive quality.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 border rounded-lg h-64 flex flex-col justify-center items-center bg-muted/10">
                    <h3 className="font-semibold mb-2">Placement Rates by Group</h3>
                    <p className="text-sm text-muted-foreground">[Chart Placeholder: Bar chart showing GEN, OBC, SC, ST rates]</p>
                    <p className="text-sm mt-2 text-primary font-medium">Disparate Impact Ratio (OBC/GEN): 0.947</p>
                </div>
                <div className="p-6 border rounded-lg h-64 flex flex-col justify-center items-center bg-muted/10">
                    <h3 className="font-semibold mb-2">Calibration Plot</h3>
                    <p className="text-sm text-muted-foreground">[Chart Placeholder: Predicted vs. Actual Outcomes Plot]</p>
                    <p className="text-xs mt-2">Model Health: Excellent calibration across all probability buckets.</p>
                </div>
                <div className="p-6 border rounded-lg h-64 flex flex-col justify-center items-center bg-muted/10 md:col-span-2">
                    <h3 className="font-semibold mb-2">Score Distribution & Threshold</h3>
                    <p className="text-sm text-muted-foreground">[Chart Placeholder: Histogram of predicted scores with allocation threshold line]</p>
                </div>
            </div>
        </CardContent>
    </Card>
);

const RoundLogsPanel = () => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-green-500" /> Allocation Round Logs</CardTitle>
            <CardDescription>Drillable timeline of all allocation rounds run by the system.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                            {['Round ID', 'Offers Made', 'Acceptances', 'Seats Filled', 'Timestamp', 'Action'].map(header => (
                                <th key={header} className="px-4 py-3 font-medium">{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {[
                            { id: 'RND-2024-3', offers: 3200, accepts: 1950, seats: 1200, time: '2024-10-25 11:30' },
                            { id: 'RND-2024-2', offers: 4500, accepts: 2500, seats: 1500, time: '2024-09-15 09:00' },
                            { id: 'RND-2024-1', offers: 5000, accepts: 3050, seats: 2000, time: '2024-08-01 15:45' },
                        ].map((row) => (
                            <tr key={row.id} className="hover:bg-muted/50 transition-colors">
                                <td className="px-4 py-3 font-medium">{row.id}</td>
                                <td className="px-4 py-3 text-muted-foreground">{row.offers.toLocaleString()}</td>
                                <td className="px-4 py-3 text-muted-foreground">{row.accepts.toLocaleString()}</td>
                                <td className="px-4 py-3 text-muted-foreground">{row.seats.toLocaleString()}</td>
                                <td className="px-4 py-3 text-muted-foreground">{row.time}</td>
                                <td className="px-4 py-3">
                                    <Button variant="ghost" size="sm" className="h-auto p-0">View Sankey</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="h-48 flex items-center justify-center text-muted-foreground border border-dashed rounded-xl bg-muted/10">
                Sankey Diagram Placeholder: Flow for selected round (Applicants → Offered → Accepted).
            </div>
        </CardContent>
    </Card>
);

const PerStudentTablePanel = () => {
    // Expanded mock data with round status
    const allStudents = [
        { id: 'A001', name: 'Rohan V.', category: 'GEN', score: 92.5, company: 'Tech Corp', placed: true, boost: false, social: { rural: 'No', gender: 'M' }, roundStatus: { 1: true, 2: false } },
        { id: 'A002', name: 'Priya K.', category: 'OBC', score: 88.1, company: 'Finance Ltd', placed: true, boost: true, social: { rural: 'Yes', gender: 'F' }, roundStatus: { 1: false, 2: true } },
        { id: 'A003', name: 'Sanjay M.', category: 'SC', score: 75.3, company: 'N/A', placed: false, boost: true, social: { rural: 'Yes', gender: 'M' }, roundStatus: { 1: false, 2: false } },
        { id: 'A004', name: 'Aisha R.', category: 'GEN', score: 95.9, company: 'Global Solutions', placed: true, boost: false, social: { rural: 'No', gender: 'F' }, roundStatus: { 1: true, 2: false } },
        { id: 'A005', name: 'Vivek G.', category: 'ST', score: 71.2, company: 'N/A', placed: false, boost: true, social: { rural: 'Yes', gender: 'M' }, roundStatus: { 1: false, 2: false } },
        { id: 'A006', name: 'Zoya H.', category: 'OBC', score: 85.5, company: 'Innovate Solutions', placed: true, boost: false, social: { rural: 'No', gender: 'F' }, roundStatus: { 1: true, 2: false } },
        { id: 'A007', name: 'Chennai P.', category: 'GEN', score: 91.0, company: 'Tech Corp', placed: true, boost: false, social: { rural: 'No', gender: 'F' }, roundStatus: { 1: true, 2: false } },
        { id: 'A008', name: 'Bhavesh N.', category: 'SC', score: 80.1, company: 'Data Systems', placed: true, boost: false, social: { rural: 'No', gender: 'M' }, roundStatus: { 1: false, 2: true } },
        { id: 'A009', name: 'Latika D.', category: 'GEN', score: 90.3, company: 'N/A', placed: false, boost: false, social: { rural: 'No', gender: 'F' }, roundStatus: { 1: false, 2: false } },
        { id: 'A010', name: 'Rahul S.', category: 'ST', score: 82.8, company: 'Green Energy', placed: true, boost: true, social: { rural: 'Yes', gender: 'M' }, roundStatus: { 1: false, 2: true } },
    ];

    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredStudents = allStudents.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-orange-500" /> Per-Student Table</CardTitle>
                <CardDescription>Detailed view of student allocation status and parameters.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by ID or Name (e.g., A002 or Priya)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* Student Table */}
                    <div className="md:w-2/3 border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        {['ID', 'Name', 'Category', 'Placed?', 'R1', 'R2', 'Boost?'].map(header => (
                                            <th key={header} className="px-4 py-3 font-medium">{header}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredStudents.map((student) => (
                                        <tr
                                            key={student.id}
                                            className={`cursor-pointer transition-colors ${selectedStudent?.id === student.id ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                                            onClick={() => setSelectedStudent(student)}
                                        >
                                            <td className="px-4 py-3 font-medium">{student.id}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{student.name}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{student.category}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={student.placed ? "default" : "destructive"}>
                                                    {student.placed ? 'YES' : 'NO'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {student.roundStatus[1] ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <X className="h-4 w-4 text-red-600 mx-auto" />}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {student.roundStatus[2] ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <X className="h-4 w-4 text-red-600 mx-auto" />}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge variant={student.boost ? "secondary" : "outline"}>
                                                    {student.boost ? 'Y' : 'N'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Detail Panel */}
                    <Card className="md:w-1/3 bg-muted/10 border-0 shadow-none">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Student Detail Panel</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {selectedStudent ? (
                                <div className="space-y-4 text-sm">
                                    <div className="space-y-1">
                                        <p className="text-muted-foreground">ID</p>
                                        <p className="font-medium">{selectedStudent.id}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-muted-foreground">Allocated Company</p>
                                        <p className="font-medium text-primary">{selectedStudent.company}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-muted-foreground">Predicted Score</p>
                                        <p className="font-medium">{selectedStudent.score.toFixed(2)}</p>
                                    </div>
                                    <div className="border-t pt-3">
                                        <p className="font-semibold mb-2">Social Parameters</p>
                                        <ul className="space-y-1 text-muted-foreground">
                                            <li className="flex justify-between"><span>Gender:</span> <span className="font-medium text-foreground">{selectedStudent.social.gender}</span></li>
                                            <li className="flex justify-between"><span>Rural Flag:</span> <span className="font-medium text-foreground">{selectedStudent.social.rural}</span></li>
                                            <li className="flex justify-between"><span>Boost Applied:</span> <span className="font-medium text-foreground">{selectedStudent.boost ? 'YES' : 'NO'}</span></li>
                                        </ul>
                                    </div>
                                    <div className="border-t pt-3">
                                        <p className="font-semibold mb-1">Final Allocation Round</p>
                                        <p className="text-muted-foreground">
                                            {selectedStudent.roundStatus[2] ? 'Round 2' : selectedStudent.roundStatus[1] ? 'Round 1' : 'Not Allocated'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-center p-4">
                                    <p>Select a student row to view detailed allocation parameters.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
    );
};

const ModelExplanationPanel = () => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Tractor className="h-5 w-5 text-blue-500" /> Model Allocation Explanation</CardTitle>
            <CardDescription>Documentation and live visualization of the core matching and allocation algorithm.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="p-4 border rounded-lg bg-muted/10 space-y-3">
                <h3 className="font-semibold">Algorithm Overview</h3>
                <p className="text-sm text-muted-foreground">The system uses a modified Gale-Shapley (Deferred Acceptance) algorithm, optimized for stable matching under fairness constraints (Reservation Policies).</p>
                <ul className="list-decimal list-inside ml-4 text-sm text-muted-foreground space-y-1">
                    <li>Applicant scores are pre-calculated based on academic history and predicted performance.</li>
                    <li>Fairness criteria (Reservation Policies) are strictly enforced at each matching step.</li>
                    <li>The matching process is run iteratively across pre-defined rounds.</li>
                </ul>
            </div>

            <div className="h-48 flex items-center justify-center text-muted-foreground border border-dashed rounded-xl bg-muted/10">
                Visualizer Placeholder: Interactive flow chart of the allocation process.
            </div>
        </CardContent>
    </Card>
);

const ReportsExportsPanel = () => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5 text-teal-500" /> Reports & Exports</CardTitle>
            <CardDescription>Generate high-fidelity reports and download raw data sets for comprehensive auditing.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-teal-50/50 dark:bg-teal-900/10 border-teal-200 dark:border-teal-800">
                    <CardContent className="p-6 space-y-4">
                        <h3 className="font-semibold">Audit Summary PDF</h3>
                        <p className="text-sm text-muted-foreground">Comprehensive summary document (KPIs, Fairness Charts, Narrative) for submission to oversight committees.</p>
                        <Button className="w-full bg-teal-600 hover:bg-teal-700">Generate & Download PDF</Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 space-y-4">
                        <h3 className="font-semibold text-primary">Allotment Outputs (Raw)</h3>
                        <p className="text-sm text-muted-foreground">Download the **full set of outputs** for the latest allocation run, including all score vectors and intermediate assignments.</p>
                        <Button variant="outline" className="w-full">Export Full Allotment (CSV)</Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 space-y-4">
                        <h3 className="font-semibold text-primary">Student Placement List</h3>
                        <p className="text-sm text-muted-foreground">Export only the final list of **every student allotted** an internship, including the assigned round and company.</p>
                        <Button variant="outline" className="w-full">Export Placed Students (CSV)</Button>
                    </CardContent>
                </Card>
            </div>
        </CardContent>
    </Card>
);

const SettingsDataSourcesPanel = () => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-purple-500" /> Settings / Data Sources</CardTitle>
            <CardDescription>Review database health, system dependencies, and immutable configuration values.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/10">
                <h3 className="font-semibold mb-2">Model Configuration Lock Status</h3>
                <p className="text-sm text-destructive flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">LOCKED</span>: Model parameters (weights, boosts, constraints) are fixed and managed centrally.
                </p>
            </div>
            <div className="p-4 border rounded-lg bg-muted/10">
                <h3 className="font-semibold mb-2">Data Source Health</h3>
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Database Connection: <span className="font-medium">Online</span> | Last Sync: <span className="font-medium">5 minutes ago</span>
                </p>
            </div>
        </CardContent>
    </Card>
);

const AuditTrailPanel = () => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Fingerprint className="h-5 w-5 text-red-500" /> Audit Trail</CardTitle>
            <CardDescription>Immutable log of all administrative actions and system events.</CardDescription>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-64 border rounded-lg p-4 bg-muted/5">
                <ul className="space-y-4 text-sm">
                    <li className="pb-3 border-b last:border-0">
                        <span className="font-semibold">2024-11-01 10:15:30:</span> AdminUser-1 <Badge variant="destructive" className="ml-2">REJECTED</Badge> application A003.
                    </li>
                    <li className="pb-3 border-b last:border-0">
                        <span className="font-semibold">2024-11-01 09:45:01:</span> System <Badge variant="default" className="ml-2 bg-indigo-600">INITIATED</Badge> Round RND-2024-3.
                    </li>
                    <li className="pb-3 border-b last:border-0">
                        <span className="font-semibold">2024-10-31 16:20:11:</span> SuperAdmin-A <Badge variant="outline" className="ml-2 text-orange-600 border-orange-600">MODIFIED</Badge> fairness boost weighting (0.8 - 0.9).
                    </li>
                    <li className="pb-3 border-b last:border-0">
                        <span className="font-semibold">2024-10-31 16:19:55:</span> SuperAdmin-A <Badge variant="default" className="ml-2 bg-green-600">APPROVED</Badge> access request for User-101.
                    </li>
                </ul>
            </ScrollArea>
        </CardContent>
    </Card>
);


// --------------------------------------------------------------------------------
// --- MAIN APP COMPONENT ---
// --------------------------------------------------------------------------------

const tabData = [
    { value: "dashboard", icon: LayoutDashboard, label: "Dashboard", testId: "tab-admin-dashboard", component: (props: any) => <AdminDashboard {...props} /> },
    { value: "fairness", icon: Scale, label: "Fairness", testId: "tab-fairness", component: () => <FairnessMetricsPanel /> },
    { value: "roundlogs", icon: Clock, label: "Round Logs", testId: "tab-round-logs", component: () => <RoundLogsPanel /> },
    { value: "perstudent", icon: Users, label: "Students", testId: "tab-per-student", component: () => <PerStudentTablePanel /> },
    { value: "explanation", icon: Tractor, label: "Model", testId: "tab-explanation", component: () => <ModelExplanationPanel /> },
    { value: "reports", icon: Download, label: "Reports", testId: "tab-reports", component: () => <ReportsExportsPanel /> },
    { value: "settings", icon: Settings, label: "Settings", testId: "tab-admin-settings", component: () => <SettingsDataSourcesPanel /> },
    { value: "audit", icon: Fingerprint, label: "Audit", testId: "tab-audit", component: () => <AuditTrailPanel /> },
];

export default function AdminPortal() {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [isAllocating, setIsAllocating] = useState(false);

    const startAllocation = () => {
        setIsAllocating(true);
        console.log("Starting Model Allocation...");
        // Mock 5 second allocation process
        setTimeout(() => {
            setIsAllocating(false);
            console.log("Model Allocation Complete. New results available.");
        }, 5000);
    };

    const generateResults = () => {
        console.log("Generating Final Meeting Results PDF...");
        // Mock PDF generation process
        alert("Final Allocation Results PDF Generation Initiated. Check Reports & Exports.");
    };

    return (
        <div className="min-h-screen bg-background font-sans">
            <Header showNav={false} />
            <div className="container mx-auto px-4 py-8 max-w-7xl">

                {/* Portal Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-primary/10">
                            <Shield className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Admin Portal</h1>
                            <p className="text-muted-foreground">Central oversight dashboard for Allocation & Auditing</p>
                        </div>
                    </div>

                    {/* Logout button */}
                    <div className="mt-4 sm:mt-0">
                        <LogoutButton />
                    </div>
                </div>

                {/* Tabs Component */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <ScrollArea className="w-full pb-2">
                        <TabsList className="inline-flex h-auto p-1 w-full justify-start sm:justify-center">
                            {tabData.map(({ value, icon: Icon, label, testId }) => (
                                <TabsTrigger
                                    key={value}
                                    value={value}
                                    data-testid={testId}
                                    className="gap-2 py-2.5 px-4"
                                >
                                    <Icon className="h-4 w-4" />
                                    <span className="hidden sm:inline">{label}</span>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </ScrollArea>

                    <div className="mt-6">
                        {tabData.map(({ value, component }) => (
                            <TabsContent key={value} value={value} className="m-0">
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {value === 'dashboard'
                                        ? component({ isAllocating, startAllocation, generateResults })
                                        : component({})}
                                </motion.div>
                            </TabsContent>
                        ))}
                    </div>
                </Tabs>
            </div>
        </div>
    );
}
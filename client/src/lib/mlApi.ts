/**
 * ML API Client Library
 * Provides typed functions for interacting with the ML backend through our proxy
 */

// Types for ML API responses
export interface Allocation {
    student_id: string;
    internship_id: string;
    pref_rank: number;
}

export interface CategoryStats {
    eligible: number;
    placed: number;
    placement_rate: number;
}

export interface FairnessData {
    total_applicants: number;
    total_placed: number;
    placement_rate: number;
    category_wise: Record<string, CategoryStats>;
    gender_wise: { M: number; F: number; O: number } | Record<string, { eligible: number; placed: number; placement_rate: number }>;
    rural: { eligible: number; placed: number; placement_rate: number };
    rural_wise?: Record<string, { eligible: number; placed: number; placement_rate: number }>;
}

export interface BoostReport {
    boosted_students: number;
    boosted_selected: number;
    uplift_success_rate: number;
    counterfactual_helped_students: number;
}

export interface DashboardData {
    students: number;
    internships: number;
    allocations_count: number;
    allocations: Allocation[];
    fairness: FairnessData;
    boost_report?: BoostReport;
}

const ML_API_BASE = "/api/admin";

/**
 * Upload students CSV file to ML backend
 */
export async function uploadStudentsCSV(file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${ML_API_BASE}/upload/students`, {
        method: "POST",
        credentials: "include",
        body: formData,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload students failed: ${error}`);
    }

    return response.json();
}

/**
 * Upload internships CSV file to ML backend
 */
export async function uploadInternshipsCSV(file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${ML_API_BASE}/upload/internships`, {
        method: "POST",
        credentials: "include",
        body: formData,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload internships failed: ${error}`);
    }

    return response.json();
}

/**
 * Train the ML model
 */
export async function trainModel(): Promise<any> {
    const response = await fetch(`${ML_API_BASE}/train`, {
        method: "POST",
        credentials: "include",
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Training failed: ${error}`);
    }

    return response.json();
}

/**
 * Run the allocation algorithm
 */
export async function allocateInternships(): Promise<any> {
    const response = await fetch(`${ML_API_BASE}/allocate`, {
        method: "POST",
        credentials: "include",
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Allocation failed: ${error}`);
    }

    return response.json();
}

/**
 * Get dashboard data with allocation results
 */
export async function getDashboardData(): Promise<DashboardData> {
    const response = await fetch(`${ML_API_BASE}/dashboard`, {
        credentials: "include",
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Dashboard fetch failed: ${error}`);
    }

    return response.json();
}

/**
 * Download a file from ML backend
 */
export async function downloadFile(filename: string): Promise<Blob> {
    const response = await fetch(`${ML_API_BASE}/ml/download/${filename}`, {
        credentials: "include",
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Download failed: ${error}`);
    }

    return response.blob();
}

/**
 * Trigger browser download for a blob
 */
export function triggerDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

/**
 * Get boost impact report (JSON file)
 */
export async function getBoostImpact(): Promise<any> {
    try {
        const response = await fetch(`${ML_API_BASE}/ml/download/student_boost_impact.json`, {
            credentials: "include",
        });
        if (!response.ok) return null;
        return response.json();
    } catch {
        return null;
    }
}

/**
 * Get fairness report (JSON file)
 */
export async function getFairnessReport(): Promise<any> {
    try {
        const response = await fetch(`${ML_API_BASE}/ml/download/final_fairness_report.json`, {
            credentials: "include",
        });
        if (!response.ok) return null;
        return response.json();
    } catch {
        return null;
    }
}

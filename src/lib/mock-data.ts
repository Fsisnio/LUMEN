import type { Organization, Program, Project, Indicator, BudgetLine, RiskItem } from "./types";

export const organizations: Organization[] = [
  { id: "org-1", name: "Collaborative Sénégal (National Office)", type: "National Office", country: "Senegal", region: "Dakar" },
  { id: "org-2", name: "Collaborative Dakar", type: "Diocesan Branch", country: "Senegal", region: "Dakar", diocese: "Dakar" },
  { id: "org-3", name: "Collaborative Ziguinchor", type: "Diocesan Branch", country: "Senegal", region: "Ziguinchor", diocese: "Ziguinchor" },
  { id: "org-4", name: "Collaborative Saint-Louis", type: "Regional Coordination", country: "Senegal", region: "Saint-Louis" },
  { id: "org-5", name: "Collaborative Mali (National Office)", type: "National Office", country: "Mali", region: "Bamako" },
  { id: "org-6", name: "Collaborative Burkina Faso (National Office)", type: "National Office", country: "Burkina Faso", region: "Ouagadougou" },
];

export const programs: Program[] = [
  { id: "prog-1", name: "Food Security", organizationId: "org-1", totalBudget: 2450000, spentBudget: 1820000, activeProjects: 8, riskLevel: "low" },
  { id: "prog-2", name: "Health & Nutrition", organizationId: "org-1", totalBudget: 1890000, spentBudget: 1200000, activeProjects: 6, riskLevel: "medium" },
  { id: "prog-3", name: "Education", organizationId: "org-1", totalBudget: 980000, spentBudget: 450000, activeProjects: 4, riskLevel: "low" },
  { id: "prog-4", name: "Livelihoods", organizationId: "org-1", totalBudget: 1560000, spentBudget: 890000, activeProjects: 5, riskLevel: "medium" },
  { id: "prog-5", name: "Emergency Response", organizationId: "org-1", totalBudget: 3200000, spentBudget: 2100000, activeProjects: 12, riskLevel: "high" },
  { id: "prog-6", name: "Social Protection", organizationId: "org-1", totalBudget: 720000, spentBudget: 380000, activeProjects: 3, riskLevel: "low" },
  { id: "prog-7", name: "Climate Resilience", organizationId: "org-1", totalBudget: 540000, spentBudget: 210000, activeProjects: 2, riskLevel: "medium" },
  { id: "prog-mali-1", name: "Food Security", organizationId: "org-5", totalBudget: 1100000, spentBudget: 620000, activeProjects: 3, riskLevel: "medium" },
  { id: "prog-bf-1", name: "Emergency Response", organizationId: "org-6", totalBudget: 1400000, spentBudget: 980000, activeProjects: 4, riskLevel: "high" },
];

export const projects: Project[] = [
  { id: "prj-1", code: "FS-2024-001", title: "Community Grain Banks", organizationId: "org-1", programId: "prog-1", donor: "WFP", budget: 450000, spent: 380000, duration: { start: "2024-01", end: "2025-06" }, location: "Tambacounda", region: "Tambacounda", manager: "Maria Santos", progress: 78, beneficiaries: 12500, status: "active", riskLevel: "low", lat: 13.77, lng: -13.67 },
  { id: "prj-2", code: "FS-2024-002", title: "School Feeding Program", organizationId: "org-1", programId: "prog-1", donor: "UNICEF", budget: 320000, spent: 210000, duration: { start: "2024-03", end: "2025-12" }, location: "Dakar", region: "Dakar", manager: "John Kamau", progress: 52, beneficiaries: 8200, status: "active", riskLevel: "low", lat: 14.72, lng: -17.47 },
  { id: "prj-3", code: "HN-2024-001", title: "Maternal Health Initiative", organizationId: "org-1", programId: "prog-2", donor: "EU", budget: 580000, spent: 420000, duration: { start: "2024-01", end: "2025-09" }, location: "Thiès", region: "Thiès", manager: "Dr. Amina Hassan", progress: 72, beneficiaries: 3400, status: "active", riskLevel: "medium", lat: 14.8, lng: -16.97 },
  { id: "prj-4", code: "ER-2024-001", title: "Flood Response 2024", organizationId: "org-1", programId: "prog-5", donor: "ECHO", budget: 890000, spent: 720000, duration: { start: "2024-04", end: "2024-12" }, location: "Saint-Louis", region: "Saint-Louis", manager: "Peter Ochieng", progress: 85, beneficiaries: 18500, status: "active", riskLevel: "high", lat: 16.0, lng: -16.5 },
  { id: "prj-5", code: "ED-2024-001", title: "Vocational Training Centers", organizationId: "org-1", programId: "prog-3", donor: "USAID", budget: 420000, spent: 180000, duration: { start: "2024-06", end: "2026-05" }, location: "Thiès", region: "Thiès", manager: "Grace Mwangi", progress: 28, beneficiaries: 1200, status: "active", riskLevel: "low", lat: 14.75, lng: -16.95 },
  { id: "prj-6", code: "LV-2024-001", title: "Microfinance for Women", organizationId: "org-1", programId: "prog-4", donor: "Collaborative International", budget: 380000, spent: 290000, duration: { start: "2024-02", end: "2025-08" }, location: "Ziguinchor", region: "Ziguinchor", manager: "Fatima Abdi", progress: 68, beneficiaries: 2100, status: "active", riskLevel: "medium", lat: 12.58, lng: -16.27 },
  { id: "prj-7", code: "ER-2024-002", title: "Drought Relief Package", organizationId: "org-1", programId: "prog-5", donor: "DFID", budget: 650000, spent: 410000, duration: { start: "2024-05", end: "2025-03" }, location: "Kolda", region: "Kolda", manager: "David Mutua", progress: 55, beneficiaries: 9800, status: "active", riskLevel: "high", lat: 12.88, lng: -14.95 },
  { id: "prj-8", code: "CR-2024-001", title: "Climate-Smart Agriculture", organizationId: "org-1", programId: "prog-7", donor: "Green Climate Fund", budget: 540000, spent: 210000, duration: { start: "2024-07", end: "2026-06" }, location: "Fatick", region: "Fatick", manager: "James Otieno", progress: 25, beneficiaries: 4500, status: "active", riskLevel: "medium", lat: 14.33, lng: -16.4 },
  { id: "prj-mali-1", code: "FS-ML-2024-001", title: "Sahel Cereal Banks", organizationId: "org-5", programId: "prog-mali-1", donor: "WFP", budget: 480000, spent: 260000, duration: { start: "2024-02", end: "2025-08" }, location: "Mopti", region: "Mopti", manager: "Aïssata Touré", progress: 54, beneficiaries: 7200, status: "active", riskLevel: "medium" },
  { id: "prj-bf-1", code: "ER-BF-2024-001", title: "IDP Emergency Shelter", organizationId: "org-6", programId: "prog-bf-1", donor: "ECHO", budget: 720000, spent: 510000, duration: { start: "2024-01", end: "2024-12" }, location: "Kaya", region: "Centre-Nord", manager: "Ousmane Sawadogo", progress: 70, beneficiaries: 14200, status: "active", riskLevel: "high" },
];

export const indicators: Indicator[] = [
  { id: "ind-1", organizationId: "org-1", projectId: "prj-1", name: "Households with grain storage", target: 2500, actual: 1950, unit: "households" },
  { id: "ind-2", organizationId: "org-1", projectId: "prj-1", name: "Children receiving daily meals", target: 5000, actual: 4200, unit: "children" },
  { id: "ind-3", organizationId: "org-1", projectId: "prj-2", name: "Children receiving daily meals", target: 4000, actual: 3200, unit: "children" },
  { id: "ind-4", organizationId: "org-1", projectId: "prj-3", name: "Antenatal care visits", target: 3000, actual: 2450, unit: "women" },
  { id: "ind-5", organizationId: "org-1", projectId: "prj-3", name: "Health facility trainings", target: 24, actual: 18, unit: "sessions" },
  { id: "ind-6", organizationId: "org-1", projectId: "prj-4", name: "Families with shelter kits", target: 5000, actual: 4200, unit: "families" },
  { id: "ind-7", organizationId: "org-1", projectId: "prj-4", name: "People with WASH access", target: 8000, actual: 6500, unit: "people" },
  { id: "ind-8", organizationId: "org-1", projectId: "prj-5", name: "Youth trained", target: 800, actual: 220, unit: "youth" },
  { id: "ind-9", organizationId: "org-1", projectId: "prj-6", name: "Women with microloans", target: 1500, actual: 1100, unit: "women" },
  { id: "ind-10", organizationId: "org-1", projectId: "prj-7", name: "Households with food aid", target: 4000, actual: 2800, unit: "households" },
  { id: "ind-11", organizationId: "org-1", projectId: "prj-8", name: "Farmers trained (climate-smart)", target: 2000, actual: 480, unit: "farmers" },
  { id: "ind-p1", organizationId: "org-1", programId: "prog-1", name: "Households with food security", target: 6500, actual: 5150, unit: "households" },
  { id: "ind-p2", organizationId: "org-1", programId: "prog-1", name: "Children receiving meals", target: 9000, actual: 7400, unit: "children" },
  { id: "ind-p3", organizationId: "org-1", programId: "prog-2", name: "Health service beneficiaries", target: 5000, actual: 3800, unit: "people" },
  { id: "ind-p4", organizationId: "org-1", programId: "prog-5", name: "Emergency-affected families assisted", target: 12000, actual: 9500, unit: "families" },
  { id: "ind-p5", organizationId: "org-1", programId: "prog-4", name: "Livelihoods beneficiaries", target: 2500, actual: 1800, unit: "people" },
  { id: "ind-p6", organizationId: "org-1", programId: "prog-3", name: "Education/training participants", target: 1200, actual: 450, unit: "participants" },
  { id: "ind-p7", organizationId: "org-1", programId: "prog-7", name: "Climate-resilient farmers", target: 2000, actual: 480, unit: "farmers" },
  { id: "ind-ml-1", organizationId: "org-5", projectId: "prj-mali-1", name: "Households with cereal stocks", target: 1500, actual: 820, unit: "households" },
  { id: "ind-bf-1", organizationId: "org-6", projectId: "prj-bf-1", name: "IDPs with shelter kits", target: 3500, actual: 2700, unit: "households" },
];

export const budgetLines: BudgetLine[] = [
  { id: "bl-1", organizationId: "org-1", projectId: "prj-1", category: "Equipment", budgeted: 120000, spent: 95000 },
  { id: "bl-2", organizationId: "org-1", projectId: "prj-1", category: "Staff", budgeted: 180000, spent: 165000 },
  { id: "bl-3", organizationId: "org-1", projectId: "prj-1", category: "Training", budgeted: 80000, spent: 72000 },
  { id: "bl-4", organizationId: "org-1", projectId: "prj-1", category: "Other", budgeted: 70000, spent: 48000 },
  { id: "bl-ml-1", organizationId: "org-5", projectId: "prj-mali-1", category: "Distribution", budgeted: 220000, spent: 130000 },
];

export const risks: RiskItem[] = [
  { id: "risk-1", organizationId: "org-1", projectId: "prj-4", description: "Delayed procurement of shelter materials", level: "high", mitigation: "Alternative supplier identified", status: "mitigated" },
  { id: "risk-2", organizationId: "org-1", projectId: "prj-7", description: "Funding gap in Q4", level: "medium", mitigation: "Donor extension requested", status: "open" },
  { id: "risk-3", organizationId: "org-1", projectId: "prj-3", description: "Staff turnover in remote clinics", level: "medium", status: "open" },
  { id: "risk-bf-1", organizationId: "org-6", projectId: "prj-bf-1", description: "Security incidents on logistic routes", level: "high", mitigation: "Coordination with UN cluster", status: "open" },
];

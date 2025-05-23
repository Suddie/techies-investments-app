
import type { UserRole, AccessLevel, GlobalSettings } from './types'; // Ensure GlobalSettings is imported

export const ROLES: Record<UserRole, { name: UserRole; accessLevel: AccessLevel }> = {
  Admin: { name: 'Admin', accessLevel: 1 },
  Treasurer: { name: 'Treasurer', accessLevel: 1 },
  'Vice Treasurer': { name: 'Vice Treasurer', accessLevel: 1 },
  Chairman: { name: 'Chairman', accessLevel: 1 },
  'Vice Chairman': { name: 'Vice Chairman', accessLevel: 2 },
  'Investment Lead': { name: 'Investment Lead', accessLevel: 2 },
  Secretary: { name: 'Secretary', accessLevel: 2 },
  Member: { name: 'Member', accessLevel: 3 },
  'Finance Professional': { name: 'Finance Professional', accessLevel: 1 }, // Or a specific level
};

export const ACCESS_LEVELS: Record<AccessLevel, string> = {
  1: 'Full Control & Financial Authority',
  2: 'Broad View & Specific Responsibilities',
  3: 'Member View & Actions',
};

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = { // Use the imported type
  appName: "Techies Investments App",
  logoUrl: null,
  currencySymbol: "MK",
  contributionMin: 1000,
  contributionMax: 100000,
  penaltyAmount: 500, // Added default penalty amount
  // Initialize other GlobalSettings fields with defaults if necessary
  invoiceLogoUrl: null,
  useAppLogoForInvoice: false,
  invoiceCompanyName: "",
  invoiceAddress: "",
  invoiceContact: "",
  financialYearStart: "01-01",
};

export const APP_NAME = "Techies Investments App";

export const NAVIGATION_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", adminOnly: false, requiredAccessLevel: 3 },
  { href: "/contributions", label: "Contributions", icon: "HandCoins", adminOnly: false, requiredAccessLevel: 3 },
  { href: "/expenses", label: "Expenses", icon: "CreditCard", adminOnly: false, requiredAccessLevel: 3 },
  { href: "/reports", label: "Reports", icon: "FileText", adminOnly: false, requiredAccessLevel: 2 },
  { href: "/admin/users", label: "User Management", icon: "Users", adminOnly: true, requiredAccessLevel: 1 },
  // Add more links for other features like project management etc.
];


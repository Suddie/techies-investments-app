
import type { UserRole, AccessLevel, GlobalSettings } from './types'; 
import {
  LayoutDashboard,
  HandCoins,
  CreditCard,
  ListChecks,
  Archive,
  FileText,
  Users,
  History,
  Landmark,
  Home,
  Briefcase,
  FileBarChart, 
  Settings as SettingsIcon, // Renamed to avoid conflict
} from 'lucide-react';

export const ROLES: Record<UserRole, { name: UserRole; accessLevel: AccessLevel }> = {
  Admin: { name: 'Admin', accessLevel: 1 },
  Treasurer: { name: 'Treasurer', accessLevel: 1 },
  'Vice Treasurer': { name: 'Vice Treasurer', accessLevel: 1 },
  Chairman: { name: 'Chairman', accessLevel: 1 },
  'Vice Chairman': { name: 'Vice Chairman', accessLevel: 2 },
  'Investment Lead': { name: 'Investment Lead', accessLevel: 2 },
  Secretary: { name: 'Secretary', accessLevel: 2 },
  Member: { name: 'Member', accessLevel: 3 },
  'Finance Professional': { name: 'Finance Professional', accessLevel: 1 }, 
};

export const ACCESS_LEVELS: Record<AccessLevel, string> = {
  1: 'Full Control & Financial Authority',
  2: 'Broad View & Specific Responsibilities',
  3: 'Member View & Actions',
};

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  appName: "Techies Investments App",
  logoUrl: null,
  currencySymbol: "MK",
  contributionMin: 1000,
  contributionMax: 100000,
  penaltyAmount: 500,
  invoiceLogoUrl: null,
  useAppLogoForInvoice: false,
  invoiceCompanyName: "Techies Investments", // Default company name
  invoiceAddress: "P.O. Box 123, City, Country", // Default address
  invoiceContact: "contact@techiesinvestments.com / +265 123 456 789", // Default contact
  companyTaxPIN: "P123456789M", // Default placeholder TPIN
  financialYearStart: "01-01", // Default financial year start (Jan 1st)
};

export const APP_NAME = "Techies Investments App";

export const NAVIGATION_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false, requiredAccessLevel: 3 },
  { href: "/contributions", label: "Contributions", icon: HandCoins, adminOnly: false, requiredAccessLevel: 3 },
  { href: "/expenses", label: "Expenses", icon: CreditCard, adminOnly: false, requiredAccessLevel: 3 },
  { href: "/milestones", label: "Project Milestones", icon: ListChecks, adminOnly: false, requiredAccessLevel: 3 },
  { href: "/stock", label: "Stock Management", icon: Archive, adminOnly: false, requiredAccessLevel: 3 },
  { href: "/tenant-management", label: "Tenant Management", icon: Home, adminOnly: false, requiredAccessLevel: 1 }, 
  { href: "/professionals", label: "Professionals", icon: Briefcase, adminOnly: false, requiredAccessLevel: 1 },
  { href: "/reports", label: "Reports", icon: FileText, adminOnly: false, requiredAccessLevel: 2 },
  { href: "/tax-summary", label: "Tax Summary", icon: FileBarChart, adminOnly: false, requiredAccessLevel: 2 }, 
  // User Management and Settings are typically accessed differently (e.g., user dropdown or specific admin section)
  // { href: "/admin/users", label: "User Management", icon: Users, adminOnly: true, requiredAccessLevel: 1 },
  // { href: "/admin/settings", label: "Settings", icon: SettingsIcon, adminOnly: true, requiredAccessLevel: 1 }, // SettingsIcon used here
  { href: "/audit-log", label: "Audit Log", icon: History, adminOnly: false, requiredAccessLevel: 3 },
  { href: "/bank-management", label: "Bank Management", icon: Landmark, adminOnly: false, requiredAccessLevel: 2 },
];

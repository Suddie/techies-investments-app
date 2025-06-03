
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
  Bell,
  MessageSquarePlus,
  ClipboardList // Added ClipboardList
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
  invoiceLogoUrl: null, 
  useAppLogoForInvoice: false, 
  currencySymbol: "MK",
  contributionMin: 1000,
  contributionMax: 100000,
  penaltyAmount: 500,
  invoiceCompanyName: "Techies Investments", 
  invoiceAddress: "P.O. Box 123, City, Country", 
  invoiceContact: "contact@techiesinvestments.com / +265 123 456 789", 
  companyTaxPIN: "P123456789M", 
  financialYearStart: "01-01", 
};

export const APP_NAME = "Techies Investments App";

export const NAVIGATION_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false, requiredAccessLevel: 3 },
  { href: "/notifications", label: "Notifications", icon: Bell, adminOnly: false, requiredAccessLevel: 3 },
  { href: "/contributions", label: "Contributions", icon: HandCoins, adminOnly: false, requiredAccessLevel: 3 },
  { href: "/expenses", label: "Expenses", icon: CreditCard, adminOnly: false, requiredAccessLevel: 3 },
  { href: "/milestones", label: "Project Milestones", icon: ListChecks, adminOnly: false, requiredAccessLevel: 3 },
  { href: "/stock", label: "Stock Management", icon: Archive, adminOnly: false, requiredAccessLevel: 3 },
  { href: "/tenant-management", label: "Tenant Management", icon: Home, adminOnly: false, requiredAccessLevel: 1 }, 
  { href: "/professionals", label: "Professionals", icon: Briefcase, adminOnly: false, requiredAccessLevel: 1 },
  { href: "/reports", label: "Reports", icon: FileText, adminOnly: false, requiredAccessLevel: 2 },
  { href: "/tax-summary", label: "Tax Summary", icon: FileBarChart, adminOnly: false, requiredAccessLevel: 2 }, 
  { href: "/audit-log", label: "Audit Log", icon: History, adminOnly: false, requiredAccessLevel: 3 },
  { href: "/bank-management", label: "Bank Management", icon: Landmark, adminOnly: false, requiredAccessLevel: 2 },
  { href: "/admin/users", label: "User Management", icon: Users, adminOnly: true, requiredAccessLevel: 1 },
  { href: "/admin/manage-contributions", label: "Manage Contributions", icon: ClipboardList, adminOnly: true, requiredAccessLevel: 1 },
  { href: "/admin/manage-notifications", label: "Manage Notifications", icon: MessageSquarePlus, adminOnly: true, requiredAccessLevel: 1 },
];

    

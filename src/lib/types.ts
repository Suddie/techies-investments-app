export interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  role: UserRole;
  accessLevel: AccessLevel;
  shares?: number;
  penaltyBalance?: number;
  tpin?: string; // Encrypted
  requiresPasswordChange?: boolean;
  status?: 'Active' | 'Inactive';
  photoURL?: string | null;
}

export type UserRole = 'Admin' | 'Treasurer' | 'Vice Treasurer' | 'Chairman' | 'Vice Chairman' | 'Investment Lead' | 'Secretary' | 'Member' | 'Finance Professional';

export type AccessLevel = 1 | 2 | 3;

export interface Contribution {
  id?: string;
  userId: string;
  memberName: string;
  amount: number;
  penaltyPaidAmount?: number;
  monthsCovered: string[]; // Array of 'YYYY-MM'
  datePaid: Date;
  isLate?: boolean;
  notes?: string;
}

export interface GlobalSettings {
  appName: string;
  logoUrl: string | null;
  invoiceLogoUrl?: string | null;
  useAppLogoForInvoice?: boolean;
  contributionMin?: number;
  contributionMax?: number;
  penaltyAmount?: number;
  currencySymbol?: string;
  invoiceCompanyName?: string;
  invoiceAddress?: string;
  invoiceContact?: string;
  financialYearStart?: string; // 'MM-DD'
}

export interface NotificationMessage {
  id: string;
  userId: string | 'all'; // Target user or 'all'
  message: string;
  type: 'reminder' | 'warning' | 'alert' | 'info' | 'success' | 'error';
  timestamp: Date;
  isRead: boolean;
  relatedLink?: string;
}

export interface Expense {
  id?: string; // Firestore document ID
  date: Date; // Timestamp in Firestore
  description: string;
  category: string; // e.g., 'Office Supplies', 'Utilities', 'Project Material'
  quantity: number;
  unitPrice: number;
  subtotal: number; // quantity * unitPrice
  totalAmount: number; // Could be same as subtotal or include taxes/discounts
  vendor?: string;
  receiptUrl?: string; // URL to receipt image in Firebase Storage
  enteredByUid: string;
  enteredByName: string;
  createdAt: Date; // Timestamp in Firestore
}

// Add other types as needed for milestones, tenants etc.
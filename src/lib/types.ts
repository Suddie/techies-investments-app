
export interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  role: UserRole;
  accessLevel: AccessLevel;
  shares?: number;
  penaltyBalance?: number; // Added for dashboard mock
  tpin?: string; // Encrypted
  requiresPasswordChange?: boolean;
  status?: 'Active' | 'Inactive';
  photoURL?: string | null;
  createdAt?: any; // Firestore serverTimestamp or Date
  // lastLoginAt?: any; // Consider adding this
}

export type UserRole = 'Admin' | 'Treasurer' | 'Vice Treasurer' | 'Chairman' | 'Vice Chairman' | 'Investment Lead' | 'Secretary' | 'Member' | 'Finance Professional';

export type AccessLevel = 1 | 2 | 3;

// This type is for the Zod schema and form values in UserForm.tsx
// It might differ slightly from UserProfile (e.g., password field exists in form but not directly in UserProfile)
export interface UserFormValues {
  name: string;
  email: string; // Required for new user creation
  role: UserRole;
  password?: string; // Optional for edit, required for new if creating auth user
  status: 'Active' | 'Inactive';
  requiresPasswordChange: boolean;
}


export interface Contribution {
  id?: string; // Firestore document ID
  userId: string;
  memberName: string | null; // From UserProfile.name
  amount: number;
  penaltyPaidAmount?: number;
  monthsCovered: string[]; // Array of 'YYYY-MM'
  datePaid: any; // Firestore serverTimestamp or Date
  isLate?: boolean;
  notes?: string;
  createdAt?: any; // Firestore serverTimestamp or Date
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
  date: any; // Will be Firestore Timestamp, use `any` for form flexibility, convert before saving
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
  createdAt: any; // Firestore Timestamp or Date
}

export type MilestoneStatus = 'Not Started' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';

export interface Milestone {
  id?: string; // Firestore document ID
  name: string;
  description?: string;
  targetAmount: number; // in base currency (e.g., MK)
  targetDate?: any; // Firestore Timestamp or Date (Optional)
  status: MilestoneStatus;
  actualCompletionDate?: any; // Firestore Timestamp or Date (Optional)
  projectId?: string; // If you have multiple projects
  createdAt?: any;
  updatedAt?: any;
}

// Form values for MilestoneForm
export interface MilestoneFormValues {
  name: string;
  description?: string;
  targetAmount: number;
  targetDate?: Date;
  status: MilestoneStatus;
  actualCompletionDate?: Date;
}

export interface StockItem {
  id?: string; // Firestore document ID
  itemName: string;
  description?: string;
  unitOfMeasure: string; // e.g., 'bags', 'kg', 'liters', 'pieces'
  currentQuantity: number;
  lowStockThreshold: number;
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}

// Form values for StockItemForm
export interface StockItemFormValues {
  itemName: string;
  description?: string;
  unitOfMeasure: string;
  initialQuantity?: number; // Used when creating a new item, defaults to 0
  lowStockThreshold: number;
}


// Add other types as needed for tenants etc.

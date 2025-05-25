
export interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  role: UserRole;
  accessLevel: AccessLevel;
  shares?: number;
  penaltyBalance?: number; 
  tpin?: string; 
  requiresPasswordChange?: boolean;
  status?: 'Active' | 'Inactive';
  photoURL?: string | null;
  createdAt?: any; 
}

export type UserRole = 'Admin' | 'Treasurer' | 'Vice Treasurer' | 'Chairman' | 'Vice Chairman' | 'Investment Lead' | 'Secretary' | 'Member' | 'Finance Professional';

export type AccessLevel = 1 | 2 | 3;

export interface UserFormValues {
  name: string;
  email: string; 
  role: UserRole;
  password?: string; 
  status: 'Active' | 'Inactive';
  requiresPasswordChange: boolean;
}


export interface Contribution {
  id?: string; 
  userId: string;
  memberName: string | null; 
  amount: number;
  penaltyPaidAmount?: number;
  monthsCovered: string[]; 
  datePaid: any; 
  isLate?: boolean;
  notes?: string;
  createdAt?: any; 
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
  financialYearStart?: string; 
}

export interface NotificationMessage {
  id: string;
  userId: string | 'all'; 
  message: string;
  type: 'reminder' | 'warning' | 'alert' | 'info' | 'success' | 'error';
  timestamp: Date;
  isRead: boolean;
  relatedLink?: string;
}

export interface Expense {
  id?: string; 
  date: any; 
  description: string;
  category: string; 
  quantity: number;
  unitPrice: number;
  subtotal: number; 
  totalAmount: number; 
  vendor?: string;
  receiptUrl?: string; 
  enteredByUid: string;
  enteredByName: string;
  createdAt: any; 
}

export type MilestoneStatus = 'Not Started' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';

export interface Milestone {
  id?: string; 
  name: string;
  description?: string;
  targetAmount: number; 
  targetDate?: any; 
  status: MilestoneStatus;
  actualCompletionDate?: any; 
  projectId?: string; 
  createdAt?: any;
  updatedAt?: any;
}

export interface MilestoneFormValues {
  name: string;
  description?: string;
  targetAmount: number;
  targetDate?: Date;
  status: MilestoneStatus;
  actualCompletionDate?: Date;
}

export interface StockItem {
  id?: string; 
  itemName: string;
  description?: string;
  unitOfMeasure: string; 
  currentQuantity: number;
  lowStockThreshold: number;
  createdAt?: any; 
  updatedAt?: any; 
}

export interface StockItemFormValues {
  itemName: string;
  description?: string;
  unitOfMeasure: string;
  initialQuantity?: number; 
  lowStockThreshold: number;
}

export interface StockTransaction {
  id?: string; // Firestore document ID
  itemId: string;
  itemName: string; // Denormalized for display
  transactionType: 'IN' | 'OUT';
  date: any; // Firestore Timestamp
  quantity: number;
  unitCost?: number; // Required for 'IN', optional for 'OUT'
  supplier?: string; // For 'IN'
  issuedTo?: string; // For 'OUT'
  notes?: string;
  recordedByUid: string;
  recordedByName: string;
  createdAt: any; // Firestore Timestamp
}

export interface StockTransactionFormValues {
  date: Date;
  quantity: number;
  unitCost?: number; 
  supplier?: string;
  issuedTo?: string;
  notes?: string;
}

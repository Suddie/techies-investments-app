
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
  tpin?: string; 
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
  companyTaxPIN?: string; 
  financialYearStart?: string; 
}

export type NotificationType = 'reminder' | 'warning' | 'alert' | 'info' | 'success' | 'error';

export interface NotificationMessage {
  id: string;
  userId: string | 'all'; 
  message: string;
  type: NotificationType;
  timestamp: Date;
  isRead: boolean;
  relatedLink?: string;
}

export interface ManualNotificationFormValues {
  targetType: 'all' | 'specific';
  targetUserId?: string; // For 'specific' user, store UID here
  targetUserEmail?: string; // For looking up specific user
  message: string;
  type: NotificationType;
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
  unitPrice?: number; 
  currentQuantity: number;
  lowStockThreshold: number;
  createdAt?: any; 
  updatedAt?: any; 
}

export interface StockItemFormValues {
  itemName: string;
  description?: string;
  unitOfMeasure: string;
  unitPrice?: number; 
  initialQuantity?: number; 
  lowStockThreshold: number;
}

export interface StockTransaction {
  id?: string; 
  itemId: string;
  itemName: string; 
  transactionType: 'IN' | 'OUT';
  date: any; 
  quantity: number;
  unitCost?: number; 
  supplier?: string; 
  issuedTo?: string; 
  notes?: string;
  recordedByUid: string;
  recordedByName: string;
  createdAt: any; 
}

export interface StockTransactionFormValues {
  date: Date;
  quantity: number;
  unitCost?: number; 
  supplier?: string;
  issuedTo?: string;
  notes?: string;
}

export interface AuditLogEntry {
  id?: string;
  timestamp: any; 
  userId: string;
  userName: string;
  actionType: string; 
  details: string | Record<string, any>; 
}

export interface BankBalance {
  id?: string;
  monthYear: string; 
  openingBalance: number;
  closingBalance: number;
  interestEarned?: number;
  bankCharges?: number;
  lastUpdated?: any; 
  recordedByUid?: string;
  recordedByName?: string;
}

export interface BankBalanceFormValues {
  monthYear: string; 
  openingBalance: number;
  closingBalance: number;
  interestEarned?: number;
  bankCharges?: number;
}

export type TenantStatus = 'Active' | 'Inactive' | 'Pending';
export type PaymentFrequency = 'Monthly' | 'Quarterly' | 'Annually' | 'Bi-Annually';

export interface Tenant {
  id?: string;
  name: string;
  unitNumber: string;
  contactInfo: {
    phone?: string;
    email?: string;
    address?: string;
  };
  rentAmount: number;
  paymentFrequency: PaymentFrequency;
  leaseStartDate?: any; 
  leaseEndDate?: any; 
  status: TenantStatus;
  arrearsBroughtForward?: number; 
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface TenantFormValues {
  name: string;
  unitNumber: string;
  contactPhone?: string;
  contactEmail?: string;
  contactAddress?: string;
  rentAmount: number;
  paymentFrequency: PaymentFrequency;
  leaseStartDate?: Date;
  leaseEndDate?: Date;
  status: TenantStatus;
  arrearsBroughtForward?: number;
  notes?: string;
}

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
export type InvoicePaymentMethod = 'Cash' | 'Bank Transfer' | 'Cheque' | 'Mobile Money' | 'Other';

export interface RentInvoice {
  id?: string;
  tenantId: string;
  tenantName: string; 
  unitNumber: string; 
  invoiceNumber: string; 
  invoiceDate: any; 
  dueDate: any; 
  periodCoveredStart: any; 
  periodCoveredEnd: any; 
  rentAmount: number;
  arrearsBroughtForward: number;
  otherCharges?: { description: string; amount: number }[];
  totalDue: number;
  amountPaid: number;
  datePaid?: any; 
  paymentMethod?: InvoicePaymentMethod;
  status: InvoiceStatus;
  notes?: string;
  createdByUid: string;
  createdByName: string;
  createdAt: any;
  updatedAt?: any;
}

export interface RentInvoiceFormValues {
  tenantId: string;
  invoiceDate: Date;
  dueDate: Date;
  periodCoveredStart: Date;
  periodCoveredEnd: Date;
  rentAmount: number;
  arrearsBroughtForward?: number; 
  notes?: string;
}

export interface RecordInvoicePaymentFormValues {
  amountPaid: number;
  datePaid: Date;
  paymentMethod: InvoicePaymentMethod;
  notes?: string;
}


export type ProfessionalStatus = 'Active' | 'On Hold' | 'Completed' | 'Terminated';

export interface ProfessionalPayment {
  date: any; 
  amountPaid: number;
  notes?: string;
}

export interface Professional {
  id?: string;
  name: string;
  serviceType: string; 
  contactInfo: {
    phone?: string;
    email?: string;
  };
  assignedJobDescription?: string;
  totalAgreedCharge: number;
  paymentHistory: ProfessionalPayment[]; 
  balanceDue: number; 
  status: ProfessionalStatus;
  createdAt?: any;
  updatedAt?: any;
}

export interface ProfessionalFormValues {
  name: string;
  serviceType: string;
  contactPhone?: string;
  contactEmail?: string;
  assignedJobDescription?: string;
  totalAgreedCharge: number;
  status: ProfessionalStatus;
}

export interface ProfessionalPaymentFormValues {
  date: Date;
  amountPaid: number;
  notes?: string;
}

// Company Info type (for companyInfo collection, usually a single document)
// export interface CompanyInfo {
//   id?: string; // Typically a fixed ID like 'main'
//   companyName: string;
//   address?: string;
//   registrationNumber?: string;
//   taxPIN?: string; // This is separate from member TPINs
//   // other relevant details
// }


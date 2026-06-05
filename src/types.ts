export type UserRole = 'admin' | 'tl' | 'agent';

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  status: 'active' | 'blocked';
  kycStatus: 'pending' | 'approved' | 'rejected' | 'none';
  kycDetails?: {
    panNumber: string;
    aadhaarNumber: string;
    bankAccount: string;
    ifscCode: string;
    documentName?: string;
  };
  tlId?: string; // Assigned TL for agents
  createdAt: string;
}

export type ProductType =
  | 'Credit Card'
  | 'Personal Loan'
  | 'Instant Loan'
  | 'Home Loan'
  | 'Car Loan'
  | 'Business Loan'
  | 'Savings Account'
  | 'Current Account'
  | 'Demat Account'
  | 'Insurance'
  | 'Bank CSP'
  | 'PM Surya Rooftop'
  | 'Fixed Deposit'
  | 'Mutual Fund';

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  description: string;
  referralLink: string;
  commissionRate: string; // e.g. "2.5% of loan amount" or "Flat ₹500"
  minScoreRequired?: number;
  features: string[];
}

export type LeadStatus =
  | 'pending'        // Submitted by Agent, waiting for TL
  | 'tl_reviewed'    // Reviewed by TL, waiting for Admin
  | 'admin_verified' // Verified by Admin, sent to Bank/NBFC
  | 'bank_approved'  // Approved by bank, commission generated
  | 'rejected';      // Rejected at any level

export interface Lead {
  id: string;
  customerName: string;
  customerMobile: string;
  city: string;
  productType: ProductType;
  notes: string;
  agentId: string;
  agentName: string;
  tlId?: string;
  tlName?: string;
  status: LeadStatus;
  documentUrl?: string; // Mock filename or mock S3 path
  documentName?: string;
  commissionPaid: number;
  statusHistory: Array<{
    status: LeadStatus;
    updatedBy: string;
    updatedByRole: UserRole;
    notes: string;
    updatedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawalRequest {
  id: string;
  agentId: string;
  agentName: string;
  agentMobile: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  notes?: string;
}

export interface Wallet {
  agentId: string;
  totalEarnings: number;
  withdrawnAmount: number;
  currentBalance: number;
  transactions: Array<{
    id: string;
    type: 'credit' | 'withdrawal';
    amount: number;
    description: string;
    status: 'completed' | 'pending' | 'failed';
    date: string;
  }>;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  userId?: string; // Optional: empty means broadcast to all
  role?: UserRole; // Optional: targeted to agents or TLs
  createdAt: string;
  read?: boolean;
}

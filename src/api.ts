import { User, Product, Lead, WithdrawalRequest, Wallet, Notification, LeadStatus, ProductType, UserRole } from "./types";

const API_BASE = ""; // Relative paths will resolve to same host in both dev/prod thanks to proxy setup

export async function getAppState(): Promise<{
  users: User[];
  products: Product[];
  leads: Lead[];
  withdrawals: WithdrawalRequest[];
  wallets: Wallet[];
  notifications: Notification[];
}> {
  const res = await fetch(`${API_BASE}/api/state`);
  if (!res.ok) throw new Error("Failed to fetch state");
  return res.json();
}

export async function resetAppState(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/reset`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to reset database");
  return res.json();
}

export async function addUser(
  name: string,
  email: string,
  mobile: string,
  role: UserRole,
  tlId?: string
): Promise<User> {
  const res = await fetch(`${API_BASE}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, mobile, role, tlId }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to create user");
  }
  return res.json();
}

export async function updateKyc(
  userId: string,
  data: {
    panNumber?: string;
    aadhaarNumber?: string;
    bankAccount?: string;
    ifscCode?: string;
    action: "submit" | "approve" | "reject";
    documentName?: string;
  }
): Promise<User> {
  const res = await fetch(`${API_BASE}/api/users/${userId}/kyc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update KYC");
  }
  return res.json();
}

export async function updateUserStatus(userId: string, status: "active" | "blocked"): Promise<User> {
  const res = await fetch(`${API_BASE}/api/users/${userId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update user status");
  return res.json();
}

export async function deleteUser(userId: string): Promise<{ message: string; id: string }> {
  const res = await fetch(`${API_BASE}/api/users/${userId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete user");
  return res.json();
}

export async function saveProduct(productData: {
  id?: string;
  name?: string;
  type?: ProductType;
  description?: string;
  referralLink?: string;
  commissionRate?: string;
  minScoreRequired?: number;
  features?: string[];
  action?: "create" | "edit" | "delete";
}): Promise<any> {
  const res = await fetch(`${API_BASE}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productData),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to save product");
  }
  return res.json();
}

export async function submitLead(leadData: {
  customerName: string;
  customerMobile: string;
  city: string;
  productType: ProductType;
  notes?: string;
  agentId: string;
  documentName?: string;
}): Promise<Lead> {
  const res = await fetch(`${API_BASE}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(leadData),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to submit lead");
  }
  return res.json();
}

export async function assignLead(leadId: string, tlId: string): Promise<Lead> {
  const res = await fetch(`${API_BASE}/api/leads/${leadId}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tlId }),
  });
  if (!res.ok) throw new Error("Failed to assign lead");
  return res.json();
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  remarks: string,
  updatedByUserId: string,
  commissionAmount?: number
): Promise<Lead> {
  const res = await fetch(`${API_BASE}/api/leads/${leadId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, remarks, updatedByUserId, commissionAmount }),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to update lead status");
  }
  return res.json();
}

export async function requestWithdrawal(
  agentId: string,
  amount: number,
  remarks?: string
): Promise<{ request: WithdrawalRequest; wallet: Wallet }> {
  const res = await fetch(`${API_BASE}/api/withdrawals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, amount, remarks }),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to create withdrawal request");
  }
  return res.json();
}

export async function processWithdrawal(
  withdrawalId: string,
  action: "approve" | "reject",
  reviewerId: string,
  remarks?: string,
  utrNo?: string
): Promise<{ request: WithdrawalRequest; wallet: Wallet }> {
  const res = await fetch(`${API_BASE}/api/withdrawals/${withdrawalId}/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, reviewerId, remarks, utrNo }),
  });
  if (!res.ok) throw new Error("Failed to process withdrawal");
  return res.json();
}

export async function broadcastNotification(
  title: string,
  message: string,
  role?: UserRole,
  userId?: string
): Promise<Notification> {
  const res = await fetch(`${API_BASE}/api/notifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, message, role, userId }),
  });
  if (!res.ok) throw new Error("Failed to transmit broadcast message");
  return res.json();
}

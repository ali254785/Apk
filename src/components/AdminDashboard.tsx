import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, TrendingUp, CheckCircle, Clock, AlertTriangle, 
  XCircle, Plus, Search, FileText, ChevronDown, ChevronUp, 
  RefreshCw, Bell, DollarSign, Megaphone, UserCheck, ShieldAlert,
  Briefcase, Edit2, Trash2, Lock, Unlock, ArrowRight, UserPlus, Check, X,
  Coins
} from "lucide-react";
import { User, Product, Lead, WithdrawalRequest, Wallet, Notification, ProductType, LeadStatus, UserRole } from "../types";
import { 
  addUser, deleteUser, updateUserStatus, updateKyc, 
  saveProduct, assignLead, updateLeadStatus, processWithdrawal, 
  broadcastNotification 
} from "../api";

interface AdminDashboardProps {
  admin: User;
  allUsers: User[];
  products: Product[];
  leads: Lead[];
  withdrawals: WithdrawalRequest[];
  wallets: Wallet[];
  notifications: Notification[];
  onRefresh: () => void;
}

export default function AdminDashboard({ 
  admin, 
  allUsers, 
  products, 
  leads, 
  withdrawals, 
  wallets, 
  notifications, 
  onRefresh 
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"users" | "products" | "leads" | "withdrawals" | "broadcasts" | "reports">("users");

  // Points Basis view configuration (tied on local storage)
  const [pointsEnabled, setPointsEnabled] = useState(() => {
    return localStorage.getItem("capitalaxis_points_enabled") === "true";
  });
  const [pointsRate, setPointsRate] = useState<number>(() => {
    const saved = localStorage.getItem("capitalaxis_points_rate");
    return saved ? Number(saved) : 10; // Default conversion: 1 Point = 10 Rupees
  });

  const handleTogglePoints = (enabled: boolean) => {
    setPointsEnabled(enabled);
    localStorage.setItem("capitalaxis_points_enabled", String(enabled));
    // Trigger storage event so peer panels update instantly
    window.dispatchEvent(new Event("storage"));
  };

  const handlePointsRateChange = (rate: number) => {
    setPointsRate(rate);
    localStorage.setItem("capitalaxis_points_rate", String(rate));
    // Trigger storage event so peer panels update instantly
    window.dispatchEvent(new Event("storage"));
  };

  // Synchronize dynamic updates across different panels (e.g. impersonation changes)
  React.useEffect(() => {
    const syncSettings = () => {
      setPointsEnabled(localStorage.getItem("capitalaxis_points_enabled") === "true");
      const savedRate = localStorage.getItem("capitalaxis_points_rate");
      if (savedRate) {
        setPointsRate(Number(savedRate));
      }
    };
    window.addEventListener("storage", syncSettings);
    return () => window.removeEventListener("storage", syncSettings);
  }, []);

  const formatValue = (amount: number) => {
    if (pointsEnabled) {
      const pts = amount / pointsRate;
      return `${pts.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })} PTS`;
    }
    return `₹${amount.toLocaleString()}`;
  };

  const formatCommissionRate = (rateStr: string) => {
    if (!pointsEnabled) return rateStr;
    const regex = /₹\s?([\d,]+)/g;
    return rateStr.replace(regex, (match, numStr) => {
      const num = parseFloat(numStr.replace(/,/g, ""));
      if (!isNaN(num)) {
        const pts = num / pointsRate;
        return `${pts.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })} PTS`;
      }
      return match;
    });
  };
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "tl" | "agent">("all");
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>("all");
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);

  // User Onboarding Form State
  const [onboardingRole, setOnboardingRole] = useState<UserRole>("tl");
  const [onboardName, setOnboardName] = useState("");
  const [onboardEmail, setOnboardEmail] = useState("");
  const [onboardMobile, setOnboardMobile] = useState("");
  const [onboardTLId, setOnboardTLId] = useState("");
  const [onboardSuccess, setOnboardSuccess] = useState("");
  const [onboardError, setOnboardError] = useState("");
  const [showOnboardModal, setShowOnboardModal] = useState(false);

  // KYC Audit State
  const [auditingUser, setAuditingUser] = useState<User | null>(null);

  // Product Add/Edit State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [prodName, setProdName] = useState("");
  const [prodType, setProdType] = useState<ProductType>("Credit Card");
  const [prodDesc, setProdDesc] = useState("");
  const [prodLink, setProdLink] = useState("");
  const [prodPayout, setProdPayout] = useState("");
  const [prodMinScore, setProdMinScore] = useState("");
  const [prodError, setProdError] = useState("");

  // Lead Assign & Action State
  const [assigningLead, setAssigningLead] = useState<Lead | null>(null);
  const [assignTLId, setAssignTLId] = useState("");
  
  const [updatingLead, setUpdatingLead] = useState<Lead | null>(null);
  const [newLeadStatus, setNewLeadStatus] = useState<LeadStatus>("admin_verified");
  const [leadRemarks, setLeadRemarks] = useState("");
  const [finalCommission, setFinalCommission] = useState("");

  // Payout/Withdrawal Modal State
  const [processingWithdrawalReq, setProcessingWithdrawalReq] = useState<WithdrawalRequest | null>(null);
  const [withdrawalAction, setWithdrawalAction] = useState<"approve" | "reject">("approve");
  const [utrNumber, setUtrNumber] = useState("");
  const [withdrawalRemarks, setWithdrawalRemarks] = useState("");

  // Communication Broadcast form State
  const [bcTitle, setBcTitle] = useState("");
  const [bcMessage, setBcMessage] = useState("");
  const [bcRole, setBcRole] = useState<"all" | UserRole>("all");
  const [bcSuccess, setBcSuccess] = useState("");

  // Filtered Lists
  const filteredUsers = allUsers.filter(u => {
    if (userRoleFilter === "all") return u.role !== "admin";
    return u.role === userRoleFilter;
  });

  const filteredLeads = leads.filter(l => {
    if (leadStatusFilter === "all") return true;
    return l.status === leadStatusFilter;
  });

  // Calculate General overview metrics
  const totalLeads = leads.length;
  const verifiedLeadsCount = leads.filter(l => l.status === "admin_verified" || l.status === "bank_approved").length;
  const pendingLeadsCount = leads.filter(l => l.status === "pending" || l.status === "tl_reviewed").length;
  const payoutPendingSum = withdrawals.filter(w => w.status === "pending").reduce((acc, current) => acc + current.amount, 0);
  const payoutDisbursedSum = withdrawals.filter(w => w.status === "approved").reduce((acc, current) => acc + current.amount, 0);

  // Manage Onboard users
  const handleOnboardUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardSuccess("");
    setOnboardError("");

    if (!onboardName || !onboardEmail || !onboardMobile) {
      setOnboardError("Please fill out Name, Email, and Mobile numbers.");
      return;
    }

    try {
      await addUser(
        onboardName, 
        onboardEmail, 
        onboardMobile, 
        onboardingRole, 
        onboardingRole === "agent" && onboardTLId ? onboardTLId : undefined
      );
      setOnboardSuccess(`Successfully registered ${onboardName} as an authorized ${onboardingRole.toUpperCase()}!`);
      setOnboardName("");
      setOnboardEmail("");
      setOnboardMobile("");
      setOnboardTLId("");
      onRefresh();
    } catch (err: any) {
      setOnboardError(err.message || "Failed to onboard profile user");
    }
  };

  // User Activation blocker
  const handleToggleUserStatus = async (user: User) => {
    const nextStatus = user.status === "active" ? "blocked" : "active";
    if (confirm(`Are you sure you want to change status of ${user.name} to ${nextStatus.toUpperCase()}?`)) {
      try {
        await updateUserStatus(user.id, nextStatus);
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // User Deletion
  const handleDeleteUserProfile = async (user: User) => {
    if (confirm(`CRITICAL: Are you sure you want to completely purge user account ${user.name}? This action is irreversible.`)) {
      try {
        await deleteUser(user.id);
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // KYC Management
  const handleKycAuditSubmit = async (userId: string, action: "approve" | "reject") => {
    if (confirm(`Do you want to ${action.toUpperCase()} the KYC files for this agent?`)) {
      try {
        await updateKyc(userId, { action });
        setAuditingUser(null);
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Product Actions
  const handleSaveProductForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdError("");

    if (!prodName || !prodPayout) {
      setProdError("Please include Name and Commission yield payouts.");
      return;
    }

    try {
      await saveProduct({
        id: editingProduct?.id || undefined,
        name: prodName,
        type: prodType,
        description: prodDesc,
        referralLink: prodLink || undefined,
        commissionRate: prodPayout,
        minScoreRequired: prodMinScore ? Number(prodMinScore) : undefined,
        action: editingProduct ? "edit" : "create"
      });
      setShowProductModal(false);
      setEditingProduct(null);
      setProdName("");
      setProdDesc("");
      setProdLink("");
      setProdPayout("");
      setProdMinScore("");
      onRefresh();
    } catch (err: any) {
      setProdError(err.message || "Failed to catalog product");
    }
  };

  // Product purging
  const handleDeleteProduct = async (product: Product) => {
    if (confirm(`Are you sure you want to purge product portfolio: ${product.name}?`)) {
      try {
        await saveProduct({ id: product.id, action: "delete" });
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Lead Assign handling
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningLead || !assignTLId) return;

    try {
      await assignLead(assigningLead.id, assignTLId);
      setAssigningLead(null);
      setAssignTLId("");
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Lead Status tracking transitions
  const handleLeadStatusSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingLead) return;

    try {
      await updateLeadStatus(
        updatingLead.id, 
        newLeadStatus, 
        leadRemarks, 
        admin.id, 
        newLeadStatus === "bank_approved" && finalCommission ? Number(finalCommission) : undefined
      );
      setUpdatingLead(null);
      setLeadRemarks("");
      setFinalCommission("");
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Process payouts
  const handleWithdrawalProcessSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processingWithdrawalReq) return;

    try {
      await processWithdrawal(
        processingWithdrawalReq.id, 
        withdrawalAction, 
        admin.id, 
        withdrawalRemarks, 
        withdrawalAction === "approve" ? utrNumber : undefined
      );
      setProcessingWithdrawalReq(null);
      setUtrNumber("");
      setWithdrawalRemarks("");
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Notification Broadcast
  const handleBcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBcSuccess("");

    if (!bcTitle || !bcMessage) {
      alert("Broadcast alert needs Title and Message elements.");
      return;
    }

    try {
      await broadcastNotification(
        bcTitle, 
        bcMessage, 
        bcRole === "all" ? undefined : (bcRole as UserRole)
      );
      setBcSuccess("Broadcast notice successfully dispatched to targeting distribution feeds.");
      setBcTitle("");
      setBcMessage("");
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusStyle = (status: LeadStatus) => {
    switch(status) {
      case "pending": return "bg-amber-100 text-amber-800 border-amber-20 border";
      case "tl_reviewed": return "bg-blue-105 bg-blue-100 text-blue-800 border-blue-200 border";
      case "admin_verified": return "bg-indigo-100 text-indigo-805 border-indigo-20 border text-indigo-800";
      case "bank_approved": return "bg-emerald-100 text-emerald-805 border-emerald-250 border text-emerald-800 font-bold";
      case "rejected": return "bg-rose-105 bg-rose-100 text-rose-800 border-rose-200 border";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)] bg-slate-50 font-sans" id="admin-workspace">
      {/* Control Navigation rail Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col justify-between py-6 px-4" id="admin-sidebar">
        <div>
          <div className="px-3 py-2 mb-6">
            <span className="text-[10px] uppercase tracking-widest text-teal-400 font-mono font-bold bg-slate-800 px-2 py-0.5 rounded">CEO Super Admin</span>
            <h2 className="text-lg font-bold font-display mt-2 text-white truncate">{admin.name}</h2>
            <p className="text-xs text-slate-400 font-mono truncate">{admin.email}</p>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("users")}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "users" ? "bg-teal-600 text-white font-semibold" : "text-slate-305 text-slate-305 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>User Registry / KYC</span>
            </button>

            <button
              onClick={() => setActiveTab("products")}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "products" ? "bg-teal-600 text-white font-semibold" : "text-slate-305 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Manage Products</span>
            </button>

            <button
              onClick={() => setActiveTab("leads")}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                activeTab === "leads" ? "bg-teal-600 text-white font-semibold" : "text-slate-305 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Direct Sales Workflows</span>
              {pendingLeadsCount > 0 && (
                <span className="absolute right-4 top-3 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {pendingLeadsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("withdrawals")}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                activeTab === "withdrawals" ? "bg-teal-600 text-white font-semibold" : "text-slate-305 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Financial Payouts</span>
              {withdrawals.filter(w=>w.status === 'pending').length > 0 && (
                <span className="absolute right-4 top-3 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {withdrawals.filter(w=>w.status === 'pending').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("broadcasts")}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "broadcasts" ? "bg-teal-600 text-white font-semibold" : "text-slate-305 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Megaphone className="w-4 h-4" />
              <span>Broadcast Notice</span>
            </button>
          </nav>
        </div>

        {/* Global Stats bar */}
        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
          <p className="text-[10px] font-mono text-teal-400 uppercase tracking-widest font-bold">Consolidated Cashouts</p>
          <div className="text-xs text-slate-300">
            <p>Uncleared: <span className="font-mono text-amber-400">{formatValue(payoutPendingSum)}</span></p>
            <p className="mt-1">Released UTR: <span className="font-mono text-emerald-400">{formatValue(payoutDisbursedSum)}</span></p>
          </div>
        </div>
      </aside>

      {/* Main interface pane */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto space-y-6" id="admin-workspace-pane">
        
        {/* Points Basis View Mode Toggle */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-white shadow-md border border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="bg-teal-500/20 text-teal-400 p-2.5 rounded-xl border border-teal-500/10">
              <Coins className="w-5.5 h-5.5" />
            </div>
            <div>
              <h4 className="text-sm font-bold font-display tracking-tight">Commission View Basis</h4>
              <p className="text-xs text-indigo-200 mt-0.5">Choose whether to view all global payout rates, agent wallets, and settlements in Rupees or reward Points.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="bg-slate-950/70 rounded-xl p-1 flex border border-slate-800 shrink-0">
              <button
                onClick={() => handleTogglePoints(false)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${!pointsEnabled ? "bg-teal-600 text-white shadow" : "text-indigo-200 hover:text-white"}`}
              >
                Rupee Basis (₹)
              </button>
              <button
                onClick={() => handleTogglePoints(true)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${pointsEnabled ? "bg-teal-600 text-white shadow" : "text-indigo-200 hover:text-white"}`}
              >
                Points Basis (PTS)
              </button>
            </div>
            {pointsEnabled && (
              <div className="flex items-center space-x-1.5 text-xs bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-800 font-mono">
                <span className="text-indigo-300">1 PTS =</span>
                <select 
                  value={pointsRate} 
                  onChange={(e) => handlePointsRateChange(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-800 rounded-md py-0.5 px-1.5 text-emerald-400 font-bold focus:outline-none focus:ring-1 focus:ring-teal-505"
                >
                  <option value={1}>₹1</option>
                  <option value={5}>₹5</option>
                  <option value={10}>₹10</option>
                  <option value={100}>₹100</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          
          {/* TAB 1: User Management & KYC Audit */}
          {activeTab === "users" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              key="users"
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                  <h1 className="text-2xl font-bold font-display text-slate-805">DSA Distribution Net Registry</h1>
                  <p className="text-slate-550 text-slate-500 text-sm">Approve/Block users, verify Agent KYC documents, and monitor active leadership chains.</p>
                </div>
                <div className="flex space-x-2 shrink-0">
                  <button
                    onClick={() => setShowOnboardModal(true)}
                    className="bg-teal-650 hover:bg-teal-750 bg-teal-600 text-white px-4 py-2 rounded-xl font-semibold text-xs transition flex items-center space-x-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Onboard Official</span>
                  </button>
                  <button 
                    onClick={onRefresh}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
                    title="Refresh Registry"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Roles Selection Toggle */}
              <div className="flex space-x-2 border-b border-slate-150 pb-2">
                <button
                  type="button"
                  onClick={() => setUserRoleFilter("all")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    userRoleFilter === "all" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  All Users ({allUsers.filter(u=>u.role !== 'admin').length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter("tl")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    userRoleFilter === "tl" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Team Leaders ({allUsers.filter(u=>u.role === 'tl').length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter("agent")}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    userRoleFilter === "agent" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  DSA Agents ({allUsers.filter(u=>u.role === 'agent').length})
                </button>
              </div>

              {/* Users tables list */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto font-sans">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider font-mono">
                      <tr>
                        <th className="py-3 px-6">Profile details</th>
                        <th className="py-3 px-6">Hierarchy Role</th>
                        <th className="py-3 px-6">Channel Lead ID</th>
                        <th className="py-3 px-6">KYC Status</th>
                        <th className="py-1 px-6">Security status</th>
                        <th className="py-3 px-6 text-right">Registry Admin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map(user => {
                        const directTL = allUsers.find(u => u.id === user.tlId);
                        return (
                          <tr key={user.id} className="hover:bg-slate-50/30 transition">
                            <td className="py-4 px-6">
                              <div className="font-bold text-slate-800">{user.name}</div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5">{user.mobile} | {user.email}</div>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                user.role === 'tl' ? 'bg-indigo-50 text-indigo-700 text-xs px-2 rounded-full font-sans font-semibold' : 'bg-teal-50 text-teal-700 text-xs px-2 rounded-full font-sans font-semibold'
                              }`}>
                                {user.role === 'tl' ? 'Team Leader' : 'DSA Agent'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-slate-700 text-xs">
                              {user.role === 'agent' ? (directTL ? directTL.name : <span className="text-slate-400 italic">No TL Assigned</span>) : "N/A"}
                            </td>
                            <td className="py-4 px-6">
                              {user.kycStatus === "pending" ? (
                                <button
                                  onClick={() => setAuditingUser(user)}
                                  className="text-xs text-amber-700 bg-amber-50 border border-amber-250 py-1 px-2.5 rounded-lg font-bold flex items-center space-x-1 hover:bg-amber-100 transition animate-pulse"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-550" />
                                  <span>Review KYC</span>
                                </button>
                              ) : (
                                <span className={`px-2.5 py-0.5 rounded text-[10.5px] font-mono font-bold uppercase tracking-wide border ${
                                  user.kycStatus === 'approved' 
                                    ? 'bg-emerald-58 text-emerald-800 border-emerald-200 bg-emerald-50' 
                                    : user.kycStatus === 'rejected'
                                      ? 'bg-rose-50 text-rose-800 border-rose-220 border'
                                      : 'bg-slate-100 text-slate-500 border-slate-200 border text-[10px]'
                                }`}>
                                  {user.kycStatus === 'none' ? 'No Submissions' : user.kycStatus}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                                user.status === 'blocked' ? 'bg-red-55 px-2 bg-red-100 text-red-805' : 'bg-emerald-55 px-2 bg-emerald-100 text-emerald-800'
                              }`}>
                                {user.status === 'blocked' ? 'BLOCKED' : 'ACTIVE'}
                              </span>
                            </td>
                            <td className="py-3 px-6 text-right space-x-1 shrink-0">
                              <button
                                onClick={() => handleToggleUserStatus(user)}
                                className={`text-[11px] font-bold px-2 py-1 rounded transition ${
                                  user.status === 'blocked' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                }`}
                                title={user.status === 'blocked' ? 'Unblock user' : 'Block user'}
                              >
                                {user.status === 'blocked' ? 'Unblock' : 'Block'}
                              </button>
                              <button
                                onClick={() => handleDeleteUserProfile(user)}
                                className="p-1 text-rose-500 hover:text-rose-750 hover:bg-rose-50 rounded"
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modals for Onboarding Official */}
              {showOnboardModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-150"
                  >
                    <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-lg font-display text-slate-800">Onboard Authorized Profile</h3>
                        <p className="text-xs text-slate-500">Add TLs or independent DSA agents into CapitalAxis hierarchy.</p>
                      </div>
                      <button onClick={() => setShowOnboardModal(false)} className="text-slate-400 hover:text-slate-650">✕</button>
                    </div>

                    <form onSubmit={handleOnboardUser} className="space-y-4">
                      {onboardSuccess && <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg font-medium">{onboardSuccess}</div>}
                      {onboardError && <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg font-medium">{onboardError}</div>}

                      <div className="flex space-x-3 p-1 bg-slate-50 border border-slate-200 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setOnboardingRole("tl")}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                            onboardingRole === "tl" ? "bg-slate-900 text-white font-semibold" : "text-slate-650 hover:bg-slate-220 text-slate-600"
                          }`}
                        >
                          Team Leader (TL)
                        </button>
                        <button
                          type="button"
                          onClick={() => setOnboardingRole("agent")}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                            onboardingRole === "agent" ? "bg-slate-900 text-white font-semibold" : "text-slate-650 hover:bg-slate-220 text-slate-600"
                          }`}
                        >
                          DSA Agent
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600">Official Full Name *</label>
                          <input 
                            type="text" 
                            className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg"
                            placeholder="Sunil Dev"
                            value={onboardName}
                            onChange={e => setOnboardName(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600">OTP-authorized Mobile *</label>
                          <input 
                            type="tel" 
                            maxLength={10}
                            className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg"
                            placeholder="9998887776"
                            value={onboardMobile}
                            onChange={e => setOnboardMobile(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1 block">
                        <label className="text-xs font-semibold text-slate-600">Primary E-mail *</label>
                        <input 
                          type="email" 
                          className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg"
                          placeholder="sunil@capitalaxis.in"
                          value={onboardEmail}
                          onChange={e => setOnboardEmail(e.target.value)}
                          required
                        />
                      </div>

                      {onboardingRole === "agent" && (
                        <div className="space-y-1 block">
                          <label className="text-xs font-semibold text-slate-600">Assign to Team Leader (Optional)</label>
                          <select 
                            className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg"
                            value={onboardTLId}
                            onChange={e => setOnboardTLId(e.target.value)}
                          >
                            <option value="">Direct Corporate Office Portfolio</option>
                            {allUsers.filter(u=>u.role === 'tl').map(tl => (
                              <option key={tl.id} value={tl.id}>{tl.name} ({tl.email})</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex space-x-2 pt-3 justify-end border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setShowOnboardModal(false)}
                          className="px-4 py-2 text-xs font-semibold text-slate-500 hover:underline"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="bg-teal-650 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition"
                        >
                          Onboard Profile Registry
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}

              {/* Modals for KYC review */}
              {auditingUser && auditingUser.kycDetails && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-150"
                  >
                    <div className="border-b border-slate-104 pb-3">
                      <h3 className="font-bold text-lg font-display text-slate-800">Identify Audit File</h3>
                      <p className="text-xs text-slate-500">Checking credentials uploaded by Agent <span className="font-semibold">{auditingUser.name}</span>.</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs space-y-2.5">
                      <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Uploaded Metadata</p>
                      
                      <div className="grid grid-cols-2 gap-1.5 text-slate-700">
                        <span>PAN Card Number:</span>
                        <span className="font-bold font-mono uppercase">{auditingUser.kycDetails.panNumber}</span>
                        
                        <span>Aadhaar Ident:</span>
                        <span className="font-bold font-mono">{auditingUser.kycDetails.aadhaarNumber}</span>
                        
                        <span>Bank Ledger Account:</span>
                        <span className="font-bold font-mono">{auditingUser.kycDetails.bankAccount}</span>
                        
                        <span>IFSC Branch Code:</span>
                        <span className="font-bold font-mono text-teal-800">{auditingUser.kycDetails.ifscCode}</span>
                        
                        <span>File Name:</span>
                        <span className="font-bold text-indigo-700 truncate">{auditingUser.kycDetails.documentName || "kyc_details.zip"}</span>
                      </div>
                    </div>

                    <div className="flex space-x-2 justify-end">
                      <button
                        onClick={() => setAuditingUser(null)}
                        className="px-4 py-2 text-xs text-slate-500 hover:underline font-semibold mr-auto"
                      >
                        Cancel Audit
                      </button>
                      
                      <button
                        onClick={() => handleKycAuditSubmit(auditingUser.id, "reject")}
                        className="bg-rose-50 border border-rose-150 text-rose-650 hover:bg-rose-100 px-4 py-2 rounded-xl text-xs font-bold transition"
                      >
                        Decline KYC
                      </button>

                      <button
                        onClick={() => handleKycAuditSubmit(auditingUser.id, "approve")}
                        className="bg-emerald-650 bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-xl text-xs font-bold transition"
                      >
                        Approve & Verify KYC
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

            </motion.div>
          )}

          {/* TAB 2: Product Management */}
          {activeTab === "products" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              key="products"
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                  <h1 className="text-2xl font-bold font-display text-slate-805">Product Commission Portfolio</h1>
                  <p className="text-slate-550 text-slate-500 text-sm">Add loan streams, set direct payout commissions, and specify referral tracking urls.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setProdName("");
                    setProdDesc("");
                    setProdLink("");
                    setProdPayout("");
                    setProdMinScore("");
                    setShowProductModal(true);
                  }}
                  className="bg-teal-650 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-semibold text-xs transition flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Catalog Financial Schema</span>
                </button>
              </div>

              {/* Catalog list */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(prod => (
                  <div key={prod.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">{prod.type}</span>
                        {prod.minScoreRequired && <span className="font-mono text-[10px] text-slate-400 bg-slate-50 border border-slate-100 rounded px-1">CIBIL {prod.minScoreRequired}+</span>}
                      </div>
                      <h3 className="font-bold text-md text-slate-800 font-display line-clamp-1">{prod.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2">{prod.description}</p>
                    </div>

                    <div className="bg-teal-50 border border-teal-100 rounded-xl p-3">
                      <span className="text-[10px] font-mono text-slate-405 text-slate-500 block uppercase tracking-widest leading-none font-bold">Agent Payout Rate</span>
                      <span className="text-sm font-bold text-teal-850 font-mono mt-0.5 inline-block text-teal-800">{formatCommissionRate(prod.commissionRate)}</span>
                    </div>

                    <div className="text-xs text-slate-400 truncate font-mono">
                      <span>Referral Link: {prod.referralLink}</span>
                    </div>

                    <div className="flex space-x-1 border-t border-slate-100 pt-3">
                      <button
                        onClick={() => {
                          setEditingProduct(prod);
                          setProdName(prod.name);
                          setProdDesc(prod.description);
                          setProdLink(prod.referralLink);
                          setProdPayout(prod.commissionRate);
                          setProdMinScore(prod.minScoreRequired ? String(prod.minScoreRequired) : "");
                          setProdType(prod.type);
                          setShowProductModal(true);
                        }}
                        className="flex-1 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 flex items-center justify-center space-x-1 capitalize text-xs font-bold py-2 rounded-xl transition"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Edit catalog</span>
                      </button>

                      <button
                        onClick={() => handleDeleteProduct(prod)}
                        className="bg-rose-50 text-rose-650 hover:bg-rose-100 p-2.5 rounded-xl border border-rose-100 transition"
                      >
                        <Trash2 className="w-4 h-4 text-rose-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Catalog Modal Forms */}
              {showProductModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-150"
                  >
                    <div className="border-b border-slate-100 pb-3 flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg font-display text-slate-805">{editingProduct ? "Revise Financial Catalog" : "Add Direct Loan Stream"}</h3>
                        <p className="text-xs text-slate-500">Provide direct rates and cookie referral URLs for tracking Agent performance.</p>
                      </div>
                      <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-slate-655 text-lg font-mono">✕</button>
                    </div>

                    <form onSubmit={handleSaveProductForm} className="space-y-4">
                      {prodError && <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg font-medium">{prodError}</div>}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600">Product Stream Title *</label>
                          <input 
                            type="text" 
                            className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg"
                            placeholder="Axis Bank Digital Current Account"
                            value={prodName}
                            onChange={e => setProdName(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600">Category Type *</label>
                          <select 
                            className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg focus:outline-none"
                            value={prodType}
                            onChange={e => setProdType(e.target.value as ProductType)}
                          >
                            <option value="Credit Card">Credit Card</option>
                            <option value="Personal Loan">Personal Loan</option>
                            <option value="Instant Loan">Instant Loan</option>
                            <option value="Home Loan">Home Loan</option>
                            <option value="Car Loan">Car Loan</option>
                            <option value="Business Loan">Business Loan</option>
                            <option value="Savings Account">Savings Account</option>
                            <option value="Current Account">Current Account</option>
                            <option value="Demat Account">Demat Account</option>
                            <option value="Insurance">Insurance</option>
                            <option value="Bank CSP">Bank CSP</option>
                            <option value="PM Surya Rooftop">PM Surya Rooftop</option>
                            <option value="Fixed Deposit">Fixed Deposit</option>
                            <option value="Mutual Fund">Mutual Fund</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600">Payout rate details *</label>
                          <input 
                            type="text" 
                            className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg font-light placeholder-slate-400"
                            placeholder="₹5,000 Flat or 1.5% of Loan size"
                            value={prodPayout}
                            onChange={e => setProdPayout(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600">Min CIBIL Threshold Score</label>
                          <input 
                            type="number" 
                            className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg font-mono"
                            placeholder="700"
                            value={prodMinScore}
                            onChange={e => setProdMinScore(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600">HQ Tracking Partnership Link *</label>
                        <input 
                          type="url" 
                          className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg font-mono focus:outline-none"
                          placeholder="https://www.axisbank.com/partners?referral=CAPAXIS"
                          value={prodLink}
                          onChange={e => setProdLink(e.target.value)}
                        />
                        <span className="text-[10px] text-slate-400">Standard redirect linkage cookie track set parameters on bank server levels.</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600">Brief Description details</label>
                        <textarea 
                          rows={3}
                          className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg focus:outline-none"
                          placeholder="Detail features such as milestone rewards, zero joining fees, or quick cash sweep parameters..."
                          value={prodDesc}
                          onChange={e => setProdDesc(e.target.value)}
                        />
                      </div>

                      <div className="flex space-x-2 justify-end pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setShowProductModal(false)}
                          className="px-4 py-2 text-xs font-semibold text-slate-500 hover:underline"
                        >
                          Cancel Catalog
                        </button>
                        <button
                          type="submit"
                          className="bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition"
                        >
                          Save Product Registry
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}

            </motion.div>
          )}

          {/* TAB 3: Lead Workflow tracker / Management */}
          {activeTab === "leads" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              key="leads"
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                  <h1 className="text-2xl font-bold font-display text-slate-805">Global Lead Workflow</h1>
                  <p className="text-slate-550 text-slate-500 text-sm">Review pipeline transitions. Bank approvals generate wallet earnings automatically.</p>
                </div>
                <button 
                  onClick={onRefresh}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition shrink-0"
                >
                  <RefreshCw className="w-4 h-4 inline" />
                </button>
              </div>

              {/* Status workflow query filters */}
              <div className="flex space-x-2 border-b border-slate-150 pb-2 overflow-x-auto pb-1 max-w-full">
                {["all", "pending", "tl_reviewed", "admin_verified", "bank_approved", "rejected"].map(st => (
                  <button
                    key={st}
                    onClick={() => setLeadStatusFilter(st)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors ${
                      leadStatusFilter === st ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {st === 'all' ? "All Leads" : st.replace("_", " ").toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Table */}
              {filteredLeads.length === 0 ? (
                <div className="text-center p-16 bg-white border border-slate-100 rounded-2xl space-y-2">
                  <p className="text-slate-400 text-sm">No lead files match designated filter status.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase tracking-wider font-mono">
                        <tr>
                          <th className="py-4 px-6">Customer Name</th>
                          <th className="py-4 px-6">Assigned Product</th>
                          <th className="py-4 px-6">DSA Submitter</th>
                          <th className="py-4 px-6">Team Leader Reviewer</th>
                          <th className="py-4 px-6">Workflow Status</th>
                          <th className="py-4 px-6 text-right">Escalations Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLeads.map(l => {
                          const isExpanded = expandedLeadId === l.id;
                          return (
                            <React.Fragment key={l.id}>
                              <tr className="hover:bg-slate-50/20 transition">
                                <td className="py-4 px-6 text-slate-800 font-display font-semibold">
                                  <span>{l.customerName}</span>
                                  <div className="text-xs text-slate-400 font-mono mt-0.5">{l.customerMobile} | {l.city}</div>
                                </td>
                                <td className="py-4 px-6 text-slate-700 font-medium">
                                  {l.productType}
                                </td>
                                <td className="py-4 px-6 text-slate-650 text-xs">
                                  {l.agentName}
                                </td>
                                <td className="py-4 px-6 text-slate-650 text-xs">
                                  {l.tlName || (
                                    <button
                                      onClick={() => setAssigningLead(l)}
                                      className="text-xs text-indigo-705 font-bold hover:underline"
                                    >
                                      Assign TL
                                    </button>
                                  )}
                                </td>
                                <td className="py-4 px-6">
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold leading-none ${getStatusStyle(l.status)}`}>
                                    {l.status.replace("_", " ")}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-right space-x-1 shrink-0">
                                  <button
                                    onClick={() => setExpandedLeadId(isExpanded ? null : l.id)}
                                    className="text-xs text-slate-400 hover:text-slate-700 font-semibold hover:underline"
                                  >
                                    Timeline
                                  </button>
                                  {l.status !== "bank_approved" && l.status !== "rejected" && (
                                    <button
                                      onClick={() => {
                                        setUpdatingLead(l);
                                        setNewLeadStatus(l.status === "tl_reviewed" ? "admin_verified" : "bank_approved");
                                      }}
                                      className="bg-teal-650 bg-teal-600 text-white font-semibold text-[11px] px-2.5 py-1 rounded-lg transition"
                                    >
                                      Clear Status
                                    </button>
                                  )}
                                </td>
                              </tr>

                              {/* Expansion details list */}
                              <tr className={isExpanded ? "bg-slate-50" : "hidden"}>
                                <td colSpan={6} className="py-5 px-8">
                                  <div className="border-l-2 border-teal-500 pl-6 ml-2 space-y-3.5 py-1 max-w-2xl">
                                    <h4 className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">Status History Timeline</h4>
                                    {l.statusHistory.map((hist, i) => (
                                      <div key={i} className="space-y-1 relative">
                                        <div className="absolute -left-[31px] top-1.5 w-2 h-2 rounded-full bg-teal-500 border border-white" />
                                        <div className="text-xs text-slate-700 flex space-x-2 items-baseline">
                                          <span className="font-bold">{hist.updatedBy}</span>
                                          <span className="text-[10px] font-mono italic text-slate-400 uppercase">({hist.updatedByRole})</span>
                                          <span className="text-[10px] text-slate-400 font-mono">{new Date(hist.updatedAt).toLocaleString()}</span>
                                        </div>
                                        <div className="text-xs text-slate-600 bg-white border border-slate-100 p-2.5 rounded font-light shadow-xs">
                                          <span className="text-[9px] font-mono bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 text-slate-700 font-bold mr-2 uppercase">{hist.status}</span>
                                          {hist.notes}
                                        </div>
                                      </div>
                                    ))}

                                    {/* Upload files verify */}
                                    {l.documentName && (
                                      <div className="pt-2 border-t border-slate-200 mt-4 leading-none">
                                        <span className="text-[10px] font-bold text-slate-405 uppercase font-mono">Agent Attachment File:</span>
                                        <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded border border-slate-150 mt-1 shadow-xs">
                                          <FileText className="w-4 h-4 text-slate-400" />
                                          <span className="text-xs font-mono text-slate-700 truncate">{l.documentName}</span>
                                          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold uppercase ml-auto">Verified</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Modals for assignments */}
              {assigningLead && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-205"
                  >
                    <div className="border-b border-slate-100 pb-3 flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg font-display text-slate-805 text-slate-800">Assign Oversight Leader</h3>
                        <p className="text-xs text-slate-500">Assign customer file <span className="font-semibold">{assigningLead.customerName}</span> to a Team Leader.</p>
                      </div>
                      <button onClick={() => setAssigningLead(null)} className="text-slate-400 hover:text-slate-655 text-lg">✕</button>
                    </div>

                    <form onSubmit={handleAssignSubmit} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600">Select Team Leader *</label>
                        <select 
                          className="w-full text-sm bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:outline-none"
                          value={assignTLId}
                          onChange={e => setAssignTLId(e.target.value)}
                          required
                        >
                          <option value="">Choose Leader...</option>
                          {allUsers.filter(u=>u.role === 'tl').map(tl => (
                            <option key={tl.id} value={tl.id}>{tl.name} ({tl.email})</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                        <button type="button" onClick={() => setAssigningLead(null)} className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:underline">Cancel</button>
                        <button type="submit" className="bg-indigo-650 bg-indigo-650 hover:bg-order-700 bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition">Assign Lead</button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}

              {/* Modals for Status transitions step */}
              {updatingLead && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-150"
                  >
                    <div className="border-b border-slate-100 pb-3 flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg font-display text-slate-805 text-slate-800">Clear Lead Pipeline</h3>
                        <p className="text-xs text-slate-500">Upgrading workflow state for customer <span className="font-semibold">{updatingLead.customerName}</span>.</p>
                      </div>
                      <button onClick={() => setUpdatingLead(null)} className="text-slate-400 hover:text-slate-655 text-lg">✕</button>
                    </div>

                    <form onSubmit={handleLeadStatusSub} className="space-y-4">
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Current pipeline state</label>
                          <p className="font-bold text-xs uppercase text-slate-705 leading-none">{updatingLead.status}</p>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Desired pipeline state *</label>
                          <select 
                            className="w-full text-xs font-bold uppercase p-1.5 bg-white border border-slate-150 rounded"
                            value={newLeadStatus}
                            onChange={e => setNewLeadStatus(e.target.value as LeadStatus)}
                            required
                          >
                            <option value="admin_verified">Admin Verified</option>
                            <option value="bank_approved">Bank Disbursed & Settled</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                      </div>

                      {/* Prompts for Final Commission amounts on Bank Approval */}
                      {newLeadStatus === "bank_approved" && (
                        <div className="space-y-1.5 p-4 bg-emerald-50 border border-emerald-150 rounded-xl">
                          <label className="text-xs font-bold text-emerald-800 flex items-center"><Check className="w-4.5 h-4.5 mr-1" /> Set Final Earned Commission (INR) *</label>
                          <input 
                            type="number" 
                            className="w-full text-sm bg-white border border-emerald-200 p-2 rounded-lg font-mono placeholder-slate-400"
                            placeholder="e.g. 5000"
                            value={finalCommission}
                            onChange={e => setFinalCommission(e.target.value)}
                            required
                          />
                          <span className="text-[10px] text-emerald-700 block leading-tight">Proceeding triggers instant Wallet Credit (credit transactions ledger) for Agent "{updatingLead.agentName}".</span>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-650">Compliance Remarks & Audit Logs *</label>
                        <textarea
                          rows={4}
                          className="w-full text-sm bg-slate-50 border border-slate-200 p-3 rounded-lg focus:outline-none"
                          placeholder="Provide reasons for rejection, or SBI partner reference codes and disbursement timestamps..."
                          value={leadRemarks}
                          onChange={e => setLeadRemarks(e.target.value)}
                          required
                        />
                      </div>

                      <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                        <button type="button" onClick={() => setUpdatingLead(null)} className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:underline">Cancel</button>
                        <button type="submit" className="bg-teal-655 bg-teal-600 hover:bg-teal-715 text-white text-xs font-bold px-4 py-2 rounded-xl transition">Publish transition</button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}

            </motion.div>
          )}

          {/* TAB 4: Withdrawal / Cashout Requests */}
          {activeTab === "withdrawals" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              key="withdrawals"
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                  <h1 className="text-2xl font-bold font-display text-slate-805">Release Ledger Cashouts</h1>
                  <p className="text-slate-550 text-slate-500 text-sm">Verify and process Agent withdrawal requests. Confirm transaction reference numbers.</p>
                </div>
                <button 
                  onClick={onRefresh}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition shrink-0"
                >
                  <RefreshCw className="w-4 h-4 inline" />
                </button>
              </div>

              {withdrawals.length === 0 ? (
                <div className="text-center p-16 bg-white border border-slate-100 rounded-2xl text-slate-400 text-sm">
                  No payout / withdrawal requests are drafted in state.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase tracking-wider font-mono">
                        <tr>
                          <th className="py-4 px-6">Requester Agent</th>
                          <th className="py-4 px-6">Cashout Amount</th>
                          <th className="py-4 px-6 font-mono">Timestamp</th>
                          <th className="py-4 px-6">Clearing Remarks</th>
                          <th className="py-4 px-6">Audit Status</th>
                          <th className="py-4 px-6 text-right">Registry Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {withdrawals.slice().sort((a,b)=>new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()).map(w => (
                          <tr key={w.id} className="hover:bg-slate-50/10 transition">
                            <td className="py-4 px-6">
                              <div className="font-bold text-slate-800 font-display">{w.agentName}</div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5">{w.agentMobile}</div>
                            </td>
                            <td className="py-4 px-6 text-slate-800 font-mono font-bold">
                              {formatValue(w.amount)}
                            </td>
                            <td className="py-4 px-6 text-slate-450 text-[11px] font-mono">
                              {new Date(w.requestedAt).toLocaleString()}
                            </td>
                            <td className="py-4 px-6 text-xs text-slate-500 max-w-[150px] truncate" title={w.notes}>
                              {w.notes}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                                w.status === 'approved' 
                                  ? 'bg-emerald-58 text-emerald-800 border bg-emerald-50 border-emerald-200' 
                                  : w.status === 'pending'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
                                    : 'bg-rose-50 text-rose-800 border border-rose-220 font-bold'
                              }`}>
                                {w.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              {w.status === "pending" ? (
                                <button
                                  onClick={() => {
                                    setProcessingWithdrawalReq(w);
                                    setWithdrawalAction("approve");
                                  }}
                                  className="bg-teal-650 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-1 px-2.5 rounded-lg transition"
                                >
                                  Process Cashout
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Disbursement settled</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Modals for Payout audits */}
              {processingWithdrawalReq && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-150"
                  >
                    <div className="border-b border-slate-100 pb-3 flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg font-display text-slate-805 text-slate-800">Clear Ledger Funds</h3>
                        <p className="text-xs text-slate-500">Processing withdrawal for <span className="font-semibold">{processingWithdrawalReq.agentName}</span> of <span className="font-bold text-teal-700 font-mono">{formatValue(processingWithdrawalReq.amount)}</span>.</p>
                      </div>
                      <button onClick={() => setProcessingWithdrawalReq(null)} className="text-slate-400 hover:text-slate-655 text-lg">✕</button>
                    </div>

                    <form onSubmit={handleWithdrawalProcessSub} className="space-y-4">
                      
                      <div className="flex space-x-3 p-1 bg-slate-50 border border-slate-205 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setWithdrawalAction("approve")}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                            withdrawalAction === "approve" 
                              ? "bg-emerald-600 text-white shadow-xs font-bold" 
                              : "text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          Approve and Release Cash
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setWithdrawalAction("reject")}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                            withdrawalAction === "reject" 
                              ? "bg-rose-605 text-white shadow-xs bg-rose-600 font-bold" 
                              : "text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          Reject Request
                        </button>
                      </div>

                      {withdrawalAction === "approve" && (
                        <div className="space-y-1 block">
                          <label className="text-xs font-semibold text-slate-600">Razorpay Payout UTR / Ref Transaction Number *</label>
                          <input 
                            type="text" 
                            className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg font-mono"
                            placeholder="e.g. UTIB000192892A"
                            value={utrNumber}
                            onChange={e => setUtrNumber(e.target.value.toUpperCase())}
                            required
                          />
                          <span className="text-[10px] text-slate-400 font-light block leading-none pt-1">Provide UTR logs. The agent's transaction record ledger will update to complete.</span>
                        </div>
                      )}

                      <div className="space-y-1 block">
                        <label className="text-xs font-semibold text-slate-600">Audit Remarks / Decline logs *</label>
                        <textarea
                          rows={3}
                          className="w-full text-sm bg-slate-50 border border-slate-205 p-3 rounded-lg focus:outline-none placeholder-slate-400"
                          placeholder="Provide approval comments and check clear timelines, or reason for cash reject refund..."
                          value={withdrawalRemarks}
                          onChange={e => setWithdrawalRemarks(e.target.value)}
                          required
                        />
                      </div>

                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono text-[10.5px]">
                        <span className="text-xs font-bold block text-slate-700">Audit Partner Banking Coordinates:</span>
                        {/* We audit from allUsers registry */}
                        {allUsers.find(u=>u.id === processingWithdrawalReq.agentId)?.kycDetails ? (
                          <ul className="list-disc list-inside space-y-0.5 mt-1">
                            <li>Bank Account: {allUsers.find(u=>u.id === processingWithdrawalReq.agentId)?.kycDetails?.bankAccount}</li>
                            <li>IFSC Code: {allUsers.find(u=>u.id === processingWithdrawalReq.agentId)?.kycDetails?.ifscCode}</li>
                            <li>PAN Card Number: {allUsers.find(u=>u.id === processingWithdrawalReq.agentId)?.kycDetails?.panNumber}</li>
                          </ul>
                        ) : (
                          <p className="text-rose-600 font-bold mt-1">WARNING: KYC Coordinates NOT Approved in Profile database!</p>
                        )}
                      </div>

                      <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                        <button type="button" onClick={() => setProcessingWithdrawalReq(null)} className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:underline">Cancel review</button>
                        <button type="submit" className={`text-xs font-bold px-4 py-2 rounded-xl text-white transition ${
                          withdrawalAction === 'approve' ? 'bg-emerald-650 bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                        }`}>{withdrawalAction === "approve" ? "Release payout bank" : "Decline request"}</button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}

            </motion.div>
          )}

          {/* TAB 5: Announcements Broadcast notifications */}
          {activeTab === "broadcasts" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              key="broadcast"
              className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6"
            >
              <div className="text-center pb-4 border-b border-indigo-50">
                <h1 className="text-2xl font-bold font-display text-slate-805">Global Broadcast Console</h1>
                <p className="text-slate-500 text-xs">Transmit push notifications regarding campaign deadlines, new bank partners, or bonus rates.</p>
              </div>

              <form onSubmit={handleBcSubmit} className="space-y-4">
                {bcSuccess && <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg font-medium text-center">{bcSuccess}</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Announcement Title *</label>
                    <input 
                      type="text" 
                      className="w-full text-sm bg-slate-50 border border-slate-205 px-3 py-2 rounded-lg focus:outline-none"
                      placeholder="Mega Bonus campaign weekend!"
                      value={bcTitle}
                      onChange={e => setBcTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Targeting Distribution Tree *</label>
                    <select 
                      className="w-full text-sm bg-slate-50 border border-slate-205 px-3 py-2 rounded-lg"
                      value={bcRole}
                      onChange={e => setBcRole(e.target.value as any)}
                    >
                      <option value="all">Everyone (All Agent Net)</option>
                      <option value="tl">Team Leaders (TLs) only</option>
                      <option value="agent">DSA Agents only</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-650">Broadcast Alert Copy *</label>
                  <textarea 
                    rows={5}
                    className="w-full text-sm bg-slate-50 border border-slate-205 p-3 rounded-lg focus:outline-none"
                    placeholder="Provide full announcement details here. Disburses alerts directly to users personal terminal panels..."
                    value={bcMessage}
                    onChange={e => setBcMessage(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 border border-slate-100 hover:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-xl transition flex items-center justify-center space-x-1.5"
                >
                  <Megaphone className="w-4 h-4 text-teal-400" />
                  <span>Push Broadcast Update</span>
                </button>
              </form>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  TrendingUp, Wallet, CheckCircle, Clock, AlertTriangle, 
  XCircle, ExternalLink, Share2, Copy, FileText, Send, 
  Bell, ArrowDownLeft, ArrowUpRight, Search, Plus, 
  ChevronDown, ChevronUp, UserCheck, ShieldAlert, CheckSquare, RefreshCw,
  Coins, Award
} from "lucide-react";
import { User, Product, Lead, Wallet as WalletType, Notification, ProductType, LeadStatus } from "../types";
import { submitLead, updateKyc, requestWithdrawal } from "../api";

interface AgentDashboardProps {
  agent: User;
  products: Product[];
  leads: Lead[];
  wallet: WalletType | undefined;
  notifications: Notification[];
  onRefresh: () => void;
  allUsers: User[];
}

export default function AgentDashboard({ 
  agent, 
  products, 
  leads, 
  wallet, 
  notifications, 
  onRefresh,
  allUsers
}: AgentDashboardProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "products" | "leads" | "wallet" | "kyc" | "notifications" | "earnings_guide">("dashboard");

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
  const [submittingLead, setSubmittingLead] = useState(false);
  const [copiedProdId, setCopiedProdId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductType, setSelectedProductType] = useState<string>("All");

  // Lead submission form state
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [city, setCity] = useState("");
  const [productType, setProductType] = useState<ProductType>("Credit Card");
  const [notes, setNotes] = useState("");
  const [docName, setDocName] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formError, setFormError] = useState("");

  // KYC form state
  const [pan, setPan] = useState(agent.kycDetails?.panNumber || "");
  const [aadhaar, setAadhaar] = useState(agent.kycDetails?.aadhaarNumber || "");
  const [bankAccount, setBankAccount] = useState(agent.kycDetails?.bankAccount || "");
  const [ifsc, setIfsc] = useState(agent.kycDetails?.ifscCode || "");
  const [kycDoc, setKycDoc] = useState("");
  const [kycSuccess, setKycSuccess] = useState("");
  const [submittingKyc, setSubmittingKyc] = useState(false);

  // Withdrawal form state
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalNotes, setWithdrawalNotes] = useState("");
  const [withdrawalError, setWithdrawalError] = useState("");
  const [withdrawalSuccess, setWithdrawalSuccess] = useState("");

  // Filter leads for this agent
  const agentLeads = leads.filter(l => l.agentId === agent.id);
  const pendingLeads = agentLeads.filter(l => l.status === "pending" || l.status === "tl_reviewed" || l.status === "admin_verified");
  const approvedLeads = agentLeads.filter(l => l.status === "bank_approved");
  const rejectedLeads = agentLeads.filter(l => l.status === "rejected");

  // Notifications for this agent
  const agentNotifications = notifications.filter(n => !n.userId || n.userId === agent.id);

  // Active TL details
  const myTL = allUsers.find(u => u.id === agent.tlId);

  // Expanded lead details tracker
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);

  // Copy referral Link
  const copyLink = (link: string, prodId: string) => {
    navigator.clipboard.writeText(link);
    setCopiedProdId(prodId);
    setTimeout(() => setCopiedProdId(null), 2000);
  };

  // Build WhatsApp Share Text
  const shareWhatsApp = (product: Product) => {
    const text = `Hi, checking out financial options? I suggest the *${product.name}*! Highly recommended with excellent benefits.\nApply here: ${product.referralLink}\nReach out to me for customized financial planning!`;
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  // Submit Lead
  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!customerName || !customerMobile || !city) {
      setFormError("Please fill out all mandatory customer details.");
      return;
    }

    if (customerMobile.length < 10) {
      setFormError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setSubmittingLead(true);
    try {
      await submitLead({
        customerName,
        customerMobile,
        city,
        productType,
        notes,
        agentId: agent.id,
        documentName: docName || undefined
      });
      setFormSuccess("Customer lead submitted successfully! Your Team Leader has been notified.");
      setCustomerName("");
      setCustomerMobile("");
      setCity("");
      setNotes("");
      setDocName("");
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || "Failed to submit lead");
    } finally {
      setSubmittingLead(false);
    }
  };

  // Submit KYC
  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setKycSuccess("");
    if (!pan || !aadhaar || !bankAccount || !ifsc) {
      setFormError("All details are required to verify your KYC identity.");
      return;
    }

    setSubmittingKyc(true);
    try {
      await updateKyc(agent.id, {
        panNumber: pan,
        aadhaarNumber: aadhaar,
        bankAccount,
        ifscCode: ifsc,
        action: "submit",
        documentName: kycDoc || "verified_profile.zip"
      });
      setKycSuccess("KYC Details uploaded. Waiting for admin approval.");
      onRefresh();
    } catch (err: any) {
      setKycSuccess("");
      alert(err.message);
    } finally {
      setSubmittingKyc(false);
    }
  };

  // Submit Withdrawal Request
  const handleWithdrawalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawalError("");
    setWithdrawalSuccess("");

    if (agent.kycStatus !== "approved") {
      setWithdrawalError("Your KYC must be APPROVED by Admin to initiate wallet withdrawals.");
      return;
    }

    const amt = parseFloat(withdrawalAmount);
    if (isNaN(amt) || amt <= 0) {
      setWithdrawalError("Please specify a valid positive amount.");
      return;
    }

    const maxWithdrawable = wallet ? wallet.currentBalance : 0;
    if (amt > maxWithdrawable) {
      setWithdrawalError(`Insufficient balance. You can withdraw up to ₹${maxWithdrawable.toLocaleString()}`);
      return;
    }

    setWithdrawing(true);
    try {
      await requestWithdrawal(agent.id, amt, withdrawalNotes);
      setWithdrawalSuccess(`Withdrawal request for ₹${amt.toLocaleString()} submitted successfully!`);
      setWithdrawalAmount("");
      setWithdrawalNotes("");
      onRefresh();
    } catch (err: any) {
      setWithdrawalError(err.message || "Failed to draft payout request");
    } finally {
      setWithdrawing(false);
    }
  };

  // Filter products based on categories & search
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.type.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedProductType === "All" || p.type === selectedProductType;
    return matchesSearch && matchesType;
  });

  // Unique product types
  const productCategories = ["All", ...Array.from(new Set(products.map(p => p.type)))];

  const getStatusColor = (status: LeadStatus) => {
    switch(status) {
      case "pending": return "bg-amber-100 text-amber-800 border-amber-20 border";
      case "tl_reviewed": return "bg-blue-100 text-blue-800 border-blue-200 border";
      case "admin_verified": return "bg-indigo-100 text-indigo-800 border-indigo-200 border";
      case "bank_approved": return "bg-emerald-100 text-emerald-800 border-emerald-200 border";
      case "rejected": return "bg-rose-100 text-rose-800 border-rose-200 border";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: LeadStatus) => {
    switch(status) {
      case "pending": return "Draft Pending";
      case "tl_reviewed": return "TL Approved";
      case "admin_verified": return "Admin Verified (In Bank)";
      case "bank_approved": return "Bank Disbursed & Settled";
      case "rejected": return "Declined";
      default: return status;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)] bg-slate-50 font-sans" id="agent-workspace">
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col justify-between py-6 px-4" id="agent-sidebar">
        <div>
          <div className="px-3 py-2 mb-6">
            <h3 className="text-xs uppercase tracking-widest text-slate-400 font-mono">Agent Terminal</h3>
            <h2 className="text-lg font-bold text-teal-400 font-display truncate">{agent.name}</h2>
            {myTL ? (
              <p className="text-xs text-slate-400 mt-1">TL: <span className="text-slate-200">{myTL.name}</span></p>
            ) : (
              <p className="text-xs text-slate-400 mt-1">Direct HQ Channel</p>
            )}
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "dashboard" ? "bg-teal-500 text-white font-semibold" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Performance Hub</span>
            </button>

            <button
              onClick={() => setActiveTab("products")}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "products" ? "bg-teal-500 text-white font-semibold" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Products & Links</span>
            </button>

            <button
              onClick={() => setActiveTab("leads")}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "leads" ? "bg-teal-500 text-white font-semibold" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Lead Submissions ({agentLeads.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("wallet")}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "wallet" ? "bg-teal-500 text-white font-semibold" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>My earnings & Wallet</span>
            </button>

            <button
              onClick={() => setActiveTab("kyc")}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "kyc" ? "bg-teal-500 text-white font-semibold" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {agent.kycStatus === "approved" ? (
                <UserCheck className="w-4 h-4 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              )}
              <span>KYC Verification</span>
              {agent.kycStatus === "none" && (
                <span className="ml-auto w-2 h-2 bg-amber-500 rounded-full animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("earnings_guide")}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "earnings_guide" ? "bg-teal-500 text-white font-semibold" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Coins className="w-4 h-4 text-emerald-400" />
              <span>Selling & Earnings Hub</span>
            </button>

            <button
              onClick={() => setActiveTab("notifications")}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                activeTab === "notifications" ? "bg-teal-500 text-white font-semibold" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Broadcast Notice</span>
              {agentNotifications.length > 0 && (
                <span className="absolute right-4 top-3 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {agentNotifications.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* KYC Badging */}
        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60">
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${agent.status === 'blocked' ? 'bg-red-500' : 'bg-emerald-400'}`} />
            <p className="text-xs uppercase tracking-wider text-slate-300 font-mono">
              Status: {agent.status === "blocked" ? "BLOCKED" : "ACTIVE DSA"}
            </p>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            <p>KYC: <span className="capitalize">{agent.kycStatus === "none" ? "Not Submitted" : agent.kycStatus}</span></p>
          </div>
        </div>
      </aside>

      {/* Main app panel */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto space-y-6" id="agent-workspace-pane">
        
        {/* Points Basis View Mode Toggle */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-white shadow-md border border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="bg-teal-500/20 text-teal-400 p-2.5 rounded-xl border border-teal-500/10">
              <Coins className="w-5.5 h-5.5" />
            </div>
            <div>
              <h4 className="text-sm font-bold font-display tracking-tight">Commission View Basis</h4>
              <p className="text-xs text-indigo-200 mt-0.5">Choose whether to view commissions and payouts in Rupees or as incentive Points.</p>
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
          {/* Dashboard Hub Tab */}
          {activeTab === "dashboard" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              key="dashboard"
              className="space-y-6"
            >
              {/* Top Banner */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                  <h1 className="text-2xl font-bold font-display text-slate-850">CapitalAxis Agent Workspace</h1>
                  <p className="text-slate-500 text-sm">Promote premium financial packages, draft leads, and monitor commission settlements in real-time.</p>
                </div>
                <button 
                  onClick={onRefresh}
                  className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh Data</span>
                </button>
              </div>

              {/* Status Alert for KYC */}
              {agent.kycStatus === "none" && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-amber-800 font-semibold text-sm">KYC Submission Required</h4>
                    <p className="text-amber-700 text-xs mt-0.5">Please upload your PAN Card, Aadhaar Card, and Bank account details under the KYC Verification tab. Payout disbursements require verified KYC approval.</p>
                    <button 
                      onClick={() => setActiveTab("kyc")} 
                      className="mt-2 text-amber-900 font-semibold text-xs underline hover:text-amber-950"
                    >
                      Complete KYC Now →
                    </button>
                  </div>
                </div>
              )}

              {/* Statistical Grids */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
                  <span className="text-slate-400 font-medium text-xs">Total Leads Drafted</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold font-display text-slate-800">{agentLeads.length}</span>
                    <FileText className="w-4 h-4 text-teal-400" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
                  <span className="text-slate-400 font-medium text-xs">Pending Reviews</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold font-display text-amber-600">{pendingLeads.length}</span>
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
                  <span className="text-slate-400 font-medium text-xs">Approved Disbursed</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold font-display text-emerald-600">{approvedLeads.length}</span>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
                  <span className="text-slate-400 font-medium text-xs">Total Earnings</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-lg font-bold font-display text-teal-700">{formatValue(wallet?.totalEarnings || 0)}</span>
                    <CheckSquare className="w-4 h-4 text-teal-500" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between col-span-2 lg:col-span-1 bg-gradient-to-br from-teal-50 to-teal-100">
                  <span className="text-slate-600 font-medium text-xs">Withdrawable Wallet</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xl font-bold font-display text-teal-800">{formatValue(wallet?.currentBalance || 0)}</span>
                    <Wallet className="w-4 h-4 text-teal-600" />
                  </div>
                </div>
              </div>

              {/* Action Buttons & Fast Forms */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Submission card */}
                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                    <Plus className="w-5 h-5 text-teal-500" />
                    <h3 className="font-semibold text-base text-slate-800 font-display">Fast Customer Lead Draft</h3>
                  </div>

                  {agent.status === "blocked" ? (
                    <div className="p-6 text-center text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                      <ShieldAlert className="w-10 h-10 mx-auto text-rose-500 mb-2" />
                      <h4 className="font-bold">Lead Submission Locked</h4>
                      <p className="text-xs text-rose-600 mt-1">Your agent account has been blocked by administrators. Contact CapitalAxis HQ customer help desk.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleLeadSubmit} className="space-y-4">
                      {formSuccess && <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 text-xs rounded-lg font-medium">{formSuccess}</div>}
                      {formError && <div className="p-3 bg-rose-50 border border-rose-150 text-rose-800 text-xs rounded-lg font-medium">{formError}</div>}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600">Customer Name *</label>
                          <input 
                            type="text" 
                            className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
                            placeholder="John Doe"
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600">Customer Mobile *</label>
                          <input 
                            type="tel" 
                            maxLength={10}
                            className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
                            placeholder="987654XXXX"
                            value={customerMobile}
                            onChange={e => setCustomerMobile(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600">City / Demographics *</label>
                          <input 
                            type="text" 
                            className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
                            placeholder="Mumbai, Maharashtra"
                            value={city}
                            onChange={e => setCity(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600">Financial Product Category *</label>
                          <select 
                            className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
                            value={productType}
                            onChange={e => setProductType(e.target.value as ProductType)}
                          >
                            {products.map(p => (
                              <option key={p.id} value={p.type}>{p.name} ({p.type})</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600">Supporting Attachment Filename (Optional Verification)</label>
                        <input 
                          type="text" 
                          className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
                          placeholder="e.g. payslips_john.pdf or itr_documents.zip"
                          value={docName}
                          onChange={e => setDocName(e.target.value)}
                        />
                        <span className="text-[10px] text-slate-400">Specify standard PDF or PNG filenames showing client salary proofs / identification.</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600">Detailed Client Profile & Notes</label>
                        <textarea 
                          rows={3}
                          className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
                          placeholder="CIBIL profile eligibility, requested loan limits, best times to schedule bank physical inspection, etc."
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submittingLead}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm py-2 px-4 rounded-xl transition flex items-center justify-center space-x-2"
                      >
                        {submittingLead ? (
                          <span className="inline-block animate-spin w-4 h-4 border-2 border-white rounded-full border-t-transparent" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span>File Customer Lead</span>
                      </button>
                    </form>
                  )}
                </div>

                {/* Hot Referral Link Copy Section */}
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h3 className="font-semibold text-base text-slate-800 font-display">Top Referral Link Generator</h3>
                    <button onClick={() => setActiveTab("products")} className="text-xs text-teal-600 font-semibold hover:underline">View All</button>
                  </div>

                  <p className="text-xs text-slate-500">Copy pre-processed bank partnership links to share directly. When clients register via these links, conversions automatically register under your name!</p>

                  <div className="space-y-3 pt-2">
                    {products.slice(0, 3).map(p => (
                      <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase">{p.type}</span>
                            <h4 className="text-xs font-bold text-slate-800 mt-1 truncate max-w-[200px]">{p.name}</h4>
                          </div>
                          <span className="text-[11px] font-bold text-teal-700 font-mono shrink-0">{formatCommissionRate(p.commissionRate)}</span>
                        </div>
                        
                        <div className="flex space-x-1.5">
                          <button
                            onClick={() => copyLink(p.referralLink, p.id)}
                            className="flex-1 bg-white hover:bg-teal-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-center space-x-1"
                          >
                            <Copy className="w-3.5 h-3.5 text-teal-600" />
                            <span>{copiedProdId === p.id ? "Copied!" : "Referral Link"}</span>
                          </button>
                          
                          <button
                            onClick={() => shareWhatsApp(p)}
                            className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-150 p-1.5 rounded-lg text-emerald-600 transition"
                            title="Quick Share to WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* Products Catalogue Tab */}
          {activeTab === "products" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              key="products"
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold text-slate-800 font-display">Direct Partnership Portfolios</h1>
                <p className="text-slate-500 text-sm">Copied tracking links store cookies under your agent profile. Verify required scores before filing leads.</p>
              </div>

              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="Search bank codes, home loan payouts, requirements..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex space-x-1.5 overflow-x-auto pb-1 max-w-full">
                  {productCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedProductType(cat)}
                      className={`px-4 py-2 text-xs rounded-xl shrink-0 font-medium transition-colors ${
                        selectedProductType === cat 
                          ? "bg-teal-600 text-white" 
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-55"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid lists */}
              {filteredProducts.length === 0 ? (
                <div className="text-center bg-white p-12 rounded-2xl border border-slate-100">
                  <p className="text-slate-400 text-sm">No products matched your filters or query parameters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map(p => (
                    <div key={p.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4">
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider font-mono uppercase">
                            {p.type}
                          </span>
                          {p.minScoreRequired && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                              CIBIL: {p.minScoreRequired}+
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-slate-800 text-base font-display line-clamp-1">{p.name}</h3>
                        <p className="text-slate-500 text-xs line-clamp-3">{p.description}</p>
                      </div>

                      {/* Yield structures */}
                      <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100/40">
                        <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-500">DSA Commission payout</span>
                        <p className="text-sm font-bold text-teal-800 font-mono mt-0.5">{formatCommissionRate(p.commissionRate)}</p>
                      </div>

                      {/* Detail points */}
                      {p.features && p.features.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Highlights:</span>
                          <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-0.5">
                            {p.features.slice(0, 3).map((f, i) => (
                              <li key={i} className="truncate">{f}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Buttons */}
                      <div className="pt-2 flex items-center space-x-2">
                        <button
                          onClick={() => copyLink(p.referralLink, p.id)}
                          className="flex-1 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold py-2 px-3 rounded-xl transition flex items-center justify-center space-x-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedProdId === p.id ? "Link Copied!" : "Earn Link"}</span>
                        </button>
                        
                        <button
                          onClick={() => shareWhatsApp(p)}
                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-150 hover:text-emerald-800 p-2 rounded-xl transition"
                          title="WhatsApp Pitch Text Generator"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setProductType(p.type);
                            setCustomerName("");
                            setCustomerMobile("");
                            setActiveTab("dashboard");
                            // Focus lead submitting card
                            setTimeout(() => {
                              document.getElementById("agent-workspace-pane")?.scrollTo({ top: 500, behavior: 'smooth' });
                            }, 100);
                          }}
                          className="bg-teal-50 text-teal-700 hover:bg-teal-100 px-3 py-2 rounded-xl text-xs font-bold transition"
                        >
                          Submit Lead
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Lead Tracking Tab */}
          {activeTab === "leads" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              key="leads"
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800 font-display">Filed Customer Leads</h1>
                  <p className="text-slate-500 text-sm">Monitor stage clearances. Bank approvals trigger instant wallet credits.</p>
                </div>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-semibold text-xs transition flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Draft New Customer Lead</span>
                </button>
              </div>

              {agentLeads.length === 0 ? (
                <div className="text-center bg-white p-16 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="font-bold text-slate-700 text-lg">No Filed Customer Leads</h3>
                  <p className="text-slate-400 text-xs">You have not drafted or submitted any prospective clients yet.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase tracking-wider font-mono">
                        <tr>
                          <th className="py-4 px-6">Client Details</th>
                          <th className="py-4 px-6">Assigned Product</th>
                          <th className="py-4 px-6">City</th>
                          <th className="py-4 px-6">Verification Phase</th>
                          <th className="py-4 px-6">Earnings Credited</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {agentLeads.map(l => {
                          const isExpanded = expandedLeadId === l.id;
                          return (
                            <React.Fragment key={l.id}>
                              <tr className="hover:bg-slate-50/40 transition">
                                <td className="py-4 px-6">
                                  <div className="font-bold text-slate-800 text-sm font-display">{l.customerName}</div>
                                  <div className="text-xs text-slate-400 font-mono mt-0.5">{l.customerMobile}</div>
                                </td>
                                <td className="py-4 px-6 text-slate-700 font-medium">
                                  {l.productType}
                                </td>
                                <td className="py-4 px-6 text-slate-500 text-xs">
                                  {l.city}
                                </td>
                                <td className="py-4 px-6">
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(l.status)}`}>
                                    {getStatusLabel(l.status)}
                                  </span>
                                </td>
                                <td className="py-4 px-6 font-mono font-bold text-teal-800 text-xs">
                                  {l.status === 'bank_approved' ? formatValue(l.commissionPaid) : "—"}
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <button
                                    onClick={() => setExpandedLeadId(isExpanded ? null : l.id)}
                                    className="text-teal-600 hover:text-teal-850 text-xs font-semibold hover:underline flex items-center space-x-1 ml-auto"
                                  >
                                    <span>Timeline logs</span>
                                    <ChevronDown className={`w-3.5 h-3.5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </button>
                                </td>
                              </tr>
                              
                              {/* Expanded Status history logs */}
                              <tr className={isExpanded ? "bg-slate-50" : "hidden"}>
                                <td colSpan={6} className="py-5 px-8">
                                  <div className="border-l-2 border-teal-500 space-y-4 ml-2 pl-6 py-1">
                                    <h4 className="text-xs uppercase tracking-widest text-slate-400 font-mono font-bold pb-1 bg-gradient-to-r from-teal-500/10 to-transparent p-1.5 w-max">Lead Audit Timeline</h4>
                                    
                                    {l.statusHistory.map((hist, idx) => (
                                      <div key={idx} className="space-y-1 relative">
                                        {/* Timeline dots */}
                                        <div className="absolute -left-[31px] top-1.5 w-2 h-2 rounded-full bg-teal-500 border border-white" />
                                        
                                        <div className="flex items-center space-x-2 text-xs">
                                          <span className="font-bold text-slate-700">{hist.updatedBy}</span>
                                          <span className="text-[10px] text-slate-400 font-mono italic">({hist.updatedByRole.toUpperCase()})</span>
                                          <span className="text-slate-350">•</span>
                                          <span className="text-[10px] font-mono text-slate-400">{new Date(hist.updatedAt).toLocaleString()}</span>
                                        </div>
                                        
                                        <div className="text-xs text-slate-600 font-light bg-white p-2 rounded border border-slate-200/50 max-w-xl">
                                          <span className="font-semibold text-slate-800 mr-2 uppercase text-[9px] font-mono tracking-wider border border-slate-100 bg-slate-50 px-1 py-0.5 rounded">
                                            {hist.status}
                                          </span>
                                          {hist.notes}
                                        </div>
                                      </div>
                                    ))}

                                    {/* Document details section */}
                                    {l.documentName && (
                                      <div className="pt-2 border-t border-slate-200/50 max-w-lg mt-4">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">KYC Verification Files Attached:</span>
                                        <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded border border-slate-100 mt-1">
                                          <FileText className="w-4 h-4 text-slate-400" />
                                          <span className="text-xs font-mono text-slate-700 truncate">{l.documentName}</span>
                                          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold uppercase ml-auto">Uploaded</span>
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
            </motion.div>
          )}

          {/* Wallet and Payout Transactions */}
          {activeTab === "wallet" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              key="wallet"
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold text-slate-800 font-display">Wallet and Payouts</h1>
                <p className="text-slate-500 text-sm">Disbursed leads deposit commissions directly to your wallet ledger. Ensure KYC approval.</p>
              </div>

              {/* Stats Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-40">
                  <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-10">
                    <Wallet className="w-40 h-40" />
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs uppercase tracking-widest font-mono">Current Wallet balance</span>
                    <h2 className="text-3xl font-bold font-display mt-1 text-teal-400">{formatValue(wallet?.currentBalance || 0)}</h2>
                  </div>
                  <span className="text-[11px] text-slate-400">Auto-calculated payouts from cleared bank disbursements.</span>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between h-40">
                  <div>
                    <span className="text-slate-400 text-xs uppercase tracking-widest font-mono">Total Cumulative Earnings</span>
                    <h2 className="text-3xl font-bold font-display mt-1 text-slate-900">{formatValue(wallet?.totalEarnings || 0)}</h2>
                  </div>
                  <div className="flex items-center text-xs text-emerald-600 font-medium mt-2">
                    <ArrowUpRight className="w-4 h-4 mr-1 text-emerald-500" />
                    <span>Accumulated across all campaign streams.</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between h-40">
                  <div>
                    <span className="text-slate-400 text-xs uppercase tracking-widest font-mono">Released Cash-out Payouts</span>
                    <h2 className="text-3xl font-bold font-display mt-1 text-slate-700">{formatValue(wallet?.withdrawnAmount || 0)}</h2>
                  </div>
                  <div className="flex items-center text-xs text-slate-500 font-medium mt-2">
                    <ArrowDownLeft className="w-4 h-4 mr-1 text-slate-400" />
                    <span>Transferred securely to verified Bank accounts.</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Withdrawal Forms */}
                <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <h3 className="font-bold text-base text-slate-800 font-display">Request Settlement Withdrawal</h3>
                  <p className="text-xs text-slate-500">Draft withdrawal request to transfer wallet balances directly to your bank. Minimum disbursement eligibility: ₹500.</p>

                  <form onSubmit={handleWithdrawalRequest} className="space-y-4">
                    {withdrawalSuccess && <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 text-xs rounded-lg font-medium">{withdrawalSuccess}</div>}
                    {withdrawalError && <div className="p-3 bg-rose-50 border border-rose-150 text-rose-800 text-xs rounded-lg font-medium">{withdrawalError}</div>}

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">
                        {pointsEnabled ? `Settlement Payout Amount (${formatValue(500)} Min) *` : "Settlement Payout Amount (INR) *"}
                      </label>
                      <input 
                        type="number" 
                        min={500}
                        className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white font-mono"
                        placeholder={pointsEnabled ? `e.g. ${50 * pointsRate} for 50 PTS` : "e.g. 2000"}
                        value={withdrawalAmount}
                        onChange={e => setWithdrawalAmount(e.target.value)}
                        required
                      />
                      {pointsEnabled && withdrawalAmount && (
                        <p className="text-[10px] text-teal-600 font-bold font-mono mt-0.5">
                          Equivalent value to withdraw: {(Number(withdrawalAmount) / pointsRate).toFixed(1)} PTS
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Settlement Remarks</label>
                      <input 
                        type="text" 
                        className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
                        placeholder="Transfer request for rent/dues"
                        value={withdrawalNotes}
                        onChange={e => setWithdrawalNotes(e.target.value)}
                      />
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[11px] text-slate-500">
                      <p className="font-semibold text-slate-700">Bank Settlement Details:</p>
                      {agent.kycDetails ? (
                        <ul className="list-disc list-inside mt-1 space-y-0.5 font-mono">
                          <li>A/C: {agent.kycDetails.bankAccount}</li>
                          <li>IFSC: {agent.kycDetails.ifscCode}</li>
                        </ul>
                      ) : (
                        <p className="text-rose-500 mt-1">Please configure Bank account details under KYC Verification first.</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={withdrawing || agent.kycStatus !== "approved"}
                      className={`w-full text-white font-semibold text-sm py-2 px-4 rounded-xl transition ${
                        agent.kycStatus === "approved" 
                          ? "bg-teal-650 hover:bg-teal-700 bg-teal-600" 
                          : "bg-slate-300 cursor-not-allowed"
                      }`}
                    >
                      {withdrawing ? "Processing Draft..." : "Release Funds"}
                    </button>
                    {agent.kycStatus !== "approved" && (
                      <p className="text-[10px] text-center text-rose-500 font-semibold">KYC Verification needs admin approval to activate settlements.</p>
                    )}
                  </form>
                </div>

                {/* Ledger Transactions Audit */}
                <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <h3 className="font-bold text-base text-slate-800 font-display">Ledger Audit Logs</h3>
                  
                  {!wallet || wallet.transactions.length === 0 ? (
                    <div className="text-center p-12 text-slate-400 text-sm">
                      No matching records found. Approvals generate ledger records.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {wallet.transactions.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx, i) => (
                        <div key={i} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-xl border ${
                              tx.type === 'credit' 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                : 'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                              {tx.type === 'credit' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 leading-tight">{tx.description}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{new Date(tx.date).toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className={`font-mono font-bold ${tx.type === 'credit' ? 'text-emerald-700' : 'text-slate-800'}`}>
                              {tx.type === 'credit' ? '+' : '-'} {formatValue(tx.amount)}
                            </p>
                            <span className={`text-[10px] font-bold uppercase tracking-wider font-mono ${
                              tx.status === 'completed' 
                                ? 'text-emerald-600 bg-emerald-50 px-1.5 py-0.25 rounded' 
                                : tx.status === 'pending'
                                  ? 'text-amber-600 bg-amber-50 px-1.5 py-0.25 rounded'
                                  : 'text-rose-600 bg-rose-50 px-1.5 py-0.25 rounded'
                            }`}>
                              {tx.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}

          {/* KYC Verification tab */}
          {activeTab === "kyc" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              key="kyc"
              className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6"
            >
              <div className="text-center space-y-2 pb-4 border-b border-slate-100">
                <h1 className="text-2xl font-bold text-slate-800 font-display">KYC Identity Verification</h1>
                <p className="text-slate-500 text-sm">Regulatory checks dictate payout eligibility. Submit details to update status.</p>
                
                {/* Status Badging */}
                <div className="pt-2 flex justify-center">
                  {agent.kycStatus === "approved" && (
                    <span className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider font-mono border border-emerald-200">
                      APPROVED FOR PAYOUTS
                    </span>
                  )}
                  {agent.kycStatus === "pending" && (
                    <span className="bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider font-mono border border-amber-200">
                      UNDER ADMIN REVIEW
                    </span>
                  )}
                  {agent.kycStatus === "rejected" && (
                    <span className="bg-rose-100 text-rose-800 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider font-mono border border-rose-200">
                      REJECTED — RENEW DETAILS
                    </span>
                  )}
                  {agent.kycStatus === "none" && (
                    <span className="bg-slate-100 text-slate-650 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider font-mono border border-slate-200">
                      KYC DOCUMENTS NOT SUBMITTED
                    </span>
                  )}
                </div>
              </div>

              {kycSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 text-xs rounded-lg font-medium text-center">
                  {kycSuccess}
                </div>
              )}

              {agent.kycStatus === "approved" ? (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl space-y-3 font-mono text-sm max-w-md mx-auto">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Verified Repository Details</p>
                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                      <span>PAN Number:</span>
                      <span className="font-bold">{agent.kycDetails?.panNumber}</span>
                      
                      <span>Aadhaar Number:</span>
                      <span className="font-bold">************{agent.kycDetails?.aadhaarNumber.slice(-4)}</span>
                      
                      <span>Bank Account:</span>
                      <span className="font-bold">******{agent.kycDetails?.bankAccount.slice(-4)}</span>
                      
                      <span>IFSC Code:</span>
                      <span className="font-bold">{agent.kycDetails?.ifscCode}</span>
                    </div>
                  </div>
                  <p className="text-center text-xs text-slate-400">If updates are required, contact support directly.</p>
                </div>
              ) : (
                <form onSubmit={handleKycSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">PAN Card Standard Number *</label>
                      <input 
                        type="text" 
                        maxLength={10}
                        className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg font-mono placeholder-slate-400"
                        placeholder="ABCDE1234F"
                        value={pan}
                        onChange={e => setPan(e.target.value.toUpperCase())}
                        required
                        disabled={agent.kycStatus === "pending"}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Aadhaar Card Ident Number *</label>
                      <input 
                        type="text" 
                        maxLength={12}
                        className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg font-mono"
                        placeholder="451278129012"
                        value={aadhaar}
                        onChange={e => setAadhaar(e.target.value)}
                        required
                        disabled={agent.kycStatus === "pending"}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Disbursal Bank Account Number *</label>
                      <input 
                        type="text" 
                        className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg font-mono"
                        placeholder="5012351239"
                        value={bankAccount}
                        onChange={e => setBankAccount(e.target.value)}
                        required
                        disabled={agent.kycStatus === "pending"}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Bank IFSC Branch Code *</label>
                      <input 
                        type="text" 
                        maxLength={11}
                        className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg font-mono"
                        placeholder="SBIN0001234"
                        value={ifsc}
                        onChange={e => setIfsc(e.target.value.toUpperCase())}
                        required
                        disabled={agent.kycStatus === "pending"}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Support Scanned KYC Document Name *</label>
                    <input 
                      type="text" 
                      className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg focus:outline-none"
                      placeholder="e.g. pan_and_aadhaar_scan.pdf"
                      value={kycDoc}
                      onChange={e => setKycDoc(e.target.value)}
                      required
                      disabled={agent.kycStatus === "pending"}
                    />
                    <span className="text-[10px] text-slate-400">Provide file reference that admins will download to check signatures/photographs.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingKyc || agent.kycStatus === "pending"}
                    className={`w-full text-white font-semibold text-sm py-2 px-4 rounded-xl transition ${
                      agent.kycStatus === "pending" 
                        ? "bg-slate-350 cursor-not-allowed text-slate-600" 
                        : "bg-teal-650 hover:bg-teal-700 bg-teal-600"
                    }`}
                  >
                    {submittingKyc ? "Uploading Details..." : "Upload Identity Files"}
                  </button>
                </form>
              )}
            </motion.div>
          )}

          {/* Selling & Earnings Points Hub */}
          {activeTab === "earnings_guide" && (() => {
            const approvedLeadsCount = approvedLeads.length;
            const submittedLeadsCount = agentLeads.length;
            const currentSalesXP = (submittedLeadsCount * 100) + (approvedLeadsCount * 250);
            
            let badgeRank = "Bronze Partner";
            let badgeColor = "from-amber-600 to-amber-800 text-amber-100";
            let multiplier = "1.00x";
            let nextRank = "Silver Partner";
            let pointsNeededForNext = 500 - currentSalesXP;
            let progressPercentage = Math.min((currentSalesXP / 500) * 100, 100);

            if (currentSalesXP >= 500 && currentSalesXP < 1200) {
              badgeRank = "Silver Partner";
              badgeColor = "from-slate-400 to-slate-600 text-slate-100";
              multiplier = "1.02x";
              nextRank = "Gold Partner";
              pointsNeededForNext = 1200 - currentSalesXP;
              progressPercentage = Math.min(((currentSalesXP - 500) / (1200 - 500)) * 100, 100);
            } else if (currentSalesXP >= 1200 && currentSalesXP < 2500) {
              badgeRank = "Gold Partner";
              badgeColor = "from-amber-500 to-yellow-600 text-amber-50";
              multiplier = "1.05x";
              nextRank = "Platinum Direct DSA";
              pointsNeededForNext = 2500 - currentSalesXP;
              progressPercentage = Math.min(((currentSalesXP - 1200) / (2500 - 1200)) * 100, 100);
            } else if (currentSalesXP >= 2500) {
              badgeRank = "Platinum Direct DSA";
              badgeColor = "from-teal-500 to-indigo-650 text-teal-50";
              multiplier = "1.10x";
              nextRank = "DSA Legend Status";
              pointsNeededForNext = 0;
              progressPercentage = 100;
            }

            return (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                key="earnings_guide"
                className="space-y-6"
              >
                {/* Header */}
                <div>
                  <h1 className="text-2xl font-bold text-slate-800 font-display">Selling & Earnings Points Guide</h1>
                  <p className="text-slate-500 text-sm">Understand your commission tier scoring, target credit parameters, and high-conversion sales guidelines.</p>
                </div>

                {/* Gamified Points Banner */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-4 bg-gradient-to-tr from-slate-900 to-slate-800 p-6 rounded-2xl text-white relative overflow-hidden h-full flex flex-col justify-between">
                    <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 opacity-10">
                      <Award className="w-40 h-40" />
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs uppercase tracking-widest font-mono font-bold">Current DSA Grade</span>
                      <h2 className="text-2xl font-bold font-display mt-1 text-teal-400">{badgeRank}</h2>
                      <div className="mt-2 text-xs text-slate-300">
                        Multiplier bonus: <span className="font-mono text-emerald-400 font-bold">{multiplier}</span>
                      </div>
                    </div>
                    <div className="mt-6">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">Total Accumulation XP</span>
                      <p className="text-2xl font-mono font-extrabold text-white">{currentSalesXP} <span className="text-xs text-slate-400">Points</span></p>
                    </div>
                  </div>

                  <div className="md:col-span-8 space-y-4">
                    <h3 className="font-bold text-slate-800 font-display text-base">Incentive Tier Progression Progress</h3>
                    <p className="text-xs text-slate-500">Every submitted lead credits your score by <span className="font-bold">100 Points</span>. Standard bank disbursed approval credits <span className="font-bold">250 Points</span>. Acquire points to climb tiers and unlock active commission multipliers automatically!</p>
                    
                    <div className="space-y-1 pt-2">
                      <div className="flex justify-between text-xs font-mono text-slate-600">
                        <span>XP: {currentSalesXP} / {currentSalesXP + Math.max(0, pointsNeededForNext)} PTS</span>
                        {pointsNeededForNext > 0 ? (
                          <span>{pointsNeededForNext} PTS to Next Rank ({nextRank})</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">Max Rank Reached! Legend Status</span>
                        )}
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div 
                          className="bg-teal-500 lg:bg-gradient-to-r lg:from-teal-400 lg:to-indigo-505 h-full rounded-full transition-all duration-500 bg-teal-600"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-[10.5px]">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                        <span className="text-slate-400 uppercase font-mono tracking-wider">Bronze</span>
                        <p className="font-bold text-slate-700 mt-0.5">1.00x Payout</p>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                        <span className="text-slate-400 uppercase font-mono tracking-wider">Silver</span>
                        <p className="font-bold text-slate-700 mt-0.5">1.02x Payout</p>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                        <span className="text-slate-400 uppercase font-mono tracking-wider">Gold</span>
                        <p className="font-bold text-slate-700 mt-0.5">1.05x Payout</p>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center border-teal-500 bg-teal-50/20">
                        <span className="text-teal-600 uppercase font-mono tracking-wider font-bold">Platinum</span>
                        <p className="font-bold text-teal-800 mt-0.5">1.10x Payout</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selling Guidelines Card */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                    <Coins className="w-5 h-5 text-teal-600 animate-pulse" />
                    <h3 className="font-bold text-base text-slate-800 font-display">Product-Wise Selling & Earnings Points Matrix</h3>
                  </div>

                  <p className="text-xs text-slate-500">Below is your complete corporate playbook detailing how to pitch products to maximize success and build high-ticket commissions.</p>
                  
                  <div className="space-y-4 pt-2">
                    {products.map(p => (
                      <div key={p.id} className="p-4 bg-slate-50/75 rounded-2xl border border-slate-100 hover:border-teal-300 transition space-y-3">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider font-mono uppercase border border-teal-200">
                              {p.type}
                            </span>
                            <h4 className="text-sm font-bold text-slate-800 mt-1 font-display">{p.name}</h4>
                          </div>
                          
                          <div className="text-right shrink-0">
                            <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400">Commission Rate</span>
                            <p className="text-sm font-bold font-mono text-teal-700 mt-0.5">{p.commissionRate}</p>
                          </div>
                        </div>

                        {/* Complete Selling & Earning Points Specifics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1.5 border-t border-slate-200/50 text-xs">
                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase tracking-wider font-semibold font-mono text-slate-500">Target Demographic Selling Point</span>
                            <p className="text-slate-700 leading-relaxed text-[11px]">
                              {p.type === 'Credit Card' 
                                ? "Salaried employees with >=₹25,000/mo income or tax returns (ITR) >₹3.6 Lakhs per year. High CIBIL target."
                                : p.type === 'Personal Loan' || p.type === 'Instant Loan'
                                  ? "Employees needing instant liquidity for urgent/unplanned capital needs, marriage, holiday expenses."
                                  : p.type === 'Home Loan' || p.type === 'Business Loan'
                                    ? "Propertied developers, entrepreneurs or direct corporate entities looking to expand facilities."
                                    : "General customer segments seeking secure digital setups or zero interest mutual systems."}
                            </p>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase tracking-wider font-semibold font-mono text-slate-500">Pitch USP & Highlights</span>
                            <ul className="text-slate-700 list-disc list-inside space-y-0.5 text-[11px]">
                              {p.features && p.features.length > 0 ? p.features.slice(0, 3).map((f, idx) => (
                                <li key={idx} className="truncate">{f}</li>
                              )) : (
                                <li>Instant app-based setup tracking.</li>
                              )}
                            </ul>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase tracking-wider font-semibold font-mono text-slate-500">Earning Rules & Rejections Check</span>
                            <p className="text-slate-700 text-[11px] leading-relaxed">
                              {p.minScoreRequired 
                                ? `Verify client credit status is above ${p.minScoreRequired} before drafting lead to minimize rejection rates.`
                                : "Check and verify valid Aadhaar card linkage with active mobile numbers to prevent digital verification passes drop-offs."}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>

                <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5 flex items-start space-x-3.5">
                  <Coins className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h4 className="text-teal-905 font-bold text-sm font-display text-teal-900">Incentive Slashes & Multiplier Application Policy</h4>
                    <p className="text-teal-800 text-xs leading-relaxed">
                      All basic Commissions listed above are multiplied by your active Grade Multiplier (up to <span className="font-bold">1.10x for Platinum Grade and Legend Tiers</span>) upon complete disbursement approval from standard banking windows. Keep drafting high-quality clients!
                    </p>
                  </div>
                </div>

              </motion.div>
            );
          })()}

          {/* Notifications Alerts Tab */}
          {activeTab === "notifications" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              key="notifications"
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold text-slate-800 font-display">Broadcast Center</h1>
                <p className="text-slate-500 text-sm">Review announcements, dynamic bonus payout announcements, and critical product alerts sent by CapitalAxis admin.</p>
              </div>

              {agentNotifications.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-2xl border border-slate-100 text-slate-400 text-sm">
                  Broadcast dashboard is currently silent. No new notifications.
                </div>
              ) : (
                <div className="space-y-4">
                  {agentNotifications.map(not => (
                    <div key={not.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-start space-x-4">
                      <div className="bg-teal-50 p-2.5 rounded-xl border border-teal-100 text-teal-600 shrink-0">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-slate-800 text-sm">{not.title}</h3>
                        <p className="text-slate-600 text-xs font-light">{not.message}</p>
                        <span className="text-[10px] text-slate-400 font-mono block pt-1">{new Date(not.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}

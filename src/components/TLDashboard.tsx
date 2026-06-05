import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, TrendingUp, CheckCircle, Clock, Search, Plus, 
  Trash2, UserPlus, FileText, ChevronDown, ChevronUp, Bell,
  RefreshCw, BarChart3, ArrowUpRight, DollarSign, AlertCircle, Bookmark,
  Coins, Award
} from "lucide-react";
import { User, Lead, Notification, UserRole, LeadStatus } from "../types";
import { addUser, deleteUser, updateLeadStatus, broadcastNotification } from "../api";

interface TLDashboardProps {
  tl: User;
  allUsers: User[];
  leads: Lead[];
  notifications: Notification[];
  onRefresh: () => void;
}

export default function TLDashboard({ 
  tl, 
  allUsers, 
  leads, 
  notifications, 
  onRefresh 
}: TLDashboardProps) {
  const [activeTab, setActiveTab] = useState<"team" | "leads" | "reports" | "broadcast" | "earnings_guide">("team");

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

  const [searchTerm, setSearchTerm] = useState("");
  const [addingAgent, setAddingAgent] = useState(false);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);

  // New Agent Form States
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentEmail, setNewAgentEmail] = useState("");
  const [newAgentMobile, setNewAgentMobile] = useState("");
  const [agentFormSuccess, setAgentFormSuccess] = useState("");
  const [agentFormError, setAgentFormError] = useState("");

  // Lead Review Dialog States
  const [reviewingLead, setReviewingLead] = useState<Lead | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Filter users under this TL
  const teamAgents = allUsers.filter(u => u.role === "agent" && u.tlId === tl.id);
  const teamAgentIds = teamAgents.map(a => a.id);

  // Filter leads submitted by agents under this TL (or specifically marked with tlId)
  const teamLeads = leads.filter(l => l.tlId === tl.id || teamAgentIds.includes(l.agentId));

  // Compute Statistics
  const pendingLeads = teamLeads.filter(l => l.status === "pending");
  const approvedLeads = teamLeads.filter(l => l.status === "bank_approved");
  const totalLeadsCount = teamLeads.length;

  const teamEarningsSum = teamLeads.reduce((acc, lead) => {
    return acc + (lead.status === "bank_approved" ? lead.commissionPaid : 0);
  }, 0);

  // Calculate top performing agent
  const agentPerformanceMap = teamAgents.map(agent => {
    const agentLeads = teamLeads.filter(l => l.agentId === agent.id);
    const completedVal = agentLeads.filter(l => l.status === "bank_approved").reduce((sum, current) => sum + current.commissionPaid, 0);
    return {
      agent,
      totalLeads: agentLeads.length,
      approvedCount: agentLeads.filter(l => l.status === "bank_approved").length,
      pendingCount: agentLeads.filter(l => l.status === "pending" || l.status === "tl_reviewed" || l.status === "admin_verified").length,
      commissionGenerated: completedVal
    };
  });

  // Notifications targeting TLs or specifically this TL
  const tlNotifications = notifications.filter(n => n.role === "tl" || n.userId === tl.id || (!n.role && !n.userId));

  // Handle Add Agent
  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAgentFormSuccess("");
    setAgentFormError("");

    if (!newAgentName || !newAgentEmail || !newAgentMobile) {
      setAgentFormError("All details are required to configure an agent portfolio.");
      return;
    }

    try {
      await addUser(newAgentName, newAgentEmail, newAgentMobile, "agent", tl.id);
      setAgentFormSuccess(`Agent ${newAgentName} successfully added to your leadership team!`);
      setNewAgentName("");
      setNewAgentEmail("");
      setNewAgentMobile("");
      setAddingAgent(false);
      onRefresh();
    } catch (err: any) {
      setAgentFormError(err.message || "Failed to create agent");
    }
  };

  // Handle Remove Agent
  const handleRemoveAgent = async (agentId: string, name: string) => {
    if (confirm(`Are you sure you want to decouple agent ${name} from your team? They will be removed from the portal.`)) {
      try {
        await deleteUser(agentId);
        onRefresh();
      } catch (err: any) {
        alert("Error decoupling agent: " + err.message);
      }
    }
  };

  // Process Lead Escalation (TL Review)
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingLead) return;

    setSubmittingReview(true);
    try {
      const targetStatus: LeadStatus = reviewAction === "approve" ? "tl_reviewed" : "rejected";
      await updateLeadStatus(reviewingLead.id, targetStatus, reviewRemarks, tl.id);
      setReviewingLead(null);
      setReviewRemarks("");
      onRefresh();
    } catch (err: any) {
      alert("Error reviewing lead: " + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case "pending": return "bg-amber-100 text-amber-800 border-amber-20 border";
      case "tl_reviewed": return "bg-blue-105 bg-blue-100 text-blue-800 border-blue-200 border";
      case "admin_verified": return "bg-indigo-100 text-indigo-800 border-indigo-20 border";
      case "bank_approved": return "bg-emerald-100 text-emerald-800 border-emerald-200 border";
      case "rejected": return "bg-rose-100 text-rose-800 border-rose-200 border";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)] bg-slate-50 font-sans" id="tl-workspace">
      {/* Leadership sidebar */}
      <aside className="w-full md:w-64 bg-indigo-950 text-white flex flex-col justify-between py-6 px-4" id="tl-sidebar">
        <div>
          <div className="px-3 py-2 mb-6">
            <span className="text-[10px] uppercase tracking-widest text-indigo-350 font-mono font-bold bg-indigo-900 px-2 py-0.5 rounded">Team Leader Portal</span>
            <h2 className="text-lg font-bold font-display mt-2 text-teal-300 truncate">{tl.name}</h2>
            <p className="text-xs text-indigo-300 mt-0.5 font-mono truncate">{tl.email}</p>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("team")}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "team" ? "bg-teal-505 bg-teal-600 text-white font-semibold" : "text-indigo-200 hover:bg-indigo-900 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Agents Hierarchy ({teamAgents.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("leads")}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                activeTab === "leads" ? "bg-teal-600 text-white font-semibold" : "text-indigo-200 hover:bg-indigo-900 hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Team Leads Audit</span>
              {pendingLeads.length > 0 && (
                <span className="absolute right-4 top-3 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                  {pendingLeads.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("reports")}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "reports" ? "bg-teal-600 text-white font-semibold" : "text-indigo-200 hover:bg-indigo-900 hover:text-white"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Performance Reports</span>
            </button>

            <button
              onClick={() => setActiveTab("earnings_guide")}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "earnings_guide" ? "bg-teal-600 text-white font-semibold" : "text-indigo-200 hover:bg-indigo-900 hover:text-white"
              }`}
            >
              <Coins className="w-4 h-4 text-emerald-400" />
              <span>Selling & Overrides Hub</span>
            </button>
          </nav>
        </div>

        {/* TL Footnote */}
        <div className="bg-indigo-900/60 p-4 rounded-xl border border-indigo-805 border-indigo-800">
          <span className="text-[10px] font-mono text-indigo-300 uppercase block">Leader Overrides</span>
          <p className="text-xs text-slate-200 mt-1">Directly responsible for reviewing customer profiles, updating eligibility, and guiding team leads.</p>
        </div>
      </aside>

      {/* Workspace panel */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto space-y-6" id="tl-workspace-pane">
        
        {/* Points Basis View Mode Toggle */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-white shadow-md border border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="bg-teal-500/20 text-teal-400 p-2.5 rounded-xl border border-teal-500/10">
              <Coins className="w-5.5 h-5.5" />
            </div>
            <div>
              <h4 className="text-sm font-bold font-display tracking-tight">Commission View Basis</h4>
              <p className="text-xs text-indigo-200 mt-0.5">Choose whether to view team earnings and allocations in Rupees or as incentive Points.</p>
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
          
          {/* Dashboard/Team Tab */}
          {activeTab === "team" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              key="team"
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                  <h1 className="text-2xl font-bold font-display text-slate-800">My Agent Distribution Net</h1>
                  <p className="text-slate-500 text-sm">Add custom agents to your tree, track individual performances, and approve pending payouts.</p>
                </div>
                <div className="flex space-x-2 shrink-0">
                  <button
                    onClick={() => setAddingAgent(!addingAgent)}
                    className="bg-indigo-650 hover:bg-indigo-750 text-white bg-indigo-600 px-4 py-2 rounded-xl font-semibold text-xs transition flex items-center space-x-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Onboard New Agent</span>
                  </button>
                  <button 
                    onClick={onRefresh}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
                    title="Refresh Tree"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Statistical cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
                  <span className="text-slate-400 font-medium text-xs">Connected Active Agents</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold font-display text-slate-900">{teamAgents.length}</span>
                    <Users className="w-4 h-4 text-indigo-500" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
                  <span className="text-slate-400 font-medium text-xs">Total Team Filed Leads</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold font-display text-slate-900">{totalLeadsCount}</span>
                    <FileText className="w-4 h-4 text-teal-500" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
                  <span className="text-slate-400 font-medium text-xs">Pending Escalations</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold font-display text-amber-600">{pendingLeads.length}</span>
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                </div>

                <div className="bg-indigo-55/80 bg-indigo-50 border border-indigo-100 p-5 rounded-xl flex flex-col justify-between">
                  <span className="text-indigo-600 font-medium text-xs">Team Subsidies Disbursed</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xl font-bold font-display text-indigo-900">{formatValue(teamEarningsSum)}</span>
                    <DollarSign className="w-4 h-4 text-indigo-600" />
                  </div>
                </div>
              </div>

              {/* Onboard form panel */}
              {addingAgent && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-md space-y-4 max-w-xl overflow-hidden"
                >
                  <h3 className="font-bold text-base text-slate-800 flex items-center space-x-1.5 font-display"><UserPlus className="w-4.5 h-4.5 text-indigo-600" /> Onboard Direct Commission Agent</h3>
                  <p className="text-xs text-slate-500">Provide direct communication metrics. Instantly logs them into your downstream agency chain.</p>

                  <form onSubmit={handleAddAgent} className="space-y-4">
                    {agentFormSuccess && <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg font-medium">{agentFormSuccess}</div>}
                    {agentFormError && <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg font-medium">{agentFormError}</div>}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-650">Agent Corporate Name *</label>
                        <input 
                          type="text" 
                          className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg"
                          placeholder="Rohit Sharma"
                          value={newAgentName}
                          onChange={e => setNewAgentName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-650">Mobile Code (OTP-authorized) *</label>
                        <input 
                          type="tel" 
                          maxLength={10}
                          className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg"
                          placeholder="9123456789"
                          value={newAgentMobile}
                          onChange={e => setNewAgentMobile(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-650">Email Credentials *</label>
                      <input 
                        type="email" 
                        className="w-full text-sm bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg"
                        placeholder="rohit.agent@gmail.com"
                        value={newAgentEmail}
                        onChange={e => setNewAgentEmail(e.target.value)}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
                    >
                      Onboard Portfolio Agent
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingAgent(false)}
                      className="ml-2 text-xs text-slate-500 hover:underline"
                    >
                      Cancel
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Downstream Performers list */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-sm">Managing Agent Registry</h3>
                </div>

                {teamAgents.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-sm">
                    No agents onboarded. Click 'Onboard New Agent' to activate your team distribution net.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider font-mono">
                        <tr>
                          <th className="py-3 px-6">Agent Contact</th>
                          <th className="py-3 px-6">Leads Count</th>
                          <th className="py-3 px-6">Approved Loans</th>
                          <th className="py-3 px-6">KYC Status</th>
                          <th className="py-3 px-6">Commissions Generated</th>
                          <th className="py-3 px-6 text-right">Decouple</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {agentPerformanceMap.map(({ agent: ag, totalLeads, approvedCount, pendingCount, commissionGenerated }) => (
                          <tr key={ag.id} className="hover:bg-slate-50/40 transition">
                            <td className="py-4 px-6">
                              <div className="font-bold text-slate-800">{ag.name}</div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5">{ag.mobile} | {ag.email}</div>
                            </td>
                            <td className="py-4 px-6 text-slate-700 font-mono font-bold">
                              {totalLeads}
                            </td>
                            <td className="py-4 px-6">
                              <span className="font-mono text-emerald-700 font-bold">{approvedCount}</span>
                              <span className="text-xs text-slate-400 ml-1">approved ({pendingCount} pending)</span>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                ag.kycStatus === 'approved' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : ag.kycStatus === 'pending'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-slate-100 text-slate-500'
                              }`}>
                                {ag.kycStatus === 'none' ? 'Incomplete' : ag.kycStatus}
                              </span>
                            </td>
                            <td className="py-4 px-6 font-mono text-emerald-800 font-bold">
                              {formatValue(commissionGenerated)}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <button
                                onClick={() => handleRemoveAgent(ag.id, ag.name)}
                                className="p-1 text-rose-500 hover:text-rose-750 hover:bg-rose-50 rounded transition"
                                title="De-attach from team list"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Leads Review Tab */}
          {activeTab === "leads" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              key="leads"
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold text-slate-800 font-display">Team Leads Oversight</h1>
                <p className="text-slate-500 text-sm">Review profile specifications submitted by your agents before clearing status for bank disbursement verify.</p>
              </div>

              {teamLeads.length === 0 ? (
                <div className="text-center bg-white p-16 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="font-bold text-slate-700 text-lg font-display">No Representative Leads</h3>
                  <p className="text-slate-400 text-xs">No downstream leads have been drafted or submitted yet.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">Team Lead Ledger</h3>
                    <span className="text-xs text-indigo-700 font-bold bg-indigo-50 px-2.5 py-1 rounded-full font-mono">{pendingLeads.length} Action Items</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider font-mono border-b border-slate-100">
                        <tr>
                          <th className="py-4 px-6">Customer Details</th>
                          <th className="py-4 px-6">Assigned Product</th>
                          <th className="py-4 px-6">Filing Agent</th>
                          <th className="py-4 px-6">Review Status</th>
                          <th className="py-4 px-6">Timeline Log</th>
                          <th className="py-4 px-6 text-right">Review Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {teamLeads.map(l => {
                          const isExpanded = expandedLeadId === l.id;
                          return (
                            <React.Fragment key={l.id}>
                              <tr className="hover:bg-slate-50/40 transition">
                                <td className="py-4 px-6">
                                  <div className="font-bold text-slate-800 font-display text-sm">{l.customerName}</div>
                                  <div className="text-xs text-slate-400 font-mono mt-0.5">{l.customerMobile} | {l.city}</div>
                                </td>
                                <td className="py-4 px-6 text-slate-700 font-medium">
                                  {l.productType}
                                </td>
                                <td className="py-4 px-6">
                                  <div className="text-slate-800 font-medium text-xs">{l.agentName}</div>
                                </td>
                                <td className="py-4 px-6">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusBadge(l.status)}`}>
                                    {l.status === 'pending' ? 'Review Needed' : l.status.replace("_", " ")}
                                  </span>
                                </td>
                                <td className="py-4 px-6">
                                  <button
                                    onClick={() => setExpandedLeadId(isExpanded ? null : l.id)}
                                    className="text-teal-600 hover:text-teal-850 text-xs font-semibold hover:underline flex items-center space-x-1"
                                  >
                                    <span>Logs ({l.statusHistory.length})</span>
                                    <ChevronDown className={`w-3.5 h-3.5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </button>
                                </td>
                                <td className="py-4 px-6 text-right">
                                  {l.status === "pending" ? (
                                    <button
                                      onClick={() => {
                                        setReviewingLead(l);
                                        setReviewAction("approve");
                                      }}
                                      className="bg-indigo-650 hover:bg-indigo-750 bg-indigo-600 text-white font-semibold text-xs py-1.5 px-3 rounded-lg transition"
                                    >
                                      Review & Escalate
                                    </button>
                                  ) : (
                                    <span className="text-xs text-slate-400 italic">Oversight complete</span>
                                  )}
                                </td>
                              </tr>

                              {/* Expanded Status History timeline */}
                              <tr className={isExpanded ? "bg-slate-50/50" : "hidden"}>
                                <td colSpan={6} className="py-5 px-8">
                                  <div className="border-l-2 border-indigo-500 pl-6 ml-2 space-y-3.5 py-1">
                                    <h4 className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">Review Audit Timeline</h4>
                                    
                                    {l.statusHistory.map((hist, index) => (
                                      <div key={index} className="space-y-1 relative">
                                        <div className="absolute -left-[31px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 border border-white" />
                                        
                                        <div className="flex items-center space-x-2 text-xs">
                                          <span className="font-bold text-slate-700">{hist.updatedBy}</span>
                                          <span className="text-[10px] text-slate-450 font-mono italic">({hist.updatedByRole.toUpperCase()})</span>
                                          <span className="text-slate-350">•</span>
                                          <span className="text-[10px] font-mono text-slate-400">{new Date(hist.updatedAt).toLocaleString()}</span>
                                        </div>
                                        
                                        <div className="text-xs text-slate-600 bg-white p-2 border border-slate-100 rounded max-w-xl shadow-xs font-light">
                                          <span className="uppercase text-[9px] font-mono bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 text-slate-700 font-bold mr-2">{hist.status}</span>
                                          {hist.notes}
                                        </div>
                                      </div>
                                    ))}

                                    {/* Uploaded items verification */}
                                    {l.documentName && (
                                      <div className="pt-2 border-t border-slate-200 p-1 max-w-lg mt-4 ">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">KYC Verification Files Attached:</span>
                                        <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded border border-slate-200 mt-1 shadow-xs">
                                          <FileText className="w-4 h-4 text-slate-400" />
                                          <span className="text-xs font-mono text-slate-700 truncate">{l.documentName}</span>
                                          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold uppercase ml-auto">Simulated S3</span>
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

              {/* Remarks review Dialog modal */}
              {reviewingLead && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-indigo-100"
                  >
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-lg text-slate-800 font-display">Escalate Customer Profile</h3>
                      <p className="text-xs text-slate-500">Submitted details for <span className="font-semibold">{reviewingLead.customerName}</span> ({reviewingLead.productType}).</p>
                    </div>

                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                      <div className="flex space-x-4 border border-slate-150 p-1 bg-slate-50 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setReviewAction("approve")}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                            reviewAction === "approve" 
                              ? "bg-emerald-600 text-white shadow-xs" 
                              : "text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          Clear & Recommend to HQ
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setReviewAction("reject")}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                            reviewAction === "reject" 
                              ? "bg-rose-600 text-white shadow-xs" 
                              : "text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          Reject Eligibility File
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-650">Audit remarks & Remarks *</label>
                        <textarea
                          rows={4}
                          className="w-full text-sm bg-slate-50 border border-slate-200 p-3 rounded-lg focus:outline-none"
                          placeholder="Provide audit notes such as verified income slips, eligible parameters, or reason for immediate rejection..."
                          value={reviewRemarks}
                          onChange={e => setReviewRemarks(e.target.value)}
                          required
                        />
                      </div>

                      <div className="flex space-x-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setReviewingLead(null)}
                          className="px-4 py-2 text-xs text-slate-500 hover:underline font-semibold"
                        >
                          Cancel review
                        </button>
                        <button
                          type="submit"
                          disabled={submittingReview}
                          className={`px-5 py-2 text-xs font-semibold text-white rounded-lg transition ${
                            reviewAction === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                          }`}
                        >
                          {submittingReview ? "Submitting..." : "Publish Decision"}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}

          {/* Performance Reports and analytical charts Tab */}
          {activeTab === "reports" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              key="reports"
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold text-slate-800 font-display">Performance Reports</h1>
                <p className="text-slate-500 text-sm">Review weekly or monthly conversion ratios, team commission sheets, and pipeline performances.</p>
              </div>

              {/* Reports distribution lists */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2">
                    <Bookmark className="text-indigo-655 text-indigo-600 w-5 h-5" />
                    <h3 className="font-bold text-sm text-slate-800">Daily Activity Report</h3>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-2 font-light">
                    <li className="flex justify-between"><span>New Leads Submitted Today:</span> <span className="font-mono font-bold">0</span></li>
                    <li className="flex justify-between"><span>Active Agents active:</span> <span className="font-mono font-bold">{teamAgents.length}</span></li>
                  </ul>
                  <button onClick={() => alert("Report compiled! Simulated PDF download initiated.")} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold py-2 rounded-xl transition">
                    Export Daily PDF
                  </button>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2">
                    <Bookmark className="text-indigo-650 text-indigo-600 w-5 h-5" />
                    <h3 className="font-bold text-sm text-slate-800 font-display">Weekly Lead Conversions</h3>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-2 font-light">
                    <li className="flex justify-between"><span>Average Processing Time:</span> <span className="font-mono font-bold">3.2 Days</span></li>
                    <li className="flex justify-between"><span>Total Team Conversions:</span> <span className="font-mono font-bold">{formatValue(teamEarningsSum)}</span></li>
                  </ul>
                  <button onClick={() => alert("Weekly charts compiled!")} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold py-2 rounded-xl transition">
                    Export Weekly XLS
                  </button>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2">
                    <Bookmark className="text-indigo-650 text-indigo-600 w-5 h-5" />
                    <h3 className="font-bold text-sm text-slate-800 font-display">Monthly Commission Statements</h3>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-2 font-light">
                    <li className="flex justify-between"><span>Override Dividends Drafted:</span> <span className="font-mono font-bold">{formatValue(teamEarningsSum * 0.05)}</span></li>
                    <li className="flex justify-between"><span>Top Performer Agent:</span> <span className="font-semibold text-emerald-700 truncate max-w-[120px]">{agentPerformanceMap.slice().sort((a,b)=>b.commissionGenerated - a.commissionGenerated)[0]?.agent.name || "N/A"}</span></li>
                  </ul>
                  <button onClick={() => alert("Monthly audit statement generated successfully.")} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold py-2 rounded-xl transition">
                    Generate Monthly Audit
                  </button>
                </div>

              </div>

              {/* Agent Wise Reports */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                <h3 className="font-bold text-sm text-slate-800">Agent Performance Visualizer</h3>
                <div className="space-y-4">
                  {agentPerformanceMap.map(({ agent: ag, totalLeads, approvedCount, commissionGenerated }) => {
                    const ratio = totalLeads > 0 ? (approvedCount / totalLeads) * 100 : 0;
                    return (
                      <div key={ag.id} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700">{ag.name}</span>
                          <span className="text-slate-500 font-mono">Conversion Ratio: {ratio.toFixed(0)}% ({formatValue(commissionGenerated)})</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Selling & Overrides Hub */}
          {activeTab === "earnings_guide" && (() => {
            const approvedCount = approvedLeads.length;
            const submittedCount = teamLeads.length;
            const leadershipXP = (submittedCount * 100) + (approvedCount * 500);

            let leaderRank = "Bronze Captain";
            let overrideRate = "5.0%";
            let nextRank = "Silver Manager";
            let pointsNeededForNext = 1000 - leadershipXP;
            let progressPercentage = Math.min((leadershipXP / 1000) * 100, 100);

            if (leadershipXP >= 1000 && leadershipXP < 2500) {
              leaderRank = "Silver Manager";
              overrideRate = "5.5%";
              nextRank = "Gold Director";
              pointsNeededForNext = 2500 - leadershipXP;
              progressPercentage = Math.min(((leadershipXP - 1000) / (2500 - 1000)) * 100, 100);
            } else if (leadershipXP >= 2500 && leadershipXP < 5000) {
              leaderRank = "Gold Director";
              overrideRate = "6.5%";
              nextRank = "Elite Managing Partner";
              pointsNeededForNext = 5000 - leadershipXP;
              progressPercentage = Math.min(((leadershipXP - 2500) / (5000 - 2500)) * 100, 100);
            } else if (leadershipXP >= 5000) {
              leaderRank = "Elite Managing Partner";
              overrideRate = "8.0%";
              nextRank = "DSA Legend Lead";
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
                  <h1 className="text-2xl font-bold text-indigo-950 font-display">Selling & Overrides Hub</h1>
                  <p className="text-slate-500 text-sm">Review your leadership tier overrides, team points consolidation, and guidelines to scale agent conversions.</p>
                </div>

                {/* Gamified Points Banner */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-4 bg-gradient-to-tr from-slate-900 to-indigo-950 p-6 rounded-2xl text-white relative overflow-hidden h-full flex flex-col justify-between min-h-[180px]">
                    <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 opacity-10">
                      <Award className="w-40 h-40" />
                    </div>
                    <div>
                      <span className="text-indigo-300 text-xs uppercase tracking-widest font-mono font-bold">Leadership Grade</span>
                      <h2 className="text-2xl font-bold font-display mt-1 text-teal-400">{leaderRank}</h2>
                      <div className="mt-2 text-xs text-indigo-200">
                        Commission Override: <span className="font-mono text-emerald-400 font-bold">{overrideRate}</span>
                      </div>
                    </div>
                    <div className="mt-6">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-indigo-300 font-bold">Consolidated Leadership XP</span>
                      <p className="text-2xl font-mono font-extrabold text-white">{leadershipXP} <span className="text-xs text-indigo-400">Points</span></p>
                    </div>
                  </div>

                  <div className="lg:col-span-8 space-y-4">
                    <h3 className="font-bold text-slate-800 font-display text-base">Leadership Progression Index</h3>
                    <p className="text-xs text-slate-500">Every team-registered lead submission credits your dashboard with <span className="font-bold">100 Points</span>. Bank clearances for team approvals award <span className="font-bold">500 Points</span>. Accelerate team velocity to advance grades and increase overrides payout percentages!</p>
                    
                    <div className="space-y-1 pt-2">
                      <div className="flex justify-between text-xs font-mono text-slate-600">
                        <span>XP: {leadershipXP} / {leadershipXP + Math.max(0, pointsNeededForNext)} PTS</span>
                        {pointsNeededForNext > 0 ? (
                          <span>{pointsNeededForNext} PTS to Next Grade ({nextRank})</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">Max Managing Partner Reached!</span>
                        )}
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div 
                          className="bg-teal-500 lg:bg-gradient-to-r lg:from-teal-400 lg:to-indigo-550 h-full rounded-full transition-all duration-500 bg-teal-600"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-2 text-[10.5px]">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center font-light">
                        <span className="text-slate-400 uppercase font-mono tracking-wider font-semibold">Bronze Captain</span>
                        <p className="font-bold text-slate-700 mt-0.5">5.0% Override</p>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                        <span className="text-slate-400 uppercase font-mono tracking-wider font-semibold">Silver Manager</span>
                        <p className="font-bold text-slate-700 mt-0.5">5.5% Override</p>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center font-light">
                        <span className="text-slate-400 uppercase font-mono tracking-wider font-semibold">Gold Director</span>
                        <p className="font-bold text-slate-700 mt-0.5">6.5% Override</p>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center border-teal-500 bg-teal-50/20">
                        <span className="text-teal-600 uppercase font-mono tracking-wider font-bold">Elite Partner</span>
                        <p className="font-bold text-teal-800 mt-0.5">8.0% Override</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Guidelines & Strategies Matrix */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                    <Coins className="w-5 h-5 text-indigo-650" />
                    <h3 className="font-bold text-base text-indigo-950 font-display">Leadership Override & Product-Wise Target Mechanics</h3>
                  </div>

                  <p className="text-xs text-slate-500">Provide targeted mentoring and compliance checks to your agents using the reference sheets below to ensure a zero-rectification flow.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                      <span className="text-[10px] font-bold font-mono text-teal-600 uppercase">Instant & Personal Loans Distribution</span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        <span className="font-bold text-slate-800">Target Check:</span> Guide agents to check salary proofs and active loans to verify the client's Debt-to-Income ratio is below 45% before profile submissions. Mismatches block payouts.
                      </p>
                      <div className="text-[11px] font-mono text-slate-500">
                        Leader overrides calculation: <span className="font-bold">{overrideRate} on disbursed values</span>.
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                      <span className="text-[10px] font-bold font-mono text-teal-600 uppercase">Premium Credit Cards Distribution</span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        <span className="font-bold text-slate-800">Target Check:</span> Direct marketing channels exclusively at credit card customers who have existing cards with limits above ₹50,000. It bypasses conventional salary slips completely, doubling approvals!
                      </p>
                      <div className="text-[11px] font-mono text-slate-500">
                        Leader overrides calculation: <span className="font-bold">{overrideRate} on disbursed values</span>.
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                      <span className="text-[10px] font-bold font-mono text-teal-600 uppercase">Home Loans & Corporate Mortgages</span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        <span className="font-bold text-slate-800">Target Check:</span> Check property clearance certificates first. Ensure properties have active approved builder maps. High ticket volume yields large-tier overriding bonuses.
                      </p>
                      <div className="text-[11px] font-mono text-slate-500">
                        Leader overrides calculation: <span className="font-bold">{overrideRate} on disbursed values</span>.
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                      <span className="text-[10px] font-bold font-mono text-teal-600 uppercase">Clean Energy Government Initiatives</span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        <span className="font-bold text-slate-800">Target Check:</span> Pitch PM Surya Rooftop initiatives to families with owned concrete terrace regions. Guide agents to secure latest electricity bills with high monthly ratings.
                      </p>
                      <div className="text-[11px] font-mono text-slate-500">
                        Leader overrides calculation: <span className="font-bold">{overrideRate} on disbursed values</span>.
                      </div>
                    </div>
                  </div>

                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex items-start space-x-3.5">
                  <Award className="w-5 h-5 text-indigo-650 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h4 className="text-indigo-900 font-bold text-sm font-display">System Overrides Calculations & Compliance Guidelines</h4>
                    <p className="text-indigo-805 text-xs leading-relaxed text-indigo-850">
                      Leadership overrides are drafted automatically to your reports and statement sheets as soon as bank approvals are signed off for any agent under your referral umbrella matching your active Multiplier Overrides percentage (<span className="font-bold">Currently {overrideRate}</span>). Monitor your agents and host training sessions down the broad notification panel.
                    </p>
                  </div>
                </div>

              </motion.div>
            );
          })()}

        </AnimatePresence>
      </main>
    </div>
  );
}

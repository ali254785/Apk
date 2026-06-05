import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building, Smartphone, Coins, ShieldAlert, Key, 
  RefreshCw, LogOut, Lock, CheckSquare, Sparkles, HelpCircle 
} from "lucide-react";
import { User, Product, Lead, WithdrawalRequest, Wallet, Notification } from "./types";
import { getAppState, resetAppState } from "./api";

// Import Role Sub-Dashboards
import AgentDashboard from "./components/AgentDashboard";
import TLDashboard from "./components/TLDashboard";
import AdminDashboard from "./components/AdminDashboard";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Server state caches
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Auth & Impersonation States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mobileNumber, setMobileNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerifyError, setOtpVerifyError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  // Load app state
  const fetchState = async () => {
    try {
      setLoading(true);
      const data = await getAppState();
      setUsers(data.users);
      setProducts(data.products);
      setLeads(data.leads);
      setWithdrawals(data.withdrawals);
      setWallets(data.wallets);
      setNotifications(data.notifications);
      
      // Keep existing session user updated if logged in
      if (currentUser) {
        const matchingCurrent = data.users.find(u => u.id === currentUser.id);
        if (matchingCurrent) {
          setCurrentUser(matchingCurrent);
        }
      }
      setError("");
    } catch (err: any) {
      console.error(err);
      setError("Failed to synchronize with CapitalAxis backend server. Please verify your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  // Soft Restore database settings
  const handleResetState = async () => {
    if (confirm("Reset current database registry back to default seed portfolios? Your custom entries will be wiped.")) {
      try {
        setLoading(true);
        const data = await resetAppState();
        fetchState();
        
        // Auto sign-in or reset session
        setCurrentUser(null);
        setOtpSent(false);
        setMobileNumber("");
        setOtpCode("");
      } catch (err: any) {
        alert("Reset failed: " + err.message);
      }
    }
  };

  // Perform OTP Simulate Login Action
  const handleOtpSend = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpVerifyError("");
    if (mobileNumber.length < 10) {
      setOtpVerifyError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setOtpLoading(true);
    setTimeout(() => {
      // Find matching user in database by phone number
      const match = users.find(u => u.mobile === mobileNumber);
      if (!match) {
        setOtpVerifyError("This mobile number is not registered down CapitalAxis list. Use Sandbox Impersonator list below.");
        setOtpLoading(false);
        return;
      }

      setOtpSent(true);
      setOtpLoading(false);
    }, 1000);
  };

  const handleOtpVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    setOtpVerifyError("");

    setTimeout(() => {
      if (otpCode !== "123456" && otpCode !== "000000") {
        setOtpVerifyError("Invalid SMS verification OTP code. Hint: Use standard '123456' for simulation clearance.");
        setOtpLoading(false);
        return;
      }

      const match = users.find(u => u.mobile === mobileNumber);
      if (match) {
        setCurrentUser(match);
        setMobileNumber("");
        setOtpCode("");
        setOtpSent(false);
      } else {
        setOtpVerifyError("Authentication profile detached.");
      }
      setOtpLoading(false);
    }, 1000);
  };

  const logout = () => {
    setCurrentUser(null);
  };

  // Quick impersonator selection helper
  const impersonate = (user: User) => {
    setCurrentUser(user);
    setOtpSent(false);
    setMobileNumber("");
    setOtpCode("");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-teal-500 selection:text-white" id="main-application-frame">
      
      {/* Dev sandbox helper control board bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-300 shadow-lg relative z-55" id="developer-sandbox-bar">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span className="font-bold font-mono tracking-wider text-teal-400">SANDBOX TEST RAIL:</span>
          <span className="text-slate-300 font-light truncate max-w-[200px] sm:max-w-none">Fintech Lead Simulation (CapitalAxis Consultancy)</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick selectors */}
          <span className="text-slate-400 hidden lg:inline">Quick Login:</span>
          
          <button
            onClick={() => impersonate(users.find(u => u.role === "admin") || users[0])}
            className="bg-slate-800 hover:bg-teal-700/40 border border-teal-500/20 text-teal-300 px-2 py-1 rounded transition text-[10.5px] font-semibold"
          >
            Ananya (Admin)
          </button>
          
          <button
            onClick={() => impersonate(users.find(u => u.role === "tl") || users[0])}
            className="bg-slate-800 hover:bg-teal-700/40 border border-teal-500/20 text-teal-305 px-2 py-1 rounded transition text-[10.5px] font-semibold"
          >
            Rajesh (TL)
          </button>
          
          <button
            onClick={() => impersonate(users.find(u => u.id === "user-agent-1") || users[0])}
            className="bg-slate-800 hover:bg-teal-700/40 border border-teal-500/20 text-teal-300 px-2 py-1 rounded transition text-[10.5px] font-semibold"
          >
            Amit (Agent)
          </button>

          <button
            onClick={handleResetState}
            className="bg-red-955 bg-rose-950/20 hover:bg-rose-900/40 border border-rose-500/25 text-rose-300 px-2 py-1 rounded transition font-mono text-[10px]"
          >
            Reset Database Seed
          </button>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center z-50">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-900 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-500 font-medium animate-pulse">Syncing CapitalAxis Ledger Database...</p>
        </div>
      )}

      {/* Main Header */}
      <header className="bg-white border-b border-slate-100 py-3.5 px-6 flex items-center justify-between shrink-0" id="app-corporate-header">
        <div className="flex items-center space-x-2.5">
          <div className="bg-gradient-to-tr from-slate-900 to-slate-800 text-teal-400 p-2.5 rounded-xl shadow-md border border-slate-700 shrink-0">
            <Building className="w-5.5 h-5.5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-slate-900 font-display leading-none">CapitalAxis Consultancy</h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono mt-0.5 leading-none">DSA Referral & CRM App</p>
          </div>
        </div>

        {currentUser && (
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <span className="bg-slate-100 text-slate-700 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-slate-205">
                {currentUser.role.toUpperCase()} Portal
              </span>
              <p className="text-xs font-bold text-slate-800 font-display mt-1">{currentUser.name}</p>
            </div>

            <button
              onClick={logout}
              className="p-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition text-slate-500 border border-slate-100"
              title="Logout Account Session"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        )}
      </header>

      {/* Core Screen Router */}
      <div className="flex-1 flex flex-col">
        {currentUser ? (
          /* Route based on user role */
          currentUser.role === "admin" ? (
            <AdminDashboard 
              admin={currentUser}
              allUsers={users}
              products={products}
              leads={leads}
              withdrawals={withdrawals}
              wallets={wallets}
              notifications={notifications}
              onRefresh={fetchState}
            />
          ) : currentUser.role === "tl" ? (
            <TLDashboard 
              tl={currentUser}
              allUsers={users}
              leads={leads}
              notifications={notifications}
              onRefresh={fetchState}
            />
          ) : (
            <AgentDashboard 
              agent={currentUser}
              products={products}
              leads={leads}
              wallet={wallets.find(w => w.agentId === currentUser.id)}
              notifications={notifications}
              allUsers={users}
              onRefresh={fetchState}
            />
          )
        ) : (
          /* OTP Auth simulation splash screen */
          <div className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 bg-slate-50 relative overflow-hidden" id="auth-splash-screen">
            
            {/* Background design accents */}
            <div className="absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 w-96 h-96 bg-teal-100/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute left-0 bottom-0 -translate-x-1/3 translate-y-1/3 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white rounded-3xl p-6 lg:p-10 shadow-xl border border-slate-100 relative z-10">
              
              {/* Product Info columns */}
              <div className="lg:col-span-7 space-y-6 lg:border-r lg:border-slate-100 lg:pr-10">
                <div className="space-y-2">
                  <div className="inline-flex items-center space-x-1.5 bg-teal-50 text-teal-800 text-[11px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border border-teal-100">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>DSA Consultancy Platform</span>
                  </div>
                  <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-905 font-display text-slate-900 tracking-tight">Accelerate Banking Distributions.</h2>
                  <p className="text-slate-500 text-sm">Welcome to CapitalAxis, India's leading unified fintech referral desk. Earn direct incentives by sharing verified bank tracking links and uploading customer profiles directly to leadership teams.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                    <h4 className="font-bold text-sm text-slate-800 font-display">Fast Settlements</h4>
                    <p className="text-xs text-slate-500">Every bank disbursement credits your agency wallet securely. Requests approved within minutes.</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                    <h4 className="font-bold text-sm text-slate-800 font-display">Premium Partners</h4>
                    <p className="text-xs text-slate-505 text-slate-500">Direct integration under CapitalAxis agency licenses with ICICI, HDFC, SBI, Kotak and government clean energy solar funds.</p>
                  </div>
                </div>

                {/* Simulated list helpers */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold block">Available Impersonations registry:</span>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {users.slice(0, 4).map(usr => (
                      <button 
                        key={usr.id}
                        onClick={() => impersonate(usr)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl transition border border-slate-200/60 font-medium"
                      >
                        {usr.name} ({usr.role === 'tl' ? 'Leader' : usr.role === 'admin' ? 'CEO' : 'Agent'})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Simulated OTP form Column */}
              <div className="lg:col-span-5 space-y-6">
                <div className="text-center lg:text-left space-y-1">
                  <h3 className="font-bold text-xl text-slate-800 font-display">Mobile OTP Authentication</h3>
                  <p className="text-slate-400 text-xs font-light">Input phone number associated with your CapitalAxis agent file.</p>
                </div>

                {otpVerifyError && (
                  <div className="p-3.5 bg-rose-55 bg-rose-50 border border-rose-150 text-rose-800 text-xs rounded-xl font-medium flex items-start space-x-2">
                    <ShieldAlert className="w-4.5 h-4.5 shrink-0 text-rose-500 mt-0.5" />
                    <span>{otpVerifyError}</span>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {!otpSent ? (
                    /* Enter Mobile form */
                    <motion.form
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      key="mobile-form"
                      onSubmit={handleOtpSend}
                      className="space-y-4"
                    >
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600">Registered Mobile Number</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 font-mono text-sm text-slate-400">+91</span>
                          <input 
                            type="tel" 
                            maxLength={10}
                            className="w-full text-sm bg-slate-50 border border-slate-200 pl-11 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white font-mono"
                            placeholder="9555123456"
                            value={mobileNumber}
                            onChange={e => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                            required
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">Hint: Try Amit's registered terminal number: <b>9555123456</b></span>
                      </div>

                      <button
                        type="submit"
                        disabled={otpLoading}
                        className="w-full bg-slate-900 border border-slate-100 text-teal-400 font-bold text-xs py-3 rounded-xl hover:bg-slate-800 transition flex items-center justify-center space-x-2"
                      >
                        {otpLoading ? (
                          <span className="animate-spin w-4 h-4 border-2 border-teal-400 rounded-full border-t-transparent" />
                        ) : (
                          <Smartphone className="w-4 h-4" />
                        )}
                        <span>Request OTP authentication</span>
                      </button>
                    </motion.form>
                  ) : (
                    /* Enter Verification code OTP form */
                    <motion.form
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      key="otp-form"
                      onSubmit={handleOtpVerify}
                      className="space-y-4"
                    >
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600">SMS Verification Code</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            maxLength={6}
                            className="w-full text-center text-lg font-bold bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white tracking-widest font-mono"
                            placeholder="******"
                            value={otpCode}
                            onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))}
                            required
                          />
                        </div>
                        <p className="text-[10px] text-center text-slate-500 font-semibold bg-indigo-50 border border-indigo-100 p-1.5 rounded-lg">OTP Simulate Sent to +91 {mobileNumber}! Standard secure bypass code is: <b>123456</b></p>
                      </div>

                      <button
                        type="submit"
                        disabled={otpLoading}
                        className="w-full bg-slate-900 border border-slate-100 text-teal-400 font-bold text-xs py-3 rounded-xl hover:bg-slate-850 transition flex items-center justify-center space-x-2"
                      >
                        {otpLoading ? (
                          <span className="animate-spin w-4 h-4 border-2 border-teal-400 rounded-full border-t-transparent" />
                        ) : (
                          <Key className="w-4 h-4" />
                        )}
                        <span>Confirm OTP and Unlock</span>
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => setOtpSent(false)}
                          className="text-xs text-slate-400 hover:text-slate-800 underline font-medium"
                        >
                          Modify Mobile Number
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </div>
        )}
      </div>

    </div>
  );
}

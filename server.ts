import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { User, Product, Lead, WithdrawalRequest, Wallet, Notification, LeadStatus, ProductType } from "./src/types";

// DB Path
const DB_FILE = path.join(process.cwd(), "db_state.json");

// Helper to generate UUIDs
function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

// Initial seed data
const initialUsers: User[] = [
  {
    id: "user-admin-1",
    name: "Ananya Sen",
    email: "ananya.sen@capitalaxis.in",
    mobile: "9876543210",
    role: "admin",
    status: "active",
    kycStatus: "approved",
    createdAt: new Date("2026-01-10T10:00:00Z").toISOString(),
  },
  {
    id: "user-tl-1",
    name: "Rajesh Kumar",
    email: "rajesh.tl@capitalaxis.in",
    mobile: "8765432109",
    role: "tl",
    status: "active",
    kycStatus: "approved",
    createdAt: new Date("2026-02-15T11:00:00Z").toISOString(),
  },
  {
    id: "user-tl-2",
    name: "Priya Murthy",
    email: "priya.tl@capitalaxis.in",
    mobile: "7654321098",
    role: "tl",
    status: "active",
    kycStatus: "approved",
    createdAt: new Date("2026-02-20T11:00:00Z").toISOString(),
  },
  {
    id: "user-agent-1",
    name: "Amit Patel",
    email: "amit.patel@gmail.com",
    mobile: "9555123456",
    role: "agent",
    status: "active",
    kycStatus: "approved",
    tlId: "user-tl-1",
    kycDetails: {
      panNumber: "ABCDE1234F",
      aadhaarNumber: "123456789012",
      bankAccount: "91234567890",
      ifscCode: "HDFC0001234",
      documentName: "pan_card_amit.pdf",
    },
    createdAt: new Date("2026-03-01T09:00:00Z").toISOString(),
  },
  {
    id: "user-agent-2",
    name: "Sneha Patil",
    email: "sneha.patil@gmail.com",
    mobile: "9555987654",
    role: "agent",
    status: "active",
    kycStatus: "pending",
    tlId: "user-tl-1",
    kycDetails: {
      panNumber: "XYZW9876Q",
      aadhaarNumber: "987654321098",
      bankAccount: "50100200300",
      ifscCode: "ICIC0000011",
      documentName: "kyc_docs_patil.zip",
    },
    createdAt: new Date("2026-03-05T14:30:00Z").toISOString(),
  },
  {
    id: "user-agent-3",
    name: "Vikram Rathore",
    email: "vikram.rathore@gmail.com",
    mobile: "9555112233",
    role: "agent",
    status: "active",
    kycStatus: "approved",
    tlId: "user-tl-2",
    kycDetails: {
      panNumber: "EDCBA4321Z",
      aadhaarNumber: "555566667777",
      bankAccount: "444455556666",
      ifscCode: "SBIN0000123",
      documentName: "v_pan.png",
    },
    createdAt: new Date("2026-03-10T10:15:00Z").toISOString(),
  },
];

const initialProducts: Product[] = [
  {
    id: "prod-cc-hdfc",
    name: "HDFC Bank Regalia Gold Credit Card",
    type: "Credit Card",
    description: "Premium credit card with complimentary airport lounge access, 4X reward points, and milestone benefits.",
    referralLink: "https://www.hdfcbank.com/personal/pay/cards/credit-cards/regalia-gold?referral=CAPAXIS",
    commissionRate: "₹3,500 Flat payout",
    minScoreRequired: 730,
    features: [
      "Complementary Club Vistara Silver Membership",
      "M&S, Reliance Digital, Marriott, and Decathlon vouchers on milestones",
      "5% cash savings on flights/hotels via SmartBuy",
    ],
  },
  {
    id: "prod-cc-sbi",
    name: "SBI SimplyCLICK Credit Card",
    type: "Credit Card",
    description: "Excellent entry-level credit card for online shoppers with high rewards on partner merchants.",
    referralLink: "https://www.sbicard.com/sbi-simplyclick?referral=CAPAXIS",
    commissionRate: "₹2,000 Flat payout",
    minScoreRequired: 680,
    features: [
      "10X reward points on online spend partners (Amazon, Cleartrip, BookMyShow)",
      "₹500 gift voucher on joining",
      "1% fuel surcharge waiver",
    ],
  },
  {
    id: "prod-pl-icici",
    name: "ICICI Bank Express Personal Loan",
    type: "Personal Loan",
    description: "Fast-approval personal loans with attractive interest rates and flexible tenures for salaried individuals.",
    referralLink: "https://www.icicibank.com/personal-loan?referral=CAPAXIS",
    commissionRate: "2.2% of loan disbursement",
    minScoreRequired: 720,
    features: [
      "Disbursement within minutes for pre-approved users",
      "Minimal document requirement",
      "Flexible repayment options up to 72 months",
    ],
  },
  {
    id: "prod-il-mirae",
    name: "Mirae Asset Instant Loan Against Mutual Funds",
    type: "Instant Loan",
    description: "Instant liquid cash loan backed by mutual fund investments without breaking your portfolio.",
    referralLink: "https://miraeasset.in/instant-lamf?referral=CAPAXIS",
    commissionRate: "1.5% of loan limit",
    minScoreRequired: 650,
    features: [
      "Pure digital flow with zero physical papers",
      "Interest charged only on drawn amount",
      "No foreclosure charges",
    ],
  },
  {
    id: "prod-hl-sbi",
    name: "SBI Shaurya Home Loan",
    type: "Home Loan",
    description: "Goverment and defence employee dedicated low-interest home loans with long repayment tenures.",
    referralLink: "https://sbi.co.in/home-loans/shaurya?referral=CAPAXIS",
    commissionRate: "0.45% of loan amount (Max ₹75,000)",
    minScoreRequired: 750,
    features: [
      "Special concession in interest rate for women borrowers",
      "Zero processing fees during campaign periods",
      "Repayment up to 30 years",
    ],
  },
  {
    id: "prod-bl-kotak",
    name: "Kotak Mahindra Business Loan",
    type: "Business Loan",
    description: "Unsecured business loans for expanding facilities, getting machinery, or managing working capital.",
    referralLink: "https://www.kotak.com/business-loan?referral=CAPAXIS",
    commissionRate: "2.5% of disbursed loan amount",
    features: [
      "No collateral or guarantor required",
      "Loan amounts up to ₹75 Lakhs",
      "Quick credit decision based on bank statements",
    ],
  },
  {
    id: "prod-sa-axis",
    name: "Axis Bank ASAP Digital Savings Account",
    type: "Savings Account",
    description: "Instant full KYC savings account opened on video call with daily interest payouts and premium debit card.",
    referralLink: "https://www.axisbank.com/asap-savings?referral=CAPAXIS",
    commissionRate: "₹450 Flat",
    features: [
      "6% interest rate via virtual sweep FD",
      "Unlimited transactions on digital bank channels",
      "10% cashback on Grab-deals and Amazon shopping",
    ],
  },
  {
    id: "prod-ps-rooftop",
    name: "PM Surya Ghar Rooftop Solar Loan",
    type: "PM Surya Rooftop",
    description: "Special subsidy lending scheme for rooftop solar installations backed by clean energy credits.",
    referralLink: "https://pmsuryaghar.gov.in/loans?referral=CAPAXIS",
    commissionRate: "₹3,000 Flat payout",
    minScoreRequired: 600,
    features: [
      "Up to 40% government subsidy processing",
      "Extremely low interest rates (7% p.a.)",
      "Net metering integration options included",
    ],
  },
  {
    id: "prod-dm-zerodha",
    name: "Zerodha Demat & Trading Account",
    type: "Demat Account",
    description: "India's largest discount broker providing investments in shares, mutual funds, gold bonds, and futures.",
    referralLink: "https://zerodha.com/open-account?referral=CAPAXIS",
    commissionRate: "₹300 flat + 10% brokerage sharing",
    features: [
      "Zero brokerage on equity delivery investments",
      "Stunning console and mobile trading tools (Kite/Coin)",
      "Direct gold and sovereign bond application support",
    ],
  },
];

const initialLeads: Lead[] = [
  {
    id: "lead-1",
    customerName: "Ramesh Chandra",
    customerMobile: "9812345678",
    city: "New Delhi",
    productType: "Personal Loan",
    notes: "Requires ₹5 Lakhs personal loan for daughter's wedding. Good credit track.",
    agentId: "user-agent-1",
    agentName: "Amit Patel",
    tlId: "user-tl-1",
    tlName: "Rajesh Kumar",
    status: "bank_approved",
    documentUrl: "/documents/pay_slips_ramesh.pdf",
    documentName: "pay_slips_ramesh.pdf",
    commissionPaid: 11000, // 2.2% of 5L
    statusHistory: [
      {
        status: "pending",
        updatedBy: "Amit Patel",
        updatedByRole: "agent",
        notes: "Lead submitted. Prefers ICICI or HDFC.",
        updatedAt: new Date("2026-05-10T10:00:00Z").toISOString(),
      },
      {
        status: "tl_reviewed",
        updatedBy: "Rajesh Kumar",
        updatedByRole: "tl",
        notes: "Verified income details and salary slip. Looks strong and eligible.",
        updatedAt: new Date("2026-05-11T12:00:00Z").toISOString(),
      },
      {
        status: "admin_verified",
        updatedBy: "Ananya Sen",
        updatedByRole: "admin",
        notes: "Pushed to ICICI portal under CapitalAxis partner ID: CAXP-908.",
        updatedAt: new Date("2026-05-12T15:00:00Z").toISOString(),
      },
      {
        status: "bank_approved",
        updatedBy: "Ananya Sen",
        updatedByRole: "admin",
        notes: "Bank approved loan ID L-987823 for ₹5,00,000. Commission of ₹11,000 credited to Wallet.",
        updatedAt: new Date("2026-05-15T18:00:00Z").toISOString(),
      },
    ],
    createdAt: new Date("2026-05-10T10:00:00Z").toISOString(),
    updatedAt: new Date("2026-05-15T18:00:00Z").toISOString(),
  },
  {
    id: "lead-2",
    customerName: "Gaurav Malhotra",
    customerMobile: "8899887766",
    city: "Mumbai",
    productType: "Credit Card",
    notes: "Interested in HDFC Regalia Gold card. Highly active corporate traveler.",
    agentId: "user-agent-1",
    agentName: "Amit Patel",
    tlId: "user-tl-1",
    tlName: "Rajesh Kumar",
    status: "tl_reviewed",
    documentUrl: "/documents/itr_gaurav.pdf",
    documentName: "itr_gaurav.pdf",
    commissionPaid: 0,
    statusHistory: [
      {
        status: "pending",
        updatedBy: "Amit Patel",
        updatedByRole: "agent",
        notes: "Lead added. Customer verified OTP and shared 3-year ITR copy.",
        updatedAt: new Date("2026-05-20T11:30:00Z").toISOString(),
      },
      {
        status: "tl_reviewed",
        updatedBy: "Rajesh Kumar",
        updatedByRole: "tl",
        notes: "Salary is >15L per annum. Perfect fit for Regalia Gold card.",
        updatedAt: new Date("2026-05-22T10:15:00Z").toISOString(),
      },
    ],
    createdAt: new Date("2026-05-20T11:30:00Z").toISOString(),
    updatedAt: new Date("2026-05-22T10:15:00Z").toISOString(),
  },
  {
    id: "lead-3",
    customerName: "Anjali Deshmukh",
    customerMobile: "9000112233",
    city: "Pune",
    productType: "Savings Account",
    notes: "Wants premium digital savings account in Axis Bank. Shared aadhaar.",
    agentId: "user-agent-2",
    agentName: "Sneha Patil",
    tlId: "user-tl-1",
    tlName: "Rajesh Kumar",
    status: "pending",
    documentUrl: "/documents/aadhaar_anjali.pdf",
    documentName: "aadhaar_anjali.pdf",
    commissionPaid: 0,
    statusHistory: [
      {
        status: "pending",
        updatedBy: "Sneha Patil",
        updatedByRole: "agent",
        notes: "Customer is opening online Axis ASAP account using link, shared ID proofs.",
        updatedAt: new Date("2026-06-01T09:45:00Z").toISOString(),
      },
    ],
    createdAt: new Date("2026-06-01T09:45:00Z").toISOString(),
    updatedAt: new Date("2026-06-01T09:45:00Z").toISOString(),
  },
  {
    id: "lead-4",
    customerName: "Sanjay Singhania",
    customerMobile: "9898989800",
    city: "Jaipur",
    productType: "PM Surya Rooftop",
    notes: "Requires solar loan for 5kW rooftop setup. Subsidy scheme client.",
    agentId: "user-agent-3",
    agentName: "Vikram Rathore",
    tlId: "user-tl-2",
    tlName: "Priya Murthy",
    status: "admin_verified",
    documentUrl: "/documents/electricity_bill.pdf",
    documentName: "electricity_bill_singhania.pdf",
    commissionPaid: 0,
    statusHistory: [
      {
        status: "pending",
        updatedBy: "Vikram Rathore",
        updatedByRole: "agent",
        notes: "Customer has clear roof titles and matches credit scores threshold.",
        updatedAt: new Date("2026-05-25T14:00:00Z").toISOString(),
      },
      {
        status: "tl_reviewed",
        updatedBy: "Priya Murthy",
        updatedByRole: "tl",
        notes: "Checked electricity connection verification, eligibility perfect.",
        updatedAt: new Date("2026-05-26T16:20:00Z").toISOString(),
      },
      {
        status: "admin_verified",
        updatedBy: "Ananya Sen",
        updatedByRole: "admin",
        notes: "Submitted to National Rooftop Bank Scheme window under Ref #SURYA-111.",
        updatedAt: new Date("2026-05-28T11:00:00Z").toISOString(),
      },
    ],
    createdAt: new Date("2026-05-25T14:00:00Z").toISOString(),
    updatedAt: new Date("2026-05-28T11:00:00Z").toISOString(),
  },
  {
    id: "lead-5",
    customerName: "Harsh Vardhan",
    customerMobile: "9765432111",
    city: "Bengaluru",
    productType: "Current Account",
    notes: "Trader looking to open HDFC current account. Rejected because business is not registered.",
    agentId: "user-agent-3",
    agentName: "Vikram Rathore",
    tlId: "user-tl-2",
    tlName: "Priya Murthy",
    status: "rejected",
    documentUrl: undefined,
    documentName: undefined,
    commissionPaid: 0,
    statusHistory: [
      {
        status: "pending",
        updatedBy: "Vikram Rathore",
        updatedByRole: "agent",
        notes: "Added current account details for prop business.",
        updatedAt: new Date("2026-05-18T09:00:00Z").toISOString(),
      },
      {
        status: "rejected",
        updatedBy: "Priya Murthy",
        updatedByRole: "tl",
        notes: "No valid GST registration or municipal license attached. Rejected.",
        updatedAt: new Date("2026-05-18T16:00:00Z").toISOString(),
      },
    ],
    createdAt: new Date("2026-05-18T09:00:00Z").toISOString(),
    updatedAt: new Date("2026-05-18T16:00:00Z").toISOString(),
  },
];

const initialWithdrawals: WithdrawalRequest[] = [
  {
    id: "with-1",
    agentId: "user-agent-1",
    agentName: "Amit Patel",
    agentMobile: "9555123456",
    amount: 5000,
    status: "approved",
    requestedAt: new Date("2026-05-16T10:00:00Z").toISOString(),
    processedAt: new Date("2026-05-17T12:00:00Z").toISOString(),
    processedBy: "Ananya Sen",
    notes: "Razorpay payout successful. UTR No: CAXPAY9871A.",
  },
  {
    id: "with-2",
    agentId: "user-agent-1",
    agentName: "Amit Patel",
    agentMobile: "9555123456",
    amount: 4000,
    status: "pending",
    requestedAt: new Date("2026-06-03T11:00:00Z").toISOString(),
  },
];

const initialWallets: Wallet[] = [
  {
    agentId: "user-agent-1",
    totalEarnings: 11000, // From approved lead-1
    withdrawnAmount: 5000,
    currentBalance: 2000, // 11000 - 5000 approved - 4000 pending = 2000 available
    transactions: [
      {
        id: "tx-1",
        type: "credit",
        amount: 11000,
        description: "Commission for Personal Loan approved - Ramesh Chandra",
        status: "completed",
        date: new Date("2026-05-15T18:00:00Z").toISOString(),
      },
      {
        id: "tx-2",
        type: "withdrawal",
        amount: 5000,
        description: "Payout to Bank A/c ...7890 (UTR: CAXPAY9871A)",
        status: "completed",
        date: new Date("2026-05-17T12:00:00Z").toISOString(),
      },
      {
        id: "tx-3",
        type: "withdrawal",
        amount: 4000,
        description: "Payout request pending approval",
        status: "pending",
        date: new Date("2026-06-03T11:00:00Z").toISOString(),
      },
    ],
  },
  {
    agentId: "user-agent-2",
    totalEarnings: 0,
    withdrawnAmount: 0,
    currentBalance: 0,
    transactions: [],
  },
  {
    agentId: "user-agent-3",
    totalEarnings: 0,
    withdrawnAmount: 0,
    currentBalance: 0,
    transactions: [],
  },
];

const initialNotifications: Notification[] = [
  {
    id: "not-1",
    title: "New Premium Product Launched!",
    message: "HDFC Regalia Gold Card is now live under Credit Cards. Earn up to ₹3,500 on flat lead conversions!",
    createdAt: new Date("2026-05-12T09:00:00Z").toISOString(),
  },
  {
    id: "not-2",
    title: "Monthly Mega Target",
    message: "All Team Leaders get additional 5% bonus override on team conversions exceeding ₹2 Lakhs in total commission payouts.",
    role: "tl",
    createdAt: new Date("2026-05-15T10:00:00Z").toISOString(),
  },
  {
    id: "not-3",
    title: "Withdrawal Approved",
    message: "Your withdrawal request for ₹5,000 has been approved and paid on 17th May. Standard check clearing done.",
    userId: "user-agent-1",
    createdAt: new Date("2026-05-17T12:05:00Z").toISOString(),
  },
];

// Combine into standard DB structure
interface DBState {
  users: User[];
  products: Product[];
  leads: Lead[];
  withdrawals: WithdrawalRequest[];
  wallets: Wallet[];
  notifications: Notification[];
}

function getInitialDB(): DBState {
  return {
    users: initialUsers,
    products: initialProducts,
    leads: initialLeads,
    withdrawals: initialWithdrawals,
    wallets: initialWallets,
    notifications: initialNotifications,
  };
}

// Global server variable storing latest state
let dbState: DBState = getInitialDB();

// Load from disk if exists
try {
  if (fs.existsSync(DB_FILE)) {
    dbState = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    console.log("Database loaded successfully from disk.");
  } else {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), "utf-8");
    console.log("Database initialized on disk with seed data.");
  }
} catch (err) {
  console.error("Error reading/writing database file, falling back to in-memory: ", err);
}

// Function to save state
function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write database to disk: ", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Log API requests
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // REST API Routes
  app.get("/api/state", (req, res) => {
    res.json(dbState);
  });

  app.post("/api/reset", (req, res) => {
    dbState = getInitialDB();
    saveDB();
    res.json({ message: "Database reset to defaults", state: dbState });
  });

  // ----------------- USERS API -----------------
  // Register/add agent or TL
  app.post("/api/users", (req, res) => {
    const { name, email, mobile, role, tlId } = req.body;
    if (!name || !email || !mobile || !role) {
      return res.status(400).json({ error: "Missing required fields (name, email, mobile, role)" });
    }

    const newUser: User = {
      id: "user-" + generateId(),
      name,
      email,
      mobile,
      role,
      status: "active",
      kycStatus: "none",
      tlId: role === "agent" ? tlId : undefined,
      createdAt: new Date().toISOString(),
    };

    dbState.users.push(newUser);

    // If agent, create wallet
    if (role === "agent") {
      const hasWallet = dbState.wallets.find(w => w.agentId === newUser.id);
      if (!hasWallet) {
        dbState.wallets.push({
          agentId: newUser.id,
          totalEarnings: 0,
          withdrawnAmount: 0,
          currentBalance: 0,
          transactions: [],
        });
      }
    }

    saveDB();
    res.status(201).json(newUser);
  });

  // Update KYC
  app.post("/api/users/:id/kyc", (req, res) => {
    const { id } = req.params;
    const { panNumber, aadhaarNumber, bankAccount, ifscCode, action, documentName } = req.body;

    const user = dbState.users.find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Submit KYC details
    if (action === "submit") {
      user.kycDetails = {
        panNumber: panNumber || "MOCKPAN123",
        aadhaarNumber: aadhaarNumber || "123412341234",
        bankAccount: bankAccount || "9999999999",
        ifscCode: ifscCode || "IFSC0001",
        documentName: documentName || "kyc_upload.pdf",
      };
      user.kycStatus = "pending";
    }

    // Approve/Reject by Admin
    if (action === "approve") {
      user.kycStatus = "approved";
      dbState.notifications.push({
        id: "not-" + generateId(),
        title: "KYC Verification Approved",
        message: `Congratulations! Your KYC documents have been verified and approved by the admin. You can now submit leads and withdraw wallet payouts.`,
        userId: user.id,
        createdAt: new Date().toISOString(),
      });
    }

    if (action === "reject") {
      user.kycStatus = "rejected";
      dbState.notifications.push({
        id: "not-" + generateId(),
        title: "KYC Rejected",
        message: `Your KYC documents were rejected. Please double-check your Bank/PAN details and re-upload correctly.`,
        userId: user.id,
        createdAt: new Date().toISOString(),
      });
    }

    saveDB();
    res.json(user);
  });

  // Block / Unblock user
  app.post("/api/users/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'active' | 'blocked'

    const user = dbState.users.find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.status = status;
    saveDB();
    res.json(user);
  });

  // Delete User
  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const index = dbState.users.findIndex(u => u.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    dbState.users.splice(index, 1);
    saveDB();
    res.json({ message: "User deleted successfully", id });
  });

  // ----------------- PRODUCTS API -----------------
  app.post("/api/products", (req, res) => {
    const { id, name, type, description, referralLink, commissionRate, minScoreRequired, features, action } = req.body;

    if (action === "delete") {
      const pIdx = dbState.products.findIndex(p => p.id === id);
      if (pIdx > -1) {
        dbState.products.splice(pIdx, 1);
        saveDB();
        return res.json({ message: "Product deleted", id });
      }
      return res.status(404).json({ error: "Product not found" });
    }

    if (action === "edit" || id) {
      const product = dbState.products.find(p => p.id === id);
      if (product) {
        product.name = name || product.name;
        product.type = type || product.type;
        product.description = description || product.description;
        product.referralLink = referralLink || product.referralLink;
        product.commissionRate = commissionRate || product.commissionRate;
        product.minScoreRequired = minScoreRequired !== undefined ? Number(minScoreRequired) : product.minScoreRequired;
        product.features = features || product.features;
        saveDB();
        return res.json(product);
      }
    }

    // Creating new product
    if (!name || !type || !commissionRate) {
      return res.status(400).json({ error: "Missing required fields (name, type, commissionRate)" });
    }

    const newProduct: Product = {
      id: "prod-" + generateId(),
      name,
      type,
      description: description || "Excellent banking product suited for standard DSA distribution channels.",
      referralLink: referralLink || `https://capitalaxis.in/referral/link-${generateId()}`,
      commissionRate,
      minScoreRequired: minScoreRequired ? Number(minScoreRequired) : undefined,
      features: features && features.length > 0 ? features : ["Easy registration process", "Minimal paperwork", "Instant approval metrics"],
    };

    dbState.products.push(newProduct);

    // Dynamic Broadcast
    dbState.notifications.push({
      id: "not-" + generateId(),
      title: "New Product Available",
      message: `New payout offers for ${newProduct.name} are active. View the products tab to copy links!`,
      createdAt: new Date().toISOString(),
    });

    saveDB();
    res.status(201).json(newProduct);
  });

  // ----------------- LEADS API -----------------
  // Submit lead
  app.post("/api/leads", (req, res) => {
    const { customerName, customerMobile, city, productType, notes, agentId, documentName } = req.body;

    if (!customerName || !customerMobile || !city || !productType || !agentId) {
      return res.status(400).json({ error: "Missing required fields (customerName, customerMobile, city, productType, agentId)" });
    }

    const agent = dbState.users.find(u => u.id === agentId);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const newLeadId = "lead-" + generateId();
    const isUnderTL = agent.tlId;
    let assignedTLObject = isUnderTL ? dbState.users.find(u => u.id === isUnderTL) : undefined;

    const newLead: Lead = {
      id: newLeadId,
      customerName,
      customerMobile,
      city,
      productType,
      notes: notes || "Initial customer lead application.",
      agentId,
      agentName: agent.name,
      tlId: isUnderTL,
      tlName: assignedTLObject ? assignedTLObject.name : undefined,
      status: "pending",
      documentUrl: documentName ? `/documents/${documentName}` : undefined,
      documentName: documentName || undefined,
      commissionPaid: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusHistory: [
        {
          status: "pending",
          updatedBy: agent.name,
          updatedByRole: "agent",
          notes: notes || "Lead submitted.",
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    dbState.leads.push(newLead);

    // Notify appropriate TL if assigned
    if (isUnderTL) {
      dbState.notifications.push({
        id: "not-" + generateId(),
        title: "New Team Lead Submitted",
        message: `Agent ${agent.name} submitted lead for ${customerName} (${productType}). Please review.`,
        userId: isUnderTL,
        createdAt: new Date().toISOString(),
      });
    }

    saveDB();
    res.status(201).json(newLead);
  });

  // Assign leads to different TL or agent support
  app.post("/api/leads/:id/assign", (req, res) => {
    const { id } = req.params;
    const { tlId } = req.body;

    const lead = dbState.leads.find(l => l.id === id);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const targetTL = dbState.users.find(u => u.id === tlId && u.role === "tl");
    if (!targetTL) {
      return res.status(404).json({ error: "Team Leader not found" });
    }

    lead.tlId = tlId;
    lead.tlName = targetTL.name;
    lead.updatedAt = new Date().toISOString();

    dbState.notifications.push({
      id: "not-" + generateId(),
      title: "Lead Assigned To Your Team",
      message: `Lead of ${lead.customerName} (${lead.productType}) assigned to review/track by Admin.`,
      userId: tlId,
      createdAt: new Date().toISOString(),
    });

    saveDB();
    res.json(lead);
  });

  // Update lead status (leads workflow transitions)
  app.post("/api/leads/:id/status", (req, res) => {
    const { id } = req.params;
    const { status, remarks, updatedByUserId, commissionAmount } = req.body;

    const lead = dbState.leads.find(l => l.id === id);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const changer = dbState.users.find(u => u.id === updatedByUserId);
    if (!changer) {
      return res.status(400).json({ error: "Valid User performing update is required." });
    }

    const oldStatus = lead.status;
    lead.status = status;
    lead.updatedAt = new Date().toISOString();

    // Track status history
    lead.statusHistory.push({
      status,
      updatedBy: changer.name,
      updatedByRole: changer.role,
      notes: remarks || `Status transitioned from ${oldStatus} to ${status}.`,
      updatedAt: new Date().toISOString(),
    });

    // Notify Agent about lead update
    dbState.notifications.push({
      id: "not-" + generateId(),
      title: `Lead Space Updated: ${status.replace("_", " ").toUpperCase()}`,
      message: `Lead of customer ${lead.customerName} is now in state: "${status.replace("_", " ")}". Notes: ${remarks || "No comments."}`,
      userId: lead.agentId,
      createdAt: new Date().toISOString(),
    });

    // Workflow Actions: If approved to "bank_approved", pay commission to Wallet!
    if (status === "bank_approved") {
      const payoutValue = commissionAmount ? Number(commissionAmount) : 1000;
      lead.commissionPaid = payoutValue;

      // Find or create agent wallet
      let wallet = dbState.wallets.find(w => w.agentId === lead.agentId);
      if (!wallet) {
        wallet = {
          agentId: lead.agentId,
          totalEarnings: 0,
          withdrawnAmount: 0,
          currentBalance: 0,
          transactions: [],
        };
        dbState.wallets.push(wallet);
      }

      wallet.totalEarnings += payoutValue;
      wallet.currentBalance += payoutValue;
      wallet.transactions.push({
        id: "tx-" + generateId(),
        type: "credit",
        amount: payoutValue,
        description: `Commission for ${lead.productType} approved - ${lead.customerName}`,
        status: "completed",
        date: new Date().toISOString(),
      });

      // Send Wallet credit notify
      dbState.notifications.push({
        id: "not-" + generateId(),
        title: "🎁 Wallet Credited!",
        message: `Commission of ₹${payoutValue.toLocaleString()} has been credited successfully for approving ${lead.customerName}'s lead.`,
        userId: lead.agentId,
        createdAt: new Date().toISOString(),
      });
    }

    saveDB();
    res.json(lead);
  });

  // ----------------- WITHDRAWALS / WALLET API -----------------
  // Request payout
  app.post("/api/withdrawals", (req, res) => {
    const { agentId, amount, remarks } = req.body;
    if (!agentId || !amount) {
      return res.status(400).json({ error: "Missing required fields (agentId, amount)" });
    }

    const agent = dbState.users.find(u => u.id === agentId);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const wallet = dbState.wallets.find(w => w.agentId === agentId);
    if (!wallet || wallet.currentBalance < amount) {
      return res.status(400).json({ error: "Insufficient wallet balance to request withdrawal" });
    }

    const reqId = "with-" + generateId();
    const newReq: WithdrawalRequest = {
      id: reqId,
      agentId,
      agentName: agent.name,
      agentMobile: agent.mobile,
      amount: Number(amount),
      status: "pending",
      requestedAt: new Date().toISOString(),
      notes: remarks || "Immediate wallet payout request",
    };

    dbState.withdrawals.push(newReq);

    // Deduct/Freeze from current balance (since it's pending, let's keep track)
    wallet.currentBalance -= Number(amount);
    wallet.transactions.push({
      id: "tx-" + generateId(),
      type: "withdrawal",
      amount: Number(amount),
      description: `Withdrawal request of ₹${Number(amount).toLocaleString()} pending`,
      status: "pending",
      date: new Date().toISOString(),
    });

    // Notify all admins about pending request
    dbState.users
      .filter(u => u.role === "admin")
      .forEach(adm => {
        dbState.notifications.push({
          id: "not-" + generateId(),
          title: "New Payout Request",
          message: `Agent ${agent.name} has requested wallet withdrawal for ₹${Number(amount).toLocaleString()}`,
          userId: adm.id,
          createdAt: new Date().toISOString(),
        });
      });

    saveDB();
    res.status(201).json({ request: newReq, wallet });
  });

  // Approve / Reject Payout requests
  app.post("/api/withdrawals/:id/process", (req, res) => {
    const { id } = req.params;
    const { action, reviewerId, remarks, utrNo } = req.body; // action: 'approve' | 'reject'

    const request = dbState.withdrawals.find(w => w.id === id);
    if (!request) {
      return res.status(404).json({ error: "Withdrawal request not found" });
    }

    const adminUser = dbState.users.find(u => u.id === reviewerId && u.role === "admin");
    if (!adminUser) {
      return res.status(403).json({ error: "Unauthorized. Only admins can approve payouts." });
    }

    const wallet = dbState.wallets.find(w => w.agentId === request.agentId);

    if (action === "approve") {
      request.status = "approved";
      request.processedAt = new Date().toISOString();
      request.processedBy = adminUser.name;
      request.notes = remarks || `Payout processed successfully. UTR No: ${utrNo || "N/A"}`;

      if (wallet) {
        wallet.withdrawnAmount += request.amount;
        // Find the pending transaction in wallet and change status to complete
        const pendTx = wallet.transactions.find(t => t.type === "withdrawal" && t.status === "pending" && t.amount === request.amount);
        if (pendTx) {
          pendTx.status = "completed";
          pendTx.description = `Payout to account successfully: UTR ${utrNo || "CAPS-" + generateId()}`;
        }
      }

      // Notify agent
      dbState.notifications.push({
        id: "not-" + generateId(),
        title: "💸 Withdrawal Successful",
        message: `Approved: ₹${request.amount.toLocaleString()} released. Ref/UTR: ${utrNo || "N/A"}.`,
        userId: request.agentId,
        createdAt: new Date().toISOString(),
      });
    } else {
      // Rejecting
      request.status = "rejected";
      request.processedAt = new Date().toISOString();
      request.processedBy = adminUser.name;
      request.notes = remarks || "Rejected by admin.";

      if (wallet) {
        // Refund the pending balance
        wallet.currentBalance += request.amount;
        const pendTx = wallet.transactions.find(t => t.type === "withdrawal" && t.status === "pending" && t.amount === request.amount);
        if (pendTx) {
          pendTx.status = "failed";
          pendTx.description = `Payout rejected: ${remarks || "Verification failed"}`;
        }
      }

      // Notify agent of rejection
      dbState.notifications.push({
        id: "not-" + generateId(),
        title: "⚠️ Withdrawal Request Rejected",
        message: `Your payout request for ₹${request.amount.toLocaleString()} was rejected by Admin. Reason: ${remarks || "No remarks shared."}`,
        userId: request.agentId,
        createdAt: new Date().toISOString(),
      });
    }

    saveDB();
    res.json({ request, wallet });
  });

  // ----------------- BROADCAST MESSAGE NOTIFICATION -----------------
  app.post("/api/notifications", (req, res) => {
    const { title, message, role, userId } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: "Missing title or message" });
    }

    const newNotify: Notification = {
      id: "not-" + generateId(),
      title,
      message,
      role: role || undefined,
      userId: userId || undefined,
      createdAt: new Date().toISOString(),
    };

    dbState.notifications.unshift(newNotify);
    saveDB();
    res.status(201).json(newNotify);
  });

  // Vite middleware or build statically
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

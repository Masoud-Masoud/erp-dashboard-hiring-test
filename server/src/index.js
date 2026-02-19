import express from "express";
import cors from "cors";
import { items, vendors } from "./phase2Data.js";

const app = express();
app.use(cors());
app.use(express.json());

// ==============================
// Auth (simple mock)
// ==============================
const VALID_USER = { username: "candidate", password: "test123" };
const VALID_TOKEN = "mock-token-123";

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing token" });
  }
  const token = auth.slice("Bearer ".length);
  if (token !== VALID_TOKEN) {
    return res.status(401).json({ message: "Invalid token" });
  }
  next();
}

app.post("/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username === VALID_USER.username && password === VALID_USER.password) {
    return res.json({ token: VALID_TOKEN, user: { username } });
  }
  return res.status(401).json({ message: "Invalid credentials" });
});

// ==============================
// Phase 1 seed data
// ==============================
const jobs = [
  { jobId: "NPC-057", customer: "Acme", description: "Packaging line upgrade" },
  { jobId: "AEX-018", customer: "Thorburn", description: "CNC scheduling dashboard" },
  { jobId: "QTE-144", customer: "BetaCo", description: "Procurement automation" }
];

let milestones = [
  {
    id: 101,
    jobId: "NPC-057",
    name: "Engineering Approved",
    responsibleCode: "ENG01",
    isComplete: false,
    completionDate: null,
    note: "",
    updatedAt: Date.now() - 50000
  },
  {
    id: 102,
    jobId: "NPC-057",
    name: "Material Ordered",
    responsibleCode: "PUR02",
    isComplete: true,
    completionDate: "2026-01-20",
    note: "PO sent",
    updatedAt: Date.now() - 40000
  },
  {
    id: 201,
    jobId: "AEX-018",
    name: "Prototype UI",
    responsibleCode: "DEV01",
    isComplete: false,
    completionDate: null,
    note: "",
    updatedAt: Date.now() - 30000
  },
  {
    id: 202,
    jobId: "AEX-018",
    name: "API Integration",
    responsibleCode: "DEV01",
    isComplete: false,
    completionDate: null,
    note: "Waiting for endpoint",
    updatedAt: Date.now() - 20000
  }
];

// ==============================
// Phase 1 endpoints
// ==============================
app.get("/jobs", requireAuth, (req, res) => {
  const search = (req.query.search || "").toString().toLowerCase();
  const filtered = jobs.filter(
    (j) =>
      j.jobId.toLowerCase().includes(search) ||
      j.customer.toLowerCase().includes(search) ||
      j.description.toLowerCase().includes(search)
  );
  res.json({ items: filtered });
});

app.get("/jobs/:jobId/milestones", requireAuth, (req, res) => {
  const jobId = req.params.jobId;
  res.json({ items: milestones.filter((m) => m.jobId === jobId) });
});

app.put("/milestones/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const idx = milestones.findIndex((m) => m.id === id);
  if (idx === -1) return res.status(404).json({ message: "Milestone not found" });

  const patch = req.body || {};

  // Validate completionDate format
  if ("completionDate" in patch && patch.completionDate !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(patch.completionDate)) {
      return res.status(400).json({ message: "completionDate must be YYYY-MM-DD or null" });
    }
  }

  const updated = { ...milestones[idx], ...patch, updatedAt: Date.now() };
  milestones[idx] = updated;
  res.json(updated);
});

// ==============================
// Phase 2 endpoints: items/vendors/purchase-lines
// ==============================
app.get("/items", requireAuth, (req, res) => {
  // Keep same response shape used elsewhere: { items: [...] }
  res.json({ items });
});

app.get("/vendors", requireAuth, (req, res) => {
  res.json({ items: vendors });
});

let purchaseLines = [];
let nextPurchaseLineId = 1;

app.post("/purchase-lines", requireAuth, (req, res) => {
  const { partNumber, vendorCode, quantity } = req.body || {};

  const qty = Number(quantity);
  if (!partNumber || !vendorCode || !Number.isFinite(qty) || qty <= 0) {
    return res
      .status(400)
      .json({ message: "partNumber, vendorCode, and a positive quantity are required." });
  }

  const item = items.find((i) => i.partNumber === partNumber);
  if (!item) return res.status(400).json({ message: "Invalid partNumber." });

  const vendor = vendors.find((v) => v.vendorCode === vendorCode);
  if (!vendor) return res.status(400).json({ message: "Invalid vendorCode." });

  // Critical rule: METAL items must be purchased from QC vendors only
  if (item.material === "METAL" && vendor.province !== "QC") {
    return res.status(400).json({ message: "Metal items can only be purchased from Quebec vendors." });
  }

  const line = { id: nextPurchaseLineId++, partNumber, vendorCode, quantity: qty };
  purchaseLines.push(line);

  return res.status(201).json(line);
});

// (Optional) helpful for debugging during interviews
app.get("/purchase-lines", requireAuth, (req, res) => {
  res.json({ items: purchaseLines });
});

// ==============================
// Start server (keep at the bottom!)
// ==============================
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Mock ERP API running on http://localhost:${PORT}`);
});

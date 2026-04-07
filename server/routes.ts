import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";

// ── Bond Calculation Engine (pure functions) ──────────────────────────────────
export function computeBondModel(m: any) {
  const gpr = m.grossPotentialRent ?? 0;
  const concessions = gpr * (m.concessionsPct ?? 0.015);
  const totalRental = gpr - concessions;
  const otherIncome = (m.parkingIncome ?? 0) + (m.otherIncome ?? 0) + (m.commercialIncome ?? 0);
  const totalPGI = totalRental + otherIncome;
  const vacancy = totalPGI * (m.vacancyPct ?? 0.025);
  const egi = totalPGI - vacancy;
  const mgmtFee = egi * (m.mgmtFeePct ?? 0.035);
  const totalOpex = (m.payroll ?? 0) + (m.advertising ?? 0) + (m.generalAdmin ?? 0) +
    (m.utilities ?? 0) + (m.repairsMaintenance ?? 0) + (m.serviceContracts ?? 0) +
    mgmtFee + (m.makeReady ?? 0) + (m.propertyTaxes ?? 0) + (m.insurance ?? 0);
  const noiFullTax = egi - totalOpex;
  const uwNoi = noiFullTax + (m.pilotAddback ?? 0);
  const coupon = m.seniorCouponRate ?? 0.0525;
  const dscr = m.targetDscr ?? 1.2;
  const amortYears = m.seniorAmortYears ?? 40;
  const ads = uwNoi / dscr;
  const debtConstant = coupon / (1 - Math.pow(1 + coupon, -amortYears));
  const seniorBondPar = ads / debtConstant;
  const ve = m.valueEngineeringPct ?? 0.05;
  const hardCostVE = (m.hardCostTotal ?? 0) * (1 - ve);
  const ownersDirect = (m.ownersDirectCosts ?? 0) * (1 - ve);
  const contingency = (m.contingency ?? 0) * (1 - ve);
  const totalHardCosts = hardCostVE + ownersDirect + contingency;
  const devFee = totalHardCosts * (m.developerFeePct ?? 0.06);
  const totalNonLandDev = totalHardCosts + (m.softCosts ?? 0) + (m.workingCapital ?? 0) + devFee;
  const coi = seniorBondPar * (m.coiPct ?? 0.0245);
  const capiGross = seniorBondPar * coupon * ((m.constructionMonths ?? 30) / 12);
  const capiOffset = seniorBondPar * 0.55 * (m.mmYield ?? 0.0375) * ((m.constructionMonths ?? 30) / 12);
  const capi = capiGross - capiOffset;
  const fmvLand = m.fmvLandSale ?? 0;
  const totalUses = totalNonLandDev + coi + capi + fmvLand;
  const surplus = seniorBondPar - totalUses;
  const maxSupportableFmv = seniorBondPar - totalNonLandDev - coi - capi;
  const landSpread = fmvLand - (m.landContractPrice ?? 0);
  const wfhpDevFee = totalHardCosts * (m.wfhpDevFeeShare ?? 0.02);
  const totalDayOne = landSpread + wfhpDevFee + (m.aeReimbursement ?? 0) + (m.wfhpPredDevCosts ?? 0);
  const cashInvested = (m.landContractPrice ?? 0) + (m.wfhpPredDevCosts ?? 0);
  const roi = cashInvested > 0 ? totalDayOne / cashInvested : 0;
  const moic = cashInvested > 0 ? (totalDayOne + cashInvested) / cashInvested : 0;
  const dscrCheck = uwNoi / (seniorBondPar * debtConstant);
  const goNoGo = surplus >= 0 && dscrCheck >= 1.2 && seniorBondPar >= 50_000_000 ? "GO"
    : surplus < -2_000_000 ? "NO-GO" : "CONDITIONAL";
  return {
    egi, uwNoi, totalOpex, noiFullTax, ads, debtConstant,
    seniorBondPar, totalHardCosts, devFee, totalNonLandDev,
    coi, capi, totalUses, surplus,
    maxSupportableLandFmv: maxSupportableFmv,
    landSpread, wfhpDevFee, dayOneMonetization: totalDayOne,
    cashInvested, dayOneRoi: roi, dayOneMoic: moic, goNoGo,
    dscrVerification: dscrCheck,
    yieldOnCost: uwNoi / (totalNonLandDev + fmvLand),
  };
}

function computeComposite(s: any, threshold = 3.5) {
  const weights = { mdi: 0.25, sii: 0.25, bei: 0.30, eai: 0.15, tvi: 0.05 };
  const anyKill = s.mdiKill || s.siiKill || s.beiKill || s.eaiKill || s.tviKill;
  if (anyKill) return { compositeScore: 0, recommendation: "KILL" };
  const composite = (s.mdiScore ?? 0) * weights.mdi + (s.siiScore ?? 0) * weights.sii +
    (s.beiScore ?? 0) * weights.bei + (s.eaiScore ?? 0) * weights.eai +
    (s.tviScore ?? 0) * weights.tvi;
  const rec = composite >= threshold ? "ADVANCE" : composite >= 2.5 ? "HOLD" : "KILL";
  return { compositeScore: composite, recommendation: rec };
}

export async function registerRoutes(httpServer: Server, app: Express) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUser(email);
      if (!user || user.passwordHash !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Users / Team Management ────────────────────────────────────────────────
  app.get("/api/users", async (_req, res) => {
    try {
      const list = await storage.getUsers();
      res.json(list);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "name, email, and password are required" });
      }
      if (role !== "admin" && role !== "analyst") {
        return res.status(400).json({ error: "role must be 'admin' or 'analyst'" });
      }
      // Check email uniqueness
      const existing = await storage.getUser(email);
      if (existing) {
        return res.status(400).json({ error: "A user with that email already exists" });
      }
      const user = await storage.createUserWithPassword({ name, email, password, role });
      res.json(user);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      // Prevent deleting the last admin
      const allUsers = await storage.getUsers();
      const target = allUsers.find(u => u.id === id);
      if (!target) return res.status(404).json({ error: "User not found" });
      if (target.role === "admin") {
        const adminCount = allUsers.filter(u => u.role === "admin").length;
        if (adminCount <= 1) {
          return res.status(400).json({ error: "Cannot delete the last admin user" });
        }
      }
      await storage.deleteUser(id);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Dashboard stats ─────────────────────────────────────────────────────────
  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const stats = await storage.getLeadStats();
      res.json(stats);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/activity", async (_req, res) => {
    try { res.json(await storage.getActivityLog()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Sieve Config (adjustable parameters) ────────────────────────────────────
  app.get("/api/sieve-config", async (_req, res) => {
    try { res.json(await storage.getSieveConfig()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.patch("/api/sieve-config/:key", async (req, res) => {
    try {
      const { value, updatedBy } = req.body;
      const cfg = await storage.updateSieveConfig(req.params.key, String(value), updatedBy);
      if (!cfg) return res.status(404).json({ error: "Config key not found" });
      res.json(cfg);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Leads ───────────────────────────────────────────────────────────────────
  app.get("/api/leads", async (_req, res) => {
    try { res.json(await storage.getLeads()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/leads/:id", async (req, res) => {
    try {
      const lead = await storage.getLead(Number(req.params.id));
      if (!lead) return res.status(404).json({ error: "Not found" });
      res.json(lead);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/leads", async (req, res) => {
    try {
      const lead = await storage.createLead({ ...req.body, sourceDate: req.body.sourceDate || new Date().toISOString() });
      await storage.logActivity({ entityType: "lead", entityId: lead.id, action: "created", actor: req.body.assignedTo || "system", detail: `New lead: ${lead.address}`, timestamp: new Date().toISOString() });
      res.json(lead);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.patch("/api/leads/:id", async (req, res) => {
    try {
      const lead = await storage.updateLead(Number(req.params.id), req.body);
      if (!lead) return res.status(404).json({ error: "Not found" });
      await storage.logActivity({ entityType: "lead", entityId: lead.id, action: "updated", actor: "system", detail: JSON.stringify(req.body), timestamp: new Date().toISOString() });
      res.json(lead);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/leads/:id", async (req, res) => {
    try { await storage.deleteLead(Number(req.params.id)); res.json({ ok: true }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/leads/:id/step1", async (req, res) => {
    try {
      const { pass, notes, killReason } = req.body;
      const lead = await storage.updateLead(Number(req.params.id), {
        step1Pass: pass ? 1 : 0, step1Notes: notes,
        stepReached: pass ? 2 : 1,
        disposition: pass ? "Pass" : "Reject",
        killReason: pass ? undefined : killReason,
      });
      await storage.logActivity({ entityType: "lead", entityId: Number(req.params.id), action: pass ? "step1_pass" : "step1_fail", actor: "system", detail: killReason || notes || "", timestamp: new Date().toISOString() });
      res.json(lead);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/leads/:id/step2", async (req, res) => {
    try {
      const { bedGap, rentLevels, pipelineConstraint, issuerReceptivity, populationMigration, killReason } = req.body;
      const actualScore = bedGap + rentLevels + pipelineConstraint + issuerReceptivity + populationMigration;
      // Read threshold from sieve config
      const cfg = await storage.getSieveConfigByKey("step2Threshold");
      const threshold = cfg ? Number(cfg.value) : 15;
      const pass = actualScore >= threshold;
      const lead = await storage.updateLead(Number(req.params.id), {
        step2ScoreBedGap: bedGap, step2ScoreRentLevels: rentLevels,
        step2ScorePipelineConstraint: pipelineConstraint,
        step2ScoreIssuerReceptivity: issuerReceptivity,
        step2ScorePopulationMigration: populationMigration,
        step2TotalScore: actualScore,
        step2Pass: pass ? 1 : 0,
        stepReached: pass ? 3 : 2,
        disposition: pass ? "Watch" : "Reject",
        killReason: pass ? undefined : killReason || "SCORE_BELOW_THRESHOLD",
      });
      await storage.logActivity({ entityType: "lead", entityId: Number(req.params.id), action: pass ? "step2_pass" : "step2_fail", actor: "system", detail: `Score: ${actualScore}/25 (threshold ${threshold})`, timestamp: new Date().toISOString() });
      res.json(lead);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Bond Models ─────────────────────────────────────────────────────────────
  app.get("/api/bond-models", async (_req, res) => {
    try { res.json(await storage.getBondModels()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/bond-models/:id", async (req, res) => {
    try {
      const m = await storage.getBondModel(Number(req.params.id));
      if (!m) return res.status(404).json({ error: "Not found" });
      res.json(m);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/bond-models/by-lead/:leadId", async (req, res) => {
    try {
      const m = await storage.getBondModelByLead(Number(req.params.leadId));
      if (!m) return res.status(404).json({ error: "Not found" });
      res.json(m);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/bond-models/compute", async (req, res) => {
    try { res.json(computeBondModel(req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/bond-models/sensitivity", async (req, res) => {
    try {
      const base = req.body;
      const coupons = [0.0475, 0.05, 0.0525, 0.055, 0.0575, 0.06, 0.0625, 0.065];
      const dscrs = [1.15, 1.18, 1.2, 1.22, 1.25, 1.28, 1.3];
      const table = coupons.map(coupon =>
        dscrs.map(dscr => {
          const r = computeBondModel({ ...base, seniorCouponRate: coupon, targetDscr: dscr });
          return { coupon, dscr, maxLandFmv: r.maxSupportableLandFmv, par: r.seniorBondPar, goNoGo: r.goNoGo };
        })
      );
      res.json({ coupons, dscrs, table });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/bond-models", async (req, res) => {
    try {
      const computed = computeBondModel(req.body);
      const model = await storage.createBondModel({ ...req.body, ...computed });
      await storage.logActivity({ entityType: "bond_model", entityId: model.id, action: "created", actor: "system", detail: `${model.projectName} | Par: $${Math.round((computed.seniorBondPar ?? 0) / 1e6)}M | ${computed.goNoGo}`, timestamp: new Date().toISOString() });
      res.json({ ...model, computed });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.patch("/api/bond-models/:id", async (req, res) => {
    try {
      const existing = await storage.getBondModel(Number(req.params.id));
      if (!existing) return res.status(404).json({ error: "Not found" });
      const merged = { ...existing, ...req.body };
      const computed = computeBondModel(merged);
      const model = await storage.updateBondModel(Number(req.params.id), { ...req.body, ...computed });
      res.json({ ...model, computed });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Market Sieve Scores ─────────────────────────────────────────────────────
  app.get("/api/market-scores", async (_req, res) => {
    try { res.json(await storage.getMarketScores()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/market-scores", async (req, res) => {
    try {
      const cfg = await storage.getSieveConfigByKey("siCompositeMin");
      const threshold = cfg ? Number(cfg.value) : 3.5;
      const { compositeScore, recommendation } = computeComposite(req.body, threshold);
      const score = await storage.createMarketScore({ ...req.body, compositeScore, recommendation });
      res.json(score);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.patch("/api/market-scores/:id", async (req, res) => {
    try {
      const existing = await storage.getMarketScore(Number(req.params.id));
      if (!existing) return res.status(404).json({ error: "Not found" });
      const cfg = await storage.getSieveConfigByKey("siCompositeMin");
      const threshold = cfg ? Number(cfg.value) : 3.5;
      const merged = { ...existing, ...req.body };
      const { compositeScore, recommendation } = computeComposite(merged, threshold);
      const score = await storage.updateMarketScore(Number(req.params.id), { ...req.body, compositeScore, recommendation });
      res.json(score);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Gold Memos ──────────────────────────────────────────────────────────────
  app.get("/api/gold-memos", async (_req, res) => {
    try { res.json(await storage.getGoldMemos()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/gold-memos/by-lead/:leadId", async (req, res) => {
    try {
      const memo = await storage.getGoldMemo(Number(req.params.leadId));
      if (!memo) return res.status(404).json({ error: "Not found" });
      res.json(memo);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/gold-memos", async (req, res) => {
    try {
      const memo = await storage.createGoldMemo(req.body);
      await storage.logActivity({ entityType: "lead", entityId: req.body.leadId, action: "gold_memo_created", actor: req.body.createdBy || "system", detail: `Recommendation: ${req.body.recommendation}`, timestamp: new Date().toISOString() });
      res.json(memo);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Brokers ─────────────────────────────────────────────────────────────────
  app.get("/api/brokers", async (_req, res) => {
    try { res.json(await storage.getBrokers()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/brokers/:id", async (req, res) => {
    try {
      const b = await storage.getBroker(Number(req.params.id));
      if (!b) return res.status(404).json({ error: "Not found" });
      res.json(b);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/brokers", async (req, res) => {
    try { res.json(await storage.createBroker(req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.patch("/api/brokers/:id", async (req, res) => {
    try { res.json(await storage.updateBroker(Number(req.params.id), req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/broker-calls", async (_req, res) => {
    try { res.json(await storage.getBrokerCalls()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/broker-calls/:brokerId", async (req, res) => {
    try { res.json(await storage.getBrokerCalls(Number(req.params.brokerId))); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/broker-calls", async (req, res) => {
    try {
      const call = await storage.createBrokerCall(req.body);
      await storage.logActivity({ entityType: "broker", entityId: req.body.brokerId, action: "call_logged", actor: req.body.calledBy || "system", detail: `Outcome: ${req.body.outcome}`, timestamp: new Date().toISOString() });
      res.json(call);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── TEFRA Issuers ───────────────────────────────────────────────────────────
  app.get("/api/tefra-issuers", async (_req, res) => {
    try { res.json(await storage.getTefraIssuers()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/tefra-issuers", async (req, res) => {
    try { res.json(await storage.createTefraIssuer(req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.patch("/api/tefra-issuers/:id", async (req, res) => {
    try { res.json(await storage.updateTefraIssuer(Number(req.params.id), req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Sourcing ────────────────────────────────────────────────────────────────
  app.get("/api/sourcing/runs", async (_req, res) => {
    try { res.json(await storage.getSourcingRuns()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/sourcing/runs/:id/results", async (req, res) => {
    try { res.json(await storage.getSourcingResults(Number(req.params.id))); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/sourcing/run", async (_req, res) => {
    try {
      const { runSourcingEngine } = await import("./sourcing");
      res.json({ message: "Sourcing run started" });
      runSourcingEngine().catch((e: any) => console.error("[Sourcing] Error:", e.message));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Users (Team Management) ─────────────────────────────────────────────────
  app.get("/api/users", async (_req, res) => {
    try { res.json(await storage.getUsers()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/users", async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password) return res.status(400).json({ error: "Name, email and password are required" });
      if (!['admin','analyst'].includes(role)) return res.status(400).json({ error: "Role must be admin or analyst" });
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(400).json({ error: "Email already in use" });
      const user = await storage.createUserWithPassword({ name, email, password, role });
      res.json(user);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/users/:id", async (req, res) => {
    try {
      const users = await storage.getUsers();
      const admins = users.filter((u: any) => u.role === 'admin');
      const target = users.find((u: any) => u.id === Number(req.params.id));
      if (target?.role === 'admin' && admins.length <= 1) return res.status(400).json({ error: "Cannot delete the last admin" });
      await storage.deleteUser(Number(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}

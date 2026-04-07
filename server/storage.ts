import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  users, leads, bondModels, marketScores, goldMemos,
  brokers, brokerCalls, tefraIssuers, activityLog, sieveConfig,
  type User, type InsertUser,
  type Lead, type InsertLead,
  type BondModel, type InsertBondModel,
  type MarketScore, type InsertMarketScore,
  type GoldMemo, type InsertGoldMemo,
  type Broker, type InsertBroker,
  type BrokerCall, type InsertBrokerCall,
  type TefraIssuer, type InsertTefraIssuer,
  type ActivityLog, type InsertActivityLog,
  type SieveConfig, type InsertSieveConfig,
} from "@shared/schema";

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

function now() { return new Date().toISOString(); }

// ─────────────────────────────────────────────
// DDL — create tables if they don't exist
// ─────────────────────────────────────────────
export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'analyst',
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      lead_id TEXT NOT NULL UNIQUE,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      acres REAL,
      asking_price REAL,
      zoning TEXT,
      university_name TEXT,
      university_distance_miles REAL,
      university_enrollment INTEGER,
      listing_url TEXT,
      source TEXT NOT NULL DEFAULT 'LoopNet',
      source_date TEXT NOT NULL,
      assigned_to TEXT,
      notes TEXT,
      beds INTEGER,
      step_reached INTEGER NOT NULL DEFAULT 1,
      disposition TEXT NOT NULL DEFAULT 'New',
      kill_reason TEXT,
      step1_pass INTEGER,
      step1_notes TEXT,
      step2_score_bed_gap INTEGER,
      step2_score_rent_levels INTEGER,
      step2_score_pipeline_constraint INTEGER,
      step2_score_issuer_receptivity INTEGER,
      step2_score_population_migration INTEGER,
      step2_total_score INTEGER,
      step2_pass INTEGER,
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS bond_models (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER,
      project_name TEXT NOT NULL,
      unit_mix TEXT NOT NULL DEFAULT '[]',
      senior_coupon_rate REAL NOT NULL DEFAULT 0.0525,
      target_dscr REAL NOT NULL DEFAULT 1.2,
      value_engineering_pct REAL NOT NULL DEFAULT 0.05,
      land_contract_price REAL NOT NULL DEFAULT 0,
      fmv_land_sale REAL NOT NULL DEFAULT 0,
      developer_fee_pct REAL NOT NULL DEFAULT 0.06,
      wfhp_dev_fee_share REAL NOT NULL DEFAULT 0.02,
      asset_mgmt_fee_pct REAL NOT NULL DEFAULT 0.015,
      senior_amort_years INTEGER NOT NULL DEFAULT 40,
      coi_pct REAL NOT NULL DEFAULT 0.0245,
      mm_yield REAL NOT NULL DEFAULT 0.0375,
      construction_months INTEGER NOT NULL DEFAULT 30,
      gross_potential_rent REAL,
      concessions_pct REAL NOT NULL DEFAULT 0.015,
      vacancy_pct REAL NOT NULL DEFAULT 0.025,
      parking_income REAL NOT NULL DEFAULT 0,
      other_income REAL NOT NULL DEFAULT 0,
      commercial_income REAL NOT NULL DEFAULT 0,
      payroll REAL NOT NULL DEFAULT 0,
      advertising REAL NOT NULL DEFAULT 0,
      general_admin REAL NOT NULL DEFAULT 0,
      utilities REAL NOT NULL DEFAULT 0,
      repairs_maintenance REAL NOT NULL DEFAULT 0,
      service_contracts REAL NOT NULL DEFAULT 0,
      mgmt_fee_pct REAL NOT NULL DEFAULT 0.035,
      make_ready REAL NOT NULL DEFAULT 0,
      property_taxes REAL NOT NULL DEFAULT 0,
      insurance REAL NOT NULL DEFAULT 0,
      pilot_addback REAL NOT NULL DEFAULT 0,
      hard_cost_total REAL NOT NULL DEFAULT 0,
      owners_direct_costs REAL NOT NULL DEFAULT 0,
      contingency REAL NOT NULL DEFAULT 0,
      soft_costs REAL NOT NULL DEFAULT 0,
      working_capital REAL NOT NULL DEFAULT 0,
      ae_reimbursement REAL NOT NULL DEFAULT 0,
      wfhp_predev_costs REAL NOT NULL DEFAULT 0,
      uw_noi REAL,
      senior_bond_par REAL,
      max_supportable_land_fmv REAL,
      surplus_gap REAL,
      day_one_monetization REAL,
      day_one_roi REAL,
      day_one_moic REAL,
      go_no_go TEXT,
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS sieve_config (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'screen',
      updated_at TEXT NOT NULL DEFAULT '',
      updated_by TEXT
    );
    CREATE TABLE IF NOT EXISTS market_scores (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER,
      market TEXT NOT NULL,
      mdi_score REAL,
      sii_score REAL,
      bei_score REAL,
      eai_score REAL,
      tvi_score REAL,
      mdi_kill INTEGER DEFAULT 0,
      sii_kill INTEGER DEFAULT 0,
      bei_kill INTEGER DEFAULT 0,
      eai_kill INTEGER DEFAULT 0,
      tvi_kill INTEGER DEFAULT 0,
      composite_score REAL,
      recommendation TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS gold_memos (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER NOT NULL,
      site_summary TEXT,
      university_demand_snapshot TEXT,
      tefra_issuer_fit TEXT,
      economics_summary TEXT,
      risks_mitigations TEXT,
      recommendation TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS brokers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      firm TEXT,
      email TEXT,
      phone TEXT,
      markets TEXT NOT NULL DEFAULT '[]',
      specialty TEXT,
      notes TEXT,
      last_contact_date TEXT,
      next_follow_up_date TEXT,
      created_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS broker_calls (
      id SERIAL PRIMARY KEY,
      broker_id INTEGER NOT NULL,
      lead_id INTEGER,
      call_date TEXT NOT NULL,
      outcome TEXT NOT NULL,
      key_metrics TEXT,
      action_items TEXT,
      called_by TEXT,
      created_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS tefra_issuers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      state TEXT NOT NULL,
      issuer_type TEXT,
      deals_last_5_years INTEGER NOT NULL DEFAULT 0,
      receptivity_score INTEGER NOT NULL DEFAULT 3,
      avg_tefra_months INTEGER,
      primary_contact TEXT,
      notes TEXT,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS activity_log (
      id SERIAL PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      actor TEXT,
      detail TEXT,
      timestamp TEXT NOT NULL DEFAULT ''
    );
  `);

  // ── Seed if empty ──
  const { rows: userRows } = await pool.query("SELECT id FROM users LIMIT 1");
  if (userRows.length === 0) {
    await pool.query(
      "INSERT INTO users (name, email, role, password_hash, created_at) VALUES ($1,$2,$3,$4,$5)",
      ["Jason Talbot", "jasonstalbot@me.com", "admin", "wfhp2026", now()]
    );

    const issuers = [
      ["Miami-Dade County IDA", "FL", "IDA", 8, 5, 6, "Proven — Casa at FIU ($241.2M, Feb 2026). Primary issuer.", 1],
      ["Florida Housing Finance Corp", "FL", "HFA", 12, 4, 8, "Statewide HFA. Backup issuer pathway for FL deals.", 0],
      ["Texas State AF", "TX", "Authority", 5, 4, 7, "Active in student housing. UT Austin corridor focus.", 0],
      ["NC Capital Facilities Finance Agency", "NC", "Authority", 4, 4, 8, "Active UNC / NCSU corridor.", 0],
      ["Georgia Higher Ed FA", "GA", "Authority", 3, 3, 9, "Georgia Tech / GSU pipeline.", 0],
    ];
    for (const [name, state, type, deals, receptivity, months, notes, isPrimary] of issuers) {
      await pool.query(
        "INSERT INTO tefra_issuers (name, state, issuer_type, deals_last_5_years, receptivity_score, avg_tefra_months, notes, is_primary, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [name, state, type, deals, receptivity, months, notes, isPrimary, now()]
      );
    }

    await pool.query(
      `INSERT INTO leads (lead_id, address, city, state, acres, asking_price, zoning, university_name,
        university_distance_miles, university_enrollment, source, source_date, assigned_to, notes, beds,
        step_reached, disposition, step1_pass, step2_score_bed_gap, step2_score_rent_levels,
        step2_score_pipeline_constraint, step2_score_issuer_receptivity, step2_score_population_migration,
        step2_total_score, step2_pass, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)`,
      ["LEAD-0001","5950 Sunset Drive","South Miami","FL",2.1,12000000,"Mixed-Use / University Corridor",
        "Florida International University",0.4,55000,"Broker",now(),"Jason Talbot",
        "The Alexander at South Miami — 170 units / 442 beds. Contract assignment play.",442,
        3,"LOI",1,5,5,4,5,5,240,1,now(),now()]
    );

    const { rows: leadRows } = await pool.query("SELECT id FROM leads WHERE lead_id='LEAD-0001'");
    const leadId = leadRows[0]?.id ?? 1;
    await pool.query(
      `INSERT INTO bond_models (lead_id, project_name, unit_mix, senior_coupon_rate, target_dscr,
        value_engineering_pct, land_contract_price, fmv_land_sale, developer_fee_pct, wfhp_dev_fee_share,
        asset_mgmt_fee_pct, senior_amort_years, coi_pct, mm_yield, construction_months,
        gross_potential_rent, concessions_pct, vacancy_pct, parking_income, other_income, commercial_income,
        payroll, advertising, general_admin, utilities, repairs_maintenance, service_contracts,
        mgmt_fee_pct, make_ready, property_taxes, insurance, pilot_addback,
        hard_cost_total, owners_direct_costs, contingency, soft_costs, working_capital,
        ae_reimbursement, wfhp_predev_costs, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
               $22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41)`,
      [leadId,"The Alexander at South Miami",
        JSON.stringify([
          {type:"1BR + Studio",units:72,bedsPerUnit:1,totalBeds:72,rentPerBed:2575},
          {type:"3BR",units:36,bedsPerUnit:3,totalBeds:108,rentPerBed:1975},
          {type:"4BR",units:48,bedsPerUnit:4,totalBeds:192,rentPerBed:1900},
          {type:"5BR",units:14,bedsPerUnit:5,totalBeds:70,rentPerBed:1750},
        ]),
        0.0525,1.2,0.05,12000000,16000000,0.06,0.02,0.015,40,0.0245,0.0375,30,
        10632000,0.015,0.025,405300,408000,145180,
        550000,127500,85000,170000,100000,180000,
        0.035,150000,770109,380000,770109,
        52000000,3200000,2800000,11030873,294500,
        1500000,0,now(),now()]
    );

    // Seed default sieve config
    const defaultConfig = [
      ["minBeds",       "820",  "Minimum Beds",         "Minimum number of beds required",          "screen"],
      ["minBondPar",    "100000000", "Minimum Bond Par ($)", "Minimum senior bond par in dollars",   "bond"],
      ["targetDscr",    "1.25", "Target DSCR",          "Target debt service coverage ratio",        "bond"],
      ["maxLandBasis",  "10000000",  "Max Land Basis ($)",   "Maximum land contract price",          "screen"],
      ["maxUnivMiles",  "1.0",  "Max Univ Distance (mi)", "Maximum miles from university campus",   "screen"],
      ["minFmvLift",    "2.0",  "Min FMV Lift (x)",     "Minimum land FMV lift multiple",            "bond"],
      ["minEnrollment", "20000","Min Enrollment",        "Minimum university enrollment",             "screen"],
      ["step2Threshold","15",   "Step 2 Score Threshold","Min score to advance from Step 2 (out of 25)", "screen"],
      ["advanceRateLow","0.20", "Advance Rate Low",     "Lower bound of Step 1 advance rate range",  "bond"],
      ["advanceRateHigh","0.30","Advance Rate High",    "Upper bound of Step 1 advance rate range",  "bond"],
      ["siCompositeMin","3.5",  "Sieve Composite Min",  "Min composite score to ADVANCE in Market Sieve", "market"],
    ];
    for (const [key, value, label, description, category] of defaultConfig) {
      await pool.query(
        "INSERT INTO sieve_config (key, value, label, description, category, updated_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (key) DO NOTHING",
        [key, value, label, description, category, now()]
      );
    }
  }
}

// ─────────────────────────────────────────────
// STORAGE INTERFACE
// ─────────────────────────────────────────────
export interface IStorage {
  getUser(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(data: InsertUser): Promise<User>;
  getUsers(): Promise<Omit<User, 'passwordHash'>[]>;
  createUserWithPassword(data: { name: string; email: string; password: string; role: string }): Promise<Omit<User, 'passwordHash'>>;
  deleteUser(id: number): Promise<void>;
  getLeads(): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(data: InsertLead): Promise<Lead>;
  updateLead(id: number, data: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: number): Promise<void>;
  getLeadStats(): Promise<{ total: number; newCount: number; inScreen: number; goldValidation: number; loi: number; rejected: number; goDeals: number; totalPar: number }>;
  getBondModels(): Promise<BondModel[]>;
  getBondModel(id: number): Promise<BondModel | undefined>;
  getBondModelByLead(leadId: number): Promise<BondModel | undefined>;
  createBondModel(data: InsertBondModel): Promise<BondModel>;
  updateBondModel(id: number, data: Partial<InsertBondModel>): Promise<BondModel | undefined>;
  getMarketScores(): Promise<MarketScore[]>;
  getMarketScore(id: number): Promise<MarketScore | undefined>;
  createMarketScore(data: InsertMarketScore): Promise<MarketScore>;
  updateMarketScore(id: number, data: Partial<InsertMarketScore>): Promise<MarketScore | undefined>;
  getGoldMemos(): Promise<GoldMemo[]>;
  getGoldMemo(leadId: number): Promise<GoldMemo | undefined>;
  createGoldMemo(data: InsertGoldMemo): Promise<GoldMemo>;
  getBrokers(): Promise<Broker[]>;
  getBroker(id: number): Promise<Broker | undefined>;
  createBroker(data: InsertBroker): Promise<Broker>;
  updateBroker(id: number, data: Partial<InsertBroker>): Promise<Broker | undefined>;
  getBrokerCalls(brokerId?: number): Promise<BrokerCall[]>;
  createBrokerCall(data: InsertBrokerCall): Promise<BrokerCall>;
  getTefraIssuers(): Promise<TefraIssuer[]>;
  getTefraIssuer(id: number): Promise<TefraIssuer | undefined>;
  createTefraIssuer(data: InsertTefraIssuer): Promise<TefraIssuer>;
  updateTefraIssuer(id: number, data: Partial<InsertTefraIssuer>): Promise<TefraIssuer | undefined>;
  getActivityLog(entityType?: string, entityId?: number): Promise<ActivityLog[]>;
  logActivity(data: InsertActivityLog): Promise<void>;
  getSieveConfig(): Promise<SieveConfig[]>;
  getSieveConfigByKey(key: string): Promise<SieveConfig | undefined>;
  updateSieveConfig(key: string, value: string, updatedBy?: string): Promise<SieveConfig | undefined>;
}

export const storage: IStorage = {
  getUser: async (email) => (await db.select().from(users).where(eq(users.email, email)))[0],
  getUserById: async (id) => (await db.select().from(users).where(eq(users.id, id)))[0],
  createUser: async (data) => (await db.insert(users).values({ ...data, createdAt: now() }).returning())[0],
  getUsers: async () => {
    const rows = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users).orderBy(users.createdAt);
    return rows;
  },
  createUserWithPassword: async ({ name, email, password, role }) => {
    const [row] = await db.insert(users).values({
      name,
      email,
      role,
      passwordHash: password,
      createdAt: now(),
    }).returning();
    return { id: row.id, name: row.name, email: row.email, role: row.role, createdAt: row.createdAt };
  },
  deleteUser: async (id) => { await db.delete(users).where(eq(users.id, id)); },

  getLeads: async () => db.select().from(leads).orderBy(desc(leads.createdAt)),
  getLead: async (id) => (await db.select().from(leads).where(eq(leads.id, id)))[0],
  createLead: async (data) => {
    const [{ c }] = await db.select({ c: sql<number>`count(*)::int` }).from(leads);
    const leadId = `LEAD-${String((c ?? 0) + 1).padStart(4, "0")}`;
    return (await db.insert(leads).values({ ...data, leadId, createdAt: now(), updatedAt: now() }).returning())[0];
  },
  updateLead: async (id, data) => (await db.update(leads).set({ ...data, updatedAt: now() }).where(eq(leads.id, id)).returning())[0],
  deleteLead: async (id) => { await db.delete(leads).where(eq(leads.id, id)); },
  getLeadStats: async () => {
    const all = await db.select().from(leads);
    const bms = await db.select().from(bondModels);
    return {
      total: all.length,
      newCount: all.filter(l => l.disposition === "New").length,
      inScreen: all.filter(l => l.stepReached === 1 && l.disposition === "Pass").length,
      goldValidation: all.filter(l => l.stepReached >= 2 && l.step2Pass === 1 && l.disposition !== "LOI" && l.disposition !== "Reject").length,
      loi: all.filter(l => l.disposition === "LOI").length,
      rejected: all.filter(l => l.disposition === "Reject").length,
      goDeals: bms.filter(b => b.goNoGo === "GO").length,
      totalPar: bms.filter(b => b.goNoGo === "GO").reduce((s, b) => s + (b.seniorBondPar ?? 0), 0),
    };
  },

  getBondModels: async () => db.select().from(bondModels).orderBy(desc(bondModels.createdAt)),
  getBondModel: async (id) => (await db.select().from(bondModels).where(eq(bondModels.id, id)))[0],
  getBondModelByLead: async (leadId) => (await db.select().from(bondModels).where(eq(bondModels.leadId, leadId)))[0],
  createBondModel: async (data) => (await db.insert(bondModels).values({ ...data, createdAt: now(), updatedAt: now() }).returning())[0],
  updateBondModel: async (id, data) => (await db.update(bondModels).set({ ...data, updatedAt: now() }).where(eq(bondModels.id, id)).returning())[0],

  getMarketScores: async () => db.select().from(marketScores).orderBy(desc(marketScores.createdAt)),
  getMarketScore: async (id) => (await db.select().from(marketScores).where(eq(marketScores.id, id)))[0],
  createMarketScore: async (data) => (await db.insert(marketScores).values({ ...data, createdAt: now() }).returning())[0],
  updateMarketScore: async (id, data) => (await db.update(marketScores).set(data).where(eq(marketScores.id, id)).returning())[0],

  getGoldMemos: async () => db.select().from(goldMemos).orderBy(desc(goldMemos.createdAt)),
  getGoldMemo: async (leadId) => (await db.select().from(goldMemos).where(eq(goldMemos.leadId, leadId)))[0],
  createGoldMemo: async (data) => (await db.insert(goldMemos).values({ ...data, createdAt: now() }).returning())[0],

  getBrokers: async () => db.select().from(brokers).orderBy(desc(brokers.createdAt)),
  getBroker: async (id) => (await db.select().from(brokers).where(eq(brokers.id, id)))[0],
  createBroker: async (data) => (await db.insert(brokers).values({ ...data, createdAt: now() }).returning())[0],
  updateBroker: async (id, data) => (await db.update(brokers).set(data).where(eq(brokers.id, id)).returning())[0],

  getBrokerCalls: async (brokerId) => brokerId
    ? db.select().from(brokerCalls).where(eq(brokerCalls.brokerId, brokerId)).orderBy(desc(brokerCalls.callDate))
    : db.select().from(brokerCalls).orderBy(desc(brokerCalls.callDate)),
  createBrokerCall: async (data) => (await db.insert(brokerCalls).values({ ...data, createdAt: now() }).returning())[0],

  getTefraIssuers: async () => db.select().from(tefraIssuers).orderBy(desc(tefraIssuers.receptivityScore)),
  getTefraIssuer: async (id) => (await db.select().from(tefraIssuers).where(eq(tefraIssuers.id, id)))[0],
  createTefraIssuer: async (data) => (await db.insert(tefraIssuers).values({ ...data, createdAt: now() }).returning())[0],
  updateTefraIssuer: async (id, data) => (await db.update(tefraIssuers).set(data).where(eq(tefraIssuers.id, id)).returning())[0],

  getActivityLog: async (entityType, entityId) => {
    if (entityType && entityId) return db.select().from(activityLog).where(and(eq(activityLog.entityType, entityType), eq(activityLog.entityId, entityId))).orderBy(desc(activityLog.timestamp));
    if (entityType) return db.select().from(activityLog).where(eq(activityLog.entityType, entityType)).orderBy(desc(activityLog.timestamp));
    return db.select().from(activityLog).orderBy(desc(activityLog.timestamp)).limit(100);
  },
  logActivity: async (data) => { await db.insert(activityLog).values({ ...data, timestamp: data.timestamp || now() }); },

  getSieveConfig: async () => db.select().from(sieveConfig).orderBy(sieveConfig.category),
  getSieveConfigByKey: async (key) => (await db.select().from(sieveConfig).where(eq(sieveConfig.key, key)))[0],
  updateSieveConfig: async (key, value, updatedBy) =>
    (await db.update(sieveConfig).set({ value, updatedAt: now(), updatedBy: updatedBy ?? null }).where(eq(sieveConfig.key, key)).returning())[0],
};

import { pgTable, text, integer, real, serial, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─────────────────────────────────────────────
// USERS (auth / team)
// ─────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("analyst"), // "admin" | "analyst" | "viewer"
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull().default(""),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─────────────────────────────────────────────
// LEADS (Module 1: Intake)
// ─────────────────────────────────────────────
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  leadId: text("lead_id").notNull().unique(), // e.g. LEAD-0042
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  acres: real("acres"),
  askingPrice: real("asking_price"),
  zoning: text("zoning"),
  universityName: text("university_name"),
  universityDistanceMiles: real("university_distance_miles"),
  universityEnrollment: integer("university_enrollment"),
  listingUrl: text("listing_url"),
  source: text("source").notNull().default("LoopNet"),
  sourceDate: text("source_date").notNull(),
  assignedTo: text("assigned_to"),
  notes: text("notes"),
  beds: integer("beds"),
  stepReached: integer("step_reached").notNull().default(1),
  disposition: text("disposition").notNull().default("New"),
  killReason: text("kill_reason"),
  step1Pass: integer("step1_pass"),
  step1Notes: text("step1_notes"),
  step2ScoreBedGap: integer("step2_score_bed_gap"),
  step2ScoreRentLevels: integer("step2_score_rent_levels"),
  step2ScorePipelineConstraint: integer("step2_score_pipeline_constraint"),
  step2ScoreIssuerReceptivity: integer("step2_score_issuer_receptivity"),
  step2ScorePopulationMigration: integer("step2_score_population_migration"),
  step2TotalScore: integer("step2_total_score"),
  step2Pass: integer("step2_pass"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// ─────────────────────────────────────────────
// BOND MODELS (Module 3: Underwriting Engine)
// ─────────────────────────────────────────────
export const bondModels = pgTable("bond_models", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id"),
  projectName: text("project_name").notNull(),
  unitMix: text("unit_mix").notNull().default("[]"),
  seniorCouponRate: real("senior_coupon_rate").notNull().default(0.0525),
  targetDscr: real("target_dscr").notNull().default(1.2),
  valueEngineeringPct: real("value_engineering_pct").notNull().default(0.05),
  landContractPrice: real("land_contract_price").notNull().default(0),
  fmvLandSale: real("fmv_land_sale").notNull().default(0),
  developerFeePct: real("developer_fee_pct").notNull().default(0.06),
  wfhpDevFeeShare: real("wfhp_dev_fee_share").notNull().default(0.02),
  assetMgmtFeePct: real("asset_mgmt_fee_pct").notNull().default(0.015),
  seniorAmortYears: integer("senior_amort_years").notNull().default(40),
  coiPct: real("coi_pct").notNull().default(0.0245),
  mmYield: real("mm_yield").notNull().default(0.0375),
  constructionMonths: integer("construction_months").notNull().default(30),
  grossPotentialRent: real("gross_potential_rent"),
  concessionsPct: real("concessions_pct").notNull().default(0.015),
  vacancyPct: real("vacancy_pct").notNull().default(0.025),
  parkingIncome: real("parking_income").notNull().default(0),
  otherIncome: real("other_income").notNull().default(0),
  commercialIncome: real("commercial_income").notNull().default(0),
  payroll: real("payroll").notNull().default(0),
  advertising: real("advertising").notNull().default(0),
  generalAdmin: real("general_admin").notNull().default(0),
  utilities: real("utilities").notNull().default(0),
  repairsMaintenance: real("repairs_maintenance").notNull().default(0),
  serviceContracts: real("service_contracts").notNull().default(0),
  mgmtFeePct: real("mgmt_fee_pct").notNull().default(0.035),
  makeReady: real("make_ready").notNull().default(0),
  propertyTaxes: real("property_taxes").notNull().default(0),
  insurance: real("insurance").notNull().default(0),
  pilotAddback: real("pilot_addback").notNull().default(0),
  hardCostTotal: real("hard_cost_total").notNull().default(0),
  ownersDirectCosts: real("owners_direct_costs").notNull().default(0),
  contingency: real("contingency").notNull().default(0),
  softCosts: real("soft_costs").notNull().default(0),
  workingCapital: real("working_capital").notNull().default(0),
  aeReimbursement: real("ae_reimbursement").notNull().default(0),
  wfhpPredDevCosts: real("wfhp_predev_costs").notNull().default(0),
  uwNoi: real("uw_noi"),
  seniorBondPar: real("senior_bond_par"),
  maxSupportableLandFmv: real("max_supportable_land_fmv"),
  surplusGap: real("surplus_gap"),
  dayOneMonetization: real("day_one_monetization"),
  dayOneRoi: real("day_one_roi"),
  dayOneMoic: real("day_one_moic"),
  goNoGo: text("go_no_go"),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});

export const insertBondModelSchema = createInsertSchema(bondModels).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBondModel = z.infer<typeof insertBondModelSchema>;
export type BondModel = typeof bondModels.$inferSelect;

// ─────────────────────────────────────────────
// SIEVE CONFIG (adjustable parameters — Module 4)
// ─────────────────────────────────────────────
export const sieveConfig = pgTable("sieve_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),   // e.g. "minBeds", "minBondPar", "targetDscr"
  value: text("value").notNull(),         // stored as string, parsed by type
  label: text("label").notNull(),
  description: text("description"),
  category: text("category").notNull().default("screen"), // "screen" | "bond" | "market"
  updatedAt: text("updated_at").notNull().default(""),
  updatedBy: text("updated_by"),
});

export const insertSieveConfigSchema = createInsertSchema(sieveConfig).omit({ id: true, updatedAt: true });
export type InsertSieveConfig = z.infer<typeof insertSieveConfigSchema>;
export type SieveConfig = typeof sieveConfig.$inferSelect;

// ─────────────────────────────────────────────
// MARKET SIEVE SCORES (Module 4)
// ─────────────────────────────────────────────
export const marketScores = pgTable("market_scores", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id"),
  market: text("market").notNull(),
  mdiScore: real("mdi_score"),
  siiScore: real("sii_score"),
  beiScore: real("bei_score"),
  eaiScore: real("eai_score"),
  tviScore: real("tvi_score"),
  mdiKill: integer("mdi_kill").default(0),
  siiKill: integer("sii_kill").default(0),
  beiKill: integer("bei_kill").default(0),
  eaiKill: integer("eai_kill").default(0),
  tviKill: integer("tvi_kill").default(0),
  compositeScore: real("composite_score"),
  recommendation: text("recommendation"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(""),
});

export const insertMarketScoreSchema = createInsertSchema(marketScores).omit({ id: true, createdAt: true });
export type InsertMarketScore = z.infer<typeof insertMarketScoreSchema>;
export type MarketScore = typeof marketScores.$inferSelect;

// ─────────────────────────────────────────────
// GOLD MEMOS (Module 4 output)
// ─────────────────────────────────────────────
export const goldMemos = pgTable("gold_memos", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull(),
  siteSummary: text("site_summary"),
  universityDemandSnapshot: text("university_demand_snapshot"),
  tefraIssuerFit: text("tefra_issuer_fit"),
  economicsSummary: text("economics_summary"),
  risksMitigations: text("risks_mitigations"),
  recommendation: text("recommendation"),
  createdBy: text("created_by"),
  createdAt: text("created_at").notNull().default(""),
});

export const insertGoldMemoSchema = createInsertSchema(goldMemos).omit({ id: true, createdAt: true });
export type InsertGoldMemo = z.infer<typeof insertGoldMemoSchema>;
export type GoldMemo = typeof goldMemos.$inferSelect;

// ─────────────────────────────────────────────
// BROKERS (Module 5: CRM)
// ─────────────────────────────────────────────
export const brokers = pgTable("brokers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  firm: text("firm"),
  email: text("email"),
  phone: text("phone"),
  markets: text("markets").notNull().default("[]"),
  specialty: text("specialty"),
  notes: text("notes"),
  lastContactDate: text("last_contact_date"),
  nextFollowUpDate: text("next_follow_up_date"),
  createdAt: text("created_at").notNull().default(""),
});

export const insertBrokerSchema = createInsertSchema(brokers).omit({ id: true, createdAt: true });
export type InsertBroker = z.infer<typeof insertBrokerSchema>;
export type Broker = typeof brokers.$inferSelect;

// ─────────────────────────────────────────────
// BROKER CALL LOGS (Module 5)
// ─────────────────────────────────────────────
export const brokerCalls = pgTable("broker_calls", {
  id: serial("id").primaryKey(),
  brokerId: integer("broker_id").notNull(),
  leadId: integer("lead_id"),
  callDate: text("call_date").notNull(),
  outcome: text("outcome").notNull(),
  keyMetrics: text("key_metrics"),
  actionItems: text("action_items"),
  calledBy: text("called_by"),
  createdAt: text("created_at").notNull().default(""),
});

export const insertBrokerCallSchema = createInsertSchema(brokerCalls).omit({ id: true, createdAt: true });
export type InsertBrokerCall = z.infer<typeof insertBrokerCallSchema>;
export type BrokerCall = typeof brokerCalls.$inferSelect;

// ─────────────────────────────────────────────
// TEFRA ISSUERS (Module 5)
// ─────────────────────────────────────────────
export const tefraIssuers = pgTable("tefra_issuers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  state: text("state").notNull(),
  issuerType: text("issuer_type"),
  dealsLast5Years: integer("deals_last_5_years").notNull().default(0),
  receptivityScore: integer("receptivity_score").notNull().default(3),
  avgTefraMonths: integer("avg_tefra_months"),
  primaryContact: text("primary_contact"),
  notes: text("notes"),
  isPrimary: integer("is_primary").notNull().default(0),
  createdAt: text("created_at").notNull().default(""),
});

export const insertTefraIssuerSchema = createInsertSchema(tefraIssuers).omit({ id: true, createdAt: true });
export type InsertTefraIssuer = z.infer<typeof insertTefraIssuerSchema>;
export type TefraIssuer = typeof tefraIssuers.$inferSelect;

// ─────────────────────────────────────────────
// PIPELINE ACTIVITY / AUDIT LOG
// ─────────────────────────────────────────────
export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(),
  actor: text("actor"),
  detail: text("detail"),
  timestamp: text("timestamp").notNull().default(""),
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({ id: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;

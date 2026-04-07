import { pool } from "./storage";

// ── University list (top 20 flagship universities by enrollment) ─────────────
const TOP_UNIVERSITIES = [
  { name: "Ohio State University", city: "Columbus", state: "OH" },
  { name: "University of Michigan", city: "Ann Arbor", state: "MI" },
  { name: "University of Texas at Austin", city: "Austin", state: "TX" },
  { name: "University of Florida", city: "Gainesville", state: "FL" },
  { name: "Penn State University", city: "State College", state: "PA" },
  { name: "Arizona State University", city: "Tempe", state: "AZ" },
  { name: "University of Minnesota", city: "Minneapolis", state: "MN" },
  { name: "Indiana University", city: "Bloomington", state: "IN" },
  { name: "University of Wisconsin", city: "Madison", state: "WI" },
  { name: "Purdue University", city: "West Lafayette", state: "IN" },
  { name: "University of Illinois", city: "Champaign", state: "IL" },
  { name: "University of Iowa", city: "Iowa City", state: "IA" },
  { name: "University of Missouri", city: "Columbia", state: "MO" },
  { name: "University of Kansas", city: "Lawrence", state: "KS" },
  { name: "University of Nebraska", city: "Lincoln", state: "NE" },
  { name: "University of Tennessee", city: "Knoxville", state: "TN" },
  { name: "University of Alabama", city: "Tuscaloosa", state: "AL" },
  { name: "University of Georgia", city: "Athens", state: "GA" },
  { name: "Louisiana State University", city: "Baton Rouge", state: "LA" },
  { name: "University of Mississippi", city: "Oxford", state: "MS" },
];

// ── Sieve config helpers ─────────────────────────────────────────────────────
interface SieveParams {
  minBeds: number;
  minBondPar: number;
  maxUnivMiles: number;
  maxLandBasis: number;
  targetDscr: number;
  minFmvLift: number;
  minEnrollment: number;
}

async function getSieveParams(): Promise<SieveParams> {
  const { rows } = await pool.query("SELECT key, value FROM sieve_config");
  const cfg: Record<string, number> = {};
  for (const row of rows) {
    cfg[row.key] = parseFloat(row.value);
  }
  return {
    minBeds: cfg.minBeds ?? 820,
    minBondPar: cfg.minBondPar ?? 100_000_000,
    maxUnivMiles: cfg.maxUnivMiles ?? 1.0,
    maxLandBasis: cfg.maxLandBasis ?? 10_000_000,
    targetDscr: cfg.targetDscr ?? 1.25,
    minFmvLift: cfg.minFmvLift ?? 2.0,
    minEnrollment: cfg.minEnrollment ?? 20_000,
  };
}

// ── Extracted project data ───────────────────────────────────────────────────
interface ProjectData {
  projectName: string;
  address: string;
  city: string;
  state: string;
  universityName: string;
  estimatedBeds: number | null;
  estimatedAskingPriceM: number | null; // in millions
  distanceMiles: number | null;
  sourceUrl: string;
}

// ── Perplexity API call ──────────────────────────────────────────────────────
async function queryPerplexity(prompt: string): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY not set");
  }

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        {
          role: "system",
          content:
            "You are a real estate research assistant specializing in student housing development projects. Extract structured data from search results and return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Perplexity API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data?.choices?.[0]?.message?.content ?? "";
}

// ── Parse LLM response into project data ────────────────────────────────────
function parseProjectsFromResponse(
  content: string,
  university: { name: string; city: string; state: string }
): ProjectData[] {
  const projects: ProjectData[] = [];

  // Try to find JSON array in the response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return projects;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return projects;

    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const projectName = String(item.projectName || item.name || item.project_name || "Unknown Project");
      const address = String(item.address || item.location || "");
      const city = String(item.city || university.city);
      const state = String(item.state || university.state);
      const estimatedBeds =
        typeof item.estimatedBeds === "number"
          ? item.estimatedBeds
          : typeof item.beds === "number"
          ? item.beds
          : typeof item.units === "number"
          ? item.units * 2
          : null;
      const estimatedAskingPriceM =
        typeof item.estimatedPriceM === "number"
          ? item.estimatedPriceM
          : typeof item.askingPriceM === "number"
          ? item.askingPriceM
          : typeof item.price === "number"
          ? item.price / 1_000_000
          : null;
      const distanceMiles =
        typeof item.distanceMiles === "number"
          ? item.distanceMiles
          : typeof item.distance === "number"
          ? item.distance
          : null;
      const sourceUrl = String(item.sourceUrl || item.url || item.source || "");

      projects.push({
        projectName,
        address,
        city,
        state,
        universityName: university.name,
        estimatedBeds,
        estimatedAskingPriceM,
        distanceMiles,
        sourceUrl,
      });
    }
  } catch {
    // JSON parse failed — skip
  }

  return projects;
}

// ── Sieve filter ─────────────────────────────────────────────────────────────
interface SieveResult {
  passed: boolean;
  failReason: string | null;
}

function applyBasicSieve(project: ProjectData, sieve: SieveParams): SieveResult {
  if (project.estimatedBeds !== null && project.estimatedBeds < sieve.minBeds) {
    return { passed: false, failReason: `Beds ${project.estimatedBeds} < min ${sieve.minBeds}` };
  }
  if (project.distanceMiles !== null && project.distanceMiles > sieve.maxUnivMiles) {
    return {
      passed: false,
      failReason: `Distance ${project.distanceMiles}mi > max ${sieve.maxUnivMiles}mi`,
    };
  }
  if (
    project.estimatedAskingPriceM !== null &&
    project.estimatedAskingPriceM * 1_000_000 > sieve.maxLandBasis
  ) {
    return {
      passed: false,
      failReason: `Land basis $${project.estimatedAskingPriceM}M > max $${sieve.maxLandBasis / 1_000_000}M`,
    };
  }
  return { passed: true, failReason: null };
}

// ── Insert qualifying deal into leads table ──────────────────────────────────
async function insertDeal(project: ProjectData): Promise<void> {
  // Get next lead count
  const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM leads");
  const count = (rows[0]?.c ?? 0) + 1;
  const leadId = `LEAD-${String(count).padStart(4, "0")}`;

  await pool.query(
    `INSERT INTO leads
       (lead_id, address, city, state, university_name, university_distance_miles,
        source, source_date, beds, step_reached, disposition, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT DO NOTHING`,
    [
      leadId,
      project.address || project.projectName,
      project.city,
      project.state,
      project.universityName,
      project.distanceMiles ?? null,
      "auto-sourced",
      new Date().toISOString(),
      project.estimatedBeds ?? null,
      1,
      "New",
      new Date().toISOString(),
      new Date().toISOString(),
    ]
  );
}

// ── Main sourcing engine ─────────────────────────────────────────────────────
export async function runSourcingEngine(): Promise<void> {
  // Create run record
  const { rows: runRows } = await pool.query(
    "INSERT INTO sourcing_runs (started_at, status, deals_found, deals_qualified) VALUES (NOW(), 'running', 0, 0) RETURNING id"
  );
  const runId: number = runRows[0]?.id;

  if (!runId) {
    console.error("[Sourcing] Failed to create sourcing run record");
    return;
  }

  console.log(`[Sourcing] Run #${runId} started`);

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.warn("[Sourcing] PERPLEXITY_API_KEY not set — skipping API calls");
    await pool.query(
      "UPDATE sourcing_runs SET status = 'completed', completed_at = NOW(), error_message = $1 WHERE id = $2",
      ["PERPLEXITY_API_KEY not configured", runId]
    );
    return;
  }

  let dealsFound = 0;
  let dealsQualified = 0;

  try {
    const sieve = await getSieveParams();

    for (const university of TOP_UNIVERSITIES) {
      const queries = [
        `Search for student housing development projects near ${university.name} in ${university.city}, ${university.state} in 2024-2025. I need purpose-built student housing (PBSA) projects with estimated number of beds/units and asking price. Return a JSON array of objects with fields: projectName, address, city, state, estimatedBeds, estimatedPriceM (in millions), distanceMiles (from university), sourceUrl.`,
        `Find purpose-built student housing construction permits or development proposals near ${university.name} campus. Return a JSON array of objects with fields: projectName, address, city, state, estimatedBeds, estimatedPriceM (in millions), distanceMiles (from university), sourceUrl.`,
        `Find PBSA or ground lease student housing development projects in ${university.city}, ${university.state} near ${university.name}. Return a JSON array of objects with fields: projectName, address, city, state, estimatedBeds, estimatedPriceM (in millions), distanceMiles (from university), sourceUrl.`,
      ];

      for (const query of queries) {
        try {
          console.log(`[Sourcing] Querying for ${university.name}...`);
          const responseText = await queryPerplexity(query);
          const projects = parseProjectsFromResponse(responseText, university);

          for (const project of projects) {
            dealsFound++;
            const sieveResult = applyBasicSieve(project, sieve);

            // Log to sourcing_results
            await pool.query(
              `INSERT INTO sourcing_results
                 (run_id, project_name, address, university, estimated_beds, estimated_price_m,
                  distance_miles, passed_sieve, fail_reason, source_url, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
              [
                runId,
                project.projectName,
                project.address,
                project.universityName,
                project.estimatedBeds,
                project.estimatedAskingPriceM,
                project.distanceMiles,
                sieveResult.passed,
                sieveResult.failReason,
                project.sourceUrl,
              ]
            );

            if (sieveResult.passed) {
              dealsQualified++;
              try {
                await insertDeal(project);
                console.log(`[Sourcing] Qualified deal inserted: ${project.projectName}`);
              } catch (err: any) {
                console.error(`[Sourcing] Failed to insert deal ${project.projectName}: ${err.message}`);
              }
            }
          }

          // Brief pause between API calls to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (err: any) {
          console.error(`[Sourcing] Query error for ${university.name}: ${err.message}`);
        }
      }
    }

    // Complete run
    await pool.query(
      "UPDATE sourcing_runs SET status = 'completed', completed_at = NOW(), deals_found = $1, deals_qualified = $2 WHERE id = $3",
      [dealsFound, dealsQualified, runId]
    );

    console.log(
      `[Sourcing] Run #${runId} completed: ${dealsFound} found, ${dealsQualified} qualified`
    );
  } catch (err: any) {
    console.error(`[Sourcing] Run #${runId} failed: ${err.message}`);
    await pool.query(
      "UPDATE sourcing_runs SET status = 'failed', completed_at = NOW(), error_message = $1, deals_found = $2, deals_qualified = $3 WHERE id = $4",
      [err.message, dealsFound, dealsQualified, runId]
    );
  }
}

import * as dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import cron from "node-cron";
import { fetchAndProcessAll, type FetchConfig } from "./meetup.js";
import {
  createSupabaseClient,
  cleanupOldEvents,
  resolveCreatedByUserId,
  upsertEvents,
} from "./db.js";
import { log } from "./utils.js";

// ---------------------------------------------------------------------------
// Config from env
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// index.ts lives at the service root (services/meetup-ingestor/index.ts),
// so __dirname IS the service root; repo root is two levels up.
const serviceRoot = __dirname;
const repoRoot = path.resolve(__dirname, "..", "..");

// Load env from repository root first, then allow .env.local to override,
// then allow a service-local .env to take final precedence.
dotenv.config({ path: path.resolve(repoRoot, ".env") });
dotenv.config({ path: path.resolve(repoRoot, ".env.local"), override: true });
dotenv.config({ path: path.resolve(serviceRoot, ".env"), override: true });

interface AppConfig extends Omit<FetchConfig, "systemUserId"> {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  preferredSystemUserId?: string;
  runOnStart: boolean;
}

function loadConfig(): AppConfig {
  const clientKey = process.env.MEETUP_CLIENT_KEY;
  const memberId = process.env.MEETUP_MEMBER_ID;
  const signingSecret = process.env.MEETUP_SIGNING_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const systemBusinessId = process.env.SYSTEM_BUSINESS_ID;
  const preferredSystemUserId = process.env.SYSTEM_USER_ID;

  if (!clientKey) throw new Error("Missing MEETUP_CLIENT_KEY");
  if (!memberId) throw new Error("Missing MEETUP_MEMBER_ID");
  if (!signingSecret) throw new Error("Missing MEETUP_SIGNING_SECRET");
  if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseServiceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  if (!systemBusinessId) throw new Error("Missing SYSTEM_BUSINESS_ID");

  const radiusKm = Math.max(
    1,
    parseInt(process.env.FETCH_RADIUS_KM || "30", 10)
  );

  return {
    clientKey,
    memberId,
    signingSecret,
    supabaseUrl,
    supabaseServiceRoleKey,
    systemBusinessId,
    preferredSystemUserId,
    radiusKm,
    pageSize: Math.min(Math.max(parseInt(process.env.PAGE_SIZE || "200", 10), 20), 200),
    fetchWindowDays: 120,
    runOnStart: process.env.RUN_ON_START === "true",
  };
}

// ---------------------------------------------------------------------------
// Ingest job
// ---------------------------------------------------------------------------

let isRunning = false;

async function runIngest(config: AppConfig): Promise<void> {
  if (isRunning) {
    log.warn("Previous ingest still running. Skipping this cycle.");
    return;
  }

  isRunning = true;
  const start = Date.now();

  log.info("=== Meetup ingest starting ===");

  const supabase = createSupabaseClient(config.supabaseUrl, config.supabaseServiceRoleKey);

  try {
    // 1. Test connectivity
    log.info("Testing Supabase connection...");
    const { error: testErr } = await supabase.from("events_and_specials").select("id").limit(1);
    if (testErr) throw new Error(`Supabase connection test failed: ${testErr.message}`);
    log.info("Supabase connected.");

    // 2. Cleanup stale Meetup events
    await cleanupOldEvents(supabase);

    // 3. Resolve created_by user
    const resolvedCreatedBy = await resolveCreatedByUserId(
      supabase,
      config.systemBusinessId,
      config.preferredSystemUserId
    );
    log.info(`Using created_by user id: ${resolvedCreatedBy}`);

    // 4. Fetch, map, consolidate
    const result = await fetchAndProcessAll({
      ...config,
      systemUserId: resolvedCreatedBy,
    });

    log.info(
      `Fetch complete: ${result.fetchedCount} fetched, ${result.mappedCount} mapped, ${result.consolidatedCount} consolidated.`
    );

    if (result.rows.length === 0) {
      log.info("[Ingest] No events to upsert. Done.");
      return;
    }

    // 5. Upsert into DB
    const dbResult = await upsertEvents(supabase, result.rows);

    log.info("[Ingest] Meetup ingest complete:", {
      source: "meetup",
      fetched: result.fetchedCount,
      mapped: result.mappedCount,
      consolidated: result.consolidatedCount,
      inserted: dbResult.inserted,
      updated: dbResult.updated,
      skipped: dbResult.skipped,
      created_by: resolvedCreatedBy,
    });
  } catch (err) {
    log.error(`Ingest failed: ${err}`);
    if (err instanceof Error && err.stack) {
      log.error(err.stack);
    }
  } finally {
    isRunning = false;
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    log.info(`=== Ingest complete in ${elapsed}s ===\n`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const config = loadConfig();

  log.info("Meetup Ingestor started.");
  log.info(`Schedule: every 6 hours (0 */6 * * *)`);
  log.info(`Radius: ${config.radiusKm}km around Cape Town`);
  log.info(`Fetch window: ${config.fetchWindowDays} days`);
  log.info(`Page size: ${config.pageSize}`);

  // Schedule the cron job
  cron.schedule("0 */6 * * *", () => {
    runIngest(config).catch((err) => log.error(`Cron job error: ${err}`));
  });

  // Optional immediate run on startup
  if (config.runOnStart) {
    log.info("RUN_ON_START=true — running immediate ingest...");
    await runIngest(config);
  } else {
    log.info("Waiting for next scheduled run. Set RUN_ON_START=true for immediate execution.");
  }
}

main().catch((err) => {
  log.error(`Fatal: ${err}`);
  process.exit(1);
});

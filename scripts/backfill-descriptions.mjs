/**
 * backfill-descriptions.mjs
 *
 * Generates Google-style (NOT scraped) descriptions
 * and OVERWRITES businesses.description
 *
 * Env required:
 *  - OPENAI_API_KEY
 *  - SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 *  - SUPABASE_SERVICE_ROLE_KEY
 *
 * Install:
 *  npm i openai @supabase/supabase-js p-limit
 *
 * Run:
 *  node scripts/backfill-descriptions.mjs
 *  node scripts/backfill-descriptions.mjs --dry-run
 */

import "dotenv/config";
import pLimit from "p-limit";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const MODEL = "gpt-4o-mini";
const CONCURRENCY = 4;
const DRY_RUN = process.argv.includes("--dry-run");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const limiter = pLimit(CONCURRENCY);

const SYSTEM = `
You write neutral, Google-style business summaries.

Rules:
- 1–2 sentences only.
- No marketing hype.
- No exclamation marks.
- Do NOT invent awards, prices, or claims.
- Use only the info provided.
- Output ONLY the description text.
`;

function prompt(b) {
  const category = b.primary_subcategory_label ?? b.category_label ?? b.category;
  const subcategory = b.primary_subcategory_slug ?? b.subcategory;
  const location = b.location ?? [b.city, b.suburb ?? b.area].filter(Boolean).join(", ") || "";

  return `
Business name: ${b.name}
Category: ${category ?? b.category ?? ""}
Subcategory: ${subcategory ?? ""}
Location: ${location}

Write the description.
`;
}

function clean(text) {
  if (!text) return "";
  return text.replace(/^["""]+|["""]+$/g, "").replace(/\s+/g, " ").trim();
}

async function generateDescription(b) {
  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: prompt(b) },
    ],
  });

  return clean(res.choices[0].message.content);
}

async function updateDescription(id, description) {
  if (DRY_RUN) return;

  const { error } = await supabase
    .from("businesses")
    .update({ description })
    .eq("id", id);

  if (error) throw error;
}

async function main() {
  console.log(DRY_RUN ? "DRY RUN – no updates will be written.\n" : "");
  console.log("Fetching businesses...");

  const { data, error } = await supabase
    .from("businesses")
    .select("id,name,primary_category_slug,primary_subcategory_slug,primary_subcategory_label,location,description");

  if (error) throw error;

  console.log(`Found ${data.length} businesses\n`);

  let success = 0;
  let fail = 0;

  await Promise.all(
    data.map((b) =>
      limiter(async () => {
        try {
          const desc = await generateDescription(b);
          await updateDescription(b.id, desc);
          success++;
          console.log(`✔ ${b.name}`);
        } catch (e) {
          fail++;
          console.log(`✖ ${b.name}`, e.message);
        }
      })
    )
  );

  console.log("\nDone");
  console.log("Updated:", success);
  console.log("Failed:", fail);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

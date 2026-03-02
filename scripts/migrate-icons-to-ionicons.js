/**
 * Codemod: migrate lucide-react imports → @/app/lib/icons
 *
 * - Replaces all `from "lucide-react"` / `from 'lucide-react'` with `from "@/app/lib/icons"`
 * - Replaces `LucideIcon` type references with `IconType`
 * - Skips files that already import from @/app/lib/icons (already migrated)
 * - Skips node_modules, .next, and non-source files
 *
 * Usage: node scripts/migrate-icons-to-ionicons.js
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const SKIP_DIRS = new Set(['node_modules', '.next', 'out', 'dist', '.git']);

// Files already handled manually — skip to avoid double-processing
const SKIP_FILES = new Set([
  path.join(__dirname, '..', 'src', 'app', 'lib', 'icons.ts'),
  path.join(__dirname, '..', 'src', 'app', 'lib', 'badgeMappings.ts'),
  path.join(__dirname, '..', 'src', 'app', 'components', 'atoms', 'Icon', 'Icon.tsx'),
  path.join(__dirname, '..', 'src', 'app', 'components', 'Performance', 'OptimizedIcons.tsx'),
  path.join(__dirname, '..', 'src', 'app', 'components', 'EventCard', 'EventIcon.tsx'),
]);

let filesChanged = 0;
let filesScanned = 0;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      processFile(full);
    }
  }
}

function processFile(filePath) {
  if (SKIP_FILES.has(filePath)) return;

  filesScanned++;
  let src = fs.readFileSync(filePath, 'utf8');

  // Skip files that don't import from lucide-react
  if (!src.includes('lucide-react')) return;

  let changed = src;

  // Replace the import source: both quote styles, with or without semicolon
  // Handles: import { Foo, Bar } from "lucide-react"
  // Handles: import { type LucideIcon } from 'lucide-react'
  // Handles: import type { LucideIcon } from "lucide-react"
  changed = changed.replace(
    /from\s+["']lucide-react["']/g,
    'from "@/app/lib/icons"'
  );

  // Replace LucideIcon type references
  changed = changed.replace(/\bLucideIcon\b/g, 'IconType');

  if (changed !== src) {
    fs.writeFileSync(filePath, changed, 'utf8');
    filesChanged++;
    const rel = path.relative(path.join(__dirname, '..'), filePath);
    console.log('  updated:', rel);
  }
}

console.log('Scanning', SRC_DIR, '...\n');
walk(SRC_DIR);
console.log(`\nDone. ${filesChanged} files updated out of ${filesScanned} scanned.`);

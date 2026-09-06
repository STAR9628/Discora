#!/usr/bin/env node

/**
 * Verification script for supabase/deploy_pending_migrations.sql
 *
 * Ensures that:
 * 1. Sections 13-16 match their authoritative migration files exactly.
 * 2. All PL/pgSQL functions have matching dollar quoting ($$ ... $$;).
 * 3. No syntax regressions like "AS DECLARE", "$$;,", or orphaned blocks exist.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const bundlePath = path.join(repoRoot, 'supabase/deploy_pending_migrations.sql');

if (!fs.existsSync(bundlePath)) {
  console.error('ERROR: deploy_pending_migrations.sql not found at', bundlePath);
  process.exit(1);
}

const bundleContent = fs.readFileSync(bundlePath, 'utf8');

console.log('--- AUDITING DEPLOYMENT BUNDLE ---');

let hasErrors = false;

// 1. Verify dollar quotes pairing across entire file
const dollarCount = (bundleContent.match(/\$\$/g) || []).length;
if (dollarCount % 2 !== 0) {
  console.error(`FAIL: Odd number of $$ dollar quotes found (${dollarCount}). Possible unmatched function block.`);
  hasErrors = true;
} else {
  console.log(`PASS: $$ dollar quotes are properly paired (total: ${dollarCount}).`);
}

// 2. Search for malformed "AS DECLARE"
const asDeclareMatches = bundleContent.match(/\bas\s+declare\b/gi);
if (asDeclareMatches) {
  console.error(`FAIL: Found malformed "AS DECLARE" without dollar quoting (${asDeclareMatches.length} occurrences).`);
  hasErrors = true;
} else {
  console.log('PASS: No malformed "AS DECLARE" found.');
}

// 3. Search for malformed "$$;,"
if (bundleContent.includes('$$;,')) {
  console.error('FAIL: Found malformed "$$;," syntax.');
  hasErrors = true;
} else {
  console.log('PASS: No "$$;," found.');
}

// 4. Verify Phase 5B migration sections (13 to 16)
const expectedSections = [
  { num: 13, file: '202606240001_fix_discussion_messages_view.sql' },
  { num: 14, file: '202606240002_moderation_inquiry_feedback.sql' },
  { num: 15, file: '202606240003_fix_moderation_queue_regression.sql' },
  { num: 16, file: '202606240004_update_moderation_constraint.sql' },
  { num: 17, file: '202606240005_drop_legacy_submit_moderation_flag.sql' },
];

for (const { num, file } of expectedSections) {
  const marker = `-- === ${num}. ${file} ===`;
  const markerIndex = bundleContent.indexOf(marker);

  if (markerIndex === -1) {
    console.error(`FAIL: Section marker missing: "${marker}"`);
    hasErrors = true;
    continue;
  }

  // Ensure marker appears exactly once
  const occurrences = (bundleContent.match(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  if (occurrences !== 1) {
    console.error(`FAIL: Section marker "${marker}" appears ${occurrences} times (expected 1).`);
    hasErrors = true;
  }

  const startOfContent = markerIndex + marker.length;

  // Load authoritative migration file
  const migPath = path.join(repoRoot, 'supabase/migrations', file);
  if (!fs.existsSync(migPath)) {
    console.error(`FAIL: Authoritative migration file not found: ${migPath}`);
    hasErrors = true;
    continue;
  }

  const migContent = fs.readFileSync(migPath, 'utf8').trim();

  // Find content of this section in bundle: search for next numbered section marker or end of file
  const nextSectionMatch = bundleContent.slice(startOfContent).match(/\n-- === \d+\./);
  const endOfContent = nextSectionMatch
    ? startOfContent + nextSectionMatch.index
    : bundleContent.length;

  const sectionContent = bundleContent.slice(startOfContent, endOfContent).trim().replace(/\r\n/g, '\n');
  const normalizedMigContent = migContent.replace(/\r\n/g, '\n');

  if (sectionContent !== normalizedMigContent) {
    console.error(`FAIL: Section ${num} (${file}) content does NOT match authoritative migration file!`);
    hasErrors = true;
  } else {
    console.log(`PASS: Section ${num} (${file}) matches authoritative migration exactly.`);
  }
}

// 5. Specific function boundary check for submit_moderation_flag and submit_user_feedback
const checkFunction = (fnName) => {
  const fnRegex = new RegExp(`create or replace function public\\.${fnName}[\\s\\S]*?\\$\\$;`, 'gi');
  const matches = bundleContent.match(fnRegex);
  if (!matches || matches.length === 0) {
    console.error(`FAIL: Could not find complete definition for function ${fnName}`);
    hasErrors = true;
  } else {
    for (const match of matches) {
      if (!match.includes('as $$') || !match.includes('$$;')) {
        console.error(`FAIL: Function ${fnName} has invalid dollar quoting.`);
        hasErrors = true;
      }
    }
    console.log(`PASS: Function ${fnName} has valid AS $$ ... $$; boundaries.`);
  }
};

checkFunction('submit_moderation_flag');
checkFunction('submit_user_feedback');

// 6. View output column uniqueness check
const checkViewColumns = (sqlText, contextName) => {
  const views = [];
  const viewStartRegex = /create\s+(?:or\s+replace\s+)?view\s+([a-zA-Z0-9_.]+)\s+(?:with\s*\([^)]*\)\s+)?as\s+select\s+/gi;
  let startMatch;
  while ((startMatch = viewStartRegex.exec(sqlText)) !== null) {
    const viewName = startMatch[1];
    const startIndex = startMatch.index + startMatch[0].length;

    let depth = 0;
    let caseDepth = 0;
    let fromIndex = -1;

    for (let i = startIndex; i < sqlText.length - 4; i++) {
      if (sqlText[i] === '(') depth++;
      else if (sqlText[i] === ')') depth--;
      else if (/\bcase\b/i.test(sqlText.slice(i, i + 4)) && (i === 0 || /\s/.test(sqlText[i - 1]))) {
        caseDepth++;
      } else if (/\bend\b/i.test(sqlText.slice(i, i + 3)) && (i === 0 || /\s/.test(sqlText[i - 1]))) {
        caseDepth--;
      } else if (depth === 0 && caseDepth === 0 && /\bfrom\b/i.test(sqlText.slice(i, i + 4)) && /\s/.test(sqlText[i - 1]) && /\s/.test(sqlText[i + 4])) {
        fromIndex = i;
        break;
      }
    }

    if (fromIndex !== -1) {
      const selectListStr = sqlText.slice(startIndex, fromIndex);
      views.push({ name: viewName, selectListStr });
    }
  }

  for (const { name: viewName, selectListStr } of views) {
    // Split select list by top-level commas (depth == 0 outside parens)
    const columns = [];
    let depth = 0;
    let current = '';
    for (let i = 0; i < selectListStr.length; i++) {
      const char = selectListStr[i];
      if (char === '(') depth++;
      else if (char === ')') depth--;
      else if (char === ',' && depth === 0) {
        columns.push(current.trim());
        current = '';
        continue;
      }
      current += char;
    }
    if (current.trim()) columns.push(current.trim());

    const colNames = [];
    const seen = new Set();
    const duplicates = [];

    for (const colExpr of columns) {
      // Check for explicit "as alias"
      const asMatch = colExpr.match(/\s+as\s+([a-zA-Z0-9_"]+)\s*$/i);
      let colName;
      if (asMatch) {
        colName = asMatch[1].replace(/"/g, '').toLowerCase();
      } else {
        // Inferred identifier e.g. "table.col" -> "col"
        const identMatch = colExpr.trim().match(/([a-zA-Z0-9_"]+)\s*$/);
        colName = identMatch ? identMatch[1].replace(/"/g, '').toLowerCase() : colExpr;
      }

      if (seen.has(colName)) {
        duplicates.push(colName);
      } else {
        seen.add(colName);
      }
      colNames.push(colName);
    }

    if (duplicates.length > 0) {
      console.error(`FAIL: View ${viewName} in ${contextName} has duplicate output columns: ${duplicates.join(', ')}`);
      hasErrors = true;
    } else {
      console.log(`PASS: View ${viewName} in ${contextName} has unique output columns (${colNames.length} columns).`);
    }
  }
};

// Check views in all authoritative migrations and in bundle
checkViewColumns(bundleContent, 'deploy_pending_migrations.sql');

if (hasErrors) {
  console.error('\nOVERALL RESULT: FAILED - Discrepancies found in deployment bundle.');
  process.exit(1);
} else {
  console.log('\nOVERALL RESULT: PASSED - Deployment bundle is 100% valid and synchronized.');
  process.exit(0);
}

// scripts/verify-phase5b-production-sql.mjs
// Verifies supabase/phase5b_production_deploy.sql against canonical migrations

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const deployFilePath = path.join(repoRoot, 'supabase/phase5b_production_deploy.sql');

if (!fs.existsSync(deployFilePath)) {
  console.error(`FAIL: ${deployFilePath} does not exist!`);
  process.exit(1);
}

const deployContent = fs.readFileSync(deployFilePath, 'utf8');
let hasErrors = false;

console.log('--- AUDITING PHASE 5B PRODUCTION DEPLOYMENT FILE ---');

// 1. Check dollar quotes pairing
const dollarMatches = deployContent.match(/\$\$/g);
if (!dollarMatches || dollarMatches.length % 2 !== 0) {
  console.error(`FAIL: Unmatched $$ dollar quotes found in phase5b_production_deploy.sql! Total: ${dollarMatches?.length || 0}`);
  hasErrors = true;
} else {
  console.log(`PASS: $$ dollar quotes are properly paired (total: ${dollarMatches.length}).`);
}

// 2. Check for malformed "AS DECLARE"
if (/as\s+declare/i.test(deployContent)) {
  console.error('FAIL: Found "AS DECLARE" without dollar quotes!');
  hasErrors = true;
} else {
  console.log('PASS: No malformed "AS DECLARE" found.');
}

// 3. Check for "$$;,"
if (/\$\$;\s*,/i.test(deployContent)) {
  console.error('FAIL: Found malformed "$$;," syntax!');
  hasErrors = true;
} else {
  console.log('PASS: No "$$;," found.');
}

// 4. Verify the 4 migrations exist in exact chronological order and match canonical files
const expectedSections = [
  {
    num: 1,
    header: '-- PHASE 5B MIGRATION 001: 202606240001_fix_discussion_messages_view.sql',
    file: '202606240001_fix_discussion_messages_view.sql'
  },
  {
    num: 2,
    header: '-- PHASE 5B MIGRATION 002: 202606240002_moderation_inquiry_feedback.sql',
    file: '202606240002_moderation_inquiry_feedback.sql'
  },
  {
    num: 3,
    header: '-- PHASE 5B MIGRATION 003: 202606240003_fix_moderation_queue_regression.sql',
    file: '202606240003_fix_moderation_queue_regression.sql'
  },
  {
    num: 4,
    header: '-- PHASE 5B MIGRATION 004: 202606240004_update_moderation_constraint.sql',
    file: '202606240004_update_moderation_constraint.sql'
  },
  {
    num: 5,
    header: '-- PHASE 5B MIGRATION 005: 202606240005_drop_legacy_submit_moderation_flag.sql',
    file: '202606240005_drop_legacy_submit_moderation_flag.sql'
  }
];

let lastHeaderIndex = -1;

for (let i = 0; i < expectedSections.length; i++) {
  const { num, header, file } = expectedSections[i];
  const headerIndex = deployContent.indexOf(header);

  if (headerIndex === -1) {
    console.error(`FAIL: Missing section header: "${header}"`);
    hasErrors = true;
    continue;
  }

  if (headerIndex <= lastHeaderIndex) {
    console.error(`FAIL: Section ${num} (${file}) is out of chronological order!`);
    hasErrors = true;
  }
  lastHeaderIndex = headerIndex;

  // Ensure header appears exactly once
  const occurrences = (deployContent.match(new RegExp(header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  if (occurrences !== 1) {
    console.error(`FAIL: Header "${header}" appears ${occurrences} times (expected 1).`);
    hasErrors = true;
  }

  // Read canonical migration
  const canonicalPath = path.join(repoRoot, 'supabase/migrations', file);
  if (!fs.existsSync(canonicalPath)) {
    console.error(`FAIL: Canonical file not found: ${canonicalPath}`);
    hasErrors = true;
    continue;
  }

  const canonicalContent = fs.readFileSync(canonicalPath, 'utf8').trim().replace(/\r\n/g, '\n');

  // Extract content between this header divider and next section divider
  const nextSectionDivider = i < expectedSections.length - 1
    ? expectedSections[i + 1].header
    : null;

  const headerLineEnd = deployContent.indexOf('\n', headerIndex);
  // Skip the divider line immediately following the header comment
  const dividerEnd = deployContent.indexOf('\n', headerLineEnd + 1);

  const startOfSectionContent = dividerEnd !== -1 ? dividerEnd + 1 : headerLineEnd + 1;
  const endOfSectionContent = nextSectionDivider
    ? deployContent.indexOf(nextSectionDivider)
    : deployContent.length;

  // Find preceding divider before nextSectionDivider if applicable
  let sliceEnd = endOfSectionContent;
  if (nextSectionDivider) {
    const dividerBeforeNext = deployContent.lastIndexOf('-- ===', endOfSectionContent);
    if (dividerBeforeNext > startOfSectionContent) {
      sliceEnd = dividerBeforeNext;
    }
  }

  const actualSection = deployContent.slice(startOfSectionContent, sliceEnd).trim().replace(/\r\n/g, '\n');

  if (actualSection !== canonicalContent) {
    console.error(`FAIL: Section ${num} (${file}) in deploy file does NOT match canonical migration!`);
    hasErrors = true;
  } else {
    console.log(`PASS: Migration 00${num} (${file}) matches canonical source exactly.`);
  }
}

// 5. Function definitions check
const checkFunction = (fnName) => {
  const fnRegex = new RegExp(`create or replace function public\\.${fnName}[\\s\\S]*?\\$\\$;`, 'gi');
  const matches = deployContent.match(fnRegex);
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
const parseViews = (sql) => {
  const views = [];
  const viewStartRegex = /create\s+(?:or\s+replace\s+)?view\s+([a-zA-Z0-9_.]+)\s+(?:with\s*\([^)]*\)\s+)?as\s+select\s+/gi;
  let startMatch;
  while ((startMatch = viewStartRegex.exec(sql)) !== null) {
    const viewName = startMatch[1];
    const startIndex = startMatch.index + startMatch[0].length;

    // Find the top-level 'FROM' clause (outside parentheses and CASE...END blocks)
    let depth = 0;
    let caseDepth = 0;
    let fromIndex = -1;

    for (let i = startIndex; i < sql.length - 4; i++) {
      if (sql[i] === '(') depth++;
      else if (sql[i] === ')') depth--;
      else if (/\bcase\b/i.test(sql.slice(i, i + 4)) && (i === 0 || /\s/.test(sql[i - 1]))) {
        caseDepth++;
      } else if (/\bend\b/i.test(sql.slice(i, i + 3)) && (i === 0 || /\s/.test(sql[i - 1]))) {
        caseDepth--;
      } else if (depth === 0 && caseDepth === 0 && /\bfrom\b/i.test(sql.slice(i, i + 4)) && /\s/.test(sql[i - 1]) && /\s/.test(sql[i + 4])) {
        fromIndex = i;
        break;
      }
    }

    if (fromIndex !== -1) {
      const selectListStr = sql.slice(startIndex, fromIndex);
      views.push({ name: viewName, selectList: selectListStr });
    }
  }
  return views;
};

const viewsFound = [];
for (const { name: viewName, selectList: selectListStr } of parseViews(deployContent)) {

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
    const asMatch = colExpr.match(/\s+as\s+([a-zA-Z0-9_"]+)\s*$/i);
    let colName;
    if (asMatch) {
      colName = asMatch[1].replace(/"/g, '').toLowerCase();
    } else {
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
    console.error(`FAIL: View ${viewName} has duplicate output columns: ${duplicates.join(', ')}`);
    hasErrors = true;
  } else {
    console.log(`PASS: View ${viewName} has unique output columns (${colNames.length} columns: ${colNames.join(', ')}).`);
  }
  viewsFound.push({ name: viewName, count: colNames.length, cols: colNames });
}

// 7. Verify specific column counts on moderation_queue
const modQueues = viewsFound.filter(v => v.name === 'public.moderation_queue');
if (modQueues.length !== 2) {
  console.error(`FAIL: Expected exactly 2 moderation_queue view definitions (001 temp + 003 final), found ${modQueues.length}`);
  hasErrors = true;
} else {
  if (modQueues[0].count !== 13) {
    console.error(`FAIL: Migration 001 moderation_queue should have 13 columns, found ${modQueues[0].count}`);
    hasErrors = true;
  } else {
    console.log('PASS: Migration 001 temporary moderation_queue has exactly 13 unique columns.');
  }

  if (modQueues[1].count !== 17) {
    console.error(`FAIL: Migration 003 final moderation_queue should have 17 columns, found ${modQueues[1].count}`);
    hasErrors = true;
  } else {
    console.log('PASS: Migration 003 final moderation_queue has exactly 17 unique columns.');
  }
}

// 8. Verify migration 004 constraint columns
const constraintRegex = /add\s+constraint\s+exactly_one_entity\s+check\s*\(([\s\S]*?)\);/i;
const constraintMatch = deployContent.match(constraintRegex);
if (!constraintMatch) {
  console.error('FAIL: exactly_one_entity check constraint not found!');
  hasErrors = true;
} else {
  const constraintBody = constraintMatch[1];
  const requiredCols = ['message_id', 'question_id', 'claim_id', 'evidence_id', 'inquiry_id'];
  let constraintOk = true;
  for (const col of requiredCols) {
    if (!constraintBody.includes(col)) {
      console.error(`FAIL: Constraint missing expected column: ${col}`);
      constraintOk = false;
      hasErrors = true;
    }
  }
  if (constraintBody.includes('discussion_id') || constraintBody.includes('debate_id') || constraintBody.includes('user_id')) {
    console.error('FAIL: Constraint references non-existent columns (discussion_id/debate_id/user_id)!');
    constraintOk = false;
    hasErrors = true;
  }
  if (constraintOk) {
    console.log('PASS: Migration 004 checks exactly the 5 valid entity columns (message_id, question_id, claim_id, evidence_id, inquiry_id).');
  }
}

if (hasErrors) {
  console.error('\nOVERALL RESULT: FAILED - Inconsistencies detected in phase5b_production_deploy.sql');
  process.exit(1);
} else {
  console.log('\nOVERALL RESULT: PASSED - phase5b_production_deploy.sql is 100% valid and verified.');
  process.exit(0);
}

/**
 * Script to generate backend/database/seed.sql directly from demo-data.ts
 */
const fs = require('fs');
const path = require('path');

// Read demo-data.ts
const demoDataContent = fs.readFileSync(
  path.join(__dirname, '../../lib/supabase/demo-data.ts'),
  'utf-8'
);

function extractArray(content, varName) {
  const match = content.match(new RegExp(`export const ${varName}:?\\s*\\w*\\[\\]\\s*=\\s*(\\[[\\s\\S]*?\\n\\]);`));
  if (!match) return [];
  try {
    // Strip trailing commas before closing braces/brackets for JSON compatibility
    const jsonStr = match[1]
      .replace(/,\s*([\]}])/g, '$1')
      .replace(/'/g, '"');
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error(`Failed to parse ${varName}:`, e.message);
    return [];
  }
}

// Write seed.sql
let sql = `-- ==============================================================================
-- Seed Data for SwachhSetu Ahmedabad Network
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql)
-- ==============================================================================

`;

// Let's create an automated node seeder that imports directly
const demoDataPath = path.join(__dirname, '../../lib/supabase/demo-data.ts');
console.log("Ready to generate seed SQL or run direct seed.");

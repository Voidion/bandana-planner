/* Rebuilds src/engine/engine.js from the prototype, so the app and prototype always plan cuts identically.
   Usage: npm run engine -- path/to/bandana-planner.html     (then run npm test to check parity) */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

const here = path.dirname(fileURLToPath(import.meta.url));
const proto = process.argv[2];
if (!proto) { console.error('Pass the path to bandana-planner.html'); process.exit(1); }
const CUT = ['cutPlan', 'grainOf', 'strapOf', 'sizeYd', 'sizeFab', 'planNeeds', 'isLow', 'ventMat', 'VENTURE_MATS', 'pieceShapes', 'exportSvg'];
/* Runs and production: time, money and template maths, exactly as the prototype does it */
const RUNS = ['pieces', 'doneN', 'runMins', 'leftMins', 'atList', 'mats', 'rate', 'runProfit', 'avgEach', 'effRate', 'unitMins', 'unitMat', 'unitCost', 'pcsEq', 'tplMins', 'stepsFor', 'runSteps', 'tplOf', 'defTpl', 'tplTotal', 'paceStats', 'fabCostOf', 'overheadEach', 'feeEach', 'laborF', 'priceFor', 'marginOf', 'IT', 'tEl', 'isStale', 'isSewStep'];
/* Selling: sale money, fees, quote totals, owed */
const SELL = ['feeFor', 'matFor', 'eTotal', 'eOwed', 'eNet', 'eProfit', 'eUnits', 'sums', 'perList', 'profitEach', 'qtotals', 'monthlyBills', 'unitCost'];
/* Planning and numbers */
const PLAN = ['scheduleWork', 'lateRuns', 'freeMins', 'monthIncome', 'repAgg', 'perMonths'];
const ROOTS = [...CUT, ...RUNS, ...SELL, ...PLAN];
const EXTERNAL = new Set(['S', 'uid', 'render', 'toast', 'log', 'PHOTOS', 'freshState', 'scrClass', 'W', 'stackOf', 'RC', 'sampleLedger', 'sampleEquip', 'sampleCustomers', 'seedSessions', 'seedUsage', 'newPlan', 'run', 'fab', 'uid', 'TODAY', 'dateOf', 'bench', 'LED', 'esc']);

const html = fs.readFileSync(proto, 'utf8');
const m = html.match(/<script>\n\(function\(\)\{\n'use strict';([\s\S]*)\}\)\(\);\s*<\/script>/);
if (!m) { console.error('Could not find the app script in', proto); process.exit(1); }
const src = m[1];
const ast = acorn.parse(src, { ecmaVersion: 'latest' });
const decls = ast.body.map(st => {
  const names = st.type === 'FunctionDeclaration' ? [st.id.name]
    : st.type === 'VariableDeclaration' ? st.declarations.flatMap(d => (d.id.type === 'Identifier' ? [d.id.name] : [])) : [];
  const refs = new Set();
  walk.full(st, n => { if (n.type === 'Identifier') refs.add(n.name); });
  return { names, refs, code: src.slice(st.start, st.end) };
});
const byName = {};
decls.forEach((d, i) => d.names.forEach(n => (byName[n] = i)));
const need = new Set(), q = ROOTS.map(r => byName[r]);
while (q.length) {
  const i = q.pop();
  if (i == null || need.has(i)) continue;
  if (decls[i].names.some(n => EXTERNAL.has(n))) continue;
  need.add(i);
  for (const r of decls[i].refs) if (byName[r] != null && !need.has(byName[r])) q.push(byName[r]);
}
const known = new Set([...need].flatMap(i => decls[i].names));
const free = new Set();
for (const i of need) for (const r of decls[i].refs) if (byName[r] != null && !known.has(r)) free.add(r);
if (free.size) console.log('Left to the app (externals referenced):', [...free].join(', '));
/* Adding 24h to midnight lands on the wrong day when clocks change (DST); count calendar days instead. */
const body = [...need].sort((a, b) => a - b).map(i => decls[i].code).join('\n').replace(/new Date\(TODAY\.getTime\(\)\+([\w.]+)\*DAY\)/g, 'dateOf($1)');
const out = `/* eslint-disable */
// @ts-nocheck
/* Cut-plan engine, extracted unchanged from the Bandana Planner prototype (bandana-planner.html).
   Regenerate with \`npm run engine -- <path to bandana-planner.html>\` rather than editing by hand.
   The engine reads the shop from S, set with setEngineState() before planning. */
let S=null,RC={},uid=1;\nexport function setUid(n){uid=n}
export function setEngineState(state){if(state!==S){S=state;RC={};if(typeof NEST_CACHE!=='undefined')NEST_CACHE.clear()}}
const fab=id=>(S&&S.fabrics||[]).find(f=>f.id===id)||null;
const run=id=>(S&&S.runs||[]).find(r=>r.id===id)||null;
/* The prototype counts days relative to today (0 = today, -2 = two days ago); the app passes real dates in that form. */
let TODAY=(()=>{const n=new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate())})();
export function setToday(d){TODAY=new Date(d.getFullYear(),d.getMonth(),d.getDate())}
const dateOf=d=>new Date(TODAY.getFullYear(),TODAY.getMonth(),TODAY.getDate()+(+d||0));
const LED=()=>(S&&S.ledger)||[];
const bench=()=>((S&&S.runs)||[]).filter(r=>r.status!=='done');
${body}
export {pieceShapes,exportSvg,cutPlan,cutPlan0,planNeeds,grainOf,topOf,strapOf,sizeYd,sizeFab,isLow,ventMat,VENTURE_MATS,TOPS,fabFactor,${[...new Set([...RUNS, ...SELL, ...PLAN])].join(',')}};
`;
fs.writeFileSync(path.join(here, '../src/engine/engine.js'), out);
console.log(`engine.js: ${need.size} pieces from the prototype`);

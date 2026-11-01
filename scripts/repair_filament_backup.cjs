// Usage: node scripts/repair_filament_backup.cjs input.zip output.zip
// Creates a separate backup; preserves all original records and media.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const JSZip = require('../lib/jszip.min.js');
const initSQL = require('../lib/sql-wasm.js');
const ctx = vm.createContext({Date});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/utils.js'), 'utf8').replace(/export /g, ''), ctx);
(async () => {
 const [input, output] = process.argv.slice(2);
 if (!input || !output || path.resolve(input) === path.resolve(output) || fs.existsSync(output)) throw Error('Provide input and a new, distinct output path.');
 const zip = await JSZip.loadAsync(fs.readFileSync(input));
 const SQL = await initSQL({locateFile: file => path.join(__dirname, '../lib', file)});
 const db = new SQL.Database(await zip.file('print_manager_v2.db').async('uint8array'));
 const result = db.exec('SELECT * FROM filamentos')[0];
 const original = result.values.map(values => Object.fromEntries(result.columns.map((key, i) => [key, values[i]])));
 const repaired = original.map(ctx.migrateFilamentPurchase);
 db.run('BEGIN');
 for (const column of ['quantidade_comprada', 'data_compra', 'compra_versao']) {
  if (!result.columns.includes(column)) db.run(`ALTER TABLE filamentos ADD COLUMN "${column}" TEXT`);
 }
 for (const row of repaired) db.run('UPDATE filamentos SET quantidade_comprada=?, data_compra=?, compra_versao=? WHERE id=?', [row.quantidade_comprada, row.data_compra, row.compra_versao, row.id]);
 db.run('COMMIT');
 assert.equal(db.exec('PRAGMA integrity_check')[0].values[0][0], 'ok');
 const after = db.exec(`SELECT ${result.columns.map(c => '"'+c+'"').join(',')} FROM filamentos`)[0];
 // Only the new purchase fields may change. Every original legacy field stays intact.
 const unchanged = result.columns.filter(c => !['quantidade_comprada','data_compra','compra_versao'].includes(c));
 for (let i=0; i<original.length; i++) for (const col of unchanged) assert.equal(after.values[i][result.columns.indexOf(col)], original[i][col]);
 zip.file('print_manager_v2.db', db.export());
 fs.writeFileSync(output, await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}), {flag:'wx'});
 const unknown = repaired.filter(r => !r.data_compra);
 const total = repaired.reduce((s,r) => s + Number(r.preco_rolo)*r.quantidade_comprada,0);
 console.log(JSON.stringify({records:repaired.length, unknownDates:unknown.map(r=>r.id), historicalTotal:total, unknownDatesTotal:unknown.reduce((s,r)=>s+Number(r.preco_rolo)*r.quantidade_comprada,0), output},null,2));
 db.close();
})().catch(e => {console.error(e);process.exitCode=1;});

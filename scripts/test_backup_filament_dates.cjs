// Integration regression against the supplied ZIP, without touching live data.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const JSZip = require('../lib/jszip.min.js');
const initSQL = require('../lib/sql-wasm.js');
(async()=>{
 const zip = await JSZip.loadAsync(fs.readFileSync(process.argv[2]));
 const SQL = await initSQL({locateFile:f=>path.join(__dirname,'../lib',f)});
 const db = new SQL.Database(await zip.file('print_manager_v2.db').async('uint8array'));
 const data = db.exec('SELECT * FROM filamentos')[0];
 let filaments = data.values.map(row=>Object.fromEntries(data.columns.map((c,i)=>[c,row[i]])));
 const elements = new Map();
 function el(s){
  if(!elements.has(s)) elements.set(s,{value:s==='#dre-filter'?'filamentos':'',style:{},events:{},innerHTML:'',addEventListener(t,f){this.events[t]=f;}});
  return elements.get(s);
 }
 const ctx = vm.createContext({console,Date,idb:{getAll:async name=>name==='filamentos'?filaments:[],putAll:async(name,rows)=>{assert.equal(name,'filamentos');filaments=rows;}}});
 for(const file of ['js/utils.js','js/tabs/sumario.js']) vm.runInContext(fs.readFileSync(file,'utf8').replace(/^import .*;$/gm,'').replace(/export /g,''),ctx);
 await ctx.render({innerHTML:'',querySelector:el});
 for(const id of ['19','20']) {
  const f=filaments.find(f=>String(f.id)===id);
  assert.equal(f.data_compra,'');
  assert.equal(Number(f.quantidade_comprada),1);
 }
 const history=el('#dre-tbody').innerHTML;
 assert.match(history, /Data desconhecida<\/td><td[^>]*>Filamento: 3DVOOLT PLA \(CINZA\/GRAFITE\)/);
 assert.match(history, /Data desconhecida<\/td><td[^>]*>Filamento: CREALITY PLA \(PRETO\)/);
 el('#dre-start').value='2026-10-31';el('#dre-end').value='2026-10-31';el('#dre-start').events.change();
 const day=el('#dre-tbody').innerHTML;
 assert.doesNotMatch(day,/CINZA\/GRAFITE|CREALITY PLA \(PRETO\)/);
 assert.match(day,/PRETO 1/); // Genuine new purchase on that day stays present.
 assert.match(el('#dre-totals-container').innerHTML,/108,06/);
 db.close();
 console.log('PASS: actual backup IDs 19/20 excluded from Oct 31; genuine purchase R$108.06 retained; exhausted purchases retained once in full history.');
})().catch(e=>{console.error(e);process.exitCode=1;});

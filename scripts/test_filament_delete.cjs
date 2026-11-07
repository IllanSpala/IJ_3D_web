// Isolated regression: real browser deletion helper + summary rendering, no user data.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const stores = {
 filamentos: [
  {id:1,marca:'Excluir',preco_rolo:80,quantidade_comprada:2,quantidade_rolos:0,compra_versao:1,data_compra:'2026-01-10'},
  {id:2,marca:'Manter',preco_rolo:30,quantidade_comprada:1,compra_versao:1,data_compra:'2026-01-10'}],
 hist_filamentos:[{id:10,filamento_id:'1',hist_id:5},{id:11,filamento_id:2,hist_id:5}],
 pedidos_v2:[], ferramentas_insumos:[], vendas_manuais:[]
};
let fail = false;
const db = {transaction(names, mode) {
 assert.deepEqual(Array.from(names), ['filamentos','hist_filamentos']);
 assert.equal(mode,'readwrite');
 const pending = [];
 const tx = {objectStore(name) {return {openCursor() {
  const req = {}; let index=0;
  const next=()=>queueMicrotask(()=>{
   const value=stores[name][index++];
   req.result=value ? {value,delete(){pending.push(()=>stores[name]=stores[name].filter(r=>r!==value));},continue:next}:null;
   req.onsuccess();
  });
  next(); return req;
 }}}};
 setImmediate(()=>{if(fail){tx.error=Error('aborted');tx.onabort();}else{pending.forEach(fn=>fn());tx.oncomplete();}});
 return tx;
}};
const ctx = vm.createContext({console,window:{},Error,String});
vm.runInContext(fs.readFileSync('js/db.js','utf8').replace(/export \{ TABLE_STORES \};/,'').replace(/export /g,''),ctx);
ctx.testDB=db;
vm.runInContext('_db = testDB',ctx);
const elements=new Map();
function el(s){if(!elements.has(s)) elements.set(s,{value:s==='#dre-filter'?'all':'',innerHTML:'',style:{},addEventListener(){},querySelector:el});return elements.get(s);}
const summary=vm.createContext({console,Date,idb:{getAll:async n=>structuredClone(stores[n]),putAll:async(n,r)=>stores[n]=r}});
vm.runInContext(fs.readFileSync('js/utils.js','utf8').replace(/export /g,''),summary);
vm.runInContext(fs.readFileSync('js/tabs/sumario.js','utf8').replace(/^import .*;$/gm,'').replace(/export /g,''),summary);
(async()=>{
 const render=()=>summary.render({innerHTML:'',querySelector:el});
 await render(); assert.match(el('#dre-totals-container').innerHTML,/190,00/);
 fail=true; await assert.rejects(ctx.deleteFilament('1'),/aborted/);
 assert.equal(stores.filamentos.length,2); assert.equal(stores.hist_filamentos.length,2);
 fail=false; await ctx.deleteFilament('1');
 assert.deepEqual(stores.filamentos.map(f=>f.id),[2]);
 assert.deepEqual(stores.hist_filamentos.map(f=>f.id),[11]);
 await render(); assert.match(el('#dre-totals-container').innerHTML,/30,00/);
 assert.doesNotMatch(el('#dre-tbody').innerHTML,/Excluir/);
 await ctx.deleteFilament(2); await render();
 assert.equal(stores.filamentos.length,0); assert.equal(stores.hist_filamentos.length,0);
 assert.match(el('#dre-totals-container').innerHTML,/0,00/);
 let request; ctx.window.electron={writeDB:async r=>request=r};
 await ctx.deleteFilament('7'); assert.equal(request.action,'deleteFilament'); assert.equal(request.id,'7');
 console.log('PASS: deletion, mixed IDs, related history, failure rollback, DRE 190→30→0, last filament and desktop dispatch');
})().catch(e=>{console.error(e);process.exitCode=1;});

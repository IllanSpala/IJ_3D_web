const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const elements = new Map();
function el(key) {
 if (!elements.has(key)) elements.set(key, {value:'', innerHTML:'',style:{},dataset:{},files:[],events:{},
 addEventListener(type, fn){this.events[type]=fn;},appendChild(){},querySelector:el});
 return elements.get(key);
}
const original = {id:19, marca:'Marca', material:'PLA', cor:'Cinza', preco_rolo:94.9, quantidade_rolos:1,
 status:'Ativo', criado_em:'2026-10-31T16:38:57.849Z', peso_inicial:1, data_registro:'2026-04-30',
 caminho_nota_fiscal:'nota.jpeg', rolos_reserva:0, descricao:'Preservar'};
let records = [structuredClone(original)];
const buttons = {
 '.fil-btn-plus-ativo, .fil-btn-min-ativo': [{dataset:{id:'19'},events:{},classList:{contains:c=>c==='fil-btn-min-ativo'},addEventListener(t,f){this.events[t]=f;}}],
 '.fil-edit-btn': [{dataset:{id:'19'},events:{},addEventListener(t,f){this.events[t]=f;}}]
};
const container = {innerHTML:'',querySelector:el,querySelectorAll:s=>buttons[s] || []};
const ctx = vm.createContext({console,Date,document:{createElement:()=>el('card')},alert:m=>{throw Error(m)},
 idb:{getAll:async()=>structuredClone(records),putAll:async(_,rows)=>{records=structuredClone(rows)},resolveMediaUrl:async()=>null}});
vm.runInContext(fs.readFileSync('js/utils.js','utf8').replace(/export /g,''),ctx);
vm.runInContext(fs.readFileSync('js/tabs/filamentos.js','utf8').replace(/^import .*;$/gm,'').replace(/export /g,''),ctx);
const settle = ()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 await ctx.render(container); await settle();
 assert.equal(records[0].quantidade_comprada,1);
 const minus=buttons['.fil-btn-plus-ativo, .fil-btn-min-ativo'][0];
 await minus.events.click({target:{closest:()=>minus}}); await settle();
 assert.equal(records[0].quantidade_rolos,0);
 assert.equal(records[0].quantidade_comprada,1);
 await ctx.render(container); await settle();
 assert.equal(records[0].quantidade_rolos,0,'reopening must not resurrect stock');
 const edit=buttons['.fil-edit-btn'][0]; edit.events.click({target:{closest:()=>edit}});
 el('#fil-status').value='Esgotado';
 await el('#fil-save-btn').events.click(); await settle();
 for(const field of ['criado_em','peso_inicial','data_registro','caminho_nota_fiscal','descricao','rolos_reserva']) assert.equal(records[0][field],original[field]);
 assert.equal(records[0].quantidade_rolos,0);
 assert.equal(records[0].data_compra,'2026-04-30');
 assert.equal(records[0].quantidade_comprada,1);
 for(const qty of [0,'0',null,undefined,1,'1',2,'2']) {
  const migrated=ctx.migrateFilamentPurchase({...original,quantidade_rolos:qty,data_registro:null});
  assert.equal(migrated.data_compra,'');
  assert.equal(migrated.quantidade_comprada,Number(qty)>1?2:1);
  assert.strictEqual(ctx.migrateFilamentPurchase(migrated),migrated);
 }
 const stamp=1791509288674;
 assert.equal(ctx.migrateFilamentPurchase({...original,id:stamp,data_registro:null}).data_compra,new Date(stamp).toISOString());
 // A new purchase starts with one available spool, and its own purchase facts.
 el('#fil-add-btn').events.click();
 el('#fil-preco').value='80';
 await el('#fil-save-btn').events.click(); await settle();
 assert.equal(records[1].quantidade_rolos,1);
 assert.equal(records[1].quantidade_comprada,1);
 assert.equal(records[1].data_compra,ctx.cashDate());
 console.log('PASS: stock 1→0, reopen, exhausted edit, metadata preservation, legacy migration, idempotency and new purchase');
})().catch(e=>{console.error(e);process.exitCode=1});

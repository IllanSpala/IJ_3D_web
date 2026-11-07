const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
let records = [
 {id:1,nome:'ENERGIA SETEMBRO',categoria:'CONTAS',ultimo_valor:150,status:'Ativo',data_compra:'2026-09-01'},
 {id:2,nome:'ENERGIA OUTUBRO',categoria:'CONTAS',ultimo_valor:313.93,status:'Ativo'},
 {id:3,nome:'Fiação completa QUARTO',categoria:'Ferramenta',ultimo_valor:103,status:'Ativo'}
];
const elements = new Map();
function el(key) {
 if(!elements.has(key)) elements.set(key,{value:'',checked:false,innerHTML:'',textContent:'',style:{},dataset:{},files:[],events:{},open:false,
 addEventListener(t,f){this.events[t]=f;},appendChild(){},querySelector:el,querySelectorAll:()=>[],click(){return this.events.click();},showModal(){this.open=true;},close(){this.open=false;}});
 return elements.get(key);
}
const container={innerHTML:'',querySelector:el,querySelectorAll:()=>[]};
const ctx=vm.createContext({console,Date,document:{createElement:()=>el('card')},alert:m=>{throw Error(m);},idb:{getAll:async()=>structuredClone(records),putAll:async(_,r)=>records=structuredClone(r),resolveMediaUrl:async()=>null}});
vm.runInContext(fs.readFileSync('js/utils.js','utf8').replace(/export /g,''),ctx);
vm.runInContext(fs.readFileSync('js/tabs/almoxarifado.js','utf8').replace(/^import .*;$/gm,'').replace(/export /g,''),ctx);
(async()=>{
 await ctx.render(container);
 assert.deepEqual(records.map(r=>r.e_conta),[true,true,false]);
 assert.equal(records[0].data_compra,'2026-09-01');
 assert.equal(vm.runInContext('_getFiltered().length',ctx),1);
 el('#almox-costs-btn').click();
 assert.equal(el('#almox-costs-dialog').open,true);
 assert.match(el('#almox-costs-total').textContent,/463,93/);
 assert.match(el('#almox-costs-list').innerHTML,/ENERGIA SETEMBRO/);
 assert.match(el('#almox-costs-list').innerHTML,/item-card-img almox-card-img/);
 assert.match(el('#almox-costs-list').innerHTML,/almox-card-details/);
 assert.match(el('#almox-costs-list').innerHTML,/almox-status-badge/);
 assert.doesNotMatch(el('#almox-costs-list').innerHTML,/Fiação/);
 el('#almox-costs-add').click();
 assert.equal(el('#almox-conta').checked,true);
 el('#almox-nome').value='Internet';el('#almox-preco').value='100';
 await el('#almox-save-btn').click();
 assert.equal(records[3].e_conta,true);
 await ctx.render(container);
 el('#almox-costs-btn').click();assert.match(el('#almox-costs-total').textContent,/563,93/);
 // Explicit false must override the legacy category, also after SQLite string conversion.
 for(const value of [false,0,'0','false']) assert.equal(ctx.isAccount({e_conta:value,categoria:'CONTAS'}),false);
 for(const value of [true,1,'1','true']) assert.equal(ctx.isAccount({e_conta:value}),true);
 el('#almox-add-btn').click();assert.equal(el('#almox-conta').checked,false);
 console.log('PASS: account migration, preserved metadata, separate inventory, modal totals, new account, reload and boolean compatibility');
})().catch(e=>{console.error(e);process.exitCode=1;});

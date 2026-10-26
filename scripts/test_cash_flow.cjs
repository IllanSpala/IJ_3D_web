// Run with node scripts/test_cash_flow.cjs; no production database is accessed.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const stores = {
 pedidos_v2: [
  {id:1,status:'FINALIZADO',nome_cliente:'Recebido',valor_cobrado:100,criado_em:'2025-01-01',data_entrega:'2025-02-01',data_recebimento:'2026-01-15'},
  {id:2,status:'FINALIZADO',nome_cliente:'Antigo',valor_cobrado:50,criado_em:'2025-01-01'},
  {id:3,status:'CONCLUIDO',valor_cobrado:200},
  {id:4,status:'FINALIZADO',nome_cliente:'Zélia',valor_cobrado:30},
  {id:5,status:'FINALIZADO',nome_cliente:'Ana',valor_cobrado:20}],
 filamentos:[{id:1,preco_rolo:20,quantidade_rolos:2,data_compra:'2026-01-10'}],
 ferramentas_insumos:[], vendas_manuais:[]
};
const elements = new Map();
function element(selector) {
 if (!elements.has(selector)) elements.set(selector,{value:selector==='#dre-filter'?'all':'',innerHTML:'',textContent:'',style:{},events:{},addEventListener(type,fn){this.events[type]=fn;},querySelector:element});
 return elements.get(selector);
}
const context = vm.createContext({console,Date,alert(message){throw new Error(message);},idb:{async getAll(name){return structuredClone(stores[name]);},async putAll(name,rows){stores[name]=structuredClone(rows);}}});
vm.runInContext(fs.readFileSync('js/utils.js','utf8').replace(/export /g,''),context);
vm.runInContext(fs.readFileSync('js/tabs/sumario.js','utf8').replace(/^import .*;$/gm,'').replace(/export /g,''),context);
(async()=>{
 await context.render({set innerHTML(value){},querySelector:element});
 const totals=()=>element('#dre-totals-container').innerHTML;
 assert.match(totals(),/100,00/); assert.match(totals(),/40,00/); assert.match(totals(),/60,00/);
 assert.doesNotMatch(element('#dre-tbody').innerHTML, /<input|data-save|conferir/);
 assert.doesNotMatch(element('#dre-tbody').innerHTML,/01\/01\/2025/);
 element('#dre-start').value='2026-01-14'; element('#dre-start').events.change();
 assert.match(totals(),/100,00/); assert.doesNotMatch(totals(),/40,00/);
 const rows=element('#dre-tbody').innerHTML;
 assert.ok(rows.indexOf('15/01/2026') < rows.indexOf('Pedido Kanban: Ana'));
 assert.ok(rows.indexOf('Pedido Kanban: Ana') < rows.indexOf('Pedido Kanban: Antigo'));
 assert.ok(rows.indexOf('Pedido Kanban: Antigo') < rows.indexOf('Pedido Kanban: Zélia'));
 element('#dre-all').events.click();
 element('#dre-date-order').value='asc'; element('#dre-date-order').events.change();
 const ascending=element('#dre-tbody').innerHTML;
 assert.ok(ascending.indexOf('10/01/2026') < ascending.indexOf('15/01/2026'));
 assert.ok(ascending.indexOf('Pedido Kanban: Ana') < ascending.indexOf('Pedido Kanban: Zélia'));
 assert.equal(context.validCashDate('2026-02-30'),false);
 assert.equal(context.cashDate('15/01/2026'),'2026-01-15');
 console.log('PASS: cash dates, legacy pending records, filters, totals, alphabetical legacy ordering and date validation');
})().catch(error=>{console.error(error);process.exitCode=1;});

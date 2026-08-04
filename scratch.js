const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../IJ_3D_MANAGER/database/print_manager_v2.db', (err) => {
  if (err) console.error(err.message);
});

db.all("SELECT status FROM pedidos_v2", [], (err, rows) => {
  if (err) return console.log(err);
  console.log("PEDIDOS V2 STATUSES:");
  let counts = {};
  if (rows) rows.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
  console.log(counts);
});

db.all("SELECT status FROM pedidos", [], (err, rows) => {
  if (err) return console.log(err);
  console.log("PEDIDOS LEGACY STATUSES:");
  let counts = {};
  if (rows) rows.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
  console.log(counts);
});

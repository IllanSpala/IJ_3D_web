const fs = require('fs');
const files = [
  'js/tabs/almoxarifado.js',
  'js/tabs/filamentos.js',
  'js/tabs/historico.js',
  'js/tabs/sumario.js'
];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  // replace literal \${ with ${
  content = content.replace(/\\\$\\\{/g, '${');
  content = content.replace(/\\\$/g, '$');
  // replace literal \` with `
  content = content.replace(/\\\\`/g, '`');
  content = content.replace(/\\`/g, '`');
  fs.writeFileSync(f, content);
});
console.log('Fixed files');

const fs = require('fs');
let code = fs.readFileSync('src/solver.ts', 'utf8');
code = code.replace(
  'Mcap = Muz * (Puz - Pu_comp) / (Puz - Pb);',
  'Mcap = Muz * (Puz - Pu_comp) / Math.max(1, Puz - Pb);'
);
fs.writeFileSync('src/solver.ts', code);

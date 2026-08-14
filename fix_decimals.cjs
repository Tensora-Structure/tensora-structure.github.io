const fs = require('fs');
let code = fs.readFileSync('src/components/StructuralDetailing.tsx', 'utf8');

code = code.replace(/L: getLength\(col\) \* 1000,/g, 'L: parseFloat((getLength(col) * 1000).toFixed(2)),');
code = code.replace(/L: getLength\(beam\) \* 1000,/g, 'L: parseFloat((getLength(beam) * 1000).toFixed(2)),');

fs.writeFileSync('src/components/StructuralDetailing.tsx', code);

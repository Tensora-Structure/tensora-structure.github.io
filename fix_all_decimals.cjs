const fs = require('fs');
let code = fs.readFileSync('src/components/StructuralDetailing.tsx', 'utf8');

code = code.replace(/B: sec.width \* 1000,/g, 'B: parseFloat((sec.width * 1000).toFixed(2)),');
code = code.replace(/D: sec.depth \* 1000,/g, 'D: parseFloat((sec.depth * 1000).toFixed(2)),');

// check for drawDim instances
// e.g. drawDim(..., `L = ${data.L} mm`) -> should be fine since data.L is now fixed.

fs.writeFileSync('src/components/StructuralDetailing.tsx', code);

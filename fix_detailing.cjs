const fs = require('fs');
let code = fs.readFileSync('src/components/StructuralDetailing.tsx', 'utf8');

// Remove addStyle
code = code.replace(/dxf\.addStyle\([^)]+\);/g, '');

// Fix drawText
code = code.replace(/dxf\.drawText\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g, 'dxf.drawText($1, $2, $3, 0, $4)');

fs.writeFileSync('src/components/StructuralDetailing.tsx', code);

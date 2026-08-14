const fs = require('fs');
let code = fs.readFileSync('src/components/StructuralDetailing.tsx', 'utf8');

const oldCol = `      // L-Section
      dxf.drawRect(0, yOffset - H, D, yOffset);
      dxf.drawLine(cov, yOffset - H, cov, yOffset);
      dxf.drawLine(D - cov, yOffset - H, D - cov, yOffset);`;

const newCol = `      // L-Section
      dxf.drawRect(0, yOffset - H, D, yOffset);
      // Main bars with L-bends at the bottom (footing starter lap)
      dxf.drawLine(cov, yOffset - H, cov, yOffset);
      dxf.drawLine(cov, yOffset - H, cov - 0.15, yOffset - H); // bend
      dxf.drawLine(D - cov, yOffset - H, D - cov, yOffset);
      dxf.drawLine(D - cov, yOffset - H, D - cov + 0.15, yOffset - H); // bend`;

code = code.replace(oldCol, newCol);
fs.writeFileSync('src/components/StructuralDetailing.tsx', code);

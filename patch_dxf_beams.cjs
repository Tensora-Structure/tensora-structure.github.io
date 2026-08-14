const fs = require('fs');
let code = fs.readFileSync('src/components/StructuralDetailing.tsx', 'utf8');

const oldBeam = `      // L-Section
      dxf.drawRect(0, yOffset - D, L, yOffset);
      dxf.drawLine(cov, yOffset - cov, L - cov, yOffset - cov); // Top
      dxf.drawLine(cov, yOffset - D + cov, L - cov, yOffset - D + cov); // Bottom`;

const newBeam = `      // L-Section
      dxf.drawRect(0, yOffset - D, L, yOffset);
      // Top continuous
      dxf.drawLine(cov, yOffset - cov, L - cov, yOffset - cov);
      // Top Extra Support (Curtailment at 0.3L)
      dxf.drawLine(cov, yOffset - cov - 0.02, 0.3 * L, yOffset - cov - 0.02);
      dxf.drawLine(L - 0.3 * L, yOffset - cov - 0.02, L - cov, yOffset - cov - 0.02);
      // Top L-bends (development length approx)
      dxf.drawLine(cov, yOffset - cov, cov, yOffset - D/2);
      dxf.drawLine(L - cov, yOffset - cov, L - cov, yOffset - D/2);
      
      // Bottom continuous
      dxf.drawLine(cov, yOffset - D + cov, L - cov, yOffset - D + cov);
      // Bottom L-bends
      dxf.drawLine(cov, yOffset - D + cov, cov, yOffset - D/2);
      dxf.drawLine(L - cov, yOffset - D + cov, L - cov, yOffset - D/2);`;

code = code.replace(oldBeam, newBeam);
fs.writeFileSync('src/components/StructuralDetailing.tsx', code);

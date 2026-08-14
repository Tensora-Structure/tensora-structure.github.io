const fs = require('fs');
let code = fs.readFileSync('src/components/StructuralDetailing.tsx', 'utf8');

const badColBars = `      // Main bars with L-bends at the bottom (footing/floor starter lap)
      dxf.drawLine(mainOff, yOffset - H + mainOff, mainOff, yOffset + 0.6); // extending 600mm for lap
      dxf.drawLine(mainOff, yOffset - H + mainOff, mainOff + ld, yOffset - H + mainOff); // L bend
      dxf.drawLine(D - mainOff, yOffset - H + mainOff, D - mainOff, yOffset + 0.6);
      dxf.drawLine(D - mainOff, yOffset - H + mainOff, D - mainOff - ld, yOffset - H + mainOff); // L bend
      
      // Upper lap slice indicator
      dxf.drawLine(mainOff + 0.02, yOffset, mainOff + 0.02, yOffset + 0.6);
      dxf.drawLine(D - mainOff - 0.02, yOffset, D - mainOff - 0.02, yOffset + 0.6);`;
      
const goodColBars = `      // Main bars with L-bends at the bottom (footing/floor starter lap)
      dxf.drawLine(cov, yOffset - H + cov, cov, yOffset + 0.6); // extending 600mm for lap
      dxf.drawLine(cov, yOffset - H + cov, cov + 0.2, yOffset - H + cov); // L bend
      dxf.drawLine(D - cov, yOffset - H + cov, D - cov, yOffset + 0.6);
      dxf.drawLine(D - cov, yOffset - H + cov, D - cov - 0.2, yOffset - H + cov); // L bend
      
      // Upper lap slice indicator
      dxf.drawLine(cov + 0.02, yOffset, cov + 0.02, yOffset + 0.6);
      dxf.drawLine(D - cov - 0.02, yOffset, D - cov - 0.02, yOffset + 0.6);`;

code = code.replace(badColBars, goodColBars);
fs.writeFileSync('src/components/StructuralDetailing.tsx', code);

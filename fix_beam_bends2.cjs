const fs = require('fs');
let code = fs.readFileSync('src/components/StructuralDetailing.tsx', 'utf8');

const oldBeam = `      // Top continuous (Anchor)
      dxf.drawLine(topOff, yOffset - topOff, L - topOff, yOffset - topOff);
      // Top L-bends
      dxf.drawLine(topOff, yOffset - topOff, topOff, yOffset - topOff - ldTop);
      dxf.drawLine(L - topOff, yOffset - topOff, L - topOff, yOffset - topOff - ldTop);
      
      // Top Extra Support (Curtailment at 0.3L)
      dxf.drawLine(topOff, yOffset - topOff - 0.03, 0.3 * L, yOffset - topOff - 0.03);
      dxf.drawLine(L - 0.3 * L, yOffset - topOff - 0.03, L - topOff, yOffset - topOff - 0.03);
      // Drop line for curtailment indicator
      dxf.drawLine(0.3 * L, yOffset - topOff - 0.03, 0.3 * L, yOffset - topOff + 0.05);
      dxf.drawLine(L - 0.3 * L, yOffset - topOff - 0.03, L - 0.3 * L, yOffset - topOff + 0.05);
      
      // Bottom continuous
      dxf.drawLine(botOff, yOffset - D + botOff, L - botOff, yOffset - D + botOff);
      // Bottom L-bends
      dxf.drawLine(botOff, yOffset - D + botOff, botOff, yOffset - D + botOff + ldBot);
      dxf.drawLine(L - botOff, yOffset - D + botOff, L - botOff, yOffset - D + botOff + ldBot);
      
      // Bottom extra mid-span (Curtailment at 0.15L from ends)
      dxf.drawLine(0.15 * L, yOffset - D + botOff + 0.03, 0.85 * L, yOffset - D + botOff + 0.03);
      dxf.drawLine(0.15 * L, yOffset - D + botOff + 0.03, 0.15 * L, yOffset - D + botOff - 0.05);
      dxf.drawLine(0.85 * L, yOffset - D + botOff + 0.03, 0.85 * L, yOffset - D + botOff - 0.05);`;

const newBeam = `      // Top continuous (Anchor)
      dxf.drawLine(topOff, yOffset - topOff, L - topOff, yOffset - topOff);
      
      // Top Extra Support (Curtailment at 0.3L)
      dxf.drawLine(topOff, yOffset - topOff - 0.03, 0.3 * L, yOffset - topOff - 0.03);
      dxf.drawLine(L - 0.3 * L, yOffset - topOff - 0.03, L - topOff, yOffset - topOff - 0.03);
      // Drop line for curtailment indicator
      dxf.drawLine(0.3 * L, yOffset - topOff - 0.03, 0.3 * L, yOffset - topOff + 0.05);
      dxf.drawLine(L - 0.3 * L, yOffset - topOff - 0.03, L - 0.3 * L, yOffset - topOff + 0.05);
      
      // Bottom continuous
      dxf.drawLine(botOff, yOffset - D + botOff, L - botOff, yOffset - D + botOff);
      
      // Bottom extra mid-span (Curtailment at 0.15L from ends)
      dxf.drawLine(0.15 * L, yOffset - D + botOff + 0.03, 0.85 * L, yOffset - D + botOff + 0.03);
      dxf.drawLine(0.15 * L, yOffset - D + botOff + 0.03, 0.15 * L, yOffset - D + botOff - 0.05);
      dxf.drawLine(0.85 * L, yOffset - D + botOff + 0.03, 0.85 * L, yOffset - D + botOff - 0.05);`;

code = code.replace(oldBeam, newBeam);
fs.writeFileSync('src/components/StructuralDetailing.tsx', code);

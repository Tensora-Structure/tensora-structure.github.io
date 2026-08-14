const fs = require('fs');

let code = fs.readFileSync('src/components/StructuralDetailing.tsx', 'utf8');

// 1. Column DXF
const colDXFTarget = `      // L-Section
      dxf.setActiveLayer('CONCRETE');
      dxf.drawRect(0, yOffset - H, D, yOffset);
      dxf.drawLine(-0.5, yOffset, D + 0.5, yOffset); // floor level
      dxf.drawLine(-0.5, yOffset - H, D + 0.5, yOffset - H); // lower floor level
      drawLabel(-0.4, yOffset + 0.1, 'FLOOR LEVEL', 0.1);
      drawLabel(-0.4, yOffset - H + 0.1, 'FLOOR LEVEL', 0.1);
      
      dxf.setActiveLayer('REBAR_MAIN');
      // Main bars with L-bends at the bottom (footing/floor starter lap)
      dxf.drawLine(cov, yOffset - H + cov, cov, yOffset + 0.6); // extending 600mm for lap
      dxf.drawLine(cov, yOffset - H + cov, cov + 0.2, yOffset - H + cov); // L bend
      dxf.drawLine(D - cov, yOffset - H + cov, D - cov, yOffset + 0.6);
      dxf.drawLine(D - cov, yOffset - H + cov, D - cov - 0.2, yOffset - H + cov); // L bend
      
      // Upper lap slice indicator
      dxf.drawLine(cov + 0.02, yOffset, cov + 0.02, yOffset + 0.6);
      dxf.drawLine(D - cov - 0.02, yOffset, D - cov - 0.02, yOffset + 0.6);
      
      dxf.setActiveLayer('REBAR_SHEAR');
      let currY = yOffset - H + 0.1;
      const sp = data.tieSpacing / 1000;
      // Confining zones (L0) at ends
      const L0 = Math.max(D, H/6, 0.45);
      
      while(currY <= yOffset - 0.05) {
        let currentSp = sp;
        if (currY < (yOffset - H + L0) || currY > (yOffset - L0)) {
          currentSp = sp * 0.5; // confining zone
        }
        dxf.drawLine(cov, currY, D - cov, currY);
        currY += currentSp;
      }
      
      dxf.setActiveLayer('TEXT');
      drawLabel(D + 0.5, yOffset - H/2, \`\${data.mainCount} - Ø\${data.mainDia} MAIN BARS (LAP = 50d)\`, 0.15);
      drawLabel(D + 0.5, yOffset - H/2 - 0.2, \`Ø\${data.tieDia} TIES @ \${data.tieSpacing} c/c (Mid)\`, 0.15);
      drawLabel(D + 0.5, yOffset - H/2 - 0.4, \`Ø\${data.tieDia} TIES @ \${data.tieSpacing/2} c/c (Ends L0=\${(L0*1000).toFixed(0)}mm)\`, 0.15);
      drawDim(0, yOffset - H, 0, yOffset, \`L = \${data.L} mm\`, -0.5);
      drawDim(0, yOffset, D, yOffset, \`D = \${data.D} mm\`, 0.5);

      // X-Section
      const xX = D + 4;
      dxf.setActiveLayer('CONCRETE');
      dxf.drawRect(xX, yOffset - B, xX + D, yOffset);
      
      dxf.setActiveLayer('REBAR_SHEAR');
      dxf.drawRect(xX + cov, yOffset - B + cov, xX + D - cov, yOffset - cov);
      // Hooks for ties (135 deg)
      dxf.drawLine(xX + cov, yOffset - cov, xX + cov + 0.05, yOffset - cov - 0.05);
      dxf.drawLine(xX + cov, yOffset - cov, xX + cov + 0.05, yOffset - cov - 0.02);
      
      dxf.setActiveLayer('REBAR_MAIN');
      // Main bars (corners)
      dxf.drawCircle(xX + cov + 0.01, yOffset - cov - 0.01, 0.01);
      dxf.drawCircle(xX + D - cov - 0.01, yOffset - cov - 0.01, 0.01);
      dxf.drawCircle(xX + cov + 0.01, yOffset - B + cov + 0.01, 0.01);
      dxf.drawCircle(xX + D - cov - 0.01, yOffset - B + cov + 0.01, 0.01);
      
      if (data.mainCount > 4) {
        const extraBars = data.mainCount - 4;
        const spacingX = (D - 2*cov) / (Math.ceil(extraBars/2) + 1);
        for(let i=1; i<=Math.ceil(extraBars/2); i++) {
          dxf.drawCircle(xX + cov + i*spacingX, yOffset - cov - 0.01, 0.01);
          dxf.drawCircle(xX + cov + i*spacingX, yOffset - B + cov + 0.01, 0.01);
        }
      }`;

const colDXFReplace = `      const tieDia = data.tieDia / 1000;
      const mainDia = data.mainDia / 1000;
      const tieOff = cov + tieDia / 2;
      const mainOff = cov + tieDia + mainDia / 2;
      const ld = 40 * mainDia;

      // L-Section
      dxf.setActiveLayer('CONCRETE');
      dxf.drawRect(0, yOffset - H, D, yOffset);
      dxf.drawLine(-0.5, yOffset, D + 0.5, yOffset); // floor level
      dxf.drawLine(-0.5, yOffset - H, D + 0.5, yOffset - H); // lower floor level
      drawLabel(-0.4, yOffset + 0.1, 'FLOOR LEVEL', 0.1);
      drawLabel(-0.4, yOffset - H + 0.1, 'FLOOR LEVEL', 0.1);
      
      dxf.setActiveLayer('REBAR_MAIN');
      // Main bars with L-bends at the bottom (footing/floor starter lap)
      dxf.drawLine(mainOff, yOffset - H + mainOff, mainOff, yOffset + 0.6); // extending 600mm for lap
      dxf.drawLine(mainOff, yOffset - H + mainOff, mainOff + ld, yOffset - H + mainOff); // L bend
      dxf.drawLine(D - mainOff, yOffset - H + mainOff, D - mainOff, yOffset + 0.6);
      dxf.drawLine(D - mainOff, yOffset - H + mainOff, D - mainOff - ld, yOffset - H + mainOff); // L bend
      
      // Upper lap slice indicator
      dxf.drawLine(mainOff + 0.02, yOffset, mainOff + 0.02, yOffset + 0.6);
      dxf.drawLine(D - mainOff - 0.02, yOffset, D - mainOff - 0.02, yOffset + 0.6);
      
      dxf.setActiveLayer('REBAR_SHEAR');
      let currY = yOffset - H + 0.1;
      const sp = data.tieSpacing / 1000;
      // Confining zones (L0) at ends
      const L0 = Math.max(D, H/6, 0.45);
      
      while(currY <= yOffset - 0.05) {
        let currentSp = sp;
        if (currY < (yOffset - H + L0) || currY > (yOffset - L0)) {
          currentSp = sp * 0.5; // confining zone
        }
        // Draw the tie as a wrap around main bars
        dxf.drawLine(mainOff, currY - tieDia/2, tieOff, currY - tieDia/2);
        dxf.drawLine(tieOff, currY - tieDia/2, tieOff, currY + tieDia/2);
        dxf.drawLine(tieOff, currY + tieDia/2, D - tieOff, currY + tieDia/2);
        dxf.drawLine(D - tieOff, currY + tieDia/2, D - tieOff, currY - tieDia/2);
        dxf.drawLine(D - tieOff, currY - tieDia/2, D - mainOff, currY - tieDia/2);
        currY += currentSp;
      }
      
      dxf.setActiveLayer('TEXT');
      drawLabel(D + 0.5, yOffset - H/2, \`\${data.mainCount} - Ø\${data.mainDia} MAIN BARS (LAP = 50d)\`, 0.15);
      drawLabel(D + 0.5, yOffset - H/2 - 0.2, \`Ø\${data.tieDia} TIES @ \${data.tieSpacing} c/c (Mid)\`, 0.15);
      drawLabel(D + 0.5, yOffset - H/2 - 0.4, \`Ø\${data.tieDia} TIES @ \${data.tieSpacing/2} c/c (Ends L0=\${(L0*1000).toFixed(0)}mm)\`, 0.15);
      drawDim(0, yOffset - H, 0, yOffset, \`L = \${data.L} mm\`, -0.5);
      drawDim(0, yOffset, D, yOffset, \`D = \${data.D} mm\`, 0.5);

      // X-Section
      const xX = D + 4;
      dxf.setActiveLayer('CONCRETE');
      dxf.drawRect(xX, yOffset - B, xX + D, yOffset);
      
      dxf.setActiveLayer('REBAR_SHEAR');
      dxf.drawLine(xX + tieOff, yOffset - tieOff, xX + D - tieOff, yOffset - tieOff);
      dxf.drawLine(xX + D - tieOff, yOffset - tieOff, xX + D - tieOff, yOffset - B + tieOff);
      dxf.drawLine(xX + D - tieOff, yOffset - B + tieOff, xX + tieOff, yOffset - B + tieOff);
      dxf.drawLine(xX + tieOff, yOffset - B + tieOff, xX + tieOff, yOffset - tieOff);
      // Hooks for ties (135 deg) SP34
      const hookLen = 12 * tieDia;
      dxf.drawLine(xX + tieOff, yOffset - tieOff, xX + tieOff + hookLen * 0.707, yOffset - tieOff - hookLen * 0.707);
      dxf.drawLine(xX + tieOff, yOffset - tieOff, xX + tieOff + hookLen * 0.707 + 0.01, yOffset - tieOff - hookLen * 0.707);
      
      dxf.setActiveLayer('REBAR_MAIN');
      // Main bars (corners)
      dxf.drawCircle(xX + mainOff, yOffset - mainOff, mainDia/2);
      dxf.drawCircle(xX + D - mainOff, yOffset - mainOff, mainDia/2);
      dxf.drawCircle(xX + mainOff, yOffset - B + mainOff, mainDia/2);
      dxf.drawCircle(xX + D - mainOff, yOffset - B + mainOff, mainDia/2);
      
      if (data.mainCount > 4) {
        const extraBars = data.mainCount - 4;
        const spacingX = (D - 2*mainOff) / (Math.ceil(extraBars/2) + 1);
        for(let i=1; i<=Math.ceil(extraBars/2); i++) {
          dxf.drawCircle(xX + mainOff + i*spacingX, yOffset - mainOff, mainDia/2);
          dxf.drawCircle(xX + mainOff + i*spacingX, yOffset - B + mainOff, mainDia/2);
        }
      }`;

code = code.replace(colDXFTarget, colDXFReplace);

// We'll replace Beam DXF similarly. First check what's there.
fs.writeFileSync('src/components/StructuralDetailing.tsx', code);

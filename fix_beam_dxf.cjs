const fs = require('fs');

let code = fs.readFileSync('src/components/StructuralDetailing.tsx', 'utf8');

const beamDXFTarget = `      dxf.setActiveLayer('REBAR_MAIN');
      const ld = 50 * data.topDia / 1000; // Development length ~ 50d
      
      // Top continuous (Anchor)
      dxf.drawLine(cov, yOffset - cov, L - cov, yOffset - cov);
      // Top L-bends
      dxf.drawLine(cov, yOffset - cov, cov, yOffset - D + cov);
      dxf.drawLine(L - cov, yOffset - cov, L - cov, yOffset - D + cov);
      
      // Top Extra Support (Curtailment at 0.3L)
      dxf.drawLine(cov, yOffset - cov - 0.03, 0.3 * L, yOffset - cov - 0.03);
      dxf.drawLine(L - 0.3 * L, yOffset - cov - 0.03, L - cov, yOffset - cov - 0.03);
      // Drop line for curtailment indicator
      dxf.drawLine(0.3 * L, yOffset - cov - 0.03, 0.3 * L, yOffset - cov + 0.05);
      dxf.drawLine(L - 0.3 * L, yOffset - cov - 0.03, L - 0.3 * L, yOffset - cov + 0.05);
      
      // Bottom continuous
      dxf.drawLine(cov, yOffset - D + cov, L - cov, yOffset - D + cov);
      // Bottom L-bends
      dxf.drawLine(cov, yOffset - D + cov, cov, yOffset - cov);
      dxf.drawLine(L - cov, yOffset - D + cov, L - cov, yOffset - cov);
      
      // Bottom extra mid-span (Curtailment at 0.15L from ends)
      dxf.drawLine(0.15 * L, yOffset - D + cov + 0.03, 0.85 * L, yOffset - D + cov + 0.03);
      dxf.drawLine(0.15 * L, yOffset - D + cov + 0.03, 0.15 * L, yOffset - D + cov - 0.05);
      dxf.drawLine(0.85 * L, yOffset - D + cov + 0.03, 0.85 * L, yOffset - D + cov - 0.05);
      
      dxf.setActiveLayer('REBAR_SHEAR');
      let currX = cov + 0.05;
      const sp = data.stirrupSpacing / 1000;
      // Confining zones (2d from face of support)
      const confineZone = 2 * D;
      while(currX < L - cov) {
        let currentSp = sp;
        if (currX < confineZone || currX > L - confineZone) {
          currentSp = sp * 0.5; // confining zone spacing
        }
        dxf.drawLine(currX, yOffset - D + cov, currX, yOffset - cov);
        currX += currentSp;
      }`;

const beamDXFReplace = `      dxf.setActiveLayer('REBAR_MAIN');
      const stirrupDia = data.stirrupDia / 1000;
      const topDia = data.topDia / 1000;
      const botDia = data.botDia / 1000;
      const tieOff = cov + stirrupDia / 2;
      const topOff = cov + stirrupDia + topDia / 2;
      const botOff = cov + stirrupDia + botDia / 2;
      
      const ldTop = 50 * topDia; // Development length
      const ldBot = 50 * botDia;
      
      // Top continuous (Anchor)
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
      dxf.drawLine(0.85 * L, yOffset - D + botOff + 0.03, 0.85 * L, yOffset - D + botOff - 0.05);
      
      dxf.setActiveLayer('REBAR_SHEAR');
      let currX = tieOff + 0.05;
      const sp = data.stirrupSpacing / 1000;
      // Confining zones (2d from face of support)
      const confineZone = 2 * D;
      while(currX < L - tieOff) {
        let currentSp = sp;
        if (currX < confineZone || currX > L - confineZone) {
          currentSp = sp * 0.5; // confining zone spacing
        }
        // Draw stirrup wrapping around top and bottom bars
        dxf.drawLine(currX - stirrupDia/2, yOffset - tieOff, currX - stirrupDia/2, yOffset - D + tieOff);
        dxf.drawLine(currX - stirrupDia/2, yOffset - D + tieOff, currX + stirrupDia/2, yOffset - D + tieOff);
        dxf.drawLine(currX + stirrupDia/2, yOffset - D + tieOff, currX + stirrupDia/2, yOffset - tieOff);
        dxf.drawLine(currX + stirrupDia/2, yOffset - tieOff, currX - stirrupDia/2, yOffset - tieOff);
        currX += currentSp;
      }`;

code = code.replace(beamDXFTarget, beamDXFReplace);

const beamSecDXFTarget = `      // X-Section Support
      const xX1 = L + 2;
      dxf.setActiveLayer('CONCRETE');
      dxf.drawRect(xX1, yOffset - D, xX1 + B, yOffset);
      dxf.setActiveLayer('REBAR_SHEAR');
      dxf.drawRect(xX1 + cov, yOffset - D + cov, xX1 + B - cov, yOffset - cov);
      dxf.drawLine(xX1 + cov, yOffset - cov, xX1 + cov + 0.05, yOffset - cov - 0.05); // hook
      dxf.drawLine(xX1 + cov, yOffset - cov, xX1 + cov + 0.05, yOffset - cov - 0.02);
      
      dxf.setActiveLayer('REBAR_MAIN');
      // Top bars (Continuous + Extra)
      dxf.drawCircle(xX1 + cov + 0.01, yOffset - cov - 0.01, 0.01);
      dxf.drawCircle(xX1 + B - cov - 0.01, yOffset - cov - 0.01, 0.01);
      dxf.drawCircle(xX1 + B/2, yOffset - cov - 0.01, 0.01); // Extra
      // Bottom bars (Continuous)
      dxf.drawCircle(xX1 + cov + 0.01, yOffset - D + cov + 0.01, 0.01);
      dxf.drawCircle(xX1 + B - cov - 0.01, yOffset - D + cov + 0.01, 0.01);
      
      dxf.setActiveLayer('TEXT');
      drawLabel(xX1 + B/2, yOffset - D - 0.4, \`SEC @ SUPPORT\`, 0.12, 'center');

      // X-Section Mid-span
      const xX2 = L + 2 + B + 1.5;
      dxf.setActiveLayer('CONCRETE');
      dxf.drawRect(xX2, yOffset - D, xX2 + B, yOffset);
      dxf.setActiveLayer('REBAR_SHEAR');
      dxf.drawRect(xX2 + cov, yOffset - D + cov, xX2 + B - cov, yOffset - cov);
      dxf.drawLine(xX2 + cov, yOffset - cov, xX2 + cov + 0.05, yOffset - cov - 0.05); // hook
      
      dxf.setActiveLayer('REBAR_MAIN');
      // Top bars (Continuous only)
      dxf.drawCircle(xX2 + cov + 0.01, yOffset - cov - 0.01, 0.01);
      dxf.drawCircle(xX2 + B - cov - 0.01, yOffset - cov - 0.01, 0.01);
      // Bottom bars (Continuous + Extra)
      dxf.drawCircle(xX2 + cov + 0.01, yOffset - D + cov + 0.01, 0.01);
      dxf.drawCircle(xX2 + B - cov - 0.01, yOffset - D + cov + 0.01, 0.01);
      dxf.drawCircle(xX2 + B/2, yOffset - D + cov + 0.01, 0.01); // Extra`;

const beamSecDXFReplace = `      // X-Section Support
      const xX1 = L + 2;
      const hookLen = 12 * stirrupDia;
      
      dxf.setActiveLayer('CONCRETE');
      dxf.drawRect(xX1, yOffset - D, xX1 + B, yOffset);
      dxf.setActiveLayer('REBAR_SHEAR');
      dxf.drawLine(xX1 + tieOff, yOffset - tieOff, xX1 + B - tieOff, yOffset - tieOff);
      dxf.drawLine(xX1 + B - tieOff, yOffset - tieOff, xX1 + B - tieOff, yOffset - D + tieOff);
      dxf.drawLine(xX1 + B - tieOff, yOffset - D + tieOff, xX1 + tieOff, yOffset - D + tieOff);
      dxf.drawLine(xX1 + tieOff, yOffset - D + tieOff, xX1 + tieOff, yOffset - tieOff);
      // Hooks for ties (135 deg)
      dxf.drawLine(xX1 + tieOff, yOffset - tieOff, xX1 + tieOff + hookLen * 0.707, yOffset - tieOff - hookLen * 0.707);
      dxf.drawLine(xX1 + tieOff, yOffset - tieOff, xX1 + tieOff + hookLen * 0.707 + 0.01, yOffset - tieOff - hookLen * 0.707);
      
      dxf.setActiveLayer('REBAR_MAIN');
      // Top bars (Continuous + Extra)
      dxf.drawCircle(xX1 + topOff, yOffset - topOff, topDia/2);
      dxf.drawCircle(xX1 + B - topOff, yOffset - topOff, topDia/2);
      dxf.drawCircle(xX1 + B/2, yOffset - topOff, topDia/2); // Extra
      // Bottom bars (Continuous)
      dxf.drawCircle(xX1 + botOff, yOffset - D + botOff, botDia/2);
      dxf.drawCircle(xX1 + B - botOff, yOffset - D + botOff, botDia/2);
      
      dxf.setActiveLayer('TEXT');
      drawLabel(xX1 + B/2, yOffset - D - 0.4, \`SEC @ SUPPORT\`, 0.12, 'center');

      // X-Section Mid-span
      const xX2 = L + 2 + B + 1.5;
      dxf.setActiveLayer('CONCRETE');
      dxf.drawRect(xX2, yOffset - D, xX2 + B, yOffset);
      dxf.setActiveLayer('REBAR_SHEAR');
      dxf.drawLine(xX2 + tieOff, yOffset - tieOff, xX2 + B - tieOff, yOffset - tieOff);
      dxf.drawLine(xX2 + B - tieOff, yOffset - tieOff, xX2 + B - tieOff, yOffset - D + tieOff);
      dxf.drawLine(xX2 + B - tieOff, yOffset - D + tieOff, xX2 + tieOff, yOffset - D + tieOff);
      dxf.drawLine(xX2 + tieOff, yOffset - D + tieOff, xX2 + tieOff, yOffset - tieOff);
      // Hooks for ties (135 deg)
      dxf.drawLine(xX2 + tieOff, yOffset - tieOff, xX2 + tieOff + hookLen * 0.707, yOffset - tieOff - hookLen * 0.707);
      
      dxf.setActiveLayer('REBAR_MAIN');
      // Top bars (Continuous only)
      dxf.drawCircle(xX2 + topOff, yOffset - topOff, topDia/2);
      dxf.drawCircle(xX2 + B - topOff, yOffset - topOff, topDia/2);
      // Bottom bars (Continuous + Extra)
      dxf.drawCircle(xX2 + botOff, yOffset - D + botOff, botDia/2);
      dxf.drawCircle(xX2 + B - botOff, yOffset - D + botOff, botDia/2);
      dxf.drawCircle(xX2 + B/2, yOffset - D + botOff, botDia/2); // Extra`;

code = code.replace(beamSecDXFTarget, beamSecDXFReplace);
fs.writeFileSync('src/components/StructuralDetailing.tsx', code);

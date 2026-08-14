const fs = require('fs');

let code = fs.readFileSync('src/components/StructuralDetailing.tsx', 'utf8');

const exportDxfStart = `  const exportDxf = () => {`;
const exportDxfEnd = `    URL.revokeObjectURL(url);
  };`;

const newExportDxf = `  const exportDxf = () => {
    const dxf = new DxfWriter();
    dxf.setUnits('Meters');
    
    // Setup Layers
    dxf.addLayer('CONCRETE', 7, 'CONTINUOUS'); // White/Black
    dxf.addLayer('REBAR_MAIN', 1, 'CONTINUOUS'); // Red
    dxf.addLayer('REBAR_SHEAR', 3, 'CONTINUOUS'); // Green
    dxf.addLayer('TEXT', 2, 'CONTINUOUS'); // Yellow
    dxf.addLayer('DIMS', 8, 'CONTINUOUS'); // Gray
    
    let yOffset = 0;
    
    const drawLabel = (x: number, y: number, text: string, height: number = 0.15, align: 'left'|'center'|'right' = 'left') => {
      dxf.setActiveLayer('TEXT');
      const halign = align === 'center' ? 1 : align === 'right' ? 2 : 0; 
      dxf.drawText(x, y, height, 0, text, halign, 0);
    };

    const drawDim = (x1: number, y1: number, x2: number, y2: number, text: string, offset: number) => {
      dxf.setActiveLayer('DIMS');
      if (Math.abs(x1 - x2) < 0.01) {
         dxf.drawLine(x1, y1, x1 + offset, y1);
         dxf.drawLine(x2, y2, x2 + offset, y2);
         dxf.drawLine(x1 + offset*0.8, y1, x2 + offset*0.8, y2);
         drawLabel(x1 + offset*0.8 + 0.05, (y1+y2)/2, text, 0.1, 'left');
      } else {
         dxf.drawLine(x1, y1, x1, y1 + offset);
         dxf.drawLine(x2, y2, x2, y2 + offset);
         dxf.drawLine(x1, y1 + offset*0.8, x2, y2 + offset*0.8);
         drawLabel((x1+x2)/2, y1 + offset*0.8 + 0.05, text, 0.1, 'center');
      }
    };
    
    // COLUMNS
    columns.forEach(col => {
      const data = getColumnData(col.id);
      if(!data) return;
      const H = data.L / 1000;
      const B = data.B / 1000;
      const D = data.D / 1000;
      const cov = data.cover / 1000;
      
      drawLabel(0, yOffset, \`COLUMN \${data.id} DETAILING (IS 13920 & SP34)\`, 0.3);
      yOffset -= 1.0;
      
      // L-Section
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
      }
      
      dxf.setActiveLayer('TEXT');
      drawLabel(xX + D/2, yOffset - B - 0.4, \`CROSS SECTION (\${data.D} x \${data.B})\`, 0.15, 'center');
      drawLabel(xX + D/2, yOffset - B - 0.6, \`Cover = \${data.cover} mm\`, 0.12, 'center');
      drawDim(xX, yOffset - B, xX + D, yOffset - B, \`\${data.D}\`, -0.4);
      drawDim(xX + D, yOffset - B, xX + D, yOffset, \`\${data.B}\`, 0.4);

      yOffset -= (H + 2);
    });

    // BEAMS
    beams.forEach(beam => {
      const data = getBeamData(beam.id);
      if(!data) return;
      const L = data.L / 1000;
      const B = data.B / 1000;
      const D = data.D / 1000;
      const cov = data.cover / 1000;

      drawLabel(0, yOffset, \`BEAM \${data.id} DETAILING (IS 13920 & SP34)\`, 0.3);
      yOffset -= 1.0;

      // L-Section
      dxf.setActiveLayer('CONCRETE');
      dxf.drawRect(0, yOffset - D, L, yOffset);
      // Support columns outline
      dxf.drawLine(0, yOffset, 0, yOffset + 0.5);
      dxf.drawLine(L, yOffset, L, yOffset + 0.5);
      dxf.drawLine(0, yOffset - D, 0, yOffset - D - 0.5);
      dxf.drawLine(L, yOffset - D, L, yOffset - D - 0.5);

      dxf.setActiveLayer('REBAR_MAIN');
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
      }
      
      dxf.setActiveLayer('TEXT');
      drawLabel(L/2, yOffset + 0.3, \`\${data.topCount} - Ø\${data.topDia} TOP CONTINUOUS + EXTRA @ SUPPORTS\`, 0.12, 'center');
      drawLabel(L/2, yOffset - D - 0.4, \`\${data.botCount} - Ø\${data.botDia} BOTTOM CONTINUOUS + EXTRA @ MID\`, 0.12, 'center');
      drawLabel(L/2, yOffset - D/2, \`Ø\${data.stirrupDia} STIRRUPS @ \${data.stirrupSpacing} c/c (Mid) & \${data.stirrupSpacing/2} c/c (Ends)\`, 0.12, 'center');

      drawDim(0, yOffset, L, yOffset, \`Span L = \${data.L} mm\`, 0.8);
      drawDim(0, yOffset - D, 0, yOffset, \`\${data.D}\`, -0.5);
      drawDim(0, yOffset + 0.4, 0.3 * L, yOffset + 0.4, \`0.3L\`, 0.2);
      drawDim(L - 0.3 * L, yOffset + 0.4, L, yOffset + 0.4, \`0.3L\`, 0.2);

      // X-Section Support
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
      dxf.drawCircle(xX2 + B/2, yOffset - D + cov + 0.01, 0.01); // Extra
      
      dxf.setActiveLayer('TEXT');
      drawLabel(xX2 + B/2, yOffset - D - 0.4, \`SEC @ MID-SPAN\`, 0.12, 'center');
      drawLabel((xX1 + xX2 + B)/2, yOffset - D - 0.7, \`(\${data.B} x \${data.D})\`, 0.12, 'center');
      drawDim(xX1, yOffset - D, xX1 + B, yOffset - D, \`\${data.B}\`, -0.2);

      yOffset -= (D + 2.5);
    });

    // SLABS
    drawLabel(0, yOffset, 'TYPICAL SLAB PANEL DETAILING (IS 456 & SP34)', 0.3);
    yOffset -= 1.0;
    
    const slabD = slabThickness / 1000;
    
    const drawSlabSection = (span: number, label: string) => {
      dxf.setActiveLayer('CONCRETE');
      dxf.drawRect(0, yOffset - slabD, span, yOffset);
      dxf.drawLine(0, yOffset - slabD, -0.2, yOffset - slabD - 0.2); // breakline
      dxf.drawLine(span, yOffset - slabD, span + 0.2, yOffset - slabD - 0.2); 
      dxf.drawLine(0, yOffset, -0.2, yOffset + 0.2); 
      dxf.drawLine(span, yOffset, span + 0.2, yOffset + 0.2); 
      
      dxf.setActiveLayer('REBAR_MAIN');
      const sCov = 0.02; // 20mm cover for slab
      // Main straight
      dxf.drawLine(0.05, yOffset - slabD + sCov, span - 0.05, yOffset - slabD + sCov);
      
      // Main cranked (alternate)
      dxf.drawLine(0.05, yOffset - sCov, 0.2 * span, yOffset - sCov); // Top anchor L/5
      dxf.drawLine(0.2 * span, yOffset - sCov, 0.25 * span, yOffset - slabD + sCov + 0.01); // Crank 45 deg approx
      dxf.drawLine(0.25 * span, yOffset - slabD + sCov + 0.01, 0.75 * span, yOffset - slabD + sCov + 0.01); // Bottom
      dxf.drawLine(0.75 * span, yOffset - slabD + sCov + 0.01, 0.8 * span, yOffset - sCov); // Crank
      dxf.drawLine(0.8 * span, yOffset - sCov, span - 0.05, yOffset - sCov); // Top anchor L/5
      
      // Top Extra bars at supports (typically same as main)
      dxf.drawLine(0.05, yOffset - sCov - 0.01, 0.25 * span, yOffset - sCov - 0.01);
      dxf.drawLine(span - 0.25 * span, yOffset - sCov - 0.01, span - 0.05, yOffset - sCov - 0.01);

      dxf.setActiveLayer('REBAR_SHEAR');
      // Transverse / Distribution bars
      let currSlabX = 0.1;
      while(currSlabX < span - 0.1) {
        // Bottom distribution
        dxf.drawCircle(currSlabX, yOffset - slabD + sCov + 0.02, 0.005);
        // Top distribution (under crank/extra)
        if (currSlabX < 0.25 * span || currSlabX > 0.75 * span) {
           dxf.drawCircle(currSlabX, yOffset - sCov - 0.02, 0.005);
        }
        currSlabX += 0.2; // 200mm c/c typical
      }
      
      dxf.setActiveLayer('TEXT');
      drawLabel(span / 2, yOffset + 0.3, label, 0.15, 'center');
      drawDim(0, yOffset - slabD, span, yOffset - slabD, \`Span = \${(span*1000).toFixed(0)} mm\`, -0.5);
      drawDim(span, yOffset - slabD, span, yOffset, \`\${slabThickness}\`, 0.4);
      drawDim(0, yOffset + 0.4, 0.25 * span, yOffset + 0.4, 'L/4', 0.2);
      drawDim(span - 0.25 * span, yOffset + 0.4, span, yOffset + 0.4, 'L/4', 0.2);

      yOffset -= (slabD + 2.5);
    };

    drawSlabSection(slabLx, 'SECTION ALONG SHORT SPAN (Lx) - MAIN BARS (STRAIGHT & CRANKED)');
    drawSlabSection(slabLy, \`SECTION ALONG LONG SPAN (Ly) - \${slabLy / slabLx < 2 ? 'TWO-WAY (MAIN BARS)' : 'ONE-WAY (DISTRIBUTION BARS)'}\`);

    // FOUNDATIONS
    drawLabel(0, yOffset, 'TYPICAL FOUNDATION DETAILING (SP34)', 0.3);
    yOffset -= 1.0;
    
    // Cross Section
    const fW = 1.5;
    const fD = 0.4;
    const fCov = 0.05;

    dxf.setActiveLayer('DIMS');
    dxf.drawLine(-1.0, yOffset, fW + 1.0, yOffset); // GL
    drawLabel(-0.9, yOffset + 0.1, 'GL');
    yOffset -= 1.5; // depth to footing
    
    dxf.setActiveLayer('CONCRETE');
    // Pad
    dxf.drawLine(0, yOffset - fD, fW, yOffset - fD); // bottom
    dxf.drawLine(0, yOffset - fD, 0, yOffset - fD + 0.15); // edge
    dxf.drawLine(fW, yOffset - fD, fW, yOffset - fD + 0.15); // edge
    dxf.drawLine(0, yOffset - fD + 0.15, fW/2 - 0.2, yOffset); // slope
    dxf.drawLine(fW, yOffset - fD + 0.15, fW/2 + 0.2, yOffset); // slope
    
    // Column neck
    dxf.drawLine(fW/2 - 0.2, yOffset, fW/2 - 0.2, yOffset + 1.5);
    dxf.drawLine(fW/2 + 0.2, yOffset, fW/2 + 0.2, yOffset + 1.5);
    // PCC Base
    dxf.drawLine(-0.1, yOffset - fD, fW + 0.1, yOffset - fD);
    dxf.drawLine(-0.1, yOffset - fD - 0.1, fW + 0.1, yOffset - fD - 0.1);
    dxf.drawLine(-0.1, yOffset - fD, -0.1, yOffset - fD - 0.1);
    dxf.drawLine(fW + 0.1, yOffset - fD, fW + 0.1, yOffset - fD - 0.1);

    dxf.setActiveLayer('REBAR_MAIN');
    // Mesh Bottom
    dxf.drawLine(fCov, yOffset - fD + fCov, fW - fCov, yOffset - fD + fCov); // Main X
    // U-hooks at ends
    dxf.drawLine(fCov, yOffset - fD + fCov, fCov, yOffset - fD + fCov + 0.05);
    dxf.drawLine(fW - fCov, yOffset - fD + fCov, fW - fCov, yOffset - fD + fCov + 0.05);
    
    dxf.setActiveLayer('REBAR_SHEAR');
    // Transverse Y
    let currFx = fCov + 0.05;
    while(currFx < fW - fCov - 0.05) {
      dxf.drawCircle(currFx, yOffset - fD + fCov + 0.015, 0.008);
      currFx += 0.15;
    }
    
    dxf.setActiveLayer('REBAR_MAIN');
    // Starters
    dxf.drawLine(fW/2 - 0.15, yOffset + 1.5, fW/2 - 0.15, yOffset - fD + fCov + 0.03);
    dxf.drawLine(fW/2 - 0.15, yOffset - fD + fCov + 0.03, fW/2 - 0.45, yOffset - fD + fCov + 0.03); // L bend 300mm
    
    dxf.drawLine(fW/2 + 0.15, yOffset + 1.5, fW/2 + 0.15, yOffset - fD + fCov + 0.03);
    dxf.drawLine(fW/2 + 0.15, yOffset - fD + fCov + 0.03, fW/2 + 0.45, yOffset - fD + fCov + 0.03); // L bend 300mm
    
    // Column ties in footing
    let tieY = yOffset;
    while(tieY > yOffset - fD + 0.1) {
       dxf.setActiveLayer('REBAR_SHEAR');
       dxf.drawLine(fW/2 - 0.15, tieY, fW/2 + 0.15, tieY);
       tieY -= 0.15;
    }
    
    dxf.setActiveLayer('TEXT');
    drawLabel(fW/2, yOffset - fD - 0.4, 'ELEVATION (CROSS SECTION)', 0.15, 'center');
    drawLabel(fW + 0.3, yOffset - fD/2 + 0.3, 'STARTER BARS (L-BEND = 300mm)', 0.1);
    drawLabel(fW + 0.3, yOffset - fD/2, 'BOTTOM MESH Ø12@150 c/c (BOTH WAYS)', 0.1);
    drawLabel(fW + 0.3, yOffset - fD - 0.05, '100mm THK PCC (1:3:6)', 0.1);

    drawDim(0, yOffset - fD - 0.1, fW, yOffset - fD - 0.1, \`\${fW*1000} mm\`, -0.5);
    drawDim(0, yOffset, 0, yOffset - fD, \`\${fD*1000} mm\`, -0.5);

    // Plan View next to it
    const pX = fW + 4.0;
    dxf.setActiveLayer('CONCRETE');
    dxf.drawRect(pX, yOffset - fW, pX + fW, yOffset); // pad
    dxf.drawRect(pX + fW/2 - 0.2, yOffset - fW/2 - 0.2, pX + fW/2 + 0.2, yOffset - fW/2 + 0.2); // column
    
    dxf.setActiveLayer('REBAR_MAIN');
    // Mesh Grid (X and Y)
    let planMesh = fCov + 0.05;
    while(planMesh < fW - fCov - 0.05) {
      dxf.drawLine(pX + fCov, yOffset - planMesh, pX + fW - fCov, yOffset - planMesh);
      dxf.drawLine(pX + planMesh, yOffset - fCov, pX + planMesh, yOffset - fW + fCov);
      planMesh += 0.15;
    }
    
    dxf.setActiveLayer('REBAR_SHEAR');
    dxf.drawCircle(pX + fW/2 - 0.15, yOffset - fW/2 - 0.15, 0.015);
    dxf.drawCircle(pX + fW/2 + 0.15, yOffset - fW/2 - 0.15, 0.015);
    dxf.drawCircle(pX + fW/2 - 0.15, yOffset - fW/2 + 0.15, 0.015);
    dxf.drawCircle(pX + fW/2 + 0.15, yOffset - fW/2 + 0.15, 0.015);
    
    dxf.setActiveLayer('TEXT');
    drawLabel(pX + fW/2, yOffset - fW - 0.4, 'PLAN VIEW OF FOOTING', 0.15, 'center');
    drawDim(pX, yOffset, pX + fW, yOffset, \`L = \${fW*1000} mm\`, 0.5);
    drawDim(pX, yOffset - fW, pX, yOffset, \`B = \${fW*1000} mm\`, -0.5);
    
    const dxfString = dxf.toDxfString();
    const blob = new Blob([dxfString], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Structural_Detailing_SP34.dxf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };`;

const startIndex = code.indexOf(exportDxfStart);
const endIndex = code.indexOf(exportDxfEnd) + exportDxfEnd.length;

if (startIndex !== -1 && endIndex !== -1) {
    code = code.substring(0, startIndex) + newExportDxf + code.substring(endIndex);
    fs.writeFileSync('src/components/StructuralDetailing.tsx', code);
    console.log("Successfully injected advanced DXF generation!");
} else {
    console.log("Failed to find boundaries");
}

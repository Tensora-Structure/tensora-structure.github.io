import React, { useState, useMemo } from 'react';
import DxfWriter from 'dxf-writer';

interface DetailingProps {
  joints: any[];
  beams: any[];
  columns: any[];
  sections: any[];
  bbsRows: any[];
  fdnReport: any;
  slabLx: number;
  slabLy: number;
  slabThickness: number;
}

export const StructuralDetailing: React.FC<DetailingProps> = ({ joints, beams, columns, sections, bbsRows, fdnReport, slabLx, slabLy, slabThickness }) => {
  const [selectedMemberType, setSelectedMemberType] = useState<'Column' | 'Beam' | 'Slab' | 'Foundation'>('Column');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  // Default selection
  useMemo(() => {
    if (selectedMemberType === 'Column' && columns.length > 0 && (!selectedMemberId || !columns.find(c => c.id === selectedMemberId))) {
      setSelectedMemberId(columns[0].id);
    } else if (selectedMemberType === 'Beam' && beams.length > 0 && (!selectedMemberId || !beams.find(b => b.id === selectedMemberId))) {
      setSelectedMemberId(beams[0].id);
    }
  }, [selectedMemberType, columns, beams, selectedMemberId]);

  const getLength = (member: any) => {
    if (!member) return 3;
    const nodeI = joints.find((j: any) => j.id === member.nodeI);
    const nodeJ = joints.find((j: any) => j.id === member.nodeJ);
    if (!nodeI || !nodeJ) return 3;
    return Math.sqrt(Math.pow(nodeJ.x - nodeI.x, 2) + Math.pow(nodeJ.y - nodeI.y, 2) + Math.pow((nodeJ.z || 0) - (nodeI.z || 0), 2));
  };

  const getSection = (sectionId: string) => sections.find(s => s.id === sectionId) || { width: 0.3, depth: 0.45 };

  // Data helpers
  const getColumnData = (colId: string) => {
    const col = columns.find(c => c.id === colId);
    if (!col) return null;
    const sec = getSection(col.sectionId);
    const mainBar = bbsRows.find(r => r.member.startsWith(col.id) && r.member.includes('Main'));
    const ties = bbsRows.find(r => r.member.startsWith(col.id) && r.member.includes('Ties'));
    return {
      id: col.id,
      L: parseFloat((getLength(col) * 1000).toFixed(2)),
      B: parseFloat((sec.width * 1000).toFixed(2)),
      D: parseFloat((sec.depth * 1000).toFixed(2)),
      cover: 40,
      mainDia: mainBar ? mainBar.dia : 16,
      mainCount: mainBar ? mainBar.barsPerMember : 4,
      tieDia: ties ? ties.dia : 8,
      tieSpacing: ties ? parseInt(ties.spacingOrCount.replace(/[^0-9]/g, '')) || 150 : 150
    };
  };

  const getBeamData = (beamId: string) => {
    const beam = beams.find(b => b.id === beamId);
    if (!beam) return null;
    const sec = getSection(beam.sectionId);
    const topBar = bbsRows.find(r => r.member.startsWith(beam.id) && r.member.includes('Top Anchor'));
    const botBar = bbsRows.find(r => r.member.startsWith(beam.id) && r.member.includes('Bottom Main'));
    const stirrup = bbsRows.find(r => r.member.startsWith(beam.id) && r.member.includes('Stirrup'));
    return {
      id: beam.id,
      L: parseFloat((getLength(beam) * 1000).toFixed(2)),
      B: parseFloat((sec.width * 1000).toFixed(2)),
      D: parseFloat((sec.depth * 1000).toFixed(2)),
      cover: 25,
      topDia: topBar ? topBar.dia : 12,
      topCount: topBar ? topBar.barsPerMember : 2,
      botDia: botBar ? botBar.dia : 16,
      botCount: botBar ? botBar.barsPerMember : 3,
      stirrupDia: stirrup ? stirrup.dia : 8,
      stirrupSpacing: stirrup ? parseInt(stirrup.spacingOrCount.replace(/[^0-9]/g, '')) || 150 : 150
    };
  };

  const exportDxf = () => {
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
      dxf.drawText(x, y, height, 0, text, align, 'baseline');
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
      
      drawLabel(0, yOffset, `COLUMN ${data.id} DETAILING (IS 13920 & SP34)`, 0.3);
      yOffset -= 1.0;
      
      const tieDia = data.tieDia / 1000;
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
      drawLabel(D + 0.5, yOffset - H/2, `${data.mainCount} - Ø${data.mainDia} MAIN BARS (LAP = 50d)`, 0.15);
      drawLabel(D + 0.5, yOffset - H/2 - 0.2, `Ø${data.tieDia} TIES @ ${data.tieSpacing} c/c (Mid)`, 0.15);
      drawLabel(D + 0.5, yOffset - H/2 - 0.4, `Ø${data.tieDia} TIES @ ${data.tieSpacing/2} c/c (Ends L0=${(L0*1000).toFixed(0)}mm)`, 0.15);
      drawDim(0, yOffset - H, 0, yOffset, `L = ${data.L} mm`, -0.5);
      drawDim(0, yOffset, D, yOffset, `D = ${data.D} mm`, 0.5);

      // X-Section
      const xX = D + 4;
      dxf.setActiveLayer('CONCRETE');
      dxf.drawRect(xX, yOffset - B, xX + D, yOffset);
      
      dxf.setActiveLayer('REBAR_SHEAR');
      dxf.drawLine(xX + tieOff, yOffset - tieOff, xX + D - tieOff, yOffset - tieOff);
      dxf.drawLine(xX + D - tieOff, yOffset - tieOff, xX + D - tieOff, yOffset - B + tieOff);
      dxf.drawLine(xX + D - tieOff, yOffset - B + tieOff, xX + tieOff, yOffset - B + tieOff);
      dxf.drawLine(xX + tieOff, yOffset - B + tieOff, xX + tieOff, yOffset - tieOff);
      // Hooks for ties (135 deg)
      dxf.drawLine(xX + tieOff, yOffset - tieOff, xX + tieOff + 0.05, yOffset - tieOff - 0.05);
      dxf.drawLine(xX + tieOff, yOffset - tieOff, xX + tieOff + 0.05, yOffset - tieOff - 0.02);
      
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
      }
      
      dxf.setActiveLayer('TEXT');
      drawLabel(xX + D/2, yOffset - B - 0.4, `CROSS SECTION (${data.D} x ${data.B})`, 0.15, 'center');
      drawLabel(xX + D/2, yOffset - B - 0.6, `Cover = ${data.cover} mm`, 0.12, 'center');
      drawDim(xX, yOffset - B, xX + D, yOffset - B, `${data.D}`, -0.4);
      drawDim(xX + D, yOffset - B, xX + D, yOffset, `${data.B}`, 0.4);

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

      drawLabel(0, yOffset, `BEAM ${data.id} DETAILING (IS 13920 & SP34)`, 0.3);
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
        dxf.drawLine(currX, yOffset - D + cov, currX, yOffset - cov);
        currX += currentSp;
      }
      
      dxf.setActiveLayer('TEXT');
      drawLabel(L/2, yOffset + 0.3, `${data.topCount} - Ø${data.topDia} TOP CONTINUOUS + EXTRA @ SUPPORTS`, 0.12, 'center');
      drawLabel(L/2, yOffset - D - 0.4, `${data.botCount} - Ø${data.botDia} BOTTOM CONTINUOUS + EXTRA @ MID`, 0.12, 'center');
      drawLabel(L/2, yOffset - D/2, `Ø${data.stirrupDia} STIRRUPS @ ${data.stirrupSpacing} c/c (Mid) & ${data.stirrupSpacing/2} c/c (Ends)`, 0.12, 'center');

      drawDim(0, yOffset, L, yOffset, `Span L = ${data.L} mm`, 0.8);
      drawDim(0, yOffset - D, 0, yOffset, `${data.D}`, -0.5);
      drawDim(0, yOffset + 0.4, 0.3 * L, yOffset + 0.4, `0.3L`, 0.2);
      drawDim(L - 0.3 * L, yOffset + 0.4, L, yOffset + 0.4, `0.3L`, 0.2);

      // X-Section Support
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
      dxf.drawLine(xX1 + tieOff, yOffset - tieOff, xX1 + tieOff + 0.05, yOffset - tieOff - 0.05);
      dxf.drawLine(xX1 + tieOff, yOffset - tieOff, xX1 + tieOff + 0.05, yOffset - tieOff - 0.02);
      
      dxf.setActiveLayer('REBAR_MAIN');
      // Top bars (Continuous + Extra)
      dxf.drawCircle(xX1 + topOff, yOffset - topOff, topDia/2);
      dxf.drawCircle(xX1 + B - topOff, yOffset - topOff, topDia/2);
      dxf.drawCircle(xX1 + B/2, yOffset - topOff, topDia/2); // Extra
      // Bottom bars (Continuous)
      dxf.drawCircle(xX1 + botOff, yOffset - D + botOff, botDia/2);
      dxf.drawCircle(xX1 + B - botOff, yOffset - D + botOff, botDia/2);
      
      dxf.setActiveLayer('TEXT');
      drawLabel(xX1 + B/2, yOffset - D - 0.4, `SEC @ SUPPORT`, 0.12, 'center');

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
      dxf.drawLine(xX2 + tieOff, yOffset - tieOff, xX2 + tieOff + 0.05, yOffset - tieOff - 0.05);
      
      dxf.setActiveLayer('REBAR_MAIN');
      // Top bars (Continuous only)
      dxf.drawCircle(xX2 + topOff, yOffset - topOff, topDia/2);
      dxf.drawCircle(xX2 + B - topOff, yOffset - topOff, topDia/2);
      // Bottom bars (Continuous + Extra)
      dxf.drawCircle(xX2 + botOff, yOffset - D + botOff, botDia/2);
      dxf.drawCircle(xX2 + B - botOff, yOffset - D + botOff, botDia/2);
      dxf.drawCircle(xX2 + B/2, yOffset - D + botOff, botDia/2); // Extra
      
      dxf.setActiveLayer('TEXT');
      drawLabel(xX2 + B/2, yOffset - D - 0.4, `SEC @ MID-SPAN`, 0.12, 'center');
      drawLabel((xX1 + xX2 + B)/2, yOffset - D - 0.7, `(${data.B} x ${data.D})`, 0.12, 'center');
      drawDim(xX1, yOffset - D, xX1 + B, yOffset - D, `${data.B}`, -0.2);

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
      drawDim(0, yOffset - slabD, span, yOffset - slabD, `Span = ${(span*1000).toFixed(0)} mm`, -0.5);
      drawDim(span, yOffset - slabD, span, yOffset, `${slabThickness}`, 0.4);
      drawDim(0, yOffset + 0.4, 0.25 * span, yOffset + 0.4, 'L/4', 0.2);
      drawDim(span - 0.25 * span, yOffset + 0.4, span, yOffset + 0.4, 'L/4', 0.2);

      yOffset -= (slabD + 2.5);
    };

    drawSlabSection(slabLx, 'SECTION ALONG SHORT SPAN (Lx) - MAIN BARS (STRAIGHT & CRANKED)');
    drawSlabSection(slabLy, `SECTION ALONG LONG SPAN (Ly) - ${slabLy / slabLx < 2 ? 'TWO-WAY (MAIN BARS)' : 'ONE-WAY (DISTRIBUTION BARS)'}`);

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

    drawDim(0, yOffset - fD - 0.1, fW, yOffset - fD - 0.1, `${fW*1000} mm`, -0.5);
    drawDim(0, yOffset, 0, yOffset - fD, `${fD*1000} mm`, -0.5);

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
    drawDim(pX, yOffset, pX + fW, yOffset, `L = ${fW*1000} mm`, 0.5);
    drawDim(pX, yOffset - fW, pX, yOffset, `B = ${fW*1000} mm`, -0.5);
    
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
  };

  const currentColumn = selectedMemberType === 'Column' ? getColumnData(selectedMemberId) : null;
  const currentBeam = selectedMemberType === 'Beam' ? getBeamData(selectedMemberId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-3 border border-[#D1D1D1] rounded-sm shadow-sm">
        <div>
          <h3 className="font-bold text-[#004A99] uppercase text-xs">Generative Structural Detailing (IS-SP34)</h3>
          <p className="text-[10px] text-slate-500">True-to-scale generated drawings for all members compliant with IS 456, IS 13920 & SP 34</p>
        </div>
        <button
          onClick={exportDxf}
          className="px-3 py-1.5 bg-[#004A99] hover:bg-[#003366] text-white text-[10px] font-bold rounded flex items-center gap-1 transition-all"
        >
          ⬇️ Export All to DXF
        </button>
      </div>

      <div className="flex gap-3 h-[500px]">
        {/* Sidebar */}
        <div className="w-1/4 bg-white border border-[#D1D1D1] rounded-sm flex flex-col">
          <div className="flex border-b border-[#D1D1D1] text-[10px] font-bold">
            <button className={`flex-1 py-2 ${selectedMemberType === 'Column' ? 'bg-[#F4F8FC] text-[#004A99] border-b-2 border-[#004A99]' : 'text-slate-600 hover:bg-slate-50'}`} onClick={() => setSelectedMemberType('Column')}>Columns</button>
            <button className={`flex-1 py-2 ${selectedMemberType === 'Beam' ? 'bg-[#F4F8FC] text-[#004A99] border-b-2 border-[#004A99]' : 'text-slate-600 hover:bg-slate-50'}`} onClick={() => setSelectedMemberType('Beam')}>Beams</button>
            <button className={`flex-1 py-2 ${selectedMemberType === 'Slab' ? 'bg-[#F4F8FC] text-[#004A99] border-b-2 border-[#004A99]' : 'text-slate-600 hover:bg-slate-50'}`} onClick={() => setSelectedMemberType('Slab')}>Slabs</button>
            <button className={`flex-1 py-2 ${selectedMemberType === 'Foundation' ? 'bg-[#F4F8FC] text-[#004A99] border-b-2 border-[#004A99]' : 'text-slate-600 hover:bg-slate-50'}`} onClick={() => setSelectedMemberType('Foundation')}>Footings</button>
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-1">
            {selectedMemberType === 'Column' && columns.map(c => (
              <button key={c.id} onClick={() => setSelectedMemberId(c.id)} className={`w-full text-left px-2 py-1.5 text-[10px] rounded ${selectedMemberId === c.id ? 'bg-[#004A99] text-white' : 'hover:bg-slate-100 text-slate-700'}`}>
                {c.id} (L={getLength(c).toFixed(1)}m)
              </button>
            ))}
            {selectedMemberType === 'Beam' && beams.map(b => (
              <button key={b.id} onClick={() => setSelectedMemberId(b.id)} className={`w-full text-left px-2 py-1.5 text-[10px] rounded ${selectedMemberId === b.id ? 'bg-[#004A99] text-white' : 'hover:bg-slate-100 text-slate-700'}`}>
                {b.id} (Span={getLength(b).toFixed(1)}m)
              </button>
            ))}
            {selectedMemberType === 'Slab' && (
              <button className="w-full text-left px-2 py-1.5 text-[10px] rounded bg-[#004A99] text-white">
                Typical Slab Panel
              </button>
            )}
            {selectedMemberType === 'Foundation' && (
              <button className="w-full text-left px-2 py-1.5 text-[10px] rounded bg-[#004A99] text-white">
                Typical Foundation
              </button>
            )}
          </div>
        </div>

        {/* Viewer */}
        <div className="flex-1 bg-[#F9F9F9] border border-[#D1D1D1] rounded-sm p-4 flex flex-col relative overflow-auto">
          {selectedMemberType === 'Column' && currentColumn && (
            <div className="h-full flex flex-col items-center justify-center">
              <h4 className="font-bold text-[11px] mb-4 text-[#004A99]">COLUMN {currentColumn.id} - DETAILED ELEVATION & SECTION (SP 34)</h4>
              <div className="flex gap-16 items-center">
                {/* L-Section */}
                <div className="relative">
                  <svg width="120" height="350" viewBox="0 0 120 350" className="bg-white border border-slate-300 shadow-sm">
                    {/* Outline */}
                    <rect x="30" y="20" width="60" height="310" fill="none" stroke="#333" strokeWidth="2" />
                    {/* Main Bars */}
                    <line x1="38" y1="20" x2="38" y2="330" stroke="#1e3a8a" strokeWidth="3" />
                    <line x1="82" y1="20" x2="82" y2="330" stroke="#1e3a8a" strokeWidth="3" />
                    {/* Ties */}
                    {Array.from({length: Math.min(25, Math.floor((currentColumn.L) / currentColumn.tieSpacing))}).map((_, i) => (
                      <line key={i} x1="34" y1={30 + i * (310 / Math.min(25, Math.floor(currentColumn.L / currentColumn.tieSpacing)))} x2="86" y2={30 + i * (310 / Math.min(25, Math.floor(currentColumn.L / currentColumn.tieSpacing)))} stroke="#1e3a8a" strokeWidth="1.5" />
                    ))}
                  </svg>
                  <div className="absolute top-1/2 -right-32 text-[9px] text-slate-700 whitespace-nowrap">
                    <div>{currentColumn.mainCount} - Ø{currentColumn.mainDia} MAIN</div>
                    <div>Ø{currentColumn.tieDia} TIES @ {currentColumn.tieSpacing} c/c</div>
                    <div className="mt-2 font-bold text-slate-500">L = {currentColumn.L} mm</div>
                  </div>
                </div>

                {/* X-Section */}
                <div className="relative">
                  <svg width="200" height="200" viewBox="0 0 200 200" className="bg-white border border-slate-300 shadow-sm">
                    <rect x="40" y="50" width="120" height="100" fill="#f8fafc" stroke="#333" strokeWidth="2" />
                    <rect x="52" y="62" width="96" height="76" fill="none" stroke="#1e3a8a" strokeWidth="2" />
                    {/* Corner bars */}
                    <circle cx="56" cy="66" r="6" fill="#1e3a8a" />
                    <circle cx="144" cy="66" r="6" fill="#1e3a8a" />
                    <circle cx="56" cy="134" r="6" fill="#1e3a8a" />
                    <circle cx="144" cy="134" r="6" fill="#1e3a8a" />
                  </svg>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-slate-700 font-bold whitespace-nowrap">
                    CROSS SECTION ({currentColumn.D} x {currentColumn.B})
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedMemberType === 'Beam' && currentBeam && (
            <div className="h-full flex flex-col items-center justify-center w-full">
              <h4 className="font-bold text-[11px] mb-4 text-[#004A99]">BEAM {currentBeam.id} - LONGITUDINAL & CROSS SECTION (SP 34)</h4>
              <div className="w-full flex flex-col items-center gap-8">
                {/* L-Section */}
                <div className="relative w-full max-w-2xl">
                  <svg width="100%" height="150" viewBox="0 0 600 150" className="bg-white border border-slate-300 shadow-sm" preserveAspectRatio="xMidYMid meet">
                    {/* Outline */}
                    <rect x="20" y="30" width="560" height="90" fill="none" stroke="#333" strokeWidth="2" />
                    {/* Top Bars */}
                    <line x1="25" y1="45" x2="575" y2="45" stroke="#1e3a8a" strokeWidth="2.5" />
                    {/* Top Extra Bars */}
                    <line x1="25" y1="48" x2="180" y2="48" stroke="#e11d48" strokeWidth="2" />
                    <line x1="420" y1="48" x2="575" y2="48" stroke="#e11d48" strokeWidth="2" />
                    {/* Bottom Bars */}
                    <line x1="25" y1="105" x2="575" y2="105" stroke="#1e3a8a" strokeWidth="3" />
                    {/* Bottom Extra Bars */}
                    <line x1="90" y1="102" x2="510" y2="102" stroke="#e11d48" strokeWidth="2" />
                    {/* Stirrups */}
                    {Array.from({length: 30}).map((_, i) => (
                      <line key={i} x1={40 + i * (520/29)} y1="40" x2={40 + i * (520/29)} y2="110" stroke="#1e3a8a" strokeWidth="1" />
                    ))}
                  </svg>
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] text-slate-700 font-bold bg-white/80 px-2">
                    {currentBeam.topCount} - Ø{currentBeam.topDia} TOP BARS
                  </div>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-slate-700 font-bold bg-white/80 px-2">
                    {currentBeam.botCount} - Ø{currentBeam.botDia} BOTTOM BARS
                  </div>
                  <div className="absolute top-1/2 right-2 -translate-y-1/2 text-[9px] text-slate-700 bg-white/80 px-1">
                    Ø{currentBeam.stirrupDia} @ {currentBeam.stirrupSpacing}c/c
                  </div>
                </div>

                {/* X-Section */}
                <div className="relative">
                  <svg width="150" height="200" viewBox="0 0 150 200" className="bg-white border border-slate-300 shadow-sm">
                    <rect x="35" y="30" width="80" height="140" fill="#f8fafc" stroke="#333" strokeWidth="2" />
                    <rect x="45" y="40" width="60" height="120" fill="none" stroke="#1e3a8a" strokeWidth="2" />
                    {/* Top bars */}
                    <circle cx="50" cy="45" r="4" fill="#1e3a8a" />
                    <circle cx="100" cy="45" r="4" fill="#1e3a8a" />
                    {/* Bot bars */}
                    <circle cx="50" cy="155" r="5" fill="#1e3a8a" />
                    <circle cx="75" cy="155" r="5" fill="#1e3a8a" />
                    <circle cx="100" cy="155" r="5" fill="#1e3a8a" />
                  </svg>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-slate-700 font-bold whitespace-nowrap">
                    SECTION ({currentBeam.B} x {currentBeam.D})
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedMemberType === 'Slab' && (
            <div className="h-full flex flex-col items-center justify-center w-full gap-8 overflow-auto py-4">
              <h4 className="font-bold text-[11px] text-[#004A99]">TYPICAL SLAB PANEL DETAILING (IS 456 & SP 34)</h4>
              
              {/* Short Span Section */}
              <div className="w-full flex flex-col items-center">
                <h5 className="font-bold text-[10px] mb-2 text-slate-700">SECTION ALONG SHORT SPAN (Lx = {slabLx}m)</h5>
                <svg width="100%" height="150" viewBox="0 0 600 150" className="bg-white border border-slate-300 shadow-sm max-w-2xl" preserveAspectRatio="xMidYMid meet">
                  <rect x="20" y="50" width="560" height="40" fill="#f8fafc" stroke="#333" strokeWidth="2" />
                  <line x1="20" y1="50" x2="20" y2="110" stroke="#333" strokeWidth="3" strokeDasharray="5" />
                  <line x1="580" y1="50" x2="580" y2="110" stroke="#333" strokeWidth="3" strokeDasharray="5" />
                  
                  {/* Main Bars (Straight) */}
                  <line x1="25" y1="80" x2="575" y2="80" stroke="#1e3a8a" strokeWidth="2" />
                  {/* Main Bars (Cranked) */}
                  <path d="M 25 60 L 100 60 L 120 80 L 480 80 L 500 60 L 575 60" fill="none" stroke="#e11d48" strokeWidth="2" />
                  
                  {/* Distribution Bars */}
                  {Array.from({length: 25}).map((_, i) => (
                    <circle key={i} cx={50 + i * (500/24)} cy="76" r="3" fill="#166534" />
                  ))}
                  
                  <text x="250" y="40" fontSize="10" fill="#333" fontWeight="bold">Main Bars (Straight & Cranked Alternately)</text>
                  <text x="250" y="115" fontSize="10" fill="#166534" fontWeight="bold">Distribution Bars (Transverse)</text>
                </svg>
              </div>

              {/* Long Span Section */}
              <div className="w-full flex flex-col items-center">
                <h5 className="font-bold text-[10px] mb-2 text-slate-700">SECTION ALONG LONG SPAN (Ly = {slabLy}m) {slabLy / slabLx < 2 ? '(Two-Way)' : '(One-Way)'}</h5>
                <svg width="100%" height="150" viewBox="0 0 600 150" className="bg-white border border-slate-300 shadow-sm max-w-2xl" preserveAspectRatio="xMidYMid meet">
                  <rect x="20" y="50" width="560" height="40" fill="#f8fafc" stroke="#333" strokeWidth="2" />
                  <line x1="20" y1="50" x2="20" y2="110" stroke="#333" strokeWidth="3" strokeDasharray="5" />
                  <line x1="580" y1="50" x2="580" y2="110" stroke="#333" strokeWidth="3" strokeDasharray="5" />
                  
                  {slabLy / slabLx < 2 ? (
                    <>
                      <line x1="25" y1="76" x2="575" y2="76" stroke="#166534" strokeWidth="2" />
                      <path d="M 25 60 L 100 60 L 120 76 L 480 76 L 500 60 L 575 60" fill="none" stroke="#059669" strokeWidth="2" />
                      {Array.from({length: 25}).map((_, i) => (
                        <circle key={i} cx={50 + i * (500/24)} cy="80" r="3" fill="#1e3a8a" />
                      ))}
                      <text x="250" y="40" fontSize="10" fill="#166534" fontWeight="bold">Main Bars Ly (Straight & Cranked)</text>
                      <text x="250" y="115" fontSize="10" fill="#1e3a8a" fontWeight="bold">Main Bars Lx (Transverse)</text>
                    </>
                  ) : (
                    <>
                      <line x1="25" y1="80" x2="575" y2="80" stroke="#166534" strokeWidth="2" />
                      {Array.from({length: 25}).map((_, i) => (
                        <circle key={i} cx={50 + i * (500/24)} cy="76" r="3" fill="#1e3a8a" />
                      ))}
                      <text x="250" y="40" fontSize="10" fill="#166534" fontWeight="bold">Distribution Bars (Straight)</text>
                      <text x="250" y="115" fontSize="10" fill="#1e3a8a" fontWeight="bold">Main Bars Lx (Transverse)</text>
                    </>
                  )}
                </svg>
              </div>
            </div>
          )}

          {selectedMemberType === 'Foundation' && (
            <div className="h-full flex flex-col items-center justify-center w-full gap-8 overflow-auto py-4">
              <h4 className="font-bold text-[11px] text-[#004A99]">TYPICAL FOUNDATION DETAILING (SP 34)</h4>
              
              <div className="flex gap-8 items-center justify-center flex-wrap">
                {/* Cross Section */}
                <div className="flex flex-col items-center">
                  <h5 className="font-bold text-[10px] mb-2 text-slate-700">ELEVATION (CROSS SECTION)</h5>
                  <svg width="350" height="250" viewBox="0 0 400 250" className="bg-white border border-slate-300 shadow-sm" preserveAspectRatio="xMidYMid meet">
                    <line x1="20" y1="30" x2="380" y2="30" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="8,8" />
                    <text x="25" y="25" fontSize="10" fill="#8b5cf6">GL (Ground Level)</text>
                    
                    {/* Pad */}
                    <path d="M 50 200 L 350 200 L 350 170 L 250 120 L 250 30 L 150 30 L 150 120 L 50 170 Z" fill="#f8fafc" stroke="#333" strokeWidth="2" />
                    
                    {/* Mesh */}
                    <line x1="65" y1="185" x2="335" y2="185" stroke="#1e3a8a" strokeWidth="3" />
                    <line x1="65" y1="185" x2="65" y2="165" stroke="#1e3a8a" strokeWidth="3" />
                    <line x1="335" y1="185" x2="335" y2="165" stroke="#1e3a8a" strokeWidth="3" />
                    
                    {Array.from({length: 15}).map((_, i) => (
                      <circle key={i} cx={85 + i * 16.4} cy="180" r="3" fill="#1e3a8a" />
                    ))}
                    
                    {/* Column Starter */}
                    <path d="M 170 180 L 190 180 L 190 20" fill="none" stroke="#e11d48" strokeWidth="3" />
                    <path d="M 230 180 L 210 180 L 210 20" fill="none" stroke="#e11d48" strokeWidth="3" />

                    <text x="260" y="80" fontSize="10" fill="#e11d48" fontWeight="bold">Column Starter</text>
                    <text x="260" y="225" fontSize="10" fill="#1e3a8a" fontWeight="bold">Bottom Mesh (Both ways)</text>
                  </svg>
                </div>

                {/* Plan View */}
                <div className="flex flex-col items-center">
                  <h5 className="font-bold text-[10px] mb-2 text-slate-700">PLAN VIEW</h5>
                  <svg width="250" height="250" viewBox="0 0 250 250" className="bg-white border border-slate-300 shadow-sm" preserveAspectRatio="xMidYMid meet">
                    {/* Footing Pad */}
                    <rect x="25" y="25" width="200" height="200" fill="#f8fafc" stroke="#333" strokeWidth="2" />
                    
                    {/* Mesh X */}
                    {Array.from({length: 11}).map((_, i) => (
                      <line key={`x-${i}`} x1="35" y1={35 + i * 18} x2="215" y2={35 + i * 18} stroke="#1e3a8a" strokeWidth="1.5" opacity="0.6" />
                    ))}
                    
                    {/* Mesh Y */}
                    {Array.from({length: 11}).map((_, i) => (
                      <line key={`y-${i}`} x1={35 + i * 18} y1="35" x2={35 + i * 18} y2="215" stroke="#1e3a8a" strokeWidth="1.5" opacity="0.6" />
                    ))}

                    {/* Column Neck */}
                    <rect x="100" y="100" width="50" height="50" fill="#e2e8f0" stroke="#333" strokeWidth="2" />
                    
                    {/* Column Bars */}
                    <circle cx="106" cy="106" r="3" fill="#e11d48" />
                    <circle cx="144" cy="106" r="3" fill="#e11d48" />
                    <circle cx="106" cy="144" r="3" fill="#e11d48" />
                    <circle cx="144" cy="144" r="3" fill="#e11d48" />
                    
                    <text x="125" y="128" fontSize="10" fill="#333" fontWeight="bold" textAnchor="middle">COL</text>
                    
                    {/* Dimensions */}
                    <line x1="25" y1="15" x2="225" y2="15" stroke="#555" strokeWidth="1" />
                    <line x1="25" y1="10" x2="25" y2="20" stroke="#555" strokeWidth="1" />
                    <line x1="225" y1="10" x2="225" y2="20" stroke="#555" strokeWidth="1" />
                    <text x="125" y="10" fontSize="8" fill="#555" textAnchor="middle">L</text>

                    <line x1="15" y1="25" x2="15" y2="225" stroke="#555" strokeWidth="1" />
                    <line x1="10" y1="25" x2="20" y2="25" stroke="#555" strokeWidth="1" />
                    <line x1="10" y1="225" x2="20" y2="225" stroke="#555" strokeWidth="1" />
                    <text x="5" y="125" fontSize="8" fill="#555" transform="rotate(-90 5 125)" textAnchor="middle">B</text>
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

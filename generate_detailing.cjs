const fs = require('fs');

const code = `import React, { useState, useMemo } from 'react';
import DxfWriter from 'dxf-writer';

interface DetailingProps {
  beams: any[];
  columns: any[];
  sections: any[];
  bbsRows: any[];
  fdnReport: any;
  slabLx: number;
  slabLy: number;
  slabThickness: number;
}

export const StructuralDetailing: React.FC<DetailingProps> = ({ beams, columns, sections, bbsRows, fdnReport, slabLx, slabLy, slabThickness }) => {
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
      L: col.length * 1000,
      B: sec.width * 1000,
      D: sec.depth * 1000,
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
      L: beam.length * 1000,
      B: sec.width * 1000,
      D: sec.depth * 1000,
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
    
    let yOffset = 0;
    const drawLabel = (x: number, y: number, text: string) => {
      dxf.drawText(x, y, 0.15, 0, text);
    };

    // Columns DXF
    columns.forEach(col => {
      const data = getColumnData(col.id);
      if(!data) return;
      const H = data.L / 1000;
      const B = data.B / 1000;
      const D = data.D / 1000;
      const cov = data.cover / 1000;
      
      dxf.drawText(0, yOffset, 0.3, 0, \`COLUMN \${data.id} DETAILING (IS 13920 & SP34)\`);
      yOffset -= 0.5;
      
      // L-Section
      dxf.drawRect(0, yOffset - H, D, yOffset);
      dxf.drawLine(cov, yOffset - H, cov, yOffset);
      dxf.drawLine(D - cov, yOffset - H, D - cov, yOffset);
      
      let currY = yOffset - cov;
      const sp = data.tieSpacing / 1000;
      while(currY > yOffset - H + cov) {
        dxf.drawLine(cov, currY, D - cov, currY);
        currY -= sp;
      }
      
      drawLabel(D + 0.2, yOffset - H/2, \`\${data.mainCount} - Ø\${data.mainDia} MAIN BARS\`);
      drawLabel(D + 0.2, yOffset - H/2 - 0.2, \`Ø\${data.tieDia} TIES @ \${data.tieSpacing} c/c\`);

      // X-Section
      const xX = D + 3;
      dxf.drawRect(xX, yOffset - B, xX + D, yOffset);
      dxf.drawRect(xX + cov, yOffset - B + cov, xX + D - cov, yOffset - cov);
      // Main bars (corners)
      dxf.drawCircle(xX + cov + 0.01, yOffset - cov - 0.01, 0.01);
      dxf.drawCircle(xX + D - cov - 0.01, yOffset - cov - 0.01, 0.01);
      dxf.drawCircle(xX + cov + 0.01, yOffset - B + cov + 0.01, 0.01);
      dxf.drawCircle(xX + D - cov - 0.01, yOffset - B + cov + 0.01, 0.01);
      drawLabel(xX, yOffset - B - 0.3, \`CROSS SECTION (\${data.D}x\${data.B})\`);

      yOffset -= (H + 2);
    });

    // Beams DXF
    beams.forEach(beam => {
      const data = getBeamData(beam.id);
      if(!data) return;
      const L = data.L / 1000;
      const B = data.B / 1000;
      const D = data.D / 1000;
      const cov = data.cover / 1000;

      dxf.drawText(0, yOffset, 0.3, 0, \`BEAM \${data.id} DETAILING (IS 13920 & SP34)\`);
      yOffset -= 0.5;

      // L-Section
      dxf.drawRect(0, yOffset - D, L, yOffset);
      dxf.drawLine(cov, yOffset - cov, L - cov, yOffset - cov); // Top
      dxf.drawLine(cov, yOffset - D + cov, L - cov, yOffset - D + cov); // Bottom
      
      let currX = cov + 0.05;
      const sp = data.stirrupSpacing / 1000;
      while(currX < L - cov) {
        dxf.drawLine(currX, yOffset - D + cov, currX, yOffset - cov);
        currX += sp;
      }
      
      drawLabel(L/2, yOffset + 0.2, \`\${data.topCount} - Ø\${data.topDia} TOP ANCHOR BARS\`);
      drawLabel(L/2, yOffset - D - 0.3, \`\${data.botCount} - Ø\${data.botDia} BOTTOM TENSION BARS\`);
      drawLabel(L + 0.2, yOffset - D/2, \`Ø\${data.stirrupDia} STIRRUPS @ \${data.stirrupSpacing} c/c\`);

      yOffset -= (D + 2);
    });

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
            <button className={\`flex-1 py-2 \${selectedMemberType === 'Column' ? 'bg-[#F4F8FC] text-[#004A99] border-b-2 border-[#004A99]' : 'text-slate-600 hover:bg-slate-50'}\`} onClick={() => setSelectedMemberType('Column')}>Columns</button>
            <button className={\`flex-1 py-2 \${selectedMemberType === 'Beam' ? 'bg-[#F4F8FC] text-[#004A99] border-b-2 border-[#004A99]' : 'text-slate-600 hover:bg-slate-50'}\`} onClick={() => setSelectedMemberType('Beam')}>Beams</button>
            <button className={\`flex-1 py-2 \${selectedMemberType === 'Slab' ? 'bg-[#F4F8FC] text-[#004A99] border-b-2 border-[#004A99]' : 'text-slate-600 hover:bg-slate-50'}\`} onClick={() => setSelectedMemberType('Slab')}>Slabs</button>
            <button className={\`flex-1 py-2 \${selectedMemberType === 'Foundation' ? 'bg-[#F4F8FC] text-[#004A99] border-b-2 border-[#004A99]' : 'text-slate-600 hover:bg-slate-50'}\`} onClick={() => setSelectedMemberType('Foundation')}>Footings</button>
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-1">
            {selectedMemberType === 'Column' && columns.map(c => (
              <button key={c.id} onClick={() => setSelectedMemberId(c.id)} className={\`w-full text-left px-2 py-1.5 text-[10px] rounded \${selectedMemberId === c.id ? 'bg-[#004A99] text-white' : 'hover:bg-slate-100 text-slate-700'}\`}>
                {c.id} (L={c.length.toFixed(1)}m)
              </button>
            ))}
            {selectedMemberType === 'Beam' && beams.map(b => (
              <button key={b.id} onClick={() => setSelectedMemberId(b.id)} className={\`w-full text-left px-2 py-1.5 text-[10px] rounded \${selectedMemberId === b.id ? 'bg-[#004A99] text-white' : 'hover:bg-slate-100 text-slate-700'}\`}>
                {b.id} (Span={b.length.toFixed(1)}m)
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
                    {/* Bottom Bars */}
                    <line x1="25" y1="105" x2="575" y2="105" stroke="#1e3a8a" strokeWidth="3" />
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
            <div className="h-full flex flex-col items-center justify-center w-full">
              <h4 className="font-bold text-[11px] mb-4 text-[#004A99]">TYPICAL SLAB PANEL - CROSS SECTION (SP 34)</h4>
              <svg width="100%" height="200" viewBox="0 0 600 200" className="bg-white border border-slate-300 shadow-sm max-w-2xl" preserveAspectRatio="xMidYMid meet">
                <rect x="20" y="80" width="560" height="40" fill="#f8fafc" stroke="#333" strokeWidth="2" />
                <line x1="20" y1="80" x2="20" y2="140" stroke="#333" strokeWidth="3" strokeDasharray="5" />
                <line x1="580" y1="80" x2="580" y2="140" stroke="#333" strokeWidth="3" strokeDasharray="5" />
                
                <line x1="25" y1="110" x2="575" y2="110" stroke="#1e3a8a" strokeWidth="2" />
                <path d="M 25 90 L 100 90 L 120 110 L 480 110 L 500 90 L 575 90" fill="none" stroke="#e11d48" strokeWidth="2" />
                
                {Array.from({length: 25}).map((_, i) => (
                  <circle key={i} cx={50 + i * (500/24)} cy="106" r="3" fill="#166534" />
                ))}
                
                <text x="250" y="70" fontSize="12" fill="#333" fontWeight="bold">Main Bars (Straight & Cranked Alternately)</text>
                <text x="250" y="145" fontSize="12" fill="#166534" fontWeight="bold">Distribution Bars (Transverse)</text>
              </svg>
            </div>
          )}

          {selectedMemberType === 'Foundation' && (
            <div className="h-full flex flex-col items-center justify-center w-full">
              <h4 className="font-bold text-[11px] mb-4 text-[#004A99]">TYPICAL FOUNDATION - CROSS SECTION (SP 34)</h4>
              <svg width="100%" height="300" viewBox="0 0 400 300" className="bg-white border border-slate-300 shadow-sm max-w-lg" preserveAspectRatio="xMidYMid meet">
                <line x1="20" y1="50" x2="380" y2="50" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="8,8" />
                <text x="25" y="45" fontSize="10" fill="#8b5cf6">GL (Ground Level)</text>
                
                {/* Pad */}
                <path d="M 50 250 L 350 250 L 350 210 L 250 150 L 250 50 L 150 50 L 150 150 L 50 210 Z" fill="#f8fafc" stroke="#333" strokeWidth="2" />
                
                {/* Mesh */}
                <line x1="65" y1="235" x2="335" y2="235" stroke="#1e3a8a" strokeWidth="3" />
                <line x1="65" y1="235" x2="65" y2="215" stroke="#1e3a8a" strokeWidth="3" />
                <line x1="335" y1="235" x2="335" y2="215" stroke="#1e3a8a" strokeWidth="3" />
                
                {Array.from({length: 15}).map((_, i) => (
                  <circle key={i} cx={85 + i * 16.4} cy="230" r="3" fill="#1e3a8a" />
                ))}
                
                {/* Column Starter */}
                <path d="M 170 230 L 190 230 L 190 30" fill="none" stroke="#e11d48" strokeWidth="3" />
                <path d="M 230 230 L 210 230 L 210 30" fill="none" stroke="#e11d48" strokeWidth="3" />

                <text x="260" y="100" fontSize="10" fill="#e11d48" fontWeight="bold">Column Starter</text>
                <text x="260" y="275" fontSize="10" fill="#1e3a8a" fontWeight="bold">Bottom Mesh (Both ways)</text>
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
`

fs.writeFileSync('src/components/StructuralDetailing.tsx', code);

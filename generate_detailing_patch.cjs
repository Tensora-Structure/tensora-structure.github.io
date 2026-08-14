const fs = require('fs');

let code = fs.readFileSync('src/components/StructuralDetailing.tsx', 'utf8');

// Replace Slab Section
const oldSlabSection = `{selectedMemberType === 'Slab' && (
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
          )}`;

const newSlabSection = `{selectedMemberType === 'Slab' && (
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
          )}`;

// Replace Foundation Section
const oldFdnSection = `{selectedMemberType === 'Foundation' && (
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
          )}`;

const newFdnSection = `{selectedMemberType === 'Foundation' && (
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
                      <line key={\`x-\${i}\`} x1="35" y1={35 + i * 18} x2="215" y2={35 + i * 18} stroke="#1e3a8a" strokeWidth="1.5" opacity="0.6" />
                    ))}
                    
                    {/* Mesh Y */}
                    {Array.from({length: 11}).map((_, i) => (
                      <line key={\`y-\${i}\`} x1={35 + i * 18} y1="35" x2={35 + i * 18} y2="215" stroke="#1e3a8a" strokeWidth="1.5" opacity="0.6" />
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
          )}`;

code = code.replace(oldSlabSection, newSlabSection);
code = code.replace(oldFdnSection, newFdnSection);

// Fix the DXF Slab and Foundation sections to include both views as well
const oldDxfSlabAndFdn = `    // Slabs DXF
    dxf.drawText(0, yOffset, 0.3, 0, 'TYPICAL SLAB PANEL DETAILING (IS 456 & SP34)');
    yOffset -= 0.5;
    const slabL = slabLx;
    const slabD = slabThickness / 1000;
    dxf.drawRect(0, yOffset - slabD, slabL, yOffset);
    dxf.drawLine(0, yOffset - slabD, -0.2, yOffset - slabD); // cut
    dxf.drawLine(slabL, yOffset - slabD, slabL + 0.2, yOffset - slabD); // cut
    dxf.drawLine(0, yOffset, -0.2, yOffset); // cut
    dxf.drawLine(slabL, yOffset, slabL + 0.2, yOffset); // cut
    
    // Main straight
    dxf.drawLine(0.05, yOffset - slabD + 0.03, slabL - 0.05, yOffset - slabD + 0.03);
    // Main cranked
    dxf.drawLine(0.05, yOffset - 0.03, 0.2 * slabL, yOffset - 0.03); // Top anchor
    dxf.drawLine(0.2 * slabL, yOffset - 0.03, 0.25 * slabL, yOffset - slabD + 0.03); // Crank
    dxf.drawLine(0.25 * slabL, yOffset - slabD + 0.03, 0.75 * slabL, yOffset - slabD + 0.03); // Bottom
    dxf.drawLine(0.75 * slabL, yOffset - slabD + 0.03, 0.8 * slabL, yOffset - 0.03); // Crank
    dxf.drawLine(0.8 * slabL, yOffset - 0.03, slabL - 0.05, yOffset - 0.03); // Top anchor
    
    // Distribution bars
    let currSlabX = 0.1;
    while(currSlabX < slabL - 0.1) {
      dxf.drawCircle(currSlabX, yOffset - slabD + 0.04, 0.005);
      currSlabX += 0.2; // 200mm c/c typical
    }
    drawLabel(slabL / 2, yOffset + 0.1, 'MAIN BARS (STRAIGHT & CRANKED ALT) Ø10 @ 150 c/c');
    drawLabel(slabL / 2, yOffset - slabD - 0.1, 'DISTRIBUTION BARS Ø8 @ 200 c/c');
    yOffset -= (slabD + 1);

    // Foundation DXF
    dxf.drawText(0, yOffset, 0.3, 0, 'TYPICAL FOUNDATION DETAILING (SP34)');
    yOffset -= 0.5;
    const fW = 1.5;
    const fD = 0.4;
    const fSlopeD = 0.2;
    dxf.drawLine(-0.5, yOffset, fW + 0.5, yOffset); // GL
    drawLabel(-0.4, yOffset + 0.1, 'GL');
    yOffset -= 1.5; // depth to footing
    
    // Pad
    dxf.drawLine(0, yOffset - fD, fW, yOffset - fD); // bottom
    dxf.drawLine(0, yOffset - fD, 0, yOffset - fD + 0.15); // edge
    dxf.drawLine(fW, yOffset - fD, fW, yOffset - fD + 0.15); // edge
    dxf.drawLine(0, yOffset - fD + 0.15, fW/2 - 0.2, yOffset); // slope
    dxf.drawLine(fW, yOffset - fD + 0.15, fW/2 + 0.2, yOffset); // slope
    
    // Column neck
    dxf.drawLine(fW/2 - 0.2, yOffset, fW/2 - 0.2, yOffset + 1.5);
    dxf.drawLine(fW/2 + 0.2, yOffset, fW/2 + 0.2, yOffset + 1.5);

    // Mesh
    const covF = 0.05;
    dxf.drawLine(covF, yOffset - fD + covF, fW - covF, yOffset - fD + covF);
    let currFx = covF + 0.05;
    while(currFx < fW - covF - 0.05) {
      dxf.drawCircle(currFx, yOffset - fD + covF + 0.01, 0.005);
      currFx += 0.15;
    }
    
    // Starters
    dxf.drawLine(fW/2 - 0.15, yOffset + 1.5, fW/2 - 0.15, yOffset - fD + covF);
    dxf.drawLine(fW/2 - 0.15, yOffset - fD + covF, fW/2 - 0.4, yOffset - fD + covF); // L bend
    
    dxf.drawLine(fW/2 + 0.15, yOffset + 1.5, fW/2 + 0.15, yOffset - fD + covF);
    dxf.drawLine(fW/2 + 0.15, yOffset - fD + covF, fW/2 + 0.4, yOffset - fD + covF); // L bend
    
    drawLabel(fW/2, yOffset - fD - 0.2, 'BOTTOM MESH Ø12 @ 150 c/c (BOTH WAYS)');
    drawLabel(fW + 0.2, yOffset - fD/2, 'STARTER BARS L-BEND = 300mm');
    yOffset -= (fD + 1);`;

const newDxfSlabAndFdn = `    // Slabs DXF
    dxf.drawText(0, yOffset, 0.3, 0, 'TYPICAL SLAB PANEL DETAILING (IS 456 & SP34)');
    yOffset -= 0.5;
    
    const slabD = slabThickness / 1000;
    const drawSlabSection = (span, label) => {
      dxf.drawRect(0, yOffset - slabD, span, yOffset);
      dxf.drawLine(0, yOffset - slabD, -0.2, yOffset - slabD); // cut
      dxf.drawLine(span, yOffset - slabD, span + 0.2, yOffset - slabD); // cut
      dxf.drawLine(0, yOffset, -0.2, yOffset); // cut
      dxf.drawLine(span, yOffset, span + 0.2, yOffset); // cut
      
      // Main straight
      dxf.drawLine(0.05, yOffset - slabD + 0.03, span - 0.05, yOffset - slabD + 0.03);
      // Main cranked
      dxf.drawLine(0.05, yOffset - 0.03, 0.2 * span, yOffset - 0.03); // Top anchor
      dxf.drawLine(0.2 * span, yOffset - 0.03, 0.25 * span, yOffset - slabD + 0.03); // Crank
      dxf.drawLine(0.25 * span, yOffset - slabD + 0.03, 0.75 * span, yOffset - slabD + 0.03); // Bottom
      dxf.drawLine(0.75 * span, yOffset - slabD + 0.03, 0.8 * span, yOffset - 0.03); // Crank
      dxf.drawLine(0.8 * span, yOffset - 0.03, span - 0.05, yOffset - 0.03); // Top anchor
      
      // Transverse bars
      let currSlabX = 0.1;
      while(currSlabX < span - 0.1) {
        dxf.drawCircle(currSlabX, yOffset - slabD + 0.04, 0.005);
        currSlabX += 0.2; // 200mm c/c typical
      }
      drawLabel(span / 2, yOffset + 0.1, label);
      yOffset -= (slabD + 1.5);
    };

    drawSlabSection(slabLx, 'SECTION ALONG SHORT SPAN (Lx) - MAIN BARS (STRAIGHT & CRANKED)');
    drawSlabSection(slabLy, \`SECTION ALONG LONG SPAN (Ly) - \${slabLy / slabLx < 2 ? 'TWO-WAY (MAIN)' : 'ONE-WAY (DISTRIBUTION)'}\`);

    // Foundation DXF
    dxf.drawText(0, yOffset, 0.3, 0, 'TYPICAL FOUNDATION DETAILING (SP34)');
    yOffset -= 0.5;
    
    // Cross Section
    const fW = 1.5;
    const fD = 0.4;
    dxf.drawLine(-0.5, yOffset, fW + 0.5, yOffset); // GL
    drawLabel(-0.4, yOffset + 0.1, 'GL');
    yOffset -= 1.5; // depth to footing
    
    // Pad
    dxf.drawLine(0, yOffset - fD, fW, yOffset - fD); // bottom
    dxf.drawLine(0, yOffset - fD, 0, yOffset - fD + 0.15); // edge
    dxf.drawLine(fW, yOffset - fD, fW, yOffset - fD + 0.15); // edge
    dxf.drawLine(0, yOffset - fD + 0.15, fW/2 - 0.2, yOffset); // slope
    dxf.drawLine(fW, yOffset - fD + 0.15, fW/2 + 0.2, yOffset); // slope
    
    // Column neck
    dxf.drawLine(fW/2 - 0.2, yOffset, fW/2 - 0.2, yOffset + 1.5);
    dxf.drawLine(fW/2 + 0.2, yOffset, fW/2 + 0.2, yOffset + 1.5);

    // Mesh
    const covF = 0.05;
    dxf.drawLine(covF, yOffset - fD + covF, fW - covF, yOffset - fD + covF);
    let currFx = covF + 0.05;
    while(currFx < fW - covF - 0.05) {
      dxf.drawCircle(currFx, yOffset - fD + covF + 0.01, 0.005);
      currFx += 0.15;
    }
    
    // Starters
    dxf.drawLine(fW/2 - 0.15, yOffset + 1.5, fW/2 - 0.15, yOffset - fD + covF);
    dxf.drawLine(fW/2 - 0.15, yOffset - fD + covF, fW/2 - 0.4, yOffset - fD + covF); // L bend
    
    dxf.drawLine(fW/2 + 0.15, yOffset + 1.5, fW/2 + 0.15, yOffset - fD + covF);
    dxf.drawLine(fW/2 + 0.15, yOffset - fD + covF, fW/2 + 0.4, yOffset - fD + covF); // L bend
    
    drawLabel(fW/2, yOffset - fD - 0.2, 'ELEVATION (CROSS SECTION)');
    drawLabel(fW + 0.2, yOffset - fD/2 + 0.3, 'STARTER BARS');
    drawLabel(fW + 0.2, yOffset - fD/2, 'BOTTOM MESH');
    yOffset -= (fD + 1);

    // Plan View
    dxf.drawRect(0, yOffset - fW, fW, yOffset); // pad
    dxf.drawRect(fW/2 - 0.2, yOffset - fW/2 - 0.2, fW/2 + 0.2, yOffset - fW/2 + 0.2); // column
    
    // Mesh Grid (X and Y)
    let planMesh = covF + 0.05;
    while(planMesh < fW - covF - 0.05) {
      dxf.drawLine(covF, yOffset - planMesh, fW - covF, yOffset - planMesh);
      dxf.drawLine(planMesh, yOffset - covF, planMesh, yOffset - fW + covF);
      planMesh += 0.15;
    }
    drawLabel(fW/2, yOffset - fW - 0.3, 'PLAN VIEW');
    yOffset -= (fW + 1);`;

if (code.includes('// Slabs DXF')) {
    const startIndex = code.indexOf('// Slabs DXF');
    const endIndex = code.indexOf('const dxfString = dxf.toDxfString();');
    
    if (startIndex !== -1 && endIndex !== -1) {
        code = code.substring(0, startIndex) + newDxfSlabAndFdn + '\n    ' + code.substring(endIndex);
    }
}
fs.writeFileSync('src/components/StructuralDetailing.tsx', code);

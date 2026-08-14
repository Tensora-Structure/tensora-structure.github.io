const fs = require('fs');
let code = fs.readFileSync('src/components/StructuralDetailing.tsx', 'utf8');

// 1. Column DXF Hooks
code = code.replace(
`      // Hooks for ties (135 deg) SP34
      const hookLen = 12 * tieDia;
      dxf.drawLine(xX + tieOff, yOffset - tieOff, xX + tieOff + hookLen * 0.707, yOffset - tieOff - hookLen * 0.707);
      dxf.drawLine(xX + tieOff, yOffset - tieOff, xX + tieOff + hookLen * 0.707 + 0.01, yOffset - tieOff - hookLen * 0.707);`,
`      // Hooks for ties (135 deg)
      dxf.drawLine(xX + tieOff, yOffset - tieOff, xX + tieOff + 0.05, yOffset - tieOff - 0.05);
      dxf.drawLine(xX + tieOff, yOffset - tieOff, xX + tieOff + 0.05, yOffset - tieOff - 0.02);`
);

// 2. Beam DXF Bends
const badBeamDxf = `      // Top continuous (Anchor)
      dxf.drawLine(topOff, yOffset - topOff, L - topOff, yOffset - topOff);
      // Top L-bends with 90deg inside bend
      dxf.drawLine(topOff, yOffset - topOff, topOff, yOffset - topOff - ldTop);
      dxf.drawLine(topOff, yOffset - topOff - ldTop, topOff + 12 * topDia, yOffset - topOff - ldTop);
      dxf.drawLine(L - topOff, yOffset - topOff, L - topOff, yOffset - topOff - ldTop);
      dxf.drawLine(L - topOff, yOffset - topOff - ldTop, L - topOff - 12 * topDia, yOffset - topOff - ldTop);
      
      // Top Extra Support (Curtailment at 0.3L with 45deg inside bend)
      dxf.drawLine(topOff, yOffset - topOff - 0.03, 0.3 * L, yOffset - topOff - 0.03);
      dxf.drawLine(0.3 * L, yOffset - topOff - 0.03, 0.3 * L - 0.05, yOffset - topOff - 0.03 - 0.05); // 45 deg hook
      dxf.drawLine(L - 0.3 * L, yOffset - topOff - 0.03, L - topOff, yOffset - topOff - 0.03);
      dxf.drawLine(L - 0.3 * L, yOffset - topOff - 0.03, L - 0.3 * L + 0.05, yOffset - topOff - 0.03 - 0.05); // 45 deg hook
      
      // Bottom continuous
      dxf.drawLine(botOff, yOffset - D + botOff, L - botOff, yOffset - D + botOff);
      // Bottom L-bends with 90deg inside bend
      dxf.drawLine(botOff, yOffset - D + botOff, botOff, yOffset - D + botOff + ldBot);
      dxf.drawLine(botOff, yOffset - D + botOff + ldBot, botOff + 12 * botDia, yOffset - D + botOff + ldBot);
      dxf.drawLine(L - botOff, yOffset - D + botOff, L - botOff, yOffset - D + botOff + ldBot);
      dxf.drawLine(L - botOff, yOffset - D + botOff + ldBot, L - botOff - 12 * botDia, yOffset - D + botOff + ldBot);
      
      // Bottom extra mid-span (Curtailment at 0.15L from ends with 45deg inside bend)
      dxf.drawLine(0.15 * L, yOffset - D + botOff + 0.03, 0.85 * L, yOffset - D + botOff + 0.03);
      dxf.drawLine(0.15 * L, yOffset - D + botOff + 0.03, 0.15 * L - 0.05, yOffset - D + botOff + 0.03 + 0.05); // 45 deg hook
      dxf.drawLine(0.85 * L, yOffset - D + botOff + 0.03, 0.85 * L + 0.05, yOffset - D + botOff + 0.03 + 0.05); // 45 deg hook`;

const goodBeamDxf = `      // Top continuous (Anchor)
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

code = code.replace(badBeamDxf, goodBeamDxf);

// 3. Beam DXF Hooks
const badBeamDxfHooks = `      // Hooks for ties (135 deg)
      dxf.drawLine(xX1 + tieOff, yOffset - tieOff, xX1 + tieOff + hookLen * 0.707, yOffset - tieOff - hookLen * 0.707);
      dxf.drawLine(xX1 + tieOff, yOffset - tieOff, xX1 + tieOff + hookLen * 0.707 + 0.01, yOffset - tieOff - hookLen * 0.707);`;
const goodBeamDxfHooks = `      // Hooks for ties (135 deg)
      dxf.drawLine(xX1 + tieOff, yOffset - tieOff, xX1 + tieOff + 0.05, yOffset - tieOff - 0.05);
      dxf.drawLine(xX1 + tieOff, yOffset - tieOff, xX1 + tieOff + 0.05, yOffset - tieOff - 0.02);`;
code = code.replace(badBeamDxfHooks, goodBeamDxfHooks);

const badBeamDxfHooks2 = `      // Hooks for ties (135 deg)
      dxf.drawLine(xX2 + tieOff, yOffset - tieOff, xX2 + tieOff + hookLen * 0.707, yOffset - tieOff - hookLen * 0.707);`;
const goodBeamDxfHooks2 = `      // Hooks for ties (135 deg)
      dxf.drawLine(xX2 + tieOff, yOffset - tieOff, xX2 + tieOff + 0.05, yOffset - tieOff - 0.05);`;
code = code.replace(badBeamDxfHooks2, goodBeamDxfHooks2);

// 4. SVG Beams
const badSvgBeams = `                    {/* Top Bars (with 90deg inside bends at corners) */}
                    <path d="M 45 70 L 25 70 L 25 45 L 575 45 L 575 70 L 555 70" fill="none" stroke="#1e3a8a" strokeWidth="2.5" />
                    {/* Top Extra Bars (with 45deg inside bends for curtailment) */}
                    <path d="M 25 48 L 180 48 L 170 58" fill="none" stroke="#e11d48" strokeWidth="2" />
                    <path d="M 575 48 L 420 48 L 430 58" fill="none" stroke="#e11d48" strokeWidth="2" />
                    {/* Bottom Bars (with 90deg inside bends at corners) */}
                    <path d="M 45 80 L 25 80 L 25 105 L 575 105 L 575 80 L 555 80" fill="none" stroke="#1e3a8a" strokeWidth="3" />
                    {/* Bottom Extra Bars (with 45deg inside bends for curtailment) */}
                    <path d="M 110 95 L 120 102 L 480 102 L 490 95" fill="none" stroke="#e11d48" strokeWidth="2" />`;

const goodSvgBeams = `                    {/* Top Bars */}
                    <path d="M 25 70 L 25 45 L 575 45 L 575 70" fill="none" stroke="#1e3a8a" strokeWidth="2.5" />
                    {/* Top Extra Bars */}
                    <line x1="25" y1="48" x2="180" y2="48" stroke="#e11d48" strokeWidth="2" />
                    <line x1="420" y1="48" x2="575" y2="48" stroke="#e11d48" strokeWidth="2" />
                    {/* Bottom Bars */}
                    <path d="M 25 80 L 25 105 L 575 105 L 575 80" fill="none" stroke="#1e3a8a" strokeWidth="3" />
                    {/* Bottom Extra Bars */}
                    <line x1="90" y1="102" x2="510" y2="102" stroke="#e11d48" strokeWidth="2" />`;

code = code.replace(badSvgBeams, goodSvgBeams);

// 5. SVG Columns
const badSvgCols = `                    {/* Main Bars */}
                    <path d="M 20 330 L 38 330 L 38 20" fill="none" stroke="#1e3a8a" strokeWidth="3" />
                    <path d="M 100 330 L 82 330 L 82 20" fill="none" stroke="#1e3a8a" strokeWidth="3" />`;
const goodSvgCols = `                    {/* Main Bars */}
                    <line x1="38" y1="20" x2="38" y2="330" stroke="#1e3a8a" strokeWidth="3" />
                    <line x1="82" y1="20" x2="82" y2="330" stroke="#1e3a8a" strokeWidth="3" />`;
code = code.replace(badSvgCols, goodSvgCols);


// Write back
fs.writeFileSync('src/components/StructuralDetailing.tsx', code);

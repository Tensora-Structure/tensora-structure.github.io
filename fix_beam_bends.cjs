const fs = require('fs');

let code = fs.readFileSync('src/components/StructuralDetailing.tsx', 'utf8');

const svgBeamTarget = `                    {/* Top Bars */}
                    <path d="M 25 70 L 25 45 L 575 45 L 575 70" fill="none" stroke="#1e3a8a" strokeWidth="2.5" />
                    <line x1="25" y1="48" x2="180" y2="48" stroke="#e11d48" strokeWidth="2" />
                    <line x1="420" y1="48" x2="575" y2="48" stroke="#e11d48" strokeWidth="2" />
                    {/* Bottom Bars */}
                    <path d="M 25 80 L 25 105 L 575 105 L 575 80" fill="none" stroke="#1e3a8a" strokeWidth="3" />`;

const svgBeamReplace = `                    {/* Top Bars (with 90deg inside bends at corners) */}
                    <path d="M 45 70 L 25 70 L 25 45 L 575 45 L 575 70 L 555 70" fill="none" stroke="#1e3a8a" strokeWidth="2.5" />
                    {/* Top Extra Bars (with 45deg inside bends for curtailment) */}
                    <path d="M 25 48 L 180 48 L 170 58" fill="none" stroke="#e11d48" strokeWidth="2" />
                    <path d="M 575 48 L 420 48 L 430 58" fill="none" stroke="#e11d48" strokeWidth="2" />
                    {/* Bottom Bars (with 90deg inside bends at corners) */}
                    <path d="M 45 80 L 25 80 L 25 105 L 575 105 L 575 80 L 555 80" fill="none" stroke="#1e3a8a" strokeWidth="3" />
                    {/* Bottom Extra Bars (with 45deg inside bends for curtailment) */}
                    <path d="M 110 95 L 120 102 L 480 102 L 490 95" fill="none" stroke="#e11d48" strokeWidth="2" />`;

code = code.replace(svgBeamTarget, svgBeamReplace);

const dxfBeamTarget = `      // Top continuous (Anchor)
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

const dxfBeamReplace = `      // Top continuous (Anchor)
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

code = code.replace(dxfBeamTarget, dxfBeamReplace);

fs.writeFileSync('src/components/StructuralDetailing.tsx', code);

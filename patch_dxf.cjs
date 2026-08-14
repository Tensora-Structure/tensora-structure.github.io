const fs = require('fs');
let code = fs.readFileSync('src/components/StructuralDetailing.tsx', 'utf8');

const slabDxf = `
    // Slabs DXF
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
    yOffset -= (fD + 1);
`;

const replaceTarget = `const dxfString = dxf.toDxfString();`;
code = code.replace(replaceTarget, slabDxf + '\n    ' + replaceTarget);
fs.writeFileSync('src/components/StructuralDetailing.tsx', code);

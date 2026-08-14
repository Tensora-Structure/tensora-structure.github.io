const fs = require('fs');
let code = fs.readFileSync('src/components/StructuralDetailing.tsx', 'utf8');

const badStirrups = `        // Draw stirrup wrapping around top and bottom bars
        dxf.drawLine(currX - stirrupDia/2, yOffset - tieOff, currX - stirrupDia/2, yOffset - D + tieOff);
        dxf.drawLine(currX - stirrupDia/2, yOffset - D + tieOff, currX + stirrupDia/2, yOffset - D + tieOff);
        dxf.drawLine(currX + stirrupDia/2, yOffset - D + tieOff, currX + stirrupDia/2, yOffset - tieOff);
        dxf.drawLine(currX + stirrupDia/2, yOffset - tieOff, currX - stirrupDia/2, yOffset - tieOff);`;

const goodStirrups = `        dxf.drawLine(currX, yOffset - D + cov, currX, yOffset - cov);`;

code = code.replace(badStirrups, goodStirrups);

const badColStirrups = `        // Draw the tie as a wrap around main bars
        dxf.drawLine(mainOff, currY - tieDia/2, tieOff, currY - tieDia/2);
        dxf.drawLine(tieOff, currY - tieDia/2, tieOff, currY + tieDia/2);
        dxf.drawLine(tieOff, currY + tieDia/2, D - tieOff, currY + tieDia/2);
        dxf.drawLine(D - tieOff, currY + tieDia/2, D - tieOff, currY - tieDia/2);
        dxf.drawLine(D - tieOff, currY - tieDia/2, D - mainOff, currY - tieDia/2);`;
        
const goodColStirrups = `        dxf.drawLine(cov, currY, D - cov, currY);`;

code = code.replace(badColStirrups, goodColStirrups);

fs.writeFileSync('src/components/StructuralDetailing.tsx', code);

const fs = require('fs');

let code = fs.readFileSync('src/components/StructuralDetailing.tsx', 'utf8');

const target1 = `    const drawLabel = (x: number, y: number, text: string, height: number = 0.15, align: 'left'|'center'|'right' = 'left') => {
      dxf.setActiveLayer('TEXT');
      const halign = align === 'center' ? 1 : align === 'right' ? 2 : 0; 
      dxf.drawText(x, y, height, 0, text, halign, 0);
    };`;

const fix1 = `    const drawLabel = (x: number, y: number, text: string, height: number = 0.15, align: 'left'|'center'|'right' = 'left') => {
      dxf.setActiveLayer('TEXT');
      dxf.drawText(x, y, height, 0, text, align, 'baseline');
    };`;

code = code.replace(target1, fix1);
fs.writeFileSync('src/components/StructuralDetailing.tsx', code);

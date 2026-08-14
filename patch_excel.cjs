const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '["Member ID / Mark", "IS-2502 Shape Code", "Bending Formula (IS-2502)", "Shape Sketch", "Ø (mm)", "Spacing / Nos", "Cut L (m)", "Qty Mem.", "Bars/Mem", "Tot L (m)", "Unit Wt (kg/m)", "Total Wt (kg)"]',
  '["Member ID / Mark", "IS-2502 Shape Code", "Bending Formula (IS-2502)", "Ø (mm)", "Spacing / Nos", "Cut L (m)", "Qty Mem.", "Bars/Mem", "Tot L (m)", "Unit Wt (kg/m)", "Total Wt (kg)"]'
);

code = code.replace(
  `                r.bendingFormula,
                r.shapeSketch,
                r.dia,`,
  `                r.bendingFormula,
                r.dia,`
);

fs.writeFileSync('src/App.tsx', code);

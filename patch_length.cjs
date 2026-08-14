const fs = require('fs');

// Patch App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(
  '<StructuralDetailing \n                  beams={beams} \n                  columns={columns}',
  '<StructuralDetailing \n                  joints={joints}\n                  beams={beams} \n                  columns={columns}'
);
fs.writeFileSync('src/App.tsx', appCode);

// Patch StructuralDetailing.tsx
let sdCode = fs.readFileSync('src/components/StructuralDetailing.tsx', 'utf8');

// 1. Add joints to interface
sdCode = sdCode.replace('interface DetailingProps {', 'interface DetailingProps {\n  joints: any[];');

// 2. Add joints to props
sdCode = sdCode.replace(
  '({ beams, columns, sections, bbsRows, fdnReport, slabLx, slabLy, slabThickness })',
  '({ joints, beams, columns, sections, bbsRows, fdnReport, slabLx, slabLy, slabThickness })'
);

// 3. Add getLength helper
const getLengthHelper = `  const getLength = (member: any) => {
    if (!member) return 3;
    const nodeI = joints.find((j: any) => j.id === member.nodeI);
    const nodeJ = joints.find((j: any) => j.id === member.nodeJ);
    if (!nodeI || !nodeJ) return 3;
    return Math.sqrt(Math.pow(nodeJ.x - nodeI.x, 2) + Math.pow(nodeJ.y - nodeI.y, 2) + Math.pow((nodeJ.z || 0) - (nodeI.z || 0), 2));
  };

  const getSection =`;

sdCode = sdCode.replace('  const getSection =', getLengthHelper);

// 4. Replace c.length with getLength(c) and b.length with getLength(b)
sdCode = sdCode.replace(/c\.length/g, 'getLength(c)');
sdCode = sdCode.replace(/b\.length/g, 'getLength(b)');
sdCode = sdCode.replace(/col\.length/g, 'getLength(col)');
sdCode = sdCode.replace(/beam\.length/g, 'getLength(beam)');

fs.writeFileSync('src/components/StructuralDetailing.tsx', sdCode);

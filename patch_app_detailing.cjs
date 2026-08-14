const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldCode = `<StructuralDetailing 
                  beams={beams} 
                  columns={columns} 
                  fdnReport={fdnReport} 
                  slabLx={slabLx} 
                  slabLy={slabLy} 
                  slabThickness={slabThickness} 
                />`;

const newCode = `<StructuralDetailing 
                  beams={beams} 
                  columns={columns}
                  sections={sections}
                  bbsRows={bbsRows}
                  fdnReport={fdnReport} 
                  slabLx={slabLx} 
                  slabLy={slabLy} 
                  slabThickness={slabThickness} 
                />`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/App.tsx', code);

const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldCode = `                <div className="pt-8 border-t border-slate-400 text-center text-slate-400 text-[8px] font-mono flex justify-between">
                  <span>Structural Design Dossier end of dossier</span>
                  <span>Digitally certified structural design output</span>
                </div>
              </div>
              )}`;

const newCode = `                <div className="pt-8 border-t border-slate-400 text-center text-slate-400 text-[8px] font-mono flex justify-between">
                  <span>Structural Design Dossier end of dossier</span>
                  <span>Digitally certified structural design output</span>
                </div>
              </div>
              )}

              {/* TAB 6: STRUCTURAL DETAILING */}
              {reportTab === 'detailing' && (
                <StructuralDetailing 
                  beams={beams} 
                  columns={columns} 
                  fdnReport={fdnReport} 
                  slabLx={slabLx} 
                  slabLy={slabLy} 
                  slabThickness={slabThickness} 
                />
              )}`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/App.tsx', code);

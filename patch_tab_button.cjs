const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldTabs = `                  <button
                    onClick={() => setReportTab('bbs')}
                    className={\`px-4 py-2 flex items-center gap-1 border-b-2 transition-all \${reportTab === 'bbs' ? 'border-[#004A99] text-[#004A99] bg-[#F4F8FC]' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-[#F9F9F9]'}\`}
                  >
                    ⛓️ Bar Bending Schedule (BBS)
                  </button>
                </div>`;

const newTabs = `                  <button
                    onClick={() => setReportTab('bbs')}
                    className={\`px-4 py-2 flex items-center gap-1 border-b-2 transition-all \${reportTab === 'bbs' ? 'border-[#004A99] text-[#004A99] bg-[#F4F8FC]' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-[#F9F9F9]'}\`}
                  >
                    ⛓️ Bar Bending Schedule (BBS)
                  </button>
                  <button
                    onClick={() => setReportTab('detailing')}
                    className={\`px-4 py-2 flex items-center gap-1 border-b-2 transition-all \${reportTab === 'detailing' ? 'border-[#004A99] text-[#004A99] bg-[#F4F8FC]' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-[#F9F9F9]'}\`}
                  >
                    🏗️ Structural Detailing
                  </button>
                </div>`;

code = code.replace(oldTabs, newTabs);
fs.writeFileSync('src/App.tsx', code);

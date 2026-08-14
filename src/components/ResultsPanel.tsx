import React, { useState } from 'react';
import { Joint, Frame, Section, AnalysisResults } from '../types';
import { ArrowDown, AlertCircle, Sparkles, CheckCircle2, XCircle } from 'lucide-react';

interface ResultsPanelProps {
  joints: Joint[];
  frames: Frame[];
  sections: Section[];
  results: AnalysisResults;
  isDesigned: boolean;
  onRunDesign: () => void;
}

type TabType = 'reactions' | 'displacements' | 'forces' | 'design';

export default function ResultsPanel({
  joints,
  frames,
  sections,
  results,
  isDesigned,
  onRunDesign,
}: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('reactions');

  if (!results.isAnalyzed) {
    return (
      <div id="results-empty-state" className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-8 h-8 text-blue-500 stroke-1.5 mb-1.5" />
        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
          Numerical Results & Code Design Tables
        </h4>
        <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
          Please run structural analysis first using the <strong className="text-[#004A99]">"run analysis"</strong> button in the top toolbar.
        </p>
      </div>
    );
  }

  return (
    <div id="results-panel-container" className="flex flex-col min-h-0 text-slate-800 bg-white border border-[#D1D1D1] rounded">
      {/* Top Tabs */}
      <div id="results-panel-header" className="flex flex-col border-b border-[#D1D1D1] bg-[#F9F9F9] flex-shrink-0">
        <div className="flex overflow-x-auto whitespace-nowrap scrollbar-none border-b border-[#E5E5E5]">
          {[
            { id: 'reactions' as TabType, label: 'Reactions' },
            { id: 'displacements' as TabType, label: 'Displacements' },
            { id: 'forces' as TabType, label: 'Forces' },
            { id: 'design' as TabType, label: 'Design Checks' },
          ].map((tab) => (
            <button
              key={tab.id}
              id={`results-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-[10px] font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#004A99] text-[#004A99] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="text-[9px] text-emerald-700 font-bold flex items-center gap-1.5 px-3 py-1 bg-emerald-50/50">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          FEM Solved Successfully
        </div>
      </div>

      {/* Tab Contents: Tables */}
      <div id="results-table-container" className="flex-1 overflow-x-auto overflow-y-auto p-2 min-h-0">
        {/* TAB 1: SUPPORT REACTIONS */}
        {activeTab === 'reactions' && (
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-[#F0F0F0] text-slate-700 border-b border-[#D1D1D1]">
                <th className="p-1.5">Joint ID</th>
                <th className="p-1.5">Support Type</th>
                <th className="p-1.5 text-right">Rx (Horizontal Force, kN)</th>
                <th className="p-1.5 text-right">Ry (Vertical Force, kN)</th>
                <th className="p-1.5 text-right">Mz (Base Moment, kNm)</th>
              </tr>
            </thead>
            <tbody>
              {joints
                .filter((j) => j.support !== 'Free')
                .map((j) => {
                  const react = results.reactions[j.id] || { fx: 0, fy: 0, mz: 0 };
                  return (
                    <tr
                      key={j.id}
                      className="border-b border-[#E5E5E5] hover:bg-[#F9F9F9] text-slate-800"
                    >
                      <td className="p-1.5 font-bold text-[#004A99]">{j.id}</td>
                      <td className="p-1.5 font-semibold text-amber-700">
                        {j.support}
                      </td>
                      <td className="p-1.5 text-right text-slate-800">
                        {react.fx.toFixed(3)}
                      </td>
                      <td className="p-1.5 text-right text-slate-800">
                        {react.fy.toFixed(3)}
                      </td>
                      <td className="p-1.5 text-right text-slate-800">
                        {react.mz.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              {joints.filter((j) => j.support !== 'Free').length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                    No supports defined. The structure is currently unsupported.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* TAB 2: DISPLACEMENTS */}
        {activeTab === 'displacements' && (
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-[#F0F0F0] text-slate-700 border-b border-[#D1D1D1]">
                <th className="p-1.5">Joint ID</th>
                <th className="p-1.5 text-right">dx (Horizontal, mm)</th>
                <th className="p-1.5 text-right">dy (Vertical deflection, mm)</th>
                <th className="p-1.5 text-right">rz (Rotational, radians)</th>
              </tr>
            </thead>
            <tbody>
              {joints.map((j) => {
                const disp = results.displacements[j.id] || { dx: 0, dy: 0, rz: 0 };
                return (
                  <tr
                    key={j.id}
                    className="border-b border-[#E5E5E5] hover:bg-[#F9F9F9] text-slate-800"
                  >
                    <td className="p-1.5 font-bold text-[#004A99]">{j.id}</td>
                    <td className={`p-1.5 text-right ${Math.abs(disp.dx) > 1e-3 ? 'text-blue-600 font-bold' : ''}`}>
                      {disp.dx.toFixed(4)}
                    </td>
                    <td className={`p-1.5 text-right ${Math.abs(disp.dy) > 1e-3 ? 'text-pink-600 font-bold' : ''}`}>
                      {disp.dy.toFixed(4)}
                    </td>
                    <td className="p-1.5 text-right">{disp.rz.toFixed(6)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* TAB 3: FRAME MEMBER FORCES */}
        {activeTab === 'forces' && (
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-[#F0F0F0] text-slate-700 border-b border-[#D1D1D1]">
                <th className="p-1.5">Member ID</th>
                <th className="p-1.5">Type</th>
                <th className="p-1.5">Assigned Section</th>
                <th className="p-1.5 text-right">Max Axial Force (kN)</th>
                <th className="p-1.5 text-right">Max Shear Force (kN)</th>
                <th className="p-1.5 text-right">Max Bending Moment (kNm)</th>
                <th className="p-1.5 text-right">Max Deflection (mm)</th>
              </tr>
            </thead>
            <tbody>
              {frames.map((f) => {
                const forces = results.frameForces[f.id];
                const sect = sections.find((s) => s.id === f.sectionId);
                if (!forces) return null;
                return (
                  <tr
                    key={f.id}
                    className="border-b border-[#E5E5E5] hover:bg-[#F9F9F9] text-slate-800"
                  >
                    <td className="p-1.5 font-bold text-[#004A99]">{f.id}</td>
                    <td className="p-1.5 font-semibold text-slate-500">{f.type}</td>
                    <td className="p-1.5 text-slate-600">{sect?.name}</td>
                    <td className="p-1.5 text-right text-red-600 font-bold">
                      {forces.maxAxial.toFixed(2)}
                    </td>
                    <td className="p-1.5 text-right text-teal-600 font-bold">
                      {forces.maxShear.toFixed(2)}
                    </td>
                    <td className="p-1.5 text-right text-amber-600 font-bold">
                      {forces.maxMoment.toFixed(2)}
                    </td>
                    <td className="p-1.5 text-right text-blue-600 font-bold">
                      {forces.maxDeflection.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* TAB 4: STRUCTURAL CODE CHECK RESULTS */}
        {activeTab === 'design' && (
          !isDesigned ? (
            <div id="design-empty-state" className="h-44 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
              <Sparkles className="w-8 h-8 text-emerald-600 stroke-1.5 mb-1.5 animate-pulse" />
              <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                Concrete & Steel Member Design Suite
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 text-center max-w-sm">
                Structural analysis completed successfully. Run the international member design checking engine to verify demand/capacity (unity) safety ratios.
              </p>
              <button
                id="btn-run-design-panel"
                onClick={onRunDesign}
                className="mt-2.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded transition-colors shadow-md shadow-emerald-500/15 cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Run Member Design Checks
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F0F0F0] text-slate-700 border-b border-[#D1D1D1] font-bold">
                  <th className="p-1.5">Member ID</th>
                  <th className="p-1.5">Design Code Standard</th>
                  <th className="p-1.5 text-center">Demand/Capacity (Unity Ratio)</th>
                  <th className="p-1.5 text-center">Status</th>
                  <th className="p-1.5">Governing Force</th>
                  <th className="p-1.5">Capacity Calculation Details</th>
                </tr>
              </thead>
              <tbody>
                {frames.map((f) => {
                  const forces = results.frameForces[f.id];
                  if (!forces || !forces.design) return null;
                  const d = forces.design;
                  const isFail = d.status === 'Fail';
                  return (
                    <tr
                      key={f.id}
                      className="border-b border-[#E5E5E5] hover:bg-[#F9F9F9] text-slate-800 font-mono"
                    >
                      <td className="p-1.5 font-bold text-[#004A99]">{f.id}</td>
                      <td className="p-1.5 font-semibold text-slate-600">
                        {(() => {
                          if (d.detail.includes('Steel Code:')) {
                            const m = d.detail.match(/Steel Code:\s*([^,)]+)/);
                            return m ? `${m[1]} (Steel)` : 'Steel Design';
                          }
                          if (d.detail.includes('Concrete Code:')) {
                            const m = d.detail.match(/Concrete Code:\s*([^,)]+)/);
                            return m ? `${m[1]} (Concrete)` : 'Concrete Design';
                          }
                          return d.detail.includes('Concrete') ? 'Concrete Design' : 'Steel Design';
                        })()}
                      </td>
                      <td className="p-1.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-16 bg-slate-200 h-2 rounded-sm overflow-hidden">
                            <div
                              className={`h-full ${isFail ? 'bg-rose-500' : d.ratio > 0.5 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, d.ratio * 100)}%` }}
                            ></div>
                          </div>
                          <span className={`font-bold ${isFail ? 'text-rose-700' : 'text-slate-800'}`}>
                            {d.ratio.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="p-1.5 text-center">
                        {isFail ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300">
                            <XCircle className="w-3 h-3" /> FAIL
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3" /> PASS
                          </span>
                        )}
                      </td>
                      <td className="p-1.5 font-semibold text-slate-700">
                        {d.governingForce}
                      </td>
                      <td className="p-1.5 text-slate-500 text-[11px] leading-normal font-sans">
                        <div className="font-semibold text-slate-800">{d.detail}</div>
                        {d.isConcrete && (
                          <div className="mt-1.5 p-1.5 bg-indigo-50/50 rounded border border-indigo-100 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-700 font-sans">
                            <div>
                              <span className="font-bold text-indigo-900">Steel Area (Ast):</span>{' '}
                              <span className="font-mono font-semibold text-indigo-700 bg-white px-1 rounded border border-indigo-50">
                                {d.astProvided?.toFixed(0)} mm²
                              </span>{' '}
                              <span className="text-slate-400 text-[9px]">(Req: {d.astRequired?.toFixed(0)} mm²)</span>
                            </div>
                            <div>
                              <span className="font-bold text-indigo-900">Steel Percentage (pt):</span>{' '}
                              <span className="font-mono font-semibold text-indigo-700 bg-white px-1 rounded border border-indigo-50">
                                {d.ptProvided?.toFixed(2)}%
                              </span>{' '}
                              <span className="text-slate-400 text-[9px]">(Req: {d.ptRequired?.toFixed(2)}%)</span>
                            </div>
                            <div>
                              <span className="font-bold text-indigo-900">Main Reinforcement:</span>{' '}
                              <span className="font-mono font-semibold text-indigo-700 bg-white px-1 rounded border border-indigo-50">
                                {d.mainBarsText}
                              </span>
                            </div>
                            <div>
                              <span className="font-bold text-indigo-900">Shear / Ties:</span>{' '}
                              <span className="font-mono font-semibold text-indigo-700 bg-white px-1 rounded border border-indigo-50">
                                {d.shearStirrupsText}
                              </span>
                            </div>
                            {d.sectionClass && (
                              <div className="col-span-2">
                                <span className="font-bold text-indigo-900">Section Type:</span>{' '}
                                <span className="font-semibold text-indigo-800 bg-indigo-100 px-1 rounded text-[9px]">
                                  {d.sectionClass}
                                </span>
                              </div>
                            )}
                            {(d.astTopLeft !== undefined || d.astTotal !== undefined) && (
                              <div className="col-span-2 mt-1 pt-1 border-t border-indigo-200">
                                <div className="font-bold text-indigo-900 mb-1">Detailed ETABS-Style Ast (mm²):</div>
                                {d.astTotal !== undefined ? (
                                  <div className="text-slate-600">Column Total Ast: <span className="font-mono font-semibold text-indigo-700">{d.astTotal.toFixed(0)}</span></div>
                                ) : (
                                  <div className="grid grid-cols-3 gap-2 text-[9px] text-center">
                                    <div className="bg-white p-1 rounded border border-indigo-50">
                                      <div className="text-slate-400 font-semibold mb-0.5 border-b border-slate-100">LEFT</div>
                                      <div>Top: <span className="font-mono font-bold text-indigo-600">{d.astTopLeft?.toFixed(0)}</span></div>
                                      <div>Bot: <span className="font-mono font-bold text-indigo-600">{d.astBotLeft?.toFixed(0)}</span></div>
                                    </div>
                                    <div className="bg-white p-1 rounded border border-indigo-50">
                                      <div className="text-slate-400 font-semibold mb-0.5 border-b border-slate-100">MID</div>
                                      <div>Top: <span className="font-mono font-bold text-indigo-600">{d.astTopMid?.toFixed(0)}</span></div>
                                      <div>Bot: <span className="font-mono font-bold text-indigo-600">{d.astBotMid?.toFixed(0)}</span></div>
                                    </div>
                                    <div className="bg-white p-1 rounded border border-indigo-50">
                                      <div className="text-slate-400 font-semibold mb-0.5 border-b border-slate-100">RIGHT</div>
                                      <div>Top: <span className="font-mono font-bold text-indigo-600">{d.astTopRight?.toFixed(0)}</span></div>
                                      <div>Bot: <span className="font-mono font-bold text-indigo-600">{d.astBotRight?.toFixed(0)}</span></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}

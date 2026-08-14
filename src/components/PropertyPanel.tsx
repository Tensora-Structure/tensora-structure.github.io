import React, { useState } from 'react';
import {
  Joint,
  Frame,
  Material,
  Section,
  LoadCase,
  LoadCombination,
  GridSettings,
  SupportType,
  AnalysisResults,
} from '../types';
import { calculateFoundationDesign } from '../lib/foundationEngine';
import { 
  Settings,
  Hammer,
  Database,
  Grid3X3,
  Layers,
  ArrowRight,
  Plus,
  Trash2,
  Calculator,
  IndianRupee,
  Activity, Square } from 'lucide-react';
import ResultsPanel from './ResultsPanel';

interface PropertyPanelProps {
  joints: Joint[];
  frames: Frame[];
  results: AnalysisResults;
  materials: Material[];
  sections: Section[];
  loadCases: LoadCase[];
  combinations: LoadCombination[];
  gridSettings: GridSettings;
  selectedJointId: string | null;
  selectedFrameId: string | null;
  setGridSettings: (settings: GridSettings) => void;
  onUpdateJoint: (joint: Joint) => void;
  onUpdateFrame: (frame: Frame) => void;
  selectedSlabId?: string | null;
  setSelectedSlabId?: (id: string | null) => void;
  slabs?: any[];
  onUpdateSlab?: (slab: any) => void;
  onAddSection: (section: Section) => void;
  onDeleteSection: (id: string) => void;
  onAddMaterial: (material: Material) => void;
  onAddLoadCase: (lc: LoadCase) => void;
  onUpdateCombination: (combo: LoadCombination) => void;
  activeLoadCaseId: string;
  setActiveLoadCaseId: (id: string) => void;
  activeComboId: string;
  setActiveComboId: (id: string) => void;
  // Lifted states
  slabLx: number;
  setSlabLx: (val: number) => void;
  slabLy: number;
  setSlabLy: (val: number) => void;
  slabLiveLoad: number;
  setSlabLiveLoad: (val: number) => void;
  slabFF: number;
  setSlabFF: (val: number) => void;
  slabThickness: number;
  setSlabThickness: (val: number) => void;
  slabRebarDia: number;
  setSlabRebarDia: (val: number) => void;
  footingP: number;
  setFootingP: (val: number) => void;
  footingSbc: number;
  setFootingSbc: (val: number) => void;
  footingConcreteGrade: number;
  setFootingConcreteGrade: (val: number) => void;
  footingRebarDia: number;
  setFootingRebarDia: (val: number) => void;
  footingDepth: number;
  setFootingDepth: (val: number) => void;
  foundationType: string;
  setFoundationType: (val: string) => void;
  isolatedWidthManual: number;
  setIsolatedWidthManual: (val: number) => void;
  stripWidthManual: number;
  setStripWidthManual: (val: number) => void;
  raftLengthManual: number;
  setRaftLengthManual: (val: number) => void;
  raftWidthManual: number;
  setRaftWidthManual: (val: number) => void;
  concreteRate: number;
  setConcreteRate: (val: number) => void;
  rebarRate: number;
  setRebarRate: (val: number) => void;
  structuralSteelRate: number;
  setStructuralSteelRate: (val: number) => void;
  isDesigned: boolean;
  onRunDesign: () => void;
  activeTab?: TabType;
  setActiveTab?: (tab: TabType) => void;

  // Custom IS 456 RC design specs props
  rcConcreteGrade: number;
  setRcConcreteGrade: (val: number) => void;
  rcSteelGrade: number;
  setRcSteelGrade: (val: number) => void;
  rcClearCoverBeam: number;
  setRcClearCoverBeam: (val: number) => void;
  rcClearCoverColumn: number;
  setRcClearCoverColumn: (val: number) => void;
  rcMainBarDiaBeam: number;
  setRcMainBarDiaBeam: (val: number) => void;
  rcMainBarDiaColumn: number;
  setRcMainBarDiaColumn: (val: number) => void;
  rcStirrupDia: number;
  setRcStirrupDia: (val: number) => void;
  rcStirrupLegs: number;
  setRcStirrupLegs: (val: number) => void;
  onAutoAssignIS875Loads: (params: {
    wallThickness: number;
    storeyHeight: number;
    masonryDensity: number;
  }) => void;
}

type TabType = 'selection' | 'sections' | 'combos' | 'grids' | 'calcs' | 'boq' | 'results';

export default function PropertyPanel({
  joints,
  frames,
  results,
  materials,
  sections,
  loadCases,
  combinations,
  gridSettings,
  selectedJointId,
  selectedFrameId,
  selectedSlabId,
  setSelectedSlabId,
  slabs,
  onUpdateSlab,
  setGridSettings,
  onUpdateJoint,
  onUpdateFrame,
  onAddSection,
  onDeleteSection,
  onAddMaterial,
  onAddLoadCase,
  onUpdateCombination,
  activeLoadCaseId,
  setActiveLoadCaseId,
  activeComboId,
  setActiveComboId,
  // Lifted props
  slabLx,
  setSlabLx,
  slabLy,
  setSlabLy,
  slabLiveLoad,
  setSlabLiveLoad,
  slabFF,
  setSlabFF,
  slabThickness,
  setSlabThickness,
  slabRebarDia,
  setSlabRebarDia,
  footingP,
  setFootingP,
  footingSbc,
  setFootingSbc,
  footingConcreteGrade,
  setFootingConcreteGrade,
  footingRebarDia,
  setFootingRebarDia,
  footingDepth,
  setFootingDepth,
  foundationType,
  setFoundationType,
  isolatedWidthManual,
  setIsolatedWidthManual,
  stripWidthManual,
  setStripWidthManual,
  raftLengthManual,
  setRaftLengthManual,
  raftWidthManual,
  setRaftWidthManual,
  concreteRate,
  setConcreteRate,
  rebarRate,
  setRebarRate,
  structuralSteelRate,
  setStructuralSteelRate,
  isDesigned,
  onRunDesign,
  activeTab: propsActiveTab,
  setActiveTab: propsSetActiveTab,
  rcConcreteGrade,
  setRcConcreteGrade,
  rcSteelGrade,
  setRcSteelGrade,
  rcClearCoverBeam,
  setRcClearCoverBeam,
  rcClearCoverColumn,
  setRcClearCoverColumn,
  rcMainBarDiaBeam,
  setRcMainBarDiaBeam,
  rcMainBarDiaColumn,
  setRcMainBarDiaColumn,
  rcStirrupDia,
  setRcStirrupDia,
  rcStirrupLegs,
  setRcStirrupLegs,
  onAutoAssignIS875Loads,
}: PropertyPanelProps) {
  const [localActiveTab, setLocalActiveTab] = useState<TabType>('selection');
  const activeTab = propsActiveTab !== undefined ? propsActiveTab : localActiveTab;
  const setActiveTab = propsSetActiveTab !== undefined ? propsSetActiveTab : setLocalActiveTab;

  // --- INDIAN MASONRY WALL LOAD ESTIMATOR STATE ---
  const [wallThickness, setWallThickness] = useState<number>(230); // mm (standard outer wall)
  const [wallHeight, setWallHeight] = useState<number>(3.0); // m
  const [masonryDensity, setMasonryDensity] = useState<number>(19); // kN/m³ (Standard Fly Ash/Red Brick)

  // Selected item references
  const selectedJoint = joints.find((j) => j.id === selectedJointId);
  const selectedFrame = frames.find((f) => f.id === selectedFrameId);
  const selectedSlab = slabs?.find((s) => s.id === selectedSlabId);

  // New Section Form state (Defaulting to Indian Standard ISMB 250)
  const [newSectName, setNewSectName] = useState('ISMB 250 Steel');
  const [newSectShape, setNewSectShape] = useState<'Rectangular' | 'Circular' | 'I-Shape'>('I-Shape');
  const [newSectMatId, setNewSectMatId] = useState(materials[0]?.id || '');
  const [newSectWidth, setNewSectWidth] = useState('0.125'); // m (125mm flange)
  const [newSectDepth, setNewSectDepth] = useState('0.250'); // m (250mm height)
  const [newSectTw, setNewSectTw] = useState('0.0069'); // tw (6.9mm web)
  const [newSectTf, setNewSectTf] = useState('0.0125'); // tf (12.5mm flange)

  // Sidebar load editing states for selected joint
  const [sidebarJointFx, setSidebarJointFx] = useState('0');
  const [sidebarJointFy, setSidebarJointFy] = useState('-10');
  const [sidebarJointMz, setSidebarJointMz] = useState('0');
  const [sidebarJointCaseId, setSidebarJointCaseId] = useState(loadCases[0]?.id || 'LC1');

  // Sidebar load editing states for selected frame member
  const [sidebarFrameLoadType, setSidebarFrameLoadType] = useState<'UDL' | 'Point'>('UDL');
  const [sidebarFrameLoadDir, setSidebarFrameLoadDir] = useState<'GlobalY' | 'LocalY' | 'GlobalX'>('GlobalY');
  const [sidebarFrameLoadVal, setSidebarFrameLoadVal] = useState('15');
  const [sidebarFrameLoadOffset, setSidebarFrameLoadOffset] = useState('0.5');
  const [sidebarFrameCaseId, setSidebarFrameCaseId] = useState(loadCases[0]?.id || 'LC1');

  const handleDeleteJointLoad = (caseId: string) => {
    if (selectedJoint) {
      onUpdateJoint({
        ...selectedJoint,
        loads: selectedJoint.loads.filter((l) => l.loadCaseId !== caseId),
      });
    }
  };

  const handleAddJointLoad = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedJoint) {
      const fx = parseFloat(sidebarJointFx) || 0;
      const fy = parseFloat(sidebarJointFy) || 0;
      const mz = parseFloat(sidebarJointMz) || 0;
      const caseId = sidebarJointCaseId;

      const filtered = selectedJoint.loads.filter((l) => l.loadCaseId !== caseId);
      onUpdateJoint({
        ...selectedJoint,
        loads: [...filtered, { fx, fy, mz, loadCaseId: caseId }],
      });
    }
  };

  const handleDeleteFrameLoad = (loadId: string) => {
    if (selectedFrame) {
      onUpdateFrame({
        ...selectedFrame,
        loads: selectedFrame.loads.filter((l) => l.id !== loadId),
      });
    }
  };

  const handleAddFrameLoad = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFrame) {
      const value = parseFloat(sidebarFrameLoadVal) || 0;
      const offset = parseFloat(sidebarFrameLoadOffset) || 0.5;
      const type = sidebarFrameLoadType;
      const direction = sidebarFrameLoadDir;
      const caseId = sidebarFrameCaseId;
      const loadId = `L_${selectedFrame.loads.length + 1}`;

      const filtered = selectedFrame.loads.filter((l) => !(l.loadCaseId === caseId && l.type === type));
      onUpdateFrame({
        ...selectedFrame,
        loads: [
          ...filtered,
          { id: loadId, type, direction, value, offset, loadCaseId: caseId },
        ],
      });
    }
  };

  // Handlers
  const handleGridChange = (field: keyof GridSettings, val: number) => {
    setGridSettings({
      ...gridSettings,
      [field]: Math.max(1, val),
    });
  };

  const handleJointSupportChange = (support: SupportType) => {
    if (selectedJoint) {
      onUpdateJoint({
        ...selectedJoint,
        support,
      });
    }
  };

  const handleJointCoordinateChange = (field: 'x' | 'y', val: number) => {
    if (selectedJoint) {
      onUpdateJoint({
        ...selectedJoint,
        [field]: val,
      });
    }
  };

  const handleFrameSectionChange = (sectionId: string) => {
    if (selectedFrame) {
      onUpdateFrame({
        ...selectedFrame,
        sectionId,
      });
    }
  };

  const handleCreateSection = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `S_${sections.length + 1}`;
    onAddSection({
      id,
      name: newSectName,
      materialId: newSectMatId || materials[0]?.id || 'M1',
      shape: newSectShape,
      width: parseFloat(newSectWidth) || 0.2,
      depth: parseFloat(newSectDepth) || 0.4,
      webThickness: newSectShape === 'I-Shape' ? parseFloat(newSectTw) : undefined,
      flangeThickness: newSectShape === 'I-Shape' ? parseFloat(newSectTf) : undefined,
    });
    // Reset defaults to a quick concrete beam
    setNewSectName('B_300x500 Concrete');
    setNewSectShape('Rectangular');
    setNewSectMatId(materials.find((m) => m.type === 'Concrete')?.id || materials[0]?.id || '');
    setNewSectWidth('0.30');
    setNewSectDepth('0.50');
  };

  const handleComboFactorChange = (comboId: string, caseId: string, factor: number) => {
    const combo = combinations.find((c) => c.id === comboId);
    if (combo) {
      onUpdateCombination({
        ...combo,
        factors: {
          ...combo.factors,
          [caseId]: factor,
        },
      });
    }
  };

  return (
    <div id="property-panel" className="w-80 bg-white border-l border-[#D1D1D1] flex flex-col flex-shrink-0 h-full overflow-hidden text-slate-800 text-[11px]">
      {/* Tab Selectors */}
      <div id="property-tabs" className="grid grid-cols-4 bg-[#F0F0F0] border-b border-[#D1D1D1] text-[9px] text-slate-600 font-bold">
        <button
          id="tab-selection"
          onClick={() => setActiveTab('selection')}
          className={`flex flex-col items-center gap-1 py-1.5 border-b border-r border-[#D1D1D1] font-bold cursor-pointer transition-colors ${
            activeTab === 'selection'
              ? 'border-b-2 border-b-[#004A99] text-[#004A99] bg-white'
              : 'border-transparent bg-[#F0F0F0] hover:text-slate-900 hover:bg-[#EAEAEA]'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Inspect</span>
        </button>
        <button
          id="tab-sections"
          onClick={() => setActiveTab('sections')}
          className={`flex flex-col items-center gap-1 py-1.5 border-b border-r border-[#D1D1D1] font-bold cursor-pointer transition-colors ${
            activeTab === 'sections'
              ? 'border-b-2 border-b-[#004A99] text-[#004A99] bg-white'
              : 'border-transparent bg-[#F0F0F0] hover:text-slate-900 hover:bg-[#EAEAEA]'
          }`}
        >
          <Hammer className="w-3.5 h-3.5" />
          <span>Sections</span>
        </button>
        <button
          id="tab-combos"
          onClick={() => setActiveTab('combos')}
          className={`flex flex-col items-center gap-1 py-1.5 border-b border-r border-[#D1D1D1] font-bold cursor-pointer transition-colors ${
            activeTab === 'combos'
              ? 'border-b-2 border-b-[#004A99] text-[#004A99] bg-white'
              : 'border-transparent bg-[#F0F0F0] hover:text-slate-900 hover:bg-[#EAEAEA]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Loads</span>
        </button>
        <button
          id="tab-results"
          onClick={() => setActiveTab('results')}
          className={`flex flex-col items-center gap-1 py-1.5 border-b border-[#D1D1D1] font-bold cursor-pointer transition-colors ${
            activeTab === 'results'
              ? 'border-b-2 border-b-[#004A99] text-[#004A99] bg-white'
              : 'border-transparent bg-[#F0F0F0] hover:text-slate-900 hover:bg-[#EAEAEA]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Results</span>
        </button>
        <button
          id="tab-grids"
          onClick={() => setActiveTab('grids')}
          className={`flex flex-col items-center gap-1 py-1.5 border-r border-[#D1D1D1] font-bold cursor-pointer transition-colors ${
            activeTab === 'grids'
              ? 'border-b-2 border-b-[#004A99] text-[#004A99] bg-white'
              : 'border-transparent bg-[#F0F0F0] hover:text-slate-900 hover:bg-[#EAEAEA]'
          }`}
        >
          <Grid3X3 className="w-3.5 h-3.5" />
          <span>Grids</span>
        </button>
        <button
          id="tab-calcs"
          onClick={() => setActiveTab('calcs')}
          className={`flex flex-col items-center gap-1 py-1.5 border-r border-[#D1D1D1] font-bold cursor-pointer transition-colors ${
            activeTab === 'calcs'
              ? 'border-b-2 border-b-[#004A99] text-[#004A99] bg-white'
              : 'border-transparent bg-[#F0F0F0] hover:text-slate-900 hover:bg-[#EAEAEA]'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Calcs</span>
        </button>
        <button
          id="tab-boq"
          onClick={() => setActiveTab('boq')}
          className={`flex flex-col items-center gap-1 py-1.5 border-r border-[#D1D1D1] font-bold cursor-pointer transition-colors ${
            activeTab === 'boq'
              ? 'border-b-2 border-b-[#004A99] text-[#004A99] bg-white'
              : 'border-transparent bg-[#F0F0F0] hover:text-slate-900 hover:bg-[#EAEAEA]'
          }`}
        >
          <IndianRupee className="w-3.5 h-3.5" />
          <span>Cost/BOQ</span>
        </button>
        <div className="bg-[#F0F0F0] border-b border-[#D1D1D1]"></div>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* TAB 1: INSPECTOR */}
        {activeTab === 'selection' && (
          <div id="inspector-tab-panel" className="space-y-4">
            {!selectedJoint && !selectedFrame && !selectedSlab ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <Database className="w-8 h-8 mx-auto stroke-1 mb-2 opacity-60 text-slate-300" />
                No element selected.<br />
                Click an element on the canvas in<br />
                <strong className="text-slate-600">Select & Edit</strong> mode.
              </div>
            ) : null}

            {/* Selected Joint Node properties */}
            
            {/* Selected Slab properties */}
            {selectedSlab && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300 relative z-0">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Square className="w-4 h-4 text-teal-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Slab {selectedSlab.id}
                  </h3>
                </div>

                {/* Section Assignment */}
                <div className="bg-slate-50 border border-slate-200 rounded p-3">
                  <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">Section Property</h4>
                  <select
                    value={selectedSlab.sectionId}
                    onChange={(e) => {
                      if (onUpdateSlab) {
                        onUpdateSlab({ ...selectedSlab, sectionId: e.target.value });
                      }
                    }}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    {sections.filter(s => s.shape === 'Slab' || s.shape === 'Rectangular').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Slab Loads Assignment */}
                <div className="bg-slate-50 border border-slate-200 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Area Loads</h4>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    {selectedSlab.loads.map((l: any) => {
                      const lc = loadCases.find(c => c.id === l.loadCaseId);
                      return (
                        <div key={l.id} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-slate-100 group shadow-sm relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-teal-500"></div>
                          <div>
                            <span className="font-mono text-slate-600">{l.loadCaseId} ({lc?.name}): </span>
                            <span className="font-bold text-slate-800">{l.value} kN/m²</span>
                          </div>
                          <button
                            onClick={() => {
                              if (onUpdateSlab) {
                                onUpdateSlab({
                                  ...selectedSlab,
                                  loads: selectedSlab.loads.filter((sl: any) => sl.id !== l.id)
                                });
                              }
                            }}
                            className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    {selectedSlab.loads.length === 0 && (
                      <div className="text-[10px] text-slate-400 text-center py-1">No loads applied</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {selectedJoint && (
              <div id="joint-properties-panel" className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#D1D1D1] pb-1.5">
                  <h4 className="font-bold text-xs text-[#004A99] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#004A99]"></span>
                    Joint Node: {selectedJoint.id}
                  </h4>
                </div>

                {/* Coordinates */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-[#004A99] uppercase tracking-wider block border-b border-[#EAEAEA] pb-0.5">
                    Coordinates (meters)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">X Coordinate (m)</label>
                      <input
                        id="prop-joint-x"
                        type="number"
                        step="0.5"
                        value={selectedJoint.x}
                        onChange={(e) => handleJointCoordinateChange('x', parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Y Coordinate (m)</label>
                      <input
                        id="prop-joint-y"
                        type="number"
                        step="0.5"
                        value={selectedJoint.y}
                        onChange={(e) => handleJointCoordinateChange('y', parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Supports */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-[#004A99] uppercase tracking-wider block border-b border-[#EAEAEA] pb-0.5">
                    Boundary Support Restraint
                  </span>
                  <select
                    id="prop-joint-support"
                    value={selectedJoint.support}
                    onChange={(e: any) => handleJointSupportChange(e.target.value)}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1.5 text-xs text-slate-800 font-semibold"
                  >
                    <option value="Free">Free Joint (floating)</option>
                    <option value="Pinned">Pinned Support (DX, DY fixed)</option>
                    <option value="Fixed">Fixed Support (DX, DY, RZ fixed)</option>
                    <option value="RollerX">Roller Support (DY fixed)</option>
                  </select>
                </div>

                {/* Node applied loads list */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-[#004A99] uppercase tracking-wider block border-b border-[#EAEAEA] pb-0.5">
                    Nodal Joint Loads
                  </span>
                  {selectedJoint.loads.length === 0 ? (
                    <div className="text-[10px] text-slate-400 italic">
                      No loads assigned to this joint.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {selectedJoint.loads.map((l, i) => {
                        const lc = loadCases.find((c) => c.id === l.loadCaseId);
                        return (
                          <div
                            key={i}
                            className="bg-[#F9F9F9] border border-[#D1D1D1] rounded-sm p-2 flex items-center justify-between text-xs font-mono text-slate-600"
                          >
                            <div className="w-full">
                              <div className="flex items-center justify-between">
                                <div className="text-[9px] uppercase font-bold text-[#004A99]">
                                  Case: {lc?.name || l.loadCaseId}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteJointLoad(l.loadCaseId)}
                                  className="text-rose-600 hover:text-rose-800 p-0.5 cursor-pointer"
                                  title="Delete load"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="grid grid-cols-3 gap-1 mt-1 text-[10px] text-slate-700">
                                <span>Fx: {l.fx}kN</span>
                                <span>Fy: {l.fy}kN</span>
                                <span>Mz: {l.mz}kNm</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Sidebar Add Joint Load Form */}
                  <form onSubmit={handleAddJointLoad} className="bg-[#F0F5FA] border border-[#BDD1E5] rounded p-2.5 mt-2 space-y-2">
                    <span className="text-[10px] font-bold text-[#004A99] uppercase block pb-0.5">
                      Add / Update Joint Load
                    </span>
                    <div className="space-y-1.5">
                      <div>
                        <label className="text-[9px] text-slate-500 block mb-0.5">Load Case</label>
                        <select
                          value={sidebarJointCaseId}
                          onChange={(e) => setSidebarJointCaseId(e.target.value)}
                          className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800 font-medium"
                        >
                          {loadCases.map((lc) => (
                            <option key={lc.id} value={lc.id}>
                              {lc.name} ({lc.type})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div>
                          <label className="text-[9px] text-slate-500 block mb-0.5">Fx (kN)</label>
                          <input
                            type="number"
                            step="any"
                            value={sidebarJointFx}
                            onChange={(e) => setSidebarJointFx(e.target.value)}
                            className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 block mb-0.5">Fy (kN)</label>
                          <input
                            type="number"
                            step="any"
                            value={sidebarJointFy}
                            onChange={(e) => setSidebarJointFy(e.target.value)}
                            className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 block mb-0.5">Mz (kNm)</label>
                          <input
                            type="number"
                            step="any"
                            value={sidebarJointMz}
                            onChange={(e) => setSidebarJointMz(e.target.value)}
                            className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800 font-mono"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-1.5 px-2 bg-[#004A99] hover:bg-[#003B7A] text-white text-[11px] font-bold rounded-sm transition flex items-center justify-center gap-1 cursor-pointer mt-1"
                      >
                        <Plus className="w-3 h-3" /> Assign Load
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Selected Frame Member properties */}
            {selectedFrame && (
              <div id="frame-properties-panel" className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#D1D1D1] pb-1.5">
                  <h4 className="font-bold text-xs text-emerald-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    Frame Member: {selectedFrame.id}
                  </h4>
                </div>

                {/* Connectivity */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-[#004A99] uppercase tracking-wider block border-b border-[#EAEAEA] pb-0.5">
                    Joint Connectivity Link
                  </span>
                  <div className="flex items-center justify-around bg-[#F9F9F9] border border-[#D1D1D1] rounded-sm p-1.5 text-xs font-mono font-bold text-slate-800">
                    <span>{selectedFrame.nodeI}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#004A99]" />
                    <span>{selectedFrame.nodeJ}</span>
                  </div>
                </div>

                {/* Section selection */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-[#004A99] uppercase tracking-wider block border-b border-[#EAEAEA] pb-0.5">
                    Structural Section Assignment
                  </span>
                  <select
                    id="prop-frame-section"
                    value={selectedFrame.sectionId}
                    onChange={(e) => handleFrameSectionChange(e.target.value)}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1.5 text-xs text-slate-800 font-semibold"
                  >
                    {sections.map((sect) => {
                      const mat = materials.find((m) => m.id === sect.materialId);
                      return (
                        <option key={sect.id} value={sect.id}>
                          {sect.name} ({sect.shape} - {mat?.name})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Element loads list */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-[#004A99] uppercase tracking-wider block border-b border-[#EAEAEA] pb-0.5">
                    Applied Frame Forces
                  </span>
                  {selectedFrame.loads.length === 0 ? (
                    <div className="text-[10px] text-slate-400 italic">
                      No direct member loads assigned.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {selectedFrame.loads.map((l) => {
                        const lc = loadCases.find((c) => c.id === l.loadCaseId);
                        return (
                          <div
                            key={l.id}
                            className="bg-[#F9F9F9] border border-[#D1D1D1] rounded-sm p-2 flex flex-col gap-1 text-xs text-slate-600 font-mono"
                          >
                            <div className="flex justify-between items-center">
                              <div className="text-[9px] uppercase font-bold text-[#004A99]">
                                Case: {lc?.name || l.loadCaseId}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteFrameLoad(l.id)}
                                className="text-rose-600 hover:text-rose-800 p-0.5 cursor-pointer"
                                title="Delete load"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-700">
                              <span>Type: <strong>{l.type}</strong></span>
                              <span>Val: <strong className="text-pink-600">{l.value} {l.type === 'UDL' ? 'kN/m' : 'kN'}</strong></span>
                            </div>
                            <div className="text-[9px] text-slate-400">
                              Dir: {l.direction} {l.type === 'Point' ? `| At offset: ${l.offset}` : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Sidebar Add Frame Load Form */}
                  <form onSubmit={handleAddFrameLoad} className="bg-[#F3FAF5] border border-[#BDDFCA] rounded p-2.5 mt-2 space-y-2">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block pb-0.5">
                      Add / Update Frame Load
                    </span>
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="text-[9px] text-slate-500 block mb-0.5">Load Case</label>
                          <select
                            value={sidebarFrameCaseId}
                            onChange={(e) => setSidebarFrameCaseId(e.target.value)}
                            className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800 font-medium"
                          >
                            {loadCases.map((lc) => (
                              <option key={lc.id} value={lc.id}>
                                {lc.name} ({lc.type})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 block mb-0.5">Load Type</label>
                          <select
                            value={sidebarFrameLoadType}
                            onChange={(e: any) => setSidebarFrameLoadType(e.target.value)}
                            className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800 font-medium"
                          >
                            <option value="UDL">Distributed (UDL)</option>
                            <option value="Point">Point Load</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="text-[9px] text-slate-500 block mb-0.5">Direction</label>
                          <select
                            value={sidebarFrameLoadDir}
                            onChange={(e: any) => setSidebarFrameLoadDir(e.target.value)}
                            className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800 font-medium"
                          >
                            <option value="GlobalY">Gravity (-Y)</option>
                            <option value="LocalY">Perpendicular</option>
                            <option value="GlobalX">Wind (+X)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 block mb-0.5">
                            {sidebarFrameLoadType === 'UDL' ? 'Value (kN/m)' : 'Value (kN)'}
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={sidebarFrameLoadVal}
                            onChange={(e) => setSidebarFrameLoadVal(e.target.value)}
                            className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800 font-mono"
                          />
                        </div>
                      </div>

                      {sidebarFrameLoadType === 'Point' && (
                        <div>
                          <label className="text-[9px] text-slate-500 block mb-0.5">
                            Relative Offset [0-1]
                          </label>
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            max="1"
                            value={sidebarFrameLoadOffset}
                            onChange={(e) => setSidebarFrameLoadOffset(e.target.value)}
                            className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800 font-mono"
                          />
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full py-1.5 px-2 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold rounded-sm transition flex items-center justify-center gap-1 cursor-pointer mt-1"
                      >
                        <Plus className="w-3 h-3" /> Assign Load
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SECTIONS & SHAPES MANAGER */}
        {activeTab === 'sections' && (
          <div id="sections-tab-panel" className="space-y-4">
            {/* Active sections list */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[#004A99] uppercase tracking-wider block border-b border-[#EAEAEA] pb-0.5">
                Defined Section Properties
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {sections.map((sect) => {
                  const mat = materials.find((m) => m.id === sect.materialId);
                  return (
                    <div
                      key={sect.id}
                      className="bg-[#F9F9F9] border border-[#D1D1D1] rounded-sm p-2 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{sect.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Shape: {sect.shape} | mat: {mat?.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Dims: {sect.width}m x {sect.depth}m
                        </div>
                      </div>
                      {sections.length > 1 && (
                        <button
                          id={`delete-section-btn-${sect.id}`}
                          onClick={() => onDeleteSection(sect.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-200 cursor-pointer transition-colors"
                          title="Delete Section Property"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Create new Section form */}
            <form id="create-section-form" onSubmit={handleCreateSection} className="space-y-3 pt-3 border-t border-[#D1D1D1]">
              <span className="text-[10px] font-bold text-[#004A99] uppercase tracking-wider block border-b border-[#EAEAEA] pb-0.5">
                Define New Property
              </span>

              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Section Name</label>
                <input
                  id="sect-form-name"
                  type="text"
                  value={newSectName}
                  onChange={(e) => setNewSectName(e.target.value)}
                  className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Shape Profile</label>
                  <select
                    id="sect-form-shape"
                    value={newSectShape}
                    onChange={(e: any) => {
                      const shape = e.target.value;
                      setNewSectShape(shape);
                      if (shape === 'I-Shape') {
                        setNewSectName('ISMB 250 Steel');
                        setNewSectWidth('0.125');
                        setNewSectDepth('0.250');
                        setNewSectTw('0.0069');
                        setNewSectTf('0.0125');
                      } else if (shape === 'Circular') {
                        setNewSectName('Circular Column 300 (IS 456)');
                        setNewSectWidth('0.30');
                        setNewSectDepth('0.30');
                      } else {
                        setNewSectName('Concrete Beam 300x500 (IS 456)');
                        setNewSectWidth('0.30');
                        setNewSectDepth('0.50');
                      }
                    }}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800"
                  >
                    <option value="Rectangular">Rectangular</option>
                    <option value="Circular">Circular</option>
                    <option value="I-Shape">I-Shape (Steel)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Material</label>
                  <select
                    id="sect-form-material"
                    value={newSectMatId}
                    onChange={(e) => setNewSectMatId(e.target.value)}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800"
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Width / Flange b (m)</label>
                  <input
                    id="sect-form-width"
                    type="number"
                    step="0.01"
                    value={newSectWidth}
                    onChange={(e) => setNewSectWidth(e.target.value)}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Depth / Diameter h (m)</label>
                  <input
                    id="sect-form-depth"
                    type="number"
                    step="0.01"
                    value={newSectDepth}
                    onChange={(e) => setNewSectDepth(e.target.value)}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800 font-mono"
                  />
                </div>
              </div>

              {newSectShape === 'I-Shape' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Web tw (m)</label>
                    <input
                      id="sect-form-tw"
                      type="number"
                      step="0.001"
                      value={newSectTw}
                      onChange={(e) => setNewSectTw(e.target.value)}
                      className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Flange tf (m)</label>
                    <input
                      id="sect-form-tf"
                      type="number"
                      step="0.001"
                      value={newSectTf}
                      onChange={(e) => setNewSectTf(e.target.value)}
                      className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs font-mono text-slate-800"
                    />
                  </div>
                </div>
              )}

              <button
                id="btn-submit-section"
                type="submit"
                className="w-full bg-[#004A99] hover:bg-[#003B7A] text-white font-bold rounded-sm py-1.5 text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Section Assignment
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: LOAD CASES & COMBINATIONS */}
        {activeTab === 'combos' && (
          <div id="loads-tab-panel" className="space-y-4">
            {/* Active Load Case select */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[#004A99] uppercase tracking-wider block border-b border-[#EAEAEA] pb-0.5">
                Active Draw Load Case
              </span>
              <select
                id="active-load-case-select"
                value={activeLoadCaseId}
                onChange={(e) => setActiveLoadCaseId(e.target.value)}
                className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1.5 text-xs text-slate-800 font-semibold"
              >
                {loadCases.map((lc) => (
                  <option key={lc.id} value={lc.id}>
                    {lc.name} ({lc.type})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 leading-normal italic mt-0.5">
                New joint/member loads you draw will belong to this active case.
              </p>
            </div>

            {/* Load Combinations manager */}
            <div className="space-y-1.5 pt-2 border-t border-[#D1D1D1]">
              <span className="text-[10px] font-bold text-[#004A99] uppercase tracking-wider block border-b border-[#EAEAEA] pb-0.5">
                Active Analysis Combination
              </span>
              <select
                id="active-combo-select"
                value={activeComboId}
                onChange={(e) => setActiveComboId(e.target.value)}
                className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1.5 text-xs text-slate-800 font-bold"
              >
                {combinations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Scale Factors detail editing */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] font-bold text-[#004A99] uppercase tracking-wider block border-b border-[#EAEAEA] pb-0.5">
                Combination Scale Factors
              </span>
              <div className="space-y-2">
                {combinations.map((combo) => (
                  <div
                    key={combo.id}
                    className="bg-[#F9F9F9] p-2.5 rounded border border-[#D1D1D1] text-xs text-slate-800"
                  >
                    <div className="font-bold text-[#004A99] mb-2">{combo.name}</div>
                    <div className="space-y-1.5">
                      {loadCases.map((lc) => (
                        <div key={lc.id} className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">{lc.name} ({lc.type}):</span>
                          <input
                            id={`factor-input-${combo.id}-${lc.id}`}
                            type="number"
                            step="0.1"
                            value={combo.factors[lc.id] !== undefined ? combo.factors[lc.id] : 0}
                            onChange={(e) =>
                              handleComboFactorChange(combo.id, lc.id, parseFloat(e.target.value) || 0)
                            }
                            className="w-16 bg-white border border-[#C5C5C5] rounded-sm px-1 py-0.5 text-right font-mono text-xs text-slate-800"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: GRIDS GRIDSPACING */}
        {activeTab === 'grids' && (
          <div id="grids-tab-panel" className="space-y-3">
            <span className="text-[10px] font-bold text-[#004A99] uppercase tracking-wider block border-b border-[#EAEAEA] pb-0.5">
              CAD Snap Grid Layout
            </span>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">X Grid Spacing (meters)</label>
              <div className="flex gap-2">
                <input
                  id="grid-x-spacing"
                  type="number"
                  step="1"
                  value={gridSettings.xSpacing}
                  onChange={(e) => handleGridChange('xSpacing', parseFloat(e.target.value) || 1)}
                  className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800 font-mono"
                />
                <span className="flex items-center text-xs text-slate-500">meters</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">Number of X Lines</label>
              <input
                id="grid-x-lines"
                type="number"
                value={gridSettings.xLines}
                onChange={(e) => handleGridChange('xLines', parseInt(e.target.value) || 1)}
                className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800 font-mono"
              />
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[#D1D1D1]">
              <label className="text-xs font-semibold text-slate-600 block">Y Grid Spacing (meters)</label>
              <div className="flex gap-2">
                <input
                  id="grid-y-spacing"
                  type="number"
                  step="1"
                  value={gridSettings.ySpacing}
                  onChange={(e) => handleGridChange('ySpacing', parseFloat(e.target.value) || 1)}
                  className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800 font-mono"
                />
                <span className="flex items-center text-xs text-slate-500">meters</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">Number of Y Lines (Storeys)</label>
              <input
                id="grid-y-lines"
                type="number"
                value={gridSettings.yLines}
                onChange={(e) => handleGridChange('yLines', parseInt(e.target.value) || 1)}
                className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800 font-mono"
              />
            </div>
            
            <p className="text-[10px] text-slate-500 leading-normal italic pt-2">
              Modifying spacing will dynamically update the snapping grid on the CAD canvas immediately.
            </p>
          </div>
        )}

        {/* TAB 5: ENGINEERING DESIGN CALCULATORS */}
        {activeTab === 'calcs' && (
          <div id="calcs-tab-panel" className="space-y-4 pb-8">
            {/* IS 456 RC Structure Design Specifications */}
            <div className="border border-indigo-200 rounded p-3 bg-indigo-50/50 space-y-2.5">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block border-b border-indigo-100 pb-1 flex items-center justify-between">
                <span>IS 456 Design Specifications</span>
                <span className="bg-indigo-100 text-indigo-800 px-1 rounded text-[9px]">User Inputs</span>
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 block">Concrete Grade</label>
                  <select
                    value={rcConcreteGrade}
                    onChange={(e) => setRcConcreteGrade(parseInt(e.target.value))}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800"
                  >
                    <option value={20}>M20 (20 MPa)</option>
                    <option value={25}>M25 (25 MPa)</option>
                    <option value={30}>M30 (30 MPa)</option>
                    <option value={35}>M35 (35 MPa)</option>
                    <option value={40}>M40 (40 MPa)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 block">Steel Rebar Grade</label>
                  <select
                    value={rcSteelGrade}
                    onChange={(e) => setRcSteelGrade(parseInt(e.target.value))}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800"
                  >
                    <option value={250}>Fe 250 (Mild Steel)</option>
                    <option value={415}>Fe 415 (Deformed)</option>
                    <option value={500}>Fe 500 (TMT)</option>
                    <option value={550}>Fe 550 (High Strength)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 block">Clear Cover Beam (mm)</label>
                  <input
                    type="number"
                    value={rcClearCoverBeam}
                    onChange={(e) => setRcClearCoverBeam(Math.max(15, parseInt(e.target.value) || 25))}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 block">Clear Cover Column (mm)</label>
                  <input
                    type="number"
                    value={rcClearCoverColumn}
                    onChange={(e) => setRcClearCoverColumn(Math.max(20, parseInt(e.target.value) || 40))}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 block">Beam Bar Dia (mm)</label>
                  <select
                    value={rcMainBarDiaBeam}
                    onChange={(e) => setRcMainBarDiaBeam(parseInt(e.target.value))}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800"
                  >
                    <option value={12}>12 mm</option>
                    <option value={16}>16 mm</option>
                    <option value={20}>20 mm</option>
                    <option value={25}>25 mm</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 block">Column Bar Dia (mm)</label>
                  <select
                    value={rcMainBarDiaColumn}
                    onChange={(e) => setRcMainBarDiaColumn(parseInt(e.target.value))}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800"
                  >
                    <option value={12}>12 mm</option>
                    <option value={16}>16 mm</option>
                    <option value={20}>20 mm</option>
                    <option value={25}>25 mm</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 block">Stirrup Dia (mm)</label>
                  <select
                    value={rcStirrupDia}
                    onChange={(e) => setRcStirrupDia(parseInt(e.target.value))}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800"
                  >
                    <option value={6}>6 mm</option>
                    <option value={8}>8 mm</option>
                    <option value={10}>10 mm</option>
                    <option value={12}>12 mm</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 block">Stirrup Legs</label>
                  <select
                    value={rcStirrupLegs}
                    onChange={(e) => setRcStirrupLegs(parseInt(e.target.value))}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800"
                  >
                    <option value={2}>2 Legs</option>
                    <option value={4}>4 Legs</option>
                  </select>
                </div>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => {
                    alert("RC Specifications updated. Click 'run analysis' to recompute and design accordingly!");
                  }}
                  className="w-full py-1 px-2 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded transition-colors text-center cursor-pointer"
                >
                  Apply Specs
                </button>
              </div>
            </div>


            {/* Masonry Wall Load Estimator */}
            <div className="border border-slate-200 rounded p-3 bg-slate-50 space-y-2">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block border-b border-emerald-100 pb-1 flex items-center justify-between">
                <span>Wall Load UDL Calculator</span>
                <span className="bg-emerald-100 text-emerald-800 px-1 rounded text-[9px]">IS 875 Part 1</span>
              </span>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-600 block">Wall Thickness (mm)</label>
                <select
                  value={wallThickness}
                  onChange={(e) => setWallThickness(parseInt(e.target.value))}
                  className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800"
                >
                  <option value={230}>230mm (9" Outer Main Wall)</option>
                  <option value={115}>115mm (4.5" Inner Partition)</option>
                  <option value={150}>150mm (6" Light AAC Wall)</option>
                  <option value={100}>100mm (4" Core Brick)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-600 block">Storey Ceiling Height (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={wallHeight}
                  onChange={(e) => setWallHeight(Math.max(0.1, parseFloat(e.target.value) || 3.0))}
                  className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-600 block">Masonry Density (kN/m³)</label>
                <select
                  value={masonryDensity}
                  onChange={(e) => setMasonryDensity(parseInt(e.target.value))}
                  className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800"
                >
                  <option value={19}>19 kN/m³ (Red Clay/Fly Ash Brick)</option>
                  <option value={8}>8 kN/m³ (Lightweight AAC Blocks)</option>
                  <option value={22}>22 kN/m³ (Solid Concrete Blocks)</option>
                </select>
              </div>

              {(() => {
                const calculatedLoad = Number(
                  (
                    (wallThickness / 1000) * masonryDensity * wallHeight
                  ).toFixed(2)
                );
                return (
                  <>
                    <div className="p-2 bg-emerald-50 rounded border border-emerald-200 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-600 font-bold">Calculated Beam Load UDL:</span>
                        <span className="text-xs font-mono font-bold text-emerald-700">
                          {calculatedLoad} kN/m
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (!selectedFrame) {
                            alert("Please select a frame member (beam) on the canvas to apply this load.");
                            return;
                          }
                          const newLoad = {
                            id: `WallUDL_${Date.now()}`,
                            type: 'UDL' as const,
                            direction: 'GlobalY' as const,
                            value: calculatedLoad, // Downward load is positive in our solver for GlobalY
                            loadCaseId: activeLoadCaseId,
                          };
                          onUpdateFrame({
                            ...selectedFrame,
                            loads: [...selectedFrame.loads, newLoad],
                          });
                          alert(`Applied downward UDL of ${calculatedLoad} kN/m to selected frame ${selectedFrame.id}.`);
                        }}
                        disabled={!selectedFrame}
                        className={`flex-1 py-1.5 px-2 text-[10px] uppercase font-bold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          selectedFrame
                            ? 'bg-slate-800 text-white hover:bg-slate-900'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Manual</span>
                      </button>

                      <button
                        onClick={() => {
                          onAutoAssignIS875Loads({
                            wallThickness,
                            storeyHeight: wallHeight,
                            masonryDensity,
                          });
                        }}
                        className="flex-1 py-1.5 px-2 text-[10px] uppercase font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                      >
                        <span>⚡ Auto-Assign All</span>
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Slab Reinforcement Designer */}
            <div className="border border-slate-200 rounded p-3 bg-slate-50 space-y-2">
              <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block border-b border-sky-100 pb-1 flex items-center justify-between">
                <span>Concrete Slab Reinforcement</span>
                <span className="bg-sky-100 text-sky-800 px-1 rounded text-[9px]">IS 456 Annex D</span>
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-500">Short Span Lx (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={slabLx}
                    onChange={(e) => setSlabLx(Math.max(0.5, parseFloat(e.target.value) || 3.0))}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-500">Long Span Ly (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={slabLy}
                    onChange={(e) => setSlabLy(Math.max(0.5, parseFloat(e.target.value) || 4.0))}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-500">Live Load (kN/m²)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={slabLiveLoad}
                    onChange={(e) => setSlabLiveLoad(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-500">Floor Finish (kN/m²)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={slabFF}
                    onChange={(e) => setSlabFF(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-500">Slab Depth D (mm)</label>
                  <input
                    type="number"
                    value={slabThickness}
                    onChange={(e) => setSlabThickness(Math.max(50, parseInt(e.target.value) || 125))}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-500">Bar Diameter (mm)</label>
                  <select
                    value={slabRebarDia}
                    onChange={(e) => setSlabRebarDia(parseInt(e.target.value))}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800"
                  >
                    <option value={8}>8 mm TMT</option>
                    <option value={10}>10 mm TMT</option>
                    <option value={12}>12 mm TMT</option>
                  </select>
                </div>
              </div>

              {/* Design Calculations for Slab */}
              {(() => {
                const selfWeight = (slabThickness / 1000) * 25.0; // concrete self-weight
                const totalWorkingLoad = selfWeight + slabLiveLoad + slabFF;
                const totalFactoredLoad = 1.5 * totalWorkingLoad;
                const r = slabLy / slabLx;
                const isTwoWay = r < 2.0;
                
                // Effective depth d
                const d = slabThickness - 20; // 15mm cover + 5mm bar center approx
                
                // Bending moments
                let Mux = 0;
                let alpha_x = 0;

                if (!isTwoWay) {
                  // One-way slab (Simply supported)
                  Mux = (totalFactoredLoad * slabLx * slabLx) / 8;
                } else {
                  // Two-way slab (Rankine-Grashoff or IS 456 coefficients)
                  const r4 = Math.pow(r, 4);
                  alpha_x = r4 / (8 * (1 + r4));
                  Mux = alpha_x * totalFactoredLoad * slabLx * slabLx;
                }

                // Required Steel Ast (mm²/m)
                const fck = 25; // M25 Concrete
                const fy = 500; // Fe 500 Rebar
                const b = 1000; // 1 meter strip

                const term = 1 - (4.6 * Mux * 1e6) / (fck * b * d * d);
                let astRequired = 0;
                let hasFails = false;
                let failMessage = '';

                if (term < 0) {
                  hasFails = true;
                  failMessage = "Slab is too thin for bending moment! Increase depth.";
                } else {
                  astRequired = (0.5 * fck * b * d / fy) * (1 - Math.sqrt(term));
                }

                // Minimum Steel (0.12% of total cross-sectional area per IS 456)
                const astMin = 0.0012 * b * slabThickness;
                if (astRequired < astMin) {
                  astRequired = astMin;
                }

                // Spacing
                const singleBarArea = (Math.PI * slabRebarDia * slabRebarDia) / 4;
                const spacing = (singleBarArea * 1000) / astRequired;
                const roundedSpacing = Math.min(300, Math.floor(spacing / 25) * 25); // round down to multiple of 25mm, max 300mm

                // L/d deflection check (Allowable simply supported = 20)
                const actualL_d = (slabLx * 1000) / d;
                const limitL_d = isTwoWay ? 24 : 20;
                const deflectionPass = actualL_d <= limitL_d;

                return (
                  <div className="p-2 bg-sky-50 rounded border border-sky-200 mt-2 text-[10px] space-y-1">
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Slab Type:</span>
                      <span className="text-sky-800">{isTwoWay ? 'Two-Way Slab' : 'One-Way Slab'} (r = {r.toFixed(2)})</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Factored Load:</span>
                      <span className="font-mono">{totalFactoredLoad.toFixed(2)} kN/m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bending Moment Mux:</span>
                      <span className="font-mono">{Mux.toFixed(2)} kNm/m</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ast Steel Required:</span>
                      <span className="font-mono">{astRequired.toFixed(1)} mm²/m</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-sky-100">
                      <span>Spacing Required:</span>
                      <span className="text-sky-700 font-mono">
                        {hasFails ? 'FAIL' : `T${slabRebarDia} @ ${roundedSpacing}mm C/C`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] pt-0.5">
                      <span>Deflection Check (L/d):</span>
                      <span className={`font-semibold ${deflectionPass ? 'text-green-600' : 'text-amber-600'}`}>
                        {deflectionPass ? `PASS (L/d = ${actualL_d.toFixed(1)} < ${limitL_d})` : `FAIL (L/d = ${actualL_d.toFixed(1)} > ${limitL_d})`}
                      </span>
                    </div>
                    {hasFails && (
                      <div className="text-red-600 font-bold text-[9px] uppercase mt-1 leading-tight">
                        ⚠️ {failMessage}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Dynamic IS 456 & IS 1904 & IS 2911 Foundation Design Suite */}
            <div className="border border-slate-200 rounded p-3 bg-slate-50 space-y-2">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block border-b border-amber-100 pb-1 flex items-center justify-between">
                <span>Foundation Design Suite</span>
                <span className="bg-amber-100 text-amber-800 px-1 rounded text-[9px]">IS-456 / IS-6403</span>
              </span>

              {/* Foundation Type Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 block">Foundation Selection Type</label>
                <select
                  value={foundationType}
                  onChange={(e) => setFoundationType(e.target.value)}
                  className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800 font-semibold"
                >
                  <option value="Auto">Auto (Determine by Soil & Loads)</option>
                  <option value="Isolated">Isolated Footing (IS 456 Cl 34)</option>
                  <option value="Strip">Strip Footing (Continuous)</option>
                  <option value="Raft">Raft / Mat Foundation (IS 1904)</option>
                  <option value="Pile">Pile Foundation (IS 2911)</option>
                </select>
              </div>

              {/* Inputs */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 block">Base Column Axial Load P (kN)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={footingP}
                    onChange={(e) => setFootingP(Math.max(10, parseInt(e.target.value) || 200))}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800 font-mono"
                  />
                  <span className="flex items-center text-[10px] text-slate-500 font-bold">kN</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 block">Soil Safe Bearing Capacity (SBC)</label>
                <select
                  value={footingSbc}
                  onChange={(e) => setFootingSbc(parseInt(e.target.value))}
                  className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-xs text-slate-800"
                >
                  <option value={50}>50 kN/m² (Soft Clay/Very Poor Soil)</option>
                  <option value={80}>80 kN/m² (Loose Sand/Poor Soil)</option>
                  <option value={110}>110 kN/m² (Medium Silt/Clay)</option>
                  <option value={150}>150 kN/m² (Medium Soil Standard)</option>
                  <option value={200}>200 kN/m² (Stiff Clay/Dense Sand)</option>
                  <option value={300}>300 kN/m² (Hard Murrum/Rocky)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-500 block">Concrete Grade</label>
                  <select
                    value={footingConcreteGrade}
                    onChange={(e) => setFootingConcreteGrade(parseInt(e.target.value))}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800"
                  >
                    <option value={20}>M20</option>
                    <option value={25}>M25</option>
                    <option value={30}>M30</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-500 block">Thickness D (mm)</label>
                  <input
                    type="number"
                    value={footingDepth}
                    onChange={(e) => setFootingDepth(Math.max(150, parseInt(e.target.value) || 300))}
                    className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Dynamic Design Output based on selected type */}
              {(() => {
                const report = calculateFoundationDesign(
                  joints,
                  frames,
                  results,
                  footingP,
                  footingSbc,
                  footingConcreteGrade,
                  footingRebarDia,
                  footingDepth,
                  foundationType,
                  isolatedWidthManual,
                  stripWidthManual,
                  raftLengthManual,
                  raftWidthManual
                );

                const showAutoIndicator = foundationType === 'Auto';

                return (
                  <div className="space-y-2 mt-2">
                    {/* Dimension Overrides Panel */}
                    <div className="bg-slate-100 border border-slate-200 p-2 rounded text-[10px] space-y-1.5">
                      <div className="font-bold text-slate-700 uppercase text-[9px] flex justify-between items-center">
                        <span>📐 Manual Dimension Adjuster</span>
                        <span className="text-[8px] bg-slate-200 px-1 py-0.2 rounded text-slate-600">Interactive</span>
                      </div>
                      
                      {report.selectedType === 'Isolated' && (
                        <div className="space-y-1">
                          <label className="text-[9px] font-semibold text-slate-600 block">Footing Width / Side (meters):</label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={isolatedWidthManual || ''}
                              placeholder={`${report.isolated.criticalDesign.sideRounded.toFixed(1)} (Auto)`}
                              onChange={(e) => setIsolatedWidthManual(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800 font-mono font-bold"
                            />
                            {isolatedWidthManual > 0 && (
                              <button
                                onClick={() => setIsolatedWidthManual(0)}
                                className="text-[8px] bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-1.5 py-1 rounded cursor-pointer font-bold transition-colors"
                                title="Reset to auto"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                          <span className="text-[8px] text-slate-500 block">Enter desired width. Soil bearing and punching shear recalculate in real-time.</span>
                        </div>
                      )}

                      {report.selectedType === 'Strip' && (
                        <div className="space-y-1">
                          <label className="text-[9px] font-semibold text-slate-600 block">Strip Footing Width (meters):</label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={stripWidthManual || ''}
                              placeholder={`${(report.strip.designs[0]?.widthProvided || 1.2).toFixed(1)} (Auto)`}
                              onChange={(e) => setStripWidthManual(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800 font-mono font-bold"
                            />
                            {stripWidthManual > 0 && (
                              <button
                                onClick={() => setStripWidthManual(0)}
                                className="text-[8px] bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-1.5 py-1 rounded cursor-pointer font-bold transition-colors"
                                title="Reset to auto"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                          <span className="text-[8px] text-slate-500 block">Modifies strip footing width continuously. Transverse steel recalculates automatically.</span>
                        </div>
                      )}

                      {report.selectedType === 'Raft' && (
                        <div className="space-y-1">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-0.5">
                              <label className="text-[8px] font-semibold text-slate-600 block">Raft Length X (m):</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={raftLengthManual || ''}
                                placeholder={`${report.raft.length.toFixed(1)} (Auto)`}
                                onChange={(e) => setRaftLengthManual(Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800 font-mono font-bold"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[8px] font-semibold text-slate-600 block">Raft Width Z (m):</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={raftWidthManual || ''}
                                placeholder={`${report.raft.width.toFixed(1)} (Auto)`}
                                onChange={(e) => setRaftWidthManual(Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800 font-mono font-bold"
                              />
                            </div>
                          </div>
                          {(raftLengthManual > 0 || raftWidthManual > 0) && (
                            <button
                              onClick={() => { setRaftLengthManual(0); setRaftWidthManual(0); }}
                              className="w-full text-center text-[8px] bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 py-1 rounded cursor-pointer mt-1 font-bold transition-colors"
                            >
                              Reset Both to Auto
                            </button>
                          )}
                          <span className="text-[8px] text-slate-500 block">Adjust raft layout footprint. Soil average pressure adapts instantly.</span>
                        </div>
                      )}

                      {report.selectedType === 'Pile' && (
                        <span className="text-[8px] text-[#A21F1F] block italic font-medium">Deep Piles transfer loading down to hard rock strata. Driving depths are determined by site geotech boring logs.</span>
                      )}
                    </div>

                    {/* Auto-Reasoning Box */}
                    {showAutoIndicator && (
                      <div className="p-2 bg-amber-50/80 border border-amber-200 rounded text-[9px] text-amber-900 leading-tight">
                        <span className="font-bold uppercase block text-amber-800 mb-0.5">💡 Auto-Selection Recommendation:</span>
                        {report.reasoning}
                        <div className="mt-1 font-semibold text-[#004A99]">
                          Selected: <span className="underline font-bold text-xs">{report.selectedType} Foundation</span>
                        </div>
                      </div>
                    )}

                    {/* Rendering Calculation details for active selection */}
                    {report.selectedType === 'Isolated' && (() => {
                      const cd = report.isolated.criticalDesign;
                      const allowablePunching = 0.25 * Math.sqrt(footingConcreteGrade);
                      const punchingFail = cd.punchingStress > allowablePunching;
                      const sizeStatus = cd.sbcStatus === 'PASS';

                      return (
                        <div className="p-2.5 bg-sky-50 rounded border border-sky-200 text-[10px] space-y-1.5 text-slate-800">
                          <div className="font-bold text-[#004A99] uppercase text-[9px] border-b border-sky-200 pb-0.5 flex justify-between">
                            <span>Isolated Footing Calculation</span>
                            <span>{cd.jointId} (Max Load)</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>Soil Status:</span>
                            <span className={sizeStatus ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>
                              {sizeStatus ? 'PASS' : 'FAIL (Increase Footing)'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Footprint Dimension:</span>
                            <span className="font-bold font-mono text-slate-900">{cd.sideRounded.toFixed(1)}m × {cd.sideRounded.toFixed(1)}m</span>
                          </div>
                          <div className="flex justify-between">
                            <span>SBC / Actual Pres:</span>
                            <span className="font-mono">{footingSbc} / {cd.actualPressure.toFixed(1)} kN/m²</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Two-Way Punching:</span>
                            <span className="font-mono">{cd.punchingStress.toFixed(2)} MPa</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Punching Limit:</span>
                            <span className="font-mono">{(allowablePunching).toFixed(2)} MPa</span>
                          </div>
                          <div className="flex justify-between font-bold border-t border-sky-200 pt-1.5 text-slate-700">
                            <span>Recommended Bars:</span>
                            <span className="text-[#004A99] font-mono">T{footingRebarDia} @ {cd.spacingRounded}mm C/C</span>
                          </div>
                          <div className="flex justify-between items-center text-[9px] pt-0.5">
                            <span>Thickness D:</span>
                            <span className="font-mono text-slate-600 font-bold">{footingDepth}mm (d={footingDepth - 56}mm)</span>
                          </div>
                        </div>
                      );
                    })()}

                    {report.selectedType === 'Strip' && (() => {
                      const cd = report.strip.designs[0] || {
                        length: 4.5,
                        P_total: footingP * 2,
                        widthProvided: 1.2,
                        actualPressure: footingP * 2 / (4.5 * 1.2),
                        sbcStatus: 'PASS',
                        D_mm: footingDepth,
                        spacingTransverse: 175,
                        punchingStress: 0.2
                      };
                      const limitShear = 0.25 * Math.sqrt(footingConcreteGrade);

                      return (
                        <div className="p-2.5 bg-emerald-50 rounded border border-emerald-200 text-[10px] space-y-1.5 text-slate-800">
                          <div className="font-bold text-emerald-800 uppercase text-[9px] border-b border-emerald-200 pb-0.5">
                            Strip Footing Calculation
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>SBC Status:</span>
                            <span className={cd.sbcStatus === 'PASS' ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                              {cd.sbcStatus}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Length of Strip:</span>
                            <span className="font-bold font-mono">{cd.length.toFixed(1)} m</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Strip Width Provided:</span>
                            <span className="font-bold font-mono text-slate-900">{cd.widthProvided.toFixed(1)} m</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Group Load:</span>
                            <span className="font-mono">{cd.P_total.toFixed(0)} kN</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Actual Soil Pressure:</span>
                            <span className="font-mono">{cd.actualPressure.toFixed(1)} kN/m²</span>
                          </div>
                          <div className="flex justify-between font-bold border-t border-emerald-200 pt-1.5 text-slate-700">
                            <span>Transverse Bars:</span>
                            <span className="text-emerald-800 font-mono">T{footingRebarDia} @ {cd.spacingTransverse}mm C/C</span>
                          </div>
                          <div className="text-[9px] text-slate-500 italic mt-0.5 leading-normal">
                            *Continuous longitudinal steel acts as a stiff beam resisting differential settlement.
                          </div>
                        </div>
                      );
                    })()}

                    {report.selectedType === 'Raft' && (() => {
                      const cd = report.raft;

                      return (
                        <div className="p-2.5 bg-indigo-50 rounded border border-indigo-200 text-[10px] space-y-1.5 text-slate-800">
                          <div className="font-bold text-indigo-800 uppercase text-[9px] border-b border-indigo-200 pb-0.5">
                            Raft Foundation Calculation
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>SBC Status:</span>
                            <span className={cd.sbcStatus === 'PASS' ? 'text-indigo-700 font-bold' : 'text-red-700 font-bold'}>
                              {cd.sbcStatus}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Raft Plan Size:</span>
                            <span className="font-bold font-mono text-indigo-950">{cd.length.toFixed(1)}m × {cd.width.toFixed(1)}m</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Structure Load:</span>
                            <span className="font-mono">{cd.P_total.toFixed(0)} kN</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Average Soil Pressure:</span>
                            <span className="font-mono">{cd.actualPressure.toFixed(1)} kN/m²</span>
                          </div>
                          <div className="flex justify-between font-bold border-t border-indigo-200 pt-1.5 text-slate-700">
                            <span>Main Mesh (Bottom/Top):</span>
                            <span className="text-indigo-800 font-mono">T{Math.max(12, footingRebarDia)} @ {cd.spacingDir1}mm C/C</span>
                          </div>
                          <div className="text-[9px] text-slate-500 italic mt-0.5 leading-normal">
                            *Conforms to IS 1904. Raft slab thickness is {cd.D_mm}mm with heavy bottom + top mesh for uniform distribution.
                          </div>
                        </div>
                      );
                    })()}

                    {report.selectedType === 'Pile' && (
                      <div className="p-2.5 bg-rose-50 rounded border border-rose-200 text-[10px] space-y-1.5 text-slate-800">
                        <div className="font-bold text-rose-800 uppercase text-[9px] border-b border-rose-200 pb-0.5 flex justify-between">
                          <span>Pile Foundation Recommendation</span>
                          <span className="font-mono font-bold text-rose-700">IS 2911</span>
                        </div>
                        <p className="text-[10px] leading-relaxed text-rose-900 font-medium">
                          {report.pile.message}
                        </p>
                        <div className="p-1 bg-white/70 border border-rose-100 rounded text-[9px] text-slate-500">
                          Order of Preference: Isolated ➔ Strip ➔ Raft ➔ <strong>[Pile Selected]</strong>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* TAB 6: MATERIALS BOQ & INDUSTRIAL PRICING ESTIMATOR */}
        {activeTab === 'boq' && (
          <div id="boq-tab-panel" className="space-y-4 pb-8">
            <div className="border border-slate-200 rounded p-3 bg-slate-50 space-y-3">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block border-b border-blue-100 pb-1 flex items-center justify-between">
                <span>Industrial Cost Estimator</span>
                <span className="bg-blue-100 text-blue-800 px-1 rounded text-[9px]">Market Rates (INR)</span>
              </span>

              <div className="space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[10px] text-slate-600 font-semibold w-2/3">M25 Concrete (₹/m³)</span>
                  <input
                    type="number"
                    value={concreteRate}
                    onChange={(e) => setConcreteRate(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-1/3 bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800 font-mono text-right"
                  />
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[10px] text-slate-600 font-semibold w-2/3">Rebar Steel TMT (₹/kg)</span>
                  <input
                    type="number"
                    value={rebarRate}
                    onChange={(e) => setRebarRate(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-1/3 bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800 font-mono text-right"
                  />
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[10px] text-slate-600 font-semibold w-2/3">Structural ISMB (₹/kg)</span>
                  <input
                    type="number"
                    value={structuralSteelRate}
                    onChange={(e) => setStructuralSteelRate(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-1/3 bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] text-slate-800 font-mono text-right"
                  />
                </div>
              </div>
            </div>

            {/* Live Model Scan Calculations */}
            {(() => {
              let concreteVolumeM20 = 0;
              let concreteVolumeM25 = 0;
              let concreteVolumeM30 = 0;
              let totalConcreteVolume = 0;
              let estimatedRebarWeightKg = 0;
              let totalStructuralSteelWeightKg = 0;

              for (const frame of frames) {
                const nodeI = joints.find((j) => j.id === frame.nodeI);
                const nodeJ = joints.find((j) => j.id === frame.nodeJ);
                if (!nodeI || !nodeJ) continue;

                const dx = nodeJ.x - nodeI.x;
                const dy = nodeJ.y - nodeI.y;
                const L = Math.sqrt(dx * dx + dy * dy);

                const section = sections.find((s) => s.id === frame.sectionId);
                if (!section) continue;

                const material = materials.find((m) => m.id === section.materialId);
                if (!material) continue;

                let area = 0;
                if (section.shape === 'Rectangular') {
                  area = (section.width || 0.23) * (section.depth || 0.45);
                } else if (section.shape === 'Circular') {
                  const d_circle = section.depth || 0.3;
                  area = (Math.PI * d_circle * d_circle) / 4;
                } else if (section.shape === 'I-Shape') {
                  const b = section.width || 0.14;
                  const h = section.depth || 0.3;
                  const tw = section.webThickness || 0.0075;
                  const tf = section.flangeThickness || 0.0124;
                  area = 2 * b * tf + (h - 2 * tf) * tw;
                }

                const volume = area * L;

                if (material.type === 'Concrete') {
                  totalConcreteVolume += volume;
                  if (material.id === 'M2') {
                    concreteVolumeM25 += volume;
                  } else if (material.id === 'M3') {
                    concreteVolumeM20 += volume;
                  } else {
                    concreteVolumeM30 += volume;
                  }

                  const isColumn = section.name.toLowerCase().includes('column') || frame.id.toLowerCase().includes('c');
                  const steelRatio = isColumn ? 0.018 : 0.012;
                  estimatedRebarWeightKg += volume * steelRatio * 7850;
                } else if (material.type === 'Steel') {
                  totalStructuralSteelWeightKg += volume * 7850;
                }
              }

              const concreteCost = totalConcreteVolume * concreteRate;
              const rebarCost = estimatedRebarWeightKg * rebarRate;
              const structuralSteelCost = totalStructuralSteelWeightKg * structuralSteelRate;
              const totalCost = concreteCost + rebarCost + structuralSteelCost;

              return (
                <div className="space-y-3">
                  <div className="border border-slate-200 rounded p-3 bg-white space-y-2">
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block border-b border-slate-100 pb-0.5">
                      Bill of Quantities (BOQ) Take-off
                    </span>

                    <div className="space-y-1.5 text-xs">
                      {totalConcreteVolume > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center font-semibold text-slate-800">
                            <span>Total Concrete:</span>
                            <span className="font-mono font-bold text-slate-950">{totalConcreteVolume.toFixed(2)} m³</span>
                          </div>
                          {concreteVolumeM25 > 0 && (
                            <div className="flex justify-between text-[10px] text-slate-500 pl-3">
                              <span>• M25 Concrete:</span>
                              <span className="font-mono">{concreteVolumeM25.toFixed(2)} m³</span>
                            </div>
                          )}
                          {concreteVolumeM20 > 0 && (
                            <div className="flex justify-between text-[10px] text-slate-500 pl-3">
                              <span>• M20 Concrete:</span>
                              <span className="font-mono">{concreteVolumeM20.toFixed(2)} m³</span>
                            </div>
                          )}
                          {estimatedRebarWeightKg > 0 && (
                            <div className="flex justify-between items-center font-semibold text-slate-800 pt-1 border-t border-slate-100">
                              <span>Est. Rebar Weight:</span>
                              <span className="font-mono font-bold text-slate-950">{estimatedRebarWeightKg.toFixed(0)} kg</span>
                            </div>
                          )}
                        </div>
                      )}

                      {totalStructuralSteelWeightKg > 0 && (
                        <div className="flex justify-between items-center font-semibold text-slate-800 pt-1 border-t border-slate-100">
                          <span>Structural Steel (ISMB):</span>
                          <span className="font-mono font-bold text-slate-950">{totalStructuralSteelWeightKg.toFixed(0)} kg</span>
                        </div>
                      )}

                      {totalConcreteVolume === 0 && totalStructuralSteelWeightKg === 0 && (
                        <div className="text-center py-6 text-slate-400 italic text-[11px]">
                          No members found in the current structural model. Generate a model via the Wizard first.
                        </div>
                      )}
                    </div>
                  </div>

                  {totalCost > 0 && (
                    <div className="border border-slate-200 rounded p-3 bg-gradient-to-br from-slate-50 to-[#F0F5FA] space-y-2">
                      <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block border-b border-blue-100 pb-0.5">
                        Structural Estimate Summary
                      </span>

                      <div className="space-y-1 text-slate-600 text-[11px]">
                        {totalConcreteVolume > 0 && (
                          <div className="flex justify-between">
                            <span>Concrete Cost:</span>
                            <span className="font-mono">₹{concreteCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                          </div>
                        )}
                        {estimatedRebarWeightKg > 0 && (
                          <div className="flex justify-between">
                            <span>Rebar Steel Cost:</span>
                            <span className="font-mono">₹{rebarCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                          </div>
                        )}
                        {totalStructuralSteelWeightKg > 0 && (
                          <div className="flex justify-between">
                            <span>Structural Steel Cost:</span>
                            <span className="font-mono">₹{structuralSteelCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2 mt-1 border-t border-blue-200 text-xs font-bold text-blue-900">
                          <span className="flex items-center gap-1">
                            <IndianRupee className="w-3.5 h-3.5" />
                            <span>Total Estimated Cost:</span>
                          </span>
                          <span className="text-sm font-mono text-blue-800 font-extrabold">
                            ₹{totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'results' && (
          <div id="results-tab-panel" className="space-y-4">
            <ResultsPanel
              joints={joints}
              frames={frames}
              sections={sections}
              results={results}
              isDesigned={isDesigned}
              onRunDesign={onRunDesign}
            />
          </div>
        )}
      </div>
    </div>
  );
}

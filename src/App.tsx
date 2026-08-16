import { StructuralDetailing } from './components/StructuralDetailing';
import React, { useState, useEffect, useRef } from 'react';
import {
  Joint,
  Frame,
  Material,
  Section,
  LoadCase,
  LoadCombination,
  GridSettings,
  DrawingMode,
  ViewMode,
  AnalysisResults,
  SupportType,
  SteelCode,
  ConcreteCode, Slab, SlabLoad } from './types';
import { solveStructure } from './solver';
import { calculateFoundationDesign } from './lib/foundationEngine';
import ExcelJS from 'exceljs';
import { shapeToPngBase64 } from './utils/shapeToPng';
import { AuthUser } from './lib/googleAuth';

// Components
import Toolbar from './components/Toolbar';
import Canvas from './components/Canvas';
import PropertyPanel from './components/PropertyPanel';
import ResultsPanel from './components/ResultsPanel';
import { BbsShapeSketch } from './components/BbsShapeSketch';

// Icons
import {
  Eye,
  FileCode2,
  GitBranch,
  Settings,
  HelpCircle,
  FileText,
  Activity,
  Code2,
  Info,

  Calculator,
  Coins,
  Hammer,
  Layers,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';

// --- INITIAL CONCRETE & STEEL MATERIALS ---
const INITIAL_MATERIALS: Material[] = [
  {
    id: 'M1',
    name: 'Fe 250 Steel (IS 800 Structural)',
    type: 'Steel',
    E: 200, // GPa
    unitWeight: 78.5, // kN/m³
    f_yield_or_c: 250, // MPa
  },
  {
    id: 'M2',
    name: 'M25 Concrete (IS 456 Slab/Beam/Col)',
    type: 'Concrete',
    E: 25.0, // GPa (5000 * sqrt(25) MPa = 25000 MPa)
    unitWeight: 25.0, // kN/m³
    f_yield_or_c: 25, // f_ck = 25 MPa
  },
  {
    id: 'M3',
    name: 'M20 Concrete (IS 456 Low-rise)',
    type: 'Concrete',
    E: 22.36, // GPa (5000 * sqrt(20) = 22360 MPa)
    unitWeight: 25.0, // kN/m³
    f_yield_or_c: 20, // f_ck = 20 MPa
  },
  {
    id: 'M4',
    name: 'M30 Concrete (IS 456 High-strength)',
    type: 'Concrete',
    E: 27.38, // GPa (5000 * sqrt(30) = 27386 MPa)
    unitWeight: 25.0, // kN/m³
    f_yield_or_c: 30, // f_ck = 30 MPa
  },
];

// --- INITIAL SECTION DIMENSIONS ---
const INITIAL_SECTIONS: Section[] = [
  {
    id: 'S_SLAB1',
    name: 'Concrete Slab 150mm',
    materialId: 'M2', // M25 concrete
    shape: 'Slab',
    width: 1.0,
    depth: 0.15, // 150mm thickness
  },
  {
    id: 'S1',
    name: 'ISMB 300 (IS 800 Steel I-Beam)',
    materialId: 'M1',
    shape: 'I-Shape',
    width: 0.140, // meters (140mm flange width)
    depth: 0.300, // meters (300mm depth)
    webThickness: 0.0075, // tw (7.5mm web)
    flangeThickness: 0.0124, // tf (12.4mm flange)
  },
  {
    id: 'S2',
    name: 'Concrete Beam 230x300 (IS 456 Standard)',
    materialId: 'M2',
    shape: 'Rectangular',
    width: 0.23, // 230mm
    depth: 0.30, // 300mm
  },
  {
    id: 'S3',
    name: 'Concrete Column 300x300 (IS 456 Standard)',
    materialId: 'M2',
    shape: 'Rectangular',
    width: 0.30, // 300mm
    depth: 0.30, // 300mm
  },
  {
    id: 'S4',
    name: 'Concrete Column 230x300 (IS 456 Standard 9"x12")',
    materialId: 'M3',
    shape: 'Rectangular',
    width: 0.23, // 230mm
    depth: 0.30, // 300mm
  },
  {
    id: 'S5',
    name: 'ISMB 200 (IS 800 Steel I-Section)',
    materialId: 'M1',
    shape: 'I-Shape',
    width: 0.100, // 100mm width
    depth: 0.200, // 200mm depth
    webThickness: 0.0057,
    flangeThickness: 0.0108,
  },
];

// --- INITIAL LOAD CASES ---
const INITIAL_LOAD_CASES: LoadCase[] = [
  {
    id: 'LC1',
    name: 'Dead Load (D)',
    type: 'Dead',
    selfWeightMultiplier: 0.0, // Set to 0 so we don't double count since we apply it manually
  },
  {
    id: 'LC2',
    name: 'Live Load (L)',
    type: 'Live',
    selfWeightMultiplier: 0.0,
  },
  {
    id: 'LC3',
    name: 'Wind Load (W)',
    type: 'Wind',
    selfWeightMultiplier: 0.0,
  },
  {
    id: 'LC4',
    name: 'Seismic Load (Eq)',
    type: 'Quake',
    selfWeightMultiplier: 0.0,
  },
];

// --- INITIAL CODE COMBINATIONS (IS 800 / IS 456) ---
const INITIAL_COMBINATIONS: LoadCombination[] = [
  {
    id: 'COMBO_IS_LIMIT_STATE1',
    name: 'IS Limit State: 1.5D + 1.5L',
    factors: {
      LC1: 1.5,
      LC2: 1.5,
      LC3: 0.0,
      LC4: 0.0,
    },
  },
  {
    id: 'COMBO_IS_LIMIT_STATE2',
    name: 'IS Limit State: 1.2D + 1.2L + 1.2W',
    factors: {
      LC1: 1.2,
      LC2: 1.2,
      LC3: 1.2,
      LC4: 0.0,
    },
  },
  {
    id: 'COMBO_IS_LIMIT_STATE3',
    name: 'IS Limit State: 1.2D + 1.2L + 1.2E',
    factors: {
      LC1: 1.2,
      LC2: 1.2,
      LC3: 0.0,
      LC4: 1.2,
    },
  },
  {
    id: 'COMBO_IS_LIMIT_STATE4',
    name: 'IS Limit State: 1.5D + 1.5W',
    factors: {
      LC1: 1.5,
      LC2: 0.0,
      LC3: 1.5,
      LC4: 0.0,
    },
  },
  {
    id: 'COMBO_IS_LIMIT_STATE5',
    name: 'IS Limit State: 1.5D + 1.5E',
    factors: {
      LC1: 1.5,
      LC2: 0.0,
      LC3: 0.0,
      LC4: 1.5,
    },
  },
  {
    id: 'COMBO_IS_SERVICE1',
    name: 'IS Serviceability: 1.0D + 1.0L',
    factors: {
      LC1: 1.0,
      LC2: 1.0,
      LC3: 0.0,
      LC4: 0.0,
    },
  },
  {
    id: 'COMBO_IS_LIMIT_STATE_WIND',
    name: 'IS Limit State: 1.5D + 1.5W',
    factors: {
      LC1: 1.5,
      LC2: 0.0,
      LC3: 1.5,
      LC4: 0.0,
    },
  },
  {
    id: 'COMBO_IS_LIMIT_STATE_EQ',
    name: 'IS Limit State: 1.5D + 1.5Eq',
    factors: {
      LC1: 1.5,
      LC2: 0.0,
      LC3: 0.0,
      LC4: 1.5,
    },
  },
  {
    id: 'COMBO_IS_LIMIT_STATE_COMB',
    name: 'IS Limit State: 1.2D + 1.2L + 1.2Eq',
    factors: {
      LC1: 1.2,
      LC2: 1.2,
      LC3: 0.0,
      LC4: 1.2,
    },
  },
];

// --- PRE-LOADED PORTAL FRAME (DEFAULT) ---
const INITIAL_JOINTS: Joint[] = [
  { id: 'J1', x: 0.0, y: 0.0, support: 'Fixed', loads: [] },
  { id: 'J2', x: 0.0, y: 4.0, support: 'Free', loads: [] },
  { id: 'J3', x: 6.0, y: 4.0, support: 'Free', loads: [] },
  { id: 'J4', x: 6.0, y: 0.0, support: 'Fixed', loads: [] },
];

const INITIAL_FRAMES: Frame[] = [
  {
    id: 'Column_C1',
    nodeI: 'J1',
    nodeJ: 'J2',
    type: 'Column',
    sectionId: 'S1', // Steel section
    loads: [],
  },
  {
    id: 'Beam_B1',
    nodeI: 'J2',
    nodeJ: 'J3',
    type: 'Beam',
    sectionId: 'S2', // Concrete section
    loads: [
      {
        id: 'L1',
        type: 'UDL',
        direction: 'GlobalY',
        value: 20, // 20 kN/m downward live load
        loadCaseId: 'LC2',
      },
      {
        id: 'L2',
        type: 'UDL',
        direction: 'GlobalY',
        value: 12, // 12 kN/m dead load
        loadCaseId: 'LC1',
      },
    ],
  },
  {
    id: 'Column_C2',
    nodeI: 'J4',
    nodeJ: 'J3',
    type: 'Column',
    sectionId: 'S1', // Steel section
    loads: [],
  },
];

export default function App({ user, onSignOut }: { user?: AuthUser; onSignOut?: () => void }) {
  // Model state variables
  const [joints, setJoints] = useState<Joint[]>([]);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [slabs, setSlabs] = useState<Slab[]>([]);
  const [materials, setMaterials] = useState<Material[]>(INITIAL_MATERIALS);
  const [sections, setSections] = useState<Section[]>(INITIAL_SECTIONS);
  const [loadCases, setLoadCases] = useState<LoadCase[]>(INITIAL_LOAD_CASES);
  const [combinations, setCombinations] = useState<LoadCombination[]>(INITIAL_COMBINATIONS);
  
  // Viewpoint and Analysis Plane state variables
  const [viewpoint, setViewpoint] = useState<'Top' | 'Front' | 'Side' | '3D'>('Top');
  const [analysisPlane, setAnalysisPlane] = useState<'XZ' | 'XY' | 'ZY'>('XZ');
  
  // Viewport Settings
  const [gridSettings, setGridSettings] = useState<GridSettings>({
    xSpacing: 3,
    xLines: 7,
    ySpacing: 4,
    yLines: 5,
  });

  // CAD Modes
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('Select');
  const [viewMode, setViewMode] = useState<ViewMode>('Model');
  const [propertyTab, setPropertyTab] = useState<'selection' | 'sections' | 'combos' | 'grids' | 'calcs' | 'boq' | 'results'>('selection');

  // Load selection context
  const [activeLoadCaseId, setActiveLoadCaseId] = useState<string>('LC2'); // Default to live load case
  const [activeComboId, setActiveComboId] = useState<string>('COMBO_IS_LIMIT_STATE1'); // Default Indian Standard Limit State

  // Selected item context
  const [selectedJointId, setSelectedJointId] = useState<string | null>(null);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [selectedSlabId, setSelectedSlabId] = useState<string | null>(null);

  // Design standard codes (Defaulting to Indian Standards)
  const [steelCode, setSteelCode] = useState<SteelCode>('IS 800 (India) - Recommended');
  const [concreteCode, setConcreteCode] = useState<ConcreteCode>('IS 456 (India) - Recommended');

  // --- LIFTED SLAB, FOOTING & MATERIAL COST STATES ---
  const [slabLx, setSlabLx] = useState<number>(3.5); // short span (m)
  const [slabLy, setSlabLy] = useState<number>(4.5); // long span (m)
  const [slabLiveLoad, setSlabLiveLoad] = useState<number>(2.0); // kN/m²
  const [slabFF, setSlabFF] = useState<number>(1.0); // floor finish kN/m²
  const [slabThickness, setSlabThickness] = useState<number>(125); // mm
  const [slabRebarDia, setSlabRebarDia] = useState<number>(8); // mm rebar

  const [footingP, setFootingP] = useState<number>(350); // Column axial load (kN)
  const [footingSbc, setFootingSbc] = useState<number>(150); // SBC (kN/m²)
  const [footingConcreteGrade, setFootingConcreteGrade] = useState<number>(25); // M25 standard
  const [footingRebarDia, setFootingRebarDia] = useState<number>(12); // mm rebar
  const [footingDepth, setFootingDepth] = useState<number>(350); // mm thickness
  const [foundationType, setFoundationType] = useState<string>('Auto'); // Auto, Isolated, Strip, Raft, Pile
  
  // Manual dimension overrides
  const [isolatedWidthManual, setIsolatedWidthManual] = useState<number>(0); // 0 means auto
  const [stripWidthManual, setStripWidthManual] = useState<number>(0); // 0 means auto
  const [raftLengthManual, setRaftLengthManual] = useState<number>(0); // 0 means auto
  const [raftWidthManual, setRaftWidthManual] = useState<number>(0); // 0 means auto

  const [concreteRate, setConcreteRate] = useState<number>(6500); // INR per m³
  const [rebarRate, setRebarRate] = useState<number>(65); // INR per kg
  const [structuralSteelRate, setStructuralSteelRate] = useState<number>(75); // INR per kg

  // --- USER CUSTOM IS 456 RC DESIGN SPECIFICATIONS ---
  const [rcConcreteGrade, setRcConcreteGrade] = useState<number>(25); // fck = 25 MPa (M25)
  const [rcSteelGrade, setRcSteelGrade] = useState<number>(500); // fy = 500 MPa (Fe 500)
  const [rcClearCoverBeam, setRcClearCoverBeam] = useState<number>(25); // mm
  const [rcClearCoverColumn, setRcClearCoverColumn] = useState<number>(40); // mm
  const [rcMainBarDiaBeam, setRcMainBarDiaBeam] = useState<number>(16); // mm
  const [rcMainBarDiaColumn, setRcMainBarDiaColumn] = useState<number>(20); // mm
  const [rcStirrupDia, setRcStirrupDia] = useState<number>(8); // mm
  const [rcStirrupLegs, setRcStirrupLegs] = useState<number>(2); // 2-legged

  // Top Dropdown Menu State
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Modal dialog states
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [showSectionsModal, setShowSectionsModal] = useState(false);
  const [showLoadsModal, setShowLoadsModal] = useState(false);
  const [showCombosModal, setShowCombosModal] = useState(false);
  const [showWindModal, setShowWindModal] = useState(false);
  const [showSeismicModal, setShowSeismicModal] = useState(false);
  const [showReplicateModal, setShowReplicateModal] = useState(false);
  const [showSolverModal, setShowSolverModal] = useState(false);
  const [showDesignPrefsModal, setShowDesignPrefsModal] = useState(false);

  // 1. Wind Parameters (IS 875 Part 3:2015)
  const [windVb, setWindVb] = useState(39); // Basic speed m/s
  const [windK1, setWindK1] = useState(1.0); // risk factor
  const [windK2, setWindK2] = useState(1.0); // height terrain factor
  const [windK3, setWindK3] = useState(1.0); // topography factor
  const [windK4, setWindK4] = useState(1.0); // cyclonic factor
  const [windCf, setWindCf] = useState(1.2); // force coefficient

  // 2. Seismic Parameters (IS 1893 Part 1:2016)
  const [seismicZone, setSeismicZone] = useState<'II' | 'III' | 'IV' | 'V'>('III');
  const [seismicI, setSeismicI] = useState(1.2); // Importance factor
  const [seismicR, setSeismicR] = useState(5.0); // Response Reduction (SMRF = 5, OMRF = 3)
  const [seismicSoil, setSeismicSoil] = useState<'I' | 'II' | 'III'>('II'); // Type II Medium Soil

  // 3. Replicate Parameters
  const [repDx, setRepDx] = useState('0.0');
  const [repDy, setRepDy] = useState('3.2');
  const [repNum, setRepNum] = useState(1);

  // 4. Solver Settings
  const [solverPDelta, setSolverPDelta] = useState(false);
  const [solverTol, setSolverTol] = useState(1e-5);

  // 5. Design Preferences & Safety Factors
  const [steelGammaM0, setSteelGammaM0] = useState(1.10);
  const [steelGammaM1, setSteelGammaM1] = useState(1.25);
  const [concreteGammaC, setConcreteGammaC] = useState(1.50);
  const [concreteGammaS, setConcreteGammaS] = useState(1.15);

  // Structure Generator Wizard
  const [showWizard, setShowWizard] = useState(false);
  const [wizardType, setWizardType] = useState<'residential' | 'commercial' | 'warehouse'>('residential');
  const [wizardXSpacings, setWizardXSpacings] = useState<string>('5, 5, 5');
  const [wizardZSpacings, setWizardZSpacings] = useState<string>('4, 4');
  const [wizardYSpacings, setWizardYSpacings] = useState<string>('3.2, 3.2, 3.2');
  const [wizardSupport, setWizardSupport] = useState<SupportType>('Fixed');
  const [wizardBeamLoad, setWizardBeamLoad] = useState<number>(15.0); // kN/m

  // Analysis result state
  const [results, setResults] = useState<AnalysisResults>({
    isAnalyzed: false,
    selectedCombinationId: 'COMBO_IS_LIMIT_STATE1',
    displacements: {},
    reactions: {},
    frameForces: {},
  });
  const [isDesigned, setIsDesigned] = useState(false);

  // Modal displays
  const [showDesignReport, setShowDesignReport] = useState(false);

  const [reportTab, setReportTab] = useState<'summary' | 'analysis' | 'slab' | 'boq' | 'bbs' | 'detailing'>('summary');

  // Auto solve trigger when joints, frames or codes change to keep outputs consistent
  useEffect(() => {
    setResults((prev) => ({
      ...prev,
      isAnalyzed: false,
    }));
    setIsDesigned(false);
  }, [
    joints,
    frames,
    activeComboId,
    steelCode,
    concreteCode,
    rcConcreteGrade,
    rcSteelGrade,
    rcClearCoverBeam,
    rcClearCoverColumn,
    rcMainBarDiaBeam,
    rcMainBarDiaColumn,
    rcStirrupDia,
    rcStirrupLegs
  ]);

  // Helper: Calculate individual footing design for a support joint
  const getFootingLoadAndDesign = (joint: Joint) => {
    let P = footingP; // default baseline if no results
    
    // If analyzed, use exact absolute vertical reaction (Ry)
    if (results.isAnalyzed && results.reactions[joint.id]) {
      P = Math.max(25.0, Math.abs(results.reactions[joint.id].fy));
    } else {
      // Estimate based on location (tributary area)
      const supportJointsList = joints.filter(j => j.support && j.support !== 'Free');
      const xs = supportJointsList.map(j => j.x);
      const zs = supportJointsList.map(j => j.z || 0);
      
      if (xs.length > 0) {
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minZ = Math.min(...zs), maxZ = Math.max(...zs);
        
        const isMinX = Math.abs(joint.x - minX) < 1e-3;
        const isMaxX = Math.abs(joint.x - maxX) < 1e-3;
        const isMinZ = Math.abs((joint.z || 0) - minZ) < 1e-3;
        const isMaxZ = Math.abs((joint.z || 0) - maxZ) < 1e-3;
        
        const isCorner = (isMinX || isMaxX) && (isMinZ || isMaxZ);
        const isEdge = (isMinX || isMaxX || isMinZ || isMaxZ) && !isCorner;
        
        if (isCorner) {
          P = footingP * 0.5;
        } else if (isEdge) {
          P = footingP * 1.0;
        } else {
          P = footingP * 1.5;
        }
      }
    }
    
    const A_req = (1.1 * P) / footingSbc;
    const side = Math.sqrt(A_req);
    const sideRounded = Math.max(1.0, Math.ceil(side * 10) / 10); // step of 100mm, min 1.0m
    const area = sideRounded * sideRounded;
    
    const actualPressure = P / area;
    const sbcStatus = actualPressure <= footingSbc ? 'PASS' : 'FAIL';
    
    const Pu = 1.5 * P;
    const fck = footingConcreteGrade;
    const fy = 500;
    
    const qu = Pu / area;
    const projection = (sideRounded - 0.3) / 2;
    const Mu = (qu * projection * projection) / 2;
    
    const b = 1000;
    const d_eff = footingDepth - 56;
    const d_req_bending = Math.sqrt((Mu * 1e6) / (0.138 * fck * b));
    
    let astRequired = 0;
    const term = 1 - (4.6 * Mu * 1e6) / (fck * b * d_eff * d_eff);
    if (term > 0) {
      astRequired = (0.5 * fck * b * d_eff / fy) * (1 - Math.sqrt(term));
    }
    
    const minAst = 0.0012 * b * footingDepth;
    if (astRequired < minAst) {
      astRequired = minAst;
    }
    
    const colSize = 0.3;
    const critSide = colSize + d_eff / 1000;
    const criticalArea = critSide * critSide;
    const punchingForce = Pu * (1 - (area > 0 ? (criticalArea / area) : 0));
    const punchingPerimeter = 4 * critSide * 1000;
    const punchingStress = (punchingForce * 1000) / (punchingPerimeter * d_eff);
    
    const barArea = (Math.PI * footingRebarDia * footingRebarDia) / 4;
    const spacingCalculated = (barArea * 1000) / astRequired;
    const spacingRounded = Math.min(300, Math.max(100, Math.floor(spacingCalculated / 25) * 25));
    
    return {
      jointId: joint.id,
      x: joint.x,
      z: joint.z || 0,
      P,
      Pu,
      A_req,
      sideRounded,
      area,
      actualPressure,
      sbcStatus,
      astRequired,
      spacingRounded,
      punchingStress,
      concreteVol: area * (footingDepth / 1000),
      steelWeight: 2 * (Math.ceil((sideRounded * 1000) / spacingRounded) + 1) * (sideRounded - 0.1 + 0.3) * (footingRebarDia * footingRebarDia / 162.2),
    };
  };

  // CAD Action: Run stiffness analysis solver!
    const handleRunAnalysis = () => {
    if (joints.length === 0) {
      alert("Error: Cannot run analysis. The model is empty. Please add joints and frames, or select 'demo models' from the top menu to load a pre-built structure.");
      return;
    }
    try {
      // Map 3D joints to 2D based on current active analysis plane
      const solverJoints = joints.map((j) => {
        let mappedX = j.x;
        let mappedY = j.y;
        if (analysisPlane === 'XZ') {
          mappedX = j.x;
          mappedY = j.z || 0;
        } else if (analysisPlane === 'ZY') {
          mappedX = j.z || 0;
          mappedY = j.y;
        }
        return {
          ...j,
          x: mappedX,
          y: mappedY,
        };
      });

      const rcDesignSpecs = {
        concreteGrade: rcConcreteGrade,
        steelGrade: rcSteelGrade,
        clearCoverBeam: rcClearCoverBeam,
        clearCoverColumn: rcClearCoverColumn,
        mainBarDiaBeam: rcMainBarDiaBeam,
        mainBarDiaColumn: rcMainBarDiaColumn,
        stirrupDia: rcStirrupDia,
        stirrupLegs: rcStirrupLegs,
      };

      const solverResults = solveStructure(
        solverJoints,
        frames,
        slabs,
        materials,
        sections,
        loadCases,
        combinations,
        activeComboId,
        steelCode,
        concreteCode,
        rcDesignSpecs
      );
      if (solverResults.error) {
        alert(`Solver failed: ${solverResults.error}`);
        return;
      }
      setResults(solverResults);
      setPropertyTab('results');
      setViewMode('Deflection');
    } catch (e: any) {
      alert(`Solver failed: ${e?.message || 'Check structural stability'}`);
    }
  };

  // IS 875 Auto-Assignment of Loads (Wall Load on Beams)
  const handleAutoAssignIS875Loads = (params: {
    wallThickness: number;
    storeyHeight: number;
    masonryDensity: number;
  }) => {
    // 1. Calculate loads as per IS 875 (Dead Load only, based on user instruction)
    const wallLoad = (params.wallThickness / 1000) * params.masonryDensity * params.storeyHeight;

    // 2. Map through frames and update those with type === 'Beam'
    let assignedCount = 0;
    const updatedFrames = frames.map((frame) => {
      if (frame.type !== 'Beam') return frame;

      assignedCount++;

      // Find section & material to calculate b x d x unit weight of the structural material
      const section = sections.find((s) => s.id === frame.sectionId);
      const material = section ? materials.find((m) => m.id === section.materialId) : undefined;

      let beamSelfWeight = 0;
      let b = 0.23; // default width (m)
      let d = 0.45; // default depth (m)
      let unitWeight = 25; // default unit weight for concrete (M25)

      if (section) {
        b = section.width;
        d = section.depth;
        if (material) {
          if (material.type === 'Steel') {
            unitWeight = 78.5; // kN/m³ (density of steel is ~7850 kg/m³, 7850 * 9.81 / 1000 ≈ 77-78.5)
          } else {
            // Concrete: grade determines the unit weight as specified by user:
            // "so dead load is 'bxdxunit weight of the structural material' (25 for M25, 30 for M30 & so on)"
            unitWeight = material.f_yield_or_c || 25;
          }
        }
        beamSelfWeight = b * d * unitWeight;
      }

      // Total dead load for this specific beam = wall load + beamSelfWeight
      const totalDeadLoadUDL = Number((beamSelfWeight + wallLoad).toFixed(2));

      // Filter out existing Dead Load (LC1) or Live Load (LC2) UDLs to avoid duplication
      const otherLoads = frame.loads.filter(
        (load) => !(load.loadCaseId === 'LC1' && load.type === 'UDL') &&
                  !(load.loadCaseId === 'LC2' && load.type === 'UDL')
      );

      // Append new dead load UDL (LC1). Beams do NOT undergo Live Load directly as per user request.
      const newDeadLoad = {
        id: `IS875_DL_${frame.id}_${Date.now()}`,
        type: 'UDL' as const,
        direction: 'GlobalY' as const,
        value: totalDeadLoadUDL, // downward load is positive in this solver
        loadCaseId: 'LC1',
      };

      return {
        ...frame,
        loads: [...otherLoads, newDeadLoad],
      };
    });

    setFrames(updatedFrames);
    alert(`Auto-assigned IS 875 Wall Load (${wallLoad.toFixed(2)} kN/m) + Self-Weight to ${assignedCount} beams.`);
  };

  // CAD Action: Perform international code member design checking (IS 800 / IS 456)
  const handleRunDesignChecks = () => {
    if (!results.isAnalyzed) {
      alert("Error: Structural Finite Element analysis must be run first.\n\nPlease click 'run analysis' in the top toolbar first before running member design checks.");
      return;
    }
    setIsDesigned(true);
    setViewMode('Design');
    setPropertyTab('results');
  };

  // CAD Action: Reset structural model
  const handleClearAll = () => {
    setJoints([]);
    setFrames([]);
    setSelectedJointId(null);
    setSelectedFrameId(null);
    setIsDesigned(false);
    setResults({
      isAnalyzed: false,
      selectedCombinationId: activeComboId,
      displacements: {},
      reactions: {},
      frameForces: {},
    });
  };

  // CAD Action: Load pre-designed demo models
  const handleLoadDemo = (type: 'portal' | 'multiStory' | 'bridge') => {
    setSelectedJointId(null);
    setSelectedFrameId(null);

    if (type === 'portal') {
      setJoints(INITIAL_JOINTS);
      setFrames(INITIAL_FRAMES);
    } else if (type === 'multiStory') {
      // 3-story, 2-bay concrete office building frame
      const storyHeight = 3.5;
      const bayWidth = 5.0;

      const newJoints: Joint[] = [];
      const newFrames: Frame[] = [];

      // Create joints grid
      for (let story = 0; story <= 3; story++) {
        for (let bay = 0; bay <= 2; bay++) {
          const id = `J_S${story}_B${bay}`;
          const isBase = story === 0;
          newJoints.push({
            id,
            x: bay * bayWidth,
            y: story * storyHeight,
            support: isBase ? 'Fixed' : 'Free',
            loads: [],
          });
        }
      }

      // Create members (Columns and Beams)
      let beamCount = 1;
      let colCount = 1;

      for (let story = 1; story <= 3; story++) {
        for (let bay = 0; bay <= 2; bay++) {
          // Columns below
          const idNodeBelow = `J_S${story - 1}_B${bay}`;
          const idNodeCurrent = `J_S${story}_B${bay}`;
          newFrames.push({
            id: `Column_C${colCount++}`,
            nodeI: idNodeBelow,
            nodeJ: idNodeCurrent,
            type: 'Column',
            sectionId: 'S3', // concrete column
            loads: [],
          });

          // Horizontal beams
          if (bay > 0) {
            const idNodePrev = `J_S${story}_B${bay - 1}`;
            newFrames.push({
              id: `Beam_B${beamCount++}`,
              nodeI: idNodePrev,
              nodeJ: idNodeCurrent,
              type: 'Beam',
              sectionId: 'S2', // concrete beam
              loads: [
                {
                  id: `L_B${beamCount}_D`,
                  type: 'UDL',
                  direction: 'GlobalY',
                  value: 18.0, // dead loads
                  loadCaseId: 'LC1',
                },
                {
                  id: `L_B${beamCount}_L`,
                  type: 'UDL',
                  direction: 'GlobalY',
                  value: 25.0, // heavy office live load
                  loadCaseId: 'LC2',
                },
              ],
            });
          }
        }
      }

      // Apply a lateral wind load on the left joints at roof and upper floors
      const roofLeftNode = newJoints.find((j) => j.id === 'J_S3_B0');
      if (roofLeftNode) {
        roofLeftNode.loads.push({ fx: 40.0, fy: 0, mz: 0, loadCaseId: 'LC3' }); // 40kN horizontal wind load
      }
      const floor2LeftNode = newJoints.find((j) => j.id === 'J_S2_B0');
      if (floor2LeftNode) {
        floor2LeftNode.loads.push({ fx: 25.0, fy: 0, mz: 0, loadCaseId: 'LC3' });
      }

      setJoints(newJoints);
      setFrames(newFrames);

    } else if (type === 'bridge') {
      // Continuous highway steel truss bridge spans (12m span total)
      const newJoints: Joint[] = [
        { id: 'T_A0', x: 0.0, y: 0.0, support: 'Fixed', loads: [] },
        { id: 'T_A1', x: 3.0, y: 0.0, support: 'Free', loads: [] },
        { id: 'T_A2', x: 6.0, y: 0.0, support: 'Pinned', loads: [] }, // continuous center support
        { id: 'T_A3', x: 9.0, y: 0.0, support: 'Free', loads: [] },
        { id: 'T_A4', x: 12.0, y: 0.0, support: 'RollerX', loads: [] },

        // Top chord joints
        { id: 'T_B0', x: 1.5, y: 2.0, support: 'Free', loads: [] },
        { id: 'T_B1', x: 4.5, y: 2.0, support: 'Free', loads: [] },
        { id: 'T_B2', x: 7.5, y: 2.0, support: 'Free', loads: [] },
        { id: 'T_B3', x: 10.5, y: 2.0, support: 'Free', loads: [] },
      ];

      // Diagonals, Top, and Bottom chords
      const newFrames: Frame[] = [
        // Bottom chords
        { id: 'Chord_B01', nodeI: 'T_A0', nodeJ: 'T_A1', type: 'Beam', sectionId: 'S1', loads: [] },
        { id: 'Chord_B12', nodeI: 'T_A1', nodeJ: 'T_A2', type: 'Beam', sectionId: 'S1', loads: [] },
        { id: 'Chord_B23', nodeI: 'T_A2', nodeJ: 'T_A3', type: 'Beam', sectionId: 'S1', loads: [] },
        { id: 'Chord_B34', nodeI: 'T_A3', nodeJ: 'T_A4', type: 'Beam', sectionId: 'S1', loads: [] },

        // Top chords
        { id: 'Chord_T01', nodeI: 'T_B0', nodeJ: 'T_B1', type: 'Beam', sectionId: 'S1', loads: [] },
        { id: 'Chord_T12', nodeI: 'T_B1', nodeJ: 'T_B2', type: 'Beam', sectionId: 'S1', loads: [] },
        { id: 'Chord_T23', nodeI: 'T_B2', nodeJ: 'T_B3', type: 'Beam', sectionId: 'S1', loads: [] },

        // Diagonals & Verticals
        { id: 'Diag_D1', nodeI: 'T_A0', nodeJ: 'T_B0', type: 'Brace', sectionId: 'S1', loads: [] },
        { id: 'Diag_D2', nodeI: 'T_B0', nodeJ: 'T_A1', type: 'Brace', sectionId: 'S1', loads: [] },
        { id: 'Diag_D3', nodeI: 'T_A1', nodeJ: 'T_B1', type: 'Brace', sectionId: 'S1', loads: [] },
        { id: 'Diag_D4', nodeI: 'T_B1', nodeJ: 'T_A2', type: 'Brace', sectionId: 'S1', loads: [] },
        { id: 'Diag_D5', nodeI: 'T_A2', nodeJ: 'T_B2', type: 'Brace', sectionId: 'S1', loads: [] },
        { id: 'Diag_D6', nodeI: 'T_B2', nodeJ: 'T_A3', type: 'Brace', sectionId: 'S1', loads: [] },
        { id: 'Diag_D7', nodeI: 'T_A3', nodeJ: 'T_B3', type: 'Brace', sectionId: 'S1', loads: [] },
        { id: 'Diag_D8', nodeI: 'T_B3', nodeJ: 'T_A4', type: 'Brace', sectionId: 'S1', loads: [] },
      ];

      // Traffic loads on bottom joints
      newJoints.find((j) => j.id === 'T_A1')?.loads.push({ fx: 0, fy: -80, mz: 0, loadCaseId: 'LC2' }); // heavy vehicle
      newJoints.find((j) => j.id === 'T_A3')?.loads.push({ fx: 0, fy: -60, mz: 0, loadCaseId: 'LC2' });

      setJoints(newJoints);
      setFrames(newFrames);
    }
    setViewpoint('Front');
    setAnalysisPlane('XY');
  };

  // CAD Action: Generate custom structure from wizard
  const handleGenerateWizardStructure = () => {
    const newJoints: Joint[] = [];
    const newFrames: Frame[] = [];
    const newSlabs: Slab[] = [];
    const parseSpacings = (str: string, defaultVal: number) => {
      const parts = str.split(',').map(s => parseFloat(s.trim()));
      const valid = parts.filter(n => !isNaN(n) && n > 0);
      return valid.length > 0 ? valid : [defaultVal];
    };
    const xSpacings = parseSpacings(wizardXSpacings, 5);
    const ySpacings = parseSpacings(wizardYSpacings, 3);
    const zSpacings = parseSpacings(wizardZSpacings, 4);

    const xCoords = [0];
    xSpacings.forEach(s => xCoords.push(xCoords[xCoords.length - 1] + s));
    const yCoords = [0];
    ySpacings.forEach(s => yCoords.push(yCoords[yCoords.length - 1] + s));
    const zCoords = [0];
    zSpacings.forEach(s => zCoords.push(zCoords[zCoords.length - 1] + s));

    const wizardBays = xSpacings.length;
    const wizardZBays = zSpacings.length;
    const wizardStories = ySpacings.length;

    // Clear selections & results
    setSelectedJointId(null);
    setSelectedFrameId(null);
    setResults({
      isAnalyzed: false,
      selectedCombinationId: activeComboId,
      displacements: {},
      reactions: {},
      frameForces: {},
    });

    if (wizardType === 'residential') {
      // Residential Concrete Frame in 3D
      // Generate joints grid in 3D (X, Y, Z)
      for (let story = 0; story <= wizardStories; story++) {
        for (let bay = 0; bay <= wizardBays; bay++) {
          for (let zBay = 0; zBay <= wizardZBays; zBay++) {
            const id = `Node_S${story}_X${bay}_Z${zBay}`;
            const isBase = story === 0;
            const newJoint: Joint = {
              id,
              x: xCoords[bay],
              y: yCoords[story],
              z: zCoords[zBay],
              support: isBase ? wizardSupport : 'Free',
              loads: [],
            };

            // Wind and Seismic lateral loads (applied at exterior nodes)
            if (story > 0) {
              const tribY = story === wizardStories ? ySpacings[0] / 2 : ySpacings[0];
              const tribX = (bay === 0 || bay === wizardBays) ? xSpacings[0] / 2 : xSpacings[0];
              const tribZ = (zBay === 0 || zBay === wizardZBays) ? zSpacings[0] / 2 : zSpacings[0];

              // Wind pressure ~ 1.2 kN/m2
              if (bay === 0) {
                // Wind in +X direction on the left face
                const windFx = 1.2 * tribZ * tribY;
                newJoint.loads.push({ fx: windFx, fy: 0, mz: 0, loadCaseId: 'LC3' });
              }
              if (zBay === 0) {
                // Wind in +Z direction on the front face (For 3D if we supported fz. But we only do 2D planar loads mostly, let's keep it simple and just do fx for 3D analysis)
                const windFz = 1.2 * tribX * tribY;
                // Our structural solver supports fx, fy, mz. We will ignore Z forces for now as this is a 2D engine.
                // We'll just leave it empty or map it to something else if needed.
              }
            }

            newJoints.push(newJoint);
          }
        }
      }

      // Generate members
      let beamCount = 1;
      let colCount = 1;
      for (let story = 1; story <= wizardStories; story++) {
        for (let bay = 0; bay <= wizardBays; bay++) {
          for (let zBay = 0; zBay <= wizardZBays; zBay++) {
            const idNodeBelow = `Node_S${story - 1}_X${bay}_Z${zBay}`;
            const idNodeCurrent = `Node_S${story}_X${bay}_Z${zBay}`;
            
            // Columns
            newFrames.push({
              id: `Column_C${colCount++}`,
              nodeI: idNodeBelow,
              nodeJ: idNodeCurrent,
              type: 'Column',
              sectionId: 'S3', 
              loads: [],
            });

            // Calculate loads for beams


            // Beams in X direction
            if (bay > 0) {
              const idNodePrev = `Node_S${story}_X${bay - 1}_Z${zBay}`;
              
              const section = INITIAL_SECTIONS.find(s => s.id === 'S2');
              const material = INITIAL_MATERIALS.find(m => m.id === section?.materialId);
              
              const b = section?.width || 0.23;
              const d = section?.depth || 0.30;
              const gamma = material?.unitWeight ?? 25.0; // 25 kN/m3
              
              const wallLoadWizard = 0.23 * 19.0 * ySpacings[0];
              const totalDL = (b * d * gamma) + wallLoadWizard;

              newFrames.push({
                id: `Beam_X_B${beamCount++}`,
                nodeI: idNodePrev,
                nodeJ: idNodeCurrent,
                type: 'Beam',
                sectionId: 'S2',
                loads: [
                  { id: `L_BX${beamCount}_D`, type: 'UDL', direction: 'GlobalY', value: Number(totalDL.toFixed(2)), loadCaseId: 'LC1' }
                ],
              });
            }

            // Beams in Z direction
            if (zBay > 0) {
              const idNodePrevZ = `Node_S${story}_X${bay}_Z${zBay - 1}`;
              
              const section = INITIAL_SECTIONS.find(s => s.id === 'S2');
              const material = INITIAL_MATERIALS.find(m => m.id === section?.materialId);
              
              const b = section?.width || 0.23;
              const d = section?.depth || 0.30;
              const gamma = material?.unitWeight ?? 25.0; // 25 kN/m3
              
              const wallLoadWizard = 0.23 * 19.0 * ySpacings[0];
              const totalDL = (b * d * gamma) + wallLoadWizard;

              newFrames.push({
                id: `Beam_Z_B${beamCount++}`,
                nodeI: idNodePrevZ,
                nodeJ: idNodeCurrent,
                type: 'Beam',
                sectionId: 'S2',
                loads: [
                  { id: `L_BZ${beamCount}_D`, type: 'UDL', direction: 'GlobalY', value: Number(totalDL.toFixed(2)), loadCaseId: 'LC1' }
                ],
              });
              if (bay > 0 && zBay > 0) {
                newSlabs.push({
                  id: `Slab_S${story}_X${bay}_Z${zBay}`,
                  nodeIds: [
                    `Node_S${story}_X${bay - 1}_Z${zBay - 1}`,
                    `Node_S${story}_X${bay}_Z${zBay - 1}`,
                    `Node_S${story}_X${bay}_Z${zBay}`,
                    `Node_S${story}_X${bay - 1}_Z${zBay}`
                  ],
                  sectionId: 'S_SLAB1', // Assuming S4 is a slab section, we should add it if it doesn't exist
                  loads: [
                    { id: `L_Slab${story}${bay}${zBay}_D`, type: 'UDL', value: 3.125, loadCaseId: 'LC1' }, // Dead Load (125mm concrete)
                    { id: `L_Slab${story}${bay}${zBay}_L`, type: 'UDL', value: 2.0, loadCaseId: 'LC2' } // Live Load
                  ]
                });
              }

            }
          }
        }
      }
      
      // Calculate Total Seismic Weight and Distribute
      let totalSeismicWeight = 0;
      const storyWeights = new Array(wizardStories + 1).fill(0);
      newFrames.forEach(f => {
        if (f.type === 'Beam') {
          const loadDL = f.loads.find(l => l.loadCaseId === 'LC1')?.value || 0;
          const loadLL = f.loads.find(l => l.loadCaseId === 'LC2')?.value || 0;
          const effLoad = loadDL + 0.25 * loadLL; // Seismic weight includes 25% LL
          const length = f.id.includes('Beam_X') ? xSpacings[0] : zSpacings[0];
          const storyIndex = parseInt(f.nodeI.split('_')[1].replace('S', ''));
          storyWeights[storyIndex] += effLoad * length;
          totalSeismicWeight += effLoad * length;
        }
      });

      const baseShear = 0.08 * totalSeismicWeight; // Ah = 0.08
      let sumWh2 = 0;
      for (let i = 1; i <= wizardStories; i++) {
        sumWh2 += storyWeights[i] * Math.pow(i * ySpacings[0], 2);
      }

      for (let i = 1; i <= wizardStories; i++) {
        const Qi = baseShear * (storyWeights[i] * Math.pow(i * ySpacings[0], 2)) / sumWh2;
        // Apply Qi to a corner node of this story
        const cornerNodeId = `Node_S${i}_X0_Z0`;
        const node = newJoints.find(j => j.id === cornerNodeId);
        if (node) {
          node.loads.push({ fx: Qi, fy: 0, mz: 0, loadCaseId: 'LC4' }); // Use LC4 for Seismic
        }
      }

      setJoints(newJoints);
      setFrames(newFrames);
      setSlabs(newSlabs);
      setShowWizard(false);
      setViewpoint('3D');
      setAnalysisPlane('XY');

    } else if (wizardType === 'commercial') {
      // Commercial heavy steel frame in 3D
      for (let story = 0; story <= wizardStories; story++) {
        for (let bay = 0; bay <= wizardBays; bay++) {
          for (let zBay = 0; zBay <= wizardZBays; zBay++) {
            const id = `Node_S${story}_X${bay}_Z${zBay}`;
            const isBase = story === 0;
            newJoints.push({
              id,
              x: xCoords[bay],
              y: yCoords[story],
              z: zCoords[zBay],
              support: isBase ? wizardSupport : 'Free',
              loads: [],
            });
          }
        }
      }

      let beamCount = 1;
      let colCount = 1;
      let braceCount = 1;
      for (let story = 1; story <= wizardStories; story++) {
        for (let bay = 0; bay <= wizardBays; bay++) {
          for (let zBay = 0; zBay <= wizardZBays; zBay++) {
            const idNodeBelow = `Node_S${story - 1}_X${bay}_Z${zBay}`;
            const idNodeCurrent = `Node_S${story}_X${bay}_Z${zBay}`;
            
            // Columns
            newFrames.push({
              id: `Column_C${colCount++}`,
              nodeI: idNodeBelow,
              nodeJ: idNodeCurrent,
              type: 'Column',
              sectionId: 'S1', // Steel Section
              loads: [],
            });

            // Beams in X
            if (bay > 0) {
              const idNodePrev = `Node_S${story}_X${bay - 1}_Z${zBay}`;
              newFrames.push({
                id: `Beam_X_B${beamCount++}`,
                nodeI: idNodePrev,
                nodeJ: idNodeCurrent,
                type: 'Beam',
                sectionId: 'S1', // Steel Section
                loads: [
                  {
                    id: `L_BX${beamCount}_D`,
                    type: 'UDL',
                    direction: 'GlobalY',
                    value: Number((wizardBeamLoad * 0.5).toFixed(1)),
                    loadCaseId: 'LC1',
                  },
                  {
                    id: `L_BX${beamCount}_L`,
                    type: 'UDL',
                    direction: 'GlobalY',
                    value: Number((wizardBeamLoad * 0.5).toFixed(1)),
                    loadCaseId: 'LC2',
                  }
                ],
              });

              // X-Bracing in first and last X bays for outer faces
              if ((bay === 1 || bay === wizardBays) && (zBay === 0 || zBay === wizardZBays)) {
                newFrames.push({
                  id: `Brace_X_D${braceCount++}`,
                  nodeI: idNodeBelow,
                  nodeJ: idNodeCurrent, 
                  type: 'Brace',
                  sectionId: 'S1',
                  loads: [],
                });
              }
            }

            // Beams in Z
            if (zBay > 0) {
              const idNodePrevZ = `Node_S${story}_X${bay}_Z${zBay - 1}`;
              newFrames.push({
                id: `Beam_Z_B${beamCount++}`,
                nodeI: idNodePrevZ,
                nodeJ: idNodeCurrent,
                type: 'Beam',
                sectionId: 'S1',
                loads: [
                  {
                    id: `L_BZ${beamCount}_D`,
                    type: 'UDL',
                    direction: 'GlobalY',
                    value: Number((wizardBeamLoad * 0.5).toFixed(1)),
                    loadCaseId: 'LC1',
                  },
                  {
                    id: `L_BZ${beamCount}_L`,
                    type: 'UDL',
                    direction: 'GlobalY',
                    value: Number((wizardBeamLoad * 0.5).toFixed(1)),
                    loadCaseId: 'LC2',
                  }
                ],
              });

              // Z-Bracing in first and last Z bays for outer faces
              if ((zBay === 1 || zBay === wizardZBays) && (bay === 0 || bay === wizardBays)) {
                newFrames.push({
                  id: `Brace_Z_D${braceCount++}`,
                  nodeI: idNodePrevZ,
                  nodeJ: idNodeCurrent,
                  type: 'Brace',
                  sectionId: 'S1',
                  loads: [],
                });
              }
              if (bay > 0 && zBay > 0) {
                newSlabs.push({
                  id: `Slab_S${story}_X${bay}_Z${zBay}`,
                  nodeIds: [
                    `Node_S${story}_X${bay - 1}_Z${zBay - 1}`,
                    `Node_S${story}_X${bay}_Z${zBay - 1}`,
                    `Node_S${story}_X${bay}_Z${zBay}`,
                    `Node_S${story}_X${bay - 1}_Z${zBay}`
                  ],
                  sectionId: 'S_SLAB1', 
                  loads: [
                    { id: `L_Slab${story}${bay}${zBay}_D`, type: 'UDL', value: 3.125, loadCaseId: 'LC1' },
                    { id: `L_Slab${story}${bay}${zBay}_L`, type: 'UDL', value: 2.0, loadCaseId: 'LC2' }
                  ]
                });
              }

            }
          }
        }
        
        // Wind loads on the left face (X = 0) at this floor level
        for (let zBay = 0; zBay <= wizardZBays; zBay++) {
          const leftNode = newJoints.find(j => j.id === `Node_S${story}_X0_Z${zBay}`);
          if (leftNode) {
            leftNode.loads.push({
              fx: Number((10.0 * story).toFixed(1)), // dynamic wind load
              fy: 0,
              mz: 0,
              loadCaseId: 'LC3',
            });
          }
        }
      }
      setJoints(newJoints);
      setFrames(newFrames);
      setSlabs(newSlabs);
      setShowWizard(false);
      setViewpoint('3D');
      setAnalysisPlane('XY');

    } else if (wizardType === 'warehouse') {
      // Industrial Gable Warehouse (Multiple frames in 3D)
      const span = xCoords[xCoords.length - 1];
      const colHeight = yCoords[yCoords.length - 1];
      const ridgeHeight = colHeight + 2.0; // pitch ridge

      // Generate joints for multiple frames spaced in Z
      for (let zBay = 0; zBay <= wizardZBays; zBay++) {
        const zVal = zCoords[zBay];
        newJoints.push({ id: `Port_A0_Z${zBay}`, x: 0.0, y: 0.0, z: zVal, support: wizardSupport, loads: [] });
        newJoints.push({ id: `Port_A1_Z${zBay}`, x: 0.0, y: colHeight, z: zVal, support: 'Free', loads: [] });
        newJoints.push({ id: `Port_Ridge_Z${zBay}`, x: span / 2, y: ridgeHeight, z: zVal, support: 'Free', loads: [] });
        newJoints.push({ id: `Port_B1_Z${zBay}`, x: span, y: colHeight, z: zVal, support: 'Free', loads: [] });
        newJoints.push({ id: `Port_B0_Z${zBay}`, x: span, y: 0.0, z: zVal, support: wizardSupport, loads: [] });

        // Columns
        newFrames.push({ id: `Col_Left_Z${zBay}`, nodeI: `Port_A0_Z${zBay}`, nodeJ: `Port_A1_Z${zBay}`, type: 'Column', sectionId: 'S1', loads: [] });
        newFrames.push({ id: `Col_Right_Z${zBay}`, nodeI: `Port_B0_Z${zBay}`, nodeJ: `Port_B1_Z${zBay}`, type: 'Column', sectionId: 'S1', loads: [] });

        // Rafters (pitched beams)
        newFrames.push({
          id: `Rafter_Left_Z${zBay}`,
          nodeI: `Port_A1_Z${zBay}`,
          nodeJ: `Port_Ridge_Z${zBay}`,
          type: 'Beam',
          sectionId: 'S1',
          loads: [
            {
              id: `L_Raf_L1_Z${zBay}`,
              type: 'UDL',
              direction: 'GlobalY',
              value: wizardBeamLoad,
              loadCaseId: 'LC1',
            }
          ],
        });
        newFrames.push({
          id: `Rafter_Right_Z${zBay}`,
          nodeI: `Port_Ridge_Z${zBay}`,
          nodeJ: `Port_B1_Z${zBay}`,
          type: 'Beam',
          sectionId: 'S1',
          loads: [
            {
              id: `L_Raf_R1_Z${zBay}`,
              type: 'UDL',
              direction: 'GlobalY',
              value: wizardBeamLoad,
              loadCaseId: 'LC1',
            }
          ],
        });

        // Wind load on eave
        const eaveNode = newJoints.find(j => j.id === `Port_A1_Z${zBay}`);
        if (eaveNode) {
          eaveNode.loads.push({
            fx: 30.0,
            fy: 0,
            mz: 0,
            loadCaseId: 'LC3',
          });
        }

        // Purlins/Girts in Z direction connecting the portal frames
        if (zBay > 0) {
          newFrames.push({ id: `Girt_Eave_Left_Z${zBay}`, nodeI: `Port_A1_Z${zBay - 1}`, nodeJ: `Port_A1_Z${zBay}`, type: 'Beam', sectionId: 'S1', loads: [] });
          newFrames.push({ id: `Purlin_Ridge_Z${zBay}`, nodeI: `Port_Ridge_Z${zBay - 1}`, nodeJ: `Port_Ridge_Z${zBay}`, type: 'Beam', sectionId: 'S1', loads: [] });
          newFrames.push({ id: `Girt_Eave_Right_Z${zBay}`, nodeI: `Port_B1_Z${zBay - 1}`, nodeJ: `Port_B1_Z${zBay}`, type: 'Beam', sectionId: 'S1', loads: [] });
        }
      }

      setJoints(newJoints);
      setFrames(newFrames);
      setSlabs(newSlabs);
      setShowWizard(false);
      setViewpoint('3D');
      setAnalysisPlane('XY');
    }
  };

  // CAD Action: Add a joint (node)
  const handleAddJoint = (x: number, y: number, z?: number): string => {
    let maxIdNum = 0;
    joints.forEach((j) => {
      const match = j.id.match(/^J(\d+)$/);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxIdNum) maxIdNum = num;
      }
    });
    const id = `J${maxIdNum + 1}`;
    const newJoint: Joint = {
      id,
      x,
      y,
      z: z ?? 0,
      support: 'Free',
      loads: [],
    };
    setJoints((prev) => [...prev, newJoint]);
    return id;
  };

  
  const handleAddSlab = (nodeIds: string[]) => {
    let num = slabs.length + 1;
    let id = `Slab_SL${num}`;
    while (slabs.some(s => s.id === id)) {
      num++;
      id = `Slab_SL${num}`;
    }

    const newSlab: Slab = {
      id,
      nodeIds,
      sectionId: 'S_SLAB1', // default slab section
      loads: [
        { id: `L_${id}_D`, type: 'UDL', value: 3.125, loadCaseId: 'LC1' },
        { id: `L_${id}_L`, type: 'UDL', value: 2.0, loadCaseId: 'LC2' }
      ]
    };
    setSlabs(prev => [...prev, newSlab]);
  };

  // CAD Action: Add a frame element (Beam / Column)
  const handleAddFrame = (nodeI: string, nodeJ: string, type: 'Beam' | 'Column') => {
    // Check if member already exists
    const exists = frames.find(
      (f) =>
        (f.nodeI === nodeI && f.nodeJ === nodeJ) || (f.nodeI === nodeJ && f.nodeJ === nodeI)
    );
    if (exists) return;

    let num = 1;
    const prefix = type === 'Column' ? 'Column_C' : 'Beam_B';
    let id = `${prefix}${num}`;
    while (frames.some((f) => f.id === id || f.id === `${type}_${num}`)) {
      num++;
      id = `${prefix}${num}`;
    }

    const defaultSect = type === 'Column' ? 'S3' : 'S2'; // S3 column concrete, S2 beam concrete default

    const newFrame: Frame = {
      id,
      nodeI,
      nodeJ,
      type,
      sectionId: defaultSect,
      loads: [],
    };
    setFrames((prev) => [...prev, newFrame]);
  };

  // CAD Action: Add a vertical column safely (handles joint creations and updates atomically)
  const handleAddVerticalColumn = (x: number, z: number, yBottom: number, yTop: number) => {
    setJoints((prevJoints) => {
      let jointBottom = prevJoints.find(j => Math.abs(j.x - x) < 0.01 && Math.abs(j.y - yBottom) < 0.01 && Math.abs((j.z || 0) - z) < 0.01);
      let jointTop = prevJoints.find(j => Math.abs(j.x - x) < 0.01 && Math.abs(j.y - yTop) < 0.01 && Math.abs((j.z || 0) - z) < 0.01);

      const nextJoints = [...prevJoints];
      let jBottomId = '';
      let jTopId = '';

      if (jointBottom) {
        jBottomId = jointBottom.id;
      } else {
        let maxNum = 0;
        nextJoints.forEach(j => {
          const m = j.id.match(/^J(\d+)$/);
          if (m) {
            const num = parseInt(m[1]);
            if (num > maxNum) maxNum = num;
          }
        });
        jBottomId = `J${maxNum + 1}`;
        nextJoints.push({
          id: jBottomId,
          x,
          y: yBottom,
          z,
          support: yBottom === 0 ? 'Fixed' : 'Free', // auto-fix column base
          loads: [],
        });
      }

      if (jointTop) {
        jTopId = jointTop.id;
      } else {
        let maxNum = 0;
        nextJoints.forEach(j => {
          const m = j.id.match(/^J(\d+)$/);
          if (m) {
            const num = parseInt(m[1]);
            if (num > maxNum) maxNum = num;
          }
        });
        jTopId = `J${maxNum + 1}`;
        nextJoints.push({
          id: jTopId,
          x,
          y: yTop,
          z,
          support: 'Free',
          loads: [],
        });
      }

      // Add the Frame
      setFrames((prevFrames) => {
        const exists = prevFrames.find(
          (f) =>
            (f.nodeI === jBottomId && f.nodeJ === jTopId) || (f.nodeI === jTopId && f.nodeJ === jBottomId)
        );
        if (exists) return prevFrames;

        let colNum = 1;
        let id = `Column_C${colNum}`;
        while (prevFrames.some((f) => f.id === id || f.id === `Column_${colNum}`)) {
          colNum++;
          id = `Column_C${colNum}`;
        }
        return [
          ...prevFrames,
          {
            id,
            nodeI: jBottomId,
            nodeJ: jTopId,
            type: 'Column',
            sectionId: 'S3', // standard concrete column section
            loads: [],
          }
        ];
      });

      return nextJoints;
    });
  };

  // CAD Action: Delete Joint (removes associated frames too)
  const handleDeleteJoint = (jointId: string) => {
    setJoints((prev) => prev.filter((j) => j.id !== jointId));
    setFrames((prev) => prev.filter((f) => f.nodeI !== jointId && f.nodeJ !== jointId));
  };

  // CAD Action: Delete Frame
  const handleDeleteSlab = (id: string) => {
    setSlabs(prev => prev.filter(s => s.id !== id));
    if (selectedSlabId === id) setSelectedSlabId(null);
  };
  
  const handleDeleteFrame = (frameId: string) => {
    setFrames((prev) => prev.filter((f) => f.id !== frameId));
  };

  // Assign Support condition to Joint
  const handleAssignSupport = (jointId: string, support: SupportType) => {
    setJoints((prev) =>
      prev.map((j) => (j.id === jointId ? { ...j, support } : j))
    );
  };

  // Assign Load to Joint
  const handleAssignJointLoad = (
    jointId: string,
    fx: number,
    fy: number,
    mz: number,
    loadCaseId: string
  ) => {
    setJoints((prev) =>
      prev.map((j) => {
        if (j.id === jointId) {
          // Remove previous load of same case if existing
          const filtered = j.loads.filter((l) => l.loadCaseId !== loadCaseId);
          return {
            ...j,
            loads: [...filtered, { fx, fy, mz, loadCaseId }],
          };
        }
        return j;
      })
    );
  };

  // Assign Load to Frame Member
  const handleAssignFrameLoad = (
    frameId: string,
    type: 'UDL' | 'Point',
    dir: 'GlobalY' | 'LocalY' | 'GlobalX',
    value: number,
    offset: number,
    loadCaseId: string
  ) => {
    setFrames((prev) =>
      prev.map((f) => {
        if (f.id === frameId) {
          const loadId = `L_${f.loads.length + 1}`;
          // Filter to remove duplicates of the same type/case
          const filtered = f.loads.filter(
            (l) => !(l.loadCaseId === loadCaseId && l.type === type)
          );
          return {
            ...f,
            loads: [
              ...filtered,
              { id: loadId, type, direction: dir, value, offset, loadCaseId },
            ],
          };
        }
        return f;
      })
    );
  };

  // Model update triggers from sidebar
  const handleUpdateJoint = (updatedJoint: Joint) => {
    setJoints((prev) => prev.map((j) => (j.id === updatedJoint.id ? updatedJoint : j)));
  };

  const handleUpdateFrame = (updatedFrame: Frame) => {
    setFrames((prev) => prev.map((f) => (f.id === updatedFrame.id ? updatedFrame : f)));
  };

  const handleUpdateSlab = (updatedSlab: Slab) => {
    setSlabs(prev => prev.map(s => s.id === updatedSlab.id ? updatedSlab : s));
  };

  const handleUpdateCombination = (combo: LoadCombination) => {
    setCombinations((prev) => prev.map((c) => (c.id === combo.id ? combo : c)));
  };

  const handleAddSection = (sect: Section) => {
    setSections((prev) => [...prev, sect]);
  };

  const handleDeleteSection = (sectId: string) => {
    // Ensure section isn't the last one
    if (sections.length <= 1) return;
    setSections((prev) => prev.filter((s) => s.id !== sectId));
    // Re-route any frames with deleted section to first section
    const fallbackSect = sections.find((s) => s.id !== sectId)?.id || '';
    setFrames((prev) =>
      prev.map((f) => (f.sectionId === sectId ? { ...f, sectionId: fallbackSect } : f))
    );
  };

  // Auto-Generate Wind Loads (IS 875 Part 3:2015)
  const handleGenerateWindLoads = () => {
    if (joints.length === 0) {
      alert('Please define structural joints first.');
      return;
    }

    // Get unique heights y > 0
    const heights = Array.from(new Set<number>(joints.map(j => Math.round(j.y * 100) / 100)))
      .filter(y => y > 0)
      .sort((a, b) => a - b);

    if (heights.length === 0) {
      alert('No floors or elevated joints found to apply wind loads (heights > 0m).');
      return;
    }

    // Calculate wind forces for target joints functional mapping
    const targetJointIdsAtHeights: Record<string, number> = {}; // jointId -> Fw force
    heights.forEach((y, index) => {
      const jointsAtHeight = joints.filter(j => Math.abs(j.y - y) < 0.05);
      if (jointsAtHeight.length === 0) return;

      const leftMost = jointsAtHeight.reduce((prev, curr) => (curr.x < prev.x ? curr : prev), jointsAtHeight[0]);

      // Tributary height calculation
      const hBelow = index === 0 ? y : (y - heights[index - 1]);
      const hAbove = index === heights.length - 1 ? 0 : (heights[index + 1] - y);
      const hTrib = hBelow / 2 + hAbove / 2;

      // Tributary area (assumes typical 5m perpendicular spacing)
      const A_e = hTrib * 5.0;

      // Vz = Vb * k1 * k2 * k3 * k4
      // Dynamic k2 based on IS 875 Table 2 Terrain Category 2
      let k2 = windK2;
      if (y <= 10) k2 = 1.0;
      else if (y <= 15) k2 = 1.05;
      else if (y <= 20) k2 = 1.07;
      else if (y <= 30) k2 = 1.12;
      else k2 = 1.15;

      const Vz = windVb * windK1 * k2 * windK3 * windK4;
      const pz = 0.6 * Vz * Vz * 1e-3; // pressure in kN/m2
      const Fw = windCf * A_e * pz; // wind force in kN

      targetJointIdsAtHeights[leftMost.id] = parseFloat(Fw.toFixed(2));
    });

    const updatedJoints = joints.map(joint => {
      // Clear existing wind loads and add new one if it is a target
      const filteredLoads = joint.loads.filter(l => l.loadCaseId !== 'LC3');
      if (targetJointIdsAtHeights[joint.id] !== undefined) {
        filteredLoads.push({
          fx: targetJointIdsAtHeights[joint.id],
          fy: 0,
          mz: 0,
          loadCaseId: 'LC3',
        });
      }
      return { ...joint, loads: filteredLoads };
    });

    setJoints(updatedJoints);
    setActiveLoadCaseId('LC3'); // Automatically switch active load case to Wind Load to show on canvas!
    alert(`Successfully generated Indian Standard wind loads (IS 875:3) based on Basic Wind Speed Vb = ${windVb} m/s.`);
  };

  // Auto-Generate Seismic Loads (IS 1893:2016)
  const handleGenerateSeismicLoads = () => {
    if (joints.length === 0 || frames.length === 0) {
      alert('Please define structural joints and frame elements first.');
      return;
    }

    // 1. Calculate joint tributary weights
    const jointWeights: Record<string, number> = {};
    joints.forEach(j => {
      jointWeights[j.id] = 1.0; // standard joint minimum node load
    });

    // Add frame member self-weights (attributed half to Node I and half to Node J)
    frames.forEach(f => {
      const nodeI = joints.find(j => j.id === f.nodeI);
      const nodeJ = joints.find(j => j.id === f.nodeJ);
      if (!nodeI || !nodeJ) return;

      const dx = nodeJ.x - nodeI.x;
      const dy = nodeJ.y - nodeI.y;
      const L = Math.sqrt(dx * dx + dy * dy);

      const sect = sections.find(s => s.id === f.sectionId);
      if (!sect) return;
      const mat = materials.find(m => m.id === sect.materialId);
      if (!mat) return;

      const unitWeight = mat.unitWeight ?? 25.0;

      // Calculate cross-sectional area
      let A = sect.width * sect.depth;
      if (sect.shape === 'Circular') {
        A = (Math.PI * sect.depth * sect.depth) / 4;
      } else if (sect.shape === 'I-Shape') {
        const tw = sect.webThickness || 0.008;
        const tf = sect.flangeThickness || 0.012;
        const bf = sect.width;
        A = 2 * bf * tf + tw * (sect.depth - 2 * tf);
      }

      // Self-weight in kN
      const weight = A * L * unitWeight;
      jointWeights[f.nodeI] = (jointWeights[f.nodeI] || 0) + weight / 2;
      jointWeights[f.nodeJ] = (jointWeights[f.nodeJ] || 0) + weight / 2;

      // Estimated tributary slab dead load & live load for beams
      if (f.type === 'Beam') {
        const slabDL = 18.75 * L; // kN
        jointWeights[f.nodeI] = (jointWeights[f.nodeI] || 0) + slabDL / 2;
        jointWeights[f.nodeJ] = (jointWeights[f.nodeJ] || 0) + slabDL / 2;

        const slabLLSeismic = 3.75 * L; // kN
        jointWeights[f.nodeI] = (jointWeights[f.nodeI] || 0) + slabLLSeismic / 2;
        jointWeights[f.nodeJ] = (jointWeights[f.nodeJ] || 0) + slabLLSeismic / 2;
      }
    });

    // Get unique floor heights y > 0
    const heights = Array.from(new Set<number>(joints.map(j => Math.round(j.y * 100) / 100)))
      .filter(y => y > 0)
      .sort((a, b) => a - b);

    if (heights.length === 0) {
      alert('No floor stories found (heights > 0m) to apply seismic loads.');
      return;
    }

    // Calculate story weights W_i
    const storyWeights: Record<number, number> = {};
    heights.forEach(y => {
      storyWeights[y] = 0;
    });

    joints.forEach(j => {
      if (j.y <= 0) return;
      const yStory = heights.find(h => Math.abs(h - j.y) < 0.1);
      if (yStory !== undefined) {
        storyWeights[yStory] += jointWeights[j.id] || 0;
      }
    });

    // Total seismic weight W
    const totalW = Object.values(storyWeights).reduce((sum, val) => sum + val, 0);

    // Calculate structural period T = 0.09h / sqrt(d)
    const hMax = heights[heights.length - 1];
    const xCoords = joints.map(j => j.x);
    const dWidth = Math.max(...xCoords) - Math.min(...xCoords) || 5.0;
    const T = 0.09 * (hMax / Math.sqrt(dWidth));

    // Sa/g spectral acceleration coefficient based on soil type
    let Sa_g = 2.5;
    if (seismicSoil === 'I') {
      if (T < 0.1) Sa_g = 1.0 + 15 * T;
      else if (T <= 0.40) Sa_g = 2.5;
      else Sa_g = 1.0 / T;
    } else if (seismicSoil === 'II') {
      if (T < 0.1) Sa_g = 1.0 + 15 * T;
      else if (T <= 0.55) Sa_g = 2.5;
      else Sa_g = 1.36 / T;
    } else {
      if (T < 0.1) Sa_g = 1.0 + 15 * T;
      else if (T <= 0.67) Sa_g = 2.5;
      else Sa_g = 1.67 / T;
    }
    if (Sa_g < 0.35) Sa_g = 0.35;

    // Zone factor Z
    let Z = 0.16;
    if (seismicZone === 'II') Z = 0.10;
    else if (seismicZone === 'III') Z = 0.16;
    else if (seismicZone === 'IV') Z = 0.24;
    else if (seismicZone === 'V') Z = 0.36;

    // Ah = (Z/2) * (I/R) * (Sa/g)
    const Ah = (Z / 2) * (seismicI / seismicR) * Sa_g;
    const V_b = Ah * totalW;

    // Distribute Base Shear to stories using lateral vertical force formula
    const sumW_h2 = heights.reduce((sum, h) => sum + storyWeights[h] * h * h, 0);

    const targetJointIdsSeismic: Record<string, number> = {}; // jointId -> Qi force
    heights.forEach(y => {
      const jointsAtHeight = joints.filter(j => Math.abs(j.y - y) < 0.05);
      if (jointsAtHeight.length === 0) return;

      // Find left-most joint to apply the lateral point force
      const leftMost = jointsAtHeight.reduce((prev, curr) => (curr.x < prev.x ? curr : prev), jointsAtHeight[0]);

      const storyW = storyWeights[y] || 0;
      const Qi = sumW_h2 > 0 ? V_b * (storyW * y * y) / sumW_h2 : 0;

      targetJointIdsSeismic[leftMost.id] = parseFloat(Qi.toFixed(2));
    });

    const updatedJoints = joints.map(joint => {
      // Clear existing seismic loads and add new one if it is a target
      const filteredLoads = joint.loads.filter(l => l.loadCaseId !== 'LC4');
      if (targetJointIdsSeismic[joint.id] !== undefined) {
        filteredLoads.push({
          fx: targetJointIdsSeismic[joint.id],
          fy: 0,
          mz: 0,
          loadCaseId: 'LC4',
        });
      }
      return { ...joint, loads: filteredLoads };
    });

    setJoints(updatedJoints);
    setActiveLoadCaseId('LC4'); // Automatically switch active load case to Seismic Load to show on canvas!
    alert(`Successfully generated Indian Standard base shear (IS 1893) lateral loads:\nTotal Seismic Weight W = ${totalW.toFixed(1)} kN\nBase Shear Vb = ${V_b.toFixed(2)} kN\nPeriod T = ${T.toFixed(3)}s, Sa/g = ${Sa_g.toFixed(2)}, Ah = ${Ah.toFixed(4)}.`);
  };

  // Replicate selected element (CAD array tool)
  const handleReplicate = () => {
    if (!selectedJointId && !selectedFrameId) {
      alert('Please select a joint or frame member to replicate.');
      return;
    }
    
    const dx = parseFloat(repDx) || 0;
    const dy = parseFloat(repDy) || 0;
    const num = parseInt(repNum as any) || 1;

    if (num < 1) return;

    const addedJoints: Joint[] = [];

    if (selectedJointId) {
      const sourceJoint = joints.find(j => j.id === selectedJointId);
      if (!sourceJoint) return;

      let maxNum = 0;
      joints.forEach(j => {
        const m = j.id.match(/^J(\d+)$/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
      });

      let currentX = sourceJoint.x;
      let currentY = sourceJoint.y;
      let currentZ = sourceJoint.z || 0;

      for (let i = 1; i <= num; i++) {
        currentX += dx;
        currentY += dy;
        
        let testNum = maxNum + 1;
        let idCandidate = `J${testNum}`;
        while (joints.some(j => j.id === idCandidate) || addedJoints.some(j => j.id === idCandidate)) {
          testNum++;
          idCandidate = `J${testNum}`;
        }
        maxNum = testNum;

        addedJoints.push({
          id: idCandidate,
          x: currentX,
          y: currentY,
          z: currentZ,
          support: 'Free',
          loads: [],
        });
      }
      setJoints(prev => [...prev, ...addedJoints]);
      setShowReplicateModal(false);
      alert(`Replicated selected joint ${num} times.`);
    } else if (selectedFrameId) {
      const sourceFrame = frames.find(f => f.id === selectedFrameId);
      if (!sourceFrame) return;

      const nodeI = joints.find(j => j.id === sourceFrame.nodeI);
      const nodeJ = joints.find(j => j.id === sourceFrame.nodeJ);
      if (!nodeI || !nodeJ) return;

      let currentNodeIX = nodeI.x;
      let currentNodeIY = nodeI.y;
      let currentNodeJX = nodeJ.x;
      let currentNodeJY = nodeJ.y;

      let jointMaxNum = 0;
      joints.forEach(j => {
        const m = j.id.match(/^J(\d+)$/);
        if (m) jointMaxNum = Math.max(jointMaxNum, parseInt(m[1]));
      });

      let frameMaxNum = 0;
      frames.forEach(f => {
        const m = f.id.match(/^(Beam|Column|Brace)_B?C?(\d+)$/);
        if (m) {
          frameMaxNum = Math.max(frameMaxNum, parseInt(m[2]));
        } else {
          const m2 = f.id.match(/^(Beam|Column|Brace)_(\d+)$/);
          if (m2) frameMaxNum = Math.max(frameMaxNum, parseInt(m2[2]));
        }
      });

      const nextJoints = [...joints];
      const nextFrames = [...frames];

      for (let i = 1; i <= num; i++) {
        currentNodeIX += dx;
        currentNodeIY += dy;
        currentNodeJX += dx;
        currentNodeJY += dy;

        // Check if joints already exist at target coordinates
        let targetNodeI = nextJoints.find(j => Math.abs(j.x - currentNodeIX) < 0.05 && Math.abs(j.y - currentNodeIY) < 0.05);
        let targetNodeJ = nextJoints.find(j => Math.abs(j.x - currentNodeJX) < 0.05 && Math.abs(j.y - currentNodeJY) < 0.05);

        let nodeIId = '';
        let nodeJId = '';

        if (targetNodeI) {
          nodeIId = targetNodeI.id;
        } else {
          let testNum = jointMaxNum + 1;
          nodeIId = `J${testNum}`;
          while (nextJoints.some(j => j.id === nodeIId)) {
            testNum++;
            nodeIId = `J${testNum}`;
          }
          jointMaxNum = testNum;

          const newJ = { id: nodeIId, x: currentNodeIX, y: currentNodeIY, support: 'Free' as SupportType, loads: [] };
          nextJoints.push(newJ);
        }

        if (targetNodeJ) {
          nodeJId = targetNodeJ.id;
        } else {
          let testNum = jointMaxNum + 1;
          nodeJId = `J${testNum}`;
          while (nextJoints.some(j => j.id === nodeJId)) {
            testNum++;
            nodeJId = `J${testNum}`;
          }
          jointMaxNum = testNum;

          const newJ = { id: nodeJId, x: currentNodeJX, y: currentNodeJY, support: 'Free' as SupportType, loads: [] };
          nextJoints.push(newJ);
        }

        let testNum = frameMaxNum + 1;
        const prefix = sourceFrame.type === 'Column' ? 'Column_C' : sourceFrame.type === 'Beam' ? 'Beam_B' : `${sourceFrame.type}_`;
        let idCandidate = `${prefix}${testNum}`;
        while (nextFrames.some(f => f.id === idCandidate || f.id === `${sourceFrame.type}_${testNum}`)) {
          testNum++;
          idCandidate = `${prefix}${testNum}`;
        }
        frameMaxNum = testNum;

        const newF: Frame = {
          id: idCandidate,
          nodeI: nodeIId,
          nodeJ: nodeJId,
          type: sourceFrame.type,
          sectionId: sourceFrame.sectionId,
          loads: [],
        };
        nextFrames.push(newF);
      }

      setJoints(nextJoints);
      setFrames(nextFrames);
      setShowReplicateModal(false);
      alert(`Replicated selected frame member and associated joints ${num} times.`);
    }
  };

  return (
    <div id="app-root-container" className="flex flex-col h-screen w-screen bg-[#F3F3F3] text-slate-800 overflow-hidden font-sans select-none text-[11px]">
      {/* 1. WINDOWS CAD APPLICATION TITLE BAR & DECORATIVE MENU */}
      <div id="desktop-title-bar" className="bg-[#004A99] text-white px-3 py-1.5 flex items-center justify-center select-none flex-shrink-0 text-sm font-bold tracking-wider relative">
        <span>Tensora Structure</span>
        {user && (
          <div className="absolute right-3 flex items-center gap-2 text-[11px] font-normal tracking-normal">
            {user.picture && (
              <img src={user.picture} alt="" className="w-5 h-5 rounded-full bg-white/20" referrerPolicy="no-referrer" />
            )}
            <span className="max-w-[180px] truncate">{user.email}</span>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="bg-white/15 hover:bg-white/25 rounded px-2 py-0.5 cursor-pointer transition"
              >
                Sign out
              </button>
            )}
          </div>
        )}
      </div>

      <header id="main-header" className="bg-white border-b border-[#D1D1D1] flex flex-col select-none flex-shrink-0 z-20">
        {/* Top Desktop-style menu options */}
        <div id="desktop-menu-bar" className="flex items-center px-3 py-1 border-b border-[#E5E5E5] text-[11px] font-medium text-slate-700 space-x-4 relative" onMouseLeave={() => setActiveMenu(null)}>
          {/* FILE MENU */}
          <div className="relative inline-block text-left">
            <button
              id="menu-btn-file"
              onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
              className={`font-bold text-[#004A99] cursor-pointer hover:bg-slate-100 px-2 py-0.5 rounded transition ${activeMenu === 'file' ? 'bg-slate-100' : ''}`}
            >
              File
            </button>
            {activeMenu === 'file' && (
              <div className="absolute left-0 mt-1 w-56 rounded-sm bg-white shadow-2xl border border-[#D1D1D1] z-50 py-1 text-slate-800 font-sans">
                <button
                  id="file-item-new"
                  onClick={() => { handleClearAll(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] font-semibold hover:bg-[#E8F0FE] hover:text-[#004A99] transition-colors"
                >
                  📄 New Blank Model (Reset)
                </button>
                <div className="border-b border-[#E5E5E5] my-1"></div>
                <div className="px-3 py-0.5 text-[9px] font-bold text-slate-400 uppercase">Open Demo Models</div>
                <button
                  id="file-item-demo-portal"
                  onClick={() => { handleLoadDemo('portal'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE] hover:text-[#004A99]"
                >
                  🏢 1-Story Portal Frame
                </button>
                <button
                  id="file-item-demo-multi"
                  onClick={() => { handleLoadDemo('multiStory'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE] hover:text-[#004A99]"
                >
                  🏙️ 3-Story Multi-Bay Frame
                </button>
                <button
                  id="file-item-demo-bridge"
                  onClick={() => { handleLoadDemo('bridge'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE] hover:text-[#004A99]"
                >
                  🌉 Continuous Bridge Truss
                </button>
                <div className="border-b border-[#E5E5E5] my-1"></div>
                <button
                  id="file-item-report"
                  onClick={() => {
                    if (!results.isAnalyzed) {
                      alert('Please run structural analysis first (click "run analysis" in the top toolbar) before generating reports.');
                      return;
                    }
                    if (!isDesigned) {
                      setIsDesigned(true);
                    }
                    setShowDesignReport(true);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-[#E8F0FE] hover:text-[#004A99]"
                >
                  📋 Generate Structural Report...
                </button>
              </div>
            )}
          </div>

          {/* EDIT MENU */}
          <div className="relative inline-block text-left">
            <button
              id="menu-btn-edit"
              onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
              className={`cursor-pointer hover:bg-slate-100 px-2 py-0.5 rounded transition ${activeMenu === 'edit' ? 'bg-slate-100' : ''}`}
            >
              Edit
            </button>
            {activeMenu === 'edit' && (
              <div className="absolute left-0 mt-1 w-56 rounded-sm bg-white shadow-2xl border border-[#D1D1D1] z-50 py-1 text-slate-800 font-sans">
                <button
                  id="edit-item-replicate"
                  onClick={() => { setShowReplicateModal(true); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-[#004A99] hover:bg-[#E8F0FE] hover:text-[#004A99]"
                >
                  🔄 Replicate / Array Tool...
                </button>
                <button
                  id="edit-item-delete"
                  onClick={() => {
                    if (selectedJointId) handleDeleteJoint(selectedJointId);
                    else if (selectedFrameId) handleDeleteFrame(selectedFrameId);
                    else alert('Please select a joint or member first.');
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-rose-700 hover:bg-rose-50"
                >
                  ❌ Delete Selected Element
                </button>
                <div className="border-b border-[#E5E5E5] my-1"></div>
                <div className="px-3 py-1 text-[9px] text-slate-500 italic leading-snug">
                  Select a frame/joint and click Replicate to copy it with custom floor-to-floor heights or bay spacing.
                </div>
              </div>
            )}
          </div>

          {/* DEFINE MENU */}
          <div className="relative inline-block text-left">
            <button
              id="menu-btn-define"
              onClick={() => setActiveMenu(activeMenu === 'define' ? null : 'define')}
              className={`cursor-pointer hover:bg-slate-100 px-2 py-0.5 rounded transition ${activeMenu === 'define' ? 'bg-slate-100' : ''}`}
            >
              Define
            </button>
            {activeMenu === 'define' && (
              <div className="absolute left-0 mt-1 w-64 rounded-sm bg-white shadow-2xl border border-[#D1D1D1] z-50 py-1 text-slate-800 font-sans">
                <button
                  id="define-item-materials"
                  onClick={() => { setShowMaterialsModal(true); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE] hover:text-[#004A99]"
                >
                  🧱 Material Properties (IS 800 / IS 456)
                </button>
                <button
                  id="define-item-sections"
                  onClick={() => { setShowSectionsModal(true); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE] hover:text-[#004A99]"
                >
                  📐 Frame Section Profiles (Steel & RC)
                </button>
                <button
                  id="define-item-loads"
                  onClick={() => { setShowLoadsModal(true); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE] hover:text-[#004A99]"
                >
                  ⚖️ Load Patterns & Load Cases
                </button>
                <button
                  id="define-item-combos"
                  onClick={() => { setShowCombosModal(true); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE] hover:text-[#004A99]"
                >
                  🔗 Load Combinations (Limit States)
                </button>
                <div className="border-b border-[#E5E5E5] my-1"></div>
                <div className="px-3 py-0.5 text-[9px] font-bold text-slate-400 uppercase">Indian Code Inputs</div>
                <button
                  id="define-item-wind"
                  onClick={() => { setShowWindModal(true); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-[#E8F0FE] hover:text-[#004A99]"
                >
                  💨 Indian Wind Parameters (IS 875:3)...
                </button>
                <button
                  id="define-item-seismic"
                  onClick={() => { setShowSeismicModal(true); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-[#E8F0FE] hover:text-[#004A99]"
                >
                  🫨 Indian Seismic Parameters (IS 1893)...
                </button>
              </div>
            )}
          </div>

          {/* DRAW MENU */}
          <div className="relative inline-block text-left">
            <button
              id="menu-btn-draw"
              onClick={() => setActiveMenu(activeMenu === 'draw' ? null : 'draw')}
              className={`cursor-pointer hover:bg-slate-100 px-2 py-0.5 rounded transition ${activeMenu === 'draw' ? 'bg-slate-100' : ''}`}
            >
              Draw
            </button>
            {activeMenu === 'draw' && (
              <div className="absolute left-0 mt-1 w-56 rounded-sm bg-white shadow-2xl border border-[#D1D1D1] z-50 py-1 text-slate-800 font-sans">
                <button
                  id="draw-item-select"
                  onClick={() => { setDrawingMode('Select'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE]"
                >
                  🖱️ Select / Modify Mode
                </button>
                <button
                  id="draw-item-joint"
                  onClick={() => { setDrawingMode('AddJoint'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE]"
                >
                  🔴 Draw Joint Node (Click Snap)
                </button>
                <button
                  id="draw-item-beam"
                  onClick={() => { setDrawingMode('AddBeam'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE]"
                >
                  ➖ Draw Horizontal Beam
                </button>
                <button
                  id="draw-item-column"
                  onClick={() => { setDrawingMode('AddColumn'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE]"
                >
                  🔳 Draw Vertical Column
                </button>
                <div className="border-b border-[#E5E5E5] my-1"></div>
                <button
                  id="draw-item-wizard"
                  onClick={() => { setShowWizard(true); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50"
                >
                  🏢 Structure Generator Wizard...
                </button>
              </div>
            )}
          </div>

          {/* ASSIGN MENU */}
          <div className="relative inline-block text-left">
            <button
              id="menu-btn-assign"
              onClick={() => setActiveMenu(activeMenu === 'assign' ? null : 'assign')}
              className={`cursor-pointer hover:bg-slate-100 px-2 py-0.5 rounded transition ${activeMenu === 'assign' ? 'bg-slate-100' : ''}`}
            >
              Assign
            </button>
            {activeMenu === 'assign' && (
              <div className="absolute left-0 mt-1 w-64 rounded-sm bg-white shadow-2xl border border-[#D1D1D1] z-50 py-1 text-slate-800 font-sans">
                <div className="px-3 py-0.5 text-[9px] font-bold text-slate-400 uppercase">Boundary Conditions</div>
                <button
                  id="assign-item-fixed"
                  onClick={() => {
                    if (selectedJointId) {
                      handleAssignSupport(selectedJointId, 'Fixed');
                      alert(`Assigned Fixed support to ${selectedJointId}`);
                    } else alert('Please select a joint first.');
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE]"
                >
                  ⚓ Support: Fixed Base
                </button>
                <button
                  id="assign-item-pinned"
                  onClick={() => {
                    if (selectedJointId) {
                      handleAssignSupport(selectedJointId, 'Pinned');
                      alert(`Assigned Pinned support to ${selectedJointId}`);
                    } else alert('Please select a joint first.');
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE]"
                >
                  🔺 Support: Pinned Base
                </button>
                <button
                  id="assign-item-roller"
                  onClick={() => {
                    if (selectedJointId) {
                      handleAssignSupport(selectedJointId, 'RollerX');
                      alert(`Assigned Roller support to ${selectedJointId}`);
                    } else alert('Please select a joint first.');
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE]"
                >
                  ⚪ Support: Roller Base
                </button>
                <div className="border-b border-[#E5E5E5] my-1"></div>
                <div className="px-3 py-0.5 text-[9px] font-bold text-slate-400 uppercase">Loads Assignment</div>
                <button
                  id="assign-item-node-load"
                  onClick={() => { setDrawingMode('AssignJointLoad'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE]"
                >
                  ⬇️ Point Force Load on Selected Joint...
                </button>
                <button
                  id="assign-item-member-load"
                  onClick={() => { setDrawingMode('AssignMemberLoad'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE]"
                >
                  📊 Distributed (UDL) Load on Frame...
                </button>
                <div className="border-b border-[#E5E5E5] my-1"></div>
                <div className="px-3 py-0.5 text-[9px] font-bold text-[#004A99] uppercase">★ Automated Load Generation</div>
                <button
                  id="assign-item-gen-wind"
                  onClick={() => { handleGenerateWindLoads(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-50"
                >
                  💨 Auto-Generate Wind Loads (IS 875:3)
                </button>
                <button
                  id="assign-item-gen-seismic"
                  onClick={() => { handleGenerateSeismicLoads(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-50"
                >
                  🫨 Auto-Generate Seismic Loads (IS 1893)
                </button>
              </div>
            )}
          </div>

          {/* ANALYZE MENU */}
          <div className="relative inline-block text-left">
            <button
              id="menu-btn-analyze"
              onClick={() => setActiveMenu(activeMenu === 'analyze' ? null : 'analyze')}
              className={`cursor-pointer hover:bg-slate-100 px-2 py-0.5 rounded transition ${activeMenu === 'analyze' ? 'bg-slate-100' : ''}`}
            >
              Analyze
            </button>
            {activeMenu === 'analyze' && (
              <div className="absolute left-0 mt-1 w-56 rounded-sm bg-white shadow-2xl border border-[#D1D1D1] z-50 py-1 text-slate-800 font-sans">
                <button
                  id="analyze-item-run"
                  onClick={() => { handleRunAnalysis(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-[#004A99] hover:bg-[#E8F0FE] hover:text-[#004A99]"
                >
                  ▶️ Run Analysis (Linear Static)
                </button>
                <button
                  id="analyze-item-settings"
                  onClick={() => { setShowSolverModal(true); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE]"
                >
                  ⚙️ Solver Options & P-Delta...
                </button>
              </div>
            )}
          </div>

          {/* DISPLAY MENU */}
          <div className="relative inline-block text-left">
            <button
              id="menu-btn-display"
              onClick={() => setActiveMenu(activeMenu === 'display' ? null : 'display')}
              className={`cursor-pointer hover:bg-slate-100 px-2 py-0.5 rounded transition ${activeMenu === 'display' ? 'bg-slate-100' : ''}`}
            >
              Display
            </button>
            {activeMenu === 'display' && (
              <div className="absolute left-0 mt-1 w-56 rounded-sm bg-white shadow-2xl border border-[#D1D1D1] z-50 py-1 text-slate-800 font-sans">
                <button
                  id="display-item-model"
                  onClick={() => { setViewMode('Model'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE]"
                >
                  💻 Show Structural Model
                </button>
                <button
                  id="display-item-extrude"
                  onClick={() => { setViewMode('Extruded'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE]"
                >
                  3️⃣ Show 3D Extruded Profiles
                </button>
                <button
                  id="display-item-deflect"
                  onClick={() => { setViewMode('Deflection'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE]"
                >
                  🪱 Show Deflected Shape
                </button>
                <div className="border-b border-[#E5E5E5] my-1"></div>
                <div className="px-3 py-0.5 text-[9px] font-bold text-slate-400 uppercase">Forces Diagrams</div>
                <button
                  id="display-item-moment"
                  onClick={() => { setViewMode('Moment'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE] text-amber-700 font-semibold"
                >
                  📈 Bending Moment M33 Diagram
                </button>
                <button
                  id="display-item-shear"
                  onClick={() => { setViewMode('Shear'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE] text-teal-700 font-semibold"
                >
                  📉 Shear Force V22 Diagram
                </button>
                <button
                  id="display-item-axial"
                  onClick={() => { setViewMode('Axial'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE] text-blue-700 font-semibold"
                >
                  📊 Axial Force P Diagram
                </button>
              </div>
            )}
          </div>

          {/* DESIGN MENU */}
          <div className="relative inline-block text-left">
            <button
              id="menu-btn-design"
              onClick={() => setActiveMenu(activeMenu === 'design' ? null : 'design')}
              className={`cursor-pointer hover:bg-slate-100 px-2 py-0.5 rounded transition ${activeMenu === 'design' ? 'bg-slate-100' : ''}`}
            >
              Design
            </button>
            {activeMenu === 'design' && (
              <div className="absolute left-0 mt-1 w-64 rounded-sm bg-white shadow-2xl border border-[#D1D1D1] z-50 py-1 text-slate-800 font-sans">
                <div className="px-3 py-0.5 text-[9px] font-bold text-slate-400 uppercase">Active Design Codes</div>
                <button
                  id="design-item-steel-rec"
                  onClick={() => { setSteelCode('IS 800 (India) - Recommended'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE] flex items-center justify-between"
                >
                  <span>Steel: IS 800 - Recommended</span>
                  {steelCode === 'IS 800 (India) - Recommended' && <span className="text-green-600 text-xs">✓</span>}
                </button>
                <button
                  id="design-item-steel-tata"
                  onClick={() => { setSteelCode('IS 800 (India) - Tata Steel Section Standard'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE] flex items-center justify-between"
                >
                  <span>Steel: IS 800 - Tata Steel Standard</span>
                  {steelCode === 'IS 800 (India) - Tata Steel Section Standard' && <span className="text-green-600 text-xs">✓</span>}
                </button>
                <button
                  id="design-item-steel-jindal"
                  onClick={() => { setSteelCode('IS 800 (India) - Jindal Steel Section Standard'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE] flex items-center justify-between"
                >
                  <span>Steel: IS 800 - Jindal Steel Standard</span>
                  {steelCode === 'IS 800 (India) - Jindal Steel Section Standard' && <span className="text-green-600 text-xs">✓</span>}
                </button>
                <button
                  id="design-item-steel-lsd"
                  onClick={() => { setSteelCode('IS 800 (India) - Limit State Design'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE] flex items-center justify-between"
                >
                  <span>Steel: IS 800 - Limit State Design</span>
                  {steelCode === 'IS 800 (India) - Limit State Design' && <span className="text-green-600 text-xs">✓</span>}
                </button>
                <button
                  id="design-item-steel-wsd"
                  onClick={() => { setSteelCode('IS 800 (India) - Working Stress Design'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE] flex items-center justify-between"
                >
                  <span>Steel: IS 800 - Working Stress Design</span>
                  {steelCode === 'IS 800 (India) - Working Stress Design' && <span className="text-green-600 text-xs">✓</span>}
                </button>
                <div className="border-b border-[#E5E5E5] my-1"></div>
                <button
                  id="design-item-concrete-rec"
                  onClick={() => { setConcreteCode('IS 456 (India) - Recommended'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE] flex items-center justify-between"
                >
                  <span>Concrete: IS 456 - Recommended</span>
                  {concreteCode === 'IS 456 (India) - Recommended' && <span className="text-green-600 text-xs">✓</span>}
                </button>
                <button
                  id="design-item-concrete-lsd"
                  onClick={() => { setConcreteCode('IS 456 (India) - Limit State Design'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE] flex items-center justify-between"
                >
                  <span>Concrete: IS 456 - Limit State Design</span>
                  {concreteCode === 'IS 456 (India) - Limit State Design' && <span className="text-green-600 text-xs">✓</span>}
                </button>
                <button
                  id="design-item-concrete-wsd"
                  onClick={() => { setConcreteCode('IS 456 (India) - Working Stress Design'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE] flex items-center justify-between"
                >
                  <span>Concrete: IS 456 - Working Stress Design</span>
                  {concreteCode === 'IS 456 (India) - Working Stress Design' && <span className="text-green-600 text-xs">✓</span>}
                </button>
                <div className="border-b border-[#E5E5E5] my-1"></div>
                <button
                  id="design-item-run"
                  onClick={() => { handleRunDesignChecks(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-[#E8F0FE]"
                >
                  📈 Run Member Design Checks
                </button>
                <button
                  id="design-item-prefs"
                  onClick={() => { setShowDesignPrefsModal(true); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE]"
                >
                  ⚖️ Design Preferences & Safety...
                </button>
              </div>
            )}
          </div>

          <span className="text-slate-300">|</span>

          {/* DEMO MODELS */}
          <div className="relative inline-block text-left">
            <button
              id="menu-btn-demo"
              onClick={() => setActiveMenu(activeMenu === 'demo' ? null : 'demo')}
              className={`cursor-pointer hover:bg-slate-100 px-2 py-0.5 rounded transition font-bold text-slate-700 ${activeMenu === 'demo' ? 'bg-slate-100' : ''}`}
            >
              demo models
            </button>
            {activeMenu === 'demo' && (
              <div className="absolute left-0 mt-1 w-56 rounded-sm bg-white shadow-2xl border border-[#D1D1D1] z-50 py-1 text-slate-800 font-sans">
                <button
                  id="demo-item-portal"
                  onClick={() => { handleLoadDemo('portal'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE]"
                >
                  🏢 1-Story Portal Frame
                </button>
                <button
                  id="demo-item-multistory"
                  onClick={() => { handleLoadDemo('multiStory'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE]"
                >
                  🏢 3-Story Multi-Bay Frame
                </button>
                <button
                  id="demo-item-bridge"
                  onClick={() => { handleLoadDemo('bridge'); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#E8F0FE]"
                >
                  🌉 Continuous Bridge Truss
                </button>
              </div>
            )}
          </div>

          <span className="text-slate-300">|</span>

          {/* RESET CLEAR */}
          <button
            id="menu-btn-reset-clear"
            onClick={handleClearAll}
            className="cursor-pointer hover:bg-rose-50 hover:text-rose-700 text-slate-700 px-2 py-0.5 rounded transition font-bold"
          >
            reset clear
          </button>

          <span className="text-slate-300">|</span>

          {/* RUN ANALYSIS */}
          <button
            id="menu-btn-run-analysis"
            onClick={handleRunAnalysis}
            className={`cursor-pointer px-2 py-0.5 rounded transition font-bold ${
              results.isAnalyzed
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'bg-[#004A99]/10 text-[#004A99] hover:bg-[#004A99]/20'
            }`}
          >
            run analysis
          </button>

          <span className="text-slate-300">|</span>

          {/* RUN DESIGN */}
          <button
            id="menu-btn-run-design"
            onClick={handleRunDesignChecks}
            className={`cursor-pointer px-2 py-0.5 rounded transition font-bold ${
              isDesigned
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'bg-[#004A99]/10 text-[#004A99] hover:bg-[#004A99]/20'
            }`}
          >
            run design
          </button>

          <span className="text-slate-300">|</span>

          <span className="cursor-pointer hover:bg-slate-100 px-1.5 py-0.5 rounded transition flex items-center gap-1 text-[#004A99] font-semibold">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            Online Engine
          </span>
        </div>
 
        {/* Dynamic CAD Toolbar Actions Bar */}
        <div id="desktop-actions-bar" className="flex items-center justify-between px-3 py-1.5 bg-[#F9F9F9] gap-4 border-b border-[#D1D1D1]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Display:</span>
            <div className="flex items-center gap-1 bg-white p-0.5 border border-[#D1D1D1] rounded">
              {[
                { id: 'Model' as ViewMode, label: 'Model' },
                { id: 'Extruded' as ViewMode, label: '3D Extrude' },
                { id: 'Deflection' as ViewMode, label: 'Deflection' },
                { id: 'Moment' as ViewMode, label: 'Moment (M)' },
                { id: 'Shear' as ViewMode, label: 'Shear (V)' },
                { id: 'Axial' as ViewMode, label: 'Axial (P)' },
                { id: 'Design' as ViewMode, label: 'Design Checks' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  id={`viewmode-btn-${mode.id}`}
                  onClick={() => {
                    if (mode.id === 'Design') {
                      if (!isDesigned) {
                        handleRunDesignChecks();
                      } else {
                        setViewMode('Design');
                      }
                    } else if (['Deflection', 'Moment', 'Shear', 'Axial'].includes(mode.id)) {
                      if (!results.isAnalyzed) {
                        alert("Please run structural analysis first (click 'run analysis' in the top toolbar) to view internal force/deflection diagrams.");
                      } else {
                        setViewMode(mode.id);
                      }
                    } else {
                      setViewMode(mode.id);
                    }
                  }}
                  className={`px-1.5 py-0.5 text-[9px] md:text-[10px] font-bold rounded-sm cursor-pointer transition-colors ${
                    viewMode === mode.id
                      ? 'bg-[#004A99] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
 
          {/* MIDDLE COLUMN: ACTIVE INTERNATIONAL DESIGN CODES & STRUCTURE GENERATOR WIZARD */}
          <div className="flex items-center gap-2 bg-white px-2 py-1 border border-[#D1D1D1] rounded shadow-sm">
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase">Steel Code:</span>
              <select
                id="select-steel-code"
                value={steelCode}
                onChange={(e) => setSteelCode(e.target.value as SteelCode)}
                className="bg-[#F3F3F3] border border-[#D1D1D1] rounded px-1 py-0.5 text-[9px] font-bold text-[#004A99] focus:outline-none cursor-pointer"
              >
                <option value="IS 800 (India) - Recommended">★ IS 800 (India) - Recommended</option>
                <option value="IS 800 (India) - Tata Steel Section Standard">★ IS 800 (India) - Tata Steel Section Standard</option>
                <option value="IS 800 (India) - Jindal Steel Section Standard">★ IS 800 (India) - Jindal Steel Section Standard</option>
                <option value="IS 800 (India) - Limit State Design">★ IS 800 (India) - Limit State Design</option>
                <option value="IS 800 (India) - Working Stress Design">★ IS 800 (India) - Working Stress Design</option>
              </select>
            </div>
 
            <span className="text-slate-300">|</span>
 
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase">Concrete Code:</span>
              <select
                id="select-concrete-code"
                value={concreteCode}
                onChange={(e) => setConcreteCode(e.target.value as ConcreteCode)}
                className="bg-[#F3F3F3] border border-[#D1D1D1] rounded px-1 py-0.5 text-[9px] font-bold text-[#004A99] focus:outline-none cursor-pointer"
              >
                <option value="IS 456 (India) - Recommended">★ IS 456 (India) - Recommended</option>
                <option value="IS 456 (India) - Limit State Design">★ IS 456 (India) - Limit State Design</option>
                <option value="IS 456 (India) - Working Stress Design">★ IS 456 (India) - Working Stress Design</option>
              </select>
            </div>
 
            <span className="text-slate-300">|</span>
 
            <button
              id="btn-actions-wizard"
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold shadow-sm transition-all cursor-pointer uppercase tracking-wider"
            >
              🏢 Structure Wizard
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Design Report summary trigger */}
            <button
              id="header-btn-report"
              onClick={() => {
                if (!results.isAnalyzed) {
                  alert('Please run structural analysis first (click "run analysis" in the top toolbar) before generating reports.');
                  return;
                }
                if (!isDesigned) {
                  setIsDesigned(true);
                }
                setShowDesignReport(true);
              }}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-white border border-[#D1D1D1] text-slate-700 hover:bg-slate-50 cursor-pointer transition-all"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Structural Report</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. SPLIT WORKSPACE WINDOW */}
      <div id="split-workspace-container" className="flex-1 flex min-h-0 relative bg-[#F3F3F3]">
        {/* LEFT TOOLBAR */}
        <Toolbar
          activeMode={drawingMode}
          setActiveMode={setDrawingMode}
        />

        {/* CENTER VISUAL CAD STAGE & BOTTOM DATA SPLIT */}
        <div id="cad-results-split" className="flex-1 flex flex-col min-h-0 relative">
          <Canvas
            joints={joints}
            frames={frames}
            sections={sections}
            gridSettings={gridSettings}
            drawingMode={drawingMode}
            viewMode={viewMode}
            selectedJointId={selectedJointId}
            selectedFrameId={selectedFrameId}
            selectedSlabId={selectedSlabId}
            results={results}
            setSelectedJointId={setSelectedJointId}
            setSelectedFrameId={setSelectedFrameId}
            setSelectedSlabId={setSelectedSlabId}
            onAddJoint={handleAddJoint}
            onAddFrame={handleAddFrame}
            onAddSlab={handleAddSlab}
            slabs={slabs}
            onAddVerticalColumn={handleAddVerticalColumn}
            onDeleteJoint={handleDeleteJoint}
            onDeleteFrame={handleDeleteFrame}
            onDeleteSlab={handleDeleteSlab}
            onAssignSupport={handleAssignSupport}
            onAssignJointLoad={handleAssignJointLoad}
            onAssignFrameLoad={handleAssignFrameLoad}
            activeLoadCaseId={activeLoadCaseId}
            viewpoint={viewpoint}
            setViewpoint={setViewpoint}
            analysisPlane={analysisPlane}
            setAnalysisPlane={setAnalysisPlane}
          />
        </div>

        {/* RIGHT PROPERTY INSPECTOR PANEL */}
        <PropertyPanel
          joints={joints}
          frames={frames}
          results={results}
          materials={materials}
          sections={sections}
          loadCases={loadCases}
          combinations={combinations}
          gridSettings={gridSettings}
          selectedJointId={selectedJointId}
          selectedFrameId={selectedFrameId}
          selectedSlabId={selectedSlabId}
          setSelectedSlabId={setSelectedSlabId}
          slabs={slabs}
          onUpdateSlab={handleUpdateSlab}
          setGridSettings={setGridSettings}
          onUpdateJoint={handleUpdateJoint}
          onUpdateFrame={handleUpdateFrame}
          onAddSection={handleAddSection}
          onDeleteSection={handleDeleteSection}
          onAddMaterial={() => {}}
          onAddLoadCase={() => {}}
          onUpdateCombination={handleUpdateCombination}
          activeLoadCaseId={activeLoadCaseId}
          setActiveLoadCaseId={setActiveLoadCaseId}
          activeComboId={activeComboId}
          setActiveComboId={setActiveComboId}
          slabLx={slabLx}
          setSlabLx={setSlabLx}
          slabLy={slabLy}
          setSlabLy={setSlabLy}
          slabLiveLoad={slabLiveLoad}
          setSlabLiveLoad={setSlabLiveLoad}
          slabFF={slabFF}
          setSlabFF={setSlabFF}
          slabThickness={slabThickness}
          setSlabThickness={setSlabThickness}
          slabRebarDia={slabRebarDia}
          setSlabRebarDia={setSlabRebarDia}
          footingP={footingP}
          setFootingP={setFootingP}
          footingSbc={footingSbc}
          setFootingSbc={setFootingSbc}
          footingConcreteGrade={footingConcreteGrade}
          setFootingConcreteGrade={setFootingConcreteGrade}
          footingRebarDia={footingRebarDia}
          setFootingRebarDia={setFootingRebarDia}
          footingDepth={footingDepth}
          setFootingDepth={setFootingDepth}
          foundationType={foundationType}
          setFoundationType={setFoundationType}
          isolatedWidthManual={isolatedWidthManual}
          setIsolatedWidthManual={setIsolatedWidthManual}
          stripWidthManual={stripWidthManual}
          setStripWidthManual={setStripWidthManual}
          raftLengthManual={raftLengthManual}
          setRaftLengthManual={setRaftLengthManual}
          raftWidthManual={raftWidthManual}
          setRaftWidthManual={setRaftWidthManual}
          concreteRate={concreteRate}
          setConcreteRate={setConcreteRate}
          rebarRate={rebarRate}
          setRebarRate={setRebarRate}
          structuralSteelRate={structuralSteelRate}
          setStructuralSteelRate={setStructuralSteelRate}
           isDesigned={isDesigned}
          onRunDesign={handleRunDesignChecks}
          activeTab={propertyTab}
          setActiveTab={setPropertyTab}
          rcConcreteGrade={rcConcreteGrade}
          setRcConcreteGrade={setRcConcreteGrade}
          rcSteelGrade={rcSteelGrade}
          setRcSteelGrade={setRcSteelGrade}
          rcClearCoverBeam={rcClearCoverBeam}
          setRcClearCoverBeam={setRcClearCoverBeam}
          rcClearCoverColumn={rcClearCoverColumn}
          setRcClearCoverColumn={setRcClearCoverColumn}
          rcMainBarDiaBeam={rcMainBarDiaBeam}
          setRcMainBarDiaBeam={setRcMainBarDiaBeam}
          rcMainBarDiaColumn={rcMainBarDiaColumn}
          setRcMainBarDiaColumn={setRcMainBarDiaColumn}
          rcStirrupDia={rcStirrupDia}
          setRcStirrupDia={setRcStirrupDia}
          rcStirrupLegs={rcStirrupLegs}
          setRcStirrupLegs={setRcStirrupLegs}
          onAutoAssignIS875Loads={handleAutoAssignIS875Loads}
        />

        {/* 4. MODAL OVERLAY: GRAPHICAL DESIGN REPORT */}
        {showDesignReport && (() => {
          // --- DETAILED CALCULATIONS ENGINE FOR THE REPORT ---
          const beams = frames.filter(f => f.type === 'Beam');
          const columns = frames.filter(f => f.type === 'Column' || f.id.toLowerCase().includes('c'));

          // Typical slab panel estimation based on horizontal beam members
          const numSlabPanels = Math.max(1, beams.length);
          const totalSlabArea = numSlabPanels * slabLx * slabLy;
          const slabThicknessM = slabThickness / 1000;
          const slabConcreteVol = totalSlabArea * slabThicknessM;

          // Slab Design calculations (matching IS 456 Annex D & Limit State Design)
          const selfWeight = slabThicknessM * 25.0; // concrete density = 25 kN/m³
          const totalWorkingLoad = selfWeight + slabLiveLoad + slabFF;
          const totalFactoredLoad = 1.5 * totalWorkingLoad;
          const r = slabLy / slabLx;
          const isTwoWay = r < 2.0;
          const d_slab = slabThickness - 20; // 20mm cover & half bar dia approx
          
          let Mux = 0;
          let alpha_x = 0;
          if (!isTwoWay) {
            Mux = (totalFactoredLoad * slabLx * slabLx) / 8;
          } else {
            const r4 = Math.pow(r, 4);
            alpha_x = r4 / (8 * (1 + r4));
            Mux = alpha_x * totalFactoredLoad * slabLx * slabLx;
          }

          const fck = 25; // M25 concrete
          const fy = 500; // Fe 500 rebar
          const b = 1000; // 1-meter strip
          const term = 1 - (4.6 * Mux * 1e6) / (fck * b * d_slab * d_slab);
          
          let astRequired = 0;
          let slabDesignFail = false;
          if (term < 0) {
            slabDesignFail = true;
            astRequired = 0.0012 * b * slabThickness; // fallback to minimum
          } else {
            astRequired = (0.5 * fck * b * d_slab / fy) * (1 - Math.sqrt(term));
          }
          const astMin = 0.0012 * b * slabThickness; // 0.12% gross area per IS 456
          const astMain = Math.max(astRequired, astMin);
          
          const singleBarAreaMain = (Math.PI * slabRebarDia * slabRebarDia) / 4;
          const spacingMain = (singleBarAreaMain * 1000) / astMain;
          const roundedSpacingMain = Math.min(300, Math.floor(spacingMain / 25) * 25); // round down to multiple of 25mm, max 300mm

          // Slab distribution rebar (8mm @ 250mm standard or 0.12% gross area)
          const astDist = astMin;
          const singleBarAreaDist = (Math.PI * 8 * 8) / 4;
          const spacingDist = (singleBarAreaDist * 1000) / astDist;
          const roundedSpacingDist = Math.min(300, Math.floor(spacingDist / 25) * 25);

          // Slab steel weight calculation per panel
          const numMainBarsPerPanel = Math.ceil((slabLy * 1000) / roundedSpacingMain) + 1;
          const lenMainBar = slabLx + 0.3; // span + hooks
          const totalMainLenPerPanel = numMainBarsPerPanel * lenMainBar;
          const wtMainPerPanel = totalMainLenPerPanel * (slabRebarDia * slabRebarDia / 162.2);

          const numDistBarsPerPanel = Math.ceil((slabLx * 1000) / roundedSpacingDist) + 1;
          const lenDistBar = slabLy + 0.3;
          const totalDistLenPerPanel = numDistBarsPerPanel * lenDistBar;
          const wtDistPerPanel = totalDistLenPerPanel * (8 * 8 / 162.2);

          const totalSlabSteelWeight = (wtMainPerPanel + wtDistPerPanel) * numSlabPanels;

          // Foundation calculations for each support based on selected type and overrides
          const supportJoints = joints.filter(j => j.support && j.support !== 'Free');
          const numFootings = Math.max(1, supportJoints.length);
          
          const fdnReport = calculateFoundationDesign(
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

          let totalFootingConcreteVol = 0;
          let totalFootingSteelWeight = 0;
          let footingSideRounded = 1.5;
          let footingSpacing = 150;
          let A_footing_req = 1.0;

          if (fdnReport.selectedType === 'Isolated') {
            totalFootingConcreteVol = fdnReport.isolated.totalConcreteVol;
            totalFootingSteelWeight = fdnReport.isolated.totalSteelWeight;
            footingSideRounded = fdnReport.isolated.criticalDesign.sideRounded;
            footingSpacing = fdnReport.isolated.criticalDesign.spacingRounded;
            A_footing_req = fdnReport.isolated.criticalDesign.A_req;
          } else if (fdnReport.selectedType === 'Strip') {
            totalFootingConcreteVol = fdnReport.strip.totalConcreteVol;
            totalFootingSteelWeight = fdnReport.strip.totalSteelWeight;
            const cd = fdnReport.strip.designs[0] || { widthProvided: 1.2, spacingTransverse: 150, widthRequired: 1.0, length: 4.0 };
            footingSideRounded = cd.widthProvided;
            footingSpacing = cd.spacingTransverse;
            A_footing_req = cd.widthRequired * (cd.length || 4.0);
          } else if (fdnReport.selectedType === 'Raft') {
            totalFootingConcreteVol = fdnReport.raft.concreteVol;
            totalFootingSteelWeight = fdnReport.raft.steelWeight;
            footingSideRounded = Math.max(fdnReport.raft.length, fdnReport.raft.width);
            footingSpacing = fdnReport.raft.spacingDir1;
            A_footing_req = fdnReport.raft.area;
          } else {
            // Pile: estimate moderate concrete & steel for caps and piles
            totalFootingConcreteVol = numFootings * 1.5;
            totalFootingSteelWeight = numFootings * 75;
            footingSideRounded = 1.2;
            footingSpacing = 200;
            A_footing_req = 1.0;
          }

          const footingArea = footingSideRounded * footingSideRounded;
          const numBarsFootingDir = Math.ceil((footingSideRounded * 1000) / footingSpacing) + 1;
          const lenFootingBar = footingSideRounded - 0.1 + 0.3;

          // Beams and Columns volume & steel takeoff
          let concreteBeamColVol = 0;
          let beamSteelWeight = 0;
          let colSteelWeight = 0;
          let totalStructuralSteelWeight = 0;

          interface MemberRecord {
            id: string;
            type: 'Beam' | 'Column';
            sectionName: string;
            sizeLabel: string;
            length: number;
            concreteVol: number;
            rebarWeight: number;
            steelWeight: number;
            isConcrete: boolean;
          }

          const memberDetails: MemberRecord[] = [];

          for (const frame of frames) {
            const nodeI = joints.find(j => j.id === frame.nodeI);
            const nodeJ = joints.find(j => j.id === frame.nodeJ);
            if (!nodeI || !nodeJ) continue;

            const dx = nodeJ.x - nodeI.x;
            const dy = nodeJ.y - nodeI.y;
            const dz = (nodeJ.z || 0) - (nodeI.z || 0);
            const L = Math.sqrt(dx * dx + dy * dy + dz * dz);

            const sect = sections.find(s => s.id === frame.sectionId);
            if (!sect) continue;

            const mat = materials.find(m => m.id === sect.materialId);
            if (!mat) continue;

            let area = 0;
            let sizeLabel = '';
            if (sect.shape === 'Rectangular') {
              area = (sect.width || 0.23) * (sect.depth || 0.45);
              sizeLabel = `${Math.round((sect.width || 0.23) * 1000)}x${Math.round((sect.depth || 0.45) * 1000)} mm`;
            } else if (sect.shape === 'Circular') {
              const d_circle = sect.depth || 0.3;
              area = (Math.PI * d_circle * d_circle) / 4;
              sizeLabel = `Ø${Math.round(d_circle * 1000)} mm`;
            } else if (sect.shape === 'I-Shape') {
              const b = sect.width || 0.14;
              const h = sect.depth || 0.3;
              const tw = sect.webThickness || 0.0075;
              const tf = sect.flangeThickness || 0.0124;
              area = 2 * b * tf + (h - 2 * tf) * tw;
              sizeLabel = `I-Beam ${Math.round(h * 1000)}x${Math.round(b * 1000)} mm`;
            }

            const vol = area * L;
            const isConcrete = mat.type === 'Concrete';
            let memberRebar = 0;
            let memberSteel = 0;

            if (isConcrete) {
              concreteBeamColVol += vol;
              const isColumn = sect.name.toLowerCase().includes('column') || frame.id.toLowerCase().includes('c') || frame.type === 'Column';
              const ratio = isColumn ? 0.018 : 0.012; // Columns: 1.8% steel, Beams: 1.2% steel approximation
              memberRebar = vol * ratio * 7850;
              if (isColumn) {
                colSteelWeight += memberRebar;
              } else {
                beamSteelWeight += memberRebar;
              }
            } else {
              memberSteel = vol * 7850;
              totalStructuralSteelWeight += memberSteel;
            }

            memberDetails.push({
              id: frame.id,
              type: frame.type,
              sectionName: sect.name,
              sizeLabel,
              length: L,
              concreteVol: isConcrete ? vol : 0,
              rebarWeight: memberRebar,
              steelWeight: memberSteel,
              isConcrete
            });
          }

          // Complete Bar Bending Schedule (BBS) records complying with IS-2502:1963
          interface BBSRecord {
            member: string;
            shapeCode: string;
            shapeName: string;
            dia: number;
            spacingOrCount: string;
            cutLength: number;
            membersCount: number;
            barsPerMember: number;
            totalLength: number;
            unitWeight: number;
            totalWeight: number;
            is2502ShapeCode: number;
            bendingFormula: string;
            shapeSketch: string;
          }

          const bbsRows: BBSRecord[] = [];

          // 1. Slab main reinforcement (IS-2502 Shape Code 37: 180° hooked bar)
          bbsRows.push({
            member: `Typical Slab Panels (Main Steel)`,
            shapeCode: "Shape Code 37",
            shapeName: "Main Tension Flexural",
            dia: slabRebarDia,
            spacingOrCount: `${roundedSpacingMain} mm C/C`,
            cutLength: lenMainBar,
            membersCount: numSlabPanels,
            barsPerMember: numMainBarsPerPanel,
            totalLength: lenMainBar * numMainBarsPerPanel * numSlabPanels,
            unitWeight: (slabRebarDia * slabRebarDia) / 162.2,
            totalWeight: wtMainPerPanel * numSlabPanels,
            is2502ShapeCode: 37,
            bendingFormula: "L = Span - 2*Cover + 18*d",
            shapeSketch: "⊃──────────⊂"
          });

          // 2. Slab distribution reinforcement (IS-2502 Shape Code 20: Straight bar)
          bbsRows.push({
            member: `Typical Slab Panels (Distribution Steel)`,
            shapeCode: "Shape Code 20",
            shapeName: "Distribution / Temp",
            dia: 8,
            spacingOrCount: `${roundedSpacingDist} mm C/C`,
            cutLength: lenDistBar,
            membersCount: numSlabPanels,
            barsPerMember: numDistBarsPerPanel,
            totalLength: lenDistBar * numDistBarsPerPanel * numSlabPanels,
            unitWeight: (8 * 8) / 162.2,
            totalWeight: wtDistPerPanel * numSlabPanels,
            is2502ShapeCode: 20,
            bendingFormula: "L = Length - 2*Cover",
            shapeSketch: "────────────"
          });

          // 3. Footing reinforcement (IS-2502 compliance depending on selectedType)
          if (fdnReport.selectedType === 'Isolated') {
            bbsRows.push({
              member: `Isolated Footing Bottom Mesh`,
              shapeCode: "Shape Code 41",
              shapeName: "Footing Mesh (Both directions)",
              dia: footingRebarDia,
              spacingOrCount: `${footingSpacing} mm C/C`,
              cutLength: lenFootingBar,
              membersCount: numFootings,
              barsPerMember: numBarsFootingDir * 2, // 2 directions
              totalLength: lenFootingBar * (numBarsFootingDir * 2) * numFootings,
              unitWeight: (footingRebarDia * footingRebarDia) / 162.2,
              totalWeight: totalFootingSteelWeight,
              is2502ShapeCode: 41,
              bendingFormula: "L = A - 2*Cover + 2*Bent_Up",
              shapeSketch: "└───┘"
            });
          } else if (fdnReport.selectedType === 'Strip') {
            // Strip reinforcement
            fdnReport.strip.designs.forEach((sd) => {
              const numStrips = 1;
              const barDia = footingRebarDia;
              // Transverse main steel
              const spacingTransverse = sd.spacingTransverse;
              const numTransverseBars = Math.ceil((sd.length * 1000) / spacingTransverse) + 1;
              const lenTransverseBar = sd.widthProvided - 0.1 + 0.3; // width + hooks
              const transverseWeight = numTransverseBars * lenTransverseBar * (barDia * barDia / 162.2);

              bbsRows.push({
                member: `Strip Footing ${sd.id} (Transverse Main)`,
                shapeCode: "Shape Code 41",
                shapeName: "Transverse Bending Steel",
                dia: barDia,
                spacingOrCount: `${spacingTransverse} mm C/C`,
                cutLength: lenTransverseBar,
                membersCount: numStrips,
                barsPerMember: numTransverseBars,
                totalLength: lenTransverseBar * numTransverseBars * numStrips,
                unitWeight: (barDia * barDia) / 162.2,
                totalWeight: transverseWeight,
                is2502ShapeCode: 41,
                bendingFormula: "L = W - 2*Cover + 2*Bent_Up",
                shapeSketch: "└───┘"
              });

              // Longitudinal distribution steel
              const spacingLongitudinal = 200; // 200mm c/c standard
              const numLongitudinalBars = Math.ceil((sd.widthProvided * 1000) / spacingLongitudinal) + 1;
              const lenLongitudinalBar = sd.length - 0.1 + 0.3; // length + hooks
              const longitudinalWeight = numLongitudinalBars * lenLongitudinalBar * (10 * 10 / 162.2); // 10mm rebars

              bbsRows.push({
                member: `Strip Footing ${sd.id} (Longitudinal Dist.)`,
                shapeCode: "Shape Code 20",
                shapeName: "Distribution / Crack control",
                dia: 10,
                spacingOrCount: `${spacingLongitudinal} mm C/C`,
                cutLength: lenLongitudinalBar,
                membersCount: numStrips,
                barsPerMember: numLongitudinalBars,
                totalLength: lenLongitudinalBar * numLongitudinalBars * numStrips,
                unitWeight: (10 * 10) / 162.2,
                totalWeight: longitudinalWeight,
                is2502ShapeCode: 20,
                bendingFormula: "L = Length - 2*Cover + Hooks",
                shapeSketch: "────────────"
              });
            });
          } else if (fdnReport.selectedType === 'Raft') {
            // Raft reinforcement
            const rd = fdnReport.raft;
            const barDia = Math.max(12, footingRebarDia);
            
            // X-direction main bars (Top & Bottom = x2)
            const spacingX = rd.spacingDir1;
            const numBarsX = Math.ceil((rd.width * 1000) / spacingX) + 1;
            const lenBarX = rd.length - 0.1 + 0.3;
            const weightX = numBarsX * lenBarX * (barDia * barDia / 162.2) * 2; // x2 for top and bottom

            bbsRows.push({
              member: `Mat/Raft Slab (Dir X - Top & Bottom)`,
              shapeCode: "Shape Code 20",
              shapeName: "Flexural Mesh along X",
              dia: barDia,
              spacingOrCount: `${spacingX} mm C/C`,
              cutLength: lenBarX,
              membersCount: 1,
              barsPerMember: numBarsX * 2,
              totalLength: lenBarX * numBarsX * 2,
              unitWeight: (barDia * barDia) / 162.2,
              totalWeight: weightX,
              is2502ShapeCode: 20,
              bendingFormula: "L = Length - 2*Cover + Hooks",
              shapeSketch: "────────────"
            });

            // Z-direction main bars (Top & Bottom = x2)
            const spacingZ = rd.spacingDir2;
            const numBarsZ = Math.ceil((rd.length * 1000) / spacingZ) + 1;
            const lenBarZ = rd.width - 0.1 + 0.3;
            const weightZ = numBarsZ * lenBarZ * (barDia * barDia / 162.2) * 2; // x2 for top and bottom

            bbsRows.push({
              member: `Mat/Raft Slab (Dir Z - Top & Bottom)`,
              shapeCode: "Shape Code 20",
              shapeName: "Flexural Mesh along Z",
              dia: barDia,
              spacingOrCount: `${spacingZ} mm C/C`,
              cutLength: lenBarZ,
              membersCount: 1,
              barsPerMember: numBarsZ * 2,
              totalLength: lenBarZ * numBarsZ * 2,
              unitWeight: (barDia * barDia) / 162.2,
              totalWeight: weightZ,
              is2502ShapeCode: 20,
              bendingFormula: "L = Width - 2*Cover + Hooks",
              shapeSketch: "────────────"
            });
          } else {
            // Pile cap & pile reinforcement
            const capSteelWeight = numFootings * 45; // cap reinforcement approx 45kg per support
            bbsRows.push({
              member: `Pile Cap bottom reinforcement mesh`,
              shapeCode: "Shape Code 41",
              shapeName: "Pile Cap bottom mesh (Both directions)",
              dia: 16,
              spacingOrCount: `150 mm C/C`,
              cutLength: 1.4, // 1.4m cap side
              membersCount: numFootings,
              barsPerMember: 10 * 2, // 10 bars per direction, 2 directions
              totalLength: 1.4 * 20 * numFootings,
              unitWeight: (16 * 16) / 162.2,
              totalWeight: capSteelWeight,
              is2502ShapeCode: 41,
              bendingFormula: "L = Side - 2*Cover + 2*Bent_Up",
              shapeSketch: "└───┘"
            });

            const pileSteelWeight = numFootings * 1.5 * 50; // assuming 1.5 piles per support on average, 50kg each cage
            bbsRows.push({
              member: `Bored RC Friction Piles (Cages)`,
              shapeCode: "Shape Code 24",
              shapeName: "Longitudinal Cage main bars",
              dia: 16,
              spacingOrCount: `6 Nos per pile`,
              cutLength: 12.0, // 12-meter deep pile
              membersCount: numFootings,
              barsPerMember: 9, // 9 bars on average per joint (1.5 piles * 6 bars)
              totalLength: 12.0 * 9 * numFootings,
              unitWeight: (16 * 16) / 162.2,
              totalWeight: pileSteelWeight,
              is2502ShapeCode: 24,
              bendingFormula: "L = Pile depth + Cap anchorage",
              shapeSketch: "└──────────┐"
            });
          }

          // 4. Columns & Beams reinforcement detailing
          memberDetails.forEach(m => {
            if (m.isConcrete) {
              if (m.type === 'Column') {
                // Column Main longitudinal rebars (IS-2502 Shape Code 24: Straight with L-bends)
                const isLarge = m.length > 3.0 || m.rebarWeight > 15;
                const barDia = isLarge ? 16 : 12;
                const barCount = isLarge ? 6 : 4;
                const mainBarCutLength = m.length + 2 * 50 * (barDia / 1000); // height + lap length
                const totalMainBarLen = mainBarCutLength * barCount;
                const mainWeight = totalMainBarLen * (barDia * barDia / 162.2);

                bbsRows.push({
                  member: `${m.id} (${m.sizeLabel} Column Main)`,
                  shapeCode: "Shape Code 24",
                  shapeName: "Longitudinal Rebar",
                  dia: barDia,
                  spacingOrCount: `${barCount} Nos`,
                  cutLength: mainBarCutLength,
                  membersCount: 1,
                  barsPerMember: barCount,
                  totalLength: totalMainBarLen,
                  unitWeight: (barDia * barDia) / 162.2,
                  totalWeight: mainWeight,
                  is2502ShapeCode: 24,
                  bendingFormula: "L = H + Lap (50*d)",
                  shapeSketch: "└──────────┐"
                });

                // Ties/Rings (IS-2502 Shape Code 61: Rectangular link)
                const tiesSpacing = 150;
                const tiesCount = Math.ceil((m.length * 1000) / tiesSpacing) + 1;
                // Internal dimensions for 40mm clear cover: col of 230x450: a = 230-80 = 150, b = 450-80 = 370
                const a_col = 0.23 - 0.08;
                const b_col = 0.45 - 0.08;
                const tieLength = 2 * (a_col + b_col) + 24 * (8 / 1000); // 24d hook allowance for 135° hook as per IS 2502
                const totalTiesLen = tiesCount * tieLength;
                const tiesWeight = totalTiesLen * (8 * 8 / 162.2);

                bbsRows.push({
                  member: `${m.id} Column Ties`,
                  shapeCode: "Shape Code 61",
                  shapeName: "Lateral Ties / Rings",
                  dia: 8,
                  spacingOrCount: `@ ${tiesSpacing} mm C/C`,
                  cutLength: tieLength,
                  membersCount: 1,
                  barsPerMember: tiesCount,
                  totalLength: totalTiesLen,
                  unitWeight: (8 * 8) / 162.2,
                  totalWeight: tiesWeight,
                  is2502ShapeCode: 61,
                  bendingFormula: "L = 2*(a+b) + 24*d",
                  shapeSketch: "[▭]"
                });
              } else {
                // Beams Top Anchor rebars (IS-2502 Shape Code 24: Straight with L-bends)
                const topDia = 12;
                const topCount = 2;
                const beamAnchorage = 2 * 50 * (topDia / 1000); // development length at ends
                const topCutLen = m.length + beamAnchorage;
                const totalTopLen = topCutLen * topCount;
                const topWeight = totalTopLen * (topDia * topDia / 162.2);

                bbsRows.push({
                  member: `${m.id} Top Anchor`,
                  shapeCode: "Shape Code 24",
                  shapeName: "Hanger bars",
                  dia: topDia,
                  spacingOrCount: `${topCount} Nos`,
                  cutLength: topCutLen,
                  membersCount: 1,
                  barsPerMember: topCount,
                  totalLength: totalTopLen,
                  unitWeight: (topDia * topDia) / 162.2,
                  totalWeight: topWeight,
                  is2502ShapeCode: 24,
                  bendingFormula: "L = Span - 2*Cover + 2*12*d",
                  shapeSketch: "└──────────┐"
                });

                // Bottom Main rebars (IS-2502 Shape Code 37: 180° hooked bar)
                const botDia = m.rebarWeight > 12 ? 16 : 12;
                const botCount = 3;
                const botCutLen = m.length + 2 * 50 * (botDia / 1000);
                const totalBotLen = botCutLen * botCount;
                const botWeight = totalBotLen * (botDia * botDia / 162.2);

                bbsRows.push({
                  member: `${m.id} Bottom Main`,
                  shapeCode: "Shape Code 37",
                  shapeName: "Tension Reinforcement",
                  dia: botDia,
                  spacingOrCount: `${botCount} Nos`,
                  cutLength: botCutLen,
                  membersCount: 1,
                  barsPerMember: botCount,
                  totalLength: totalBotLen,
                  unitWeight: (botDia * botDia) / 162.2,
                  totalWeight: botWeight,
                  is2502ShapeCode: 37,
                  bendingFormula: "L = Span - 2*Cover + 18*d",
                  shapeSketch: "⊃──────────⊂"
                });

                // Stirrups (IS-2502 Shape Code 61: Rectangular link with clear cover 25mm: a = 230-50 = 180, b = 450-50 = 400)
                const stirrupSpacing = 150;
                const stirrupCount = Math.ceil((m.length * 1000) / stirrupSpacing) + 1;
                const a_beam = 0.23 - 0.05;
                const b_beam = 0.45 - 0.05;
                const stirrupLength = 2 * (a_beam + b_beam) + 24 * (8 / 1000); // 24d hook allowance for 135° hook as per IS 2502
                const totalStirrupsLen = stirrupCount * stirrupLength;
                const stirrupWeight = totalStirrupsLen * (8 * 8 / 162.2);

                bbsRows.push({
                  member: `${m.id} Shear Stirrups`,
                  shapeCode: "Shape Code 61",
                  shapeName: "Stirrups / Rings",
                  dia: 8,
                  spacingOrCount: `@ ${stirrupSpacing} mm C/C`,
                  cutLength: stirrupLength,
                  membersCount: 1,
                  barsPerMember: stirrupCount,
                  totalLength: totalStirrupsLen,
                  unitWeight: (8 * 8) / 162.2,
                  totalWeight: stirrupWeight,
                  is2502ShapeCode: 61,
                  bendingFormula: "L = 2*(a+b) + 24*d",
                  shapeSketch: "[▭]"
                });
              }
            }
          });

          // Overall BBS weight categorization
          const weight8mm = bbsRows.filter(r => r.dia === 8).reduce((acc, r) => acc + r.totalWeight, 0);
          const weight10mm = bbsRows.filter(r => r.dia === 10).reduce((acc, r) => acc + r.totalWeight, 0);
          const weight12mm = bbsRows.filter(r => r.dia === 12).reduce((acc, r) => acc + r.totalWeight, 0);
          const weight16mm = bbsRows.filter(r => r.dia === 16).reduce((acc, r) => acc + r.totalWeight, 0);
          const totalBbsRebarWeight = bbsRows.reduce((acc, r) => acc + r.totalWeight, 0);

          // BOQ Quantities totals (IS-1200 Part II, V & VIII classification)
          const totalConcreteVolOverall = concreteBeamColVol + slabConcreteVol + totalFootingConcreteVol;

          // Excavation & Formwork based on selected type (IS-1200 Part I & V)
          let totalExcavationVolume = 0;
          let footingFormworkArea = 0;

          if (fdnReport.selectedType === 'Isolated') {
            totalExcavationVolume = numFootings * footingArea * 1.5;
            footingFormworkArea = numFootings * 4 * footingSideRounded * (footingDepth / 1000);
          } else if (fdnReport.selectedType === 'Strip') {
            const totalStripArea = fdnReport.strip.designs.reduce((sum, sd) => sum + (sd.length * sd.widthProvided), 0);
            const totalStripPerimeter = fdnReport.strip.designs.reduce((sum, sd) => sum + (2 * (sd.length + sd.widthProvided)), 0);
            totalExcavationVolume = totalStripArea * 1.5;
            footingFormworkArea = totalStripPerimeter * (footingDepth / 1000);
          } else if (fdnReport.selectedType === 'Raft') {
            const rd = fdnReport.raft;
            totalExcavationVolume = rd.area * 1.5;
            footingFormworkArea = 2 * (rd.length + rd.width) * (footingDepth / 1000);
          } else {
            // Pile cap excavation & formwork
            totalExcavationVolume = numFootings * (1.5 * 1.5) * 1.5;
            footingFormworkArea = numFootings * 4 * 1.5 * (footingDepth / 1000);
          }

          const slabFormworkArea = totalSlabArea;
          const beamFormworkArea = memberDetails.filter(m => m.type === 'Beam' && m.isConcrete).reduce((acc, m) => acc + (2 * 0.45 * m.length), 0);
          const columnFormworkArea = memberDetails.filter(m => m.type === 'Column' && m.isConcrete).reduce((acc, m) => acc + (2 * (0.23 + 0.45) * m.length), 0);
          const totalFormworkArea = slabFormworkArea + footingFormworkArea + beamFormworkArea + columnFormworkArea;

          // Compute separate concrete volumes as per CPWD classifications (IS-1200)
          const rccFootingVol = totalFootingConcreteVol;
          const rccColumnVol = memberDetails.filter(m => m.type === 'Column' && m.isConcrete).reduce((acc, m) => acc + m.concreteVol, 0);
          const rccBeamVol = memberDetails.filter(m => m.type === 'Beam' && m.isConcrete).reduce((acc, m) => acc + m.concreteVol, 0);
          const rccSlabVol = slabConcreteVol;

          // Multipliers for CPWD standard item rates based on user inputted base concrete rate
          const rateRccFooting = concreteRate * 0.95;
          const rateRccColumn = concreteRate * 1.15;
          const rateRccBeam = concreteRate * 1.10;
          const rateRccSlab = concreteRate * 1.05;

          // Standard rates for CPWD centering & shuttering (formwork) as per IS-1200 Part V
          const rateFormworkFooting = 380; // ₹380 per m²
          const rateFormworkColumn = 480;  // ₹480 per m²
          const rateFormworkBeam = 450;    // ₹450 per m²
          const rateFormworkSlab = 420;    // ₹420 per m²

          // Cost takeoffs
          const costFootingConcrete = rccFootingVol * rateRccFooting;
          const costColumnConcrete = rccColumnVol * rateRccColumn;
          const costBeamConcrete = rccBeamVol * rateRccBeam;
          const costSlabConcrete = rccSlabVol * rateRccSlab;
          const costConcreteOverall = costFootingConcrete + costColumnConcrete + costBeamConcrete + costSlabConcrete;

          const costFormworkFooting = footingFormworkArea * rateFormworkFooting;
          const costFormworkColumn = columnFormworkArea * rateFormworkColumn;
          const costFormworkBeam = beamFormworkArea * rateFormworkBeam;
          const costFormworkSlab = slabFormworkArea * rateFormworkSlab;
          const costFormworkOverall = costFormworkFooting + costFormworkColumn + costFormworkBeam + costFormworkSlab;

          const costRebar = totalBbsRebarWeight * rebarRate;
          const costStructuralSteel = totalStructuralSteelWeight * structuralSteelRate;
          const costExcavation = totalExcavationVolume * 350; // standard CPWD earth excavation rate is ₹350/m³
          const grandTotalCostVal = costConcreteOverall + costRebar + costStructuralSteel + costFormworkOverall + costExcavation;

          const handleExportToExcel = async () => {
            // Sheet 1: Summary & Sizes
            const summaryData: any[][] = [
              ["TENSORA STRUCTURE - DESIGN DOSSIER SUMMARY"],
              ["Project Name", "Tensora Structure"],
              ["Export Date", new Date().toLocaleDateString('en-IN')],
              [],
              ["1. KEY METRICS SUMMARY"],
              ["Metric Description", "Quantity/Value", "Unit"],
              ["Column Members", columns.length, "Nos"],
              ["Beam Members", beams.length, "Nos"],
              ["Estimated Slab Panels", numSlabPanels, "Nos"],
              ["Foundation Footings (SBC Verified)", numFootings, "Nos"],
              ["Total Excavation Volume (IS 1200 Part I)", parseFloat(totalExcavationVolume.toFixed(2)), "m³"],
              ["Total Concrete Volume (IS 1200 Part II)", parseFloat(totalConcreteVolOverall.toFixed(2)), "m³"],
              ["Total Rebar Steel Weight (IS 1200 Part V)", parseFloat(totalBbsRebarWeight.toFixed(1)), "kg"],
              ["Total Structural Steel Weight (IS 1200 Part XIV)", parseFloat(totalStructuralSteelWeight.toFixed(1)), "kg"],
              ["Total Formwork / Shuttering Area (IS 1200 Part V)", parseFloat(totalFormworkArea.toFixed(1)), "m²"],
              ["Grand Total Structural Cost Estimate", parseFloat(grandTotalCostVal.toFixed(2)), "INR"],
              [],
              ["2. STRUCTURAL MEMBER SIZING TAKEOFF SCHEDULE"],
              ["Type", "Member ID", "Assigned Profile/Section", "Dimensions", "Length / Span (m)", "Concrete Volume (m³)", "Rebar Weight (kg)", "Steel Weight (kg)"]
            ];

            // Slab Row
            summaryData.push([
              "Slab",
              "SLAB_TYP",
              `Typical Floor Slab Panels (x${numSlabPanels})`,
              `${slabLx.toFixed(1)}m x ${slabLy.toFixed(1)}m (D=${slabThickness}mm)`,
              `Area: ${totalSlabArea.toFixed(1)} m²`,
              parseFloat(slabConcreteVol.toFixed(2)),
              parseFloat(((wtMainPerPanel + wtDistPerPanel) * numSlabPanels).toFixed(1)),
              0
            ]);

            // Footing Row
            summaryData.push([
              "Footing",
              "FTG_TYP",
              fdnReport.selectedType === 'Isolated' ? `Isolated Column Foundations (x${numFootings})` : 
              fdnReport.selectedType === 'Strip' ? `Continuous Strip Foundations (x${fdnReport.strip.designs.length})` :
              fdnReport.selectedType === 'Raft' ? 'Monolithic Raft/Mat Foundation' : `Bored RC Pile & Caps (x${numFootings})`,
              fdnReport.selectedType === 'Isolated' ? `${footingSideRounded.toFixed(2)}m x ${footingSideRounded.toFixed(2)}m (d=${footingDepth}mm)` : 
              fdnReport.selectedType === 'Strip' ? `Width ${footingSideRounded.toFixed(2)}m (Thickness ${footingDepth}mm)` :
              fdnReport.selectedType === 'Raft' ? `${fdnReport.raft.length.toFixed(1)}m x ${fdnReport.raft.width.toFixed(1)}m (Thickness: ${footingDepth}mm)` : `Cap Depth ${footingDepth}mm`,
              `SBC: ${footingSbc} kN/m²`,
              parseFloat(totalFootingConcreteVol.toFixed(2)),
              parseFloat(totalFootingSteelWeight.toFixed(1)),
              0
            ]);

            // Member details rows
            memberDetails.forEach(m => {
              summaryData.push([
                m.type,
                m.id,
                m.sectionName,
                m.sizeLabel,
                parseFloat(m.length.toFixed(2)),
                m.concreteVol > 0 ? parseFloat(m.concreteVol.toFixed(2)) : "-",
                m.rebarWeight > 0 ? parseFloat(m.rebarWeight.toFixed(1)) : "-",
                m.steelWeight > 0 ? parseFloat(m.steelWeight.toFixed(1)) : "-"
              ]);
            });

            // Sheet 2: Stress & Code Design
            const stressData: any[][] = [
              ["TENSORA STRUCTURE - STRESS & SAFETY CODE DESIGN CHECKS"],
              ["Applied Concrete Standard", concreteCode],
              ["Applied Steel Standard", steelCode],
              [],
              ["Member ID", "Section Profile", "Max Unity Ratio (Demand/Capacity)", "Design Status", "Analytical Check / Failure Check Formula Applied"]
            ];

            frames.forEach(f => {
              const forces = results.frameForces[f.id];
              const sect = sections.find(s => s.id === f.sectionId);
              const d = forces?.design;
              stressData.push([
                f.id,
                sect ? sect.name : "N/A",
                d ? parseFloat(d.ratio.toFixed(3)) : "N/A",
                d ? d.status.toUpperCase() : "UNSOLVED",
                d ? d.detail : "Run structural solver to inspect analytical checks."
              ]);
            });

            // Sheet 3: Slab & Footing Design
            const slabFootingData: any[][] = [
              ["TENSORA STRUCTURE - SLAB & FOUNDATION DESIGN DOSSIER"],
              [],
              ["1. SLAB REINFORCEMENT DESIGN (IS 456 Annex D)"],
              ["Design Parameter", "Calculated Value", "Unit / Reference Limit"],
              ["Slab Classification", isTwoWay ? "Two-Way Slab" : "One-Way Slab", `Aspect Ratio Ly/Lx = ${r.toFixed(2)}`],
              ["Panel Clear Dimensions", `${slabLx.toFixed(2)}m x ${slabLy.toFixed(2)}m`, `Total Slab Thickness = ${slabThickness} mm`],
              ["Slab Self Weight (Dead Load)", parseFloat(selfWeight.toFixed(2)), "kN/m² (Density = 25 kN/m³)"],
              ["Floor Finish (FF)", parseFloat(slabFF.toFixed(2)), "kN/m²"],
              ["Imposed Live Load (IS 875)", parseFloat(slabLiveLoad.toFixed(2)), "kN/m²"],
              ["Ultimate Factored Load (1.5x)", parseFloat(totalFactoredLoad.toFixed(2)), "kN/m²"],
              ["Max Bending Moment (Mux)", parseFloat(Mux.toFixed(2)), "kNm/m"],
              ["Required Tensile Steel (Ast)", parseFloat(astRequired.toFixed(1)), "mm²/m"],
              ["Minimum Code Steel (Ast,min)", parseFloat(astMin.toFixed(1)), "mm²/m (0.12% gross area per IS 456)"],
              ["Slab Main Steel Layout", `T${slabRebarDia} @ ${roundedSpacingMain}mm C/C`, "Main tension face steel spacing"],
              ["Slab Distribution Steel", `T8 @ ${roundedSpacingDist}mm C/C`, "Transverse temperature steel spacing"],
              ["L/d Deflection Safety Status", (slabLx * 1000 / d_slab <= (isTwoWay ? 24 : 20) ? "PASS" : "FAIL"), `Span/effective depth ratio L/d: ${(slabLx * 1000 / d_slab).toFixed(1)} (Limit: ${isTwoWay ? 24 : 20})`],
              [],
              ["2. FOUNDATION SCHEDULE DETAILS (IS 456:2000 & IS 6403)"],
              ["Design Parameter", "Calculated Value", "Unit / Code Reference"],
              ["Foundation Layout Type", fdnReport.selectedType, "Selected structural class"],
              ["Soil Safe Bearing Capacity (SBC)", footingSbc, "kN/m² (SBC limit pressure)"],
              ["Concrete Grade", `M${footingConcreteGrade}`, `fck = ${footingConcreteGrade} N/mm²`],
              ["Steel Grade", "Fe500", "fy = 500 N/mm²"],
              ["Two-Way Punching Shear Stress Limit", parseFloat((0.25 * Math.sqrt(footingConcreteGrade)).toFixed(3)), "MPa (IS 456 Limit)"],
              []
            ];

            // Foundation Schedule details
            if (fdnReport.selectedType === 'Isolated') {
              slabFootingData.push(["2.1 Detailed Isolated Footing Schedule"]);
              slabFootingData.push(["Footing ID", "Location (X, Z)", "Service Axial Load P (kN)", "Ultimate Load Pu (kN)", "Design Sizing (L x B)", "Depth D (mm)", "Max Soil Contact Pressure (kN/m²)", "Mesh Reinforcement", "Punching Stress (MPa)", "SBC Status"]);
              fdnReport.isolated.designs.forEach(fd => {
                slabFootingData.push([
                  fd.jointId,
                  `X=${fd.x.toFixed(1)}m, Z=${fd.z.toFixed(1)}m`,
                  parseFloat(fd.P.toFixed(1)),
                  parseFloat(fd.Pu.toFixed(1)),
                  `${fd.sideRounded.toFixed(2)}m x ${fd.sideRounded.toFixed(2)}m`,
                  footingDepth,
                  parseFloat(fd.actualPressure.toFixed(1)),
                  `T${footingRebarDia} @ ${fd.spacingRounded}mm C/C`,
                  parseFloat(fd.punchingStress.toFixed(2)),
                  fd.sbcStatus
                ]);
              });
            } else if (fdnReport.selectedType === 'Strip') {
              slabFootingData.push(["2.1 Detailed Continuous Strip Footing Schedule"]);
              slabFootingData.push(["Strip ID", "Supported Joints", "Combined Load P (kN)", "Ultimate Load Pu (kN)", "Length L (m)", "Provided Width B (m)", "Depth D (mm)", "Max Soil Pressure (kN/m²)", "Transverse Main Steel", "SBC Status"]);
              fdnReport.strip.designs.forEach(sd => {
                slabFootingData.push([
                  sd.id,
                  sd.joints.join(', '),
                  parseFloat(sd.P_total.toFixed(1)),
                  parseFloat(sd.Pu_total.toFixed(1)),
                  parseFloat(sd.length.toFixed(2)),
                  parseFloat(sd.widthProvided.toFixed(2)),
                  footingDepth,
                  parseFloat(sd.actualPressure.toFixed(1)),
                  `T${footingRebarDia} @ ${sd.spacingTransverse}mm C/C`,
                  sd.sbcStatus
                ]);
              });
            } else if (fdnReport.selectedType === 'Raft') {
              slabFootingData.push(["2.1 Monolithic Raft / Mat Foundation Specifications"]);
              slabFootingData.push(["Property Name", "Design Sizing Value", "Unit / Code Limit Check"]);
              slabFootingData.push(["Total Combined Axial Load", parseFloat(fdnReport.raft.P_total.toFixed(1)), "kN"]);
              slabFootingData.push(["Raft Length L", parseFloat(fdnReport.raft.length.toFixed(2)), "m"]);
              slabFootingData.push(["Raft Width B", parseFloat(fdnReport.raft.width.toFixed(2)), "m"]);
              slabFootingData.push(["Concrete Depth D", footingDepth, "mm"]);
              slabFootingData.push(["Average Soil Contact Pressure", parseFloat(fdnReport.raft.actualPressure.toFixed(1)), `kN/m² (SBC limit: ${footingSbc} kN/m²)`]);
              slabFootingData.push(["Soil Bearing Check Status", fdnReport.raft.sbcStatus, fdnReport.raft.sbcStatus === 'PASS' ? "SAFE" : "EXCEEDED"]);
              slabFootingData.push(["Required Mesh Steel Layout", `T${Math.max(12, footingRebarDia)} @ ${fdnReport.raft.spacingDir1}mm C/C`, "Both directions top & bottom face"]);
            } else {
              slabFootingData.push(["2.1 Bored RC Pile Foundation Schedule"]);
              slabFootingData.push(["Property / Specification", "Value", "Remarks"]);
              slabFootingData.push(["Foundation Class", "IS 2911 Friction Piles", "Deep foundation design"]);
              slabFootingData.push(["Number of Pile Caps", numFootings, "Corresponds to columns nodes count"]);
              slabFootingData.push(["Standard Pile Diameter", "450 mm", "Cast-in-situ concrete"]);
              slabFootingData.push(["Estimated Pile Depth", "12.0 m", "Bored depth"]);
              slabFootingData.push(["Design Pile Cap Size", "1.5m x 1.5m", `Depth: ${footingDepth}mm`]);
              slabFootingData.push(["Status Message", fdnReport.pile.message, "Structural recommendations"]);
            }

            // Sheet 4: BOQ
            const boqData: any[][] = [
              ["TENSORA STRUCTURE - BILL OF QUANTITIES (BOQ) AS PER CPWD DSR GUIDELINES"],
              [],
              ["Item Code", "CPWD DSR Schedule Item Description (IS-1200 Specification)", "Quantity", "Unit", "Rate (₹)", "Amount (₹)"],
              ["SUB-HEAD II: EARTH WORK (As per IS-1200 Part I)"],
              [
                "DSR 2.8.1",
                "Earthwork in excavation by mechanical/manual means in foundation trenches of width up to 1.5 m, including getting out, ramming, and disposal of surplus excavated earth up to 1.5 m depth.",
                parseFloat(totalExcavationVolume.toFixed(2)),
                "m³",
                350,
                parseFloat(costExcavation.toFixed(0))
              ],
              ["SUB-HEAD V: REINFORCED CEMENT CONCRETE (As per IS-1200 Part II & V)"],
              [
                "DSR 5.1.1",
                "Providing and laying in position machine-mixed design mix M25 grade concrete in foundations and isolated footings, excluding cost of centering, shuttering, and steel reinforcement.",
                parseFloat(rccFootingVol.toFixed(2)),
                "m³",
                parseFloat(rateRccFooting.toFixed(0)),
                parseFloat(costFootingConcrete.toFixed(0))
              ],
              [
                "DSR 5.1.2",
                "RCC M25 grade in columns, pillars, and piers, including hoisting, compacting, and finishing complete, excluding cost of reinforcement and shuttering.",
                parseFloat(rccColumnVol.toFixed(2)),
                "m³",
                parseFloat(rateRccColumn.toFixed(0)),
                parseFloat(costColumnConcrete.toFixed(0))
              ],
              [
                "DSR 5.1.3",
                "RCC M25 grade in beams, plinth beams, and girders, including hoisting, compacting, and finishing complete, excluding cost of reinforcement and shuttering.",
                parseFloat(rccBeamVol.toFixed(2)),
                "m³",
                parseFloat(rateRccBeam.toFixed(0)),
                parseFloat(costBeamConcrete.toFixed(0))
              ],
              [
                "DSR 5.1.4",
                "RCC M25 grade in suspended floors, roofs, slabs, and balconies, including hoisting, compacting, and finishing complete, excluding cost of reinforcement and shuttering.",
                parseFloat(rccSlabVol.toFixed(2)),
                "m³",
                parseFloat(rateRccSlab.toFixed(0)),
                parseFloat(costSlabConcrete.toFixed(0))
              ],
              ["SUB-HEAD V: CENTERING & SHUTTERING (FORMWORK as per IS-1200 Part V)"],
              [
                "DSR 5.9.1",
                "Centering and shuttering (formwork) using waterproof plywood including propping, strutting, and removal of forms for: Isolated footings and foundations bases.",
                parseFloat(footingFormworkArea.toFixed(1)),
                "m²",
                rateFormworkFooting,
                parseFloat(costFormworkFooting.toFixed(0))
              ],
              [
                "DSR 5.9.2",
                "Centering and shuttering (formwork) using waterproof plywood for: Columns, pillars, and piers.",
                parseFloat(columnFormworkArea.toFixed(1)),
                "m²",
                rateFormworkColumn,
                parseFloat(costFormworkColumn.toFixed(0))
              ],
              [
                "DSR 5.9.3",
                "Centering and shuttering (formwork) using waterproof plywood for: Beams, plinth beams, and girders.",
                parseFloat(beamFormworkArea.toFixed(1)),
                "m²",
                rateFormworkBeam,
                parseFloat(costFormworkBeam.toFixed(0))
              ],
              [
                "DSR 5.9.5",
                "Centering and shuttering (formwork) using waterproof plywood for: Suspended floors, roofs, and flat slabs.",
                parseFloat(slabFormworkArea.toFixed(1)),
                "m²",
                rateFormworkSlab,
                parseFloat(costFormworkSlab.toFixed(0))
              ],
              ["SUB-HEAD V: REINFORCEMENT (STEEL as per IS-1200 Part VIII)"],
              [
                "DSR 5.22.1",
                "Steel reinforcement for RCC work including straightening, cutting, bending, binding, placing and securing in position complete, using Thermo-Mechanically Treated (TMT) Fe 500D bars.",
                parseFloat(totalBbsRebarWeight.toFixed(0)),
                "kg",
                rebarRate,
                parseFloat(costRebar.toFixed(0))
              ]
            ];

            if (totalStructuralSteelWeight > 0) {
              boqData.push(["SUB-HEAD X: STEEL WORK (As per IS-1200 Part XIV)"]);
              boqData.push([
                "DSR 10.1",
                "Structural steel work in single sections, including cutting, hoisting, fixing in position, and applying a priming coat of approved steel primer complete.",
                parseFloat(totalStructuralSteelWeight.toFixed(0)),
                "kg",
                structuralSteelRate,
                parseFloat(costStructuralSteel.toFixed(0))
              ]);
            }

            boqData.push([]);
            boqData.push([
              "GRAND TOTAL",
              "GRAND TOTAL ESTIMATED STRUCTURAL INVESTMENT VALUE (INR)",
              "-",
              "-",
              "-",
              parseFloat(grandTotalCostVal.toFixed(0))
            ]);

            // Sheet 5: BBS
            const bbsData: any[][] = [
              ["TENSORA STRUCTURE - BAR BENDING SCHEDULE (BBS) AS PER IS-2502:1963"],
              [],
              ["Rebar Grade", "Fe 500D TMT Reinforcement Bars", ""],
              ["Ø8 mm Steel Total Weight", parseFloat(weight8mm.toFixed(1)), "kg"],
              ["Ø10 mm Steel Total Weight", parseFloat(weight10mm.toFixed(1)), "kg"],
              ["Ø12 mm Steel Total Weight", parseFloat(weight12mm.toFixed(1)), "kg"],
              ["Ø16 mm Steel Total Weight", parseFloat(weight16mm.toFixed(1)), "kg"],
              ["Total TMT Steel Weight", parseFloat(totalBbsRebarWeight.toFixed(1)), "kg"],
              [],
              ["Member ID / Mark", "IS-2502 Shape Code", "Bending Formula (IS-2502)", "Shape Sketch", "Ø (mm)", "Spacing / Nos", "Cut L (m)", "Qty Mem.", "Bars/Mem", "Tot L (m)", "Unit Wt (kg/m)", "Total Wt (kg)"]
            ];



            const wb = new ExcelJS.Workbook();
            const wsSummary = wb.addWorksheet("Summary & Sizes");
            const wsStress = wb.addWorksheet("Stress & Code Design");
            const wsSlabFooting = wb.addWorksheet("Slab & Footing Design");
            const wsBOQ = wb.addWorksheet("BOQ");
            const wsBBS = wb.addWorksheet("BBS");

            summaryData.forEach(row => wsSummary.addRow(row));
            stressData.forEach(row => wsStress.addRow(row));
            slabFootingData.forEach(row => wsSlabFooting.addRow(row));
            boqData.forEach(row => wsBOQ.addRow(row));

            // Write BBS headers
            for (let i = 0; i < bbsData.length; i++) {
              wsBBS.addRow(bbsData[i]);
            }

            // Write BBS Rows with images
            for (const r of bbsRows) {
              const row = wsBBS.addRow([
                r.member,
                `${r.shapeCode} (${r.shapeName})`,
                r.bendingFormula,
                "", // Image placeholder
                r.dia,
                r.spacingOrCount,
                parseFloat(r.cutLength.toFixed(2)),
                r.membersCount,
                r.barsPerMember,
                parseFloat(r.totalLength.toFixed(1)),
                parseFloat(r.unitWeight.toFixed(3)),
                parseFloat(r.totalWeight.toFixed(1))
              ]);
              
              const imgBase64 = await shapeToPngBase64(r.is2502ShapeCode);
              if (imgBase64) {
                const imageId = wb.addImage({
                  base64: imgBase64.replace(/^data:image\/\w+;base64,/, ''),
                  extension: 'png',
                });
                
                wsBBS.addImage(imageId, {
                  tl: { col: 3, row: row.number - 1 },
                  ext: { width: 100, height: 60 }
                });
                row.height = 50; // adjust row height for the image
              }
            }
            
            // Adjust column widths for BBS
            wsBBS.columns = [
              { width: 25 },
              { width: 30 },
              { width: 25 },
              { width: 15 },
              { width: 10 },
              { width: 15 },
              { width: 10 },
              { width: 10 },
              { width: 10 },
              { width: 10 },
              { width: 12 },
              { width: 12 },
            ];

            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "Tensora_Structure_Project_Dossier.xlsx";
            a.click();
            window.URL.revokeObjectURL(url);
          };

          return (
            <div id="design-report-backdrop" className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              {/* CSS Print Styles */}
              <style>{`
                @media print {
                  html, body, #app-root-container, #design-report-backdrop, #design-report-modal {
                    position: static !important;
                    height: auto !important;
                    min-height: auto !important;
                    max-height: none !important;
                    overflow: visible !important;
                    display: block !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    background: transparent !important;
                  }
                  body * {
                    visibility: hidden;
                  }
                  #print-area, #print-area * {
                    visibility: visible;
                  }
                  #print-area {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: auto !important;
                    overflow: visible !important;
                    display: block !important;
                    background: white !important;
                    color: black !important;
                  }
                  .screen-only {
                    display: none !important;
                  }
                }
              `}</style>

              <div id="design-report-modal" className="bg-white border border-[#D1D1D1] rounded-sm p-6 max-w-5xl w-full max-h-[90vh] flex flex-col gap-4 text-slate-800 shadow-2xl print:hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-[#D1D1D1] pb-3">
                  <div>
                    <h3 className="font-bold text-base text-[#004A99] flex items-center gap-1.5">
                      <FileText className="w-5 h-5 text-[#004A99]" />
                      Comprehensive Structural Project Design & DETAILED BOQ/BBS REPORT
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Fully automated code verification, reinforcement layouts, cost takeoff, and bar bending schedule.
                    </p>
                  </div>
                  <button
                    id="close-report-btn"
                    onClick={() => setShowDesignReport(false)}
                    className="text-slate-600 hover:text-slate-900 font-bold text-xs bg-[#F3F3F3] px-3 py-1.5 rounded-sm border border-[#D1D1D1] hover:bg-[#E5E5E5] cursor-pointer"
                  >
                    Close Report
                  </button>
                </div>



                {/* Sub-Tabs Selector */}
                <div className="flex border-b border-[#E5E5E5] gap-1 text-[11px] font-bold screen-only">
                  <button
                    onClick={() => setReportTab('summary')}
                    className={`px-4 py-2 flex items-center gap-1 border-b-2 transition-all ${reportTab === 'summary' ? 'border-[#004A99] text-[#004A99] bg-[#F4F8FC]' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-[#F9F9F9]'}`}
                  >
                    🏠 Summary & Sizes
                  </button>
                  <button
                    onClick={() => setReportTab('analysis')}
                    className={`px-4 py-2 flex items-center gap-1 border-b-2 transition-all ${reportTab === 'analysis' ? 'border-[#004A99] text-[#004A99] bg-[#F4F8FC]' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-[#F9F9F9]'}`}
                  >
                    📊 Stress & Code Design
                  </button>
                  <button
                    onClick={() => setReportTab('slab')}
                    className={`px-4 py-2 flex items-center gap-1 border-b-2 transition-all ${reportTab === 'slab' ? 'border-[#004A99] text-[#004A99] bg-[#F4F8FC]' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-[#F9F9F9]'}`}
                  >
                    📐 Slab & Footing Design
                  </button>
                  <button
                    onClick={() => setReportTab('boq')}
                    className={`px-4 py-2 flex items-center gap-1 border-b-2 transition-all ${reportTab === 'boq' ? 'border-[#004A99] text-[#004A99] bg-[#F4F8FC]' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-[#F9F9F9]'}`}
                  >
                    🧾 Bill of Quantities (BOQ)
                  </button>
                  <button
                    onClick={() => setReportTab('bbs')}
                    className={`px-4 py-2 flex items-center gap-1 border-b-2 transition-all ${reportTab === 'bbs' ? 'border-[#004A99] text-[#004A99] bg-[#F4F8FC]' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-[#F9F9F9]'}`}
                  >
                    ⛓️ Bar Bending Schedule (BBS)
                  </button>
                  <button
                    onClick={() => setReportTab('detailing')}
                    className={`px-4 py-2 flex items-center gap-1 border-b-2 transition-all ${reportTab === 'detailing' ? 'border-[#004A99] text-[#004A99] bg-[#F4F8FC]' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-[#F9F9F9]'}`}
                  >
                    🏗️ Structural Detailing
                  </button>
                </div>

                {/* TAB CONTENT AREA */}
                <div className="flex-1 overflow-auto pr-1 text-[11px] space-y-4">
                  {/* TAB 1: SUMMARY & MEMBER SIZES */}
                  {reportTab === 'summary' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-3">
                        <div className="bg-[#F9F9F9] p-3 rounded-sm border border-[#D1D1D1]">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Columns Count</span>
                          <div className="text-xl font-bold mt-1 text-slate-900">{columns.length}</div>
                        </div>
                        <div className="bg-[#F9F9F9] p-3 rounded-sm border border-[#D1D1D1]">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Beams Count</span>
                          <div className="text-xl font-bold mt-1 text-slate-900">{beams.length}</div>
                        </div>
                        <div className="bg-[#F9F9F9] p-3 rounded-sm border border-[#D1D1D1]">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Slab Panels (Est)</span>
                          <div className="text-xl font-bold mt-1 text-slate-900">{numSlabPanels}</div>
                        </div>
                        <div className="bg-[#F9F9F9] p-3 rounded-sm border border-[#D1D1D1]">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Footings (SBC Verified)</span>
                          <div className="text-xl font-bold mt-1 text-slate-900">{numFootings}</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-bold text-slate-800 text-xs border-b border-[#E5E5E5] pb-1">Structural Element Sizing Takeoff</h4>
                        <div className="border border-[#D1D1D1] rounded-sm overflow-hidden">
                          <table className="w-full text-left text-xs font-mono">
                            <thead className="bg-[#F0F0F0] text-slate-700 border-b border-[#D1D1D1]">
                              <tr>
                                <th className="p-2">Type</th>
                                <th className="p-2">Member ID</th>
                                <th className="p-2">Assigned Profile/Section</th>
                                <th className="p-2">Cross-Section Dimensions</th>
                                <th className="p-2 text-right">Length/Span (m)</th>
                                <th className="p-2 text-right">Concrete Volume (m³)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Slabs row */}
                              <tr className="border-b border-[#E5E5E5] hover:bg-[#F9F9F9] bg-sky-50/40">
                                <td className="p-2 font-bold text-sky-800">Slab</td>
                                <td className="p-2">SLAB_TYP</td>
                                <td className="p-2 text-slate-600">Typical Floor Slab Panels (x{numSlabPanels})</td>
                                <td className="p-2 font-bold">{slabLx.toFixed(1)}m x {slabLy.toFixed(1)}m (D={slabThickness}mm)</td>
                                <td className="p-2 text-right">Area: {totalSlabArea.toFixed(1)} m²</td>
                                <td className="p-2 text-right font-bold">{slabConcreteVol.toFixed(2)}</td>
                              </tr>
                              {/* Footing row */}
                              <tr className="border-b border-[#E5E5E5] hover:bg-[#F9F9F9] bg-amber-50/40">
                                <td className="p-2 font-bold text-amber-800">Footing</td>
                                <td className="p-2">FTG_TYP</td>
                                <td className="p-2 text-slate-600">
                                  {fdnReport.selectedType === 'Isolated' && `Isolated Column Foundations (x${numFootings})`}
                                  {fdnReport.selectedType === 'Strip' && `Continuous Strip Foundations (x${fdnReport.strip.designs.length})`}
                                  {fdnReport.selectedType === 'Raft' && 'Monolithic Raft/Mat Foundation'}
                                  {fdnReport.selectedType === 'Pile' && `Bored RC Pile & Caps (x${numFootings})`}
                                </td>
                                <td className="p-2 font-bold">
                                  {fdnReport.selectedType === 'Isolated' && `${footingSideRounded.toFixed(2)}m x ${footingSideRounded.toFixed(2)}m (d=${footingDepth}mm)`}
                                  {fdnReport.selectedType === 'Strip' && `Width ${footingSideRounded.toFixed(2)}m (Thickness ${footingDepth}mm)`}
                                  {fdnReport.selectedType === 'Raft' && `${fdnReport.raft.length.toFixed(1)}m x ${fdnReport.raft.width.toFixed(1)}m (Thickness: ${footingDepth}mm)`}
                                  {fdnReport.selectedType === 'Pile' && `Ø16 spiral, Cap Depth ${footingDepth}mm`}
                                </td>
                                <td className="p-2 text-right">
                                  SBC: {footingSbc} kN/m²
                                </td>
                                <td className="p-2 text-right font-bold">{totalFootingConcreteVol.toFixed(2)}</td>
                              </tr>
                              {/* Column / Beam rows */}
                              {memberDetails.map((m) => (
                                <tr key={m.id} className="border-b border-[#E5E5E5] hover:bg-[#F9F9F9]">
                                  <td className={`p-2 font-bold ${m.type === 'Column' ? 'text-indigo-800' : 'text-emerald-800'}`}>
                                    {m.type}
                                  </td>
                                  <td className="p-2">{m.id}</td>
                                  <td className="p-2 text-slate-600">{m.sectionName}</td>
                                  <td className="p-2 font-bold">{m.sizeLabel}</td>
                                  <td className="p-2 text-right">{m.length.toFixed(2)}</td>
                                  <td className="p-2 text-right font-bold">{m.concreteVol > 0 ? m.concreteVol.toFixed(2) : '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: STRESS & CODE DESIGN */}
                  {reportTab === 'analysis' && (
                    <div className="space-y-4">
                      <div className="bg-[#F9F9F9] p-3 rounded border border-[#D1D1D1] space-y-1">
                        <div className="font-bold text-slate-800">Analysis Safety Code Checks Overview:</div>
                        <div>Applied Codes: <strong>{concreteCode}</strong> for Concrete, <strong>{steelCode}</strong> for Steel.</div>
                        <div className="text-[10px] text-slate-500">Capacity demand ratios ($P_u/P_n + M_u/M_n$) must be less than 1.000 for limit state safety compliance.</div>
                      </div>

                      <div className="border border-[#D1D1D1] rounded-sm overflow-hidden">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-[#F0F0F0] text-slate-700 border-b border-[#D1D1D1]">
                            <tr>
                              <th className="p-2">Member ID</th>
                              <th className="p-2">Section Profile</th>
                              <th className="p-2 text-center">Max Unity Ratio</th>
                              <th className="p-2 text-center">Design Status</th>
                              <th className="p-2">Analytical Check Formula Applied</th>
                            </tr>
                          </thead>
                          <tbody>
                            {frames.map((f) => {
                              const forces = results.frameForces[f.id];
                              const sect = sections.find((s) => s.id === f.sectionId);
                              const d = forces?.design;
                              return (
                                <tr key={f.id} className="border-b border-[#E5E5E5] hover:bg-[#F9F9F9]">
                                  <td className="p-2 font-bold text-[#004A99]">{f.id}</td>
                                  <td className="p-2 text-slate-600">{sect?.name}</td>
                                  <td className="p-2 text-center font-bold text-[#004A99]">
                                    {d ? d.ratio.toFixed(3) : 'N/A'}
                                  </td>
                                  <td className="p-2 text-center">
                                    {d ? (
                                      d.status === 'Pass' ? (
                                        <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-sm text-[10px]">
                                          PASS
                                        </span>
                                      ) : (
                                        <span className="text-rose-700 font-bold bg-rose-50 border border-rose-300 px-2 py-0.5 rounded-sm text-[10px]">
                                          FAIL
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-slate-500 italic">Unsolved</span>
                                    )}
                                  </td>
                                  <td className="p-2 text-slate-600 font-sans text-[11px] leading-normal">
                                    {d ? d.detail : 'Run solver first to view analytical checks.'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: SLAB & FOOTING DESIGN */}
                  {reportTab === 'slab' && (
                    <div className="grid grid-cols-2 gap-4">
                      {/* Slab Details */}
                      <div className="border border-slate-200 rounded p-4 bg-slate-50 space-y-3">
                        <h4 className="font-bold text-sky-800 text-xs border-b border-sky-200 pb-1 flex items-center justify-between">
                          <span>CONCRETE SLAB REINFORCEMENT DESIGN</span>
                          <span className="bg-sky-100 text-sky-900 text-[9px] px-2 py-0.5 rounded-full">IS 456 Annex D</span>
                        </h4>

                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex justify-between font-bold text-slate-700">
                            <span>Slab Classification:</span>
                            <span className="text-sky-800">{isTwoWay ? 'Two-Way Slab' : 'One-Way Slab'} (Ly/Lx = {r.toFixed(2)})</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Panel Clear Dimensions:</span>
                            <span>{slabLx.toFixed(2)}m x {slabLy.toFixed(2)}m (Thickness: {slabThickness}mm)</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Applied Dead Load (Self + FF):</span>
                            <span>{(selfWeight + slabFF).toFixed(2)} kN/m²</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Applied Live Load (IS 875):</span>
                            <span>{slabLiveLoad.toFixed(2)} kN/m²</span>
                          </div>
                          <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-200">
                            <span>Ultimate Factored Load (1.5x):</span>
                            <span>{totalFactoredLoad.toFixed(2)} kN/m²</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Max Bending Moment M<sub>ux</sub>:</span>
                            <span className="font-mono">{Mux.toFixed(2)} kNm/m</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Req. Steel A<sub>st</sub>:</span>
                            <span className="font-mono">{astRequired.toFixed(1)} mm²/m</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Min. Code Steel A<sub>st,min</sub>:</span>
                            <span className="font-mono">{astMin.toFixed(1)} mm²/m</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-bold pt-1.5 border-t border-sky-300 text-sky-950">
                            <span>Slab Main Steel Layout:</span>
                            <span className="font-mono font-bold bg-sky-100 px-2 py-0.5 rounded">
                              T{slabRebarDia} @ {roundedSpacingMain}mm C/C
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                            <span>Slab Distribution Steel:</span>
                            <span className="font-mono bg-slate-200/80 px-2 py-0.5 rounded">
                              T8 @ {roundedSpacingDist}mm C/C
                            </span>
                          </div>
                          <div className="flex justify-between pt-1 text-[10px]">
                            <span>L/d Deflection Check:</span>
                            <span className={slabLx * 1000 / d_slab <= (isTwoWay ? 24 : 20) ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                              {slabLx * 1000 / d_slab <= (isTwoWay ? 24 : 20) ? 'PASS' : 'FAIL (Increase Depth)'} (L/d = {(slabLx * 1000 / d_slab).toFixed(1)})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Footing details */}
                      <div className="border border-slate-200 rounded p-4 bg-slate-50 space-y-3 col-span-2">
                        <h4 className="font-bold text-amber-800 text-sm border-b border-amber-200 pb-1.5 flex items-center justify-between">
                          <span>INDIVIDUAL FOUNDATION DESIGN SCHEDULE (FOR EVERY BASE SUPPORT)</span>
                          <span className="bg-amber-100 text-amber-900 text-[9px] px-2.5 py-0.5 rounded-full font-semibold">Limit State Design - IS 456:2000 & IS 6403</span>
                        </h4>

                        <div className="p-3 bg-amber-50 rounded border border-amber-200 text-xs text-slate-700 leading-normal mb-3">
                          <p className="font-semibold text-amber-900 mb-1">Design Criteria & Code Compliance:</p>
                          <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px]">
                            <li>Net allowable Safe Bearing Capacity (SBC) of soil: <strong>{footingSbc} kN/m²</strong></li>
                            <li>Concrete grade: <strong>M{footingConcreteGrade}</strong> (f<sub>ck</sub> = {footingConcreteGrade} N/mm²), Steel grade: <strong>Fe500</strong> (f<sub>y</sub> = 500 N/mm²)</li>
                            <li>Area of Footing required = <code className="font-mono text-[10px] bg-amber-100 px-1 py-0.2 rounded">1.10 × P_axial / SBC</code> (including 10% self-weight surcharge)</li>
                            <li>Two-way punching shear stress limit = <code className="font-mono text-[10px] bg-amber-100 px-1 py-0.2 rounded">0.25 × √fck</code> = <strong>{(0.25 * Math.sqrt(footingConcreteGrade)).toFixed(3)} MPa</strong></li>
                          </ul>
                        </div>

                        <div className="overflow-x-auto">
                          {fdnReport.selectedType === 'Isolated' && (
                            <table className="w-full text-left text-[11px] border-collapse bg-white rounded border border-slate-200 font-mono">
                              <thead>
                                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold font-sans">
                                  <th className="p-2 border-r border-slate-200">Footing ID</th>
                                  <th className="p-2 border-r border-slate-200">Location (X, Z)</th>
                                  <th className="p-2 border-r border-slate-200 text-right">Service Load (P)</th>
                                  <th className="p-2 border-r border-slate-200 text-right">Ult. Load (Pu)</th>
                                  <th className="p-2 border-r border-slate-200 text-center">Design Footprint</th>
                                  <th className="p-2 border-r border-slate-200 text-right">Soil Pres.</th>
                                  <th className="p-2 border-r border-slate-200 text-center">Mesh Rebar Detail</th>
                                  <th className="p-2 border-r border-slate-200 text-center">Punching Stress</th>
                                  <th className="p-2 text-center font-bold">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {fdnReport.isolated.designs.map((fd) => (
                                  <tr key={fd.jointId} className="border-b border-slate-200 hover:bg-slate-50">
                                    <td className="p-2 border-r border-slate-200 font-bold text-amber-900 font-sans">{fd.jointId}</td>
                                    <td className="p-2 border-r border-slate-200 font-mono text-slate-500 text-[10px]">X={fd.x.toFixed(1)}m, Z={fd.z.toFixed(1)}m</td>
                                    <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-slate-700">{fd.P.toFixed(1)} kN</td>
                                    <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-500">{fd.Pu.toFixed(1)} kN</td>
                                    <td className="p-2 border-r border-slate-200 text-center font-mono text-amber-950 font-semibold bg-amber-50/55">
                                      {fd.sideRounded.toFixed(2)}m x {fd.sideRounded.toFixed(2)}m
                                      <span className="text-[9px] text-slate-400 block mt-0.5">D={footingDepth}mm (d={footingDepth - 56}mm)</span>
                                    </td>
                                    <td className="p-2 border-r border-slate-200 text-right font-mono">
                                      <span className={fd.sbcStatus === 'PASS' ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-bold'}>
                                        {fd.actualPressure.toFixed(1)} kN/m²
                                      </span>
                                      <span className="text-[9px] text-slate-400 block font-sans">Ratio: {(fd.actualPressure / footingSbc).toFixed(2)}</span>
                                    </td>
                                    <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-slate-700 bg-amber-50/10">
                                      T{footingRebarDia} @ {fd.spacingRounded}mm C/C
                                      <span className="text-[9px] text-slate-400 font-normal block mt-0.5 font-sans">Both Ways (Bottom Mesh)</span>
                                    </td>
                                    <td className="p-2 border-r border-slate-200 text-center font-mono">
                                      <span className={fd.punchingStress <= (0.25 * Math.sqrt(footingConcreteGrade)) ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-bold'}>
                                        {fd.punchingStress.toFixed(2)} MPa
                                      </span>
                                      <span className="text-[9px] text-slate-400 block font-sans">Limit: {(0.25 * Math.sqrt(footingConcreteGrade)).toFixed(2)} MPa</span>
                                    </td>
                                    <td className="p-2 text-center font-bold font-sans">
                                      {fd.sbcStatus === 'PASS' && fd.punchingStress <= (0.25 * Math.sqrt(footingConcreteGrade)) ? (
                                        <span className="text-emerald-700 font-semibold bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded text-[9px] block">
                                          PASS
                                        </span>
                                      ) : (
                                        <span className="text-rose-700 font-semibold bg-rose-50 border border-rose-300 px-2 py-0.5 rounded text-[9px] block">
                                          FAIL
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}

                          {fdnReport.selectedType === 'Strip' && (
                            <table className="w-full text-left text-[11px] border-collapse bg-white rounded border border-slate-200 font-mono">
                              <thead>
                                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold font-sans">
                                  <th className="p-2 border-r border-slate-200">Strip Mark</th>
                                  <th className="p-2 border-r border-slate-200">Supported Nodes</th>
                                  <th className="p-2 border-r border-slate-200 text-right">Combined Load (P)</th>
                                  <th className="p-2 border-r border-slate-200 text-right">Combined Ult. (Pu)</th>
                                  <th className="p-2 border-r border-slate-200 text-center">Plan Dimensions</th>
                                  <th className="p-2 border-r border-slate-200 text-right">Soil Pressure</th>
                                  <th className="p-2 border-r border-slate-200 text-center">Transverse Main Steel</th>
                                  <th className="p-2 border-r border-slate-200 text-center">Punching Shear</th>
                                  <th className="p-2 text-center font-bold">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {fdnReport.strip.designs.map((sd) => (
                                  <tr key={sd.id} className="border-b border-slate-200 hover:bg-slate-50">
                                    <td className="p-2 border-r border-slate-200 font-bold text-amber-900 font-sans">{sd.id}</td>
                                    <td className="p-2 border-r border-slate-200 text-slate-600 text-[10px] truncate max-w-[150px]" title={sd.joints.join(', ')}>
                                      {sd.joints.join(', ')}
                                    </td>
                                    <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-slate-700">{sd.P_total.toFixed(1)} kN</td>
                                    <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-500">{sd.Pu_total.toFixed(1)} kN</td>
                                    <td className="p-2 border-r border-slate-200 text-center font-mono text-amber-950 font-semibold bg-amber-50/55">
                                      {sd.length.toFixed(2)}m × {sd.widthProvided.toFixed(2)}m
                                      <span className="text-[9px] text-slate-400 block mt-0.5">D={footingDepth}mm</span>
                                    </td>
                                    <td className="p-2 border-r border-slate-200 text-right font-mono">
                                      <span className={sd.sbcStatus === 'PASS' ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-bold'}>
                                        {sd.actualPressure.toFixed(1)} kN/m²
                                      </span>
                                      <span className="text-[9px] text-slate-400 block font-sans">Ratio: {(sd.actualPressure / footingSbc).toFixed(2)}</span>
                                    </td>
                                    <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-slate-700 bg-amber-50/10">
                                      T{footingRebarDia} @ {sd.spacingTransverse}mm C/C
                                    </td>
                                    <td className="p-2 border-r border-slate-200 text-center font-mono">
                                      <span className={sd.punchingStress <= (0.25 * Math.sqrt(footingConcreteGrade)) ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-bold'}>
                                        {sd.punchingStress.toFixed(2)} MPa
                                      </span>
                                    </td>
                                    <td className="p-2 text-center font-bold font-sans">
                                      <span className={`px-2 py-0.5 rounded text-[9px] block font-semibold ${sd.sbcStatus === 'PASS' && sd.punchingStress <= (0.25 * Math.sqrt(footingConcreteGrade)) ? 'text-emerald-700 bg-emerald-50 border border-emerald-300' : 'text-rose-700 bg-rose-50 border border-rose-300'}`}>
                                        {sd.sbcStatus === 'PASS' && sd.punchingStress <= (0.25 * Math.sqrt(footingConcreteGrade)) ? 'PASS' : 'FAIL'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}

                          {fdnReport.selectedType === 'Raft' && (
                            <div className="bg-white p-4 rounded border border-slate-200 space-y-3 font-sans">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5 border-r border-slate-100 pr-4">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Plan & Loading Properties</p>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">Total Structural Vertical Load (P):</span>
                                    <span className="font-mono font-bold text-slate-800">{fdnReport.raft.P_total.toFixed(1)} kN</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">Total Factored Load (Pu):</span>
                                    <span className="font-mono text-slate-600">{fdnReport.raft.Pu_total.toFixed(1)} kN</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">Raft Footprint (Length × Width):</span>
                                    <span className="font-mono font-bold text-amber-900">{fdnReport.raft.length.toFixed(2)}m × {fdnReport.raft.width.toFixed(2)}m</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">Total Base Contact Area:</span>
                                    <span className="font-mono text-slate-800">{fdnReport.raft.area.toFixed(1)} m²</span>
                                  </div>
                                </div>

                                <div className="space-y-1.5 pl-4">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Geotechnical & Structural Verification</p>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">Average Soil Contact Pressure:</span>
                                    <span className={`font-mono font-bold ${fdnReport.raft.sbcStatus === 'PASS' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                      {fdnReport.raft.actualPressure.toFixed(1)} kN/m²
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">Soil Capacity Status (SBC={footingSbc}):</span>
                                    <span className={`font-bold px-1.5 py-0.2 text-[10px] rounded ${fdnReport.raft.sbcStatus === 'PASS' ? 'bg-emerald-50 border border-emerald-300 text-emerald-800' : 'bg-rose-50 border border-rose-300 text-rose-800'}`}>
                                      {fdnReport.raft.sbcStatus}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">Mesh Reinforcement (Dir X / Dir Z):</span>
                                    <span className="font-mono font-bold text-[#004A99]">T{Math.max(12, footingRebarDia)} @ {fdnReport.raft.spacingDir1}mm C/C</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">Raft Concrete Depth (Thickness):</span>
                                    <span className="font-mono text-slate-800">{footingDepth} mm</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {fdnReport.selectedType === 'Pile' && (
                            <div className="bg-white p-4 rounded border border-slate-200 font-sans space-y-3">
                              <div className="text-xs font-semibold text-rose-900 border-b border-rose-100 pb-1 flex items-center gap-1.5">
                                <span>🏗️ Bored RC Cast-In-Situ Friction Piles Schedule</span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                                {fdnReport.pile.message}
                              </p>
                              <div className="grid grid-cols-3 gap-3 pt-1">
                                <div className="bg-rose-50/40 p-2 rounded border border-rose-100">
                                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Total Pile Caps</span>
                                  <span className="text-xs font-bold text-slate-800">{numFootings} Nos</span>
                                </div>
                                <div className="bg-rose-50/40 p-2 rounded border border-rose-100">
                                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Pile Diameter (Assumed)</span>
                                  <span className="text-xs font-bold text-slate-800">450 mm</span>
                                </div>
                                <div className="bg-rose-50/40 p-2 rounded border border-rose-100">
                                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Design Length per Pile</span>
                                  <span className="text-xs font-bold text-slate-800">12.0 m</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: BILL OF QUANTITIES (BOQ) */}
                  {reportTab === 'boq' && (
                    <div className="space-y-4">
                      {/* Price settings */}
                      <div className="bg-blue-50/50 p-3 rounded border border-blue-200 grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 block">M25 Concrete Rate (₹/m³)</label>
                          <input
                            type="number"
                            value={concreteRate}
                            onChange={(e) => setConcreteRate(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 block">Rebar Steel Rate (₹/kg)</label>
                          <input
                            type="number"
                            value={rebarRate}
                            onChange={(e) => setRebarRate(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 block">Structural Steel Rate (₹/kg)</label>
                          <input
                            type="number"
                            value={structuralSteelRate}
                            onChange={(e) => setStructuralSteelRate(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full bg-white border border-[#C5C5C5] rounded-sm p-1 text-[11px] font-mono"
                          />
                        </div>
                      </div>

                      {/* Detailed BOQ schedule complying with IS-1200 & CPWD Specifications */}
                      <div className="border border-[#D1D1D1] rounded-sm overflow-hidden">
                        <table className="w-full text-left text-[11px] font-mono">
                          <thead className="bg-[#F0F0F0] text-slate-700 border-b border-[#D1D1D1]">
                            <tr>
                              <th className="p-2">Item Code</th>
                              <th className="p-2">CPWD DSR Schedule Item Description (IS-1200)</th>
                              <th className="p-2 text-right">Quantity</th>
                              <th className="p-2 text-center">Unit</th>
                              <th className="p-2 text-right">Rate (₹)</th>
                              <th className="p-2 text-right">Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* CPWD Earthwork Head */}
                            <tr className="bg-slate-50 border-b border-slate-300 font-bold text-slate-800">
                              <td className="p-2" colSpan={6}>SUB-HEAD II: EARTH WORK (As per IS-1200 Part I)</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="p-2 font-bold text-[#004A99]">DSR 2.8.1</td>
                              <td className="p-2 font-sans text-slate-700">
                                Earthwork in excavation by mechanical/manual means in foundation trenches of width up to 1.5 m, including getting out, ramming, and disposal of surplus excavated earth up to 1.5 m depth.
                              </td>
                              <td className="p-2 text-right">{totalExcavationVolume.toFixed(2)}</td>
                              <td className="p-2 text-center">m³</td>
                              <td className="p-2 text-right">350</td>
                              <td className="p-2 text-right font-bold">{costExcavation.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                            </tr>

                            {/* CPWD RCC Head */}
                            <tr className="bg-slate-50 border-b border-slate-300 font-bold text-slate-800">
                              <td className="p-2" colSpan={6}>SUB-HEAD V: REINFORCED CEMENT CONCRETE (As per IS-1200 Part II & V)</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="p-2 font-bold text-[#004A99]">DSR 5.1.1</td>
                              <td className="p-2 font-sans text-slate-700">
                                Providing and laying in position machine-mixed design mix M25 grade concrete in foundations and isolated footings, excluding cost of centering, shuttering, and steel reinforcement.
                              </td>
                              <td className="p-2 text-right">{rccFootingVol.toFixed(2)}</td>
                              <td className="p-2 text-center">m³</td>
                              <td className="p-2 text-right">{rateRccFooting.toFixed(0)}</td>
                              <td className="p-2 text-right font-bold">{costFootingConcrete.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="p-2 font-bold text-[#004A99]">DSR 5.1.2</td>
                              <td className="p-2 font-sans text-slate-700">
                                RCC M25 grade in columns, pillars, and piers, including hoisting, compacting, and finishing complete, excluding cost of reinforcement and shuttering.
                              </td>
                              <td className="p-2 text-right">{rccColumnVol.toFixed(2)}</td>
                              <td className="p-2 text-center">m³</td>
                              <td className="p-2 text-right">{rateRccColumn.toFixed(0)}</td>
                              <td className="p-2 text-right font-bold">{costColumnConcrete.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="p-2 font-bold text-[#004A99]">DSR 5.1.3</td>
                              <td className="p-2 font-sans text-slate-700">
                                RCC M25 grade in beams, plinth beams, and girders, including hoisting, compacting, and finishing complete, excluding cost of reinforcement and shuttering.
                              </td>
                              <td className="p-2 text-right">{rccBeamVol.toFixed(2)}</td>
                              <td className="p-2 text-center">m³</td>
                              <td className="p-2 text-right">{rateRccBeam.toFixed(0)}</td>
                              <td className="p-2 text-right font-bold">{costBeamConcrete.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="p-2 font-bold text-[#004A99]">DSR 5.1.4</td>
                              <td className="p-2 font-sans text-slate-700">
                                RCC M25 grade in suspended floors, roofs, slabs, and balconies, including hoisting, compacting, and finishing complete, excluding cost of reinforcement and shuttering.
                              </td>
                              <td className="p-2 text-right">{rccSlabVol.toFixed(2)}</td>
                              <td className="p-2 text-center">m³</td>
                              <td className="p-2 text-right">{rateRccSlab.toFixed(0)}</td>
                              <td className="p-2 text-right font-bold">{costSlabConcrete.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                            </tr>

                            {/* CPWD Formwork Head */}
                            <tr className="border-b border-slate-200">
                              <td className="p-2 font-bold text-[#004A99]">DSR 5.9.1</td>
                              <td className="p-2 font-sans text-slate-700">
                                Centering and shuttering (formwork) using waterproof plywood including propping, strutting, and removal of forms for: Isolated footings and foundations bases.
                              </td>
                              <td className="p-2 text-right">{footingFormworkArea.toFixed(1)}</td>
                              <td className="p-2 text-center">m²</td>
                              <td className="p-2 text-right">{rateFormworkFooting}</td>
                              <td className="p-2 text-right font-bold">{costFormworkFooting.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="p-2 font-bold text-[#004A99]">DSR 5.9.2</td>
                              <td className="p-2 font-sans text-slate-700">
                                Centering and shuttering (formwork) using waterproof plywood for: Columns, pillars, and piers.
                              </td>
                              <td className="p-2 text-right">{columnFormworkArea.toFixed(1)}</td>
                              <td className="p-2 text-center">m²</td>
                              <td className="p-2 text-right">{rateFormworkColumn}</td>
                              <td className="p-2 text-right font-bold">{costFormworkColumn.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="p-2 font-bold text-[#004A99]">DSR 5.9.3</td>
                              <td className="p-2 font-sans text-slate-700">
                                Centering and shuttering (formwork) using waterproof plywood for: Beams, plinth beams, and girders.
                              </td>
                              <td className="p-2 text-right">{beamFormworkArea.toFixed(1)}</td>
                              <td className="p-2 text-center">m²</td>
                              <td className="p-2 text-right">{rateFormworkBeam}</td>
                              <td className="p-2 text-right font-bold">{costFormworkBeam.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="p-2 font-bold text-[#004A99]">DSR 5.9.5</td>
                              <td className="p-2 font-sans text-slate-700">
                                Centering and shuttering (formwork) using waterproof plywood for: Suspended floors, roofs, and flat slabs.
                              </td>
                              <td className="p-2 text-right">{slabFormworkArea.toFixed(1)}</td>
                              <td className="p-2 text-center">m²</td>
                              <td className="p-2 text-right">{rateFormworkSlab}</td>
                              <td className="p-2 text-right font-bold">{costFormworkSlab.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                            </tr>

                            {/* Reinforcement Head */}
                            <tr className="border-b border-slate-200">
                              <td className="p-2 font-bold text-[#004A99]">DSR 5.22.1</td>
                              <td className="p-2 font-sans text-slate-700">
                                Steel reinforcement for RCC work including straightening, cutting, bending, binding, placing and securing in position complete, using Thermo-Mechanically Treated (TMT) Fe 500D bars.
                              </td>
                              <td className="p-2 text-right">{totalBbsRebarWeight.toFixed(0)}</td>
                              <td className="p-2 text-center">kg</td>
                              <td className="p-2 text-right">{rebarRate}</td>
                              <td className="p-2 text-right font-bold">{costRebar.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                            </tr>

                            {/* CPWD Structural Steel Head */}
                            {totalStructuralSteelWeight > 0 && (
                              <>
                                <tr className="bg-slate-50 border-b border-slate-300 font-bold text-slate-800">
                                  <td className="p-2" colSpan={6}>SUB-HEAD X: STEEL WORK (As per IS-1200 Part XIV)</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                  <td className="p-2 font-bold text-[#004A99]">DSR 10.1</td>
                                  <td className="p-2 font-sans text-slate-700">
                                    Structural steel work in single sections, including cutting, hoisting, fixing in position, and applying a priming coat of approved steel primer complete.
                                  </td>
                                  <td className="p-2 text-right">{totalStructuralSteelWeight.toFixed(0)}</td>
                                  <td className="p-2 text-center">kg</td>
                                  <td className="p-2 text-right">{structuralSteelRate}</td>
                                  <td className="p-2 text-right font-bold">{costStructuralSteel.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                                </tr>
                              </>
                            )}

                            {/* Summary row */}
                            <tr className="bg-slate-100 border-t-2 border-slate-400 font-bold text-xs text-slate-900">
                              <td className="p-3 font-sans" colSpan={2}>GRAND TOTAL STRUCTURAL ESTIMATE AS PER IS-1200 (INR)</td>
                              <td className="p-3 text-right" colSpan={4}>
                                <span className="text-[#004A99] text-sm">
                                  ₹ {grandTotalCostVal.toLocaleString('en-IN', {maximumFractionDigits: 0})} /-
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: BAR BENDING SCHEDULE (BBS) */}
                  {reportTab === 'bbs' && (
                    <div className="space-y-4">
                      {/* BBS Quick Summary Category */}
                      <div className="bg-[#F9F9F9] p-3 rounded border border-[#D1D1D1] grid grid-cols-5 gap-3 text-center">
                        <div className="border-r border-slate-200">
                          <span className="text-[9px] uppercase font-bold text-slate-500">Ø8 mm Steel</span>
                          <div className="text-sm font-bold text-slate-900">{weight8mm.toFixed(0)} kg</div>
                        </div>
                        <div className="border-r border-slate-200">
                          <span className="text-[9px] uppercase font-bold text-slate-500">Ø10 mm Steel</span>
                          <div className="text-sm font-bold text-slate-900">{weight10mm.toFixed(0)} kg</div>
                        </div>
                        <div className="border-r border-slate-200">
                          <span className="text-[9px] uppercase font-bold text-slate-500">Ø12 mm Steel</span>
                          <div className="text-sm font-bold text-slate-900">{weight12mm.toFixed(0)} kg</div>
                        </div>
                        <div className="border-r border-slate-200">
                          <span className="text-[9px] uppercase font-bold text-slate-500">Ø16 mm Steel</span>
                          <div className="text-sm font-bold text-slate-900">{weight16mm.toFixed(0)} kg</div>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-blue-700">Total Steel TMT</span>
                          <div className="text-sm font-bold text-blue-900">{totalBbsRebarWeight.toFixed(0)} kg</div>
                        </div>
                      </div>

                      {/* BBS Schedule table */}
                      <div className="border border-[#D1D1D1] rounded-sm overflow-hidden">
                        <table className="w-full text-left text-[10px] font-mono">
                          <thead className="bg-[#F0F0F0] text-slate-700 border-b border-[#D1D1D1]">
                            <tr className="bg-slate-200 text-slate-800 font-bold">
                              <th className="p-2 text-left">Member ID / Mark</th>
                              <th className="p-2 text-left">IS-2502 Shape Code</th>
                              <th className="p-2 text-left">Bending Formula (IS-2502)</th>
                              <th className="p-2 text-center">Shape Sketch</th>
                              <th className="p-2 text-center">Ø (mm)</th>
                              <th className="p-2 text-left">Spacing / Nos</th>
                              <th className="p-2 text-right">Cut L (m)</th>
                              <th className="p-2 text-center">Qty Mem.</th>
                              <th className="p-2 text-center">Bars/Mem</th>
                              <th className="p-2 text-right">Tot L (m)</th>
                              <th className="p-2 text-right">Unit Wt (kg/m)</th>
                              <th className="p-2 text-right text-blue-950 font-bold">Total Wt (kg)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bbsRows.map((r, idx) => (
                              <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                                <td className="p-2 font-bold text-slate-900 font-sans">{r.member}</td>
                                <td className="p-2 text-amber-900 font-bold">{r.shapeCode} <span className="text-[9px] text-slate-500 block font-normal font-sans">{r.shapeName}</span></td>
                                <td className="p-2 text-slate-600 font-mono text-[9px]">{r.bendingFormula}</td>
                                <td className="p-2 text-center bg-slate-50/50"><div className="w-16 h-8 mx-auto flex items-center justify-center"><BbsShapeSketch shapeCode={r.is2502ShapeCode} /></div></td>
                                <td className="p-2 text-center font-bold text-slate-800">{r.dia}</td>
                                <td className="p-2 text-slate-600 font-sans">{r.spacingOrCount}</td>
                                <td className="p-2 text-right font-bold text-slate-900">{r.cutLength.toFixed(2)}</td>
                                <td className="p-2 text-center">{r.membersCount}</td>
                                <td className="p-2 text-center">{r.barsPerMember}</td>
                                <td className="p-2 text-right font-bold">{r.totalLength.toFixed(1)}</td>
                                <td className="p-2 text-right text-slate-500">{(r.unitWeight).toFixed(3)}</td>
                                <td className="p-2 text-right font-bold text-blue-900 bg-blue-50/20">{r.totalWeight.toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer and print actions */}
                <div className="flex justify-between items-center pt-3 border-t border-[#D1D1D1]">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                    <Sparkles className="w-4 h-4 text-[#004A99]" />
                    <span>Generated natively in conformity with IS 456 & IS 1893 guidelines.</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExportToExcel}
                      className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-sm text-xs cursor-pointer flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Export to Excel (.xlsx)
                    </button>

                    <button
                      onClick={() => setShowDesignReport(false)}
                      className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 font-bold rounded-sm text-xs cursor-pointer text-slate-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>

              {/* HIDDEN PRINT-ONLY LAYOUT REMOVED - EXCEL EXPORT PREFERRED */}
              {false && (
              <div id="print-area" className="hidden">
                {/* Print Title Block */}
                <div className="border-b-4 border-[#004A99] pb-4">
                  <h1 className="text-2xl font-bold text-[#004A99] uppercase tracking-wide">Enterprise Structural Analysis & Engineering Design Report</h1>
                  <p className="text-slate-600 text-xs mt-1">Natively generated under Indian Standard Guidelines (IS 456:2000, IS 800:2007, IS 1893:2016)</p>
                  <p className="text-slate-500 text-[9px] font-mono mt-0.5">Date of Issuance: {new Date().toLocaleDateString('en-IN')} | System ID: '9420c866-1535-446e-948f-5c9e6f137bd6'</p>
                </div>

                {/* Executive summary print section */}
                <div className="space-y-2">
                  <h2 className="text-sm font-bold text-[#004A99] border-b border-slate-300 pb-1 uppercase">1. Executive Model & Section Sizing Summary</h2>
                  <div className="grid grid-cols-4 gap-4 bg-slate-50 p-3 rounded border border-slate-200">
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Total Joints</span>
                      <span className="text-lg font-bold">{joints.length} Nodes</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Columns Count</span>
                      <span className="text-lg font-bold">{columns.length} Members</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Beams Count</span>
                      <span className="text-lg font-bold">{beams.length} Members</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Typical Slabs</span>
                      <span className="text-lg font-bold">{numSlabPanels} Panels ({totalSlabArea.toFixed(1)} m²)</span>
                    </div>
                  </div>

                  <table className="w-full text-left text-[10px] border border-slate-300 font-mono mt-2">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300">
                        <th className="p-1.5">Type</th>
                        <th className="p-1.5">ID</th>
                        <th className="p-1.5">Description</th>
                        <th className="p-1.5">Dimensions</th>
                        <th className="p-1.5 text-right">Span (m)</th>
                        <th className="p-1.5 text-right">Vol (m³)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="p-1.5 font-bold">Slab</td>
                        <td className="p-1.5">SLAB_TYP</td>
                        <td className="p-1.5">Floor Slab Panels</td>
                        <td className="p-1.5">{slabLx}x{slabLy} mm (Thickness: {slabThickness}mm)</td>
                        <td className="p-1.5 text-right">{totalSlabArea.toFixed(1)} m²</td>
                        <td className="p-1.5 text-right">{slabConcreteVol.toFixed(2)}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-1.5 font-bold">Footing</td>
                        <td className="p-1.5">FTG_TYP</td>
                        <td className="p-1.5">Isolated Foundations</td>
                        <td className="p-1.5">{footingSideRounded.toFixed(1)}x{footingSideRounded.toFixed(1)}m (D={footingDepth}mm)</td>
                        <td className="p-1.5 text-right">SBC: {footingSbc}</td>
                        <td className="p-1.5 text-right">{totalFootingConcreteVol.toFixed(2)}</td>
                      </tr>
                      {memberDetails.map(m => (
                        <tr key={m.id} className="border-b border-slate-200">
                          <td className="p-1.5">{m.type}</td>
                          <td className="p-1.5 font-bold">{m.id}</td>
                          <td className="p-1.5">{m.sectionName}</td>
                          <td className="p-1.5">{m.sizeLabel}</td>
                          <td className="p-1.5 text-right">{m.length.toFixed(2)}</td>
                          <td className="p-1.5 text-right">{m.concreteVol > 0 ? m.concreteVol.toFixed(2) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ pageBreakBefore: 'always' }} />

                {/* Analysis & stress print section */}
                <div className="space-y-2">
                  <h2 className="text-sm font-bold text-[#004A99] border-b border-slate-300 pb-1 uppercase">2. 3D Frame Stiffness Solver Results & Structural Capacity</h2>
                  <p className="text-slate-600 text-xs">Verification under combined active Load Combinations (ULS limit states). Ultimate stresses verified in compliance with {concreteCode} / {steelCode}.</p>
                  <table className="w-full text-left text-[10px] border border-slate-300 font-mono">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300">
                        <th className="p-1.5">Member</th>
                        <th className="p-1.5">Section Profile</th>
                        <th className="p-1.5 text-center">Max Unity Ratio</th>
                        <th className="p-1.5 text-center">Status</th>
                        <th className="p-1.5">Stress safety Limit-State Verification Equations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {frames.map((f) => {
                        const forces = results.frameForces[f.id];
                        const sect = sections.find((s) => s.id === f.sectionId);
                        const d = forces?.design;
                        return (
                          <tr key={f.id} className="border-b border-slate-200">
                            <td className="p-1.5 font-bold">{f.id}</td>
                            <td className="p-1.5">{sect?.name}</td>
                            <td className="p-1.5 text-center font-bold">{d ? d.ratio.toFixed(3) : 'N/A'}</td>
                            <td className="p-1.5 text-center font-bold">{d ? d.status : 'Unsolved'}</td>
                            <td className="p-1.5 text-[9px] font-sans text-slate-600">{d ? d.detail : 'Run solution to generate.'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Slab and Footing print section */}
                <div className="space-y-4 pt-4">
                  <h2 className="text-sm font-bold text-[#004A99] border-b border-slate-300 pb-1 uppercase">3. Slab & Foundation Design dossier (IS 456 & IS 1904)</h2>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="border border-slate-300 p-3 rounded">
                      <h3 className="font-bold text-slate-800 text-[11px] border-b border-slate-200 pb-1">3.1 Two-Way Slab Reinforcement (IS 456 Annex D)</h3>
                      <div className="space-y-1 mt-2 text-[10px]">
                        <div>Slab Aspect ratio: <strong>{r.toFixed(2)} ({isTwoWay ? 'Two-Way System' : 'One-Way System'})</strong></div>
                        <div>Total design factored load: <strong>{totalFactoredLoad.toFixed(2)} kN/m²</strong></div>
                        <div>Calculated maximum moment M<sub>ux</sub>: <strong>{Mux.toFixed(2)} kNm/m</strong></div>
                        <div>Required structural steel A<sub>st</sub>: <strong>{astMain.toFixed(1)} mm²/m</strong> (Min 0.12% Gross Area applied)</div>
                        <div className="text-[#004A99] font-bold text-[11px]">Recommended Reinforcement layout: T{slabRebarDia} @ {roundedSpacingMain}mm C/C Main steel, T8 @ {roundedSpacingDist}mm C/C distribution bars</div>
                        <div>L/d ratio verification: <strong>{slabLx * 1000 / d_slab <= (isTwoWay ? 24 : 20) ? 'PASS' : 'FAIL'}</strong></div>
                      </div>
                    </div>
                     <div className="border border-slate-300 p-3 rounded">
                       <h3 className="font-bold text-slate-800 text-[11px] border-b border-slate-200 pb-1">
                         3.2 Foundation Sizing & Soil Contact Verification
                       </h3>
                       {(() => {
                         const fdnReport = calculateFoundationDesign(
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

                         if (fdnReport.selectedType === 'Isolated') {
                           const cd = fdnReport.isolated.criticalDesign;
                           return (
                             <div className="space-y-1 mt-2 text-[10px] text-slate-700">
                               <div>Foundation Class: <strong className="text-amber-800 font-bold">IS 456 Isolated Footing</strong></div>
                               <div>Max Column Load (Service): <strong>{cd.P.toFixed(0)} kN</strong> (Ultimate Pu: {cd.Pu.toFixed(0)} kN)</div>
                               <div>Safe Bearing Capacity (SBC): <strong>{footingSbc} kN/m²</strong></div>
                               <div className="text-[#004A99] font-bold text-[10px]">Design Footprint: {cd.sideRounded.toFixed(2)}m × {cd.sideRounded.toFixed(2)}m (Depth: {footingDepth}mm)</div>
                               <div>Max Soil Pressure: <strong>{cd.actualPressure.toFixed(1)} kN/m²</strong> ({cd.sbcStatus})</div>
                               <div>Punching Shear: <strong>{cd.punchingStress.toFixed(2)} MPa</strong> (Limit: {(0.25 * Math.sqrt(footingConcreteGrade)).toFixed(2)} MPa)</div>
                             </div>
                           );
                         }

                         if (fdnReport.selectedType === 'Strip') {
                           const sd = fdnReport.strip.designs[0] || { length: 4.5, P_total: footingP * 2, widthProvided: 1.2, actualPressure: 110, sbcStatus: 'PASS', spacingTransverse: 150 };
                           return (
                             <div className="space-y-1 mt-2 text-[10px] text-slate-700">
                               <div>Foundation Class: <strong className="text-amber-800 font-bold">Continuous Strip Footing</strong></div>
                               <div>Total Combined Load: <strong>{sd.P_total.toFixed(0)} kN</strong></div>
                               <div>Strip Length × Width: <strong>{sd.length.toFixed(1)}m × {sd.widthProvided.toFixed(1)}m</strong></div>
                               <div>Soil Pressure: <strong>{sd.actualPressure.toFixed(1)} kN/m²</strong> ({sd.sbcStatus})</div>
                               <div className="text-[#004A99] font-bold text-[10px]">Reinforcement: T{footingRebarDia} @ {sd.spacingTransverse}mm C/C Transverse</div>
                             </div>
                           );
                         }

                         if (fdnReport.selectedType === 'Raft') {
                           const rd = fdnReport.raft;
                           return (
                             <div className="space-y-1 mt-2 text-[10px] text-slate-700">
                               <div>Foundation Class: <strong className="text-indigo-800 font-bold">IS 1904 Combined Raft / Mat</strong></div>
                               <div>Total Vertical Load: <strong>{rd.P_total.toFixed(0)} kN</strong></div>
                               <div>Dimensions: <strong>{rd.length.toFixed(1)}m × {rd.width.toFixed(1)}m</strong></div>
                               <div>Avg Soil Pressure: <strong>{rd.actualPressure.toFixed(1)} kN/m²</strong> (Limit: {footingSbc}, {rd.sbcStatus})</div>
                               <div>Mesh Reinforcement: <strong className="text-[#004A99]">T{Math.max(12, footingRebarDia)} @ {rd.spacingDir1}mm C/C</strong></div>
                             </div>
                           );
                         }

                         return (
                           <div className="space-y-1.5 mt-2 text-[10px] text-slate-700">
                             <div>Foundation Class: <strong className="text-rose-800 font-bold">IS 2911 Pile Foundation</strong></div>
                             <p className="text-slate-600 leading-normal font-sans italic">
                               {fdnReport.pile.message}
                             </p>
                           </div>
                         );
                       })()}
                     </div>
                  </div>

                  {/* Complete detailed Foundation Schedule table in the print output */}
                  <div className="space-y-1.5 pt-2">
                    <h3 className="font-bold text-slate-800 text-[10px] uppercase">3.3 Detailed Foundation Design Schedule</h3>
                    {(() => {
                      const fdnReport = calculateFoundationDesign(
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

                      if (fdnReport.selectedType === 'Isolated') {
                        return (
                          <table className="w-full text-left text-[9px] border border-slate-300 font-mono">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-300">
                                <th className="p-1">Footing ID</th>
                                <th className="p-1">Location</th>
                                <th className="p-1 text-right">Service P (kN)</th>
                                <th className="p-1 text-right">Ultimate Pu (kN)</th>
                                <th className="p-1 text-center">Design Footprint</th>
                                <th className="p-1 text-right">Soil Pressure</th>
                                <th className="p-1 text-center">Mesh Rebar Detail</th>
                                <th className="p-1 text-center">Punching Stress</th>
                                <th className="p-1 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fdnReport.isolated.designs.map((fd) => (
                                <tr key={fd.jointId} className="border-b border-slate-200">
                                  <td className="p-1 font-bold">{fd.jointId}</td>
                                  <td className="p-1 text-slate-500">X={fd.x.toFixed(1)}m, Z={fd.z.toFixed(1)}m</td>
                                  <td className="p-1 text-right font-bold">{fd.P.toFixed(1)}</td>
                                  <td className="p-1 text-right text-slate-500">{fd.Pu.toFixed(1)}</td>
                                  <td className="p-1 text-center font-bold">{fd.sideRounded.toFixed(2)}m x {fd.sideRounded.toFixed(2)}m</td>
                                  <td className="p-1 text-right font-bold text-emerald-800">{fd.actualPressure.toFixed(1)} kN/m²</td>
                                  <td className="p-1 text-center font-bold text-[#004A99]">T{footingRebarDia} @ {fd.spacingRounded}mm C/C</td>
                                  <td className="p-1 text-center">{fd.punchingStress.toFixed(2)} MPa</td>
                                  <td className="p-1 text-center font-bold text-emerald-800">{fd.sbcStatus}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      }

                      if (fdnReport.selectedType === 'Strip') {
                        return (
                          <table className="w-full text-left text-[9px] border border-slate-300 font-mono">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-300">
                                <th className="p-1">Strip Mark</th>
                                <th className="p-1">Supported Nodes</th>
                                <th className="p-1 text-right">Combined P (kN)</th>
                                <th className="p-1 text-right">Ultimate Pu (kN)</th>
                                <th className="p-1 text-center">Plan Dimensions</th>
                                <th className="p-1 text-right">Soil Pressure</th>
                                <th className="p-1 text-center">Transverse Main Steel</th>
                                <th className="p-1 text-center">Punching Shear</th>
                                <th className="p-1 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fdnReport.strip.designs.map((sd) => (
                                <tr key={sd.id} className="border-b border-slate-200">
                                  <td className="p-1 font-bold">{sd.id}</td>
                                  <td className="p-1 text-slate-600 max-w-[120px] truncate">{sd.joints.join(', ')}</td>
                                  <td className="p-1 text-right font-bold">{sd.P_total.toFixed(1)}</td>
                                  <td className="p-1 text-right text-slate-500">{sd.Pu_total.toFixed(1)}</td>
                                  <td className="p-1 text-center font-bold">{sd.length.toFixed(2)}m × {sd.widthProvided.toFixed(2)}m</td>
                                  <td className="p-1 text-right font-bold text-emerald-800">{sd.actualPressure.toFixed(1)} kN/m²</td>
                                  <td className="p-1 text-center font-bold text-[#004A99]">T{footingRebarDia} @ {sd.spacingTransverse}mm C/C</td>
                                  <td className="p-1 text-center">{sd.punchingStress.toFixed(2)} MPa</td>
                                  <td className="p-1 text-center font-bold text-emerald-800">{sd.sbcStatus}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      }

                      if (fdnReport.selectedType === 'Raft') {
                        return (
                          <div className="border border-slate-300 p-3 rounded font-sans text-[10px] space-y-1.5 bg-white">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div>Total Combined Axial Load: <strong>{fdnReport.raft.P_total.toFixed(1)} kN</strong></div>
                                <div>Raft Sizing: <strong>{fdnReport.raft.length.toFixed(2)}m × {fdnReport.raft.width.toFixed(2)}m</strong></div>
                              </div>
                              <div>
                                <div>Average Bearing Pressure: <strong>{fdnReport.raft.actualPressure.toFixed(1)} kN/m²</strong></div>
                                <div>Status: <strong className="text-emerald-800">{fdnReport.raft.sbcStatus} (Limit: {footingSbc} kN/m²)</strong></div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="border border-slate-300 p-3 rounded font-sans text-[10px] space-y-1.5 bg-white">
                          <p className="italic text-slate-600">{fdnReport.pile.message}</p>
                          <div className="grid grid-cols-3 gap-3 pt-1">
                            <div>Total Pile Caps: <strong>{numFootings} Nos</strong></div>
                            <div>Pile Diameter: <strong>450 mm</strong></div>
                            <div>Design Depth: <strong>12.0 m</strong></div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div style={{ pageBreakBefore: 'always' }} />

                {/* BOQ print section */}
                <div className="space-y-2">
                  <h2 className="text-sm font-bold text-[#004A99] border-b border-slate-300 pb-1 uppercase">4. Bill of Quantities (BOQ) Take-off & Material Cost Estimate</h2>
                  <table className="w-full text-left text-[9px] border border-slate-300 font-mono">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300">
                        <th className="p-1.5 text-left">Item Code</th>
                        <th className="p-1.5 text-left">CPWD DSR Schedule Item Description (IS-1200)</th>
                        <th className="p-1.5 text-right">Quantity</th>
                        <th className="p-1.5 text-center">Unit</th>
                        <th className="p-1.5 text-right">Rate (₹)</th>
                        <th className="p-1.5 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* CPWD Earthwork Head */}
                      <tr className="bg-slate-50 border-b border-slate-300 font-bold text-slate-800">
                        <td className="p-1.5" colSpan={6}>SUB-HEAD II: EARTH WORK (As per IS-1200 Part I)</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-1.5 font-bold text-[#004A99]">DSR 2.8.1</td>
                        <td className="p-1.5 font-sans text-slate-700">
                          Earthwork in excavation in foundation trenches of width up to 1.5 m, including getting out, ramming, and disposal of surplus excavated earth up to 1.5 m depth.
                        </td>
                        <td className="p-1.5 text-right">{totalExcavationVolume.toFixed(2)}</td>
                        <td className="p-1.5 text-center">m³</td>
                        <td className="p-1.5 text-right">350</td>
                        <td className="p-1.5 text-right font-bold">{costExcavation.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                      </tr>

                      {/* CPWD RCC Head */}
                      <tr className="bg-slate-50 border-b border-slate-300 font-bold text-slate-800">
                        <td className="p-1.5" colSpan={6}>SUB-HEAD V: REINFORCED CEMENT CONCRETE (As per IS-1200 Part II & V)</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-1.5 font-bold text-[#004A99]">DSR 5.1.1</td>
                        <td className="p-1.5 font-sans text-slate-700">
                          Providing and laying in position machine-mixed design mix M25 grade concrete in foundations and isolated footings, excluding cost of centering, shuttering, and steel reinforcement.
                        </td>
                        <td className="p-1.5 text-right">{rccFootingVol.toFixed(2)}</td>
                        <td className="p-1.5 text-center">m³</td>
                        <td className="p-1.5 text-right">{rateRccFooting.toFixed(0)}</td>
                        <td className="p-1.5 text-right font-bold">{costFootingConcrete.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-1.5 font-bold text-[#004A99]">DSR 5.1.2</td>
                        <td className="p-1.5 font-sans text-slate-700">
                          RCC M25 grade in columns, pillars, and piers, including hoisting, compacting, and finishing complete, excluding cost of reinforcement and shuttering.
                        </td>
                        <td className="p-1.5 text-right">{rccColumnVol.toFixed(2)}</td>
                        <td className="p-1.5 text-center">m³</td>
                        <td className="p-1.5 text-right">{rateRccColumn.toFixed(0)}</td>
                        <td className="p-1.5 text-right font-bold">{costColumnConcrete.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-1.5 font-bold text-[#004A99]">DSR 5.1.3</td>
                        <td className="p-1.5 font-sans text-slate-700">
                          RCC M25 grade in beams, plinth beams, and girders, including hoisting, compacting, and finishing complete, excluding cost of reinforcement and shuttering.
                        </td>
                        <td className="p-1.5 text-right">{rccBeamVol.toFixed(2)}</td>
                        <td className="p-1.5 text-center">m³</td>
                        <td className="p-1.5 text-right">{rateRccBeam.toFixed(0)}</td>
                        <td className="p-1.5 text-right font-bold">{costBeamConcrete.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-1.5 font-bold text-[#004A99]">DSR 5.1.4</td>
                        <td className="p-1.5 font-sans text-slate-700">
                          RCC M25 grade in suspended floors, roofs, slabs, and balconies, including hoisting, compacting, and finishing complete, excluding cost of reinforcement and shuttering.
                        </td>
                        <td className="p-1.5 text-right">{rccSlabVol.toFixed(2)}</td>
                        <td className="p-1.5 text-center">m³</td>
                        <td className="p-1.5 text-right">{rateRccSlab.toFixed(0)}</td>
                        <td className="p-1.5 text-right font-bold">{costSlabConcrete.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                      </tr>

                      {/* CPWD Formwork Head */}
                      <tr className="border-b border-slate-200">
                        <td className="p-1.5 font-bold text-[#004A99]">DSR 5.9.1</td>
                        <td className="p-1.5 font-sans text-slate-700">
                          Centering and shuttering (formwork) using waterproof plywood including propping, strutting, and removal of forms for: Isolated footings and foundations bases.
                        </td>
                        <td className="p-1.5 text-right">{footingFormworkArea.toFixed(1)}</td>
                        <td className="p-1.5 text-center">m²</td>
                        <td className="p-1.5 text-right">{rateFormworkFooting}</td>
                        <td className="p-1.5 text-right font-bold">{costFormworkFooting.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-1.5 font-bold text-[#004A99]">DSR 5.9.2</td>
                        <td className="p-1.5 font-sans text-slate-700">
                          Centering and shuttering (formwork) using waterproof plywood for: Columns, pillars, and piers.
                        </td>
                        <td className="p-1.5 text-right">{columnFormworkArea.toFixed(1)}</td>
                        <td className="p-1.5 text-center">m²</td>
                        <td className="p-1.5 text-right">{rateFormworkColumn}</td>
                        <td className="p-1.5 text-right font-bold">{costFormworkColumn.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-1.5 font-bold text-[#004A99]">DSR 5.9.3</td>
                        <td className="p-1.5 font-sans text-slate-700">
                          Centering and shuttering (formwork) using waterproof plywood for: Beams, plinth beams, and girders.
                        </td>
                        <td className="p-1.5 text-right">{beamFormworkArea.toFixed(1)}</td>
                        <td className="p-1.5 text-center">m²</td>
                        <td className="p-1.5 text-right">{rateFormworkBeam}</td>
                        <td className="p-1.5 text-right font-bold">{costFormworkBeam.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-1.5 font-bold text-[#004A99]">DSR 5.9.5</td>
                        <td className="p-1.5 font-sans text-slate-700">
                          Centering and shuttering (formwork) using waterproof plywood for: Suspended floors, roofs, and flat slabs.
                        </td>
                        <td className="p-1.5 text-right">{slabFormworkArea.toFixed(1)}</td>
                        <td className="p-1.5 text-center">m²</td>
                        <td className="p-1.5 text-right">{rateFormworkSlab}</td>
                        <td className="p-1.5 text-right font-bold">{costFormworkSlab.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                      </tr>

                      {/* Reinforcement Head */}
                      <tr className="border-b border-slate-200">
                        <td className="p-1.5 font-bold text-[#004A99]">DSR 5.22.1</td>
                        <td className="p-1.5 font-sans text-slate-700">
                          Steel reinforcement for RCC work including straightening, cutting, bending, binding, placing and securing in position complete, using Thermo-Mechanically Treated (TMT) Fe 500D bars.
                        </td>
                        <td className="p-1.5 text-right">{totalBbsRebarWeight.toFixed(0)}</td>
                        <td className="p-1.5 text-center">kg</td>
                        <td className="p-1.5 text-right">{rebarRate}</td>
                        <td className="p-1.5 text-right font-bold">{costRebar.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                      </tr>

                      {/* CPWD Structural Steel Head */}
                      {totalStructuralSteelWeight > 0 && (
                        <>
                          <tr className="bg-slate-50 border-b border-slate-300 font-bold text-slate-800">
                            <td className="p-1.5" colSpan={6}>SUB-HEAD X: STEEL WORK (As per IS-1200 Part XIV)</td>
                          </tr>
                          <tr className="border-b border-slate-200">
                            <td className="p-1.5 font-bold text-[#004A99]">DSR 10.1</td>
                            <td className="p-1.5 font-sans text-slate-700">
                              Structural steel work in single sections, including cutting, hoisting, fixing in position, and applying a priming coat of approved steel primer complete.
                            </td>
                            <td className="p-1.5 text-right">{totalStructuralSteelWeight.toFixed(0)}</td>
                            <td className="p-1.5 text-center">kg</td>
                            <td className="p-1.5 text-right">{structuralSteelRate}</td>
                            <td className="p-1.5 text-right font-bold">{costStructuralSteel.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                          </tr>
                        </>
                      )}

                      <tr className="bg-slate-100 font-bold text-xs text-slate-900 border-t-2 border-slate-400">
                        <td className="p-2" colSpan={2}>GRAND TOTAL ESTIMATED PROJECT COST AS PER IS-1200 (INR)</td>
                        <td className="p-2 text-right" colSpan={4}>₹ {grandTotalCostVal.toLocaleString('en-IN', {maximumFractionDigits: 0})} /-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* BBS print section */}
                <div className="space-y-2 pt-4">
                  <h2 className="text-sm font-bold text-[#004A99] border-b border-slate-300 pb-1 uppercase">5. Bar Bending Schedule (BBS) Detailing dossier (IS-2502)</h2>
                  <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2 border border-slate-200 text-center font-mono">
                    <div>Ø8mm: {weight8mm.toFixed(0)} kg</div>
                    <div>Ø10mm: {weight10mm.toFixed(0)} kg</div>
                    <div>Ø12mm: {weight12mm.toFixed(0)} kg</div>
                    <div>Ø16mm: {weight16mm.toFixed(0)} kg</div>
                  </div>
                  <table className="w-full text-left text-[9px] border border-slate-300 font-mono mt-1">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300">
                        <th className="p-1">Member ID / Mark</th>
                        <th className="p-1 text-left">IS-2502 Shape Code</th>
                        <th className="p-1 text-left">Formula</th>
                        <th className="p-1 text-center">Sketch</th>
                        <th className="p-1 text-center">Ø (mm)</th>
                        <th className="p-1">Spacing/Nos</th>
                        <th className="p-1 text-right">Cut L (m)</th>
                        <th className="p-1 text-center">Members</th>
                        <th className="p-1 text-center font-bold">Bars/Mem</th>
                        <th className="p-1 text-right font-bold">Tot L (m)</th>
                        <th className="p-1 text-right font-bold text-[#004A99]">Tot Wt (kg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bbsRows.map((r, idx) => (
                        <tr key={idx} className="border-b border-slate-200">
                          <td className="p-1 font-bold">{r.member}</td>
                          <td className="p-1 font-sans text-amber-950 font-bold">{r.shapeCode} ({r.shapeName})</td>
                          <td className="p-1 font-mono text-[8px]">{r.bendingFormula}</td>
                          <td className="p-1 text-center"><div className="w-12 h-6 mx-auto flex items-center justify-center"><BbsShapeSketch shapeCode={r.is2502ShapeCode} /></div></td>
                          <td className="p-1 text-center font-bold">{r.dia}</td>
                          <td className="p-1">{r.spacingOrCount}</td>
                          <td className="p-1 text-right font-bold">{r.cutLength.toFixed(2)}</td>
                          <td className="p-1 text-center">{r.membersCount}</td>
                          <td className="p-1 text-center">{r.barsPerMember}</td>
                          <td className="p-1 text-right">{r.totalLength.toFixed(1)}</td>
                          <td className="p-1 text-right font-bold text-[#004A99]">{r.totalWeight.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-8 border-t border-slate-400 text-center text-slate-400 text-[8px] font-mono flex justify-between">
                  <span>Structural Design Dossier end of dossier</span>
                  <span>Digitally certified structural design output</span>
                </div>
              </div>
              )}

              {/* TAB 6: STRUCTURAL DETAILING */}
              {reportTab === 'detailing' && (
                <StructuralDetailing 
                  joints={joints}
                  beams={beams} 
                  columns={columns}
                  sections={sections}
                  bbsRows={bbsRows}
                  fdnReport={fdnReport} 
                  slabLx={slabLx} 
                  slabLy={slabLy} 
                  slabThickness={slabThickness} 
                />
              )}
            </div>
          );
        })()}

        {/* 4b. STRUCTURE GENERATOR WIZARD MODAL */}
        {showWizard && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-sm border border-[#999999] shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#D1D1D1] p-4 bg-[#004A99] text-white select-none">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏢</span>
                  <h3 className="font-bold text-sm uppercase tracking-wider">
                    Structure Generator Wizard
                  </h3>
                </div>
                <button
                  onClick={() => setShowWizard(false)}
                  className="text-white hover:text-slate-200 font-bold text-sm bg-white/10 px-2.5 py-1 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-4 overflow-auto space-y-4 text-xs">
                <p className="text-slate-600 leading-normal">
                  Select a template type to generate a complete structural analysis model. The wizard will automatically create joints, members, section assignments, load combinations, and apply gravity and wind forces.
                </p>

                {/* Structure Type Select */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Target Structural Type:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'residential', title: 'Concrete Residential', desc: 'Concrete frames with standard live/dead gravity load patterns', icon: '🏢' },
                      { id: 'commercial', title: 'Steel Commercial', desc: 'Steel frames with horizontal beams, vertical columns, bracing, and wind load cases', icon: '🏙️' },
                      { id: 'warehouse', title: 'Industrial Portal', desc: 'Industrial steel columns with pitching roof rafter profiles', icon: '🏭' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setWizardType(t.id as any)}
                        className={`flex flex-col items-center p-3 rounded border text-center cursor-pointer transition-all ${
                          wizardType === t.id
                            ? 'bg-[#E8F0FE] border-[#004A99] text-[#004A99] font-bold shadow-sm'
                            : 'bg-[#F9F9F9] border-[#D1D1D1] text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xl mb-1">{t.icon}</span>
                        <span className="font-bold text-[11px] leading-tight block">{t.title}</span>
                        <span className="text-[9px] text-slate-500 font-normal leading-tight mt-1">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Configuration Fields */}
                <div className="grid grid-cols-2 gap-3 bg-[#F9F9F9] p-3 rounded border border-[#D1D1D1]">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      X-grid spacing (East-West)
                    </label>
                    <input
                      type="text"
                      value={wizardXSpacings}
                      onChange={(e) => setWizardXSpacings(e.target.value)}
                      placeholder="e.g. 5, 5, 5"
                      className="w-full bg-white border border-[#D1D1D1] rounded p-1.5 text-xs font-semibold focus:outline-none focus:border-[#004A99]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Height of stories
                    </label>
                    <input
                      type="text"
                      value={wizardYSpacings}
                      onChange={(e) => setWizardYSpacings(e.target.value)}
                      placeholder="e.g. 3, 3.5, 3"
                      className="w-full bg-white border border-[#D1D1D1] rounded p-1.5 text-xs font-semibold focus:outline-none focus:border-[#004A99]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Y-grid spacing (North-South)
                    </label>
                    <input
                      type="text"
                      value={wizardZSpacings}
                      onChange={(e) => setWizardZSpacings(e.target.value)}
                      placeholder="e.g. 4, 4"
                      className="w-full bg-white border border-[#D1D1D1] rounded p-1.5 text-xs font-semibold focus:outline-none focus:border-[#004A99]"
                    />
                  </div>
                  <div className="space-y-1 col-span-2 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Base Support</label>
                      <select
                        value={wizardSupport}
                        onChange={(e) => setWizardSupport(e.target.value as SupportType)}
                        className="w-full bg-white border border-[#D1D1D1] rounded p-1.5 text-xs font-semibold focus:outline-none focus:border-[#004A99] cursor-pointer"
                      >
                        <option value="Fixed">Fixed Support</option>
                        <option value="Pinned">Pinned Support</option>
                        <option value="Roller">Roller Support</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Design Beam Load (kN/m)</label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={wizardBeamLoad}
                        onChange={(e) => setWizardBeamLoad(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full bg-white border border-[#D1D1D1] rounded p-1.5 text-xs font-semibold focus:outline-none focus:border-[#004A99]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 p-4 border-t border-[#D1D1D1] bg-[#F9F9F9]">
                <button
                  onClick={() => setShowWizard(false)}
                  className="px-4 py-2 text-xs font-semibold bg-white border border-[#D1D1D1] hover:bg-slate-50 rounded text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateWizardStructure}
                  className="px-5 py-2 text-xs font-bold bg-[#004A99] hover:bg-[#003B7A] text-white rounded cursor-pointer shadow-sm uppercase tracking-wider"
                >
                  🔨 Generate Structure
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- DEFINE MATERIAL PROPERTIES MODAL --- */}
        {showMaterialsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-sm border border-[#999999] shadow-2xl w-full max-w-md flex flex-col text-slate-800">
              <div className="flex items-center justify-between border-b border-[#D1D1D1] p-3 bg-[#004A99] text-white">
                <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  🧱 Material Properties (IS 800 / IS 456)
                </span>
                <button onClick={() => setShowMaterialsModal(false)} className="text-white hover:text-slate-200 font-bold text-sm">✕</button>
              </div>
              <div className="p-4 space-y-3 text-xs">
                <p className="text-slate-500 leading-normal font-sans">
                  Define concrete grades (IS 456) and structural steel grades (IS 800) with their yield strengths (fy, fck) and density.
                </p>
                <div className="border border-[#D1D1D1] rounded-sm overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-[#F3F3F3] border-b border-[#D1D1D1] font-bold text-[10px] text-slate-500 uppercase">
                      <tr>
                        <th className="p-2">Material ID</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Type</th>
                        <th className="p-2 text-right">Unit Weight (kN/m³)</th>
                        <th className="p-2 text-right">Strength (MPa)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map(m => (
                        <tr key={m.id} className="border-b border-[#E5E5E5] font-mono hover:bg-[#F9F9F9]">
                          <td className="p-2 font-bold text-[#004A99]">{m.id}</td>
                          <td className="p-2 font-bold">{m.name}</td>
                          <td className="p-2">{m.type}</td>
                          <td className="p-2 text-right">{m.unitWeight.toFixed(1)}</td>
                          <td className="p-2 text-right font-bold">{m.f_yield_or_c} MPa</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-[#F9F9F9] border border-[#D1D1D1] p-3 rounded-sm space-y-2 font-sans">
                  <div className="font-bold text-[10px] text-slate-500 uppercase">Standard Indian Grades:</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>• <strong>M25 Concrete</strong>: fck = 25 MPa</div>
                    <div>• <strong>M30 Concrete</strong>: fck = 30 MPa</div>
                    <div>• <strong>Fe250 Steel</strong>: fy = 250 MPa</div>
                    <div>• <strong>Fe345 Steel</strong>: fy = 345 MPa</div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end p-3 bg-[#F9F9F9] border-t border-[#D1D1D1]">
                <button onClick={() => setShowMaterialsModal(false)} className="bg-[#004A99] text-white text-xs font-bold px-4 py-1.5 rounded-sm hover:bg-[#003B7A] cursor-pointer font-sans">
                  Close Properties
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- DEFINE SECTIONS MODAL --- */}
        {showSectionsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-sm border border-[#999999] shadow-2xl w-full max-w-lg flex flex-col text-slate-800">
              <div className="flex items-center justify-between border-b border-[#D1D1D1] p-3 bg-[#004A99] text-white">
                <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  📐 Section Profiles Manager
                </span>
                <button onClick={() => setShowSectionsModal(false)} className="text-white hover:text-slate-200 font-bold text-sm">✕</button>
              </div>
              <div className="p-4 space-y-3 text-xs">
                <p className="text-slate-500 leading-normal font-sans">
                  View and verify member profiles assigned to beams, columns, and diagonal braces.
                </p>
                <div className="border border-[#D1D1D1] rounded-sm overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-[#F3F3F3] border-b border-[#D1D1D1] font-bold text-[10px] text-slate-500 uppercase">
                      <tr>
                        <th className="p-2">Section ID</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Shape</th>
                        <th className="p-2 text-right">Dimensions (mm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.map(s => (
                        <tr key={s.id} className="border-b border-[#E5E5E5] font-mono hover:bg-[#F9F9F9]">
                          <td className="p-2 font-bold text-[#004A99]">{s.id}</td>
                          <td className="p-2 font-bold">{s.name}</td>
                          <td className="p-2">{s.shape}</td>
                          <td className="p-2 text-right font-bold">
                            {s.shape === 'Circular' ? `Ø ${Math.round(s.depth * 1000)}` : `${Math.round(s.width * 1000)} x ${Math.round(s.depth * 1000)}`} mm
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex justify-end p-3 bg-[#F9F9F9] border-t border-[#D1D1D1]">
                <button onClick={() => setShowSectionsModal(false)} className="bg-[#004A99] text-white text-xs font-bold px-4 py-1.5 rounded-sm hover:bg-[#003B7A] cursor-pointer font-sans">
                  Close Properties
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- DEFINE LOAD CASE PATTERNS MODAL --- */}
        {showLoadsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-sm border border-[#999999] shadow-2xl w-full max-w-md flex flex-col text-slate-800">
              <div className="flex items-center justify-between border-b border-[#D1D1D1] p-3 bg-[#004A99] text-white">
                <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  ⚖️ Load Patterns & Cases
                </span>
                <button onClick={() => setShowLoadsModal(false)} className="text-white hover:text-slate-200 font-bold text-sm">✕</button>
              </div>
              <div className="p-4 space-y-3 text-xs">
                <p className="text-slate-500 leading-normal font-sans">
                  Configure structural loading cases and their automatic self-weight multipliers.
                </p>
                <div className="border border-[#D1D1D1] rounded-sm overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-[#F3F3F3] border-b border-[#D1D1D1] font-bold text-[10px] text-slate-500 uppercase">
                      <tr>
                        <th className="p-2">Case ID</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Type</th>
                        <th className="p-2 text-right">Self Weight Mult.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadCases.map(lc => (
                        <tr key={lc.id} className="border-b border-[#E5E5E5] font-mono hover:bg-[#F9F9F9]">
                          <td className="p-2 font-bold text-[#004A99]">{lc.id}</td>
                          <td className="p-2 font-bold">{lc.name}</td>
                          <td className="p-2">{lc.type}</td>
                          <td className="p-2 text-right font-bold">{lc.selfWeightMultiplier.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex justify-end p-3 bg-[#F9F9F9] border-t border-[#D1D1D1]">
                <button onClick={() => setShowLoadsModal(false)} className="bg-[#004A99] text-white text-xs font-bold px-4 py-1.5 rounded-sm hover:bg-[#003B7A] cursor-pointer font-sans">
                  Close Properties
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- DEFINE LOAD COMBINATIONS MODAL --- */}
        {showCombosModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-sm border border-[#999999] shadow-2xl w-full max-w-lg flex flex-col text-slate-800 font-sans">
              <div className="flex items-center justify-between border-b border-[#D1D1D1] p-3 bg-[#004A99] text-white">
                <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  🔗 Load Combinations (IS 800 & IS 456 Limit States)
                </span>
                <button onClick={() => setShowCombosModal(false)} className="text-white hover:text-slate-200 font-bold text-sm">✕</button>
              </div>
              <div className="p-4 space-y-3 text-xs">
                <p className="text-slate-500 leading-normal">
                  View structural ultimate and serviceability design combinations based on Indian Standard partial safety factors.
                </p>
                <div className="border border-[#D1D1D1] rounded-sm overflow-hidden">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#F3F3F3] border-b border-[#D1D1D1] font-bold text-[10px] text-slate-500 uppercase">
                      <tr>
                        <th className="p-2">Combo ID</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Equation Type</th>
                        <th className="p-2">Factors Definition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {combinations.map(c => (
                        <tr key={c.id} className="border-b border-[#E5E5E5] hover:bg-[#F9F9F9]">
                          <td className="p-2 font-bold text-[#004A99]">{c.id}</td>
                          <td className="p-2 font-bold text-slate-800">{c.name}</td>
                          <td className="p-2 text-[10px]">{c.type}</td>
                          <td className="p-2 text-slate-600 font-bold text-[10px] leading-snug">
                            {c.factors.map(f => {
                              const caseName = loadCases.find(lc => lc.id === f.loadCaseId)?.name.split(' ')[0] || f.loadCaseId;
                              return `${f.factor}x${caseName}`;
                            }).join(' + ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex justify-end p-3 bg-[#F9F9F9] border-t border-[#D1D1D1]">
                <button onClick={() => setShowCombosModal(false)} className="bg-[#004A99] text-white text-xs font-bold px-4 py-1.5 rounded-sm hover:bg-[#003B7A] cursor-pointer">
                  Close Properties
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- DEFINE INDIAN WIND PARAMETERS (IS 875:3) MODAL --- */}
        {showWindModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-sm border border-[#999999] shadow-2xl w-full max-w-md flex flex-col text-slate-800 font-sans">
              <div className="flex items-center justify-between border-b border-[#D1D1D1] p-3 bg-[#004A99] text-white">
                <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  💨 IS 875 Part 3: 2015 Wind Loading Parameters
                </span>
                <button onClick={() => setShowWindModal(false)} className="text-white hover:text-slate-200 font-bold text-sm">✕</button>
              </div>
              <div className="p-4 space-y-4 text-xs">
                <p className="text-slate-500 leading-normal">
                  Configure Indian Standard wind load parameters. Basic wind speed (Vb) is selected according to location. Design speed Vz = Vb * k1 * k2 * k3 * k4.
                </p>

                <div className="grid grid-cols-2 gap-3 bg-[#F9F9F9] p-3 rounded-sm border border-[#D1D1D1]">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Basic wind speed Vb (m/s)</label>
                    <select
                      value={windVb}
                      onChange={(e) => setWindVb(parseInt(e.target.value) || 39)}
                      className="w-full bg-white border border-[#D1D1D1] rounded px-1.5 py-1 font-bold text-[#004A99] focus:outline-none"
                    >
                      <option value="33">Bengaluru (33 m/s)</option>
                      <option value="39">Hyderabad (39 m/s)</option>
                      <option value="44">Mumbai (44 m/s)</option>
                      <option value="47">New Delhi (47 m/s)</option>
                      <option value="50">Kolkata / Chennai (50 m/s)</option>
                      <option value="55">Gale Coast (55 m/s)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Risk Coefficient (k1)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={windK1}
                      onChange={(e) => setWindK1(parseFloat(e.target.value) || 1.0)}
                      className="w-full bg-white border border-[#D1D1D1] rounded p-1 font-mono text-center font-bold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Terrain/Height (k2)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={windK2}
                      onChange={(e) => setWindK2(parseFloat(e.target.value) || 1.0)}
                      className="w-full bg-white border border-[#D1D1D1] rounded p-1 font-mono text-center font-bold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Topography (k3)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={windK3}
                      onChange={(e) => setWindK3(parseFloat(e.target.value) || 1.0)}
                      className="w-full bg-white border border-[#D1D1D1] rounded p-1 font-mono text-center font-bold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Importance factor (k4)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={windK4}
                      onChange={(e) => setWindK4(parseFloat(e.target.value) || 1.0)}
                      className="w-full bg-white border border-[#D1D1D1] rounded p-1 font-mono text-center font-bold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Force Coefficient (Cf)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={windCf}
                      onChange={(e) => setWindCf(parseFloat(e.target.value) || 1.2)}
                      className="w-full bg-white border border-[#D1D1D1] rounded p-1 font-mono text-center font-bold text-slate-800"
                    />
                  </div>
                </div>

                <button
                  onClick={() => { handleGenerateWindLoads(); setShowWindModal(false); }}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-sm text-center uppercase tracking-wider cursor-pointer"
                >
                  ⚡ Apply & Auto-Generate Wind Loads on Left Joints
                </button>
              </div>
              <div className="flex justify-end p-3 bg-[#F9F9F9] border-t border-[#D1D1D1]">
                <button onClick={() => setShowWindModal(false)} className="bg-slate-700 text-white text-xs font-bold px-4 py-1.5 rounded-sm hover:bg-slate-800 cursor-pointer">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- DEFINE INDIAN SEISMIC PARAMETERS (IS 1893) MODAL --- */}
        {showSeismicModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-sm border border-[#999999] shadow-2xl w-full max-w-md flex flex-col text-slate-800 font-sans">
              <div className="flex items-center justify-between border-b border-[#D1D1D1] p-3 bg-[#004A99] text-white">
                <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  🫨 IS 1893 Part 1: 2016 Seismic Loading Parameters
                </span>
                <button onClick={() => setShowSeismicModal(false)} className="text-white hover:text-slate-200 font-bold text-sm">✕</button>
              </div>
              <div className="p-4 space-y-4 text-xs">
                <p className="text-slate-500 leading-normal font-sans">
                  Configure Indian Standard seismic parameters. Base shear coefficient is computed as Ah = (Z/2) * (I/R) * (Sa/g), where lateral forces are distributed based on joint masses.
                </p>

                <div className="grid grid-cols-2 gap-3 bg-[#F9F9F9] p-3 rounded-sm border border-[#D1D1D1]">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Seismic Zone Factor (Z)</label>
                    <select
                      value={seismicZone}
                      onChange={(e) => setSeismicZone(e.target.value as any)}
                      className="w-full bg-white border border-[#D1D1D1] rounded px-1.5 py-1 font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="II">Zone II (Z = 0.10) - Bengaluru</option>
                      <option value="III">Zone III (Z = 0.16) - Mumbai/Kolkata</option>
                      <option value="IV">Zone IV (Z = 0.24) - Delhi/Patna</option>
                      <option value="V">Zone V (Z = 0.36) - Srinagar/Guwahati</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Importance Factor (I)</label>
                    <select
                      value={seismicI}
                      onChange={(e) => setSeismicI(parseFloat(e.target.value) || 1.2)}
                      className="w-full bg-white border border-[#D1D1D1] rounded px-1.5 py-1 font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="1.0">Residential (I = 1.0)</option>
                      <option value="1.2">Commercial / Office (I = 1.2)</option>
                      <option value="1.5">Critical Infrastructure (I = 1.5)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Response Reduction (R)</label>
                    <select
                      value={seismicR}
                      onChange={(e) => setSeismicR(parseFloat(e.target.value) || 5.0)}
                      className="w-full bg-white border border-[#D1D1D1] rounded px-1.5 py-1 font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="5.0">SMRF (R = 5.0) - Special RC Frame</option>
                      <option value="3.0">OMRF (R = 3.0) - Ordinary RC Frame</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Foundation Soil Type</label>
                    <select
                      value={seismicSoil}
                      onChange={(e) => setSeismicSoil(e.target.value as any)}
                      className="w-full bg-white border border-[#D1D1D1] rounded px-1.5 py-1 font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="I">Type I - Rock / Hard Soil</option>
                      <option value="II">Type II - Medium Soil</option>
                      <option value="III">Type III - Soft Soil</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => { handleGenerateSeismicLoads(); setShowSeismicModal(false); }}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded shadow-sm text-center uppercase tracking-wider cursor-pointer"
                >
                  ⚡ Apply & Auto-Generate Base Shear (IS 1893)
                </button>
              </div>
              <div className="flex justify-end p-3 bg-[#F9F9F9] border-t border-[#D1D1D1]">
                <button onClick={() => setShowSeismicModal(false)} className="bg-slate-700 text-white text-xs font-bold px-4 py-1.5 rounded-sm hover:bg-slate-800 cursor-pointer">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- REPLICATE ARRAY TOOL MODAL --- */}
        {showReplicateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-sm border border-[#999999] shadow-2xl w-full max-w-sm flex flex-col text-slate-800 font-sans">
              <div className="flex items-center justify-between border-b border-[#D1D1D1] p-3 bg-[#004A99] text-white">
                <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  🔄 ETABS Replicate / Array Tool
                </span>
                <button onClick={() => setShowReplicateModal(false)} className="text-white hover:text-slate-200 font-bold text-sm">✕</button>
              </div>
              <div className="p-4 space-y-4 text-xs font-sans">
                <p className="text-slate-500 leading-normal">
                  Copy selected nodes or member frames linearly by specifying structural offsets (dx, dy) and the number of repetitions.
                </p>

                <div className="grid grid-cols-3 gap-2 bg-[#F9F9F9] p-3 rounded-sm border border-[#D1D1D1]">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Delta X (dx m)</label>
                    <input
                      type="text"
                      value={repDx}
                      onChange={(e) => setRepDx(e.target.value)}
                      className="w-full bg-white border border-[#D1D1D1] rounded p-1 font-mono text-center font-bold text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Delta Y (dy m)</label>
                    <input
                      type="text"
                      value={repDy}
                      onChange={(e) => setRepDy(e.target.value)}
                      className="w-full bg-white border border-[#D1D1D1] rounded p-1 font-mono text-center font-bold text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Number of Copies</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={repNum}
                      onChange={(e) => setRepNum(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-white border border-[#D1D1D1] rounded p-1 font-mono text-center font-bold text-[#004A99]"
                    />
                  </div>
                </div>

                <button
                  onClick={handleReplicate}
                  className="w-full py-2 bg-[#004A99] hover:bg-[#003B7A] text-white font-bold rounded shadow-sm text-center uppercase tracking-wider cursor-pointer text-xs"
                >
                  ➕ Replicate Selection
                </button>
              </div>
              <div className="flex justify-end p-3 bg-[#F9F9F9] border-t border-[#D1D1D1]">
                <button onClick={() => setShowReplicateModal(false)} className="bg-slate-700 text-white text-xs font-bold px-4 py-1.5 rounded-sm hover:bg-slate-800 cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- SOLVER ENGINE CONFIG MODAL --- */}
        {showSolverModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-sm border border-[#999999] shadow-2xl w-full max-w-sm flex flex-col text-slate-800 font-sans">
              <div className="flex items-center justify-between border-b border-[#D1D1D1] p-3 bg-[#004A99] text-white">
                <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  ⚙️ FEM Solver & P-Delta Settings
                </span>
                <button onClick={() => setShowSolverModal(false)} className="text-white hover:text-slate-200 font-bold text-sm">✕</button>
              </div>
              <div className="p-4 space-y-4 text-xs">
                <p className="text-slate-500 leading-normal">
                  Configure the linear static FEM equation solver tolerance and enable Second-Order geometric stiffness P-Delta checks.
                </p>

                <div className="bg-[#F9F9F9] p-3 rounded-sm border border-[#D1D1D1] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700">Include Second-Order P-Delta effects</label>
                    <input
                      type="checkbox"
                      checked={solverPDelta}
                      onChange={(e) => setSolverPDelta(e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Newton Raphson Convergence Tolerance</label>
                    <input
                      type="number"
                      value={solverTol}
                      step="1e-6"
                      onChange={(e) => setSolverTol(parseFloat(e.target.value) || 1e-5)}
                      className="w-full bg-white border border-[#D1D1D1] rounded p-1.5 font-mono text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end p-3 bg-[#F9F9F9] border-t border-[#D1D1D1] gap-2">
                <button onClick={() => setShowSolverModal(false)} className="bg-[#004A99] text-white text-xs font-bold px-5 py-1.5 rounded-sm hover:bg-[#003B7A] cursor-pointer">
                  Save Solver Options
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- DESIGN SAFETY FACTORS MODAL --- */}
        {showDesignPrefsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-sm border border-[#999999] shadow-2xl w-full max-w-sm flex flex-col text-slate-800 font-sans">
              <div className="flex items-center justify-between border-b border-[#D1D1D1] p-3 bg-[#004A99] text-white">
                <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  ⚖️ Design Preferences & Partial Safety Factors
                </span>
                <button onClick={() => setShowDesignPrefsModal(false)} className="text-white hover:text-slate-200 font-bold text-sm">✕</button>
              </div>
              <div className="p-4 space-y-4 text-xs font-sans">
                <p className="text-slate-500 leading-normal font-sans">
                  Customize the safety limit factors defined by IS 800 (Table 4) and IS 456 (Clause 38.1).
                </p>

                <div className="grid grid-cols-2 gap-3 bg-[#F9F9F9] p-3 rounded-sm border border-[#D1D1D1]">
                  <div className="space-y-1 col-span-2">
                    <div className="font-bold text-[#004A99] uppercase text-[9px] border-b border-[#D1D1D1] pb-1">Steel (IS 800:2007) Factors</div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Yield Resistance (gamma m0)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={steelGammaM0}
                      onChange={(e) => setSteelGammaM0(parseFloat(e.target.value) || 1.10)}
                      className="w-full bg-white border border-[#D1D1D1] rounded p-1 font-mono text-center font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Buckling Resistance (gamma m1)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={steelGammaM1}
                      onChange={(e) => setSteelGammaM1(parseFloat(e.target.value) || 1.25)}
                      className="w-full bg-white border border-[#D1D1D1] rounded p-1 font-mono text-center font-bold"
                    />
                  </div>

                  <div className="space-y-1 col-span-2 pt-2">
                    <div className="font-bold text-[#004A99] uppercase text-[9px] border-b border-[#D1D1D1] pb-1">Concrete (IS 456:2000) Factors</div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Concrete Material (gamma c)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={concreteGammaC}
                      onChange={(e) => setConcreteGammaC(parseFloat(e.target.value) || 1.50)}
                      className="w-full bg-white border border-[#D1D1D1] rounded p-1 font-mono text-center font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Steel Rebar Material (gamma s)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={concreteGammaS}
                      onChange={(e) => setConcreteGammaS(parseFloat(e.target.value) || 1.15)}
                      className="w-full bg-white border border-[#D1D1D1] rounded p-1 font-mono text-center font-bold"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end p-3 bg-[#F9F9F9] border-t border-[#D1D1D1] gap-2">
                <button onClick={() => setShowDesignPrefsModal(false)} className="bg-[#004A99] text-white text-xs font-bold px-4 py-1.5 rounded-sm hover:bg-[#003B7A] cursor-pointer">
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. CAD DESKTOP BOTTOM STATUS BAR */}
      <footer id="desktop-status-bar" className="h-6 bg-[#FFFFFF] border-t border-[#D1D1D1] flex items-center justify-between px-3 text-[10px] text-slate-500 font-medium select-none flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-[#004A99] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Ready
          </span>
          <span>Grid Settings: {gridSettings.xSpacing}m x {gridSettings.ySpacing}m ({gridSettings.xLines}x{gridSettings.yLines} Nodes)</span>
          <span>Active Load Case: <strong className="text-slate-700">{loadCases.find(lc => lc.id === activeLoadCaseId)?.name}</strong></span>
          {results.isAnalyzed && (
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.2 border border-emerald-300 rounded-sm">
              ✔ STATE SOLVED
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-slate-500">
          <span>Osnap: END, MID, GRID</span>
          <span className="bg-[#EAEAEA] text-slate-700 px-1.5 py-0.2 border border-[#C5C5C5]">2D-XZ Plane</span>
          <span className="bg-[#EAEAEA] text-slate-700 px-1.5 py-0.2 border border-[#C5C5C5]">METRIC</span>
        </div>
      </footer>
    </div>
  );
}

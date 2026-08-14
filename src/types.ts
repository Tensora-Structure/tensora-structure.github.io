export type SupportType = 'Free' | 'Pinned' | 'Fixed' | 'RollerX' | 'RollerY';

export interface JointLoad {
  fx: number; // kN
  fy: number; // kN
  mz: number; // kNm
  loadCaseId: string;
}

export interface Joint {
  id: string;
  x: number; // meters
  y: number; // meters
  z?: number; // meters (optional for 3D coordinates, defaults to 0)
  support: SupportType;
  loads: JointLoad[];
}

export type FrameType = 'Beam' | 'Column' | 'Brace';

export interface FrameLoad {
  id: string;
  type: 'UDL' | 'Point'; // Uniformly Distributed Load (kN/m) or Point Load (kN)
  direction: 'GlobalY' | 'LocalY' | 'GlobalX';
  value: number; // positive is downwards for Y, rightwards for X
  offset?: number; // relative position along member [0, 1] for point load
  loadCaseId: string;
}

export interface SlabLoad {
  id: string;
  type: 'UDL'; // Area load (kN/m²)
  value: number;
  loadCaseId: string;
}

export interface Slab {
  id: string;
  nodeIds: string[]; // Ordered list of Joint IDs forming the perimeter
  sectionId: string;
  loads: SlabLoad[];
}

export interface Frame {
  id: string;
  nodeI: string; // Joint ID
  nodeJ: string; // Joint ID
  type: FrameType;
  sectionId: string; // Section ID
  loads: FrameLoad[];
}

export interface Material {
  id: string;
  name: string;
  type: 'Concrete' | 'Steel';
  E: number; // Young's modulus in GPa (e.g., 200 for steel, 30 for concrete)
  unitWeight: number; // Unit Weight in kN/m³ (e.g., 78.5 for steel, 25 for concrete)
  f_yield_or_c: number; // Yield strength (Fy) for steel or compressive strength (f'c) for concrete in MPa
}

export interface Section {
  id: string;
  name: string;
  materialId: string;
  shape: 'Rectangular' | 'Circular' | 'I-Shape' | 'Slab';
  // Rectangular: width = b, depth = h
  // Circular: depth = diameter
  // I-Shape: depth = overall height, width = flange width, webThickness = tw, flangeThickness = tf
  width: number; // meters
  depth: number; // meters
  webThickness?: number; // meters (tw)
  flangeThickness?: number; // meters (tf)
}

export interface LoadCase {
  id: string;
  name: string;
  type: 'Dead' | 'Live' | 'Wind' | 'Quake';
  selfWeightMultiplier: number; // e.g. 1.0 for Dead, 0 for others
}

export interface LoadCombination {
  id: string;
  name: string;
  factors: Record<string, number>; // loadCaseId -> scale factor
}

export interface FrameStationResult {
  x: number; // position from nodeI along member length (m)
  axial: number; // kN
  shear: number; // kN
  moment: number; // kNm
  deflection: number; // mm (local perpendicular deflection)
}

export interface FrameDesignResult {
  ratio: number; // Unity check ratio (demand / capacity)
  status: 'Pass' | 'Fail';
  governingForce: 'Bending' | 'Shear' | 'Axial' | 'Combined';
  capacityValue: number; // kN or kNm capacity
  demandValue: number; // kN or kNm design force
  detail: string; // design check details (e.g., "IS 800 Cl. 9.3 bending/combined capacity")
  
  ptRequired?: number; // % tension steel required
  astRequired?: number; // mm² tension steel required
  ptProvided?: number; // % tension steel provided
  astProvided?: number; // mm² tension steel provided
  mainBarsText?: string; // e.g., "3-16Φ"
  shearStirrupsText?: string; // e.g., "2-leg 8Φ @ 150 c/c"
  isConcrete?: boolean;
  sectionClass?: string; // "Singly Reinforced", "Doubly Reinforced", "Over Reinforced (Fails Limit State)"

  // Detailed RC Design Output (ETABS-style)
  astTopLeft?: number;
  astBotLeft?: number;
  astTopMid?: number;
  astBotMid?: number;
  astTopRight?: number;
  astBotRight?: number;
  
  astTotal?: number; // For columns
}

export interface FrameForcesResult {
  frameId: string;
  stations: FrameStationResult[];
  maxAxial: number;
  maxShear: number;
  maxMoment: number;
  maxDeflection: number;
  design?: FrameDesignResult;
}

export interface JointDisplacementResult {
  dx: number; // mm
  dy: number; // mm
  rz: number; // rad
}

export interface JointReactionResult {
  fx: number; // kN
  fy: number; // kN
  mz: number; // kNm
}

export interface AnalysisResults {
  isAnalyzed: boolean;
  selectedCombinationId: string;
  displacements: Record<string, JointDisplacementResult>; // jointId -> displacements
  reactions: Record<string, JointReactionResult>; // jointId -> reactions
  frameForces: Record<string, FrameForcesResult>; // frameId -> internal force stations
  error?: string;
}

export type DrawingMode =
  | 'Select'
  | 'AddJoint'
  | 'AddBeam'
  | 'AddColumn'
  | 'AddSlab'
  | 'AssignSupport'
  | 'AssignJointLoad'
  | 'AssignMemberLoad'
  | 'AssignSlabLoad'
  | 'Delete';

export type SteelCode =
  | 'IS 800 (India) - Recommended'
  | 'IS 800 (India) - Tata Steel Section Standard'
  | 'IS 800 (India) - Jindal Steel Section Standard'
  | 'IS 800 (India) - Limit State Design'
  | 'IS 800 (India) - Working Stress Design';

export type ConcreteCode =
  | 'IS 456 (India) - Recommended'
  | 'IS 456 (India) - Limit State Design'
  | 'IS 456 (India) - Working Stress Design';

export type ViewMode =
  | 'Model'
  | 'Extruded'
  | 'Deflection'
  | 'Axial'
  | 'Shear'
  | 'Moment'
  | 'Design';

export interface GridSettings {
  xSpacing: number; // grid lines spacing in X (m)
  xLines: number; // number of grid lines in X
  ySpacing: number; // grid lines spacing in Y (m)
  yLines: number; // number of grid lines in Y
}

export interface RCDesignSpecs {
  concreteGrade: number; // e.g. 25 for M25
  steelGrade: number;    // e.g. 500 for Fe500
  clearCoverBeam: number; // mm
  clearCoverColumn: number; // mm
  mainBarDiaBeam: number; // mm
  mainBarDiaColumn: number; // mm
  stirrupDia: number; // mm
  stirrupLegs: number; // 2 or 4
}

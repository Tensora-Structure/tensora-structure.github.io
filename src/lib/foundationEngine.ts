import { Joint, Frame, AnalysisResults } from '../types';

export interface FootingDesign {
  jointId: string;
  x: number;
  z: number;
  P: number; // kN
  Pu: number; // kN
  A_req: number; // m²
  sideRounded: number; // m
  area: number; // m²
  actualPressure: number; // kN/m²
  sbcStatus: 'PASS' | 'FAIL';
  astRequired: number; // mm²
  spacingRounded: number; // mm
  punchingStress: number; // MPa
  concreteVol: number; // m³
  steelWeight: number; // kg
}

export interface StripFootingDesign {
  id: string;
  joints: string[]; // member support joints included
  length: number; // m
  P_total: number; // kN
  Pu_total: number; // kN
  widthRequired: number; // m
  widthProvided: number; // m
  area: number; // m²
  actualPressure: number; // kN/m²
  sbcStatus: 'PASS' | 'FAIL';
  D_mm: number; // mm
  d_eff_mm: number; // mm
  astTransverse: number; // mm²/m
  spacingTransverse: number; // mm
  punchingStress: number; // MPa
  concreteVol: number; // m³
  steelWeight: number; // kg
}

export interface RaftFootingDesign {
  length: number; // m (along X)
  width: number; // m (along Z)
  area: number; // m²
  P_total: number; // kN
  Pu_total: number; // kN
  actualPressure: number; // kN/m²
  sbcStatus: 'PASS' | 'FAIL';
  D_mm: number; // mm
  d_eff_mm: number; // mm
  astRequiredDir1: number; // mm²/m
  astRequiredDir2: number; // mm²/m
  spacingDir1: number; // mm
  spacingDir2: number; // mm
  concreteVol: number; // m³
  steelWeight: number; // kg
}

export interface FoundationReport {
  selectedType: 'Isolated' | 'Strip' | 'Raft' | 'Pile';
  autoType: 'Isolated' | 'Strip' | 'Raft' | 'Pile';
  reasoning: string;
  isolated: {
    designs: FootingDesign[];
    criticalDesign: FootingDesign;
    totalConcreteVol: number;
    totalSteelWeight: number;
  };
  strip: {
    designs: StripFootingDesign[];
    totalConcreteVol: number;
    totalSteelWeight: number;
  };
  raft: RaftFootingDesign;
  pile: {
    message: string;
  };
}

export function calculateFoundationDesign(
  joints: Joint[],
  frames: Frame[],
  results: AnalysisResults,
  footingP: number, // column axial load default fallback
  footingSbc: number, // Soil Bearing Capacity in kN/m²
  footingConcreteGrade: number, // fck (e.g. 25 for M25)
  footingRebarDia: number, // mm
  footingDepth: number, // thickness D in mm
  forcedType: string, // 'Auto' | 'Isolated' | 'Strip' | 'Raft' | 'Pile'
  isolatedWidthManual?: number,
  stripWidthManual?: number,
  raftLengthManual?: number,
  raftWidthManual?: number
): FoundationReport {
  
  // 1. Identify support joints (bases)
  const supportJoints = joints.filter((j) => j.support && j.support !== 'Free');
  const numSupports = Math.max(1, supportJoints.length);

  // 2. Determine loads at each support
  // Map each support joint to its reaction or estimate
  const individualLoads: Record<string, number> = {};
  supportJoints.forEach((j) => {
    let P = footingP;
    if (results.isAnalyzed && results.reactions[j.id]) {
      P = Math.max(25.0, Math.abs(results.reactions[j.id].fy));
    } else {
      // Estimate load based on tributary location if not analyzed
      const xs = supportJoints.map((s) => s.x);
      const zs = supportJoints.map((s) => s.z || 0);
      if (xs.length > 1) {
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minZ = Math.min(...zs), maxZ = Math.max(...zs);
        const isMinX = Math.abs(j.x - minX) < 0.05;
        const isMaxX = Math.abs(j.x - maxX) < 0.05;
        const isMinZ = Math.abs((j.z || 0) - minZ) < 0.05;
        const isMaxZ = Math.abs((j.z || 0) - maxZ) < 0.05;

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
    individualLoads[j.id] = P;
  });

  // Calculate isolated footing for each support
  const isolatedDesigns: FootingDesign[] = supportJoints.map((j) => {
    const P = individualLoads[j.id] || footingP;
    const Pu = 1.5 * P;
    const A_req = (1.1 * P) / footingSbc; // include 10% self-weight
    let side = Math.sqrt(A_req);
    let sideRounded = (isolatedWidthManual && isolatedWidthManual > 0)
      ? isolatedWidthManual
      : Math.max(1.0, Math.ceil(side * 10) / 10); // multiple of 100mm, min 1.0m
    const area = sideRounded * sideRounded;
    const actualPressure = P / area;
    const sbcStatus = actualPressure <= footingSbc ? 'PASS' : 'FAIL';

    // Bending design at column face (assumed column size 0.23m)
    const fck = footingConcreteGrade;
    const fy = 500;
    const qu = Pu / area;
    const projection = (sideRounded - 0.23) / 2;
    const Mu = (qu * projection * projection) / 2; // kNm per meter strip

    const b = 1000; // 1m strip
    const d_eff = footingDepth - 56; // 50mm clear cover + 6mm bar radius
    let astRequired = 0;
    const term = 1 - (4.6 * Mu * 1e6) / (fck * b * d_eff * d_eff);
    if (term > 0) {
      astRequired = (0.5 * fck * b * d_eff / fy) * (1 - Math.sqrt(term));
    }
    const minAst = 0.0012 * b * footingDepth; // 0.12% gross area (IS 456)
    if (astRequired < minAst) {
      astRequired = minAst;
    }

    // Two-way Punching shear check at d/2 from column face
    const colSize = 0.23; // 230mm x 230mm
    const critSide = colSize + d_eff / 1000;
    const criticalArea = critSide * critSide;
    const punchingForce = Pu * (1 - (area > 0 ? (criticalArea / area) : 0));
    const punchingPerimeter = 4 * critSide * 1000; // mm
    const punchingStress = (punchingForce * 1000) / (punchingPerimeter * d_eff); // MPa

    const barArea = (Math.PI * footingRebarDia * footingRebarDia) / 4;
    const spacingCalculated = (barArea * 1000) / (astRequired / sideRounded); // spacing based on total ast across footing
    const spacingRounded = Math.min(300, Math.max(100, Math.floor((barArea * 1000 / astRequired) / 25) * 25));

    // Steel Weight: two-way bottom reinforcement mesh
    const numBars = Math.ceil((sideRounded * 1000) / spacingRounded) + 1;
    const lenBar = sideRounded - 0.1 + 0.3; // length - cover + hooks
    const barWeightPerM = (footingRebarDia * footingRebarDia) / 162.2;
    const steelWeight = 2 * numBars * lenBar * barWeightPerM;

    return {
      jointId: j.id,
      x: j.x,
      z: j.z || 0,
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
      steelWeight,
    };
  });

  // Critical design (one with maximum load)
  const criticalDesign = isolatedDesigns.length > 0 
    ? [...isolatedDesigns].sort((a, b) => b.P - a.P)[0]
    : {
        jointId: 'J1',
        x: 0,
        z: 0,
        P: footingP,
        Pu: 1.5 * footingP,
        A_req: (1.1 * footingP) / footingSbc,
        sideRounded: 1.5,
        area: 2.25,
        actualPressure: footingP / 2.25,
        sbcStatus: 'PASS' as const,
        astRequired: 0.0012 * 1000 * footingDepth,
        spacingRounded: 150,
        punchingStress: 0.1,
        concreteVol: 2.25 * (footingDepth / 1000),
        steelWeight: 15,
      };

  const totalIsolatedConcreteVol = isolatedDesigns.reduce((sum, fd) => sum + fd.concreteVol, 0);
  const totalIsolatedSteelWeight = isolatedDesigns.reduce((sum, fd) => sum + fd.steelWeight, 0);

  // --- 2. STRIP FOOTING DESIGN ---
  // In Strip Footing, adjacent columns are connected continuously.
  // Let's group support joints by their alignment line.
  // For simplicity, we can group supports along the Z line (if X is similar) or X line (if Z is similar).
  // Let's identify lines of columns. We'll group them if they share close X coordinates (diff < 0.2m).
  const xGroups: Record<string, Joint[]> = {};
  supportJoints.forEach((j) => {
    const roundedX = Math.round(j.x * 5) / 5; // group by 200mm bin
    const key = `X_${roundedX.toFixed(1)}`;
    if (!xGroups[key]) xGroups[key] = [];
    xGroups[key].push(j);
  });

  const stripDesigns: StripFootingDesign[] = Object.keys(xGroups).map((key, idx) => {
    const group = xGroups[key];
    const zs = group.map((j) => j.z || 0);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const length = Math.max(1.5, (maxZ - minZ) + 1.0); // column spacing plus 0.5m offset on both sides

    const P_total = group.reduce((sum, j) => sum + (individualLoads[j.id] || footingP), 0);
    const Pu_total = 1.5 * P_total;

    // Required width of strip footing
    const widthRequired = (1.1 * P_total) / (length * footingSbc);
    const widthProvided = (stripWidthManual && stripWidthManual > 0)
      ? stripWidthManual
      : Math.max(1.0, Math.ceil(widthRequired * 10) / 10);
    const area = length * widthProvided;
    const actualPressure = P_total / area;
    const sbcStatus = actualPressure <= footingSbc ? 'PASS' : 'FAIL';

    // Transverse bending (cantilever strip)
    const qu = Pu_total / area;
    const projection = (widthProvided - 0.23) / 2;
    const Mu_trans = (qu * projection * projection) / 2; // kNm per meter strip length

    const b = 1000; // 1m design width
    const d_eff = footingDepth - 56;
    const fck = footingConcreteGrade;
    const fy = 500;
    let astTransverse = 0;
    const term = 1 - (4.6 * Mu_trans * 1e6) / (fck * b * d_eff * d_eff);
    if (term > 0) {
      astTransverse = (0.5 * fck * b * d_eff / fy) * (1 - Math.sqrt(term));
    }
    const minAst = 0.0012 * b * footingDepth;
    if (astTransverse < minAst) {
      astTransverse = minAst;
    }

    const barArea = (Math.PI * footingRebarDia * footingRebarDia) / 4;
    const spacingTransverse = Math.min(300, Math.max(100, Math.floor((barArea * 1000 / astTransverse) / 25) * 25));

    // Punching shear for strip is typically one-way shear (critical section at d)
    // One-way shear force: V_u = qu * (projection - d_eff/1000)
    const oneWayShearForce = qu * Math.max(0.1, projection - d_eff / 1000); // kN/m
    const punchingStress = (oneWayShearForce * 1000) / (b * d_eff); // MPa (acting as shear stress indicator)

    const concreteVol = area * (footingDepth / 1000);
    // Steel Weight: Transverse bars + longitudinal distribution bars (assume 6 lines of T12)
    const numTransverseBars = Math.ceil((length * 1000) / spacingTransverse) + 1;
    const barWeightPerM = (footingRebarDia * footingRebarDia) / 162.2;
    const transSteel = numTransverseBars * (widthProvided - 0.1 + 0.3) * barWeightPerM;
    const longSteel = 6 * (length - 0.1 + 0.3) * barWeightPerM;
    const steelWeight = transSteel + longSteel;

    return {
      id: `SF${idx + 1}`,
      joints: group.map((j) => j.id),
      length,
      P_total,
      Pu_total,
      widthRequired,
      widthProvided,
      area,
      actualPressure,
      sbcStatus,
      D_mm: footingDepth,
      d_eff_mm: d_eff,
      astTransverse,
      spacingTransverse,
      punchingStress,
      concreteVol,
      steelWeight,
    };
  });

  const totalStripConcreteVol = stripDesigns.reduce((sum, sd) => sum + sd.concreteVol, 0);
  const totalStripSteelWeight = stripDesigns.reduce((sum, sd) => sum + sd.steelWeight, 0);

  // --- 3. RAFT FOUNDATION DESIGN ---
  // Raft covers the entire footprint enclosing all support joints
  const xs = supportJoints.map((j) => j.x);
  const zs = supportJoints.map((j) => j.z || 0);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 3.0);
  const minZ = Math.min(...zs, 0);
  const maxZ = Math.max(...zs, 3.0);

  const raftLength = (raftLengthManual && raftLengthManual > 0)
    ? raftLengthManual
    : (maxX - minX) + 1.2; // 0.6m offset on both sides
  const raftWidth = (raftWidthManual && raftWidthManual > 0)
    ? raftWidthManual
    : (maxZ - minZ) + 1.2;
  const raftArea = raftLength * raftWidth;

  const P_total_raft = supportJoints.reduce((sum, j) => sum + (individualLoads[j.id] || footingP), 0);
  const Pu_total_raft = 1.5 * P_total_raft;
  const raftPressure = P_total_raft / raftArea;
  const raftSbcStatus = raftPressure <= footingSbc ? 'PASS' : 'FAIL';

  // Raft thickness typically larger for punching shear resistance
  const raftD_mm = Math.max(450, footingDepth + 100); // thicker for mat
  const raft_d_eff = raftD_mm - 60; // 50mm clear cover + 10mm bar radius (usually larger bars T16 or T12)
  const fck_raft = footingConcreteGrade;
  
  // Design as two-way slab under soil pressure
  const qu_raft = Pu_total_raft / raftArea;
  // Bending moment approximation in strip: M_u = qu * L_span^2 / 10 (span around 3.5m)
  const span_est = Math.max(2.5, Math.min(raftLength, raftWidth) / 2);
  const Mu_raft = (qu_raft * span_est * span_est) / 10; // kNm/m

  const b_raft = 1000;
  const fy = 500;
  let astRequiredRaft = 0;
  const raftTerm = 1 - (4.6 * Mu_raft * 1e6) / (fck_raft * b_raft * raft_d_eff * raft_d_eff);
  if (raftTerm > 0) {
    astRequiredRaft = (0.5 * fck_raft * b_raft * raft_d_eff / fy) * (1 - Math.sqrt(raftTerm));
  }
  const minAstRaft = 0.0012 * b_raft * raftD_mm; // 0.12% gross area
  const finalAstRaft = Math.max(astRequiredRaft, minAstRaft);

  // Spacing
  const raftBarDia = Math.max(12, footingRebarDia);
  const raftBarArea = (Math.PI * raftBarDia * raftBarDia) / 4;
  const spacingRaft = Math.min(300, Math.max(100, Math.floor((raftBarArea * 1000 / finalAstRaft) / 25) * 25));

  const raftConcreteVol = raftArea * (raftD_mm / 1000);
  // Steel Weight: Dual meshes (Top and Bottom) in both directions
  const numBarsDir1 = Math.ceil((raftWidth * 1000) / spacingRaft) + 1;
  const numBarsDir2 = Math.ceil((raftLength * 1000) / spacingRaft) + 1;
  const raftBarWt = (raftBarDia * raftBarDia) / 162.2;
  const singleMeshWt = (numBarsDir1 * raftLength * raftBarWt) + (numBarsDir2 * raftWidth * raftBarWt);
  const raftSteelWeight = 2 * singleMeshWt; // top + bottom mesh

  const raftDesign: RaftFootingDesign = {
    length: raftLength,
    width: raftWidth,
    area: raftArea,
    P_total: P_total_raft,
    Pu_total: Pu_total_raft,
    actualPressure: raftPressure,
    sbcStatus: raftSbcStatus,
    D_mm: raftD_mm,
    d_eff_mm: raft_d_eff,
    astRequiredDir1: finalAstRaft,
    astRequiredDir2: finalAstRaft,
    spacingDir1: spacingRaft,
    spacingDir2: spacingRaft,
    concreteVol: raftConcreteVol,
    steelWeight: raftSteelWeight,
  };

  // --- 4. AUTO-DETERMINATION SELECTION ALGORITHM ---
  // We check candidates in order of preference: Isolated -> Strip -> Raft -> Pile
  let autoSelectedType: 'Isolated' | 'Strip' | 'Raft' | 'Pile' = 'Isolated';
  let reasoning = '';

  // Calculate sum of required isolated footing widths to check for crowding
  const totalIsolatedAreaRequired = isolatedDesigns.reduce((sum, d) => sum + d.A_req, 0);
  const footprintArea = raftLength * raftWidth;
  const areaRatio = totalIsolatedAreaRequired / footprintArea;

  // Spacing check: check if any adjacent support columns are closer than 2.8 meters
  let columnsVeryClose = false;
  if (supportJoints.length > 1) {
    for (let i = 0; i < supportJoints.length; i++) {
      for (let j = i + 1; j < supportJoints.length; j++) {
        const j1 = supportJoints[i];
        const j2 = supportJoints[j];
        const dist = Math.sqrt(Math.pow(j1.x - j2.x, 2) + Math.pow((j1.z || 0) - (j2.z || 0), 2));
        if (dist > 0.05 && dist < 2.5) {
          columnsVeryClose = true;
          break;
        }
      }
    }
  }

  if (footingSbc < 75) {
    autoSelectedType = 'Pile';
    reasoning = `Selected Pile Foundation under IS 2911 as Soil SBC is very poor (${footingSbc} kN/m² < 75 kN/m²), which cannot safely support shallow footing without extreme settlement risks.`;
  } else if (footingSbc < 100 || areaRatio > 0.65) {
    autoSelectedType = 'Raft';
    reasoning = `Selected Raft (Mat) Foundation under IS 1904. Soil safe bearing capacity is poor (${footingSbc} kN/m²) and/or total required isolated footing area covers ${Math.round(areaRatio * 100)}% (> 65%) of the building plan area, making isolated bases overlap extensively.`;
  } else if (columnsVeryClose || areaRatio > 0.40 || footingSbc < 125) {
    autoSelectedType = 'Strip';
    reasoning = `Selected Continuous Strip Footing under IS 456 Cl. 34. Individual footings would overlap because column spacing is tight (< 2.5m) and/or total required footing area is ${Math.round(areaRatio * 100)}% of plan area. Continuous strip ties columns together, providing superior differential settlement resistance.`;
  } else {
    autoSelectedType = 'Isolated';
    reasoning = `Selected Isolated Column Footings under IS 456. Soil safe bearing capacity is good (${footingSbc} kN/m² >= 120 kN/m²) and column loads are moderate. Total required footing footprint is only ${Math.round(areaRatio * 100)}% (< 40%) of plan area. This is the most economical solution.`;
  }

  // Set the final selected type based on user override
  let finalSelectedType = autoSelectedType;
  if (forcedType !== 'Auto') {
    finalSelectedType = forcedType as any;
  }

  return {
    selectedType: finalSelectedType,
    autoType: autoSelectedType,
    reasoning,
    isolated: {
      designs: isolatedDesigns,
      criticalDesign,
      totalConcreteVol: totalIsolatedConcreteVol,
      totalSteelWeight: totalIsolatedSteelWeight,
    },
    strip: {
      designs: stripDesigns,
      totalConcreteVol: totalStripConcreteVol,
      totalSteelWeight: totalStripSteelWeight,
    },
    raft: raftDesign,
    pile: {
      message: `Deep Pile Foundation is chosen based on soil/design criteria. Bored cast-in-situ reinforced concrete piles conforming to IS 2911 (Part 1/Sec 2) are recommended. Piles should be driven to reach hard bedrock or compact bearing stratum to transfer structural axial load ${footingP} kN per column. Pile caps shall be provided at the column bases to tie piles together. No shallow settlement calculations are provided.`,
    },
  };
}

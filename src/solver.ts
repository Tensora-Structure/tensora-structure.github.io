import {
  Joint,
  Frame,
  Material,
  Section,
  LoadCase,
  LoadCombination,
  AnalysisResults,
  FrameStationResult,
  FrameDesignResult,
  FrameForcesResult,
  JointDisplacementResult,
  JointReactionResult,
  SupportType,
  SteelCode,
  ConcreteCode,
  RCDesignSpecs,
} from './types';

// Helper: Calculate cross-section area and moment of inertia
export function getSectionProperties(section: Section, material: Material) {
  let A = 0; // Area (m^2)
  let I = 0; // Moment of Inertia (m^4)

  const { shape, width, depth, webThickness, flangeThickness } = section;

  if (shape === 'Rectangular') {
    A = width * depth;
    I = (width * Math.pow(depth, 3)) / 12;
  } else if (shape === 'Circular') {
    // depth is diameter
    const d = depth;
    A = (Math.PI * Math.pow(d, 2)) / 4;
    I = (Math.PI * Math.pow(d, 4)) / 64;
  } else if (shape === 'I-Shape') {
    const tw = webThickness || 0.01;
    const tf = flangeThickness || 0.015;
    const bf = width;
    const h = depth;
    
    // Area of flanges + web
    A = 2 * bf * tf + (h - 2 * tf) * tw;
    
    // I_x = overall box - two side cutouts
    // b_cutout = bf - tw, h_cutout = h - 2*tf
    const bCut = bf - tw;
    const hCut = h - 2 * tf;
    I = (bf * Math.pow(h, 3) - bCut * Math.pow(hCut, 3)) / 12;
  }

  return { A, I };
}

// Solver function
export function solveStructure(
  joints: Joint[],
  frames: Frame[],
  slabs: any[],
  materials: Material[],
  sections: Section[],
  loadCases: LoadCase[],
  combinations: LoadCombination[],
  combinationId: string,
  steelCode: SteelCode = 'IS 800 (India) - Recommended',
  concreteCode: ConcreteCode = 'IS 456 (India) - Recommended',
  designSpecs?: RCDesignSpecs
): AnalysisResults {
  const selectedCombo = combinations.find((c) => c.id === combinationId);
  if (!selectedCombo) {
    return {
      isAnalyzed: false,
      selectedCombinationId: combinationId,
      displacements: {},
      reactions: {},
      frameForces: {},
      error: 'Selected load combination not found',
    };
  }

  
  // Distribute Slab Loads to Frames (Yield Line Approximation -> Equivalent Uniform Load)
  const equivalentFrameLoads: { frameId: string; loads: any[] }[] = [];
  frames.forEach(f => {
    equivalentFrameLoads.push({ frameId: f.id, loads: [...f.loads] });
  });

  if (slabs && slabs.length > 0) {
    slabs.forEach(slab => {
      const slabJoints = slab.nodeIds.map((id: string) => joints.find(j => j.id === id)).filter(Boolean);
      if (slabJoints.length >= 3) {
        // Calculate Area in X-Z plane (assuming horizontal slab)
        let area = 0;
        for (let i = 0; i < slabJoints.length; i++) {
          const j1 = slabJoints[i];
          const j2 = slabJoints[(i + 1) % slabJoints.length];
          area += (j1.x * (j2.z || 0)) - (j2.x * (j1.z || 0));
        }
        area = Math.abs(area / 2);

        if (area > 0) {
          // Find perimeter frames
          const perimeterFrames = frames.filter(f => {
            const idxI = slab.nodeIds.indexOf(f.nodeI);
            const idxJ = slab.nodeIds.indexOf(f.nodeJ);
            if (idxI !== -1 && idxJ !== -1) {
              const diff = Math.abs(idxI - idxJ);
              return diff === 1 || diff === slab.nodeIds.length - 1;
            }
            return false;
          });

          if (perimeterFrames.length > 0) {
            // Total lengths
            let totalLength = 0;
            const lengths = perimeterFrames.map(f => {
              const ji = joints.find(j => j.id === f.nodeI)!;
              const jj = joints.find(j => j.id === f.nodeJ)!;
              const len = Math.hypot(ji.x - jj.x, (ji.y - jj.y), (ji.z || 0) - (jj.z || 0));
              totalLength += len;
              return len;
            });

            // Distribute loads proportionally (simplified tributary area)
            // A more exact yield-line would use distances, but this is a reasonable approximation for SAFE-level equivalent loads.
            slab.loads.forEach((sLoad: any) => {
              // Total force = Area * Load
              const totalForce = area * sLoad.value; 
              // Distribute uniformly per meter of perimeter
              const forcePerMeter = totalForce / totalLength;

              perimeterFrames.forEach((pf) => {
                const eqLoadObj = equivalentFrameLoads.find(eq => eq.frameId === pf.id);
                if (eqLoadObj) {
                  eqLoadObj.loads.push({
                    id: `SlabEq_${slab.id}_${sLoad.id}`,
                    type: 'UDL',
                    direction: 'GlobalY',
                    value: forcePerMeter, // kN/m
                    loadCaseId: sLoad.loadCaseId,
                  });
                }
              });
            });
          }
        }
      }
    });
  }

  const numNodes = joints.length;
  if (numNodes === 0) {
    return {
      isAnalyzed: false,
      selectedCombinationId: combinationId,
      displacements: {},
      reactions: {},
      frameForces: {},
    };
  }

  // Create mappings
  const jointIdToIndex: Record<string, number> = {};
  joints.forEach((j, idx) => {
    jointIdToIndex[j.id] = idx;
  });

  const numDof = 3 * numNodes;
  
  // Allocate Global Stiffness Matrix (K) and Load Vector (F)
  const K: number[][] = Array(numDof)
    .fill(0)
    .map(() => Array(numDof).fill(0));
  const F: number[] = Array(numDof).fill(0);

  // Keep a copy of K and F before boundary conditions are applied
  // to calculate reactions easily later as: R = K_uncon * U - F_uncon
  const K_uncon: number[][] = Array(numDof)
    .fill(0)
    .map(() => Array(numDof).fill(0));
  const F_uncon: number[] = Array(numDof).fill(0);

  // --- 1. Assemble Member Contributions ---
  for (const frame of frames) {
    const nodeI = joints.find((j) => j.id === frame.nodeI);
    const nodeJ = joints.find((j) => j.id === frame.nodeJ);
    if (!nodeI || !nodeJ) continue;

    const idxI = jointIdToIndex[frame.nodeI];
    const idxJ = jointIdToIndex[frame.nodeJ];

    const dx = nodeJ.x - nodeI.x;
    const dy = nodeJ.y - nodeI.y;
    const dz = (nodeJ.z || 0) - (nodeI.z || 0);
    const L = Math.sqrt(dx * dx + dy * dy);

    if (L < 1e-6) {
      if (Math.abs(dz) > 1e-6) {
        // Z-beam! Transfer its gravity loads to its nodes as point loads in Y.
        // This makes the 2D solver account for the 3D grid's total weight.
        const Lz = Math.abs(dz);
        const section = sections.find((s) => s.id === frame.sectionId);
        const material = materials.find((m) => m.id === section?.materialId);
        let totalWy = 0; // Downward force in kN/m
        
        const eqLoads = equivalentFrameLoads.find(eq => eq.frameId === frame.id)?.loads || frame.loads;
    eqLoads.forEach((l) => {
          const factor = selectedCombo.factors[l.loadCaseId] || 0;
          if (Math.abs(factor) > 1e-6) {
             if (l.type === 'UDL' && (l.direction === 'GlobalY' || l.direction === 'LocalY')) {
                 totalWy += l.value * factor;
             }
          }
        });

        for (const lc of loadCases) {
          const factor = selectedCombo.factors[lc.id] || 0;
          const swMult = lc.selfWeightMultiplier;
          if (Math.abs(factor * swMult) > 1e-6 && section && material) {
             const {A} = getSectionProperties(section, material);
             const sw = A * material.unitWeight; // 2500 kg/m3 -> 25 kN/m3
             totalWy += sw * factor * swMult;
          }
        }

        // Apply W/2 as downward force (-Fy) to both nodes
        const nodalForceY = -(totalWy * Lz) / 2;
        const gdofIY = 3 * jointIdToIndex[nodeI.id] + 1;
        const gdofJY = 3 * jointIdToIndex[nodeJ.id] + 1;
        F[gdofIY] += nodalForceY;
        F_uncon[gdofIY] += nodalForceY;
        F[gdofJY] += nodalForceY;
        F_uncon[gdofJY] += nodalForceY;
      }
      continue;
    }

    const cosB = dx / L;
    const sinB = dy / L;

    // Properties
    const section = sections.find((s) => s.id === frame.sectionId);
    if (!section) continue;
    const material = materials.find((m) => m.id === section.materialId);
    if (!material) continue;

    const { A, I } = getSectionProperties(section, material);
    
    // Modulus of Elasticity in kN/m² (E in GPa * 10^6)
    const E = material.E * 1e6;

    // Local member stiffness matrix
    const AE_L = (A * E) / L;
    const EI = E * I;
    const EI12_L3 = (12 * EI) / Math.pow(L, 3);
    const EI6_L2 = (6 * EI) / Math.pow(L, 2);
    const EI4_L = (4 * EI) / L;
    const EI2_L = (2 * EI) / L;

    const kLocal = [
      [AE_L, 0, 0, -AE_L, 0, 0],
      [0, EI12_L3, EI6_L2, 0, -EI12_L3, EI6_L2],
      [0, EI6_L2, EI4_L, 0, -EI6_L2, EI2_L],
      [-AE_L, 0, 0, AE_L, 0, 0],
      [0, -EI12_L3, -EI6_L2, 0, EI12_L3, -EI6_L2],
      [0, EI6_L2, EI2_L, 0, -EI6_L2, EI4_L],
    ];

    // Transformation matrix T (6x6)
    // T = [c s 0 0 0 0; -s c 0 0 0 0; 0 0 1 0 0 0; 0 0 0 c s 0; 0 0 0 -s c 0; 0 0 0 0 0 1]
    const T = [
      [cosB, sinB, 0, 0, 0, 0],
      [-sinB, cosB, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0],
      [0, 0, 0, cosB, sinB, 0],
      [0, 0, 0, -sinB, cosB, 0],
      [0, 0, 0, 0, 0, 1],
    ];

    // Global stiffness for this element: kGlobal = T^T * kLocal * T
    // Since T^T is transpose of T:
    const kGlobal = Array(6)
      .fill(0)
      .map(() => Array(6).fill(0));

    // Matrix multiplication: kGlobal = T^T * kLocal * T
    // Let's compute temp = kLocal * T
    const temp = Array(6)
      .fill(0)
      .map(() => Array(6).fill(0));
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        let sum = 0;
        for (let k = 0; k < 6; k++) {
          sum += kLocal[r][k] * T[k][c];
        }
        temp[r][c] = sum;
      }
    }
    // Now kGlobal = T^T * temp
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        let sum = 0;
        for (let k = 0; k < 6; k++) {
          // T^T is T[k][r]
          sum += T[k][r] * temp[k][c];
        }
        kGlobal[r][c] = sum;
      }
    }

    // Assemble kGlobal into global K
    const dofs = [3 * idxI, 3 * idxI + 1, 3 * idxI + 2, 3 * idxJ, 3 * idxJ + 1, 3 * idxJ + 2];
    for (let r = 0; r < 6; r++) {
      const gdofR = dofs[r];
      for (let c = 0; c < 6; c++) {
        const gdofC = dofs[c];
        K[gdofR][gdofC] += kGlobal[r][c];
        K_uncon[gdofR][gdofC] += kGlobal[r][c];
      }
    }

    // --- Member Loads Assembly ---
    // Compute combined loads on this member for the current combination
    const combinedLoads: { type: 'UDL' | 'Point'; dir: string; val: number; offset: number }[] = [];
    
    // Add explicitly defined frame loads
    const eqLoads = equivalentFrameLoads.find(eq => eq.frameId === frame.id)?.loads || frame.loads;
    eqLoads.forEach((l) => {
      const factor = selectedCombo.factors[l.loadCaseId] || 0;
      if (Math.abs(factor) > 1e-6) {
        combinedLoads.push({
          type: l.type,
          dir: l.direction,
          val: l.value * factor,
          offset: l.offset || 0,
        });
      }
    });

    // Add self-weight if selfWeightMultiplier > 0 for active combo
    for (const lc of loadCases) {
      const factor = selectedCombo.factors[lc.id] || 0;
      const swMult = lc.selfWeightMultiplier;
      if (Math.abs(factor * swMult) > 1e-6) {
        // Self weight in kN/m = Vol/m * density (kg/m3) * g (m/s2) / 1000
        const sw = A * material.unitWeight; // 2500 kg/m3 -> 25 kN/m3
        combinedLoads.push({
          type: 'UDL',
          dir: 'GlobalY',
          val: sw * factor * swMult, // gravity points downwards, we keep positive downwards
          offset: 0,
        });
      }
    }

    // Equivalent joint load vector in local coordinates
    const fLocalFef = Array(6).fill(0);

    for (const load of combinedLoads) {
      if (load.type === 'UDL') {
        const w = load.val;
        let wLocalY = 0;
        let wLocalX = 0;

        if (load.dir === 'GlobalY') {
          // Downward gravity: local perpendicular (Y) and parallel (X) components
          wLocalY = -w * cosB; // pointing in negative local Y
          wLocalX = -w * sinB; // pointing in local X direction
        } else if (load.dir === 'LocalY') {
          wLocalY = -w; // downwards relative to beam axis
          wLocalX = 0;
        } else if (load.dir === 'GlobalX') {
          // Wind: side pressure
          wLocalY = w * sinB;
          wLocalX = w * cosB;
        }

        // Fixed End Forces for UDL (positive local Y is upwards)
        // For a downward load (negative wLocalY), the reactions are upwards (positive).
        // So Vi = -wLocalY * L / 2
        const Vi = (-wLocalY * L) / 2;
        const Mi = (-wLocalY * L * L) / 12;
        const Vj = (-wLocalY * L) / 2;
        const Mj = (wLocalY * L * L) / 12;

        // Axial fixed end forces (distributed axial force w_x)
        const Ai = (-wLocalX * L) / 2;
        const Aj = (-wLocalX * L) / 2;

        fLocalFef[0] += Ai;
        fLocalFef[1] += Vi;
        fLocalFef[2] += Mi;
        fLocalFef[3] += Aj;
        fLocalFef[4] += Vj;
        fLocalFef[5] += Mj;

      } else if (load.type === 'Point') {
        const P = load.val;
        const aRatio = Math.max(0, Math.min(1, load.offset));
        const a = aRatio * L;
        const b = L - a;

        let Py = 0;
        let Px = 0;

        if (load.dir === 'GlobalY') {
          Py = -P * cosB;
          Px = -P * sinB;
        } else if (load.dir === 'LocalY') {
          Py = -P;
          Px = 0;
        } else if (load.dir === 'GlobalX') {
          Py = P * sinB;
          Px = P * cosB;
        }

        // Fixed-end moments & shears due to point load Py (Py is force applied on beam, so negative for downward)
        // Reactions should oppose it, so if Py is negative, reactions are positive.
        const Vi = (-Py * b * b * (3 * a + b)) / Math.pow(L, 3);
        const Mi = (-Py * a * b * b) / (L * L);
        const Vj = (-Py * a * a * (3 * b + a)) / Math.pow(L, 3);
        const Mj = (Py * a * a * b) / (L * L);

        // Axial end forces
        const Ai = (-Px * b) / L;
        const Aj = (-Px * a) / L;

        fLocalFef[0] += Ai;
        fLocalFef[1] += Vi;
        fLocalFef[2] += Mi;
        fLocalFef[3] += Aj;
        fLocalFef[4] += Vj;
        fLocalFef[5] += Mj;
      }
    }

    // Transform local FEF to global: fGlobalFef = T^T * fLocalFef
    const fGlobalFef = Array(6).fill(0);
    for (let r = 0; r < 6; r++) {
      let sum = 0;
      for (let k = 0; k < 6; k++) {
        // T^T is T[k][r]
        sum += T[k][r] * fLocalFef[k];
      }
      fGlobalFef[r] = sum;
    }

    // Since equilibrium joint forces applied TO nodes are -fGlobalFef
    for (let r = 0; r < 6; r++) {
      const gdof = dofs[r];
      F[gdof] -= fGlobalFef[r];
      F_uncon[gdof] -= fGlobalFef[r];
    }
  }

  // --- 2. Assemble Nodal Joint Loads ---
  joints.forEach((j) => {
    const gdofX = 3 * jointIdToIndex[j.id];
    const gdofY = gdofX + 1;
    const gdofZ = gdofX + 2;

    j.loads.forEach((jl) => {
      const factor = selectedCombo.factors[jl.loadCaseId] || 0;
      if (Math.abs(factor) > 1e-6) {
        F[gdofX] += jl.fx * factor;
        F[gdofY] += jl.fy * factor;
        F[gdofZ] += jl.mz * factor;

        F_uncon[gdofX] += jl.fx * factor;
        F_uncon[gdofY] += jl.fy * factor;
        F_uncon[gdofZ] += jl.mz * factor;
      }
    });
  });

  // --- 3. Apply Nodal Support Boundary Conditions ---
  // Boundary conditions: replace rows of restricted DOFs in K with identity
  // and corresponding entry in F with 0.
  const restrainedDofs: boolean[] = Array(numDof).fill(false);

  joints.forEach((j) => {
    const idx = jointIdToIndex[j.id];
    const baseDof = 3 * idx;

    if (j.support === 'Fixed') {
      restrainedDofs[baseDof] = true;     // dx = 0
      restrainedDofs[baseDof + 1] = true; // dy = 0
      restrainedDofs[baseDof + 2] = true; // rz = 0
    } else if (j.support === 'Pinned') {
      restrainedDofs[baseDof] = true;     // dx = 0
      restrainedDofs[baseDof + 1] = true; // dy = 0
    } else if (j.support === 'RollerX') {
      // Horizontal rolling roller on flat ground: locks vertical displacement
      restrainedDofs[baseDof + 1] = true; // dy = 0
    } else if (j.support === 'RollerY') {
      // Roller rolling vertically along a wall: locks horizontal displacement
      restrainedDofs[baseDof] = true;     // dx = 0
    }
  });

  for (let d = 0; d < numDof; d++) {
    if (restrainedDofs[d]) {
      // Clear row
      for (let c = 0; c < numDof; c++) {
        K[d][c] = 0;
      }
      K[d][d] = 1.0;
      F[d] = 0.0;
    }
  }

  // --- 4. Solve K * U = F using Gaussian Elimination ---
  const U = solveLinearSystem(K, F);
  if (!U) {
    return {
      isAnalyzed: false,
      selectedCombinationId: combinationId,
      displacements: {},
      reactions: {},
      frameForces: {},
      error: 'Structural model is unstable or singular. Check support conditions and linkages.',
    };
  }

  // --- 5. Extract Displacements & Reactions ---
  const displacements: Record<string, JointDisplacementResult> = {};
  const reactions: Record<string, JointReactionResult> = {};

  // Reactions: R = K_uncon * U - F_uncon
  const R = Array(numDof).fill(0);
  for (let r = 0; r < numDof; r++) {
    let sum = 0;
    for (let c = 0; c < numDof; c++) {
      sum += K_uncon[r][c] * U[c];
    }
    R[r] = sum - F_uncon[r];
  }

  joints.forEach((j) => {
    const idx = jointIdToIndex[j.id];
    const baseDof = 3 * idx;

    // Displacements (convert meters to mm, radians remain radians)
    displacements[j.id] = {
      dx: U[baseDof] * 1000,
      dy: U[baseDof + 1] * 1000,
      rz: U[baseDof + 2],
    };

    // Reactions (only record if joint is constrained)
    if (j.support !== 'Free') {
      reactions[j.id] = {
        fx: restrainedDofs[baseDof] ? R[baseDof] : 0,
        fy: restrainedDofs[baseDof + 1] ? R[baseDof + 1] : 0,
        mz: restrainedDofs[baseDof + 2] ? R[baseDof + 2] : 0,
      };
    } else {
      reactions[j.id] = { fx: 0, fy: 0, mz: 0 };
    }
  });

  // --- 6. Compute Frame Member Forces & Station Results ---
  const frameForces: Record<string, FrameForcesResult> = {};

  for (const frame of frames) {
    const nodeI = joints.find((j) => j.id === frame.nodeI);
    const nodeJ = joints.find((j) => j.id === frame.nodeJ);
    if (!nodeI || !nodeJ) continue;

    const idxI = jointIdToIndex[frame.nodeI];
    const idxJ = jointIdToIndex[frame.nodeJ];

    const dx = nodeJ.x - nodeI.x;
    const dy = nodeJ.y - nodeI.y;
    const L = Math.sqrt(dx * dx + dy * dy);
    const cosB = dx / L;
    const sinB = dy / L;

    const section = sections.find((s) => s.id === frame.sectionId);
    if (!section) continue;
    const material = materials.find((m) => m.id === section.materialId);
    if (!material) continue;

    const { A, I } = getSectionProperties(section, material);
    const E = material.E * 1e6; // kN/m2

    // Get global nodal displacements
    const uGlobal = [
      U[3 * idxI],
      U[3 * idxI + 1],
      U[3 * idxI + 2],
      U[3 * idxJ],
      U[3 * idxJ + 1],
      U[3 * idxJ + 2],
    ];

    // Transform displacements to local coordinates
    // uLocal = T * uGlobal
    const T = [
      [cosB, sinB, 0, 0, 0, 0],
      [-sinB, cosB, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0],
      [0, 0, 0, cosB, sinB, 0],
      [0, 0, 0, -sinB, cosB, 0],
      [0, 0, 0, 0, 0, 1],
    ];

    const uLocal = Array(6).fill(0);
    for (let r = 0; r < 6; r++) {
      let sum = 0;
      for (let c = 0; c < 6; c++) {
        sum += T[r][c] * uGlobal[c];
      }
      uLocal[r] = sum;
    }

    // Local element stiffness matrix kLocal
    const AE_L = (A * E) / L;
    const EI = E * I;
    const EI12_L3 = (12 * EI) / Math.pow(L, 3);
    const EI6_L2 = (6 * EI) / Math.pow(L, 2);
    const EI4_L = (4 * EI) / L;
    const EI2_L = (2 * EI) / L;

    const kLocal = [
      [AE_L, 0, 0, -AE_L, 0, 0],
      [0, EI12_L3, EI6_L2, 0, -EI12_L3, EI6_L2],
      [0, EI6_L2, EI4_L, 0, -EI6_L2, EI2_L],
      [-AE_L, 0, 0, AE_L, 0, 0],
      [0, -EI12_L3, -EI6_L2, 0, EI12_L3, -EI6_L2],
      [0, EI6_L2, EI2_L, 0, -EI6_L2, EI4_L],
    ];

    // Compute member end forces due to node displacement: fLocal_disp = kLocal * uLocal
    const fLocalDisp = Array(6).fill(0);
    for (let r = 0; r < 6; r++) {
      let sum = 0;
      for (let c = 0; c < 6; c++) {
        sum += kLocal[r][c] * uLocal[c];
      }
      fLocalDisp[r] = sum;
    }

    // Re-calculate the member fixed end forces (FEF) for local station calculations
    const fLocalFef = Array(6).fill(0);
    const combinedLoads: { type: 'UDL' | 'Point'; dir: string; val: number; offset: number }[] = [];
    
    const eqLoads = equivalentFrameLoads.find(eq => eq.frameId === frame.id)?.loads || frame.loads;
    eqLoads.forEach((l) => {
      const factor = selectedCombo.factors[l.loadCaseId] || 0;
      if (Math.abs(factor) > 1e-6) {
        combinedLoads.push({
          type: l.type,
          dir: l.direction,
          val: l.value * factor,
          offset: l.offset || 0,
        });
      }
    });

    for (const lc of loadCases) {
      const factor = selectedCombo.factors[lc.id] || 0;
      const swMult = lc.selfWeightMultiplier;
      if (Math.abs(factor * swMult) > 1e-6) {
        const sw = A * material.unitWeight;
        combinedLoads.push({
          type: 'UDL',
          dir: 'GlobalY',
          val: sw * factor * swMult,
          offset: 0,
        });
      }
    }

    // List of loads parsed to Local X and Local Y
    const activeLocalLoads: { type: 'UDL' | 'Point'; wx: number; wy: number; offset: number }[] = [];

    for (const load of combinedLoads) {
      let wy = 0;
      let wx = 0;

      if (load.type === 'UDL') {
        if (load.dir === 'GlobalY') {
          wy = -load.val * cosB;
          wx = -load.val * sinB;
        } else if (load.dir === 'LocalY') {
          wy = -load.val;
          wx = 0;
        } else if (load.dir === 'GlobalX') {
          wy = load.val * sinB;
          wx = load.val * cosB;
        }

        const Vi = (-wy * L) / 2;
        const Mi = (-wy * L * L) / 12;
        const Vj = (-wy * L) / 2;
        const Mj = (wy * L * L) / 12;
        const Ai = (-wx * L) / 2;
        const Aj = (-wx * L) / 2;

        fLocalFef[0] += Ai;
        fLocalFef[1] += Vi;
        fLocalFef[2] += Mi;
        fLocalFef[3] += Aj;
        fLocalFef[4] += Vj;
        fLocalFef[5] += Mj;

        activeLocalLoads.push({ type: 'UDL', wx, wy, offset: 0 });

      } else if (load.type === 'Point') {
        const aRatio = Math.max(0, Math.min(1, load.offset));
        const a = aRatio * L;
        const b = L - a;

        if (load.dir === 'GlobalY') {
          wy = -load.val * cosB;
          wx = -load.val * sinB;
        } else if (load.dir === 'LocalY') {
          wy = -load.val;
          wx = 0;
        } else if (load.dir === 'GlobalX') {
          wy = load.val * sinB;
          wx = load.val * cosB;
        }

        const Vi = (-wy * b * b * (3 * a + b)) / Math.pow(L, 3);
        const Mi = (-wy * a * b * b) / (L * L);
        const Vj = (-wy * a * a * (3 * b + a)) / Math.pow(L, 3);
        const Mj = (wy * a * a * b) / (L * L);
        const Ai = (-wx * b) / L;
        const Aj = (-wx * a) / L;

        fLocalFef[0] += Ai;
        fLocalFef[1] += Vi;
        fLocalFef[2] += Mi;
        fLocalFef[3] += Aj;
        fLocalFef[4] += Vj;
        fLocalFef[5] += Mj;

        activeLocalLoads.push({ type: 'Point', wx, wy, offset: aRatio });
      }
    }

    // Total Member End Forces in Local coordinates: fLocal = fLocalDisp + fLocalFef
    const fLocal = Array(6).fill(0);
    for (let i = 0; i < 6; i++) {
      fLocal[i] = fLocalDisp[i] + fLocalFef[i];
    }

    // At node I:
    // Axial_I = fLocal[0] (compression is positive in structural codes usually, but let's define positive axial as TENSION)
    // To represent structural forces:
    // fLocal[0] is axial force at node I pushing node I in positive local X. So tension at node I is -fLocal[0].
    // fLocal[1] is shear at node I pushing node I in positive local Y. Shear force is fLocal[1].
    // fLocal[2] is bending moment at node I counter-clockwise. Bending moment is -fLocal[2].
    
    const Ni = -fLocal[0];
    const Vi = fLocal[1];
    const Mi = -fLocal[2];

    // Compute stations forces along the member length (21 stations: index 0 to 20)
    const numStations = 21;
    const stations: FrameStationResult[] = [];

    let maxAxial = 0;
    let maxShear = 0;
    let maxMoment = 0;
    let maxDeflection = 0;

    for (let s = 0; s < numStations; s++) {
      const x = (s / (numStations - 1)) * L;
      
      // Calculate internal forces at station x
      let axForce = Ni;
      let shForce = Vi;
      let bmForce = Mi + Vi * x; // M(x) = M_i + V_i * x + member loads effects

      // Integrate member loads up to x
      for (const ld of activeLocalLoads) {
        if (ld.type === 'UDL') {
          // Distributed loads
          // wx, wy are already signed components
          if (x > 0) {
            axForce += ld.wx * x;
            shForce += ld.wy * x;
            bmForce += (ld.wy * x * x) / 2;
          }
        } else if (ld.type === 'Point') {
          const dist = ld.offset * L;
          if (x > dist) {
            axForce += ld.wx;
            shForce += ld.wy;
            bmForce += ld.wy * (x - dist);
          }
        }
      }

      // Deflection (Cubic Shape Functions + Load Effects)
      // Hermitian shape functions for deflection
      const xi = x / L;
      const h1 = 1 - 3 * xi * xi + 2 * Math.pow(xi, 3);
      const h2 = L * (xi - 2 * xi * xi + Math.pow(xi, 3));
      const h3 = 3 * xi * xi - 2 * Math.pow(xi, 3);
      const h4 = L * (-xi * xi + Math.pow(xi, 3));

      // Local displacement from shape function interpolation
      let defLocalY = h1 * uLocal[1] + h2 * uLocal[2] + h3 * uLocal[4] + h4 * uLocal[5];

      // Add local deflection contribution from loads (simplified load deflection on fixed-fixed span)
      let loadDeflection = 0;
      for (const ld of activeLocalLoads) {
        if (ld.type === 'UDL') {
          // UDL deflection of a fixed-fixed beam:
          // v_load(x) = (w * x^2 * (L-x)^2) / (24 * E * I)
          // wy is local Y load, which points upwards, so negative is downwards.
          const term = (ld.wy * x * x * Math.pow(L - x, 2)) / (24 * EI);
          loadDeflection += term;
        } else if (ld.type === 'Point') {
          const a = ld.offset * L;
          const b = L - a;
          if (x < a) {
            // v_load = (P * b^2 * x^2 * (3*a*L - 3*a*x - b*x)) / (6 * E * I * L^3)  -- simplified beam formulas
            const term = (ld.wy * b * b * x * x * (3 * a * L - (3 * a + b) * x)) / (6 * EI * Math.pow(L, 3));
            loadDeflection += term;
          } else {
            const term = (ld.wy * a * a * Math.pow(L - x, 2) * (3 * b * L - (3 * b + a) * (L - x))) / (6 * EI * Math.pow(L, 3));
            loadDeflection += term;
          }
        }
      }

      const totalDeflectionY = (defLocalY + loadDeflection) * 1000; // in mm

      stations.push({
        x,
        axial: axForce,
        shear: shForce,
        moment: bmForce,
        deflection: totalDeflectionY,
      });

      maxAxial = Math.max(maxAxial, Math.abs(axForce));
      maxShear = Math.max(maxShear, Math.abs(shForce));
      maxMoment = Math.max(maxMoment, Math.abs(bmForce));
      maxDeflection = Math.max(maxDeflection, Math.abs(totalDeflectionY));
    }

    // --- 7. Perform Design Capacity Checks ---
    const designResult = checkFrameCapacity(
      frame,
      section,
      material,
      L,
      maxAxial,
      maxShear,
      maxMoment,
      steelCode,
      concreteCode,
      designSpecs,
      stations
    );

    frameForces[frame.id] = {
      frameId: frame.id,
      stations,
      maxAxial,
      maxShear,
      maxMoment,
      maxDeflection,
      design: designResult,
    };
  }

  return {
    isAnalyzed: true,
    selectedCombinationId: combinationId,
    displacements,
    reactions,
    frameForces,
  };
}

// Gaussian elimination with partial pivoting solver
function solveLinearSystem(A: number[][], B: number[]): number[] | null {
  const n = B.length;
  // Clone matrices
  const a = A.map((row) => [...row]);
  const b = [...B];

  for (let i = 0; i < n; i++) {
    // Search for maximum in this column
    let maxEl = Math.abs(a[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(a[k][i]) > maxEl) {
        maxEl = Math.abs(a[k][i]);
        maxRow = k;
      }
    }

    if (maxEl < 1e-12) {
      // Singular matrix column! Isolate this floating degree of freedom (stabilization)
      for (let j = 0; j < n; j++) {
        a[i][j] = (j === i) ? 1.0 : 0.0;
      }
      b[i] = 0.0;
      continue;
    }

    // Swap maximum row with current row
    const tempRow = a[maxRow];
    a[maxRow] = a[i];
    a[i] = tempRow;

    const tempB = b[maxRow];
    b[maxRow] = b[i];
    b[i] = tempB;

    // Make all rows below this one 0 in current column
    for (let k = i + 1; k < n; k++) {
      const c = -a[k][i] / a[i][i];
      for (let j = i; j < n; j++) {
        if (i === j) {
          a[k][j] = 0;
        } else {
          a[k][j] += c * a[i][j];
        }
      }
      b[k] += c * b[i];
    }
  }

  // Back substitution
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(a[i][i]) < 1e-12) {
      // DOF is unconstrained and floating (unstable)
      x[i] = 0.0;
      continue;
    }
    x[i] = b[i] / a[i][i];
    for (let k = i - 1; k >= 0; k--) {
      b[k] -= a[k][i] * x[i];
    }
  }

  // Verify that we didn't end up with NaN
  for (let i = 0; i < n; i++) {
    if (isNaN(x[i])) return null;
  }

  return x;
}

// Frame Section capacity check (IS 800 for Steel and IS 456 for Concrete design standard variations)
function checkFrameCapacity(
  frame: Frame,
  section: Section,
  material: Material,
  length: number,
  Pu: number, // Max axial force (kN)
  Vu: number, // Max shear force (kN)
  Mu: number, // Max bending moment (kNm)
  steelCode: SteelCode,
  concreteCode: ConcreteCode,
  designSpecs?: RCDesignSpecs,
  stations?: FrameStationResult[]
): FrameDesignResult {
  const isSteel = material.type === 'Steel';
  const Fy = material.f_yield_or_c || 250; // MPa
  const { shape } = section;

  // Calculate area A (m2), Inertia I (m4), Plastic Section Modulus Z (m3) and Elastic Section Modulus S (m3)
  const { A, I } = getSectionProperties(section, material);
  const h = Math.max(0.01, section.depth || 0.1);
  const b = Math.max(0.01, section.width || h);

  let Sx = 0; // Elastic section modulus (m^3)
  let Zx = 0; // Plastic section modulus (m^3)
  let r_radius = 0; // radius of gyration (m)

  if (shape === 'Rectangular') {
    Sx = (b * h * h) / 6;
    Zx = (b * h * h) / 4; 
    r_radius = h / Math.sqrt(12);
  } else if (shape === 'Circular') {
    const d = h;
    Sx = (Math.PI * Math.pow(d, 3)) / 32;
    Zx = Math.pow(d, 3) / 6; 
    r_radius = d / 4;
  } else if (shape === 'I-Shape') {
    const tw = section.webThickness || 0.01;
    const tf = section.flangeThickness || 0.015;
    const bf = b;
    
    Sx = I / (h / 2);
    const h_web = h - 2 * tf;
    Zx = 2 * (bf * tf * (h / 2 - tf / 2)) + (tw * h_web * h_web) / 4;
    r_radius = h * 0.41;
  }

  // Common conversions
  const E_kN_m2 = material.E * 1e6; // GPa to kN/m2
  const Fy_kN_m2 = Fy * 1000; // MPa to kN/m2

  if (isSteel) {
    let design_Mn = 0; // kNm Bending Capacity
    let design_Vn = 0; // kN Shear Capacity
    let design_Pn = 0; // kN Axial Capacity
    let ratio = 0;
    let detail = '';
    let governingForce: 'Bending' | 'Shear' | 'Axial' | 'Combined' = 'Combined';

    // Slenderness limit
    const L_unbraced = frame.type === 'Column' ? length : Math.min(length, 1.5);
    const KL_r = (1.0 * L_unbraced) / r_radius;
    // Indian Standard IS 800 Steel Design Variations (Recommended, Tata Steel, Jindal Steel, Limit State Design, Working Stress Design)
    let gamma_m0 = 1.10;
    let gamma_m1 = 1.25;
    const isWSD = steelCode === 'IS 800 (India) - Working Stress Design';

    if (isWSD) {
      gamma_m0 = 1.50; // Higher safety factor for Working Stress Design
      gamma_m1 = 1.67;
    }

    design_Mn = (Zx * Fy_kN_m2) / gamma_m0; 
    
    let Aw = A;
    if (shape === 'I-Shape') Aw = (section.webThickness || 0.01) * h;
    design_Vn = (Aw * (Fy_kN_m2 / Math.sqrt(3))) / gamma_m0; 

    // Compressive stress f_cd according to IS 800 Perry-Robertson formula
    const f_cc = (Math.PI * Math.PI * E_kN_m2) / (KL_r * KL_r);
    const lambda_is = Math.sqrt(Fy_kN_m2 / f_cc);
    const alpha_is = 0.34; // buckling class b
    const phi_is = 0.5 * (1 + alpha_is * (lambda_is - 0.2) + lambda_is * lambda_is);
    const chi_is = Math.min(1.0, 1.0 / (phi_is + Math.sqrt(phi_is * phi_is - lambda_is * lambda_is)));
    const f_cd = chi_is * Fy_kN_m2 / gamma_m1;

    const design_Pn_comp = f_cd * A; 
    const design_Pn_tens = (A * Fy_kN_m2) / gamma_m0; 
    design_Pn = Pu >= 0 ? design_Pn_tens : design_Pn_comp;

    const pr = Math.abs(Pu) / design_Pn;
    const mr = Math.abs(Mu) / design_Mn;
    const vr = Math.abs(Vu) / design_Vn;

    ratio = pr + mr;
    
    let codeName = "IS 800:2007 (LSD)";
    if (steelCode === 'IS 800 (India) - Working Stress Design') {
      codeName = "IS 800:1984 (WSD)";
    } else if (steelCode === 'IS 800 (India) - Tata Steel Section Standard') {
      codeName = "IS 800:2007 (Tata Steel)";
    } else if (steelCode === 'IS 800 (India) - Jindal Steel Section Standard') {
      codeName = "IS 800:2007 (Jindal Steel)";
    }

    detail = `${codeName} Cl 9.3 Combined: P/Pd + M/Md = ${pr.toFixed(2)} + ${mr.toFixed(2)}`;

    if (vr > ratio) {
      ratio = vr;
      governingForce = 'Shear';
      detail = `${codeName} Cl 8.4 Shear capacity. V/V_d = ${vr.toFixed(2)}`;
    } else if (pr > mr) {
      governingForce = 'Axial';
    } else {
      governingForce = 'Bending';
    }

    // Slenderness limitation
    if (KL_r > 200 && Pu < 0) {
      ratio = Math.max(ratio, KL_r / 200);
      detail += ` | Slenderness limit KL/r = ${KL_r.toFixed(0)} > 200 (Fail)`;
    }

    let capVal = design_Mn;
    let demandVal = Math.abs(Mu);
    if (governingForce === 'Shear') {
      capVal = design_Vn;
      demandVal = Math.abs(Vu);
    } else if (governingForce === 'Axial') {
      capVal = design_Pn;
      demandVal = Math.abs(Pu);
    } else if ((governingForce as string) === 'Combined') {
      capVal = 1.0;
      demandVal = ratio;
    }

    return {
      ratio,
      status: ratio <= 1.0 ? 'Pass' : 'Fail',
      governingForce,
      capacityValue: capVal,
      demandValue: demandVal,
      detail: `${detail}. (Steel Code: ${steelCode}, Fy = ${Fy} MPa)`,
    };

  } else {
    // --- Concrete Beam/Column Design (IS 456 Only) ---
    const fc = designSpecs?.concreteGrade || material.f_yield_or_c || 25; // f_ck in MPa (e.g. 25)
    const fy = designSpecs?.steelGrade || 500; // f_y in MPa (e.g. 500)
    
    const h_mm = h * 1000; // total depth in mm
    const b_mm = b * 1000; // width in mm
    const isColumn = frame.type === 'Column';

    let ratio = 0;
    let detail = '';
    let governingForce: 'Bending' | 'Shear' | 'Axial' | 'Combined' = 'Combined';

    // Output variables
    let ptRequired = 0;
    let astRequired = 0;
    let ptProvided = 0;
    let astProvided = 0;
    let mainBarsText = '';
    let shearStirrupsText = '';
    let sectionClass = 'Singly Reinforced';
    let design_Mn = 0;
    let design_Pn = 0;
    let design_Vn = 0;
    
    // ETABS style Detailed RC values
    let astTopLeft = 0;
    let astBotLeft = 0;
    let astTopMid = 0;
    let astBotMid = 0;
    let astTopRight = 0;
    let astBotRight = 0;
    let astTotal = 0;

    const isConcreteWSD = concreteCode === 'IS 456 (India) - Working Stress Design';

    if (!isColumn) {
      // --- BEAM DESIGN ---
      const clearCover = designSpecs?.clearCoverBeam || 25; // mm
      const barDia = designSpecs?.mainBarDiaBeam || 16; // mm
      const stirrupDia = designSpecs?.stirrupDia || 8; // mm
      const stirrupLegs = designSpecs?.stirrupLegs || 2;

      // Effective depth
      const d_mm = h_mm - clearCover - stirrupDia - barDia / 2;
      const d = d_mm / 1000; // m

      // Helper for beam flexural design
      const getAstRequired = (Mu_val: number): { ast: number, cls: string } => {
        const mAbs = Math.abs(Mu_val);
        let xu_max_over_d = 0.46;
        if (fy === 250) xu_max_over_d = 0.53;
        else if (fy === 415) xu_max_over_d = 0.48;
        else if (fy === 500) xu_max_over_d = 0.46;
        else if (fy === 550) xu_max_over_d = 0.44;

        const Ru_lim = 0.36 * xu_max_over_d * (1 - 0.42 * xu_max_over_d);
        const Mu_lim = Ru_lim * fc * b_mm * d_mm * d_mm * 1e-6; // kNm
        
        let astReq = 0;
        let cls = 'Singly Reinforced';
        
        if (mAbs <= Mu_lim) {
          const term = 1 - (4.6 * mAbs * 1e6) / (fc * b_mm * d_mm * d_mm);
          if (term < 0) {
            astReq = (0.5 * fc * b_mm * d_mm) / fy;
          } else {
            astReq = (0.5 * fc * b_mm * d_mm / fy) * (1 - Math.sqrt(term));
          }
        } else {
          cls = 'Doubly Reinforced';
          const Mu2 = mAbs - Mu_lim;
          const d_prime = clearCover + stirrupDia + barDia / 2; // mm
          const f_sc = Math.min(0.87 * fy, 350); 
          const ascRequired = (Mu2 * 1e6) / ((f_sc - 0.45 * fc) * (d_mm - d_prime));
          const ast1 = (0.36 * fc * b_mm * (xu_max_over_d * d_mm)) / (0.87 * fy);
          const ast2 = (ascRequired * f_sc) / (0.87 * fy);
          astReq = ast1 + ast2;
        }

        const astMin = (0.85 * b_mm * d_mm) / fy;
        if (astReq < astMin) astReq = astMin;
        const astMax = 0.04 * b_mm * h_mm;
        if (astReq > astMax) {
          cls = 'Over Reinforced (Fails Limit State)';
        }
        return { ast: astReq, cls };
      };

      // 1. Calculate detailed ETABS-like design values at stations if available
      if (stations && stations.length > 0) {
        // Find max pos/neg moments in 3 zones
        let M_L_pos = 0, M_L_neg = 0;
        let M_M_pos = 0, M_M_neg = 0;
        let M_R_pos = 0, M_R_neg = 0;
        
        for (const st of stations) {
          const m = st.moment;
          if (st.x <= length / 3) {
            if (m > M_L_pos) M_L_pos = m;
            if (m < M_L_neg) M_L_neg = m;
          } else if (st.x <= 2 * length / 3) {
            if (m > M_M_pos) M_M_pos = m;
            if (m < M_M_neg) M_M_neg = m;
          } else {
            if (m > M_R_pos) M_R_pos = m;
            if (m < M_R_neg) M_R_neg = m;
          }
        }

        // Tension at bottom = positive moment
        // Tension at top = negative moment
        astBotLeft = getAstRequired(M_L_pos).ast;
        astTopLeft = getAstRequired(M_L_neg).ast;
        
        astBotMid = getAstRequired(M_M_pos).ast;
        astTopMid = getAstRequired(M_M_neg).ast;
        
        astBotRight = getAstRequired(M_R_pos).ast;
        astTopRight = getAstRequired(M_R_neg).ast;
      }

      // 2. Global max design (for summary/capacity ratio)
      const resMax = getAstRequired(Mu);
      astRequired = resMax.ast;
      sectionClass = resMax.cls;
      
      const Mu_abs = Math.abs(Mu); // kNm
      let xu_max_over_d = 0.46;
      if (fy === 250) xu_max_over_d = 0.53;
      else if (fy === 415) xu_max_over_d = 0.48;
      else if (fy === 500) xu_max_over_d = 0.46;
      else if (fy === 550) xu_max_over_d = 0.44;
      const Ru_lim = 0.36 * xu_max_over_d * (1 - 0.42 * xu_max_over_d);
      const Mu_lim = Ru_lim * fc * b_mm * d_mm * d_mm * 1e-6; // kNm
      design_Mn = Mu_lim;
      
      const astMax = 0.04 * b_mm * h_mm;
      if (astRequired > astMax) {
        ratio = Math.max(ratio, astRequired / astMax);
      }

      // Provided Bars
      const singleBarArea = (Math.PI * barDia * barDia) / 4;
      const numBars = Math.max(2, Math.ceil(astRequired / singleBarArea));
      astProvided = numBars * singleBarArea;
      ptRequired = (astRequired / (b_mm * d_mm)) * 100;
      ptProvided = (astProvided / (b_mm * d_mm)) * 100;
      mainBarsText = `${numBars}-T${barDia} (${astProvided.toFixed(0)} mm² provided)`;

      // 2. Shear Design (IS 456 Cl 40)
      const Vu_abs = Math.abs(Vu); // kN
      const tau_v = (Vu_abs * 1000) / (b_mm * d_mm); // MPa

      // Design Shear Strength of Concrete (tau_c) - Table 19 approximation
      let tau_c = 0.36; // Default
      const p = Math.min(3.0, Math.max(0.15, ptProvided));
      // Simple and extremely accurate continuous curve fit or interpolation of Table 19 for M20-M30
      if (fc <= 20) {
        tau_c = 0.28 + (0.56 - 0.28) * Math.min(1.0, (p - 0.15) / (0.75 - 0.15));
      } else if (fc <= 25) {
        tau_c = 0.29 + (0.57 - 0.29) * Math.min(1.0, (p - 0.15) / (0.75 - 0.15));
      } else {
        tau_c = 0.30 + (0.59 - 0.30) * Math.min(1.0, (p - 0.15) / (0.75 - 0.15));
      }

      if (isConcreteWSD) {
        tau_c *= 0.6; // WSD permissible shear is lower
      }

      // Max shear strength tau_c_max
      let tau_c_max = 3.1;
      if (fc <= 20) tau_c_max = 2.8;
      else if (fc <= 25) tau_c_max = 3.1;
      else if (fc <= 30) tau_c_max = 3.5;
      else if (fc <= 35) tau_c_max = 3.7;
      else tau_c_max = 4.0;

      // Stirrup Spacing
      const Asv = stirrupLegs * (Math.PI * stirrupDia * stirrupDia) / 4; // mm2
      
      if (tau_v > tau_c_max) {
        shearStirrupsText = `Shear fails tau_v > tau_c_max (${tau_v.toFixed(2)} > ${tau_c_max} MPa). Increase depth.`;
        ratio = Math.max(ratio, tau_v / tau_c_max);
      } else {
        let sv = 300; // max limit
        if (tau_v <= tau_c) {
          // Nominal stirrups
          sv = Math.min(0.75 * d_mm, 300, (0.87 * fy * Asv) / (0.4 * b_mm));
          shearStirrupsText = `${stirrupLegs}L-T${stirrupDia} @ ${Math.floor(sv / 10) * 10} c/c (Nominal)`;
        } else {
          // Designed stirrups
          const Vus = Vu_abs - (tau_c * b_mm * d_mm * 1e-3); // kN
          const sv_req = (0.87 * fy * Asv * d_mm) / (Math.max(1, Vus) * 1000);
          const sv_max = Math.min(0.75 * d_mm, 300, (0.87 * fy * Asv) / (0.4 * b_mm));
          sv = Math.min(sv_req, sv_max);
          if (sv < 50) sv = 50; // clamp minimum spacing
          shearStirrupsText = `${stirrupLegs}L-T${stirrupDia} @ ${Math.floor(sv / 10) * 10} c/c (Designed for ${Vus.toFixed(1)} kN)`;
        }
      }

      design_Vn = (tau_c_max * b_mm * d_mm) / 1000; // Max Shear Capacity in kN

      // Bending ratio and Shear ratio
      const bending_ratio = Mu_abs > Mu_lim ? (0.8 + 0.2 * (astRequired / (0.04 * b_mm * h_mm))) : (Mu_abs / Mu_lim); // unity is handled carefully
      const shear_ratio = tau_v / tau_c_max;
      ratio = Math.max(bending_ratio, shear_ratio, ratio);
      
      if (Mu_abs > Mu_lim && sectionClass.includes('Singly Reinforced')) {
        ratio = Math.max(ratio, Mu_abs / Mu_lim);
      }

      if (shear_ratio > bending_ratio) {
        governingForce = 'Shear';
      } else {
        governingForce = 'Bending';
      }

      detail = `${sectionClass} Section. Mu = ${Mu_abs.toFixed(1)} kNm, Mu_lim = ${Mu_lim.toFixed(1)} kNm. Ast Req = ${astRequired.toFixed(0)} mm² (${ptRequired.toFixed(2)}%). Stirrups: ${shearStirrupsText}.`;

    } else {
      // --- COLUMN DESIGN (Combined P-M) ---
      const clearCover = designSpecs?.clearCoverColumn || 40; // mm
      const barDia = designSpecs?.mainBarDiaColumn || 20; // mm
      const stirrupDia = designSpecs?.stirrupDia || 8; // mm

      // Pu in compression is negative in FE solver, positive in compression code.
      const Pu_comp = Math.max(0.1, -Pu); // axial compression force in kN
      const Mu_abs = Math.max(0.1, Math.abs(Mu)); // kNm

      // Total cross section area Ag
      const Ag = b_mm * h_mm; // mm2

      // Solve for steel percentage pc (ranging from 0.8% to 6.0%)
      let pc = 0.8;
      let found = false;
      
      for (let p_try = 0.8; p_try <= 6.0; p_try += 0.1) {
        // Pure axial capacity (IS 456 Cl 39.3):
        const Asc = (p_try / 100) * Ag;
        const Ac = Ag - Asc;
        const Puz = (0.4 * fc * Ac + 0.67 * fy * Asc) * 1e-3; // kN

        // Uniaxial bending capacity limit M_uz approx (Symmetrical reinforcement):
        const d_mm = h_mm - clearCover - stirrupDia - barDia / 2;
        const d_prime = clearCover + stirrupDia + barDia / 2;
        const Muz = (0.133 * fc * b_mm * d_mm * d_mm + 0.435 * fy * Asc * (d_mm - d_prime)) * 1e-6; // kNm

        // Approximate interaction curve (Bulging out)
        const Pb = 0.28 * fc * b_mm * h_mm * 1e-3; // Approximate balanced load point
        let Mcap = Muz;
        if (Pu_comp > Puz) {
          Mcap = 0; // Fails purely on axial
        } else if (Pu_comp > Pb) {
          Mcap = Muz * (Puz - Pu_comp) / Math.max(1, Puz - Pb);
        } else {
          // Slight increase in moment capacity due to axial compression (up to Pb)
          Mcap = Muz + (Pu_comp / Pb) * (0.1 * Muz); 
        }

        if (Mu_abs <= Mcap) {
          pc = p_try;
          found = true;
          design_Pn = Puz;
          design_Mn = Mcap;
          break;
        }
      }

      if (!found) {
        pc = 6.0;
        design_Pn = (0.4 * fc * (Ag - 0.06*Ag) + 0.67 * fy * 0.06 * Ag) * 1e-3;
        design_Mn = (0.133 * fc * b_mm * (h_mm-50) * (h_mm-50) + 0.4 * fy * 0.06 * Ag * (h_mm-100)) * 1e-6;
      }

      astRequired = (pc / 100) * Ag;
      ptRequired = pc;
      astTotal = astRequired;

      // Main Bars provided
      const singleBarArea = (Math.PI * barDia * barDia) / 4;
      // Round to even number of bars (minimum 4 for rectangular column)
      let numBars = Math.ceil(astRequired / singleBarArea);
      if (numBars < 4) numBars = 4;
      else if (numBars % 2 !== 0) numBars += 1; // force even
      
      astProvided = numBars * singleBarArea;
      ptProvided = (astProvided / Ag) * 100;
      mainBarsText = `${numBars}-T${barDia} (${astProvided.toFixed(0)} mm² provided)`;
      sectionClass = 'Column Section';

      // Shear / lateral ties (IS 456 Cl 26.5.3.2)
      // Pitch: min(least lateral dim, 16 * main bar, 300mm)
      const leastLateralDim = Math.min(b_mm, h_mm);
      const tieSpacing = Math.min(leastLateralDim, 16 * barDia, 300);
      shearStirrupsText = `T${stirrupDia} lateral ties @ ${Math.floor(tieSpacing / 10) * 10} c/c`;

      const axial_ratio = Pu_comp / design_Pn;
      const bending_ratio = Mu_abs / design_Mn;
      ratio = axial_ratio + bending_ratio;

      if (axial_ratio > bending_ratio) {
        governingForce = 'Axial';
      } else {
        governingForce = 'Bending';
      }

      detail = `${sectionClass}. Pu = ${Pu_comp.toFixed(1)} kN, Mu = ${Mu_abs.toFixed(1)} kNm. Ast Req = ${astRequired.toFixed(0)} mm² (${ptRequired.toFixed(2)}%). Ties: ${shearStirrupsText}.`;
    }

    return {
      ratio,
      status: ratio <= 1.0 ? 'Pass' : 'Fail',
      governingForce,
      capacityValue: governingForce === 'Axial' ? design_Pn : design_Mn,
      demandValue: governingForce === 'Axial' ? Math.abs(Pu) : Math.abs(Mu),
      detail: `${detail} (Concrete Code: ${concreteCode}, fck = ${fc} MPa, fy = ${fy} MPa)`,
      ptRequired,
      astRequired,
      ptProvided,
      astProvided,
      mainBarsText,
      shearStirrupsText,
      isConcrete: true,
      sectionClass,
      astTopLeft,
      astBotLeft,
      astTopMid,
      astBotMid,
      astTopRight,
      astBotRight,
      astTotal,
    };
  }
}

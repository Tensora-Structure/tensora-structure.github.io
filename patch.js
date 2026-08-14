const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\/\/ IS 875 Auto-Assignment of Loads \(Dead Load per Part 1, Live Load per Part 2\)[\s\S]*?alert\(`Successfully auto-assigned IS 875 loads.*?`\);\n  };/g;

const replacement = `// IS 875 Auto-Assignment of Loads (Wall Load on Beams)
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
        id: \`IS875_DL_\${frame.id}_\${Date.now()}\`,
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
    alert(\`Auto-assigned IS 875 Wall Load (\${wallLoad.toFixed(2)} kN/m) + Self-Weight to \${assignedCount} beams.\`);
  };`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);

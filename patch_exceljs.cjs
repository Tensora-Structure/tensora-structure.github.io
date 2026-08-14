const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace import
code = code.replace("import * as XLSX from 'xlsx';", "import ExcelJS from 'exceljs';\nimport { shapeToPngBase64 } from './utils/shapeToPng';");

// Make handleExportToExcel async
code = code.replace("const handleExportToExcel = () => {", "const handleExportToExcel = async () => {");

// Replace array data creation to include shape sketch again
code = code.replace(
  '["Member ID / Mark", "IS-2502 Shape Code", "Bending Formula (IS-2502)", "Ø (mm)", "Spacing / Nos", "Cut L (m)", "Qty Mem.", "Bars/Mem", "Tot L (m)", "Unit Wt (kg/m)", "Total Wt (kg)"]',
  '["Member ID / Mark", "IS-2502 Shape Code", "Bending Formula (IS-2502)", "Shape Sketch", "Ø (mm)", "Spacing / Nos", "Cut L (m)", "Qty Mem.", "Bars/Mem", "Tot L (m)", "Unit Wt (kg/m)", "Total Wt (kg)"]'
);

// We won't use bbsData for BBS sheet directly if we want to insert images easily, or we can just iterate.
// Let's replace the whole workbook creation logic
const oldExportLogic = `            // Create sheets
            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            const wsStress = XLSX.utils.aoa_to_sheet(stressData);
            const wsSlabFooting = XLSX.utils.aoa_to_sheet(slabFootingData);
            const wsBOQ = XLSX.utils.aoa_to_sheet(boqData);
            const wsBBS = XLSX.utils.aoa_to_sheet(bbsData);

            // Create workbook & append sheets
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, wsSummary, "Summary & Sizes");
            XLSX.utils.book_append_sheet(wb, wsStress, "Stress & Code Design");
            XLSX.utils.book_append_sheet(wb, wsSlabFooting, "Slab & Footing Design");
            XLSX.utils.book_append_sheet(wb, wsBOQ, "BOQ");
            XLSX.utils.book_append_sheet(wb, wsBBS, "BBS");

            // Write and download
            XLSX.writeFile(wb, "Tensora_Structure_Project_Dossier.xlsx");`;

const newExportLogic = `            const wb = new ExcelJS.Workbook();
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
                \`\${r.shapeCode} (\${r.shapeName})\`,
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
                  base64: imgBase64,
                  extension: 'png',
                });
                
                wsBBS.addImage(imageId, {
                  tl: { col: 3, row: row.number - 1 },
                  ext: { width: 100, height: 40 }
                });
                row.height = 45; // adjust row height for the image
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
            window.URL.revokeObjectURL(url);`;

code = code.replace(oldExportLogic, newExportLogic);

// Remove the old loop
const oldLoop = `            bbsRows.forEach(r => {
              bbsData.push([
                r.member,
                \`\${r.shapeCode} (\${r.shapeName})\`,
                r.bendingFormula,
                r.dia,
                r.spacingOrCount,
                parseFloat(r.cutLength.toFixed(2)),
                r.membersCount,
                r.barsPerMember,
                parseFloat(r.totalLength.toFixed(1)),
                parseFloat(r.unitWeight.toFixed(3)),
                parseFloat(r.totalWeight.toFixed(1))
              ]);
            });`;

code = code.replace(oldLoop, "");

fs.writeFileSync('src/App.tsx', code);

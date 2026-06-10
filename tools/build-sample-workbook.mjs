import fs from "node:fs/promises";
import path from "node:path";

import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = path.join(process.cwd(), "outputs");
const workbook = Workbook.create();

const summary = workbook.worksheets.add("README");
const employees = workbook.worksheets.add("Employees");

summary.getRange("A1:F1").merge();
summary.getRange("A1").values = [["Linkup Schema Matcher Test Workbook"]];
summary.getRange("A2:F2").merge();
summary.getRange("A2").values = [[
  "Upload the Employees sheet into the app. It is designed to match the default employee JSON schema.",
]];
summary.getRange("A4:B10").values = [
  ["Field", "What to expect"],
  ["Emp ID", "Maps to employee_no"],
  ["Employee Name", "Maps to name"],
  ["Start Date", "Maps to join_date"],
  ["Monthly Pay", "Maps to salary.basic"],
  ["Department", "Extra source field for realism"],
  ["Employment Status", "Extra source field for realism"],
];

summary.getRange("A1:F2").format = {
  fill: "#14213D",
  font: { bold: true, color: "#FFFFFF" },
  wrapText: true,
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
summary.getRange("A4:B10").format.borders = { preset: "all", style: "thin", color: "#D7DCE5" };
summary.getRange("A4:B4").format = {
  fill: "#FF6B35",
  font: { bold: true, color: "#FFFFFF" },
};
summary.getRange("A1").format.rowHeight = 28;
summary.getRange("A2").format.rowHeight = 48;
summary.getRange("A:F").format.columnWidth = 24;
summary.freezePanes.freezeRows(4);

employees.getRange("A1:G11").values = [
  [
    "Emp ID",
    "Employee Name",
    "Start Date",
    "Monthly Pay",
    "Department",
    "Employment Status",
    "Work Email",
  ],
  ["E001", "Alicia Tan", "2024-01-15", "4,500", "Operations", "Active", "alicia.tan@linkup.test"],
  ["E002", "Brandon Lee", "2023-11-03", "5,200", "Finance", "Active", "brandon.lee@linkup.test"],
  ["E003", "Chloe Wong", "2025-02-10", "4,950", "HR", "Probation", "chloe.wong@linkup.test"],
  ["E004", "Daniel Lim", "2022-08-22", "6,100", "Engineering", "Active", "daniel.lim@linkup.test"],
  ["E005", "Evelyn Ng", "2021-05-09", "7,350", "Sales", "Active", "evelyn.ng@linkup.test"],
  ["E006", "Farid Rahman", "2024-07-01", "4,250", "Support", "Active", "farid.rahman@linkup.test"],
  ["E007", "Grace Teo", "2023-03-18", "5,800", "Marketing", "On Leave", "grace.teo@linkup.test"],
  ["E008", "Hafiz Jamal", "2020-12-11", "8,200", "Engineering", "Active", "hafiz.jamal@linkup.test"],
  ["E009", "Irene Goh", "2025-04-28", "4,700", "Operations", "Probation", "irene.goh@linkup.test"],
  ["E010", "Jason Yap", "2022-01-31", "5,450", "Finance", "Resigned", "jason.yap@linkup.test"],
];

employees.getRange("A1:G11").format.borders = { preset: "all", style: "thin", color: "#D7DCE5" };
employees.getRange("A1:G1").format = {
  fill: "#B23A48",
  font: { bold: true, color: "#FFFFFF" },
};
employees.getRange("A2:A11").format.numberFormat = "@";
employees.getRange("C2:C11").format.numberFormat = "yyyy-mm-dd";
employees.getRange("D2:D11").format.numberFormat = "@";
employees.getRange("A:G").format.columnWidth = 18;
employees.getRange("B:B").format.columnWidth = 22;
employees.getRange("E:G").format.columnWidth = 20;
employees.freezePanes.freezeRows(1);

employees.getRange("I1:K8").values = [
  ["Quick Notes", "", ""],
  ["Recommended schema field", "Suggested source column", "Transform"],
  ["employee_no", "Emp ID", "trim"],
  ["name", "Employee Name", "trim"],
  ["join_date", "Start Date", "parse_date"],
  ["salary.basic", "Monthly Pay", "to_number"],
  ["Extra columns", "Department / Employment Status / Work Email", "Optional"],
  ["Tip", "This sheet is intentionally simple so the mapping UI is easy to test.", ""],
];
employees.getRange("I1:K8").format.borders = { preset: "all", style: "thin", color: "#D7DCE5" };
employees.getRange("I1:K1").merge();
employees.getRange("I1:K1").format = {
  fill: "#14213D",
  font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
};
employees.getRange("I2:K2").format = {
  fill: "#FF6B35",
  font: { bold: true, color: "#FFFFFF" },
};
employees.getRange("I:K").format.columnWidth = 22;
employees.getRange("J:J").format.columnWidth = 30;
employees.getRange("K:K").format.columnWidth = 16;

const outputPath = path.join(outputDir, "linkup-sample-employees.xlsx");
const previewPath = path.join(outputDir, "linkup-sample-employees.png");

await fs.mkdir(outputDir, { recursive: true });

const preview = await workbook.render({
  sheetName: "Employees",
  range: "A1:K12",
  scale: 1,
  format: "png",
});
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);

const inspection = await workbook.inspect({
  kind: "table",
  range: "Employees!A1:G11",
  include: "values,formulas",
  tableMaxRows: 12,
  tableMaxCols: 7,
});

console.log(JSON.stringify({ outputPath, previewPath, inspection: inspection.ndjson }, null, 2));

import * as XLSX from "xlsx";
import { Sample } from "@workspace/api-client-react";
import { format } from "date-fns";

const FIELD_LABELS: Record<string, string> = {
  collectionDate: "Collection Date & Time",
  location: "GPS Location",
  // Water
  temperature: "Water Temp (°C)",
  ph: "pH Level",
  do: "Dissolved Oxygen (mg/L)",
  conductivity: "Conductivity (μS/cm)",
  turbidity: "Turbidity (NTU)",
  flowRate: "Flow Rate (m³/s)",
  color: "Color",
  odor: "Odor",
  preservation: "Preservation Method",
  // Rock
  rockType: "Rock Type",
  rockName: "Rock Name",
  lithology: "Lithology",
  texture: "Texture",
  sorting: "Sorting",
  hardness: "Hardness (Mohs)",
  specificGravity: "Specific Gravity",
  strike: "Strike",
  dip: "Dip",
  magnetism: "Magnetism",
  weight: "Weight (g)",
  // Soil
  horizon: "Horizon",
  moisture: "Moisture Content",
  depth: "Depth (cm)",
  structure: "Structure",
  organicMatter: "Organic Matter (%)",
};

export function exportSamplesToExcel(
  samples: Sample[],
  folderName: string = "All Samples",
  filename: string = "geofield-export"
) {
  if (!samples || samples.length === 0) return;

  const rows = samples.map((sample) => {
    const fields = (sample.fields as Record<string, any>) || {};

    const row: Record<string, any> = {
      "Sample ID": sample.sampleId,
      "Sample Type":
        sample.sampleType === "soil_sand"
          ? "Soil/Sand"
          : sample.sampleType.charAt(0).toUpperCase() + sample.sampleType.slice(1),
      Folder: folderName,
      Notes: sample.notes || "",
      "Record Created": format(new Date(sample.createdAt), "yyyy-MM-dd HH:mm"),
    };

    Object.entries(fields).forEach(([key, value]) => {
      if (key === "photo") return; // skip photo
      const label = FIELD_LABELS[key] || key.replace(/([A-Z])/g, " $1").trim();
      row[label] = value !== undefined && value !== null ? String(value) : "";
    });

    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns
  const colWidths = Object.keys(rows[0] || {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.map((r) => String(r[key] ?? "").length)
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });
  ws["!cols"] = colWidths;

  // Style header row (bold) — basic xlsx styling
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (ws[cellAddress]) {
      ws[cellAddress].s = { font: { bold: true } };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Samples");

  XLSX.writeFile(
    wb,
    `${filename}-${format(new Date(), "yyyyMMdd-HHmm")}.xlsx`
  );
}

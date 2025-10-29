// src/utils/gridParser.js

/**
 * Universal parser for heatmap grid files.
 * Supports:
 *  - CSV with commas (e.g., heatmap_highres.csv)
 *  - TXT with semicolons (e.g., L187x_AK_v_done_v3.ifc-heatmap-basic-res500_floor-0.txt)
 *
 * Returns a 2D array of numbers (rows x cols).
 */
export async function parseGrid(url) {
  const res = await fetch(url);
  const raw = await res.text();

  // Strip BOM + normalize newlines
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");

  // Heuristics:
  // - .txt files from the client use semicolons
  // - .csv files use commas
  // - If extension is unclear, sniff the first non-empty line
  const lower = url.toLowerCase();
  let delimiter = ",";
  if (lower.endsWith(".txt")) delimiter = ";";
  else if (lower.endsWith(".csv")) delimiter = ","; 
  else {
    const firstLine = text.split("\n").find(l => l.trim().length > 0) || "";
    delimiter = firstLine.includes(";") ? ";" : ",";
  }

  // Turn the text into a 2D numeric array
  const rows = text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line
      .split(delimiter)
      // remove accidental trailing empties (e.g., "1;2;3;")
      .filter(cell => cell !== "")
      .map(v => {
        // Allow ints/floats; treat blanks or NaN as 0
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      })
    );

  // Defensive: drop any completely empty rows (after cleanup)
  const matrix = rows.filter(r => r.length > 0);

  // Optional: normalize ragged rows (pad with zeros to the max row length)
  const maxCols = Math.max(0, ...matrix.map(r => r.length));
  for (const r of matrix) {
    if (r.length < maxCols) {
      r.push(...Array(maxCols - r.length).fill(0));
    }
  }

  return matrix;
}

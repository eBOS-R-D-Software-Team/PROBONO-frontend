// src/utils/csvParser.js
import Papa from "papaparse";

export const parseCSV = async (filePath) => {
  try {
    // 1) Fetch the actual CSV file (NOT just its path)
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }

    // 2) Read CSV text
    const text = await response.text();

    // 3) Parse using Papa
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        delimiter: "", // auto-detect
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          if (!results.data.length) {
            reject("Empty or invalid CSV data.");
            return;
          }

          // Convert all values to numbers (avoid NaNs)
          const formattedData = results.data.map((row) =>
            row.map((val) => (isNaN(val) ? 0 : parseFloat(val)))
          );
          resolve(formattedData);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  } catch (error) {
    throw error;
  }
};

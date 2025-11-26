export function extractCoordinatesFromVTP(vtpText) {
  if (!vtpText) return { x: [], y: [] };

  // Regex to find the content inside the Points DataArray
  // Matches <DataArray ... Name='Points' ... > CONTENT </DataArray>
  // Handles single or double quotes for attributes
  const pointsRegex = /<DataArray[^>]*Name=['"]Points['"][^>]*>([\s\S]*?)<\/DataArray>/i;
  const match = pointsRegex.exec(vtpText);

  if (!match || !match[1]) {
    console.error("Error: Could not find Points DataArray in VTP file.");
    return { x: [], y: [] };
  }

  // Clean up the string: remove potential nested tags like <InformationKey>
  let content = match[1];
  const nestedTagIndex = content.indexOf('<');
  if (nestedTagIndex !== -1) {
    content = content.substring(0, nestedTagIndex);
  }

  // Parse numbers
  const rawNumbers = content.trim().split(/\s+/).map(Number);
  const x = [];
  const z = [];

  // VTP is X Y Z. We map X->x and Z->y (for 2D top-down view)
  for (let i = 0; i < rawNumbers.length; i += 3) {
    const valX = rawNumbers[i];
    const valZ = rawNumbers[i + 2];

    if (Number.isFinite(valX) && Number.isFinite(valZ)) {
      x.push(valX);
      z.push(valZ);
    }
  }

  return { x, z };
}
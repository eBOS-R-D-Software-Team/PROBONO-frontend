import axios from "axios";

const BASE = "https://logbook.cds-probono.eu";

/**
 * GET /dbl/{dblId}/building/{buildingId}/nft?duration=YYYY-MM:YYYY-MM&page=1&limit=10
 */
export async function fetchNftPage({
  dblId = "porto",
  buildingId, // lot_1 | lot_2 | lot_4
  duration, // "YYYY-MM:YYYY-MM"
  page = 1,
  limit = 10,
  signal,
}) {
  if (!buildingId) throw new Error("buildingId is required");
  if (!duration) throw new Error("duration is required");

  const url = `${BASE}/dbl/${dblId}/building/${buildingId}/nft`;

  const res = await axios.get(url, {
    params: { duration, page, limit },
    signal,
  });

  return res.data;
}
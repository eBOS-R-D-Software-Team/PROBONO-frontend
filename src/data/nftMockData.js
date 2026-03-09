// src/mock/nftMockData.js

/**
 * Shape matches the API response:
 * { currentPage, totalPages, totalItems, hasPrev, hasNext, nfts: [...] }
 */

export function getMockNftResponse({ dblId = "porto", buildingId = "lot_1" }) {
  // create 12 monthly items (2025-01..2025-12)
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const boundaries = { pec: 700000, scr: 20, co2: 40000000 };

  // different “profiles” per lot so it feels realistic
  const profiles = {
    lot_1: { pecBase: 380000, co2Base: 22000000, scrBase: 18 },
    lot_2: { pecBase: 780000, co2Base: 48000000, scrBase: 28 }, // tends to exceed boundaries
    lot_4: { pecBase: 95000, co2Base: 5200000, scrBase: 10 },
  };

  const p = profiles[buildingId] || profiles.lot_1;

  const nfts = months.map((m) => {
    // simple deterministic variation
    const season = Math.sin((m / 12) * Math.PI * 2);
    const drift = (m - 6) * 3500;

    const pec = Math.max(0, p.pecBase + season * 90000 + drift);
    const co2 = Math.max(0, p.co2Base + season * 7000000 + drift * 20);
    const scr = Math.min(100, Math.max(0, p.scrBase + season * 9 + (m % 3) * 1.2));

    const tokenId = fakeBigIntString(buildingId, 2025, m);

    return {
      Year: 2025,
      Month: m,
      TokenID: tokenId,
      TokenMetadata: {
        DBLID: dblId,
        BuildingID: buildingId,
        Timestamp: String(1771580000 + m * 2000),
        Owner: "3ab9308e5aab1b976b4b94c928b0247242c6de8ceb60cf3210f29b35e7dd7c34",
        KPI: [
          `PEC:${pec.toFixed(2)}(kwh)`,
          `SCR:${scr.toFixed(2)}(%)`,
          `CO2:${co2.toFixed(2)}(g)`,
        ],
      },
      Indicators: {
        pec,
        scr,
        co2,
      },
      Boundaries: boundaries,
      EthTxHash: fakeTxHash("eth", buildingId, 2025, m),
      FabricTxID: fakeTxHash("fabric", buildingId, 2025, m),
    };
  });

  return {
    currentPage: 1,
    totalPages: 1,
    totalItems: nfts.length,
    hasPrev: false,
    hasNext: false,
    nfts,
  };
}

function fakeTxHash(prefix, buildingId, y, m) {
  const seed = `${prefix}-${buildingId}-${y}-${m}`;
  const hex = toHex(seed).slice(0, 64).padEnd(64, "a");
  return `0x${hex}`;
}

function fakeBigIntString(buildingId, y, m) {
  const seed = `${buildingId}-${y}-${m}`;
  // Make a long numeric string that looks like TokenID
  const digits = seed
    .split("")
    .map((c) => (c.charCodeAt(0) % 10).toString())
    .join("");
  return (digits + "9".repeat(80)).slice(0, 95);
}

function toHex(str) {
  return Array.from(str)
    .map((c) => c.charCodeAt(0).toString(16))
    .join("");
}
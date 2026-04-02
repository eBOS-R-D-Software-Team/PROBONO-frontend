import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchNftPage } from "../api/nftApi";
import { getMockNftResponse } from "../data/nftMockData";

const USE_FAKE_NFT = false;


// -------- helpers
function ymLabel(year, month) {
  const mm = String(month).padStart(2, "0");
  return `${year}-${mm}`;
}

function isValidScr(scr) {
  // Stephane: SCR must be 0..100
  if (scr === null || scr === undefined) return true; // allow missing
  return Number.isFinite(scr) && scr >= 0 && scr <= 100;
}

function computeCompliance(ind, bnd) {
  // PEC + CO2: lower is better (<= boundary)
  // SCR: higher is better (>= boundary), but invalid scr values must be rejected separately.
  const pecOk =
    ind?.pec === null || ind?.pec === undefined || bnd?.pec === undefined
      ? null
      : ind.pec <= bnd.pec;

  const co2Ok =
    ind?.co2 === null || ind?.co2 === undefined || bnd?.co2 === undefined
      ? null
      : ind.co2 <= bnd.co2;

  const scrOk =
    ind?.scr === null || ind?.scr === undefined || bnd?.scr === undefined
      ? null
      : ind.scr >= bnd.scr;

  return { pecOk, co2Ok, scrOk };
}

function normalizeItem(x) {
  const year = x?.Year;
  const month = x?.Month;

  const indicators = x?.Indicators || {};
  const boundaries = x?.Boundaries || {};
  const meta = x?.TokenMetadata || {};

  const scr = indicators?.scr;
  const invalidScr = !isValidScr(scr);

  return {
    key: `${year}-${month}-${x?.TokenID || ""}`,
    year,
    month,
    ym: ymLabel(year, month),

    indicators: {
      pec: indicators?.pec,
      scr: indicators?.scr,
      co2: indicators?.co2,
    },
    boundaries: {
      pec: boundaries?.pec,
      scr: boundaries?.scr,
      co2: boundaries?.co2,
    },

    invalidScr,
    compliance: computeCompliance(indicators, boundaries),

    tokenId: x?.TokenID,
    tokenMetadata: meta,
    ethTxHash: x?.EthTxHash,
    fabricTxId: x?.FabricTxID,
  };
}

/**
 * Fetch all pages for a given duration + building.
 * Uses hasNext + page++.
 */
export const fetchNftsAll = createAsyncThunk(
  "nft/fetchAll",
  async ({ dblId = "porto", buildingId, duration, limit = 50 }, { signal }) => {
    // ---- 1) Fake mode (no network calls)
    if (USE_FAKE_NFT) {
      const data = getMockNftResponse({ dblId, buildingId });

      const meta = {
        currentPage: data?.currentPage ?? 1,
        totalPages: data?.totalPages ?? 1,
        totalItems: data?.totalItems ?? (data?.nfts?.length ?? 0),
        hasPrev: !!data?.hasPrev,
        hasNext: !!data?.hasNext,
      };

      return { meta, nfts: data.nfts || [] };
    }

    // ---- 2) Real mode (API calls)
    let page = 1;
    let all = [];
    let lastMeta = {
      currentPage: 1,
      totalPages: null,
      totalItems: null,
      hasPrev: false,
      hasNext: false,
    };

    while (true) {
      const data = await fetchNftPage({
        dblId,
        buildingId,
        duration,
        page,
        limit,
        signal,
      });

      lastMeta = {
        currentPage: data?.currentPage ?? page,
        totalPages: data?.totalPages ?? null,
        totalItems: data?.totalItems ?? null,
        hasPrev: !!data?.hasPrev,
        hasNext: !!data?.hasNext,
      };

      const items = Array.isArray(data?.nfts) ? data.nfts : [];
      all = all.concat(items);

      if (!data?.hasNext) break;
      page += 1;
    }

    return { meta: lastMeta, nfts: all };
  }
);

const initialState = {
  params: {
    dblId: "porto",
    buildingId: "lot_1",
    duration: "2025-01:2025-12",
    limit: 50,
  },

  loading: false,
  error: "",

  raw: [],
  items: [],

  invalidCount: 0,

  meta: {
    currentPage: 1,
    totalPages: null,
    totalItems: null,
    hasPrev: false,
    hasNext: false,
  },
};

const nftSlice = createSlice({
  name: "nft",
  initialState,
  reducers: {
    setNftParams(state, action) {
      state.params = { ...state.params, ...action.payload };
    },
    clearNftError(state) {
      state.error = "";
    },
    clearNfts(state) {
      state.raw = [];
      state.items = [];
      state.invalidCount = 0;
      state.meta = initialState.meta;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNftsAll.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchNftsAll.fulfilled, (state, action) => {
        state.loading = false;

        const raw = action.payload?.nfts || [];
        const normalized = raw.map(normalizeItem);

        // Reject invalid SCR values (>100 or <0)
        const filtered = normalized.filter((x) => !x.invalidScr);
        const invalidCount = normalized.length - filtered.length;

        state.raw = raw;
        state.items = filtered;
        state.invalidCount = invalidCount;
        state.meta = action.payload?.meta || state.meta;
      })
      .addCase(fetchNftsAll.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error?.message || "Failed to fetch NFT KPI certificates";
      });
  },
});

export const { setNftParams, clearNftError, clearNfts } = nftSlice.actions;
export default nftSlice.reducer;

// selectors
export const selectNftState = (s) => s.nft;
export const selectNftParams = (s) => s.nft.params;
export const selectNftItems = (s) => s.nft.items;
export const selectNftLoading = (s) => s.nft.loading;
export const selectNftError = (s) => s.nft.error;
export const selectNftInvalidCount = (s) => s.nft.invalidCount;
export const selectNftMeta = (s) => s.nft.meta;
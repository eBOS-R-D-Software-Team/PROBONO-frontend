import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { SlArrowRight } from "react-icons/sl";
import { useLocation, useNavigate } from "react-router-dom";

import { DatePicker, Drawer } from "antd";
import dayjs from "dayjs";

import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";



import {
  fetchNftsAll,
  selectNftError,
  selectNftInvalidCount,
  selectNftItems,
  selectNftLoading,
  selectNftMeta,
  selectNftParams,
  setNftParams,
} from "../reducers/nftSlice";

// ✅ register AFTER imports
ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

const { RangePicker } = DatePicker;

const LOTS = [
  { label: "LOT 1", value: "lot_1" },
  { label: "LOT 2", value: "lot_2" },
  { label: "LOT 4", value: "lot_4" },
];

const KPI_COLORS = {
  pec: "#2563eb", // strong blue
  co2: "#dc2626", // strong red
  scr: "#16a34a", // strong green
};

const BOUNDARY_COLOR = "#111827"; // near-black

function durationToRange(duration) {
  const [from, to] = (duration || "").split(":");
  return [from ? dayjs(from, "YYYY-MM") : null, to ? dayjs(to, "YYYY-MM") : null];
}
function rangeToDuration(range) {
  const [from, to] = range || [];
  if (!from || !to) return "";
  return `${dayjs(from).format("YYYY-MM")}:${dayjs(to).format("YYYY-MM")}`;
}

export default function PortoNftKpiView() {
  const dispatch = useDispatch();

  const params = useSelector(selectNftParams);
  const items = useSelector(selectNftItems);
  const loading = useSelector(selectNftLoading);
  const err = useSelector(selectNftError);
  const invalidCount = useSelector(selectNftInvalidCount);
  const meta = useSelector(selectNftMeta);

  const [buildingId, setBuildingId] = useState(params.buildingId);
  const [monthRange, setMonthRange] = useState(() =>
    durationToRange(params.duration || "2025-01:2025-12")
  );
  const duration = useMemo(() => rangeToDuration(monthRange), [monthRange]);

  // chart KPI selection
  const [activeKpi, setActiveKpi] = useState("pec"); // "pec" | "co2" | "scr"

  // show chart ONLY after user fetch
  const [hasFetched, setHasFetched] = useState(false);

  // drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();
  const labName = location.state?.labName;

  function onFetch() {
    if (!duration) return;
    setHasFetched(true);
    dispatch(setNftParams({ buildingId, duration }));
    dispatch(fetchNftsAll({ ...params, buildingId, duration }));
  }

  function onRowClick(row) {
    setSelectedRow(row);
    setDrawerOpen(true);
  }

  // chart data (depends on items + active KPI)
  const chart = useMemo(() => buildChart(items, activeKpi), [items, activeKpi]);

  return (
    <div className="porto-nft">
      {/* Breadcrumb */}
      <div className="breadcrumb-container">
        <a href="/" className="crumb-link">
          Home
        </a>
        <SlArrowRight className="crumb-arrow" />
        <a href="/labs" className="crumb-link">
          Data Visualizations
        </a>

        {labName && (
          <>
            <SlArrowRight className="crumb-arrow" />
            <span
              className="crumb-current"
              onClick={() => navigate(-1)}
              style={{ cursor: "pointer" }}
            >
              {labName}
            </span>
          </>
        )}

        <SlArrowRight className="crumb-arrow" />
        <span className="crumb-current">Porto KPI certificates</span>
      </div>

      <p className="subtitle">
        Monthly KPI certificates (PEC / CO₂ / SCR) with boundaries and token details.
      </p>

      {/* Controls */}
      <div className="controls-card">
        <div className="controls-row">
          <div className="field">
            <label>Building</label>
            <select value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
              {LOTS.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Duration (month range)</label>
            <RangePicker
              picker="month"
              value={monthRange}
              onChange={(val) => setMonthRange(val)}
              format="YYYY-MM"
              allowClear={false}
            />
          </div>

          <button className="fetch-btn" onClick={onFetch} disabled={loading || !duration}>
            {loading ? "Loading..." : "Fetch certificates"}
          </button>
        </div>
      </div>

      {/* KPI pills */}
      <div className="kpi-row">
        <div className="pill">
          Items: <b>{items.length}</b>
        </div>
        <div className="pill">
          Filtered (invalid SCR): <b>{invalidCount}</b>
        </div>
        <div className="pill">
          TotalPages: <b>{meta.totalPages ?? "-"}</b>
        </div>
      </div>

      {invalidCount > 0 && (
        <div className="notice notice--warn">
          ⚠️ {invalidCount} record(s) were excluded because SCR must be within 0–100%.
        </div>
      )}

      {err && <div className="notice notice--error">❌ {err}</div>}

      {/* Chart: show ONLY after Fetch + data exists */}
      {hasFetched && items.length > 0 && (
        <div className="chart-card">
          <div className="chart-top">
            <div className="chart-title">Monthly KPI trend (with boundary)</div>

            <div className="kpi-toggle">
              <button
                className={activeKpi === "pec" ? "active" : ""}
                onClick={() => setActiveKpi("pec")}
              >
                PEC
              </button>
              <button
                className={activeKpi === "co2" ? "active" : ""}
                onClick={() => setActiveKpi("co2")}
              >
                CO₂
              </button>
              <button
                className={activeKpi === "scr" ? "active" : ""}
                onClick={() => setActiveKpi("scr")}
              >
                SCR
              </button>
            </div>
          </div>

          <div className="chart-wrap">
            <Line data={chart.data} options={chart.options} />
          </div>
        </div>
      )}

      {/* Optional: after fetch, no data */}
      {hasFetched && !loading && items.length === 0 && (
        <div className="notice notice--warn">No data for the selected duration.</div>
      )}

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="left">Month</th>
              <th className="right">PEC</th>
              <th className="right">PEC ≤ Bound</th>
              <th className="right">CO₂</th>
              <th className="right">CO₂ ≤ Bound</th>
              <th className="right">SCR</th>
              <th className="right">SCR ≥ Bound</th>
              <th className="left">TokenID</th>
            </tr>
          </thead>

          <tbody>
            {items.map((x) => (
              <tr key={x.key} className="clickable-row" onClick={() => onRowClick(x)}>
                <td className="left">{x.ym}</td>

                <td className="right">{fmt(x.indicators.pec)}</td>
                <td className="right">{statusPill(x.compliance.pecOk)}</td>

                <td className="right">{fmt(x.indicators.co2)}</td>
                <td className="right">{statusPill(x.compliance.co2Ok)}</td>

                <td className="right">{fmt(x.indicators.scr)}</td>
                <td className="right">{statusPill(x.compliance.scrOk)}</td>

                <td className="left token-cell">{x.tokenId}</td>
              </tr>
            ))}

            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 12 }}>
                  No data for the selected duration.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      <Drawer
        title={selectedRow ? `KPI certificate details – ${selectedRow.ym}` : "KPI certificate details"}
        placement="right"
        width={520}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {!selectedRow ? (
          <div>No record selected.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Section title="KPIs">
              <KV label="PEC" value={fmt(selectedRow.indicators.pec)} />
              <KV label="CO₂" value={fmt(selectedRow.indicators.co2)} />
              <KV label="SCR" value={fmt(selectedRow.indicators.scr)} />
            </Section>

            <Section title="Boundaries">
              <KV label="PEC boundary" value={fmt(selectedRow.boundaries.pec)} />
              <KV label="CO₂ boundary" value={fmt(selectedRow.boundaries.co2)} />
              <KV label="SCR boundary" value={fmt(selectedRow.boundaries.scr)} />
            </Section>

            <Section title="Token / Blockchain">
              <KV label="TokenID" value={selectedRow.tokenId} mono />
              <KV label="EthTxHash" value={selectedRow.ethTxHash} mono />
              <KV label="FabricTxID" value={selectedRow.fabricTxId} mono />
            </Section>

            <Section title="Metadata">
              <KV label="DBLID" value={selectedRow.tokenMetadata?.DBLID} />
              <KV label="BuildingID" value={selectedRow.tokenMetadata?.BuildingID} />
              <KV label="Timestamp" value={selectedRow.tokenMetadata?.Timestamp} mono />
              <KV label="Owner" value={selectedRow.tokenMetadata?.Owner} mono />
            </Section>
          </div>
        )}
      </Drawer>
    </div>
  );
}

/* ---------------- Chart builder ---------------- */
function buildChart(items, kpi) {
  const labels = items.map((x) => x.ym);

  const values = items.map((x) => {
    const v = x.indicators?.[kpi];
    return typeof v === "number" ? v : null;
  });

  const boundaryVal = items.find((x) => x.boundaries?.[kpi] !== undefined)?.boundaries?.[kpi];
  const boundary = labels.map(() => (typeof boundaryVal === "number" ? boundaryVal : null));

  const titleMap = { pec: "PEC", co2: "CO₂", scr: "SCR" };

  const data = {
    labels,
    datasets: [
      {
        label: titleMap[kpi],
        data: values,
        tension: 0.25,
        pointRadius: 3,

        // ✅ bold & visible
        borderColor: KPI_COLORS[kpi],
        backgroundColor: KPI_COLORS[kpi],
        borderWidth: 3,
        pointBackgroundColor: KPI_COLORS[kpi],
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
      },
      {
        label: "Boundary",
        data: boundary,
        tension: 0,
        pointRadius: 0,

        // ✅ bold boundary line
        borderColor: BOUNDARY_COLOR,
        backgroundColor: BOUNDARY_COLOR,
        borderWidth: 3,
        borderDash: [10, 6],
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        display: true,
        labels: {
          boxWidth: 14,
          boxHeight: 14,
          padding: 16,
          font: { size: 12, weight: "bold" },
        },
      },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        ticks: { maxRotation: 0, autoSkip: true },
      },
      y: {
        ticks: {
          callback: (v) => formatTick(v, kpi),
        },
      },
    },
  };

  return { data, options };
}

function formatTick(v, kpi) {
  if (typeof v !== "number") return v;
  if (kpi === "scr") return `${v}%`;
  if (Math.abs(v) >= 1_000_000) return `${Math.round(v / 1_000_000)}M`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
}

/* ---------------- UI helpers ---------------- */
function fmt(v) {
  if (v === null || v === undefined) return "-";
  if (typeof v === "number") return v.toLocaleString();
  return String(v);
}

function statusPill(v) {
  if (v === null) return <span className="status status--na">—</span>;
  return v ? <span className="status status--ok">OK</span> : <span className="status status--bad">NO</span>;
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontWeight: 800, marginBottom: 6, color: "#0f172a" }}>{title}</div>
      <div style={{ border: "1px solid #eef2f7", borderRadius: 12, padding: 12, background: "#fff" }}>
        {children}
      </div>
    </div>
  );
}

function KV({ label, value, mono }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
      <div style={{ width: 120, color: "#64748b", fontWeight: 700, fontSize: 12 }}>{label}</div>
      <div
        style={{
          flex: 1,
          fontSize: 13,
          color: "#0f172a",
          fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" : "inherit",
          wordBreak: "break-all",
        }}
      >
        {value ?? "-"}
      </div>
    </div>
  );
}
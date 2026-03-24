import React, { useState } from "react";

/* ══════════════════════════════════════════════════════════════
   Helpers – turn raw columnSums into a readable paragraph
   ══════════════════════════════════════════════════════════════ */

const CATEGORY_MAP = [
  {
    keys: ["Total energy use [Wh]"],
    label: "total energy consumption",
    format: (v) => `${(v / 1e6).toFixed(1)} MWh`,
  },
  {
    keys: ["Primary energy [Wh]"],
    label: "primary energy demand",
    format: (v) => `${(v / 1e6).toFixed(1)} MWh`,
  },
  {
    keys: ["Energy need for heating [Wh]"],
    label: "heating demand",
    format: (v) => `${(v / 1e6).toFixed(1)} MWh`,
  },
  {
    keys: ["Energy need for cooling [Wh]"],
    label: "cooling demand",
    format: (v) => `${(v / 1e6).toFixed(1)} MWh`,
  },
  {
    keys: [
      "Produced electricity from photovoltaic [Wh]",
      "Used electricity from photovoltaic [Wh]",
      "Unused electricity from photovoltaic [Wh]",
      "Incident solar radiation [Wh]",
    ],
    label: "photovoltaic / solar production",
    aggregate: true,
  },
  {
    keys: ["CO2 emissions [g]"],
    label: "CO₂ emission tracking",
    format: (v) => `${(v / 1e6).toFixed(1)} t`,
  },
  {
    keys: ["Electricity use [Wh]"],
    label: "electricity consumption",
  },
  {
    keys: ["Natural gas use [Wh]"],
    label: "natural gas usage",
  },
  {
    keys: ["District heating use [Wh]"],
    label: "district heating",
  },
];

function buildDescription(name, columnSums) {
  if (!columnSums) return "";

  const present = [];
  const absent = [];

  CATEGORY_MAP.forEach((cat) => {
    const hasData = cat.keys.some((k) => (columnSums[k] || 0) !== 0);

    if (hasData) {
      if (cat.format && !cat.aggregate) {
        const val = cat.keys.reduce((s, k) => s + (columnSums[k] || 0), 0);
        present.push(`${cat.label} (${cat.format(val)})`);
      } else {
        present.push(cat.label);
      }
    } else {
      absent.push(cat.label);
    }
  });

  const allCols = Object.entries(columnSums);
  const nonZeroCount = allCols.filter(([, v]) => v !== 0).length;

  let text = "";

  if (present.length) {
    text += `${name} models ${present.slice(0, -1).join(", ")}`;
    if (present.length > 1) text += ` and ${present[present.length - 1]}`;
    else text += present[0];
    text += ".";
  } else {
    text += `${name} has no active measurements.`;
  }

  if (absent.length === 1) {
    text += ` ${absent[0].charAt(0).toUpperCase() + absent[0].slice(1)} is not modelled in this scenario.`;
  } else if (absent.length > 1) {
    text += ` Not modelled here: ${absent.join(", ")}.`;
  }

  text += ` ${nonZeroCount} of ${allCols.length} data columns are active.`;

  return text;
}

/* ══════════════════════════════════════════════════════════════
   Short label helper (strip unit brackets)
   ══════════════════════════════════════════════════════════════ */
function shortLabel(key) {
  return key.replace(/\s*\[.*?\]\s*$/, "").trim();
}

/* ══════════════════════════════════════════════════════════════
   Excluded-columns popup
   ══════════════════════════════════════════════════════════════ */
function ExcludedColumnsPopup({ open, scenarioName, columns, onClose }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1300,
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        style={{
          background: "#0b1120",
          borderRadius: 16,
          padding: "20px 24px",
          maxWidth: 480,
          width: "90%",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow:
            "0 18px 45px rgba(15,23,42,0.7), 0 0 0 1px rgba(148,163,184,0.3)",
          color: "#e5e7eb",
        }}
      >
        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#38bdf8",
              boxShadow: "0 0 12px #38bdf8",
              flexShrink: 0,
            }}
          />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#e5e7eb" }}>
            Excluded Measurements — {scenarioName}
          </h3>
        </div>

        {/* description */}
        <p
          style={{
            margin: "0 0 14px",
            fontSize: 13,
            lineHeight: 1.5,
            color: "#94a3b8",
          }}
        >
          The following {columns.length} measurement{columns.length > 1 ? "s" : ""}{" "}
          contain only zero values throughout the year and are not applicable to
          this scenario's configuration.
        </p>

        {/* scrollable list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            marginBottom: 16,
            paddingRight: 4,
          }}
        >
          {columns.map((col, i) => (
            <div
              key={col}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 10,
                background:
                  i % 2 === 0
                    ? "rgba(148,163,184,0.06)"
                    : "transparent",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: "#475569",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 13, color: "#cbd5f5" }}>
                {shortLabel(col)}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  color: "#64748b",
                  fontStyle: "italic",
                  flexShrink: 0,
                }}
              >
                all zeros
              </span>
            </div>
          ))}
        </div>

        {/* close */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              border: "none",
              cursor: "pointer",
              padding: "6px 16px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
              background: "linear-gradient(135deg,#22c55e,#4ade80)",
              color: "#0b1120",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main card grid
   ══════════════════════════════════════════════════════════════ */
export default function PragueScenarioInfoCards({ summaries = {} }) {
  const entries = Object.entries(summaries);
  const [popup, setPopup] = useState({
    open: false,
    scenario: "",
    columns: [],
  });

  if (!entries.length) return null;

  return (
    <>
      <ExcludedColumnsPopup
        open={popup.open}
        scenarioName={popup.scenario}
        columns={popup.columns}
        onClose={() => setPopup({ open: false, scenario: "", columns: [] })}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        {entries.map(([name, s]) => {
          const columns = s.columnSums || {};
          const nullKeys = Object.entries(columns)
            .filter(([, v]) => v === 0)
            .map(([k]) => k);
          const description = buildDescription(name, columns);

          return (
            <div
              key={name}
              style={{
                borderRadius: 16,
                padding: 16,
                background: "rgba(248,250,252,0.96)",
                boxShadow:
                  "0 18px 40px rgba(15,23,42,0.14), 0 0 0 1px rgba(148,163,184,0.3)",
              }}
            >
              {/* card title */}
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#0f172a",
                  marginBottom: 8,
                }}
              >
                {name}
              </div>

              {/* human-readable description */}
              <p
                style={{
                  margin: "0 0 14px",
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "#475569",
                }}
              >
                {description}
              </p>

              {/* single button to reveal excluded columns */}
              {nullKeys.length > 0 && (
                <button
                  onClick={() =>
                    setPopup({ open: true, scenario: name, columns: nullKeys })
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    border: "none",
                    cursor: "pointer",
                    padding: "6px 14px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#64748b",
                    background: "rgba(148,163,184,0.10)",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(148,163,184,0.18)";
                    e.currentTarget.style.color = "#334155";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(148,163,184,0.10)";
                    e.currentTarget.style.color = "#64748b";
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    style={{ flexShrink: 0 }}
                  >
                    <circle
                      cx="8"
                      cy="8"
                      r="7"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                    <text
                      x="8"
                      y="11.5"
                      textAnchor="middle"
                      fill="currentColor"
                      fontSize="10"
                      fontWeight="700"
                      fontFamily="sans-serif"
                    >
                      i
                    </text>
                  </svg>
                  {nullKeys.length} excluded measurement{nullKeys.length > 1 ? "s" : ""}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
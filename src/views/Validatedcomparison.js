// src/views/ValidatedComparison.jsx
//
// The authoritative validated-results surface, driven entirely by the bundled
// release CSVs (five-seed means). Deliberately separate from the live
// execute/status/result tool. Renders:
//   1. Primary comparison: Baseline / A / B / C0 at full observed demand.
//   2. D / E frontage-only views (no totals / VKT / total emissions).
//   3. Supplementary validated sensitivity analyses (C1, demand response).
//
// Accessibility per HANDOVER_FRONTEND.md: blue-orange-purple palette, never
// red/green alone; every direction is paired with an arrow glyph and a text
// label. Warnings sit next to the affected KPIs.

import React, { useEffect, useMemo, useState } from "react";
import { SlArrowRight, SlArrowDown, SlClose } from "react-icons/sl";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  loadValidatedResults,
  readKpi,
  readValidity,
  VALIDATED_SCENARIOS,
  FULL_COMPARISON_KPIS,
  FRONTAGE_KPIS,
  C1_CASES,
  DR_LEVELS,
  DR_BASES,
  ALL_KPIS,
  SUMO_RELEASE,
} from "../data/sumo/validatedResults";

// Accessible palette (blue / orange / purple family + neutrals). No red/green.
const PALETTE = ["#2F6FA8", "#E0A458", "#7A5EA6", "#4B8B7F", "#B0668F", "#6B7280"];
const NUMBER_LOCALE = "en-GB";

const fmt = (value, decimals = 1) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  const f = Math.pow(10, decimals);
  return (Math.round(value * f) / f).toLocaleString(NUMBER_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

// Direction of change vs a reference, expressed with glyph + word (never colour
// alone). "lower"/"higher" say which way is *better* for that KPI.
const describeChange = (pct, direction) => {
  if (pct == null || Math.abs(pct) < 0.05) {
    return { glyph: "\u2192", word: "no change", tone: "neutral" };
  }
  const up = pct > 0;
  let tone = "neutral";
  if (direction === "lower") tone = up ? "worse" : "better";
  else if (direction === "higher") tone = up ? "better" : "worse";
  return {
    glyph: up ? "\u2191" : "\u2193",
    word: tone === "neutral" ? (up ? "higher" : "lower") : tone,
    tone,
  };
};

const TONE_COLOR = { better: "#2F6FA8", worse: "#B0668F", neutral: "#6B7280" };

// A non-interactive, Chip-like label. Deliberately NOT MUI <Chip>: the host
// app misconfigures Chip's onClick globally, which throws on click. A plain
// styled Box looks the same and has no click machinery to break.
const StatusPill = ({ label, sx }) => (
  <Box
    component="span"
    sx={{
      display: "inline-flex",
      alignItems: "center",
      px: 1.25,
      py: 0.25,
      borderRadius: 999,
      border: "1px solid rgba(0,0,0,0.23)",
      fontSize: "0.75rem",
      lineHeight: 1.7,
      whiteSpace: "nowrap",
      ...sx,
    }}
  >
    {label}
  </Box>
);

const STATUS_SX = {
  Reference: { color: "#2F6FA8", borderColor: "rgba(47,111,168,0.5)" },
  default: { color: "#7A5EA6", borderColor: "rgba(122,94,166,0.5)" },
};

const FIG_BASE = `${process.env.PUBLIC_URL || ""}/data/sumo/figures`;

// Shared style for the collapsible toggle buttons so they read as clickable.
const TOGGLE_BUTTON_SX = {
  color: "#2F6FA8",
  borderColor: "rgba(47,111,168,0.5)",
  textTransform: "none",
  fontWeight: 600,
  "&:hover": {
    borderColor: "#2F6FA8",
    backgroundColor: "rgba(47,111,168,0.06)",
  },
};

// Collapsible strip of scenario schematics (with alt text) for a group.
// Clicking a schematic opens it enlarged in a modal overlay; closing the modal
// returns to exactly the same view (same tab, same scroll position) since it
// is layered on top and changes no page state.
const ScenarioSchematics = ({ scenarios }) => {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(null); // the scenario whose figure is enlarged
  const withFig = scenarios.filter((s) => s.figure);
  if (!withFig.length) return null;

  return (
    <Box>
      <Button
        size="small"
        variant="outlined"
        onClick={() => setOpen((v) => !v)}
        endIcon={open ? <SlArrowDown /> : <SlArrowRight />}
        sx={TOGGLE_BUTTON_SX}
      >
        {open ? "Hide scenario schematics" : "Show scenario schematics"}
      </Button>
      <Collapse in={open}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
            mt: 1,
          }}
        >
          {withFig.map((s) => (
            <Card key={s.csvId} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  {s.label}: {s.title}
                </Typography>
                <Box
                  role="button"
                  tabIndex={0}
                  aria-label={`Enlarge schematic: ${s.label} ${s.title}`}
                  onClick={() => setZoomed(s)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setZoomed(s);
                    }
                  }}
                  sx={{
                    position: "relative",
                    cursor: "zoom-in",
                    borderRadius: 1,
                    overflow: "hidden",
                    transition: "box-shadow 0.15s, transform 0.15s",
                    "&:hover": {
                      boxShadow: "0 0 0 2px rgba(47,111,168,0.5)",
                    },
                    "&:hover .zoom-hint": { opacity: 1 },
                    "&:focus-visible": {
                      outline: "2px solid #2F6FA8",
                      outlineOffset: 2,
                    },
                  }}
                >
                  <Box
                    component="img"
                    src={`${FIG_BASE}/${s.figure}`}
                    alt={s.figureAlt || `${s.label} corridor schematic`}
                    sx={{ width: "100%", height: "auto", display: "block" }}
                    loading="lazy"
                  />
                  <Box
                    className="zoom-hint"
                    sx={{
                      position: "absolute",
                      bottom: 8,
                      right: 8,
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                      fontSize: "0.7rem",
                      color: "#fff",
                      backgroundColor: "rgba(0,0,0,0.6)",
                      opacity: 0,
                      transition: "opacity 0.15s",
                      pointerEvents: "none",
                    }}
                  >
                    Click to enlarge
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Collapse>

      {/* Lightbox overlay: opens on top and closes back to the same view. */}
      <Dialog
        open={Boolean(zoomed)}
        onClose={() => setZoomed(null)}
        maxWidth="lg"
        fullWidth
      >
        {zoomed && (
          <>
            <DialogTitle
              sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}
            >
              <Typography component="span" variant="subtitle1" fontWeight={700}>
                {zoomed.label}: {zoomed.title}
              </Typography>
              <IconButton aria-label="Close enlarged schematic" onClick={() => setZoomed(null)} size="small">
                <SlClose />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Box
                component="img"
                src={`${FIG_BASE}/${zoomed.figure}`}
                alt={zoomed.figureAlt || `${zoomed.label} corridor schematic`}
                sx={{ width: "100%", height: "auto", display: "block" }}
              />
              {zoomed.figureAlt && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                  {zoomed.figureAlt}
                </Typography>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/* Bar chart for one KPI across a set of scenarios                      */
/* ------------------------------------------------------------------ */

const KpiBarChart = ({ kpi, rows }) => {
  const data = rows
    .map((r) => ({ name: r.label, value: r.valueByKpi?.[kpi.key] }))
    .filter((d) => typeof d.value === "number");

  if (!data.length) return null;

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Typography variant="subtitle2" fontWeight={700}>
          {kpi.label}
          {kpi.unit ? ` (${kpi.unit})` : ""}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {kpi.direction === "lower"
            ? "Lower is better"
            : kpi.direction === "higher"
            ? "Higher is better"
            : "Context indicator"}
        </Typography>
        <Box sx={{ height: 260, mt: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `${fmt(v, kpi.decimals)}${kpi.unit ? ` ${kpi.unit}` : ""}`} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((d, i) => (
                  <Cell key={d.name} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* Table of % change vs a reference, with glyph+word (accessible)       */
/* ------------------------------------------------------------------ */

const ChangeTable = ({ kpis, rows, referenceLabel }) => (
  <Box sx={{ overflowX: "auto" }}>
    <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
      <Box component="thead">
        <Box component="tr">
          <Box component="th" sx={{ textAlign: "left", p: 1, borderBottom: "1px solid rgba(0,0,0,0.12)", backgroundColor: "transparent", color: "text.primary" }}>
            <Typography variant="caption" fontWeight={700}>Indicator</Typography>
          </Box>
          {rows.map((r) => (
            <Box component="th" key={r.label} sx={{ textAlign: "right", p: 1, borderBottom: "1px solid rgba(0,0,0,0.12)", backgroundColor: "transparent", color: "text.primary" }}>
              <Typography variant="caption" fontWeight={700}>{r.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
      <Box component="tbody">
        {kpis.map((kpi) => (
          <Box component="tr" key={kpi.key}>
            <Box component="td" sx={{ p: 1, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <Typography variant="body2">
                {kpi.label}{kpi.unit ? ` (${kpi.unit})` : ""}
              </Typography>
            </Box>
            {rows.map((r) => {
              const isRef = r.isReference;
              const ch = isRef ? null : describeChange(r.pctByKpi?.[kpi.key], kpi.direction);
              return (
                <Box component="td" key={r.label} sx={{ p: 1, textAlign: "right", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <Typography variant="body2" fontWeight={700}>
                    {fmt(r.valueByKpi?.[kpi.key], kpi.decimals)}
                  </Typography>
                  {isRef ? (
                    <Typography variant="caption" color="text.secondary">
                      {referenceLabel}
                    </Typography>
                  ) : ch ? (
                    <Typography variant="caption" sx={{ color: TONE_COLOR[ch.tone], fontWeight: 700 }}>
                      {ch.glyph} {fmt(Math.abs(r.pctByKpi?.[kpi.key] ?? 0), 1)}% {ch.word}
                    </Typography>
                  ) : null}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  </Box>
);

/* ------------------------------------------------------------------ */
/* Main section                                                        */
/* ------------------------------------------------------------------ */

const REQUIRED_NOTICES = [
  {
    key: "evidence",
    text: "Scenarios A-C are derived from the 2025 road-safety inspection. D and E are supplementary concepts supplied separately by the mobility expert.",
  },
  {
    key: "proxy",
    text: "Some physical design features - such as lighting, markings, curbless materials and continuous shared-space behavior - are documented qualitatively or represented through bounded operational proxies.",
  },
  {
    key: "oneway",
    text: "D/E results describe the school frontage. Private traffic diverted beyond the closure leaves the modeled boundary, so neighbourhood-wide time, congestion and emissions are not estimated.",
  },
  {
    key: "safety",
    text: "SUMO collision and overlap outputs are simulation diagnostics, not predicted crashes or measured safety benefits.",
  },
];

// Method & limitations content (condensed from HANDOVER_FRONTEND.md).
const METHOD_SECTIONS = [
  {
    title: "Network and calibration",
    points: [
      "Local SUMO study area around the school corridor.",
      "Baseline calibrated to the raw school sensor day (cars, bikes+moto, pedestrians).",
      "15-minute pedestrian profile preserved.",
    ],
  },
  {
    title: "Emissions",
    points: [
      "Belgium 2025 passenger-fleet mix, HBEFA-based emission classes.",
      "Reported as absolute totals and per vehicle-kilometre (VKT).",
      "Tailpipe emissions only.",
    ],
  },
  {
    title: "Scenario building",
    points: [
      "A/B/C0 built from the road-safety report text.",
      "D and E built from concept figures as local corridor proxies.",
      "C1 and demand-response cases are validated sensitivities, not executable scenarios.",
    ],
  },
  {
    title: "What SUMO represents only indirectly",
    points: [
      "Visibility improvements, markings and curb character.",
      "Raised-surface design quality and informal shared-space behaviour.",
      "Onward diversion beyond the modeled boundary (affects D/E).",
    ],
  },
];

// Public reference downloads. Files served from public/data/sumo/ where present;
// links can be repointed to the archival deposit when finalised.
const DOWNLOADS = [
  { label: "Comparison summary (CSV)", href: `${process.env.PUBLIC_URL || ""}/data/sumo/replicate_summary.csv` },
  { label: "One-way summary (CSV)", href: `${process.env.PUBLIC_URL || ""}/data/sumo/scenario_oneway_summary.csv` },
  { label: "C1 interaction summary (CSV)", href: `${process.env.PUBLIC_URL || ""}/data/sumo/scenario_C1_interaction_summary.csv` },
];

const buildRows = (table, scenarios, kpis, referenceCsvId) => {
  const ref = table[referenceCsvId];
  return scenarios.map((sc) => {
    const valueByKpi = {};
    const pctByKpi = {};
    kpis.forEach((kpi) => {
      const cur = readKpi(table, sc.csvId, kpi);
      valueByKpi[kpi.key] = cur?.value ?? null;
      const refVal = ref ? Number(ref[kpi.key]) : null;
      if (cur?.value != null && Number.isFinite(refVal) && refVal !== 0) {
        pctByKpi[kpi.key] = ((cur.value - refVal) / Math.abs(refVal)) * 100;
      }
    });
    return {
      label: sc.label,
      csvId: sc.csvId,
      isReference: sc.csvId === referenceCsvId,
      valueByKpi,
      pctByKpi,
    };
  });
};

const ValidatedComparison = () => {
  const [table, setTable] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [tab, setTab] = useState(0);
  const [drBase, setDrBase] = useState(DR_BASES[0].prefix);
  const [showMethod, setShowMethod] = useState(false);

  useEffect(() => {
    let active = true;
    loadValidatedResults()
      .then(({ replicateById }) => {
        if (active) setTable(replicateById);
      })
      .catch((e) => active && setLoadError(e.message || "Failed to load validated results."));
    return () => {
      active = false;
    };
  }, []);

  const primary = useMemo(
    () => VALIDATED_SCENARIOS.filter((s) => s.group === "primary"),
    []
  );
  const oneway = useMemo(
    () => VALIDATED_SCENARIOS.filter((s) => s.group === "oneway"),
    []
  );

  const primaryRows = useMemo(
    () => (table ? buildRows(table, primary, FULL_COMPARISON_KPIS, "current") : []),
    [table, primary]
  );

  // Any primary scenario that isn't "stable" or shows teleports is flagged.
  const invalidPrimary = useMemo(() => {
    if (!table) return [];
    return primary
      .map((s) => ({ s, v: readValidity(table, s.csvId) }))
      .filter(({ v }) => v && (v.status !== "stable" || (v.teleports || 0) > 0))
      .map(({ s }) => s.label);
  }, [table, primary]);

  if (loadError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Could not load the validated results ({loadError}). The live simulation
        tool above is unaffected.
      </Alert>
    );
  }

  if (!table) {
    return (
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }}>
        <CircularProgress size={20} sx={{ color: PALETTE[0] }} />
        <Typography variant="body2" color="text.secondary">
          Loading validated results…
        </Typography>
      </Stack>
    );
  }

  const releaseChip = `${SUMO_RELEASE.repoVersion} / ${SUMO_RELEASE.modelVersion} / SUMO ${SUMO_RELEASE.sumoVersion}`;

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
        <Typography variant="h6" fontWeight={800}>
          Validated scenario comparison
        </Typography>
        <StatusPill label={releaseChip} sx={{ color: "text.secondary" }} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {SUMO_RELEASE.officialSeedNote} These are the authoritative study
        figures and are independent of the live single-run tool above.
      </Typography>

      {invalidPrimary.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          The following scenarios did not pass validation and are shown without
          normalized indicators: {invalidPrimary.join(", ")}.
        </Alert>
      )}

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2, "& .MuiTabs-indicator": { backgroundColor: PALETTE[0] } }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Primary comparison" />
        <Tab label="One-way frontage (D / E)" />
        <Tab label="Sensitivity analyses" />
      </Tabs>

      {/* -------- Tab 0: primary Baseline / A / B / C0 -------- */}
      {tab === 0 && (
        <Stack spacing={3}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {primary.map((s) => (
              <StatusPill
                key={s.csvId}
                label={`${s.label}: ${s.status}`}
                sx={STATUS_SX[s.status] || STATUS_SX.default}
              />
            ))}
          </Stack>

          <ScenarioSchematics scenarios={primary} />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            {FULL_COMPARISON_KPIS.map((kpi) => (
              <KpiBarChart key={kpi.key} kpi={kpi} rows={primaryRows} />
            ))}
          </Box>

          <Divider />
          <Typography variant="subtitle1" fontWeight={700}>
            Change vs baseline
          </Typography>
          <ChangeTable kpis={FULL_COMPARISON_KPIS} rows={primaryRows} referenceLabel="reference" />
        </Stack>
      )}

      {/* -------- Tab 1: D / E frontage-only -------- */}
      {tab === 1 && (
        <Stack spacing={3}>
          <Alert severity="info">
            {REQUIRED_NOTICES.find((n) => n.key === "oneway").text}
          </Alert>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {oneway.map((s) => (
              <StatusPill key={s.csvId} label={`${s.label}: ${s.status}`} sx={STATUS_SX.default} />
            ))}
          </Stack>

          <ScenarioSchematics scenarios={oneway} />

          {(() => {
            // Frontage view compares Baseline + D + E on frontage KPIs only.
            const frontageScenarios = [
              VALIDATED_SCENARIOS.find((s) => s.csvId === "current"),
              ...oneway,
            ];
            const rows = buildRows(table, frontageScenarios, FRONTAGE_KPIS, "current");
            return (
              <>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  {FRONTAGE_KPIS.map((kpi) => (
                    <KpiBarChart key={kpi.key} kpi={kpi} rows={rows} />
                  ))}
                </Box>
                <Divider />
                <Typography variant="subtitle1" fontWeight={700}>
                  Frontage change vs baseline
                </Typography>
                <ChangeTable kpis={FRONTAGE_KPIS} rows={rows} referenceLabel="reference" />
              </>
            );
          })()}
        </Stack>
      )}

      {/* -------- Tab 2: sensitivity analyses (C1 + demand response) -------- */}
      {tab === 2 && (
        <Stack spacing={4}>
          <Alert severity="info">
            These are validated sensitivity analyses from the official CSVs. They
            are not executable scenarios and are not part of the live simulation
            selector above.
          </Alert>

          {/* C1 pedestrian-interaction sensitivity */}
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
              C1 - pedestrian-priority interaction sensitivity
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              One real priority crossing with 0%, 25%, 50% and 75% of observed
              pedestrians routed across it. All effects are referenced to C1_X0.
            </Typography>
            {(() => {
              const c1Scenarios = C1_CASES.map((c) => ({
                csvId: c.csvId,
                label: c.label,
              }));
              const c1Kpis = [ALL_KPIS.spotSpeed, ALL_KPIS.busTimeLoss, ALL_KPIS.co2PerVkm];
              const rows = buildRows(table, c1Scenarios, c1Kpis, "C1_X0");
              return (
                <>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                      gap: 2,
                    }}
                  >
                    {c1Kpis.map((kpi) => (
                      <KpiBarChart key={kpi.key} kpi={kpi} rows={rows} />
                    ))}
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <ChangeTable kpis={c1Kpis} rows={rows} referenceLabel="reference (X0)" />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Overlap diagnostics are uncalibrated SUMO overlap events, not crashes.
                  </Typography>
                </>
              );
            })()}
          </Box>

          <Divider />

          {/* Demand-response sensitivity */}
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
              Assumed demand response
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Cars, trucks and motorcycles are reduced by 15% and 30% while buses,
              bicycles and pedestrians remain fixed. Assumed, not observed.
            </Typography>

            <Select
              size="small"
              value={drBase}
              onChange={(e) => setDrBase(e.target.value)}
              sx={{ mb: 2, minWidth: 200 }}
            >
              {DR_BASES.map((b) => (
                <MenuItem key={b.prefix} value={b.prefix}>
                  {b.label}
                </MenuItem>
              ))}
            </Select>

            {(() => {
              const drScenarios = DR_LEVELS.map((lvl) => ({
                csvId: `${drBase}_${lvl.suffix}`,
                label: lvl.label,
              })).filter((s) => table[s.csvId]);
              const drKpis = [ALL_KPIS.spotSpeed, ALL_KPIS.over36, ALL_KPIS.co2PerVkm];
              const rows = buildRows(table, drScenarios, drKpis, drScenarios[0]?.csvId);
              return (
                <>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                      gap: 2,
                    }}
                  >
                    {drKpis.map((kpi) => (
                      <KpiBarChart key={kpi.key} kpi={kpi} rows={rows} />
                    ))}
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <ChangeTable kpis={drKpis} rows={rows} referenceLabel="observed" />
                  </Box>
                </>
              );
            })()}
          </Box>
        </Stack>
      )}

      {/* Required notices, kept adjacent to the data */}
      <Divider sx={{ my: 3 }} />
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        Interpretation notices
      </Typography>
      <Stack spacing={1}>
        {REQUIRED_NOTICES.map((n) => (
          <Alert key={n.key} severity="info" icon={false} sx={{ py: 0.5 }}>
            {n.text}
          </Alert>
        ))}
      </Stack>

      {/* Method & limitations (collapsible, from HANDOVER_FRONTEND.md) */}
      <Divider sx={{ my: 3 }} />
      <Box>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setShowMethod((v) => !v)}
          endIcon={showMethod ? <SlArrowDown /> : <SlArrowRight />}
          sx={TOGGLE_BUTTON_SX}
        >
          {showMethod ? "Hide method and limitations" : "Method and limitations"}
        </Button>
        <Collapse in={showMethod}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 3,
              mt: 1,
            }}
          >
            {METHOD_SECTIONS.map((sec) => (
              <Box key={sec.title}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                  {sec.title}
                </Typography>
                <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
                  {sec.points.map((p) => (
                    <Typography
                      component="li"
                      variant="body2"
                      color="text.secondary"
                      key={p}
                      sx={{ mb: 0.25 }}
                    >
                      {p}
                    </Typography>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </Collapse>
      </Box>

      {/* Downloads (evidence) */}
      <Divider sx={{ my: 3 }} />
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        Downloads and evidence
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Reference documents for release {SUMO_RELEASE.repoVersion}. Raw XML
        outputs are available through the archival deposit rather than here.
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {DOWNLOADS.map((d) => (
          <Button
            key={d.label}
            component="a"
            href={d.href}
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            variant="outlined"
            sx={{ color: PALETTE[0], borderColor: "rgba(47,111,168,0.4)" }}
          >
            {d.label}
          </Button>
        ))}
      </Stack>
    </Box>
  );
};

export default ValidatedComparison;
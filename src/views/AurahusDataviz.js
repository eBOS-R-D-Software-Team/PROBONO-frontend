// src/views/AurahusDataviz.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  Grid,
  Paper,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
} from "@mui/material";
import { SlArrowRight } from "react-icons/sl";
import { Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import Tree from "rc-tree";
import "rc-tree/assets/index.css";
import "antd/dist/reset.css"; 
import { useLocation, useNavigate } from "react-router-dom";


ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const pretty = (k) => k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
const UNIT_MAP = {
  living_area: "Living Area (m²)",
  added_GWP: "Added GWP (kg CO₂ eq)",
  added_CO2: "Added CO₂ (kg CO₂ eq)",
};

const theme = createTheme({
  palette: {
    primary: { main: "#49c5b6" }, // Matched your global teal accent
    text: { primary: "#1e293b", secondary: "#64748b" },
    background: { default: "#f8fafc" },
  },
  typography: { fontFamily: "'Segoe UI', Inter, sans-serif" },
  shape: { borderRadius: 16 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.05)",
          border: "1px solid rgba(255,255,255,0.6)",
        },
      },
    },
  },
});

// ----- rc-tree utils -----
const toRCTreeData = (lines) => {
  let nextId = 1;
  const root = [];
  const stack = [{ depth: -1, children: root }];
  lines.forEach((ln) => {
    if (!ln.trim()) return;
    const indent = ln.match(/^\s*/)[0].length;
    const depth = indent / 2;
    const [, label] = ln.trim().match(/^[+-]\s*\[(.*)]/) || [];
    const name = label || ln.trim();
    let className = "";
    if (/^feature[: ]/i.test(name)) className = "feature-node";
    if (/^subject[: ]/i.test(name)) className = "subject-node";
    if (/^approach[: ]/i.test(name)) className = "approach-node";
    const node = {
      key: `n-${nextId++}`,
      title: <span className={className}>{name}</span>,
      children: [],
    };
    while (depth <= stack[stack.length - 1].depth) stack.pop();
    stack[stack.length - 1].children.push(node);
    stack.push({ ...node, depth });
  });
  return root;
};

// ----- Tree statistics calculation -----
function getTreeStats(tree) {
  let numSubjects = 0;
  let numFeatures = 0;
  let featuresPerSubject = [];
  let scenarioSpace = 1;

  function walk(node) {
    if (
      node.title &&
      (typeof node.title === "string"
        ? node.title.match(/^subject[: ]/i)
        : node.title.props.className?.includes("subject-node"))
    ) {
      numSubjects++;
      let subjectFeatureCount = 0;
      if (node.children && node.children.length) {
        node.children.forEach((c) => {
          if (
            c.title &&
            (typeof c.title === "string"
              ? c.title.match(/^feature[: ]/i)
              : c.title.props.className?.includes("feature-node"))
          ) {
            numFeatures++;
            subjectFeatureCount++;
          }
          walk(c);
        });
      }
      featuresPerSubject.push(subjectFeatureCount);
      scenarioSpace *= subjectFeatureCount > 0 ? subjectFeatureCount : 1;
    } else if (node.children && node.children.length) {
      node.children.forEach(walk);
    }
  }
  tree.forEach(walk);
  const meanFeatures = featuresPerSubject.length
    ? (featuresPerSubject.reduce((a, b) => a + b, 0) /
      featuresPerSubject.length)
    : 0;
  return {
    scenarioSpace,
    numSubjects,
    numFeatures,
    meanFeatures: meanFeatures.toFixed(2),
  };
}

const AurahusDataviz = () => {
  const [rows, setRows] = useState([]);
  const [cols, setCols] = useState([]);
  const [xAxis, setX] = useState("");
  const [yAxis, setY] = useState("");
  const [map, setMap] = useState(null);
  const [rcTreeData, setRCTreeData] = useState([]);
  const [stats, setStats] = useState(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const labName = location.state?.labName || "Århus LL";

  // CSV loading logic
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/data/scenarios.csv");
        const text = await res.text();
        const rowsArr = text
          .trim()
          .split("\n")
          .map(row => row.split(";").map(cell => cell.replace(',', '.')));
        const header = rowsArr[0];
        const data = rowsArr.slice(1).map(row =>
          header.reduce((obj, key, i) => {
            const v = row[i];
            const num = v && !isNaN(v) && v !== "" ? Number(v) : v;
            obj[key] = num;
            return obj;
          }, {})
        );
        setRows(data);
        setCols(header);
      } catch (e) {
        console.error("CSV load error", e);
      }
    })();
  }, []);

  // rc-tree loading logic
  useEffect(() => {
    (async () => {
      try {
        const txt = await (await fetch("/data/action_tree.ndm")).text();
        const treeData = toRCTreeData(txt.split(/\r?\n/));
        setRCTreeData(treeData);
        setStats(getTreeStats(treeData));
      } catch (e) {
        console.error("Cannot load action_tree.ndm", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (map) return;
    const s = document.createElement("script");
    s.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyAciiAXvOGpr61JmWa_MkbwwiJIJulOsrA&libraries=places";
    s.async = true;
    s.defer = true;
    s.onload = () => {
      const google = window.google;
      const center = { lat: 56.16608795224402, lng: 10.200139599559071 };
      const m = new google.maps.Map(document.getElementById("map"), {
        center,
        zoom: 16,
        mapTypeId: google.maps.MapTypeId.SATELLITE,
      });
      new google.maps.Marker({ map: m, position: center, title: "Århus LL" });
      setMap(m);
    };
    document.head.appendChild(s);
  }, [map]);

  const chartData = useMemo(() => {
    if (!xAxis || !yAxis || rows.length === 0) return null;
    const num = (v) => Number(String(v).replace(",", ".").replace(/\s/g, ""));
    const pts = rows
      .map((r) => ({ x: num(r[xAxis]), y: num(r[yAxis]) }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (pts.length === 0) return null;
    return {
      datasets: [
        {
          label: `${yAxis} vs ${xAxis}`,
          data: pts,
          pointStyle: "circle", // Modern circle points
          pointRadius: 5,
          pointBackgroundColor: "rgba(73, 197, 182, 0.7)", // Teal transparent
          pointBorderColor: "#49c5b6",
          pointBorderWidth: 1,
        },
      ],
    };
  }, [rows, xAxis, yAxis]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: xAxis && yAxis ? `${yAxis} vs ${xAxis}` : "",
          font: { size: 16, weight: "bold", family: "'Segoe UI', sans-serif" },
          color: "#1e293b"
        },
      },
      scales: {
        x: { 
            title: { display: true, text: UNIT_MAP[xAxis] || pretty(xAxis), color: "#64748b" },
            grid: { color: "#e2e8f0" }
        },
        y: { 
            title: { display: true, text: UNIT_MAP[yAxis] || pretty(yAxis), color: "#64748b" },
            grid: { color: "#e2e8f0" }
        },
      },
    }),
    [xAxis, yAxis]
  );

  return (
    <ThemeProvider theme={theme}>  
      <CssBaseline />
      
      <div className="aurahus-dataviz-page">
        {/* Breadcrumb */}
        <div className="breadcrumb-container">
            <a href="/" className="crumb-link">Home</a>
            <SlArrowRight className="crumb-arrow" />
            <a href="/labs" className="crumb-link">Data Visualizations</a>
            <SlArrowRight className="crumb-arrow" />
            {labName && (
            <>
                <span className="crumb-link" onClick={() => navigate(-1)} style={{cursor: 'pointer'}}>{labName}</span>
                <SlArrowRight className="crumb-arrow" />
            </>
            )}
            <span className="crumb-current">NovaDm</span>
        </div>

        {/* Map */}
        <Box id="map" className="map-container" />

        {/* Controls Card */}
        <div className="controls-card">
            <h3 className="section-title">Scenario Parameters</h3>
            <div className="selectors-row">
                <FormControl size="small" fullWidth>
                    <InputLabel>X-Axis Metric</InputLabel>
                    <Select value={xAxis} label="X-Axis Metric" onChange={(e) => setX(e.target.value)}>
                    {cols.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                </FormControl>
                
                <FormControl size="small" fullWidth>
                    <InputLabel>Y-Axis Metric</InputLabel>
                    <Select value={yAxis} label="Y-Axis Metric" onChange={(e) => setY(e.target.value)}>
                    {cols.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                </FormControl>
            </div>
        </div>

        {/* Main Content Grid */}
        <div className="dashboard-grid">
            
            {/* Left Column: Tree & Stats */}
            <div className="left-column">
                <Paper className="modern-card tree-card">
                    <Typography variant="h6" className="card-header">Action Tree</Typography>
                    <Divider />
                    <div className="tree-scroll-area">
                        <Tree
                            treeData={rcTreeData}
                            showLine
                            defaultExpandAll
                            selectable={false}
                        />
                    </div>
                </Paper>

                {stats && (
                    <Paper className="modern-card stats-card">
                        <Typography variant="h6" className="card-header">Statistics</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <div className="stats-content">
                            <div className="stat-row">
                                <span>Scenario space:</span> <strong>{Number(stats.scenarioSpace).toExponential(1)}</strong>
                            </div>
                            <div className="stat-row">
                                <span>Subjects:</span> <strong>{stats.numSubjects}</strong>
                            </div>
                            <div className="stat-row">
                                <span>Features:</span> <strong>{stats.numFeatures}</strong>
                            </div>
                            <div className="stat-row">
                                <span>Mean features/subject:</span> <strong>{stats.meanFeatures}</strong>
                            </div>
                        </div>
                    </Paper>
                )}
            </div>

            {/* Right Column: Chart */}
            <div className="right-column">
                <Paper className="modern-card chart-card">
                    <Typography variant="h6" className="card-header">Scatter Analysis</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <div className="chart-wrapper">
                        {chartData ? (
                            <Scatter data={chartData} options={chartOptions} />
                        ) : (
                            <div className="empty-state">
                                <Typography variant="body1" color="text.secondary">
                                    Select X and Y metrics above to visualize data.
                                </Typography>
                            </div>
                        )}
                    </div>
                </Paper>
            </div>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default AurahusDataviz;
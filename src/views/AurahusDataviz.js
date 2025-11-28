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
    primary: { main: "#0097a7" },
    background: { default: "#f4f6fa" },
  },
  typography: { fontFamily: "Inter, Roboto, sans-serif" },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          padding: 20,
          backgroundColor: "#fff",
          boxShadow: "0 4px 12px rgba(0,0,0,.06)",
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
    // Decide className for node type
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
     const labName = location.state?.labName;

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
          pointStyle: "rectRounded",
          pointRadius: 6,
          pointBackgroundColor: theme.palette.primary.main,
        },
      ],
    };
  }, [rows, xAxis, yAxis]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: xAxis && yAxis ? `${yAxis} vs ${xAxis}` : "",
          font: { size: 16, weight: "bold" },
        },
        chartAreaBorder: { borderColor: "#000", borderWidth: 1 },
      },
      scales: {
        x: { title: { display: true, text: UNIT_MAP[xAxis] || pretty(xAxis) } },
        y: { title: { display: true, text: UNIT_MAP[yAxis] || pretty(yAxis) } },
      },
    }),
    [xAxis, yAxis]
  );

  useEffect(() => {
    ChartJS.register({
      id: "chartAreaBorder",
      beforeDraw: (chart) => {
        const { ctx, chartArea, options } = chart;
        if (!options.plugins.chartAreaBorder) return;
        const { left, top, width, height } = chartArea;
        ctx.save();
        ctx.strokeStyle = options.plugins.chartAreaBorder.borderColor;
        ctx.lineWidth = options.plugins.chartAreaBorder.borderWidth;
        ctx.strokeRect(left, top, width, height);
        ctx.restore();
      },
    });
  }, []);

  return (
    <ThemeProvider theme={theme}>  
      <CssBaseline />

      {/* Breadcrumb */}
      <Box sx={{ p: 1, display: "flex", alignItems: "center", gap: 1, fontSize: 14 }}>
         <a href="/">Home</a> <SlArrowRight />{" "}
              <a href="/labs">Data Visualizations</a> <SlArrowRight />{" "}
              {labName && (
                <>
                  <span
                    onClick={() => navigate(-1)}
                    style={{ cursor: "pointer" ,color: "#007bff",
    textDecoration: "none", }}
                  >
                    {labName}
                  </span>{" "}
                  <SlArrowRight />{" "}
                </>
              )}
              <span>NovaDm</span>
      </Box>

      {/* Google Map */}
      <Box
        id="map"
        sx={{ height: 400, mx: "auto", maxWidth: 1100, borderRadius: 3, overflow: "hidden", mb: 3 }}
      />

      {/* KPI selectors */}
      <Grid container justifyContent="center" spacing={2} mb={2}>
        <Grid item>
          <FormControl size="small">
            <InputLabel>X-Axis</InputLabel>
            <Select value={xAxis} label="X-Axis" onChange={(e) => setX(e.target.value)} sx={{ minWidth: 160 }}>
              {cols.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item>
          <FormControl size="small">
            <InputLabel>Y-Axis</InputLabel>
            <Select value={yAxis} label="Y-Axis" onChange={(e) => setY(e.target.value)} sx={{ minWidth: 160 }}>
              {cols.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Main content: 2 columns, left is stacked */}
      <Grid container justifyContent="center" alignItems="flex-start" spacing={3} mt={1}>
        {/* LEFT: Action Tree + Stats stacked */}
        <Grid item sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper sx={{ width: 350 }}>
            <Typography variant="h6" gutterBottom>
              Action Tree
            </Typography>
            <Divider sx={{ mb: 1 }} />
            <Tree
              treeData={rcTreeData}
              showLine
              defaultExpandAll
              selectable={false}
              style={{
                background: "none",
                fontFamily: "inherit",
                fontSize: 15,
                paddingLeft: 2,
                paddingRight: 2,
                minHeight: 300,
                maxHeight: 300,
                overflowY: "auto",
              }}
            />
          </Paper>
          {stats && (
            <Paper sx={{
              width: 350,
              p: 2,
              bgcolor: "#fff",
              borderRadius: 2,
              boxShadow: "0 2px 6px rgba(0,0,0,.04)",
              minHeight: 160,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <Typography variant="subtitle1" gutterBottom>
                Scenario Space Statistics
              </Typography>
              <Typography variant="body2">
                <b>Scenario space size:</b> {Number(stats.scenarioSpace).toExponential(1)}
                <br />
                <b>Number of subjects:</b> {stats.numSubjects}
                <br />
                <b>Number of features:</b> {stats.numFeatures}
                <br />
                <b>Mean features per subject:</b> {stats.meanFeatures}
              </Typography>
            </Paper>
          )}
        </Grid>
        {/* RIGHT: Scatter Plot */}
        <Grid item>
          <Paper sx={{ width: 450, minHeight: 380, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Scatter Plot
            </Typography>
            <Divider sx={{ mb: 1 }} />
            {chartData ? (
              <Scatter data={chartData} options={chartOptions} width={420} height={300} />
            ) : (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Choose two numeric KPIs to draw the scatter-plot.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </ThemeProvider>
  );
};

export default AurahusDataviz;

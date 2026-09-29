// src/config/searchIndex.js

const searchIndex = [
  // =========================================================
  // MAIN HMI PAGES
  // =========================================================
  {
    title: "Home",
    path: "/",
    category: "Page",
    keywords: ["home", "dashboard", "main"]
  },
  {
    title: "Solutions Catalogue",
    path: "/tools",
    category: "Page",
    keywords: ["solutions", "catalogue", "tools"]
  },
  {
    title: "Tools Description",
    path: "/tools-descriptions",
    category: "Page",
    keywords: ["tools", "description", "information"]
  },
  {
    title: "Living Labs",
    path: "/labs",
    category: "Page",
    keywords: ["living labs", "labs", "demonstrators"]
  },
  {
    title: "Settings",
    path: "/settings",
    category: "Page",
    keywords: ["settings", "configuration"]
  },

  // =========================================================
  // DUBLIN LIVING LAB
  // =========================================================
  {
    title: "Dublin - Electricity Usage",
    path: "/dub-elec-visualizations",
    category: "Dublin Living Lab",
    keywords: ["dublin", "electricity", "electricity usage", "energy"]
  },
  {
    title: "Dublin - Gas Usage",
    path: "/dub-gas-visualizations",
    category: "Dublin Living Lab",
    keywords: ["dublin", "gas", "gas usage"]
  },
  {
    title: "Dublin - Gasoil Usage",
    path: "/dub-gasoil-visualizations",
    category: "Dublin Living Lab",
    keywords: ["dublin", "gasoil", "oil", "usage"]
  },
  {
    title: "Dublin - Kerosene Usage",
    path: "/dub-kerosene-visualizations",
    category: "Dublin Living Lab",
    keywords: ["dublin", "kerosene", "fuel", "usage"]
  },
  {
    title: "Dublin - LPG Usage",
    path: "/dub-lpg-visualizations",
    category: "Dublin Living Lab",
    keywords: ["dublin", "lpg", "gas", "usage"]
  },
  {
    title: "Dublin - Petrol Usage",
    path: "/dub-petrol-visualizations",
    category: "Dublin Living Lab",
    keywords: ["dublin", "petrol", "fuel", "usage"]
  },
  {
    title: "Dublin - Road Diesel Usage",
    path: "/dub-road-diesel-derv",
    category: "Dublin Living Lab",
    keywords: ["dublin", "road diesel", "diesel", "derv", "fuel"]
  },
  {
    title: "Dublin - Solar Usage",
    path: "/dub-solar",
    category: "Dublin Living Lab",
    keywords: ["dublin", "solar", "renewable", "energy"]
  },
  {
    title: "Dublin - Wood Chips",
    path: "/dub-woodchips-35",
    category: "Dublin Living Lab",
    keywords: ["dublin", "wood chips", "biomass", "wood"]
  },
  {
    title: "Dublin - SmartCitizen",
    path: "/dub-smartcitizen-visualizations",
    category: "Dublin Living Lab",
    keywords: ["dublin", "smartcitizen", "smart citizen", "sensors"]
  },

  // =========================================================
  // PORTO LIVING LAB
  // =========================================================
  {
    title: "Porto Data Aggregations",
    path: "/porto-aggregates",
    category: "Porto Living Lab",
    keywords: ["porto", "data", "aggregations", "energy"]
  },
  {
    title: "PBN TrustedDBL",
    path: "/porto-nft",
    category: "Porto Living Lab",
    keywords: ["porto", "pbn", "trusted", "trusteddbl", "nft"]
  },

  // =========================================================
  // AARHUS LIVING LAB
  // =========================================================
  {
    title: "Aarhus - NovaDm Data",
    path: "/data-aurahus",
    category: "Aarhus Living Lab",
    keywords: ["aarhus", "aurahus", "novadm", "data"]
  },
  {
    title: "Aarhus - ProFormalise",
    path: "/heatmap-aurahus",
    category: "Aarhus Living Lab",
    keywords: ["aarhus", "aurahus", "proformalise", "heatmap"]
  },

  // =========================================================
  // PRAGUE LIVING LAB
  // =========================================================
  {
    title: "Prague Living Lab Data Visualizations",
    path: "/prague-living-lab",
    category: "Prague Living Lab",
    keywords: ["prague", "living lab", "data", "visualizations"]
  },

  // =========================================================
  // INTERNAL TOOLS
  // =========================================================
  {
    title: "Vcomfort Sensor Tool",
    path: "/cvs",
    category: "Tool",
    keywords: ["vcomfort", "sensor", "comfort", "cvs", "sensor data"]
  },
  {
    title: "HEGR EnergyPlus Resultviewer",
    path: "/hegr-energyplus",
    category: "Tool",
    keywords: ["hegr", "energyplus", "energy", "results", "viewer"]
  },
  {
    title: "SUMO Mobility Simulation",
    path: "/sumosimulation",
    category: "Tool",
    keywords: ["sumo", "mobility", "simulation", "traffic"]
  },
  {
    title: "3D Model Viewer",
    path: "/paraview-vis",
    category: "Tool",
    keywords: ["3d", "model", "viewer", "paraview"]
  },

  // =========================================================
  // EXTERNAL TOOLS
  // =========================================================
  {
    title: "CMS Optimization Tool",
    link: "https://probono-dev.stamtech.dev/sign-in?redirectURL=%2Fconstruction-sites",
    category: "External Tool",
    keywords: ["cms", "optimization", "construction"]
  },
  {
    title: "Demand and Response Platform Building Layer – DaRA",
    link: "http://dara.tpf.be/",
    category: "External Tool",
    keywords: ["dara", "demand", "response", "building"]
  },
  {
    title: "Demand and Response Platform Neighbourhood Layer - ePREDICT",
    link: "https://epredict.stamtech.dev/",
    category: "External Tool",
    keywords: ["epredict", "demand", "response", "neighbourhood"]
  },
  {
    title: "Demolition Tool",
    link: "https://probono.usc.es/",
    category: "External Tool",
    keywords: ["demolition", "construction"]
  },
  {
    title: "Energy Class Simulator",
    link: "https://energy-class-simulation.cds-probono.eu/",
    category: "External Tool",
    keywords: ["energy", "class", "simulator", "simulation"]
  },
  {
    title: "Green Pulse Monitor",
    link: "https://green-pulse-monitor.cds-probono.eu/",
    category: "External Tool",
    keywords: ["green", "pulse", "monitor"]
  },
  {
    title: "Open Knowledge-base",
    link: "https://www.probonoh2020kb.eu/",
    category: "External Tool",
    keywords: ["knowledge", "knowledge-base", "knowledge base"]
  },
  {
    title: "ProBIM Explorer",
    link: "https://probim-explorer.cds-probono.eu",
    category: "External Tool",
    keywords: ["probim", "bim", "explorer"]
  },
  {
    title: "SEEDS",
    link: "https://seeds.cds-probono.eu/",
    category: "External Tool",
    keywords: ["seeds"]
  },
  {
    title: "Thermal Comfort Recommendation Engine",
    link: "https://thermal-comfort-recom.cds-probono.eu/",
    category: "External Tool",
    keywords: ["thermal", "comfort", "recommendation", "engine"]
  },
  {
    title: "UrbanMP",
    link: "https://urbanmp.cds-probono.eu/select-location",
    category: "External Tool",
    keywords: ["urbanmp", "urban", "planning"]
  },
  {
    title: "Ventilation Assessment Tool",
    link: "https://v26093.ita.es/VentilationTool_HMI/",
    category: "External Tool",
    keywords: ["ventilation", "assessment", "air"]
  }
];

export default searchIndex;
// src/config/labMetricsConfig.js
import React from "react";
import {
  ImLeaf,
  ImFire,
  ImOffice,
  ImSun,
  ImLoop2,
} from "react-icons/im";

export const labMetrics = {
  // Dublin Living Lab (id: 1)
  1: [
    {
      id: 9,
      title: "Electricity Usage",
      icon: <ImLoop2 />,
      path: "/dub-elec-visualizations",
    },
    {
      id: 8,
      title: "Gas Usage",
      icon: <ImLoop2 />,
      path: "/dub-gas-visualizations",
    },
  ],

  // Porto Living Lab (id: 3)
  3: [
    {
      id: 1,
      title: "CO2 Emissions",
      icon: <ImLeaf />,
      path: "/data-visualizations",
    },
    {
      id: 4,
      title: "Energy Consumption",
      icon: <ImSun />,
      path: "/porto-lot2-consumption",
    },
    {
      id: 6,
      title: "Energy Production",
      icon: <ImSun />,
      path: "/porto-lot4-production",
    },
  ],

  // Aarhus Living Lab (id: 4)
  4: [
    {
      id: 2,
      title: "NovaDm data",
      icon: <ImFire />,
      path: "/data-aurahus",
    },
    {
      id: 3,
      title: "Building Occupancy",
      icon: <ImOffice />,
      path: "/heatmap-aurahus",
    },
  ],
};

// src/config/labMetricsConfig.js
import React from "react";
import {
  ImLeaf,
  ImFire,
  ImOffice,
  ImSun,
  ImLoop2,
  ImCompass, ImEarth,
} from "react-icons/im";
import { FaBolt, FaGasPump, FaTruck } from "react-icons/fa";
import {
  GiGasStove,
  GiOilDrum,
  GiOldLantern,
  GiJerrycan,
  GiWoodPile,
} from "react-icons/gi";
import { MdSolarPower } from "react-icons/md";

export const labMetrics = {
  // Dublin Living Lab (id: 1)
  1: [
    {
      id: 9,
      title: "Electricity Usage",
      icon: <FaBolt />,
      path: "/dub-elec-visualizations",
    },
    {
      id: 8,
      title: "Gas Usage",
      icon: <GiGasStove />,
      path: "/dub-gas-visualizations",
    },
    {
      id: 10,
      title: "Gasoil Usage",
      icon: <GiOilDrum />,
      path: "/dub-gasoil-visualizations",
    },
    {
      id: 11,
      title: "Kerosene Usage",
      icon: <GiOldLantern />,
      path: "/dub-kerosene-visualizations",
    },
    {
      id: 12,
      title: "LPG Usage",
      icon: <GiJerrycan />,
      path: "/dub-lpg-visualizations",
    },
    {
      id: 13,
      title: "Petrol Usage",
      icon: <FaGasPump />,
      path: "/dub-petrol-visualizations",
    },
    {
      id: 14,
      title: "Road Diesel Usage",
      icon: <FaTruck />,
      path: "/dub-road-diesel-derv",
    },
    {
      id: 15,
      title: "Solar Usage",
      icon: <MdSolarPower />,
      path: "/dub-solar",
    },
    {
      id: 16,
      title: "Wood Chips",
      icon: <GiWoodPile />,
      path: "/dub-woodchips-35",
    },
    {
      id: 17,
      title: "SmartCitizen",
      icon: <ImLoop2 />,
      path: "/dub-smartcitizen-visualizations",
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
      title: "ProFormalise",
      icon: <ImOffice />,
      path: "/heatmap-aurahus",
    },
    {
      id: 4,
      title: "SEEDS",
      icon: <ImEarth />,
      path: "",
    },
    {
      id: 5,
      title: "ProBIM Explorer",
      icon: <ImCompass />,
      path: "",
    },
    
  ],
};

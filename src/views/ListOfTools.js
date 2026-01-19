import React from 'react';
import ToolCard from '../components/ToolCard'; // Import the new component
import { ImAirplane, ImPower, ImWrench, ImCog, ImStatsDots, ImHammer, ImLab, ImSun, ImCompass, ImEarth } from "react-icons/im";
import { SlArrowRight } from "react-icons/sl";
import EnergyClassLogo from '../assets/images/Energy_class_simulation_icon.png';
import DownloadToolCard from "../components/DownloadToolCard";
import { ImDownload } from "react-icons/im";
 // Ensure this import exists

const ListOfTools = () => {
  const tools = [
    { title: 'Demolition Tool', link: 'https://probono.usc.es/', icon: ImHammer },
    { title: 'Open knowledge-base', link: 'https://www.probonoh2020kb.eu', icon: ImStatsDots },
    { title: 'Ventilation Assessment Tool', link: 'https://v24121.ita.es/VentilationTool_HMI/', icon: ImAirplane },
    { title: 'Demand and Response Platform Building Layer – DaRA', link: 'http://dara.tpf.be/', icon: ImCog },
    {
      title: 'Energy class simulator',
      link: 'https://energy-class-simulation.cds-probono.eu/',
      icon: ({ size }) => (
        <img
          src={EnergyClassLogo}
          alt="Energy Class Sim"
          style={{ width: size, height: size, objectFit: 'contain' }}
        />
      ),
    },
    { title: 'ePREDICT', link: 'https://anylogic.stamtech.dev/model/dcf2263c-2acb-40d1-ba83-3c7a92c1e55d', icon: ImLab },
    { title: 'CMS Optimization tool', link: 'https://probono-dev.stamtech.dev/sign-in?redirectURL=%2Fconstruction-sites', icon: ImWrench },
    { title: 'Vcomfort sensor tool', link: '/cvs', icon: ImSun },
    { title: '3D model Viewer', link: '/paraview-vis', icon: ImPower },
    { title: 'SEEDS', link: 'https://seeds.cds-probono.eu/', icon:ImEarth  },
    { title: ' ProBIM Explorer', link: '', icon: ImCompass },
  ];

  return (
    <div className="list-of-tools-page">
      
      {/* Sleek Breadcrumb */}
      <div className="breadcrumb-container">
        <a href="/" className="crumb-link">Home</a>
        <SlArrowRight className="crumb-arrow" />
        <span className="crumb-current">Solutions Catalogue</span>
      </div>

     
  

      <div className="tools-grid-container">
        {tools.map((tool, index) => (
          <ToolCard
            key={index}
            title={tool.title}
            link={tool.link}
            icon={tool.icon}
          />
        ))}
        {/* ✅ NEW: Cartif TRNSYS ZIP download card */}
  <DownloadToolCard
    title="Cartif TRNSYS"
    icon={ImDownload}
    filename="TRNSYS_PROBONO.zip"
    communityId="/public"
  />
      </div>
    </div>
  );
};

export default ListOfTools;
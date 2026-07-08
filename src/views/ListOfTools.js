import React from 'react';
import { useKeycloak } from '@react-keycloak/web';
import ToolCard from '../components/ToolCard';
import {
  ImAirplane,
  ImPower,
  ImWrench,
  ImCog,
  ImStatsDots,
  ImHammer,
  ImLab,
  ImSun,
  ImCompass,
  ImEarth,
  ImDownload,
  ImBinoculars
} from "react-icons/im";
import { SlArrowRight } from "react-icons/sl";
import EnergyClassLogo from '../assets/images/Energy_class_simulation_icon.png';
import DownloadToolCard from "../components/DownloadToolCard";
import HegrLogo from '../assets/images/picto_HEGR.png';
import CoeurVertLogo from '../assets/images/coeurvert.svg';
import SumoIcon from '../assets/images/sumoicon.png';
import ThermalComfortIcon from '../assets/images/2.png';


const ListOfTools = () => {
  const { keycloak } = useKeycloak();

  const handleToolClick = (e, tool) => {
    // Only apply the postMessage logic for the Knowledge-base tool
    if (tool.link === 'https://www.probonoh2020kb.eu/') {
      e.preventDefault();

      // 1. Open the new tab
      const secondWindow = window.open(tool.link, '_blank');

      // 2. Handshake / Message Logic
      const messageInterval = setInterval(() => {
        if (secondWindow && keycloak?.tokenParsed?.email) {
          secondWindow.postMessage(
            {
              email: keycloak.tokenParsed.email,
              type: 'connectedInHmi'
            },
            'https://www.probonoh2020kb.eu/'
          );

          console.log("Message sent to Knowledge-base");
          clearInterval(messageInterval);
        }
      }, 1000);

      // Safety: Clear interval after 10 seconds
      setTimeout(() => clearInterval(messageInterval), 10000);
    }
  };

  const tools = [
    { title: 'Demolition Tool', link: 'https://probono.usc.es/', icon: ImHammer },
    { title: 'Open knowledge-base', link: 'https://www.probonoh2020kb.eu/', icon: ImStatsDots },
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
    { title: 'Demand and Response Platform Neighbourhood Layer - ePREDICT', link: 'https://anylogic.stamtech.dev/model/dcf2263c-2acb-40d1-ba83-3c7a92c1e55d', icon: ImLab },
    { title: 'CMS Optimization tool', link: 'https://probono-dev.stamtech.dev/sign-in?redirectURL=%2Fconstruction-sites', icon: ImWrench },
    { title: 'Vcomfort sensor tool', link: '/cvs', icon: ImSun },
    { title: '3D model Viewer', link: '/paraview-vis', icon: ImPower },
    { title: 'SEEDS', link: 'https://seeds.cds-probono.eu/', icon: ImEarth },
    { title: 'ProBIM Explorer', link: 'https://probim-explorer.cds-probono.eu', icon: ImBinoculars },
    { title: 'HEGR EnergyPlus Resultviewer', link: '/hegr-energyplus',  icon: ({ size }) => (
        <img
          src={HegrLogo}
          alt="Hegr Energyplus"
          style={{ width: size, height: size, objectFit: 'contain' }}
        />
      ), },
    { title: 'UrbanMP', link: 'https://urbanmp.cds-probono.eu/select-location', icon: ImCompass },
    {
  title: 'Green Pulse Monitor',
  link: 'https://green-pulse-monitor.cds-probono.eu/',
  icon: ({ size }) => (
    <img
      src={CoeurVertLogo}
      alt="Green Pulse Monitor"
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  ),
},
    {
      title: 'SUMO Mobility Simulation',
      link: '/sumosimulation',
      icon: ({ size }) => (
        <img
          src={SumoIcon}
          alt="SUMO Mobility Simulation"
          style={{ width: size, height: size, objectFit: 'contain' }}
        />
      ),
    },
    {
      title: 'Thermal Comfort Recommendation Engine',
      link: 'https://thermal-comfort-recom.cds-probono.eu/',
      icon: ({ size }) => (
        <img
          src={ThermalComfortIcon}
          alt="Thermal Comfort Recommendation Engine"
          style={{ width: size, height: size, objectFit: 'contain' }}
        />
      ),
    },
  ];

  return (
    <div className="list-of-tools-page">
      <div className="breadcrumb-container">
        <a href="/" className="crumb-link">Home</a>
        <SlArrowRight className="crumb-arrow" />
        <span className="crumb-current">Solutions Catalogue</span>
      </div>

      <div className="tools-grid-container">
        {tools.map((tool, index) => (
          <div
            key={index}
            onClick={(e) => handleToolClick(e, tool)}
            style={{ cursor: 'pointer' }}
          >
            <ToolCard
              title={tool.title}
              link={tool.link}
              icon={tool.icon}
            />
          </div>
        ))}

        <DownloadToolCard
          title="GeoNorte-DSS"
          icon={ImDownload}
          filename="GeoNorte - DSS.zip"
          communityId="/madrid"
        />
      </div>
    </div>
  );
};

export default ListOfTools;
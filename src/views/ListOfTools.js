import React from 'react';
import Card from '../components/cards';
import { ImAirplane, ImPower, ImTree, ImWrench, ImCog, ImStatsDots, ImHammer, ImCalculator } from "react-icons/im";
import { SlArrowRight } from "react-icons/sl";



const ListOfTools = () => {
  const ventilationToolLink = `https://v24121.ita.es/VentilationTool_Voila/`;

  const tools = [
    {
      title: 'Ventilation Assessment Tool',
      action: () => {
        // Redirect with authentication
        window.location.href = ventilationToolLink;
      },
      icon: ImAirplane,
    },
    { title: 'Demand and Response Platform', link: '/tools/demand-response', icon: ImPower },
    { title: 'BIPV Design Tool', link: '/tools/bipv', icon: ImTree },
    { title: 'Bio-Solar Roof Design and Simulation Tools', link: '/tools/bio-solar', icon: ImWrench },
    { title: 'Energy Positive Building Design Tool', link: '/tools/energy-positive', icon: ImCog },
    { title: 'Augmented Reality for Facility Management', link: '/tools/augmented-reality', icon: ImStatsDots },
    { title: 'LCA Impact Assessment Tool', link: '/tools/lca', icon: ImCalculator },
    { title: 'PESTLE Framework Analysis', link: '/tools/pestle', icon: ImHammer },
  ];

  return (
    <div className="list-of-tools">
      {/* Breadcrumb section */}
      <div className="breadcrumb">
        <a href="/">Home </a>
        <SlArrowRight /> <a href="/">List of tools</a>
      </div>
      <div className="tools-grid">
        {tools.map((tool, index) => (
          <Card
            key={index}
            title={tool.title}
            onClick={tool.action} // Pass action as a prop
            icon={tool.icon}
          />
        ))}
      </div>
    </div>
  );
};

export default ListOfTools;

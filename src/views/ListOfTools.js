import React from 'react';
import Card from '../components/cards';
import { ImAirplane, ImPower, ImTree, ImWrench, ImCog, ImStatsDots, ImHammer, ImCalculator } from "react-icons/im";
import { SlArrowRight } from "react-icons/sl";

const ListOfTools = () => {
  //const ventilationToolLink = `https://v24121.ita.es/VentilationTool_Voila/`;

  const tools = [

    //{ title: 'Demand and Response Platform', link: '/tools/demand-response', icon: ImPower },
    { title: 'Demolition Tool', link: 'https://probono.usc.es/', icon: ImHammer },
    { title: 'Open knowledge-base', link: 'https://probonofe.ebosrndportal.com/', icon: ImStatsDots },
        {
      title: 'Ventilation Assessment Tool',
      link: 'https://v24121.ita.es/VentilationTool_HMI/',
      icon: ImAirplane,
    },
    //{ title: 'BIPV Design Tool', link: '/tools/bipv', icon: ImTree },
    //{ title: 'Bio-Solar Roof Design and Simulation Tools', link: '/tools/bio-solar', icon: ImWrench },
    //{ title: 'Energy Positive Building Design Tool', link: '/tools/energy-positive', icon: ImCog },
    
    //{ title: 'LCA Impact Assessment Tool', link: '/tools/lca', icon: ImCalculator },
    //{ title: 'PESTLE Framework Analysis', link: '/tools/pestle', icon: ImHammer },
  ];

  return (
    <div className="list-of-tools">
      <div className="breadcrumb">
        <a href="/">Home </a>
        <SlArrowRight /> <a href="/">List of tools</a>
      </div>
      <div className="tools-grid">
        {tools.map((tool, index) => (
          <Card
            key={index}
            title={tool.title}
            onClick={tool.action}
            link={tool.link}
            icon={tool.icon}
          />
        ))}
      </div>
    </div>
  );
};

export default ListOfTools;

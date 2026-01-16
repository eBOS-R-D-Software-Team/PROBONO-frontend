import React, { useMemo, useState } from "react";
import {
  ImCog,
  ImStatsDots,
  ImHammer,
  ImCalculator,
} from "react-icons/im";
import { SlArrowRight } from "react-icons/sl";


const TOOLS = [
  {
    slug: "novadm",
    title: "NovaDM",
    icon: ImCog,
    purpose:
      "Decision-support tool to precisely specify renovation choices and explore scenario sets in an iterative design/negotiation process.",
    features: [
      "Action trees for stepwise choices",
      "Iterative design exploration",
      "Stakeholder negotiation support",
    ],
    inputs: ["Design alternatives", "Team constraints"],
    outputs: ["Structured scenario exploration", "Implication overview"],
    
  },
  {
    slug: "proformalise",
    title: "ProFormalise",
    icon: ImCalculator,
    purpose:
      "Makes as-designed social values explicit in BIM: capture, digitize, and inject social intentions into models.",
    features: [
      "ProSpect (Revit) specify intentions",
      "ProBIM Analyser verification & queries",
      "Inject values into IFC (ProBIM)",
    ],
    inputs: ["Designer intentions & arguments", "BIM/IFC models"],
    outputs: ["BIM with social-intention metadata"],
    
  },
  {
    slug: "dara",
    title: "DaRA – Demand & Response Analysis Platform",
    icon: ImStatsDots,
    purpose:
      "Interactive platform to model building energy demands and evaluate response configurations (heating, SHW, electricity, AC) with technical, financial, and environmental analysis.",
    features: [
      "Flow: General → Current → New → Simulation → Analysis",
      "Compare baseline vs alternatives",
      "Dynamic charts & tables",
    ],
    inputs: [
      "Building features & appliance data",
      "Digital Twin: appliances, hourly profiles, past sims",
    ],
    outputs: [
      "Energy, cost, CO₂ (up to 30 years)",
      "Energy surplus & export/save",
    ],
    
  },
  {
    slug: "epredict",
    title: "ePREDICT",
    icon: ImHammer,
    purpose:
      "Simulates energy interactions in Renewable Energy Communities (RECs) and assesses techno-economic feasibility, energy sharing, and community benefits.",
    features: [
      "REC simulator (AnyLogic), Portugal LL",
      "Agent-Based, Discrete Event, System Dynamics",
      "UI for LL, buildings/PODs, PV, CAPEX/OPEX, rates",
      "PV capacity optimization",
      "AnyLogic Cloud access",
    ],
    inputs: [
      "Hourly demand per building (1 year)",
      "Installed PV per building/POD",
      "PV profiles per 1 kW @ site; hourly prices",
      "Scenario params: buildings, CAPEX/OPEX, discount",
    ],
    outputs: ["KPIs & visualizations for REC energy sharing/benefits"],
    
  },
];

const Chip = ({ children }) => <span className="chip">{children}</span>;

const InfoCard = ({ title, children }) => (
  <div className="info-card">
    <div className="info-card__title">{title}</div>
    <div className="info-card__body">{children}</div>
  </div>
);

const ToolCard = ({ tool }) => {
  const Icon = tool.icon;
  return (
    <article className="tool">
      <header className="tool__header">
        <div className="tool__title-wrap">
          <Icon className="tool__icon" />
          <h3 className="tool__title">{tool.title}</h3>
        </div>
        <span className="tool__slug">{tool.slug}</span>
      </header>

      <div className="tool__purpose">
        <div className="tool__purpose-label">Purpose</div>
        <p className="tool__purpose-text">{tool.purpose}</p>
      </div>

      <div className="tool__grid">
        <InfoCard title="Key Features">
          <div className="chips">
            {tool.features.map((f, i) => (
              <Chip key={i}>{f}</Chip>
            ))}
          </div>
        </InfoCard>

        <InfoCard title="Data Inputs">
          <div className="chips">
            {tool.inputs.map((d, i) => (
              <Chip key={i}>{d}</Chip>
            ))}
          </div>
        </InfoCard>

        <InfoCard title="Outputs">
          <div className="chips">
            {tool.outputs.map((o, i) => (
              <Chip key={i}>{o}</Chip>
            ))}
          </div>
        </InfoCard>
      </div>

      <footer className="tool__footer">
        <a className="tool__anchor" href={`#${tool.slug}`} id={tool.slug}>
        
        </a>
      </footer>
    </article>
  );
};

export default function ToolDescriptions() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = TOOLS;
    if (active !== "all") list = list.filter((t) => t.slug === active);
    if (!q) return list;
    return list.filter((t) =>
      [
        t.title,
        t.slug,
        t.purpose,
        ...t.features,
        ...t.inputs,
        ...t.outputs,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [query, active]);

  return (
    <div className="list-of-tools">
      <div className="breadcrumb">
        <a href="/">Home</a>
        <SlArrowRight /> <span>Tools Description</span>
      </div>

      {/* Filter bar */}
      <div className="tools-toolbar">
        <div className="segmented">
          <button
            className={`segmented__btn ${active === "all" ? "is-active" : ""}`}
            onClick={() => setActive("all")}
          >
            All
          </button>
          {TOOLS.map((t) => (
            <button
              key={t.slug}
              className={`segmented__btn ${
                active === t.slug ? "is-active" : ""
              }`}
              onClick={() => setActive(t.slug)}
            >
              {t.title}
            </button>
          ))}
        </div>

        <input
          className="tools-search"
          placeholder="Search keywords…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search tools"
        />
      </div>

      <div className="tools-grid tools-grid--details">
        {filtered.map((t) => (
          <ToolCard key={t.slug} tool={t} />
        ))}

        {filtered.length === 0 && (
          <div className="empty">
            No tools match your filters. Try clearing the search.
          </div>
        )}
      </div>
    </div>
  );
}

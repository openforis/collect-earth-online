import React, { useEffect, useState, useMemo } from "react";
import { atom, useAtom } from 'jotai';
import SvgIcon from "../components/svg/SvgIcon";
//import { mercator } from './utils/mercator';
import { zoomMapToPoint } from '../utils/newMercator';
import { stateAtom } from '../utils/constants';
import MapPanel from '../mapPanel';
import { Sidebar, SidebarCard } from "../components/Sidebar";

import "../../css/highlights.css";


export default function Institutions ({userId, userRole}) {
  const [appState, setAppState] = useAtom(stateAtom);
  const mapConfigAtom = atom(null);
  
  function InstitutionSidebar ({
    institutions = [],
    projects = [],
    userInstitutions = [],
    userId,
    userRole,
    stateAtom
  }) {
    const [activeTab, setActiveTab] = useState("affiliations");
    const [search, setSearch] = useState("");
    const [sortType, setSortType] = useState("projects");

    const otherInstitutions = useMemo(() => {
      const affiliatedIds = new Set(userInstitutions.map((u) => u.id));
      return institutions.filter((i) => !affiliatedIds.has(i.id));
    }, [institutions, userInstitutions]);

    const projectsByInstitution = useMemo(() => {
      const map = {};
      for (const p of projects) {
        if (!map[p.institutionId]) map[p.institutionId] = [];
        map[p.institutionId].push(p);
      }
      return map;
    }, [projects]);

    const visibleInstitutions = useMemo(() => {
      return activeTab === "affiliations" ? userInstitutions : otherInstitutions;
    }, [
      activeTab,
      userInstitutions,
      otherInstitutions,
      search,
      projectsByInstitution,
    ]);
    
    function sortedInstitutions (institutions, sortType) {
      switch (sortType) {
      case 'alphabetical' : return institutions.toSorted((a, b) =>
        (a.name.toUpperCase() < b.name.toUpperCase()) ? -1 :
          (a.name.toUpperCase() > b.name.toUpperCase()) ? 1 : 0 );
      case 'projects' : return institutions.toSorted((a, b) =>{
        let thisInstitutionProjects = projectsByInstitution[a.id] || [];
        let thatInstitutionProjects = projectsByInstitution[b.id] || [];
        return ( 
          (thisInstitutionProjects.length < thatInstitutionProjects.length) ? -1 :
            (thisInstitutionProjects.length > thatInstitutionProjects.length) ? 1 : 0);
      });    
      default : return institutions;
      }};
    
    return (
      <Sidebar header={null} stateAtom={stateAtom} footer={null} style={{ left: 0, width: "30vw", position: "fixed" }}>
        <SidebarCard title="Institutions">

          <div className="search-bar">
            <div className="search-label">
              <SvgIcon icon="search" size="1rem"/>
              <input
                type="text"
                placeholder="Search by name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="cta-sort-row">
            <div className="create-institution"
                 onClick={()=>{window.location.href="/create-institution";}}
            >
              <div className="create-institution-label">
                <SvgIcon icon="plus" size="1rem"/>
                <span>Add New Institution</span>
              </div>
            </div>
            

              
              <div className="filter-actions" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="sort-dropdown" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ fontWeight: "500", minWidth: "fit-content"}}>Sort by:</label>
                  <select
                    className="form-control form-control-sm"
                    onChange={(e) => setSortType(e.target.value)}
                    value={sortType}
                    style={{ flexGrow: 1 }}
                  >
                    <option value="projects">Number of Projects</option>
                    <option value="alphabetical">Alphabetical</option>
                  </select>
                </div>
                
              </div>
            </div>
            <div
              className="tab-row"
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid #ddd",
                marginTop: 16,
              }}
            >
              <button
                onClick={() => setActiveTab("affiliations")}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  padding: "8px 0",
                  fontWeight: 600,
                  color: activeTab === "affiliations" ? "#1b5e20" : "#666",
                  borderBottom: activeTab === "affiliations" ? "3px solid #1b5e20" : "3px solid transparent",
                  cursor: "pointer",
                  transition: "color 0.2s ease, border-color 0.2s ease",
                }}
              >
                Your Affiliations ({userInstitutions.length})
              </button>
              <button
                onClick={() => setActiveTab("others")}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  padding: "8px 0",
                  fontWeight: 600,
                  color: activeTab === "others" ? "#1b5e20" : "#666",
                  borderBottom: activeTab === "others" ? "3px solid #1b5e20" : "3px solid transparent",
                  cursor: "pointer",
                  transition: "color 0.2s ease, border-color 0.2s ease",
                }}
              >
                Other Institutions ({otherInstitutions.length})
              </button>
            </div>

        </SidebarCard>

        {sortedInstitutions(visibleInstitutions, sortType).map((inst) => {
          const instProjects = projectsByInstitution[inst.id] || [];
          return (
            <SidebarCard key={inst.id} title={inst.name} collapsible defaultOpen={false}>
              <div
                className="institution-project-list"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  padding: "10px 14px 14px 14px",
                  background: "#f8faf9",
                  borderRadius: "0 0 6px 6px",
                }}
              >
                <div
                  key={inst.id}
                  className="project-item"
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #dfe4e1",
                    borderRadius: "6px",
                    background: "#3D7F7A",
                    cursor: "pointer",
                    fontWeight: 600,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                  }}
                  onClick={() => (window.location.href = `/review-institution?institutionId=${inst.id}`)}
                >
                  Visit Institution
                </div>
                {instProjects.map((project) => (
                  <div
                    key={project.id}
                    className="project-item"
                    style={{
                      padding: "10px 12px",
                      border: "1px solid #dfe4e1",
                      borderRadius: "6px",
                      background: "#fff",
                      cursor: "pointer",
                      fontWeight: 500,
                      color: "#2f3e2f",
                      transition: "background 0.15s ease",
                    }}
                    onClick={() => (window.location.href = `/create-project?projectId=${project.id}&institutionId=${inst.id}`)}
                    onMouseOver={(e) => (e.currentTarget.style.background = "#f1f5f3")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "#fff")}
                  >
                    {project.name}
                  </div>
                ))}
              </div>
            </SidebarCard>
          );
        })}
      </Sidebar>
    );
  };


  return (
    <div id='institutions-tab' className='home-tab'>
      <div className="row tog-effect"
           style={{flexWrap: 'nowrap'}}>
        <InstitutionSidebar
          institutions={appState.institutions}
          projects={appState.projects}
          userId={userId}
          userInstitutions={appState.userInstitutions}
          userRole={userRole}
          stateAtom={stateAtom}
        />
        <MapPanel
          imagery={appState.imagery}
          projects={appState.projects}
          mapConfigAtom={mapConfigAtom}
        />
      </div>
    </div>
  );
}

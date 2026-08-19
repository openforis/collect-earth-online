import React, { useEffect, useState, useMemo } from "react";
import ReactDOM from "react-dom";
import { LoadingModal, NavigationBar } from "./components/PageComponents";
import { mercator } from "./utils/mercator";
import { sortAlphabetically } from "./utils/generalUtils";
import SvgIcon from "./components/svg/SvgIcon";
import Modal from "./components/Modal";
import { Sidebar, SidebarCard } from "./components/Sidebar";
import Highlights from "./highlights";
import { useAtom, useAtomValue } from'jotai';
import { stateAtom } from './utils/constants';


export const InstitutionSidebar = ({
  institutions = [],
  projects = [],
  userInstitutions = [],
  userId,
  userRole,
  stateAtom
}) => {
  const [activeTab, setActiveTab] = useState("affiliations");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("institution");
  const [showEmpty, setShowEmpty] = useState(true);
  const [matchBeginning, setMatchBeginning] = useState(false);
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
    const list = activeTab === "affiliations" ? userInstitutions : otherInstitutions;

    return list.filter((inst) => {
      if (!inst || !inst.name) return false;

      const projectsForInst = projectsByInstitution[inst.id] || [];
      const hasProjects = projectsForInst.length > 0;

      const matchFn =
            filterType === "institution"
            ? matchBeginning
            ? inst.name.toLowerCase().startsWith(search.toLowerCase())
            : inst.name.toLowerCase().includes(search.toLowerCase())
            : projectsForInst.some((p) => {
              if (!p.name) return false;
              const name = p.name.toLowerCase();
              return matchBeginning
                ? name.startsWith(search.toLowerCase())
                : name.includes(search.toLowerCase());
            });

      if (!showEmpty && !hasProjects) return false;
      return matchFn;
    });
  }, [
    activeTab,
    userInstitutions,
    otherInstitutions,
    search,
    matchBeginning,
    showEmpty,
    projectsByInstitution,
    filterType,
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
      <SidebarCard title="FILTERS">
        <div className="filter-section">
          <input
            className="form-control search-input"
            type="text"
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 10 }}
          />

          <div className="filter-row" style={{ marginBottom: 8 }}>
            <label style={{ marginRight: 14, marginLeft: 4 }}>
              <input
                type="radio"
                name="filterType"
                value="institution"
                checked={filterType === "institution"}
                onChange={(e) => setFilterType(e.target.value)}
                style={{ marginRight: 4 }}
              />
              Institution
            </label>
            <label>
              <input
                type="radio"
                name="filterType"
                value="project"
                checked={filterType === "project"}
                onChange={(e) => setFilterType(e.target.value)}
                style={{ marginRight: 4 }}
              />
              Project
            </label>
          </div>

          <div className="filter-row" style={{ marginBottom: 12 }}>
            <label style={{ marginRight: 18 }}>
              <input
                type="checkbox"
                checked={matchBeginning}
                onChange={() => setMatchBeginning(!matchBeginning)}
                style={{ marginRight: 4 }}
              />
              Match from Beginning
            </label>
            <label>
              <input
                type="checkbox"
                checked={showEmpty}
                onChange={() => setShowEmpty(!showEmpty)}
                style={{ marginRight: 4 }}
              />
              Show Empty Institutions
            </label>
          </div>

          <div className="filter-actions" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="sort-dropdown" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontWeight: "500" }}>Sort by:</label>
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
            <a
              className="create-institution btn btn-md"
              href="/create-institution"
              style={{
                alignItems: "center",
                display: "flex",
                justifyContent: "center",
                background: "#3D7F7A",
                color: "#FFFFFF"
              }}
            > Add New Institution </a>
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
                onClick={() => (window.location.href = `/review-project?projectId=${project.id}&institutionId=${inst.id}`)}
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

/*
function Home ({ userRole, userId }) {
  const [appState, setAppState] = useAtom(stateAtom);  
  
  function getProjects () {
    fetch("/get-home-projects")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (data.length > 0) {
          setAppState(prev => ({ ... prev,  projects: data }));
          return Promise.resolve();
        } else {
          return Promise.reject("No projects found");
        }
      });}

  function getImagery () {
    fetch("/get-public-imagery")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (data.length > 0) {          
          setAppState(prev => ({ ... prev, imagery: data }));          
          return Promise.resolve();
        } else {
          return Promise.reject("No imagery found");
        }
      });}
  
  function getInstitutions () {
    fetch("/get-all-institutions")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (data.length > 0) {
          const userInstitutions =
                userRole !== "admin"
                ? data.filter((institution) => institution.isMember)
                : [];
          const institutions =
                userInstitutions.length > 0
                ? data.filter((institution) => !userInstitutions.includes(institution))
                : data;
          setAppState(prev => ({ ...prev,
            institutions,
            userInstitutions,
          }));
          return Promise.resolve();
        } else {
          return Promise.reject("No institutions found");
        }
      });
  }
  function toggleSidebar (mapConfig) {
    setAppState(prev => ({ ... prev, showSidePanel: !prev.showSidePanel }), () => mercator.resize(mapConfig));}
  
  useEffect(()=>{
    Promise.all([getImagery(), getInstitutions(), getProjects()])
      .catch((response) => {
        setAppState (prev => ({ ... prev, modal: {alert: {alertType: "Collection Alert", alertMessage: "Error retrieving the collection data. See console for details."}}}));
      })
      .finally(() => setAppState(prev => ({... prev, modalMessage: null })));
  }, []);
  
  return (
    <div id="bcontainer">
      <span id="mobilespan" />
      <div className="Wrapper">
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
            showSidePanel={appState.showSidePanel}
            toggleSidebar={toggleSidebar}
          />
        </div>
      </div>     
      {appState.modal?.alert &&
      <Modal title={appState.modal.alert.alertType}
              onClose={()=>{setAppState({ ... appState, modal: null});}}>
         {appState.modal.alert.alertMessage}
       </Modal>}
      {appState.modalMessage && <LoadingModal message={appState.modalMessage} />}
    </div>
  );
}
*/

function HomeTabs ({tab, session}) {
  switch (tab) {
  case 'highlights':
    return (<Highlights userId={session.userId} userRole={session.userRole}/>);
  case 'institutions' :
    return (<div id='institutions-tab' className='home-tab'>
              <div className="header">
                <div className="header-row">
                  <p className="header-title">Institutions</p>
                  <p className="header-subtitle"></p>
                </div>
              </div>
            </div>);
  case 'collect' :
    return (<div id='collect-tab' className='home-tab'>
              <div className="header">
                <div className="header-row">
                  <p className="header-title">Collect</p>
                  <p className="header-subtitle"></p>
                </div>
              </div>
            </div>);
    case 'manage' :
    return (<div id='manage-tab' className='home-tab'>
              <div className="header">
                <div className="header-row">
                  <p className="header-title">Manage</p>
                  <p className="header-subtitle"></p>
                </div>
              </div>
            </div>);
    default: return (<></>);
  }
}

function Home ({params, session}) {
  const [tab, setTab] = useState('highlights');
  return (
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}
                   fxns={{tab: {get: tab, set: setTab}}}>
      <HomeTabs tab={tab} session={session}/>
    </NavigationBar>
  );
}

export function pageInit(params, session) {
  ReactDOM.render(
    <Home params={params} session={session}/>,
    document.getElementById("app")
  );
}

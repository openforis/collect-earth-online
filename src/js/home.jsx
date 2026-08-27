import React, { useEffect, useState, useMemo } from "react";
import ReactDOM from "react-dom";
import { LoadingModal, NavigationBar } from "./components/PageComponents";
import { mercator } from "./utils/mercator";
import { sortAlphabetically } from "./utils/generalUtils";
import SvgIcon from "./components/svg/SvgIcon";
import Modal from "./components/Modal";
import { Sidebar, SidebarCard } from "./components/Sidebar";
import Highlights from "./home/highlights";
import Institutions from "./home/institutions";
import { useAtom, useAtomValue } from'jotai';
import { stateAtom } from './utils/constants';





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
    return (<Institutions userId={session.userId} userRole={session.userRole}/>);
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

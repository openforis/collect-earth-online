import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useAtom, useSetAtom, useAtomValue } from 'jotai';

import { BreadCrumbs, NavigationBar } from "./components/PageComponents";
import Modal from "./components/Modal";
import SvgIcon from "./components/svg/SvgIcon";
import { ImageryStep } from "./components/ImageryStep";
import { BoundaryStep } from "./components/BoundaryStep";
import { PlotStep } from "./components/PlotStep";

import { 
  projectSourceAtom, 
  currentStepAtom,
  projectOverviewAtom,
} from "./state/projectWizard";

import "../css/project-wizard.css";

import { atom } from "jotai";
const wizardModalAtom = atom(null); 

const projectSteps = [
  {id: 'overview', label: 'Project Overview'},
  {id: 'imagery', label: 'Imagery Selection'},
  {id: 'boundary', label: 'Project Boudary'},
  {id: 'plots', label: 'Plot Generation'},
  {id: 'samples', label: 'Sample Design'},
  {id: 'questions', label: 'Survey Questions'},
  {id: 'rules', label: 'Survey Rules'},
  {id: 'review', label: 'Review & Publish'}
];


const ProjectWizard = ({userId, userName, version, institutionId}) => {
  const [currentStep, setCurrentStep] = useAtom(currentStepAtom);
  const [projectSource, setProjectSource] = useAtom(projectSourceAtom);
  const [overview, setOverview] = useAtom(projectOverviewAtom);
  const [modal, setModal] = useAtom(wizardModalAtom);
  const [availableImagery, setAvailableImagery] = useState([]);

  useEffect(() => {
    fetch(`/get-institution-imagery?institutionId=${institutionId}`)
      .then(res => res.json())
      .then(data => setAvailableImagery(data))
      .catch(err => console.error("Could not load imagery", err));

    setModal({
      id: 'newProject',
      title: 'Project Setup',
      confirmText: 'Get Started',
      onConfirm: () => {
        setModal(null);
        setCurrentStep('overview');
      }
    });
  }, []);

  const OverviewStep = () => {
    const projectTypeOptions = {regular: 'Regular Project', simplified: 'Simplified Project'};
    const visibilityOptions = {
      public: "Public: All Users",
      users: "Users: Logged In Users",
      institution: "Institution: Group Members",
      private: "Private: Group Admins"
    };
    const projectOptionsMap = {
      gee: "Show GEE Script Link on Collection Page",
      extraPlotColumns: "Show Extra Plot Columns on Collection Page",
      plotConfidence: "Collect Plot Confidence on Collection Page",
      autoGeo: "Auto-launch Geo-Dash"
    };

    return (
      <div className="project-wizard overview-step">
        <div className="general-info-card card">
          <p className="card-title">General Information</p>
          <p className="text-label">Project Type<span style={{color: "red"}}>*</span> <SvgIcon icon="info" size="1.2rem" /></p>
          <div style={{display: "inline-flex", gap:"12px"}}>
            {Object.entries(projectTypeOptions).map(([id, label]) => (
              <div className="labeled-input" key={id} onClick={() => setOverview(s => ({...s, projectType: id}))}>
                <span>{overview.projectType === id ? <SvgIcon icon="radioChecked" size="1.2rem" /> : <SvgIcon icon="radio" size="1.2rem"/>}</span>
                <label className="text-label" style={overview.projectType === id ? {fontWeight: "bold"} : {}}>{label}</label>
              </div>
            ))}
          </div>
          <div>
            <label className="text-label">Project Name<span style={{color: "red"}}>*</span></label>
            <input type="text" className="text-input" value={overview.projectName} onChange={(e) => setOverview(s => ({...s, projectName: e.target.value}))} placeholder="Enter Text"/>
          </div>
          <div>
            <label className="text-label">Project Description<span style={{color: "red"}}>*</span></label>
            <input type="text" className="text-input" value={overview.projectDescription} onChange={(e) => setOverview(s => ({...s, projectDescription: e.target.value}))} placeholder="Enter Text"/>
          </div>
        </div>

        <div className="visibility-card card">
          <p className="card-title">Visibility<span style={{color:"red"}}>*</span> <SvgIcon icon="info" size="1.2rem" /></p>
          {Object.entries(visibilityOptions).map(([id, label]) => (
            <div className="labeled-input" key={id} onClick={() => setOverview(s => ({...s, visibility: id}))}>
              <span>{overview.visibility === id ? <SvgIcon icon="radioChecked" size="1.2rem" /> : <SvgIcon icon="radio" size="1.2rem"/>}</span>
              <label className="text-label" style={overview.visibility === id ? {fontWeight: "bold"} : {}}>{label}</label>
            </div>
          ))}
        </div>

        <div className="project-options-card card">
          <p className="card-title">Project Options</p>
          {Object.entries(projectOptionsMap).map(([id, label]) => (
            <div className="labeled-input" key={id}>
              <span className="checkbox" onClick={() => setOverview(s => ({...s, projectOptions: {...s.projectOptions, [id]: !s.projectOptions[id]}}))}>
                {overview.projectOptions[id] ? <SvgIcon icon="checkboxChecked" size="1.2rem" /> : <SvgIcon icon="checkboxUnchecked" size="1.2rem" />}
              </span>
              <label className="text-label" style={overview.projectOptions[id] ? {fontWeight: "bold"} : {}}>{label}</label>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const NavButtons = () => {
    const continueHandler = () => {
      const currentIdx = projectSteps.findIndex(({id}) => id === currentStep);
      currentIdx + 1 < projectSteps.length
        ? setCurrentStep(projectSteps[currentIdx + 1].id)
        : setModal({title: "Confirm & Submit", id: "submit"});
    };
    return (
      <div className="nav-buttons">
        <button className="btn btn-secondary btn-sm" onClick={() => window.location.assign("/home")}>Exit</button>
        <button className='btn btn-sm' style={{backgroundColor: "#2d6f74", color: "#fff"}}>Save Draft</button>
        <button className='btn btn-sm' onClick={continueHandler} style={{backgroundColor: "#2d6f74", color: "#fff"}}>Save & Continue</button>
      </div>
    );
  };

  const ProjectWizardNavigator = () => (
    <div className="project-wizard-navigator">
      {projectSteps.map(({id, label}, index) => (
        <React.Fragment key={id}>
          <div style={{fontWeight: currentStep === id ? 'bold' : 'normal', cursor: 'pointer'}} onClick={() => setCurrentStep(id)}>
            <span className={currentStep === id ? "selected" : ""}>{index + 1}</span>
            {label}
          </div>
          {index + 1 < projectSteps.length && <span className="navigator-separator"> - -- - </span>}
        </React.Fragment>
      ))}
    </div>
  );

  const ProjectWizardModal = () => {
    if (!modal) return null;
    return (
      <Modal 
        title={modal.title} 
        confirmText={modal.confirmText || "OK"} 
        confirmDisabled={modal.id === 'newProject' && projectSource === null}
        onConfirm={modal.onConfirm || (() => setModal(null))}
        onClose={() => setModal(null)}
      >
        {modal.id === 'newProject' && (
          <div className="inputs">
            <p className="text-label">Select project creation method:</p>
            {['newProject', 'templateProject', 'importProject'].map(id => (
              <div key={id} className="labeled-input" onClick={() => setProjectSource(id)}>
                <span>{projectSource === id ? <SvgIcon icon="radioChecked" size="1.2rem" /> : <SvgIcon icon="radio" size="1.2rem"/>}</span>
                <label className="text-label">{id}</label>
              </div>
            ))}
          </div>
        )}
      </Modal>
    );
  };


  const CurrentStep = () => {
    switch (currentStep) {
    case 'overview' : return <OverviewStep />;
    case 'imagery'  : return <ImageryStep imageryList={availableImagery} />;
    case 'boundary' : return <BoundaryStep />;
    default         : return <div style={{padding: "20px"}}>Step {currentStep} coming soon</div>;
    }
  };

  return (
    <div className="project-wizard-container">
      {modal && <ProjectWizardModal />}
      <NavigationBar userId={userId} userName={userName} version={version}>
        <div className="wizard-layout-wrapper">
          <BreadCrumbs crumbs={[
            {display: "Institution", onClick:()=> window.location.assign(`/review-institution?institutionId=${institutionId}`)},
            {display: "Add a New Project", onClick:()=> window.location.assign(`/project-wizard?institutionId=${institutionId}`)}
          ]} />
          <ProjectWizardNavigator />
          <div className="wizard-step-body">
            {CurrentStep()}
          </div>
          <NavButtons />
        </div>
      </NavigationBar>
    </div>
  );
};

export function pageInit(params, session) {
  ReactDOM.render(
    <ProjectWizard
      userId={session.userId}
      userName={session.userName}
      version={session.versionDeployed}
      institutionId={params.institutionId}/>,
    document.getElementById("app")
  );
}

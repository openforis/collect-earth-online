import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useAtom, useSetAtom, useAtomValue } from 'jotai';

import { BreadCrumbs, NavigationBar } from "./components/PageComponents";
import  Modal  from "./components/Modal";
import SvgIcon from "./components/svg/SvgIcon";

import { stateAtom } from "./utils/constants";
import { projectWizardAtom } from "./state/projectWizard";

import "../css/project-wizard.css";


const projectSteps =
          [{id: 'overview',
            label: 'Project Overview'},
           {id: 'imagery',
            label: 'Imagery Selection'},
           {id: 'boundary',
            label: 'Project Boundary'},
           {id: 'plots',
            label: 'Plot Generation'},
           {id: 'samples',
            label: 'Sample Design'},
           {id: 'questions',
            label: 'Survey Questions'},
           {id: 'rules',
            label: 'Survey Rules'},
           {id: 'review',
            label: 'Review & Publish'}];


const NavButtons = () => {
  const { currentStep } = useAtomValue(projectWizardAtom);
  const setProjectWizardState = useSetAtom(projectWizardAtom);
  
  const  continueHandler = () => {
    const currentIdx = projectSteps.findIndex(({id})=>{return (id == currentStep);});
    
    currentIdx + 1 < projectSteps.length
      ? setProjectWizardState((s)=>({...s, currentStep: projectSteps[currentIdx + 1].id}))
      : setProjectWizardState((s)=>({...s, modal: {title: "Confirm & Submit"}}));
  };

  return (<div className="nav-buttons">
            <button
              className="btn btn-secondary btn-sm"
            >Exit</button>
            <button
              className={'btn btn-sm'}
              style={{backgroundColor: "#2d6f74",
                      color: "#fff"}}
            >Save Draft</button>
            <button
              className={'btn btn-sm'}
              onClick={()=>{continueHandler();}}
              style={{backgroundColor: "#2d6f74",
                      color: "#fff"}}
            >Save & Continue</button>
          </div>);
};

const ProjectWizardNavigator = () => {
  const { currentStep } = useAtomValue(projectWizardAtom);
  const setProjectWizardState = useSetAtom(projectWizardAtom);
  
  return (
    <div
      className="project-wizard-navigator">
      {projectSteps.map(({id, label}, index)=>{
        return(
          <>                         
            <div
              key={id}
              style={{fontWeight: currentStep === id ? 'bold' : 'normal'}}
              onClick={()=> setProjectWizardState((s) => ({
                ... s, currentStep: id}))}>
              <span className={currentStep === id && "selected"}
              >{index + 1}</span>
              {label}
            </div>
            {index + 1 < projectSteps.length && "- -- -"}
          </>);
      })}              
    </div>);
};

const NewProjectModal = () => {
  const { projectSource } = useAtomValue(projectWizardAtom);
  const setProjectWizardState = useSetAtom(projectWizardAtom);
  
  const newProjectOptions = {
    newProject: ['Create a new project',
                 'Generate a new project from scratch by customizing all steps.'],
    templateProject: ['Select from an existing template',
                      'Select a template and prefill all the steps. You can edit and customize it.'],
    importProject: ['Import Collect Earth Project',
                    'Need Description']};

  return (
    <div
      className="inputs">
      {Object.entries(newProjectOptions).map(([id, [title, description]]) => {
        return (
          <div
            className={projectSource === id ?
                       "radio-selected-button"
                       : "radio-selection-button"}
            key={id}
            onClick={()=> {setProjectWizardState((s)=>({
              ... s, projectSource: id}));
                          }}>
            <p
              className="radio-button-labeled"
            >{projectSource === id
              ? <SvgIcon icon="radioChecked" size="1.2rem" />                            
              : <SvgIcon icon="radio" size="1.2rem"
                         className="radio-button-unchecked"/> }    {/*these four spaces left intentionally*/}
              { title } </p>
            <label
              className="radio-button-description"
            >{ description }</label>
          </div>);
      })}
    </div>);
};
  
const ProjectWizardModal = () => {
  // this is the container for any modal related to this page. based on state, this actually renders modals as they are explicitly defined above., provided through "children" value of modal map"
  const { modal, projectSource } = useAtomValue(projectWizardAtom);
  const setProjectWizardState = useSetAtom(projectWizardAtom);
  
  const children = () => {
    switch (modal.id) {
    case 'newProject' : return (<NewProjectModal/>);
    default : break;
    }};
    
  const confirmDisabled = () => {
    switch (modal.id) {
    case 'newProject'
      : return projectSource === null;
    default: return false;
    }};
  
  return (
    <Modal
      title={modal.title}
      closeText={modal.closeText}
      confirmText={modal.confirmText}
      onConfirm={modal.onConfirm && modal.onConfirm}
      confirmDisabled={projectSource === null}//{confirmDisabled()}
      onClose={()=>{
        modal.onClose ? modal.onClose()
          : setProjectWizardState((s) => ({... s, modal: null}));
      }}>
      {children()}
    </Modal>);
};

const OverviewStep = () => {
  const { overview } = useAtomValue(projectWizardAtom);
  const setProjectWizardState = useSetAtom(projectWizardAtom);

  const handleProjectName = (input) => {
    setProjectWizardState((s)=>({
      ...s, overview: {
        ... s.overview, projectName: input}}));
  };
  
  const GeneralInformationCard = () => {
    const projectTypeOptions = {regular: 'Regular Project', simplified: 'Simplified Project'};
    
    return (<div
            className="general-info-card card">
              <p className="card-title">General Information</p>
              <p className="text-label"
                >Project Type<span style={{color: "red"}}>*</span>
                <SvgIcon icon="info" size="1.2rem" /></p>
              <div>
              <div style={{display: "inline-flex", gap:"12px"}}>
                {Object.entries(projectTypeOptions).map(([id, label]) => {
                  return (<div
                            className="labeled-input"                       
                            key={id}
                            onClick={()=> {                              
                              setProjectWizardState((s) => ({
                                ...s, overview: {
                                ... s.overview, projectType: id}}));                                
                            }}>
                            <span>{ overview.projectType == id
                                    ? <SvgIcon icon="radioChecked" size="1.2rem" />    
                                    : <SvgIcon icon="radio" size="1.2rem"/>}</span>
                            <label                              
                              className="text-label"
                              style={overview.projectType == id ? {fontWeight: "bold"} : {}}
                            >{ label  }</label>
                          </div>);                  
                })}</div>
                <div>
                  <label className="text-label"
                  >Project Name<span style={{color: "red"}}>*</span></label>
                  <input type="text"
                         className="text-input"
                         id="project-name"
                         value={overview.projectName}
                         onChange={(e)=>handleProjectName(e.target.value)}
                         placeholder="Enter Text"/>
                </div>
                <div>
                  <label className="text-label"
                  >Project Description<span style={{color: "red"}}>*</span></label>
                  <input type="text"
                         className="text-input"
                         id="project-description"
                         onChange={(e)=>{                           
                           setProjectWizardState((s)=>({
                             ...s, overview: {
                               ...s.overview, projectDescription: e.target.value}}));
                         }}
                         value={overview.projectDescription}
                         placeholder="Enter Text"/>
                </div>
                <div>
                  <label className="text-label"
                  >Learning Material (Optional)<SvgIcon icon="info" size="1.2rem" /></label>
                  <input type="text"
                         className="text-input"
                         value={overview.learningMaterial}
                         onChange={(e)=>{                                                      
                           setProjectWizardState((s)=>({
                             ...s, overview: {
                               ...s.overview, learningMaterial: e.target.value}}));
                         }}
                         id="learning-material"
                         placeholder="Enter URL"/>
                </div>
              </div>
            </div>);
  };

  const VisibilityCard = () => {    
    const visibilityOptions={public: "Public: All Users",
                             users: "Users: Logged In Users",
                             institution: "Institution: Group Members",
                             private: "Private: Group Admins"};
    
    return (
      <div className="visibility-card card">
        <p className="card-title">Visibility<span style={{color:"red"}}>*</span>
        <SvgIcon icon="info" size="1.2rem" /></p>
        {Object.entries(visibilityOptions).map(([id, label])=>{
	  return (<div className="labeled-input"
                       key={id}
                       onClick={()=>{                         
                         setProjectWizardState((s) => ({
                           ...s, overview: {
                             ...s.overview, visibility: id}}));
                       }}>
                     <span>{ overview.visibility == id
                             ? <SvgIcon icon="radioChecked" size="1.2rem" />    
                             : <SvgIcon icon="radio" size="1.2rem"/>}</span>
                    <label className="text-label"
                           style={overview.visibility == id ? {fontWeight: "bold"} : {}}
                    >{ label  }</label>
                   </div>);
        })}
      </div>
    );
  };

  const ProjectOptionsCard = () => {    
    const projectOptionsMap={gee: "Show GEE Script Link on Collection Page",
                          extraPlotColumns: "Show Extra Plot Columns on Collection Page",
                          plotConfidence: "Collect Plot Confidence on Collection Page",
                          autoGeo: "Auto-launch Geo-Dash"};
    
    return(<div className="project-options-card card">
           <p className="card-title">Project Options</p>
           {Object.entries(projectOptionsMap).map(([id, label])=> {
	     return (
	       <div className="labeled-input">
		 <span
                   className="checkbox"
		   onClick={() => {                     
                     setProjectWizardState((s)=>({
                       ... s, overview: {
                         ...s.overview, projectOptions: {
                           ...s.overview.projectOptions, [id]: !overview.projectOptions[id]
                       }}})); 
                   }}>
		   {overview.projectOptions[id]
                    ? (<SvgIcon icon="checkboxChecked" size="1.2rem" />)
                    : <SvgIcon icon="checkboxUnchecked" size="1.2rem" />}
		 </span>
		 <label className="text-label"
                        style={overview.projectOptions[id] ? {fontWeight: "bold"} : {}}
                 >{label}</label>
	       </div>
	     ) ;
	   })}
         </div>);
  };

  return (
    <div className="project-wizard overview-step">
      <GeneralInformationCard />      
      <VisibilityCard/>
      <ProjectOptionsCard/>    
    </div>
  );
};

const ImageryStep  = () => {
  return (
    <div>
    </div>
  );
};

const BoundaryStep  = () => {
  return (
    <div>
    </div>
  );
};

const PlotStep  = () => {
  return (
    <div>
    </div>
  );
};

const SamplesStep  = () => {
  return (
    <div>
    </div>
  );
};

const QuestionsStep  = () => {
  return (
    <div>
    </div>
  );
};

const RulesStep  = () => {
  return (
    <div>
    </div>
  );
};

const ReviewStep  = () => {
  return (
    <div>
    </div>
  );
};


const ProjectWizard = ({userId, userName, version, institutionId}) => {

  // -------------------
  // VARS & CONSTANTS
  // ------------------
  
  const { projectSource,
          currentStep,
          overview,
          imagery,
          boundary,
          plots,
          samples,
          questions,
          rules,
          modal
        } = useAtomValue(projectWizardAtom);
  const setProjectWizardState = useSetAtom(projectWizardAtom);

  
  
  // -------------------
  // HANDLERS
  // ------------------
  
  const handleNewProject = () => {
    setProjectWizardState((s)=>({
      ...s, 
      modal: null,
      currentStep: 'overview'}));
    };

  
  // -------------------
  // HOOKS
  // ------------------
  
  useEffect(() => {    
      setProjectWizardState((s) => ({ ... s, modal: {title: 'Project Setup',
                               closeText: '',
                               confirmText: 'Get Started',
                               onConfirm: handleNewProject,
                               id: 'newProject',
                               children: (<NewProjectModal/>)}}));
  }, []);

  
  // -------------------
  // RENDER FUNCTIONS
  // ------------------
  

  
  const CurrentStep = () => {
    switch (currentStep) {
    case 'overview'   : return (<OverviewStep/>);
    case 'imagery'    : return (<ImageryStep/>);
    case 'boundary'   : return (<BoundaryStep/>);
    case 'plots'      : return (<PlotStep/>);
    case 'samples'    : return (<SamplesStep/>);
    case 'questions'  : return (<QuestionsStep/>);
    case 'rules'      : return (<RulesStep/>);
    case 'review'     : return (<ReviewStep/>);
    default           : return (<div></div>);
    }};

  
  return (<div className="project-wizard-container">
            {modal && <ProjectWizardModal/>}
            <NavigationBar userId={userId} userName={userName} version={version}>
              <BreadCrumbs
                crumbs={[
                  {display: "Institution",
                   id: "institution",
                   query: ["institution", institutionId],
                   onClick:()=>{
                     window.location.assign(`/review-institution?institutionId=${institutionId}`);
                   }},
                  {display: "Add a New Project",
                   id: "projectWizard",
                   query: ["project", "newProject"],
                   onClick:()=>{
                     window.location.assign(`/project-wizard?institutionId=${institutionId}`);
                   }}]}
              />
              <ProjectWizardNavigator/>
              {CurrentStep()}
              <NavButtons/>
            </NavigationBar>
          </div>);
};


export function pageInit(params, session) {
  //This is the triangulum-friendly wrapper of the page and the actual export. we locally wrap this around the actual effective component
  ReactDOM.render(
    <ProjectWizard
      userId={session.userId}
      userName={session.userName}
      version={session.versionDeployed}
      institutionId={params.institutionId}/>,
    document.getElementById("app")
  );
}

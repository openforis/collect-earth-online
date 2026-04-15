import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { useAtom, useSetAtom, useAtomValue } from 'jotai';

import { BreadCrumbs, NavigationBar } from "./components/PageComponents";
import  Modal  from "./components/Modal";
import SvgIcon from "./components/svg/SvgIcon";

import { stateAtom } from "./utils/constants";
import { projectWizardAtom } from "./state/projectWizard";

import "../css/project-wizard.css";


const ProjectWizard = ({userId, userName, version, institutionId}) => {

  // -------------------
  // VARS & CONSTANTS
  // ------------------
  
  const { createProject,
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
  const projectTypeRef = useRef(null);
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

  
  // -------------------
  // HANDLERS
  // ------------------
  
  const handleNewProject = () => {
    setProjectWizardState((s)=>({...s, createProject: projectTypeRef.current,
                                 modal: null,
                                 currentStep: 'overview'}));
    };
  
  const  continueHandler = () => {
    const currentIdx = projectSteps.findIndex(({id})=>{return (id == currentStep);});
    
    currentIdx + 1 < projectSteps.length
      ? setProjectWizardState((s)=>({...s, currentStep: projectSteps[currentIdx + 1].id}))
      : setProjectWizardState((s)=>({...s, modal: {title: "Confirm & Submit"}}));
  };

    const changeStep = (step) => {
    setProjectWizardState((s)=>({...s, currentStep: step}));
  };


  // -------------------
  // HOOKS
  // ------------------
  
  useEffect(() => {
    createProject === null &&
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
  
  const NewProjectModal = ({selected, setSelected}) => {
    const newProjectOptions = {
      newProject: ['Create a new project',
                   'Generate a new project from scratch by customizing all steps.'],
      templateProject: ['Select from an existing template',
                        'Select a template and prefill all the steps. You can edit and customize it.'],
      importProject: ['Import Collect Earth Project',
                      'Need Description']};

    useEffect(()=>{
      projectTypeRef.current = selected;
    }, [selected]);
    
    return (<div
            className="inputs">
                {Object.entries(newProjectOptions).map(([id, [title, description]]) => {
                  return (
                    <div
                      className={selected==id ?
                                 "radio-selected-button"
                                 : "radio-selection-button"}
                      key={id}
                      onClick={()=> {
                        setSelected(id);
                      }}
                    >
                      <p
                        className="radio-button-labeled"
                      >{selected == id
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
    const [modalState, setModalState]= useState(null);
    
    const children = () => {
      switch (modal.id) {
      case 'newProject'
        : return   (<NewProjectModal
        setSelected={setModalState}
        selected={modalState}/>);
      default : break;
      }};
    
    const confirmDisabled = () => {
      switch (modal.id) {
      case 'newProject'
        : return modalState === null;
      default: return false;
      }};
    
    return (<Modal
              title={modal.title}
              closeText={modal.closeText}
              confirmText={modal.confirmText}
              onConfirm={modal.onConfirm && modal.onConfirm}
              confirmDisabled={confirmDisabled()}
              onClose={()=>{
                modal.onClose ? modal.onClose()
                  : setProjectWizardState((s) => ({... s, modal: null}));
              }}>
              {children()}
            </Modal>);
  };

  const GeneralInformationCard = () => {
    const projectTypeOptions = {regular: 'Regular Project', simplified: 'Simplified Project'};
    const [selected, setSelected] = useState(null);
    const [generalInfoData, setGeneralInfoData] = useState({projectName: '',
                                                            projectDescription: '',
                                                            projectType: '',
                                                            learningMaterial: ''});
    return (<div
            className="general-info-card">
              <p>General Information</p>
              <p>Project Type<span style={{color: "red"}}>*</span>
                <SvgIcon icon="info" size="1.2rem" /></p>
              <div>
                {Object.entries(projectTypeOptions).map(([id, label]) => {
                  return (<div
                            key={id}
                            onClick={()=> {
                              setSelected(id);
                            }}>
                            <span>{ selected == id
                                    ? '⬤' : '◯' }</span>
                            <p>{ label  }</p>
                          </div>);                  
                })}
                <div>
                  <label>Project Name<span style={{color: "red"}}>*</span></label>
                  <input type="text"
                         id="project-name"
                         value={generalInfoData.projectName}
                         onChange={(e)=>{setGeneralInfoData((s)=>({...s, projectName: e.target.value}));}}
                         placeholder="Enter Text"/>
                </div>
                <div>
                  <label>Project Description<span style={{color: "red"}}>*</span></label>
                  <input type="text"
                         id="project-description"
                         onChange={(e)=>{setGeneralInfoData((s)=>({...s, projectDescription: e.target.value}));}}
                         value={generalInfoData.projectDescription}
                         placeholder="Enter Text"/>
                </div>
                <div>
                  <label>Learning Material (Optional)<SvgIcon icon="info" size="1.2rem" /></label>
                  <input type="text"
                         value={generalInfoData.learningMaterial}
                         onChange={(e)=>{setGeneralInfoData((s)=>({...s, learningMaterial: e.target.value}));}}
                         id="learning-material"
                         placeholder="Enter URL"/>
                </div>
              </div>
            </div>);
  };

  const VisibilityCard = () => {
    const [visibility, setVisibility] = useState(null);
    const visibilityOptions={public: "Public: All Users",
                             users: "Users: Logged In Users",
                             institution: "Institution: Group Members",
                             private: "Private: Group Admins"};
    return (
      <div>
        <p>Visibility<span style={{color:"red"}}>*</span></p>
        <SvgIcon icon="info" size="1.2rem" />
        {Object.entries(visibilityOptions).map(([id, label])=>{
	  return (<div
                       onClick={()=>{setVisibility(id);}}
                       key={id}>
                     <span>{ visibility == id
                             ? '⬤' : '◯' }</span>
                     <p>{ label  }</p>
                   </div>);
        })}
      </div>
    );
  };

  const ProjectOptionsCard = () => {
    const projectOptions={gee: "Show GEE Script Link on Collection Page",
                          extraPlotColumns: "Show Extra Plot Columns on Collection Page",
                          plotConfidence: "Collect Plot Confidence on Collection Page",
                          autoGeo: "Auto-launch Geo-Dash"};
    const [selected, setSelected] = useState({gee: false,
                                              extraPlotColumns: false,
                                              plotConfidence: false,
                                              autoGeo: false});
    return(<div>
           <p>Project Options</p>
           {Object.entries(projectOptions).map(([id, label])=> {
	     return (
	       <div>
		 <span
		   onClick={() => {setSelected((s)=>({... s, [id]: !selected[id]}));
                                  }}>
		   {selected[id] ? "▣" :"▢"}
		 </span>
		 <p>{label}</p>
	       </div>
	     ) ;
	   })}

         </div>);
  };

  const OverviewStep = () => {
    return (<div className="project-wizard">
              <GeneralInformationCard/>
              <VisibilityCard/>
              <ProjectOptionsCard/>    
            </div>);
  };

  const ImageryStep  = () => {
    return (<div>
            </div>);
  };

  const BoundaryStep  = () => {
    return (<div>
            </div>);
  };

  const PlotStep  = () => {
    return (<div>
            </div>);
  };

  const SamplesStep  = () => {
    return (<div>
            </div>);
  };

  const QuestionsStep  = () => {
    return (<div>
            </div>);
  };

  const RulesStep  = () => {
    return (<div>
            </div>);
  };

  const ReviewStep  = () => {
    return (<div>
            </div>);
  };

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

  const ProjectWizardNavigator = () => {        
    return (<div
            className="project-wizard-navigator">
              {projectSteps.map(({id, label}, index)=>{
                return(<>
                       <div
                         style={{
                           cursor: 'pointer',
                           fontWeight: currentStep === id ? 'bold' : 'normal'}}                         
                         onClick={()=> changeStep(id)}
                         key={id}
                       >
                         {index + 1}
                         {label}                         
                       </div>
                         {index + 1 < projectSteps.length && "- -- -"}
                      </>);
              })}              
            </div>);
  };

  const NavButtons = () => {
    return (<div>
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

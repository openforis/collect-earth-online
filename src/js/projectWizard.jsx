import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useAtom, useSetAtom, useAtomValue, atom } from 'jotai';
import { useSubscription, dispatch } from '@flexsurfer/reflex';

import { BreadCrumbs, NavigationBar } from "./components/PageComponents";
import Modal from "./components/Modal";
import SvgIcon from "./components/svg/SvgIcon";
import { ImageryStep } from "./components/ImageryStep";
import { BoundaryStep } from "./components/BoundaryStep";
import { PlotStep } from "./components/PlotStep";
import { SurveyQuestionsStep } from "./components/SurveyQuestionsStep";
import SurveyRuleDesigner from "./survey/SurveyRulesDesigner";
import { stateAtom } from "./utils/constants";


import { 
  projectSourceAtom, 
  currentStepAtom,
  projectOverviewAtom,
  event_ids,
  sub_ids
} from "./state/projectWizard";

import "../css/project-wizard.css";


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


const NavButtons = () => {
  const currentStep = useSubscription([sub_ids.currentStep]);
  
  const  continueHandler = () => {
    const currentIdx = projectSteps.findIndex(({id})=> (id == currentStep));
    
    currentIdx + 1 < projectSteps.length
      ? dispatch([event_ids.currentStep, projectSteps[currentIdx + 1].id])
      : dispatch([event_ids.modal, {title: "Confirm & Submit"}]);
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
              onClick={()=>continueHandler()}
              style={{backgroundColor: "#2d6f74",
                      color: "#fff"}}
            >Save & Continue</button>
          </div>);
};

const ProjectWizardNavigator = () => {
  const currentStep = useSubscription([sub_ids.currentStep]);
  
  return (
    <div
      className="project-wizard-navigator">
      {projectSteps.map(({id, label}, index)=>{
        return(
          <>                         
            <div
              key={id}
              style={{fontWeight: currentStep === id ? 'bold' : 'normal'}}
              onClick={
                () => dispatch([event_ids.currentStep, id])
              }
            >
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
  const newProjectOptions = {
    newProject: ['Create a new project',
                 'Generate a new project from scratch by customizing all steps.'],
    templateProject: ['Select from an existing template',
                      'Select a template and prefill all the steps. You can edit and customize it.'],
    importProject: ['Import Collect Earth Project',
                    'Need Description']};
  const projectSource = useSubscription([sub_ids.projectSource]);

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
            onClick={()=> {
              dispatch([event_ids.projectSource, id]);
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
  const projectSource = useSubscription([sub_ids.projectSource]);
  const modal = useSubscription([sub_ids.modal]);
  
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
      confirmDisabled={confirmDisabled()}
      onClose={()=>{
        modal.onClose ? modal.onClose()
          : dispatch([event_ids.modal, null]);
      }}>
      {children()}
    </Modal>);
};


const OverviewStep = () => {
  
  const GeneralInformationCard = () => {
    const projectTypeOptions = {regular: 'Regular Project', simplified: 'Simplified Project'};
    const projectType = useSubscription([sub_ids.overview.projectType]);
    const projectName = useSubscription([sub_ids.overview.projectName]);
    const projectDescription = useSubscription([sub_ids.overview.projectDescription]);
    const learningMaterial = useSubscription([sub_ids.overview.learningMaterial]);

    return (<div
            className="general-info-card projectWizardCard">
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
                              onClick={()=> {dispatch([event_ids.overview.projectType, id]);
                                            }}>
                              <span>{ projectType == id
                                      ? <SvgIcon icon="radioChecked" size="1.2rem" />    
                                      : <SvgIcon icon="radio" size="1.2rem"/>}</span>
                              <label                              
                                className="text-label"
                                style={projectType == id ? {fontWeight: "bold"} : {}}
                              >{ label }</label>
                            </div>);                  
                  })}</div>
                <div>
                  <label className="text-label"
                  >Project Name<span style={{color: "red"}}>*</span></label>
                  <input type="text"
                         className="text-input"
                         id="project-name"
                         value={projectName}            
                         onChange={(e)=> {dispatch([event_ids.overview.projectName, e.target.value]);}} 
                         placeholder="Enter Text"></input>
                </div>
                <div>
                  <label className="text-label"
                  >Project Description<span style={{color: "red"}}>*</span></label>
                  <input type="text"
                         className="text-input"
                         id="project-description"
                         onChange={(e)=>dispatch([event_ids.overview.projectDescription, e.target.value])}
                         value={projectDescription}                         
                         placeholder="Enter Text"/>
                </div>
                <div>
                  <label className="text-label"
                  >Learning Material (Optional)<SvgIcon icon="info" size="1.2rem" /></label>
                  <input type="text"
                         className="text-input"
                         value={learningMaterial}
                         onChange={(e)=>dispatch([event_ids.overview.learningMaterial, e.target.value])}
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
    const visibility = useSubscription([sub_ids.overview.visibility]);
    return (
      <div className="visibility-card projectWizardCard">
        <p className="card-title">Visibility<span style={{color:"red"}}>*</span>
          <SvgIcon icon="info" size="1.2rem" /></p>
        {Object.entries(visibilityOptions).map(([id, label])=>{
	  return (<div className="labeled-input"
                       key={id}
                       onClick={()=>dispatch([event_ids.overview.visibility, id])}>
                    <span>{visibility == id
                           ? <SvgIcon icon="radioChecked" size="1.2rem" />    
                           : <SvgIcon icon="radio" size="1.2rem"/>}</span>
                    <label className="text-label"
                           style={visibility == id ? {fontWeight: "bold"} : {}}
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
    
    const projectOptions = {gee: useSubscription([sub_ids.overview.projectOptions.gee]),
                            extraPlotColumns: useSubscription([sub_ids.overview.projectOptions.extraPlotColumns]),
                            plotConfidence: useSubscription([sub_ids.overview.projectOptions.plotConfidence]),
                            autoGeo: useSubscription([sub_ids.overview.projectOptions.autoGeo])
                           };
    
    return(<div className="project-options-card card">
              <p className="card-title">Project Options</p>
              {Object.entries(projectOptionsMap).map(([id, label])=> {
	        return (
	          <div className="labeled-input">
		    <span
                      className="checkbox"
		      onClick={() => {
                        dispatch([event_ids.overview.projectOptions[id], !projectOptions[id]]);
                      }}>
		      {projectOptions[id]
                       ? (<SvgIcon icon="checkboxChecked" size="1.2rem" />)
                       : <SvgIcon icon="checkboxUnchecked" size="1.2rem" />}
		    </span>
		    <label className="text-label"
                           style={projectOptions[id] ? {fontWeight: "bold"} : {}}
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
/*
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
*/
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

  const questions = useSubscription([sub_ids.questions.questions]);

  const QuestionCard = ({title, answers}) => {
    const [visible, setVisible] = useState(true);
    return (<div className='question-card'>
              <div onClick={()=>setVisible(!visible)}>
                {visible ? "^" : "v"}
              </div>
            </div>);
  };
  
  const PreviewCard = () => {
    return(<div className="question-preview-container">
             <p className="card-header">RULES PREVIEW</p>
             {Object.entries(questions).map(QuestionCard)}
           </div>);
  };
  
  return (
    <div style={{display: 'inline-flex', width: '100%'}}>
      <SurveyRuleDesigner/>
      <PreviewCard/>
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
  
  const currentStep = useSubscription([sub_ids.currentStep]);
  const modal = useSubscription([sub_ids.modal]);
  
  // -------------------
  // HANDLERS
  // ------------------
  
  const handleNewProject = () => {
    dispatch([event_ids.modal, null]);
    dispatch([event_ids.currentStep, 'overview']);
  };


  
  // -------------------
  // HOOKS
  // ------------------
  
  useEffect(() => {
    /*
      dispatch([event_ids.modal, {title: 'Project Setup',
      closeText: '',
      confirmText: 'Get Started',
      onConfirm: handleNewProject,
      id: 'newProject',
      children: (<NewProjectModal/>)}]); */
    dispatch([event_ids.currentStep, 'rules']);
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
                   onClick:()=>{window.location.assign(`/review-institution?institutionId=${institutionId}`);
                               }},
                  {display: "Add a New Project",
                   id: "projectWizard",
                   query: ["project", "newProject"],
                   onClick:()=>{window.location.assign(`/project-wizard?institutionId=${institutionId}`);
                               }}]}
              />
              <ProjectWizardNavigator/>
              {CurrentStep()}
              <NavButtons/>
            </NavigationBar>
          </div>);
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
            
/*

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
    case 'overview'  : return <OverviewStep />;
    case 'imagery'   : return <ImageryStep imageryList={availableImagery} />;
    case 'boundary'  : return <BoundaryStep />;
    case 'questions' : return <SurveyQuestionsStep />;
    default          : return <div style={{padding: "20px"}}>Step {currentStep} coming soon</div>;
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

 */

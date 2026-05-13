import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import { useSubscription, dispatch } from '@flexsurfer/reflex';

import { BreadCrumbs, NavigationBar } from "./components/PageComponents";
import  Modal  from "./components/Modal";
import SvgIcon from "./components/svg/SvgIcon";

import { stateAtom } from "./utils/constants";
import {  event_ids, sub_ids } from "./state/projectWizard";

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
  const currentStep = useSubscription([sub_ids.currentStep]);
  
  const  continueHandler = () => {
    const currentIdx = projectSteps.findIndex(({id})=>{return (id == currentStep);});
    
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
              onClick={()=>{continueHandler();}}
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
                         onChange={(e)=>{
                           dispatch([event_ids.overview.learningMaterial, e.target.value]);
                         }}
                         id="learning-material"
                         placeholder="Enter URL"/>
                </div>
              </div>
            </div>);p
  };

  const VisibilityCard = () => {    
    const visibilityOptions={public: "Public: All Users",
                             users: "Users: Logged In Users",
                             institution: "Institution: Group Members",
                             private: "Private: Group Admins"};
    const visibility = useSubscription([sub_ids.overview.visibility]);
    return (
      <div className="visibility-card card">
        <p className="card-title">Visibility<span style={{color:"red"}}>*</span>
        <SvgIcon icon="info" size="1.2rem" /></p>
        {Object.entries(visibilityOptions).map(([id, label])=>{
	  return (<div className="labeled-input"
                       key={id}
                       onClick={()=>{
                         dispatch([event_ids.overview.visibility, id]);                         
                       }}>
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

  //TODO: DELETE DEV VARS
  //vvvvvvvvvvvvvvvvvvvvvvvvvvvv
  const rules = [
    {ruleType: 'text-match',
     surveyQuestion: 0,
     label: 'Example',
     pattern: 'example'},
    {ruleType: 'text-match',
     surveyQuestion: 0,
     label: 'Example',
     pattern: 'example'},
    {ruleType: 'text-match',
     surveyQuestion: 0,
     label: 'Example',
     pattern: 'example'}
  ];
  const questions = [
    
  ];
  // ^^^^^^^^^^^^^^^^^^^^^^^^^^

  const ruleTypeOptions = {
      regex: 'TextRegex Match',      
    };


  const RuleCard = (rule) => {
    const {ruleType, question, label, pattern, ruleId} = rule;

    //TODO: DELETE THIS PLACEHOLDER VAR AND CALCULATE RULE NUMBER OTHERWISE
    //vvvvvvvvvvvvvvvvvvvvvv
    const ruleNumber = 1;
    //^^^^^^^^^^^^^^^^^^^^
       
    return (<div>
              <SvgIcon icon='trash' style={{color:'red'}} size='1.2rem'
                       onClick={()=>{console.log('delete rule!', ruleId);}}/>
              <p style={{fontWeight: 'bold'}}
              >{ruleNumber}.{ruleTypeOptions[ruleType]}</p>
              <p>Rule Label: <span>{label}</span></p>
              <p>The answer to question "<span>{question}</span>" should match the pattern <span>{pattern}</span>.</p>
            </div>);
  };

  const NewRuleCard = () => {
    const newRuleType = useSubscription([sub_ids.rules.newRule.type]);
    const newRuleLabel = useSubscription([sub_ids.rules.newRule.label]);
    const newRuleQuestion = useSubscription([sub_ids.rules.newRule.question]);
    const newRulePattern = useSubscription([sub_ids.rules.newRule.pattern]);

    
    return (<div>
              <div>
                <label>Rule Type</label>
                <select
                  onChange={(e)=>{dispatch([event_ids.rules.newRule.type, e.target.value]);
                                 }}>
                  {Object.entries(ruleTypeOptions).map(([id, label]) => {
                    return (<option key={id}>{label}</option>);
                  })}
                </select>
              </div>

              <div>            
                <label>Enter Rule Label </label>
                <SvgIcon icon='info' size='1.2rem'/>
                <input
                  placeHolder= 'Enter Text'
                  value={newRuleLabel}
                  onChange={(e)=>{dispatch([event_ids.rules.newRule.label, e.target.value]);
                                }}></input>
              </div>

              <div>
                <label>Survey Question <span style={{color:'red'}}>*</span></label>
                <select
                  onChange={(e)=>{dispatch([event_ids.rules.newRule.question, e.target.value]);}}>
                </select>
              </div>

              {newRuleType === 'regex' &&
               <div>
                 <label>Enter Regular Expression <span style={{color:'red'}}>*</span></label>
                 <input
                   placeholder= 'Enter Text'
                   value= {newRulePattern}
                   onChange={(e)=>{dispatch([event_ids.rules.newRule.pattern, e.target.value]);
                                 }} ></input>
               </div>
              }
              
            </div>);
  };

  const RuleCardList = () => {
    const ruleFilter = useSubscription([sub_ids.rules.filter]);
    const ruleSearch = useSubscription([sub_ids.rules.search]);
    
    return (<div>
              <p style={{fontWeight: 'heavy'}}
              >questions to be answered during collection  <span style={
                {fontWeight: 'normal',
                 color: 'red'}}
                                                           >*</span></p>
              <p>Descriptive Text Here. Just Placeholder: This is a list of all institution projects. The color around the name shows its progress. Red indicates that it has no plots collected.</p>
              <div>
                <SvgIcon icon='search' size='1.2rem'/>
                <input
                onChange={(e) => dispatch([event_ids.rules.search, e.target.value])}
                type='text'
                placeholder='Search'
                value={ruleSearch}
              ></input>
              </div>
              
              <p style={{fontWeight: 'heavy'}}>filter by:</p>
              <div
                className={ruleFilter === 'institution'
                           ? 'radio-selected-button'
                           : 'radio-selection-button'}
                onClick={()=>{
                  dispatch([event_ids.rules.filter, 'institution']);
                }}>
                {ruleFilter === 'institution' 
                 ? <SvgIcon icon='radioChecked' size="1.2rem"/>
                 : <SvgIcon icon='radio' size="1.2rem"
                            className='radio-button-unchecked'
                   />
                }
                <p>institution</p>
              </div>
              <div
                className={ruleFilter === 'project'
                           ? 'radio-selected-button'
                           : 'radio-selection-button'}
                onClick={()=>{
                  dispatch([event_ids.rules.filter, 'project']);
                }}>
                {ruleFilter === 'project' 
                 ? <SvgIcon icon='radioChecked' size="1.2rem"/>
                 : <SvgIcon icon='radio' size="1.2rem"
                            className='radio-button-unchecked'
                   />
                }
                <p>project</p>
              </div>
              <NewRuleCard/>
              {rules.map(RuleCard)}
            </div>);
  };

  const PreviewCard = () => {
    return(<div>

           </div>);
  };
  
  return (
    <div>
      <RuleCardList/>      
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
    dispatch([event_ids.modal, {title: 'Project Setup',
              closeText: '',
              confirmText: 'Get Started',
              onConfirm: handleNewProject,
              id: 'newProject',
              children: (<NewProjectModal/>)}]);
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

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

import OverviewStep from './project/OverviewStep';
import RulesStep from './project/RulesStep';

import { stateAtom } from "./utils/constants";

import ReviewStep from "./project/ReviewStep";

import { 
  projectSourceAtom, 
  currentStepAtom,
  projectOverviewAtom,
  event_ids,
  sub_ids
} from "./state/projectWizard";

import { lengthObject, someObject, filterObject } from "./utils/sequence";

import "../css/project-wizard.css";



const wizardModalAtom = atom(null); 

const projectSteps = [
  {id: 'overview', label: 'Project Overview'},
  {id: 'imagery', label: 'Imagery Selection'},
  {id: 'boundary', label: 'Project Boundary'},
  {id: 'plots', label: 'Plot Generation'},
  {id: 'samples', label: 'Sample Design'},
  {id: 'questions', label: 'Survey Questions'},
  {id: 'rules', label: 'Survey Rules'},
  {id: 'review', label: 'Review & Publish'}
];

const successModal ={
  id: 'success',
  confirmText: 'Close',
  onConfirm: ()=>{dispatch([event_ids.modal, null]);}};

const errorModal = {
  id: 'error',
  confirmText: "Go Back",
  onConfirm: () => {
    dispatch([event_ids.currentStep, 'review']);
    dispatch([event_ids.modal, null]);
  }
};

function validateOverview ({name, description}) {
  return(['overview', [
    (name === "" || description === "") && "A project must contain a name and description.",
  ]]);
}

function validateImagery ({requiresPublic, imageryId, privacyLevel}) {
  return(['imagery', [
    requiresPublic &&
      `Projects with privacy level of ${privacyLevel} require at least one public imagery.`,
      imageryId <= 0 && "Select a valid Basemap.",
  ]]);
}

function validatePlots({
  plotDistribution,
  aoiFeatures,
  plotSpacing,
  plotSize,
  plotFileNeeded,
  plotFileName,
  totalPlots,
  plotLimit,
  users,
  userMethod,
  percents,
  qaqcMethod,
  smes,
  timesToReview,
  numPlots
  
}) {
  return (['plots',
          [
  ["random", "gridded"].includes(plotDistribution) &&
        !aoiFeatures.length &&
        "Please select a valid boundary.",
      plotDistribution === "random" &&
        !numPlots &&
        "A number of plots is required for random plot distribution.",
      plotDistribution === "gridded" &&
        !plotSpacing &&
        "A plot spacing is required for gridded plot distribution.",
    !["shp", "geojson"].includes(plotDistribution) && (!plotSize || plotSize === 0) && "A plot size is required.",
      plotDistribution === "csv" &&
        plotFileNeeded &&
        !(plotFileName || "").includes(".csv") &&
        "A plot CSV (.csv) file is required.",
      plotDistribution === "shp" &&
        plotFileNeeded &&
        !(plotFileName || "").includes(".zip") &&
        "A plot SHP (.zip) file is required.",
      totalPlots > plotLimit &&
        "The plot size limit has been exceeded. Check the Plot Design section for detailed info.",
      ["equal", "percent"].includes(userMethod) &&
        users.length === 0 &&
        "At least one user must be added to the plot assignment.",
      userMethod === "percent" &&
        percents.reduce((acc, p) => acc + p, 0) !== 100 &&
        "The assigned plot percentages must equal 100%.",
      userMethod === "percent" &&
        percents.reduce((acc, p) => acc || p === 0, false) &&
        "All plot assignment percentages must be greater than 0%.",
      ["overlap", "sme"].includes(qaqcMethod) &&
        percent === 0 &&
        "The assigned Quality Control percentage must be greater than 0%.",
      ["random", "gridded"].includes(plotDistribution) &&
      qaqcMethod === "sme" && smes.length === 0 && "At least one user must be added as an SME.",
      qaqcMethod === "overlap" &&
        users.length === 1 &&
        "At least two assigned users are required for overlap mode.",
      qaqcMethod === "overlap" && timesToReview < 2 && "# of Reviews must be at least 2.",
      qaqcMethod === "overlap" &&
        timesToReview > users.length &&
        users.length > 1 &&
        "# of Reviews cannot be greater than the number of assigned users.",
      userMethod !== "none" &&
        qaqcMethod === "sme" &&
        _.intersection(users, smes).length > 0 &&
        "Users cannot be an Assigned User and an SME. Please remove the duplicate users.",]]);
}

function validateSamples({
  sampleDistribution,
  samplesPerPlot,
  sampleResolution,
  sampleFileName,
  plotShape,
  plotSize,
  perPlotLimit,
  totalPlots,
  sampleLimit,
  allowDrawnSamples,
  sampleGeometries
}) {
  return ([
    'samples',
    [sampleDistribution === "random" &&
     !samplesPerPlot && "A number of samples per plot is required for random sample distribution.",
     sampleDistribution === "gridded" &&
     !sampleResolution && "A sample spacing is required for gridded sample distribution.",
     sampleDistribution === "csv" &&
     !(sampleFileName || "").includes(".csv") && "A sample CSV (.csv) file is required.",
     sampleDistribution === "shp" &&
     !(sampleFileName || "").includes(".zip") && "A sample SHP (.zip) file is required.",
     sampleDistribution === "gridded" &&
     plotShape === "circle" &&
     sampleResolution >= plotSize / Math.sqrt(2) && `You must use a sample spacing that is less than ${
          Math.round((plotSize / Math.sqrt(2)) * 100) / 100
        } meters.`,
     sampleDistribution === "gridded" &&
     plotShape === "square" &&
     sampleResolution >= plotSize && "The sample spacing must be less than the plot width.",
     (samplesPerPlot > perPlotLimit || totalPlots * samplesPerPlot > sampleLimit) &&
     "The sample size limit has been exceeded. Check the Sample Design section for detailed info.",
     allowDrawnSamples && !Object.values(sampleGeometries).some((g) => g) &&
     "At least one geometry type must be enabled.",]]);
}

function validateQuestions({
  surveyQuestions
}) {
  function allAnswersHidden (answers) {
    const hiddenAnswers = filterObject(answers, ([_id, ans]) => ans.hide);
    return lengthObject(answers) === lengthObject(hiddenAnswers);}

  return ([
    'questions',
    [lengthObject(surveyQuestions) === 0 && "A survey must include at least one question.",
     someObject(surveyQuestions, ([_id, sq]) => (lengthObject(sq.answers) === 0 || allAnswersHidden(sq.answers))) &&
     "All survey questions must contain at least one (unhidden) answer.",]
  ]);
}

function validateWizard () {
  /* validates the existing draft project.
     returns a boolean.
     side effects: sends api request to create project,
     or adds errors to state.
     may even send a request, if superficially valid, and still add errors to state, in case of server error
  */
  const form = {name : "",
	        description : "",

	        privacyLevel : "",
	        imageryId : "",
	        institutionImagery : "",
	        projectImageryList : "",
	        requiresPublic : " ",

	        projectId : -1,
	        aoiFeatures : [],
	        plotDistribution : "",
	        numPlots : -1,
	        plotSpacing: "",
	        plotSize : -1,
	        plotFileName: "",
	        useTemplatePlots : false,
//	 originalProject ,
	 designSettings: {
	   
	 },
	        totalPlots : -1,
	        plotFileNeeded : false,
	        allowDrawnSamples : false,
	        samplesPerPlot : -1,
	 
	        plotShape : "",
	        sampleDistribution : "",
	        sampleFileName : "",
	        sampleResolution : "",

	        surveyQuestions : []};

  const errors = [
    validateOverview(form),
    validateImagery(form),
    validatePlots(form),
    validateSamples(form),
    validateQuestions(form)
  ].filter(([name, e])=>e.length);
  
  return (errors.length ? false : errors);
}

const publishModal = {
  title: 'Ready to publish this project?',
  id: 'review',
  closeText: "Cancel",
  confirmText: "Publish Project",
  onConfirm: ()=>{
    let errors = validateWizard();
    errors ?
      dispatch ([event_ids.modal, errorModal]) //dispatch an event that adds errors to state and then sends errors
      : dispatch([event_ids.modal, successModal]); //dispatch an event that sends the api request and eventually succesModal
      
  }
};

const exitModal = {
  title: 'Exit "Add a New Project" Workflow?',
  id: 'exit',
  closeText: "Exit Workflow",
  confirmText: "Stay",
  onClose: ()=> {
    console.log("save and exit workflow");
  },
  onConfirm: ()=>{
    dispatch([event_ids.modal, null]);
  },

};

const NavButtons = () => {
  const currentStep = useSubscription([sub_ids.currentStep]);
  
  const  continueHandler = () => {
    const currentIdx = projectSteps.findIndex(({id})=> (id == currentStep));
    
    currentIdx + 1 < projectSteps.length
      ? dispatch([event_ids.currentStep, projectSteps[currentIdx + 1].id])
      : dispatch([event_ids.modal, publishModal]);
  };

  return (<div className="nav-buttons">
            <button
              className="btn btn-secondary btn-sm"
              onClick={()=>dispatch([event_ids.modal, exitModal])}
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
            >Save & {currentStep === 'review' ? 'Publish' : 'Continue'}</button>
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
              style={{fontWeight: currentStep === id ? 'bold' : 'normal',
                      display: 'inline-flex',
                      cursor: 'pointer'}}
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

function NewProjectModal () {
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
                         className="radio-button-unchecked"/> }
              {"    "}
              { title } </p>
            <label
              className="radio-button-description"
            >{ description }</label>
          </div>);
      })}
    </div>);
};

function SubmitProjectModal () {
  return (
    <div>
      <p >You are about to publish this project. Once published it will be added to your institution. You’ll still be able to make changes later from the project page within your institution.</p>
      <p > Are you sure you want to continue?</p>
    </div>);
};

function SuccessModal () {
  return (
    <>
      <div className="success-icon">
        <SvgIcon  icon='check' size='2rem'/>
      </div>
      <br/>
      <b>Your Project has been published! </b>
      <p >The Published Project can now be viewed in your Institutions Project Page.</p>
    </>
  );
};

function ErrorModal () {
  const errors = useSubscription([sub_ids.errors]);
  const errorTypes = {missingFields: ['Missing Fields', 'Some required fields are missing. Please complete all necessary fields before proceeding.']};
  return  (
    <>
      <div className='alert-icon'>
        <SvgIcon  icon='alert' size='2rem'/>
      </div>
      <br/>
      <b >{errorTypes['missingFields'][0]}</b>      
      <p >{errorTypes['missingFields'][1]}</p>
    </>
  );
};

function ExitModal () {
  return (
    <p > Are you sure you want to exit “Create New Scenario”? Saved steps will be kept in draft form, any steps you haven’t saved will be lost.</p>
  );
}

const ProjectWizardModal = () => {
  // this is the container for any modal related to this page. based on state, this actually renders modals as they are explicitly defined above., provided through "children" value of modal map"
  const projectSource = useSubscription([sub_ids.projectSource]);
  const modal = useSubscription([sub_ids.modal]);
  
  const children = () => {
    switch (modal.id) {
    case 'newProject'  : return (<NewProjectModal/>);
    case 'review'      : return (<SubmitProjectModal/>);
    case 'success'     : return (<SuccessModal/>);
    case 'error'       : return (<ErrorModal/>);
    case 'exit'        : return (<ExitModal/>);
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
    dispatch([event_ids.modal, {
      title: 'Project Setup',
      closeText: '',
      confirmText: 'Get Started',
      onConfirm: handleNewProject,
      id: 'newProject',
      children: (<NewProjectModal/>)}]); 
    fetch(`/get-institution-imagery?institutionId=${institutionId}`)
      .then(res => res.json())
      .then(data => setAvailableImagery(data))
      .catch(err => console.error("Could not load imagery", err));
  }, []);

  
  // -------------------
  // RENDER FUNCTIONS
  // ------------------
  
  const [availableImagery, setAvailableImagery] = useState([]);
  
  const CurrentStep = () => {
    switch (currentStep) {
    case null         : return (<></>);
    case 'overview'   : return <OverviewStep />;
    case 'imagery'    : return <ImageryStep imageryList={availableImagery}/>;
    case 'boundary'   : return <BoundaryStep />;
      //    case 'plots'      : return <PlotStep />;
      //    case 'samples'    : return <SamplesStep />;
    case 'questions'  : return <SurveyQuestionsStep />;
    case 'rules'      : return <RulesStep />;
    case 'review'     : return <ReviewStep />;
    default           : return <div style={{padding: "20px"}}>Step {currentStep} coming soon</div>;
    }};

  
  return (
    <div className="project-wizard-container">
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
        <div className="wizard-step-body" >
          {CurrentStep()}
        </div>
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

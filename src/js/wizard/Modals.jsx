import { useSubscription, dispatch } from '@flexsurfer/reflex';
import React, { useEffect, useState } from "react";

import { readFileAsBase64Url } from '../utils/generalUtils';
import Modal from "../components/Modal";
import SvgIcon from "../components/svg/SvgIcon";
import { event_ids,  sub_ids } from "../state/projectWizard";


function ImportProjectModal () {

  const [projectFileName, setProjectFileName] = useState("");
  const [projectFileBase64, setProjectFileBase64] = useState(null);
  const [importErrors, setImportErrors] = useState(null);

  function importCollectProject (fileName, fileb64) {
    fetch(`/import-ce-project`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName,
        fileb64,
      }),
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        dispatch([event_ids.templateProject, data]);
        dispatch([event_ids.currentStep, 'review']);
        dispatch([event_ids.modal, null]);
      })
      .catch((message) => {
        console.log('import collect earth project errors: ', message);        
        setImportErrors([message.statusText]);
      });
  };

  function uploadProjectFile (file) {
    setImportErrors(null);
    readFileAsBase64Url(file, (base64) => {
      //do some sort of validating
      setProjectFileName(file.name);
      setProjectFileBase64(base64);
    });       
  };

  return (
    <Modal
      title='Upload Collect Earth Project File'
      confirmText='Upload'
      closeText='Quit'
      onConfirm={()=> {importCollectProject(projectFileName, projectFileBase64);}}      
      onClose={()=>{ dispatch([event_ids.modal, 'newProject']);}}
      confirmDisabled={projectFileName === ""}
    >
      <div>
        <label
          className="btn btn-sm filled py-2 px-3 text-nowrap"
          htmlFor='template-project-file'
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}
        >
          <SvgIcon icon='plus' size='0.9rem' />
          {projectFileName ? `File: ${projectFileName}` : 'Upload Collect Earth Project File'}
        <input
          type='file'
          accept='application/cep'
          defaultValue=''
          id='template-project-file'
          style={{ display: 'none'}}
          onChange={(e)=> {
            const file = e.target.files[0];
            file && uploadProjectFile(file);
          }}
        />
        </label>
        {importErrors &&
         (<div style={{border: '1px solid red',
                       background: 'pink',
                       color: 'red'}} >
            {importErrors.map((message) => {
              return (<span > {message} <br/> </span>);
            })}
          </div>)}
      </div>
    </Modal>
  );
}

function TemplateProjectModal () {

  const institutionId = useSubscription([sub_ids.institutionId]);
  const institutionImagery = useSubscription([sub_ids.institution.imagery]);
  const projectType = useSubscription([sub_ids.overview.projectType]) || 'regular';
  const [templateProjectId, setTemplateProjectId] = useState(-1);
  const [templateProjects, setTemplateProjects] = useState([]);

  function setTemplateProject (templateProject) {dispatch([event_ids.templateProject, templateProject]);}
  function setUseTemplatePlots (useTemplatePlots) {dispatch([event_ids.overview.useTemplatePlots, useTemplatePlots]);}
  function setDesignSettings (designSettings) {dispatch([event_ids.plots.designSettings, designSettings]);}
  function setImageryId (imageryId) {dispatch([event_ids.imagery.imagery, imageryId]);}
  function validate () {dispatch([event_ids.validate]);}
  function setPlots (plots) {dispatch([event_ids.plots.plots, plots]);}
  function setImageryList (imageryList) {dispatch([event_ids.imagery.imageryList, imageryList]);}
  function setPreviewImagery (imageryId) {dispatch([event_ids.imagery.previewId, imageryId]);}
  function setUseTemplateWidgets (useTemplateWidgets) {dispatch([event_ids.overview.useTemplateWidgets, useTemplateWidgets]);}
  
  function getTemplateById (projectId) {
    fetch(`/get-template-by-id?projectId=${projectId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        setTemplateProject(data);
        const institutionImageryIds = institutionImagery.map((i) => i.id);
        data.institutionId != institutionId ?
          setDesignSettings({... data.designSettings, userAssignment: {
            userMethod: null,
            users: [],
            percents: []}})
          : setDesignSettings(data.designSettings);
        setTemplateProjectId(projectId);        
        setImageryId(institutionImageryIds.includes(data.imageryId)
                     ? [data.imageryId]
                     : institutionImageryIds);
        setUseTemplatePlots(true);
        setUseTemplateWidgets(true);
        validate();
      });}
  
  function getProjectPlots(projectId) {
    fetch(`/get-project-plots?projectId=${projectId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        setPlots(data);
      });}
  
  function getProjectImagery(projectId) {    
    fetch("/get-project-imagery?projectId=" + projectId)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        setPreviewImagery(data[0].id);
        setImageryList(data.map((i) => i.id));        
      });}

  function getTemplateProjects (projectId) {
    Promise.all([
      getTemplateById(projectId),
      getProjectPlots(projectId),
      getProjectImagery(projectId),
    ])
//      .then(() => setTemplateProjectId(projectId))
      .catch((error) => {
        setTemplateProject({});
        setTemplateProjectId(-1);
        console.error(error);
        dispatch([event_ids.modal, [['Project Template Error', ["Error getting complete template info. See console for details."]]]]);
      });
  }
    
  useEffect(() => {
    fetch(`/get-template-projects?projectType=${projectType}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) =>
        data && data.length > 0 ?
          setTemplateProjects(data):
          setTemplateProjects([{ id: -1, name: "No template projects found" }])        
      )
      .catch((error) => {
        dispatch([event_ids.errors, [['Template Projects', ['Failed to load template projects']]]]);
        Promise.reject(error);
      });
  }, []);  
  return (
    <Modal
      title='Select Template Project'
      confirmText='Select'
      closeText='Quit'
      onConfirm={()=> {getTemplateProjects(templateProjectId);}}      
      onClose={()=>{ dispatch([event_ids.modal, 'newProject']);}}>
      <div>        
        {templateProjects.length &&
         <select
           className="text-input"
           onChange={(e)=>{
             setTemplateProjectId(Number(e.target.value));}}>
           <option value={-1} selected disabled hidden>Select Template Project:</option>
           {templateProjects.map(e =>(<option key={e.id} value={e.id}>{e.name}</option>))}
         </select>}
      </div>
    </Modal>
  );
}

function handleNewProject (projectSource) {
  switch (projectSource) {
  case 'templateProject' : {
    dispatch ([event_ids.modal, 'template']);
  } break;
  case 'importProject' : {
    dispatch([event_ids.modal, 'import']);
  } break;
  default: {
    dispatch([event_ids.modal, null]);
    dispatch([event_ids.currentStep, 'overview']);
  } break;
  }
};

function NewProjectModal () {
  const newProjectOptions = {
    newProject: ['Create a new project',
                 'Generate a new project from scratch by customizing all steps.'],
    templateProject: ['Select from an existing template',
                      'Select a template and prefill all the steps. You can edit and customize it.'],
    importProject: ['Import Collect Earth Project',
                    'Import a project from the Collect Earth desktop application.']};
  const projectSource = useSubscription([sub_ids.projectSource]);

  return (
    <Modal
      title='Project Setup'
      closeText=''
      confirmText='Get Started'
      onConfirm={()=>{handleNewProject(projectSource);}}
      onClose={()=>{dispatch([event_ids.modal, 'newProject']);}}
      confirmDisabled={projectSource === null}>
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
      </div>
    </Modal>
  );
};

function SubmitProjectModal () {
  return (
    <Modal
      title='Ready to publish this project?'
      closeText='Cancel'
      confirmText='Publish Project'
      onConfirm={()=>{dispatch ([event_ids.submitForm]); }}
      //confirmDisabled={confirmDisabled()}
      onClose={()=>{dispatch([event_ids.modal, null]);}}>
      <div>
        <p >You are about to publish this project. Once published it will be added to your institution. You’ll still be able to make changes later from the project page within your institution.</p>
        <p > Are you sure you want to continue?</p>
      </div>
    </Modal>
  );
};

function DraftSuccessModal () {
  const institutionId = useSubscription([sub_ids.institutionId]);
  return (
    <Modal
      title='Draft Success'
      closeText='Return to Institution'
      confirmText='Continue Editing'
      onConfirm={()=>{dispatch([event_ids.modal, null]);}}
      onClose={()=>{window.location=`/review-institution?institutionId=${institutionId}`;}}
    >
      <div>
        <p > You have Successfully saved your Draft Project.</p>
        <p > Click below to return to institution dashboard, or continue editing your project. </p>
      </div>
    </Modal>
  );
}

function SuccessModal () {  
  return (
    <Modal
      title=''
      closeText=''
      confirmText='Close'
      onConfirm={()=>{dispatch([event_ids.modal, null]);}}
      onClose={()=>{dispatch([event_ids.modal, null]);}}>

      <div className="success-icon">
        <SvgIcon  icon='check' size='2rem'/>
      </div>
      <br/>
      <b>Your Project has been published! </b>
      <p >The Published Project can now be viewed in your Institutions Project Page.</p>

    </Modal>

  );
};

function ErrorModal () {
  const errors = useSubscription([sub_ids.errors]);
  const [visible, setVisible] = useState([]);
  function toggleVisible (errorType) {
    visible.includes(errorType) ? setVisible(visible.filter((e) => e !== errorType)) : setVisible([... visible, errorType]);
  };

  function stepName (errorType) {
    switch(errorType){
    case 'overview' : return 'Overview Step';
    case 'imagery' : return 'Imagery Step';
    case 'plots' : return 'Plot Step';
    case 'samples' : return 'Plot Samples';
    case 'questions' : return 'Survey Questions';
    default: return 'Unknown Error';
    }
  }
  return  (
    <Modal
      onClose={()=>{dispatch([event_ids.modal, null]);}}>
      <div style={{display: 'flex',
                   flexDirection: 'column',
                   gap: '1rem'}}>
        <div className='alert-icon'>
          <SvgIcon  icon='alert' size='2rem'/>
        </div>
        <b className='error-title'> Your Project contains the following errors:</b>
        <br/>      
        {errors.map(([errorType, errorMessages])=> {
          return (<div className='error-card'>
       <div className='error-header' onClick={()=>toggleVisible(errorType)}>
         <b > {stepName(errorType)}</b>
         <SvgIcon icon={visible.includes(errorType) ? 'upCaretNew' : 'downCaretNew'}
                  size='1.2rem'> </SvgIcon>
       </div>
       {visible.includes(errorType) &&
        <div style={{gap: '1rem'}}>
          <br/>
          {errorMessages.map((message) => {
            return (
              <p > - {message}
              </p>);
          })}
        </div>}
     </div>);
        })}
      </div>
    </Modal>    
  );
};

function ExitModal () {
  const institutionId = useSubscription([sub_ids.institutionId]);
  return (
    <Modal
      title='Exit "Add a New Project" Workflow?'
      closeText='Exit Workflow'
      confirmText='Stay'
      onConfirm={()=>{
        dispatch([event_ids.modal, null]);
      }}
      onClose={()=>{
        window.location.href = `/review-institution?institutionId=${institutionId}`;
      }}>
      <p > Are you sure you want to exit Project Creation? </p>
    </Modal>
  );
}


export default function ProjectWizardModal () {
  // this is the container for any modal related to this page. based on state, this actually renders modals as they are explicitly defined above., provided through "children" value of modal map"
  const modal = useSubscription([sub_ids.modal]);
  
  switch (modal) {
  case 'template'    : return (<TemplateProjectModal/>);
  case 'import'      : return (<ImportProjectModal/>);
  case 'newProject'  : return (<NewProjectModal/>);
  case 'review'      : return (<SubmitProjectModal/>);
  case 'success'     : return (<SuccessModal/>);
  case 'error'       : return (<ErrorModal/>);
  case 'draft-success' : return (<DraftSuccessModal/>);
  case 'exit'        : return (<ExitModal/>);
    
  default : break;
  }
};

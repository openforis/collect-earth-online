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
  const [importing, setImporting] = useState(false);

  // Surface the server's message instead of only the status text
  const readError = (response) =>
    response.text()
      .then((text) => {
        try {
          const body = JSON.parse(text);
          return body.message || body.error
            || (body.params && Object.entries(body.params).map(([f, m]) => `${f}: ${m}`).join('; '))
            || text;
        } catch {
          return text;
        }
      })
      .then((message) => Promise.reject(message || response.statusText || 'Import failed.'));

  function importCollectProject (fileName, fileb64) {
    if (importing) return;
    setImporting(true);
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
      .then((response) => (response.ok ? response.json() : readError(response)))
      .then((data) => {
        dispatch([event_ids.importProject, data]);
        dispatch([event_ids.currentStep, 'review']);
        dispatch([event_ids.modal, null]);
      })
      .catch((message) => {
        console.log('import collect earth project errors: ', message);
        setImportErrors([typeof message === 'string' ? message : 'Import failed. See console for details.']);
      })
      .finally(() => setImporting(false));
  };

  function uploadProjectFile (file) {
    setImportErrors(null);
    readFileAsBase64Url(file, (base64) => {
      setProjectFileName(file.name);
      setProjectFileBase64(base64);
    });       
  };

  return (
    <Modal
      title='Upload Collect Earth Project File'
      confirmText={importing ? 'Importing...' : 'Upload'}
      closeText='Quit'
      onConfirm={()=> {importCollectProject(projectFileName, projectFileBase64);}}
      onClose={()=>{ dispatch([event_ids.modal, 'newProject']);}}
      confirmDisabled={projectFileName === "" || !projectFileBase64 || importing}
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
            accept='.cep'
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
  const projectType = useSubscription([sub_ids.overview.projectType]) || 'regular';
  const institutionImagery = useSubscription([sub_ids.institution.imagery]) || [];
  const [templateProjectId, setTemplateProjectId] = useState(-1);
  const [templateProjects, setTemplateProjects] = useState([]);
  const [filterProjectId, setFilterProjectId] = useState('');
  const [filterProjectName, setFilterProjectName] = useState('');
  const [loading, setLoading] = useState(false);

  const stripForeignUsers = (designSettings) => ({
    ...designSettings,
    userAssignment: { ...designSettings.userAssignment, userMethod: 'none', users: [], percents: [] },
    qaqcAssignment: { ...designSettings.qaqcAssignment, qaqcMethod: 'none', smes: [] },
  });
  const matchesFilters = (idFilter, nameFilter) => ({ id, name }) =>
    (idFilter === '' || String(id).includes(idFilter))
      && (nameFilter === '' || name.toLowerCase().includes(nameFilter.toLowerCase()));

  const intersectTemplateImagery = (templateImagery, institutionImagery, templateBasemapId) => {
    const allowed = new Set(institutionImagery.map(({ id }) => id));
    const shared = templateImagery.filter(({ id }) => allowed.has(id));
    const pool = shared.length ? shared : institutionImagery;
    const basemap =
      pool.find(({ id }) => id === templateBasemapId)
        ?? pool.find(({ visibility }) => visibility === 'platform')
        ?? pool[0];
    return [basemap, ...pool.filter((img) => img !== basemap)].map(({ id }) => id);
  };

  function getTemplateById (projectId) {
    return fetch(`/get-template-by-id?projectId=${projectId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        dispatch([event_ids.templateProject, data]);
        dispatch([event_ids.plots.designSettings,
          data.templateInstitutionId === institutionId
            ? data.designSettings
            : stripForeignUsers(data.designSettings)]);
        return data;
      });
  }
 
  // get-project-plots returns {id, plotId, center, flagged, status} rows,
  // where center is a GeoJSON Point string and id is the visible id.
  function getProjectPlots (projectId) {
    return fetch(`/get-project-plots?projectId=${projectId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((plots) => dispatch([event_ids.plots.serverPlots, {
        features: plots.map((p) => JSON.parse(p.center)),
        count: plots.length,
        maxId: Math.max(0, ...plots.map((p) => p.id)),
      }]));
  }
 
  function getProjectImagery (projectId) {
    return fetch(`/get-project-imagery?projectId=${projectId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)));
  }
 
  function loadTemplate (projectId) {
    if (projectId <= 0 || loading) return;
    setLoading(true);
    Promise.all([getTemplateById(projectId), getProjectPlots(projectId), getProjectImagery(projectId)])
      .then(([template, , templateImagery]) => {
        const imageryIds = intersectTemplateImagery(templateImagery, institutionImagery, template.imageryId);
        dispatch([event_ids.imagery.imageryList, imageryIds]);
        dispatch([event_ids.imagery.previewId, imageryIds[0]]);
        dispatch([event_ids.templateProjectId, projectId]);
        dispatch([event_ids.templateProjectName,
          templateProjects.find(({ id }) => id === projectId)?.name ?? '']);
        dispatch([event_ids.templatePlotDesign]);
        dispatch([event_ids.overview.useTemplatePlots, true]);
        dispatch([event_ids.overview.useTemplateWidgets, true]);
        dispatch([event_ids.validate]);
      })
      .catch((error) => {
        console.error(error);
        dispatch([event_ids.templateProjectId, -1]);
        dispatch([event_ids.overview.useTemplatePlots, false]);
        dispatch([event_ids.overview.useTemplateWidgets, false]);
        dispatch([event_ids.templatePlotDesign, true]);
        dispatch([event_ids.templateProjectName, '']);
        dispatch([event_ids.errors, [['Project Template Error',
          ['Error getting complete template info. See console for details.']]]]);
      })
      .finally(() => setLoading(false));
  }
 
  useEffect(() => {
    fetch(`/get-template-projects?projectType=${projectType}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => setTemplateProjects(data || []))
      .catch((error) => {
        console.error(error);
        dispatch([event_ids.errors, [['Template Projects', ['Failed to load template projects']]]]);
      });
  }, [projectType]);
 
  const visibleProjects = templateProjects.filter(matchesFilters(filterProjectId, filterProjectName));
 
  return (
    <Modal
      title="Select Template Project"
      confirmText={loading ? 'Loading...' : 'Select'}
      closeText="Quit"
      onConfirm={() => loadTemplate(templateProjectId)}
      onClose={() => dispatch([event_ids.modal, 'newProject'])}>
      {templateProjects.length === 0
        ? <p>No template projects found.</p>
        : (
          <div>
            <p>Filter Template Projects:</p>
            <div style={{ display: 'flex', gap: '1rem', flexDirection: 'row' }}>
              <input
                className="text-input"
                style={{ width: '20%' }}
                type="text"
                inputMode="numeric"
                placeholder="Id"
                value={filterProjectId}
                onChange={(e) => setFilterProjectId(e.target.value.replace(/[^0-9]/g, ''))}
              />
              <input
                className="text-input"
                style={{ flexGrow: 2 }}
                type="text"
                placeholder="Project Name"
                value={filterProjectName}
                onChange={(e) => setFilterProjectName(e.target.value)}
              />
            </div>
            <select
              className="text-input"
              value={templateProjectId}
              onChange={(e) => setTemplateProjectId(Number(e.target.value))}>
              <option value={-1} disabled hidden>Select Template Project:</option>
              {visibleProjects.map(({ id, name }) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            {visibleProjects.length === 0 && (
              <p style={{ marginTop: '0.5rem' }}>No template projects match the filters.</p>
            )}
          </div>
        )}
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
  const institutionId = useSubscription([sub_ids.institutionId]);
  return (
    <Modal
      title='Project Setup'
      closeText=''
      confirmText='Get Started'
      onConfirm={()=>{handleNewProject(projectSource);}}
      onClose={()=>{window.location.assign(`/review-institution?institutionId=${institutionId}`);}}
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
  const [TOS, setTOS] = useState(false);
  const projectId = Number(useSubscription([sub_ids.projectId]));
  const isEditing = projectId > 0;
  return (
    <Modal
      title={isEditing ? 'Update Project' : 'Create Project'}
      closeText='Return to editing'
      confirmText={isEditing ? 'Update Project' : 'Create Project'}
      onConfirm={()=>{
        dispatch([event_ids.saveProject, TOS]);
      }}
      confirmDisabled={!isEditing && !TOS}
      onClose={()=>{dispatch([event_ids.modal, null])}}>
      {isEditing ? (
        <p>Are you sure you want to apply these changes to the project?</p>
      ) : (
        <div>
          <p >You will be able to continue to make changes to the project after creating/updating it.
            Once satisfied with the project, click publish to begin final collection.</p>
          <div className="labeled-input" onClick={()=>setTOS(!TOS)}>
            <span className="checkbox">
              <SvgIcon icon={TOS ? 'checkboxChecked' : 'checkboxUnchecked'} size="1.2rem" />
            </span>
            <span className="text-label" style={TOS ? {fontWeight: 'bold'} : {}}>
              Accept{' '}
              <a
                href="/terms-of-service"
                onClick={(e)=>e.stopPropagation()}
                target="_blank">
                Terms of Service
              </a>
              <span style={{color: 'red'}}>*</span>
            </span>
          </div>
          <p > Are you sure you want to continue?</p>
        </div>
      )}
    </Modal>
  );
};

function UpdatePublishedProjectModal () {
  const [overwrite, setOverwrite] = useState(false);
  return (
    <Modal
      title='Update Published Project'
      closeText='Return to editing'
      confirmText='Update Project'
      onConfirm={()=>{
        dispatch([event_ids.saveProject, false, overwrite]);
      }}
      onClose={()=>{dispatch([event_ids.modal, null]);}}>
      <div>
        <p>Would you like to clear data that has been collected?</p>
        {[[false, 'No'], [true, 'Yes']].map(([value, label]) => (
          <div className="labeled-input" key={label} onClick={()=>setOverwrite(value)}>
            <span>{overwrite === value
              ? <SvgIcon icon="radioChecked" size="1.2rem" />
              : <SvgIcon icon="radio" size="1.2rem"/>}</span>
            <span className="text-label" style={overwrite === value ? {fontWeight: 'bold'} : {}}>
              {label}
            </span>
          </div>
        ))}
        {overwrite && (
          <p style={{color: 'red', marginTop: '.5rem'}}>
            All data collected for this project will be permanently deleted.
          </p>
        )}
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
  const institutionId = useSubscription([sub_ids.institutionId]);
  const { projectId } = useSubscription([sub_ids.successResponse]);
  const redirectUrl = projectId ? `/project-wizard?institutionId=${institutionId}&projectId=${projectId}` : null;
  return (
    <Modal
      title=''
      closeText=''
      confirmText='Close'
      onConfirm={()=>{
        dispatch([event_ids.modal, null]);
        if(redirectUrl) window.location.href = redirectUrl;
      }}
      onClose={()=>{
        dispatch([event_ids.modal, null]);
        if(redirectUrl) window.location.href = redirectUrl;
      }}>
      <div className="success-icon">
        <SvgIcon  icon='check' size='2rem'/>
      </div>
      <br/>
      <b>Your Project has been published! </b>
      <p >The Published Project can now be viewed in your Institutions Project Page.</p>

    </Modal>

  );
};

function PublishModal () {
  const institutionId = useSubscription([sub_ids.institutionId]);
  const { projectId } = useSubscription([sub_ids.successResponse]);
  const redirectUrl = projectId ? `/project-wizard?institutionId=${institutionId}&projectId=${projectId}` : null;
  return (
    <Modal
      title='Project Published!'
      closeText='Close'
      confirmText='Return to Institution'
      onConfirm={()=>{
        window.location=`/review-institution?institutionId=${institutionId}`;
      }} 
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
  case 'update-published' : return (<UpdatePublishedProjectModal/>);
  case 'success'     : return (<SuccessModal/>);
  case 'error'       : return (<ErrorModal/>);
  case 'draft-success' : return (<DraftSuccessModal/>);
  case 'exit'        : return (<ExitModal/>);
  case 'published' : return (<PublishModal/>);
    
  default : break;
  }
};

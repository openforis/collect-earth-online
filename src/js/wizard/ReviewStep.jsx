import React, { useEffect, useRef } from "react";
import { useSetAtom } from 'jotai';
import { useSubscription, dispatch } from '@flexsurfer/reflex';

import { event_ids, sub_ids } from "../state/projectWizard";
import { mapImageryLibraryAtom, activeMapLayerIdsAtom } from '../state/map';

import SvgIcon from '../components/svg/SvgIcon';
import SurveyRule from '../survey/SurveyRule';
import { SurveyQuestions } from '../components/SurveyQuestions';
import { NewMap } from '../components/NewMap';;

import "../../css/project-wizard.css";


export default function ReviewStep ({imageryList = [], projectId, institutionId}) {

  function OverviewCard () {
    const projectName = useSubscription([sub_ids.overview.projectName]);
    const projectDescription = useSubscription([sub_ids.overview.projectDescription]);
    const projectVisibility = useSubscription([sub_ids.overview.visibility]);
    const dataLicenseType = "Public-Open Use"; //useSubscription([sub_ids.overview.license])
    const showGee = useSubscription([sub_ids.overview.projectOptions.gee]);
    const extraPlotColumns = useSubscription([sub_ids.overview.projectOptions.extraPlotColumns]);
    const plotConfidence = useSubscription([sub_ids.overview.projectOptions.plotConfidence]);
    const autoGeo = useSubscription([sub_ids.overview.projectOptions.autoGeo]);

    return (
      <div className='wizard-card'>
        <div className='review-card-header'>
          <p className="card-title">OVERVIEW</p>
          <div onClick={()=>{dispatch([event_ids.currentStep, 'overview']);}}>
            <SvgIcon icon='edit' size='2rem'/>
          </div>
        </div>
        
        <p>Name: <b>{projectName}</b></p>
        <p>Description: <b>{projectDescription}</b></p>
        <p>Visibility: <b>{projectVisibility}</b></p>
        <p>Data License Type: <b>{projectVisibility}</b></p>

        <p className='hyperlink' >See the full agreement here.</p>

        <p > <b>Project Options: </b></p>
        <p > {!showGee && "Don't "} Show GEE Script Link on Collection Page</p>
        <p > {!extraPlotColumns && "Don't "} Show Extra Plot Columns on Collection Page</p>
        <p > {!plotConfidence && "Don't "} Collect Plot Confidence</p>
        <p > {!autoGeo && "Don't "} Auto-launch Geo-Dash Window</p>
                
      </div>
    );
  }

  function ImageryCard () {
    const initialized = useRef(false);
    const selectedImagery = useSubscription([sub_ids.imagery.imageryList]);
    const setMapLibrary = useSetAtom(mapImageryLibraryAtom);
    const setActiveMapLayers = useSetAtom(activeMapLayerIdsAtom);
    function setPreviewId (previewId) {dispatch([event_ids.imagery.previewId]);}
    const previewId = useSubscription([sub_ids.imagery.previewId]);
    
    useEffect(() => {
      setMapLibrary(imageryList);
      if (imageryList && imageryList.length > 0 && !initialized.current) {
        const platformItems = imageryList.filter(img => img.visibility === 'platform');
        if (platformItems.length > 0) {
          setPreviewId(platformItems[0].id.toString());
        }
        initialized.current = true;
      }
    }, [imageryList]);
    
    useEffect(() => {
      const previewArray = previewId ? [Number(previewId)] : [];
      setActiveMapLayers(new Set(previewArray));
    }, [previewId, setActiveMapLayers]);
    
    return (
      <div className='wizard-card'>
        <div className='review-card-header'>
          <p className="card-title">IMAGERY</p>
          <div onClick={()=>{dispatch([event_ids.currentStep, 'imagery']);}}>
            <SvgIcon icon='edit' size='2rem'/>
          </div>
        </div>
        <b >Imagery Used:</b>
        {selectedImagery.map((i)=>{
          return (
            <p > {imageryList[0] ? imageryList.filter(({id})=> id === i)[0].title : null} </p>
          );
        })}
      </div>
    );
  }

  function BoundaryCard () {
    const aoiFeatures = useSubscription([sub_ids.boundary.aoiFeatures]) || [];

    return (
      <div className='wizard-card' style={{ display: 'flex', flexDirection: 'column', height: '420px', boxSizing: 'border-box' }}>
        <div className='review-card-header'>
          <p className="card-title">BOUNDARY</p>
          <div style={{ cursor: 'pointer' }} onClick={()=>{dispatch([event_ids.currentStep, 'boundary']);}}>
            <SvgIcon icon='edit' size='2rem'/>
          </div>
        </div>
        <div className="map-area"
          style={{
            width: '100%',
            flex: 1,
            position: 'relative',
            marginTop: '1rem',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
          <NewMap 
            pan={false}
            aoiToShow={aoiFeatures}
            initZoom={4}
            preview={true}
          />
        </div>
      </div>
    );
  }

  function PlotsCard () {
    const plotDistribution = useSubscription([sub_ids.plots.plotDistribution]);
    const numPlots = useSubscription([sub_ids.plots.numPlots]);
    const plotShape = useSubscription([sub_ids.plots.plotShape]);
    const plotSize = useSubscription([sub_ids.plots.plotSize]);

    return (
      <div className='wizard-card'>
        <div className='review-card-header'>
          <p className="card-title">SURVEY PLOTS</p>
          <div onClick={()=>{dispatch([event_ids.currentStep, 'plots']);}}>
            <SvgIcon icon='edit' size='2rem'/>
          </div>
        </div>
        <p>Plot Distribution: <b>{plotDistribution}</b></p>
        <p>Number of Plots: <b>{numPlots}</b></p>
        <p>Plot Shape: <b>{plotShape}</b></p>
        <p>Plot Size: <b>{plotSize}</b></p>
        <p>User Assignment: <b>{''}</b></p>
        <p>Quality Control: <b>{''}</b></p>
      </div>
    );
  }

  function SamplesCard () {
    const allowDrawnSamples = useSubscription([sub_ids.samples.allowDrawnSamples]);
    const sampleDistribution = useSubscription([sub_ids.samples.sampleDistribution]);
    const samplesPerPlot = useSubscription([sub_ids.samples.samplesPerPlot]);
    const numPlots = useSubscription([sub_ids.plots.numPlots]);

    return (
      <div className='wizard-card'>
        <div className='review-card-header'>
          <p className="card-title">PLOT SAMPLES</p>
          <div  onClick={()=>{dispatch([event_ids.currentStep, 'samples']);}}>
            <SvgIcon icon='edit' size='2rem'/>
          </div>
        </div>
        <p>Sample Distribution: <b>{sampleDistribution}</b></p>
        <p>Samples Per Plot: <b>{samplesPerPlot}</b></p>
        <p>Total Samples: <b>{Number(samplesPerPlot) * Number(numPlots)}</b></p>
        <b > {!allowDrawnSamples && "Don't "} Allow users to draw their own samples</b>
      </div>
    );
  }

  function QuestionsCard () {
    const questions = useSubscription([sub_ids.questions.questions]);

    return (
      <div className='wizard-card'>
        <div className='review-card-header'>
          <p className="card-title">SURVEY QUESTIONS</p>
          <div 
            onClick={()=>{dispatch([event_ids.currentStep, 'questions']);}}>
            <SvgIcon icon='edit' size='2rem'/>
          </div>
        </div>
        <div className="review-card">
          <SurveyQuestions preview={true} surveyQuestions={questions} showHeader={false}/>
        </div>
      </div>
    );
  }

  function RulesCard () {
    const rules = useSubscription([sub_ids.rules.rules]);

    return (
      <div className='wizard-card'>
        <div className='review-card-header'>
          <p className="card-title">SURVEY RULES</p>
          <div onClick={()=>{dispatch([event_ids.currentStep, 'rules']);}}>
            <SvgIcon icon='edit' size='2rem'/>
          </div>
        </div>

        {rules.length > 0 &&
          rules.map((rule)=>
            <SurveyRule
              inDesignMode={false}
              rule={rule}/> )}
      </div>
    );
  }

  function ProjectActionsCard () {
    const projectName = useSubscription([sub_ids.overview.projectName]);
    const projectDescription = useSubscription([sub_ids.overview.projectDescription]);
    const availability = useSubscription([sub_ids.availability]);
    const createdDate = useSubscription([sub_ids.createdDate]);
    const publishedDate = useSubscription([sub_ids.publishedDate]);
    const closedDate = useSubscription([sub_ids.closedDate]);
    const doiPath = null;
    const designSettings = useSubscription([sub_ids.plots.designSettings]) || {};
    const qaqcMethod = designSettings.qaqcAssignment?.qaqcMethod || "none";
    const displayPublishedDate = publishedDate || (availability === "unpublished" ? "Draft" : "Unknown");
    const displayClosedDate = closedDate || (["archived", "closed"].includes(availability) ? "Unknown" : "Open");

    const publishProject = () => {
      const unpublished = availability === "unpublished";
      const message = unpublished
        ? "Do you want to publish this project? This action will clear plots collected by admins to allow collecting by users."
        : "Do you want to re-open this project? Members will be allowed to collect plots again.";

      if (window.confirm(message)) {
        fetch(`/publish-project?projectId=${projectId}&clearSaved=${unpublished}`, { method: "POST" })
          .then((response) => (response.ok ? response.json() : Promise.reject(response)))
          .then((data) => {
            dispatch([event_ids.projectDetails, data]);
          })
          .catch((error) => {
            console.log(error);
            window.alert("Error publishing project. See console for details.");
          });
      }
    };

    const closeProject = () => {
      if (window.confirm("Do you want to close this project?")) {
        fetch(`/close-project?projectId=${projectId}`, { method: "POST" })
          .then((response) => (response.ok ? response.json() : Promise.reject(response)))
          .then((data) => {
            dispatch([event_ids.projectDetails, data]);
          })
          .catch((error) => {
            console.log(error);
            window.alert("Error closing project. See console for details.");
          });
      }
    };

    const deleteProject = () => {
      if (window.confirm("Do you want to delete this project? This operation cannot be undone.")) {
        fetch(`/archive-project?projectId=${projectId}`, { method: "POST" })
          .then((response) => {
            if (response.ok) {
              window.alert(`Project ${projectId} has been deleted.`);
              window.location = `/review-institution?institutionId=${institutionId}`;
            } else {
              console.log(response);
              window.alert("Error deleting project. See console for details.");
            }
          });
      }
    };

    const copyProject = () => {
      if (window.confirm("Do you want to copy the entire project?")) {
        const usePlots = window.confirm("Use Existing Plots?");
        const useWidgets = window.confirm("Use Existing Widgets?");
        const useAnswers = window.confirm("Copy Answers?");
        const url = `/copy-project?projectId=${projectId}&widgets=${useWidgets}&plots=${usePlots}&answers=${useAnswers}`;

        fetch(url, { method: "POST" })
          .then((response) => (response.ok ? response.json() : Promise.reject(response)))
          .then((data) => window.location.assign(`/create-project?projectId=${data.projectId}&institutionId=${institutionId}`));
      }
    };

    const createDoi = () => {
      if (window.confirm("Do you want to create a DOI for this project?\nBy creating a DOI, collection data and plot/samples shape files will be uploaded to Zenodo.")) {
        fetch("/create-doi", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId: parseInt(projectId),
            description: projectDescription,
            institution: institutionId,
            projectName,
          }),
        }).then((response) => {
          if (response.ok) {
            window.alert("A Digital Object Identifier was created for this project.");
          } else {
            console.log(response);
            window.alert("Error creating a Digital Object Identifier.");
          }
        });
      }
    };

    const projectStates = {
      unpublished: {
        button: "Publish",
        update: publishProject,
        description: "Admins can review, edit, and test collecting the project. Publish the project in order for users to begin collection.",
      },
      published: {
        button: "Close",
        update: closeProject,
        description: "Users can begin collecting. Limited changes to the project details can be made. Close the project to prevent anymore updates.",
      },
      closed: {
        button: "Reopen",
        update: publishProject,
        description: "The project is closed to all changes. Reopen the project for additional collection.",
      }
    };

    const currentState = projectStates[availability] || projectStates.unpublished;

    const btnStyle = {
      width: '100%',
      padding: '0.4rem',
      fontSize: '0.8rem',
      marginBottom: '0.4rem'
    };

    const headerStyle = {
      margin: '1rem 0 0.5rem 0',
      fontSize: '0.9rem',
      textAlign: 'center'
    };

    return (
      <div className="wizard-card w-100">
        <div className="review-card-header">
          <p className="card-title">PROJECT ACTIONS</p>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ margin: '0.25rem 0' }}>
            Date Created: <b>{createdDate}</b>
          </p>
          <p style={{ margin: '0.25rem 0' }}>
            Date Published: <b>{displayPublishedDate}</b>
          </p>
          <p style={{ margin: '0.25rem 0' }}>
            Date Closed: <b>{displayClosedDate}</b>
          </p>
        </div>
        
        <div
          style={{
            marginBottom: '1.5rem',
            lineHeight: '1.3',
            fontSize: '0.8rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'break-word'
          }}
        >
          This project is <b>{availability === "unpublished" ? "in draft mode" : availability}</b>. 
          {" "}{currentState.description}
        </div>
        
        <div className="d-flex flex-column w-100">
          <h4 style={{ ...headerStyle, marginTop: '0' }}>
            Modify Project Details
          </h4>
          <button
            className="btn btn-outline-red"
            style={btnStyle}
            onClick={currentState.update}
          >
            {currentState.button} Project
          </button>
          <button
            className="btn btn-outline-red"
            style={btnStyle}
            onClick={deleteProject}
          >
            Delete Project
          </button>
          
          <h4 style={headerStyle}>External Links</h4>
          <button
            className="btn btn-outline-darkgreen"
            style={btnStyle}
            onClick={() => window.open(`/widget-layout-editor?institutionId=${institutionId}&projectId=${projectId}`)}
          >
            Configure Geo-Dash
          </button>
          <button
            className="btn btn-outline-darkgreen"
            style={btnStyle}
            onClick={() => window.open(`/collection?projectId=${projectId}&institutionId=${institutionId}`)}
          >
            Collect
          </button>
          <button
            className="btn btn-outline-darkgreen"
            style={btnStyle}
            onClick={() => window.open(`/project-dashboard?projectId=${projectId}&institutionId=${institutionId}`)}
          >
            Project Dashboard
          </button>
          <button
            className="btn btn-outline-darkgreen"
            style={btnStyle}
            onClick={() => window.open(`/project-qaqc-dashboard?projectId=${projectId}&institutionId=${institutionId}`)}
          >
            QAQC Dashboard
          </button>
          
          <h4 style={headerStyle}>Export Data</h4>
          <button
            className="btn btn-outline-darkgreen"
            style={btnStyle}
            onClick={() => window.open(`/dump-project-aggregate-data?projectId=${projectId}`, "_blank")}
          >
            Plot Data
          </button>
          {qaqcMethod !== "none" && (
            <button
              className="btn btn-outline-darkgreen"
              style={btnStyle}
              onClick={() => window.open(`/dump-project-aggregate-data?projectId=${projectId}&qaqcOnly=true`, "_blank")}
            >
              QA/QC Data
            </button>
          )}
          <button
            className="btn btn-outline-darkgreen"
            style={btnStyle}
            onClick={() => window.open(`/dump-project-raw-data?projectId=${projectId}`, "_blank")}
          >
            Sample Data
          </button>
          <button
            className="btn btn-outline-darkgreen"
            style={btnStyle}
            onClick={() => window.open(`/create-shape-files?projectId=${projectId}`, "_blank")}
          >
            Shape File
          </button>
          <button
            className="btn btn-outline-darkgreen"
            style={btnStyle}
            onClick={copyProject}
          >
            Copy Project
          </button>
          
          <h4 style={headerStyle}>Digital Object Identifier</h4>
          <button
            className="btn btn-outline-darkgreen"
            style={btnStyle}
            onClick={createDoi}
          >
            {doiPath === null ? "Create DOI" : "Update DOI"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-step-layout">
      <div
        className="wizard-preview-body"
        style={{
          flex: 4,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.8rem',
          paddingLeft: '20px',
          minWidth: 0,
          alignItems: 'start'}}>
        <OverviewCard/>
        <BoundaryCard/>
        <ImageryCard/>
        <PlotsCard/>
        <QuestionsCard/>
        <SamplesCard/>
        <RulesCard/>
      </div>
      {projectId ? (
      <div
        className="wizard-sidebar"
        style={{
          flex: 1,
          overflowY: 'auto',
          height: '100%',
          paddingBottom: '100px' }}>
        <ProjectActionsCard/>
      </div>
      ) : null}
    </div>
  );
}

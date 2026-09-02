import React, { useEffect, useState , useContext} from "react";
import { useSubscription, dispatch } from '@flexsurfer/reflex';
import { event_ids,  sub_ids } from "../state/projectWizard";
import { InfoTooltip } from "../components/PageComponents";

import SvgIcon from "../components/svg/SvgIcon";

export default function OverviewStep () {
  const GeneralInformationCard = () => {
    const projectTypeOptions = {regular: 'Regular Project', simplified: 'Simplified Project'};
    const projectType = useSubscription([sub_ids.overview.projectType]);
    const projectName = useSubscription([sub_ids.overview.projectName]);
    const projectDescription = useSubscription([sub_ids.overview.projectDescription]);
    const learningMaterial = useSubscription([sub_ids.overview.learningMaterial]);
    const designSettings = useSubscription([sub_ids.plots.designSettings]);

    const changeProjectType = (type) => {
      dispatch([event_ids.overview.projectType, type]);
      if(type === 'simplified') {
        const simplifiedDesignSettings = { ...designSettings,
          sampleGeometries: {
            points: true,
            lines: true,
            polygons: true
          }};
        dispatch([event_ids.plots.designSettings, simplifiedDesignSettings]);
        dispatch([event_ids.samples.allowDrawnSamples, true]);
        dispatch([event_ids.samples.sampleDistribution, 'center']);
        dispatch([event_ids.plots.numPlots, 1]);
        dispatch([event_ids.plots.plotDistribution, 'simplified']);
        dispatch([event_ids.plots.plotSize, 1000]);
      } else {
        dispatch([event_ids.plots.plotDistribution, 'random']);
      }
    }

    return (
      <div className="wizard-card" style={{ marginBottom: "15px" }}>
        <p className="card-title">General Information</p>
        <p className="text-label"
        >Project Type {' '}<span style={{color: "red"}}>*</span>
          <InfoTooltip
            title={"Project Type"}
            text={
              <>
                Simplified Projects have fewer steps and less complexity.
                They are most useful for collecting training data for machine learning and model output feedback.
                <a href="https://collect-earth-online-doc.readthedocs.io/en/latest/project/simplifiedproject.html" target="_blank"> Learn more</a>
              </>
            } />
        </p>
        <div style={{width: '100%'}}>
          <div style={{display: "inline-flex", gap:"12px"}}>
            {Object.entries(projectTypeOptions).map(([type, label]) => {
              return (
                <div
                  className="labeled-input"
                  key={type}
                  onClick={()=> {
                    changeProjectType(type);
                  }}>
                  <span>{ projectType === type
                    ? <SvgIcon icon="radioChecked" size="1.2rem" />
                    : <SvgIcon icon="radio" size="1.2rem"/>}</span>
                  <span
                    className="text-label"
                    style={projectType == type ? {fontWeight: "bold"} : {}}
                  >{ label }</span>
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
            >Learning Material (Optional)
              <InfoTooltip
                title={"Learning Material"}
                text={
                  <>
                    Provide collectors with more detailed instructions. Material can include links to websites or files.
                    <a href="https://collect-earth-online-doc.readthedocs.io/en/latest/project/projectoverview.html#learning-material" target="_blank"> Learn more</a>
                  </>
                } />
            </label>
            <input
              type="textarea"
              className="text-input"
              value={learningMaterial}
              onChange={(e)=>dispatch([event_ids.overview.learningMaterial, e.target.value])}
              id="learning-material"
              placeholder="Enter your markdown."/>
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
      <div className="wizard-card" style={{ marginBottom: "15px"}}>
        <p className="card-title">Visibility<span style={{color:"red"}}>*</span>
          <InfoTooltip
            title={"Visibility"}
            text={
              <>
                Who can view your project, contribute to data collection, and whether admins from other institutions can use it as a template.
                <a href="https://collect-earth-online-doc.readthedocs.io/en/latest/project/projectoverview.html#visibility" target="_blank"> Learn more</a>
              </>
            } />
        </p>
        {Object.entries(visibilityOptions).map(([id, label])=>{
	  return (
            <div className="labeled-input"
                 key={id}
                 onClick={()=>dispatch([event_ids.overview.visibility, id])}>
              <span>{visibility == id
                     ? <SvgIcon icon="radioChecked" size="1.2rem" />    
                     : <SvgIcon icon="radio" size="1.2rem"/>}</span>
              <span className="text-label"
                    style={visibility == id ? {fontWeight: "bold"} : {}}
              >{ label  }</span>
            </div>);
        })}
      </div>
    );
  };
  
  const ProjectOptionsCard = () => {    
    const projectOptionsMap={showGEEScript: "Show GEE Script Link on Collection Page",
                             showPlotInformation: "Show Extra Plot Columns on Collection Page",
                             collectConfidence: "Collect Plot Confidence on Collection Page",
                             autoLaunchGeoDash: "Auto-launch Geo-Dash"};
    
    const projectOptions = {showGEEScript: useSubscription([sub_ids.overview.projectOptions.showGEEScript]),
                            showPlotInformation: useSubscription([sub_ids.overview.projectOptions.showPlotInformation]),
                            collectConfidence: useSubscription([sub_ids.overview.projectOptions.collectConfidence]),
                            autoLaunchGeoDash: useSubscription([sub_ids.overview.projectOptions.autoLaunchGeoDash])
                           };
    
    return(
      <div className="wizard-card">
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
	      <span className="text-label"
                    style={projectOptions[id] ? {fontWeight: "bold"} : {}}
              >{label}</span>
	    </div>
	  ) ;
	})}
      </div>);
  };

  return (
    <div className="project-wizard overview-step"
         style={{paddingLeft: "20%",
                 paddingRight: "20%"}}>
      <GeneralInformationCard /> 
      <VisibilityCard/> 
      <ProjectOptionsCard/>
    </div>
  );
}

//THIS IS A PROJECT-WIZARD STEP AND PROBABLY NEEDS TO BE IN A DISTINCT DIRECTORY FROM SURVEY STEPS

import React, { useEffect, useState , useContext} from "react";
import { useSubscription, dispatch } from '@flexsurfer/reflex';
import {  event_ids,  sub_ids } from "../state/projectWizard";

import SvgIcon from "../components/svg/SvgIcon";

export default function OverviewStep () {
  const GeneralInformationCard = () => {
    const projectTypeOptions = {regular: 'Regular Project', simplified: 'Simplified Project'};
    const projectType = useSubscription([sub_ids.overview.projectType]);
    const projectName = useSubscription([sub_ids.overview.projectName]);
    const projectDescription = useSubscription([sub_ids.overview.projectDescription]);
    const learningMaterial = useSubscription([sub_ids.overview.learningMaterial]);

    return (
      <div
        className="general-info-card projectWizardCard">
        <p className="card-title">General Information</p>
        <p className="text-label"
        >Project Type<span style={{color: "red"}}>*</span>
          <SvgIcon icon="info" size="1.2rem" /></p>
        <div style={{width: '100%'}}>
          <div style={{display: "inline-flex", gap:"12px"}}>
            {Object.entries(projectTypeOptions).map(([id, label]) => {
              return (
                <div
                  className="labeled-input"                       
                  key={id}
                  onClick={()=> {dispatch([event_ids.overview.projectType, id]);
                                }}>
                  <span>{ projectType == id
                          ? <SvgIcon icon="radioChecked" size="1.2rem" />    
                          : <SvgIcon icon="radio" size="1.2rem"/>}</span>
                  <span
                    className="text-label"
                    style={projectType == id ? {fontWeight: "bold"} : {}}
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
    const projectOptionsMap={gee: "Show GEE Script Link on Collection Page",
                             extraPlotColumns: "Show Extra Plot Columns on Collection Page",
                             plotConfidence: "Collect Plot Confidence on Collection Page",
                             autoGeo: "Auto-launch Geo-Dash"};
    
    const projectOptions = {gee: useSubscription([sub_ids.overview.projectOptions.gee]),
                            extraPlotColumns: useSubscription([sub_ids.overview.projectOptions.extraPlotColumns]),
                            plotConfidence: useSubscription([sub_ids.overview.projectOptions.plotConfidence]),
                            autoGeo: useSubscription([sub_ids.overview.projectOptions.autoGeo])
                           };
    
    return(
      <div className="project-options-card projectWizardCard">
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
    <div className="project-wizard overview-step">
      <GeneralInformationCard /> 
      <VisibilityCard/> 
      <ProjectOptionsCard/>
    </div>
  );
}

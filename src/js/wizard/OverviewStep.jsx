import React, { useEffect, useState , useContext} from "react";
import { useSubscription, dispatch } from '@flexsurfer/reflex';
import { event_ids,  sub_ids, usePublicLicenseLocked } from "../state/projectWizard";
import { InfoTooltip } from "../components/PageComponents";

import SvgIcon from "../components/svg/SvgIcon";

const TEMPLATE_OPTIONS = {
  useTemplatePlots: 'Use template plot design',
  useTemplateWidgets: 'Use template widgets',
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

const DataLicenseCard = () => {
  const dataLicenseOptions = {
    private: ["Private – Restricted Use",
      "All contributions that are provided are only available to the Institution and its authorized users. Outside contributions must agree to restricted-use rights."],
    public: ["Public – Open Use",
      "Anything shared in the project is publicly available for anyone to access and use. Once this project is published, the license cannot be made private."]};
  const license = useSubscription([sub_ids.overview.projectOptions.license]);
  const publicLocked = usePublicLicenseLocked();
  return (
    <div className="wizard-card" style={{ marginBottom: "15px"}}>
      <p className="card-title">Data License Type<span style={{color:"red"}}>*</span>
        <InfoTooltip
          title={"Data License Type"}
          text={
            <>
              Sets whether contributions to this project stay restricted to your Institution or are
              released publicly under an open license such as CC BY 4.0.
              <a href="/data-license" target="_blank" rel="noopener noreferrer"> Read the agreement</a>
            </>
          } />
      </p>
      <p className="text-label" style={{ marginBottom: "10px" }}>
        Choose if your project will have restricted data or open-use.{" "}
        <a href="/data-license" target="_blank" rel="noopener noreferrer"
          style={{ textDecoration: "underline" }}>
          See the full agreement here.
        </a>
      </p>
      {publicLocked && (
        <p className="text-secondary small" style={{ fontWeight: "500" }}>
          This project was published with a public license, so it can no longer be made private.
        </p>
      )}
      {Object.entries(dataLicenseOptions).map(([id, [label, description]]) => {
        const disabled = publicLocked && id === "private";
        return (
          <div key={id}
            inert={disabled ? '' : undefined}
            style={{ marginBottom: "10px", ...(disabled ? { opacity: 0.6 } : {}) }}>
            <div className="labeled-input"
              onClick={() => dispatch([event_ids.overview.projectOptions.license, id])}>
              <span>{license === id
                ? <SvgIcon icon="radioChecked" size="1.2rem" />
                : <SvgIcon icon="radio" size="1.2rem"/>}</span>
              <span className="text-label" style={{ fontWeight: "bold" }}>{label}</span>
            </div>
            <p className="text-label-sm" style={{ margin: "0 0 0 1.8rem", color: "#555" }}>
              {description}
            </p>
          </div>
        );
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
            defaultValue={projectName}
            onBlur={(e) => dispatch([event_ids.overview.projectName, e.target.value])}
            placeholder="Enter Text"></input>
        </div>
        <div>
          <label className="text-label"
          >Project Description<span style={{color: "red"}}>*</span></label>
          <input type="text"
            className="text-input"
            id="project-description"
            onBlur={(e) => dispatch([event_ids.overview.projectDescription, e.target.value])}
            defaultValue={projectDescription}
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
          <textarea
            className="form-control form-control-sm"
            id="learning-material"
            maxLength="2000"
            rows={6}
            style={{ height: 'auto', minHeight: '120px', resize: 'vertical' }}
            onBlur={(e)=>dispatch([event_ids.overview.learningMaterial, e.target.value])}
            defaultValue={learningMaterial}
          />
        </div>
      </div>
    </div>);
};

const TemplateOptionsCard = () => {
  const templateProjectId = useSubscription([sub_ids.templateProjectId]) || -1;
  const templateProjectName = useSubscription([sub_ids.templateProjectName]) || '';
  const projectId = useSubscription([sub_ids.projectId]) || -1;
  const options = {
    useTemplatePlots: useSubscription([sub_ids.overview.useTemplatePlots]),
    useTemplateWidgets: useSubscription([sub_ids.overview.useTemplateWidgets]),
  };
  const usingTemplate = templateProjectId > 0 && projectId === -1;
  if (!usingTemplate) return null;

  return (
    <div className="wizard-card" style={{ marginBottom: '15px' }}>
      <p className="card-title">
        Template: {templateProjectName || `Project ${templateProjectId}`} (#{templateProjectId})
      </p>
      {Object.entries(TEMPLATE_OPTIONS).map(([id, label]) => (
        <div
          className="labeled-input"
          key={id}
          onClick={() => dispatch([event_ids.overview[id], !options[id]])}>
          <span className="checkbox">
            <SvgIcon icon={options[id] ? 'checkboxChecked' : 'checkboxUnchecked'} size="1.2rem" />
          </span>
          <span className="text-label" style={options[id] ? { fontWeight: 'bold' } : {}}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function OverviewStep () {
  const templateProjectId = useSubscription([sub_ids.templateProjectId]) || -1;
  return (
    <div className="project-wizard overview-step"
      style={{paddingLeft: "20%",
        paddingRight: "20%"}}>
      <GeneralInformationCard />
      {templateProjectId > 0 && (
        <TemplateOptionsCard/>
      )}
      <VisibilityCard/> 
      <DataLicenseCard/>
      <ProjectOptionsCard/>
    </div>
  );
};

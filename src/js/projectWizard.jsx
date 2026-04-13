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
  const { createProject,
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
    
    return (<div>
              {Object.entries(newProjectOptions).map(([id, [title, description]]) => {
                return (
                  <div
                    key={id}
                    onClick={()=> {
                      setSelected(id);
                    }}
                  >
                    <span>{ selected == id
                            ? '⬤' : '◯' }</span>
                    <p>{ title  }</p>
                    <span>{ description }</span>
                  </div>);
              })}
            </div>);
  };

  const handleNewProject = () => {
    projectTypeRef.current && setProjectWizardState((s)=>({...s, createProject: projectTypeRef.current,
                                                           modal: null
                                                          }));
  };

  const NewProjectModalOpts = {
    title: 'Project Setup',
    closeText: '',
    confirmText: 'Get Started',
    onConfirm: handleNewProject,
    id: 'newProject',
    children: (<NewProjectModal/>)
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
v              title={modal.title}
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
              style={{background:"white"}}>
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
		     onClick={() => {setSelected((s)=>({... s, [id]: !selected[id]}));}}
		   >
		     {selected[id] ? "▣" :"▢"}
		   </span>
		   <p>{label}</p>
		 </div>
	       ) ;
	     })}

           </div>);
  };

  useEffect(() => {
    createProject === null &&
      setProjectWizardState((s) => ({ ... s, modal: NewProjectModalOpts}));
  }, []);

  return (<>
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
              <div className="project-wizard"
                   style={{background: "#A0CAC6"}}>
                <GeneralInformationCard/>
                <VisibilityCard/>
                <ProjectOptionsCard/>
              </div>
            </NavigationBar>
          </>);
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

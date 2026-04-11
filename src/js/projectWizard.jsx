import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { useAtom, useSetAtom, useAtomValue } from 'jotai';

import { BreadCrumbs } from "./components/PageComponents";
import  Modal  from "./components/Modal";

import { stateAtom } from "./utils/constants";
import { projectWizardAtom } from "./state/projectWizard";

import "../css/project-wizard.css";


const ProjectWizard = () => {
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

  const NewProjectModal = () => {
    const newProjectOptions = {
      newProject: ['Create a new project',
                   'Generate a new project from scratch by customizing all steps.'],
      templateProject: ['Select from an existing template',
                        'Select a template and prefill all the steps. You can edit and customize it.'],
      importProject: ['Import Collect Earth Project',
                      'Need Description']};
    

    const [selected, setSelected] = useState('');
    useEffect(()=>{
      projectTypeRef.current = selected;
    }, [selected]);
    
    return (<div>
              {Object.entries(newProjectOptions).map(([id, [title, description]]) => {
                return (
                  <div
                    key={id}                    
                    onClick={()=> {
                      setSelected(id);}}
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
    children: (<NewProjectModal />)
  };
  
  const ProjectWizardModal = () => {
    // this is the container for any modal related to this page. based on state, this actually renders modals as they are explicitly defined above., provided through "children" value of modal map"    
    return (<Modal
              title={modal.title}
              closeText={modal.closeText}
              confirmText={modal.confirmText}
              onConfirm={modal.onConfirm && modal.onConfirm}
              onClose={()=>{
                modal.onClose ? modal.onClose()
                  : setProjectWizardState((s) => ({... s, modal: null}));
              }}>
              {modal.children}
            </Modal>);
  };

  useEffect(() => {
    createProject === null &&
      setProjectWizardState((s) => ({ ... s, modal: NewProjectModalOpts}));
  }, []);

  return (<>
            {modal && <ProjectWizardModal/>}
          </>);
};


export function pageInit(params, session) {
  //This is the triangulum-friendly wrapper of the page and the actual export. we locally wrap this around the actual effective component
  ReactDOM.render(
    <ProjectWizard />,
    document.getElementById("app")
  );
}

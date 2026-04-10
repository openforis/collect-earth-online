import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { useAtom } from 'jotai';

import { BreadCrumbs } from "./components/PageComponents";
import  Modal  from "./components/Modal";

import { stateAtom } from "./utils/constants";
import { projectWizardAtom } from "./state/projectWizard";

import "../css/project-wizard.css";



const NewProjectModal = ({}) => {
  return (<></>);

};

const ProjectWizard = ({}) => {
  const [ state, setState ] = useAtom(projectWizardAtom);

  useEffect(() => {
  }, []);
  
  return (<>
            {state.modal &&
             <Modal
               title={state.modal.title}
               onClose={()=>{
                 state.modal.onClose();
                 setState((s) => ({... s, modal: null}));
               }}>
               {state.modal.children}
             </Modal>}            
          </>);
};

export function pageInit(params, session) {
  ReactDOM.render(
    <ProjectWizard />,
    document.getElementById("app")
  );
}

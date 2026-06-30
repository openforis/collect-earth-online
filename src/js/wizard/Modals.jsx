import { useSubscription, dispatch } from '@flexsurfer/reflex';
import React, { useEffect, useState } from "react";

import Modal from "../components/Modal";
import SvgIcon from "../components/svg/SvgIcon";
import { event_ids,  sub_ids } from "../state/projectWizard";

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
  );
};


function ExitModal () {
  return (
    <p > Are you sure you want to exit “Create New Scenario”? Saved steps will be kept in draft form, any steps you haven’t saved will be lost.</p>
  );
}


export default function ProjectWizardModal () {
  // this is the container for any modal related to this page. based on state, this actually renders modals as they are explicitly defined above., provided through "children" value of modal map"
  const projectSource = useSubscription([sub_ids.projectSource]);
  const modal = useSubscription([sub_ids.modal]);
 
  function children () {
    switch (modal.id) {
    case 'newProject'  : return (<NewProjectModal/>);
    case 'review'      : return (<SubmitProjectModal/>);
    case 'success'     : return (<SuccessModal/>);
    case 'error'       : return (<ErrorModal/>);
    case 'exit'        : return (<ExitModal/>);
    default : break;
    }};

  function confirmDisabled () {

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

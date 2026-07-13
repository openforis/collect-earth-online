import { useSubscription, dispatch } from '@flexsurfer/reflex';

import { event_ids,  sub_ids } from "../state/projectWizard";


const projectSteps = [
  {id: 'overview', label: 'Project Overview'},
  {id: 'imagery', label: 'Imagery Selection'},
  {id: 'boundary', label: 'Project Boundary'},
  {id: 'plots', label: 'Plot Generation'},
  {id: 'samples', label: 'Sample Design'},
  {id: 'questions', label: 'Survey Questions'},
  {id: 'rules', label: 'Survey Rules'},
  {id: 'review', label: 'Review & Publish'}
];

export default function NavButtons () {
  const currentStep = useSubscription([sub_ids.currentStep]);
  const stepIdx = projectSteps.map((e)=>e.id).indexOf(currentStep);
  function continueHandler () {dispatch([event_ids.continueHandler, currentStep]);}
  function saveDraftHandler () {dispatch([event_ids.saveDraft]);};

  function navBackHandler () { dispatch([event_ids.currentStep, projectSteps[stepIdx - 1].id]);}

  return (<div className="nav-buttons">
            <button
              className="btn btn-secondary btn-sm"
              onClick={()=>dispatch([event_ids.modal, 'exit'])}

            >Exit</button>
            {stepIdx > 0 &&
             (<button
              className={'btn btn-sm'}
              style={{backgroundColor: "#2d6f74",
                      color: "#fff"}}
              onClick={()=>navBackHandler()}
            >Back</button>)}
            <button
              className={'btn btn-sm'}
              style={{backgroundColor: "#2d6f74",
                      color: "#fff"}}
              onClick={()=>saveDraftHandler()}
            >Save Draft</button>
            <button
              className={'btn btn-sm'}
              onClick={()=>continueHandler()}
              style={{backgroundColor: "#2d6f74",
                      color: "#fff"}}
            >Save & {currentStep === 'review' ? 'Publish' : 'Continue'}</button>
          </div>);
};

export function ProjectWizardNavigator () {
  const currentStep = useSubscription([sub_ids.currentStep]);
  
  return (
    <div
      className="project-wizard-navigator">
      {projectSteps.map(({id, label}, index)=>{
        return(
          <>                         
            <div
              key={id}
              style={{fontWeight: currentStep === id ? 'bold' : 'normal',
                display: 'inline-flex',
                cursor: 'pointer'}}
              onClick={() => dispatch([event_ids.currentStep, id])}
            >
              <span className={currentStep === id && "selected"}
              >{index + 1}</span>
              {label}
            </div>
            {index + 1 < projectSteps.length && "- -- -"}
          </>);
      })}              
    </div>);
};

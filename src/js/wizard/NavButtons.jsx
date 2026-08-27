import { useSubscription, dispatch } from '@flexsurfer/reflex';

import SvgIcon from '../components/svg/SvgIcon';

import { event_ids,  sub_ids } from "../state/projectWizard";


const projectSteps = [
  {id: 'overview', label: 'Project Overview'},
  {id: 'imagery', label: 'Imagery Selection'},
  {id: 'boundary', label: 'Project Boundary'},
  {id: 'plots', label: 'Plot Generation'},
  {id: 'samples', label: 'Sample Design'},
  {id: 'questions', label: 'Survey Questions'},
  {id: 'rules', label: 'Survey Rules'},
  {id: 'review', label: 'Review Project'}
];

export default function NavButtons () {
  const currentStep = useSubscription([sub_ids.currentStep]);
  const projectType = useSubscription([sub_ids.overview.projectType]);
  
  const activeSteps = projectType === 'simplified' 
    ? projectSteps.filter(s => !['plots', 'samples', 'rules'].includes(s.id))
    : projectSteps;

  const stepIdx = activeSteps.map((e)=>e.id).indexOf(currentStep);  
  function continueHandler () {dispatch([event_ids.continueHandler, currentStep]);}
  function saveDraftHandler () {dispatch([event_ids.saveDraft]);};

  function navBackHandler () { dispatch([event_ids.currentStep, activeSteps[stepIdx - 1].id]);}

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
            >Save & {currentStep === 'review' ? 'Create' : 'Continue'}</button>
          </div>);
};

export function ProjectWizardNavigator () {
  const currentStep = useSubscription([sub_ids.currentStep]);
  const invalidSteps = useSubscription([sub_ids.invalidSteps]);
  const projectType = useSubscription([sub_ids.overview.projectType]);

  const activeSteps = projectType === 'simplified' 
    ? projectSteps.filter(s => !['plots', 'samples', 'rules'].includes(s.id))
    : projectSteps;

  function navWidth () {
    if (screen.width > 1426) {
      return "40px";
    } else if (screen.width > 950) {
      return "20px";
    } else {
      return "10px";
    }   
  }

  return (
    <div
      className="project-wizard-navigator">
      {activeSteps.map(({id, label}, index)=>{
        return(
          <>
            <div
              key={id}
              style={{fontWeight: currentStep === id ? 'bold' : 'normal',
                display: 'inline-flex',
                cursor: 'pointer'}}
              onClick={() => dispatch([event_ids.currentStep, id])}
            >
              {((activeSteps.map(({id})=>id).indexOf(currentStep) > index)
                && !invalidSteps.includes(id)) ?                
                (<SvgIcon icon='checkFilled' size='1.2rem' style={{marginTop: '.2rem'}}/>) :
                (<span className={currentStep === id && "selected"}
                >{index + 1}</span>)}

              <label style={{lineHeight: 1.1}}>{label}</label>
            </div>
            {index + 1 < activeSteps.length && (
              <div
                className="nav-separator"
                style={{
                  width: navWidth(),
                  height: '2px',
                  backgroundColor: '#1F7067',
                  alignSelf: 'center',
                  margin: '0 12px',
                  display: 'inline-block',
                  verticalAlign: 'middle'
                }}
              />
            )}
          </>);
      })}
    </div>
  );
};

import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import { useSubscription, dispatch } from '@flexsurfer/reflex';

import { BreadCrumbs, NavigationBar } from "./components/PageComponents";
import  Modal  from "./components/Modal";
import SvgIcon from "./components/svg/SvgIcon";

import { stateAtom } from "./utils/constants";
import {  event_ids, sub_ids } from "./state/projectWizard";

import "../css/project-wizard.css";


const projectSteps =
      [{id: 'overview',
        label: 'Project Overview'},
       {id: 'imagery',
        label: 'Imagery Selection'},
       {id: 'boundary',
        label: 'Project Boundary'},
       {id: 'plots',
        label: 'Plot Generation'},
       {id: 'samples',
        label: 'Sample Design'},
       {id: 'questions',
        label: 'Survey Questions'},
       {id: 'rules',
        label: 'Survey Rules'},
       {id: 'review',
        label: 'Review & Publish'}];


const NavButtons = () => {
  const currentStep = useSubscription([sub_ids.currentStep]);
  
  const  continueHandler = () => {
    const currentIdx = projectSteps.findIndex(({id})=>{return (id == currentStep);});
    
    currentIdx + 1 < projectSteps.length
      ? dispatch([event_ids.currentStep, projectSteps[currentIdx + 1].id])
      : dispatch([event_ids.modal, {title: "Confirm & Submit"}]);
  };

  return (<div className="nav-buttons">
            <button
              className="btn btn-secondary btn-sm"
            >Exit</button>
            <button
              className={'btn btn-sm'}
              style={{backgroundColor: "#2d6f74",
                      color: "#fff"}}
            >Save Draft</button>
            <button
              className={'btn btn-sm'}
              onClick={()=>{continueHandler();}}
              style={{backgroundColor: "#2d6f74",
                      color: "#fff"}}
            >Save & Continue</button>
          </div>);
};

const ProjectWizardNavigator = () => {
  const currentStep = useSubscription([sub_ids.currentStep]);
  
  return (
    <div
      className="project-wizard-navigator">
      {projectSteps.map(({id, label}, index)=>{
        return(
          <>                         
            <div
              key={id}
              style={{fontWeight: currentStep === id ? 'bold' : 'normal'}}
              onClick={
                () => dispatch([event_ids.currentStep, id])
              }
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

const NewProjectModal = () => {
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
                         className="radio-button-unchecked"/> }    {/*these four spaces left intentionally*/}
              { title } </p>
            <label
              className="radio-button-description"
            >{ description }</label>
          </div>);
      })}
    </div>);
};
  
const ProjectWizardModal = () => {
  // this is the container for any modal related to this page. based on state, this actually renders modals as they are explicitly defined above., provided through "children" value of modal map"
  const projectSource = useSubscription([sub_ids.projectSource]);
  const modal = useSubscription([sub_ids.modal]);
  
  const children = () => {
    switch (modal.id) {
    case 'newProject' : return (<NewProjectModal/>);
    default : break;
    }};
    
  const confirmDisabled = () => {
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

const OverviewStep = () => {
  
  const GeneralInformationCard = () => {
    const projectTypeOptions = {regular: 'Regular Project', simplified: 'Simplified Project'};
    const projectType = useSubscription([sub_ids.overview.projectType]);
    const projectName = useSubscription([sub_ids.overview.projectName]);
    const projectDescription = useSubscription([sub_ids.overview.projectDescription]);
    const learningMaterial = useSubscription([sub_ids.overview.learningMaterial]);

    return (<div
            className="general-info-card card">
              <p className="card-title">General Information</p>
              <p className="text-label"
                >Project Type<span style={{color: "red"}}>*</span>
                <SvgIcon icon="info" size="1.2rem" /></p>
              <div>
              <div style={{display: "inline-flex", gap:"12px"}}>
                {Object.entries(projectTypeOptions).map(([id, label]) => {
                  return (<div
                            className="labeled-input"                       
                            key={id}
                            onClick={()=> {dispatch([event_ids.overview.projectType, id]);
                                          }}>
                            <span>{ projectType == id
                                    ? <SvgIcon icon="radioChecked" size="1.2rem" />    
                                    : <SvgIcon icon="radio" size="1.2rem"/>}</span>
                            <label                              
                              className="text-label"
                              style={projectType == id ? {fontWeight: "bold"} : {}}
                            >{ label }</label>
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
                         onChange={(e)=>{
                           dispatch([event_ids.overview.learningMaterial, e.target.value]);
                         }}
                         id="learning-material"
                         placeholder="Enter URL"/>
                </div>
              </div>
            </div>);p
  };

  const VisibilityCard = () => {    
    const visibilityOptions={public: "Public: All Users",
                             users: "Users: Logged In Users",
                             institution: "Institution: Group Members",
                             private: "Private: Group Admins"};
    const visibility = useSubscription([sub_ids.overview.visibility]);
    return (
      <div className="visibility-card card">
        <p className="card-title">Visibility<span style={{color:"red"}}>*</span>
        <SvgIcon icon="info" size="1.2rem" /></p>
        {Object.entries(visibilityOptions).map(([id, label])=>{
	  return (<div className="labeled-input"
                       key={id}
                       onClick={()=>{
                         dispatch([event_ids.overview.visibility, id]);                         
                       }}>
                     <span>{visibility == id
                             ? <SvgIcon icon="radioChecked" size="1.2rem" />    
                             : <SvgIcon icon="radio" size="1.2rem"/>}</span>
                    <label className="text-label"
                           style={visibility == id ? {fontWeight: "bold"} : {}}
                    >{ label  }</label>
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
    
    return(<div className="project-options-card card">
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
		 <label className="text-label"
                        style={projectOptions[id] ? {fontWeight: "bold"} : {}}
                 >{label}</label>
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
};

const ImageryStep  = () => {
  return (
    <div>
    </div>
  );
};

const BoundaryStep  = () => {
  return (
    <div>
    </div>
  );
};

const PlotStep  = () => {
  return (
    <div>
    </div>
  );
};

const SamplesStep  = () => {
  return (
    <div>
    </div>
  );
};

const QuestionsStep  = () => {
  return (
    <div>
    </div>
  );
};

const RulesStep  = () => {

  const rules = useSubscription([sub_ids.rules.rules]);
  const questions = useSubscription([sub_ids.questions.questions]);
  const ruleTypeOptions = {
    'text-match': {
      label: 'Text Match',
      validOption: () => {return false;},
      invalidOptionText: "This rule requires a question of type input-text.",
      display: ([nil, {questions, pattern}])=>{
        return (
          <div>The answer to question
            <b> "{questions[0]}"</b> should match the pattern
            <b> {pattern}</b>.
        </div>);}},
    'numeric-range': {
      label: 'Numeric Range',
      validOption: () => {return false;},
      invalidOptionText: "This rule requires a question of type input-number.",
      display: ([nil, {questions, min, max}])=>{
        return (
          <div>The answer to question 
            <b> "{questions[0]}"</b> should be between
            <b> {min} </b>and<b> {max}</b>.
          </div>);}},
    'sum-of-answers': {
      label: 'Sum of Answers',
      validOption: () => {return false;},
      invalidOptionText: "There must be at least 2 number questions for this rule type.",
      display: ([nil, {questions, sum}])=>{
        return (
          <div>The answers to questions 
            {Object.entries(questions).map(([idx, question]) => {              
              return (<span><b> "{question}"</b>{(questions.length > 2 ) && (idx < (questions.length - 1)) && ","} {(idx == (questions.length - 2) ) && " and " } </span>);
            })}
             should sum up to <b>{sum}</b>.
          </div>);}},
    'matching-sums': {
      label: 'Matching Sums',
      validOption: () => {return false;},
      invalidOptionText: "There must be at least 2 number questions for this rule type.",
      display: ([nil, {questions}])=>{
        return (
          <div>The sum of the answers to questions
            {Object.entries(questions[0]).map(([idx, question]) => {              
              return (<span><b> "{question}"</b>{(questions[0].length > 2) && (idx < (questions[0].length - 1)) && ","} {(idx == (questions[0].length - 2) ) && " and " } </span>);
            })}
             should be equal to the sum of the answers to questions
            {Object.entries(questions[1]).map(([idx, question]) => {              
              return (<span><b> "{question}"</b>{(questions[1].length > 2) && (idx < (questions[1].length - 1)) && ","} {(idx == (questions[1].length - 2) ) && " and " } </span>);
            })}
          </div>);}},
    'incompatible-answers': {
      label: 'Incompatible Answers',
      validOption: () => {return false;},
      invalidOptionText: "There must be at least 3 questions where type is not input for this rule.",
      display: ([nil, {questions}])=>{
        return (
          <div>The answer
            <b> "{questions[0][1]}"</b> from question
            <b> "{questions[0][0]}"</b> is incompatible with the answer
            <b> "{questions[1][1]}"</b> from question
            <b> "{questions[1][0]}"</b>.
          </div>);}},
    'multiple-incompatible-answers': {
      label: 'Multiple Incompatible Answers',
      validOption: () => {return false;},
      invalidOptionText: "this is not a valid option",      
      display: ([idx, {questions}])=>{
        return (
          <div className='card-text' >
            {Object.entries(questions.slice(1)).map(( [idx, [question, answer]])=> {
              return (<p className="card-text">If <b>"{answer}"</b> was answered for question <b>"{question}"</b>
                        { (questions.length - 2 == idx) ?  "," : ', and '}                        
                      </p>);
            })}
            <p>Then the answer <b>"{questions[0][1]}"</b> for the question <b>"{questions[0][0]}"</b> is incompatible.</p>
          </div>);
    }}};
  
  const RuleCard = (rule) => {
    const [idx, {ruleType, question, label, pattern, ruleId}] = rule;
    
    return (<div className="rule-card">
              <div style={{display: 'inline-flex',
                           gap: '16px'}}>
                <div
                  className="delete-button"                  
                  onClick={()=> dispatch([event_ids.rules.delete, idx])}>
                  <SvgIcon icon='trash' size='1.2rem'/>
                </div>
                <div style={{display: "flex", flexDirection: "column", gap: ".5rem"}}> 
                  <span style={{fontWeight: 'bold'}}
                  >{Number(idx) + 1}. {ruleTypeOptions[ruleType].label}</span>
                  <span>Rule Label: <span style={{fontWeight: 'bold'}}>{label}</span></span>
                </div>
              </div>
              {ruleTypeOptions[ruleType].display( rule )}
            </div>);
  };

  const NewRuleCard = () => {
    const newRuleType = useSubscription([sub_ids.rules.newRule.type]);
    const newRuleLabel = useSubscription([sub_ids.rules.newRule.label]);
    const newRuleQuestion = useSubscription([sub_ids.rules.newRule.surveyQuestion]);
    const newRulePattern = useSubscription([sub_ids.rules.newRule.pattern]);
    const newRuleMin = useSubscription([sub_ids.rules.newRule.min]);
    const newRuleMax = useSubscription([sub_ids.rules.newRule.max]);
    const newRuleSum = useSubscription([sub_ids.rules.newRule.sum]);
    const newRuleQuestions = useSubscription([sub_ids.rules.newRule.questions]);

    const newRuleInput = () => {
      switch(newRuleType) {
      case 'text-match' // input string: regex 
        : return (<div style={{display: 'inline-flex', flexDirection: 'row', width: "100%"}}>
                    <div className='new-rule-input'>
                      <label> Survey Question </label>
                      <select
                        className='select-bar'
                        onChange={(e)=>dispatch([event_ids.rules.newRule.surveyQuestion, e.target.value])}>
                        <option key='default'
                                selected disabled hidden
                        >Select</option>
                      </select>
                    </div>
                    <div className='new-rule-input'>
                      <label> Enter Regular Expression </label>
                      <input
                        className='rule-input'
                        placeholder='Enter Text'
                        value= {newRulePattern}
                        onChange={(e)=>dispatch([event_ids.rules.newRule.pattern, e.target.value])}></input>
                    </div>
                  </div>);
      case 'numeric-range' // input numbers: min, max 
        : return (<div style={{display: 'inline-flex', flexDirection: 'row', width: "100%"}}>
                    <div className='new-rule-input'>
                      <label>Survey Question </label>
                      <select
                        className='select-bar'
                        onChange={(e)=>dispatch([event_ids.rules.newRule.surveyQuestion, e.target.value])}>
                        <option key='default'
                                selected disabled hidden
                        >Select</option>
                      </select>
                    </div>
                    <div className='new-rule-input'>
                      <label>Min </label>
                      <input
                        type='number'
                        className='rule-input'
                        value= {newRuleMin}
                        onChange={(e)=>dispatch([event_ids.rules.newRule.min, e.target.value])} ></input>
                    </div>
                    <div className='new-rule-input'>
                      <label>Max </label>
                      <input
                        type='number'
                        className='rule-input'
                        value= {newRuleMax}
                        onChange={(e)=> dispatch([event_ids.rules.newRule.max, e.target.value])} ></input>
                    </div>
                  </div>);
      case 'sum-of-answers' // select 2+ questions, input number: sum 
        : return (<div style={{display: 'inline-flex', flexDirection: 'column', width: "100%"}}>
                    <div className='new-rule-input' >
                      <label>Survey Question </label>
                      <select
                        className='select-bar'
                        onChange={(e)=>{dispatch([event_ids.rules.newRule.surveyQuestion, e.target.value]);}}>
                        <option key='default'
                                selected disabled hidden
                        > Select </option>
                      </select>
                    </div>
                    <div className='new-rule-input'>
                      <label> Survey Question </label>
                      <div style={{display: 'inline-flex',
                                   width: '100%'}}>
                        <select
                          className='select-bar'
                          style={{width: '100%'}}
                          onChange={(e)=>dispatch([event_ids.rules.newRule.questions, e.target.value])}>
                          <option key='default'
                                  selected disabled hidden
                          > Select </option>
                        </select>
                        <button className='new-rule-button'
                                style={{alignSelf: 'center', marginTop:'1.7rem'}}
                                onClick={()=>dispatch([event_ids.rules.questions])}
                        ><SvgIcon icon='plus' size='1.2rem'/></button></div>
                    </div>
                    <div className='new-rule-input' >
                      <label> Sum </label>
                      <input
                        type='number'
                        className='rule-input'
                        value={newRuleSum}
                        onChange={(e)=>dispatch([event_ids.rules.newRule.sum])}>
                      </input>                      
                    </div>
                  </div>);
      case 'matching-sums' // select two sets of questions 
        : return (<div style={{display: 'inline-flex', flexDirection: 'row', width: "100%"}}>
                    <div className='new-rule-input'>
                      <label> Select First Question Set </label>
                      <select
                        className='select-bar'
                        onChange={(e)=>dispatch([event_ids.rules.newRule.questions, e.target.value])}>
                        <option key='default'
                                selected disabled hidden
                        > Select </option>
                      </select>
                    </div>
                    <div className='new-rule-input'>
                      <label> Select Second Question Set </label>
                      <select
                        className='select-bar'
                        onChange={(e)=>dispatch([event_ids.rules.newRule.questions, e.target.value])}>
                        <option key='default'
                                selected disabled hidden
                        > Select </option>
                      </select>
                    </div>
                  </div>);
      case 'incompatible-answers' // select question 1, answer 1, question 2, answer 2
        : return (<div style={{display: 'inline-flex', flexDirection: 'row', width: "100%"}}>
                    <div style={{width:"50%"}}>
                      <div className='new-rule-input' style={{width: "100%"}}>
                        <label> Question 1 </label>
                        <select
                          className='select-bar'
                          onChange={(e)=>dispatch([event_ids.rules.newRule.questions, e.target.value])}>
                          <option key='default'
                                  selected disabled hidden
                          > Select Question 1 </option>
                        </select>
                      </div>
                      <div className='new-rule-input' style={{width: "100%"}}>
                        <label> Question 2 </label>
                        <select
                          className='select-bar'
                          onChange={(e)=>dispatch([event_ids.rules.newRule.questions, e.target.value])}>
                          <option key='default'
                                  selected disabled hidden
                          > Select Question 2 </option>
                        </select>
                      </div>                      
                    </div>
                    <div style={{width:"50%"}}>                      
                      <div className='new-rule-input' style={{width: "100%"}}>
                        <label> Answer 1 </label>
                        <select
                          className='select-bar'
                          onChange={(e)=>{dispatch([event_ids.rules.newRule.answers, e.target.value]);}}>
                          <option key='default'
                                  selected disabled hidden
                          > Select Answer 1 </option>
                        </select>
                      </div>
                      <div className='new-rule-input' style={{width: "100%"}}>
                        <label> Answer 2 </label>
                        <select
                          className='select-bar'
                          onChange={(e)=>{dispatch([event_ids.rules.newRule.question, e.target.value]);}}>
                          <option key='default'
                                  selected disabled hidden
                          > Select Answer 2 </option>
                        </select>
                      </div>
                    </div>
                  </div>);
      case 'multiple-incompatible-answers' // 
        : return (<div style={{display: 'inline-flex', flexDirection: 'column', width: "100%"}}>
                    <div style={{display: 'inline-flex',
                                 flexDirection: 'column'}}>
                      <div style={{display: 'inline-flex', flexDirection: 'row'}}>
                        <div className='new-rule-input'>
                          <label> Question </label>
                          <select
                            className='select-bar'
                            onChange={(e)=>{dispatch([event_ids.rules.newRule.questions, e.target.value]);}}>
                            <option key='default'
                                    selected disabled hidden
                            > Select Question </option>
                          </select>
                        </div>
                        <div className='new-rule-input'>
                          <label> Answer </label>
                          <select
                            className='select-bar'
                            onChange={(e)=>{dispatch([event_ids.rules.newRule.answers, e.target.value]);}}>
                            <option key='default'
                                    selected disabled hidden
                            > Select Answer </option>
                          </select>
                        </div>
                        <button className='new-rule-button'
                                style={{alignSelf: 'center'}}
                                onClick={()=>dispatch([event_ids.rules.newRules.questions])}
                        ><SvgIcon icon='plus' size='1.2rem'/></button>
                      </div>
                    </div> 

                    <b> If the answers above are selected, then the following answer is incompatible </b>

                    <div style={{display: 'inline-flex', flexDirection: 'row'}}>
                      <div className='new-rule-input'>
                        <label> Question </label>
                        <select
                          className='select-bar'
                          onChange={(e)=>{dispatch([event_ids.rules.newRule.questions, e.target.value]);}}>
                          <option key='default'
                                  selected disabled hidden
                          > Select Question </option>
                        </select>
                      </div>
                      <div className='new-rule-input'>
                        <label> Answer </label>
                        <select
                          className='select-bar'
                          onChange={(e)=>{dispatch([event_ids.rules.newRule.answers, e.target.value]);}}>
                          <option key='default'
                                  selected disabled hidden
                          > Select Answer </option>
                        </select>
                      </div>
                    </div>
                  </div>);
      default: break;
      }
    };
    
    return (<div className='new-rule-card'>
              <div style={{display: 'inline-flex', flexDirection: 'row', width: "100%"}}>
                <div className='new-rule-input'>
                  <div style={{display: 'flex', flexDirection: 'row', gap:'1rem'}}>
                    <label>Rule Type<span style={{color: 'red'}}>*</span></label>
                    <SvgIcon icon='info' size='1.2rem'/>
                  </div>
                  <select
                    className="select-bar"
                    onChange={(e)=>dispatch([event_ids.rules.newRule.type, e.target.value])}>
                    <option
                      key='default'
                      selected disabled hidden
                      >Select Rule Type</option>
                    {Object.entries(ruleTypeOptions).map(([id, option]) => {
                      return (<option key={id} value={id}
                                      {... (option.validOption()) && {title: option.invalidOptionText }}
                                      disabled={option.validOption()}                              
                              >{option.label}</option>);
                    })}
                  </select>
                </div>
                <div className='new-rule-input'>
                  <div style={{display: 'flex', flexDirection: 'row', gap: '1rem'}}>
                    <label>Enter Rule Label </label>
                    <SvgIcon icon='info' size='1.2rem'/>
                  </div>
                  <input
                    className="rule-input"
                    placeHolder= 'Enter Text'
                    value={newRuleLabel}
                    onChange={(e)=>{dispatch([event_ids.rules.newRule.label, e.target.value]);
                                   }}></input>
                </div>
              </div>
              {newRuleInput()}
              <button className='new-rule-button'
                      onClick={()=>dispatch([event_ids.rules.rules])}
              ><SvgIcon icon='plus' size='1.2rem'/> Add Survey Rule</button>
            </div>);
  };

  const RuleCardList = () => {
    const ruleFilter = useSubscription([sub_ids.rules.filter]);
    const ruleSearch = useSubscription([sub_ids.rules.search]);
    
    return (
      <div className='survey-rules-container'>
        <div className='survey-rules-card'>
          <div className="survey-rules-header">
            <p>questions to be answered during collection  <span style={
              {fontWeight: 'normal',
               color: 'red'}}>*</span></p></div>
          <p>Descriptive Text Here. Just Placeholder: This is a list of all institution projects. The color around the name shows its progress. Red indicates that it has no plots collected.</p>
          <div className='survey-search-rules'>
            <div className='search-bar'>
              <SvgIcon icon='search' size='1.2rem'/>
              <input
                onChange={(e) => dispatch([event_ids.rules.search, e.target.value])}
                type='text'
                placeholder='Search'
                value={ruleSearch}
              ></input>
            </div>
            <div className="rule-filters">
              <p className="filter-header"
              >FILTER BY:</p>
              <div
                style={{display: 'inline-flex', gap: '8px'}}
                onClick={()=>{
                  dispatch([event_ids.rules.filter, 'institution']);
                }}>
                {ruleFilter === 'institution' 
                 ? <SvgIcon icon='radioChecked' size="1.2rem"/>
                 : <SvgIcon icon='radio' size="1.2rem"
                    className='radio-button-unchecked'
                 />
                }
                <span
                  className="filter-text"
                  style={ruleFilter === 'institution'
                         ? {fontWeight: 600}
                         : {fontWeight: 400}}
                >Institution</span>
              </div>
              <div
                style={{display: 'inline-flex', gap: '8px'}}
                onClick={()=>{
                  dispatch([event_ids.rules.filter, 'project']);
                }}>
                {ruleFilter === 'project' 
                 ? <SvgIcon icon='radioChecked' size="1.2rem"/>
                 : <SvgIcon icon='radio' size="1.2rem"
                            className='radio-button-unchecked'
                        />
                }
                <p
                  className="filter-text"
                  style={ruleFilter === 'project'
                         ? {fontWeight: 600}
                         : {fontWeight: 400}} 
                >Project</p>
                
              </div>
            </div>            
          </div>
          <NewRuleCard/>
          {Object.entries(rules).map(RuleCard)}
        </div>
      </div>);
  };
  
  const QuestionCard = ({title, answers}) => {
    const [visible, setVisible] = useState(true);
    return (<div className='question-card'>
              <div onClick={()=>setVisible(!visible)}>
            {visible ? "^" : "v"}
              </div>
            </div>);
    
  };
  
  const PreviewCard = () => {
    return(<div className="question-preview-container">
             <p className="card-header">RULES PREVIEW</p>
             {Object.entries(questions).map(QuestionCard)}
           </div>);
  };
  
  return (
    <div style={{display: 'inline-flex', width: '100%'}}>
      <RuleCardList/>
      <PreviewCard/>
    </div>
  );
};

const ReviewStep  = () => {
  return (
    <div>
    </div>
  );
};


const ProjectWizard = ({userId, userName, version, institutionId}) => {

  // -------------------
  // VARS & CONSTANTS
  // ------------------
  
  const currentStep = useSubscription([sub_ids.currentStep]);
  const modal = useSubscription([sub_ids.modal]);
  
  // -------------------
  // HANDLERS
  // ------------------
  
  const handleNewProject = () => {
    dispatch([event_ids.modal, null]);
    dispatch([event_ids.currentStep, 'overview']);
    };

  
  // -------------------
  // HOOKS
  // ------------------
  
  useEffect(() => {
    /*
    dispatch([event_ids.modal, {title: 'Project Setup',
              closeText: '',
              confirmText: 'Get Started',
              onConfirm: handleNewProject,
              id: 'newProject',
              children: (<NewProjectModal/>)}]); */
    dispatch([event_ids.currentStep, 'rules']);
  }, []);

  
  // -------------------
  // RENDER FUNCTIONS
  // ------------------
  

  
  const CurrentStep = () => {
    switch (currentStep) {
    case 'overview'   : return (<OverviewStep/>);
    case 'imagery'    : return (<ImageryStep/>);
    case 'boundary'   : return (<BoundaryStep/>);
    case 'plots'      : return (<PlotStep/>);
    case 'samples'    : return (<SamplesStep/>);
    case 'questions'  : return (<QuestionsStep/>);
    case 'rules'      : return (<RulesStep/>);
    case 'review'     : return (<ReviewStep/>);
    default           : return (<div></div>);
    }};

  
  return (<div className="project-wizard-container">
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
              <ProjectWizardNavigator/>
              {CurrentStep()}
              <NavButtons/>
            </NavigationBar>
          </div>);
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

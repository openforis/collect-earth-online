import React from "react";
import _ from "lodash";

import SvgIcon from "../components/svg/SvgIcon";

function getSurveyQuestionText(surveyQuestions, questionId) {
  return _.get(surveyQuestions, [questionId, "question"], "");
}

function getSurveyAnswerText(surveyQuestions, questionId, answerId) {
  return _.get(surveyQuestions, [questionId, "answers", answerId, "answer"], "");
}

function SumOfAnswersRuleBody({ questionIds, validSum, surveyQuestions }) {
  /*
    <div style={{display: 'inline-flex', flexDirection: 'column', width: "100%"}}>         
                    {Object.entries(sumsQuestions).map(([idx])=>{                      
                      return(
                        <div className='new-rule-input'>
                          <label>  Survey Question  </label>
                          <div style={{display: 'inline-flex',
                                       width: '100%'}}>
                            <select
                              className='select-bar'
                              style={{width: '100%'}}
                              onChange={(e)=>dispatch([event_ids.rules.newRule.sums.questions.questions, e.target.value, idx])}>
                              <option key='default'
                                      selected disabled hidden
                              > Select </option>
                              {surveyQuestions.map(({title, question_id})=>{
                                return (<option key={question_id} value={question_id}
                                                selected={(question_id == sumsQuestions[idx])}>{title}</option>);
                              })}
                            </select>{(idx == (sumsQuestions.length - 1)) ?
                                      <button className='new-rule-button'
                                              style={{alignSelf: 'center'}}
                                              onClick={()=>dispatch([event_ids.rules.newRule.sums.questions.add])}
                                      ><SvgIcon icon='plus' size='1.2rem'/></button>
                                      : (idx > 0) && <button className='new-rule-button'
                                                             style={{alignSelf: 'center'}}
                                                             onClick={()=>dispatch([event_ids.rules.newRule.sums.questions.remove, idx])}                                                       
                                                     ><SvgIcon icon='minus' size='1.2rem'/></button>}</div>
                        </div>                      
                      );
                    })}
                    <div className='new-rule-input' >
                      <label> Sum </label>
                      <input
                        type='number'
                        className='rule-input'
                        value={newRuleSum}
                        onChange={(e)=>dispatch([event_ids.rules.newRule.sum, e.target.value])}>
                      </input>                      
                    </div>
                  </div>

   */
  return (
    <p className="card-text">
      The answers to questions&nbsp;
      <b>
        &quot;
        {questionIds.map((q) => getSurveyQuestionText(surveyQuestions, q)).join('", "')}
        &quot;
      </b>
      &nbsp;should sum up to&nbsp;
      <b>{validSum}</b>.
    </p>
  );
}

function IncompatibleAnswersRuleBody({
  answerId1,
  answerId2,
  questionId1,
  questionId2,
  surveyQuestions,
}) {
  /*
    <div style={{display: 'inline-flex', flexDirection: 'row', width: "100%"}}>
                    <div style={{width:"50%"}}>
                      <div className='new-rule-input' style={{width: "100%"}}>
                        <label> Question 1 </label>
                        <select
                          className='select-bar'
                          onChange={(e)=>dispatch([event_ids.rules.newRule.incompatibles, 0, 0, e.target.value ])}>
                          <option key='default'
                                  selected disabled hidden
                          > Select Question 1 </option>
                          {surveyQuestions.map(({title, question_id})=>{
                            return (<option key={question_id} value={question_id} >{title}</option>);
                          })}
                        </select>
                      </div>
                      <div className='new-rule-input' style={{width: "100%"}}>
                        <label> Question 2 </label>                        
                        <select
                          className='select-bar'
                          onChange={(e)=>dispatch([event_ids.rules.newRule.incompatibles,1, 0,  e.target.value])}>
                          <option key='default'
                                  selected disabled hidden
                          > Select Question 2 </option>
                          {surveyQuestions.map(({title, question_id})=>{
                            return (<option key={question_id} value={question_id} >{title}</option>);
                          })}
                        </select>
                      </div>                      
                    </div>
                    <div style={{width:"50%"}}>                      
                      <div className='new-rule-input' style={{width: "100%"}}>
                        <label> Answer 1 </label>
                        <select
                          className='select-bar'
                          onChange={(e)=>dispatch([event_ids.rules.newRule.incompatibles, 0, 1, e.target.value])}>
                          <option key='default'
                                  selected disabled hidden
                          > Select Answer 1 </option>
                          {incompatibleAnswers[0][0] &&
                           Object.entries(surveyQuestions.filter(({question_id})=>question_id == incompatibleAnswers[0][0])[0].answers).map(([idx, answer]) => {return (<option key={idx} value={idx} >{answer}</option>);})
                          }
                        </select>
                      </div>
                      <div className='new-rule-input' style={{width: "100%"}}>
                        <label> Answer 2 </label>
                        <select
                          className='select-bar'
                          onChange={(e)=>dispatch([event_ids.rules.newRule.incompatibles, 1, 1, e.target.value])}>
                          <option key='default'
                                  selected disabled hidden
                          > Select Answer 2 </option>
                          {incompatibleAnswers[1][0] &&
                           Object.entries(surveyQuestions.filter(({question_id})=>question_id == incompatibleAnswers[1][0])[0].answers).map(([idx, answer]) => {return (<option key={idx} value={idx} >{answer}</option>);})
                          }
                        </select>
                      </div>
                    </div>
                  </div>

   */
  return (
    <div className="card-text">
      The answer&nbsp;
      <b>&quot;{getSurveyAnswerText(surveyQuestions, questionId1, answerId1)}&quot;</b>
      &nbsp;from question&nbsp;
      <b>&quot;{getSurveyQuestionText(surveyQuestions, questionId1)}&quot;</b>
      &nbsp;is incompatible with the answer&nbsp;
      <b>&quot;{getSurveyAnswerText(surveyQuestions, questionId2, answerId2)}&quot;</b>
      &nbsp;from question&nbsp;
      <b>&quot;{getSurveyQuestionText(surveyQuestions, questionId2)}&quot;</b>.
    </div>
  );
}

function MatchingSumsRuleBody({ questionIds1, questionIds2, surveyQuestions }) {
  const [isQuestionIds1Multiple, isQuestionIds2Multiple] = [
    questionIds1.length > 1,
    questionIds2.length > 1,
  ];
  const surveyQuestionText1 = questionIds1.map((q) => getSurveyQuestionText(surveyQuestions, q));
  const surveyQuestionText2 = questionIds2.map((q) => getSurveyQuestionText(surveyQuestions, q));

  /*
    <div style={{display: 'inline-flex', flexDirection: 'row', width: "100%"}}>
                    <div className='new-rule-input'>
                      <label> Select First Question Set </label>
                      <select
                        className='select-bar'
                        multiple='multiple'
                        style={{height: 'inherit'}}
                        onChange={(e)=>dispatch([event_ids.rules.newRule.questions, e.target.selectedOptions, 0])}>
                        <option key='default'
                                selected disabled hidden
                        > Select </option>
                        {surveyQuestions.map(({title, question_id})=>{
                          return (<option key={question_id} value={question_id} >{title}</option>);
                        })}
                      </select>
                    </div>
                    <div className='new-rule-input'>
                      <label> Select Second Question Set </label>
                      <select
                        className='select-bar'
                        multiple='multiple'
                        style={{height: 'inherit'}}
                        onChange={(e)=>dispatch([event_ids.rules.newRule.questions, e.target.selectedOptions, 1])}>
                        <option key='default'
                                selected disabled hidden
                        > Select </option>
                        {surveyQuestions.map(({title, question_id})=>{
                          return (<option key={question_id} value={question_id} >{title}</option>);
                        })}
                      </select>
                    </div>
                  </div>
    
   */
  return (
    <p className="card-text">
      The {isQuestionIds1Multiple ? "sum of the answers" : "answer"} to question
      {isQuestionIds1Multiple ? "s " : " "}
      <b>&quot;{surveyQuestionText1.join('", "')}&quot;</b>
      &nbsp;should be equal to the {isQuestionIds2Multiple ? "sum of the answers" : "answer"} to
      question{isQuestionIds2Multiple ? "s " : " "}
      <b>&quot;{surveyQuestionText2.join('", "')}&quot;</b>.
    </p>
  );
}

function NumericRangeRuleBody({ questionId, min, max, surveyQuestions }) {
  /*
    <div style={{display: 'inline-flex', flexDirection: 'row', width: "100%"}}>
                    <div className='new-rule-input'>
                      <label>Survey Question </label>
                      <select
                        className='select-bar'
                        onChange={(e)=>dispatch([event_ids.rules.newRule.questions, e.target.value])}>
                        <option key='default'
                                selected disabled hidden
                        >Select</option>
                        {surveyQuestions.map(({title, question_id})=>{
                          return (<option key={question_id} value={question_id} >{title}</option>);
                        })}
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
                  </div>

   */
  return (
    <p className="card-text">
      The answer to question&nbsp;
      <b>&quot;{getSurveyQuestionText(surveyQuestions, questionId)}&quot;</b>
      &nbsp;should be between&nbsp;
      <b>
        {min} and {max}
      </b>
      .
    </p>
  );
}

function TextMatchRuleBody({ questionId, regex, surveyQuestions }) {
  /*

    <div style={{display: 'inline-flex', flexDirection: 'row', width: "100%"}}>
                    <div className='new-rule-input'>
                      <label> Survey Question </label>
                      <select
                        className='select-bar'
                        onChange={(e)=>dispatch([event_ids.rules.newRule.questions, e.target.value])}>
                        <option key='default'
                                selected disabled hidden
                        >Select</option>
                        {surveyQuestions.map(({title, question_id})=>{
                          return (<option key={question_id} value={question_id} >{title}</option>);
                        })}
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
                  </div>
   */
  return (
    <p className="card-text">
      The answer to question&nbsp;
      <b>&quot;{getSurveyQuestionText(surveyQuestions, questionId)}&quot;</b>
      &nbsp;should match the pattern&nbsp;
      <b>{regex}</b>.
    </p>
  );
}

function MultipleIncompatibleAnswersBody({ answers, incompatQuestionId, incompatAnswerId, surveyQuestions }) {
  const answersList = Object.entries(answers);
  /*
    <div style={{display: 'inline-flex', flexDirection: 'column', width: "100%"}}>
                    {Object.entries(sumsQuestions).map(([idx])=>{
                      idx = Number(idx);
                      return (
                        <div style={{display: 'inline-flex',
                                     flexDirection: 'column'}}>
                          
                          <div style={{display: 'inline-flex', flexDirection: 'row'}}>
                            <div className='new-rule-input'>
                              <label> Question {idx + 1}</label>
                              <select
                                className='select-bar'
                                onChange={(e)=>{
                                  dispatch([event_ids.rules.newRule.multipleIncompatibles, (idx + 1) , 0, e.target.value]);}}>
                                <option key='default'
                                        selected disabled hidden
                                > Select Question </option>
                                {surveyQuestions.map(({title, question_id})=>{
                                  return (<option key={question_id} value={question_id} >{title}</option>);
                                })}
                              </select>
                            </div>
                            <div className='new-rule-input'>
                              <label> Answer </label>
                              <select
                                className='select-bar'
                                onChange={(e)=>dispatch([event_ids.rules.newRule.multipleIncompatibles, (idx + 1) , 1, e.target.value])}>
                                <option key='default'
                                        selected disabled hidden
                                > Select Answer </option>
                                {multipleIncompatibles &&
                                 multipleIncompatibles[(idx + 1)] &&
                                 multipleIncompatibles[(idx + 1)][0] &&
                                 Object.entries(surveyQuestions.filter(({question_id})=>question_id == multipleIncompatibles[(idx + 1)][0])[0].answers).map(([idx, answer]) => {
                                   return (<option key={idx} value={idx} >{answer}</option>);
                                 })}
                              </select>
                            </div>
                            {(idx == (sumsQuestions.length - 1)) ?
                             <button className='new-rule-button'
                                     style={{alignSelf: 'center', marginTop: '1.6rem'}}
                                     onClick={()=>dispatch([event_ids.rules.newRule.sums.questions.add])}
                             ><SvgIcon icon='plus' size='1.2rem'/></button>
                             : (idx > 0) &&
                             <button className='new-rule-button'
                                     style={{alignSelf: 'center', marginTop: '1.6rem'}}
                                     onClick={()=>
                                       dispatch([event_ids.rules.newRule.sums.questions.remove, idx])}
                             ><SvgIcon icon='minus' size='1.2rem'/></button>}
                          </div>
                        </div> 
                      );
                    })}                  

                    <b> If the answers above are selected, then the following answer is incompatible </b>

                    <div style={{display: 'inline-flex', flexDirection: 'row'}}>
                      <div className='new-rule-input'>
                        <label> Question </label>
                        <select
                          className='select-bar'
                          onChange={(e)=>dispatch([event_ids.rules.newRule.multipleIncompatibles, 0, 0, e.target.value])}>
                          <option key='default'
                                  selected disabled hidden
                          > Select Question </option>
                          {surveyQuestions.map(({title, question_id})=>{
                            return (<option key={question_id} value={question_id} >{title}</option>);
                          })}
                        </select>
                      </div>
                      <div className='new-rule-input'>
                        <label> Answer </label>
                        <select
                          className='select-bar'
                          onChange={(e)=>dispatch([event_ids.rules.newRule.multipleIncompatibles, 0, 1, e.target.value])}>
                          <option key='default'
                                  selected disabled hidden
                          > Select Answer </option>
                          {multipleIncompatibles[0][0] &&
                           Object.entries(surveyQuestions.filter(({question_id})=>
                             question_id == multipleIncompatibles[0][0])[0].answers).map(
                               ([idx, answer]) => {
                                 return (<option key={idx} value={idx} >{answer}</option>);})}
                        </select>
                      </div>
                    </div>
                  </div>
   */
  return(
    <div className="card-text">
      {answersList.map((a, idx, arr) =>
        (<>
           <p className="card-text">
             If <b>&quot;{getSurveyAnswerText(surveyQuestions,a[0], a[1])}&quot;</b>
             was answered for question <b>&quot;{getSurveyQuestionText(surveyQuestions, a[0])}&quot;</b>{idx === (arr.length -1) ? "" : ", and"} 
           </p>
         </>))}
      <p>Then the answer <b>&quot;{getSurveyAnswerText(surveyQuestions, incompatQuestionId, incompatAnswerId)}&quot;</b> for the question <b>&quot;{getSurveyQuestionText(surveyQuestions, incompatQuestionId)}&quot;</b> is incompatible.</p>
    </div>
  );
}

export default function SurveyRule({
  inDesignMode,
  rule,
  surveyQuestions,
  setProjectDetails,
  surveyRules,
}) {
  const removeRule = () => {
    const newSurveyRules = surveyRules.filter((r) => r.id !== rule.id);
    setProjectDetails({ surveyRules: newSurveyRules });
  };
  const { RuleBody, title } = {
    "text-match": {
      RuleBody: () => <TextMatchRuleBody {...rule} surveyQuestions={surveyQuestions} />,
      title: "Text Match",
    },
    "numeric-range": {
      RuleBody: () => <NumericRangeRuleBody {...rule} surveyQuestions={surveyQuestions} />,
      title: "Numeric Range",
    },
    "sum-of-answers": {
      RuleBody: () => <SumOfAnswersRuleBody {...rule} surveyQuestions={surveyQuestions} />,
      title: "Sum of Answers",
    },
    "matching-sums": {
      RuleBody: () => <MatchingSumsRuleBody {...rule} surveyQuestions={surveyQuestions} />,
      title: "Matching Sums",
    },
    "incompatible-answers": {
      RuleBody: () => <IncompatibleAnswersRuleBody {...rule} surveyQuestions={surveyQuestions} />,
      title: "Incompatible Answers",
    },
    "multiple-incompatible-answers": {
      RuleBody: () => <MultipleIncompatibleAnswersBody {...rule} surveyQuestions={surveyQuestions} />,
      title: "Multiple Incompatible Answers",
    },

  }[rule.ruleType];

  return (
    /*
      <div className="rule-card">
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
            </div>
      
     */
    <div className="d-flex flex-column mb-1" style={{ flex: 1 }}>
      <div className="card" style={{ width: "100%" }}>
        <div className="card-body pt-2 pb-2">
          <div
            style={{
              alignItems: "baseline",
              display: "flex",
              flexDirection: "row",
              justifyContent: "start",
            }}
          >
            {inDesignMode && (
              <button
                className="btn btn-sm btn-outline-red"
                onClick={removeRule}
                title="Delete Rule"
                type="button"
              >
                <SvgIcon icon="trash" size="1rem" />
              </button>
            )}
            <h3 style={{ marginBottom: 0, marginLeft: 6 }}>
              {rule.id + 1}. {title}
            </h3>
          </div>
          <hr style={{ margin: "0.5rem 0" }} />
          <RuleBody />
        </div>
      </div>
    </div>
  );
}

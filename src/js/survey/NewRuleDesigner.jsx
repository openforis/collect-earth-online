import React from "react";

import {dispatch, useSubscription} from '@flexsurfer/reflex';
import {event_ids, sub_ids} from '../state/projectWizard';

import { isNumber } from "../utils/generalUtils";
import SvgIcon from "../components/svg/SvgIcon";
import {
  filterObject,
  getNextInSequence,
  lengthObject,
  mapObjectArray,
  sameContents,
} from "../utils/sequence";
import { ProjectContext } from "../project/constants";
import Modal from "../components/Modal";


function TextMatchForm () {
  const surveyQuestions = useSubscription([sub_ids.questions.questions]);
  
  const surveyRules = useSubscription([sub_ids.rules.rules]);
  function setProjectDetails  (newRule) {dispatch([event_ids.rules.rules, newRule]);}
  
  const regex = useSubscription([sub_ids.rules.newRule.regex]);
  function setRegex (regex) {dispatch([event_ids.rules.newRule.regex, regex]);}
  
  const questionId = useSubscription([sub_ids.rules.newRule.questionId]);  
  function setQuestionId (qid) {dispatch([event_ids.rules.newRule.questionId, qid]);}
  
  const modal = useSubscription([sub_ids.modal]);
  function setModal () {dispatch([event_ids.modal]);}

  const availableQuestions = filterObject(
    surveyQuestions,
    ([_id, sq]) => sq.componentType === "input" && sq.dataType === "text"
  );
  
  function addSurveyRule () {
    const conflictingRule = surveyRules.find(
      (rule) => rule.ruleType === "text-match" && rule.questionId === questionId
    );
    const errorMessages = [
      conflictingRule &&
        "A text regex match rule already exists for this question. (Rule " +
        conflictingRule.id +
        ")",
      questionId < 0 && "You must select a question.",
      regex.length === 0 && "The regex string is missing.",
    ].filter((m) => m);
    if (errorMessages.length > 0) {
      dispatch([event_ids.modal, {alert:
                                  {alertType: "Rule Designer Error",
                                   alertMessage: errorMessages.map((s) => "- " + s).join("\n")}}] );
    } else {
      setProjectDetails({
        surveyRules: [
          ...surveyRules,
          {
            id: getNextInSequence(surveyRules.map((rule) => rule.id)),
            ruleType: "text-match",
            questionId,
            regex,
          },
        ],
      });
    }
  };

  return lengthObject(availableQuestions) > 0 ? (
    <div style={{display: 'inline-flex', flexDirection: 'column', width: "100%"}}>
      <div style={{display: 'inline-flex', flexDirection: 'row', width: "100%"}}>
        <div className='new-rule-input form-group'>
          <label> Survey Question </label>
          <select
            className='select-bar form-control form-control-sm'
            value={questionId}
            onChange={(e) => setQuestionId(Number(e.target.value))}>
            <option value={-1} selected disabled hidden>- Select Question -</option>
            {mapObjectArray(availableQuestions, ([aqId, aq]) => (
              <option key={aqId} value={aqId}> {aq.question} </option>
            ))}
          </select>
        </div>
        <div className='new-rule-input form-group'>
          <label> Enter Regular Expression </label>
          <input
            className='rule-input form-control form-control-sm'
            type="text"
            placeholder='Enter Text'
            value= {regex}
            onChange={(e) => setRegex(e.target.value)}></input>
        </div>
      </div>
      <div className='row' style={{margin: '1rem'}}>
        <button className='new-rule-button'
                onClick={()=>addSurveyRule()}
        ><SvgIcon icon='plus' size='1.2rem'/> Add Survey Rule</button>
      </div>
    </div>
  ) : (
    <label>This rule requires a question of type input-text.</label>
  );
};


function NumericRangeForm () {
  const surveyQuestions = useSubscription([sub_ids.questions.questions]);
  
  const surveyRules = useSubscription([sub_ids.rules.rules]);
  function setProjectDetails  (newRule) {dispatch([event_ids.rules.rules, newRule]);}
  
  const min = useSubscription([sub_ids.rules.newRule.min]);
  function setMin (min) {dispatch([event_ids.rules.newRule.min, min]);}

  const max = useSubscription([sub_ids.rules.newRule.max]);
  function setMax (max) {dispatch([event_ids.rules.newRule.max, max]);}
  
  const questionId = useSubscription([sub_ids.rules.newRule.questionId]);  
  function setQuestionId (qid) {dispatch([event_ids.rules.newRule.questionId, qid]);}
  
  const modal = useSubscription([sub_ids.modal]);
  function setModal () {dispatch([event_ids.modal]);}

  const availableQuestions = filterObject(
    surveyQuestions,
    ([_id, sq]) => sq.componentType === "input" && sq.dataType === "number"
  );

  function addSurveyRule () {
    const conflictingRule = surveyRules.find(
      (rule) => rule.ruleType === "numeric-range" && rule.questionId === questionId
    );
    const errorMessages = [
      conflictingRule &&
        "A numeric range rule already exists for this question. (Rule " + conflictingRule.id + ")",
      questionId < 0 && "You must select a question.",
      max <= min && "Max must be larger than min.",
    ].filter((m) => m);
    if (errorMessages.length > 0) {
      setModal ({alert: {alertType: "Rule Designer Error", alertMessage: errorMessages.map((s) => "- " + s).join("\n")}});
    } else {
      setProjectDetails({
        surveyRules: [
          ...surveyRules,
          {
            id: getNextInSequence(surveyRules.map((rule) => rule.id)),
            ruleType: "numeric-range",
            questionId,
            min,
            max,
          },
        ],
      });
    }
  };

  return lengthObject(availableQuestions) > 0 ? (
    <div style={{display: 'inline-flex', flexDirection: 'column', width: "100%"}}>
      <div style={{display: 'inline-flex', flexDirection: 'row', width: "100%"}}>
        <div className='new-rule-input form-group'>
          <label>Survey Question </label>
          <select
            className='select-bar form-control form-control-sm'
            onChange={(e) => setQuestionId(Number(e.target.value))}
            value={questionId}>
            <option value={-1} selected disabled hidden
            >- Select Question -</option>
            {mapObjectArray(availableQuestions, ([aqId, aq]) => (
              <option key={aqId} value={aqId}>  {aq.question} </option>
            ))}
          </select>
        </div>
        <div className='new-rule-input'>
          <label>Enter minimum</label>
          <input
            type='number'
            className='rule-input form-control form-control-sm'
            value={min}
            placeholder="Minimum value"
            onChange={(e) => setMin(Number(e.target.value))}></input>
        </div>
        <div className='new-rule-input form-group'>
          <label>Enter maximum</label>
          <input
            type='number'
            className='rule-input form-control form-control-sm'
            placeholder="Maximum value"
            value={max}
            onChange={(e) => setMax(Number(e.target.value))}></input>
        </div>
        
      </div>
      <div className='row' style={{margin: '1rem'}}>
        <button className='new-rule-button'
                onClick={()=>addSurveyRule()}
        ><SvgIcon icon='plus' size='1.2rem'/> Add Survey Rule</button>
      </div>
    </div>
  ) : (
    <label>This rule requires a question of type input-number.</label>
  );
}

function SumOfAnswersForm () {
  const surveyQuestions = useSubscription([sub_ids.questions.questions]);
  
  const surveyRules = useSubscription([sub_ids.rules.rules]);
  function setProjectDetails  (newRule) {dispatch([event_ids.rules.rules, newRule]);}
  
  const validSum = useSubscription([sub_ids.rules.newRule.validSum]);
  function setValidSum (validSum) {dispatch([event_ids.rules.newRule.validSum, validSum]);}
  
  const questionIds = useSubscription([sub_ids.rules.newRule.questionIds]);
  function setQuestionIds (qids) {dispatch([event_ids.rules.newRule.qusetionIids, qids]);}
  
  const modal = useSubscription([sub_ids.modal]);
  function setModal () {dispatch([event_ids.modal]);}

  const availableQuestions = filterObject(
    surveyQuestions,
    ([_id, sq]) => sq.componentType === "input" && sq.dataType === "number"
  );

  function addSurveyRule () {
    const conflictingRule = surveyRules.find(
      (rule) => rule.ruleType === "sum-of-answers" && sameContents(questionIds, rule.questionIds)
    );
    const errorMessages = [
      conflictingRule &&
        "A sum of answers rule already exists for these questions. (Rule " +
        conflictingRule.id +
        ")",
      questionIds.length < 2 &&
        "Sum of answers rule requires the selection of two or more questions.",
      !isNumber(validSum) && "You must ender a valid sum number.",
    ].filter((m) => m);
    if (errorMessages.length > 0) {
      setModal({alert: {alertType: "Rule Designer Error", alertMessage: errorMessages.map((s) => "- " + s).join("\n")}});
    } else {
      setProjectDetails({
        surveyRules: [
          ...surveyRules,
          {
            id: getNextInSequence(surveyRules.map((rule) => rule.id)),
            ruleType: "sum-of-answers",
            questionIds,
            validSum,
          },
        ],
      });
    }
  };

  return lengthObject(availableQuestions) > 1 ? (
    <div style={{display: 'inline-flex', flexDirection: 'column', width: "100%"}}>
      <div style={{display: 'inline-flex', flexDirection: 'row', width: "100%"}}>      
        <div className="form-group new-rule-input">
          <label>Select survey question</label>
          <select
            className="form-control form-control-sm overflow-auto select-bar"
            style={{width: '100%', display:'inline-flex'}}
            multiple="multiple"
            onChange={(e) => setQuestionIds(Array.from(e.target.selectedOptions, (i) => Number(i.value)))}
            value={questionIds}>
            {mapObjectArray(availableQuestions, ([aqId, aq]) => (
              <option key={aqId} value={aqId}>
                {aq.question}
              </option>
            ))}
          </select>
          <small className="form-text text-muted">
            Hold ctrl/cmd and select multiple questions
          </small>
        </div>
        <div className='new-rule-input form-group'>
          <label>Enter valid sum</label>
          <input
            type='number'
            className='rule-input form-control form-control-sm'
            onChange={(e) => setValidSum(Number(e.target.value))}
            placeholder="Valid sum"
            value={validSum}>
          </input>
        </div>
      </div>
      <div className='row' style={{margin: '1rem'}}>
        <button className='new-rule-button'
                onClick={()=>addSurveyRule()}
        ><SvgIcon icon='plus' size='1.2rem'/> Add Survey Rule</button>
      </div>
    </div>
  ) : (
    <label>There must be at least 2 number questions for this rule type.</label>
  );
}

function MatchingSumsForm () {
  const surveyQuestions = useSubscription([sub_ids.questions.questions]);
  
  const surveyRules = useSubscription([sub_ids.rules.rules]);
  function setProjectDetails  (newRule) {dispatch([event_ids.rules.rules, newRule]);}
  
  const questionIds1 = useSubscription([sub_ids.rules.newRule.questionIds1]);
  function setQuestionIds1 (qids) {dispatch([event_ids.rules.newRule.questionIds1, qids]);}

  const questionIds2 = useSubscription([sub_ids.rules.newRule.questionIds2]);
  function setQuestionIds2 (qids) {dispatch([event_ids.rules.newRule.qustionIds2, qids]);}
  
  const modal = useSubscription([sub_ids.modal]);
  function setModal () {dispatch([event_ids.modal]);}

  const availableQuestions = filterObject(
    surveyQuestions,
    ([_id, sq]) => sq.dataType === "number"
  );

  function addSurveyRule () {
    const { surveyRules, setProjectDetails } = this.context;
    const { questionIds1, questionIds2 } = this.state;
    const conflictingRule = surveyRules.find(
      (rule) =>
      rule.ruleType === "matching-sums" &&
        sameContents(questionIds1, rule.questionIds1) &&
        sameContents(questionIds2, rule.questionIds2)
    );
    const errorMessages = [
      conflictingRule &&
        "A matching sums rule already exists for these questions. (Rule " +
        conflictingRule.id +
        ")",
      questionIds1.length < 2 &&
        questionIds2.length < 2 &&
        "Matching sums rule requires that at least one of the question sets contain two or more questions.",
      questionIds1.length === 0 && "You must select at least one question from the first set.",
      questionIds2.length === 0 && "You must select at least one question from the second set.",
      questionIds1.some((id) => questionIds2.includes(id)) &&
        "Question set 1 and 2 cannot contain the same question.",
    ].filter((m) => m);
    if (errorMessages.length > 0) {
      setModal ({alert: {alertType: "Rule Designer Error", alertMessage: errorMessages.map((s) => "- " + s).join("\n")}});
    } else {
      setProjectDetails({
        surveyRules: [
          ...surveyRules,
          {
            id: getNextInSequence(surveyRules.map((rule) => rule.id)),
            ruleType: "matching-sums",
            questionIds1,
            questionIds2,
          },
        ],
      });
    }
  };
  
  return lengthObject(availableQuestions) > 1 ? (
    <div style={{display: 'inline-flex', flexDirection: 'column', width: "100%"}}>
      <div style={{display: 'inline-flex', flexDirection: 'row', width: "100%"}}>
        <div className="form-group new-rule-input">
          <label>Select first question set</label>
          <select
            className="form-control form-control-sm overflow-auto select-bar"
            style={{height: 'inherit'}}
            multiple="multiple"
            onChange={(e) => setQuestionIds1(Array.from(e.target.selectedOptions, (i) => Number(i.value)))}
            value={questionIds1}
          >
            {mapObjectArray(availableQuestions, ([aqId, aq]) => (
              <option key={aqId} value={aqId}>
                {aq.question}
              </option>
            ))}
          </select>
          <small className="form-text text-muted">
            Hold ctrl/cmd and select multiple questions
          </small>
        </div>
        <div className="form-group new-rule-input">
          <label>Select second question set</label>
          <select
            className="form-control form-control-sm overflow-auto select-bar"
            style={{height: 'inherit'}}
            multiple="multiple"
            onChange={(e) =>
              setQuestionIds2(Array.from(e.target.selectedOptions, (i) => Number(i.value)))
            }
            value={questionIds2}
          >
            {mapObjectArray(availableQuestions, ([aqId, aq]) => (
              <option key={aqId} value={aqId}>
                {aq.question}
              </option>
            ))}
          </select>
          <small className="form-text text-muted">
            Hold ctrl/cmd and select multiple questions
          </small>
        </div>
        
      </div>
      <div className='row' style={{margin: '1rem'}}>
        <button className='new-rule-button'
                onClick={()=>addSurveyRule()}
        ><SvgIcon icon='plus' size='1.2rem'/> Add Survey Rule</button>
      </div>
    </div>
  ) : (
    <label>There must be at least 2 number questions for this rule type.</label>
  );
}

function  IncompatibleAnswersForm () {
  function  checkPair (q1, a1, q2, a2) {return (q1 === q2 && a1 === a2);};
  function checkEquivalent (q1, a1, q2, a2, q3, a3, q4, a4) 
  {return(
    (this.checkPair(q1, a1, q3, a3) && this.checkPair(q2, a2, q4, a4)) ||
      (this.checkPair(q1, a1, q4, a4) && this.checkPair(q2, a2, q3, a3)));}

  const surveyQuestions = useSubscription([sub_ids.questions.questions]);
  
  const surveyRules = useSubscription([sub_ids.rules.rules]);
  function setProjectDetails  (newRule) {dispatch([event_ids.rules.rules, newRule]);}
  
  const questionId1 = useSubscription([sub_ids.rules.newRule.questionId1]);
  function setQuestionId1 (qid) {dispatch([event_ids.rules.newRule.questionId1, qid]);}

  const questionId2 = useSubscription([sub_ids.rules.newRule.questionId2]);
  function setQuestionId2 (qid) {dispatch([event_ids.rules.newRule.qustionId2, qid]);}

  const answerId1 = useSubscription([sub_ids.rules.newRule.answerId1]);
  function setAnswerId1 (qid) {dispatch([event_ids.rules.newRule.answerId1, qid]);}

  const answerId2 = useSubscription([sub_ids.rules.newRule.answerId2]);
  function setAnswerId2 (qid) {dispatch([event_ids.rules.newRule.qustionId2, qid]);}
  
  const modal = useSubscription([sub_ids.modal]);
  function setModal () {dispatch([event_ids.modal]);}

  function safeFindAnswers (questionId) {
    return(
      questionId in surveyQuestions ? surveyQuestions[questionId].answers : {});
  };

  const availableQuestions = filterObject(
    surveyQuestions,
    ([_id, sq]) => sq.componentType !== "input"
  );

  function addSurveyRule () {
    const conflictingRule = surveyRules.find(
      (rule) =>
      rule.ruleType === "incompatible-answers" &&
        this.checkEquivalent(
          rule.questionId1,
          rule.answerId1,
          rule.questionId2,
          rule.answerId2,
          questionId1,
          answerId1,
          questionId2,
          answerId2
        )
    );
    const errorMessages = [
      conflictingRule &&
        "An incompatible answers rule already exists for these question / answer pairs. (Rule " +
        conflictingRule.id +
        ")",
      questionId1 === questionId2 && "You must select two different questions.",
      questionId1 < 0 && "You must select a valid first question.",
      questionId2 < 0 && "You must select a valid second question.",
      (answerId1 < 0 || answerId2 < 0) && "You must select an answer for each question.",
    ].filter((m) => m);
    if (errorMessages.length > 0) {
      setModal ({alert: {alertType: "Rule Designer Error", alertMessage: errorMessages.map((s) => "- " + s).join("\n")}});
    } else {
      setProjectDetails({
        surveyRules: [
          ...surveyRules,
          {
            id: getNextInSequence(surveyRules.map((rule) => rule.id)),
            ruleType: "incompatible-answers",
            questionId1,
            questionId2,
            answerId1,
            answerId2,
          },
        ],
      });
    }
  };

  return lengthObject(availableQuestions) > 1 ? (
    <div style={{display: 'inline-flex', flexDirection: 'column', width: "100%"}}>      
      <strong className="mb-2" style={{ textAlign: "center" }}>
        Select the incompatible questions and answers
      </strong>
      <div style={{display: 'inline-flex', flexDirection: 'row', width: "100%"}}>
        <div className="form-group new-rule-input">
          <label>Question 1</label>
          <select
            className="form-control form-control-sm select-bar"
            onChange={(e) => {
              setQuestionId1( Number(e.target.value));
              setAnswerId1(-1);
            }}
            value={questionId1}>
            <option value="-1" selected disabled hidden>- Select Question 1 -</option>
            {mapObjectArray(availableQuestions, ([aqId, aq]) => (
              <option key={aqId} value={aqId}>
                {aq.question}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group new-rule-input">
          <label>Answer 1</label>
          <select
            className="form-control form-control-sm select-bar"
            onChange={(e) => setAnswerId1(Number(e.target.value))}
            value={answerId1}>
            <option value="-1" selected disabled hidden>- Select Answer 1 -</option>
            {mapObjectArray(safeFindAnswers(questionId1), ([ansId, ans]) => (
              <option key={ansId} value={ansId}>
                {ans.answer}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div style={{display: 'inline-flex', flexDirection: 'row', width: "100%"}}>
        <div className="form-group new-rule-input">
          <label>Question 2</label>
          <select
            className="form-control form-control-sm select-bar"
            onChange={(e) =>{
              setQuestionId2(Number(e.target.value));
              setAnswerId2(-1);
            }}
            value={questionId2}>
            <option value="-1" selected disabled hidden>- Select Question 2 -</option>
            {mapObjectArray(availableQuestions, ([aqId, aq]) => (
              <option key={aqId} value={aqId}>
                {aq.question}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group new-rule-input">
          <label>Answer 2</label>
          <select
            className="form-control form-control-sm select-bar"
            onChange={(e) => setAnswerId2(Number(e.target.value))}
            value={answerId2}>
            <option value="-1" selected disabled hidden>- Select Answer 2 -</option>
            {mapObjectArray(safeFindAnswers(questionId2), ([ansId, ans]) => (
              <option key={ansId} value={ansId}>
                {ans.answer}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className='row' style={{margin: '1rem'}}>
        <button className='new-rule-button'
                onClick={()=>addSurveyRule()}
        ><SvgIcon icon='plus' size='1.2rem'/> Add Survey Rule</button>
      </div>
    </div>    
  ) : (
    <label>There must be at least 2 questions where type is not input for this rule.</label>
  );
}

function MultipleIncompatibleAnswersForm () {
  const surveyQuestions = useSubscription([sub_ids.questions.questions]);
  
  const surveyRules = useSubscription([sub_ids.rules.rules]);
  function setProjectDetails  (newRule) {dispatch([event_ids.rules.rules, newRule]);}
  
  const incompatQuestionId = useSubscription([sub_ids.rules.newRule.incompatQuestionId]);
  function setIncompatQuestionId (incompatQuestionId) {dispatch([event_ids.rules.newRule.incompatQuestionId, incompatQuestionId]);}

  const incompatAnswerId = useSubscription([sub_ids.rules.newRule.incompatAnswerId]);
  function setIncompatAnswerId (incompatAnswerId) {dispatch([event_ids.rules.newRule.incompatAnswerId, incompatAnswerId]);}
  
  const answers = useSubscription([sub_ids.rules.newRule.answers]);
  function addRule (qid, aid) {dispatch([event_ids.rules.newRule.addAnswer, qid, aid]);}
  function removeRule (qid) {dispatch([event_ids.rules.newRule.removeAnswer, qid]);}
  
  const modal = useSubscription([sub_ids.modal]);
  function setModal () {dispatch([event_ids.modal]);}

  const tempQuestionId = useSubscription([sub_ids.rules.newRule.tempQuestionId]);
  function setTempQuestionId (qid) {dispatch([event_ids.rules.newRule.tempQuestionId, qid]);}
  
  const tempAnswerId = useSubscription([sub_ids.rules.newRule.tempAnswerId]);
  function setTempAnswerId (aid) {dispatch([event_ids.rules.newRule.tempAnswerId, aid]);}  

  function addSurveyRule () {    
    setProjectDetails({
      surveyRules: [
        ...surveyRules,
        {
          id: getNextInSequence(surveyRules.map((rule) => rule.id)),
          ruleType: "multiple-incompatible-answers",
          answers: answers,
          incompatQuestionId: incompatQuestionId,
          incompatAnswerId: incompatAnswerId
        },
      ],
    });
  };

  function safeFindAnswers (questionId)  {    
    return questionId in surveyQuestions ? surveyQuestions[questionId].answers : {};
  };

  function renderRuleRow (surveyQuestions, questionId, answerId) {
    const questionText = surveyQuestions[questionId]?.question;
    const answerText = surveyQuestions[questionId].answers[answerId].answer;
    return (
      <>
        <div className="form-row mt-1">
          <div className="font-italic medium ml-2">
            {`Answer ${answerText} from question ${questionText}`}
          </div>
          <div className="col-1">
            <button
              className="btn btn-sm btn-danger"
              onClick={() => removeRule(questionId)}
              title="Remove question"
              type="button"
            >
              <SvgIcon icon="minus" size="0.5rem" />
            </button>
          </div>
        </div>
      </>
    );}

  const availableQuestions = filterObject(
    surveyQuestions,
    ([_id, sq]) => sq.componentType !== "input"
  );

  /*
    <div style={{display: 'inline-flex', flexDirection: 'column', width: "100%"}}>
    {Object.entries(sumsQuestions).map(([idx])=>{
    idx = Number(idx);
    return (
    <div style={{display: 'inline-flex',
    flexDirection: 'column'}}>
    
    <div style={{display: 'inline-flex', flexDirection: 'row'}}>

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

  return lengthObject(availableQuestions) > 2 ? (
    <div style={{display: 'inline-flex', flexDirection: 'column', width: "100%"}}>
      <strong className="mb-2" style={{ textAlign: "center" }}>
        Select and add questions and answers to the rule
      </strong>
      <div style={{display: 'inline-flex', flexDirection: 'row', width: "100%"}}>
        <div className="new-rule-input">
          <label>Question </label>
          <select
            style={{ display: "inline-block"}}
            className="form-inline form-control-sm ml-2 mr-2 select-bar"
            onChange={(e) => setTempQuestionId(e.target.value)}
            value={tempQuestionId}
          >
            <option value="-1" selected disabled hidden>- Select Question -</option>
            {mapObjectArray(surveyQuestions, ([aqId, aq]) => {
              if(answers[aqId] === undefined) {
                return (
                  <option key={aqId} value={aqId}>
                    {aq.question}
                  </option>
                );
              } else {return (<></>);}})}
          </select>
        </div>
        <div className="new-rule-input">
          <label>Answer </label>
          <select
            style={{ display: "inline-block"}}
            className="form-inline form-control-sm ml-2 mr-2 select-bar"
            onChange={(e) => setTempAnswerId(e.target.value) }
            value={tempAnswerId}>
            <option value="-1" selected disabled hidden>- Select Answer -</option>
            {mapObjectArray(safeFindAnswers(tempQuestionId), ([ansId, ans]) => (
              <option key={ansId} value={ansId}>
                {ans.answer}
              </option>
            ))}
          </select>
        </div>
        <div style={{alignContent: 'center', marginTop: '1rem'}}>
          <button
            className="btn btn-sm btn-success "
            disabled={tempAnswerId === -1 || tempQuestionId === -1}
            onClick={() => {
              addRule(tempQuestionId, tempAnswerId);
              setTempQuestionId(-1);
              setTempAnswerId(-1);                                
            }}
            title="Add Rule"
            type="button">
            <SvgIcon icon="plus" size="0.9rem" />
          </button>
        </div>
      </div>
      {Object.entries(answers)?.map(([question, answer]) =>
        renderRuleRow(surveyQuestions, question, answer))}
      <br/>
      <strong className="mb-2" style={{ textAlign: "center" }}>
        If the answers above are selected, then the following answer is incompatible
      </strong>
      <div style={{display: 'inline-flex', flexDirection: 'row'}} className="form-row">        
        <div className="new-rule-input">
          <label>Question </label>
          <select
            style={{ display: "inline-block"}}
            className="form-inline form-control-sm ml-2 mr-2 select-bar"
            onChange={(e) => setIncompatQuestionId(e.target.value)}
            value={incompatQuestionId}>
            <option value="-1" selected disabled hidden>- Select Question -</option>
            {mapObjectArray(surveyQuestions, ([aqId, aq]) => {
              if(answers[aqId] === undefined) {
                return (
                  <option key={aqId} value={aqId}>
                    {aq.question}
                  </option>
                );
              } else {return (<></>);}})}
          </select>
        </div>
        <div className='new-rule-input'>
          <label>Answer </label>
          <select
            style={{ display: "inline-block"}}
            className="form-inline form-control-sm ml-2 mr-2 select-bar"
            onChange={(e) => setIncompatAnswerId(e.target.value) }
            value={incompatAnswerId}>
            <option value="-1" selected disabled hidden>- Select Answer -</option>
            {mapObjectArray(safeFindAnswers(incompatQuestionId), ([ansId, ans]) => (
              <option key={ansId} value={ansId}>
                {ans.answer}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className='row' style={{margin: '1rem'}}>
        <button className='new-rule-button'
                onClick={()=>addSurveyRule()}
        ><SvgIcon icon='plus' size='1.2rem'/> Add Survey Rule</button>
      </div> 
    </div> 
  ) : (
    <label>There must be at least 3 questions where type is not input for this rule.</label>
  );
}

export default function NewRuleDesigner () {
  //TODO: a better way to do this would be to define the form, validity, and addrule behavior in a map to iterate over. this way we could have a more unified style across all rule types more easily
  const modal = useSubscription([sub_ids.modal]);
  function setModal (modal) {dispatch([event_ids.modal, modal]);}
  
  const selectedRuleType = useSubscription([sub_ids.rules.selectedRuleType]);
  function setSelectedRuleType (ruleType) {dispatch([event_ids.rules.selectedRuleType, ruleType]);}

  const newRuleLabel = useSubscription([sub_ids.rules.newRule.label]);
  function setNewRuleLabel (label) {dispatch([event_ids.rules.newRule.label, label]);}
  
  return (
    <>{modal?.alert &&
       <Modal title={modal.alert.alertType}
              onClose={()=>setModal(null)}>
         {modal.alert.alertMessage}
       </Modal>}
      <div className="mt-3 d-flex justify-content-center new-rule-card" >
        <div style={{display: 'inline-flex', flexDirection: 'column', width: "100%"}}>        
          <h2>New Rule</h2>
          <div className='row' style={{width: '100%'}}>
            <div className="form-group new-rule-input">
              <label>Rule Type</label>
              <select
                className="form-control form-control-sm select-bar"
                onChange={(e) => setSelectedRuleType(e.target.value)}
                value={selectedRuleType}
              >
                <option value={-1} selected disabled hidden>Select Rule Type</option>
                {//TODO: conditionally disable rule type options, give popover text as to why they're not available
                  /*Object.entries(ruleTypeOptions).map(([id, option]) => {
                    return (<option key={id} value={id}
                    {... (option.validOption()) && {title: option.invalidOptionText }}
                    disabled={option.validOption()}                              
                    >{option.label}</option>);
                    }) */}
                <option value="text-match">Text Regex Match</option>
                <option value="numeric-range">Numeric Range</option>
                <option value="sum-of-answers">Sum of Answers</option>
                <option value="matching-sums">Matching Sums</option>
                <option value="incompatible-answers">Incompatible Answers</option>
                <option value="multiple-incompatible-answers">Multiple Incompatible Answers</option>
              </select>
            </div>
            <div className='new-rule-input' style={{width: '50%'}}>
              <div style={{display: 'flex', flexDirection: 'row', gap: '1rem'}}>
                <label>Enter Rule Label </label>
                <SvgIcon icon='info' size='1.2rem'/>
              </div>
              <input
                className="rule-input"
                placeHolder= 'Enter Text'
                value={newRuleLabel}
                onChange={(e)=>setNewRuleLabel(e.target.value)}>
              </input>
            </div>
          </div>
        </div>
        {
          {
            "text-match": <TextMatchForm />,
            "numeric-range": <NumericRangeForm />,
            "sum-of-answers": <SumOfAnswersForm />,
            "matching-sums": <MatchingSumsForm />,
            "incompatible-answers": <IncompatibleAnswersForm />,
            "multiple-incompatible-answers": <MultipleIncompatibleAnswersForm />,
          }[selectedRuleType]
        }        
      </div>
    </>
  );
};

import { atom } from "jotai";
import { initAppDb , regEvent , regEffect , dispatch , regSub , current } from '@flexsurfer/reflex';


const projectWizardDb = {
  currentStep: null,
  modal: null,
  projectSource: null,
  // overview
  'overview.projectName': '',
  'overview.projectDescription': '',
  'overview.projectType': null,
  'overview.learningMaterial': '',
  'overview.visibility': null,
  // overview.projectOptions
  'overview.projectOptions.gee': false,
  'overview.projectOptions.extraPlotColumns': false,
  'overview.projectOptions.plotConfidence': false,
  'overview.projectOptions.autoGeo': false,
  imagery: [],
  boundary: [],
  plots: [],
  samples: [],
  //questions
  'questions.questions': [
    {question_id : 0, title: 'Is this Deforestation?', answers: ['yes', 'no', 'maybe']},
    {question_id: 1, title: 'Is this a good example of Cocoa?' , answers: ['yes', 'no', 'maybe']},
    {question_id: 2, title: 'Is this Deforestation?' , answers: ['yes', 'no', 'maybe']},
  ],
  // rules
  //TODO: DELETE PLACEHOLDER RULES
  'rules.rules' : [
    {ruleType: 'text-match',
     question: 0,
     label: 'Text Match Example',
     pattern: 'example'},
    {ruleType: 'numeric-range',
     label: 'Numeric Range Example',
     question: 0,
     min: 0,
     max: 1
    },
    {ruleType: 'sum-of-answers',
     label: 'Sum of Answers Example',
     questions: [0, 1],
     sum: 1
    },
    {ruleType: 'matching-sums',
     label: 'Matching Sums Example',
     questions: [[0, 1], [1, 2]],
    },
    {ruleType: 'incompatible-answers',
     label: 'Incompatible Answers',
     questions: [[0, 1], [1, 2]]
    },
    {ruleType: 'multiple-incompatible-answers',
     label: 'Multiple Incompatible Answers Example',
     questions: [[0, 1], [1, 2], [1, 3], [2, 3]]
    }
  ],
  'rules.search': '',
  'rules.filter': null,
  // rules.newRule
  'rules.newRule.type': null,
  'rules.newRule.label': '',

  'rules.newRule.pattern': '',
  'rules.newRule.min' : null,
  'rules.newRule.max' : null,
  'rules.newRule.sum' : null, 
  'rules.newRule.questions' : [0, 1], 
  'rules.newRule.sums.questions': [null, null],
  'rule.newRule.incompatibles': [[null, null], [null, null]]
};

initAppDb(projectWizardDb);

export const event_ids = {
  currentStep: 'currentStep',
  modal: 'modal',
  projectSource: 'projectSource',
  overview: {
    projectName: 'overview.projectName',
    projectDescription: 'overview.projectDescription',
    projectType: 'overview.projectType',
    learningMaterial: 'overview.learningMaterial',
    visibility: 'overview.visibility',
    projectOptions: {
      gee: 'overview.projectOptions.gee',
      extraPlotColumns: 'overview.projectOptions.extraPlotColumns',
      plotConfidence: 'overview.projectOptions.plotConfidence',
      autoGeo: 'overview.projectOptions.autoGeo'
    }},
  questions: {
    questions: 'questions.questions'},
  rules: {
    rules: 'rules.rules',
    search: 'rules.search',
    filter: 'rules.filter',
    delete: 'rules.delete',
    newRule: {
      label: 'rules.newRule.label',
      type: 'rules.newRule.type',
      pattern: 'rules.newRule.pattern',
      min: 'rules.newRule.min',
      max : 'rules.newRule.max',
      sum: 'rules.newRule.sum',
      questions: 'rules.newRule.questions',
      incompatibles: 'rule.newRule.incompatibles',
      answers: 'rules.newRule.answers',
      sums: {questions: {questions: 'rules.newRule.sums.questions.questions',
                         add:'rules.newRule.sums.questions.add',
                         remove: 'rules.newRule.sums.questions.remove'}}
    }}};

export const sub_ids = {
  currentStep: 'currentStep',
  modal: 'modal',
  projectSource: 'projectSource',
  overview: {
    projectName: 'overview.projectName',
    projectDescription: 'overview.projectDescription',
    projectType: 'overview.projectType',
    learningMaterial: 'overview.learningMaterial',
    visibility: 'overview.visibility',
    projectOptions: {
      gee: 'overview.projectOptions.gee',
      extraPlotColumns: 'overview.projectOptions.extraPlotColumns',
      plotConfidence: 'overview.projectOptions.plotConfidence',
      autoGeo: 'overview.projectOptions.autoGeo'
    }},
  questions: {
    questions: 'questions.questions'},
  rules: {
    rules : 'rules.rules',
    search: 'rules.search',
    filter: 'rules.filter',
    newRule: {
      label: 'rules.newRule.label',
      type: 'rules.newRule.type',
      pattern: 'rules.newRule.pattern',
      min: 'rules.newRule.min',
      max : 'rules.newRule.max',
      sum: 'rules.newRule.sum',
      questions: 'rules.newRule.questions',
      incompatibles: 'rule.newRule.incompatibles',
      sums: {questions: 'rules.newRule.sums.questions'}
    }}};

export const effects = {};


// PROJECT WIZARD SUBS
regSub(sub_ids.currentStep, sub_ids.currentStep);
regSub(sub_ids.modal, sub_ids.modal);
regSub(sub_ids.projectSource, sub_ids.projectSource);

// PROJECT OVERVIEW SUBS
regSub(sub_ids.overview.projectType, sub_ids.overview.projectType);
regSub(sub_ids.overview.projectName, sub_ids.overview.projectName);
regSub(sub_ids.overview.projectDescription, sub_ids.overview.projectDescription);
regSub(sub_ids.overview.learningMaterial, sub_ids.overview.learningMaterial);
regSub(sub_ids.overview.visibility, sub_ids.overview.visibility);
regSub(sub_ids.overview.projectOptions.gee, sub_ids.overview.projectOptions.gee);
regSub(sub_ids.overview.projectOptions.extraPlotColumns, sub_ids.overview.projectOptions.extraPlotColumns);
regSub(sub_ids.overview.projectOptions.plotConfidence, sub_ids.overview.projectOptions.plotConfidence);
regSub(sub_ids.overview.projectOptions.autoGeo, sub_ids.overview.projectOptions.autoGeo);

// SURVEY QUESTIONS SUBS
regSub(sub_ids.questions.questions, sub_ids.questions.questions);

// SURVEY RULES SUBS
regSub(sub_ids.rules.rules, sub_ids.rules.rules);
regSub(sub_ids.rules.search, sub_ids.rules.search);
regSub(sub_ids.rules.filter, sub_ids.rules.filter);
regSub(sub_ids.rules.newRule.type , sub_ids.rules.newRule.type);
regSub(sub_ids.rules.newRule.label , sub_ids.rules.newRule.label);
regSub(sub_ids.rules.newRule.pattern , sub_ids.rules.newRule.pattern);
regSub(sub_ids.rules.newRule.min, sub_ids.rules.newRule.min);
regSub(sub_ids.rules.newRule.max, sub_ids.rules.newRule.max);
regSub(sub_ids.rules.newRule.sum, sub_ids.rules.newRule.sum);
regSub(sub_ids.rules.newRule.questions, sub_ids.rules.newRule.questions);
regSub(sub_ids.rules.newRule.sums.questions, sub_ids.rules.newRule.sums.questions);
//regSub(sub_ids.rules.newRule.incompatibles, sub_ids.rules.newRule.incompatibles);
regSub('rule.newRule.incompatibles', 'rule.newRule.incompatibles');

// PROJECT WIZARD EVENTS
regEvent(event_ids.currentStep,
         ({ draftDb }, currentStep) => {
           draftDb[event_ids.currentStep] = currentStep;
         });

regEvent(event_ids.modal,
         ({ draftDb }, modal) => {
           draftDb[event_ids.modal] = modal;
         });

regEvent(event_ids.overview.projectType,
         ({ draftDb }, projectType) => {
           draftDb[event_ids.overview.projectType] = projectType;
         });

regEvent(event_ids.projectSource,
         ({ draftDb }, projectSource) => {
           draftDb[event_ids.projectSource] = projectSource;
         });


// PROJECT OVERVIEW EVENTS
regEvent(event_ids.overview.projectName,
         ({ draftDb }, projectName) => {
           draftDb[event_ids.overview.projectName] = projectName;
         });

regEvent(event_ids.overview.projectDescription,
         ({ draftDb }, projectDescription) => {
           draftDb[event_ids.overview.projectDescription] = projectDescription;
         });

regEvent(event_ids.overview.learningMaterial,
         ({ draftDb }, learningMaterial) => {
           draftDb[event_ids.overview.learningMaterial] = learningMaterial;
         });

regEvent(event_ids.overview.visibility,
         ({ draftDb }, visibility) => {
           draftDb[event_ids.overview.visibility] = visibility;
         });

regEvent(event_ids.overview.projectOptions.gee,
         ({ draftDb }) => {
           draftDb[event_ids.overview.projectOptions.gee] = !draftDb[event_ids.overview.projectOptions.gee];
         });

regEvent(event_ids.overview.projectOptions.extraPlotColumns,
         ({ draftDb }) => {
           draftDb[event_ids.overview.projectOptions.extraPlotColumns] = !draftDb[event_ids.overview.projectOptions.extraPlotColumns];
         });

regEvent(event_ids.overview.projectOptions.plotConfidence,
         ({ draftDb }) => {
           draftDb[event_ids.overview.projectOptions.plotConfidence] = !draftDb[event_ids.overview.projectOptions.plotConfidence];
         });

regEvent(event_ids.overview.projectOptions.autoGeo,
         ({ draftDb }) => {
           draftDb[event_ids.overview.projectOptions.autoGeo] = !draftDb[event_ids.overview.projectOptions.autoGeo];
         });

// SURVEY QUESTIONS EVENTS
regEvent(event_ids.questions.questions,
         ({ draftDb }, newQuestion) => {
           draftDb[event_ids.questions.questions].push(newQuestion);
         });

// SURVEY RULES EVENTS
regEvent(event_ids.rules.search,
         ({ draftDb }, search) => {
           draftDb[event_ids.rules.search] = search;
         });

regEvent(event_ids.rules.filter,
         ({ draftDb }, filter) => {
           draftDb[event_ids.rules.filter] = filter;
         });

regEvent(event_ids.rules.newRule.type,
         ({ draftDb }, type) => {
           draftDb[event_ids.rules.newRule.label] = '';
           draftDb[event_ids.rules.newRule.questions] = [];
           draftDb[event_ids.rules.newRule.pattern] = null;
           draftDb[event_ids.rules.newRule.min] = null;
           draftDb[event_ids.rules.newRule.max] = null;
           draftDb[event_ids.rules.newRule.sum] = null;
           
           draftDb[event_ids.rules.newRule.type] = type;
         });

regEvent(event_ids.rules.newRule.label,
         ({ draftDb }, label) => {
           draftDb[event_ids.rules.newRule.label] = label;
         });

regEvent(event_ids.rules.newRule.pattern,
         ({ draftDb }, pattern) => {
           draftDb[event_ids.rules.newRule.pattern] = pattern;
         });

regEvent(event_ids.rules.rules,
         ({ draftDb }) => {
           (draftDb[sub_ids.rules.newRule.type] === 'text-match') &&
             draftDb[event_ids.rules.rules].push({
               ruleType:  draftDb[sub_ids.rules.newRule.type],
               label:     draftDb[sub_ids.rules.newRule.label],
               question:  draftDb[sub_ids.rules.newRule.questions],
               pattern:   draftDb[sub_ids.rules.newRule.pattern]
           });
           (draftDb[sub_ids.rules.newRule.type] === 'numeric-range') &&
             draftDb[event_ids.rules.rules].push({
               ruleType:  draftDb[sub_ids.rules.newRule.type],
               label:     draftDb[sub_ids.rules.newRule.label],
               question:  draftDb[sub_ids.rules.newRule.questions],
               min:       draftDb[sub_ids.rules.newRule.min],
               max:       draftDb[sub_ids.rules.newRule.max],
           });
           (draftDb[sub_ids.rules.newRule.type] === 'sum-of-answers') &&
             draftDb[event_ids.rules.rules].push( {
               ruleType:  draftDb[sub_ids.rules.newRule.type],
               label:     draftDb[sub_ids.rules.newRule.label],
               sum:       draftDb[sub_ids.rules.newRule.sum],
               questions: draftDb[sub_ids.rules.newRule.sums.questions],
           });
           (draftDb[sub_ids.rules.newRule.type] === 'matching-sums') &&
             draftDb[event_ids.rules.rules].push( {
               ruleType:  draftDb[sub_ids.rules.newRule.type],
               label:     draftDb[sub_ids.rules.newRule.label],
               questions: draftDb[sub_ids.rules.newRule.questions],
             });
           
           (draftDb[sub_ids.rules.newRule.type] === 'incompatible-answers') &&
             draftDb[event_ids.rules.rules].push({
               ruleType:  draftDb[sub_ids.rules.newRule.type],
               label:     draftDb[sub_ids.rules.newRule.label],
               questions: draftDb[sub_ids.rules.newRule.incompatibles],
             });
           (draftDb[sub_ids.rules.newRule.type] === 'multiple-incompatible-answers') &&
             draftDb[event_ids.rules.rules].push({
               ruleType:  draftDb[sub_ids.rules.newRule.type],
               label:     draftDb[sub_ids.rules.newRule.label],
               questions: draftDb[sub_ids.rules.newRule.questions],
           });
           
           draftDb[sub_ids.rules.newRule.label] = '';
           draftDb[sub_ids.rules.newRule.questions] = [];
           draftDb[sub_ids.rules.newRule.pattern] = null;
           draftDb[sub_ids.rules.newRule.min] = null;
           draftDb[sub_ids.rules.newRule.max] = null;
           draftDb[sub_ids.rules.newRule.sum] = null;
         });

regEvent(event_ids.rules.delete,
         ({ draftDb }, idx) => {
           draftDb[sub_ids.rules.rules].splice(idx, 1);
         });

regEvent(event_ids.rules.newRule.min,
         ({ draftDb }, min) => {
           draftDb[sub_ids.rules.newRule.min] = min;
         });

regEvent(event_ids.rules.newRule.max,
         ({ draftDb }, max) => {
           draftDb[sub_ids.rules.newRule.max] = max;
         });

regEvent(event_ids.rules.newRule.sum,
         ({ draftDb }, sum) => {
           draftDb[sub_ids.rules.newRule.sum] = sum;
         });

//TODO: handle questions conditionally based on rules.newRule.type
regEvent(event_ids.rules.newRule.questions,
         ({ draftDb }, questions, idx) => {           
           (draftDb[sub_ids.rules.newRule.type] === 'matching-sums') ?             
             draftDb[sub_ids.rules.newRule.questions][idx] = Array.from(questions, (i) => Number(i.value))
             : draftDb[sub_ids.rules.newRule.questions] = questions;
         });

regEvent(event_ids.rules.newRule.answers,
         ({ draftDb }, questions, idx) => {
           draftDb[sub_ids.rules.newRule.questions][idx][1] = questions;
         });


regEvent(event_ids.rules.newRule.sums.questions.add,
         ({ draftDb }) => {
           draftDb[sub_ids.rules.newRule.sums.questions].push(null);
         });

regEvent(event_ids.rules.newRule.sums.questions.remove,
         ({ draftDb }, idx) => {
           draftDb[sub_ids.rules.newRule.sums.questions].splice(idx, 1);
         });


regEvent(event_ids.rules.newRule.sums.questions.questions,
         ({ draftDb }, question, idx) => {
           draftDb[sub_ids.rules.newRule.sums.questions][idx] = question;
         });

regEvent(event_ids.rules.newRule.incompatibles,
         ({ draftDb }, question, answer, value) => {
           draftDb['rule.newRule.incompatibles'][question][answer] = value;
         });

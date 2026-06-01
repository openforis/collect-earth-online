import { atom } from "jotai";
import { initAppDb , regEvent , regEffect , dispatch , regSub , current } from '@flexsurfer/reflex';

export const projectSourceAtom = atom(null);
export const currentStepAtom = atom("overview");
export const projectOverviewAtom = atom (
  {projectName: '',
   projectDescription: '',
   projectType: null, // 'simplified' | 'regular'
   learningMaterial: '',
   visibility: null, // 'public' | 'users' | 'institution' | 'private'
   projectOptions: {
   gee: false,
   extraPlotColumns: false,
   plotConfidence: false,
   autoGeo: false}});

export const projectImageryListAtom = atom([]);

export const boundaryAtom = atom({});
export const plotsAtom = atom({});
export const samplesAtom = atom([]);
export const surveyQuestionsAtom = atom([]);
export const rulesAtom = atom([]);
export const previewSelectedSampleIdAtom = atom(1);
export const previewUserSamplesAtom = atom({});



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

  questions: [],
  'rules': [],
  'rules.search': null,
  'rules.filter': null,
  'rules.selectedRuleType': null,
  'rules.newRule.label': null,
  'rules.newRule.regex': "",
  'rules.newRule.questionId': -1,
  'rules.newRule.min': 0,
  'rules.newRule.max': 0,
  'rules.newRule.validSum': 0,
  'rules.newRule.questionIds': [],
  'rules.newRule.questionIds1': [],
  'rules.newRule.questionIds2': [],
  'rules.newRule.questionId1': -1,
  'rules.newRule.questionId2': -1,
  'rules.newRule.incompatQuestionId': -1,
  'rules.newRule.incompatAnswerId': -1,
  'rules.newRule.tempQuestionId': -1,
  'rules.newRule.tempAnswerId': -1,
  'rules.newRule.answerId1': -1,
  'rules.newRule.answerId2': -1,
  'rules.newRule.answers': {},   

};

initAppDb(projectWizardDb);

export const event_ids = {
  currentStep: 'currentStep',
  modal: 'modal',
  projectSource: 'projectSource',

  overview: {projectName: 'overview.projectName',
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
  projectDetails: 'projectDetails',  
  rules: {
    rules: 'rules',
    search: 'rules.search',
    filter: 'rules.filter',
    selectedRuleType: 'rules.selectedRuleType',
    newRule: {
      label: 'rules.newRule.label',
      answers: 'rules.newRule.answers',
      regex: 'rules.newRule.regex',
      questionId: 'rules.newRule.questionId',
      min: 'rules.newRule.min',
      max: 'rules.newRule.max',
      validSum: 'rules.newRule.validSum',
      questionIds: 'rules.newRule.questionIds',
      questionIds1: 'rules.newRule.questionIds1',
      questionIds2: 'rules.newRule.questionIds2',
      questionId1: 'rules.newRule.questionId1',
      questionId2: 'rules.newRule.questionId2',
      answerId1: 'rules.newRule.answerId1',
      answerId2: 'rules.newRule.answerId2',
      tempQuestionId: 'rules.newRule.tempQuestionId',
      tempAnswerId: 'rules.newRule.tempAnswerId',
      incompatQuestionId: 'rules.newRule.incompatQuestionId',
      incompatAnswerId: 'rules.newRule.incompatAnswerId',

/*

  rules: {
  
  
    delete: 'rules.delete',
    }
                         */

    }}};

export const sub_ids = {
  currentStep: 'currentStep',
  modal: 'modal',
  projectSource: 'projectSource',
  overview: {projectName: 'overview.projectName',
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
  projectDetails: 'projectDetails',
  rules: {rules: 'rules',
          search: 'rules.search',
          filter: 'rules.filter',
          selectedRuleType: 'rules.selectedRuleType',
          newRule: {
            label: 'rules.newRule.label',
            answers: 'rules.newRule.answers',
            regex: 'rules.newRule.regex',            
            min: 'rules.newRule.min',
            max: 'rules.newRule.max',
            validSum: 'rules.newRule.validSum',
            questionId: 'rules.newRule.questionId',
            questionIds: 'rules.newRule.questionIds',
            questionIds1: 'rules.newRule.questionIds1',
            questionIds2: 'rules.newRule.questionIds2',
            questionId1: 'rules.newRule.questionId1',
            questionId2: 'rules.newRule.questionId2',
            answerId1: 'rules.newRule.answerId1',
            answerId2: 'rules.newRule.answerId2',
            tempQuestionId: 'rules.newRule.tempQuestionId',
            tempAnswerId: 'rules.newRule.tempAnswerId',
            incompatQuestionId: 'rules.newRule.incompatQuestionId',
            incompatAnswerId: 'rules.newRule.incompatAnswerId',
          }},
  questions: {questions: 'questions'},
};

export const effects = {};

regSub(sub_ids.currentStep, sub_ids.currentStep);
regSub(sub_ids.modal, sub_ids.modal);
regSub(sub_ids.projectSource, sub_ids.projectSource);

regSub(sub_ids.overview.projectType, sub_ids.overview.projectType);
regSub(sub_ids.overview.projectName, sub_ids.overview.projectName);
regSub(sub_ids.overview.projectDescription, sub_ids.overview.projectDescription);
regSub(sub_ids.overview.learningMaterial, sub_ids.overview.learningMaterial);
regSub(sub_ids.overview.visibility, sub_ids.overview.visibility);
regSub(sub_ids.overview.projectOptions.gee, sub_ids.overview.projectOptions.gee);
regSub(sub_ids.overview.projectOptions.extraPlotColumns, sub_ids.overview.projectOptions.extraPlotColumns);
regSub(sub_ids.overview.projectOptions.plotConfidence, sub_ids.overview.projectOptions.plotConfidence);
regSub(sub_ids.overview.projectOptions.autoGeo, sub_ids.overview.projectOptions.autoGeo);

regSub(sub_ids.questions.questions, sub_ids.questions.questions);

regSub(sub_ids.rules.rules, sub_ids.rules.rules);
regSub(sub_ids.rules.search, sub_ids.rules.search);
regSub(sub_ids.rules.filter, sub_ids.rules.filter);
regSub(sub_ids.rules.selectedRuleType, sub_ids.rules.selectedRuleType);
regSub(sub_ids.rules.newRule.label, sub_ids.rules.newRule.label);
regSub(sub_ids.rules.newRule.answers, sub_ids.rules.newRule.answers);
regSub(sub_ids.rules.newRule.regex, sub_ids.rules.newRule.regex);
regSub(sub_ids.rules.newRule.min, sub_ids.rules.newRule.min);
regSub(sub_ids.rules.newRule.max, sub_ids.rules.newRule.max);
regSub(sub_ids.rules.newRule.validSum, sub_ids.rules.newRule.validSum);
regSub(sub_ids.rules.newRule.questionId, sub_ids.rules.newRule.questionId);
regSub(sub_ids.rules.newRule.questionIds, sub_ids.rules.newRule.questionIds);
regSub(sub_ids.rules.newRule.questionId1, sub_ids.rules.newRule.questionId1);
regSub(sub_ids.rules.newRule.questionId2, sub_ids.rules.newRule.questionId2);
regSub(sub_ids.rules.newRule.questionIds1, sub_ids.rules.newRule.questionIds1);
regSub(sub_ids.rules.newRule.questionIds2, sub_ids.rules.newRule.questionIds2);
regSub(sub_ids.rules.newRule.answerId1, sub_ids.rules.newRule.answerId1);
regSub(sub_ids.rules.newRule.answerId2, sub_ids.rules.newRule.answerId2);
regSub(sub_ids.rules.newRule.tempQuestionId, sub_ids.rules.newRule.tempQuestionId);
regSub(sub_ids.rules.newRule.tempAnswerId, sub_ids.rules.newRule.tempAnswerId);
regSub(sub_ids.rules.newRule.incompatQuestionId, sub_ids.rules.newRule.incompatQuestionId);
regSub(sub_ids.rules.newRule.incompatAnswerId, sub_ids.rules.newRule.incompatAnswerId);


regEvent(event_ids.projectDetails,
         ({ draftDb }, projectDetails) => {
           draftDb[sub_ids.projectDetails] = projectDetails;
         });

regEvent(event_ids.currentStep,
         ({ draftDb }, currentStep) => {
           draftDb[sub_ids.currentStep] = currentStep;
         });

// PROJECT WIZARD EVENTS

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

regEvent(event_ids.rules.selectedRuleType,
         ({ draftDb }, selectedRuleType) => {
           draftDb[sub_ids.rules.selectedRuleType] = selectedRuleType;
         });

regEvent(event_ids.rules.rules,
         ({ draftDb }, newRule) => {
           draftDb[sub_ids.rules.rules].push(newRule);
         });

regEvent(event_ids.rules.newRule.regex,
         ({ draftDb }, regex) => {
           draftDb[sub_ids.rules.newRule.regex] = regex;
         });

regEvent(event_ids.rules.newRule.questionId,
         ({ draftDb }, questionId) => {
           draftDb[sub_ids.rules.newRule.questionId] = questionId;
         });

regEvent(event_ids.rules.search,
         ({ draftDb }, search) => {
           draftDb[event_ids.rules.search] = search;
         });

regEvent(event_ids.rules.filter,
         ({ draftDb }, filter) => {
           draftDb[event_ids.rules.filter] = filter;
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

regEvent(event_ids.rules.newRule.validSum,
         ({ draftDb }, validSum) => {
           draftDb[sub_ids.rules.newRule.validSum] = validSum;
         });

regEvent(event_ids.rules.newRule.questionIds,
         ({ draftDb }, questionIds) => {
           draftDb[sub_ids.rules.newRule.questionIds] = questionIds;
         });

regEvent(event_ids.rules.newRule.questionIds1,
         ({ draftDb }, questionIds1) => {
           draftDb[sub_ids.rules.newRule.questionIds1] = questionIds1;
         });

regEvent(event_ids.rules.newRule.questionIds2,
         ({ draftDb }, questionIds2) => {
           draftDb[sub_ids.rules.newRule.questionIds2] = questionIds2;
         });

regEvent(event_ids.rules.newRule.questionId1,
         ({ draftDb }, questionId1) => {
           draftDb[sub_ids.rules.newRule.questionId1] = questionId1;
         });

regEvent(event_ids.rules.newRule.questionId2,
         ({ draftDb }, questionId2) => {
           draftDb[sub_ids.rules.newRule.questionId2] = questionId2;
         });

regEvent(event_ids.rules.newRule.answerId1,
         ({ draftDb }, answerId1) => {
           draftDb[sub_ids.rules.newRule.answerId1] = answerId1;
         });

regEvent(event_ids.rules.newRule.answerId2,
         ({ draftDb }, answerId2) => {
           draftDb[sub_ids.rules.newRule.answerId2] = answerId2;
         });

regEvent(event_ids.rules.newRule.answers,
         ({ draftDb }, answers) => {
           draftDb[sub_ids.rules.newRule.answers] = answers;
         });

regEvent(event_ids.rules.newRule.tempQuestionId,
         ({ draftDb }, tempQuestionId) => {
           draftDb[sub_ids.rules.newRule.tempQuestionId] = tempQuestionId;
         });

regEvent(event_ids.rules.newRule.tempAnswerId,
         ({ draftDb }, tempAnswerId) => {
           draftDb[sub_ids.rules.newRule.tempAnswerId] = tempAnswerId;
         });

regEvent(event_ids.rules.newRule.incompatQuestionId,
         ({ draftDb }, incompatQuestionId) => {
           draftDb[sub_ids.rules.newRule.incompatQuestionId] = incompatQuestionId;
         });

regEvent(event_ids.rules.newRule.incompatAnswerId,
         ({ draftDb }, incompatAnswerId) => {
           draftDb[sub_ids.rules.newRule.incompatAnswerId] = incompatAnswerId;
         });



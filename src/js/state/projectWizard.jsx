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
  //overview.projectOptions
  'overview.projectOptions.gee': false,
  'overview.projectOptions.extraPlotColumns': false,
  'overview.projectOptions.plotConfidence': false,
  'overview.projectOptions.autoGeo': false,
  imagery: [],
  boundary: [],
  plots: [],
  samples: [],
  questions: [],
  //rules
  'rules.search': '',
  'rules.filter': null,
  //rules.newRule
  'rules.newRule.type': null,
  'rules.newRule.label': '',
  'rules.newRule.question': null,
  'rules.newRule.pattern': '',
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
  rules: {search: 'rules.search',
          filter: 'rules.filter',
          newRule: {label: 'rules.newRule.label',
                    type: 'rules.newRule.type',
                    question: 'rules.newRule.question',
                    pattern: 'rules.newRule.pattern'}}};

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
  rules: {search: 'rules.search',
          filter: 'rules.filter',
          newRule: {label: 'rules.newRule.label',
                    type: 'rules.newRule.type',
                    question: 'rules.newRule.question',
                    pattern: 'rules.newRule.pattern'}}};

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
regSub(sub_ids.rules.search, sub_ids.rules.search);
regSub(sub_ids.rules.filter, sub_ids.rules.filter);
regSub(sub_ids.rules.newRule.type , sub_ids.rules.newRule.type);
regSub(sub_ids.rules.newRule.label , sub_ids.rules.newRule.label);
regSub(sub_ids.rules.newRule.question , sub_ids.rules.newRule.question);
regSub(sub_ids.rules.newRule.pattern , sub_ids.rules.newRule.pattern);


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
           draftDb[event_ids.rules.newRule.type] = type;
         });

regEvent(event_ids.rules.newRule.label,
         ({ draftDb }, label) => {
           draftDb[event_ids.rules.newRule.label] = label;
         });

regEvent(event_ids.rules.newRule.question,
         ({ draftDb }, question) => {
           draftDb[event_ids.rules.newRule.question] = question;
         });

regEvent(event_ids.rules.newRule.pattern,
         ({ draftDb }, pattern) => {
           draftDb[event_ids.rules.newRule.pattern] = pattern;
         });



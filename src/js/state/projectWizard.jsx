import { atom } from "jotai";
import { initAppDb , regEvent , regEffect , dispatch , regSub , current } from '@flexsurfer/reflex';
import _ from 'lodash';


const projectWizardState = {
  projectSource: null, // 'newProject' | 'importProject' | 'templateProject'
  overview: {projectName: '',
             projectDescription: '',
             projectType: null, // 'simplified' | 'regular'
             learningMaterial: '',
             visibility: null, // 'public' | 'users' | 'institution' | 'private'
             projectOptions: {
               gee: false,
               extraPlotColumns: false,
               plotConfidence: false,
               autoGeo: false
             }},
  imagery: [],
  boundary: [],
  plots: [],
  samples: [],
  questions: [],
  rules: []  
};
export const projectWizardAtom = atom(projectWizardState);

export const event_ids = {
  currentStep: 'currentStep',
  modal: 'modal',
  UPDATE_PATH: 'update-path',
  PRINT_DB: 'print-db',
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
             }}};

export const sub_ids = {
  currentStep: 'currentStep',
  modal: 'modal',
  GET_PATH: 'get-path',
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
             }}};

export const effects = {};

initAppDb(
  {
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
    rules: []  
  }
);


regEvent(event_ids.UPDATE_PATH, ({ draftDb }, path, value)=>{
  _.set(draftDb, path, current(value));
});

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
           console.log('project name event fires', projectName);
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


regSub(sub_ids.GET_PATH,
       ({ draftDb }, path) => {
         return _.get(draftDb, path);
       }, () => []);


regEvent(event_ids.PRINT_DB, ({ draftDb })=>{
  console.log(_.get(draftDb, 'overview.projectName'));  
});







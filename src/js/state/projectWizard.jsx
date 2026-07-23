import { atom } from "jotai";
import _ from 'lodash';
import { initAppDb , regEvent , regEffect , dispatch , regSub , current } from '@flexsurfer/reflex';

import { validateOverview,
         validateImagery,
         validatePlots,
         validateSamples,
         validateQuestions,
         validateWizard,
         validateStep,
       } from "../wizard/validation";



//TODO: Delete unused jotai-style atoms
//vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv

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


export const rulesAtom = atom([]);
export const previewSelectedSampleIdAtom = atom(1);
export const previewUserSamplesAtom = atom({});

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^


const projectWizardDb = {
  institutionId: -1,
  errors: [],
  currentStep: null,
  modal: null,
  projectSource: null,
  templateProjectId: -1,
  projectId: -1,
  projectDraftId: -1,
  useTemplatePlots: false,
  useTemplateWidgets: false,
  invalidSteps: [],
  // overview
  'overview.projectName': '',
  'overview.projectDescription': '',
  'overview.projectType': 'regular',
  'overview.learningMaterial': '',
  'overview.visibility': 'institution',
  // overview.projectOptions
  'overview.projectOptions.gee': false,
  'overview.projectOptions.extraPlotColumns': false,
  'overview.projectOptions.plotConfidence': false,
  'overview.projectOptions.autoGeo': true,
  'overview.projectOptions.plotSimilarity': false,
  'overview.useTemplatePlots': false,
  'imagery.imageryList': [],
  'imagery.previewId': '',
  'institutionImagery': [],
  // boundary
  'boundary.generationMethod': 'manual',
  'boundary.aoiFeatures': [],
  'boundary.aoiFileName': '',
  // plots
  'plots.plots': [],
  'plots.plotDistribution': 'random',
  'plots.numPlots': '',
  'plots.plotSize': '',
  'plots.plotShape': 'circle',
  'plots.plotSpacing': null,
  'plots.shufflePlots': false,
  'plots.totalPlots': 0,
  'plots.plotFeatures': [],
  'plots.plotFileName': '',
  'plots.plotFileBase64': '',
  'plots.referencePlotId': -1,
  'plots.similariyYears': null,
  'plots.designSettings': {
    sampleGeometries : {points:   true,                                       
                        lines:    true,
                        polygons :true},
    userAssignment:    {userMethod:  "none",
                        users:      [],
                        percents:   []},
    qaqcAssignment:   {qaqcMethod:     "none",
                       percent:        0,
                       smes :          [],
      timesToReview : 2}},
  'plots.plotSimilarityDetails': { referencePlotId: "", years: [] },
  // samples
  'samples.sampleDistribution': 'random',
  'samples.samplesPerPlot': 1,
  'samples.sampleResolution': 0,
  'samples.sampleFileName': '',
  'samples.sampleFeautres': [],
  'samples.allowDrawnSamples': false,
  'samples.sampleFileBase64': '',
  'questions': {},
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
  'rules.newRule.answers': [],
  'institution.users': []
};

initAppDb(projectWizardDb);

export const event_ids = {
  institutionId: 'institutionId',
  templateProject: 'templateProject',
  draftProject: 'draftProject',
  editProject: 'editProject',
  submitForm: 'submitForm',
  saveDraft: 'saveDraft',
  errors: 'errors',
  continueHandler: 'continueHandler',
  validate: 'validate',
  currentStep: 'currentStep',
  modal: 'modal',
  projectSource: 'projectSource',
  successResponse: 'successReponse',
  overview: {projectName: 'overview.projectName',
             projectDescription: 'overview.projectDescription',
             projectType: 'overview.projectType',
             learningMaterial: 'overview.learningMaterial',
             visibility: 'overview.visibility',
             useTemplatePlots: 'overview.useTemplatePlots',
             useTemplateWidgets: 'overview.useTemplateWidgets',
             projectOptions: {
               gee: 'overview.projectOptions.gee',
               extraPlotColumns: 'overview.projectOptions.extraPlotColumns',
               plotConfidence: 'overview.projectOptions.plotConfidence',
               autoGeo: 'overview.projectOptions.autoGeo',
               plotSimilarity: 'overview.projectOptions.plotSimilarity',
             }},
  projectDetails: 'projectDetails',
  imagery: {
    imageryList: 'imagery.imageryList',
    previewId: 'imagery.previewId'
  },
  boundary: {
    generationMethod: 'boundary.generationMethod',
    aoiFeatures: 'boundary.aoiFeatures',
    aoiFileName: 'boundary.aoiFileName',
    clearBoundary: 'boundary.clearBoundary',
    setBoundaryFromFile: 'boundary.setBoundaryFromFile'
  },
  plots: {
    plots: 'plots.plots',
    plotDistribution: 'plots.plotDistribution',
    numPlots: 'plots.numPlots',
    plotSize: 'plots.plotSize',
    plotShape: 'plots.plotShape',
    plotSpacing: 'plots.plotSpacing',
    shufflePlots: 'plots.shufflePlots',
    totalPlots: 'plots.totalPlots',
    plotFeatures: 'plots.plotFeatures',
    plotFileName: 'plots.plotFileName',
    plotFileBase64: 'plots.plotFileBase64',
    designSettings: 'plots.designSettings',
    plotSimilarityDetails: 'plots.plotSimilarityDetails'
  },
  samples: {
    sampleDistribution: 'samples.sampleDistribution',
    samplesPerPlot: 'samples.samplesPerPlot',
    sampleResolution: 'samples.sampleResolution',
    sampleFileName: 'samples.sampleFileName',
    sampleFileBase64: 'samples.sampleFileBase64',
    allowDrawnSamples: 'samples.allowDrawnSamples'
  },
  questions: {
    addQuestion: 'addQuestion',
    setQuestions: 'setQuestions',
    updateQuestion: 'updateQuestion',
    updateAnswer: 'updateAnswer',
    moveQuestion: 'moveQuestion'},
  rules: {
    rules: 'rules',
    removeRule: 'rules.removeRule',
    search: 'rules.search',
    filter: 'rules.filter',
    selectedRuleType: 'rules.selectedRuleType',
    newRule: {
      label: 'rules.newRule.label',
      answers: 'rules.newRule.answers',
      addAnswer: 'rules.newRule.addAnswer',
      removeAnswer: 'rules.newRule.removeAnswer',
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
    }},
    institution: {
      users: 'institution.users',
      imagery: 'institutionImagery'}};

export const sub_ids = {
  institutionId: 'institutionId',
  errors: 'errors',
  projectId : 'projectId',
  projectDraftId: 'projectDraftId',
  currentStep: 'currentStep',
  modal: 'modal',
  projectSource: 'projectSource',
  successResponse: 'successReponse',
  templateProjectId: 'templateProjectId',
  useTemplatePlots: 'useTemplatePlots',
  useTemplateWidgets: 'useTemplateWidgets',
  validStep: 'validStep',
  invalidSteps: 'invalidSteps',
  overview: {projectName: 'overview.projectName',
             projectDescription: 'overview.projectDescription',
             projectType: 'overview.projectType',
             learningMaterial: 'overview.learningMaterial',
             visibility: 'overview.visibility',
             useTemplatePlots: 'overview.useTemplatePlots',
             useTemplateWidgets: 'overview.useTemplateWidgets',
             projectOptions: {
               gee: 'overview.projectOptions.gee',
               extraPlotColumns: 'overview.projectOptions.extraPlotColumns',
               plotConfidence: 'overview.projectOptions.plotConfidence',
               autoGeo: 'overview.projectOptions.autoGeo',
               plotSimilarity: 'overview.projectOptions.plotSimilarity',
             }},
  projectDetails: 'projectDetails',
  imagery: {
    imageryList: 'imagery.imageryList',
    previewId: 'imagery.previewId'},
  boundary: {
    generationMethod: 'boundary.generationMethod',
    aoiFeatures: 'boundary.aoiFeatures',
    aoiFileName: 'boundary.aoiFileName'
  },
  plots: {
    plots: 'plots.plots',
    plotDistribution: 'plots.plotDistribution',
    numPlots: 'plots.numPlots',
    plotSize: 'plots.plotSize',
    plotShape: 'plots.plotShape',
    plotSpacing: 'plots.plotSpacing',
    shufflePlots: 'plots.shufflePlots',
    totalPlots: 'plots.totalPlots',
    plotFeatures: 'plots.plotFeatures',
    plotFileName: 'plots.plotFileName',
    plotFileBase64: 'plots.plotFileBase64',
    designSettings: 'plots.designSettings',
    plotSimilarityDetails: 'plots.plotSimilarityDetails'
  },
  samples: {
    sampleDistribution: 'samples.sampleDistribution',
    samplesPerPlot: 'samples.samplesPerPlot',
    sampleResolution: 'samples.sampleResolution',
    sampleFileName: 'samples.sampleFileName',
    sampleFileBase64: 'samples.sampleFileBase64',
    allowDrawnSamples: 'samples.allowDrawnSamples'
  },
  questions: {
    questions: 'questions'
  },
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
  institution: {
    imagery: 'institutionImagery',
    users: 'institution.users'}
};

export const effects = {};

regSub(sub_ids.currentStep, sub_ids.currentStep);
regSub(sub_ids.modal, sub_ids.modal);
regSub(sub_ids.projectSource, sub_ids.projectSource);
regSub(sub_ids.errors, sub_ids.errors);
regSub(sub_ids.successResponse, sub_ids.successResponse);
regSub(sub_ids.institutionId, sub_ids.institutionId);
regSub(sub_ids.templateProjectId, sub_ids.templateProjectId);
regSub(sub_ids.useTemplatePlots, sub_ids.useTemplatePlots);
regSub(sub_ids.useTemplateWidgets, sub_ids.useTemplateWidgets);

regSub(sub_ids.overview.projectType, sub_ids.overview.projectType);
regSub(sub_ids.overview.projectName, sub_ids.overview.projectName);
regSub(sub_ids.overview.projectDescription, sub_ids.overview.projectDescription);
regSub(sub_ids.overview.learningMaterial, sub_ids.overview.learningMaterial);
regSub(sub_ids.overview.visibility, sub_ids.overview.visibility);
regSub(sub_ids.overview.projectOptions.gee, sub_ids.overview.projectOptions.gee);
regSub(sub_ids.overview.projectOptions.extraPlotColumns, sub_ids.overview.projectOptions.extraPlotColumns);
regSub(sub_ids.overview.projectOptions.plotConfidence, sub_ids.overview.projectOptions.plotConfidence);
regSub(sub_ids.overview.projectOptions.autoGeo, sub_ids.overview.projectOptions.autoGeo);
regSub(sub_ids.overview.useTemplatePlots, sub_ids.overview.useTemplatePlots);
regSub(sub_ids.overview.useTemplateWidgets, sub_ids.overview.useTemplateWidgets);
regSub(sub_ids.overview.projectOptions.plotSimilarity, sub_ids.overview.projectOptions.plotSimilarity);

//imagery
regSub(sub_ids.imagery.imageryList, sub_ids.imagery.imageryList);
regSub(sub_ids.imagery.previewId, sub_ids.imagery.imageryId);

// boundary
regSub(sub_ids.boundary.generationMethod, sub_ids.boundary.generationMethod);
regSub(sub_ids.boundary.aoiFeatures, sub_ids.boundary.aoiFeatures);
regSub(sub_ids.boundary.aoiFileName, sub_ids.boundary.aoiFileName);

// plots
regSub(sub_ids.plots.plots, sub_ids.plots.plots);
regSub(sub_ids.plots.plotDistribution, sub_ids.plots.plotDistribution);
regSub(sub_ids.plots.numPlots, sub_ids.plots.numPlots);
regSub(sub_ids.plots.plotSize, sub_ids.plots.plotSize);
regSub(sub_ids.plots.plotShape, sub_ids.plots.plotShape);
regSub(sub_ids.plots.plotSpacing, sub_ids.plots.plotSpacing);
regSub(sub_ids.plots.shufflePlots, sub_ids.plots.shufflePlots);
regSub(sub_ids.plots.totalPlots, sub_ids.plots.totalPlots);
regSub(sub_ids.plots.plotFeatures, sub_ids.plots.plotFeatures);
regSub(sub_ids.plots.plotFileName, sub_ids.plots.plotFileName);
regSub(sub_ids.plots.plotFileBase64, sub_ids.plots.plotFileBase64);
regSub(sub_ids.plots.designSettings, sub_ids.plots.designSettings);
regSub(sub_ids.plots.plotSimilarityDetails, sub_ids.plots.plotSimilarityDetails);

// samples
regSub(sub_ids.samples.sampleDistribution, sub_ids.samples.sampleDistribution);
regSub(sub_ids.samples.samplesPerPlot, sub_ids.samples.samplesPerPlot);
regSub(sub_ids.samples.sampleResolution, sub_ids.samples.sampleResolution);
regSub(sub_ids.samples.sampleFileName, sub_ids.samples.sampleFileName);
regSub(sub_ids.samples.allowDrawnSamples, sub_ids.samples.allowDrawnSamples);
regSub(sub_ids.samples.sampleFileBase64, sub_ids.samples.sampleFileBase64);

regSub(sub_ids.questions.questions, sub_ids.questions.questions);

// rules
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

// institution
regSub(sub_ids.institution.users, sub_ids.institution.users);
regSub(sub_ids.institution.imagery, sub_ids.institution.imagery);

regSub(sub_ids.invalidSteps, sub_ids.invalidSteps);

regEvent(event_ids.projectDetails, ({ draftDb }, projectDetails) => {
  draftDb[sub_ids.projectDetails] = projectDetails;
});


regEvent(event_ids.errors, ({ draftDb }, errors) => {
  draftDb[sub_ids.errors] = errors;
  draftDb[sub_ids.modal] = 'error';
});

regEvent(event_ids.institutionId, ({ draftDb }, institutionId )=> {
  draftDb[sub_ids.institutionId] = institutionId;
});

// PROJECT WIZARD EVENTS

regEvent(event_ids.draftProject, ({ draftDb }, draftId) => {
  function getProjectDraftById(projectDraftId) {
    fetch(`/get-project-draft-by-id?projectDraftId=${projectDraftId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (!data) {
          dispatch([event_ids.errors, [['server', ["No draft found with ID " + projectDraftId + "."]]]]);
          return Promise.resolve();
        } else {
          dispatch([event_ids.templateProject, data]);
          return Promise.resolve();
        }
      }).catch(() => {
        dispatch([event_ids.errors [['server', ["No draft found with ID " + projectDraftId + "."]]]]);
        
      });
  }
  getProjectDraftById(draftId);
  dispatch([event_ids.modal, null]);
  dispatch([event_ids.currentStep, 'review']);
});

regEvent(event_ids.editProject, ({ draftDb }, projectId) => {
  function getProjectById(projectId) {
    fetch(`/get-project-by-id?projectId=${projectId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (!data) {
          dispatch([event_ids.errors, [['server', ["No draft found with ID " + projectDraftId + "."]]]]);
          return Promise.resolve();
        } else {
          dispatch([event_ids.templateProject, data]);
          return Promise.resolve();
        }
      }).catch(() => {
        dispatch([event_ids.errors [['server', ["No draft found with ID " + projectDraftId + "."]]]]);
      });
  }
  getProjectById(projectId);
  dispatch([event_ids.modal, null]);
  dispatch([event_ids.currentStep, 'review']);
});


export function buildProject (draftDb, sub_ids) {
  const projectId = -1; //TODO
  const plotDistribution = current(draftDb[sub_ids.plots.plotDistribution]);
  const originalProject = {plotDistribution: ''}; //TODO
  const useTemplatePlots = current(draftDb[sub_ids.overview.useTemplatePlots]);
  const plotFileNeeded = !useTemplatePlots &&
        (projectId === -1 || plotDistribution !== originalProject.plotDistribution);
  const name = current(draftDb[sub_ids.overview.projectName]);
  const description= current(draftDb[sub_ids.overview.projectDescription]);
  const privacyLevel = current(draftDb[sub_ids.overview.visibility]);
  const imageryId = current(draftDb[sub_ids.imagery.imageryList])[0];
  const aoiFeatures = current(draftDb[sub_ids.boundary.aoiFeatures]);
  const numPlots = current(draftDb[sub_ids.plots.numPlots]);
  const designSettings = current(draftDb[sub_ids.plots.designSettings]);
  const totalPlots = current(draftDb[sub_ids.plots.totalPlots]);
  const allowDrawnSamples = current(draftDb[sub_ids.samples.allowDrawnSamples]);
  const samplesPerPlot = current(draftDb[sub_ids.samples.samplesPerPlot]);
  const plotShape = current(draftDb[sub_ids.plots.plotShape]);
  const sampleDistribution = current(draftDb[sub_ids.samples.sampleDistribution]);
  const sampleFileName = current(draftDb[sub_ids.samples.sampleFileName]);
  const sampleResolution = current(draftDb[sub_ids.samples.sampleResolution]);
  const surveyQuestions = current(draftDb[sub_ids.questions.questions]);
  const plotSize = current(draftDb[sub_ids.plots.plotSize]);
  const projectImageryList = current(draftDb[sub_ids.imagery.imageryList]);
  const aoiFileName = current(draftDb[sub_ids.boundary.aoiFileName]);
  const type = current(draftDb[sub_ids.overview.projectType]);
  const projectOptions = current(draftDb[sub_ids.overview.projectOptions]);
  const plotSpacing = Number(current(draftDb[sub_ids.plots.plotSpacing]));
  const shufflePlots = current(draftDb[sub_ids.plots.shufflePlots]);
  const surveyRules = current(draftDb[sub_ids.rules.rules]);
  const plotFileName = current(draftDb[sub_ids.plots.plotFileName]);
  const plotFileBase64 = current(draftDb[sub_ids.plots.plotFileBase64]);
  const sampleFileBase64 = current(draftDb[sub_ids.samples.sampleFileBase64]);

  return {name ,
	  description,
	  privacyLevel,
	  imageryId,
	  aoiFeatures,
	  plotDistribution,
	  numPlots,

          projectImageryList,
          aoiFileName,
          type,
          projectOptions,
          plotSpacing,
          shufflePlots,
          surveyRules,
          plotFileName,
          plotFileBase64,
          sampleFileBase64,
          
          //TODO: are we using these values for validation?
	  useTemplatePlots,
          //originalProject: TODO!!!
          
	  designSettings,
	  totalPlots,
          plotSize,
	  plotFileNeeded ,
	  allowDrawnSamples  ,
	  samplesPerPlot,
	  plotShape ,
	  sampleDistribution ,
	  sampleFileName ,
	  sampleResolution  ,
	  surveyQuestions: Object.entries(surveyQuestions).reduce((acc, [idx, val])=>{
            return {...acc, [idx]: val};
          }, {}) };
}

regEvent(event_ids.currentStep, ({ draftDb }, currentStep) => {
  let prevStep = draftDb[sub_ids.currentStep];
  let validStep = prevStep && validateStep[prevStep].call(this, buildProject(draftDb, sub_ids));
  validStep && draftDb[sub_ids.invalidSteps].push(prevStep);
  draftDb[sub_ids.currentStep] = currentStep;
});


regEvent(event_ids.validate, ({ draftDb }, step='wizard') => {
  const form = buildProject(draftDb, sub_ids);

  switch (step) {
  case 'overview' : {    
    const errors = validateOverview(form).filter((e)=>e);
    errors.length && dispatch([event_ids.errors, [['overview', errors]]]);
    break;}
  case 'imagery': {
    const errors = validateImagery(form).filter((e)=>e);
    errors.length && dispatch([event_ids.errors, [['imagery', errors]]]);
  break;}
  case 'plots' : {
    const errors = validatePlots(form).filter((e)=>e);
    errors.length && dispatch([event_ids.errors, [['plots', errors]]]);
  break;}
  case 'samples' : {
    const errors = validateSamples(form).filter((e)=>e);
    errors.length && dispatch([event_ids.errors, [['samples', errors]]]);
  break;}
  case 'questions' : {
    const errors = validateQuestions(form).filter((e)=>e);
    errors.length && dispatch([event_ids.errors, [['questions', errors]]]);
  break;}
  case 'review' : {
    const errors = validateWizard(form);
    errors && dispatch([event_ids.errors, errors]);
    break;}
  case 'wizard' : {
    const errors = validateWizard(form);
    errors.length ? dispatch([event_ids.errors, errors]) : dispatch([event_ids.currentStep, 'review']);
    !errors.length && dispatch([event_ids.modal, null]);
    break;}
  default : 
    dispatch([event_ids.errors, [['Navigation', ['Your browser experienced a client error. please refresh the page.']]]]);
  }
});

regEvent(event_ids.continueHandler, ({ draftDb }, currentStep) => {
  
  const form = buildProject(draftDb, sub_ids);

  switch (currentStep) {
  case 'overview' : {    
    const errors = validateOverview(form).filter((e)=>e);
    errors.length ? dispatch([event_ids.errors, [['overview', errors]]]) :
      dispatch([event_ids.currentStep, 'imagery']);
    break;}
  case 'imagery': {
    const errors = validateImagery(form).filter((e)=>e);
    errors.length ? dispatch([event_ids.errors, [['imagery', errors]]]) 
      : dispatch([event_ids.currentStep, 'boundary']) ;
  break;}
  case 'boundary' : {
    dispatch([event_ids.currentStep,  'plots']);
  break;}
  case 'plots' : {
    const errors = validatePlots(form).filter((e)=>e);
    errors.length ? dispatch([event_ids.errors, [['plots', errors]]]) 
      : dispatch([event_ids.currentStep, 'samples']);
  break;}
  case 'samples' : {
    const errors = validateSamples(form).filter((e)=>e);
    errors.length ? dispatch([event_ids.errors, [['samples', errors]]]) 
      : dispatch([sub_ids.currentStep, 'questions']);
  break;}
  case 'questions' : {
    const errors = validateQuestions(form).filter((e)=>e);
    errors.length ? dispatch([event_ids.errors, [['questions', errors]]]) 
      : dispatch([sub_ids.currentStep, 'rules']);
  break;}
  case 'rules' : {
    dispatch([sub_ids.currentStep, 'review']);
  break;}
  case 'review' : {
    const errors = validateWizard(form);
    errors ? dispatch([event_ids.errors, errors])
      : draftDb[sub_ids.modal] = 'review';
  break;}
  default : 
    dispatch([event_ids.errors, [['Navigation', ['Your browser experienced a client error. please refresh the page.']]]]);    
  }
});

regEvent(event_ids.templateProjectId, ({ draftDb }, templateProjectId) => {
  draftDb[sub_ids.templateProjectId] = templateProjectId;
});

regEvent(event_ids.overview.useTemplateWidgets, ({ draftDb }, useTemplateWidgets) => {
  draftDb[sub_ids.overview.useTemplateWidgets] = useTemplateWidgets;
});

regEvent(event_ids.templateProject, ({ draftDb }, {
  allowDrawnSamples,
  aoiFeatures,
  aoiFileName,
  description,
  designSettings = {},
  learningMaterial = '',
  name,
  numPlots = 0, //?
  plotDistribution,
  plotfileName,
  plotShape,
  plotSize,
  plotSpacing = -1, //?
  projectOptions = {gee : false, extraPlotColumns: false, plotConfidence: false, autoGeo: false},
  projectType = 'regular',
  referencePlot = -1,
  sampleDistribution,
  sampleFileName,
  sampleResolution,
  samplesPerPlot,
  surveyQuestions,
  surveyRules = [],
  visibility = 'institution',
  projectImageryList = [],

}) => {
  draftDb[sub_ids.overview.projectName] = name;
  draftDb[sub_ids.overview.projectDescription] = description;
  draftDb[sub_ids.overview.projectType] = projectType;
  draftDb[sub_ids.overview.learningMaterial] = learningMaterial;
  draftDb[sub_ids.overview.visibility] = visibility;
  draftDb[sub_ids.projectOptions] = {gee:projectOptions.showGEEScript, 
                                     extraPlotColumns: projectOptions.showPlotInformation,
                                     plotConfidence: projectOptions.collectConfidence,
    autoGeo: projectOptions.autoLaunchGeoDash};
  draftDb[sub_ids.imagery.imageryList] = projectImageryList;
  draftDb[sub_ids.boundary.generationMethod] = 'manual';
  draftDb[sub_ids.boundary.aoiFeatures] = aoiFeatures;
  draftDb[sub_ids.boundary.aoiFileName] = aoiFileName;
  draftDb[sub_ids.plots.plotDistribution] = plotDistribution;
  draftDb[sub_ids.plots.numPlots] = Number(numPlots);
  draftDb[sub_ids.plots.plotSize] = Number(plotSize);
  draftDb[sub_ids.plots.plotShape] = plotShape;
  draftDb[sub_ids.plots.plotSpacing] = plotSpacing;
  draftDb[sub_ids.plots.totalPlots] = Number(numPlots);
  draftDb[sub_ids.plots.plotFileName] = plotfileName;
  draftDb[sub_ids.plots.referencePlotId] = Number(referencePlot);
  draftDb[sub_ids.plots.designSettings] = designSettings;
  draftDb[sub_ids.samples.sampleDistribution] = sampleDistribution;
  draftDb[sub_ids.samples.samplesPerPlot] = Number((samplesPerPlot));
  draftDb[sub_ids.samples.sampleResolution] = Number(sampleResolution);
  draftDb[sub_ids.samples.sampleFileName] = sampleFileName;
  draftDb[sub_ids.samples.allowDrawnSamples] = allowDrawnSamples;
  draftDb[sub_ids.questions.questions] = surveyQuestions;
  draftDb[sub_ids.rules.rules] = surveyRules;
});

regEvent(event_ids.saveDraft, ({ draftDb }) => {
  const institutionId = Number(current(draftDb[sub_ids.institutionId]));
  const form = buildProject(draftDb, sub_ids);
  const useTemplateWidgets = current(draftDb[sub_ids.useTemplateWidgets]);
  const useTemplatePlots = current(draftDb[sub_ids.overview.useTemplatePlots]);
  const templateProjectId = current(draftDb[sub_ids.templateProjectId]);
  const projectDraftId = current(draftDb[sub_ids.projectDraftId]);

  function createProjectDraft () {
    fetch("/create-project-draft", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        institutionId ,
        projectTemplate: templateProjectId,
        useTemplatePlots ,
        useTemplateWidgets,
        ...form,
      }),
    })
      .then((response) => Promise.all([response.ok, response.json()]))
      .then((data) => {
        console.log('create project draft request result', data);
        if (data[0] && Number.isInteger(data[1].projectDraftId)) {
          console.log('dispatch success response');
          dispatch([event_ids.modal, 'draft-success']);
          //dispatch([event_ids.successResponse, data[1]]);
          return Promise.resolve();
        } else {          
          let errs = Object.entries(data[1].params).map(([field, message])=>{return (field + "; " + message);});
          dispatch([event_ids.errors, [['server', errs]]]);
          return Promise.reject(data[1]);
        }
      })
      .catch((message) => {
        console.log('create project request errors', message);
        let errs = Object.entries(message.params).map(([field, message])=>{return (field + "; " + message);});
          dispatch([event_ids.errors, [['server', errs]]]);
      });
  }

  function saveProjectDraft () {
    console.log('saving project draft...');
    fetch("/update-project-draft", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        projectDraftId,
        institutionId,
        projectTemplate: templateProjectId,
        useTemplatePlots ,
        useTemplateWidgets ,
        ...form,
      }),
    })
      .then((response) => Promise.all([response.ok, response.json()]))
      .then((data) => {
        console.log('resolving project draft data');
        dispatch([event_ids.successResponse, ['Project Saved', data]]);
        return Promise.resolve();
      })
      .catch((message) => {
        console.log('create project request errors', message);        
        dispatch([event_ids.errors [['server', Object.entries(message.params).map(([field, error]) => field + ": " + error)]]]);
      });
  }

  form.projectId > 0
    ? saveProjectDraft()
    : createProjectDraft();           
});

regEvent(event_ids.submitForm, ({ draftDb }) => {
  const institutionId = Number(current(draftDb[sub_ids.institutionId]));
  const useTemplateWidgets = current(draftDb[sub_ids.useTemplateWidgets]);
  const useTemplatePlots = current(draftDb[sub_ids.overview.useTemplatePlots]);
  const templateProjectId = current(draftDb[sub_ids.templateProjectId]);
  const projectDraftId = current(draftDb[sub_ids.projectDraftId]);
  const similarityDetails = current(draftDb[sub_ids.plots.plotSimilarityDetails]) || {};
  const referencePlotId = similarityDetails.referencePlotId;
  const similarityYears = similarityDetails.years;
  const form = buildProject(draftDb, sub_ids);
  const errors = validateWizard(form);
  
  function submitForm () {
    fetch("/create-project", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        institutionId,
        projectTemplate: templateProjectId,
        useTemplatePlots,
        useTemplateWidgets,
        ...form,
      }),
    })
      .then((response) => Promise.all([response.ok, response.json()]))
      .then((data) => {
        if (data[0] && Number.isInteger(data[1].projectId)) {
          (referencePlotId > 0) && fetch("/start-plot-similarity", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify({
              projectId: data[1].projectId,
              referencePlotId,
              similarityYears,
            })
          });
          dispatch([event_ids.successResponse, data[1]]);
          // window.location = `/review-project?projectId=${data[1].projectId}&institutionId=${this.context.institutionId}`;
          return Promise.resolve();
        } else {
          dispatch([event_ids.errors [['server', Object.entries(data[1].params).map(([field, error]) => field + ": " + error)]]]);
          return Promise.reject(data[1]);
        }
      })
      .catch((message) => dispatch([event_ids.errors [['server', [message]]]]));
  }
  errors ? dispatch([event_ids.errors, errors]) : submitForm();
});

regEvent(event_ids.successResponse, ({ draftDb }, response) => {  
  draftDb[sub_ids.successResponse] = response;
  draftDb[sub_ids.modal] = 'success';
});

regEvent(event_ids.modal, ({ draftDb }, modal, errors) => {
  errors && dispatch([event_ids.validate]);
  draftDb[sub_ids.modal] = modal;
});

regEvent(event_ids.overview.projectType, ({ draftDb }, projectType) => {
  draftDb[sub_ids.overview.projectType] = projectType;
});

regEvent(event_ids.projectSource, ({ draftDb }, projectSource) => {
  draftDb[sub_ids.projectSource] = projectSource;
});

// PROJECT OVERVIEW EVENTS

regEvent(event_ids.overview.projectName, ({ draftDb }, projectName) => {
  draftDb[sub_ids.overview.projectName] = projectName;
});

regEvent(event_ids.overview.projectDescription, ({ draftDb }, projectDescription) => {
  draftDb[sub_ids.overview.projectDescription] = projectDescription;
});

regEvent(event_ids.overview.learningMaterial, ({ draftDb }, learningMaterial) => {
  draftDb[sub_ids.overview.learningMaterial] = learningMaterial;
});

regEvent(event_ids.overview.visibility, ({ draftDb }, visibility) => {
  draftDb[sub_ids.overview.visibility] = visibility;
});

regEvent(event_ids.overview.projectOptions.gee, ({ draftDb }) => {
  draftDb[sub_ids.overview.projectOptions.gee] = !draftDb[sub_ids.overview.projectOptions.gee];
});

regEvent(event_ids.overview.projectOptions.extraPlotColumns, ({ draftDb }) => {
  draftDb[sub_ids.overview.projectOptions.extraPlotColumns] = !draftDb[sub_ids.overview.projectOptions.extraPlotColumns];
});

regEvent(event_ids.overview.projectOptions.plotConfidence, ({ draftDb }) => {
  draftDb[sub_ids.overview.projectOptions.plotConfidence] = !draftDb[sub_ids.overview.projectOptions.plotConfidence];
});

regEvent(event_ids.overview.projectOptions.autoGeo, ({ draftDb }) => {
  draftDb[sub_ids.overview.projectOptions.autoGeo] = !draftDb[sub_ids.overview.projectOptions.autoGeo];
});

regEvent(event_ids.overview.useTemplatePlots, ({ draftDb }, useTemplatePlots)=>{
  draftDb[sub_ids.overview.useTemplatePlots] = useTemplatePlots;
});

regEvent(event_ids.overview.projectOptions.plotSimilarity, ({ draftDb }) => {
  draftDb[sub_ids.overview.projectOptions.plotSimilarity] = !draftDb[sub_ids.overview.projectOptions.plotSimilarity];
});

regEvent(event_ids.imagery.imageryList, ({ draftDb }, imageryList ) => {
  draftDb[sub_ids.imagery.imageryList] = imageryList;
});

regEvent(event_ids.imagery.previewId, ({ draftDb }, previewId) => {
  draftDb[sub_ids.imagery.previewId] = previewId;
});

regEvent(event_ids.questions.addQuestion, ({ draftDb }, nextId, questionToAdd ) => {
  const questions = draftDb[sub_ids.questions.quesions];
  draftDb[sub_ids.questions.questions] = {... questions, [nextId]: questionToAdd};
});

// PROJECT BOUNDARY EVENTS

regEvent(event_ids.boundary.generationMethod, ({ draftDb }, method) => {
  draftDb[sub_ids.boundary.generationMethod] = method;
});

regEvent(event_ids.boundary.aoiFeatures, ({ draftDb }, features) => {
  draftDb[sub_ids.boundary.aoiFeatures] = features;
});

regEvent(event_ids.boundary.setBoundaryFromFile, ({ draftDb }, fileName, geometries) => {
  draftDb[sub_ids.boundary.generationMethod] = 'shpFile';
  draftDb[sub_ids.boundary.aoiFileName] = fileName;
  draftDb[sub_ids.boundary.aoiFeatures] = geometries;
});

regEvent(event_ids.boundary.clearBoundary, ({ draftDb }) => {
  draftDb[sub_ids.boundary.aoiFeatures] = [];
  draftDb[sub_ids.boundary.aoiFileName] = '';
});

// PLOT GENERATION EVENTS
regEvent(event_ids.plots.plots, ({ draftDb }, plots) => {
  draftDb[sub_ids.plots.plots] = plots;
});

regEvent(event_ids.plots.plotDistribution, ({ draftDb }, distribution) => {
  draftDb[sub_ids.plots.plotDistribution] = distribution;
});

regEvent(event_ids.plots.numPlots, ({ draftDb }, count) => {
  draftDb[sub_ids.plots.numPlots] = count;
  draftDb[sub_ids.plots.totalPlots] = count; 
});

regEvent(event_ids.plots.plotSize, ({ draftDb }, size) => {
  draftDb[sub_ids.plots.plotSize] = size;
});

regEvent(event_ids.plots.plotShape, ({ draftDb }, shape) => {
  draftDb[sub_ids.plots.plotShape] = shape;
});

regEvent(event_ids.plots.plotSpacing, ({ draftDb }, spacing) => {
  draftDb[sub_ids.plots.plotSpacing] = spacing;
});

regEvent(event_ids.plots.shufflePlots, ({ draftDb }, shouldShuffle) => {
  draftDb[sub_ids.plots.shufflePlots] = shouldShuffle;
});

regEvent(event_ids.plots.totalPlots, ({ draftDb }, total) => {
  draftDb[sub_ids.plots.totalPlots] = total;
});

regEvent(event_ids.plots.plotFeatures, ({ draftDb }, features) => {
  draftDb[sub_ids.plots.plotFeatures] = features;
});

regEvent(event_ids.plots.plotFileName, ({ draftDb }, plotFileName) => {
  draftDb[sub_ids.plots.plotFileName] = plotFileName;
});

regEvent(event_ids.plots.plotFileBase64, ({ draftDb }, plotFileBase64) => {
  draftDb[sub_ids.plots.plotFileBase64] = plotFileBase64;
});

regEvent(event_ids.plots.designSettings, ({ draftDb }, designSettings) => {
  draftDb[sub_ids.plots.designSettings] = designSettings;
});

regEvent(event_ids.plots.plotSimilarityDetails, ({ draftDb }, details) => {
  draftDb[sub_ids.plots.plotSimilarityDetails] = details;
});

// SAMPLE GENERATION EVENTS
regEvent(event_ids.samples.sampleDistribution, ({ draftDb }, distribution) => {
  draftDb[sub_ids.samples.sampleDistribution] = distribution;
});

regEvent(event_ids.samples.samplesPerPlot, ({ draftDb }, count) => {
  draftDb[sub_ids.samples.samplesPerPlot] = count;
});

regEvent(event_ids.samples.sampleResolution, ({ draftDb }, resolution) => {
  draftDb[sub_ids.samples.sampleResolution] = resolution;
});

regEvent(event_ids.samples.sampleFileName, ({ draftDb }, fileName) => {
  draftDb[sub_ids.samples.sampleFileName] = fileName;
});

regEvent(event_ids.samples.sampleFileBase64, ({ draftDb }, fileBase64) => {
  draftDb[sub_ids.samples.sampleFileBase64] = fileBase64;
});


regEvent(event_ids.samples.allowDrawnSamples, ({ draftDb }, allow) => {
  draftDb[sub_ids.samples.allowDrawnSamples] = allow;
});


regEvent(event_ids.questions.setQuestions, ({ draftDb }, questions ) => {
  draftDb[sub_ids.questions.questions] = questions;
});

regEvent(event_ids.questions.updateQuestion, ({ draftDb }, qId, field, value) => {
  const questions = draftDb[sub_ids.questions.questions];
  const q = questions[qId] || questions[String(qId)] || questions[Number(qId)];
  if (q) {
    q[field] = value;
  }
});

regEvent(event_ids.questions.updateAnswer, ({ draftDb }, qId, aId, field, value) => {
  const questions = draftDb[sub_ids.questions.questions];
  const q = questions[qId] || questions[String(qId)] || questions[Number(qId)];
  if (q && q.answers) {
    const a = q.answers[aId] || q.answers[String(aId)] || q.answers[Number(aId)];
    if (a) {
      a[field] = value;
    }
  }
});

regEvent(event_ids.questions.moveQuestion, ({ draftDb }, id, targetQ, nextId, nextQ) => {
  const questions = draftDb[sub_ids.questions.questions];
  const currentQ = questions[id] || questions[String(id)] || questions[Number(id)];
  const targetNextQ = questions[nextId] || questions[String(nextId)] || questions[Number(nextId)];

  if (currentQ) currentQ.cardOrder = nextQ.cardOrder;
  if (targetNextQ) targetNextQ.cardOrder = targetQ.cardOrder;
});

// RULES EVENTS

regEvent(event_ids.rules.selectedRuleType, ({ draftDb }, selectedRuleType) => {
  draftDb[sub_ids.rules.selectedRuleType] = selectedRuleType;
});

regEvent(event_ids.rules.rules, ({ draftDb }, newRule) => {
  
  draftDb[sub_ids.rules.rules].push({...newRule, label: draftDb[sub_ids.rules.newRule.label]});
});

regEvent(event_ids.rules.removeRule, ({ draftDb }, rid ) => {
  let newRules = draftDb[sub_ids.rules.rules].filter((r) => r.id !== rid);
  draftDb[sub_ids.rules.rules] = newRules;
});

regEvent(event_ids.rules.newRule.label, ({ draftDb }, label) => {
  draftDb[sub_ids.rules.newRule.label] = label;
});

regEvent(event_ids.rules.newRule.regex, ({ draftDb }, regex) => {
  draftDb[sub_ids.rules.newRule.regex] = regex;
});

regEvent(event_ids.rules.newRule.questionId, ({ draftDb }, questionId) => {
  draftDb[sub_ids.rules.newRule.questionId] = questionId;
});

regEvent(event_ids.rules.search, ({ draftDb }, search) => {
  draftDb[sub_ids.rules.search] = search;
});

regEvent(event_ids.rules.filter, ({ draftDb }, filter) => {
  draftDb[sub_ids.rules.filter] = filter;
});

regEvent(event_ids.rules.delete, ({ draftDb }, idx) => {
  draftDb[sub_ids.rules.rules].splice(idx, 1);
});

regEvent(event_ids.rules.newRule.min, ({ draftDb }, min) => {
  draftDb[sub_ids.rules.newRule.min] = min;
});

regEvent(event_ids.rules.newRule.max, ({ draftDb }, max) => {
  draftDb[sub_ids.rules.newRule.max] = max;
});

regEvent(event_ids.rules.newRule.validSum, ({ draftDb }, validSum) => {
  draftDb[sub_ids.rules.newRule.validSum] = validSum;
});

regEvent(event_ids.rules.newRule.questionIds, ({ draftDb }, questionIds) => {
  draftDb[sub_ids.rules.newRule.questionIds] = questionIds;
});

regEvent(event_ids.rules.newRule.questionIds1, ({ draftDb }, questionIds1) => {
  draftDb[sub_ids.rules.newRule.questionIds1] = questionIds1;
});

regEvent(event_ids.rules.newRule.questionIds2, ({ draftDb }, questionIds2) => {
  draftDb[sub_ids.rules.newRule.questionIds2] = questionIds2;
});

regEvent(event_ids.rules.newRule.questionId1, ({ draftDb }, questionId1) => {
  draftDb[sub_ids.rules.newRule.questionId1] = questionId1;
});

regEvent(event_ids.rules.newRule.questionId2, ({ draftDb }, questionId2) => {
  draftDb[sub_ids.rules.newRule.questionId2] = questionId2;
});

regEvent(event_ids.rules.newRule.answerId1, ({ draftDb }, answerId1) => {
  draftDb[sub_ids.rules.newRule.answerId1] = answerId1;
});

regEvent(event_ids.rules.newRule.answerId2, ({ draftDb }, answerId2) => {
  draftDb[sub_ids.rules.newRule.answerId2] = answerId2;
});

regEvent(event_ids.rules.newRule.answers, ({ draftDb }, answers) => {
  draftDb[sub_ids.rules.newRule.answers] = answers;
});

regEvent(event_ids.rules.newRule.addAnswer, ({ draftDb }) => {
  let dbAnswers = current(draftDb[sub_ids.rules.newRule.answers]);
  let answer = [current(draftDb[sub_ids.rules.newRule.tempQuestionId]),
                current(draftDb[sub_ids.rules.newRule.tempAnswerId])];
  draftDb[sub_ids.rules.newRule.answers] = [... dbAnswers, answer];
});
regEvent(event_ids.rules.newRule.removeAnswer, ({ draftDb }, questionId) => {
  let dbAnswers = current(draftDb[sub_ids.rules.newRule.answers]);
  draftDb[sub_ids.rules.newRule.answers] = dbAnswers.filter(([question])=>question != questionId);
});


regEvent(event_ids.rules.newRule.tempQuestionId, ({ draftDb }, tempQuestionId) => {
  draftDb[sub_ids.rules.newRule.tempQuestionId] = tempQuestionId;
});

regEvent(event_ids.rules.newRule.tempAnswerId, ({ draftDb }, tempAnswerId) => {
  draftDb[sub_ids.rules.newRule.tempAnswerId] = tempAnswerId;
});

regEvent(event_ids.rules.newRule.incompatQuestionId, ({ draftDb }, incompatQuestionId) => {
  draftDb[sub_ids.rules.newRule.incompatQuestionId] = incompatQuestionId;
});

regEvent(event_ids.rules.newRule.incompatAnswerId, ({ draftDb }, incompatAnswerId) => {
  draftDb[sub_ids.rules.newRule.incompatAnswerId] = incompatAnswerId;
});


// EVENTS FOR INSTITUTION INFORMATION
regEvent(event_ids.institution.users, ({draftDb}, users) => {
  draftDb[sub_ids.institution.users] = users;
});

regEvent(event_ids.institution.imagery, ({ draftDb }, imagery) => {
  draftDb[sub_ids.institution.imagery] = imagery;
});

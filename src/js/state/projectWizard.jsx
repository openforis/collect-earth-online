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
  // boundary
  'boundary.generationMethod': 'manual',
  'boundary.aoiFeatures': [],
  'boundary.aoiFileName': '',
  // plots
  'plots.plotDistribution': 'random',
  'plots.numPlots': '',
  'plots.plotSize': '',
  'plots.plotShape': 'circle',
  'plots.plotSpacing': '',
  'plots.shufflePlots': false,
  'plots.totalPlots': 0,
  'plots.plotFeatures': [],
  'plots.plotFileName': '',
  'plots.designSettings': {sampleGeometries: { points: true, lines: false, polygons: false }},
  // samples
  'samples.sampleDistribution': 'random',
  'samples.samplesPerPlot': 1,
  'samples.sampleResolution': 0,
  'samples.sampleFileName': '',
  'samples.allowDrawnSamples': false,
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
  'institution.users': []
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
  boundary: {
    generationMethod: 'boundary.generationMethod',
    aoiFeatures: 'boundary.aoiFeatures',
    aoiFileName: 'boundary.aoiFileName',
    clearBoundary: 'boundary.clearBoundary',
    setBoundaryFromFile: 'boundary.setBoundaryFromFile'
  },
  plots: {
    plotDistribution: 'plots.plotDistribution',
    numPlots: 'plots.numPlots',
    plotSize: 'plots.plotSize',
    plotShape: 'plots.plotShape',
    plotSpacing: 'plots.plotSpacing',
    shufflePlots: 'plots.shufflePlots',
    totalPlots: 'plots.totalPlots',
    plotFeatures: 'plots.plotFeatures',
    plotFileName: 'plots.plotFileName',
    designSettings: 'plots.designSettings',
  },
  samples: {
    sampleDistribution: 'samples.sampleDistribution',
    samplesPerPlot: 'samples.samplesPerPlot',
    sampleResolution: 'samples.sampleResolution',
    sampleFileName: 'samples.sampleFileName',
    allowDrawnSamples: 'samples.allowDrawnSamples'
  },
  questions: {
    addQuestion: 'addQuestion',
    setQuestions: 'setQuestions',
    updateQuestions: 'updateQuestion',
    updateAnswer: 'updateAnswer',
    moveQuestion: 'moveQuestion'},
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
    }},
    institution: {
      users: 'institution.users'}};

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
  boundary: {
    generationMethod: 'boundary.generationMethod',
    aoiFeatures: 'boundary.aoiFeatures',
    aoiFileName: 'boundary.aoiFileName'
  },
  plots: {
    plotDistribution: 'plots.plotDistribution',
    numPlots: 'plots.numPlots',
    plotSize: 'plots.plotSize',
    plotShape: 'plots.plotShape',
    plotSpacing: 'plots.plotSpacing',
    shufflePlots: 'plots.shufflePlots',
    totalPlots: 'plots.totalPlots',
    plotFeatures: 'plots.plotFeatures',
    plotFileName: 'plots.plotFileName',
    designSettings: 'plots.designSettings',
  },
  samples: {
    sampleDistribution: 'samples.sampleDistribution',
    samplesPerPlot: 'samples.samplesPerPlot',
    sampleResolution: 'samples.sampleResolution',
    sampleFileName: 'samples.sampleFileName',
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
    users: 'institution.users'}
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

// boundary
regSub(sub_ids.boundary.generationMethod, sub_ids.boundary.generationMethod);
regSub(sub_ids.boundary.aoiFeatures, sub_ids.boundary.aoiFeatures);
regSub(sub_ids.boundary.aoiFileName, sub_ids.boundary.aoiFileName);

// plots
regSub(sub_ids.plots.plotDistribution, sub_ids.plots.plotDistribution);
regSub(sub_ids.plots.numPlots, sub_ids.plots.numPlots);
regSub(sub_ids.plots.plotSize, sub_ids.plots.plotSize);
regSub(sub_ids.plots.plotShape, sub_ids.plots.plotShape);
regSub(sub_ids.plots.plotSpacing, sub_ids.plots.plotSpacing);
regSub(sub_ids.plots.shufflePlots, sub_ids.plots.shufflePlots);
regSub(sub_ids.plots.totalPlots, sub_ids.plots.totalPlots);
regSub(sub_ids.plots.plotFeatures, sub_ids.plots.plotFeatures);
regSub(sub_ids.plots.plotFileName, sub_ids.plots.plotFileName);
regSub(sub_ids.plots.designSettings, sub_ids.plots.designSettings);


// samples
regSub(sub_ids.samples.sampleDistribution, sub_ids.samples.sampleDistribution);
regSub(sub_ids.samples.samplesPerPlot, sub_ids.samples.samplesPerPlot);
regSub(sub_ids.samples.sampleResolution, sub_ids.samples.sampleResolution);
regSub(sub_ids.samples.sampleFileName, sub_ids.samples.sampleFileName);
regSub(sub_ids.samples.allowDrawnSamples, sub_ids.samples.allowDrawnSamples);


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


// institution
regSub(sub_ids.institution.users, sub_ids.institution.users);


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
           draftDb[sub_ids.modal] = modal;
         });

regEvent(event_ids.overview.projectType,
         ({ draftDb }, projectType) => {
           draftDb[sub_ids.overview.projectType] = projectType;
         });

regEvent(event_ids.projectSource,
         ({ draftDb }, projectSource) => {
           draftDb[sub_ids.projectSource] = projectSource;
         });

// PROJECT OVERVIEW EVENTS

regEvent(event_ids.overview.projectName,
         ({ draftDb }, projectName) => {
           draftDb[sub_ids.overview.projectName] = projectName;
         });

regEvent(event_ids.overview.projectDescription,
         ({ draftDb }, projectDescription) => {
           draftDb[sub_ids.overview.projectDescription] = projectDescription;
         });

regEvent(event_ids.overview.learningMaterial,
         ({ draftDb }, learningMaterial) => {
           draftDb[sub_ids.overview.learningMaterial] = learningMaterial;
         });

regEvent(event_ids.overview.visibility,
         ({ draftDb }, visibility) => {
           draftDb[sub_ids.overview.visibility] = visibility;
         });

regEvent(event_ids.overview.projectOptions.gee,
         ({ draftDb }) => {
           draftDb[sub_ids.overview.projectOptions.gee] = !draftDb[sub_ids.overview.projectOptions.gee];
         });

regEvent(event_ids.overview.projectOptions.extraPlotColumns,
         ({ draftDb }) => {
           draftDb[sub_ids.overview.projectOptions.extraPlotColumns] = !draftDb[sub_ids.overview.projectOptions.extraPlotColumns];
         });

regEvent(event_ids.overview.projectOptions.plotConfidence,
         ({ draftDb }) => {
           draftDb[sub_ids.overview.projectOptions.plotConfidence] = !draftDb[sub_ids.overview.projectOptions.plotConfidence];
         });

regEvent(event_ids.overview.projectOptions.autoGeo,
         ({ draftDb }) => {
           draftDb[sub_ids.overview.projectOptions.autoGeo] = !draftDb[sub_ids.overview.projectOptions.autoGeo];
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

regEvent(event_ids.plots.designSettings, ({ draftDb }, designSettings) => {
  draftDb[sub_ids.plots.designSettings] = designSettings;
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

regEvent(event_ids.samples.allowDrawnSamples, ({ draftDb }, allow) => {
  draftDb[sub_ids.samples.allowDrawnSamples] = allow;
});



regEvent(event_ids.questions.addQuestion,
         ({ draftDb }, questionToAdd ) => {
           const prev = current(draftDb[sub_ids.questions.questions]);
           console.log(sub_ids.questions.questions ,prev);
           draftDb[sub_ids.questions.questions].push(questionToAdd);
         });

regEvent(event_ids.questions.setQuestions,
         ({ draftDb }, questions ) => {
           draftDb[sub_ids.questions.questions] = questions;
         });

regEvent(event_ids.questions.updateQuestion,
         //TODO: is this the most idiomatic wayt to update questions here?
         ({ draftDb }, qId, field, value) => {
           const prev = current(draftDb[sub_ids.questions.questions]);
           const newQuestion = {
             ... prev,
             [qId]: { ...prev[qId], [field]: value}
           };
           draftDb[sub_ids.questions.questions] = newQuestion;
         });

regEvent(event_ids.questions.updateAnswer,
         //TODO: is this the most idiomatic wayt to update question answers here?
         ({ draftDb }, qId, aId, field, value) => {
           const prev = current(draftDb[sub_ids.questions.questions]);
           const newQuestion = {
             ... prev,
             [qId]: { ...prev[qId],
                      answers: {
                        ...prev[qId].answers,
                        [aId]: {...prev[qId].answers[aId], [field]: value }
                      },
                      [field]: value}
           };
           draftDb[sub_ids.questions.questions] = newQuestion;
         });

regEvent(event_ids.questions.moveQuestion,
         //TODO: is this the most idiomatic wayt to update questions here?
         ({ draftDb }, id, targetQ, nextId, nextQ) => {
           const newQuestions = { ...current(draftDb[sub_ids.questions.questions])};
           const tempOrder = targetQ.cardOrder;
           newQuestions[id] = { ...targetQ, cardOrder: nextQ.cardOrder };
           newQuestions[nextId] = { ...nextQ, cardOrder: tempOrder };           
           draftDb[sub_ids.questions.questions] = newQuestions;
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
           draftDb[sub_ids.rules.search] = search;
         });

regEvent(event_ids.rules.filter,
         ({ draftDb }, filter) => {
           draftDb[sub_ids.rules.filter] = filter;
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


// EVENTS FOR INSTITUTION INFORMATION
regEvent(event_ids.institution.users,
  ({draftDb}, users) => {
    draftDb[sub_ids.institution.users] = users;
  });

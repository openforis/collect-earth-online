import { atom } from 'jotai';

/*
  TODO: Perhaps we can enforce this to a schema as well?
*/
export const stateAtom = atom({
  collectionStart: 0,
  currentProject: { surveyQuestions: {}, institution: "" },
  currentImagery: { id: "", sourceConfig: {} },
  currentPlot: {},
  currentUserId: -1,
  // attribution for showing in the map
  imagery: [],
  projects: [],
  institutions: [],
  imageryAttribution: "",
  // attributes to record when sample is saved
  imageryAttributes: {},
  imageryIds: [],
  imageryList: [],
  inReviewMode: false,
  mapConfig: null,
  messageBox: null,
  modal: null,
  plotList: [],
  plotters: [],
  userPlotList: [],
  remainingPlotters: [],
  unansweredColor: "black",
  selectedQuestionId: -1,
  selectedSampleId: -1,
  userSamples: {},
  originalUserSamples: {},
  userImages: {},
  userInstitutions: [],
  storedInterval: null,
  KMLFeatures: null,
  showBoundary: true,
  showSamples: true,
  showSidebar: false,
  showQuitModal: false,
  answerMode: "question",
  modalMessage: null,
  navigationMode: "natural",
  threshold: 90,
  showAcceptTermsModal: false,
  isImageryLayersExpanded: false,
  // only used for simplified projects
  centerSampleId: 0,
  usedKML: false,
  usedGeodash: false,
  
});



import React from "react";

export const ProjectContext = React.createContext();

export const plotLimit = 5000;
export const perPlotLimit = 200;
export const sampleLimit = 50000;

export const blankProject = {
  institution: -1,
  name: "",
  description: "",
  type: "regular",
  designSettings: {
    userAssignment: {
      userMethod: "none",
      users: [],
      percents: [],
    },
    qaqcAssignment: {
      qaqcMethod: "none",
      percent: 0,
      smes: [],
      timesToReview: 2,
    },
    sampleGeometries: {
      points: true,
      lines: true,
      polygons: true,
    },
  },
  projectOptions: {
    showGEEScript: false,
    showPlotInformation: false,
    collectConfidence: false,
    autoLaunchGeoDash: true,
    plotSimilarity: false
  },  
  newPlotDistribution: "csv",
  newPlotFileName: "",
  newPlotBase64: "",
  plotDistribution: "random",
  imageryId: -1,
  aoiFeatures: [],
  aoiFileName: "",
  boundaryType: "manual",
  numPlots: "",
  plotSpacing: "",
  plotShape: "square",
  newPlotShape: "square", 
  plotSize: "",
  newPlotSize: "",
  shufflePlots: false,
  sampleDistribution: "random",
  sampleResolution: "",
  samplesPerPlot: "",
  allowDrawnSamples: false,
  surveyQuestions: {},
  surveyRules: [],
  templateProjectId: -1,
  useTemplateWidgets: false,
  useTemplatePlots: false,
  projectImageryList: [],
  plots: [],
};

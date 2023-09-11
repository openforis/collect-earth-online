import  _ from "lodash";
import {  plotLimit, perPlotLimit, sampleLimit } from "../project/constants";
import { lengthObject, someObject } from "./sequence";


export default function getErrors (form) {

  const {name,
	 description,

	 privacyLevel,
	 imageryId,
	 institutionImagery,
	 projectImageryList,
	 requiresPublic,

	 projectId,
	 aoiFeatures,
	 plotDistribution,
	 numPlots,
	 plotSpacing,
	 plotSize,
	 plotFileName,
	 useTemplatePlots,
	 originalProject,
	 designSettings: {
	   sampleGeometries,
           userAssignment: { userMethod, users, percents },
           qaqcAssignment: { qaqcMethod, smes, percent, timesToReview },
	 },
	 totalPlots,
	 plotFileNeeded,
	 allowDrawnSamples,
	 samplesPerPlot,
	 
	 plotShape,
	 sampleDistribution,
	 sampleFileName,
	 sampleResolution,

	 surveyQuestions
	} = form;


  const overviewErrors = [
    (name === "" || description === "") && "A project must contain a name and description.",
  ];

  const imageryErrors = [
    requiresPublic &&
      `Projects with privacy level of ${privacyLevel} require at least one public imagery.`,
      imageryId <= 0 && "Select a valid Basemap.",
  ];

  const plotsErrors = [
  ["random", "gridded"].includes(plotDistribution) &&
        !aoiFeatures.length &&
        "Please select a valid boundary.",
      plotDistribution === "random" &&
        !numPlots &&
        "A number of plots is required for random plot distribution.",
      plotDistribution === "gridded" &&
        !plotSpacing &&
        "A plot spacing is required for gridded plot distribution.",
      plotDistribution !== "shp" && (!plotSize || plotSize === 0) && "A plot size is required.",
      plotDistribution === "csv" &&
        plotFileNeeded &&
        !(plotFileName || "").includes(".csv") &&
        "A plot CSV (.csv) file is required.",
      plotDistribution === "shp" &&
        plotFileNeeded &&
        !(plotFileName || "").includes(".zip") &&
        "A plot SHP (.zip) file is required.",
      totalPlots > plotLimit &&
        "The plot size limit has been exceeded. Check the Plot Design section for detailed info.",
      ["equal", "percent"].includes(userMethod) &&
        users.length === 0 &&
        "At least one user must be added to the plot assignment.",
      userMethod === "percent" &&
        percents.reduce((acc, p) => acc + p, 0) !== 100 &&
        "The assigned plot percentages must equal 100%.",
      userMethod === "percent" &&
        percents.reduce((acc, p) => acc || p === 0, false) &&
        "All plot assignment percentages must be greater than 0%.",
      ["overlap", "sme"].includes(qaqcMethod) &&
        percent === 0 &&
        "The assigned Quality Control percentage must be greater than 0%.",
      ["random", "gridded"].includes(plotDistribution) &&
        qaqcMethod === "overlap" &&
        users.length > Math.round((totalPlots * (percent / 100)) / users.length) &&
        `Too few plots per user for Quality Control Overlap. Each user must have at least ${users.length} plots.`,
      qaqcMethod === "sme" && smes.length === 0 && "At least one user must be added as an SME.",
      qaqcMethod === "overlap" &&
        users.length === 1 &&
        "At least two assigned users are required for overlap mode.",
      qaqcMethod === "overlap" && timesToReview < 2 && "# of Reviews must be at least 2.",
      qaqcMethod === "overlap" &&
        timesToReview > users.length &&
        users.length > 1 &&
        "# of Reviews cannot be greater than the number of assigned users.",
      userMethod !== "none" &&
        qaqcMethod === "sme" &&
        _.intersection(users, smes).length > 0 &&
        "Users cannot be an Assigned User and an SME. Please remove the duplicate users.",];

  const samplesErrors = [
        sampleDistribution === "random" &&
        !samplesPerPlot &&
        "A number of samples per plot is required for random sample distribution.",
      sampleDistribution === "gridded" &&
        !sampleResolution &&
        "A sample spacing is required for gridded sample distribution.",
      sampleDistribution === "csv" &&
        sampleFileNeeded &&
        !(sampleFileName || "").includes(".csv") &&
        "A sample CSV (.csv) file is required.",
      sampleDistribution === "shp" &&
        sampleFileNeeded &&
        !(sampleFileName || "").includes(".zip") &&
        "A sample SHP (.zip) file is required.",
      sampleDistribution === "gridded" &&
        plotShape === "circle" &&
        sampleResolution >= plotSize / Math.sqrt(2) &&
        `You must use a sample spacing that is less than ${
          Math.round((plotSize / Math.sqrt(2)) * 100) / 100
        } meters.`,
      sampleDistribution === "gridded" &&
        plotShape === "square" &&
        sampleResolution >= plotSize &&
        "The sample spacing must be less than the plot width.",
      (samplesPerPlot > perPlotLimit || totalPlots * samplesPerPlot > sampleLimit) &&
        "The sample size limit has been exceeded. Check the Sample Design section for detailed info.",
      allowDrawnSamples &&
        !Object.values(sampleGeometries).some((g) => g) &&
        "At least one geometry type must be enabled.",];

  const questionsErrors = [
    lengthObject(surveyQuestions) === 0 && "A survey must include at least one question.",
      someObject(surveyQuestions, ([_id, sq]) => (lengthObject(sq.answers) === 0 || this.allAnswersHidden(sq.answers))) &&
        "All survey questions must contain at least one (unhidden) answer.",
  ];

  switch (form.wizardStep) {
  case "overview":
    return overviewErrors.filter((e)=>e);
    break;
  case "imagery":
    return imageryErrors.filter((e)=>e);
    break;
  case "plots":
    return plotsErrors.filter((e)=>e);
    break;
  case "samples":
    return samplesErrors.filter((e)=>e);
    break;
  case "questions":
    return questionsErrors.filter((e)=>e);
    break;
  }
}

import React from "react";

export function ReviewForm({
    projectDetails,
    coordinates,
    imageryList,
    setProjectState,
    projectImageryList,
    setProjectImageryList,
}) {
    return (
        <div id="project-design-form" className="px-2 pb-2">
            <ProjectInfo
                name={projectDetails.name}
                description={projectDetails.description}
                privacyLevel={projectDetails.privacyLevel}
                setProjectState={setProjectState}
            />
            <ProjectAOI
                coordinates={coordinates}
                imageryId={projectDetails.imageryId}
                imageryList={imageryList}
                setProjectState={setProjectState}
                projectImageryList={projectImageryList}
                setProjectImageryList={setProjectImageryList}
            />
            <ProjectOptions
                projectOptions={projectDetails.projectOptions}
                setProjectState={setProjectState}
            />
            <PlotReview projectDetails={projectDetails}/>
            <SampleReview projectDetails={projectDetails}/>
            <SurveyReview surveyQuestions={projectDetails.surveyQuestions} surveyRules={projectDetails.surveyRules}/>
        </div>
    );
}

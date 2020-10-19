import React from "react";

import AOIMap from "./AOIMap";
import {ImageryReview} from "./ImagerySelection";
import {OverviewReview} from "./Overview";
import {AOIReview, PlotReview} from "./PlotDesign";
import {ProjectContext} from "./constants";
import {SampleReview} from "./SampleDesign";
import SurveyCardList from "./SurveyCardList";
import {SurveyRulesList} from "./SurveyRules";

export default function ReviewForm() {
    const renderSectionHeader = (title) => (
        <h2
            className="header overflow-hidden text-truncate my-2 p-2"
            style={{fontSize: "1.25rem"}}
        >
            {title}
        </h2>
    );

    return (
        <ProjectContext.Consumer>
            {context =>
                <div id="project-design-form" className="px-2 pb-2">
                    {renderSectionHeader("Overview")}
                    <OverviewReview/>
                    <div id="collection-review">
                        {renderSectionHeader("Collection Design")}
                        <AOIMap context={context} canDrag={false}/>
                        <div className="row" style={{borderBottom: "1px solid lightgray"}}>
                            <div className="col-6 pt-3" style={{borderRight: "1px solid lightgray"}}>
                                <h2>Imagery Selection</h2>
                                <ImageryReview/>
                            </div>
                            <div className="col-6 pt-3">
                                <h2>AOI Boundary</h2>
                                <AOIReview/>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-6 pt-3" style={{borderRight: "1px solid lightgray"}}>
                                <h2>Plot Design</h2>
                                <PlotReview/>
                            </div>
                            <div className="col-6 pt-3">
                                <h2>Sample Design</h2>
                                <SampleReview/>
                            </div>
                        </div>
                    </div>
                    {renderSectionHeader("Survey Questions")}
                    <div id="survey-review">
                        <SurveyCardList {...context} inDesignMode={false}/>
                        <SurveyRulesList surveyRules={context.projectDetails.surveyRules} inDesignMode={false}/>
                    </div>
                </div>
            }
        </ProjectContext.Consumer>
    );
}

import React from "react";
import {AOIMap} from "./AOIMap";
import {ImageryReview} from "./ImagerySelection";
import {OverviewReview} from "./Overview";
import {PlotReview} from "./PlotDesign";
import {ProjectContext} from "./ProjectContext";
import {SampleReview} from "./SampleDesign";
import SurveyCardList from "./SurveyCardList";
import {SurveyRulesList} from "./SurveyRules";

export function ReviewForm() {
    return (
        <ProjectContext.Consumer>
            {context =>
                <div id="project-design-form" className="px-2 pb-2">
                    <OverviewReview/>
                    <div id="collection-review">
                        <AOIMap/>
                        <ImageryReview/>
                        <PlotReview/>
                        <SampleReview/>
                    </div>
                    <div id="survey-review">
                        <SurveyCardList context={context}/>
                        <SurveyRulesList context={context}/>
                    </div>

                </div>
            }
        </ProjectContext.Consumer>
    );
}

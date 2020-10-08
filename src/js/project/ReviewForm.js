import React from "react";
import AOIMap from "./AOIMap";
import {ImageryReview} from "./ImagerySelection";
import {OverviewReview} from "./Overview";
import {PlotReview} from "./PlotDesign";
import {ProjectContext} from "./constants";
import {SampleReview} from "./SampleDesign";
import SurveyCardList from "./SurveyCardList";
import {SurveyRulesList} from "./SurveyRules";

export default function ReviewForm() {
    return (
        <ProjectContext.Consumer>
            {context =>
                <div id="project-design-form" className="px-2 pb-2">
                    <OverviewReview/>
                    <div id="collection-review">
                        <AOIMap context={context} canDrag={false}/>
                        <ImageryReview/>
                        <PlotReview/>
                        <SampleReview/>
                    </div>
                    <div id="survey-review">
                        <SurveyCardList {...context} inDesignMode={false}/>
                        <SurveyRulesList {...context} inDesignMode={false}/>
                    </div>

                </div>
            }
        </ProjectContext.Consumer>
    );
}

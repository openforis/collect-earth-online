import React from "react";

import AOIMap from "./AOIMap";
import {ImageryReview} from "./ImagerySelection";
import {OverviewReview} from "./Overview";
import {PlotReview} from "./PlotDesign";
import {ProjectContext} from "./constants";
import {SampleReview} from "./SampleDesign";
import SurveyCardList from "./SurveyCardList";
import {SurveyRulesList} from "./SurveyRules";
import {SectionBlock} from "../components/FormComponents";


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
                        <h2>Imagery Selection</h2>
                        <ImageryReview/>
                        <h2>Plot Design</h2>
                        <PlotReview/>
                        <h2>Sample Design</h2>
                        <SampleReview/>
                    </div>
                    {renderSectionHeader("Survey Questions")}
                    <div id="survey-review">
                        <SurveyCardList {...context} inDesignMode={false}/>
                        <SurveyRulesList {...context} inDesignMode={false}/>
                    </div>

                </div>
            }
        </ProjectContext.Consumer>
    );
}

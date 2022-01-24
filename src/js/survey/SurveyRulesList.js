import React from "react";

import SurveyRule from "./SurveyRule";

export default class SurveyRulesList extends React.Component {
    deleteSurveyRule = ruleId => {
        const newSurveyRules = this.props.surveyRules.filter(rule => rule.id !== ruleId);
        this.props.setProjectDetails({surveyRules: newSurveyRules});
    };

    renderRuleRow = r => {
        const {inDesignMode, surveyQuestions} = this.props;
        return (
            <div key={r.id} style={{display: "flex", alignItems: "center"}}>
                <SurveyRule
                    inDesignMode={inDesignMode}
                    removeRule={() => this.deleteSurveyRule(r.id)}
                    ruleOptions={r}
                    surveyQuestions={surveyQuestions}
                />
            </div>
        );
    };

    render() {
        const {surveyRules} = this.props;
        return (surveyRules || []).length > 0
            ? <div>{surveyRules.map(this.renderRuleRow)}</div>
            : <label className="ml-3">No rules have been created for this survey.</label>;
    }
}

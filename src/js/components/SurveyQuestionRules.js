import React from "react";

import SvgIcon from "./SvgIcon";
import {pluralize, truncate} from "../utils/generalUtils";

/**
 * Helper Components
 */
function Badge({children}) {
    return (
        <div className="badge badge-light">
            {children}
        </div>
    );
}

function Pre({children}) {
    return (
        <pre style={{display: "inline"}}>
            {children}
        </pre>
    );
}

function EqualToSumRule({questionsText, validSum}) {
    const truncjoin = qs => qs.map(q => truncate(q, 15)).join(", ");
    return (
        <div className="mb-3">
            <strong>Sum of Answers</strong>
            <br/>
            Answers to <i>{truncjoin(questionsText)}</i> should sum up to <Pre>{validSum}.</Pre>
        </div>
    );
}

function IncompatibleRule({answerText1, answerText2, questionText1, questionText2}) {
    return (
        <div className="mb-3">
            <strong>Incompatible Answers</strong>
            <br/>
            Answer <Badge>{truncate(answerText1, 10)}</Badge> from <i>{truncate(questionText1, 15)}</i> is
            incompatible with <Badge>{truncate(answerText2, 10)}</Badge> from <i>{truncate(questionText2, 15)}</i>
        </div>
    );
}

function MatchingSumsRule({questionSetText1, questionSetText2}) {
    const truncjoin = qs => qs.map(q => truncate(q, 15)).join(", ");
    return (
        <div className="mb-3">
            <strong>Matching Sums</strong>
            <br/>
            Sum of <i>{truncjoin(questionSetText1)}</i> should be equal to sum of <i>{truncjoin(questionSetText2)}</i>
        </div>
    );
}

function MinMaxRule({questionsText, min, max}) {
    return (
        <div className="mb-3">
            <strong>Min/Max Values</strong>
            <br/>
            Answer to <i>{truncate(questionsText, 15)}</i> should be between: <Pre>{min}</Pre> and <Pre>{max}.</Pre>
        </div>
    );
}

function RegexRule({questionsText, regex}) {
    return (
        <div className="mb-3">
            <strong>Text Match</strong><br/>
            Answer to <i>{truncate(questionsText, 15)}</i> should match the pattern: <Pre>{regex}</Pre>
        </div>
    );
}

export default class SurveyQuestionRules extends React.Component {
    constructor(props) {
        super(props);
        this.state = {showModal: false};
    }

    getRulesById = (id, surveyRules = []) => surveyRules
        .filter(rule =>
            (rule.questionId && rule.questionId === id)
            || (rule.questions && rule.questions.includes(id))
            || (rule.questionSetIds1 && (rule.questionSetIds1.includes(id) || rule.questionSetIds2.includes(id)))
            || (rule.question1 && (rule.question1 === id || rule.question2 === id)))
        .map(r => (r.questionId
            ? r.regex
                ? <RegexRule key={r.id} {...r}/>
                : <MinMaxRule key={r.id} {...r}/>
            : r.questions
                ? <EqualToSumRule key={r.id} {...r}/>
                : r.questionSetIds1
                    ? <MatchingSumsRule key={r.id} {...r}/>
                    : <IncompatibleRule key={r.id} {...r}/>));

    render() {
        const {showModal} = this.state;
        const {surveyNodeId, surveyRules} = this.props;
        const rules = this.getRulesById(surveyNodeId, surveyRules);

        return (
            rules.length > 0
              && (
                  <>
                      <button
                          className="text-center btn btn-outline-lightgreen mr-1 tooltip_wrapper"
                          onClick={() => this.setState({showModal: true})}
                          type="button"
                      >
                          <SvgIcon icon="rule" size="1.5rem"/>
                          <div className="tooltip_content survey_tree">
                              {`This question has ${rules.length} ${pluralize(rules.length, "rule", "rules")}. Click to see the rule list.`}
                          </div>
                      </button>
                      <div
                          aria-hidden="true"
                          className="modal fade show"
                          onClick={() => this.setState({showModal: false})}
                          role="dialog"
                          style={{display: (showModal ? "block" : "none"), background: "rgba(0,0,0,0.3)"}}
                          tabIndex="-1"
                      >
                          <div className="modal-dialog" role="document">
                              <div className="modal-content text-left" onClick={e => e.stopPropagation()}>
                                  <div className="modal-header" >
                                      <h5 className="modal-title">
                                      Survey Rules
                                      </h5>
                                      <button
                                          aria-label="Close"
                                          className="close"
                                          data-dismiss="modal"
                                          onClick={() => this.setState({showModal: false})}
                                          type="button"
                                      >
                                          <span aria-hidden="true">
                                              <SvgIcon icon="close" size="1.25rem"/>
                                          </span>
                                      </button>
                                  </div>
                                  <div className="modal-body text-left">
                                      {rules}
                                  </div>
                                  <div className="modal-footer">
                                      <button
                                          className="btn btn-secondary"
                                          onClick={() => this.setState({showModal: false})}
                                          type="button"
                                      >
                                      Close
                                      </button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </>
              )
        );
    }
}

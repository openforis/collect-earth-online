import React from "react";

import SvgIcon from "./SvgIcon";
import {pluralize} from "../utils/generalUtils";

class SurveyRulesModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {showModal: false};
    }

    render() {
        const {showModal} = this.state;
        const {rules} = this.props;

        return (
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
                                <ul>{rules}</ul>
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
        );
    }
}

export default function SurveyQuestionRules({rules}) {
    return rules.length > 0 && <SurveyRulesModal rules={rules}/>;
}

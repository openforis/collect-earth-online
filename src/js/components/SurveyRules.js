import React from "react";

import SvgIcon from "./SvgIcon";

class SurveyRulesModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {showModal: false};
    }

  toggleModal = state => {
      this.setState({showModal: state});
  };

  render() {
      const {rules} = this.props;

      return (
          <>
              <button
                  className="text-center btn btn-outline-lightgreen mr-1 tooltip_wrapper"
                  onClick={() => this.toggleModal(true)}
                  type="button"
              >
                  <SvgIcon icon="rule" size="1.5rem"/>
                  <div className="tooltip_content survey_tree">
                      {`This question has ${rules.length} rules. Click to see the rule list.`}
                  </div>
              </button>
              <div
                  aria-hidden="true"
                  aria-labelledby="exampleModalLabel"
                  className="modal fade show"
                  role="dialog"
                  style={{display: (this.state.showModal ? "block" : "none"), background: "rgba(0,0,0,0.3)"}}
                  tabIndex="-1"
              >
                  <div className="modal-dialog" role="document">
                      <div className="modal-content text-left" onClick={e => e.stopPropogation()}>
                          <div className="modal-header" >
                              <h5 className="modal-title">
                                  Survey Rules
                              </h5>
                              <button
                                  aria-label="Close"
                                  className="close"
                                  data-dismiss="modal"
                                  onClick={() => this.toggleModal(false)}
                                  type="button"
                              >
                                  <span aria-hidden="true">&times;</span>
                              </button>
                          </div>
                          <div className="modal-body text-left">
                              <ul>{rules}</ul>
                          </div>
                          <div className="modal-footer">
                              <button
                                  className="btn btn-secondary"
                                  onClick={() => this.toggleModal(false)}
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

function SurveyRulesTooltip({rules}) {
    return (
        <div className="text-center btn btn-outline-lightgreen mr-1 tooltip_wrapper">
            <SvgIcon icon="rule" size="1.5rem"/>
            <ul className="tooltip_content survey_tree">{rules}</ul>
        </div>
    );
}

export default function SurveyRules({rules}) {
    if (rules.length > 0 && rules.length <= 2) {
        return (<SurveyRulesTooltip rules={rules}/>);
    } else {
        return (<SurveyRulesModal rules={rules}/>);
    }
}

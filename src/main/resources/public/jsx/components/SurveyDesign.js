import SectionBlock from "./SectionBlock";
import React, {Fragment} from "react";

export class SurveyDesign extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            topLevelNodes: [],
            currentNodeIndex: 0
        }
    }

    render() {
        let answer_select = "";
        let answers = this.props.getParentSurveyQuestionAnswers(this.props.project.projectDetails.sampleValues);
        if (answers.length > 0) {
            answer_select = this.props.getParentSurveyQuestionAnswers(this.props.project.projectDetails.sampleValues).map((parentSurveyQuestionAnswer, uid) =>
                <option key={uid}
                        value={parentSurveyQuestionAnswer.id}>{parentSurveyQuestionAnswer.answer}</option>
            )
        }

        return (
            <SectionBlock title="Survey Design">
                <div id="survey-design">
                    <SurveyQuestionTree
                        project={this.props.project}
                        addSurveyQuestionRow={this.props.addSurveyQuestionRow} topoSort={this.props.topoSort}
                        getParentSurveyQuestions={this.props.getParentSurveyQuestions}
                        removeSurveyQuestion={this.props.removeSurveyQuestion}
                        removeSurveyQuestionRow={this.props.removeSurveyQuestionRow}
                        handleInputColor={this.props.handleInputColor}
                        handleInputName={this.props.handleInputName}
                        handleInputParent={this.props.handleInputParent}
                    />
                    <table>
                        <tbody>
                        <tr>
                            <td>
                                <label htmlFor="value-parent">Parent Question:</label>
                            </td>
                            <td>
                                <select
                                    id="value-parent" className="form-control form-control-sm" size="1"
                                    onChange={(e) => this.props.handleInputParent(e)}>
                                    <option value="">None</option>
                                    {
                                        (this.props.project.projectDetails.sampleValues).map((parentSurveyQuestion, uid) =>
                                            <option key={uid}
                                                    value={parentSurveyQuestion.id}>{parentSurveyQuestion.question}
                                            </option>
                                        )
                                    }
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <label htmlFor="value-componenttype">Component Type:</label>
                            </td>
                            <td>
                                <select id="value-componenttype" className="form-control form-control-sm" size="1"
                                        onChange={(e) => this.props.handleInputParent(e)}>
                                    <option value="button-text">Button-Text</option>
                                    <option value="input-number">Input-Number</option>
                                    <option value="input-text">Input-Text</option>
                                    <option value="radiobutton-boolean">Radiobutton-Boolean</option>
                                    <option value="radiobutton-text">Radiobutton-Text</option>
                                    <option value="dropdown-boolean">Dropdown-Boolean</option>
                                    <option value="dropdown-text">Dropdown-Text</option>
                                    {/*<option value="point-digitizer">Point-Digitizer</option>*/}
                                    {/*<option value="linestring-digitizer">Line String-Digitizer</option>*/}
                                    {/*<option value="polygon-digitizer">Polygon-Digitizer</option>*/}
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <label htmlFor="value-answer">Parent Answer:</label>
                            </td>
                            <td>
                                <select id="value-answer" className="form-control form-control-sm" size="1"
                                        onChange={(e) => this.props.handleInputParent(e)}>
                                    <option value="">Any</option>
                                    {answer_select}
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td><label htmlFor="value-SQ">New Question:</label></td>
                            <td>
                                <div id="add-sample-value-group">
                                    <input type="text" id="surveyQuestionText" autoComplete="off"
                                           value={project.newSurveyQuestionName}/>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td><input type="button" className="button" value="Add Survey Question"
                                       onClick={this.props.addSurveyQuestion}/></td>
                            <td></td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </SectionBlock>
        );
    }
}
class SurveyQuestionTree extends React.Component {
    constructor(props) {
        super(props);
    };
    getCurrent = (node) =>
        this.props.project.projectDetails.sampleValues.filter(cNode =>
            cNode.parent_question == node).map((cNode,uid) => (
            <ul  key={`node_${uid}`} style={{listStyleType:"none"}}>
                <li>
                    <SurveyQuestion parentProps={this.props} surveyQuestion={cNode}/>
                    {this.getCurrent(cNode.id)}
                </li>

            </ul>
        ))
    render() {
        const { project } = this.props;
        return (
            <Fragment>
                {project.projectDetails && this.getCurrent(-1)}
            </Fragment>
        );
    }
}

function SurveyQuestion({ parentProps, parentProps: { project }, surveyQuestion }) {
    if (surveyQuestion.answers == null) {
        console.log("answers null");
    }
    return (
        <div className="sample-value-info">
            <h3 className="header px-0">
                <RemoveSurveyQuestionButton
                    removeSurveyQuestion={parentProps.removeSurveyQuestion}
                    surveyQuestion={surveyQuestion}
                />
                <label> Survey Question: {surveyQuestion.question}</label>
            </h3>
            <table className="table table-sm">
                <thead>
                <tr>
                    <th scope="col"></th>
                    <th scope="col">Answer</th>
                    <th scope="col">Color</th>
                    <th scope="col">&nbsp;</th>
                </tr>
                </thead>
                <tbody>
                {

                    (surveyQuestion.answers).map((surveyAnswer, uid) => {

                            return <tr key={uid}>
                                <td>
                                    {surveyAnswer &&
                                    <RemoveSurveyQuestionRowButton
                                        removeSurveyQuestionRow={parentProps.removeSurveyQuestionRow}
                                        surveyQuestion={surveyQuestion}
                                        surveyAnswer={surveyAnswer}
                                    />
                                    }
                                </td>

                                <td>
                                    {surveyAnswer.answer}
                                </td>
                                <td>
                                    <div className="circle"
                                         style={{ backgroundColor: surveyAnswer.color, border: "solid 1px" }}></div>
                                </td>
                                <td>
                                    &nbsp;
                                </td>
                            </tr>
                        }
                    )
                }
                <SurveyQuestionTable
                    project={project}
                    surveyQuestion={surveyQuestion}
                    getParentSurveyQuestions={parentProps.getParentSurveyQuestions}
                    addSurveyQuestionRow={parentProps.addSurveyQuestionRow}
                    handleInputName={parentProps.handleInputName}
                    handleInputColor={parentProps.handleInputColor}
                    handleInputParent={parentProps.handleInputParent}
                />
                </tbody>
            </table>
        </div>

    );

}

function RemoveSurveyQuestionButton(props) {
    return (<input id="remove-sample-value-group" type="button" className="button" value="-"
                   onClick={() => props.removeSurveyQuestion(props.surveyQuestion.question)}/>
    );
}

function RemoveSurveyQuestionRowButton(props) {
    return (
        <input type="button" className="button" value="-"
               onClick={() => props.removeSurveyQuestionRow(props.surveyQuestion.question, props.surveyAnswer.answer)}/>
    );
}

function SurveyQuestionTable(props) {
    let project = props.project;
    let answer = "", color = "#000000";
    if (project.newValueEntry[props.surveyQuestion.question]) {
        answer = project.newValueEntry[props.surveyQuestion.question].answer;
        color = project.newValueEntry[props.surveyQuestion.question].color;
    }
    return (
        <tr>
            <td>
                <input type="button" className="button" value="+"
                       onClick={() => props.addSurveyQuestionRow(props.surveyQuestion.question)}/>
            </td>
            <td>
                <input type="text" className="value-name" autoComplete="off"
                       value={answer} onChange={(e) => props.handleInputName(props.surveyQuestion.question, e)}/>
            </td>
            <td>
                <input type="color" className="value-color"
                       value={color} onChange={(e) => props.handleInputColor(props.surveyQuestion.question, e)}/>
            </td>
        </tr>
    );
}

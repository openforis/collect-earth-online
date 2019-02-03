import SectionBlock from "./SectionBlock";
import React, {Fragment} from "react";

export class SurveyDesign extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            newValueEntry: this.props.project.newValueEntry,
            surveyDesignMode:"simple"
        };
        this.addSurveyQuestion = this.addSurveyQuestion.bind(this);
        this.addSurveyQuestionRow = this.addSurveyQuestionRow.bind(this);
        this.getParentSurveyAnswers = this.getParentSurveyAnswers.bind(this);
        this.getParentSurveyQuestionAnswers = this.getParentSurveyQuestionAnswers.bind(this);
        this.getSurveyQuestionByName = this.getSurveyQuestionByName.bind(this);
        this.handleInputColor = this.handleInputColor.bind(this);
        this.handleInputName = this.handleInputName.bind(this);
        this.handleInputParent = this.handleInputParent.bind(this);
        this.removeSurveyQuestion = this.removeSurveyQuestion.bind(this);
        this.removeSurveyQuestionRow = this.removeSurveyQuestionRow.bind(this);
    };

    addSurveyQuestionRow(surveyQuestionName) {
        let entry = this.state.newValueEntry[surveyQuestionName];
        if (entry.answer != "") {
            let surveyQuestion = this.getSurveyQuestionByName(surveyQuestionName);
            console.log(surveyQuestion);
            if (surveyQuestion.component_type.toLowerCase() == "input" && surveyQuestion.answers.length < 1) {
                surveyQuestion.answers.push({
                    id: surveyQuestion.answers.length + 1,
                    answer: entry.answer,
                    color: entry.color
                });
            } else if ((surveyQuestion.component_type.toLowerCase() == "radiobutton" || surveyQuestion.component_type.toLowerCase() == "dropdown") && surveyQuestion.data_type.toLowerCase() == "boolean" && surveyQuestion.answers.length < 2) {
                surveyQuestion.answers.push({
                    id: surveyQuestion.answers.length + 1,
                    answer: entry.answer,
                    color: entry.color
                });
            } else if ((surveyQuestion.component_type.toLowerCase() == "button" || surveyQuestion.component_type.toLowerCase() == "radiobutton" || surveyQuestion.component_type.toLowerCase() == "dropdown") && surveyQuestion.data_type.toLowerCase() == "text") {
                surveyQuestion.answers.push({
                    id: surveyQuestion.answers.length + 1,
                    answer: entry.answer,
                    color: entry.color
                });
            } else {
                alert("You cannot add more answers for this type.")
            }
            entry.id = -1;
            entry.answer = "";
            entry.color = "#1527F6";
        } else {
            alert("A survey answer must possess both an answer and a color.");
        }
        let dNew = this.state.newValueEntry;
        dNew[surveyQuestionName] = entry;
        this.setState({newValueEntry: dNew});
    }

    getParentSurveyQuestionAnswers(sampleSurvey) {
        let ans = [];
        sampleSurvey.map((sq) => {
                let parent_value = document.getElementById("value-parent");

                if(parent_value!=null) {
                    let parent = parent_value.options[parent_value.selectedIndex].value;
                    if (sq.id == parent) {
                        ans = sq.answers;
                    }
                }
            }
        );
        return ans;
    }

    getParentSurveyAnswers(sampleSurvey,question_id) {
        let ans = [];
        sampleSurvey.map((sq) => {
                if (sq.id == question_id) {
                    ans = sq.answers;
                }


            }
        );
        return ans;
    }

    addSurveyQuestion(){
        if (this.props.project.projectDetails != null) {
            let questionText = document.getElementById("surveyQuestionText").value;
            let parent_value = document.getElementById("value-parent");

            let parent = parent_value.options[parent_value.selectedIndex].value;

            let answer_value = document.getElementById("value-answer");

            let answer = answer_value.options[answer_value.selectedIndex].value;

            let componenttype_value = document.getElementById("value-componenttype");
            let componenttype = componenttype_value.options[componenttype_value.selectedIndex].value;

            if (questionText != "") {
                let newValueEntryNew = this.state.newValueEntry;
                newValueEntryNew[questionText] = {id:-1,answer: "", color: "#1527F6"};
                let detailsNew = this.props.project.projectDetails;
                let _id = detailsNew.sampleValues.length + 1;
                let question_id = -1,answer_id=-1;
                detailsNew.sampleValues.map((sq) => {
                        if (sq.id == parent) {
                            question_id = sq.id;
                            this.getParentSurveyAnswers(detailsNew.sampleValues,question_id).map((ans) => {
                                    if (ans.id == answer) {
                                        answer_id = ans.id;
                                    }
                                }
                            );
                        }
                    }
                );

                detailsNew.sampleValues.push({id: _id, question: questionText, answers: [], parent_question: question_id,parent_answer:answer_id,data_type:componenttype.split("-")[1],component_type:componenttype.split("-")[0]});

                this.setState({newValueEntry: newValueEntryNew, projectDetails: detailsNew, newSurveyQuestionName: ""});
                document.getElementById("surveyQuestionText").value = "";
                parent_value.options[0].selected = true;
            } else {
                alert("Please enter a survey question first.");
            }
        }
    }

    removeSurveyQuestion(surveyQuestionName) {
        if (this.props.project.projectDetails != null) {
            let detailsNew = this.props.project.projectDetails;
            detailsNew.sampleValues = detailsNew.sampleValues.filter(
                function (surveyQuestion) {
                    return surveyQuestion.question != surveyQuestionName;
                }
            );
            this.setState({
                projectDetails: detailsNew
            });
        }
    }

    getSurveyQuestionByName(surveyQuestionName) {
        return this.props.project.projectDetails.sampleValues.find(
            function (surveyQuestion) {
                return surveyQuestion.question == surveyQuestionName;
            }
        );
    }

    removeSurveyQuestionRow(surveyQuestionText, _surveyAnswer) {
        let surveyQuestion = this.getSurveyQuestionByName(surveyQuestionText);
        surveyQuestion.answers = surveyQuestion.answers.filter(
            function (surveyAnswer) {
                return surveyAnswer.answer != _surveyAnswer;
            }
        );
        this.setState({});
    }

    handleInputName(surveyQuestion, event) {
        let newValueEntryNew = this.state.newValueEntry;
        if (newValueEntryNew[surveyQuestion]) {
            newValueEntryNew[surveyQuestion].answer = event.target.value;
            this.setState({newValueEntry:newValueEntryNew});
        }
        else
            this.setState({newValueEntry:{id:-1,answer: "", color: "#1527F6"}});
    }

    handleInputColor(surveyQuestion, event) {
        let newValueEntryNew = this.state.newValueEntry;
        newValueEntryNew[surveyQuestion].color = event.target.value;

        this.setState({newValueEntry: newValueEntryNew});

    }

    handleInputParent(event) {
        let detailsNew = this.props.project.projectDetails;
        this.setState({projectDetails: detailsNew});
    }

    changeMode(e) {
        this.setState({surveyDesignMode: e.target.id});
    }

    render() {
        let answer_select = "";
        let answers = this.getParentSurveyQuestionAnswers(this.props.project.projectDetails.sampleValues);
        if (answers.length > 0) {
            answer_select = this.getParentSurveyQuestionAnswers(this.props.project.projectDetails.sampleValues).map((parentSurveyQuestionAnswer, uid) =>
                <option key={uid}
                        value={parentSurveyQuestionAnswer.id}>{parentSurveyQuestionAnswer.answer}</option>
            )
        }

        return (
            <SectionBlock title="Survey Design">
                <div style={{overflow: "hidden", border: "1px solid #31BAB0",backgroundColor: "#f1f1f1",margin:"10px"}}>
                    <input type="button" id="simple" onClick={(e)=>this.changeMode(e)} value="Simple" style={{backgroundColor: this.state.surveyDesignMode=="simple"?"#31BAB0":"transparent",float: "left", border: "none", outline: "none", cursor: "pointer", padding: "14px 16px", transition: "0.3s",fontSize: "17px"}}/>
                    <input type="button" id="advanced" onClick={(e)=>this.changeMode(e)} value="Advanced" style={{backgroundColor: this.state.surveyDesignMode=="advanced"?"#31BAB0":"transparent",float: "left", border: "none", outline: "none", cursor: "pointer", padding: "14px 16px", transition: "0.3s",fontSize: "17px"}}/>
                </div>
                <div id="survey-design">
                    <SurveyQuestionTree
                        project={this.props.project}
                        addSurveyQuestionRow={this.addSurveyQuestionRow}
                        removeSurveyQuestion={this.removeSurveyQuestion}
                        removeSurveyQuestionRow={this.removeSurveyQuestionRow}
                        handleInputColor={this.handleInputColor}
                        handleInputName={this.handleInputName}
                        handleInputParent={this.handleInputParent}
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
                        <tr style={{display: this.state.surveyDesignMode=="simple"?"none":""}}>
                            <td>
                                <label htmlFor="value-componenttype">Component Type:</label>
                            </td>
                            <td>
                                <select id="value-componenttype" className="form-control form-control-sm" size="1"
                                        onChange={(e) => this.handleInputParent(e)}>
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
                                        onChange={(e) => this.handleInputParent(e)}>
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
                                       onClick={this.addSurveyQuestion}/></td>
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
                                         style={{backgroundColor: surveyAnswer.color, border: "solid 1px"}}></div>
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
    let answer = "", color = "#1527F6";
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

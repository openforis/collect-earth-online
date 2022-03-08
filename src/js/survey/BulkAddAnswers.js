import React, {useContext, useState} from "react";

import SvgIcon from "../components/svg/SvgIcon";
import {ProjectContext} from "../project/constants";
import {getNextInSequence, partition, last} from "../utils/sequence";

export default function BulkAddAnswers({closeDialog, surveyQuestionId, surveyQuestion}) {
    const [newAnswers, setAnswers] = useState("");
    const {surveyQuestions, setProjectDetails} = useContext(ProjectContext);

    const getAnswerErrors = answerPairs => [
        last(answerPairs).length !== 2 && "You must provide pairs of color and answer.  If you feel like you have correct data, check for extra separators (comma, tab, or new line)",
        answerPairs.find(([c, _a]) => !c.match(/#[0-9|a-f]{6}/)) && "Colors must be 6 digit hex values."
    ].filter(e => e);

    const addAnswers = () => {
        const answerPairs = partition(newAnswers.split(/[,|\n|\t] */), 2);
        const answerErrors = getAnswerErrors(answerPairs);
        if (answerErrors.length) {
            alert(answerErrors.join("\n"));
        } else {
            const newId = getNextInSequence(Object.keys(surveyQuestion.answers));
            const updatedAnswers = answerPairs.reduce((answers, [color, answer], idx) => {
                const newAnswer = {answer: answer.trim(), color};
                return {
                    [newId + idx]: newAnswer,
                    ...answers
                };
            }, surveyQuestion.answers);
            setProjectDetails({
                surveyQuestions: {
                    ...surveyQuestions,
                    [surveyQuestionId]: {
                        ...surveyQuestion,
                        answers: {
                            ...updatedAnswers
                        }
                    }
                }
            });
            closeDialog();
        }
    };

    return (
        <div
            aria-hidden="true"
            className="modal fade show"
            onClick={closeDialog}
            role="dialog"
            style={{display: "block", background: "rgba(0,0,0,0.3)"}}
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
                            onClick={closeDialog}
                            type="button"
                        >
                            <span aria-hidden="true">
                                <SvgIcon icon="close" size="1.25rem"/>
                            </span>
                        </button>
                    </div>
                    <div className="modal-body text-left">
                        <label htmlFor="answers">
                            Enter color / answer pairs separated by commas, tabs, or newlines.
                        </label>
                        <textarea
                            className="form-control"
                            id="answers"
                            onChange={e => setAnswers(e.target.value)}
                            placeholder="#24aa34, test answer"
                            rows="10"
                            value={newAnswers || ""}
                        />
                    </div>
                    <div className="modal-footer">
                        <button
                            className="btn btn-secondary"
                            onClick={closeDialog}
                            type="button"
                        >
                            Close
                        </button>
                        <button
                            className="btn btn-success"
                            onClick={addAnswers}
                            type="button"
                        >
                            Add
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

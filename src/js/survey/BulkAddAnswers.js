import React, {useContext, useState} from "react";

import SvgIcon from "../components/svg/SvgIcon";
import {ProjectContext} from "../project/constants";
import {getNextInSequence, partition} from "../utils/sequence";

export default function BulkAddAnswers({closeDialog, surveyQuestionId, surveyQuestion}) {
    const [newAnswers, setAnswers] = useState("");
    const {surveyQuestions, setProjectDetails} = useContext(ProjectContext);

    const addAnswers = () => {
        const splitArr = newAnswers.split(/[,|\n|\t] */);
        if (splitArr.length % 2 !== 0) {
            alert("You must provide an a color for answer.");
        } else {
            const newId = getNextInSequence(Object.keys(surveyQuestion.answers));
            const pairs = partition(splitArr, 2);
            pairs.forEach(([color, answer], idx) => {
                const newAnswer = {answer, color};
                setProjectDetails({
                    surveyQuestions: {
                        ...surveyQuestions,
                        [surveyQuestionId]: {
                            ...surveyQuestion,
                            answers: {
                                ...surveyQuestion.answers,
                                [newId + idx]: newAnswer
                            }
                        }
                    }
                });
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

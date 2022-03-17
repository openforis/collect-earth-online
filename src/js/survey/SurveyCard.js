import React, {useContext, useState} from "react";

import SvgIcon from "../components/svg/SvgIcon";
import SurveyDesignQuestion from "./SurveyDesignQuestion";

import {removeEnumerator} from "../utils/generalUtils";
import {findObject, last, mapVals} from "../utils/sequence";
import {ProjectContext} from "../project/constants";

export default function SurveyCard({
    cardNumber,
    editMode,
    surveyQuestionId,
    topLevelNodeIds
}) {
    const [showQuestions, setShow] = useState(true);
    const {setProjectDetails, surveyQuestions} = useContext(ProjectContext);

    const swapId = (val, checkVal, swapVal) => (val === checkVal ? swapVal
        : val === swapVal ? checkVal
            : val);

    const swapCardOrder = upOrDown => {
        const originalOrder = findObject(surveyQuestions, ([id, _sq]) => Number(id) === surveyQuestionId)[1].cardOrder;
        const newId = topLevelNodeIds[
            topLevelNodeIds.indexOf(surveyQuestionId) + upOrDown
        ];
        const newOrder = findObject(surveyQuestions, ([id, _sq]) => Number(id) === newId)[1].cardOrder;
        setProjectDetails({
            surveyQuestions: mapVals(surveyQuestions, val => (val.cardOrder !== undefined
                ? {...val, cardOrder: swapId(val.cardOrder, originalOrder, newOrder)}
                : val))
        });
    };

    const {question} = surveyQuestions[surveyQuestionId];

    return (
        <div className="border rounded border-dark">
            <div className="container">
                <div className="row">
                    <div className="col-10 d-flex pl-1">
                        <button
                            className="btn btn-outline-lightgreen my-2"
                            onClick={() => setShow(!showQuestions)}
                            type="button"
                        >
                            {showQuestions ? <SvgIcon icon="minus" size="0.9rem"/> : <SvgIcon icon="plus" size="0.9rem"/>}
                        </button>
                        <h2 className="font-weight-bold mt-2 pt-1 ml-2">Survey Card Number {cardNumber}</h2>
                        <h3 className="m-3">
                            {!showQuestions && `-- ${editMode === "review" ? removeEnumerator(question) : question}`}
                        </h3>
                    </div>
                    {editMode !== "review" && (
                        <div className="col-2 d-flex pr-1 justify-content-end">
                            <button
                                className="btn btn-outline-lightgreen my-1 px-3 py-0"
                                disabled={surveyQuestionId === topLevelNodeIds[0]}
                                onClick={() => swapCardOrder(-1)}
                                style={{opacity: surveyQuestionId === topLevelNodeIds[0] ? "0.25" : "1.0"}}
                                type="button"
                            >
                                <SvgIcon icon="upCaret" size="1rem"/>
                            </button>
                            <button
                                className="btn btn-outline-lightgreen my-1 px-3 py-0"
                                disabled={surveyQuestionId === last(topLevelNodeIds)}
                                onClick={() => swapCardOrder(1)}
                                style={{opacity: surveyQuestionId === last(topLevelNodeIds) ? "0.25" : "1.0"}}
                                type="button"
                            >
                                <SvgIcon icon="downCaret" size="1rem"/>
                            </button>
                        </div>
                    )}
                </div>
                {showQuestions && (
                    <div className="row d-block">
                        <SurveyDesignQuestion
                            key={surveyQuestionId}
                            editMode={editMode}
                            indentLevel={0}
                            surveyQuestionId={surveyQuestionId}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

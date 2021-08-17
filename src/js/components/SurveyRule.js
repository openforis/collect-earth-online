import React from "react";

import {truncate} from "../utils/generalUtils";

function truncjoin(qs) {
    return qs.map(q => truncate(q, 15)).join(", ");
}

function Badge({text}) {
    return (
        <div className="badge badge-light tooltip_wrapper" style={{color: "black"}}>
            {truncate(text, 10)}
            {text.length > 10 && (<div className="tooltip_content">{text}</div>)}
        </div>
    );
}

function Question({text}) {
    const textIsArray = Array.isArray(text);
    return (
        <i className="tooltip_wrapper" style={{color: "black"}}>
            &quot;{(textIsArray ? truncjoin(text) : truncate(text, 15))}&quot;
            {(textIsArray || text.length >= 15)
                && (
                    <span className="tooltip_content" style={{fontSize: "0.8rem"}}>
                        {textIsArray ? text.join(", ") : text}
                    </span>
                )}
        </i>
    );
}

function SumOfAnswersRule({questionsText, validSum}) {
    return (
        <>
            <div><strong>Sum of Answers</strong></div>
            <div>Answers to <Question text={questionsText}/> should sum up to {validSum}.</div>
        </>
    );
}

function IncompatibleAnswersRule({answerText1, answerText2, questionText1, questionText2}) {
    return (
        <>
            <div><strong>Incompatible Answers</strong></div>
            <div>
                Answer <Badge text={answerText1}/> from <Question text={questionText1}/> is
                incompatible with <Badge text={answerText2}/> from <Question text={questionText2}/>
            </div>
        </>
    );
}

function MatchingSumsRule({questionSetText1, questionSetText2}) {
    return (
        <>
            <div><strong>Matching Sums</strong></div>
            <div>
                Sum of <Question text={questionSetText1}/> should be equal to sum of <Question text={questionSetText2}/>
            </div>
        </>
    );
}

function NumericRangeRule({questionsText, min, max}) {
    return (
        <>
            <div><strong>Min/Max Values</strong></div>
            <div>Answer to <Question text={questionsText}/> should be between: {min} and {max}.</div>
        </>
    );
}

function TextMatchRule({questionsText, regex}) {
    return (
        <>
            <div><strong>Text Match</strong></div>
            <div>Answer to <Question text={questionsText}/> should match the pattern: <pre style={{display: "inline"}}>{regex}</pre></div>
        </>
    );
}

export default function SurveyRule({ruleOptions}) {
    return (
        <div className="d-flex flex-column mb-3">
            {{
                "text-match": <TextMatchRule {...ruleOptions}/>,
                "numeric-range": <NumericRangeRule {...ruleOptions}/>,
                "sum-of-answers": <SumOfAnswersRule {...ruleOptions}/>,
                "matching-sums": <MatchingSumsRule {...ruleOptions}/>,
                "incompatible-answers": <IncompatibleAnswersRule {...ruleOptions}/>
            }[ruleOptions.ruleType]}
        </div>
    );
}

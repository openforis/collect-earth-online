
export function convertSampleValuesToSurveyQuestions(sampleValues) {
    return (sampleValues || []).map(sv => {
        const newAnswers = (sv.answers || sv.values).map(value => ({
            id: value.id,
            answer: value.answer || value.name || "",
            color: value.color
          }));

        return {
            id: sv.id,
            question: sv.question || sv.name || "",
            answers: newAnswers,
            parentQuestion: parseInt(sv.parentQuestion || sv.parent_question || -1),
            parentAnswer: parseInt(sv.parentAnswer || sv.parent_answer || -1),
            componentType: (sv.componentType || "button").toLocaleLowerCase(),
            dataType: (sv.dataType || "text").toLocaleLowerCase()
        };
    });
}

export function getChildQuestionIds(questionId) {
    const childQuestions = this.props.surveyQuestions.filter(sv => sv.parentQuestion === questionId);
    if (childQuestions.length === 0) {
        return [questionId];
    } else {
        return childQuestions.reduce((acc, cur) => {
                        return [...acc, ...this.getChildQuestionIds(cur.id)];
                    }, [questionId])
    }
}

export function getAllChildQuestions(currentQuestion, surveyQuestions) {
    const childQuestions = surveyQuestions.filter(sv => sv.parentQuestion === currentQuestion.id);

    if (childQuestions.length === 0) {
        return [currentQuestion];
    } else {
        return childQuestions.reduce((acc, cq) => {
            return [...acc, ...this.getAllChildQuestions(cq, surveyQuestions)];
        }, [currentQuestion])
    }
}

// export function extractUserSamples(samples) {
//     return newPlot.samples.map((obj, s) => {
//                     obj[s.id] = s.value || {}
//                     return obj;
//                     }, {})  
//                 : {},
// }
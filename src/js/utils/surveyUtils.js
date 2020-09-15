export function convertSampleValuesToSurveyQuestions(sampleValues) {
    return (sampleValues || []).map(sv => {
        const newAnswers = (sv.answers || sv.values).map(value => ({
            id: value.id,
            answer: value.answer || value.name || "",
            color: value.color,
        }));

        return {
            id: sv.id,
            question: sv.question || sv.name || "",
            answers: newAnswers,
            parentQuestion: parseInt(sv.parentQuestion || sv.parent_question || -1),
            parentAnswer: parseInt(sv.parentAnswer || sv.parent_answer || -1),
            componentType: (sv.componentType || "button").toLocaleLowerCase(),
            dataType: (sv.dataType || "text").toLocaleLowerCase(),
        };
    });
}

export function removeEnumerator(questionText) {
    return questionText.replace(/[\s][(][\d]*[[)]$/, "");
}

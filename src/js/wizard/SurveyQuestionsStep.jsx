import React, { useState, useEffect } from 'react';
import { dispatch, useSubscription } from '@flexsurfer/reflex';
import { SurveyQuestions } from '../components/SurveyQuestions';
import SvgIcon from '../components/svg/SvgIcon';
import { event_ids, sub_ids } from '../state/projectWizard';
import { InfoTooltip } from '../components/PageComponents';

const isTopLevel = (q) => Number(q.parentQuestionId) === -1;
const orderKey   = (q) => (isTopLevel(q) ? 'cardOrder' : 'siblingOrder');
const orderOf    = ([id, q]) => q[orderKey(q)] ?? Number(id);

const childrenOf = (questions, parentId) =>
  Object.keys(questions).filter((id) => String(questions[id].parentQuestionId) === String(parentId));

// Depth-first with an accumulator
export const descendantIds = (questions, rootId, seen = []) =>
  seen.includes(String(rootId))
    ? seen
    : childrenOf(questions, rootId)
        .reduce((acc, id) => descendantIds(questions, id, acc), [...seen, String(rootId)]);

const RULE_REFS = {
  'text-match':           (r) => [r.questionId],
  'numeric-range':        (r) => [r.questionId],
  'sum-of-answers':       (r) => r.questionIds,
  'matching-sums':        (r) => [...r.questionIds1, ...r.questionIds2],
  'incompatible-answers': (r) => [r.questionId1, r.questionId2],
  'multiple-incompatible-answers': (r) => [...Object.keys(r.answers), r.incompatQuestionId],
};
export const ruleQuestionIds = (rule) => (RULE_REFS[rule.ruleType]?.(rule) ?? []).map(String);

export const sortedSiblings = (questions, parentId) =>
  Object.entries(questions)
    .filter(([, q]) => String(q.parentQuestionId) === String(parentId))
    .sort((a, b) => orderOf(a) - orderOf(b));

export const renumberSiblings = (questions, parentId) => ({
  ...questions,
  ...Object.fromEntries(
    sortedSiblings(questions, parentId).map(([id, q], i) => [id, { ...q, [orderKey(q)]: i + 1 }])),
});

export const removeQuestionCascade = ({ questions, rules }, qId) => {
  const orphaned = descendantIds(questions, qId);
  const keep = (id) => !orphaned.includes(String(id));
  return {
    questions: renumberSiblings(
      Object.fromEntries(Object.entries(questions).filter(([id]) => keep(id))),
      questions[qId].parentQuestionId),
    rules: rules.filter((rule) => ruleQuestionIds(rule).every(keep)),
  };
};

export const moveQuestion = (questions, id, direction) => {
  const siblings = sortedSiblings(questions, questions[id].parentQuestionId);
  const i = siblings.findIndex(([sid]) => sid === String(id));
  const j = i + direction;
  if (j < 0 || j >= siblings.length) return questions;
  const [[idA, a], [idB, b]] = [siblings[i], siblings[j]];
  return {
    ...questions,
    [idA]: { ...a, [orderKey(a)]: b[orderKey(b)] },
    [idB]: { ...b, [orderKey(b)]: a[orderKey(a)] },
  };
};

// On load: numeric parent ids, cardOrder -1 on children, siblingOrder filled per group.
export const normalizeQuestions = (raw = {}) => {
  const typed = Object.fromEntries(Object.entries(raw).map(([id, q]) => [id, {
    ...q,
    parentQuestionId: Number(q.parentQuestionId ?? -1),
    ...(Number(q.parentQuestionId ?? -1) !== -1 && { cardOrder: -1 }),
  }]));
  const parents = _.uniq(Object.values(typed).map((q) => q.parentQuestionId).filter((p) => p !== -1));
  return parents.reduce(renumberSiblings, typed);
};

export const QuestionCard = ({
  qId,
  questions,
  setQuestions,
  onMove,
  depth = 0
}) => {
  const question = questions[qId];
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!question) return null;

  const children = Object.entries(questions).filter(
    ([id, q]) => parseInt(q.parentQuestionId, 10) === parseInt(qId, 10)
  );

  const isInputType = question.componentType === 'input';

  const getHierarchyString = (currentId) => {
    const buildHierarchy = (id, acc) => {
      const q = questions[id];
      if (!q) return acc;

      if (parseInt(q.parentQuestionId, 10) === -1) {
        return [q.cardOrder || id, ...acc];
      }

      const siblings = Object.keys(questions).filter(
        (k) => parseInt(questions[k].parentQuestionId, 10) === parseInt(q.parentQuestionId, 10)
      );
      const order = siblings.indexOf(id.toString()) + 1;

      return buildHierarchy(q.parentQuestionId, [order, ...acc]);
    };

    return buildHierarchy(currentId, []).join('.');
  };

  const updateQuestion = (field, value) => {    
    setQuestions({
      ...questions,
      [qId]: { ...questions[qId], [field]: value },
    });
    dispatch([event_ids.questions.updateQuestion, qId, field, value]);
  };

  const updateAnswer = (aId, field, value) => {
    setQuestions({
      ...questions,
      [qId]: {
        ...questions[qId],
        answers: {
          ...questions[qId].answers,
          [aId]: { ...questions[qId].answers[aId], [field]: value },
        },
      },
    });
    dispatch([event_ids.questions.updateAnswer, qId, aId, field, value]);
  };

  const addAnswer = () => {
    const aIds = Object.keys(question.answers).map(Number);
    const nextAId = (aIds.length > 0 ? Math.max(...aIds) + 1 : 1).toString();    
    updateQuestion('answers', {
      ...question.answers,
      [nextAId]: { answer: '', color: '#cbd5e1', hide: false },
    });
    dispatch([event_ids.questions.updateQuestion, qId, 'answers',
      {... question.answers,
        [nextAId]: { answer: '', color: '#cbd5e1', hide: false }}]);
  };

  const removeAnswer = (aId) => {
    const newAnswers = { ...question.answers };
    delete newAnswers[aId];
    updateQuestion('answers', newAnswers);
    dispatch([event_ids.questions.updateQuestion, qId, 'answers', newAnswers]);
  };

  const removeQuestion = () => dispatch([event_ids.questions.removeQuestion, qId, removeQuestionCascade]);


  return (
    <div
      className="question-node-wrapper"
      style={{ marginLeft: depth > 0 ? '40px' : '0' }}
    >
      {depth > 0 && <div className="question-branch-line" />}

      <div className="card">
        <div
          className="question-card-header"
          style={{ marginBottom: isCollapsed ? '0' : '15px' }}
        >
          <div className="question-header-left">
            <button
              className="btn-icon-sm question-action-btn"
              onClick={() => onMove(qId, -1)}
            >
              <SvgIcon icon="upCaretNew" color="#2d6f74" size="2rem" />
            </button>
            <button
              className="btn-icon-sm question-action-btn"
              onClick={() => onMove(qId, 1)}
            >
              <SvgIcon icon="downCaretNew" color="#2d6f74" size="2rem" />
            </button>
            <span className="question-header-title">
              {getHierarchyString(qId)}. {question.question}
            </span>
          </div>
          <button
            className="question-collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <SvgIcon
              icon={isCollapsed ? "downCaretNew" : "upCaretNew"}
              size="2rem"
              color="#000"
            />
          </button>
        </div>
        
        {!isCollapsed && (
          <div className="question-card-body">
            <label className="text-label-sm">
              Question Text <span className="question-required-asterisk">*</span>
            </label>
            <input
              className="text-input"
              defaultValue={question.question}
              placeholder="Enter Text"
              onBlur={(e) => updateQuestion('question', e.target.value)}
            />
            <label className="text-label-sm">
              Question Label (Optional) <SvgIcon icon="info" size="0.8rem" />
            </label>
            <input
              className="text-input"
              defaultValue={question.questionLabel || ''}
              placeholder="Enter Label"
              onBlur={(e) => updateQuestion('label', e.target.value)}
            />
            <div className="question-metadata-row">
              <span>
                Component Type: <strong>{question.componentType} - {question.dataType || 'text'}</strong>
              </span>
            </div>
            <div className="question-answers-container">
              <div className="question-answers-header-row">
                <label className="text-label-sm question-color-label">Color *</label>
                <label className="text-label-sm question-answer-label-group">
                  <span>Answer Text *</span>
                  <span className="question-hide-answer-label">Hide Answer</span>
                </label>
              </div>
              {Object.entries(question.answers).map(([aId, a]) => (
                <div key={aId} className="question-answer-row">
                  <input
                    type="color"
                    className="question-color-picker"
                    value={a.color}
                    onChange={(e) => updateAnswer(aId, 'color', e.target.value)}
                  />
                  <input
                    type="text"
                    className="text-input question-answer-input"
                    value={a.answer}
                    placeholder={`Enter Answer ${question.dataType === 'number' ? 'Number' : 'Text'}`}
                    onKeyDown={(e) => {
                      if (question.dataType === 'number' && ['e', 'E'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    defaultValue={question.dataType === 'number' ? 0 : ''}                    
                    onChange={(e) => {
                      const regex = /^[0-9]*\.?[0-9]*$/;
                      question.dataType === 'number'
                        ? updateAnswer(aId, 'answer', regex.test(e.target.value)
                                       ? e.target.value
                                       : e.target.value.slice(0, e.target.value.length - 1))
                        : updateAnswer(aId, 'answer', e.target.value);}}
                  />
                  <input
                    type="checkbox"
                    checked={a.hide || false}
                    onChange={(e) => updateAnswer(aId, 'hide', e.target.checked)}
                  />
                  {(!isInputType && Object.keys(question.answers).length > 1) && (
                    <div
                      className="question-delete-icon"
                      onClick={() => removeAnswer(aId)}
                    >
                      <SvgIcon icon="trash" size="1.1rem" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="question-card-footer">
              {!isInputType && (
                <button className="btn-outline-teal" onClick={addAnswer}>
                  <SvgIcon icon="plus" size="0.8rem" /> Add Another Answer
                </button>
              )}

              <div className="question-footer-actions">
                <label className="labeled-input question-hide-toggle">
                  <input
                    type="checkbox"
                    checked={question.hideQuestion || false}
                    onChange={(e) => updateQuestion('hideQuestion', e.target.checked)}
                  />
                  <span className="text-label-sm">Hide Question</span>
                </label>

                <button className="btn-delete-card" onClick={removeQuestion}>
                  <SvgIcon icon="trash" size="1.1rem" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {children.map(([id]) => (
        <QuestionCard
          key={id}
          qId={id}
          questions={questions}
          setQuestions={setQuestions}
          onMove={onMove}
          depth={depth + 1}
        />
      ))}
    </div>
  );
};

export const SurveyQuestionsStep = () => {
  const [duplicateWarning, confirmDuplicateWarning] = useState(false);
  const newDefaultQuestion = {
    questionText: '',
    questionLabel: '',
    componentType: 'button',
    dataType: 'text',
    parentQuestionId: "-1",
    parentAnswerIds: [],
    answers: null,
    required: false,
  };

  function setQuestions (questions) {dispatch([event_ids.questions.setQuestions, questions]);}
  const questions = useSubscription([sub_ids.questions.questions]);
  const [newQuestion, setNewQuestion] = useState(newDefaultQuestion);
  function errors (errors) {dispatch([event_ids.errors, [['questions', errors]]]);
                            confirmDuplicateWarning(true);}
  
  const addQuestion = () => {
    
    if (!newQuestion.questionText) return;

    const nextId = (Math.max(...Object.keys(questions).map(Number), 0) + 1).toString();
    const isTopLevel = newQuestion.parentQuestionId === "-1";

    const defaultAnswer = newQuestion.dataType === 'text' ? "Example Answer" : 0;
    const questionToAdd = {
      question: newQuestion.questionText,
      questionLabel: newQuestion.questionLabel,
      componentType: newQuestion.componentType,
      dataType: newQuestion.dataType,
      parentQuestionId: parseInt(newQuestion.parentQuestionId),
      parentAnswerIds: newQuestion.parentAnswerIds,
      cardOrder: isTopLevel
        ? Object.values(questions).filter((q) => q.parentQuestionId === -1).length + 1
        : null,
      answers: newQuestion.answers || {
        "1": { answer: defaultAnswer, color: "#109844" },
      },
      required: newQuestion.required,
    };    
    const duplicateQuestions =   Object.values(questions)
          .map(({question})=> question.split(/\(\d\)/)[0] == questionToAdd.question.split(/\(\d\)/)[0]);
    duplicateQuestions.some((e)=>e) && !duplicateWarning ? errors(
      [`Warning: This is a duplicate name.  It will be added as "${questionToAdd.question.split(/\(\d\)/)[0] + "(" + duplicateQuestions.length + ")"}" in design mode.`])
      : setQuestions({ ...questions, [nextId]: duplicateQuestions.some((e)=>e) ? {... questionToAdd, question: questionToAdd.question.split(/\(\d\)/)[0] + "(" + duplicateQuestions.length + ")"}
                       : questionToAdd });
    setNewQuestion(newDefaultQuestion);
  };

  const moveQuestion = (id, direction) => {
    const targetQ = questions[id];
    const parentId = targetQ.parentQuestionId;
    const siblings = Object.entries(questions)
      .filter(([_, q]) => q.parentQuestionId === parentId)
      .sort((a, b) => (a[1].cardOrder || 0) - (b[1].cardOrder || 0));

    const currentIndex = siblings.findIndex(([sId]) => sId === id);
    const nextIndex = currentIndex + direction;

    if (nextIndex >= 0 && nextIndex < siblings.length) {
      const [nextId, nextQ] = siblings[nextIndex];
      const newQuestions = { ... questions };
      const tempOrder = targetQ.cardOrder;
      newQuestions[id] = { ...targetQ, cardOrder: nextQ.cardOrder };
      newQuestions[nextId] = { ...nextQ, cardOrder: tempOrder };
      setQuestions(newQuestions);
      dispatch([event_ids.questions.moveQuestion, id, targetQ, nextId, nextQ]);
    }
  };

  const getParentAnswers = () => {
    if (newQuestion.parentQuestionId === "-1") return [];
    const parent = questions[newQuestion.parentQuestionId];
    return parent ? Object.entries(parent.answers) : [];
  };

  return (
    <div className="wizard-step-layout">
      <div className="wizard-sidebar">
        <div className="wizard-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <p className="card-title">
              QUESTIONS TO BE ANSWERED DURING COLLECTION <span style={{ color: 'red' }}>*</span>
            </p>
            <InfoTooltip
              title="Survey Questions"
              align="end"
              text={
                <>
                  Design questions your collectors will answer for each plot. Each question creates a column of data.
                  <a href="https://collect-earth-online-doc.readthedocs.io/en/latest/project/survey.html" target="_blank"> Learn more</a>
                </>
              } />
          </div>

          <label className="text-label-sm">
            Question Text <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            className="text-input"
            value={newQuestion.questionText}
            placeholder="Enter Text"
            onChange={(e) => setNewQuestion({
              ...newQuestion,
              questionText: e.target.value
            })}
          />

          <label className="text-label-sm">
            Question Label (Optional)
            <InfoTooltip
              title="Question Label"
              text="Use labels to organize your questions. Simple, one-word labels are best. "
            />
          </label>
          <input
            className="text-input"
            value={newQuestion.questionLabel}
            placeholder="Enter Label"
            onChange={(e) => setNewQuestion({
              ...newQuestion,
              questionLabel: e.target.value
            })}
          />

          <div style={{ display: 'flex', gap: '15px', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <div style={{ flex: newQuestion.componentType === 'copy' ? '1 1 calc(50% - 15px)' :
                            newQuestion.componentType === 'input' ? '1 1 calc(80% - 15px)':
                            '1' }}>
                <label className="text-label-sm">
                  Component Type <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  className="text-input"
                  value={`${newQuestion.componentType}-${newQuestion.dataType}`}
                  onChange={(e) => {                    
                    const [comp, data] = e.target.value.split('-');
                    setNewQuestion({
                      ...newQuestion,
                      componentType: comp,
                      dataType: data
                    });
                  }}
                >
                  <option value="button-text">Button - Text</option>
                  <option value="button-number">Button - Number</option>
                  <option value="radiobutton-text">Radiobutton - Text</option>
                  <option value="radiobutton-number">Radiobutton - Number</option>
                  <option value="dropdown-text">Dropdown - Text</option>
                  <option value="dropdown-number">Dropdown - Number</option>
                  <option value="input-text">Input - Text</option>
                  <option value="input-number">Input - Number</option>
                  <option value="copy-none">Copy Existing Question</option>
                </select>
              </div>
              {newQuestion.componentType === 'input' && (
                <div style={{
                  alignContent: 'center',
                  flex: '1 1 calc(20% - 15px)' }}>
                  <input
                    type="checkbox"
                    checked={newQuestion.required || false}
                    onChange={(e) => setNewQuestion({... newQuestion, required: e.target.checked})}
                  />
                  <span style={{alignContent: 'center'}}> Input text required? </span>
                  
                </div>)}
              {newQuestion.componentType === 'copy' && (
                <div style={{ flex: '1 1 calc(50% - 15px)' }}>
                  <label className="text-label-sm">
                    Select Question to Copy <span style={{ color: 'red' }}>*</span>
                  </label>
                  <select
                    className="text-input"
                    defaultValue=""
                    onChange={(e) => {
                      const targetQ = questions[e.target.value];
                      targetQ && setNewQuestion({
                        ...newQuestion,
                        questionText: `${targetQ.question} - COPY`,
                        questionLabel: targetQ.questionLabel || '',
                        componentType: targetQ.componentType,
                        dataType: targetQ.dataType,
                        answers: targetQ.answers
                      });
                    }}
                  >
                    <option value="" disabled>-- Select Question --</option>
                    {Object.entries(questions).map(([id, q]) => (
                      <option key={id} value={id}>
                        {q.question}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ flex: newQuestion.componentType === 'copy' ? '1 1 100%' : '1' }}>
                <label className="text-label-sm">Parent Question</label>
                <select
                  className="text-input"
                  value={newQuestion.parentQuestionId}
                  onChange={(e) => setNewQuestion({
                    ...newQuestion,
                    parentQuestionId: e.target.value,
                    parentAnswerIds: []
                  })}
                >
                  <option value="-1">None (Top Level)</option>
                  {Object.entries(questions).map(([id, q]) => (
                    <option key={id} value={id}>
                      {q.question}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ width: '100%' }}>
              <label className="text-label-sm">
                Parent Answer
              </label>
              <select
                className="text-input"
                disabled={newQuestion.parentQuestionId === "-1"}
                value={newQuestion.parentAnswerIds[0] || ""}
                onChange={(e) => setNewQuestion({
                  ...newQuestion,
                  parentAnswerIds: e.target.value ? [parseInt(e.target.value)] : []
                })}
              >
                <option value="">-- Select Parent Answer --</option>
                {getParentAnswers().map(([ansId, ansObj]) => (
                  <option key={ansId} value={ansId}>
                    {ansObj.answer}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            className="btn btn-sm"
            onClick={addQuestion}
            style={{
              width: '100%',
              backgroundColor: '#2d6f74',
              color: '#fff',
              marginTop: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <SvgIcon icon="plus" size="0.8rem" /> Add New Question
          </button>
        </div>

        <div className="questions-list-container">
          {Object.entries(questions)
            .filter(([id, q]) => q.parentQuestionId === -1)
            .sort((a, b) => a[1].cardOrder - b[1].cardOrder)
            .map(([id]) => (
              <QuestionCard
                key={id}
                qId={id}
                questions={questions}
                setQuestions={setQuestions}
                onMove={moveQuestion}
              />
            ))}
        </div>
      </div>

      <div
        className="wizard-preview-body"
        style={{paddingRight: '20px'}}>
        <div>
          <SurveyQuestions
            preview={true}
            surveyQuestions={questions}
          />
        </div>
      </div>
    </div>
  );
};

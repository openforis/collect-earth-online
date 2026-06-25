import React, { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { dispatch } from '@flexsurfer/reflex';
import { SurveyQuestions } from '../components/SurveyQuestions';
import SvgIcon from '../components/svg/SvgIcon';
import { event_ids, surveyQuestionsAtom } from '../state/projectWizard';


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
    ([id, q]) => q.parentQuestionId === parseInt(qId)
  );

  const updateQuestion = (field, value) => {    
    setQuestions((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], [field]: value },
    }));
    dispatch([event_ids.questions.updateQuestion, qId, field, value]);
  };

  const updateAnswer = (aId, field, value) => {
    setQuestions((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        answers: {
          ...prev[qId].answers,
          [aId]: { ...prev[qId].answers[aId], [field]: value },
        },
      },
    }));
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

  const removeQuestion = () => {
    const newQuestions = { ...questions };
    delete newQuestions[qId];
    setQuestions(newQuestions);
    dispatch([event_ids.questions.setQuestions, newQuestions]);
  };

  return (
    <div
      className="question-node-wrapper"
      style={{
        marginLeft: depth > 0 ? '40px' : '0',
        position: 'relative',
        marginTop: '20px',
      }}
    >
      {depth > 0 && (
        <div
          style={{
            position: 'absolute',
            left: '-25px',
            top: '-20px',
            bottom: '50%',
            width: '25px',
            borderLeft: '2px solid #cbd5e1',
            borderBottom: '2px solid #cbd5e1',
            borderBottomLeftRadius: '12px',
            zIndex: 0,
          }}
        />
      )}

      <div
        className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 15px',
            width: '100%',
            marginBottom: isCollapsed ? '0' : '15px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn-icon-sm"
              style={{
                border: '1px solid #A0CAC6',
                background: '#fff',
                borderRadius: '4px',
                width: '35px',
                height: '35px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              onClick={() => onMove(qId, -1)}
            >
              <SvgIcon icon="upCaretNew" color="#2d6f74" size="2rem" />
            </button>
            <button
              className="btn-icon-sm"
              style={{
                border: '1px solid #A0CAC6',
                background: '#fff',
                borderRadius: '4px',
                width: '35px',
                height: '35px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              onClick={() => onMove(qId, 1)}
            >
              <SvgIcon icon="downCaretNew" color="#2d6f74" size="2rem" />
            </button>
            <span
              style={{
                fontWeight: 'bold',
                fontSize: '0.85rem',
                color: '#555',
                textTransform: 'uppercase',
                marginLeft: '8px'
              }}
            >
              Survey Question {question.cardOrder || qId}
            </span>
          </div>
          <button
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '5px'
            }}
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
          <div style={{ padding: '0 15px 15px 15px' }}>
            <label className="text-label-sm">
              Question Text <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              className="text-input"
              value={question.question}
              placeholder="Enter Text"
              onChange={(e) => updateQuestion('question', e.target.value)}
            />
            <label className="text-label-sm">
              Question Label (Optional) <SvgIcon icon="info" size="0.8rem" />
            </label>
            <input
              className="text-input"
              value={question.questionLabel || ''}
              placeholder="Enter Label"
              onChange={(e) => updateQuestion('questionLabel', e.target.value)}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                margin: '15px 0',
              }}
            >
              <span style={{ fontSize: '0.85rem' }}>
                Component Type: <strong>{question.componentType} - {question.dataType || 'text'}</strong>
              </span>
            </div>
            <div style={{ width: '100%', marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '5px' }}>
                <label className="text-label-sm" style={{ width: '40px' }}>Color *</label>
                <label className="text-label-sm" style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Answer Text *</span>
                  <span style={{ marginRight: '30px' }}>Hide Answer</span>
                </label>
              </div>
              {Object.entries(question.answers).map(([aId, a]) => (
                <div
                  key={aId}
                  style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}
                >
                  <input
                    type="color"
                    value={a.color}
                    style={{
                      width: '40px',
                      height: '36px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      padding: '2px',
                    }}
                    onChange={(e) => updateAnswer(aId, 'color', e.target.value)}
                  />
                  <input
                    type={question.dataType === 'number' ? 'number' : 'text'}
                    className="text-input"
                    style={{ margin: 0, flex: 1 }}
                    value={a.answer}
                    placeholder={`Enter Answer ${question.dataType === 'number' ? 'Number' : 'Text'}`}
                    onKeyDown={(e) => {
                      if (question.dataType === 'number' && ['e', 'E'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const value = question.dataType === 'number' && e.target.value !== ''
                        ? Number(e.target.value)
                        : e.target.value;
                      updateAnswer(aId, 'answer', value);
                    }}
                  />
                  <input
                    type="checkbox"
                    checked={a.hide || false}
                    onChange={(e) => updateAnswer(aId, 'hide', e.target.checked)}
                  />
                  {Object.keys(question.answers).length > 1 && (
                    <div
                      onClick={() => removeAnswer(aId)}
                      style={{ cursor: 'pointer', color: '#f61313' }}
                    >
                      <SvgIcon icon="trash" size="1.1rem" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="question-card-footer">
              <button className="btn-outline-teal" onClick={addAnswer}>
                <SvgIcon icon="plus" size="0.8rem" /> Add Another Answer
              </button>

              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <label className="labeled-input" style={{ cursor: 'pointer' }}>
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
  const newDefaultQuestion = {
    questionText: '',
    questionLabel: '',
    componentType: 'button',
    dataType: 'text',
    parentQuestionId: "-1",
    parentAnswerIds: [],
  };
  const [questions, setQuestions] = useAtom(surveyQuestionsAtom);
  const [newQuestion, setNewQuestion] = useState(newDefaultQuestion);
  const addQuestion = () => {
    if (!newQuestion.questionText) return;

    const nextId = (Math.max(...Object.keys(questions).map(Number), 0) + 1).toString();
    const isTopLevel = newQuestion.parentQuestionId === "-1";

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
      answers: {
        "1": { answer: "Example Answer", color: "#109844" },
      },
    };

    setQuestions((prev) => ({ ...prev, [nextId]: questionToAdd }));
    dispatch([event_ids.questions.addQuestion, questionToAdd]);
    setNewQuestion(newDefaultQuestion);
  };

  const moveQuestion = (id, direction) => {
    const targetQ = questions[id];
    const parentId = targetQ.parentQuestionId;
    // Get all siblings at the same level
    const siblings = Object.entries(questions)
      .filter(([_, q]) => q.parentQuestionId === parentId)
      .sort((a, b) => (a[1].cardOrder || 0) - (b[1].cardOrder || 0));

    const currentIndex = siblings.findIndex(([sId]) => sId === id);
    const nextIndex = currentIndex + direction;

    if (nextIndex >= 0 && nextIndex < siblings.length) {
      const [nextId, nextQ] = siblings[nextIndex];
      setQuestions(prev => {
        const newQuestions = { ...prev };
        const tempOrder = targetQ.cardOrder;
        newQuestions[id] = { ...targetQ, cardOrder: nextQ.cardOrder };
        newQuestions[nextId] = { ...nextQ, cardOrder: tempOrder };
        return newQuestions;
      });
      dispatch([event_ids.questions.moveQuestion, id, targetQ, nextId, nextQ]);
    }
  };

  // Helper to get answers from the currently selected parent question
  const getParentAnswers = () => {
    if (newQuestion.parentQuestionId === "-1") return [];
    const parent = questions[newQuestion.parentQuestionId];
    return parent ? Object.entries(parent.answers) : [];
  };

  return (
    <div className="wizard-step-layout">
      <div className="wizard-sidebar">
        
        {/* CREATE QUESTION CARD */}
        <div className="card" style={{ width: '100%', border: '1px solid #2d6f74', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <p className="card-title">
              QUESTIONS TO BE ANSWERED DURING COLLECTION <span style={{ color: 'red' }}>*</span>
            </p>
            <SvgIcon icon="info" size="1.2rem" />
          </div>

          {/* Question Text */}
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

          {/* Question Label */}
          <label className="text-label-sm">
            Question Label (Optional) <SvgIcon icon="info" size="0.8rem" />
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

          {/* Component Type & Parent Row */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1 }}>
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
              </select>
            </div>

            <div style={{ flex: 1 }}>
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

          {/* Parent Answer Dropdown */}
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

        {/* THE QUESTION TREE */}
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

      {/* PREVIEW AREA */}
      <div
        className="wizard-preview-body"
        style={{ padding: "20px" }}
      >
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

import { useState } from 'react';
import { apiRequest } from '../lib/api.js';
import { button, card, form as formStyles, layout, text } from '../lib/ui.js';

const DIFFICULTIES = ['easy', 'medium', 'hard'];

function emptyOption(isCorrect = false) {
  return { text: '', is_correct: isCorrect };
}

function emptyQuestion() {
  return { text: '', difficulty: 'medium', points: 1, options: [emptyOption(true), emptyOption()] };
}

function questionsFromQuiz(quiz) {
  if (!quiz?.questions?.length) return [emptyQuestion()];
  return quiz.questions.map((question) => ({
    text: question.text,
    difficulty: question.difficulty || 'medium',
    points: question.points || 1,
    options: question.options.map((option) => ({ text: option.text, is_correct: Boolean(option.is_correct) })),
  }));
}

function validateQuizInput(title, durationMinutes, questions) {
  if (!title || !title.trim()) {
    return 'title is required';
  }
  if (!Number.isInteger(Number(durationMinutes)) || Number(durationMinutes) < 1 || Number(durationMinutes) > 180) {
    return 'duration must be a whole number between 1 and 180 minutes';
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    return 'at least one question is required';
  }
  for (const [qi, q] of questions.entries()) {
    if (!q.text || !q.text.trim()) {
      return `question ${qi + 1}: text is required`;
    }
    if (q.difficulty && !DIFFICULTIES.includes(q.difficulty)) {
      return `question ${qi + 1}: invalid difficulty`;
    }
    if (q.points !== undefined && q.points !== null && q.points !== '') {
      const p = Number(q.points);
      if (!Number.isFinite(p) || p <= 0) {
        return `question ${qi + 1}: points must be a positive number`;
      }
    }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return `question ${qi + 1}: at least 2 options required`;
    }
    const correctCount = q.options.filter((o) => o.is_correct).length;
    if (correctCount !== 1) {
      return `question ${qi + 1}: exactly one correct option required`;
    }
    if (q.options.some((o) => !o.text || !o.text.trim())) {
      return `question ${qi + 1}: option text is required`;
    }
  }
  return null;
}

function QuizEditor({ token, quiz, onSaved }) {
  const [title, setTitle] = useState(quiz?.title || '');
  const [description, setDescription] = useState(quiz?.description || '');
  const [durationMinutes, setDurationMinutes] = useState(quiz?.duration_minutes || 10);
  const [questions, setQuestions] = useState(questionsFromQuiz(quiz));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateQuestion(index, patch) {
    setQuestions((current) => current.map((question, i) => (i === index ? { ...question, ...patch } : question)));
  }

  function updateOption(qIndex, oIndex, patch) {
    setQuestions((current) => current.map((question, i) => {
      if (i !== qIndex) return question;
      return { ...question, options: question.options.map((option, j) => (j === oIndex ? { ...option, ...patch } : option)) };
    }));
  }

  function setCorrectOption(qIndex, oIndex) {
    setQuestions((current) => current.map((question, i) => {
      if (i !== qIndex) return question;
      return { ...question, options: question.options.map((option, j) => ({ ...option, is_correct: j === oIndex })) };
    }));
  }

  function addQuestion() {
    setQuestions((current) => [...current, emptyQuestion()]);
  }

  function removeQuestion(index) {
    setQuestions((current) => current.filter((_, i) => i !== index));
  }

  function addOption(qIndex) {
    setQuestions((current) => current.map((question, i) => (
      i === qIndex ? { ...question, options: [...question.options, emptyOption()] } : question
    )));
  }

  function removeOption(qIndex, oIndex) {
    setQuestions((current) => current.map((question, i) => {
      if (i !== qIndex) return question;
      let options = question.options.filter((_, j) => j !== oIndex);
      if (options.length && !options.some((option) => option.is_correct)) {
        options = options.map((option, j) => (j === 0 ? { ...option, is_correct: true } : option));
      }
      return { ...question, options };
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validateQuizInput(title, durationMinutes, questions);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      duration_minutes: Number(durationMinutes),
      questions: questions.map((question) => ({
        text: question.text.trim(),
        difficulty: question.difficulty || 'medium',
        points: question.points ? Number(question.points) : 1,
        options: question.options.map((option) => ({ text: option.text.trim(), is_correct: Boolean(option.is_correct) })),
      })),
    };

    setError('');
    setSaving(true);
    try {
      if (quiz) {
        await apiRequest(`/quizzes/${quiz.id}`, { method: 'PUT', token, body: JSON.stringify(payload) });
      } else {
        await apiRequest('/quizzes', { method: 'POST', token, body: JSON.stringify(payload) });
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={layout.formStack} onSubmit={handleSubmit}>
      <h2>{quiz ? 'Edit quiz' : 'Create a quiz'}</h2>
      <label className={formStyles.label}>
        Title
        <input className={formStyles.control} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Quiz title" />
      </label>
      <label className={formStyles.label}>
        Description
        <textarea className={formStyles.textarea} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional description" />
      </label>
      <label className={formStyles.label}>
        Duration (minutes)
        <input className={formStyles.control} type="number" min="1" max="180" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} />
      </label>

      <div className={layout.listStack}>
        {questions.map((question, qIndex) => (
          <fieldset className={card.question} key={qIndex}>
            <div className={layout.rowBetween}>
              <legend className="p-0 font-black">Question {qIndex + 1}</legend>
              <button type="button" className={button.danger} onClick={() => removeQuestion(qIndex)} disabled={questions.length <= 1}>Remove question</button>
            </div>
            <label className={formStyles.label}>
              Question text
              <input className={formStyles.control} value={question.text} onChange={(event) => updateQuestion(qIndex, { text: event.target.value })} placeholder="Question text" />
            </label>
            <div className={layout.twoColumn}>
              <label className={formStyles.label}>
                Difficulty
                <select className={formStyles.control} value={question.difficulty} onChange={(event) => updateQuestion(qIndex, { difficulty: event.target.value })}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
              <label className={formStyles.label}>
                Points
                <input className={formStyles.control} type="number" min="1" step="1" value={question.points} onChange={(event) => updateQuestion(qIndex, { points: event.target.value })} />
              </label>
            </div>
            <div className={layout.listStack}>
              {question.options.map((option, oIndex) => (
                <div className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2.5" key={oIndex}>
                  <input className={formStyles.radio} type="radio" name={`correct-${qIndex}`} checked={option.is_correct} onChange={() => setCorrectOption(qIndex, oIndex)} title="Correct option" />
                  <input className={formStyles.control} value={option.text} onChange={(event) => updateOption(qIndex, oIndex, { text: event.target.value })} placeholder={`Option ${oIndex + 1}`} />
                  <button type="button" className={button.ghost} onClick={() => removeOption(qIndex, oIndex)} disabled={question.options.length <= 2}>Remove</button>
                </div>
              ))}
            </div>
            <button type="button" className={button.ghost} onClick={() => addOption(qIndex)}>Add option</button>
          </fieldset>
        ))}
      </div>

      <button type="button" className={button.ghost} onClick={addQuestion}>Add question</button>

      {error && <p className={text.error}>{error}</p>}
      <button className={button.primary} disabled={saving}>{saving ? 'Saving…' : quiz ? 'Save changes' : 'Create quiz'}</button>
    </form>
  );
}

export default QuizEditor;

import { useState } from 'react';
import { apiRequest } from '../lib/api.js';
import { emptyQuestion } from '../lib/quizForm.js';
import { button, card, form as formStyles, layout, text } from '../lib/ui.js';

function QuizEditor({ token, quiz, onSaved }) {
  const initialForm = quiz ? {
    title: quiz.title,
    description: quiz.description,
    questions: quiz.questions.map((question) => ({
      text: question.text,
      options: question.options.map((option) => ({ text: option.text, is_correct: Boolean(option.is_correct) })),
    })),
  } : { title: '', description: '', questions: [emptyQuestion()] };
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');

  function updateQuestion(index, patch) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...patch } : question
      ),
    }));
  }

  function updateOption(questionIndex, optionIndex, patch) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) => {
        if (index !== questionIndex) return question;
        return {
          ...question,
          options: question.options.map((option, currentOptionIndex) => {
            if (patch.is_correct && currentOptionIndex !== optionIndex) return { ...option, is_correct: false };
            return currentOptionIndex === optionIndex ? { ...option, ...patch } : option;
          }),
        };
      }),
    }));
  }

  function addOption(questionIndex) {
    updateQuestion(questionIndex, {
      options: [...form.questions[questionIndex].options, { text: '', is_correct: false }],
    });
  }

  async function save(event) {
    event.preventDefault();
    setError('');
    try {
      await apiRequest(quiz ? `/quizzes/${quiz.id}` : '/quizzes', {
        method: quiz ? 'PUT' : 'POST',
        token,
        body: JSON.stringify(form),
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={save}>
      <div className={layout.twoColumn}>
        <label className={formStyles.label}>
          Quiz title
          <input className={formStyles.control} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </label>
        <label className={formStyles.label}>
          Description
          <input className={formStyles.control} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
      </div>
      {form.questions.map((question, questionIndex) => (
        <div className={card.question} key={questionIndex}>
          <div className={layout.rowBetween}>
            <h3>Question {questionIndex + 1}</h3>
            {form.questions.length > 1 && (
              <button type="button" className={button.ghost} onClick={() => setForm({ ...form, questions: form.questions.filter((_, index) => index !== questionIndex) })}>Remove</button>
            )}
          </div>
          <label className={formStyles.label}>
            Prompt
            <textarea className={formStyles.textarea} value={question.text} onChange={(e) => updateQuestion(questionIndex, { text: e.target.value })} required />
          </label>
          <div className="grid gap-2.5">
            {question.options.map((option, optionIndex) => (
              <label className="grid grid-cols-[22px_minmax(0,1fr)] items-center gap-2.5 rounded-lg" key={optionIndex}>
                <input className={formStyles.radio} type="radio" name={`correct-${questionIndex}`} checked={option.is_correct} onChange={() => updateOption(questionIndex, optionIndex, { is_correct: true })} />
                <input className={formStyles.control} value={option.text} onChange={(e) => updateOption(questionIndex, optionIndex, { text: e.target.value })} placeholder={`Option ${optionIndex + 1}`} required />
              </label>
            ))}
          </div>
          <button type="button" className={button.ghost} onClick={() => addOption(questionIndex)}>Add option</button>
        </div>
      ))}
      {error && <p className={text.error}>{error}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" className={button.secondary} onClick={() => setForm({ ...form, questions: [...form.questions, emptyQuestion()] })}>Add question</button>
        <button className={button.primary}>{quiz ? 'Save changes' : 'Create quiz'}</button>
      </div>
    </form>
  );
}

export default QuizEditor;
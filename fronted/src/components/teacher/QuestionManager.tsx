import React, { useEffect, useState } from 'react';
import type { TestSet, Question as APIQuestion } from '../../services/api';
import apiService from '../../services/api';

// Local types — normalize backend shapes to what the component expects
type OptionLocal = {
  id: number; // can be negative for unsaved options
  text: string;
  is_correct?: boolean;
};

type QuestionLocal = {
  id?: number;  // Made optional with ?
  text: string;
  options: OptionLocal[];
  correct_answer: number | null; // index of correct option in options array
};

type BlockLocal = {
  id: number;
  title: string;
  description?: string;
  start_time?: string | null;
  end_time?: string | null;
  questions: QuestionLocal[]; // normalized name
};

// Helper to convert backend question -> QuestionLocal
const normalizeQuestion = (q: APIQuestion): QuestionLocal => {
  const options: OptionLocal[] = (q.options || []).map((o, idx) => ({
    id: o.id,
    text: o.text,
    is_correct: !!o.is_correct,
  }));

  // backend may store correct_answer as index OR option id; try to detect
  let correct_answer: number | null = null;
  if (typeof q.correct_answer === 'number') {
    // find if this number matches an option id
    const byId = options.findIndex((o) => o.id === q.correct_answer);
    if (byId !== -1) correct_answer = byId;
    else if (q.correct_answer >= 0 && q.correct_answer < options.length) correct_answer = q.correct_answer;
  }

  // fallback: infer from options is_correct
  if (correct_answer === null) {
    const inferred = options.findIndex((o) => !!o.is_correct);
    if (inferred !== -1) correct_answer = inferred;
  }

  return {
    id: q.id,
    text: q.text,
    options,
    correct_answer,
  };
};

const QuestionManager: React.FC = () => {
  const [blocks, setBlocks] = useState<BlockLocal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // UI state for creating/editing questions
  const [openQuestionBlockId, setOpenQuestionBlockId] = useState<number | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<{ blockId: number; question: QuestionLocal } | null>(null);

  const emptyQuestionForm = (): QuestionLocal => ({
    id: undefined, // No ID for new questions
    text: '',
    options: [
      { id: -1, text: '' },
      { id: -2, text: '' },
    ],
    correct_answer: null,
  });

  const [questionForm, setQuestionForm] = useState<QuestionLocal>(emptyQuestionForm());

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res: TestSet[] = await apiService.getTestSets();

        // Normalize each testset: some backends return `questions` or `tests` — handle both
        const normalized: BlockLocal[] = (res || []).map((t) => ({
          id: t.id!,
          title: t.title || '',
          description: t.description || '',
          start_time: t.start_time || null,
          end_time: t.end_time || null,
          questions: (t.questions || (t.tests as any) || []).map((q: APIQuestion) => normalizeQuestion(q)),
        }));

        setBlocks(normalized);
      } catch (err) {
        console.error(err);
        setError('Bloklarni olishda xatolik yuz berdi');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Helpers to update local blocks state
  const refreshBlock = async (blockId: number) => {
    try {
      const res: TestSet = await apiService.getTestSet(blockId);
      const updated: BlockLocal = {
        id: res.id!,
        title: res.title || '',
        description: res.description || '',
        start_time: res.start_time || null,
        end_time: res.end_time || null,
        questions: (res.questions || (res.tests as any) || []).map((q: APIQuestion) => normalizeQuestion(q)),
      };
      setBlocks((prev) => prev.map((b) => (b.id === blockId ? updated : b)));
    } catch (err) {
      console.error(err);
      setError('Blok yangilanmadi');
    }
  };

  // Create question
  const handleCreateQuestion = async (blockId: number) => {
    try {
      // Validate
      if (!questionForm.text.trim()) {
        setError('Savol matni bosh bolmasin');
        return;
      }
      if (questionForm.options.length < 2) {
        setError('Kamida 2 ta variant bolishi kerak');
        return;
      }

      // Prepare payload — backend likely expects options array and indication of correct option (id or index)
      const payload = {
        text: questionForm.text,
        options: questionForm.options.map((o) => ({ id: o.id > 0 ? o.id : undefined, text: o.text })),
        // send correct answer as index — many backends accept either index or option id
        correct_answer: questionForm.correct_answer,
      };

      // Call backend. Using the service name you used earlier in your project.
      await apiService.createTestSetQuestion(blockId, payload);

      // refresh block from server to get real ids
      await refreshBlock(blockId);

      // close form
      setOpenQuestionBlockId(null);
      setQuestionForm(emptyQuestionForm());
    } catch (err) {
      console.error(err);
      setError('Savol yaratishda xatolik');
    }
  };

  // Update question
  const handleUpdateQuestion = async (blockId: number, q: QuestionLocal) => {
    try {
      if (q.id === undefined || q.id < 0) {
        setError('Saqlanmagan savolni yangilab bolmaydi');
        return;
      }

      const payload = {
        text: q.text,
        options: q.options.map((o) => ({ id: o.id > 0 ? o.id : undefined, text: o.text })),
        correct_answer: q.correct_answer,
      };

      await apiService.updateQuestion(blockId, q.id, payload);

      // update local without forcing full refresh (but safer to refresh single block)
      await refreshBlock(blockId);

      setEditingQuestion(null);
      setOpenQuestionBlockId(null);
      setQuestionForm(emptyQuestionForm());
    } catch (err) {
      console.error(err);
      setError('Savolni yangilashda xatolik');
    }
  };

  const handleDeleteQuestion = async (blockId: number, questionId: number | undefined) => {
    if (questionId === undefined) {
      setError('Noto\'g\'ri savol ID si');
      return;
    }
    if (!window.confirm("Haqiqatan ham bu savolni o'chirmoqchimisiz?")) return;
    try {
      // Find the question index in the block
      const block = blocks.find(b => b.id === blockId);
      if (!block) return;
      
      const questionIndex = block.questions.findIndex(q => q.id === questionId);
      if (questionIndex === -1) return;
      
      // Ensure we have a valid question ID before proceeding
      const question = block.questions[questionIndex];
      if (!question.id) {
        setError('Noto\'g\'ri savol ID si');
        return;
      }
      
      await apiService.deleteQuestion(blockId, questionIndex);
      // refresh block
      await refreshBlock(blockId);
    } catch (err) {
      console.error(err);
      setError('Savolni ochirishda xatolik');
    }
  };

  // Option helpers
  const addOption = () => {
    const nextId = Math.min(...questionForm.options.map((o) => o.id), 0) - 1; // ensure unique negative ids
    setQuestionForm((prev) => ({ ...prev, options: [...prev.options, { id: nextId, text: '' }] }));
  };

  const removeOptionAt = (index: number) => {
    setQuestionForm((prev) => {
      const newOptions = prev.options.filter((_, i) => i !== index);
      let newCorrect = prev.correct_answer;
      if (newCorrect === null) {
        // nothing
      } else if (newCorrect === index) {
        newCorrect = null;
      } else if (newCorrect! > index) {
        newCorrect = newCorrect! - 1;
      }
      return { ...prev, options: newOptions, correct_answer: newCorrect };
    });
  };

  const setOptionText = (index: number, text: string) => {
    setQuestionForm((prev) => {
      const newOptions = [...prev.options];
      newOptions[index] = { ...newOptions[index], text };
      return { ...prev, options: newOptions };
    });
  };

  const setCorrectByIndex = (index: number) => {
    setQuestionForm((prev) => ({ ...prev, correct_answer: index }));
  };

  // Block CRUD (simple implementations using apiService methods you already have)
  const handleEditBlock = (block: BlockLocal) => {
    // open a modal in your app if you want; for brevity we just reuse the browser prompt
    const title = window.prompt('Blok nomini kiriting', block.title);
    if (!title) return;
    const { id, title: newTitle, description, start_time, end_time } = block;
    apiService.updateTestSet(id, { title: newTitle, description, start_time, end_time })
      .then(() => refreshBlock(id))
      .catch((e: any) => { console.error(e); setError('Blokni yangilashda xato'); });
  };

  const handleDeleteBlock = async (blockId: number) => {
    if (!window.confirm('Haqiqatan ham bu blokni o\'chirmoqchimisiz?')) return;
    try {
      await apiService.deleteTestSet(blockId);
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    } catch (err) {
      console.error(err);
      setError('Blokni o\'chirishda xatolik');
    }
  };

  // When user clicks "Add question" for a block
  const handleEditQuestion = (blockId: number, question: QuestionLocal) => {
    if (question.id === undefined) {
      setError('Tahrirlash uchun savol ID si kerak');
      return;
    }
    setEditingQuestion({ blockId, question });
    setQuestionForm(question);
    setOpenQuestionBlockId(blockId);
  };

  const openNewQuestionForm = (blockId: number) => {
    setEditingQuestion(null);
    setQuestionForm(emptyQuestionForm());
    setOpenQuestionBlockId(blockId);
  };

  // When user clicks "Edit" for a question
  const openEditQuestionForm = (blockId: number, q: QuestionLocal) => {
    if (q.id === undefined) {
      setError('Tahrirlash uchun savol ID si kerak');
      return;
    }
    handleEditQuestion(blockId, q);
    // clone q so editing doesn't mutate local state until saved
    setQuestionForm({ ...q, options: q.options.map((o) => ({ ...o })) });
    setOpenQuestionBlockId(blockId);
  };

  if (loading) return <div className="p-6 text-blue-600 font-semibold animate-pulse">Yuklanmoqda...</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold text-blue-600 mb-8 tracking-wide">Test Savollari Boshqaruvi</h1>

      <div className="mt-8 space-y-6">
        {blocks.map((block) => (
          <div key={block.id} className="bg-white p-5 rounded-xl shadow-md border border-slate-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold text-blue-700 mb-1">{block.title}</h3>
                <p className="text-slate-600 mb-2">{block.description}</p>
                <p className="text-sm text-slate-500 mb-2">
                  {block.start_time ? new Date(block.start_time).toLocaleString() : 'Muddati yo\'q'} – 
                  {block.end_time ? new Date(block.end_time).toLocaleString() : 'Muddati yo\'q'}
                </p>

                <div className="mt-4">
                  <h4 className="font-medium text-slate-700 mb-2">Savollar:</h4>
                  <div className="space-y-3">
                    {block.questions.map((question, qIndex) => (
                      <div key={question.id ?? `temp-${qIndex}`} className="pl-3 py-2 border-l-4 border-blue-300 bg-slate-50 rounded-lg">
                        <p className="font-medium text-slate-800">{qIndex + 1}. {question.text}</p>

                        <div className="ml-4 mt-2 space-y-1">
                          {question.options.map((opt, oIndex) => (
                            <div key={opt.id} className={`flex items-center gap-2 ${oIndex === question.correct_answer ? 'text-green-700 font-semibold' : 'text-slate-600'}`}>
                              <span className="w-4">{String.fromCharCode(97 + oIndex)})</span>
                              <span>{opt.text}</span>
                              {oIndex === question.correct_answer && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">To‘g‘ri</span>}
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 flex gap-3">
                          <button onClick={() => openEditQuestionForm(block.id, question)} className="text-blue-600 text-sm hover:underline">Tahrirlash</button>
                          <button 
                            onClick={() => question.id !== undefined && handleDeleteQuestion(block.id, question.id)} 
                            className="text-red-600 text-sm hover:underline"
                            disabled={question.id === undefined}
                          >
                            O'chirish
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 text-right">
                <button onClick={() => handleEditBlock(block)} className="text-blue-600 font-medium">Tahrirlash</button>
                <button onClick={() => openNewQuestionForm(block.id)} className="text-green-600 font-medium">Savol qo‘shish</button>
                <button onClick={() => handleDeleteBlock(block.id)} className="text-red-600 font-medium">O‘chirish</button>
              </div>
            </div>

            {/* Question form */}
            {openQuestionBlockId === block.id && (
              <div className="mt-4 p-5 bg-white rounded-xl shadow-lg border border-slate-200">
                <h3 className="text-lg font-semibold text-blue-600 mb-4">{editingQuestion ? 'Savolni tahrirlash' : "Yangi savol qo'shish"}</h3>

                <form onSubmit={async (e) => { e.preventDefault(); if (editingQuestion) await handleUpdateQuestion(block.id, questionForm); else await handleCreateQuestion(block.id); }} className="space-y-4">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Savol matni</label>
                    <input value={questionForm.text} onChange={(e) => setQuestionForm(prev => ({ ...prev, text: e.target.value }))} required className="w-full p-2.5 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-2">Variantlar</label>
                    <div className="space-y-3">
                      {questionForm.options.map((opt, idx) => (
                        <div key={opt.id} className="flex items-center gap-3 bg-slate-50 px-2 py-2 rounded-lg hover:bg-slate-100">
                          <input type="radio" checked={questionForm.correct_answer === idx} onChange={() => setCorrectByIndex(idx)} className="w-4 h-4" />
                          <input value={opt.text} onChange={(e) => setOptionText(idx, e.target.value)} required className="flex-1 p-2 border rounded-lg bg-white outline-none" placeholder="Variant matni" />
                          <button type="button" disabled={questionForm.options.length <= 2} onClick={() => removeOptionAt(idx)} className="text-red-500 text-lg px-2 py-1 hover:text-red-700 active:scale-90 transition disabled:text-slate-300">×</button>
                        </div>
                      ))}
                    </div>

                    <button type="button" onClick={addOption} className="text-blue-600 text-sm font-medium mt-2 hover:text-blue-800">+ Variant qo‘shish</button>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => { setOpenQuestionBlockId(null); setEditingQuestion(null); setQuestionForm(emptyQuestionForm()); }} className="px-4 py-2 border rounded-lg hover:bg-slate-100">Bekor qilish</button>
                    <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700">Saqlash</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <div className="fixed bottom-6 right-6 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">{error}</div>}
    </div>
  );
};

export default QuestionManager;

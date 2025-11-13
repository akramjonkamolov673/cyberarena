import React, { useState, useEffect } from 'react';
import type { TestSet, Question as APIQuestion, QuestionOption } from '../../services/api';
import apiService from '../../services/api';

// TYPES
// Question type with proper typing for options
type Question = Omit<APIQuestion, 'options'> & {
  options: QuestionOption[];
  correct_answer: number | null;
  test_set?: number;
};

interface Block extends Omit<TestSet, 'questions' | 'tests'> {
  questions?: Question[];
  tests?: Question[];
}

type QuestionForm = {
  id?: number;
  text: string;
  options: Array<{ id: number; text: string; is_correct?: boolean }>;
  correct_answer: number | null;
  test_set?: number;
};

const QuestionManager: React.FC = () => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Display error message if there's an error
  useEffect(() => {
    if (error) {
      console.error(error);
      // You can use a toast notification here instead of console.error
      setError(null); // Clear error after handling
    }
  }, [error]);

  // Question management functions
  const handleDeleteQuestion = async (blockId: number, questionId: number) => {
    try {
      await apiService.deleteQuestion(questionId);
      setBlocks(blocks.map(block => {
        if (block.id === blockId) {
          return {
            ...block,
            questions: block.questions?.filter(q => q.id !== questionId)
          };
        }
        return block;
      }));
    } catch (err) {
      setError("Savolni o'chirishda xatolik");
    }
  };

  const handleEditBlock = (block: Block) => {
    setEditingBlock(block);
    setBlockForm({
      title: block.title,
      description: block.description || '',
      start_date: block.start_date || '',
      end_date: block.end_date || ''
    });
    setShowBlockForm(true);
  };

  const handleDeleteBlock = async (id: number) => {
    if (window.confirm("Haqiqatan ham bu blokni o'chirmoqchimisiz?")) {
      try {
        await apiService.deleteTestSet(id);
        setBlocks(blocks.filter(block => block.id !== id));
      } catch (err) {
        setError("Blokni o'chirishda xatolik");
      }
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent, blockId?: number) => {
    e.preventDefault();
    if (!editingQuestion && !blockId) return;

    try {
      let saved: Question;
      if (editingQuestion) {
        const response = await apiService.updateQuestion(editingQuestion.question.id!, questionForm);
        saved = response as unknown as Question;
        
        // Update the blocks state with the updated question
        setBlocks(prevBlocks => prevBlocks.map(block => {
          if (block.id === editingQuestion.blockId) {
            return {
              ...block,
              questions: block.questions?.map(q => 
                q.id === saved.id ? saved : q
              )
            } as Block;
          }
          return block;
        }));
      } else if (blockId) {
        // Create new question
        const response = await apiService.createTestSetQuestion(blockId, {
          ...questionForm,
          test_set: blockId
        });
        saved = response as unknown as Question;
        
        // Add the new question to the blocks state
        setBlocks(prevBlocks => prevBlocks.map(block => {
          if (block.id === blockId) {
            return {
              ...block,
              questions: [...(block.questions || []), saved]
            } as Block;
          }
          return block;
        }));
      } else {
        return;
      }
      setShowQuestionForm(null);
      setEditingQuestion(null);
    } catch (err) {
      setError("Savolni saqlashda xatolik");
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...questionForm.options];
    newOptions[index] = { ...newOptions[index], text: value };
    setQuestionForm({ ...questionForm, options: newOptions });
  };


  const removeOption = (id: number) => {
    const index = questionForm.options.findIndex(opt => opt.id === id);
    if (index === -1) return;
    
    const newOptions = questionForm.options.filter(opt => opt.id !== id);
    setQuestionForm({ 
      ...questionForm, 
      options: newOptions,
      correct_answer: questionForm.correct_answer === index ? null : 
                     (questionForm.correct_answer && questionForm.correct_answer > index ? 
                     questionForm.correct_answer - 1 : questionForm.correct_answer)
    });
  };

  const addOption = () => {
    setQuestionForm({
      ...questionForm,
      options: [...questionForm.options, { id: Date.now(), text: '', is_correct: false }]
    });
  };

  const [showBlockForm, setShowBlockForm] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState<number | null>(null);

  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<{ blockId: number; question: Question } | null>(null);
  const [questionForm, setQuestionForm] = useState<QuestionForm>({
    text: '',
    options: [],
    correct_answer: null,
  });

  // Load blocks
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await apiService.getTestSets();
        setBlocks(data);
      } catch {
        setError("Xatolik: bloklar olinmadi");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // ==========================
  // BLOCK FORM STATE
  // ==========================
  const [blockForm, setBlockForm] = useState<{
    title: string;
    description: string;
    start_date: string;
    end_date: string;
  }>({
    title: '',
    description: '',
    start_date: '',
    end_date: ''
  });

  const handleBlockInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setBlockForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let saved: Block;
      if (editingBlock?.id) {
        const response = await apiService.updateTestSet(editingBlock.id, blockForm);
        saved = response as unknown as Block;
        setBlocks(b => b.map(x => (x.id === saved.id ? saved : x)));
      } else {
        const response = await apiService.createTestSet(blockForm);
        saved = response as unknown as Block;
        setBlocks(b => [...b, saved]);
      }
      setShowBlockForm(false);
      setEditingBlock(null);
      setBlockForm({ title: '', description: '', start_date: '', end_date: '' });
    } catch (err) {
      setError("Blokni saqlashda xatolik");
    }
  };

  // ==========================
  // MAIN UI
  // ==========================
  if (isLoading) return <div className="p-6 text-blue-600 font-semibold animate-pulse">Yuklanmoqda...</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold text-blue-600 mb-8 tracking-wide">Test Savollari Boshqaruvi</h1>

      {/* CREATE BLOCK BUTTON */}
      <button
        onClick={() => {
          setShowBlockForm(true);
          setEditingBlock(null);
          setBlockForm({ title: '', description: '', start_date: '', end_date: '' });
        }}
        className="px-5 py-2.5 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 active:scale-[.98] transition-all"
      >
        Yangi blok yaratish
      </button>

      {/* BLOCK MODAL */}
      {showBlockForm && (
        <div className="
          fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm 
          flex items-center justify-center p-4 animate-fadeIn
        ">
          <div className="
            bg-white rounded-xl shadow-2xl p-6 w-full max-w-md 
            animate-scaleIn
          ">
            <h2 className="text-xl font-semibold text-blue-600 mb-4">
              {editingBlock ? "Blokni tahrirlash" : "Yangi blok yaratish"}
            </h2>

            <form onSubmit={handleBlockSubmit} className="space-y-4">

              <div>
                <label className="font-medium text-slate-600">Blok nomi</label>
                <input
                  name="title"
                  value={blockForm.title}
                  onChange={handleBlockInputChange}
                  required
                  className="
                    w-full mt-1 p-2 border rounded-lg 
                    focus:ring-2 focus:ring-blue-500 outline-none
                  "
                />
              </div>

              <div>
                <label className="font-medium text-slate-600">Izoh</label>
                <textarea
                  name="description"
                  value={blockForm.description}
                  onChange={handleBlockInputChange}
                  className="
                    w-full mt-1 p-2 border rounded-lg 
                    focus:ring-2 focus:ring-blue-500 outline-none
                  "
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-slate-600">Boshlanish</label>
                  <input
                    type="date"
                    name="start_date"
                    value={blockForm.start_date}
                    onChange={handleBlockInputChange}
                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-600">Tugash</label>
                  <input
                    type="date"
                    name="end_date"
                    value={blockForm.end_date}
                    onChange={handleBlockInputChange}
                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBlockForm(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-slate-100 transition"
                >
                  Bekor qilish
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 active:scale-[.98] transition"
                >
                  Saqlash
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* BLOCK LIST */}
<div className="mt-8 space-y-6">
  {blocks.map((block) => (
    <div
      key={block.id}
      className="
        bg-white p-5 rounded-xl shadow-md 
        hover:shadow-xl transition-shadow
        border border-slate-200
      "
    >
      <div className="flex justify-between items-start">
        {/* LEFT */}
        <div>
          <h3 className="text-xl font-semibold text-blue-700 mb-1">
            {block.title}
          </h3>

          <p className="text-slate-600 mb-2">{block.description}</p>

          <p className="text-sm text-slate-500">
            {new Date(block.start_date).toLocaleDateString()} –{" "}
            {new Date(block.end_date).toLocaleDateString()}
          </p>

          {/* SAVOLLAR LISTI */}
          {(block.tests || []).length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-slate-700 mb-2">Savollar:</h4>

              <div className="space-y-3">
                {block.tests?.map((question, qIndex) => (
                  <div
                    key={question.id || qIndex}
                    className="
                      pl-3 py-2 
                      border-l-4 border-blue-300
                      bg-slate-50 
                      rounded-lg
                      animate-fadeSlide
                    "
                  >
                    <p className="font-medium text-slate-800">
                      {qIndex + 1}. {question.text}
                    </p>

                    {/* OPTIONS */}
                    <div className="ml-4 mt-2 space-y-1">
                      {question.options?.map((opt, oIndex) => (
                        <div
                          key={opt.id}
                          className={`flex items-center gap-2 ${
                            opt.is_correct
                              ? "text-green-700 font-semibold"
                              : "text-slate-600"
                          }`}
                        >
                          <span className="w-4">
                            {String.fromCharCode(97 + oIndex)})
                          </span>
                          <span>{opt.text}</span>

                          {opt.is_correct && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              To‘g‘ri
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex gap-3">
                      <button
                        onClick={() => {
                          setEditingQuestion({
                            blockId: block.id!,
                            question,
                          });
                          setQuestionForm({
                            text: question.text,
                            options: question.options.map((o) => ({
                              id: o.id,
                              text: o.text,
                              is_correct: o.is_correct,
                            })),
                            correct_answer: question.correct_answer,
                          });
                          setShowQuestionForm(block.id!);
                        }}
                        className="text-blue-600 text-sm hover:underline active:scale-[.97] transition"
                      >
                        Tahrirlash
                      </button>

                      <button
                        onClick={() =>
                          question.id &&
                          handleDeleteQuestion(block.id!, question.id)
                        }
                        className="text-red-600 text-sm hover:underline active:scale-[.97] transition"
                      >
                        O‘chirish
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT BUTTONS */}
        <div className="flex flex-col gap-2 text-right">
          <button
            className="text-blue-600 font-medium hover:text-blue-800 active:scale-[.97] transition"
            onClick={() => handleEditBlock(block)}
          >
            Tahrirlash
          </button>
          <button
            className="text-green-600 font-medium hover:text-green-800 active:scale-[.97] transition"
            onClick={() => {
              setEditingQuestion(null);
              setQuestionForm({
                text: "",
                options: [{ id: 1, text: "" }],
                correct_answer: null,
              });
              setShowQuestionForm(block.id!);
            }}
          >
            Savol qo‘shish
          </button>
          <button
            className="text-red-600 font-medium hover:text-red-800 active:scale-[.97] transition"
            onClick={() => block.id && handleDeleteBlock(block.id)}
          >
            O‘chirish
          </button>
        </div>
      </div>

      {/* QUESTION FORM */}
      {showQuestionForm === block.id && (
        <div
          className="
            mt-4 p-5 bg-white rounded-xl shadow-lg 
            border border-slate-200 animate-fadeSlide
          "
        >
          {/* FORM HEADER */}
          <h3 className="text-lg font-semibold text-blue-600 mb-4">
            {editingQuestion ? "Savolni tahrirlash" : "Yangi savol qo'shish"}
          </h3>

          {/* THE FORM ITSELF */}
          <form
            onSubmit={(e) => handleQuestionSubmit(e, block.id)}
            className="space-y-4"
          >
            {/* SAVOL MATNI */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Savol matni
              </label>
              <input
                value={questionForm.text}
                onChange={(e) =>
                  setQuestionForm({ ...questionForm, text: e.target.value })
                }
                required
                className="
                  w-full p-2.5 border rounded-lg 
                  bg-slate-50 focus:bg-white
                  focus:ring-2 focus:ring-blue-500 
                  outline-none transition
                "
              />
            </div>

            {/* VARIANTLAR */}
            <div>
              <label className="block font-medium text-slate-700 mb-2">
                Variantlar
              </label>

              <div className="space-y-3">
                {questionForm.options.map((opt) => (
                  <div
                    key={opt.id}
                    className="
                      flex items-center gap-3
                      bg-slate-50 px-2 py-2 rounded-lg
                      hover:bg-slate-100 transition
                    "
                  >
                    <input
                      type="radio"
                      checked={questionForm.correct_answer === opt.id}
                      onChange={() =>
                        setQuestionForm({
                          ...questionForm,
                          correct_answer: opt.id,
                        })
                      }
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />

                    <input
                      value={opt.text}
                      onChange={(e) =>
                        handleOptionChange(opt.id, e.target.value)
                      }
                      required
                      className="
                        flex-1 p-2 border rounded-lg 
                        bg-white focus:ring-2 focus:ring-blue-500
                        outline-none
                      "
                      placeholder="Variant matni"
                    />

                    <button
                      type="button"
                      disabled={questionForm.options.length <= 2}
                      onClick={() => removeOption(opt.id)}
                      className="
                        text-red-500 text-lg px-2 py-1 
                        hover:text-red-700 active:scale-90 
                        transition disabled:text-slate-300
                      "
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addOption}
                className="
                  text-blue-600 text-sm font-medium mt-2
                  hover:text-blue-800 active:scale-95 transition
                "
              >
                + Variant qo‘shish
              </button>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowQuestionForm(null);
                  setEditingQuestion(null);
                }}
                className="
                  px-4 py-2 border rounded-lg
                  hover:bg-slate-100 active:scale-95 transition
                "
              >
                Bekor qilish
              </button>

              <button
                type="submit"
                className="
                  px-5 py-2 bg-blue-600 text-white rounded-lg shadow 
                  hover:bg-blue-700 active:scale-95 transition
                "
              >
                Saqlash
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  ))}
</div>


    </div>
  );
};

export default QuestionManager;
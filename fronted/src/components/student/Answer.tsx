import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { apiService } from "../../services/api";
import { toast } from 'react-toastify';

// Props types

function Answer() {
  const { questionId } = useParams<{ questionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Prevent copy/paste and screenshots
  const preventDefault = useCallback((e: KeyboardEvent | MouseEvent) => {
    // Block right-click
    if (e.type === 'contextmenu') {
      e.preventDefault();
      toast.warning('Ushbu amal taqiqlangan!');
      return false;
    }
    
    // Block keyboard shortcuts
    const evt = e as KeyboardEvent;
    if ((evt.ctrlKey || evt.metaKey) && 
        (evt.key === 'c' || evt.key === 'C' || 
         evt.key === 'v' || evt.key === 'V' ||
         evt.key === 'x' || evt.key === 'X' ||
         evt.key === 'PrintScreen' || evt.key === 'Print' ||
         evt.key === 'F12' || evt.key === 'F11')) {
      e.preventDefault();
      toast.warning('Ushbu amal taqiqlangan!');
      return false;
    }
    
    // Block print screen key
    if (evt.key === 'PrintScreen' || (evt.ctrlKey && evt.key === 'p')) {
      e.preventDefault();
      toast.warning('Ekran rasmini olish taqiqlangan!');
      return false;
    }
  }, []);

  // Check authentication and set up security measures on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    
    if (!token || isLoggedIn !== 'true') {
      toast.error('Iltimos, avval tizimga kiring');
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    
    // Set authorization header for all requests
    apiService.setAuthToken(token);
    
    // Add security event listeners
    document.addEventListener('keydown', preventDefault);
    document.addEventListener('keyup', preventDefault);
    document.addEventListener('contextmenu', preventDefault);
    
    // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) ||
          (e.metaKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key))) {
        e.preventDefault();
        toast.warning('Ushbu amal taqiqlangan!');
        return false;
      }
    });
    
    // Cleanup function to remove event listeners
    return () => {
      document.removeEventListener('keydown', preventDefault);
      document.removeEventListener('keyup', preventDefault);
      document.removeEventListener('contextmenu', preventDefault);
    };
  }, [navigate, location.pathname, preventDefault]);
  
  // Get question data from location state or use default
  const questionData = location.state?.question || {
    id: questionId,
    title: 'Test Savoli',
    description: 'Savol tafsilotlari',
    questions: [
      {
        id: 1,
        text: 'Namuna savol',
        options: [
          { id: 1, text: '1-variant', is_correct: false },
          { id: 2, text: '2-variant', is_correct: true },
          { id: 3, text: '3-variant', is_correct: false },
          { id: 4, text: '4-variant', is_correct: false }
        ],
        correct_answer: 2
      }
    ]
  };
  
  // Format data for the Answer component
  const test = {
    id: questionData.id || questionData.question?.id || questionId || '1',
    title: questionData.question?.title || questionData.title || 'Test Savoli',
    description: questionData.question?.description || questionData.description || '',
    tests: (() => {
      // Handle different possible response formats
      let questions = [];
      
      // Check for tests array in questionData or questionData.question
      const testsData = questionData.tests || questionData.question?.tests || [];
      
      if (testsData.length > 0) {
        // Format tests array
        questions = testsData.map((q: any, index: number) => ({
          id: q.id || index + 1,
          text: q.text || q.question || `Savol ${index + 1}`,
          options: Array.isArray(q.options) 
            ? q.options.map((opt: any, optIndex: number) => ({
                id: opt.id || optIndex + 1,
                text: opt.text || `Variant ${optIndex + 1}`,
                is_correct: opt.is_correct || false
              }))
            : [],
          correct_answer: q.correct_answer
        }));
      } else if (Array.isArray(questionData)) {
        // Direct array of questions
        questions = questionData;
      } else if (Array.isArray(questionData.questions)) {
        // Nested questions array
        questions = questionData.questions;
      } else if (questionData.text) {
        // Single question object
        questions = [{
          id: questionData.id || 1,
          text: questionData.text || questionData.question || 'Savol',
          options: Array.isArray(questionData.options) 
            ? questionData.options.map((opt: any, i: number) => ({
                id: opt.id || i + 1,
                text: opt.text || `Variant ${i + 1}`,
                is_correct: opt.is_correct || false
              }))
            : [],
          correct_answer: questionData.correct_answer
        }];
      }
      
      return questions;
    })()
  };
  
  const [selected, setSelected] = useState<Record<number, number | null>>(() => ({}));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ 
    correct?: number; 
    wrong?: number; 
    score?: number;
    submission?: any;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  

  useEffect(() => {
    // reset when test changes
    setSelected({});
    setResult(null);
    setError(null);
  }, [test.id]);

  const handleSelect = (questionIndex: number, optionIndex: number) => {
    setSelected(prev => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const buildAnswersPayload = (): any[] => {
    return Object.entries(selected)
      .filter(([_, answerIndex]) => answerIndex !== null)
      .map(([questionIndex, answerIndex]) => {
        // Get the actual question ID from the test data
        const question = test.tests[Number(questionIndex)];
        return {
          question: question.id || (Number(questionIndex) + 1), // Use actual question ID if available
          selected: answerIndex !== null ? Number(answerIndex) + 1 : null, // 1-based
          question_index: Number(questionIndex) // Add question_index
        };
      });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    
    try {
      const answers = buildAnswersPayload();
   
      
      if (answers.length === 0) {
        setSubmitting(false);
        setError("Iltimos, kamida bitta javobni belgilang");
        return;
      }
      
      // Show confirmation dialog
      const isConfirmed = window.confirm("Testni topshirishni xohlaysizmi? Uni keyinroq qayta ishlay olmaysiz.");
      if (!isConfirmed) {
        setSubmitting(false);
        return;
      }
      
      // Use the apiService to submit the test answers
      const responseData = await apiService.submitTestAnswers(Number(questionId), answers);
      console.log('Submission successful:', responseData);
      
      // Calculate correct/wrong answers
      const correctAnswers = answers.filter(a => {
        const question = test.tests.find((q: any) => q.id === a.question);
        return question && question.correct_answer === a.selected_option;
      }).length;
      
      const score = responseData.score || Math.round((correctAnswers / test.tests.length) * 100);
      
      setResult({
        submission: responseData,
        score: score,
        correct: correctAnswers,
        wrong: test.tests.length - correctAnswers
      });
      
      // Show success message
      toast.success(`Test topshirildi! Sizning balingiz: ${score}%`);
      
      // Navigate back to the student dashboard immediately
      navigate('/student/dashboard', { 
        state: { 
          message: `Test muvaffaqiyatli topshirildi! Sizning balingiz: ${score}%`,
          showResults: true
        } 
      });
      
    } catch (err: any) {
      // More user-friendly error messages
      let errorMessage = 'Test topshirishda xatolik yuz berdi';
      if (err.message && err.message.includes('401')) {
        errorMessage = 'Sizning sessiyangiz tugagan. Iltimos, qaytadan kiring.';
        navigate('/login');
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setSubmitting(false);
      
      const answeredCount = Object.keys(selected).length;
      const total = test.tests.length;
      console.log(`Answered ${answeredCount} out of ${total} questions`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto my-6 bg-white shadow-md rounded-2xl overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-sky-600 to-blue-600 text-white">
        <h2 className="text-xl font-semibold">{test.title ?? "Test"}</h2>
        <p className="text-sm opacity-90">Savollar soni: {test.tests.length}</p>
      </div>

      <div className="p-6 bg-white">
        {test.tests.length === 0 && (
          <p className="text-gray-600">Bu blokda savollar topilmadi.</p>
        )}

        {test.tests.map((testItem: any, i: number) => (
          <div key={i} className="mb-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-sky-50 text-sky-700 font-semibold">
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">{i + 1}. {testItem.question}</p>
                <div className="mt-2 space-y-2">
                  {testItem.options?.map((option: any, optionIndex: number) => (
                    <button
                      key={optionIndex}
                      type="button"
                      onClick={() => handleSelect(i, optionIndex)}
                      className={`flex items-center justify-between w-full px-4 py-3 rounded-lg border transition-shadow focus:outline-none focus:ring-2 focus:ring-sky-300
                        ${selected[i] === optionIndex ? "bg-sky-600 text-white border-sky-600 shadow" : "bg-white text-gray-800 border-gray-200 hover:shadow-sm"}`}
                    >
                      <div className="text-left">
                        <div className="font-medium">{String.fromCharCode(65 + optionIndex)}. {option.text}</div>
                      </div>
                      <div className="ml-4 text-sm opacity-80">{selected[i] === optionIndex ? "Tanlangan" : ""}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500 mt-1">
            Javob: {Object.keys(selected).length}/{test.tests.length}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting || Object.keys(selected).length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Yuborilmoqda…" : "Yuborish"}
            </button>

            <button
              onClick={() => { setSelected({}); setResult(null); setError(null); }}
              className="px-4 py-2 rounded-xl border border-sky-200 text-sky-700 bg-white hover:bg-sky-50"
            >
              Tozalash
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 text-red-600 bg-red-50 p-3 rounded-md">Xato: {error}</div>
        )}

        {result && (
          <div className="mt-6 p-4 rounded-lg bg-sky-50 border border-sky-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-sky-700 font-medium">Natija</div>
                <div className="text-2xl font-bold text-sky-800">{typeof result.score === 'number' ? Math.round(result.score) + '%' : '—'}</div>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-600">To'g'ri: <span className="font-semibold text-sky-700">{result.correct ?? '—'}</span></div>
                <div className="text-sm text-gray-600">Noto'g'ri: <span className="font-semibold text-sky-700">{result.wrong ?? '—'}</span></div>
              </div>
            </div>
          </div>
        )}

      </div>

      <div className="px-6 py-3 bg-white border-t border-gray-100 text-xs text-gray-500">
        <div>Rang sxemi: ko'k — oq. Tailwind yordamida.</div>
      </div>
    </div>
  );
}

export default Answer;

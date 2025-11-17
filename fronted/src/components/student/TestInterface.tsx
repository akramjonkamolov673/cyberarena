import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiService, type TestSet } from "../../services/api";

interface UserData {
  profileImage?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  groupName?: string | null;
}

interface TestInterfaceProps {
  onLogout: () => void;
}

export default function TestInterface({ onLogout }: TestInterfaceProps) {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [currentTest, setCurrentTest] = useState<TestSet | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  // LOAD TEST DATA
  useEffect(() => {
    const loadTestData = async () => {
      const data = localStorage.getItem("userData");
      if (data) setUserData(JSON.parse(data));

      if (!testId) {
        console.error('Test ID mavjud emas');
        navigate('/student');
        return;
      }

      try {
        console.log(`Test yuklanmoqda ID: ${testId}...`);
        const test = await apiService.getTestSetDetails(parseInt(testId));
        console.log('Test ma\'lumotlari:', test);
        
        if (!test) {
          console.error('Test topilmadi');
          navigate('/student');
          return;
        }

        setCurrentTest(test);
        
        // Savollarni yuklash
        if (test.questions) {
          setQuestions(test.questions);
        } else if (test.tests) {
          // Testlarni savollar formatiga o'tkazish
          const formattedQuestions = test.tests.map(t => ({
            id: t.id,
            text: t.text,
            options: t.options || [],
            correct_answer: t.correct_answer
          }));
          setQuestions(formattedQuestions);
        } else {
          setQuestions([]);
        }
      } catch (error) {
        console.error('Test yuklanmadi:', error);
        navigate('/student');
      } finally {
        setLoading(false);
      }
    };

    loadTestData();
  }, [testId, navigate]);

  const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: optionIndex
    }));
  };

  const handleSubmit = () => {
    // Ballarni hisoblash
    let score = 0;
    questions.forEach((question, index) => {
      if (question.correct_answer === answers[index]) {
        score++;
      }
    });
    
    // Natijalarni ko'rsatish
    alert(`Test yakunlandi! Siz ${score} ta savoldan ${questions.length} tasiga to'g'ri javob berdingiz.`);
    
    // Testlar ro'yxatiga qaytish
    navigate('/student');
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-xl">Test yuklanmoqda...</div>
      </div>
    );
  }

  if (!currentTest) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center">
        <div className="text-xl text-red-600 mb-4">Test topilmadi</div>
        <button 
          onClick={() => navigate('/student')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Orqaga qaytish
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-semibold text-blue-600">
            Test: {currentTest.title}
          </div>
          <button 
            onClick={() => navigate('/student')}
            className="text-blue-600 hover:text-blue-800"
          >
            Orqaga
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">{currentTest.title}</h1>
          <p className="text-gray-600 mb-6">{currentTest.description}</p>
          
          {questions.length > 0 ? (
            <div className="space-y-6">
              {questions.map((question, index) => (
                <div key={question.id || index} className="border-b pb-6 mb-6 last:border-b-0">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    {index + 1}. {question.text}
                  </h3>
                  <div className="space-y-3">
                    {question.options?.map((option: { id: number; text: string; is_correct?: boolean }, optIndex: number) => (
                      <div key={optIndex} className="flex items-center">
                        <input
                          type="radio"
                          id={`q${index}-opt${optIndex}`}
                          name={`question-${index}`}
                          className="h-4 w-4 text-blue-600"
                          checked={answers[index] === optIndex}
                          onChange={() => handleAnswerSelect(index, optIndex)}
                        />
                        <label htmlFor={`q${index}-opt${optIndex}`} className="ml-2 text-gray-700">
                          {String.fromCharCode(65 + optIndex)}. {option.text}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex justify-end mt-8">
                <button 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md"
                  onClick={handleSubmit}
                >
                  Testni yakunlash
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Bu testda hali savollar mavjud emas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiService, type TestSet } from "../../services/api";

interface UserData {
  profileImage?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  groupName?: string | null;
}

interface QuestionItem {
  id?: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  questions?: Array<{
    id?: number;
    text: string;
    options: Array<{
      id: number;
      text: string;
      is_correct: boolean;
    }>;
    correct_answer: number | null;
  }>;
  is_private?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  created_at?: string;
  updated_at?: string;
}

interface StudentPanelProps {
  onLogout: () => void;
}

export default function StudentPanel({ onLogout }: StudentPanelProps) {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<"questions" | "codetrain" | "codebattle">("questions");
  const [tests, setTests] = useState<TestSet[]>([]);
  const [questions, setQuestions] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await apiService.getTestSets();
      
      if (!Array.isArray(data)) {
        throw new Error('Serverdan noto\'g\'ri formatda ma\'lumot qaytardi');
      }
      
      setTests(data);
      
      // Faqat birinchi 3 ta test uchun savollarni yuklaymiz
      const questionsData: Record<string, any> = {};
      const testsToFetch = data.slice(0, 3); // Birinchi 3 ta test uchun
      
      await Promise.all(testsToFetch.map(async (test) => {
        if (!test.id) return;
        
        try {
          const testDetails = await apiService.getTestSetDetails(test.id);
          
          if (testDetails.questions && Array.isArray(testDetails.questions)) {
            questionsData[String(test.id)] = testDetails.questions;
          } else if (testDetails.tests && Array.isArray(testDetails.tests)) {
            questionsData[String(test.id)] = testDetails.tests;
          }
        } catch (err) {
          questionsData[String(test.id)] = [];
        }
      }));
      
      setQuestions(questionsData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Noma\'lum xatolik yuz berdi';
      setError(`Testlarni yuklashda xatolik: ${errorMessage}`);
      console.error('Testlarni yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const load = async () => {
      try {
        const data = localStorage.getItem("userData");
        if (data) setUserData(JSON.parse(data));
        
        if (isMounted) {
          await fetchTests();
        }
      } catch (err) {
          if (isMounted) {
          setError('Ma\'lumotlarni yuklashda xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.');
        }
      }
    };
    
    load();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // We already filter active test sets in the API call
  const visibleQuestions = () => tests;

  if (!userData) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-xl font-semibold">
        Yuklanmoqda...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      {/* NAVBAR */}
      <nav className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-semibold text-blue-600">
            Talaba Paneli
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab("questions")}
              className={`${
                activeTab === "questions" ? "text-blue-600 font-bold" : "text-gray-600"
              } hover:text-blue-600 transition`}
            >
              Savollar
            </button>

            <button
              onClick={() => setActiveTab("codetrain")}
              className={`${
                activeTab === "codetrain" ? "text-blue-600 font-bold" : "text-gray-600"
              } hover:text-blue-600 transition`}
            >
              CodeTrain
            </button>

            <button
              onClick={() => setActiveTab("codebattle")}
              className={`${
                activeTab === "codebattle" ? "text-blue-600 font-bold" : "text-gray-600"
              } hover:text-blue-600 transition`}
            >
              CodeBattle
            </button>

            <button
              onClick={onLogout}
              className="text-red-500 hover:text-red-600 font-semibold"
            >
              Chiqish
            </button>

            <div className="w-10 h-10 rounded-full overflow-hidden border border-blue-300">
              {userData.profileImage ? (
                <img
                  src={userData.profileImage}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <i className="fa fa-user text-gray-600"></i>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto p-6">
        {/* SAVOLLAR */}
        {activeTab === "questions" && (
          <div>
            <h2 className="text-2xl font-bold text-blue-700 mb-4">Savollar</h2>

            {visibleQuestions().length === 0 ? (
              <p className="text-gray-600 mt-6">Hozircha savollar mavjud emas.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {visibleQuestions().map((q) => (
                  <div
                    key={q.id}
                    className="bg-white shadow-sm rounded-lg border border-blue-100 p-4 hover:shadow-md transition"
                  >
                    <h3 className="text-xl font-semibold text-gray-800 mb-1">
                      {q.title}
                    </h3>

                    {q.description && (
                      <p className="text-gray-600 text-sm mb-3">
                        {q.description}
                      </p>
                    )}

                    <div className="text-sm space-y-1 text-gray-700">
                      <p>⏳ Boshlanish: {q.start_date ? new Date(q.start_date).toLocaleDateString() : "—"}</p>
                      <p>⏰ Tugash: {q.end_date ? new Date(q.end_date).toLocaleDateString() : "—"}</p>
                      <p>🏆 Darajasi: {q.difficulty || "—"}</p>
                      <p>📊 Savollar soni: {q.questions?.length || 0}</p>
                    </div>

                    <button
                      onClick={() => {
                        if (q.id !== undefined) {
                          navigate(`/answer/${q.id}`, { 
                            state: { 
                              question: {
                                ...q,
                                questions: questions[String(q.id)] || []
                              },
                              title: q.title,
                              description: q.description
                            } 
                          });
                        }
                      }}
                      className="mt-3 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                      disabled={loading || q.id === undefined}
                    >
                      {loading ? 'Yuklanmoqda...' : 'Yechimni topshirish'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CODETRAIN */}
        {activeTab === "codetrain" && (
          <div className="text-center py-20 text-gray-600 text-lg">
            CodeTrain tez orada ishga tushadi.
          </div>
        )}

        {/* CODEBATTLE */}
        {activeTab === "codebattle" && (
          <div className="text-center py-20 text-gray-600 text-lg">
            CodeBattle bo‘limi yakunlanmoqda...
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "../../services/api";

interface TestSetWithQuestions {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  difficulty: string;
  questions: any[];
  tests: any[];
}

const QuestionsList = () => {
  const [tests, setTests] = useState<TestSetWithQuestions[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadTests = async () => {
      try {
        console.log('Fetching test sets from API...');
        const testSets = await apiService.getTestSets();
        console.log('Test sets received:', testSets);
        
        const testSetsWithQuestions = testSets.map((test: any) => ({
          ...test,
          start_date: test.start_time,
          end_date: test.end_time,
          questions: test.questions || [],
          tests: test.tests || []
        }));
        
        setTests(testSetsWithQuestions);
      } catch (error) {
        console.error('Error loading test sets:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTests();
  }, []);

  if (loading) {
    return <p>Yuklanmoqda...</p>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-700 mb-4">Savollar</h2>
      
      {tests.length === 0 ? (
        <p className="text-gray-600 mt-6">Hozircha savollar mavjud emas.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tests.map((test) => (
            <div
              key={test.id}
              className="bg-white shadow rounded-lg border border-blue-100 p-4"
            >
              <h3 className="text-xl font-semibold">{test.title}</h3>
              <p className="text-gray-600 text-sm mb-3">{test.description}</p>

              <div className="text-sm space-y-1 text-gray-700">
                <p>⏳ Boshlanish: {test.start_date ?? "—"}</p>
                <p>⏰ Tugash: {test.end_date ?? "—"}</p>
                <p>🏆 Darajasi: {test.difficulty ?? "—"}</p>
                <p>📊 Savollar soni: {test.questions?.length ?? 0}</p>
              </div>

              <button
                onClick={() => navigate(`/student/test/${test.id}`)}
                className="mt-3 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Yechimni topshirish
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestionsList;

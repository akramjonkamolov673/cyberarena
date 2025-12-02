import React, { useEffect, useState } from "react";
import apiService from "../../../services/api";

interface TestSubmission {
  id: number;
  test_set: number;
  score?: number;
  submitted_at?: string;
  answers: Array<{
    question: number;
    selected: number | null;
    question_index: number;
  }>;
}

interface TestSet {
  id: number;
  title: string;
  description: string;
  difficulty: string;
}

interface CodeSubmission {
  id: number;
  challenge: {
    id: number;
    title: string;
    difficulty: string;
  };
  score?: number;
  submitted_at?: string;
  language: string;
  status: string;
}

const StudentResults: React.FC = () => {
  const [testSubmissions, setTestSubmissions] = useState<TestSubmission[]>([]);
  const [testSets, setTestSets] = useState<{ [key: number]: TestSet }>({});
  const [codeSubmissions, setCodeSubmissions] = useState<CodeSubmission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tests' | 'code'>('tests');

  useEffect(() => {
    fetchResults();
  }, []);

  async function fetchResults() {
    try {
      setLoading(true);
      
      // Test submissions - talabaning o'z submissionlari
      try {
        const testSubs = await apiService.getMyTestSubmissions();
        console.log('Test submissions response:', testSubs);
        setTestSubmissions(testSubs as TestSubmission[]);
      } catch (e: any) {
        console.warn('Test submissions API mavjud emas:', e?.message);
        setTestSubmissions([]); // Bo'sh array qo'yish
      }
      
      // Test sets ma'lumotlarini olish
      const uniqueTestSetIds = [...new Set(testSubmissions.map(sub => sub.test_set))];
      const testSetData: { [key: number]: TestSet } = {};
      
      for (const testSetId of uniqueTestSetIds) {
        try {
          const testSet = await apiService.getTestSet(testSetId);
          testSetData[testSetId] = testSet;
        } catch (e) {
          console.error(`Test set ${testSetId} ni olishda xatolik:`, e);
        }
      }
      setTestSets(testSetData);
      
      // Code submissions - talabaning o'z submissionlari
      try {
        const codeSubs = await apiService.getMyCodeSubmissions();
        setCodeSubmissions(codeSubs as CodeSubmission[]);
      } catch (e: any) {
        console.warn('Code submissions API mavjud emas:', e?.message);
        setCodeSubmissions([]); // Bo'sh array qo'yish
      }
      
      setError(null);
    } catch (e: any) {
      console.error('Natijalarni yuklashda xatolik:', e);
      setError(e?.message || "Natijalarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }

  function calculateTotalScore(): number {
    const testScore = testSubmissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
    const codeScore = codeSubmissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
    return testScore + codeScore;
  }

  function formatDate(dateString?: string): string {
    if (!dateString) return "Noma'lum";
    return new Date(dateString).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Natijalar yuklanmoqda...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600">Xatolik: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Mening natijalarim</h1>
        <div className="mt-2 text-lg">
          <span className="font-medium">Umumiy ball:</span> 
          <span className="ml-2 text-blue-600 font-bold">{calculateTotalScore()}</span>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="mb-6">
        <div className="flex space-x-1 border-b">
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'tests'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Test javoblari ({testSubmissions.length})
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'code'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Kod yuborishlar ({codeSubmissions.length})
          </button>
        </div>
      </div>

      {/* Test submissions */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          {testSubmissions.length === 0 ? (
            <div className="bg-white rounded shadow p-6 text-center text-gray-500">
              Siz hali hech qanday test yubormagansiz
            </div>
          ) : (
            testSubmissions.map((submission) => {
              const testSet = testSets[submission.test_set];
              return (
                <div key={submission.id} className="bg-white rounded shadow p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {testSet?.title || `Test #${submission.test_set}`}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">
                        {testSet?.description || "Tavsif mavjud emas"}
                      </p>
                      <div className="mt-2 text-sm text-gray-500">
                        Qiyinlik: {testSet?.difficulty || "Noma'lum"} • 
                        Sana: {formatDate(submission.submitted_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {submission.score || 0}
                      </div>
                      <div className="text-sm text-gray-500">ball</div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    Javoblar soni: {submission.answers.length}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Code submissions */}
      {activeTab === 'code' && (
        <div className="space-y-4">
          {codeSubmissions.length === 0 ? (
            <div className="bg-white rounded shadow p-6 text-center text-gray-500">
              Siz hali hech qanday kod yubormagansiz
            </div>
          ) : (
            codeSubmissions.map((submission) => (
              <div key={submission.id} className="bg-white rounded shadow p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{submission.challenge.title}</h3>
                    <div className="mt-2 text-sm text-gray-500">
                      Til: {submission.language} • 
                      Qiyinlik: {submission.challenge.difficulty} • 
                      Status: {submission.status}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      Sana: {formatDate(submission.submitted_at)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {submission.score || 0}
                    </div>
                    <div className="text-sm text-gray-500">ball</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default StudentResults;

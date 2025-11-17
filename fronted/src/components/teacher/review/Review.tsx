import { useEffect, useState } from "react";
import TestView from "./TestView";
import TrainView from "./TrainView";
import BattleView from "./BattleView";
import apiService from "../../../services/api";

export default function Review() {
  const [testSubs, setTestSubs] = useState([]);
  const [trainSubs, setTrainSubs] = useState([]);
  const [battleSubs, setBattleSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"test" | "train" | "battle">("test");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load test submissions and test sets in parallel
      const endpoints = [
        "/api/submissions",
        "/api/test-submissions",
        "/api/tests"
      ];
      
      console.log('Fetching data from endpoints:', endpoints);
      
      // Har bir API so'rovini alohida qilamiz, xatoliklarni aniqroq ko'rish uchun
      let codeRes, testRes, testsRes;
      
      try {
        codeRes = await apiService.get(endpoints[0]);
        console.log('Submissions API response:', codeRes);
      } catch (error) {
        console.error('Error fetching submissions:', error);
        codeRes = { results: [] };
      }
      
      try {
        testRes = await apiService.get(endpoints[1]);
        console.log('Test submissions API response:', testRes);
      } catch (error) {
        console.error('Error fetching test submissions:', error);
        testRes = { results: [] };
      }
      
      try {
        testsRes = await apiService.get(endpoints[2]);
        console.log('Tests API response:', testsRes);
      } catch (error) {
        console.error('Error fetching tests:', error);
        testsRes = { results: [] };
      }
      
// Ma'lumotlar qanday qaytayotganini ko'rish uchun
      console.log('API Responses RAW:', { 
        codeResType: Array.isArray(codeRes) ? 'array' : typeof codeRes,
        testResType: Array.isArray(testRes) ? 'array' : typeof testRes,
        testsResType: Array.isArray(testsRes) ? 'array' : typeof testsRes,
        codeResKeys: codeRes ? Object.keys(codeRes) : [],
        testResKeys: testRes ? Object.keys(testRes) : [],
        testsResKeys: testsRes ? Object.keys(testsRes) : []
      });

      // Ma'lumotlarni to'g'ri olish uchun har xil formatlarni hisobga olamiz
      // DRF paginatsiyasini ham hisobga olamiz
      const extractData = (response: any) => {
        if (Array.isArray(response)) return response;
        if (response?.results) return response.results; // DRF pagination
        if (response?.data) return response.data; // Alternative format
        return [];
      };

      const rawCode = extractData(codeRes);
      const rawTest = extractData(testRes);
      const tests = extractData(testsRes);

      console.log('Extracted Data:', {
        rawCodeLength: rawCode.length,
        rawTestLength: rawTest.length,
        testsLength: tests.length,
        rawTestFirstItem: rawTest[0],
        testsFirstItem: tests[0]
      });
      
      console.log('Raw Data:', { rawCode, rawTest, tests });
      
      // Create a map of test_id -> test details for quick lookup
      const testMap = tests.reduce((acc: any, test: any) => {
        acc[test.id] = test;
        return acc;
      }, {});

      // Process test submissions
      const processedTests = rawTest.map((submission: any) => {
        const testDetails = testMap[submission.test] || {};
        
        // Process answers - keep the original format as TestView will handle it
        const answers = submission.answers || {};
        
        // Calculate score if not present
        let score = submission.score || 0;
        let correct_answers = submission.correct_answers;
        let total_questions = submission.total_questions;
        
        // If test has questions, ensure we have total_questions
        if (testDetails.tests && testDetails.tests.length > 0) {
          total_questions = testDetails.tests.length;
        }
        
        // Calculate score if we have correct_answers and total_questions
        if (correct_answers !== undefined && total_questions > 0) {
          score = Math.round((correct_answers / total_questions) * 100 * 10) / 10; // 1 decimal place
        }
        
        return {
          ...submission,
          test: {
            id: submission.test,
            title: testDetails.title || 'Noma\'lum test',
            tests: testDetails.tests || []
          },
          answers,
          score,
          correct_answers: correct_answers || 0,
          total_questions: total_questions || 0,
          user: submission.user || { 
            id: submission.user_id, 
            username: submission.username || `Foydalanuvchi ${submission.user_id}` 
          },
          submitted_at: submission.submitted_at || new Date().toISOString()
        };
      });

      // Filter code submissions by source
      const train = rawCode
        .filter((x: any) => x.meta?.source === "codetrain")
        .map((item: any) => ({
          ...item,
          user: item.user || { id: item.user_id, username: item.username || `Foydalanuvchi ${item.user_id}` }
        }));
        
      const battle = rawCode
        .filter((x: any) => x.meta?.source === "codebattle")
        .map((item: any) => ({
          ...item,
          user: item.user || { id: item.user_id, username: item.username || `Foydalanuvchi ${item.user_id}` }
        }));

      console.log('Processed train submissions:', train);
      console.log('Processed battle submissions:', battle);
      console.log('Processed test submissions:', processedTests);
      
      setTrainSubs(train);
      setBattleSubs(battle);
      setTestSubs(processedTests);
    } catch (error) {
      console.error('Error loading submissions:', error);
      // You might want to show an error message to the user here
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Yuklanmoqda...</div>;

  return (
    <div className="p-6 space-y-4">

      {/* NAVIGATION */}
      <div className="flex gap-3">
        <button
          onClick={() => setActiveTab("test")}
          className={`px-4 py-2 rounded ${activeTab === "test" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          Test javoblari
        </button>

        <button
          onClick={() => setActiveTab("train")}
          className={`px-4 py-2 rounded ${activeTab === "train" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          CodeTrain javoblari
        </button>

        <button
          onClick={() => setActiveTab("battle")}
          className={`px-4 py-2 rounded ${activeTab === "battle" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          CodeBattle javoblari
        </button>
      </div>

      {/* THREE VIEW SECTIONS */}
      {activeTab === "test" && <TestView items={testSubs} />}
      {activeTab === "train" && <TrainView items={trainSubs} />}
      {activeTab === "battle" && <BattleView items={battleSubs} />}
    </div>
  );
}

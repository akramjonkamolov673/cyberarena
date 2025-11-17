import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TerminalOutput from "./TerminalOutput.tsx";

type Problem = {
  id: number;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  tests?: { input: string; output: string }[];
  language_hint?: string;
};

interface ApiResponse {
  detail?: string;
  message?: string;
  [key: string]: any;
}

const CodeTrainProblem: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [language, setLanguage] = useState<string>("cpp");
  const [code, setCode] = useState<string>("// C++ starter code\n#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n    \n    return 0;\n}");
  const [stdin, setStdin] = useState<string>("");
  const [output, setOutput] = useState<string>("");

  const [runCount, setRunCount] = useState<number>(0);
  const [maxRuns] = useState<number>(5);
  const [running, setRunning] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const timerRef = useRef<number | null>(null);
  const [blurred, setBlurred] = useState<boolean>(false);

  const handleExitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      navigate("/student/codetrain");
    } catch {
      navigate("/student/codetrain");
    }
  }, [navigate]);

  useEffect(() => {
    fetchProblem();
    startTimer();

    const blockInspect = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && e.key === "u")
      ) {
        e.preventDefault();
      }
    };

    const blockContext = (e: MouseEvent) => e.preventDefault();
    const blockCopyPaste = (e: ClipboardEvent) => e.preventDefault();

    const handleVisibility = () => {
      if (document.hidden) {
        setBlurred(true);
        setMessage("Diqqat: Sahifadan chiqdingiz yoki boshqa tabga o‘tdingiz!");
      } else {
        setBlurred(false);
        setMessage(null);
      }
    };

    document.addEventListener("keydown", blockInspect);
    document.addEventListener("contextmenu", blockContext);
    document.addEventListener("copy", blockCopyPaste);
    document.addEventListener("paste", blockCopyPaste);
    document.addEventListener("cut", blockCopyPaste);
    document.addEventListener("visibilitychange", handleVisibility);

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    return () => {
      document.removeEventListener("keydown", blockInspect);
      document.removeEventListener("contextmenu", blockContext);
      document.removeEventListener("copy", blockCopyPaste);
      document.removeEventListener("paste", blockCopyPaste);
      document.removeEventListener("cut", blockCopyPaste);
      document.removeEventListener("visibilitychange", handleVisibility);
      stopTimer();
    };
  }, []);

  async function fetchProblem() {
    if (!id) return;
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      if (!token) {
        console.error('Token topilmadi. Iltimos, qaytadan tizimga kiring.');
        window.location.href = '/login';
        return;
      }

      const res = await fetch(`http://localhost:8000/api/challenges/${id}/`, {
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (res.status === 401) {
        // Avtorizatsiya kerak, foydalanuvchini login sahifasiga yo'naltirish
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const prob: Problem = {
        id: data.id,
        title: data.title,
        description: data.description || "",
        difficulty: data.difficulty || "Medium",
        tags: data.tags || [],
        tests:
          data.test_cases?.map((tc: any) => ({
            input: tc.input || "",
            output: tc.expected_output || "",
          })) || [],
      };

      setProblem(prob);
    } catch (err: any) {
      setMessage("Xatolik: " + err.message);
    }
  }

  function startTimer() {
    timerRef.current = window.setInterval(() => {
      setTimeElapsed((t) => t + 1);
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function mapLanguage(lang: string) {
    switch (lang) {
      case "cpp":
        return "cpp";
      case "python":
        return "python3";
      case "javascript":
        return "javascript";
      case "java":
        return "java";
      case "go":
        return "go";
      default:
        return "cpp";
    }
  }

  async function executeCode({ code, stdin }: { code: string; stdin: string }) {
    const res = await fetch("/api/runner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: mapLanguage(language),
        source: code,
        stdin: stdin,
      }),
    });

    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  }

  async function onRun() {
    if (runCount >= maxRuns) {
      setMessage(`Run limiti tugagan (${maxRuns})`);
      return;
    }

    setRunning(true);
    setRunCount((c) => c + 1);

    try {
      if (problem?.tests?.length) {
        const results: string[] = [];
        for (const t of problem.tests) {
          const r = await executeCode({ code, stdin: t.input });
          const out = (r.stdout ?? r.output ?? "").trim();
          const ok = out === t.output.trim();
          results.push(
            `Input: ${t.input}\nExpected: ${t.output}\nOutput: ${out}\nResult: ${
              ok ? "Passed" : "Failed"
            }`
          );
        }
        setOutput(results.join("\n\n"));
      } else {
        const r = await executeCode({ code, stdin });
        setOutput((r.stdout ?? r.output ?? "").toString());
      }
    } catch (err: any) {
      setOutput("Xatolik: " + err.message);
    } finally {
      setRunning(false);
    }
  }

  async function submitSolution() {
    try {
      if (!problem) {
        throw new Error("Muammo topilmadi");
      }

      const payload = {
        challenge: problem.id,
        code: code,
        language: language,
        time_spent: timeElapsed,
        meta: {  // Add required meta field
          source: 'web',
          browser: navigator.userAgent,
          timestamp: new Date().toISOString()
        },
        test_results: []  // Add empty test results array as per model
      };

      console.log("Yuborilayotgan ma'lumot:", payload);

      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      if (!token) {
        console.error('Token topilmadi. Iltimos, qaytadan tizimga kiring.');
        window.location.href = '/login';
        return;
      }

      let res;
      try {
        res = await fetch("http://localhost:8000/api/submissions/", {
          method: "POST",
          credentials: "include",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error('Fetch xatosi:', err);
        throw new Error('Serverga ulanishda xatolik yuz berdi');
      }

      let responseData: ApiResponse = {};
      const responseText = await res.text();
      console.log('Serverdan javob matni:', responseText);
      
      try {
        if (responseText) {
          responseData = JSON.parse(responseText) as ApiResponse;
        }
      } catch (e) {
        console.error('JSON parse xatosi:', e);
        console.error('Xatolik tafsilotlari:', {
          status: res.status,
          statusText: res.statusText,
          headers: Object.fromEntries(res.headers.entries()),
          responseText
        });
        throw new Error(`Serverdan noto'g'ri formatdagi javob keldi (${res.status} ${res.statusText})`);
      }

      console.log("Serverdan javob status:", res.status, "Javob:", responseData);

      if (!res.ok) {
        throw new Error(responseData.detail || responseData.message || JSON.stringify(responseData));
      }

      setMessage("✅ Kod muvaffaqiyatli yuborildi!");
    } catch (err: any) {
      console.error("Yuborishda xatolik:", err);
      setMessage("❌ Yuborishda xatolik: " + (err.message || 'Noma\'lum xatolik'));
    }
  }

  const ExitButton = () => (
    <button
      onClick={handleExitFullscreen}
      className="fixed top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full"
    >
      ×
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6 relative">
      <ExitButton />

      {blurred && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-40 flex items-center justify-center">
          <div className="text-white text-center p-6 bg-red-600 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Ogohlantirish!</h2>
            <p>Sahifadan chiqdingiz yoki boshqa tabga o‘tdingiz!</p>
          </div>
        </div>
      )}

      {problem ? (
        <div className="p-6 flex flex-col md:flex-row gap-6">
          <div className="md:w-1/3 flex flex-col gap-4">
            <div className="bg-white rounded shadow p-4">
              <h1 className="font-semibold text-xl">{problem.title}</h1>
              <div className="text-sm text-gray-500">{problem.difficulty}</div>

              <div className="mt-4 flex gap-2 items-center">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="px-2 py-2 border rounded"
                >
                  <option value="cpp">C++</option>
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="java">Java</option>
                  <option value="go">Go</option>
                </select>

                <button
                  disabled={running}
                  onClick={onRun}
                  className="flex-1 px-3 py-2 rounded bg-blue-600 text-white"
                >
                  {running ? "Ishlayapti..." : "Ishga tushirish"}
                </button>

                <button
                  onClick={submitSolution}
                  className="px-3 py-2 rounded bg-green-600 text-white"
                >
                  Yuborish
                </button>

                <button
                  onClick={() => {
                    setCode("");
                    setStdin("");
                    setOutput("");
                  }}
                  className="px-3 py-2 rounded border"
                >
                  Tozalash
                </button>
              </div>

              <div className="mt-3 text-xs text-gray-600">
                Belgilar: {code.length} • Qatorlar: {code.split("\n").length} •
                Vaqt: {timeElapsed}s
              </div>
            </div>

            <div className="bg-white rounded shadow p-4 flex-1 overflow-auto">
              <h3 className="font-medium mb-2">Masala sharti:</h3>
              {problem.description.split("\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>

          <div className="md:w-2/3 flex flex-col gap-4">
            <div className="flex-1 bg-white rounded shadow p-4">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-full font-mono text-sm p-2 border rounded"
                spellCheck="false"
              />
            </div>

            <div className="bg-white rounded shadow p-4">
              <h3 className="font-medium mb-2">Input:</h3>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                className="w-full h-20 font-mono text-sm p-2 border rounded"
              />
            </div>

            <div className="bg-white rounded shadow p-4">
              <h3 className="font-medium mb-2">Output:</h3>
              <TerminalOutput output={output} />
            </div>

            {message && <div className="text-sm text-red-600">{message}</div>}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64">
          Masala yuklanmoqda...
        </div>
      )}
    </div>
  );
};

export default CodeTrainProblem;

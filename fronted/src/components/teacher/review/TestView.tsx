interface TestQuestion {
  question: string;
  options: string[];
  correct?: number;
  correct_answer?: string;
}

interface TestSubmission {
  id: number;
  test: {
    id: number;
    title: string;
    description?: string;
    tests?: TestQuestion[];
  };
  user: any;
  answers: any[];
  correct_answers: number;
  total_questions: number;
  score: number;
  submitted_at: string;
}

export default function TestView({ items }: { items: TestSubmission[] }) {
  if (items.length === 0) {
    return <div className="p-4 text-gray-500">Test javoblari topilmadi</div>;
  }

  const getAnswerText = (ans: any, qIndex: number, test: any): string => {
    const question = test?.tests?.[qIndex];

    // object bo‘lsa
    if (typeof ans === "object") {
      if ("selected" in ans && question?.options) {
        return question.options[ans.selected] ?? `Tanlangan: ${ans.selected}`;
      }
      if ("answer" in ans) {
        return getAnswerText(ans.answer, qIndex, test);
      }
      return JSON.stringify(ans, null, 2);
    }

    // number bo‘lsa — variant indexi
    if (typeof ans === "number" && question?.options) {
      return question.options[ans] ?? `Tanlangan: ${ans}`;
    }

    return String(ans);
  };

  const getCorrectText = (question: TestQuestion, ans: any): string => {
    if (!question) return "";

    if (question.correct !== undefined && question.options) {
      return question.options[question.correct];
    }

    if (question.correct_answer) return question.correct_answer;

    if (ans?.correct_answer) return ans.correct_answer;

    return "";
  };

  const isCorrect = (ans: any, question: TestQuestion): boolean => {
    if (!question) return false;

    if (typeof ans === "object" && "is_correct" in ans) {
      return ans.is_correct === true;
    }

    if (typeof ans === "number" && question.correct !== undefined) {
      return ans === question.correct;
    }

    return false;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("uz-UZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

  return (
    <div className="space-y-6">
      {items.map((sub) => {
        const testQuestions = sub.test.tests || [];

        // Answers normalizatsiyasi
        const answers = sub.answers.map((ans: any, idx: number) => ({
          raw: ans,
          questionIndex: idx,
          question: testQuestions[idx]
        }));

        return (
          <div key={sub.id} className="border rounded-lg bg-white shadow-sm">

            {/* HEADER */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex justify-between flex-wrap gap-2">
                <div>
                  <div className="font-semibold text-lg">{sub.test.title}</div>
                  <div className="text-sm text-gray-600">
                    Foydalanuvchi:{" "}
                    <span className="font-medium">
                      {typeof sub.user === "object"
                      ? sub.user.first_name || sub.user.last_name 
                        ? `${sub.user.first_name || ''} ${sub.user.last_name || ''}`.trim()
                        : sub.user.username || `Foydalanuvchi #${sub.user.id || sub.user}`
                      : `Foydalanuvchi #${sub.user}`}
                    </span>
                    <span className="ml-3">•</span>{" "}
                    {formatDate(sub.submitted_at)}
                  </div>
                </div>

                <div className="bg-blue-50 px-4 py-2 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-700">
                    {sub.score?.toFixed(1) || 0}%
                  </div>
                  <div className="text-sm text-blue-600">
                    {sub.correct_answers}/{sub.total_questions} to‘g‘ri
                  </div>
                </div>
              </div>
            </div>

            {/* ANSWERS */}
            <div className="p-4 space-y-4">
              {answers.map((item, idx) => {
                const q = item.question;
                const ans = item.raw;
                const correct = isCorrect(ans, q);
                const answerText = getAnswerText(ans, item.questionIndex, sub.test);
                const correctText = getCorrectText(q, ans);

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded border ${
                      correct
                        ? "bg-green-50 border-green-300"
                        : "bg-red-50 border-red-300"
                    }`}
                  >
                    <div className="font-medium mb-1">
                      {q?.question || `Savol ${idx + 1}`}
                    </div>

                    <div className="bg-white p-3 rounded text-sm">
                      <div>
                        <span className="font-medium">Javob:</span>{" "}
                        <pre className="whitespace-pre-wrap">{answerText}</pre>
                      </div>

                      {!correct && correctText && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <span className="font-medium text-green-700">
                            To‘g‘ri javob:
                          </span>
                          <pre className="whitespace-pre-wrap">
                            {correctText}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import apiService from "../../services/api";

const possibleLanguages = ["python", "javascript", "cpp", "java", "go"] as const;
type Language = typeof possibleLanguages[number];

interface TestCase {
  input: string;
  expected_output: string;
}

interface Challenge {
  id?: number;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  languages: Language[];
  test_cases: TestCase[];
  autocheck: boolean;
  max_score: number;
  time_limit: number;
  memory_limit: number;
  is_private: boolean;
}

export default function CodeChallengesPage() {
  const [showForm, setShowForm] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  // EDIT MODAL STATE
  const [editModal, setEditModal] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);

  // FORM STATE (ADD NEW)
  const [challenge, setChallenge] = useState<Challenge>({
    title: "",
    description: "",
    difficulty: "medium",
    languages: [],
    test_cases: [{ input: "", expected_output: "" }],
    autocheck: true,
    max_score: 100,
    time_limit: 1.0,
    memory_limit: 256,
    is_private: false,
  });

  const updateField = <K extends keyof Challenge>(field: K, value: Challenge[K]) => {
    setChallenge(prev => ({ ...prev, [field]: value }));
  };

  const updateEditField = <K extends keyof Challenge>(field: K, value: Challenge[K]) => {
    if (editingChallenge) {
      setEditingChallenge(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const addTestCase = () => {
    updateField("test_cases", [...challenge.test_cases, { input: "", expected_output: "" }]);
  };

  const removeTestCase = (index: number) => {
    updateField(
      "test_cases",
      challenge.test_cases.filter((_, i) => i !== index)
    );
  };

  const removeEditTestCase = (index: number) => {
    if (!editingChallenge) return;
    updateEditField(
      "test_cases",
      editingChallenge.test_cases.filter((_, i) => i !== index)
    );
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: string) => {
    const updated = [...challenge.test_cases];
    updated[index][field] = value;
    updateField("test_cases", updated);
  };

  const addEditTestCase = () => {
    if (!editingChallenge) return;
    updateEditField("test_cases", [
      ...editingChallenge.test_cases,
      { input: "", expected_output: "" },
    ]);
  };

  const updateEditTestCase = (index: number, field: keyof TestCase, value: string) => {
    if (!editingChallenge) return;
    const updated = [...editingChallenge.test_cases];
    updated[index][field] = value;
    updateEditField("test_cases", updated);
  };

  const toggleLanguage = (lang: Language) => {
    if (challenge.languages.includes(lang)) {
      updateField("languages", challenge.languages.filter(l => l !== lang));
    } else {
      updateField("languages", [...challenge.languages, lang]);
    }
  };

  const toggleEditLanguage = (lang: Language) => {
    if (!editingChallenge) return;
    if (editingChallenge.languages.includes(lang)) {
      updateEditField(
        "languages",
        editingChallenge.languages.filter(l => l !== lang)
      );
    } else {
      updateEditField("languages", [...editingChallenge.languages, lang]);
    }
  };

  // LOAD LIST
  const loadChallenges = async () => {
    try {
      const res = await apiService.request<Challenge[]>("/api/challenges/", {
        method: "GET",
      });
      setChallenges(res);
    } catch (error) {
      console.error(error);
      alert("Savollarni olishda xato!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallenges();
  }, []);

  // ADD NEW
  const submitChallenge = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await apiService.request("/api/challenges/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(challenge),
      });

      alert("Savol qo‘shildi!");
      setShowForm(false);

      setChallenge({
        title: "",
        description: "",
        difficulty: "medium",
        languages: [],
        test_cases: [{ input: "", expected_output: "" }],
        autocheck: true,
        max_score: 100,
        time_limit: 1.0,
        memory_limit: 256,
        is_private: false,
      });

      loadChallenges();
    } catch (err) {
      console.error(err);
      alert("Saqlashda xato!");
    }
  };

  // DELETE
  const deleteChallenge = async (id: number) => {
    if (!confirm("Haqiqatan o‘chirmoqchimisiz?")) return;
    try {
      await apiService.request(`/api/challenges/${id}/`, { method: "DELETE" });
      setChallenges(challenges.filter(c => c.id !== id));
    } catch {
      alert("O‘chirishda xato!");
    }
  };

  // EDIT
  const openEditModal = (ch: Challenge) => {
    setEditingChallenge({ ...ch });
    setEditModal(true);
  };

  const saveEditedChallenge = async () => {
    if (!editingChallenge || !editingChallenge.id) return;

    try {
      await apiService.request(`/api/challenges/${editingChallenge.id}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingChallenge),
      });

      alert("O‘zgartirish saqlandi!");

      setEditModal(false);
      setEditingChallenge(null);
      loadChallenges();
    } catch (err) {
      console.error(err);
      alert("Tahrirlashda xato!");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded"
        >
          + Yangi Savol Qo‘shish
        </button>
      )}

      {/* FORM */}
      {showForm && (
        <div className="border p-4 rounded shadow mb-8 bg-white">
          <h1 className="text-2xl font-bold mb-4">Yangi Challenge</h1>

          <form onSubmit={submitChallenge} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block font-semibold">Sarlavha</label>
              <input
                className="w-full border p-2 rounded"
                value={challenge.title}
                onChange={e => updateField("title", e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block font-semibold">Tavsif</label>
              <textarea
                className="w-full border p-2 rounded h-32"
                value={challenge.description}
                onChange={e => updateField("description", e.target.value)}
                required
              />
            </div>

            {/* Difficulty */}
            <div>
              <label className="block font-semibold">Daraja</label>
              <select
                className="w-full border p-2 rounded"
                value={challenge.difficulty}
                onChange={e =>
                  updateField("difficulty", e.target.value as Challenge["difficulty"])
                }
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {/* Languages */}
            <div>
              <label className="block font-semibold mb-2">Tillar</label>
              <div className="flex flex-wrap gap-3">
                {possibleLanguages.map(lang => (
                  <label key={lang} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={challenge.languages.includes(lang)}
                      onChange={() => toggleLanguage(lang)}
                    />
                    <span className="capitalize">{lang}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Test Cases */}
            <div>
              <label className="block font-semibold mb-2">Test Cases</label>

              {challenge.test_cases.map((tc, index) => (
                <div key={index} className="border p-3 rounded mb-2 bg-gray-100">
                  <input
                    className="w-full border p-2 rounded mb-2"
                    placeholder="Input"
                    value={tc.input}
                    onChange={e => updateTestCase(index, "input", e.target.value)}
                  />
                  <input
                    className="w-full border p-2 rounded"
                    placeholder="Expected Output"
                    value={tc.expected_output}
                    onChange={e => updateTestCase(index, "expected_output", e.target.value)}
                  />

                  {challenge.test_cases.length > 1 && (
                    <button
                      type="button"
                      className="text-red-500 mt-2"
                      onClick={() => removeTestCase(index)}
                    >
                      O‘chirish
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addTestCase}
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                + Test qo‘shish
              </button>
            </div>

            <div className="flex gap-4">
              <button type="submit" className="flex-1 py-2 bg-green-600 text-white rounded">
                Saqlash
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-2 bg-gray-300 rounded"
              >
                Bekor qilish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CHALLENGE LIST */}
      <h2 className="text-xl font-bold mb-4">Mavjud Challengelar</h2>

      {loading ? (
        <p>Yuklanmoqda...</p>
      ) : challenges.length === 0 ? (
        <p>Hozircha savol yo‘q.</p>
      ) : (
        <div className="space-y-4">
          {challenges.map(ch => (
            <div key={ch.id} className="border p-4 rounded shadow bg-white">
              <h3 className="text-lg font-semibold">{ch.title}</h3>
              <p className="text-gray-600">{ch.description.slice(0, 120)}...</p>

              <div className="mt-3 flex gap-3">
                <button
                  onClick={() => openEditModal(ch)}
                  className="px-3 py-1 bg-yellow-500 text-white rounded"
                >
                  ✏ Tahrirlash
                </button>

                <button
                  onClick={() => ch.id && deleteChallenge(ch.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded"
                >
                  🗑 O‘chirish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDIT MODAL */}
      {editModal && editingChallenge && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded shadow max-w-xl w-full">
            <h2 className="text-xl font-bold mb-4">Challenge Tahrirlash</h2>

            <div className="space-y-4">
              <input
                className="w-full border p-2 rounded"
                value={editingChallenge.title}
                onChange={e => updateEditField("title", e.target.value)}
              />

              <textarea
                className="w-full border p-2 rounded h-32"
                value={editingChallenge.description}
                onChange={e => updateEditField("description", e.target.value)}
              />

              <select
                className="w-full border p-2 rounded"
                value={editingChallenge.difficulty}
                onChange={e =>
                  updateEditField("difficulty", e.target.value as Challenge["difficulty"])
                }
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              {/* LANGUAGES */}
              <div>
                <label className="font-semibold">Tillar</label>
                <div className="flex flex-wrap gap-3 mt-2">
                  {possibleLanguages.map(lang => (
                    <label key={lang} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingChallenge.languages.includes(lang)}
                        onChange={() => toggleEditLanguage(lang)}
                      />
                      <span className="capitalize">{lang}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* TEST CASES (EDIT) */}
              <div>
                <label className="font-semibold">Test Cases</label>

                {editingChallenge.test_cases.map((tc, index) => (
                  <div key={index} className="border p-3 rounded mb-2 bg-gray-100">
                    <input
                      className="w-full border p-2 rounded mb-2"
                      value={tc.input}
                      onChange={e => updateEditTestCase(index, "input", e.target.value)}
                    />
                    <input
                      className="w-full border p-2 rounded"
                      value={tc.expected_output}
                      onChange={e => updateEditTestCase(index, "expected_output", e.target.value)}
                    />
                    {editingChallenge.test_cases.length > 1 && (
                      <button
                        type="button"
                        className="text-red-500 mt-2"
                        onClick={() => removeEditTestCase(index)}
                      >
                        O'chirish
                      </button>
                    )}
                  </div>
                ))}

                <button
                  onClick={addEditTestCase}
                  className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
                >
                  + Test qo‘shish
                </button>
              </div>

              <div className="flex gap-4 mt-4">
                <button
                  onClick={saveEditedChallenge}
                  className="flex-1 py-2 bg-green-600 text-white rounded"
                >
                  Saqlash
                </button>

                <button
                  onClick={() => setEditModal(false)}
                  className="flex-1 py-2 bg-gray-400 text-black rounded"
                >
                  Bekor qilish
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

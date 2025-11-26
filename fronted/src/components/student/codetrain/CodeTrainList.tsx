import React, { useEffect, useState } from "react";
import ProblemCard from "./ProblemCard.tsx";
import apiService from "../../../services/api";

type ProblemSummary = {
  id: number;
  title: string;
  short_description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  visible: boolean;
};

const CodeTrainList: React.FC = () => {
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [level, setLevel] = useState<string>("All");
  const [query, setQuery] = useState<string>("");

  useEffect(() => {
    console.log('CodeTrainList mounted');
    fetchProblems();
  }, []);

  async function fetchProblems() {
    try {
      // Unified API call (handles auth, refresh, errors)
      console.log('fetchProblems: requesting challenges...');
      const data: any = await apiService.getChallenges();
      console.log('fetchProblems: raw data =', data);

      // Support both array and paginated objects { results: [...] }
      const items: any[] = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.results)
          ? (data as any).results
          : [];
      console.log('fetchProblems: items length =', items.length);

      const mappedData = items.map((item: any) => ({
        id: item.id,
        title: item.title,
        short_description: item.description || '',
        difficulty: item.difficulty || 'Medium',
        tags: item.tags || [],
        visible: item.is_private === undefined ? true : !item.is_private,
      }));

      console.log('fetchProblems: mappedData length =', mappedData.length, 'sample =', mappedData[0]);
      setProblems(mappedData);
    } catch (e) {
      console.error('Failed to fetch problems via apiService:', e);
      setProblems([]);
    }
  }

  const filtered = problems.filter(p => {
    if (level !== "All" && p.difficulty !== level) return false;
    if (query.trim() === "") return true;
    return (
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.short_description.toLowerCase().includes(query.toLowerCase()) ||
      p.tags.join(" ").toLowerCase().includes(query.toLowerCase())
    );
  });

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold">CodeTrain</h1>
        <div className="flex gap-3 items-center">
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="All">All difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          <input
            className="border px-3 py-2 rounded"
            placeholder="Search problems..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <ProblemCard key={p.id} problem={p} />
        ))}
        {filtered.length === 0 && (
          <div className="text-muted p-6 bg-white rounded shadow">Hech narsa topilmadi.</div>
        )}
      </div>
    </div>
  );
};

export default CodeTrainList;

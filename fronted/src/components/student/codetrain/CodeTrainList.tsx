import React, { useEffect, useState } from "react";
import ProblemCard from "./ProblemCard.tsx";

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
    fetchProblems();
  }, []);

  async function fetchProblems() {
    try {
      console.log('Fetching problems from API...');
      const apiUrl = 'http://localhost:8000/api/challenges/';
      console.log('API URL:', apiUrl);
      
      // LocalStorage'dan token olish
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      
      if (!token) {
        console.error('Token topilmadi. Iltimos, qaytadan tizimga kiring.');
        window.location.href = '/login';
        return;
      }
      
      console.log('Token topildi:', token.substring(0, 10) + '...');
      
      const res = await fetch(apiUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });
      
      console.log('Response status:', res.status, res.statusText);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${res.status} - ${res.statusText}\n${errorText}`);
      }
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Expected JSON but got:', contentType, '\nResponse:', text);
        throw new Error(`Expected JSON but got ${contentType}`);
      }
      
      const data = await res.json();
      console.log('API Response:', data);
      
      // Map the API response to match the ProblemSummary type
      const mappedData = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        short_description: item.description || '',
        difficulty: item.difficulty || 'Medium',
        tags: item.tags || [],
        visible: !item.is_private
      }));
      
      setProblems(mappedData);
    } catch (e) {
      console.error("Failed to fetch problems:", e);
      // Xatolikni foydalanuvchiga ko'rsatish uchun state o'zgartirish
      // setError(e.message); // Agar error state bo'lsa
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

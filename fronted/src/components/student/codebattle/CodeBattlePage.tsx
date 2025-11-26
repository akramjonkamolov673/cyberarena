import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiService from "../../../services/api";
import ProblemCard from "../codetrain/ProblemCard.tsx";

// Local type aligned with ProblemCard props (avoid name clash)
type CBProblemSummary = {
  id: number;
  title: string;
  short_description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
};

interface ChallengeGroup {
  id: number;
  title: string;
  description?: string | null;
  challenges?: number[]; // serializer may return list of IDs
  [k: string]: any;
}

const CodeBattlePage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const [group, setGroup] = useState<ChallengeGroup | null>(null);
  const [problems, setProblems] = useState<CBProblemSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!groupId) return;
      try {
        setLoading(true);
        console.log("[CodeBattle] start fetch, groupId=", groupId);

        // 1) Fetch group meta (ids of challenges expected in `challenges`)
        const grp = await apiService.getChallengeGroup(Number(groupId));
        console.log("[CodeBattle] group raw=", grp);
        setGroup(grp as any);

        // 2) Fetch all challenges available for user
        const allChallenges: any[] = await apiService.getChallenges();
        console.log("[CodeBattle] allChallenges raw=", allChallenges);

        const groupChallengeIds: number[] = Array.isArray((grp as any)?.challenges)
          ? (grp as any).challenges
          : [];

        // 3) Filter challenges by group.challenges
        const filtered = (Array.isArray(allChallenges) ? allChallenges : [])
          .filter((c: any) => groupChallengeIds.includes(c.id));

        console.log("[CodeBattle] filtered challenges (by id)=", filtered);

        // 4) Map to ProblemSummary for UI
        const normDifficulty = (val: any): "Easy" | "Medium" | "Hard" => {
          const s = (val || "").toString().toLowerCase();
          if (s === "easy") return "Easy";
          if (s === "hard") return "Hard";
          if (s === "medium") return "Medium";
          return "Medium";
        };

        const mapped: CBProblemSummary[] = filtered.map((item: any) => ({
          id: item.id,
          title: item.title,
          short_description: item.description || "",
          difficulty: normDifficulty(item.difficulty),
          tags: item.tags || [],
        }));

        console.log("[CodeBattle] mapped problems=", mapped);
        setProblems(mapped);
        setError(null);
      } catch (e: any) {
        console.error("[CodeBattle] error:", e);
        setError(e?.message || "Xatolik yuz berdi");
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId]);

  if (loading) {
    return (
      <div className="p-6">CodeBattle yuklanmoqda...</div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">Xatolik: {error}</div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">CodeBattle: {group?.title || `Group #${groupId}`}</h1>
          {group?.description ? (
            <p className="text-gray-600 mt-1">{group.description}</p>
          ) : null}
        </div>
        <button
          onClick={() => navigate('/student/codetrain')}
          className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200"
        >
          CodeTrain'ga qaytish
        </button>
      </div>

      {problems.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {problems.map((p) => (
            <ProblemCard key={p.id} problem={p} />
          ))}
        </div>
      ) : (
        <div className="text-muted p-6 bg-white rounded shadow">Bu guruhda hozircha challenge yo'q.</div>
      )}
    </div>
  );
};

export default CodeBattlePage;

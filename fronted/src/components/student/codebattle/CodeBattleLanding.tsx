import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiService from "../../../services/api";

interface ChallengeGroupItem {
  id: number;
  title: string;
  description?: string | null;
  challenges_count?: number;
  [k: string]: any;
}

const CodeBattleLanding: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<ChallengeGroupItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        console.log("[CodeBattleLanding] fetching groups...");
        const data = await apiService.getChallengeGroups();
        console.log("[CodeBattleLanding] groups raw=", data);
        setGroups(data as any);
        setError(null);
      } catch (e: any) {
        console.error("[CodeBattleLanding] error:", e);
        setError(e?.message || "Gruhlar ro'yxatini yuklashda xatolik");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="p-6">Gruhlar yuklanmoqda...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Xatolik: {error}</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">CodeBattle guruhlari</h1>
        <p className="text-gray-600 mt-1">Quyidagi guruhlardan birini tanlab boshlang.</p>
      </div>

      {groups.length === 0 ? (
        <div className="text-muted p-6 bg-white rounded shadow">
          Siz uchun ko'rinadigan challenge guruhi topilmadi.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g.id} className="bg-white rounded-lg shadow p-4 flex flex-col justify-between">
              <div>
                <h2 className="font-semibold text-lg">{g.title}</h2>
                {g.description ? (
                  <p className="text-sm text-gray-600 mt-2">{g.description}</p>
                ) : null}
                {typeof g.challenges_count === 'number' ? (
                  <div className="text-xs text-gray-500 mt-2">Challenge soni: {g.challenges_count}</div>
                ) : null}
              </div>
              <div className="mt-4">
                <button
                  onClick={() => {
                    console.log("[CodeBattleLanding] start group id=", g.id);
                    navigate(`/student/codebattle/${g.id}`);
                  }}
                  className="w-full text-center py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
                >
                  Boshlash
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CodeBattleLanding;

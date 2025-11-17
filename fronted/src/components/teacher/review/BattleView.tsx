export default function BattleView({ items }: { items: any[] }) {
  return (
    <div className="space-y-4">
      {items.map((sub: any) => (
        <div key={sub.id} className="p-4 border rounded bg-white">
          <h3 className="font-bold text-lg">CodeBattle: {sub.challenge}</h3>

          <pre className="bg-black text-white text-sm p-3 rounded mt-3 overflow-auto max-h-96">
            {sub.code}
          </pre>

          <p className="mt-2">
            Testlar: {sub.passed_count} / {sub.total_tests}
          </p>

          {sub.test_results?.map((t: any, i: number) => (
            <div key={i} className="text-sm mt-2 p-2 rounded bg-gray-100">
              {t.name}: {t.passed ? "O‘tdi" : "Yi qilmadi"}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

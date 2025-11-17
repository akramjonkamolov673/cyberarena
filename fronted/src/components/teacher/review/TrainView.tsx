export default function TrainView({ items }: { items: any[] }) {
  return (
    <div className="space-y-4">
      {items.map((sub: any) => (
        <div key={sub.id} className="p-4 border rounded bg-white">
          <h3 className="font-bold text-lg">CodeTrain: {sub.challenge}</h3>

          <pre className="bg-black text-white text-sm p-3 rounded mt-3 overflow-auto">
            {sub.code}
          </pre>

          <p className="mt-2">
            Testlar: {sub.passed_count} / {sub.total_tests}
          </p>

          {sub.test_results?.map((t: any, index: number) => (
            <div key={index} className="text-sm mt-2 p-2 rounded bg-gray-100">
              {t.name}: {t.passed ? "O‘tdi" : "Yi qilmadi"}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

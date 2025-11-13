import * as React from 'react';

interface CodeChallenge {
  id: number;
  title: string;
  description: string;
  difficulty: 'oson' | "o'rtacha" | 'qiyin';
  language: string;
  createdAt: string;
}

const CodeChallengeManager: React.FC = () => {
  const [challenges] = React.useState<CodeChallenge[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    // Bu yerda API orqali code challenge'larni yuklash logikasi bo'ladi
    // Masalan: loadChallenges();
    setLoading(false);
  }, []);

  if (loading) return <div>Yuklanmoqda...</div>;

  return (
    <div className="code-challenge-manager">
      <h2>Code Challenge'lar boshqaruvi</h2>
      <div className="challenges-list">
        {challenges.length === 0 ? (
          <p>Hozircha code challenge'lar mavjud emas</p>
        ) : (
          <ul>
            {challenges.map((challenge) => (
              <li key={challenge.id}>
                <h3>{challenge.title}</h3>
                <p>{challenge.description}</p>
                <div className="challenge-meta">
                  <span>Qiyinchilik: {challenge.difficulty}</span>
                  <span>Til: {challenge.language}</span>
                  <span>Sana: {new Date(challenge.createdAt).toLocaleDateString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CodeChallengeManager;
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

type ProblemSummary = {
  id: number;
  title: string;
  short_description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
};

const difficultyColor = (d: string) =>
  d === "Easy" ? "bg-green-100 text-green-800" : d === "Medium" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";

const ProblemCard: React.FC<{ problem: ProblemSummary }> = ({ problem }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navigate = useNavigate();

  // Disable right-click and keyboard shortcuts
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        // Hide browser UI elements
        if ('navigation' in window && 'setAppBadge' in navigator) {
          // @ts-ignore - Experimental API
          navigation.setAppBadge && navigation.setAppBadge();
        }
        setIsFullscreen(true);
        
        // Navigate to the problem page in fullscreen
        navigate(`/student/codetrain/${problem.id}?fullscreen=true`);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        navigate(-1); // Go back when exiting fullscreen
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };
  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">{problem.title}</h2>
          <span className={`px-2 py-1 rounded text-sm ${difficultyColor(problem.difficulty)}`}>
            {problem.difficulty}
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-2">{problem.short_description}</p>

        <div className="flex flex-wrap gap-2 mt-3">
          {problem.tags.map((t) => (
            <span key={t} className="text-xs bg-gray-100 px-2 py-1 rounded">{t}</span>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <button 
          onClick={toggleFullscreen}
          className="w-full text-center py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors duration-200"
        >
          {isFullscreen ? 'Yuklanmoqda...' : 'Boshlash (To\'liq ekran)'}
        </button>
      </div>
    </div>
  );
};

export default ProblemCard;

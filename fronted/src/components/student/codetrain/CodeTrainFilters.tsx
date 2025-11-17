import React from "react";

type Props = {
  level: string;
  onLevelChange: (v: string) => void;
  query: string;
  onQueryChange: (v: string) => void;
};

const CodeTrainFilters: React.FC<Props> = ({ level, onLevelChange, query, onQueryChange }) => {
  return (
    <div className="flex gap-3 items-center">
      <select value={level} onChange={(e) => onLevelChange(e.target.value)} className="border px-2 py-1 rounded">
        <option value="All">All</option>
        <option value="Easy">Easy</option>
        <option value="Medium">Medium</option>
        <option value="Hard">Hard</option>
      </select>
      <input placeholder="Search..." value={query} onChange={(e) => onQueryChange(e.target.value)} className="border px-2 py-1 rounded" />
    </div>
  );
};

export default CodeTrainFilters;

import React from "react";

const TerminalOutput: React.FC<{ output: string }> = ({ output }) => {
  return (
    <div className="bg-black text-white rounded p-3 font-mono h-48 overflow-auto">
      {output ? (
        output.split("\n").map((line, i) => <div key={i} className="whitespace-pre-wrap">{line}</div>)
      ) : (
        <div className="text-gray-400">No output yet. Run your code to see results.</div>
      )}
    </div>
  );
};

export default TerminalOutput;

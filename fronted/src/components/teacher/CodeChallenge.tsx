import React from 'react';
import './TeacherPanel.css';

interface CodeChallengeProps {
  // Add any props here if needed in the future
}

const CodeChallenge: React.FC<CodeChallengeProps> = () => {
  return (
    <div className="code-challenge-container">
      <h2>Code Challenge</h2>
      <div className="challenge-content">
        <p>Bu yerda Code Challenge bo'limi mavjud. Tez orada yangilanadi...</p>
      </div>
    </div>
  );
};

export default CodeChallenge;

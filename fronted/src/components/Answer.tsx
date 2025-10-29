import React, { useState, useEffect } from 'react';
import './Answer.css';
import Komlyator from './Komlyator';

interface AnswerProps {
  question: {
    id: string;
    title: string;
    description?: string;
    type?: string | undefined;
    content?: string;
    options?: string[];
    time_limit?: number;
    memory_limit?: number;
    max_score?: number;
    start_time?: string;
    end_time?: string;
    languages?: string[];
    test_cases?: Array<{ 
      input: string; 
      expected_output: string;
      execution_time?: number;
      memory_used?: number;
    }>;
    autocheck?: boolean;
    difficulty?: 'easy' | 'medium' | 'hard';
    is_private?: boolean;
  };
  onSubmit: (answer: any) => void;
  onClose: () => void;
}

const Answer: React.FC<AnswerProps> = ({ question, onSubmit, onClose }) => {
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [answer, setAnswer] = useState<string | number | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isStarted && question.time_limit && !isSubmitted) {
      const endTime = Date.now() + question.time_limit * 1000;
      
      timer = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
        
        setRemainingTime(remaining);
        
        if (remaining === 0) {
          handleSubmit();
        }
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isStarted, question.time_limit, isSubmitted]);

  const handleStart = () => {
    setIsStarted(true);
    if (question.time_limit) {
      setRemainingTime(question.time_limit);
    }
  };

  const handleSubmit = () => {
    if (!answer) return;
    
    const submissionData = {
      challenge: question.id,
      submitted_at: new Date().toISOString(),
      time_spent: question.time_limit ? question.time_limit - (remainingTime || 0) : null,
      
      // Test submission
      ...(question.type === 'test' && {
        test: question.id,
        answers: [{
          question_index: 0,
          selected: answer as number
        }]
      }),
      
      // Code submission
      ...(question.type === 'code' && {
        code: {
          source: answer as string,
          language: question.languages ? question.languages[0] : 'cpp'
        },
        test_results: [],
        execution_time: 0,
        memory_used: 0
      }),
      
      // Text submission
      ...(question.type === 'text' && {
        answer: answer as string
      })
    };

    setIsSubmitted(true);
    onSubmit(submissionData);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isStarted) {
    return (
      <div className="answer-start-screen">
        <h2>{question.title}</h2>
        {question.description && <p className="description">{question.description}</p>}
        <div className="info-grid">
          <div className="info-item">
            <i className="fas fa-clock"></i>
            <span>Vaqt limiti: {question.time_limit ? `${Math.ceil(question.time_limit / 60)} daqiqa` : 'Cheklanmagan'}</span>
          </div>
          {question.memory_limit && (
            <div className="info-item">
              <i className="fas fa-memory"></i>
              <span>Xotira limiti: {question.memory_limit}MB</span>
            </div>
          )}
          {question.max_score && (
            <div className="info-item">
              <i className="fas fa-trophy"></i>
              <span>Maksimal ball: {question.max_score}</span>
            </div>
          )}
          <div className="info-item">
            <i className="fas fa-file-alt"></i>
            <span>Savol turi: {question.type === 'test' ? 'Test' : question.type === 'code' ? 'Kod' : 'Matn'}</span>
          </div>
          {question.difficulty && (
            <div className="info-item">
              <i className="fas fa-signal"></i>
              <span>Qiyinlik: {
                question.difficulty === 'easy' ? 'Oson' :
                question.difficulty === 'medium' ? "O'rta" :
                question.difficulty === 'hard' ? 'Qiyin' : question.difficulty
              }</span>
            </div>
          )}
          {question.languages && question.languages.length > 0 && (
            <div className="info-item">
              <i className="fas fa-code"></i>
              <span>Tillar: {question.languages.join(', ')}</span>
            </div>
          )}
        </div>
        <div className="button-group">
          <button className="start-btn" onClick={handleStart}>
            <i className="fas fa-play"></i>
            Boshlash
          </button>
          <button className="cancel-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
            Bekor qilish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="answer-container">
      <div className="answer-header">
        <h2>{question.title}</h2>
        {remainingTime !== null && (
          <div className="timer">
            <i className="fas fa-clock"></i>
            {formatTime(remainingTime)}
          </div>
        )}
      </div>

      <div className="answer-content">
        {question.description && (
          <div className="question-description">
            {question.description}
          </div>
        )}

        {question.type === 'test' && question.options && (
          <div className="test-options">
            {question.options.map((option, index) => (
              <label key={index} className="option-label">
                <input
                  type="radio"
                  name="answer"
                  value={index}
                  onChange={(e) => setAnswer(Number(e.target.value))}
                  disabled={isSubmitted}
                />
                <span className="option-text">{option}</span>
              </label>
            ))}
          </div>
        )}

        {question.type === 'text' && (
          <textarea
            className="text-answer"
            placeholder="Javobingizni bu yerga yozing..."
            value={answer as string || ''}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={isSubmitted}
            onPaste={(e) => {
              e.preventDefault();
              alert("Nusxa ko'chirish taqiqlangan!");
            }}
          />
        )}

        {question.type === 'code' && (
          <div className="code-editor-full">
            <Komlyator
              initialCode={(answer as string) || question.content || ''}
              language={question.languages && question.languages.length > 0 ? question.languages[0] : 'cpp'}
              fileName={question.languages && question.languages.length > 0 && question.languages[0].toLowerCase().includes('cpp') ? 'main.cpp' : 'main.cpp'}
              testCases={question.test_cases || []}
              onSubmit={(submission) => {
                // merge code submission into parent expected submission shape
                const payload = {
                  questionId: question.id,
                  answer: submission.answer,
                  submittedAt: submission.submittedAt,
                  timeSpent: question.time_limit ? question.time_limit - (remainingTime || 0) : null,
                  type: 'code',
                  language: submission.language,
                  testResults: submission.metadata?.testResults || submission.executionSummary || []
                };
                setIsSubmitted(true);
                onSubmit(payload);
              }}
              onClose={onClose}
            />
          </div>
        )}
      </div>

      <div className="answer-footer">
        {!isSubmitted ? (
          <button 
            className="submit-btn" 
            onClick={handleSubmit}
            disabled={!answer}
          >
            <i className="fas fa-paper-plane"></i>
            Topshirish
          </button>
        ) : (
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-check"></i>
            Yopish
          </button>
        )}
      </div>
    </div>
  );
};

export default Answer;
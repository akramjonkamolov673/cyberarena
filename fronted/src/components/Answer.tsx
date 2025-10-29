import React, { useState, useEffect } from 'react';
import './Answer.css';
import Komlyator from './Komlyator';

interface AnswerProps {
  question: {
    id: string;
    title: string;
    description?: string;
    // accept wider set from backend (may be string or undefined)
    type?: string | undefined;
    content?: string;
    options?: string[];
    time_limit?: number;
    start_time?: string;
    end_time?: string;
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
      questionId: question.id,
      answer,
      submittedAt: new Date().toISOString(),
      timeSpent: question.time_limit ? question.time_limit - (remainingTime || 0) : null,
      type: question.type,
      // Test uchun qo'shimcha ma'lumotlar
      ...(question.type === 'test' && {
        selectedOption: answer as number,
        options: question.options
      }),
      // Kod uchun qo'shimcha ma'lumotlar
      ...(question.type === 'code' && {
        language: 'python', // TODO: Tanlangan tilni olish kerak
        executionTime: 0, // TODO: Haqiqiy qiymatni olish kerak
        memoryUsed: 0, // TODO: Haqiqiy qiymatni olish kerak
        testResults: [] // TODO: Test natijalarini olish kerak
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
          <div className="info-item">
            <i className="fas fa-file-alt"></i>
            <span>Savol turi: {question.type === 'test' ? 'Test' : question.type === 'code' ? 'Kod' : 'Matn'}</span>
          </div>
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
              testCases={
                // support both camelCase and snake_case test cases
                (question as any).test_cases
                  ? (question as any).test_cases.map((tc: any) => ({ input: tc.input, expectedOutput: tc.expected_output }))
                  : (question as any).testCases
                    ? (question as any).testCases.map((tc: any) => ({ input: tc.input, expectedOutput: tc.expectedOutput }))
                    : []
              }
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
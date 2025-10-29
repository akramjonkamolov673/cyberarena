import React, { useState } from 'react';
import Komlyator from './Komlyator';
import apiService from '../services/api';
import './Komlyator.css';

interface QuestionItem {
  id: string;
  title: string;
  description?: string;
  languages?: string[];
  test_cases?: Array<{ input: string; expected_output: string }>;
  time_limit?: number;
  memory_limit?: number;
  max_score?: number;
  autocheck?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  is_private?: boolean;
  challenge_group?: {
    id: number;
    title: string;
  };
}

interface Props {
  question: QuestionItem;
  onClose?: () => void;
}

export default function CodeChallengeRunner({ question, onClose }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmitFromKomlyator = async (submission: any) => {
    // submission: { answer, submittedAt, language, executionSummary, metadata }
    setSubmitting(true);
    setMessage(null);
    try {
      const payload = {
        challenge: question.id,
        code: {
          source: submission.answer,
          language: submission.language || (question.languages && question.languages[0]) || 'cpp'
        },
        submitted_at: submission.submittedAt || new Date().toISOString(),
        time_spent: null,
        test_results: (submission.metadata?.testResults || submission.executionSummary || []).map((result: any) => ({
          input: result.input,
          expected_output: result.expectedOutput,
          actual_output: result.actualOutput,
          passed: result.passed,
          execution_time: result.executionTime,
          memory_used: result.memoryUsed,
          error: result.error
        }))
      };

      await apiService.submitAnswer(payload as any);
      setMessage('Javob yuborildi');
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Yuborishda xato:', err);
      const body = (err && (err.body || err.message)) || String(err);
      setMessage(`Xatolik: ${body}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="code-challenge-runner">
      <div className="challenge-header">
        <h2>{question.title}</h2>
        {question.description && <p className="challenge-desc">{question.description}</p>}
      </div>

      <Komlyator
        initialCode={''}
        language={question.languages && question.languages.length ? question.languages[0] : 'cpp'}
        fileName={question.languages && question.languages.length && question.languages[0].toLowerCase().includes('cpp') ? 'main.cpp' : 'main.cpp'}
        testCases={question.testCases || []}
        onSubmit={handleSubmitFromKomlyator}
        onClose={onClose}
      />

      {submitting && <div className="submitting">Yuborilmoqda...</div>}
      {message && <div className="message">{message}</div>}
    </div>
  );
}

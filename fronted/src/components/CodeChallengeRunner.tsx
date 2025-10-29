import React, { useState } from 'react';
import Komlyator from './Komlyator';
import apiService from '../services/api';
import './Komlyator.css';

interface QuestionItem {
  id: string;
  title: string;
  description?: string;
  languages?: string[];
  testCases?: Array<{ input: string; expectedOutput: string }>;
  time_limit?: number;
  memory_limit?: number;
  max_score?: number;
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
        questionId: question.id,
        answer: submission.answer,
        submittedAt: submission.submittedAt || new Date().toISOString(),
        timeSpent: null,
        type: 'code' as const,
        language: submission.language || (question.languages && question.languages[0]) || 'cpp',
        testResults: submission.metadata?.testResults || submission.executionSummary || [],
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

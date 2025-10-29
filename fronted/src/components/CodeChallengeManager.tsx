import React, { useState, useEffect } from 'react';
import './QuestionManager.css';
import apiService from '../services/api';

interface TestCase {
  input: string;
  expectedOutput: string;
}

export default function CodeChallengeManager() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState<number>(1);
  const [languages, setLanguages] = useState<string>('cpp');
  const [testJson, setTestJson] = useState('');
  const [parsedCases, setParsedCases] = useState<TestCase[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      const qs = await apiService.getQuestions();
      const onlyCode = (qs || []).filter((q: any) => q.type === 'code');
      setList(onlyCode);
    } catch (err) {
      console.error('Kod savollarni yuklashda xato:', err);
    }
  };

  const handleParse = () => {
    setError(null);
    try {
      const parsed = JSON.parse(testJson);
      if (!Array.isArray(parsed)) throw new Error('JSON array bo`lishi kerak');
      const normalized = parsed.map((p: any) => ({
        input: (p.input ?? p.in ?? p.stdin ?? '') + '',
        expectedOutput: (p.expected_output ?? p.expectedOutput ?? p.out ?? p.stdout ?? '') + ''
      }));
      setParsedCases(normalized.filter((c: TestCase) => c.input.trim() !== ''));
    } catch (err: any) {
      setParsedCases([]);
      setError(err?.message || 'JSON parse xatosi');
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (!title.trim()) return setError('Sarlavha kiriting');
    if (parsedCases.length === 0) return setError('Kamida bitta test case kerak');

    const payload = {
      title: title.trim(),
      type: 'code' as const,
      targetType: 'all' as const,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + duration * 60 * 1000).toISOString(),
      duration,
      content: description.trim(),
      testCases: parsedCases,
      languages: languages.split(',').map(s => s.trim()).filter(Boolean),
    };

    try {
      setSubmitting(true);
      const resp = await apiService.createQuestion(payload as any);
      // reload list
      await loadChallenges();
      // clear form
      setTitle(''); setDescription(''); setTestJson(''); setParsedCases([]);
      setError(null);
      const toast = document.createElement('div');
      toast.className = 'toast success';
      toast.textContent = 'Kod challenge yaratildi';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
    } catch (err: any) {
      console.error('Kod challenge yaratishda xato:', err);
      setError((err && (err.message || JSON.stringify(err))) || 'Xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="question-manager">
      <div className="section-header">
        <h2><i className="fas fa-code"></i> Kod savollar boshqaruvi</h2>
      </div>

      <form className="question-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Sarlavha</label>
          <input value={title} onChange={e => setTitle(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Ta'rif (description)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="form-group">
          <label>Til(lar) (vergul bilan)</label>
          <input value={languages} onChange={e => setLanguages(e.target.value)} placeholder="cpp,python,java" />
        </div>
        <div className="form-group">
          <label>Vaqt (daqiqa)</label>
          <input type="number" min={1} value={duration} onChange={e => setDuration(Number(e.target.value))} required />
        </div>

        <div className="form-group">
          <label>Test case JSON (array)</label>
          <textarea value={testJson} onChange={e => setTestJson(e.target.value)} rows={6} placeholder='[ {"input":"2 3","expected_output":"5"} ]' />
          <div style={{ marginTop: 8 }}>
            <button type="button" className="variant-btn" onClick={handleParse}>JSONni tekshirish</button>
            <button type="button" className="variant-btn" onClick={() => { setTestJson(''); setParsedCases([]); setError(null); }}>Tozalash</button>
          </div>
          {error && <div className="error-text">{error}</div>}
          {parsedCases.length > 0 && (
            <div className="testcases-preview">
              <h4>Parsed test cases ({parsedCases.length})</h4>
              {parsedCases.map((tc, idx) => (
                <div key={idx} className="testcase-item">
                  <div><strong>in:</strong> <pre>{tc.input}</pre></div>
                  <div><strong>exp:</strong> <pre>{tc.expectedOutput}</pre></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <button type="submit" className="submit-btn" disabled={submitting}>Yaratish</button>
        </div>
      </form>

      <div className="questions-list">
        <h3>Hozirgi kod savollar ({list.length})</h3>
        {list.map(q => (
          <div key={q.id} className="question-card">
            <h4>{q.title}</h4>
            <div className="question-meta">
              <span>{q.languages?.join?.(', ')}</span>
              <span>{q.duration ? `${q.duration} daqiqa` : '—'}</span>
            </div>
            <p>{q.content || q.description || ''}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

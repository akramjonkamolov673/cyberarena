import React, { useState } from 'react';
import './Komlyator.css';

interface TestCase {
  input: string;
  expected_output: string;
  execution_time?: number;
  memory_used?: number;
  error?: string;
}

interface KomlyatorProps {
  initialCode?: string;
  language?: string; // e.g. 'cpp'
  fileName?: string; // e.g. 'main.cpp'
  testCases?: TestCase[];
  onSubmit?: (submission: any) => void; // called with submission JSON
  onClose?: () => void;
}

const PISTON_URL = import.meta.env.VITE_PISTON_URL || 'https://emkc.org/api/v2/piston/execute';

export default function Komlyator({
  initialCode = '',
  language = 'cpp',
  fileName = 'main.cpp',
  testCases = [],
  onSubmit,
  onClose,
}: KomlyatorProps) {
  const [code, setCode] = useState(initialCode);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [results, setResults] = useState<Array<any>>([]);

  // Run code with a single stdin value via Piston
  const runOne = async (stdin: string) => {
    try {
      const body = {
        language,
        version: 'latest',
        files: [{ name: fileName, content: code }],
        stdin,
        run_timeout: 10000, // 10 seconds
        compile_timeout: 10000,
        compile_memory_limit: 512000, // 512MB
        run_memory_limit: 512000
      };

      const resp = await fetch(PISTON_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const text = await resp.text();
      // try parse JSON response
      try {
        const json = text ? JSON.parse(text) : {};
        if (!resp.ok) {
          return { stdout: '', stderr: json || text || 'Piston error' } as any;
        }
        return json;
      } catch (err) {
        // non-json body
        if (!resp.ok) {
          return { stdout: '', stderr: text || 'Piston error' } as any;
        }
        return { stdout: text || '', stderr: '' } as any;
      }
    } catch (err: any) {
      return { stdout: '', stderr: err.message || String(err) };
    }
  };

  const handleRunAll = async () => {
    setRunning(true);
    setOutput('');
    const res: any[] = [];
    for (let i = 0; i < Math.max(1, testCases.length); i++) {
      const tc = testCases[i] || { input: '', expectedOutput: '' };
      const r = await runOne(tc.input || '');
      const stdout = (r.stdout || '').toString().trim();
      const stderr = (r.stderr || '').toString().trim();
      const expected = (tc.expectedOutput || '').toString().trim();
      const passed = expected !== '' ? stdout === expected : true;
      res.push({ index: i, stdout, stderr, passed, expected: tc.expectedOutput });
    }

    setResults(res);
    setOutput(res.map(r => `#${r.index + 1} passed:${r.passed}\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`).join('\n\n'));
    setRunning(false);
  };

  const handleSubmit = async () => {
    // Ensure we have up-to-date run results
    if (results.length === 0) await handleRunAll();

    const submission = {
      code: {
        source: code,
        language: language
      },
      submitted_at: new Date().toISOString(),
      test_results: results.map(r => ({
        input: testCases[r.index]?.input || '',
        expected_output: testCases[r.index]?.expected_output || '',
        actual_output: r.stdout,
        passed: r.passed,
        execution_time: r.run_time,
        memory_used: r.memory,
        error: r.stderr || null
      }))
    };

    if (onSubmit) onSubmit(submission);
  };

  return (
    <div className="komlyator-container">
      <div className="komlyator-header">
        <div className="lang-select">
          <strong>{language.toUpperCase()}</strong>
        </div>
        <div className="actions">
          <button className="run-btn" onClick={handleRunAll} disabled={running}>
            {running ? 'Ishlayapti...' : 'Run'}
          </button>
          <button className="submit-btn" onClick={handleSubmit} disabled={running}>
            Submit
          </button>
          <button className="close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="komlyator-body">
        <textarea className="code-editor" value={code} onChange={(e) => setCode(e.target.value)} />

        <div className="komlyator-side">
          <div className="testcases">
            <h4>Test cases</h4>
            {testCases.length === 0 && <p>Test case yo'q — birinchi testni kiritib ishga tushirish mumkin.</p>}
            {testCases.map((tc, idx) => (
              <div key={idx} className="testcase-item">
                <div className="testcase-index">#{idx + 1}</div>
                <div className="testcase-body">
                  <div className="tc-input"><strong>in:</strong><pre>{tc.input}</pre></div>
                  <div className="tc-expected"><strong>exp:</strong><pre>{tc.expectedOutput}</pre></div>
                </div>
              </div>
            ))}
          </div>

          <div className="output-panel">
            <h4>Output</h4>
            <pre className="output-pre">{output}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

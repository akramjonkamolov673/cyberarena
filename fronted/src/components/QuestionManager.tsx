import { useState, useEffect } from 'react';
import './QuestionManager.css';
import apiService from '../services/api';

interface TestCase {
  input: string;
  expectedOutput: string;
}

interface Question {
  id: string;
  title: string;
  type: 'test' | 'code' | 'text';
  targetType: 'all' | 'group';
  targetGroup?: string;
  startDate: string;
  endDate: string;
  duration: number;
  isActive: boolean;
  content?: string;
  options?: string[];
  correctAnswer?: number;
  testCases?: TestCase[];
}

function QuestionManager() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [continuationMode, setContinuationMode] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'test' | 'code' | 'text'>('test');
  const [targetType, setTargetType] = useState<'all' | 'group'>('all');
  const [targetGroup, setTargetGroup] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return now.toISOString().slice(0, 16);
  });
  const [duration, setDuration] = useState(30);
  const [content, setContent] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [testCases, setTestCases] = useState<TestCase[]>([{ input: '', expectedOutput: '' }]);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const questions = await apiService.getQuestions();
        setQuestions(questions);
      } catch (error) {
        console.error('Savollarni yuklashda xatolik:', error);
      }
    };
    loadQuestions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const questionData = {
      title,
      type,
      targetType,
      targetGroup: targetType === 'group' ? targetGroup : undefined,
      startDate,
      endDate,
      duration,
      content,
      options: type === 'test' ? options.filter(o => o.trim() !== '') : undefined,
      correctAnswer: type === 'test' ? correctAnswer : undefined,
      testCases: type === 'code' ? testCases.filter(tc => (tc.input || '').toString().trim() !== '' && (tc.expectedOutput || '').toString().trim() !== '') : undefined
    };

    // If code type and testCases are empty but teacher pasted JSON into content,
    // try to parse content as JSON array of testcases and move it to testCases.
    if (type === 'code') {
      const hasCases = Array.isArray(questionData.testCases) && questionData.testCases.length > 0;
      const maybeJson = (content || '').trim();
      if (!hasCases && maybeJson.startsWith('[')) {
        try {
          const parsed = JSON.parse(maybeJson);
          if (Array.isArray(parsed)) {
            // Normalize array entries to {input, expectedOutput}
            const normalized: TestCase[] = parsed.map((p: any) => ({
              input: (p.input ?? p.in ?? p.stdin ?? '') + '',
              expectedOutput: (p.expected_output ?? p.expectedOutput ?? p.out ?? p.stdout ?? '') + ''
            }));
            questionData.testCases = normalized.filter(tc => tc.input.trim() !== '');
            // clear content to avoid storing JSON in description
            questionData.content = '';
          }
        } catch (err) {
          // ignore parse errors, keep original content
        }
      }
    }

    try {
      let response;
      if (editingQuestion) {
        // Update existing question
        response = await apiService.updateQuestion(editingQuestion.id, questionData);
        const updated = questions.map(q => q.id === editingQuestion.id ? response : q);
        setQuestions(updated);
      } else {
        // Create new question
        response = await apiService.createQuestion(questionData);
        setQuestions([...questions, response]);
      }

      // Show success message
      const toast = document.createElement('div');
      toast.className = 'toast success';
      toast.textContent = editingQuestion ? 'Savol yangilandi' : 'Yangi savol qo\'shildi';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
      
      resetForm();
      setShowForm(false);
      setEditingQuestion(null);
      setContinuationMode(false);
    } catch (error) {
      console.error('Savolni saqlashda xatolik:', error);
      const msg = (error as any)?.message || String(error);
      const body = (error as any)?.body ? `\nBackend: ${(error as any).body}` : '';
      alert(`Savolni saqlashda xatolik: ${msg}${body}`);
    }
  };

  // Save and keep the form open for adding the next question
  const handleSaveAndAdd = async (e: React.MouseEvent) => {
    e.preventDefault();

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      alert('Boshlanish va tugash sanalarini to\'g\'ri kiriting');
      return;
    }

    if (start >= end) {
      alert('Tugash sanasi boshlanish sanasidan keyin bo\'lishi kerak');
      return;
    }

    // Create question data
    const questionData: Question = {
      id: editingQuestion ? editingQuestion.id : Date.now().toString(),
      title: title.trim(),
      type,
      targetType,
      targetGroup: targetType === 'group' ? targetGroup.trim() : undefined,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      duration,
      isActive: editingQuestion ? editingQuestion.isActive : false,
      content: content.trim(),
      options: type === 'test' ? options.filter(o => o.trim() !== '') : undefined,
      correctAnswer: type === 'test' ? correctAnswer : undefined,
      testCases: type === 'code' ? testCases.filter(tc => tc.input.trim() !== '' && tc.expectedOutput.trim() !== '') : undefined
    };

    try {
      // Update questions list
      const updated = editingQuestion 
        ? questions.map(q => q.id === editingQuestion.id ? questionData : q)
        : [...questions, questionData];

      // Sort questions by start date
      updated.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      // Save to state and localStorage
      setQuestions(updated);
      localStorage.setItem('questions', JSON.stringify(updated));

      // Save current values for next question
      const currentTitle = title;
      const currentEndDate = new Date(endDate);
      
      // Partial reset - keep some values for continuity
      setTitle(`${currentTitle} (davomi)`);
      setStartDate(currentEndDate.toISOString().slice(0, 16));
      
      // Set new end date (1 hour after new start)
      const newEndDate = new Date(currentEndDate);
      newEndDate.setHours(newEndDate.getHours() + 1);
      setEndDate(newEndDate.toISOString().slice(0, 16));

      // Keep type and other relevant settings
      // Reset only content-specific fields
      setContent('');
      if (type === 'test') {
        setOptions(['', '']);
        setCorrectAnswer(0);
      } else if (type === 'code') {
        setTestCases([{ input: '', expectedOutput: '' }]);
      }
      
      setEditingQuestion(null);

      // Show success message
      const toast = document.createElement('div');
      toast.className = 'toast success';
      toast.textContent = 'Savol muvaffaqiyatli saqlandi. Davomini kiriting.';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (error) {
      console.error('Saqlashda xatolik:', error);
      alert('Saqlashda xatolik yuz berdi');
    }
  };

  const resetForm = () => {
    setTitle('');
    setType('test');
    setTargetType('all');
    setTargetGroup('');
    setStartDate('');
    setEndDate('');
    setDuration(30);
    setContent('');
    setOptions(['', '']);
    setCorrectAnswer(0);
    setTestCases([{ input: '', expectedOutput: '' }]);
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setTitle(question.title);
    setType(question.type);
    setTargetType(question.targetType);
    setTargetGroup(question.targetGroup || '');
    setStartDate(question.startDate);
    setEndDate(question.endDate);
    setDuration(question.duration);
    setContent(question.content || '');
    setOptions(question.options || ['', '']);
    setCorrectAnswer(question.correctAnswer || 0);
    setTestCases(question.testCases || [{ input: '', expectedOutput: '' }]);
    setShowForm(true);
  };

  const handleStart = async (id: string) => {
    try {
      // compute start and end time based on local duration (minutes)
      const q = questions.find(x => x.id === id);
      const now = new Date();
      const start_time = now.toISOString();
      let end_time: string | null = null;
      if (q && q.duration) {
        const end = new Date(now.getTime() + q.duration * 60 * 1000);
        end_time = end.toISOString();
      }

      await apiService.updateQuestionStatus(id, true, { start_time, end_time });
      const updated = questions.map(q => 
        q.id === id ? { ...q, isActive: true, startDate: start_time, endDate: end_time } : q
      );
      setQuestions(updated);
    } catch (error) {
      console.error('Savolni faollashtirshda xatolik:', error);
      const body = (error as any)?.body || (error as any)?.message || String(error);
      alert(`Savolni faollashtirshda xatolik: ${body}`);
    }
  };

  const handleStop = async (id: string) => {
    try {
      const now = new Date().toISOString();
      await apiService.updateQuestionStatus(id, false, { end_time: now });
      const updated = questions.map(q => 
        q.id === id ? { ...q, isActive: false, endDate: now } : q
      );
      setQuestions(updated);
    } catch (error) {
      console.error("Savolni to'xtatishda xatolik:", error);
      const body = (error as any)?.body || (error as any)?.message || String(error);
      alert(`Savolni to'xtatishda xatolik: ${body}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu savolni o\'chirishni istaysizmi?')) {
      return;
    }
    
    try {
      await apiService.deleteQuestion(id);
      const updated = questions.filter(q => q.id !== id);
      setQuestions(updated);
    } catch (error) {
      console.error('Savolni o\'chirishda xatolik:', error);
      alert('Savolni o\'chirishda xatolik yuz berdi');
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
      if (correctAnswer === index) {
        setCorrectAnswer(0);
      } else if (correctAnswer > index) {
        setCorrectAnswer(correctAnswer - 1);
      }
    }
  };

  const addTestCase = () => {
    setTestCases([...testCases, { input: '', expectedOutput: '' }]);
  };

  const removeTestCase = (index: number) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter((_, i) => i !== index));
    }
  };

  const handleTestCaseChange = (index: number, field: keyof TestCase, value: string) => {
    const newTestCases = [...testCases];
    newTestCases[index][field] = value;
    setTestCases(newTestCases);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'test': return 'fas fa-list-ul';
      case 'code': return 'fas fa-code';
      case 'text': return 'fas fa-file-alt';
      default: return 'fas fa-question';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'test': return 'Test';
      case 'code': return 'Kod';
      case 'text': return 'Matn';
      default: return 'Noma\'lum';
    }
  };

  return (
    <div className="question-manager">
      {/* Font Awesome CDN */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      
      <div className="section-header">
        <h2>
          <i className="fas fa-question-circle"></i>
          Savollar
        </h2>
        <button 
          className="add-btn" 
          onClick={() => {
            // opening the form from top-level cancels any continuation mode
            resetForm();
            setContinuationMode(false);
            setShowForm(!showForm);
            setEditingQuestion(null);
          }}
        >
          <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`}></i>
          {showForm ? 'Bekor qilish' : 'Savol qo\'shish'}
        </button>
      </div>

      {showForm && (
        <form className="question-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              <i className="fas fa-heading"></i>
              Savol sarlavhasi
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Savol sarlavhasini kiriting"
              required
            />
          </div>

          <div className="form-group">
            <label>
              <i className="fas fa-tag"></i>
              Savol turi
            </label>
            <select value={type} onChange={(e) => setType(e.target.value as any)} required>
              <option value="test">Test</option>
              <option value="code">Kod</option>
              <option value="text">Matn</option>
            </select>
          </div>

          {type === 'test' && (
            <>
              <div className="form-group">
                <label>
                  <i className="fas fa-file-text"></i>
                  Savol matni
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Savol matnini kiriting"
                  rows={3}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>
                  <i className="fas fa-list-ol"></i>
                  Javob variantlari
                </label>
                {options.map((option, index) => (
                  <div key={index} className="option-input">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Variant ${index + 1}`}
                      required
                    />
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={correctAnswer === index}
                      onChange={() => setCorrectAnswer(index)}
                    />
                    <label>
                      <i className="fas fa-check"></i>
                      To'g'ri
                    </label>
                    {options.length > 2 && (
                      <button
                        type="button"
                        className="variant-btn remove"
                        onClick={() => removeOption(index)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>
                ))}
                <div className="variant-controls">
                  <button type="button" className="variant-btn" onClick={addOption}>
                    <i className="fas fa-plus"></i>
                    Variant qo'shish
                  </button>
                </div>
              </div>
            </>
          )}

          {type === 'code' && (
            <>
              <div className="form-group">
                <label>
                  <i className="fas fa-tasks"></i>
                  Topshiriq matni
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Kod topshirig'i matnini kiriting"
                  rows={5}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>
                  <i className="fas fa-vial"></i>
                  Test case'lar
                </label>
                {testCases.map((testCase, index) => (
                  <div key={index} className="test-case">
                    <div className="test-case-header">
                      <h4>Test case {index + 1}</h4>
                      {testCases.length > 1 && (
                        <button
                          type="button"
                          className="remove-test-case"
                          onClick={() => removeTestCase(index)}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      )}
                    </div>
                    <div className="test-case-inputs">
                      <div className="form-group">
                        <label>Input</label>
                        <input
                          type="text"
                          value={testCase.input}
                          onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                          placeholder="Input qiymati"
                        />
                      </div>
                      <div className="form-group">
                        <label>Expected Output</label>
                        <input
                          type="text"
                          value={testCase.expectedOutput}
                          onChange={(e) => handleTestCaseChange(index, 'expectedOutput', e.target.value)}
                          placeholder="Kutilgan natija"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" className="add-test-case" onClick={addTestCase}>
                  <i className="fas fa-plus"></i>
                  Test case qo'shish
                </button>
              </div>
            </>
          )}

          {type === 'text' && (
            <div className="form-group">
              <label>
                <i className="fas fa-file-alt"></i>
                Savol matni
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Savol yoki topshiriq matnini kiriting"
                rows={5}
                required
              />
            </div>
          )}

          {/* When in continuationMode we hide global settings (target/date/duration)
              so teacher only fills question-specific fields and cannot accidentally
              change timing or target for the continued questions. */}
          {!continuationMode && (
            <>
              <div className="form-group">
                <label>
                  <i className="fas fa-users"></i>
                  Tanlov shakli
                </label>
                <select value={targetType} onChange={(e) => setTargetType(e.target.value as any)} required>
                  <option value="all">Umumiy</option>
                  <option value="group">Ma'lum bir guruh</option>
                </select>
              </div>

              {targetType === 'group' && (
                <div className="form-group">
                  <label>
                    <i className="fas fa-user-friends"></i>
                    Guruh nomi
                  </label>
                  <input
                    type="text"
                    value={targetGroup}
                    onChange={(e) => setTargetGroup(e.target.value)}
                    placeholder="Guruh nomini kiriting"
                    required
                  />
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>
                    <i className="fas fa-play-circle"></i>
                    Boshlanish sanasi
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    <i className="fas fa-stop-circle"></i>
                    Tugash sanasi
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  <i className="fas fa-clock"></i>
                  Beriladigan vaqt (daqiqalarda)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min="1"
                  placeholder="Daqiqalarda"
                  required
                />
              </div>
            </>
          )}

          <button type="submit" className="submit-btn">
            <i className="fas fa-save"></i>
            {editingQuestion ? 'Savolni yangilash' : 'Savolni saqlash'}
          </button>
          <button type="button" className="submit-btn" style={{ marginLeft: 12 }} onClick={handleSaveAndAdd}>
            <i className="fas fa-plus"></i>
            Yana qo'shish
          </button>
        </form>
      )}

      <div className="questions-list">
        {questions.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-question-circle"></i>
            <p>Hozircha savollar yo'q</p>
          </div>
        ) : (
          questions.map((question) => (
            <div key={question.id} className="question-card">
              <div className="question-header">
                <div>
                  <h3>{question.title}</h3>
                  <div className="question-meta">
                    <span className="badge">
                      <i className={getTypeIcon(question.type)}></i>
                      {getTypeLabel(question.type)}
                    </span>
                    <span className="badge">
                      <i className="fas fa-users"></i>
                      {question.targetType === 'all' ? 'Umumiy' : question.targetGroup}
                    </span>
                    <span className="badge">
                      <i className="fas fa-clock"></i>
                      {question.duration} daqiqa
                    </span>
                  </div>
                </div>
                <div className="question-actions">
                  {question.isActive ? (
                    <button className="stop-btn" onClick={() => handleStop(question.id)}>
                      <i className="fas fa-pause"></i>
                      To'xtatish
                    </button>
                  ) : (
                    <button className="start-btn" onClick={() => handleStart(question.id)}>
                      <i className="fas fa-play"></i>
                      Boshlash
                    </button>
                  )}
                  <button className="edit-btn" onClick={() => handleEdit(question)}>
                    <i className="fas fa-edit"></i>
                  </button>
                  <button className="delete-btn" onClick={() => handleDelete(question.id)}>
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>

              {question.content && (
                <div className="question-content">
                  <h4>
                    <i className="fas fa-file-text"></i>
                    Savol matni
                  </h4>
                  <p>{question.content}</p>
                </div>
              )}

              {question.type === 'test' && question.options && (
                <div className="question-content">
                  <h4>
                    <i className="fas fa-list-ol"></i>
                    Javob variantlari
                  </h4>
                  <div className="question-options">
                    {question.options.map((option, index) => (
                      <div key={index} className={`question-option ${index === question.correctAnswer ? 'correct' : ''}`}>
                        <input
                          type="radio"
                          checked={index === question.correctAnswer}
                          readOnly
                        />
                        <span>{option}</span>
                        {index === question.correctAnswer && (
                          <i className="fas fa-check" style={{ color: '#059669', marginLeft: 'auto' }}></i>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="question-dates">
                <span>
                  <i className="fas fa-play-circle"></i>
                  Boshlanish: {new Date(question.startDate).toLocaleString('uz-UZ')}
                </span>
                <span>
                  <i className="fas fa-stop-circle"></i>
                  Tugash: {new Date(question.endDate).toLocaleString('uz-UZ')}
                </span>
              </div>
              
              {question.isActive && (
                <div className="active-indicator">
                  <i className="fas fa-circle"></i>
                  Faol
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default QuestionManager;
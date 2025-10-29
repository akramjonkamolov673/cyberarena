export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Response interfaces
interface LoginResponse {
  detail?: string;
  token?: string;
  refresh_token?: string;
  user?: {
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

interface RegisterData {
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  password: string;
  password2: string;
  profile?: {
    group?: number | null;
  };
}

interface LoginData {
  username: string;
  password: string;
}

interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile: {
    avatar?: string;
    group?: number | null;
    rank: number;
    role: 'student' | 'teacher';
    bio?: string;
    joined_at: string;
  };
}

interface Group {
  id: number;
  name: string;
  description?: string | null;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private getCookie(name: string) {
    const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return v ? v.pop() : '';
  }

  // Unified request with credentials + CSRF + auto refresh on 401
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const method = (options.method || 'GET').toUpperCase();

    const headers: Record<string, string> = {};
    if (options.headers) Object.assign(headers, options.headers as Record<string, string>);

    // JSON content-type default when body is string
    if (typeof options.body === 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    // Add JWT token if available
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Attach CSRF for unsafe methods
    if (['POST','PUT','PATCH','DELETE'].includes(method)) {
      const csrf = this.getCookie('csrftoken');
      if (csrf) headers['X-CSRFToken'] = csrf;
    }

    const doFetch = async () => fetch(url, { ...options, headers, credentials: 'include' });

    let response = await doFetch();
    if (response.status === 401) {
      // try silent refresh using cookies
      const refreshResp = await fetch(`${this.baseUrl}/api/users/refresh/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRFToken': this.getCookie('csrftoken') || '' },
      });
      if (refreshResp.ok) {
        response = await doFetch();
      } else {
        // redirect to login on failed refresh
        throw new Error('Sessiya tugadi. Qayta kiring.');
      }
    }

    if (!response.ok) {
      // Try to parse JSON error body, fallback to text
      const text = await response.text().catch(() => '');
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = text ? JSON.parse(text) : {};
        // Prefer common DRF keys
        errorMessage = errorData.detail || errorData.error || JSON.stringify(errorData) || errorMessage;
      } catch {
        if (text) errorMessage = text;
      }
      const err = new Error(errorMessage || 'Xatolik yuz berdi');
      // attach extra info for callers to debug
      (err as any).status = response.status;
      (err as any).body = text;
      throw err;
    }

    // no content
    if (response.status === 204) return {} as T;
    return await response.json();
  }

  // Ro'yxatdan o'tish
  async register(data: RegisterData): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/users/register/', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
    return response;
  }

  // Multipart ro'yxatdan o'tish (avatar bilan)
  async registerForm(payload: {
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    password: string;
    password2?: string;
    group?: number | null;
    avatarFile?: File | null;
  }): Promise<LoginResponse> {
    const form = new FormData();
    form.append('username', payload.username);
    form.append('email', payload.email);
    if (payload.first_name) form.append('first_name', payload.first_name);
    if (payload.last_name) form.append('last_name', payload.last_name);
    form.append('password', payload.password);
    if (payload.password2) form.append('password2', payload.password2);
    const profile: any = {};
    if (payload.group !== undefined) profile.group = payload.group;
    form.append('profile', JSON.stringify(profile));
    if (payload.avatarFile) form.append('avatar', payload.avatarFile);

    const response = await this.request<LoginResponse>('/api/users/register/', {
      method: 'POST',
      body: form,
      // no content-type header; browser sets multipart boundary
    });
    return response;
  }

  // Login
  async login(data: LoginData): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/users/login/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (response.token) {
      localStorage.setItem('token', response.token);
      if (response.refresh_token) {
        localStorage.setItem('refresh_token', response.refresh_token);
      }
    }
    
    return response;
  }

  // Token yangilash
  async refreshToken(): Promise<boolean> {
    const resp = await fetch(`${this.baseUrl}/api/users/refresh/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRFToken': this.getCookie('csrftoken') || '' },
    });
    return resp.ok;
  }

  // Foydalanuvchi profilini olish
  async getUserProfile(): Promise<UserProfile> {
    return this.request<UserProfile>('/api/users/profile/');
  }

  // Foydalanuvchi profilini yangilash
  async updateUserProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    return this.request<UserProfile>('/api/users/profile/update/', {
      method: 'PUT',
      body: JSON.stringify(profileData),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Multipart profil yangilash (avatar bilan)
  async updateUserProfileForm(payload: {
    email?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    role?: 'student' | 'teacher';
    group?: number | null;
    avatarFile?: File | null;
    bio?: string;
    rank?: number;
  }): Promise<UserProfile> {
    const form = new FormData();
    if (payload.email) form.append('email', payload.email);
    if (payload.username) form.append('username', payload.username);
    if (payload.first_name) form.append('first_name', payload.first_name);
    if (payload.last_name) form.append('last_name', payload.last_name);
    const profile: any = {};
    if (payload.role) profile.role = payload.role;
    if (payload.group !== undefined) profile.group = payload.group;
    if (payload.bio !== undefined) profile.bio = payload.bio;
    if (payload.rank !== undefined) profile.rank = payload.rank;
    form.append('profile', JSON.stringify(profile));
    if (payload.avatarFile) form.append('avatar', payload.avatarFile);

    return this.request<UserProfile>('/api/users/profile/update/', {
      method: 'PUT',
      body: form,
    });
  }

  // Google OAuth
  async googleAuth(token: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/users/auth/google/', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    return response;
  }

  // GitHub OAuth
  async githubAuth(code: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/users/auth/github/', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    return response;
  }

  // Logout
  logout() {
    // Inform server to clear cookies
    return this.request<{}>('/api/users/logout/', { method: 'POST' });
  }

  // Guruhlar ro'yxati
  async getGroups(): Promise<Group[]> {
    return this.request<Group[]>('/api/users/groups/');
  }

  // Savollar ro'yxati
  async getQuestions(): Promise<any[]> {
    // Fetch both coding challenges and test sets and merge into a single list
    try {
      const [challenges, tests] = await Promise.all([
        this.request<any[]>('/api/challenges/').catch(() => []),
        this.request<any[]>('/api/tests/').catch(() => []),
      ]);

      // Normalize coding challenges
      const normalizedChallenges = (challenges || []).map(c => ({
        id: c.id,
        title: c.title,
        type: 'code',
        content: c.description,
        languages: c.languages,
        testCases: c.test_cases || c.testCases || [],
        startDate: c.start_time,
        endDate: c.end_time,
        duration: c.time_limit ? Math.round(Number(c.time_limit) / 60) : null,
        isActive: c.is_active ?? false,
        raw: c,
      }));

      // Normalize tests
      const normalizedTests = (tests || []).map(t => ({
        id: t.id,
        title: t.title,
        type: 'test',
        content: t.description || '',
        options: (t.tests && t.tests.length > 0 && t.tests[0].options) ? t.tests[0].options : [],
        correctAnswer: (t.tests && t.tests.length > 0 && typeof t.tests[0].correct !== 'undefined') ? t.tests[0].correct : 0,
        startDate: t.start_time,
        endDate: t.end_time,
        duration: null,
        isActive: t.is_private === false ? true : false,
        raw: t,
      }));

      return [...normalizedChallenges, ...normalizedTests];
    } catch (err) {
      console.error('Error fetching questions:', err);
      return [];
    }
  }

  // Yangi savol yaratish yoki mavjud savollarga qo'shish
  async createQuestion(data: {
    title: string;
    type: 'test' | 'text' | 'code';
    targetType: 'all' | 'group';
    targetGroup?: string;
    startDate: string;
    endDate: string;
    duration: number;
    content?: string;
    options?: string[];
    correctAnswer?: number;
    testCases?: Array<{ input: string; expectedOutput: string }>;
  }): Promise<any> {
    // Build backend-compatible payloads depending on question type
    try {
      if (data.type === 'test') {
        // Map to TestSet model: tests is an array of question objects
        const tests = (data.options || []).map((opt, idx) => ({
          prompt: data.content || '',
          options: data.options || [],
          correct: data.correctAnswer ?? 0,
        }));

        const payload = {
          title: data.title,
          description: data.content || '',
          tests,
          // dates expected as start_time / end_time
          start_time: data.startDate || null,
          end_time: data.endDate || null,
          is_private: data.targetType !== 'all',
        } as any;

        return this.request('/api/tests/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

  // For code or text challenges use CodingChallenge model
  const languages = (data as any).languages || (data.type === 'code' ? ['cpp'] : []);
      const test_cases = (data.testCases || []).map(tc => ({ input: tc.input, expected_output: tc.expectedOutput }));

      const timeLimitSeconds = Math.max(1, (data.duration || 0) * 60);
      const payload = {
        title: data.title,
        description: data.content || '',
        languages,
        test_cases,
        // convert duration (minutes) -> time_limit (seconds) for per-test time limit
        time_limit: timeLimitSeconds,
        difficulty: 'medium',
        max_score: 100,
        autocheck: data.type === 'code',
        memory_limit: 256,
        is_private: data.targetType !== 'all',
        start_time: data.startDate || null,
        end_time: data.endDate || null,
      } as any;

      // Attach parent/order info if we have an existing set (best-effort)
      try {
        const existingQuestions = await this.getQuestions();
        if (existingQuestions && existingQuestions.length > 0) {
          payload.parent_id = existingQuestions[0].id;
          payload.order = existingQuestions.length + 1;
        }
      } catch {
        // ignore fallback
      }

      return this.request('/api/challenges/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Error creating question:', error);
      throw error;
    }
  }

  // Mavjud savolni yangilash
  async updateQuestion(id: string, data: any): Promise<any> {
    // Map incoming frontend shape to backend-compatible fields
    try {
      if (data.type === 'test') {
        const tests = (data.options || []).map((opt: any, idx: number) => ({
          prompt: data.content || '',
          options: data.options || [],
          correct: data.correctAnswer ?? 0,
        }));

        const payload = {
          title: data.title,
          description: data.content || '',
          tests,
          start_time: data.startDate || null,
          end_time: data.endDate || null,
          is_private: data.targetType !== 'all',
        } as any;

        return this.request(`/api/tests/${id}/`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }

      const test_cases = (data.testCases || []).map((tc: any) => ({ input: tc.input, expected_output: tc.expectedOutput }));
      const timeLimitSeconds = Math.max(1, (data.duration || 0) * 60);
      const payload = {
        title: data.title,
        description: data.content || '',
        languages: data.languages || (data.type === 'code' ? ['cpp'] : []),
        test_cases,
        time_limit: timeLimitSeconds,
        difficulty: data.difficulty || 'medium',
        max_score: data.max_score || 100,
        autocheck: typeof data.autocheck !== 'undefined' ? data.autocheck : (data.type === 'code'),
        memory_limit: data.memory_limit || 256,
        is_private: data.targetType !== 'all',
        start_time: data.startDate || null,
        end_time: data.endDate || null,
      } as any;

      return this.request(`/api/challenges/${id}/`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('Error updating question:', err);
      throw err;
    }
  }

  // Savolning status (active/inactive) ni yangilash
  // Accepts optional `data` with fields to PATCH (e.g., start_time, end_time)
  async updateQuestionStatus(id: string, isActive: boolean, data?: any): Promise<any> {
    const payload = { ...(data || {}) };
    // Try updating challenge first, fall back to test endpoint if 404
    try {
      return await this.request(`/api/challenges/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // if not found, try tests endpoint
      const status = (err as any)?.status;
      if (status === 404) {
        return this.request(`/api/tests/${id}/`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }
      throw err;
    }
  }

  // Savolni o'chirish
  async deleteQuestion(id: string): Promise<void> {
    try {
      return await this.request(`/api/challenges/${id}/`, {
        method: 'DELETE'
      });
    } catch (err) {
      if ((err as any)?.status === 404) {
        return this.request(`/api/tests/${id}/`, { method: 'DELETE' });
      }
      throw err;
    }
  }

  // Javobni yuborish
  async submitAnswer(data: {
    questionId: string;
    answer: string | number;
    submittedAt: string;
    timeSpent?: number | null;
    type: 'test' | 'text' | 'code';
    // Test uchun qo'shimcha ma'lumotlar
    selectedOption?: number;
    options?: string[];
    // Kod uchun qo'shimcha ma'lumotlar
    language?: string;
    executionTime?: number;
    memoryUsed?: number;
    testResults?: Array<{
      input: string;
      expectedOutput: string;
      actualOutput: string;
      passed: boolean;
      executionTime?: number;
      memoryUsed?: number;
      error?: string;
    }>;
  }): Promise<{
    id: number;
    score: number;
    status: 'pending' | 'checking' | 'accepted' | 'rejected';
    feedback?: string;
    submitted_at: string;
    execution_time?: number;
    memory_used?: number;
    test_results?: Array<{
      passed: boolean;
      error?: string;
      execution_time?: number;
      memory_used?: number;
    }>;
  }> {
    // Route submission based on type to backend endpoints and map required fields
    if (data.type === 'code') {
      // Code submissions expect 'challenge' FK and 'code' JSON + test_results
      const payload: any = {
        challenge: data.questionId,
        code: {
          source: data.answer,
          language: data.language || 'cpp',
        },
        test_results: data.testResults || [],
        submitted_at: data.submittedAt,
        time_spent: data.timeSpent ?? null,
      };

      return this.request('/api/submissions/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    if (data.type === 'test') {
      // Test submissions use TestSubmission model: expects 'test' FK and 'answers' list
      // Map single-question answers into answers array
      const answers = [] as any[];
      if (typeof data.selectedOption !== 'undefined') {
        answers.push({ question_index: 0, selected: data.selectedOption });
      }

      const payload: any = {
        test: data.questionId,
        answers,
        submitted_at: data.submittedAt,
      };

      return this.request('/api/test-submissions/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    // Fallback for text or unknown types: try to post as a CodeSubmission with minimal shape
    const fallback: any = {
      challenge: data.questionId,
      code: { source: String(data.answer), language: data.language || 'text' },
      test_results: [],
      submitted_at: data.submittedAt,
    };
    return this.request('/api/submissions/', {
      method: 'POST',
      body: JSON.stringify(fallback),
    });
  }
  
  // Berilgan javoblarni olish
  async getSubmissions(): Promise<any[]> {
    return this.request('/api/submissions/');
  }

  // Ma'lum bir savolga berilgan javoblarni olish
  async getQuestionSubmissions(questionId: string): Promise<any[]> {
    return this.request(`/api/submissions/?question=${questionId}`);
  }

  // Ma'lum bir studentning javoblarini olish
  async getStudentSubmissions(studentId: string): Promise<any[]> {
    return this.request(`/api/submissions/?student=${studentId}`);
  }

  // Javobni baholash
  async evaluateSubmission(submissionId: string, data: {
    score: number;
    feedback?: string;
    status: 'accepted' | 'rejected' | 'partially_accepted';
    checkedTestCases?: Array<{
      index: number;
      passed: boolean;
      feedback?: string;
    }>;
  }): Promise<any> {
    return this.request(`/api/submissions/${submissionId}/evaluate/`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Javobni baholash
  async evaluateSubmission(submissionId: number, score: number): Promise<any> {
    return this.request(`/api/submissions/${submissionId}/evaluate/`, {
      method: 'POST',
      body: JSON.stringify({ score })
    });
  }

  // Ensure CSRF cookie exists (call once on app init)
  async ensureCsrf(): Promise<void> {
    await fetch(`${this.baseUrl}/api/users/csrf/`, {
      method: 'GET',
      credentials: 'include',
    });
  }
}

export const apiService = new ApiService();
export default apiService;

// ---- Extra helpers used by TeacherPanel ----
// NOTE: Backend endpoints for these may not exist yet; we provide safe fallbacks
// to avoid runtime errors and keep the UI functional.

// Extend the ApiService prototype with teacher-specific helpers
declare module './api' {}

// Current user mapped to TeacherPanel's expected shape
(apiService as any).getCurrentUser = async function (): Promise<any> {
  const p = await apiService.getUserProfile();
  const avatarPath = p.profile?.avatar || '';
  const profileImage = avatarPath ? (avatarPath.startsWith('http') ? avatarPath : `${API_BASE_URL}${avatarPath}`) : '';
  return {
    id: p.id,
    profileImage,
    firstName: p.first_name || '',
    lastName: p.last_name || '',
    nickname: p.username || '',
    subject: '',
    role: p.profile?.role || 'student',
    email: p.email || '',
  };
};

// Teacher statistics (fallback to zeros)
(apiService as any).getTeacherStatistics = async function (): Promise<any> {
  try {
    // If needed, we could fetch and aggregate from /api/tests/ and /api/test-submissions/
    // For now, return safe defaults to avoid runtime errors.
    return {
      totalQuestions: 0,
      totalStudents: 0,
      submittedTests: 0,
      averageScore: 0,
    };
  } catch {
    return { totalQuestions: 0, totalStudents: 0, submittedTests: 0, averageScore: 0 };
  }
};

// Student answers list (fallback empty)
(apiService as any).getStudentAnswers = async function (): Promise<any[]> {
  return [];
};

// Results list (fallback empty)
(apiService as any).getResults = async function (): Promise<any[]> {
  return [];
};

// Announcements stored locally as a fallback (until backend endpoints exist)
type Announcement = { id: number; title: string; content: string; createdAt: string };

function readAnnouncements(): Announcement[] {
  try {
    const raw = localStorage.getItem('announcements');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAnnouncements(list: Announcement[]) {
  try { localStorage.setItem('announcements', JSON.stringify(list)); } catch {}
}

(apiService as any).getAnnouncements = async function (): Promise<Announcement[]> {
  return readAnnouncements();
};

(apiService as any).createAnnouncement = async function (payload: { title: string; content: string }): Promise<Announcement> {
  const list = readAnnouncements();
  const item: Announcement = {
    id: Date.now(),
    title: payload.title,
    content: payload.content,
    createdAt: new Date().toISOString(),
  };
  const updated = [item, ...list];
  writeAnnouncements(updated);
  return item;
};

(apiService as any).deleteAnnouncement = async function (id: number): Promise<void> {
  const list = readAnnouncements();
  const updated = list.filter(a => a.id !== id);
  writeAnnouncements(updated);
};

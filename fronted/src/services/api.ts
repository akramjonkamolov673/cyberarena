export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
import type { Block } from "../types/block";

declare global {
  interface Window {
    google: any;
  }
}

// ===== TYPES =====

export interface LoginResponse {
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

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  password2: string;
  first_name?: string;
  last_name?: string;
  profile?: {
    group?: number | null;
  };
}

export interface LoginData {
  username: string;
  password: string;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile: {
    avatar?: string;
    group?: number | null;
    rank: number;
    role: "student" | "teacher";
    bio?: string;
    joined_at: string;
  };
}

export interface Option {
  id: number;
  text: string;
}

export interface QuestionOption {
  id: number;
  text: string;
  is_correct: boolean;
}

export interface Question {
  id?: number;
  text: string;
  options: QuestionOption[];
  correct_answer: number | null;
  test_set?: number;
}

export interface TestSet {
  id: number;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  is_private: boolean;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  created_by: number;
  updated_at?: string;
  questions?: Question[];
  tests?: Array<{
    id?: number;
    text: string;
    options: Array<{
      id: number;
      text: string;
      is_correct: boolean;
    }>;
    correct_answer: number | null;
  }>;
  allowed_groups: any[]; 
  assigned_users: any[];  
}

export interface Group {
  id: number;
  name: string;
  description?: string | null;
}

export interface EvaluationResult {
  status: "accepted" | "rejected" | "checking";
  score?: number;
  feedback?: string;
}

export interface TestSubmissionAnswer {
  question: number;
  selected: number | null;
  question_index: number;
}

export interface TestSubmission {
  id?: number;
  test_set: number;
  answers: TestSubmissionAnswer[];
  score?: number;
  submitted_at?: string;
}

// Minimal Challenge type (import one from types if you have it)
export interface Challenge {
  id: number;
  title: string;
  slug?: string;
  difficulty?: string;
  [k: string]: any;
}

// Extend Block to include optional challenges_count when needed
export interface BlockWithCount extends Block {
  challenges_count?: number;
}

// ==========================================================
//                       CLEAN API SERVICE
// ==========================================================

class ApiService {
  private baseUrl = API_BASE_URL;
  private authToken: string | null = null;

  setAuthToken(token: string | null) {
    this.authToken = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  private getCookie(name: string): string | null {
    const match = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
    return match ? match.pop() || null : null;
  }

  private async refreshToken(): Promise<boolean> {
    // Attempt to refresh via endpoint and store new access token if provided
    try {
      const resp = await fetch(`${this.baseUrl}/api/users/refresh/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": this.getCookie("csrftoken") || ""
        },
      });

      if (!resp.ok) return false;
      const data = await resp.json().catch(() => ({}));
      const newToken = data.access || data.token || data.detail && null;

      if (newToken) {
        this.setAuthToken(newToken);
        return true;
      }

      return false;
    } catch (e) {
      console.error("refreshToken error:", e);
      return false;
    }
  }

  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const method = (options.method || 'GET').toUpperCase();

    // Get token from localStorage if not set
    if (!this.authToken) {
      this.authToken = localStorage.getItem('token');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrf = this.getCookie('csrftoken');
      if (csrf) headers['X-CSRFToken'] = csrf;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      // If unauthorized, try refresh flow once
      if (response.status === 401) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Update token and retry the request
          this.authToken = localStorage.getItem('token');
          if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
            const retryResponse = await fetch(url, {
              ...options,
              headers,
              credentials: 'include',
            });
            return this.handleResponse<T>(retryResponse);
          }
        }
        // If we get here, refresh failed
        console.error('Failed to refresh token');
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error('Sessiya tugadi. Qayta kiring.');
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      let msg = `HTTP ${response.status}`;

      try {
        const err = text ? JSON.parse(text) : {};
        msg = err.detail || err.message || err.error || JSON.stringify(err) || msg;
      } catch {
        msg = text || msg;
      }

      throw new Error(msg);
    }

    if (response.status === 204) return {} as T;
    const text = await response.text().catch(() => '');
    return text ? JSON.parse(text) as T : ({} as T);
  }

  // Generic HTTP GET request
  async get<T = any>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request<T>(url, { method: 'GET' });
  }

  // Generic HTTP PATCH request
  async patch<T = any>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  // ===================== TEST SUBMISSIONS =====================

  async submitTestAnswers(testId: number, answers: TestSubmissionAnswer[]): Promise<TestSubmission> {
    // Ensure we have a token
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      throw new Error('Siz tizimga kirmagansiz. Iltimos, avval tizimga kiring.');
    }

    const requestBody = {
      test_set: testId,
      answers: answers.map(answer => ({
        question: answer.question,
        selected: answer.selected,
        question_index: answer.question_index
      }))
    };

    return this.request<TestSubmission>('/api/test-submissions/', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  }

  async getTestSubmissions(testId?: number): Promise<TestSubmission[]> {
    const url = testId 
      ? `/api/test-submissions/?test_set=${testId}`
      : '/api/test-submissions/';
    return this.request<TestSubmission[]>(url);
  }

  async getTestSubmission(submissionId: number): Promise<TestSubmission> {
    return this.request<TestSubmission>(`/api/test-submissions/${submissionId}/`);
  }

  // ===================== AUTHENTICATION =====================

  async login(data: LoginData): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/users/login/', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (response.token) {
      this.setAuthToken(response.token);
      localStorage.setItem('isLoggedIn', 'true');
    }

    return response;
  }

  async googleAuth(accessToken: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/users/auth/google/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': this.getCookie('csrftoken') || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          token: accessToken
        })
      });

      const data = await response.json();

      if (!response.ok) {
          throw new Error(data.error || 'Google authentication failed');
      }

      if (data.access) {
        this.setAuthToken(data.access);
        localStorage.setItem('isLoggedIn', 'true');
        return { ...data, token: data.access };
      }

      throw new Error('No access token in response');
    } catch (error) {
      throw error;
    }
  }

  async githubAuth(code: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/social-auth/github/', {
      method: 'POST',
      body: JSON.stringify({
        code,
        provider: 'github'
      })
    });

    if (response.token) {
      this.setAuthToken(response.token);
      localStorage.setItem('isLoggedIn', 'true');
    }

    return response;
  }

  register(data: RegisterData) {
    return this.request<LoginResponse>("/api/users/register/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ===================== PROFILE =====================

  getUserProfile() {
    return this.request<UserProfile>("/api/users/profile/");
  }

  updateUserProfile(data: Partial<UserProfile>) {
    return this.request("/api/users/profile/update/", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  getCurrentUser() {
    return this.request<UserProfile>("/api/users/me/");
  }

  logout() {
    return this.request("/api/users/logout/", { method: "POST" });
  }

  // ===================== GROUPS =====================

  getGroups() {
    return this.request<Group[]>("/api/users/groups/");
  }

  // ===================== TESTS / QUESTIONS =====================

  async getTestSets() {
    try {
      return await this.request<TestSet[]>("/api/tests/");
    } catch (error) {
      console.error('Error fetching test sets:', error);
      throw error;
    }
  }

  async getTestSet(id: number) {
    return this.request<TestSet>(`/api/tests/${id}/`);
  }

  async getTestSetDetails(id: number) {
    try {
      const response = await this.request<TestSet>(`/api/tests/${id}/`);

      if (response.tests && Array.isArray(response.tests)) {
        const questions = response.tests.map((test: any, index: number) => ({
          // preserve backend-provided id if present
          id: test.id ?? (index + 1),
          text: test.text,
          options: test.options || [],
          correct_answer: test.correct_answer ?? null
        }));

        return {
          ...response,
          questions: questions
        } as TestSet;
      }

      return response;
    } catch (error) {
      console.error(`Test ${id} tafsilotlarini yuklashda xatolik:`, error);
      throw error;
    }
  }

  createTestSet(data: Omit<TestSet, "id">) {
    return this.request<TestSet>("/api/tests/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateTestSet(id: number, data: Partial<TestSet>) {
    return this.request<TestSet>(`/api/tests/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  deleteTestSet(id: number) {
    return this.request(`/api/tests/${id}/`, { method: "DELETE" });
  }

  getTestSetQuestions(testSetId: number) {
    return this.request(`/api/tests/${testSetId}/`);
  }

  async createTestSetQuestion(testSetId: number, data: any) {
    const testSet = await this.getTestSet(testSetId);

    const newQuestion = {
      text: data.text,
      options: data.options.map((opt: any, index: number) => ({
        id: opt.id ?? index + 1,
        text: opt.text,
        is_correct: !!opt.is_correct
      })),
      correct_answer: data.correct_answer ?? null
    };

    const updatedTests = [...(testSet.tests || []), newQuestion];

    return this.updateTestSet(testSetId, {
      tests: updatedTests
    });
  }

  async updateQuestion(testSetId: number, questionIndex: number, data: any) {
    const testSet = await this.getTestSet(testSetId);
    const updatedTests = [...(testSet.tests || [])];

    updatedTests[questionIndex] = {
      ...updatedTests[questionIndex],
      text: data.text,
      options: data.options.map((opt: any, index: number) => ({
        id: opt.id ?? index + 1,
        text: opt.text,
        is_correct: !!opt.is_correct
      })),
      correct_answer: data.correct_answer ?? null
    };

    return this.updateTestSet(testSetId, {
      tests: updatedTests
    });
  }

  async deleteQuestion(testSetId: number, questionIndex: number) {
    const testSet = await this.getTestSet(testSetId);
    const updatedTests = [...(testSet.tests || [])];
    updatedTests.splice(questionIndex, 1);

    return this.updateTestSet(testSetId, {
      tests: updatedTests
    });
  }

  // ===================== SUBMISSIONS =====================

  submitAnswer(payload: any) {
    return this.request("/api/submissions/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  getSubmissions() {
    return this.request("/api/submissions/");
  }

  getQuestionSubmissions(id: string) {
    return this.request(`/api/submissions/?question=${id}`);
  }

  async evaluateSubmission(id: string | number, data: any) {
    return this.request(`/api/submissions/${id}/evaluate/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Challenge Groups
  async getChallengeGroup(id: number) {
    return this.request<Block>(`/api/challenge-groups/${id}/`);
  }

  async getChallengeGroups(): Promise<BlockWithCount[]> {
    const groups = await this.request<Block[]>('/api/challenge-groups/');
    return groups.map(group => ({
      ...group,
      challenges_count: (group as any).challenges_count ?? ((group as any).challenges ? (group as any).challenges.length : 0)
    }));
  }

  async getChallenges() {
    return this.request<Challenge[]>('/api/challenges/');
  }

  async createChallengeGroup(data: Omit<Block, 'id'>) {
    return this.request<Block>('/api/challenge-groups/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateChallengeGroup(id: number, data: Partial<Block>) {
    return this.request<Block>(`/api/challenge-groups/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteChallengeGroup(id: number) {
    return this.request(`/api/challenge-groups/${id}/`, {
      method: 'DELETE',
    });
  }

  async updateBlockChallenges(blockId: number, challengeIds: number[]) {
    const validChallengeIds = challengeIds.filter(id =>
      id !== null && id !== undefined && !isNaN(Number(id))
    );

    try {
      const requestData = {
        challenges: validChallengeIds
      };

      const result = await this.request(`/api/challenge-groups/${blockId}/`, {
        method: 'PATCH',
        body: JSON.stringify(requestData),
      });

      return result;
    } catch (error) {
      console.error('Update failed with error:', error);
      throw error;
    }
  }

  // ===================== STATS / ANNOUNCEMENTS =====================

  getTeacherStatistics() {
    return this.request("/api/teacher/statistics/");
  }

  getAnnouncements() {
    return this.request("/api/announcements/");
  }

  createAnnouncement(data: { title: string; content: string }) {
    return this.request("/api/announcements/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  deleteAnnouncement(id: number) {
    return this.request(`/api/announcements/${id}/`, {
      method: "DELETE",
    });
  }

  // ===================== RESULTS =====================

  getResults() {
    return this.request("/api/results/");
  }
}

export const apiService = new ApiService();
export default apiService;

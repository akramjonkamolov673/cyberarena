export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
import type { Block, Challenge } from "../types/block";

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
  id?: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
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
  difficulty?: 'easy' | 'medium' | 'hard';
  is_private?: boolean;
  start_time?: string;
  end_time?: string;
  created_at?: string;
  updated_at?: string;
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

// ==========================================================
//                       CLEAN API SERVICE
// ==========================================================

class ApiService {
  private baseUrl = API_BASE_URL;

  private getCookie(name: string) {
    const v = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
    return v ? v.pop() : "";
  }

  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const method = (options.method || "GET").toUpperCase();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (typeof options.body === "string" && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const token = localStorage.getItem("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;

    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const csrf = this.getCookie("csrftoken");
      if (csrf) headers["X-CSRFToken"] = csrf;
    }

    const doFetch = async () => {
      return await fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });
    };

    let response = await doFetch();

    if (response.status === 401) {
      const refreshResponse = await fetch(`${this.baseUrl}/api/users/refresh/`, {
        method: "POST",
        credentials: "include",
        headers: { 
          "Content-Type": "application/json",
          "X-CSRFToken": this.getCookie("csrftoken") || "" 
        },
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        if (refreshData.access) {
          localStorage.setItem('token', refreshData.access);
          headers["Authorization"] = `Bearer ${refreshData.access}`;
          response = await fetch(url, {
            ...options,
            headers,
            credentials: "include",
          });
        } else {
          throw new Error("Yangi token olinmadi");
        }
      } else {
        console.error('Failed to refresh token');
        // Token yangilanmadi, foydalanuvchini chiqarib yuboramiz
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error("Sessiya tugadi. Qayta kiring.");
      }
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      let msg = `HTTP ${response.status}`;

      try {
        const err = text ? JSON.parse(text) : {};
        msg = err.detail || err.error || JSON.stringify(err) || msg;
      } catch {
        msg = text || msg;
      }

      throw new Error(msg);
    }

    if (response.status === 204) return {} as T;
    return response.json();
  }

  // ===================== AUTH =====================

  register(data: RegisterData) {
    return this.request<LoginResponse>("/api/users/register/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  login(data: LoginData) {
    return this.request<LoginResponse>("/api/users/login/", {
      method: "POST",
      body: JSON.stringify(data),
    }).then((resp) => {
      if (resp.token) localStorage.setItem("token", resp.token);
      if (resp.refresh_token) localStorage.setItem("refresh_token", resp.refresh_token);
      return resp;
    });
  }

  refreshToken() {
    return fetch(`${this.baseUrl}/api/users/refresh/`, {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRFToken": this.getCookie("csrftoken") || "" },
    }).then((r) => r.ok);
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

  getTestSets() {
    return this.request<TestSet[]>("/api/tests/");
  }

  getTestSet(id: number) {
    return this.request<TestSet>(`/api/tests/${id}/`);
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
    return this.request(`/api/tests/${testSetId}/questions/`);
  }

  createTestSetQuestion(testSetId: number, data: any) {
    return this.request(`/api/tests/${testSetId}/questions/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateQuestion(questionId: number, data: any) {
    return this.request(`/api/questions/${questionId}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  deleteQuestion(questionId: number) {
    return this.request(`/api/questions/${questionId}/`, {
      method: "DELETE",
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

  async getChallengeGroups() {
    const groups = await this.request<Block[]>('/api/challenge-groups/');
    // Add challenges_count to each group if not present
    return groups.map(group => ({
      ...group,
      challenges_count: group.challenges_count || (group.challenges ? group.challenges.length : 0)
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
    // Faqat to'g'ri raqamli ID larni qoldirib, null/undefined/not a number larni olib tashlaymiz
    const validChallengeIds = challengeIds.filter(id => 
      id !== null && id !== undefined && !isNaN(Number(id))
    );
    
    try {
      const requestData = { 
        challenges: validChallengeIds
      };
      
      const result = await this.request(`/api/challenge-groups/${blockId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
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

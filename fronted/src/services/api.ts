export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface LoginResponse {
  detail?: string;
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.error || 'Xatolik yuz berdi');
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
  }): Promise<UserProfile> {
    const form = new FormData();
    if (payload.email) form.append('email', payload.email);
    if (payload.username) form.append('username', payload.username);
    if (payload.first_name) form.append('first_name', payload.first_name);
    if (payload.last_name) form.append('last_name', payload.last_name);
    const profile: any = {};
    if (payload.role) profile.role = payload.role;
    if (payload.group !== undefined) profile.group = payload.group;
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

  // Savollar ro'yxati (frontend `QuestionManager` tomonidan yaratilgan savollarni oladi)
  async getQuestions(): Promise<any[]> {
    return this.request<any[]>('/api/challenges/');
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

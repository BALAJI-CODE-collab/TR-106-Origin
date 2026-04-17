import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api';

export interface EmotionResult {
  label: string;
  score: number;
}

export interface MemoryHit {
  text: string;
  relevance?: number;
}

export interface AnomalyAlert {
  is_anomaly: boolean;
  reasons: string[];
  z_scores: Record<string, number>;
  iforest_outlier: boolean;
  iforest_score: number;
}

export interface CaregiverDashboard {
  daily_nudges: string[];
  weekly_summary: {
    user_id: string;
    total_interactions: number;
    missed_reminders: number;
    silence_period_hours: number;
    frequent_emotions: Record<string, number>;
    top_concerns: string[];
  };
  flags: {
    user_id: string;
    missed_medications: number;
    unusual_silence_hours: number;
    alerts: string[];
  };
}

export interface AlzheimerRisk {
  ok: boolean;
  risk_score?: {
    risk_score: number;
    risk_level: 'low' | 'moderate' | 'high';
    confidence: number;
    features: Record<string, any>;
  };
  error?: string;
}

export interface DiseaseAssessment {
  requested: 'none' | 'alzheimer' | 'parkinson';
  alzheimer: AlzheimerRisk;
  parkinson: AlzheimerRisk;
}

export interface UserStats {
  user_id: string;
  total_interactions: number;
  total_logs: number;
  emotion_distribution: Record<string, number>;
  last_interaction: string | null;
}

export interface DecisionOutput {
  response: string;
  emotion: EmotionResult;
  memory_hits: MemoryHit[];
  anomaly_alert: AnomalyAlert;
  caregiver_dashboard: CaregiverDashboard;
  alzheimer_risk: AlzheimerRisk;
  disease_assessment: DiseaseAssessment;
}

export interface AlzheimerPrediction {
  user_id: string;
  source: 'provided_text' | 'recent_logs' | 'fallback' | string;
  sample_text: string;
  ok: boolean;
  risk_score?: {
    risk_score: number;
    risk_level: 'low' | 'moderate' | 'high';
    confidence: number;
    features: Record<string, any>;
  };
  error?: string | null;
}

export interface ParkinsonPrediction {
  user_id: string;
  source: 'provided_text' | 'recent_logs' | 'fallback' | string;
  sample_text: string;
  ok: boolean;
  risk_score?: {
    risk_score: number;
    risk_level: 'low' | 'moderate' | 'high';
    confidence: number;
    features: Record<string, any>;
  };
  error?: string | null;
}

export interface ResidentProfile {
  resident_id: string;
  name: string;
  age: number;
  room: string;
  voice_profile: string;
  allow_activities: boolean;
  guardian_username: string;
}

export interface GuardianLoginResponse {
  ok: boolean;
  resident_id?: string;
  resident_name?: string;
  guardian_email?: string;
}

export interface AdminMoodTimelinePoint {
  timestamp: string;
  emotion: string;
  happiness_score: number;
  is_happy: boolean;
}

export interface AdminResidentReport {
  resident_id: string;
  generated_at: string;
  total_interactions: number;
  average_happiness: number;
  threshold: number;
  status: 'below_threshold' | 'stable' | string;
  happy_times: string[];
  unhappy_times: string[];
  timeline: AdminMoodTimelinePoint[];
  low_happiness_mail_sent?: boolean;
  json_path?: string;
}

export interface DailyCareStatusPayload {
  resident_id: string;
  breakfast: 'taken' | 'missed' | 'unknown';
  lunch: 'taken' | 'missed' | 'unknown';
  dinner: 'taken' | 'missed' | 'unknown';
  tablets: 'taken' | 'missed' | 'unknown';
  water: 'taken' | 'missed' | 'unknown';
  notes?: string;
}

export interface GameAssessmentReport {
  resident_id: string;
  sent_at: string;
  game_name: string;
  reason: string;
  details: Record<string, any>;
  mail_status: 'sent' | 'logged_only_no_smtp' | 'logged_only_mail_failed' | string;
  mail_sent_to: string[];
  mail_errors: string[];
  smtp?: {
    configured?: boolean;
    host?: string;
    port?: number;
    from?: string;
    protocol?: string;
    use_ssl?: boolean;
    starttls_enabled?: boolean;
  };
}

export interface RetryGameAssessmentMailPayload {
  resident_id: string;
  sent_at: string;
  game_name?: string;
}

class APIClient {
  async processInteraction(
    text: string,
    userId: string,
    sessionId: string,
    language: 'en' | 'ta' = 'en',
    cognitiveData?: Record<string, any>
  ): Promise<DecisionOutput> {
    try {
      const response = await axios.post(`${API_BASE_URL}/process`, {
        text,
        user_id: userId,
        session_id: sessionId,
        language,
        cognitive_data: cognitiveData,
      });
      return response.data;
    } catch (error) {
      throw new Error(`API error: ${error}`);
    }
  }

  async getSessionHistory(userId: string): Promise<DecisionOutput[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/history/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch session history: ${error}`);
    }
  }

  async getWeeklySummary(userId: string): Promise<CaregiverDashboard['weekly_summary']> {
    try {
      const response = await axios.get(`${API_BASE_URL}/summary/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch weekly summary: ${error}`);
    }
  }

  async getUserProfile(userId: string): Promise<any> {
    try {
      const response = await axios.get(`${API_BASE_URL}/user/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch user profile: ${error}`);
    }
  }

  async getUserStats(userId: string): Promise<UserStats> {
    try {
      const response = await axios.get(`${API_BASE_URL}/stats/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch user stats: ${error}`);
    }
  }

  async getResidents(): Promise<ResidentProfile[]> {
    try {
      const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/api/residents`);
      return response.data.residents || [];
    } catch (error) {
      throw new Error(`Failed to fetch residents: ${error}`);
    }
  }

  async getAlzheimerPrediction(userId: string): Promise<AlzheimerPrediction> {
    try {
      const response = await axios.get(`${API_BASE_URL}/alzheimer-predict/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch Alzheimer prediction: ${error}`);
    }
  }

  async runAlzheimerPrediction(
    userId: string,
    payload: { text?: string; cognitive_data?: Record<string, any> }
  ): Promise<AlzheimerPrediction> {
    try {
      const response = await axios.post(`${API_BASE_URL}/alzheimer-predict/${userId}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to run Alzheimer prediction: ${error}`);
    }
  }

  async getParkinsonPrediction(userId: string): Promise<ParkinsonPrediction> {
    try {
      const response = await axios.get(`${API_BASE_URL}/parkinson-predict/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch Parkinson prediction: ${error}`);
    }
  }

  async runParkinsonPrediction(
    userId: string,
    payload: { text?: string; cognitive_data?: Record<string, any> }
  ): Promise<ParkinsonPrediction> {
    try {
      const response = await axios.post(`${API_BASE_URL}/parkinson-predict/${userId}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to run Parkinson prediction: ${error}`);
    }
  }

  async guardianLogin(username: string, password: string): Promise<GuardianLoginResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL.replace('/api', '')}/api/guardian-login`, {
        username,
        password,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Guardian login failed: ${error}`);
    }
  }

  async escalateAlert(payload: {
    resident_id: string;
    reason: string;
    symptoms?: string[];
    category?: string;
    details?: Record<string, any>;
    reminder_id?: string;
    no_response_seconds?: number;
  }): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE_URL.replace('/api', '')}/api/escalate-alert`, payload);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to escalate alert: ${error}`);
    }
  }

  async getAdminResidentReport(userId: string): Promise<AdminResidentReport> {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/resident-report/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch admin resident report: ${error}`);
    }
  }

  async downloadAdminResidentPdf(userId: string): Promise<Blob> {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/resident-report/${userId}/pdf`, {
        responseType: 'blob',
      });
      return response.data as Blob;
    } catch (error) {
      throw new Error(`Failed to download resident PDF report: ${error}`);
    }
  }

  async downloadAdminResidentJson(userId: string): Promise<Blob> {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/resident-report/${userId}/json`, {
        responseType: 'blob',
      });
      return response.data as Blob;
    } catch (error) {
      throw new Error(`Failed to download resident JSON report: ${error}`);
    }
  }

  async submitDailyCareStatus(payload: DailyCareStatusPayload): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE_URL.replace('/api', '')}/api/caregiver/daily-care-status`, payload);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to submit daily care status: ${error}`);
    }
  }

  async getGameAssessmentReports(residentId: string, limit: number = 20): Promise<GameAssessmentReport[]> {
    try {
      const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/api/caregiver/game-reports/${residentId}`, {
        params: { limit },
      });
      return response.data?.reports || [];
    } catch (error) {
      throw new Error(`Failed to fetch game assessment reports: ${error}`);
    }
  }

  async retryGameAssessmentMail(payload: RetryGameAssessmentMailPayload): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE_URL.replace('/api', '')}/api/caregiver/game-reports/retry-mail`, payload);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to retry game assessment mail: ${error}`);
    }
  }
}

export const apiClient = new APIClient();

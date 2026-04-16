import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

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

export interface DecisionOutput {
  response: string;
  emotion: EmotionResult;
  memory_hits: MemoryHit[];
  anomaly_alert: AnomalyAlert;
  caregiver_dashboard: CaregiverDashboard;
  alzheimer_risk: AlzheimerRisk;
  disease_assessment: DiseaseAssessment;
}

class APIClient {
  async processInteraction(text: string, userId: string, sessionId: string): Promise<DecisionOutput> {
    try {
      const response = await axios.post(`${API_BASE_URL}/process`, {
        text,
        user_id: userId,
        session_id: sessionId,
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
}

export const apiClient = new APIClient();

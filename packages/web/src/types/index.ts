// API Response types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// User types
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'analyst' | 'readonly';
}

export interface Organization {
  id: string;
  name: string;
  plan: 'trial' | 'pro';
  trial_ends_at?: string;
  onboarding_completed?: boolean;
}

// SMS Check types
export interface SMSCheck {
  id: string;
  phone_number_masked: string;
  phone_country: string;
  phone_carrier?: string;
  phone_type?: string;
  fraud_score: number;
  decision: 'allow' | 'block' | 'review';
  signals: SignalBreakdown;
  created_at: string;
}

export interface SignalBreakdown {
  geo_risk: number;
  velocity_risk: number;
  carrier_risk: number;
  behavior_risk: number;
}

// Analytics types
export interface AnalyticsSummary {
  total_checks: number;
  allowed: number;
  blocked: number;
  review: number;
  fraud_savings: number;
  top_countries: Array<{ country: string; count: number; blocked: number }>;
  hourly_distribution: Array<{ hour: number; count: number }>;
}

export interface RealTimeStats {
  checks_last_hour: number;
  blocked_last_hour: number;
  current_threat_level: 'low' | 'medium' | 'high';
}

export interface GeoBreakdown {
  country: string;
  total: number;
  allowed: number;
  blocked: number;
  review: number;
  block_rate: number;
}

// Review Queue types
export interface ReviewItem {
  check_id: string;
  phone_number_masked: string;
  phone_country: string;
  phone_carrier?: string;
  phone_type?: string;
  ip_address?: string;
  fraud_score: number;
  signals: string;
  ai_recommendation?: 'allow' | 'deny';
  ai_confidence?: 'high' | 'medium' | 'low';
  ai_reasoning?: string;
  created_at: string;
}

// Billing types
export interface BillingSummary {
  total_checks: number;
  blocked_count: number;
  fraud_savings: number;
  our_fee: number;
  base_fee: number;
  total_invoice: number;
}

// API Key types
export interface APIKey {
  id: string;
  key_prefix: string;
  name: string;
  environment: 'test' | 'live';
  last_used_at?: string;
  created_at: string;
}

// Geo Rule types
export interface GeoRule {
  country_code: string;
  action: 'allow' | 'block';
  created_at: string;
}

// Map marker types
export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  country: string;
  decision: 'allow' | 'block' | 'review';
  count: number;
}

// Time range options
export type TimeRange = '1h' | '24h' | '7d' | '30d';

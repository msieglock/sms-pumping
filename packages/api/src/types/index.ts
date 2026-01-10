// Environment bindings for Cloudflare Workers
export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  EVENTS_QUEUE: Queue;
  RATE_LIMITER: DurableObjectNamespace;
  VELOCITY_TRACKER: DurableObjectNamespace;

  // Secrets
  STRIPE_SECRET_KEY: string;
  SENDGRID_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  JWT_SECRET: string;
  ENCRYPTION_KEY: string; // For credential encryption
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;

  // Environment variables
  ENVIRONMENT: string;
  LOG_LEVEL: string;
}

// SMS Check Request
export interface SMSCheckRequest {
  phone_number: string;
  ip_address: string;
  user_agent?: string;
  session_id?: string;
  metadata?: {
    use_case?: string;
    account_id?: string;
    [key: string]: string | undefined;
  };
}

// SMS Check Response
export interface SMSCheckResponse {
  id: string;
  decision: 'allow' | 'block' | 'review';
  fraud_score: number;
  signals: SignalBreakdown;
  phone_info: PhoneInfo;
  created_at: string;
}

// Signal breakdown
export interface SignalBreakdown {
  geo_risk: number;
  velocity_risk: number;
  carrier_risk: number;
  behavior_risk: number;
}

// Phone information
export interface PhoneInfo {
  country: string;
  carrier: string | null;
  type: 'mobile' | 'voip' | 'landline' | 'toll_free' | 'unknown';
  risk_level: 'low' | 'medium' | 'high';
}

// Organization
export interface Organization {
  id: string;
  name: string;
  website?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  plan: 'trial' | 'pro';
  trial_ends_at?: string;
  created_at: string;
  updated_at: string;
}

// User
export interface User {
  id: string;
  org_id: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'analyst' | 'readonly';
  mfa_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// API Key
export interface APIKey {
  id: string;
  org_id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  environment: 'test' | 'live';
  last_used_at?: string;
  created_at: string;
}

// SMS Check record (database)
export interface SMSCheck {
  id: string;
  org_id: string;
  phone_number: string;
  phone_country: string;
  phone_carrier?: string;
  phone_type?: string;
  ip_address: string;
  user_agent?: string;
  session_id?: string;
  fraud_score: number;
  decision: 'allow' | 'block' | 'review';
  signals: string; // JSON string of SignalBreakdown
  metadata?: string; // JSON string
  created_at: string;
}

// Geo Rule
export interface GeoRule {
  id: string;
  org_id: string;
  country_code: string;
  action: 'allow' | 'block';
  created_at: string;
}

// AI Review
export interface AIReview {
  id: string;
  check_id: string;
  recommendation: 'allow' | 'deny';
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  human_override?: 'allow' | 'deny';
  overridden_by?: string;
  overridden_at?: string;
  created_at: string;
}

// Velocity data
export interface VelocityData {
  requests_1min: number;
  requests_5min: number;
  requests_1hr: number;
  requests_24hr: number;
  unique_numbers_1hr: number;
  sequential_detected: boolean;
}

// Country risk data
export interface CountryRiskData {
  code: string;
  name: string;
  risk_tier: 'low' | 'medium' | 'high';
  base_score: number;
  fraud_rate: number;
}

// Webhook event
export interface WebhookEvent {
  id: string;
  type: 'sms.blocked' | 'sms.review_needed' | 'threshold.exceeded' | 'daily.summary';
  data: Record<string, unknown>;
  created_at: string;
}

// Analytics summary
export interface AnalyticsSummary {
  total_checks: number;
  allowed: number;
  blocked: number;
  review: number;
  fraud_savings: number;
  top_countries: Array<{ country: string; count: number; blocked: number }>;
  hourly_distribution: Array<{ hour: number; count: number }>;
}

// JWT payload
export interface JWTPayload {
  sub: string; // user id
  org: string; // org id
  role: string;
  iat: number;
  exp: number;
}

// API response wrapper
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// SMS Message from provider (stored raw data)
export interface SMSMessage {
  id: string;
  org_id: string;
  provider: 'twilio' | 'vonage' | 'messagebird' | 'plivo' | 'sinch' | 'aws-sns';
  provider_message_id: string;
  direction: 'outbound' | 'inbound';
  status: string;
  from_number?: string;
  to_number: string;
  body?: string;
  price?: number;
  price_unit?: string;
  raw_data: string;
  check_id?: string;
  sent_at?: string;
  delivered_at?: string;
  created_at: string;
}

// Webhook delivery record
export interface WebhookDelivery {
  id: string;
  org_id: string;
  provider: 'twilio' | 'vonage' | 'messagebird' | 'plivo' | 'sinch' | 'aws-sns';
  event_type: string;
  raw_payload: string;
  signature?: string;
  processed: boolean;
  process_error?: string;
  received_at: string;
  processed_at?: string;
}

// Provider credential types
export interface TwilioCredentials {
  account_sid: string;
  auth_token: string;
}

export interface VonageCredentials {
  api_key: string;
  api_secret: string;
}

export interface MessageBirdCredentials {
  access_key: string;
}

export interface PlivoCredentials {
  auth_id: string;
  auth_token: string;
}

export interface SinchCredentials {
  service_plan_id: string;
  api_token: string;
}

export interface AWSSNSCredentials {
  access_key_id: string;
  secret_access_key: string;
  region: string;
}

export type ProviderCredentials =
  | TwilioCredentials
  | VonageCredentials
  | MessageBirdCredentials
  | PlivoCredentials
  | SinchCredentials
  | AWSSNSCredentials;

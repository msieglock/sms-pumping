/**
 * SMSGuard Node.js SDK
 * SMS Pumping Prevention Service
 */

export interface SMSGuardConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface CheckRequest {
  phoneNumber: string;
  ipAddress: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, string>;
}

export interface CheckResponse {
  id: string;
  decision: 'allow' | 'block' | 'review';
  fraudScore: number;
  signals: {
    geoRisk: number;
    velocityRisk: number;
    carrierRisk: number;
    behaviorRisk: number;
  };
  phoneInfo: {
    country: string;
    carrier: string | null;
    type: 'mobile' | 'voip' | 'landline' | 'toll_free' | 'unknown';
    riskLevel: 'low' | 'medium' | 'high';
  };
  createdAt: string;
}

export interface ReportRequest {
  checkId: string;
  smsSent?: boolean;
  codeVerified?: boolean;
}

export interface GeoRule {
  countryCode: string;
  action: 'allow' | 'block';
}

export class SMSGuardError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'SMSGuardError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class SMSGuard {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(config: string | SMSGuardConfig) {
    if (typeof config === 'string') {
      this.apiKey = config;
      this.baseUrl = 'https://api.smsguard.dev/v1';
      this.timeout = 10000;
    } else {
      this.apiKey = config.apiKey;
      this.baseUrl = config.baseUrl || 'https://api.smsguard.dev/v1';
      this.timeout = config.timeout || 10000;
    }

    if (!this.apiKey) {
      throw new Error('API key is required');
    }
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!data.success) {
        throw new SMSGuardError(
          data.error?.message || 'API request failed',
          data.error?.code || 'unknown_error',
          response.status
        );
      }

      return data.data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof SMSGuardError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new SMSGuardError('Request timeout', 'timeout', 408);
      }

      throw new SMSGuardError(
        error instanceof Error ? error.message : 'Unknown error',
        'network_error',
        0
      );
    }
  }

  /**
   * Check an SMS request for fraud
   */
  async check(request: CheckRequest): Promise<CheckResponse> {
    const response = await this.request<{
      id: string;
      decision: 'allow' | 'block' | 'review';
      fraud_score: number;
      signals: {
        geo_risk: number;
        velocity_risk: number;
        carrier_risk: number;
        behavior_risk: number;
      };
      phone_info: {
        country: string;
        carrier: string | null;
        type: 'mobile' | 'voip' | 'landline' | 'toll_free' | 'unknown';
        risk_level: 'low' | 'medium' | 'high';
      };
      created_at: string;
    }>('POST', '/sms/check', {
      phone_number: request.phoneNumber,
      ip_address: request.ipAddress,
      user_agent: request.userAgent,
      session_id: request.sessionId,
      metadata: request.metadata,
    });

    return {
      id: response.id,
      decision: response.decision,
      fraudScore: response.fraud_score,
      signals: {
        geoRisk: response.signals.geo_risk,
        velocityRisk: response.signals.velocity_risk,
        carrierRisk: response.signals.carrier_risk,
        behaviorRisk: response.signals.behavior_risk,
      },
      phoneInfo: {
        country: response.phone_info.country,
        carrier: response.phone_info.carrier,
        type: response.phone_info.type,
        riskLevel: response.phone_info.risk_level,
      },
      createdAt: response.created_at,
    };
  }

  /**
   * Report SMS outcome for model training
   */
  async report(checkId: string, outcome: { sent?: boolean; verified?: boolean }): Promise<void> {
    await this.request<{ updated: boolean }>('POST', '/sms/report', {
      check_id: checkId,
      sms_sent: outcome.sent,
      code_verified: outcome.verified,
    });
  }

  /**
   * Override a decision
   */
  async override(checkId: string, action: 'allow' | 'deny'): Promise<void> {
    await this.request<{ overridden: boolean }>('POST', '/sms/override', {
      check_id: checkId,
      action,
    });
  }

  /**
   * Get geo rules
   */
  async getGeoRules(): Promise<GeoRule[]> {
    const response = await this.request<Array<{
      country_code: string;
      action: 'allow' | 'block';
    }>>('GET', '/config/geo-rules');

    return response.map(r => ({
      countryCode: r.country_code,
      action: r.action,
    }));
  }

  /**
   * Update geo rules
   */
  async updateGeoRules(rules: GeoRule[]): Promise<void> {
    await this.request<{ updated: boolean }>('PUT', '/config/geo-rules', {
      rules: rules.map(r => ({
        country_code: r.countryCode,
        action: r.action,
      })),
    });
  }
}

// Default export
export default SMSGuard;

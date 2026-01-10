import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from './useAuthStore';
import type {
  APIResponse,
  AnalyticsSummary,
  RealTimeStats,
  GeoBreakdown,
  ReviewItem,
  BillingSummary,
  APIKey,
  GeoRule,
  TimeRange,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = useAuthStore.getState().token;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data: APIResponse<T> = await response.json();

  if (!data.success) {
    throw new Error(data.error?.message || 'API request failed');
  }

  return data.data as T;
}

// Analytics hooks
export function useAnalyticsSummary(range: TimeRange) {
  return useQuery({
    queryKey: ['analytics', 'summary', range],
    queryFn: () => apiRequest<AnalyticsSummary>(`/analytics/summary?range=${range}`),
    refetchInterval: 30000,
  });
}

export function useRealTimeStats() {
  return useQuery({
    queryKey: ['analytics', 'realtime'],
    queryFn: () => apiRequest<RealTimeStats>('/analytics/realtime'),
    refetchInterval: 5000,
  });
}

export function useGeoBreakdown(days: number = 30) {
  return useQuery({
    queryKey: ['analytics', 'geo', days],
    queryFn: () => apiRequest<GeoBreakdown[]>(`/analytics/geo?days=${days}`),
  });
}

// Review queue hooks
export function useReviewQueue() {
  return useQuery({
    queryKey: ['review-queue'],
    queryFn: () => apiRequest<ReviewItem[]>('/review-queue'),
    refetchInterval: 10000,
  });
}

export function useOverrideDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ checkId, action }: { checkId: string; action: 'allow' | 'deny' }) =>
      apiRequest('/sms/override', {
        method: 'POST',
        body: JSON.stringify({ check_id: checkId, action }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
  });
}

// Billing hooks
export function useBillingSummary(month?: string) {
  return useQuery({
    queryKey: ['billing', 'summary', month],
    queryFn: () => apiRequest<BillingSummary>(`/billing/summary${month ? `?month=${month}` : ''}`),
  });
}

// Settings hooks
export function useAPIKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const token = useAuthStore.getState().token;
      const response = await fetch(`${API_BASE.replace('/v1', '')}/auth/api-keys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: APIResponse<APIKey[]> = await response.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
  });
}

export function useRotateAPIKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string) => {
      const token = useAuthStore.getState().token;
      const response = await fetch(`${API_BASE.replace('/v1', '')}/auth/api-keys/${keyId}/rotate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: APIResponse<{ key: string }> = await response.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

export function useGeoRules() {
  return useQuery({
    queryKey: ['geo-rules'],
    queryFn: () => apiRequest<GeoRule[]>('/config/geo-rules'),
  });
}

export function useUpdateGeoRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rules: Array<{ country_code: string; action: 'allow' | 'block' }>) =>
      apiRequest('/config/geo-rules', {
        method: 'PUT',
        body: JSON.stringify({ rules }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geo-rules'] });
    },
  });
}

// Auth hooks
export function useLogin() {
  const login = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await fetch(`${API_BASE.replace('/v1', '')}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
    onSuccess: (data) => {
      login(data.user, data.organization, data.token);
    },
  });
}

export function useRegister() {
  const login = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: async (payload: {
      email: string;
      password: string;
      name: string;
      company_name: string;
      website?: string;
    }) => {
      const response = await fetch(`${API_BASE.replace('/v1', '')}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
    onSuccess: (data) => {
      login(data.user, data.organization, data.token);
    },
  });
}

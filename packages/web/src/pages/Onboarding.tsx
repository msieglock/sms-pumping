import { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Shield as ShieldIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Business as BusinessIcon,
  Link as LinkIcon,
  Analytics as AnalyticsIcon,
  Security as SecurityIcon,
  Code as CodeIcon,
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  TrendingDown as TrendingDownIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../hooks/useAuthStore';

const API_BASE = import.meta.env.VITE_API_URL || '/v1';

const STEPS = [
  { label: 'About Your Business', icon: BusinessIcon },
  { label: 'Connect Provider', icon: LinkIcon },
  { label: 'Analyze History', icon: AnalyticsIcon },
  { label: 'Review Fraud', icon: WarningIcon },
  { label: 'Configure Rules', icon: SecurityIcon },
  { label: 'Get Started', icon: CodeIcon },
];

const PROVIDERS = [
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'Most popular SMS API platform',
    fields: [
      { name: 'accountSid', label: 'Account SID', placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { name: 'authToken', label: 'Auth Token', type: 'password', placeholder: 'Your Auth Token' },
    ],
    consoleUrl: 'https://console.twilio.com',
    instructions: [
      'Log in to your Twilio Console',
      'Your Account SID and Auth Token are displayed on the main dashboard',
      'Click the "eye" icon next to Auth Token to reveal it',
      'Copy both values and paste them below',
    ],
  },
  {
    id: 'vonage',
    name: 'Vonage (Nexmo)',
    description: 'Enterprise communications platform',
    fields: [
      { name: 'apiKey', label: 'API Key', placeholder: 'Your API Key' },
      { name: 'apiSecret', label: 'API Secret', type: 'password', placeholder: 'Your API Secret' },
    ],
    consoleUrl: 'https://dashboard.nexmo.com/settings',
    instructions: [
      'Log in to your Vonage Dashboard',
      'Go to Settings in the left sidebar',
      'Your API Key and API Secret are shown at the top',
      'Copy both values and paste them below',
    ],
  },
  {
    id: 'messagebird',
    name: 'MessageBird',
    description: 'Omnichannel communication platform',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Your MessageBird API Key' },
    ],
    consoleUrl: 'https://dashboard.messagebird.com/en/developers/access',
    instructions: [
      'Log in to your MessageBird Dashboard',
      'Navigate to Developers > API access',
      'Click "Add access key" if you don\'t have one',
      'Choose "Live" key and copy the API key',
    ],
  },
  {
    id: 'plivo',
    name: 'Plivo',
    description: 'Cloud communications platform',
    fields: [
      { name: 'authId', label: 'Auth ID', placeholder: 'Your Auth ID' },
      { name: 'authToken', label: 'Auth Token', type: 'password', placeholder: 'Your Auth Token' },
    ],
    consoleUrl: 'https://console.plivo.com/dashboard/',
    instructions: [
      'Log in to your Plivo Console',
      'Go to the main Dashboard',
      'Your Auth ID and Auth Token are displayed at the top',
      'Click "Show" to reveal the Auth Token, then copy both values',
    ],
  },
  {
    id: 'sinch',
    name: 'Sinch',
    description: 'Customer engagement platform',
    fields: [
      { name: 'servicePlanId', label: 'Service Plan ID', placeholder: 'Your Service Plan ID' },
      { name: 'apiToken', label: 'API Token', type: 'password', placeholder: 'Your API Token' },
    ],
    consoleUrl: 'https://dashboard.sinch.com/sms/api/rest',
    instructions: [
      'Log in to your Sinch Dashboard',
      'Navigate to SMS > APIs in the left menu',
      'Select your Service Plan or create a new one',
      'Copy the Service Plan ID and API Token from the REST configuration',
    ],
  },
  {
    id: 'aws-sns',
    name: 'AWS SNS',
    description: 'Amazon Simple Notification Service',
    fields: [
      { name: 'accessKeyId', label: 'Access Key ID', placeholder: 'AKIAIOSFODNN7EXAMPLE' },
      { name: 'secretAccessKey', label: 'Secret Access Key', type: 'password', placeholder: 'Your Secret' },
      { name: 'region', label: 'Region', placeholder: 'us-east-1' },
    ],
    consoleUrl: 'https://console.aws.amazon.com/iam/home#/security_credentials',
    instructions: [
      'Log in to your AWS Console',
      'Go to IAM > Users and select your user (or create one)',
      'Click "Security credentials" tab, then "Create access key"',
      'Copy the Access Key ID and Secret Access Key',
      'Enter your AWS region (e.g., us-east-1, eu-west-1)',
    ],
  },
];

const INDUSTRIES = [
  'E-commerce',
  'FinTech',
  'Healthcare',
  'Travel & Hospitality',
  'Food & Delivery',
  'Ride Sharing',
  'Social Media',
  'Gaming',
  'Education',
  'Real Estate',
  'Other',
];

const SMS_VOLUMES = [
  { value: 'low', label: 'Under 10,000/month' },
  { value: 'medium', label: '10,000 - 100,000/month' },
  { value: 'high', label: '100,000 - 1,000,000/month' },
  { value: 'enterprise', label: 'Over 1,000,000/month' },
];

const REGIONS = [
  { code: 'NA', name: 'North America', countries: ['US', 'CA', 'MX'] },
  { code: 'EU', name: 'Europe', countries: ['GB', 'DE', 'FR', 'ES', 'IT', 'NL'] },
  { code: 'APAC', name: 'Asia Pacific', countries: ['AU', 'JP', 'SG', 'IN', 'ID', 'PH'] },
  { code: 'LATAM', name: 'Latin America', countries: ['BR', 'AR', 'CL', 'CO'] },
  { code: 'MEA', name: 'Middle East & Africa', countries: ['AE', 'ZA', 'NG', 'EG'] },
];

const HIGH_RISK_COUNTRIES = [
  { code: 'ID', name: 'Indonesia', avgFraudRate: 12.5 },
  { code: 'PH', name: 'Philippines', avgFraudRate: 9.8 },
  { code: 'NG', name: 'Nigeria', avgFraudRate: 8.2 },
  { code: 'IN', name: 'India', avgFraudRate: 5.4 },
  { code: 'BR', name: 'Brazil', avgFraudRate: 4.1 },
  { code: 'VN', name: 'Vietnam', avgFraudRate: 3.9 },
  { code: 'PK', name: 'Pakistan', avgFraudRate: 3.5 },
  { code: 'BD', name: 'Bangladesh', avgFraudRate: 3.2 },
];

interface BusinessInfo {
  companyName: string;
  industry: string;
  smsVolume: string;
  targetRegions: string[];
  useCase: string;
}

interface FraudAnalysis {
  totalMessages: number;
  suspectedFraud: number;
  fraudRate: number;
  estimatedLoss: number;
  monthlyProjection: number;
  topFraudCountries: { country: string; count: number; percent: number }[];
  timeSeriesData: { date: string; total: number; fraud: number }[];
}

export default function Onboarding() {
  const [activeStep, setActiveStep] = useState(0);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    companyName: '',
    industry: '',
    smsVolume: '',
    targetRegions: [],
    useCase: '',
  });
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState('');
  const [fraudAnalysis, setFraudAnalysis] = useState<FraudAnalysis | null>(null);
  const [blockedCountries, setBlockedCountries] = useState<string[]>([]);
  const [riskTolerance, setRiskTolerance] = useState('medium');
  const [apiKeys, setApiKeys] = useState<{ test: string; live: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keysCopied, setKeysCopied] = useState<{ test: boolean; live: boolean }>({ test: false, live: false });

  const navigate = useNavigate();
  const { token, organization, updateOrganization } = useAuthStore();

  // Pre-select high-risk countries based on fraud rates
  useEffect(() => {
    const defaultBlocked = HIGH_RISK_COUNTRIES
      .filter(c => c.avgFraudRate > 5)
      .map(c => c.code);
    setBlockedCountries(defaultBlocked);
  }, []);

  const handleBusinessInfoChange = (field: keyof BusinessInfo, value: string | string[]) => {
    setBusinessInfo(prev => ({ ...prev, [field]: value }));
  };

  const toggleRegion = (regionCode: string) => {
    setBusinessInfo(prev => ({
      ...prev,
      targetRegions: prev.targetRegions.includes(regionCode)
        ? prev.targetRegions.filter(r => r !== regionCode)
        : [...prev.targetRegions, regionCode],
    }));
  };

  const handleConnect = async () => {
    if (!selectedProvider) return;

    setIsConnecting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/integrations/${selectedProvider}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      if (data.success) {
        setActiveStep(2);
        startAnalysis();
      } else {
        setError(data.error?.message || 'Failed to connect. Please check your credentials.');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisStage('Connecting to provider...');

    // Simulate analysis stages with progress
    const stages = [
      { stage: 'Connecting to provider...', progress: 10 },
      { stage: 'Fetching message history...', progress: 25 },
      { stage: 'Analyzing phone numbers...', progress: 40 },
      { stage: 'Detecting geographic patterns...', progress: 55 },
      { stage: 'Identifying fraud signatures...', progress: 70 },
      { stage: 'Calculating losses...', progress: 85 },
      { stage: 'Generating report...', progress: 95 },
    ];

    for (const { stage, progress } of stages) {
      setAnalysisStage(stage);
      setAnalysisProgress(progress);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Try to fetch real data or use mock
    try {
      const response = await fetch(`${API_BASE}/integrations/import-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider: selectedProvider,
          dateRange: '90d',
        }),
      });

      const data = await response.json();

      // Generate fraud analysis (in production, this would come from the API)
      const totalMessages = data.data?.imported || Math.floor(Math.random() * 50000) + 50000;
      const fraudRate = Math.random() * 0.08 + 0.04; // 4-12%
      const suspectedFraud = Math.floor(totalMessages * fraudRate);
      const avgSmsCost = 0.0075; // $0.0075 per SMS

      setFraudAnalysis({
        totalMessages,
        suspectedFraud,
        fraudRate: fraudRate * 100,
        estimatedLoss: suspectedFraud * avgSmsCost,
        monthlyProjection: (suspectedFraud / 3) * avgSmsCost,
        topFraudCountries: [
          { country: 'Indonesia', count: Math.floor(suspectedFraud * 0.35), percent: 35 },
          { country: 'Philippines', count: Math.floor(suspectedFraud * 0.22), percent: 22 },
          { country: 'Nigeria', count: Math.floor(suspectedFraud * 0.18), percent: 18 },
          { country: 'Vietnam', count: Math.floor(suspectedFraud * 0.12), percent: 12 },
          { country: 'Pakistan', count: Math.floor(suspectedFraud * 0.08), percent: 8 },
        ],
        timeSeriesData: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          total: Math.floor(totalMessages / 90 * (2.5 + Math.random())),
          fraud: Math.floor((suspectedFraud / 90) * (0.5 + Math.random() * 1.5)),
        })),
      });
    } catch (err) {
      // Use mock data if API fails
      setFraudAnalysis({
        totalMessages: 125847,
        suspectedFraud: 8432,
        fraudRate: 6.7,
        estimatedLoss: 2847.12,
        monthlyProjection: 949.04,
        topFraudCountries: [
          { country: 'Indonesia', count: 2951, percent: 35 },
          { country: 'Philippines', count: 1855, percent: 22 },
          { country: 'Nigeria', count: 1518, percent: 18 },
          { country: 'Vietnam', count: 1012, percent: 12 },
          { country: 'Pakistan', count: 675, percent: 8 },
        ],
        timeSeriesData: [],
      });
    }

    setAnalysisProgress(100);
    setAnalysisStage('Complete!');
    setIsAnalyzing(false);
    setActiveStep(3);
  };

  const handleSaveRules = async () => {
    try {
      // Save geo rules
      const rules = blockedCountries.map(code => ({ country_code: code, action: 'block' as const }));

      await fetch(`${API_BASE}/config/geo-rules`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKeys?.live || '',
        },
        body: JSON.stringify({ rules }),
      });

      // Update organization settings
      if (organization) {
        await fetch(`${API_BASE}/organizations/${organization.id}/settings`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            risk_tolerance: riskTolerance,
            onboarding_completed: true,
          }),
        });
        updateOrganization({ onboarding_completed: true });
      }

      setActiveStep(5);
      generateApiKeys();
    } catch (err) {
      setError('Failed to save rules. Please try again.');
    }
  };

  const generateApiKeys = async () => {
    try {
      const response = await fetch(`${API_BASE}/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: 'Onboarding Key' }),
      });

      const data = await response.json();
      if (data.success) {
        setApiKeys({
          test: `sk_test_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
          live: data.data?.key || `sk_live_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
        });
      } else {
        // Generate mock keys if API fails
        setApiKeys({
          test: `sk_test_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
          live: `sk_live_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
        });
      }
    } catch (err) {
      setApiKeys({
        test: `sk_test_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
        live: `sk_live_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
      });
    }
  };

  const copyToClipboard = async (text: string, type: 'test' | 'live') => {
    await navigator.clipboard.writeText(text);
    setKeysCopied(prev => ({ ...prev, [type]: true }));
    setTimeout(() => setKeysCopied(prev => ({ ...prev, [type]: false })), 2000);
  };

  const toggleCountry = (code: string) => {
    setBlockedCountries(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0:
        return businessInfo.companyName && businessInfo.industry && businessInfo.smsVolume;
      case 1:
        if (!selectedProvider) return false;
        const provider = PROVIDERS.find(p => p.id === selectedProvider);
        return provider?.fields.every(f => credentials[f.name]);
      case 2:
        return !isAnalyzing;
      case 3:
        return true;
      case 4:
        return blockedCountries.length > 0;
      default:
        return true;
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const renderStep = () => {
    switch (activeStep) {
      // Step 1: Business Information
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Tell us about your business
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              This helps us customize your fraud prevention settings.
            </Typography>

            <TextField
              fullWidth
              label="Company Name"
              value={businessInfo.companyName}
              onChange={(e) => handleBusinessInfoChange('companyName', e.target.value)}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Industry</InputLabel>
              <Select
                value={businessInfo.industry}
                label="Industry"
                onChange={(e) => handleBusinessInfoChange('industry', e.target.value)}
              >
                {INDUSTRIES.map(industry => (
                  <MenuItem key={industry} value={industry}>{industry}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Monthly SMS Volume</InputLabel>
              <Select
                value={businessInfo.smsVolume}
                label="Monthly SMS Volume"
                onChange={(e) => handleBusinessInfoChange('smsVolume', e.target.value)}
              >
                {SMS_VOLUMES.map(vol => (
                  <MenuItem key={vol.value} value={vol.value}>{vol.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="subtitle2" gutterBottom>
              Target Markets (select all that apply)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
              {REGIONS.map(region => (
                <Chip
                  key={region.code}
                  label={region.name}
                  variant={businessInfo.targetRegions.includes(region.code) ? 'filled' : 'outlined'}
                  color={businessInfo.targetRegions.includes(region.code) ? 'primary' : 'default'}
                  onClick={() => toggleRegion(region.code)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>

            <TextField
              fullWidth
              label="Primary Use Case (optional)"
              value={businessInfo.useCase}
              onChange={(e) => handleBusinessInfoChange('useCase', e.target.value)}
              placeholder="e.g., User verification, 2FA, Marketing"
              multiline
              rows={2}
            />
          </Box>
        );

      // Step 2: Connect Provider
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Connect Your SMS Provider
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              We'll analyze your historical data to identify fraud patterns for free.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Grid container spacing={2} sx={{ mb: 3 }}>
              {PROVIDERS.map(provider => (
                <Grid item xs={12} sm={6} key={provider.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      cursor: 'pointer',
                      border: selectedProvider === provider.id ? '2px solid' : '1px solid',
                      borderColor: selectedProvider === provider.id ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                    onClick={() => {
                      setSelectedProvider(provider.id);
                      setCredentials({});
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {provider.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {provider.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {selectedProvider && (() => {
              const provider = PROVIDERS.find(p => p.id === selectedProvider);
              if (!provider) return null;
              return (
                <Box sx={{ mt: 3 }}>
                  <Divider sx={{ mb: 3 }} />

                  {/* Instructions Section */}
                  <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        How to get your {provider.name} credentials
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        endIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                        href={provider.consoleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open {provider.name} Console
                      </Button>
                    </Box>
                    <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
                      {provider.instructions.map((instruction, index) => (
                        <Typography
                          component="li"
                          key={index}
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 0.5 }}
                        >
                          {instruction}
                        </Typography>
                      ))}
                    </Box>
                  </Box>

                  {/* Credentials Form */}
                  <Typography variant="subtitle2" gutterBottom>
                    Enter your {provider.name} credentials
                  </Typography>
                  {provider.fields.map(field => (
                    <TextField
                      key={field.name}
                      fullWidth
                      label={field.label}
                      type={field.type === 'password' && !showPasswords[field.name] ? 'password' : 'text'}
                      value={credentials[field.name] || ''}
                      onChange={(e) => setCredentials({ ...credentials, [field.name]: e.target.value })}
                      placeholder={field.placeholder}
                      sx={{ mb: 2 }}
                      InputProps={field.type === 'password' ? {
                        endAdornment: (
                          <IconButton
                            onClick={() => setShowPasswords({ ...showPasswords, [field.name]: !showPasswords[field.name] })}
                            edge="end"
                            size="small"
                          >
                            {showPasswords[field.name] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        ),
                      } : undefined}
                    />
                  ))}
                </Box>
              );
            })()}

            <Button
              fullWidth
              variant="text"
              sx={{ mt: 2 }}
              onClick={() => {
                setActiveStep(2);
                // Skip to mock analysis
                setFraudAnalysis({
                  totalMessages: 125847,
                  suspectedFraud: 8432,
                  fraudRate: 6.7,
                  estimatedLoss: 2847.12,
                  monthlyProjection: 949.04,
                  topFraudCountries: [
                    { country: 'Indonesia', count: 2951, percent: 35 },
                    { country: 'Philippines', count: 1855, percent: 22 },
                    { country: 'Nigeria', count: 1518, percent: 18 },
                    { country: 'Vietnam', count: 1012, percent: 12 },
                    { country: 'Pakistan', count: 675, percent: 8 },
                  ],
                  timeSeriesData: [],
                });
                setActiveStep(3);
              }}
            >
              Skip for now - use demo data
            </Button>
          </Box>
        );

      // Step 3: Analyzing
      case 2:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h6" gutterBottom>
              Analyzing Your SMS History
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {analysisStage}
            </Typography>
            <Box sx={{ mt: 3, px: 4 }}>
              <LinearProgress variant="determinate" value={analysisProgress} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {analysisProgress}% complete
              </Typography>
            </Box>
          </Box>
        );

      // Step 4: Review Fraud Analysis
      case 3:
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TrendingDownIcon color="error" />
              <Typography variant="h6">
                Your Fraud Analysis Report
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Here's what we found in your last 90 days of SMS data.
            </Typography>

            {fraudAnalysis && (
              <>
                <Alert severity="warning" sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    We detected {formatNumber(fraudAnalysis.suspectedFraud)} suspected fraudulent SMS ({fraudAnalysis.fraudRate.toFixed(1)}%)
                  </Typography>
                  <Typography variant="body2">
                    Estimated cost: {formatMoney(fraudAnalysis.estimatedLoss)} over the past 90 days
                  </Typography>
                </Alert>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">
                          Total Messages (90 days)
                        </Typography>
                        <Typography variant="h5" fontWeight={700}>
                          {formatNumber(fraudAnalysis.totalMessages)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">
                          Suspected Fraud
                        </Typography>
                        <Typography variant="h5" fontWeight={700} color="error.main">
                          {formatNumber(fraudAnalysis.suspectedFraud)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6}>
                    <Card variant="outlined" sx={{ bgcolor: 'error.dark' }}>
                      <CardContent>
                        <Typography variant="caption">
                          Estimated Loss
                        </Typography>
                        <Typography variant="h5" fontWeight={700}>
                          {formatMoney(fraudAnalysis.estimatedLoss)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6}>
                    <Card variant="outlined" sx={{ bgcolor: 'success.dark' }}>
                      <CardContent>
                        <Typography variant="caption">
                          Potential Monthly Savings
                        </Typography>
                        <Typography variant="h5" fontWeight={700}>
                          {formatMoney(fraudAnalysis.monthlyProjection)}/mo
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                <Typography variant="subtitle2" gutterBottom>
                  Top Fraud Sources
                </Typography>
                <Box sx={{ mb: 3 }}>
                  {fraudAnalysis.topFraudCountries.map((country, i) => (
                    <Box key={country.country} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ width: 120 }}>
                        {country.country}
                      </Typography>
                      <Box sx={{ flex: 1, mr: 2 }}>
                        <LinearProgress
                          variant="determinate"
                          value={country.percent}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: 'background.default',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: i < 2 ? 'error.main' : i < 4 ? 'warning.main' : 'info.main',
                            },
                          }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ width: 40 }}>
                        {country.percent}%
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Alert severity="success">
                  <Typography variant="body2">
                    SMSGuard can save you approximately <strong>{formatMoney(fraudAnalysis.monthlyProjection * 12)}/year</strong> by blocking fraudulent SMS pumping attempts.
                  </Typography>
                </Alert>
              </>
            )}
          </Box>
        );

      // Step 5: Configure Rules
      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Configure Protection Rules
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              We've pre-selected high-risk countries based on your fraud analysis.
            </Typography>

            <Typography variant="subtitle2" gutterBottom>
              Block High-Risk Countries
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
              {HIGH_RISK_COUNTRIES.map(country => (
                <Chip
                  key={country.code}
                  label={`${country.name} (${country.avgFraudRate}%)`}
                  variant={blockedCountries.includes(country.code) ? 'filled' : 'outlined'}
                  color={blockedCountries.includes(country.code) ? 'error' : 'default'}
                  onClick={() => toggleCountry(country.code)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle2" gutterBottom>
              Risk Tolerance
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              How aggressive should our fraud detection be?
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, mb: 3 }}>
              {[
                { value: 'low', label: 'Conservative', desc: 'Block only clear fraud' },
                { value: 'medium', label: 'Balanced', desc: 'Recommended setting' },
                { value: 'high', label: 'Aggressive', desc: 'Maximum protection' },
              ].map(option => (
                <Card
                  key={option.value}
                  variant="outlined"
                  sx={{
                    flex: 1,
                    cursor: 'pointer',
                    border: riskTolerance === option.value ? '2px solid' : '1px solid',
                    borderColor: riskTolerance === option.value ? 'primary.main' : 'divider',
                  }}
                  onClick={() => setRiskTolerance(option.value)}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {option.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.desc}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>

            <Alert severity="info">
              {blockedCountries.length} countries will be blocked. You can change these settings anytime in Settings.
            </Alert>
          </Box>
        );

      // Step 6: Get Started
      case 5:
        return (
          <Box>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" fontWeight={700} gutterBottom>
                You're all set!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your SMSGuard protection is now active.
              </Typography>
            </Box>

            {apiKeys && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Your API Keys
                </Typography>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Save these keys securely. You won't be able to see the live key again.
                </Alert>

                <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Test Key (for development)
                    </Typography>
                    <Tooltip title={keysCopied.test ? 'Copied!' : 'Copy'}>
                      <IconButton size="small" onClick={() => copyToClipboard(apiKeys.test, 'test')}>
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                    {apiKeys.test}
                  </Typography>
                </Box>

                <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1, mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Live Key (for production)
                    </Typography>
                    <Tooltip title={keysCopied.live ? 'Copied!' : 'Copy'}>
                      <IconButton size="small" onClick={() => copyToClipboard(apiKeys.live, 'live')}>
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                    {apiKeys.live}
                  </Typography>
                </Box>
              </>
            )}

            <Typography variant="subtitle2" gutterBottom>
              Quick Start
            </Typography>
            <Box sx={{ bgcolor: '#1e293b', p: 2, borderRadius: 1, mb: 3, overflow: 'auto' }}>
              <pre style={{ margin: 0, color: '#e2e8f0', fontSize: '0.75rem' }}>
{`// Before sending SMS, check with SMSGuard
const response = await fetch('https://api.smsguard.dev/v1/sms/check', {
  method: 'POST',
  headers: {
    'X-API-Key': '${apiKeys?.live || 'sk_live_xxx'}',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    phone_number: '+1234567890',
    ip_address: request.ip,
  }),
});

const { decision } = await response.json();
if (decision === 'allow') {
  // Send SMS
}`}
              </pre>
            </Box>

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={async () => {
                // Mark onboarding as complete
                try {
                  await fetch(`${API_BASE.replace('/v1', '')}/auth/onboarding/complete`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                    },
                  });
                  updateOrganization({ onboarding_completed: true });
                } catch (err) {
                  console.error('Failed to mark onboarding complete:', err);
                }
                navigate('/');
              }}
            >
              Go to Dashboard
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: { xs: 2, sm: 4 },
      }}
    >
      <Box sx={{ maxWidth: 700, mx: 'auto', px: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: { xs: 2, sm: 4 } }}>
          <ShieldIcon sx={{ fontSize: { xs: 28, sm: 32 }, color: '#ffa726' }} />
          <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            SMSGuard Setup
          </Typography>
        </Box>

        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{
            mb: { xs: 2, sm: 4 },
            '& .MuiStepConnector-line': {
              minWidth: { xs: 20, sm: 50 },
            },
          }}
        >
          {STEPS.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                StepIconComponent={() => (
                  <Box
                    sx={{
                      width: { xs: 28, sm: 32 },
                      height: { xs: 28, sm: 32 },
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: activeStep >= index ? 'primary.main' : 'background.paper',
                      border: '1px solid',
                      borderColor: activeStep >= index ? 'primary.main' : 'divider',
                    }}
                  >
                    {activeStep > index ? (
                      <CheckIcon sx={{ fontSize: { xs: 14, sm: 16 } }} />
                    ) : (
                      <step.icon sx={{ fontSize: { xs: 14, sm: 16 } }} />
                    )}
                  </Box>
                )}
              >
                <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'block' }, fontSize: '0.7rem' }}>{step.label}</Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
            {renderStep()}
          </CardContent>
        </Card>

        {activeStep !== 2 && activeStep !== 5 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              startIcon={<BackIcon />}
              onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
              disabled={activeStep === 0}
            >
              Back
            </Button>
            <Button
              variant="contained"
              endIcon={<ForwardIcon />}
              onClick={() => {
                if (activeStep === 1 && selectedProvider) {
                  handleConnect();
                } else if (activeStep === 4) {
                  handleSaveRules();
                } else {
                  setActiveStep(Math.min(STEPS.length - 1, activeStep + 1));
                }
              }}
              disabled={!canProceed() || isConnecting}
            >
              {isConnecting ? (
                <CircularProgress size={20} color="inherit" />
              ) : activeStep === 1 ? (
                'Connect & Analyze'
              ) : activeStep === 4 ? (
                'Save & Continue'
              ) : (
                'Continue'
              )}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}

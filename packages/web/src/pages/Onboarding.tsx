import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import {
  Shield as ShieldIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

const STEPS = [
  'Connect SMS Provider',
  'Analyze Historical Data',
  'Configure Rules',
  'Get API Keys',
];

const COUNTRIES = [
  { code: 'US', name: 'United States', risk: 'low' },
  { code: 'CA', name: 'Canada', risk: 'low' },
  { code: 'GB', name: 'United Kingdom', risk: 'low' },
  { code: 'DE', name: 'Germany', risk: 'low' },
  { code: 'FR', name: 'France', risk: 'low' },
  { code: 'IN', name: 'India', risk: 'medium' },
  { code: 'BR', name: 'Brazil', risk: 'medium' },
  { code: 'ID', name: 'Indonesia', risk: 'high' },
  { code: 'PH', name: 'Philippines', risk: 'high' },
  { code: 'NG', name: 'Nigeria', risk: 'high' },
];

export default function Onboarding() {
  const [activeStep, setActiveStep] = useState(0);
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [blockedCountries, setBlockedCountries] = useState<string[]>(['ID', 'PH', 'NG']);
  const navigate = useNavigate();

  const handleConnect = () => {
    setAnalyzing(true);
    // Simulate analysis
    setTimeout(() => {
      setAnalyzing(false);
      setAnalysisComplete(true);
      setActiveStep(1);
    }, 3000);
  };

  const toggleCountry = (code: string) => {
    setBlockedCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const mockAnalysis = {
    totalSms: 125847,
    suspectedFraud: 8432,
    fraudPercent: 6.7,
    estimatedCost: 2847.12,
    monthlyProjection: 949.04,
    topCountries: [
      { country: 'Indonesia', percent: 34 },
      { country: 'Philippines', percent: 22 },
      { country: 'Nigeria', percent: 18 },
    ],
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Connect Your SMS Provider
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              We'll analyze your historical SMS data to identify fraud patterns.
            </Typography>

            {analyzing ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography>Analyzing your SMS history...</Typography>
                <Typography variant="caption" color="text.secondary">
                  This may take a few moments
                </Typography>
              </Box>
            ) : (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Twilio Credentials
                </Typography>
                <TextField
                  fullWidth
                  label="Account SID"
                  value={twilioSid}
                  onChange={(e) => setTwilioSid(e.target.value)}
                  margin="normal"
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
                <TextField
                  fullWidth
                  label="Auth Token"
                  type="password"
                  value={twilioToken}
                  onChange={(e) => setTwilioToken(e.target.value)}
                  margin="normal"
                />
                <Button
                  fullWidth
                  variant="contained"
                  sx={{ mt: 2 }}
                  onClick={handleConnect}
                  disabled={!twilioSid || !twilioToken}
                >
                  Connect & Analyze
                </Button>
                <Button
                  fullWidth
                  variant="text"
                  sx={{ mt: 1 }}
                  onClick={() => {
                    setAnalysisComplete(true);
                    setActiveStep(1);
                  }}
                >
                  Skip for now
                </Button>
              </Box>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Historical Analysis Results
            </Typography>

            <Alert severity="warning" sx={{ mb: 3 }}>
              We found potential SMS pumping fraud in your historical data!
            </Alert>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      Total SMS (90 days)
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {mockAnalysis.totalSms.toLocaleString()}
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
                    <Typography variant="h5" fontWeight={700} color="error">
                      {mockAnalysis.suspectedFraud.toLocaleString()} ({mockAnalysis.fraudPercent}%)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card variant="outlined" sx={{ bgcolor: 'error.light' }}>
                  <CardContent>
                    <Typography variant="caption">Estimated Fraud Cost</Typography>
                    <Typography variant="h5" fontWeight={700}>
                      ${mockAnalysis.estimatedCost.toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card variant="outlined" sx={{ bgcolor: 'success.light' }}>
                  <CardContent>
                    <Typography variant="caption">Projected Monthly Savings</Typography>
                    <Typography variant="h5" fontWeight={700}>
                      ${mockAnalysis.monthlyProjection.toLocaleString()}/mo
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Typography variant="subtitle2" gutterBottom>
              Top Fraud Sources
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              {mockAnalysis.topCountries.map((c) => (
                <Chip
                  key={c.country}
                  label={`${c.country} (${c.percent}%)`}
                  color="error"
                  variant="outlined"
                />
              ))}
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={() => setActiveStep(2)}
            >
              Configure Protection
            </Button>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Configure Geographic Rules
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Select countries to block. We've pre-selected high-risk countries.
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 3 }}>
              {COUNTRIES.map((country) => (
                <Chip
                  key={country.code}
                  label={country.name}
                  variant={blockedCountries.includes(country.code) ? 'filled' : 'outlined'}
                  color={
                    blockedCountries.includes(country.code)
                      ? 'error'
                      : country.risk === 'high'
                      ? 'error'
                      : country.risk === 'medium'
                      ? 'warning'
                      : 'default'
                  }
                  onClick={() => toggleCountry(country.code)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              {blockedCountries.length} countries will be blocked.
              You can change these settings anytime.
            </Alert>

            <Button
              fullWidth
              variant="contained"
              onClick={() => setActiveStep(3)}
            >
              Continue
            </Button>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <CheckIcon sx={{ fontSize: 64, color: 'success.main' }} />
              <Typography variant="h6" gutterBottom>
                You're all set!
              </Typography>
            </Box>

            <Typography variant="subtitle2" gutterBottom>
              Your API Keys
            </Typography>
            <Box
              sx={{
                bgcolor: '#1e293b',
                color: '#e2e8f0',
                p: 2,
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                mb: 2,
              }}
            >
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                Test Key:
              </Typography>
              <br />
              sk_test_YOUR_TEST_KEY_HERE
              <br /><br />
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                Live Key:
              </Typography>
              <br />
              sk_live_YOUR_LIVE_KEY_HERE
            </Box>

            <Alert severity="warning" sx={{ mb: 3 }}>
              Save these keys securely. You won't be able to see them again.
            </Alert>

            <Button
              fullWidth
              variant="contained"
              onClick={() => navigate('/')}
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
        py: 4,
      }}
    >
      <Box sx={{ maxWidth: 600, mx: 'auto', px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 4 }}>
          <ShieldIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight={700}>
            SMSGuard Setup
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Card>
          <CardContent sx={{ p: 4 }}>
            {renderStepContent(activeStep)}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

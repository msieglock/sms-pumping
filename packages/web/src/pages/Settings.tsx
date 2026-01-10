import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Slider,
  Tabs,
  Tab,
  Divider,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Refresh as RotateIcon,
  Security as SecurityIcon,
  Public as GeoIcon,
  Speed as SpeedIcon,
  AttachMoney as MoneyIcon,
  Notifications as NotifyIcon,
} from '@mui/icons-material';
import { useAPIKeys, useRotateAPIKey, useGeoRules, useUpdateGeoRules } from '../hooks/useApi';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../hooks/useAuthStore';

const API_BASE = import.meta.env.VITE_API_URL || '/v1';

// Country list for geo rules
const COUNTRIES = [
  { code: 'US', name: 'United States', risk: 'low' },
  { code: 'CA', name: 'Canada', risk: 'low' },
  { code: 'GB', name: 'United Kingdom', risk: 'low' },
  { code: 'DE', name: 'Germany', risk: 'low' },
  { code: 'FR', name: 'France', risk: 'low' },
  { code: 'JP', name: 'Japan', risk: 'low' },
  { code: 'AU', name: 'Australia', risk: 'low' },
  { code: 'BR', name: 'Brazil', risk: 'medium' },
  { code: 'IN', name: 'India', risk: 'medium' },
  { code: 'MX', name: 'Mexico', risk: 'medium' },
  { code: 'RU', name: 'Russia', risk: 'high' },
  { code: 'ID', name: 'Indonesia', risk: 'high' },
  { code: 'PH', name: 'Philippines', risk: 'high' },
  { code: 'NG', name: 'Nigeria', risk: 'high' },
  { code: 'PK', name: 'Pakistan', risk: 'high' },
  { code: 'VN', name: 'Vietnam', risk: 'high' },
  { code: 'TH', name: 'Thailand', risk: 'medium' },
  { code: 'BD', name: 'Bangladesh', risk: 'high' },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Settings() {
  const [tab, setTab] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [rotateDialog, setRotateDialog] = useState<{ open: boolean; keyId: string | null }>({ open: false, keyId: null });
  const [newKey, setNewKey] = useState<string | null>(null);
  const { token } = useAuthStore();

  // Risk tolerance settings
  const [riskSettings, setRiskSettings] = useState({
    blockThreshold: 70,
    reviewThreshold: 30,
    autoBlockHighRisk: true,
  });

  // Velocity limits
  const [velocityLimits, setVelocityLimits] = useState({
    maxPerMinute: 10,
    maxPerHour: 100,
    maxPerDay: 500,
    uniqueNumbersPerHour: 50,
  });

  // SMS cost
  const [smsCost, setSmsCost] = useState(0.08);

  const { data: apiKeys } = useAPIKeys();
  const { data: geoRules } = useGeoRules();
  const rotateMutation = useRotateAPIKey();
  const updateGeoRulesMutation = useUpdateGeoRules();

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setSnackbar({ open: true, message: 'API key copied to clipboard' });
  };

  const handleRotateKey = () => {
    if (rotateDialog.keyId) {
      rotateMutation.mutate(rotateDialog.keyId, {
        onSuccess: (data) => {
          setNewKey(data?.key || null);
          setSnackbar({ open: true, message: 'API key rotated successfully' });
        },
      });
    }
    setRotateDialog({ open: false, keyId: null });
  };

  const handleToggleCountry = (countryCode: string, currentlyBlocked: boolean) => {
    const currentRules = geoRules || [];
    const newRules = currentlyBlocked
      ? currentRules.filter((r) => r.country_code !== countryCode)
      : [...currentRules.filter((r) => r.country_code !== countryCode), { country_code: countryCode, action: 'block' as const }];

    updateGeoRulesMutation.mutate(newRules.map((r) => ({ country_code: r.country_code, action: r.action })));
  };

  const isCountryBlocked = (code: string) => {
    return geoRules?.some((r) => r.country_code === code && r.action === 'block');
  };

  const handleSaveSettings = async () => {
    try {
      await fetch(`${API_BASE}/config/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          risk_settings: riskSettings,
          velocity_limits: velocityLimits,
          sms_cost: smsCost,
        }),
      });
      setSnackbar({ open: true, message: 'Settings saved successfully' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to save settings' });
    }
  };

  const blockedCountries = COUNTRIES.filter(c => isCountryBlocked(c.code));
  const highRiskCountries = COUNTRIES.filter(c => c.risk === 'high');

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
        Settings
      </Typography>

      <Card>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: { xs: 1, sm: 2 } }}
        >
          <Tab icon={<SecurityIcon />} label="API Keys" iconPosition="start" sx={{ minWidth: 'auto', px: { xs: 1, sm: 2 } }} />
          <Tab icon={<GeoIcon />} label="Geo Rules" iconPosition="start" sx={{ minWidth: 'auto', px: { xs: 1, sm: 2 } }} />
          <Tab icon={<SpeedIcon />} label="Risk" iconPosition="start" sx={{ minWidth: 'auto', px: { xs: 1, sm: 2 } }} />
          <Tab icon={<MoneyIcon />} label="Billing" iconPosition="start" sx={{ minWidth: 'auto', px: { xs: 1, sm: 2 } }} />
        </Tabs>

        <CardContent>
          {/* API Keys Tab */}
          <TabPanel value={tab} index={0}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Use these keys to authenticate your API requests. Keep your live key secret!
            </Typography>

            {newKey && (
              <Alert severity="success" sx={{ my: 2 }} onClose={() => setNewKey(null)}>
                New API key generated. Copy it now - you won't be able to see it again:
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <code style={{ fontSize: '0.75rem' }}>{newKey}</code>
                  <IconButton size="small" onClick={() => handleCopyKey(newKey)}>
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Alert>
            )}

            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 500 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Key</TableCell>
                    <TableCell>Env</TableCell>
                    <TableCell>Last Used</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {apiKeys?.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell>{key.name}</TableCell>
                      <TableCell>
                        <code style={{ fontSize: '0.75rem' }}>{key.key_prefix}...</code>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={key.environment}
                          color={key.environment === 'live' ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {key.last_used_at
                          ? formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true })
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Rotate key">
                          <IconButton
                            size="small"
                            onClick={() => setRotateDialog({ open: true, keyId: key.id })}
                          >
                            <RotateIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Quick Start Code
            </Typography>
            <Box
              component="pre"
              sx={{
                bgcolor: 'background.default',
                p: 2,
                borderRadius: 1,
                overflow: 'auto',
                fontSize: '0.75rem',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
{`// Node.js
const SMSGuard = require('@smsguard/node');
const guard = new SMSGuard('${apiKeys?.[0]?.key_prefix || 'sk_live_'}...');

const check = await guard.check({
  phoneNumber: '+15551234567',
  ipAddress: req.ip,
});

if (check.decision === 'allow') {
  // Send SMS
}`}
            </Box>
          </TabPanel>

          {/* Geographic Rules Tab */}
          <TabPanel value={tab} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Blocked Countries ({blockedCountries.length})
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  SMS requests from these countries will be automatically blocked
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                  {blockedCountries.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No countries blocked. Click on countries below to block them.
                    </Typography>
                  ) : (
                    blockedCountries.map((country) => (
                      <Chip
                        key={country.code}
                        label={country.name}
                        color="error"
                        onDelete={() => handleToggleCountry(country.code, true)}
                        size="small"
                      />
                    ))
                  )}
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Quick Actions
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={() => {
                      highRiskCountries.forEach(c => {
                        if (!isCountryBlocked(c.code)) {
                          handleToggleCountry(c.code, false);
                        }
                      });
                    }}
                  >
                    Block All High-Risk
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      blockedCountries.forEach(c => {
                        handleToggleCountry(c.code, true);
                      });
                    }}
                  >
                    Unblock All
                  </Button>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  All Countries
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {COUNTRIES.map((country) => (
                    <Chip
                      key={country.code}
                      label={`${country.name}`}
                      variant={isCountryBlocked(country.code) ? 'filled' : 'outlined'}
                      color={
                        isCountryBlocked(country.code)
                          ? 'error'
                          : country.risk === 'high'
                          ? 'error'
                          : country.risk === 'medium'
                          ? 'warning'
                          : 'default'
                      }
                      onClick={() => handleToggleCountry(country.code, isCountryBlocked(country.code) || false)}
                      size="small"
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                  Color legend: <Chip label="Low Risk" size="small" sx={{ mx: 0.5 }} />
                  <Chip label="Medium Risk" color="warning" size="small" sx={{ mx: 0.5 }} />
                  <Chip label="High Risk" color="error" size="small" sx={{ mx: 0.5 }} />
                </Typography>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Risk Tolerance Tab */}
          <TabPanel value={tab} index={2}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Fraud Score Thresholds
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Set when to block, review, or allow SMS requests based on fraud score (0-100)
                </Typography>

                <Box sx={{ mt: 3, px: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Block Threshold: {riskSettings.blockThreshold}+
                  </Typography>
                  <Slider
                    value={riskSettings.blockThreshold}
                    onChange={(_, v) => setRiskSettings({ ...riskSettings, blockThreshold: v as number })}
                    min={50}
                    max={100}
                    marks={[
                      { value: 50, label: '50' },
                      { value: 70, label: '70' },
                      { value: 100, label: '100' },
                    ]}
                    color="error"
                  />

                  <Typography variant="body2" gutterBottom sx={{ mt: 3 }}>
                    Review Threshold: {riskSettings.reviewThreshold}-{riskSettings.blockThreshold - 1}
                  </Typography>
                  <Slider
                    value={riskSettings.reviewThreshold}
                    onChange={(_, v) => setRiskSettings({ ...riskSettings, reviewThreshold: v as number })}
                    min={10}
                    max={riskSettings.blockThreshold - 1}
                    marks={[
                      { value: 10, label: '10' },
                      { value: 30, label: '30' },
                      { value: 50, label: '50' },
                    ]}
                    color="warning"
                  />

                  <Alert severity="info" sx={{ mt: 3 }}>
                    <Typography variant="body2">
                      <strong>0-{riskSettings.reviewThreshold - 1}:</strong> Auto Allow<br />
                      <strong>{riskSettings.reviewThreshold}-{riskSettings.blockThreshold - 1}:</strong> Send to Review Queue<br />
                      <strong>{riskSettings.blockThreshold}+:</strong> Auto Block
                    </Typography>
                  </Alert>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Velocity Limits
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Set rate limits to prevent abuse
                </Typography>

                <Box sx={{ mt: 3 }}>
                  <TextField
                    fullWidth
                    label="Max requests per minute"
                    type="number"
                    value={velocityLimits.maxPerMinute}
                    onChange={(e) => setVelocityLimits({ ...velocityLimits, maxPerMinute: parseInt(e.target.value) })}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Max requests per hour"
                    type="number"
                    value={velocityLimits.maxPerHour}
                    onChange={(e) => setVelocityLimits({ ...velocityLimits, maxPerHour: parseInt(e.target.value) })}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Max requests per day"
                    type="number"
                    value={velocityLimits.maxPerDay}
                    onChange={(e) => setVelocityLimits({ ...velocityLimits, maxPerDay: parseInt(e.target.value) })}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Max unique numbers per hour"
                    type="number"
                    value={velocityLimits.uniqueNumbersPerHour}
                    onChange={(e) => setVelocityLimits({ ...velocityLimits, uniqueNumbersPerHour: parseInt(e.target.value) })}
                    size="small"
                  />
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Button variant="contained" onClick={handleSaveSettings}>
                  Save Risk Settings
                </Button>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Billing Config Tab */}
          <TabPanel value={tab} index={3}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  SMS Cost Configuration
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Set your average SMS cost to calculate fraud savings accurately
                </Typography>

                <TextField
                  fullWidth
                  label="Average SMS Cost"
                  type="number"
                  value={smsCost}
                  onChange={(e) => setSmsCost(parseFloat(e.target.value))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  helperText="This is used to calculate your fraud savings"
                  sx={{ mt: 2 }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Savings Calculation
                </Typography>
                <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1, mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Fraud Savings = Blocked SMS x ${smsCost.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Your Fee = 15% of Fraud Savings
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2">
                    Example: If we block 10,000 SMS
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    Your Savings: ${(10000 * smsCost).toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Our Fee: ${(10000 * smsCost * 0.15).toFixed(2)}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Button variant="contained" onClick={handleSaveSettings}>
                  Save Billing Settings
                </Button>
              </Grid>
            </Grid>
          </TabPanel>
        </CardContent>
      </Card>

      <Dialog open={rotateDialog.open} onClose={() => setRotateDialog({ open: false, keyId: null })}>
        <DialogTitle>Rotate API Key</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to rotate this API key? The old key will be invalidated immediately.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRotateDialog({ open: false, keyId: null })}>Cancel</Button>
          <Button onClick={handleRotateKey} color="primary" variant="contained">
            Rotate Key
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ open: false, message: '' })}
        message={snackbar.message}
      />
    </Box>
  );
}

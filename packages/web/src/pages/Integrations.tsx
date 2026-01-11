import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Link as LinkIcon,
  CheckCircle as ConnectedIcon,
  Upload as ImportIcon,
  Sync as SyncIcon,
  ContentCopy as CopyIcon,
  Webhook as WebhookIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../hooks/useAuthStore';

const API_BASE = import.meta.env.VITE_API_URL || '/v1';

interface Integration {
  id: string;
  name: string;
  description: string;
  connected: boolean;
  lastSync?: string;
  fields: { name: string; label: string; placeholder: string; type?: string }[];
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'Connect your Twilio account to automatically protect SMS verifications',
    connected: false,
    fields: [
      { name: 'accountSid', label: 'Account SID', placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { name: 'authToken', label: 'Auth Token', placeholder: 'Your Twilio Auth Token', type: 'password' },
    ],
  },
  {
    id: 'vonage',
    name: 'Vonage (Nexmo)',
    description: 'Integrate with Vonage SMS API for fraud prevention',
    connected: false,
    fields: [
      { name: 'apiKey', label: 'API Key', placeholder: 'Your Vonage API Key' },
      { name: 'apiSecret', label: 'API Secret', placeholder: 'Your Vonage API Secret', type: 'password' },
    ],
  },
  {
    id: 'messagebird',
    name: 'MessageBird',
    description: 'Protect your MessageBird SMS traffic from fraud',
    connected: false,
    fields: [
      { name: 'apiKey', label: 'API Key', placeholder: 'Your MessageBird API Key', type: 'password' },
    ],
  },
  {
    id: 'plivo',
    name: 'Plivo',
    description: 'Connect Plivo for automatic SMS fraud detection',
    connected: false,
    fields: [
      { name: 'authId', label: 'Auth ID', placeholder: 'Your Plivo Auth ID' },
      { name: 'authToken', label: 'Auth Token', placeholder: 'Your Plivo Auth Token', type: 'password' },
    ],
  },
  {
    id: 'sinch',
    name: 'Sinch',
    description: 'Integrate Sinch SMS API with SMSGuard protection',
    connected: false,
    fields: [
      { name: 'servicePlanId', label: 'Service Plan ID', placeholder: 'Your Sinch Service Plan ID' },
      { name: 'apiToken', label: 'API Token', placeholder: 'Your Sinch API Token', type: 'password' },
    ],
  },
  {
    id: 'aws-sns',
    name: 'AWS SNS',
    description: 'Protect Amazon SNS SMS messages from pumping fraud',
    connected: false,
    fields: [
      { name: 'accessKeyId', label: 'Access Key ID', placeholder: 'AKIAIOSFODNN7EXAMPLE' },
      { name: 'secretAccessKey', label: 'Secret Access Key', placeholder: 'Your AWS Secret Access Key', type: 'password' },
      { name: 'region', label: 'Region', placeholder: 'us-east-1' },
    ],
  },
  {
    id: 'klaviyo',
    name: 'Klaviyo',
    description: 'Connect Klaviyo to protect marketing SMS from fraud',
    connected: false,
    fields: [
      { name: 'apiKey', label: 'Private API Key', placeholder: 'pk_xxxxxxxxxxxxxxxxxxxxxxxx', type: 'password' },
    ],
  },
];

const PROVIDER_DOCS: Record<string, string> = {
  twilio: 'https://console.twilio.com',
  vonage: 'https://dashboard.nexmo.com/settings',
  messagebird: 'https://dashboard.messagebird.com/en/developers/access',
  plivo: 'https://console.plivo.com/dashboard/',
  sinch: 'https://dashboard.sinch.com/sms/api/rest',
  'aws-sns': 'https://console.aws.amazon.com/iam/home#/security_credentials',
  klaviyo: 'https://www.klaviyo.com/settings/account/api-keys',
};

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
  const [connectDialog, setConnectDialog] = useState<{ open: boolean; integration: Integration | null }>({
    open: false,
    integration: null,
  });
  const [importDialog, setImportDialog] = useState(false);
  const [selectedImportProvider, setSelectedImportProvider] = useState<string | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState('30d');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [webhookUrls, setWebhookUrls] = useState<Record<string, { url: string; instructions: string }>>({});
  const { token } = useAuthStore();

  // Fetch connected integrations on mount
  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch(`${API_BASE}/integrations`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.data) {
        // Update integration status based on API response
        const connectedProviders: string[] = [];
        setIntegrations(prev => prev.map(integration => {
          const connected = data.data.find((i: any) => i.provider === integration.id);
          if (connected?.status === 'connected') {
            connectedProviders.push(integration.id);
          }
          return {
            ...integration,
            connected: connected?.status === 'connected',
            lastSync: connected?.last_sync_at,
          };
        }));
        // Fetch webhook URLs for connected providers
        for (const providerId of connectedProviders) {
          fetchWebhookUrl(providerId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch integrations:', err);
    }
  };

  const fetchWebhookUrl = async (providerId: string) => {
    try {
      const response = await fetch(`${API_BASE}/integrations/${providerId}/webhook-url`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.data) {
        setWebhookUrls(prev => ({
          ...prev,
          [providerId]: {
            url: data.data.webhook_url,
            instructions: data.data.setup_instructions,
          },
        }));
      }
    } catch (err) {
      console.error(`Failed to fetch webhook URL for ${providerId}:`, err);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage({ type: 'success', text: 'Webhook URL copied to clipboard' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to copy to clipboard' });
    }
  };

  const handleConnect = async () => {
    if (!connectDialog.integration) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/integrations/${connectDialog.integration.id}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Successfully connected to ${connectDialog.integration.name}` });
        const providerId = connectDialog.integration.id;
        setConnectDialog({ open: false, integration: null });
        setCredentials({});
        fetchIntegrations();
        // Fetch webhook URL for the newly connected provider
        fetchWebhookUrl(providerId);
      } else {
        setMessage({ type: 'error', text: data.error?.message || 'Failed to connect' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to connect. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async (providerId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/integrations/${providerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Integration disconnected' });
        fetchIntegrations();
      } else {
        setMessage({ type: 'error', text: data.error?.message || 'Failed to disconnect' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to disconnect. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async (providerId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/integrations/${providerId}/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Sync completed successfully' });
        fetchIntegrations();
      } else {
        setMessage({ type: 'error', text: data.error?.message || 'Sync failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Sync failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedImportProvider) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/integrations/import-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider: selectedImportProvider,
          dateRange: selectedDateRange,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Imported ${data.data?.imported || 0} historical transactions` });
        setImportDialog(false);
      } else {
        setMessage({ type: 'error', text: data.error?.message || 'Failed to import' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to import. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const connectedProviders = integrations.filter(i => i.connected);

  return (
    <Box>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: 2,
        mb: 3
      }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            Integrations
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            Connect your SMS providers to automatically protect all outgoing messages
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<ImportIcon />}
          onClick={() => setImportDialog(true)}
          disabled={connectedProviders.length === 0}
          size="small"
          sx={{ flexShrink: 0 }}
        >
          Import History
        </Button>
      </Box>

      {message && (
        <Alert
          severity={message.type}
          sx={{ mb: 3 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        {integrations.map((integration) => (
          <Grid item xs={12} md={6} lg={4} key={integration.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: 'background.default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 700,
                      }}
                    >
                      {integration.name.charAt(0)}
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {integration.name}
                      </Typography>
                      {integration.connected && (
                        <Chip
                          icon={<ConnectedIcon />}
                          label="Connected"
                          color="success"
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flex: 1, minHeight: 40 }}>
                  {integration.description}
                </Typography>

                {integration.connected ? (
                  <Box>
                    {webhookUrls[integration.id] && (
                      <Box sx={{ mb: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <WebhookIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" fontWeight={600} color="text.secondary">
                            Webhook URL
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              flex: 1,
                              fontFamily: 'monospace',
                              fontSize: '0.7rem',
                              wordBreak: 'break-all',
                              color: 'text.primary',
                            }}
                          >
                            {webhookUrls[integration.id].url}
                          </Typography>
                          <Button
                            size="small"
                            sx={{ minWidth: 'auto', p: 0.5 }}
                            onClick={() => copyToClipboard(webhookUrls[integration.id].url)}
                          >
                            <CopyIcon sx={{ fontSize: 16 }} />
                          </Button>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.65rem' }}>
                          {webhookUrls[integration.id].instructions}
                        </Typography>
                      </Box>
                    )}
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Last synced: {integration.lastSync ? new Date(integration.lastSync).toLocaleString() : 'Never'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        startIcon={<SyncIcon />}
                        onClick={() => handleSync(integration.id)}
                        disabled={isLoading}
                      >
                        Sync Now
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleDisconnect(integration.id)}
                        disabled={isLoading}
                      >
                        Disconnect
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<LinkIcon />}
                    onClick={() => {
                      setConnectDialog({ open: true, integration });
                      setCredentials({});
                    }}
                    fullWidth
                  >
                    Connect
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            How Integrations Work
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                1. Connect Your Provider
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enter your API credentials to securely connect your SMS provider account.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                2. Automatic Protection
              </Typography>
              <Typography variant="body2" color="text.secondary">
                SMSGuard automatically intercepts and analyzes all SMS requests before they're sent.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                3. Real-time Blocking
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fraudulent requests are blocked in real-time, saving you money on every prevented SMS.
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Connect Dialog */}
      <Dialog
        open={connectDialog.open}
        onClose={() => setConnectDialog({ open: false, integration: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Connect {connectDialog.integration?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
            Enter your {connectDialog.integration?.name} API credentials to enable automatic fraud protection.
          </Typography>

          {connectDialog.integration?.fields.map((field) => (
            <TextField
              key={field.name}
              fullWidth
              label={field.label}
              type={field.type || 'text'}
              value={credentials[field.name] || ''}
              onChange={(e) => setCredentials({ ...credentials, [field.name]: e.target.value })}
              placeholder={field.placeholder}
              sx={{ mb: 2 }}
            />
          ))}

          {connectDialog.integration && (
            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="body2">
                Find your credentials in your{' '}
                <a
                  href={PROVIDER_DOCS[connectDialog.integration.id]}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'inherit' }}
                >
                  {connectDialog.integration.name} Console
                </a>
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConnectDialog({ open: false, integration: null })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConnect}
            disabled={isLoading || !connectDialog.integration?.fields.every(f => credentials[f.name])}
          >
            {isLoading ? <CircularProgress size={20} /> : 'Connect'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialog} onClose={() => setImportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Historical Data</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
            Import your historical SMS data to analyze past fraud patterns and estimate savings.
          </Typography>

          {connectedProviders.length === 0 ? (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Please connect at least one SMS provider to import historical data.
              </Typography>
            </Alert>
          ) : (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Select Provider
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {connectedProviders.map((provider) => (
                    <Chip
                      key={provider.id}
                      label={provider.name}
                      variant={selectedImportProvider === provider.id ? 'filled' : 'outlined'}
                      color={selectedImportProvider === provider.id ? 'primary' : 'default'}
                      onClick={() => setSelectedImportProvider(provider.id)}
                      clickable
                    />
                  ))}
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Select Time Range
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {['7d', '30d', '90d', 'all'].map((range) => (
                    <Chip
                      key={range}
                      label={range === 'all' ? 'All Time' : `Last ${range}`}
                      variant={selectedDateRange === range ? 'filled' : 'outlined'}
                      color={selectedDateRange === range ? 'primary' : 'default'}
                      onClick={() => setSelectedDateRange(range)}
                      clickable
                    />
                  ))}
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  What will be imported
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Phone numbers (hashed for privacy)<br />
                  • Message timestamps<br />
                  • Delivery status<br />
                  • Geographic data
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={isLoading || !selectedImportProvider}
          >
            {isLoading ? <CircularProgress size={20} /> : 'Start Import'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

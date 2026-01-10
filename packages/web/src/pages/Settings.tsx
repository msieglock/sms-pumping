import { useState } from 'react';
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
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Refresh as RotateIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useAPIKeys, useRotateAPIKey, useGeoRules, useUpdateGeoRules } from '../hooks/useApi';
import { formatDistanceToNow } from 'date-fns';

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
  { code: 'ID', name: 'Indonesia', risk: 'high' },
  { code: 'PH', name: 'Philippines', risk: 'high' },
  { code: 'NG', name: 'Nigeria', risk: 'high' },
  { code: 'PK', name: 'Pakistan', risk: 'high' },
];

export default function Settings() {
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [rotateDialog, setRotateDialog] = useState<{ open: boolean; keyId: string | null }>({ open: false, keyId: null });
  const [newKey, setNewKey] = useState<string | null>(null);

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

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                API Keys
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Use these keys to authenticate your API requests. Keep your live key secret!
              </Typography>

              {newKey && (
                <Alert severity="success" sx={{ my: 2 }} onClose={() => setNewKey(null)}>
                  New API key generated. Copy it now - you won't be able to see it again:
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <code>{newKey}</code>
                    <IconButton size="small" onClick={() => handleCopyKey(newKey)}>
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Alert>
              )}

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Key</TableCell>
                      <TableCell>Environment</TableCell>
                      <TableCell>Last Used</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {apiKeys?.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell>{key.name}</TableCell>
                        <TableCell>
                          <code>{key.key_prefix}...</code>
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
                              <RotateIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Geographic Rules
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Block SMS requests from specific countries. High-risk countries are marked in red.
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {COUNTRIES.map((country) => (
                  <Chip
                    key={country.code}
                    label={`${country.name} (${country.code})`}
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
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Integration Code
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Add this code to your application to start protecting SMS:
              </Typography>

              <Box
                component="pre"
                sx={{
                  bgcolor: '#1e293b',
                  color: '#e2e8f0',
                  p: 2,
                  borderRadius: 1,
                  overflow: 'auto',
                  fontSize: '0.875rem',
                }}
              >
{`const SMSGuard = require('smsguard');
const guard = new SMSGuard('sk_live_...');

// Before sending SMS
const check = await guard.check({
  phoneNumber: '+15551234567',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});

if (check.decision === 'allow') {
  await twilio.messages.create({...});
  await guard.report(check.id, { sent: true });
}`}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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

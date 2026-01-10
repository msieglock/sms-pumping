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
  Divider,
  LinearProgress,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CreditCard as CardIcon,
  Receipt as InvoiceIcon,
  TrendingUp as SavingsIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useBillingSummary } from '../hooks/useApi';
import { useAuthStore } from '../hooks/useAuthStore';
import { format, subMonths } from 'date-fns';

const API_BASE = import.meta.env.VITE_API_URL || '/v1';

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export default function Billing() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: billingSummary } = useBillingSummary(selectedMonth);
  const { organization, token } = useAuthStore();

  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return format(date, 'yyyy-MM');
  });

  const isTrial = organization?.plan === 'trial';
  const trialEndsAt = organization?.trial_ends_at ? new Date(organization.trial_ends_at) : null;
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  const handleUpgrade = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/billing/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          success_url: `${window.location.origin}/billing?success=true`,
          cancel_url: `${window.location.origin}/billing?canceled=true`,
        }),
      });

      const data = await response.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      } else {
        setError(data.error?.message || 'Failed to create checkout session');
      }
    } catch (err) {
      setError('Failed to connect to billing service');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/billing/portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          return_url: `${window.location.origin}/billing`,
        }),
      });

      const data = await response.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      } else {
        setError(data.error?.message || 'Failed to open billing portal');
      }
    } catch (err) {
      setError('Failed to connect to billing service');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate actual invoice amount (0 for trial users)
  const actualInvoice = isTrial ? 0 : (billingSummary?.total_invoice || 0);
  const actualBaseFee = isTrial ? 0 : (billingSummary?.base_fee || 100);
  const actualSavingsShare = isTrial ? 0 : (billingSummary?.our_fee || 0);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
        Billing
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {isTrial && (
          <Grid item xs={12}>
            <Card sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white'
            }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  gap: 2
                }}>
                  <Box>
                    <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Free Trial</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {daysLeft} days remaining. Upgrade to Pro to continue protection.
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    onClick={handleUpgrade}
                    disabled={isLoading}
                    sx={{
                      bgcolor: 'white',
                      color: '#1e1e1e',
                      fontWeight: 600,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                    }}
                  >
                    {isLoading ? <CircularProgress size={20} color="inherit" /> : 'Upgrade to Pro'}
                  </Button>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={((14 - daysLeft) / 14) * 100}
                  sx={{ mt: 2, bgcolor: 'rgba(255,255,255,0.3)', '& .MuiLinearProgress-bar': { bgcolor: 'white' } }}
                />
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <SavingsIcon color="success" />
                <Typography variant="h6">Fraud Savings</Typography>
              </Box>
              <Typography variant="h3" fontWeight={700} color="success.main">
                {formatMoney(billingSummary?.fraud_savings || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This month from {billingSummary?.blocked_count?.toLocaleString() || 0} blocked SMS
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <InvoiceIcon color="primary" />
                <Typography variant="h6">Current Invoice</Typography>
              </Box>
              <Typography variant="h3" fontWeight={700}>
                {isTrial ? '$0' : formatMoney(actualInvoice)}
              </Typography>
              {isTrial ? (
                <Typography variant="body2" color="text.secondary">
                  Free during trial period
                </Typography>
              ) : (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Base fee: {formatMoney(actualBaseFee)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Savings share (15%): {formatMoney(actualSavingsShare)}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CardIcon color="primary" />
                <Typography variant="h6">Payment Method</Typography>
              </Box>
              {isTrial ? (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    No payment method required during trial
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleUpgrade}
                    disabled={isLoading}
                  >
                    Add Payment Method
                  </Button>
                </Box>
              ) : (
                <Box>
                  <Typography variant="body1" gutterBottom>
                    Payment method on file
                  </Typography>
                  <Button
                    variant="text"
                    size="small"
                    onClick={handleManageBilling}
                    disabled={isLoading}
                  >
                    Manage Billing
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pricing Plans
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ height: '100%', border: isTrial ? '2px solid' : '1px solid', borderColor: isTrial ? 'primary.main' : 'divider' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="h6" fontWeight={600}>
                          Free Trial
                        </Typography>
                        {isTrial && <Chip label="Current" color="primary" size="small" />}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 2 }}>
                        <Typography variant="h4" fontWeight={700}>$0</Typography>
                        <Typography color="text.secondary">for 14 days</Typography>
                      </Box>
                      <Box sx={{ mt: 2 }}>
                        {['1,000 SMS checks', 'Basic fraud detection', 'Dashboard access', 'Email support'].map((feature) => (
                          <Box key={feature} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
                            <Typography variant="body2">{feature}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ height: '100%', border: !isTrial ? '2px solid' : '1px solid', borderColor: !isTrial ? 'primary.main' : 'divider' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="h6" fontWeight={600}>
                          Pro
                        </Typography>
                        {!isTrial && <Chip label="Current" color="primary" size="small" />}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 2 }}>
                        <Typography variant="h4" fontWeight={700}>$100</Typography>
                        <Typography color="text.secondary">/month + 15% savings share</Typography>
                      </Box>
                      <Box sx={{ mt: 2 }}>
                        {[
                          'Unlimited SMS checks',
                          'Advanced AI fraud detection',
                          'Real-time analytics',
                          'API access',
                          'Priority support',
                          'Custom integrations',
                        ].map((feature) => (
                          <Box key={feature} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
                            <Typography variant="body2">{feature}</Typography>
                          </Box>
                        ))}
                      </Box>
                      {isTrial && (
                        <Button
                          fullWidth
                          variant="contained"
                          sx={{ mt: 2 }}
                          onClick={handleUpgrade}
                          disabled={isLoading}
                        >
                          {isLoading ? <CircularProgress size={20} /> : 'Upgrade Now'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Usage History</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {months.slice(0, 4).map((month) => (
                    <Chip
                      key={month}
                      label={format(new Date(month + '-01'), 'MMM')}
                      variant={selectedMonth === month ? 'filled' : 'outlined'}
                      color={selectedMonth === month ? 'primary' : 'default'}
                      onClick={() => setSelectedMonth(month)}
                      size="small"
                    />
                  ))}
                </Box>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Period</TableCell>
                      <TableCell align="right">Checks</TableCell>
                      <TableCell align="right">Blocked</TableCell>
                      <TableCell align="right">Savings</TableCell>
                      <TableCell align="right">Invoice</TableCell>
                      <TableCell align="right">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>{format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</TableCell>
                      <TableCell align="right">{billingSummary?.total_checks?.toLocaleString() || 0}</TableCell>
                      <TableCell align="right">{billingSummary?.blocked_count?.toLocaleString() || 0}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600 }}>
                        {formatMoney(billingSummary?.fraud_savings || 0)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {isTrial ? '$0' : formatMoney(actualInvoice)}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          size="small"
                          label={isTrial ? 'Trial' : 'Paid'}
                          color={isTrial ? 'warning' : 'success'}
                        />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

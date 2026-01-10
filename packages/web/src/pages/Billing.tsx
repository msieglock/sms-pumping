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
} from '@mui/material';
import {
  CreditCard as CardIcon,
  Receipt as InvoiceIcon,
  TrendingUp as SavingsIcon,
} from '@mui/icons-material';
import { useBillingSummary } from '../hooks/useApi';
import { useAuthStore } from '../hooks/useAuthStore';
import { format, subMonths } from 'date-fns';

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export default function Billing() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const { data: billingSummary, isLoading } = useBillingSummary(selectedMonth);
  const { organization } = useAuthStore();

  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return format(date, 'yyyy-MM');
  });

  const isTrial = organization?.plan === 'trial';
  const trialEndsAt = organization?.trial_ends_at ? new Date(organization.trial_ends_at) : null;
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Billing
      </Typography>

      <Grid container spacing={3}>
        {isTrial && (
          <Grid item xs={12}>
            <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6">Free Trial</Typography>
                    <Typography>
                      {daysLeft} days remaining. Upgrade to Pro to continue protection.
                    </Typography>
                  </Box>
                  <Button variant="contained" color="primary">
                    Upgrade to Pro
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
                {formatMoney(billingSummary?.total_invoice || 0)}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Base fee: {formatMoney(billingSummary?.base_fee || 100)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Savings share (15%): {formatMoney(billingSummary?.our_fee || 0)}
                </Typography>
              </Box>
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
                  <Typography variant="body1" gutterBottom>
                    No payment method on file
                  </Typography>
                  <Button variant="outlined" size="small">
                    Add Payment Method
                  </Button>
                </Box>
              ) : (
                <Box>
                  <Typography variant="body1">
                    Visa ending in 4242
                  </Typography>
                  <Button variant="text" size="small">
                    Update
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
                Pricing Breakdown
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    SMSGuard Pro
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography variant="h4" fontWeight={700}>
                      $100
                    </Typography>
                    <Typography color="text.secondary">/month</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Base subscription includes:
                  </Typography>
                  <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                    <li>Unlimited SMS checks</li>
                    <li>Real-time fraud detection</li>
                    <li>AI-powered review</li>
                    <li>Analytics dashboard</li>
                    <li>API access</li>
                  </ul>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Savings Share
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography variant="h4" fontWeight={700}>
                      15%
                    </Typography>
                    <Typography color="text.secondary">of documented savings</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    We only charge when we save you money:
                  </Typography>
                  <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                    <li>Blocked SMS count x Your SMS cost</li>
                    <li>Transparent calculation</li>
                    <li>No hidden fees</li>
                    <li>Pay only for results</li>
                  </ul>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Invoice History</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {months.map((month) => (
                    <Chip
                      key={month}
                      label={format(new Date(month + '-01'), 'MMM yyyy')}
                      variant={selectedMonth === month ? 'filled' : 'outlined'}
                      color={selectedMonth === month ? 'primary' : 'default'}
                      onClick={() => setSelectedMonth(month)}
                      size="small"
                    />
                  ))}
                </Box>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Period</TableCell>
                      <TableCell align="right">Total Checks</TableCell>
                      <TableCell align="right">Blocked</TableCell>
                      <TableCell align="right">Savings</TableCell>
                      <TableCell align="right">Invoice</TableCell>
                      <TableCell align="right">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}
                      </TableCell>
                      <TableCell align="right">
                        {billingSummary?.total_checks?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell align="right">
                        {billingSummary?.blocked_count?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600 }}>
                        {formatMoney(billingSummary?.fraud_savings || 0)}
                      </TableCell>
                      <TableCell align="right" fontWeight={600}>
                        {formatMoney(billingSummary?.total_invoice || 0)}
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

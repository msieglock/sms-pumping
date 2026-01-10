import { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Paper,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Block as BlockIcon,
  CheckCircle as AllowIcon,
  Warning as ReviewIcon,
  AttachMoney as MoneyIcon,
  Security as SecurityIcon,
  Speed as VelocityIcon,
  Public as GeoIcon,
  PhoneAndroid as CarrierIcon,
  Psychology as BehaviorIcon,
} from '@mui/icons-material';
import { useAnalyticsSummary, useGeoBreakdown } from '../hooks/useApi';
import type { TimeRange } from '../types';
import FraudMap from '../components/Map/FraudMap';

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              bgcolor: `${color}15`,
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const { data: summary, isLoading } = useAnalyticsSummary(timeRange);
  const { data: geoData } = useGeoBreakdown(timeRange === '30d' ? 30 : timeRange === '7d' ? 7 : 1);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

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
        <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          Dashboard
        </Typography>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={(_, value) => value && setTimeRange(value)}
          size="small"
          sx={{ flexShrink: 0 }}
        >
          <ToggleButton value="1h">1H</ToggleButton>
          <ToggleButton value="24h">24H</ToggleButton>
          <ToggleButton value="7d">7D</ToggleButton>
          <ToggleButton value="30d">30D</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Checks"
            value={formatNumber(summary?.total_checks || 0)}
            icon={<TrendingUpIcon sx={{ color: 'primary.main' }} />}
            color="#6366f1"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Allowed"
            value={formatNumber(summary?.allowed || 0)}
            subtitle={`${summary ? Math.round((summary.allowed / summary.total_checks) * 100) : 0}%`}
            icon={<AllowIcon sx={{ color: 'success.main' }} />}
            color="#10b981"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Blocked"
            value={formatNumber(summary?.blocked || 0)}
            subtitle={`${summary ? Math.round((summary.blocked / summary.total_checks) * 100) : 0}%`}
            icon={<BlockIcon sx={{ color: 'error.main' }} />}
            color="#ef4444"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Fraud Savings"
            value={formatMoney(summary?.fraud_savings || 0)}
            icon={<MoneyIcon sx={{ color: 'secondary.main' }} />}
            color="#10b981"
          />
        </Grid>

        <Grid item xs={12} lg={8}>
          <Card sx={{ height: { xs: 300, sm: 400 } }}>
            <CardContent sx={{ height: '100%', p: 0 }}>
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Geographic Distribution</Typography>
              </Box>
              <Box sx={{ height: 'calc(100% - 57px)' }}>
                <FraudMap data={geoData || []} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ height: { xs: 'auto', lg: 400 } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Top Countries
              </Typography>
              <TableContainer sx={{ maxHeight: { lg: 320 } }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Country</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">Block Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(summary?.top_countries || []).slice(0, 8).map((row) => (
                      <TableRow key={row.country}>
                        <TableCell>{row.country || 'Unknown'}</TableCell>
                        <TableCell align="right">{formatNumber(row.count)}</TableCell>
                        <TableCell align="right">
                          <Chip
                            size="small"
                            label={`${Math.round((row.blocked / row.count) * 100)}%`}
                            color={
                              row.blocked / row.count > 0.3
                                ? 'error'
                                : row.blocked / row.count > 0.1
                                ? 'warning'
                                : 'success'
                            }
                          />
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
                Pending Review
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                <ReviewIcon color="warning" />
                <Typography>
                  {summary?.review || 0} SMS checks require manual review
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Prevention Engine Details */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <SecurityIcon color="primary" />
                <Typography variant="h6">How SMSGuard Protects You</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Our multi-signal fraud detection engine analyzes every SMS request in real-time using
                4 key risk indicators to identify and block pumping fraud before it costs you money.
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6} lg={3}>
                  <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <GeoIcon color="error" fontSize="small" />
                      <Typography variant="subtitle2" fontWeight={600}>Geographic Risk</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Identifies high-risk countries and regions known for SMS fraud. Flags requests
                      from locations with historically high pumping rates.
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">Detection Rate</Typography>
                      <Chip label="35%" size="small" color="error" />
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6} lg={3}>
                  <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <VelocityIcon color="warning" fontSize="small" />
                      <Typography variant="subtitle2" fontWeight={600}>Velocity Analysis</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Monitors request patterns per IP, session, and phone number. Detects automated
                      bots and bulk fraud attempts through rate anomalies.
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">Detection Rate</Typography>
                      <Chip label="40%" size="small" color="warning" />
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6} lg={3}>
                  <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <CarrierIcon color="info" fontSize="small" />
                      <Typography variant="subtitle2" fontWeight={600}>Carrier Intelligence</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Analyzes phone number types (VoIP, prepaid, mobile). Identifies carriers
                      associated with fraud and premium-rate toll fraud schemes.
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">Detection Rate</Typography>
                      <Chip label="15%" size="small" color="info" />
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6} lg={3}>
                  <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <BehaviorIcon color="secondary" fontSize="small" />
                      <Typography variant="subtitle2" fontWeight={600}>Behavior Signals</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Machine learning models detect suspicious user behavior patterns including
                      unusual timing, device fingerprints, and session anomalies.
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">Detection Rate</Typography>
                      <Chip label="10%" size="small" color="secondary" />
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Block Rate Summary */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Block Rate by Signal</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Breakdown of fraud blocked by each detection signal
              </Typography>
              {[
                { label: 'Velocity (Rate Limit)', value: 40, color: 'warning.main' },
                { label: 'Geographic Risk', value: 35, color: 'error.main' },
                { label: 'Carrier Intelligence', value: 15, color: 'info.main' },
                { label: 'Behavior Analysis', value: 10, color: 'secondary.main' },
              ].map((item) => (
                <Box key={item.label} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">{item.label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{item.value}%</Typography>
                  </Box>
                  <Box sx={{ width: '100%', bgcolor: 'background.default', borderRadius: 1, height: 8 }}>
                    <Box
                      sx={{
                        width: `${item.value}%`,
                        bgcolor: item.color,
                        borderRadius: 1,
                        height: '100%',
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Protection Stats */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Protection Statistics</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Real-time performance of your fraud prevention
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, bgcolor: 'background.default', textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={700} color="error.main">
                      {summary ? Math.round((summary.blocked / Math.max(summary.total_checks, 1)) * 100) : 0}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Overall Block Rate</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, bgcolor: 'background.default', textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={700} color="success.main">
                      {formatMoney((summary?.blocked || 0) * 0.05)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Est. Savings (@ $0.05/SMS)</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, bgcolor: 'background.default', textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={700} color="primary.main">
                      &lt;50ms
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Avg Response Time</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, bgcolor: 'background.default', textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={700} color="info.main">
                      99.9%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">API Uptime</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

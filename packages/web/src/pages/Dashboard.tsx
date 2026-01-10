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
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Block as BlockIcon,
  CheckCircle as AllowIcon,
  Warning as ReviewIcon,
  AttachMoney as MoneyIcon,
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Dashboard
        </Typography>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={(_, value) => value && setTimeRange(value)}
          size="small"
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

        <Grid item xs={12} md={8}>
          <Card sx={{ height: 400 }}>
            <CardContent sx={{ height: '100%', p: 0 }}>
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6">Geographic Distribution</Typography>
              </Box>
              <Box sx={{ height: 'calc(100% - 57px)' }}>
                <FraudMap data={geoData || []} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Countries
              </Typography>
              <TableContainer>
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
      </Grid>
    </Box>
  );
}

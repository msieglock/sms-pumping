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
  Button,
} from '@mui/material';
import {
  Download as DownloadIcon,
} from '@mui/icons-material';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { useAnalyticsSummary, useGeoBreakdown } from '../hooks/useApi';
import type { TimeRange } from '../types';

const COLORS = ['#10b981', '#ef4444', '#f59e0b'];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const { data: summary, isLoading } = useAnalyticsSummary(timeRange);
  const { data: geoData } = useGeoBreakdown(timeRange === '30d' ? 30 : timeRange === '7d' ? 7 : 1);

  const handleExport = () => {
    window.open(`/api/v1/export/csv?range=${timeRange}`, '_blank');
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const pieData = [
    { name: 'Allowed', value: summary?.allowed || 0 },
    { name: 'Blocked', value: summary?.blocked || 0 },
    { name: 'Review', value: summary?.review || 0 },
  ];

  const hourlyData = (summary?.hourly_distribution || []).map((item) => ({
    hour: `${item.hour}:00`,
    count: item.count,
  }));

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
          Analytics
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            size="small"
          >
            Export
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 350 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Decision Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ height: 350 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Hourly Traffic
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Country Breakdown
              </Typography>
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 500 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Country</TableCell>
                      <TableCell align="right">Total Checks</TableCell>
                      <TableCell align="right">Allowed</TableCell>
                      <TableCell align="right">Blocked</TableCell>
                      <TableCell align="right">Review</TableCell>
                      <TableCell align="right">Block Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(geoData || []).map((row) => (
                      <TableRow key={row.country}>
                        <TableCell>{row.country || 'Unknown'}</TableCell>
                        <TableCell align="right">{row.total.toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <Chip size="small" label={row.allowed} color="success" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">
                          <Chip size="small" label={row.blocked} color="error" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">
                          <Chip size="small" label={row.review} color="warning" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            size="small"
                            label={`${(row.block_rate * 100).toFixed(1)}%`}
                            color={
                              row.block_rate > 0.3
                                ? 'error'
                                : row.block_rate > 0.1
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
      </Grid>
    </Box>
  );
}

import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Grid,
  Checkbox,
  FormControlLabel,
  Collapse,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  CheckCircle as AllowIcon,
  Block as DenyIcon,
  SmartToy as AIIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Lightbulb as InsightIcon,
  Timeline as TimelineIcon,
  FilterList as FilterIcon,
  Psychology as ThinkingIcon,
  Speed as VelocityIcon,
  Public as GeoIcon,
  PhoneIphone as CarrierIcon,
  Person as BehaviorIcon,
  PlayArrow as ReanalyzeIcon,
} from '@mui/icons-material';
import { useReviewQueue, useOverrideDecision } from '../hooks/useApi';
import type { ReviewItem, SignalBreakdown } from '../types';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuthStore } from '../hooks/useAuthStore';

const API_BASE = import.meta.env.VITE_API_URL || '/v1';

function SignalBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const getColor = (v: number) => {
    if (v >= 70) return 'error';
    if (v >= 40) return 'warning';
    return 'success';
  };

  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {icon}
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={value}
          color={getColor(value)}
          sx={{ height: 20, fontSize: '0.7rem', minWidth: 36 }}
        />
      </Box>
      <LinearProgress
        variant="determinate"
        value={value}
        color={getColor(value)}
        sx={{ height: 6, borderRadius: 3 }}
      />
    </Box>
  );
}

function AIReasoningCard({ item }: { item: ReviewItem }) {
  const [expanded, setExpanded] = useState(false);

  const confidenceColor = {
    high: 'success',
    medium: 'warning',
    low: 'error',
  }[item.ai_confidence || 'low'] as 'success' | 'warning' | 'error';

  return (
    <Card variant="outlined" sx={{ mt: 2, bgcolor: 'background.default' }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AIIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2">AI Analysis</Typography>
            <Chip
              size="small"
              label={item.ai_recommendation?.toUpperCase() || 'PENDING'}
              color={item.ai_recommendation === 'allow' ? 'success' : item.ai_recommendation === 'deny' ? 'error' : 'default'}
              sx={{ height: 20 }}
            />
            <Chip
              size="small"
              variant="outlined"
              label={`${item.ai_confidence || 'N/A'} confidence`}
              color={confidenceColor}
              sx={{ height: 20 }}
            />
          </Box>
          <IconButton size="small">
            {expanded ? <CollapseIcon /> : <ExpandIcon />}
          </IconButton>
        </Box>
        <Collapse in={expanded}>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {item.ai_reasoning || 'No reasoning available yet.'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Model</Typography>
              <Typography variant="body2">Claude Sonnet</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Analysis Time</Typography>
              <Typography variant="body2">~0.8s</Typography>
            </Box>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}

function DetailedReviewDialog({
  item,
  open,
  onClose,
  onOverride,
  onReanalyze,
  isReanalyzing,
}: {
  item: ReviewItem | null;
  open: boolean;
  onClose: () => void;
  onOverride: (action: 'allow' | 'deny') => void;
  onReanalyze: () => void;
  isReanalyzing: boolean;
}) {
  if (!item) return null;

  const signals: SignalBreakdown = JSON.parse(item.signals);

  const getSignalExplanation = (signal: string, value: number) => {
    const explanations: Record<string, { low: string; medium: string; high: string }> = {
      geo_risk: {
        low: 'Phone country matches typical user base',
        medium: 'Phone from a moderately risky region',
        high: 'Phone from high-risk country for SMS pumping',
      },
      velocity_risk: {
        low: 'Normal request frequency',
        medium: 'Elevated request volume detected',
        high: 'Abnormally high request velocity',
      },
      carrier_risk: {
        low: 'Legitimate carrier with good reputation',
        medium: 'Carrier with some fraud history',
        high: 'High-risk or virtual carrier',
      },
      behavior_risk: {
        low: 'User behavior appears legitimate',
        medium: 'Some unusual behavioral patterns',
        high: 'Highly suspicious behavior patterns',
      },
    };

    const level = value >= 70 ? 'high' : value >= 40 ? 'medium' : 'low';
    return explanations[signal]?.[level] || 'No explanation available';
  };

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={fullScreen}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Review Request Details</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
              {item.check_id}
            </Typography>
          </Box>
          <Chip
            label={`Score: ${item.fraud_score}`}
            color={item.fraud_score >= 50 ? 'warning' : 'default'}
            size="small"
          />
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Left Column: Request Details */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Request Information
            </Typography>
            <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1, mb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Phone Number</Typography>
                  <Typography variant="body2" fontWeight={500}>{item.phone_number_masked}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Country</Typography>
                  <Typography variant="body2">{item.phone_country || 'Unknown'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Carrier</Typography>
                  <Typography variant="body2">{item.phone_carrier || 'Unknown'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Type</Typography>
                  <Typography variant="body2">{item.phone_type || 'Unknown'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">IP Address</Typography>
                  <Typography variant="body2">{item.ip_address || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Time</Typography>
                  <Typography variant="body2">
                    {format(new Date(item.created_at), 'MMM d, h:mm a')}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <Typography variant="subtitle2" gutterBottom>
              Signal Breakdown
            </Typography>
            <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
              <SignalBar
                label="Geographic Risk"
                value={signals.geo_risk}
                icon={<GeoIcon sx={{ fontSize: 16 }} />}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, ml: 3 }}>
                {getSignalExplanation('geo_risk', signals.geo_risk)}
              </Typography>

              <SignalBar
                label="Velocity Risk"
                value={signals.velocity_risk}
                icon={<VelocityIcon sx={{ fontSize: 16 }} />}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, ml: 3 }}>
                {getSignalExplanation('velocity_risk', signals.velocity_risk)}
              </Typography>

              <SignalBar
                label="Carrier Risk"
                value={signals.carrier_risk}
                icon={<CarrierIcon sx={{ fontSize: 16 }} />}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, ml: 3 }}>
                {getSignalExplanation('carrier_risk', signals.carrier_risk)}
              </Typography>

              <SignalBar
                label="Behavior Risk"
                value={signals.behavior_risk}
                icon={<BehaviorIcon sx={{ fontSize: 16 }} />}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 3 }}>
                {getSignalExplanation('behavior_risk', signals.behavior_risk)}
              </Typography>
            </Box>
          </Grid>

          {/* Right Column: AI Analysis */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">
                AI Agent Analysis
              </Typography>
              <Button
                size="small"
                startIcon={isReanalyzing ? <CircularProgress size={14} /> : <ReanalyzeIcon />}
                onClick={onReanalyze}
                disabled={isReanalyzing}
              >
                {isReanalyzing ? 'Analyzing...' : 'Re-analyze'}
              </Button>
            </Box>

            {item.ai_recommendation ? (
              <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <AIIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight={600}>
                      Recommendation: {item.ai_recommendation.toUpperCase()}
                    </Typography>
                    <Chip
                      size="small"
                      label={item.ai_confidence}
                      color={
                        item.ai_confidence === 'high'
                          ? 'success'
                          : item.ai_confidence === 'medium'
                          ? 'warning'
                          : 'error'
                      }
                    />
                  </Box>

                  <Typography variant="subtitle2" gutterBottom>
                    Reasoning
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {item.ai_reasoning || 'No detailed reasoning provided.'}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    Key Factors
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {signals.geo_risk >= 50 && (
                      <Chip
                        size="small"
                        icon={<GeoIcon />}
                        label="High-risk region"
                        variant="outlined"
                        color="error"
                      />
                    )}
                    {signals.velocity_risk >= 50 && (
                      <Chip
                        size="small"
                        icon={<VelocityIcon />}
                        label="High velocity"
                        variant="outlined"
                        color="error"
                      />
                    )}
                    {signals.carrier_risk >= 50 && (
                      <Chip
                        size="small"
                        icon={<CarrierIcon />}
                        label="Risky carrier"
                        variant="outlined"
                        color="error"
                      />
                    )}
                    {signals.behavior_risk >= 50 && (
                      <Chip
                        size="small"
                        icon={<BehaviorIcon />}
                        label="Suspicious behavior"
                        variant="outlined"
                        color="error"
                      />
                    )}
                    {signals.geo_risk < 50 &&
                      signals.velocity_risk < 50 &&
                      signals.carrier_risk < 50 &&
                      signals.behavior_risk < 50 && (
                        <Chip
                          size="small"
                          icon={<InsightIcon />}
                          label="Borderline case"
                          variant="outlined"
                          color="warning"
                        />
                      )}
                  </Box>
                </CardContent>
              </Card>
            ) : (
              <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <ThinkingIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    AI analysis pending or not yet complete.
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ReanalyzeIcon />}
                    onClick={onReanalyze}
                    disabled={isReanalyzing}
                    sx={{ mt: 2 }}
                  >
                    Request AI Analysis
                  </Button>
                </CardContent>
              </Card>
            )}

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="caption">
                Your decision will override the AI recommendation and help train future models.
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<DenyIcon />}
          onClick={() => onOverride('deny')}
        >
          Deny Request
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<AllowIcon />}
          onClick={() => onOverride('allow')}
        >
          Allow Request
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ReviewRow({
  item,
  onOverride,
  onOpenDetails,
  selected,
  onSelectChange,
}: {
  item: ReviewItem;
  onOverride: (id: string, action: 'allow' | 'deny') => void;
  onOpenDetails: (item: ReviewItem) => void;
  selected: boolean;
  onSelectChange: (checked: boolean) => void;
}) {
  const signals: SignalBreakdown = JSON.parse(item.signals);

  const confidenceColor = {
    high: 'success',
    medium: 'warning',
    low: 'error',
  }[item.ai_confidence || 'low'] as 'success' | 'warning' | 'error';

  return (
    <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => onOpenDetails(item)}>
      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selected}
          onChange={(e) => onSelectChange(e.target.checked)}
        />
      </TableCell>
      <TableCell>
        <Typography variant="body2" fontWeight={500}>
          {item.phone_number_masked}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {item.phone_country} • {item.phone_carrier || 'Unknown carrier'}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={item.fraud_score}
          size="small"
          color={item.fraud_score >= 50 ? 'warning' : 'default'}
          sx={{ fontWeight: 600 }}
        />
      </TableCell>
      <TableCell sx={{ width: 180 }}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title={`Geo: ${signals.geo_risk}`}>
            <Chip
              size="small"
              icon={<GeoIcon sx={{ fontSize: '14px !important' }} />}
              label={signals.geo_risk}
              color={signals.geo_risk >= 70 ? 'error' : signals.geo_risk >= 40 ? 'warning' : 'success'}
              sx={{ height: 24 }}
            />
          </Tooltip>
          <Tooltip title={`Velocity: ${signals.velocity_risk}`}>
            <Chip
              size="small"
              icon={<VelocityIcon sx={{ fontSize: '14px !important' }} />}
              label={signals.velocity_risk}
              color={signals.velocity_risk >= 70 ? 'error' : signals.velocity_risk >= 40 ? 'warning' : 'success'}
              sx={{ height: 24 }}
            />
          </Tooltip>
          <Tooltip title={`Carrier: ${signals.carrier_risk}`}>
            <Chip
              size="small"
              icon={<CarrierIcon sx={{ fontSize: '14px !important' }} />}
              label={signals.carrier_risk}
              color={signals.carrier_risk >= 70 ? 'error' : signals.carrier_risk >= 40 ? 'warning' : 'success'}
              sx={{ height: 24 }}
            />
          </Tooltip>
        </Box>
      </TableCell>
      <TableCell>
        {item.ai_recommendation ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AIIcon fontSize="small" color="primary" />
            <Chip
              size="small"
              label={item.ai_recommendation.toUpperCase()}
              color={item.ai_recommendation === 'allow' ? 'success' : 'error'}
              sx={{ height: 20 }}
            />
            <Chip
              size="small"
              variant="outlined"
              label={item.ai_confidence}
              color={confidenceColor}
              sx={{ height: 20 }}
            />
          </Box>
        ) : (
          <Chip
            size="small"
            icon={<ThinkingIcon />}
            label="Pending"
            variant="outlined"
            sx={{ height: 20 }}
          />
        )}
      </TableCell>
      <TableCell>
        <Typography variant="caption" color="text.secondary">
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </Typography>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Allow this request">
            <IconButton
              size="small"
              color="success"
              onClick={() => onOverride(item.check_id, 'allow')}
            >
              <AllowIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Deny this request">
            <IconButton
              size="small"
              color="error"
              onClick={() => onOverride(item.check_id, 'deny')}
            >
              <DenyIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
}

export default function ReviewQueue() {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [detailsDialog, setDetailsDialog] = useState<{ open: boolean; item: ReviewItem | null }>({
    open: false,
    item: null,
  });
  const [filter, setFilter] = useState<'all' | 'pending' | 'ai-allow' | 'ai-deny'>('all');
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  const { data: queue, isLoading, refetch } = useReviewQueue();
  const overrideMutation = useOverrideDecision();
  const { token } = useAuthStore();

  const handleOverride = (checkId: string, action: 'allow' | 'deny') => {
    overrideMutation.mutate(
      { checkId, action },
      {
        onSuccess: () => {
          setDetailsDialog({ open: false, item: null });
          refetch();
        },
      }
    );
  };

  const handleBatchOverride = (action: 'allow' | 'deny') => {
    selectedItems.forEach((checkId) => {
      overrideMutation.mutate({ checkId, action });
    });
    setSelectedItems(new Set());
    refetch();
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(filteredQueue?.map((item) => item.check_id) || []));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleReanalyze = async () => {
    if (!detailsDialog.item) return;

    setIsReanalyzing(true);
    try {
      await fetch(`${API_BASE}/review-queue/${detailsDialog.item.check_id}/reanalyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      await refetch();
      // Update the dialog with refreshed data
      const updatedItem = queue?.find((i) => i.check_id === detailsDialog.item?.check_id);
      if (updatedItem) {
        setDetailsDialog({ open: true, item: updatedItem });
      }
    } catch (err) {
      console.error('Failed to reanalyze:', err);
    } finally {
      setIsReanalyzing(false);
    }
  };

  const filteredQueue = queue?.filter((item) => {
    switch (filter) {
      case 'pending':
        return !item.ai_recommendation;
      case 'ai-allow':
        return item.ai_recommendation === 'allow';
      case 'ai-deny':
        return item.ai_recommendation === 'deny';
      default:
        return true;
    }
  });

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
        alignItems: { xs: 'flex-start', sm: 'flex-start' },
        gap: 2,
        mb: 3
      }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            Review Queue
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            SMS checks with fraud scores between 31-70 require human review. AI provides recommendations.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()} size="small">
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">Total Pending</Typography>
              <Typography variant="h5" fontWeight={700}>{queue?.length || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">AI Recommends Allow</Typography>
              <Typography variant="h5" fontWeight={700} color="success.main">
                {queue?.filter((i) => i.ai_recommendation === 'allow').length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">AI Recommends Deny</Typography>
              <Typography variant="h5" fontWeight={700} color="error.main">
                {queue?.filter((i) => i.ai_recommendation === 'deny').length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">Awaiting AI</Typography>
              <Typography variant="h5" fontWeight={700}>
                {queue?.filter((i) => !i.ai_recommendation).length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters & Batch Actions */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', md: 'center' },
        gap: 2,
        mb: 2
      }}>
        <Box sx={{ overflowX: 'auto', mx: { xs: -2, sm: 0 }, px: { xs: 2, sm: 0 } }}>
          <Tabs
            value={filter}
            onChange={(_, v) => setFilter(v)}
            sx={{ minHeight: 36 }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab
              value="all"
              label={`All (${queue?.length || 0})`}
              sx={{ minHeight: 36, py: 0, minWidth: 'auto', px: { xs: 1, sm: 2 } }}
            />
            <Tab
              value="pending"
              label={`Pending (${queue?.filter((i) => !i.ai_recommendation).length || 0})`}
              sx={{ minHeight: 36, py: 0, minWidth: 'auto', px: { xs: 1, sm: 2 } }}
            />
            <Tab
              value="ai-allow"
              label={`Allow (${queue?.filter((i) => i.ai_recommendation === 'allow').length || 0})`}
              sx={{ minHeight: 36, py: 0, minWidth: 'auto', px: { xs: 1, sm: 2 } }}
            />
            <Tab
              value="ai-deny"
              label={`Deny (${queue?.filter((i) => i.ai_recommendation === 'deny').length || 0})`}
              sx={{ minHeight: 36, py: 0, minWidth: 'auto', px: { xs: 1, sm: 2 } }}
            />
          </Tabs>
        </Box>

        {selectedItems.size > 0 && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary">
              {selectedItems.size} selected
            </Typography>
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<AllowIcon />}
              onClick={() => handleBatchOverride('allow')}
            >
              Allow
            </Button>
            <Button
              size="small"
              variant="contained"
              color="error"
              startIcon={<DenyIcon />}
              onClick={() => handleBatchOverride('deny')}
            >
              Deny
            </Button>
          </Box>
        )}
      </Box>

      {filteredQueue?.length === 0 ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          {filter === 'all'
            ? 'No items pending review. All caught up!'
            : `No items matching the "${filter}" filter.`}
        </Alert>
      ) : (
        <Card sx={{ overflow: 'hidden' }}>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: { xs: 600, md: 'auto' } }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedItems.size === filteredQueue?.length && filteredQueue.length > 0}
                      indeterminate={selectedItems.size > 0 && selectedItems.size < (filteredQueue?.length || 0)}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>Phone Number</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Signals</TableCell>
                  <TableCell>AI Recommendation</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredQueue?.map((item) => (
                  <ReviewRow
                    key={item.check_id}
                    item={item}
                    onOverride={handleOverride}
                    onOpenDetails={(item) => setDetailsDialog({ open: true, item })}
                    selected={selectedItems.has(item.check_id)}
                    onSelectChange={(checked) => {
                      const newSelected = new Set(selectedItems);
                      if (checked) {
                        newSelected.add(item.check_id);
                      } else {
                        newSelected.delete(item.check_id);
                      }
                      setSelectedItems(newSelected);
                    }}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Detailed Review Dialog */}
      <DetailedReviewDialog
        item={detailsDialog.item}
        open={detailsDialog.open}
        onClose={() => setDetailsDialog({ open: false, item: null })}
        onOverride={(action) => {
          if (detailsDialog.item) {
            handleOverride(detailsDialog.item.check_id, action);
          }
        }}
        onReanalyze={handleReanalyze}
        isReanalyzing={isReanalyzing}
      />
    </Box>
  );
}

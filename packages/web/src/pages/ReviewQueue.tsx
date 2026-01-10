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
  Paper,
} from '@mui/material';
import {
  CheckCircle as AllowIcon,
  Block as DenyIcon,
  SmartToy as AIIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useReviewQueue, useOverrideDecision } from '../hooks/useApi';
import type { ReviewItem, SignalBreakdown } from '../types';
import { formatDistanceToNow } from 'date-fns';

function SignalBar({ label, value }: { label: string; value: number }) {
  const getColor = (v: number) => {
    if (v >= 70) return 'error';
    if (v >= 40) return 'warning';
    return 'success';
  };

  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="caption" fontWeight={500}>
          {value}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={value}
        color={getColor(value)}
        sx={{ height: 4, borderRadius: 2 }}
      />
    </Box>
  );
}

function ReviewRow({ item, onOverride }: { item: ReviewItem; onOverride: (id: string, action: 'allow' | 'deny') => void }) {
  const signals: SignalBreakdown = JSON.parse(item.signals);

  return (
    <TableRow hover>
      <TableCell>
        <Typography variant="body2" fontWeight={500}>
          {item.phone_number_masked}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {item.phone_country}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={item.fraud_score}
          size="small"
          color={item.fraud_score >= 50 ? 'warning' : 'default'}
        />
      </TableCell>
      <TableCell sx={{ width: 200 }}>
        <SignalBar label="Geo" value={signals.geo_risk} />
        <SignalBar label="Velocity" value={signals.velocity_risk} />
        <SignalBar label="Carrier" value={signals.carrier_risk} />
        <SignalBar label="Behavior" value={signals.behavior_risk} />
      </TableCell>
      <TableCell>
        {item.ai_recommendation ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <AIIcon fontSize="small" color="primary" />
              <Chip
                size="small"
                label={item.ai_recommendation.toUpperCase()}
                color={item.ai_recommendation === 'allow' ? 'success' : 'error'}
              />
              <Chip
                size="small"
                variant="outlined"
                label={item.ai_confidence}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              {item.ai_reasoning}
            </Typography>
          </Box>
        ) : (
          <Typography variant="caption" color="text.secondary">
            Pending AI review...
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <Typography variant="caption" color="text.secondary">
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </Typography>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', gap: 1 }}>
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
  const { data: queue, isLoading, refetch } = useReviewQueue();
  const overrideMutation = useOverrideDecision();

  const handleOverride = (checkId: string, action: 'allow' | 'deny') => {
    overrideMutation.mutate({ checkId, action });
  };

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
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Review Queue
          </Typography>
          <Typography variant="body2" color="text.secondary">
            SMS checks with fraud scores between 31-70 require manual review
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => refetch()}
        >
          Refresh
        </Button>
      </Box>

      {queue?.length === 0 ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          No items pending review. All caught up!
        </Alert>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Phone Number</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Signals</TableCell>
                  <TableCell>AI Recommendation</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {queue?.map((item) => (
                  <ReviewRow
                    key={item.check_id}
                    item={item}
                    onOverride={handleOverride}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Box>
  );
}

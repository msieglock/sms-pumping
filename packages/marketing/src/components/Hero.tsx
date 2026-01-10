import { Box, Container, Typography, Button, Stack, Chip } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShieldIcon from '@mui/icons-material/Shield';
import BlockIcon from '@mui/icons-material/Block';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { APP_URL } from '../data/constants';

export default function Hero() {
  return (
    <Box
      component="section"
      sx={{
        pt: { xs: 14, md: 18 },
        pb: { xs: 10, md: 14 },
        position: 'relative',
        overflow: 'hidden',
        background: (theme) =>
          theme.palette.mode === 'light'
            ? 'linear-gradient(180deg, #FFF8E1 0%, #ffffff 100%)'
            : 'linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 100%)',
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: 'absolute',
          top: -200,
          right: -200,
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: (theme) =>
            theme.palette.mode === 'light'
              ? 'radial-gradient(circle, rgba(255,167,38,0.15) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(255,167,38,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={{ xs: 6, lg: 8 }}
          alignItems="center"
        >
          {/* Left content */}
          <Box sx={{ flex: 1, maxWidth: { lg: 600 } }}>
            <Stack spacing={3}>
              {/* Badge */}
              <Box>
                <Chip
                  label="Stop SMS Pumping Fraud"
                  size="small"
                  sx={{
                    bgcolor: (theme) =>
                      theme.palette.mode === 'light'
                        ? 'rgba(255,167,38,0.15)'
                        : 'rgba(255,167,38,0.2)',
                    color: 'primary.main',
                    fontWeight: 600,
                    px: 1,
                  }}
                />
              </Box>

              {/* Headline */}
              <Typography
                variant="h1"
                component="h1"
                sx={{
                  fontSize: { xs: '2.5rem', sm: '3.25rem', md: '3.75rem' },
                  fontWeight: 700,
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                }}
              >
                Protect Your SMS Budget{' '}
                <Box
                  component="span"
                  sx={{
                    background: 'linear-gradient(135deg, #ffa726 0%, #ff7043 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Automatically
                </Box>
              </Typography>

              {/* Subheadline */}
              <Typography
                variant="subtitle1"
                color="text.secondary"
                sx={{
                  fontSize: { xs: '1.1rem', md: '1.25rem' },
                  maxWidth: 540,
                }}
              >
                SMS pumping fraud costs businesses millions. SMSGuard blocks fraudulent
                verification requests in real-time with AI-powered detection.
                <strong> 5-minute integration, guaranteed savings.</strong>
              </Typography>

              {/* CTAs */}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ pt: 1 }}
              >
                <Button
                  variant="contained"
                  size="large"
                  href={`${APP_URL}/register`}
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontSize: '1rem',
                  }}
                >
                  Start Free Trial
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  href={`${APP_URL}/login`}
                  startIcon={<PlayCircleOutlineIcon />}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontSize: '1rem',
                    borderWidth: 2,
                    '&:hover': { borderWidth: 2 },
                  }}
                >
                  View Demo
                </Button>
              </Stack>

              {/* Trust indicators */}
              <Stack spacing={1.5} sx={{ pt: 2 }}>
                {[
                  'No credit card required',
                  '14-day free trial',
                  'Works with Twilio, Vonage, and 4 more',
                ].map((item) => (
                  <Stack key={item} direction="row" spacing={1} alignItems="center">
                    <CheckCircleIcon
                      sx={{ fontSize: 18, color: 'success.main' }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {item}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Box>

          {/* Right - Dashboard Preview */}
          <Box
            sx={{
              flex: 1,
              width: '100%',
              maxWidth: { xs: '100%', lg: 550 },
            }}
          >
            <Box
              sx={{
                position: 'relative',
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: (theme) =>
                  theme.palette.mode === 'light'
                    ? '0 25px 80px -12px rgba(0, 0, 0, 0.2)'
                    : '0 25px 80px -12px rgba(0, 0, 0, 0.5)',
                border: 1,
                borderColor: 'divider',
                background: (theme) =>
                  theme.palette.mode === 'light' ? '#ffffff' : '#1a1a1a',
              }}
            >
              {/* Browser chrome */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 1.5,
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: (theme) =>
                    theme.palette.mode === 'light' ? '#f5f5f5' : '#0f0f0f',
                }}
              >
                <Box sx={{ display: 'flex', gap: 0.75 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: '#FF5F57',
                    }}
                  />
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: '#FEBC2E',
                    }}
                  />
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: '#28C840',
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    mx: 2,
                    px: 2,
                    py: 0.5,
                    borderRadius: 1,
                    bgcolor: (theme) =>
                      theme.palette.mode === 'light'
                        ? 'rgba(0,0,0,0.05)'
                        : 'rgba(255,255,255,0.05)',
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    app.smsguard.dev
                  </Typography>
                </Box>
              </Box>

              {/* Dashboard preview content */}
              <Box
                sx={{
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {/* Stats row */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 2,
                  }}
                >
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: (theme) =>
                        theme.palette.mode === 'light'
                          ? 'rgba(16,185,129,0.1)'
                          : 'rgba(16,185,129,0.15)',
                      border: 1,
                      borderColor: 'success.main',
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TrendingUpIcon sx={{ color: 'success.main', fontSize: 20 }} />
                      <Typography variant="caption" color="text.secondary">
                        Savings
                      </Typography>
                    </Stack>
                    <Typography variant="h5" fontWeight={700} color="success.main">
                      $2,847
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: (theme) =>
                        theme.palette.mode === 'light'
                          ? 'rgba(239,68,68,0.1)'
                          : 'rgba(239,68,68,0.15)',
                      border: 1,
                      borderColor: 'error.main',
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <BlockIcon sx={{ color: 'error.main', fontSize: 20 }} />
                      <Typography variant="caption" color="text.secondary">
                        Blocked
                      </Typography>
                    </Stack>
                    <Typography variant="h5" fontWeight={700} color="error.main">
                      8,432
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: (theme) =>
                        theme.palette.mode === 'light'
                          ? 'rgba(99,102,241,0.1)'
                          : 'rgba(99,102,241,0.15)',
                      border: 1,
                      borderColor: 'secondary.main',
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <ShieldIcon sx={{ color: 'secondary.main', fontSize: 20 }} />
                      <Typography variant="caption" color="text.secondary">
                        Protected
                      </Typography>
                    </Stack>
                    <Typography variant="h5" fontWeight={700} color="secondary.main">
                      125K
                    </Typography>
                  </Box>
                </Box>

                {/* Live feed */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: (theme) =>
                      theme.palette.mode === 'light'
                        ? 'rgba(0,0,0,0.02)'
                        : 'rgba(255,255,255,0.02)',
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                    Live Activity
                  </Typography>
                  <Stack spacing={1}>
                    {[
                      { country: 'ID', action: 'Blocked', color: 'error.main', time: '2s ago' },
                      { country: 'US', action: 'Allowed', color: 'success.main', time: '5s ago' },
                      { country: 'PH', action: 'Blocked', color: 'error.main', time: '8s ago' },
                      { country: 'GB', action: 'Allowed', color: 'success.main', time: '12s ago' },
                    ].map((item, i) => (
                      <Stack
                        key={i}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{
                          py: 0.5,
                          px: 1,
                          borderRadius: 1,
                          bgcolor: (theme) =>
                            theme.palette.mode === 'light'
                              ? 'rgba(0,0,0,0.02)'
                              : 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption" fontWeight={600}>
                            {item.country}
                          </Typography>
                          <Typography variant="caption" sx={{ color: item.color }}>
                            {item.action}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {item.time}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              </Box>
            </Box>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

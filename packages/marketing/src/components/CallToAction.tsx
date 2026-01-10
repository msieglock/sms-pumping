import { Box, Container, Typography, Button, Stack } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SecurityIcon from '@mui/icons-material/Security';
import { APP_URL } from '../data/constants';

export default function CallToAction() {
  return (
    <Box
      component="section"
      sx={{
        py: { xs: 10, md: 14 },
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #ffa726 0%, #ff7043 100%)',
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -150,
          left: -150,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.05)',
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="md">
        <Stack spacing={4} alignItems="center" textAlign="center">
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SecurityIcon sx={{ fontSize: 40, color: 'white' }} />
          </Box>

          <Typography
            variant="h2"
            component="h2"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '2rem', md: '2.75rem' },
              color: 'white',
            }}
          >
            Stop losing money to
            <br />
            SMS pumping fraud today
          </Typography>

          <Typography
            variant="subtitle1"
            sx={{
              maxWidth: 550,
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: { xs: '1rem', md: '1.15rem' },
            }}
          >
            Join hundreds of companies using SMSGuard to protect their SMS
            budget. 5-minute integration, guaranteed savings.
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ pt: 2 }}
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
                bgcolor: 'white',
                color: '#ff7043',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                },
              }}
            >
              Start Free Trial
            </Button>
            <Button
              variant="outlined"
              size="large"
              href={`${APP_URL}/login`}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                borderColor: 'white',
                borderWidth: 2,
                color: 'white',
                '&:hover': {
                  borderColor: 'white',
                  borderWidth: 2,
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              View Demo
            </Button>
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 1, sm: 4 }}
            sx={{ pt: 2 }}
          >
            {[
              'No credit card required',
              '14-day free trial',
              'Setup in 5 minutes',
            ].map((item) => (
              <Typography
                key={item}
                variant="body2"
                sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
              >
                {item}
              </Typography>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

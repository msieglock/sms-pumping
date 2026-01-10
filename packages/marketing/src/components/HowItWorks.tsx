import {
  Box,
  Container,
  Typography,
  Grid,
  Stack,
} from '@mui/material';
import { howItWorksSteps } from '../data/features';

export default function HowItWorks() {
  return (
    <Box
      component="section"
      id="how-it-works"
      sx={{
        py: { xs: 10, md: 14 },
        background: (theme) =>
          theme.palette.mode === 'light'
            ? 'linear-gradient(180deg, #ffffff 0%, #FFF8E1 100%)'
            : 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)',
      }}
    >
      <Container maxWidth="lg">
        {/* Section Header */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography
            variant="overline"
            color="primary"
            sx={{ mb: 2, display: 'block', fontWeight: 600 }}
          >
            Integration
          </Typography>
          <Typography
            variant="h2"
            component="h2"
            sx={{
              mb: 2,
              fontWeight: 700,
              fontSize: { xs: '2rem', md: '2.75rem' },
            }}
          >
            Get protected in 5 minutes
          </Typography>
          <Typography
            variant="subtitle1"
            color="text.secondary"
            sx={{ maxWidth: 600, mx: 'auto' }}
          >
            Add one API call before sending SMS. No SDK required, works with
            any language, any SMS provider.
          </Typography>
        </Box>

        {/* Steps */}
        <Grid container spacing={4}>
          {howItWorksSteps.map((step) => (
            <Grid item xs={12} md={6} key={step.step}>
              <Box
                sx={{
                  height: '100%',
                  p: 3,
                  borderRadius: 3,
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    borderColor: 'primary.main',
                  },
                }}
              >
                <Stack spacing={2}>
                  {/* Step number */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #ffa726 0%, #ff7043 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                      }}
                    >
                      {step.step}
                    </Box>
                    <Typography variant="h6" fontWeight={600}>
                      {step.title}
                    </Typography>
                  </Box>

                  {/* Description */}
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>

                  {/* Code block */}
                  {step.code && (
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: (theme) =>
                          theme.palette.mode === 'light' ? '#1e293b' : '#0f0f0f',
                        overflow: 'auto',
                      }}
                    >
                      <pre
                        style={{
                          margin: 0,
                          color: '#e2e8f0',
                          fontSize: '0.75rem',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {step.code}
                      </pre>
                    </Box>
                  )}
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

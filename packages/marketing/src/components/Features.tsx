import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import { features, capabilities } from '../data/features';

export default function Features() {
  return (
    <Box
      component="section"
      id="features"
      sx={{
        py: { xs: 10, md: 14 },
        backgroundColor: 'background.default',
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
            Platform Features
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
            Everything you need to
            <br />
            stop SMS fraud
          </Typography>
          <Typography
            variant="subtitle1"
            color="text.secondary"
            sx={{ maxWidth: 650, mx: 'auto' }}
          >
            Built for developers who want simple integration and finance teams
            who want guaranteed ROI. No complex configuration required.
          </Typography>
        </Box>

        {/* Stats Bar */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 3,
            mb: 8,
            p: 4,
            borderRadius: 3,
            bgcolor: (theme) =>
              theme.palette.mode === 'light'
                ? 'rgba(255,167,38,0.05)'
                : 'rgba(255,167,38,0.08)',
            border: 1,
            borderColor: 'divider',
          }}
        >
          {capabilities.map((cap) => (
            <Box key={cap.title} sx={{ textAlign: 'center' }}>
              <Typography
                variant="h3"
                color="primary"
                sx={{ fontWeight: 700, mb: 0.5 }}
              >
                {cap.stat}
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                {cap.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {cap.description}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Features Grid */}
        <Grid container spacing={3}>
          {features.map((feature) => (
            <Grid item xs={12} sm={6} md={4} key={feature.title}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  backgroundColor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'translateY(-4px)',
                    boxShadow: (theme) =>
                      theme.palette.mode === 'light'
                        ? '0 12px 24px -8px rgba(255, 167, 38, 0.2)'
                        : '0 12px 24px -8px rgba(0, 0, 0, 0.4)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #ffa726 0%, #ff7043 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <feature.icon sx={{ color: '#ffffff', fontSize: 24 }} />
                    </Box>
                    {feature.badge && (
                      <Chip
                        label={feature.badge}
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{ mb: 1, fontWeight: 600 }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ lineHeight: 1.7 }}
                  >
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

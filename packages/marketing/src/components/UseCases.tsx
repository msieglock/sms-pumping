import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
} from '@mui/material';
import { useCases } from '../data/features';
import CodeIcon from '@mui/icons-material/Code';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SecurityIcon from '@mui/icons-material/Security';
import GroupsIcon from '@mui/icons-material/Groups';
import type { SvgIconComponent } from '@mui/icons-material';

const icons: SvgIconComponent[] = [CodeIcon, AccountBalanceIcon, SecurityIcon, GroupsIcon];

export default function UseCases() {
  return (
    <Box
      component="section"
      id="use-cases"
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
            Use Cases
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
            Built for every team
            <br />
            in your organization
          </Typography>
          <Typography
            variant="subtitle1"
            color="text.secondary"
            sx={{ maxWidth: 600, mx: 'auto' }}
          >
            Whether you're a developer implementing SMS verification or a
            finance leader watching costs, SMSGuard delivers value.
          </Typography>
        </Box>

        {/* Use Cases Grid */}
        <Grid container spacing={3}>
          {useCases.map((useCase, index) => {
            const Icon = icons[index];
            return (
              <Grid item xs={12} sm={6} key={useCase.title}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    border: 1,
                    borderColor: 'divider',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: (theme) =>
                        theme.palette.mode === 'light'
                          ? '0 8px 24px -8px rgba(255, 167, 38, 0.15)'
                          : '0 8px 24px -8px rgba(0, 0, 0, 0.3)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        background: (theme) =>
                          theme.palette.mode === 'light'
                            ? 'rgba(255,167,38,0.1)'
                            : 'rgba(255,167,38,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 3,
                      }}
                    >
                      <Icon sx={{ color: 'primary.main', fontSize: 28 }} />
                    </Box>
                    <Typography variant="overline" color="text.secondary" sx={{ mb: 0.5 }}>
                      {useCase.persona}
                    </Typography>
                    <Typography
                      variant="h5"
                      component="h3"
                      sx={{ mb: 2, fontWeight: 600 }}
                    >
                      {useCase.title}
                    </Typography>
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{ mb: 3, lineHeight: 1.7 }}
                    >
                      {useCase.description}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {useCase.benefits.map((benefit) => (
                        <Chip
                          key={benefit}
                          label={benefit}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: 'divider',
                            fontWeight: 500,
                            fontSize: '0.75rem',
                          }}
                        />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
}

import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { pricingTiers } from '../data/pricing';
import { APP_URL } from '../data/constants';

export default function Pricing() {
  return (
    <Box
      component="section"
      id="pricing"
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
            Pricing
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
            Only pay when we
            <br />
            save you money
          </Typography>
          <Typography
            variant="subtitle1"
            color="text.secondary"
            sx={{ maxWidth: 600, mx: 'auto' }}
          >
            Start with a free trial. Then pay $100/month plus 15% of your
            fraud savings. If we don't save you money, you don't pay.
          </Typography>
        </Box>

        {/* ROI Calculator highlight */}
        <Box
          sx={{
            mb: 6,
            p: 3,
            borderRadius: 3,
            textAlign: 'center',
            bgcolor: (theme) =>
              theme.palette.mode === 'light'
                ? 'rgba(16,185,129,0.1)'
                : 'rgba(16,185,129,0.15)',
            border: 1,
            borderColor: 'success.main',
          }}
        >
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
            Typical ROI: 5-10x your investment
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Companies blocking SMS pumping fraud typically see $500-$5,000+ in monthly savings.
            Our pricing model ensures you always come out ahead.
          </Typography>
        </Box>

        {/* Pricing Cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 4,
            maxWidth: 900,
            mx: 'auto',
          }}
        >
          {pricingTiers.map((tier) => (
            <Card
              key={tier.name}
              elevation={0}
              sx={{
                position: 'relative',
                border: tier.highlighted ? 2 : 1,
                borderColor: tier.highlighted ? 'primary.main' : 'divider',
                borderRadius: 3,
                overflow: 'visible',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: (theme) =>
                    theme.palette.mode === 'light'
                      ? '0 12px 40px -8px rgba(255, 167, 38, 0.2)'
                      : '0 12px 40px -8px rgba(0, 0, 0, 0.4)',
                },
              }}
            >
              {tier.highlighted && (
                <Chip
                  label="Most Popular"
                  color="primary"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontWeight: 600,
                  }}
                />
              )}
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
                  {tier.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {tier.description}
                </Typography>

                <Box sx={{ mb: 3 }}>
                  {tier.price === 0 ? (
                    <Typography variant="h3" fontWeight={700}>
                      Free
                    </Typography>
                  ) : (
                    <Stack direction="row" alignItems="baseline" spacing={0.5}>
                      <Typography variant="h3" fontWeight={700}>
                        ${tier.price}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        /month
                      </Typography>
                    </Stack>
                  )}
                  {tier.price !== 0 && (
                    <Typography variant="body2" color="primary" fontWeight={500}>
                      + 15% of fraud savings
                    </Typography>
                  )}
                </Box>

                <Button
                  variant={tier.ctaVariant}
                  color="primary"
                  size="large"
                  fullWidth
                  href={`${APP_URL}/register`}
                  sx={{ mb: 3, py: 1.5 }}
                >
                  {tier.cta}
                </Button>

                <Stack spacing={1.5}>
                  {tier.features.map((feature) => (
                    <Stack
                      key={feature}
                      direction="row"
                      spacing={1.5}
                      alignItems="flex-start"
                    >
                      <CheckIcon
                        sx={{
                          fontSize: 18,
                          color: 'success.main',
                          mt: 0.25,
                        }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {feature}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Money-back guarantee */}
        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Typography variant="body2" color="text.secondary">
            No credit card required for free trial. Cancel anytime.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

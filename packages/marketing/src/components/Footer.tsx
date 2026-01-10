import { Box, Container, Typography, Stack, IconButton, Link } from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import GitHubIcon from '@mui/icons-material/GitHub';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import { DOCS_URL, CONTACT_EMAIL } from '../data/constants';

type FooterLink = {
  label: string;
  action?: () => void;
  href?: string;
};

type FooterColumn = {
  title: string;
  links: FooterLink[];
};

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const footerLinks: FooterColumn[] = [
    {
      title: 'Product',
      links: [
        { label: 'Features', action: () => scrollToSection('features') },
        { label: 'How It Works', action: () => scrollToSection('how-it-works') },
        { label: 'Pricing', action: () => scrollToSection('pricing') },
        { label: 'Use Cases', action: () => scrollToSection('use-cases') },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Documentation', href: DOCS_URL },
        { label: 'API Reference', href: `${DOCS_URL}/api` },
        { label: 'Blog', href: '/blog' },
        { label: 'Changelog', href: '/changelog' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '/about' },
        { label: 'Contact', href: `mailto:${CONTACT_EMAIL}` },
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
      ],
    },
  ];

  return (
    <Box
      component="footer"
      sx={{
        py: { xs: 6, md: 8 },
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr' },
            gap: { xs: 4, md: 6 },
          }}
        >
          {/* Brand column */}
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 2,
              }}
            >
              <ShieldIcon sx={{ color: 'primary.main', fontSize: 28 }} />
              <Typography variant="h6" fontWeight={700}>
                SMSGuard
              </Typography>
            </Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 3, maxWidth: 280 }}
            >
              Stop SMS pumping fraud automatically. Protect your SMS budget with
              AI-powered fraud detection.
            </Typography>
            <Stack direction="row" spacing={1}>
              <IconButton
                size="small"
                sx={{ color: 'text.secondary' }}
                aria-label="Twitter"
              >
                <TwitterIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                sx={{ color: 'text.secondary' }}
                aria-label="GitHub"
              >
                <GitHubIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                sx={{ color: 'text.secondary' }}
                aria-label="LinkedIn"
              >
                <LinkedInIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Box>

          {/* Link columns */}
          {footerLinks.map((column) => (
            <Box key={column.title}>
              <Typography
                variant="subtitle2"
                fontWeight={600}
                sx={{ mb: 2 }}
              >
                {column.title}
              </Typography>
              <Stack spacing={1.5}>
                {column.links.map((link) =>
                  link.action ? (
                    <Link
                      key={link.label}
                      component="button"
                      variant="body2"
                      color="text.secondary"
                      onClick={link.action}
                      sx={{
                        textAlign: 'left',
                        textDecoration: 'none',
                        '&:hover': { color: 'primary.main' },
                      }}
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <Link
                      key={link.label}
                      href={link.href}
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        textDecoration: 'none',
                        '&:hover': { color: 'primary.main' },
                      }}
                    >
                      {link.label}
                    </Link>
                  )
                )}
              </Stack>
            </Box>
          ))}
        </Box>

        {/* Bottom section */}
        <Box
          sx={{
            mt: 6,
            pt: 3,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {currentYear} SMSGuard. All rights reserved.
          </Typography>
          <Stack direction="row" spacing={3}>
            <Link
              href="/privacy"
              variant="caption"
              color="text.secondary"
              sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              variant="caption"
              color="text.secondary"
              sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
            >
              Terms of Service
            </Link>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}

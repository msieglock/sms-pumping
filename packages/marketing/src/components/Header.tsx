import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  IconButton,
  useScrollTrigger,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ShieldIcon from '@mui/icons-material/Shield';
import { useThemeMode } from '../theme/ThemeContext';
import { APP_URL, DOCS_URL } from '../data/constants';

export default function Header() {
  const { mode, toggleTheme } = useThemeMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const trigger = useScrollTrigger({ disableHysteresis: true, threshold: 50 });

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const scrollToSection = (id: string) => {
    setMobileOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navItems = [
    { label: 'Features', action: () => scrollToSection('features') },
    { label: 'How It Works', action: () => scrollToSection('how-it-works') },
    { label: 'Use Cases', action: () => scrollToSection('use-cases') },
    { label: 'Pricing', action: () => scrollToSection('pricing') },
    { label: 'Docs', href: DOCS_URL },
  ];

  const mobileDrawer = (
    <Box sx={{ width: 300, height: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShieldIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" fontWeight={700}>
            SMSGuard
          </Typography>
        </Box>
        <IconButton onClick={handleDrawerToggle}>
          <CloseIcon />
        </IconButton>
      </Box>
      <List sx={{ px: 1 }}>
        {navItems.map((item) => (
          <ListItem key={item.label} disablePadding>
            <ListItemButton
              onClick={item.action}
              component={item.href ? 'a' : 'button'}
              href={item.href}
              target={item.href ? '_blank' : undefined}
              sx={{ borderRadius: 1, my: 0.5 }}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider sx={{ my: 1 }} />
      <List sx={{ px: 1 }}>
        <ListItem disablePadding>
          <ListItemButton
            component="a"
            href={`${APP_URL}/login`}
            sx={{ borderRadius: 1 }}
          >
            <ListItemText primary="Sign In" />
          </ListItemButton>
        </ListItem>
      </List>
      <Box sx={{ p: 2 }}>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          href={`${APP_URL}/register`}
          size="large"
        >
          Start Free Trial
        </Button>
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          backdropFilter: 'blur(12px)',
          backgroundColor:
            mode === 'light'
              ? trigger
                ? 'rgba(255, 255, 255, 0.95)'
                : 'rgba(255, 255, 255, 0.8)'
              : trigger
              ? 'rgba(15, 15, 15, 0.95)'
              : 'rgba(15, 15, 15, 0.8)',
          borderBottom: 1,
          borderColor: trigger ? 'divider' : 'transparent',
          transition: 'all 0.2s ease-in-out',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between', py: 0.5 }}>
            {/* Mobile menu button */}
            <IconButton
              color="inherit"
              aria-label="open menu"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ display: { md: 'none' }, mr: 1 }}
            >
              <MenuIcon />
            </IconButton>

            {/* Logo */}
            <Box
              component="a"
              href="/"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexGrow: { xs: 1, md: 0 },
                textDecoration: 'none',
              }}
            >
              <ShieldIcon sx={{ color: 'primary.main', fontSize: 28 }} />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: 'text.primary',
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                SMSGuard
              </Typography>
            </Box>

            {/* Desktop Navigation */}
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              {navItems.map((item) =>
                item.href ? (
                  <Button
                    key={item.label}
                    color="inherit"
                    href={item.href}
                    target="_blank"
                    sx={{
                      fontWeight: 500,
                      color: 'text.secondary',
                      '&:hover': { color: 'text.primary', bgcolor: 'transparent' },
                    }}
                  >
                    {item.label}
                  </Button>
                ) : (
                  <Button
                    key={item.label}
                    color="inherit"
                    onClick={item.action}
                    sx={{
                      fontWeight: 500,
                      color: 'text.secondary',
                      '&:hover': { color: 'text.primary', bgcolor: 'transparent' },
                    }}
                  >
                    {item.label}
                  </Button>
                )
              )}
            </Box>

            {/* Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                onClick={toggleTheme}
                color="inherit"
                size="small"
                sx={{ color: 'text.secondary' }}
              >
                {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
              <Button
                color="inherit"
                href={`${APP_URL}/login`}
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  fontWeight: 500,
                  color: 'text.secondary',
                }}
              >
                Sign In
              </Button>
              <Button
                variant="contained"
                color="primary"
                href={`${APP_URL}/register`}
                sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
              >
                Start Free
              </Button>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 300,
          },
        }}
      >
        {mobileDrawer}
      </Drawer>
    </>
  );
}

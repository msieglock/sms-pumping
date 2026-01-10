import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Shield as ShieldIcon,
  Google as GoogleIcon,
  GitHub as GitHubIcon,
} from '@mui/icons-material';
import { useRegister } from '../hooks/useApi';

const API_BASE = import.meta.env.VITE_API_URL || '/v1';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    company_name: '',
    website: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const registerMutation = useRegister();

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(formData, {
      onSuccess: () => navigate('/onboarding'),
    });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 450, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <ShieldIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight={700}>
              SMSGuard
            </Typography>
          </Box>

          <Typography variant="h6" gutterBottom>
            Create your free account
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            14-day free trial, no credit card required
          </Typography>

          {registerMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {registerMutation.error?.message || 'Registration failed'}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, my: 3 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={() => { window.location.href = `${API_BASE.replace('/v1', '')}/auth/google`; }}
            >
              Google
            </Button>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<GitHubIcon />}
              disabled
            >
              GitHub
            </Button>
          </Box>

          <Divider sx={{ my: 2 }}>
            <Typography variant="caption" color="text.secondary">
              or register with email
            </Typography>
          </Divider>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Your Name"
              value={formData.name}
              onChange={handleChange('name')}
              margin="normal"
              required
              autoFocus
            />

            <TextField
              fullWidth
              label="Work Email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              margin="normal"
              required
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange('password')}
              margin="normal"
              required
              helperText="At least 8 characters"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Company Name"
              value={formData.company_name}
              onChange={handleChange('company_name')}
              margin="normal"
              required
            />

            <TextField
              fullWidth
              label="Company Website (optional)"
              value={formData.website}
              onChange={handleChange('website')}
              margin="normal"
              placeholder="https://example.com"
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              sx={{ mt: 3 }}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </Typography>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link component={RouterLink} to="/login">
                Sign in
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

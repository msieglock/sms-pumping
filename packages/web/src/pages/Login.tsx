import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
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
} from '@mui/icons-material';
import { useLogin } from '../hooks/useApi';

const API_BASE = import.meta.env.VITE_API_URL || '/v1';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginMutation = useLogin();

  const errorParam = searchParams.get('error');
  const errorMessages: Record<string, string> = {
    invalid_state: 'OAuth session expired. Please try again.',
    token_exchange_failed: 'Failed to authenticate with Google.',
    userinfo_failed: 'Failed to get user info from Google.',
    oauth_failed: 'Google sign-in failed. Please try again.',
    auth_failed: 'Authentication failed. Please try again.',
    missing_token: 'Authentication failed. Please try again.',
    invalid_token: 'Invalid authentication token.',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { email, password },
      {
        onSuccess: () => navigate('/'),
      }
    );
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE.replace('/v1', '')}/auth/google`;
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
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <ShieldIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight={700}>
              SMSGuard
            </Typography>
          </Box>

          <Typography variant="h6" gutterBottom>
            Sign in to your account
          </Typography>

          {errorParam && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessages[errorParam] || 'An error occurred. Please try again.'}
              {searchParams.get('details') && (
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Details: {searchParams.get('details')}
                </Typography>
              )}
            </Alert>
          )}

          {loginMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {loginMutation.error?.message || 'Invalid email or password'}
            </Alert>
          )}

          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin}
            sx={{ mb: 2 }}
          >
            Continue with Google
          </Button>

          <Divider sx={{ my: 2 }}>
            <Typography variant="body2" color="text.secondary">
              or
            </Typography>
          </Divider>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              autoFocus
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
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

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              sx={{ mt: 3 }}
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link component={RouterLink} to="/register">
                Sign up free
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

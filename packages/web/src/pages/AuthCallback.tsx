import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuthStore } from '../hooks/useAuthStore';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      navigate(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (token) {
      // Decode JWT to get user info (without verification - server already verified)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));

        // Fetch user details
        fetch(`${import.meta.env.VITE_API_URL?.replace('/v1', '') || ''}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.data) {
              login(
                {
                  id: data.data.id,
                  email: data.data.email,
                  role: data.data.role,
                },
                {
                  id: data.data.org_id,
                  name: data.data.org_name,
                  plan: data.data.plan,
                },
                token
              );
              navigate('/');
            } else {
              navigate('/login?error=auth_failed');
            }
          })
          .catch(() => {
            navigate('/login?error=auth_failed');
          });
      } catch {
        navigate('/login?error=invalid_token');
      }
    } else {
      navigate('/login?error=missing_token');
    }
  }, [searchParams, navigate, login]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <CircularProgress size={48} />
      <Typography sx={{ mt: 2 }} color="text.secondary">
        Completing sign in...
      </Typography>
    </Box>
  );
}

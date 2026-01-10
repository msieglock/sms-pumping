import { createTheme, type ThemeOptions } from '@mui/material/styles';

// Josefin Sans font family with fallbacks
const fontFamily = '"Josefin Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

// Standardized font sizes
// Base: 14px (0.875rem)
// Scale: Minor Third (1.2) - reduced for more compact UI
const fontSizes = {
  xs: "0.6875rem",  // 11px - captions, labels
  sm: "0.75rem",    // 12px - secondary text, table cells
  base: "0.8125rem", // 13px - body text
  md: "0.875rem",   // 14px - emphasized body
  lg: "1rem",       // 16px - h6, subheadings
  xl: "1.125rem",   // 18px - h5
  "2xl": "1.25rem", // 20px - h4
  "3xl": "1.5rem",  // 24px - h3
  "4xl": "1.75rem", // 28px - h2
  "5xl": "2rem",    // 32px - h1
};

// Shared theme options
const baseTheme: ThemeOptions = {
  typography: {
    fontFamily,
    fontSize: 13, // Base font size for MUI calculations
    // Headings
    h1: { fontSize: fontSizes["5xl"], fontWeight: 600, lineHeight: 1.2 },
    h2: { fontSize: fontSizes["4xl"], fontWeight: 600, lineHeight: 1.25 },
    h3: { fontSize: fontSizes["3xl"], fontWeight: 600, lineHeight: 1.3 },
    h4: { fontSize: fontSizes["2xl"], fontWeight: 500, lineHeight: 1.35 },
    h5: { fontSize: fontSizes.xl, fontWeight: 500, lineHeight: 1.4 },
    h6: { fontSize: fontSizes.lg, fontWeight: 500, lineHeight: 1.4 },
    // Body text
    body1: { fontSize: fontSizes.base, lineHeight: 1.5 },
    body2: { fontSize: fontSizes.sm, lineHeight: 1.5 },
    // UI elements
    button: { fontSize: fontSizes.sm, fontWeight: 500, textTransform: "none" as const },
    caption: { fontSize: fontSizes.xs, lineHeight: 1.4 },
    overline: { fontSize: fontSizes.xs, fontWeight: 500, letterSpacing: "0.08em" },
    subtitle1: { fontSize: fontSizes.base, fontWeight: 500, lineHeight: 1.4 },
    subtitle2: { fontSize: fontSizes.sm, fontWeight: 500, lineHeight: 1.4 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
        },
      },
    },
  },
};

// Dark theme - matching gray palette from outage-detection-system
export const theme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: '#e0e0e0',
      light: '#f5f5f5',
      dark: '#bdbdbd',
    },
    secondary: {
      main: '#9e9e9e',
      light: '#bdbdbd',
      dark: '#757575',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    warning: {
      main: '#ffa726',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    success: {
      main: '#66bb6a',
      light: '#81c784',
      dark: '#388e3c',
    },
    info: {
      main: '#9e9e9e',
      light: '#bdbdbd',
      dark: '#757575',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
});

// Surface colors for consistent styling
export const surfaceColors = {
  background: '#121212',
  paper: '#1e1e1e',
  elevated: '#2d2d2d',
  subtle: '#1e1e1e',
  border: 'rgba(255, 255, 255, 0.12)',
};

// Semantic status colors (consistent across the app)
export const statusColors = {
  success: '#4caf50',  // Green - allowed, healthy
  warning: '#ff9800',  // Orange - review, medium risk
  error: '#f44336',    // Red - blocked, high risk
  neutral: '#9e9e9e',  // Gray - unknown, inactive
};

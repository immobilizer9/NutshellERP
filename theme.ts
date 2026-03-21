import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  shape: {
    borderRadius: 18,
  },
  palette: {
    mode: "light",
    primary: {
      main: "#4F46E5", // modern indigo
    },
    background: {
      default: "#F9FAFB",
      paper: "#FFFFFF",
    },
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    h4: {
      fontWeight: 600,
      letterSpacing: "-0.5px",
    },
    body1: {
      fontSize: "0.95rem",
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: "rgba(255,255,255,0.8)",
          backdropFilter: "blur(12px)",
          boxShadow: "none",
          borderBottom: "1px solid rgba(0,0,0,0.04)",
          color: "#111",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#ffffff",
          borderRight: "1px solid rgba(0,0,0,0.04)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: "#ffffff",
          boxShadow:
            "0px 4px 20px rgba(0,0,0,0.04)",
          borderRadius: 20,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          textTransform: "none",
          fontWeight: 600,
          paddingLeft: 20,
          paddingRight: 20,
        },
        contained: {
          boxShadow: "0 6px 18px rgba(79,70,229,0.25)",
        },
      },
    },
  },
});
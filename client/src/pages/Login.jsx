import React, { useState, useContext, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";

import {
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Box,
  Avatar,
  Typography,
  Fade,
  Modal,
  Chip,
  Stack,
  Divider,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";
import LoginIcon from "@mui/icons-material/Login";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CircleIcon from "@mui/icons-material/Circle";
import CloseIcon from "@mui/icons-material/Close";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import SecurityIcon from "@mui/icons-material/Security";
import PaymentsIcon from "@mui/icons-material/Payments";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SavingsIcon from "@mui/icons-material/Savings";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import ShieldIcon from "@mui/icons-material/Shield";
import SpeedIcon from "@mui/icons-material/Speed";
import HandshakeIcon from "@mui/icons-material/Handshake";
import PeopleIcon from "@mui/icons-material/People";
import BusinessIcon from "@mui/icons-material/Business";
import AssessmentIcon from "@mui/icons-material/Assessment";
import ReceiptIcon from "@mui/icons-material/Receipt";
import ConstructionIcon from "@mui/icons-material/Construction";
import ArchitectureIcon from "@mui/icons-material/Architecture";
import EngineeringIcon from "@mui/icons-material/Engineering";
import ApartmentIcon from "@mui/icons-material/Apartment";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import BuildIcon from "@mui/icons-material/Build";

import { login } from "../api/authApi";

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useContext(UserContext);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  const slides = [
  {
    img: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80",
    title: "BANK BUILDINGS",
    desc: "Construction and management of Anbesa Bank's headquarters and regional office buildings.",
  },
  {
    img: "https://images.unsplash.com/photo-1486718448742-163732cd1544?w=1200&q=80",
    title: "BRANCH CONSTRUCTION",
    desc: "Expanding Anbesa Bank's branch network with modern, secure, and customer-friendly facilities.",
  },
  {
    img: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&q=80",
    title: "CORPORATE OFFICES",
    desc: "Developing corporate office spaces and administrative buildings for Anbesa Bank's operations.",
  },
  {
    img: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80",
    title: "MODERN BANKING HALLS",
    desc: "Designing modern, accessible, and secure banking halls with advanced technology integration.",
  },
  {
    img: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&q=80",
    title: "SUSTAINABLE CONSTRUCTION",
    desc: "Building eco-friendly and energy-efficient bank branches with sustainable construction practices.",
  },
  {
    img: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&q=80",
    title: "PROJECT MANAGEMENT",
    desc: "Comprehensive project management for Anbesa Bank's construction and branch development initiatives.",
  },
];

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login({ username, password });

      console.log("Login response:", res);

      if (res.error) {
        toast.error(res.error);
        setLoading(false);
        return;
      }

      if (!res.token) {
        toast.error("No token received from server");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", res.token);

      const tokenPayload = JSON.parse(atob(res.token.split(".")[1]));

      console.log("Token payload:", tokenPayload);

      const userData = {
        id: tokenPayload.id,
        name: tokenPayload.name,
        username: tokenPayload.username,
        role: tokenPayload.role,
        token: res.token,
        mustChangePassword: tokenPayload.mustChangePassword || false,
      };

      console.log("Setting user data:", userData);
      setUser(userData);

      if (tokenPayload.mustChangePassword) {
        toast.info("Please change your password before continuing.");
        setModalOpen(false);
        navigate("/change-password", { replace: true });
        return;
      }

      toast.success(`Welcome ${userData.name || userData.username}!`);

      const routes = {
        SUPER_ADMIN: "/dashboard",
        ADMIN: "/dashboard",
      };

      const targetRoute = routes[tokenPayload.role] || "/dashboard";
      navigate(targetRoute, { replace: true });
      setModalOpen(false);
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.message || "Auth System Failure");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        minHeight: "100vh",
        backgroundColor: "#FFFFFF",
      }}
    >
      {/* Slider - Fullscreen on mobile, 60% on desktop */}
      <Box
        sx={{
          width: { xs: "100%", md: "60%" },
          height: { xs: "100vh", md: "auto" },
          backgroundColor: "#FFFFFF",
          position: "relative",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          display: "flex",
        }}
      >
        {slides.map((slide, index) => (
          <Fade in={currentSlide === index} key={index} timeout={800}>
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.6)), url(${slide.img})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          </Fade>
        ))}

        {/* Anbesa Bank Badge */}
        <Box
          sx={{
            position: "absolute",
            top: 20,
            left: 20,
            zIndex: 10,
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            gap: 1.5,
            bgcolor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)",
            px: 2.5,
            py: 1.2,
            borderRadius: "50px",
            border: "1px solid rgba(218, 165, 32, 0.4)",
          }}
        >
          <AccountBalanceIcon sx={{ color: "#DAA520", fontSize: 28 }} />
          <Box>
            <Typography
              sx={{
                color: "#DAA520",
                fontWeight: 700,
                fontSize: "0.7rem",
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              Anbesa Bank S.C.
            </Typography>
            <Typography
              sx={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "0.55rem",
                letterSpacing: 1,
              }}
            >
              Construction Projects Management
            </Typography>
          </Box>
        </Box>

        {/* Navigation arrows */}
        <IconButton
          onClick={prevSlide}
          sx={{
            position: "absolute",
            left: { xs: 8, md: 20 },
            top: "50%",
            transform: "translateY(-50%)",
            color: "#fff",
            bgcolor: "rgba(0,0,0,0.5)",
            "&:hover": { bgcolor: "#DAA520", color: "#000" },
            zIndex: 10,
          }}
        >
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
        <IconButton
          onClick={nextSlide}
          sx={{
            position: "absolute",
            right: { xs: 8, md: 20 },
            top: "50%",
            transform: "translateY(-50%)",
            color: "#fff",
            bgcolor: "rgba(0,0,0,0.5)",
            "&:hover": { bgcolor: "#DAA520", color: "#000" },
            zIndex: 10,
          }}
        >
          <ArrowForwardIosIcon fontSize="small" />
        </IconButton>

        {/* Slide Content */}
        <Box
          sx={{
            position: "relative",
            zIndex: 2,
            maxWidth: 600,
            p: { xs: 2, md: 6 },
            pt: { xs: 8, md: 6 },
            borderRadius: { xs: "16px", md: "24px" },
            backgroundColor: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.5)",
            boxShadow: "0 15px 35px rgba(0,0,0,0.15)",
            textAlign: "center",
            mx: { xs: 2, md: 0 },
            mt: { xs: -4, md: 0 },
          }}
        >
          <Typography
            variant="overline"
            sx={{
              color: { xs: "#333", md: "#888" },
              fontWeight: 800,
              letterSpacing: { xs: 3, md: 5 },
              display: "block",
              mb: 1,
              fontSize: { xs: "0.55rem", md: "0.8rem" },
            }}
          >
            ANBESA BANK S.C. - CPMS
          </Typography>

          <Typography
            variant="h2"
            fontWeight={900}
            sx={{
              color: "#111",
              mb: 1.5,
              textTransform: "uppercase",
              lineHeight: 1.1,
              fontSize: { xs: "1.4rem", md: "2.6rem" },
            }}
          >
            {slides[currentSlide].title}
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: "#333",
              mb: { xs: 2.5, md: 4 },
              fontWeight: 500,
              lineHeight: 1.6,
              fontSize: { xs: "0.75rem", md: "1rem" },
            }}
          >
            {slides[currentSlide].desc}
          </Typography>

          {/* Dot indicators */}
          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              justifyContent: "center",
              mb: { xs: 2.5, md: 0 },
            }}
          >
            {slides.map((_, index) => (
              <CircleIcon
                key={index}
                onClick={() => setCurrentSlide(index)}
                sx={{
                  fontSize: { xs: 7, md: 10 },
                  cursor: "pointer",
                  color:
                    currentSlide === index ? "#DAA520" : "rgba(0,0,0,0.2)",
                  transition: "0.3s",
                  "&:hover": { color: "#DAA520" },
                }}
              />
            ))}
          </Box>

          {/* SIGN IN BUTTON - Only visible on mobile */}
          <Button
            variant="contained"
            fullWidth
            onClick={() => setModalOpen(true)}
            endIcon={<LoginIcon />}
            sx={{
              display: { xs: "flex", md: "none" },
              mt: 1.5,
              py: 1.5,
              borderRadius: "50px",
              fontSize: "0.85rem",
              fontWeight: 900,
              color: "#000",
              backgroundColor: "#DAA520",
              boxShadow: "0 8px 20px rgba(218, 165, 32, 0.4)",
              "&:hover": {
                backgroundColor: "#B8860B",
              },
            }}
          >
            ACCESS PROJECTS
          </Button>
        </Box>
      </Box>

      {/* Login Form - Desktop */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          width: "40%",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFFFFF",
          p: { md: 6 },
        }}
      >
        <Fade in timeout={1000}>
          <Box sx={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
            <Box
              sx={{
                width: 90,
                height: 90,
                margin: "0 auto 24px",
                borderRadius: "50%",
                background: "#DAA520",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 10px 40px rgba(218, 165, 32, 0.3)",
                border: "4px solid #DAA520",
              }}
            >
              <AccountBalanceIcon sx={{ fontSize: 45, color: "#000" }} />
            </Box>
            <Typography
              variant="h4"
              fontWeight={900}
              sx={{
                color: "#000",
                mb: 0.5,
                letterSpacing: -0.5,
                fontSize: "2rem",
              }}
            >
              WELCOME BACK
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#DAA520",
                fontWeight: 700,
                mb: 0.5,
                letterSpacing: 2,
                fontSize: "0.7rem",
                textTransform: "uppercase",
              }}
            >
              Anbesa Bank - CPMS
            </Typography>
            <Divider sx={{ my: 3, borderColor: "#EEE" }} />
            <Typography
              variant="body2"
              sx={{
                color: "#BBB",
                fontWeight: 500,
                mb: 4,
                fontSize: "0.85rem",
              }}
            >
              Manage construction projects efficiently
            </Typography>

            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                margin="normal"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: "#DAA520", fontSize: 24 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <PersonIcon sx={{ color: "#DAA520", fontSize: 20, opacity: 0.3 }} />
                    </InputAdornment>
                  ),
                }}
                sx={inputTheme}
              />

              {/* Password field with icon outside */}
              <Box sx={{ position: "relative", mt: 1 }}>
                <TextField
                  fullWidth
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: "#DAA520", fontSize: 24 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <LockIcon sx={{ color: "#DAA520", fontSize: 20, opacity: 0.3 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    ...inputTheme,
                    "& .MuiOutlinedInput-root": {
                      ...inputTheme["& .MuiOutlinedInput-root"],
                      paddingRight: "56px !important",
                    },
                  }}
                />
                <IconButton
                  onClick={togglePasswordVisibility}
                  onMouseDown={(e) => e.preventDefault()}
                  sx={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#DAA520",
                    zIndex: 1,
                  }}
                >
                  {showPassword ? (
                    <VisibilityOffIcon sx={{ color: "#DAA520" }} />
                  ) : (
                    <VisibilityIcon sx={{ color: "#DAA520" }} />
                  )}
                </IconButton>
              </Box>

              {/* Login Button */}
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 4 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  sx={{
                    py: 1.4,
                    px: 5,
                    borderRadius: 0,
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "#000",
                    backgroundColor: "#DAA520",
                    minWidth: 140,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    boxShadow: "0 8px 25px rgba(218, 165, 32, 0.35)",
                    "&:hover": {
                      backgroundColor: "#B8860B",
                    },
                    "&:disabled": {
                      backgroundColor: "#F0D060",
                    },
                  }}
                >
                  {loading ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        border: "2px solid rgba(0,0,0,0.2)",
                        borderTopColor: "#000",
                        animation: "spin 0.8s linear infinite",
                      }} />
                      Loading...
                    </Box>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </Box>

              <Box sx={{ mt: 4, textAlign: "center" }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#CCC",
                    fontSize: "0.65rem",
                    letterSpacing: 0.5,
                  }}
                >
                  Authorized personnel only - Secure System
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 1 }}>
                  <Chip
                    icon={<ConstructionIcon sx={{ fontSize: 14 }} />}
                    label="Active Projects"
                    size="small"
                    sx={{
                      bgcolor: "#F5F5F5",
                      color: "#666",
                      fontSize: "0.6rem",
                      fontWeight: 600,
                    }}
                  />
                  <Chip
                    icon={<SecurityIcon sx={{ fontSize: 14 }} />}
                    label="Secure Access"
                    size="small"
                    sx={{
                      bgcolor: "#F5F5F5",
                      color: "#666",
                      fontSize: "0.6rem",
                      fontWeight: 600,
                    }}
                  />
                </Box>
              </Box>
            </form>
          </Box>
        </Fade>
      </Box>

      {/* Mobile Login Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: "100%",
            maxWidth: 450,
            bgcolor: "#FFFFFF",
            borderRadius: 5,
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            p: { xs: 3, sm: 4, md: 5 },
            outline: "none",
            maxHeight: { xs: "90vh", sm: "85vh" },
            overflowY: "auto",
            mx: { xs: 2, sm: 3 },
            my: { xs: 2, sm: 3 },
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Close Button */}
          <IconButton
            onClick={() => setModalOpen(false)}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: "#666",
              zIndex: 1,
              "&:hover": {
                color: "#DAA520",
              },
            }}
          >
            <CloseIcon sx={{ fontSize: { xs: 22, sm: 26 } }} />
          </IconButton>

          <Box
            sx={{
              textAlign: "center",
              mt: { xs: 1, sm: 2 },
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Box
              sx={{
                width: { xs: 80, sm: 90 },
                height: { xs: 80, sm: 90 },
                margin: "0 auto 16px",
                borderRadius: "50%",
                background: "#DAA520",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 10px 40px rgba(218, 165, 32, 0.3)",
                border: "4px solid #DAA520",
              }}
            >
              <AccountBalanceIcon sx={{ fontSize: 40, color: "#000" }} />
            </Box>
            <Typography
              variant="h5"
              fontWeight={900}
              sx={{
                color: "#000",
                mb: 0.5,
                fontSize: { xs: "1.5rem", sm: "1.8rem" },
              }}
            >
              WELCOME BACK
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "#DAA520",
                fontWeight: 700,
                mb: 3,
                display: "block",
                letterSpacing: 1.5,
                fontSize: { xs: "0.65rem", sm: "0.7rem" },
                textTransform: "uppercase",
              }}
            >
              Anbesa Bank - CPMS
            </Typography>

            <form onSubmit={handleLogin} style={{ flex: 1 }}>
              <TextField
                fullWidth
                placeholder="Employee ID or Username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                margin="normal"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon
                        sx={{
                          color: "#DAA520",
                          fontSize: { xs: 22, sm: 24 },
                        }}
                      />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <PersonIcon
                        sx={{
                          color: "#DAA520",
                          fontSize: { xs: 18, sm: 20 },
                          opacity: 0.3,
                        }}
                      />
                    </InputAdornment>
                  ),
                }}
                sx={mobileInputTheme}
              />

              {/* Mobile Password field */}
              <Box sx={{ position: "relative", mt: 1 }}>
                <TextField
                  fullWidth
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon
                          sx={{
                            color: "#DAA520",
                            fontSize: { xs: 22, sm: 24 },
                          }}
                        />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <LockIcon
                          sx={{
                            color: "#DAA520",
                            fontSize: { xs: 18, sm: 20 },
                            opacity: 0.3,
                          }}
                        />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    ...mobileInputTheme,
                    "& .MuiOutlinedInput-root": {
                      ...mobileInputTheme["& .MuiOutlinedInput-root"],
                      paddingRight: "52px !important",
                    },
                  }}
                />
                <IconButton
                  onClick={togglePasswordVisibility}
                  onMouseDown={(e) => e.preventDefault()}
                  sx={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#DAA520",
                    zIndex: 1,
                  }}
                >
                  {showPassword ? (
                    <VisibilityOffIcon
                      sx={{
                        color: "#DAA520",
                        fontSize: { xs: 18, sm: 20 },
                      }}
                    />
                  ) : (
                    <VisibilityIcon
                      sx={{
                        color: "#DAA520",
                        fontSize: { xs: 18, sm: 20 },
                      }}
                    />
                  )}
                </IconButton>
              </Box>

              {/* Mobile Login Button */}
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: { xs: 3, sm: 4 } }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  sx={{
                    py: { xs: 1.4, sm: 1.6 },
                    px: { xs: 4, sm: 5 },
                    borderRadius: 0,
                    fontSize: { xs: "0.8rem", sm: "0.85rem" },
                    fontWeight: 700,
                    color: "#000",
                    backgroundColor: "#DAA520",
                    minWidth: { xs: 120, sm: 140 },
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    boxShadow: "0 8px 25px rgba(218, 165, 32, 0.35)",
                    "&:hover": {
                      backgroundColor: "#B8860B",
                    },
                  }}
                >
                  {loading ? "..." : "Sign In"}
                </Button>
              </Box>
            </form>
          </Box>
        </Box>
      </Modal>

      {/* CSS Animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </Box>
  );
};

const inputTheme = {
  "& .MuiOutlinedInput-root": {
    color: "#000",
    backgroundColor: "#FDFDFD",
    borderRadius: "0px",
    fontWeight: "bold",
    fontSize: "1rem",
    "& fieldset": { borderColor: "#EEE" },
    "&:hover fieldset": { borderColor: "#DAA520" },
    "&.Mui-focused fieldset": { borderColor: "#DAA520", borderWidth: "2px" },
  },
};

const mobileInputTheme = {
  "& .MuiOutlinedInput-root": {
    color: "#000",
    backgroundColor: "#FDFDFD",
    borderRadius: "0px",
    fontWeight: "bold",
    fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
    "& fieldset": { borderColor: "#EEE" },
    "&:hover fieldset": { borderColor: "#DAA520" },
    "&.Mui-focused fieldset": { borderColor: "#DAA520", borderWidth: "2px" },
  },
};

export default Login;
// pages/designAndConstruction/Construction.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Stack,
  useMediaQuery,
  useTheme,
  Button,
  Divider,
} from "@mui/material";
import {
  Construction as ConstructionIcon,
  Business as BusinessIcon,  // Changed from Building to Business
  Engineering as EngineeringIcon,
  Handyman as HandymanIcon,
} from "@mui/icons-material";

const Construction = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const getContainerMargin = () => {
    if (isMobile) return "0px";
    return "4px";
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5", py: isMobile ? 1 : 2 }}>
      <Container
        maxWidth={false}
        sx={{
          ml: getContainerMargin(),
          mr: isMobile ? 0 : "4px",
          px: { xs: 1, sm: 2, md: 0.5 },
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ConstructionIcon sx={{ fontSize: 32, color: '#DAA520' }} />
            <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold" color="#DAA520">
              Construction Management
            </Typography>
          </Box>
        </Box>

        {/* Welcome Section */}
        <Paper
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 2,
            background: 'linear-gradient(135deg, #ffffff 0%, #faf8f0 100%)',
            border: '1px solid #e8e0d0',
            mb: 4,
          }}
        >
          <Stack spacing={2} alignItems="center" textAlign="center">
            <ConstructionIcon sx={{ fontSize: 64, color: '#DAA520' }} />
            <Typography variant="h4" fontWeight="bold" color="#1a1a2e">
              Welcome to Construction Management
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
              Oversee and manage all construction projects, sites, and activities 
              from planning to completion.
            </Typography>
            <Button
              variant="contained"
              startIcon={<ConstructionIcon />}
              sx={{
                mt: 1,
                bgcolor: '#DAA520',
                '&:hover': { bgcolor: '#b8860b' },
                px: 4,
                py: 1.2,
              }}
            >
              New Project
            </Button>
          </Stack>
        </Paper>

        {/* Quick Stats Cards */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <BusinessIcon sx={{ fontSize: 40, color: '#DAA520', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold" color="#1a1a2e">
                  0
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Projects
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <EngineeringIcon sx={{ fontSize: 40, color: '#2e7d32', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold" color="#1a1a2e">
                  0
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sites
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <HandymanIcon sx={{ fontSize: 40, color: '#ed6c02', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold" color="#1a1a2e">
                  0
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Equipment
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <ConstructionIcon sx={{ fontSize: 40, color: '#757575', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold" color="#1a1a2e">
                  0
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completed
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Paper sx={{ mt: 3, p: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="600" color="#1a1a2e" sx={{ mb: 2 }}>
            Quick Actions
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<BusinessIcon />}
                sx={{ borderColor: '#DAA520', color: '#DAA520', py: 1.5 }}
              >
                New Project
              </Button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<EngineeringIcon />}
                sx={{ borderColor: '#2e7d32', color: '#2e7d32', py: 1.5 }}
              >
                View Sites
              </Button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<HandymanIcon />}
                sx={{ borderColor: '#ed6c02', color: '#ed6c02', py: 1.5 }}
              >
                Equipment
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: '#ccc', fontSize: '0.65rem' }}>
            © {new Date().getFullYear()} Anbesa Bank. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Construction;
// components/layout/DashboardLayout.jsx
import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Box, GlobalStyles } from "@mui/material";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

const DashboardLayout = ({ menu, title, isMobile }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState(title || "");

  const SIDEBAR_WIDTH = 240;

  // Handle title change from sidebar
  const handleTitleChange = (newTitle) => {
    setPageTitle(newTitle);
  };

  return (
    <>
      <GlobalStyles
        styles={{
          "*::-webkit-scrollbar": {
            width: "8px",
            height: "8px",
          },

          "*::-webkit-scrollbar-track": {
            backgroundColor: "#f5f5f5",
            borderRadius: "4px",
          },

          "*::-webkit-scrollbar-thumb": {
            backgroundColor: "#FFD600",
            borderRadius: "4px",
          },

          "*::-webkit-scrollbar-thumb:hover": {
            backgroundColor: "#ffcc00",
          },
        }}
      />

      <Box
        sx={{
          minHeight: "100vh",
          width: "100%",
          bgcolor: "#f5f5f5",
        }}
      >
        {/* =========================
            DESKTOP SIDEBAR
        ========================= */}
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,

            width: `${SIDEBAR_WIDTH}px`,

            zIndex: 1200,
            overflow: "hidden",

            display: {
              xs: "none",
              md: "block",
            },
          }}
        >
          <Sidebar
            menu={menu}
            isMobile={isMobile}
            mobileOpen={mobileOpen}
            setMobileOpen={setMobileOpen}
            onTitleChange={handleTitleChange}
          />
        </Box>

        {/* =========================
            MAIN CONTENT
        ========================= */}
        <Box
          component="main"
          sx={{
            ml: {
              xs: "8px",
              md: `${SIDEBAR_WIDTH + 8}px`,
            },

            mr: "8px",

            width: {
              xs: "calc(100% - 16px)",
              md: `calc(100% - ${SIDEBAR_WIDTH + 16}px)`,
            },

            minHeight: "100vh",
            minWidth: 0,

            display: "flex",
            flexDirection: "column",

            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {/* =========================
              TOP BAR
          ========================= */}
          <TopBar
            title={pageTitle}
            isMobile={isMobile}
            onMenuClick={() => setMobileOpen(true)}
            sidebarWidth={SIDEBAR_WIDTH}
          />

          {/* =========================
              PAGE CONTENT
          ========================= */}
          <Box
            sx={{
              flexGrow: 1,
              minWidth: 0,
              p: 0,
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default DashboardLayout;
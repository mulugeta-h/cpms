// components/layout/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Collapse,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import CircleIcon from '@mui/icons-material/Circle';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useNavigate, useLocation } from 'react-router-dom';

const SIDEBAR_WIDTH = 240;

const Sidebar = ({
  menu,
  isMobile,
  mobileOpen,
  setMobileOpen,
  desktopCollapsed,
  setDesktopCollapsed,
  hovered,
  setHovered,
  onTitleChange, // New prop for title change
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openSubMenus, setOpenSubMenus] = useState({});

  const isExpanded = !desktopCollapsed || hovered;

  // Find and update title when location changes
  useEffect(() => {
    const findTitle = (items) => {
      for (const item of items) {
        if (item.path === location.pathname && item.title) {
          return item.title;
        }
        if (item.subItems) {
          for (const subItem of item.subItems) {
            if (subItem.path === location.pathname && subItem.title) {
              return subItem.title;
            }
            // Check for sub-sub items if they exist
            if (subItem.subItems) {
              for (const subSubItem of subItem.subItems) {
                if (subSubItem.path === location.pathname && subSubItem.title) {
                  return subSubItem.title;
                }
              }
            }
          }
        }
      }
      // If no title found, try to find by name
      for (const item of items) {
        if (item.path === location.pathname) {
          return item.name;
        }
        if (item.subItems) {
          for (const subItem of item.subItems) {
            if (subItem.path === location.pathname) {
              return subItem.name;
            }
          }
        }
      }
      return null;
    };

    const currentTitle = findTitle(menu);
    if (currentTitle && onTitleChange) {
      onTitleChange(currentTitle);
    }
  }, [location.pathname, menu, onTitleChange]);

  const handleNavigation = (item) => {
    navigate(item.path);
    if (isMobile) setMobileOpen(false);
  };

  const handleToggleSubMenu = (itemName) => {
    setOpenSubMenus(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
  };

  const isActive = (path) => location.pathname === path;

  const isSubItemActive = (subItems) => {
    if (!subItems) return false;
    return subItems.some(subItem => location.pathname === subItem.path);
  };

  const sidebarContent = (
    <Box
      sx={{
        width: isMobile ? '100%' : SIDEBAR_WIDTH,
        height: '100%',
        bgcolor: '#000000',
        color: '#DAA520',
        display: 'flex',
        flexDirection: 'column',
        transition: isMobile ? 'none' : 'width 0.25s ease-in-out',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: (isMobile || isExpanded) ? 'space-between' : 'center',
          px: 2,
          py: 1.5,
          borderBottom: '1px solid #DAA520',
          minHeight: 64,
          height: 64,
        }}
      >
        {(isMobile || isExpanded) && (
          <Typography
            variant="h6"
            sx={{
              fontWeight: 'bold',
              color: '#DAA520',
              whiteSpace: 'nowrap',
              opacity: isExpanded ? 1 : 0,
              transition: 'opacity 0.2s ease',
              fontSize: '1rem',
              letterSpacing: '1px',
            }}
          >
            ANBESA BANK
          </Typography>
        )}
        
        {!isMobile && (
          <IconButton
            onClick={() => {
              setDesktopCollapsed(!desktopCollapsed);
              setHovered(false);
            }}
            sx={{
              color: '#DAA520',
              '&:hover': { bgcolor: 'rgba(218, 165, 32, 0.1)' },
              transform: desktopCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.3s ease',
              p: 0.5,
            }}
          >
            <MenuIcon sx={{ fontSize: '1.5rem', color: '#DAA520' }} />
          </IconButton>
        )}
        
        {isMobile && (
          <IconButton
            onClick={() => setMobileOpen(false)}
            sx={{
              color: '#DAA520',
              '&:hover': { bgcolor: 'rgba(218, 165, 32, 0.1)' },
              p: 0.5,
            }}
          >
            <ChevronLeftIcon sx={{ fontSize: '1.5rem' }} />
          </IconButton>
        )}
      </Box>

      {/* Menu Items */}
      <List sx={{ 
        flex: 1, 
        py: 1.5, 
        px: 0,
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#1d1b18',
          borderRadius: '4px',
        },
      }}>
        {menu.map((item) => {
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isOpen = openSubMenus[item.name] || false;
          const isItemActive = isActive(item.path);
          const isSubActive = isSubItemActive(item.subItems);
          const showText = isMobile || isExpanded;
          
          const isParentSelected = hasSubItems 
            ? (isSubActive && !isExpanded)
            : isItemActive;
          
          const showEffects = !hasSubItems;

          return (
            <React.Fragment key={item.path || item.name}>
              <ListItem
                onClick={() => {
                  if (hasSubItems) {
                    handleToggleSubMenu(item.name);
                  } else {
                    handleNavigation(item);
                  }
                }}
                sx={{
                  cursor: 'pointer',
                  py: 0.8,
                  pl: isExpanded ? '16px' : '0px',
                  pr: 0,
                  mb: 0.3,
                  position: 'relative',
                  zIndex: 2,
                  borderTopLeftRadius: (showEffects && isParentSelected) 
                    ? '50px' 
                    : (hasSubItems && isSubActive && !isExpanded) 
                      ? '50px' 
                      : '0px',
                  borderTopRightRadius: 0,
                  borderBottomLeftRadius: (showEffects && isParentSelected) 
                    ? '50px' 
                    : (hasSubItems && isSubActive && !isExpanded) 
                      ? '50px' 
                      : '0px',
                  borderBottomRightRadius: 0,
                  backgroundColor: (showEffects && isParentSelected) 
                    ? "#f5f5f5"
                    : (hasSubItems && isSubActive && !isExpanded) 
                      ? "#f5f5f5"
                      : 'transparent',
                  justifyContent: showText ? 'flex-start' : 'center',
                  minHeight: 36,
                  width: '100%',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    backgroundColor: (showEffects && isParentSelected) 
                      ? '#f5f5f5' 
                      : (hasSubItems && isSubActive && !isExpanded)
                        ? '#f5f5f5'
                        : (showEffects ? 'rgba(255, 255, 255, 0.08)' : 'transparent'),
                    borderTopLeftRadius: (showEffects && isParentSelected) 
                      ? '30px' 
                      : (hasSubItems && isSubActive && !isExpanded)
                        ? '30px'
                        : '0px',
                    borderBottomLeftRadius: (showEffects && isParentSelected) 
                      ? '30px' 
                      : (hasSubItems && isSubActive && !isExpanded)
                        ? '30px'
                        : '0px',
                  },
                  '&::before': (showEffects && isParentSelected) ? {
                    content: '""',
                    position: 'absolute',
                    right: 0,
                    top: '-50px',
                    width: '50px',
                    height: '50px',
                    backgroundColor: 'transparent',
                    borderRadius: '50%',
                    boxShadow: '35px 35px 0 10px #f5f5f5',
                    pointerEvents: 'none',
                    zIndex: 1,
                  } : 
                  (hasSubItems && isSubActive && !isExpanded) ? {
                    content: '""',
                    position: 'absolute',
                    right: 0,
                    top: '-50px',
                    width: '50px',
                    height: '50px',
                    backgroundColor: 'transparent',
                    borderRadius: '50%',
                    boxShadow: '35px 35px 0 10px #f5f5f5',
                    pointerEvents: 'none',
                    zIndex: 1,
                  } : {},
                  '&::after': (showEffects && isParentSelected) ? {
                    content: '""',
                    position: 'absolute',
                    right: 0,
                    bottom: '-50px',
                    width: '50px',
                    height: '50px',
                    backgroundColor: 'transparent',
                    borderRadius: '50%',
                    boxShadow: '35px -35px 0 10px #f5f5f5',
                    pointerEvents: 'none',
                    zIndex: 1,
                  } : 
                  (hasSubItems && isSubActive && !isExpanded) ? {
                    content: '""',
                    position: 'absolute',
                    right: 0,
                    bottom: '-50px',
                    width: '50px',
                    height: '50px',
                    backgroundColor: 'transparent',
                    borderRadius: '50%',
                    boxShadow: '35px -35px 0 10px #f5f5f5',
                    pointerEvents: 'none',
                    zIndex: 1,
                  } : {},
                  '&:hover::before': showText && showEffects ? {
                    content: '""',
                    position: 'absolute',
                    right: 0,
                    top: '-50px',
                    width: '50px',
                    height: '50px',
                    backgroundColor: 'transparent',
                    borderRadius: '50%',
                    boxShadow: isParentSelected 
                      ? '35px 35px 0 10px #f5f5f5'
                      : '35px 35px 0 10px rgba(255, 255, 255, 0.08)',
                    pointerEvents: 'none',
                    zIndex: 1,
                  } : (hasSubItems && isSubActive && !isExpanded) ? {
                    content: '""',
                    position: 'absolute',
                    right: 0,
                    top: '-50px',
                    width: '50px',
                    height: '50px',
                    backgroundColor: 'transparent',
                    borderRadius: '50%',
                    boxShadow: '35px 35px 0 10px #f5f5f5',
                    pointerEvents: 'none',
                    zIndex: 1,
                  } : {},
                  '&:hover::after': showText && showEffects ? {
                    content: '""',
                    position: 'absolute',
                    right: 0,
                    bottom: '-50px',
                    width: '50px',
                    height: '50px',
                    backgroundColor: 'transparent',
                    borderRadius: '50%',
                    boxShadow: isParentSelected 
                      ? '35px -35px 0 10px #f5f5f5'
                      : '35px -35px 0 10px rgba(255, 255, 255, 0.08)',
                    pointerEvents: 'none',
                    zIndex: 1,
                  } : (hasSubItems && isSubActive && !isExpanded) ? {
                    content: '""',
                    position: 'absolute',
                    right: 0,
                    bottom: '-50px',
                    width: '50px',
                    height: '50px',
                    backgroundColor: 'transparent',
                    borderRadius: '50%',
                    boxShadow: '35px -35px 0 10px #f5f5f5',
                    pointerEvents: 'none',
                    zIndex: 1,
                  } : {},
                }}
              >
                <ListItemIcon
                  sx={{
                    color: '#DAA520',
                    minWidth: showText ? 40 : 'auto',
                    justifyContent: 'center',
                    mr: showText ? 1 : 0,
                  }}
                >
                  {React.cloneElement(item.icon, { sx: { fontSize: '1.6rem' } })}
                </ListItemIcon>
                {showText && (
                  <>
                    <ListItemText
                      primary={item.name}
                      primaryTypographyProps={{
                        sx: {
                          fontWeight: (showEffects && isParentSelected) ? 600 : 
                            (hasSubItems && isSubActive && !isExpanded) ? 600 : 400,
                          fontSize: '0.5rem',
                          whiteSpace: 'nowrap',
                          color: (showEffects && isParentSelected) 
                            ? '#000000' 
                            : (hasSubItems && isSubActive && !isExpanded) 
                              ? '#000000'
                              : '#ffffff',
                          letterSpacing: '0.5px',
                        },
                      }}
                    />
                    {hasSubItems && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 0 }}>
                        <FiberManualRecordIcon 
                          sx={{ 
                            color: isOpen ? '#DAA520' : '#666', 
                            fontSize: '0.6rem',
                            opacity: isOpen ? 1 : 0.5,
                          }} 
                        />
                        {isOpen ? 
                          <ExpandLess sx={{ 
                            color: '#ffffff', 
                            fontSize: '1.2rem' 
                          }} /> : 
                          <ExpandMore sx={{ 
                            color: '#ffffff', 
                            fontSize: '1.2rem' 
                          }} />
                        }
                      </Box>
                    )}
                    
                    {!hasSubItems && (
                      <ArrowForwardIosIcon 
                        sx={{ 
                          color: (showEffects && isParentSelected) ? '#DAA520' : '#555', 
                          fontSize: '0.8rem',
                          opacity: 0.5,
                          mr: 0,
                        }} 
                      />
                    )}
                  </>
                )}
              </ListItem>

              {hasSubItems && showText && (
                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding sx={{ px: 0 }}>
                    {item.subItems.map((subItem) => {
                      const isSubItemActive = isActive(subItem.path);
                      const hasSubSubItems = subItem.subItems && subItem.subItems.length > 0;
                      const showSubEffects = !hasSubSubItems;

                      return (
                        <ListItem
                          key={subItem.path}
                          onClick={() => handleNavigation(subItem)}
                          sx={{
                            cursor: 'pointer',
                            py: 0.6,
                            pl: '36px',
                            pr: 0,
                            mb: 0.15,
                            position: 'relative',
                            zIndex: 2,
                            borderTopLeftRadius: (showSubEffects && isSubItemActive) ? '50px' : '0px',
                            borderTopRightRadius: 0,
                            borderBottomLeftRadius: (showSubEffects && isSubItemActive) ? '50px' : '0px',
                            borderBottomRightRadius: 0,
                            backgroundColor: (showSubEffects && isSubItemActive) 
                              ? '#f5f5f5' 
                              : 'transparent',
                            width: '100%',
                            minHeight: 32,
                            '&:hover': {
                              backgroundColor: (showSubEffects && isSubItemActive) 
                                ? '#f5f5f5' 
                                : (showSubEffects ? 'rgba(255, 255, 255, 0.06)' : 'transparent'),
                              borderTopLeftRadius: (showSubEffects && isSubItemActive) ? '30px' : '0px',
                              borderBottomLeftRadius: (showSubEffects && isSubItemActive) ? '30px' : '0px',
                            },
                            '&::before': (showSubEffects && isSubItemActive) ? {
                              content: '""',
                              position: 'absolute',
                              right: 0,
                              top: '-50px',
                              width: '50px',
                              height: '50px',
                              backgroundColor: 'transparent',
                              borderRadius: '50%',
                              boxShadow: '35px 35px 0 10px #f5f5f5',
                              pointerEvents: 'none',
                              zIndex: 1,
                            } : {},
                            '&::after': (showSubEffects && isSubItemActive) ? {
                              content: '""',
                              position: 'absolute',
                              right: 0,
                              bottom: '-50px',
                              width: '50px',
                              height: '50px',
                              backgroundColor: 'transparent',
                              borderRadius: '50%',
                              boxShadow: '35px -35px 0 10px #f5f5f5',
                              pointerEvents: 'none',
                              zIndex: 1,
                            } : {},
                            '&:hover::before': showSubEffects ? {
                              content: '""',
                              position: 'absolute',
                              right: 0,
                              top: '-50px',
                              width: '50px',
                              height: '50px',
                              backgroundColor: 'transparent',
                              borderRadius: '50%',
                              boxShadow: isSubItemActive 
                                ? '35px 35px 0 10px #f5f5f5'
                                : '35px 35px 0 10px rgba(255, 255, 255, 0.06)',
                              pointerEvents: 'none',
                              zIndex: 1,
                            } : {},
                            '&:hover::after': showSubEffects ? {
                              content: '""',
                              position: 'absolute',
                              right: 0,
                              bottom: '-50px',
                              width: '50px',
                              height: '50px',
                              backgroundColor: 'transparent',
                              borderRadius: '50%',
                              boxShadow: isSubItemActive 
                                ? '35px -35px 0 10px #f5f5f5'
                                : '35px -35px 0 10px rgba(255, 255, 255, 0.06)',
                              pointerEvents: 'none',
                              zIndex: 1,
                            } : {},
                          }}
                        >
                          <Box sx={{ 
                            mr: 1.5, 
                            display: 'flex', 
                            alignItems: 'center',
                            minWidth: 16,
                          }}>
                            <CircleIcon 
                              sx={{ 
                                color: isSubItemActive ? '#DAA520' : '#555', 
                                fontSize: '0.5rem',
                              }} 
                            />
                          </Box>
                          <ListItemText
                            primary={subItem.name}
                            primaryTypographyProps={{
                              sx: {
                                fontSize: '0.75rem',
                                color: (showSubEffects && isSubItemActive) 
                                  ? '#000000' 
                                  : '#cccccc',
                                fontWeight: (showSubEffects && isSubItemActive) ? 500 : 400,
                                letterSpacing: '0.3px',
                              },
                            }}
                          />
                          {isSubItemActive && (
                            <ArrowRightIcon 
                              sx={{ 
                                color: '#DAA520', 
                                fontSize: '0.9rem',
                                mr: 0,
                              }} 
                            />
                          )}
                        </ListItem>
                      );
                    })}
                  </List>
                </Collapse>
              )}
            </React.Fragment>
          );
        })}
      </List>

      {/* Footer */}
      {(isMobile || isExpanded) && (
        <Box
          sx={{
            p: 1.2,
            borderTop: '1px solid #DAA520',
            textAlign: 'center',
            opacity: isExpanded ? 1 : 0,
            transition: 'opacity 0.2s ease',
            minHeight: 60,
            height: 60,
          }}
        >
          <Typography variant="caption" sx={{ color: '#DAA520', fontSize: '0.6rem' }}>
            © {new Date().getFullYear()} Anbesa Bank
          </Typography>
          <Typography variant="caption" sx={{ color: '#666', display: 'block', fontSize: '0.55rem' }}>
            CPMS v2.0
          </Typography>
        </Box>
      )}
      
      {!isMobile && !isExpanded && (
        <Box
          sx={{
            p: 0.8,
            borderTop: '1px solid #DAA520',
            textAlign: 'center',
            minHeight: 60,
            height: 60,
          }}
        >
          <Typography variant="caption" sx={{ color: '#DAA520', fontSize: '0.55rem' }}>
            v2.0
          </Typography>
        </Box>
      )}
    </Box>
  );

  // Desktop: Fixed position
  if (!isMobile) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          zIndex: 1200,
        }}
      >
        {sidebarContent}
      </Box>
    );
  }

  // Mobile: Drawer with proper width
  return (
    <Drawer
      anchor="left"
      open={mobileOpen}
      onClose={() => setMobileOpen(false)}
      sx={{
        '& .MuiDrawer-paper': {
          width: '85%',
          maxWidth: 320,
          bgcolor: '#000000',
          borderRight: '1px solid #DAA520',
          boxSizing: 'border-box',
        },
      }}
    >
      {sidebarContent}
    </Drawer>
  );
};

export default Sidebar;
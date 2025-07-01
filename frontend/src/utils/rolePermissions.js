/**
 * Role Permissions Utility
 * Centralized configuration for role-based access control
 */

// Define all user roles in the system
export const USER_ROLES = {
    SUPER_ADMIN: 'super_admin',
    TENANT_ADMIN: 'tenant_admin',
    USER: 'user'
  };
  
  // Define all route paths in the system
  export const ROUTE_PATHS = {
    AI_COACH: '/ai-coach',
    REPORT_WRITER: '/report-writer',
    ARCHIVE: '/archive',
    USER_ADMIN: '/user-admin'
  };
  
  // Define which roles can access which routes
  export const ROUTE_PERMISSIONS = {
    [ROUTE_PATHS.AI_COACH]: [
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.USER
    ],
    [ROUTE_PATHS.REPORT_WRITER]: [
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.USER
    ],
    [ROUTE_PATHS.ARCHIVE]: [
      USER_ROLES.SUPER_ADMIN  // Only super_admin
    ],
    [ROUTE_PATHS.USER_ADMIN]: [
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.TENANT_ADMIN
    ]
  };
  
  // Define navigation menu items with their metadata
  export const NAVIGATION_ITEMS = [
    {
      path: ROUTE_PATHS.AI_COACH,
      label: 'AI Coach',
      icon: 'MdSmartToy',
      allowedRoles: ROUTE_PERMISSIONS[ROUTE_PATHS.AI_COACH]
    },
    {
      path: ROUTE_PATHS.REPORT_WRITER,
      label: 'Report Writer',
      icon: 'MdDescription',
      allowedRoles: ROUTE_PERMISSIONS[ROUTE_PATHS.REPORT_WRITER]
    },
    {
      path: ROUTE_PATHS.ARCHIVE,
      label: 'Archive',
      icon: 'MdArchive',
      allowedRoles: ROUTE_PERMISSIONS[ROUTE_PATHS.ARCHIVE]
    },
    {
      path: ROUTE_PATHS.USER_ADMIN,
      label: 'User Admin',
      icon: 'MdAdminPanelSettings',
      allowedRoles: ROUTE_PERMISSIONS[ROUTE_PATHS.USER_ADMIN]
    }
  ];
  
  // Define default landing pages for each role
  export const DEFAULT_PATHS = {
    [USER_ROLES.SUPER_ADMIN]: ROUTE_PATHS.AI_COACH,
    [USER_ROLES.TENANT_ADMIN]: ROUTE_PATHS.AI_COACH,
    [USER_ROLES.USER]: ROUTE_PATHS.AI_COACH
  };
  
  /**
   * Check if a user role has access to a specific route
   * @param {string} userRole - Current user's role
   * @param {string} routePath - Route path to check
   * @returns {boolean} - Whether the user has access
   */
  export const hasRouteAccess = (userRole, routePath) => {
    if (!userRole || !routePath) return false;
    
    const allowedRoles = ROUTE_PERMISSIONS[routePath] || [];
    return allowedRoles.includes(userRole);
  };
  
  /**
   * Get all accessible routes for a user role
   * @param {string} userRole - Current user's role
   * @returns {Array} - Array of accessible route paths
   */
  export const getAccessibleRoutes = (userRole) => {
    if (!userRole) return [];
    
    return Object.keys(ROUTE_PERMISSIONS).filter(route => 
      hasRouteAccess(userRole, route)
    );
  };
  
  /**
   * Get navigation items that a user role can access
   * @param {string} userRole - Current user's role
   * @returns {Array} - Array of navigation items the user can access
   */
  export const getAccessibleNavigationItems = (userRole) => {
    if (!userRole) return [];
    
    return NAVIGATION_ITEMS.filter(item => 
      item.allowedRoles.includes(userRole)
    );
  };
  
  /**
   * Get the default path for a user role
   * @param {string} userRole - Current user's role
   * @returns {string} - Default path for the role
   */
  export const getDefaultPathForRole = (userRole) => {
    return DEFAULT_PATHS[userRole] || ROUTE_PATHS.AI_COACH;
  };
  
  /**
   * Check if a user role is an admin role (super_admin or tenant_admin)
   * @param {string} userRole - Current user's role
   * @returns {boolean} - Whether the user is an admin
   */
  export const isAdminRole = (userRole) => {
    return [USER_ROLES.SUPER_ADMIN, USER_ROLES.TENANT_ADMIN].includes(userRole);
  };
  
  /**
   * Check if a user role is super admin
   * @param {string} userRole - Current user's role
   * @returns {boolean} - Whether the user is super admin
   */
  export const isSuperAdmin = (userRole) => {
    return userRole === USER_ROLES.SUPER_ADMIN;
  };
  
  /**
   * Get a human-readable label for a user role
   * @param {string} userRole - Current user's role
   * @returns {string} - Human-readable role label
   */
  export const getRoleLabel = (userRole) => {
    const roleLabels = {
      [USER_ROLES.SUPER_ADMIN]: 'Super Admin',
      [USER_ROLES.TENANT_ADMIN]: 'Tenant Admin',
      [USER_ROLES.USER]: 'User'
    };
    
    return roleLabels[userRole] || 'Unknown Role';
  };
  
  /**
   * Validate if a role exists in the system
   * @param {string} role - Role to validate
   * @returns {boolean} - Whether the role is valid
   */
  export const isValidRole = (role) => {
    return Object.values(USER_ROLES).includes(role);
  };
  
  /**
   * Get all roles that can access a specific route
   * @param {string} routePath - Route path to check
   * @returns {Array} - Array of roles that can access the route
   */
  export const getRolesForRoute = (routePath) => {
    return ROUTE_PERMISSIONS[routePath] || [];
  };
  
  // Export route access summary for debugging/documentation
  export const getAccessMatrix = () => {
    const matrix = {};
    
    Object.values(USER_ROLES).forEach(role => {
      matrix[role] = {
        role: role,
        label: getRoleLabel(role),
        accessibleRoutes: getAccessibleRoutes(role),
        defaultPath: getDefaultPathForRole(role),
        isAdmin: isAdminRole(role),
        isSuperAdmin: isSuperAdmin(role)
      };
    });
    
    return matrix;
  };
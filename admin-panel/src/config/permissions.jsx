// 🔐 SINGLE SOURCE OF TRUTH FOR ALL PERMISSIONS

export const PERMISSIONS_CONFIG = {
  Dashboard: [
    { key: "VIEW_DASHBOARD", label: "View Dashboard" },
  ], 

  Users: [
    { key: "VIEW_USERS", label: "View Users" },
    { key: "SUSPEND_USER", label: "Suspend User" },
    { key: "DELETE_USER", label: "Delete User" },
  ],
    
  Reels: [
    { key: "VIEW_REELS", label: "View Reels" },
    { key: "BLOCK_REEL", label: "Block Reel" },
    { key: "DELETE_REEL", label: "Delete Reel" },
  ],

  Comments: [
    { key: "VIEW_COMMENTS", label: "View Comments" },
    { key: "DELETE_COMMENT", label: "Delete Comment" },
  ],

  Music: [
    { key: "VIEW_MUSIC", label: "View Music" },
    { key: "DELETE_MUSIC", label: "Delete Music" },
  ],

  Notifications: [
    { key: "VIEW_NOTIFICATIONS", label: "View Notifications" },
  ],

  Staffs: [
    { key: "VIEW_STAFFS", label: "View All Staffs" },
    { key: "ADD_STAFF", label: "Add Staff" },
    { key: "EDIT_STAFF", label: "Edit Staff" },
    { key: "DELETE_STAFF", label: "Delete Staff" },

    { key: "ADD_ROLE", label: "Add Role" },
    { key: "EDIT_ROLE", label: "Edit Role" },
    { key: "DELETE_ROLE", label: "Delete Role" },
  ],
};

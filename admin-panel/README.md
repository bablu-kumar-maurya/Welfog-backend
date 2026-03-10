# Neo Reels Admin Panel

A professional, modern, and scalable admin panel for managing the Neo Reels platform.

## Features

✨ **Modern UI/UX**
- Clean, professional dark theme design
- Responsive layout for all devices
- Smooth animations and transitions
- Intuitive navigation

📊 **Analytics Dashboard**
- Real-time statistics and metrics
- Interactive charts (Line, Bar, Pie)
- User engagement analytics
- Content performance tracking

👥 **User Management**
- View all registered users
- Search and filter capabilities
- Suspend/Activate user accounts
- View detailed user profiles
- Track followers and following

🎬 **Content Management**
- **Reels**: View, block, and delete video content
- **Music**: Manage audio tracks library
- **Comments**: Moderate user comments
- Filter by status and search

🔔 **Notifications**
- View all system notifications
- Filter by type (like, comment, follow)
- Track user interactions

⚙️ **Settings**
- Configure platform settings
- Change admin password
- System information display

🔐 **Security**
- Admin-only authentication
- JWT token-based sessions
- Protected routes
- Secure password handling

## Technology Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Icons**: React Icons
- **Notifications**: React Hot Toast

## Installation

### Prerequisites

- Node.js 16+ and npm
- Neo Reels Backend running on port 4000

### Setup

1. **Navigate to admin panel directory**
   ```bash
   cd admin-panel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

   The admin panel will be available at `http://localhost:3000`

4. **Build for production**
   ```bash
   npm run build
   ```

   The optimized build will be in the `dist` folder.

## Backend Setup

### 1. Create First Admin Account

Before using the admin panel, you need to create an admin account. You can do this in two ways:

**Option A: Using API endpoint (Recommended for first-time setup)**

```bash
curl -X POST http://localhost:4000/api/admin/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-secure-password",
    "email": "admin@neoreels.com"
  }'
```

**Option B: Using MongoDB directly**

```javascript
// Run this in MongoDB shell or Compass
db.admins.insertOne({
  username: "admin",
  password: "$2a$10$...", // Use bcrypt to hash your password
  email: "admin@neoreels.com",
  role: "superadmin",
  createdAt: new Date(),
  updatedAt: new Date()
});
```

**Important Security Notes:**
- The `/api/admin/create` endpoint only works if NO admin exists in the database
- After creating the first admin, this endpoint will be automatically disabled
- Store your admin credentials securely
- Use a strong password (minimum 6 characters, recommended 12+)

### 2. Environment Variables

Ensure your backend has the following in `.env`:

```env
JWT_SECRET=your-very-secure-secret-key
PORT=4000
MONGO_URI=your-mongodb-connection-string
```

### 3. CORS Configuration

The backend is already configured to accept requests from `http://localhost:3000` (admin panel). If you deploy to a different domain, update the CORS settings in `server.js`:

```javascript
app.use(cors({
  origin: process.env.ADMIN_PANEL_URL || 'http://localhost:3000',
  credentials: true,
}));
```

## Default Login Credentials

After creating your admin account using the steps above, use those credentials to login.

**Example:**
- Username: `admin`
- Password: `your-secure-password`

**⚠️ Important**: Change the default password immediately after first login through Settings > Change Password.

## Project Structure

```
admin-panel/
├── src/
│   ├── components/        # Reusable components
│   │   ├── Layout.jsx     # Main layout wrapper
│   │   ├── Sidebar.jsx    # Navigation sidebar
│   │   ├── Navbar.jsx     # Top navigation bar
│   │   └── StatCard.jsx   # Statistics card component
│   ├── context/           # React context providers
│   │   └── AuthContext.jsx # Authentication context
│   ├── pages/             # Page components
│   │   ├── Login.jsx      # Login page
│   │   ├── Dashboard.jsx  # Analytics dashboard
│   │   ├── Users.jsx      # User management
│   │   ├── Reels.jsx      # Reel management
│   │   ├── Music.jsx      # Music management
│   │   ├── Comments.jsx   # Comment moderation
│   │   ├── Notifications.jsx # Notifications view
│   │   └── Settings.jsx   # Settings page
│   ├── App.jsx            # Main app component
│   ├── main.jsx           # Entry point
│   └── index.css          # Global styles
├── public/                # Static assets
├── index.html             # HTML template
├── package.json           # Dependencies
├── vite.config.js         # Vite configuration
└── tailwind.config.js     # Tailwind configuration
```

## API Endpoints Used

### Admin Authentication
- `POST /api/admin/login` - Admin login
- `GET /api/admin/verify` - Verify token
- `POST /api/admin/create` - Create first admin (one-time use)
- `PUT /api/admin/change-password` - Change password

### Data Management
- `GET /api/users` - Get all users
- `PUT /api/users/:id` - Update user
- `GET /api/reels` - Get all reels
- `DELETE /api/reels/delete/:id` - Delete reel
- `PUT /api/reels/update/:id` - Update reel
- `GET /api/music` - Get all music
- `DELETE /api/music/:id` - Delete music
- `GET /api/comment` - Get all comments
- `DELETE /api/comment/:id` - Delete comment
- `GET /api/notifications` - Get all notifications

## Features in Detail

### Dashboard
- Overview of all platform metrics
- User and content statistics
- Growth trends (last 7 days)
- Recent activity feed
- Interactive charts for data visualization

### User Management
- Complete user listing with pagination
- Search by username, name, or email
- View user profiles with detailed stats
- Suspend/Activate user accounts
- Track user engagement (followers, following)

### Content Management

#### Reels
- Grid view of all video content
- Filter by status (Published, Processing, Blocked, Reported)
- View detailed reel information
- Block/Unblock inappropriate content
- Delete reels
- View engagement metrics (views, likes, comments)

#### Music
- Library of all music tracks
- Search by title or artist
- Audio player preview
- Delete unwanted tracks
- View track details and metadata

#### Comments
- Moderate all user comments
- Search and filter comments
- Delete inappropriate comments
- View associated reel and user info

### Notifications
- View all platform notifications
- Filter by type (like, comment, follow)
- Track user interactions
- Monitor engagement patterns

### Settings
- Configure platform settings
- Change admin password securely
- Toggle maintenance mode
- Manage registration settings
- View system information

## Security Best Practices

1. **Change Default Credentials**: Always change default admin password
2. **Use Strong Passwords**: Minimum 12 characters with mixed case, numbers, and symbols
3. **Keep JWT Secret Secure**: Use a strong, random JWT secret
4. **Regular Updates**: Keep dependencies updated
5. **Access Control**: Only give admin access to trusted personnel
6. **Monitor Activity**: Regularly check admin panel logs
7. **Backup Data**: Regular database backups

## Development

### Running in Development Mode
```bash
npm run dev
```

### Building for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Customization

### Changing Theme Colors

Edit `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        // Your custom color palette
      },
    },
  },
}
```

### Modifying API Base URL

Edit `vite.config.js`:

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://your-backend-url',
      changeOrigin: true,
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Cannot login**
   - Verify admin account exists in database
   - Check backend is running on port 4000
   - Verify JWT_SECRET is set in backend .env

2. **Data not loading**
   - Check network requests in browser DevTools
   - Verify backend API endpoints are accessible
   - Check CORS configuration

3. **Build fails**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Clear cache: `npm cache clean --force`

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

This is a proprietary admin panel for Neo Reels. For feature requests or bug reports, contact the development team.

## License

Proprietary - All rights reserved

## Support

For technical support or questions:
- Email: support@neoreels.com
- Documentation: [Internal Wiki]

---

**Version**: 1.0.8  
**Last Updated**: January 10, 2026  
**Developed for**: Neo Reels Platform

# Git-Folder Project Specification

## Project Overview

Git-folder is a web-based file sharing solution that bridges the gap between developers using Git and non-technical users (designers, artists, creatives) who need a simple, familiar interface for file management. It provides a Dropbox/Google Drive-like experience while leveraging Git as the underlying version control system. Git-folder acts as a Git client, allowing traditional Git tools and integrations to work seamlessly on the backend while providing a user-friendly interface on the frontend.

## Target Users

### Primary Users
- **Creative Professionals**: Artists, designers, and other creatives who need to collaborate on digital assets
- **Non-technical Team Members**: Users who find Git's command-line interface or desktop clients too complex
- **External Collaborators**: Freelancers or partners who need limited access to specific project folders

### Secondary Users (Administrators)
- **Developers/Technical Leads**: Set up and manage shared folders, handle Git repository connections
- **Project Managers**: Oversee access permissions and folder organization

## Core Features

### Authentication
- Multiple authentication providers:
  - Development mode (no authentication for local testing)
  - OAuth 2.0 integration with GitHub
  - OAuth 2.0 integration with Google
  - OAuth 2.0 integration with Discord
- User profile management
- Session management with secure tokens
- Optional multi-factor authentication (MFA)
- Role-based access control delegated to Git
- Support for public read-only share links

### 1. Folder Sharing & Access

#### 1.1 Shared Folder Management
- Users see a list of folders shared with them
- Folders are presented with user-friendly names (no Git terminology exposed)
- Each shared folder maps to a subfolder within a Git repository
- Users are unaware of the underlying Git repository structure
- Public share links for world-readable access (no authentication required)
- Access permissions (read/write) determined by Git repository configuration

#### 1.2 Folder Navigation
- Intuitive file browser interface similar to operating system file explorers
- Breadcrumb navigation for easy traversal
- Support for nested folder structures
- Real-time updates when files are added/modified by other users

### 2. File Operations

#### 2.1 File Upload
- Drag-and-drop support from Windows Explorer and macOS Finder
- Multiple file upload capability
- Progress indicators for uploads
- File type validation (configurable per shared folder)
- Large file support through Git LFS:
  - Configurable file size limits (up to 1GB supported)
  - Automatic detection of large files based on configurable threshold
  - Transparent handling of LFS-tracked files
  - Support for common large file formats (PSD, AI, video, 3D models)
- Automatic Git operations:
  - New files are added and committed to Git
  - Large files automatically tracked by Git LFS
  - Existing files create new versions (Git commits)
  - Meaningful commit messages generated automatically
- Commit message handling:
  - Optional commit message dialog on upload
  - Site-wide configuration for commit message requirement
  - Per-folder override settings
  - Default message generation when dialog is disabled

#### 2.2 File Download
- Single-click download of the latest version
- Efficient handling of LFS files:
  - Automatic LFS file resolution
  - Progress tracking for large file downloads
  - Bandwidth-efficient streaming
- Bulk download options (multiple files or entire folders as ZIP)
- Preserve original file names and extensions

#### 2.3 Version Management
- View version history for each file
- Download previous versions
- See version metadata (date, time, file size)
- Optional: Show who made changes (if user tracking is implemented)

### 3. User Interface Requirements

#### Design Principles
- Simple, lightweight, and fast
- Mobile-first responsive design
- Minimal visual clutter
- Clear visual hierarchy
- Intuitive navigation without documentation
- Dark mode by default with light mode option
- System theme detection and user preference persistence

#### 3.1 Main Dashboard
- List of accessible shared folders
- Search functionality
- Sort options (name, last modified, size)
- Visual indicators for recent activity

#### 3.2 Folder View
- File/folder listing with icons based on file type
- File details (name, size, last modified)
- Action buttons (download, view history)
- Drag-and-drop zone clearly marked (desktop)
- Touch-friendly upload button (mobile)

#### 3.3 Version History View
- Simple list view of file versions
- Essential version info (date, size)
- Download links for each version
- Easy navigation back to folder view

## Technical Architecture

### Backend Requirements
- Git integration layer for repository operations
- Git LFS support:
  - Standard git-lfs commands (storage handled by git-lfs)
  - Automatic LFS initialization for repositories
  - LFS pointer file handling
  - Bandwidth optimization for large file transfers
- Repository management:
  - Support for local repositories
  - Support for external/remote repository URLs
  - SSH authentication for remote repositories
- SSH key management:
  - Automatic SSH key generation per user
  - Secure key storage (encrypted in database)
  - Optional user-provided SSH key override
  - SSH agent integration for git operations
- Database options:
  - SQLite (default): Zero-configuration, file-based database
  - NocoDB (optional): Visual database interface with REST API
  - Configurable via environment variables
- Email notifications via Mailgun:
  - File upload confirmations
  - Shared folder invitations
  - Version update notifications
  - Activity summaries
  - Error/failure alerts
- File storage and streaming capabilities
- User authentication and authorization system
- API for frontend communication
- Background job processing for Git operations

### Frontend Requirements
- Responsive web design (smartphone to desktop support)
- Simple and lightweight UI:
  - Minimal JavaScript dependencies
  - Fast page loads
  - Clean, uncluttered interface
  - Focus on core functionality
- Theme support:
  - Dark mode (default)
  - Light mode
  - Theme toggle in UI
  - Persistent theme preference
- Progressive enhancement approach
- Mobile-first design principles
- Drag-and-drop file handling (with fallback for mobile)
- Real-time updates (WebSocket or polling)

### Security Considerations
- User authentication:
  - OAuth 2.0 support for GitHub, Google, and Discord
  - Development mode for testing (no auth)
  - Single Sign-On (SSO) capabilities
- Access control per shared folder
- Secure file transfer (HTTPS)
- Input validation and sanitization
- Rate limiting for uploads/downloads

### Deployment Architecture
- Docker Compose installation:
  - Simple one-command installation process
  - Pre-configured docker-compose.yml with sensible defaults
  - Easy upgrade mechanism
  - Automated health checks and restart policies
- Supported platforms:
  - Debian 12 (Bookworm)
  - Ubuntu 22.04 LTS (Jammy)
  - Ubuntu 24.04 LTS (Noble)
  - Windows 11 with Docker Desktop (development)
- Docker containerization:
  - Single container with all services or multi-container setup
  - Environment variable configuration via .env file
  - Volume mounts for persistent data and Git repositories
- Proxmox deployment:
  - VM or LXC container support
  - Resource allocation recommendations
  - Network configuration (bridge/NAT)
  - Storage considerations for Git repos and LFS data
- Reverse proxy support (nginx, Traefik, Caddy)
- SSL/TLS termination options (Let's Encrypt integration)

## User Stories

### As a Creative User

1. **Accessing Shared Folders**
   - "I want to see all folders shared with me in one place"
   - "I want to quickly find the folder I need without understanding Git"
   - "I want to access public share links without logging in"

2. **Uploading Work**
   - "I want to drag my PSD/AI/PNG files directly from my desktop"
   - "I want confirmation that my files were uploaded successfully"
   - "I want to replace an existing file with a new version easily"

3. **Downloading Assets**
   - "I want to download the latest version of a file with one click"
   - "I want to download multiple files at once"
   - "I want to get an older version if needed"

### As an Administrator

1. **Folder Management**
   - "I want to share specific subfolders from my Git repos"
   - "I want to control who has access to each folder"
   - "I want to see activity logs"

2. **Repository Configuration**
   - "I want to configure external Git repository URLs"
   - "I want to manage SSH keys for repository access"
   - "I want users to have automatic Git authentication without sharing credentials"

### As a User

1. **SSH Key Management**
   - "I want the app to handle Git authentication automatically"
   - "I want to optionally provide my own SSH key if I have one"
   - "I want my Git operations to work seamlessly without manual authentication"

## MVP (Minimum Viable Product) Features

### Phase 1 - Core Functionality
1. User authentication (Dev mode, GitHub, Google, Discord OAuth)
2. List shared folders
3. Navigate folder structure
4. Upload files (drag-and-drop) with Git LFS support
5. Download latest version of files (including LFS files)
6. Basic version history view
7. Git LFS setup and configuration

### Phase 2 - Enhanced Features
1. Download previous versions
2. Bulk operations (multiple file upload/download)
3. Search within folders
4. Email notifications via Mailgun
5. Public share links for read-only access

### Phase 3 - Advanced Features
1. File preview (images, PDFs)
2. Folder-level permissions
3. Integration with cloud storage
4. Advanced mobile optimizations
5. Commenting/annotation system

## Success Metrics

1. **User Adoption**
   - Number of active users
   - Frequency of use
   - User retention rate

2. **Usage Metrics**
   - Files uploaded per day/week
   - Download frequency
   - Version history access

3. **Performance Metrics**
   - Upload/download speeds
   - Page load times
   - System uptime

4. **User Satisfaction**
   - User feedback scores
   - Support ticket volume
   - Feature request patterns

## Constraints and Assumptions

### Constraints
- Must work with existing Git repositories
- Cannot modify Git repository structure
- Must maintain Git history integrity
- Should not require Git knowledge from end users
- Must support Git LFS for large files
- Acts as a Git client - no custom integrations needed
- Access control (read/write) delegated to Git permissions

### Assumptions
- Users have modern web browsers
- Git LFS is installed and configured on the server
- LFS storage backend is available (local or cloud-based)
- Sufficient bandwidth for large file transfers
- Git repositories are accessible from the server
- Basic internet connectivity for all users

## Open Questions

None - all major decisions have been made!

## Container-Specific Considerations

### Docker Image Requirements
- Base image selection (Alpine Linux for minimal size or Ubuntu for compatibility)
- Multi-stage builds to optimize image size
- Non-root user for security
- Git and Git LFS pre-installed
- SSH client for remote repository access

### Volume Mounts
1. **Repository Storage**: `/app/repos` - Git repositories and working directories
2. **SSH Keys**: `/app/ssh` - Generated SSH keys for Git authentication
3. **Configuration**: `/app/config` - Application configuration files
4. **Database**: `/app/data` - SQLite database file (when using SQLite)
5. **Logs**: `/app/logs` - Application and Git operation logs

### Environment Variables
- `AUTH_MODE` - Authentication mode (dev, oauth)
- `OAUTH_GITHUB_CLIENT_ID` / `OAUTH_GITHUB_CLIENT_SECRET`
- `OAUTH_GOOGLE_CLIENT_ID` / `OAUTH_GOOGLE_CLIENT_SECRET`
- `OAUTH_DISCORD_CLIENT_ID` / `OAUTH_DISCORD_CLIENT_SECRET`
- `DATABASE_TYPE` - Database type: sqlite or nocodb (default: sqlite)
- `DATABASE_URL` - Database connection string (SQLite path or NocoDB API URL)
- `NOCODB_API_TOKEN` - NocoDB API token (if using NocoDB)
- `EXTERNAL_REPO_BASE_URL` - Optional base URL for external Git repositories
- `SSH_KEY_PATH` - Path to store generated SSH keys (default: /app/ssh)
- `APP_URL` - Public URL for OAuth callbacks
- `SECRET_KEY` - Application secret for sessions
- `PORT` - Application port (default: 8080)
- `MAX_FILE_SIZE` - Maximum file size in MB (default: 1024 for 1GB)
- `LFS_THRESHOLD` - File size threshold for LFS in MB (default: 50)
- `MAILGUN_API_KEY` - Mailgun API key for email notifications
- `MAILGUN_DOMAIN` - Mailgun domain
- `MAILGUN_FROM_EMAIL` - Sender email address
- `EMAIL_NOTIFICATIONS_ENABLED` - Enable/disable email notifications (default: true)
- `COMMIT_MESSAGE_DIALOG` - Show commit message dialog on upload (default: false)
- `COMMIT_MESSAGE_REQUIRED` - Require commit message (default: false)

### Resource Requirements
- **CPU**: 2-4 cores recommended
- **RAM**: 2-4GB minimum (suitable for ~5 concurrent users)
- **Storage**: Depends on repository sizes and LFS usage
- **Network**: Gigabit connection recommended for large file transfers
- **Typical Use Case**: Indie developers/small teams with ~5 concurrent users

## Next Steps

1. Review and refine requirements with stakeholders
2. Create Dockerfile and docker-compose.yml
3. Design container architecture diagram
4. Create technical architecture diagram
5. Design database schema
6. Create UI/UX mockups
7. Set up development environment with Docker
8. Develop proof of concept for core features
9. Plan sprint schedule for MVP development
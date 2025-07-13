# Git-Folder Project Plan

## Progress Summary
- **Planning Phase**: ✅ Complete
  - Project specification created
  - Technology decisions made
  - Feature requirements defined
  - All major architectural questions answered
- **Documentation**: ✅ Complete
  - README.md with project overview
  - Full specification document
  - Detailed project plan
- **Current Phase**: Phase 1 - Foundation (In Progress)

## Project Structure

```
git-folder/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── backend/
│   ├── src/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── git/
│   │   ├── database/
│   │   └── services/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── utils/
│   ├── package.json
│   └── index.html
├── scripts/
│   └── install.sh
├── .env.example
└── README.md
```

## Development Phases

### Phase 1: Foundation

#### Project Setup
- [x] Initialize project structure
- [x] Set up Git repository
- [x] Create README with project overview
- [ ] Create .env.example with all variables
- [ ] Set up development environment
- [ ] Create Windows 11 Docker Desktop setup guide
- [ ] Test development setup on Windows 11

#### Docker Infrastructure
- [ ] Create multi-stage Dockerfile
- [ ] Write docker-compose.yml with all services
- [ ] Configure environment variables
- [ ] Add health checks and restart policies
- [ ] Test container builds on Debian 12 and Ubuntu LTS

#### Backend Core
- [ ] Set up Express server with TypeScript
- [ ] Configure environment variables
- [ ] Implement basic error handling middleware
- [ ] Set up logging system (winston or pino)
- [ ] Create health check endpoint

### Phase 2: Authentication & Database

#### Database Layer
- [ ] Design SQLite schema
- [ ] Implement database migrations (using knex)
- [ ] Create data models (users, folders, shares)
- [ ] Add NocoDB adapter interface (optional)
- [ ] Set up connection pooling

#### Authentication System
- [ ] Implement dev mode (no auth)
- [ ] GitHub OAuth integration
- [ ] Google OAuth integration  
- [ ] Discord OAuth integration
- [ ] Session management with express-session
- [ ] JWT token generation and validation

#### User Management
- [ ] User profile creation from OAuth
- [ ] SSH key generation per user
- [ ] Encrypted key storage in database
- [ ] Support for user-provided SSH keys
- [ ] User preferences storage

### Phase 3: Git Integration

#### Git Operations Layer
- [ ] Create Git command wrapper (using child_process)
- [ ] Implement repository initialization
- [ ] Add Git LFS detection and setup
- [ ] Handle file operations (add, commit, push, pull)
- [ ] Branch management
- [ ] Error handling for Git failures

#### File Management API
- [ ] List files and folders endpoint
- [ ] Upload file endpoint (with multer)
- [ ] Download file streaming endpoint
- [ ] Version history retrieval endpoint
- [ ] Delete file functionality
- [ ] Move/rename operations

#### Large File Support
- [ ] Automatic LFS detection (>50MB threshold)
- [ ] Streaming for large file uploads
- [ ] Progress tracking for uploads/downloads
- [ ] Chunked upload support
- [ ] Resume interrupted uploads

### Phase 4: Frontend Development

#### UI Foundation
- [ ] Set up React with Vite
- [ ] Configure TypeScript for frontend
- [ ] Mobile-first responsive design system
- [ ] Implement dark theme (default) and light theme
- [ ] Create theme context and toggle component
- [ ] Implement routing with React Router
- [ ] Create layout components
- [ ] Set up API client with Axios

#### Core Pages
- [ ] Login page with OAuth provider buttons
- [ ] Dashboard - list of shared folders
- [ ] Folder browser with file listing
- [ ] File version history view
- [ ] Public share link view (no auth required)
- [ ] 404 and error pages

#### File Operations UI
- [ ] Drag-and-drop upload with react-dropzone
- [ ] Upload progress indicators
- [ ] File action menus (download, delete, history)
- [ ] Mobile-friendly upload button fallback
- [ ] Bulk file selection and operations
- [ ] File preview for images
- [ ] Commit message dialog implementation
- [ ] Per-folder commit message settings UI

### Phase 5: Advanced Features

#### Public Sharing
- [ ] Generate unique share URLs
- [ ] Public folder view without authentication
- [ ] Share link management interface
- [ ] Optional expiration dates
- [ ] Copy share link functionality

#### Email Notifications
- [ ] Mailgun integration setup
- [ ] Email notification templates
- [ ] User notification preferences
- [ ] Upload confirmation emails
- [ ] Share invitation emails
- [ ] Error notification emails

#### Real-time Updates
- [ ] WebSocket implementation
- [ ] Live file list updates
- [ ] Concurrent user indicators
- [ ] Upload progress broadcasting
- [ ] Basic conflict resolution

### Phase 6: Polish & Production

#### Performance Optimization
- [ ] Implement caching strategy
- [ ] Optimize Docker image size
- [ ] Database query optimization
- [ ] Frontend bundle optimization
- [ ] Lazy loading for components

#### Security Hardening
- [ ] Input sanitization middleware
- [ ] Rate limiting implementation
- [ ] CORS configuration
- [ ] Security headers setup
- [ ] Vulnerability scanning
- [ ] SSH key encryption verification

#### Testing Suite
- [ ] Unit tests for Git operations
- [ ] API integration tests
- [ ] Frontend component tests
- [ ] End-to-end workflow tests
- [ ] Performance benchmarks
- [ ] Load testing for concurrent users

#### Documentation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] User guide with screenshots
- [ ] Administrator guide
- [ ] Docker deployment instructions
- [ ] Troubleshooting FAQ
- [ ] Contributing guidelines

#### Deployment Preparation
- [ ] Production Docker configuration
- [ ] Environment-specific configs
- [ ] Backup procedures documentation
- [ ] Basic monitoring setup
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Release process documentation

## Technical Stack

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js with TypeScript
- **Database**: SQLite with Knex.js (NocoDB adapter optional)
- **Authentication**: Passport.js
- **File Upload**: Multer
- **Email**: Mailgun SDK
- **Git Operations**: Child process with git CLI

### Frontend  
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS or minimal CSS framework
- **State Management**: Zustand or Context API
- **HTTP Client**: Axios
- **File Upload**: react-dropzone
- **Routing**: React Router v6

### Infrastructure
- **Container**: Docker with multi-stage builds
- **Orchestration**: Docker Compose
- **Web Server**: Nginx reverse proxy (optional)
- **Version Control**: Git + Git LFS
- **Email Service**: Mailgun
- **Process Manager**: PM2 (inside container)

## Completed Tasks

### Planning & Documentation
- [x] Create comprehensive project specification
- [x] Define all technical requirements
- [x] Choose technology stack (Node.js + Express + React)
- [x] Plan authentication strategy (OAuth with GitHub, Google, Discord)
- [x] Design database architecture (SQLite/NocoDB)
- [x] Document Windows 11 development support
- [x] Create project README
- [x] Initial Git repository setup

### Key Decisions Made
- [x] Docker-first deployment strategy
- [x] Git LFS for large file support (up to 1GB)
- [x] Dark mode as default theme
- [x] Public share links for read-only access
- [x] Mailgun for email notifications
- [x] Commit message dialog feature (optional)
- [x] All access control delegated to Git

## Success Milestones

### Milestone 1: Working Prototype
- [ ] Basic Docker setup running
- [ ] Users can log in via at least one OAuth provider
- [ ] Files can be uploaded and downloaded
- [ ] Git commits are created for file changes
- [ ] Basic folder navigation works

### Milestone 2: Feature Complete
- [ ] All OAuth providers (GitHub, Google, Discord) working
- [ ] Public share links functional
- [ ] Email notifications sending via Mailgun
- [ ] Mobile UI fully responsive
- [ ] Version history viewable
- [ ] Large file support via Git LFS

### Milestone 3: Production Ready
- [ ] Comprehensive test coverage (>80%)
- [ ] All documentation complete
- [ ] Performance optimized for 5+ concurrent users
- [ ] Security hardened and tested
- [ ] One-command Docker installation working
- [ ] Deployment guide verified on target platforms

## Risk Mitigation

### Git Operations Complexity
- Start with simple, well-tested operations
- Extensive error handling and logging
- Clear, user-friendly error messages
- Fallback options for common failures

### Large File Handling
- Thorough testing with files up to 1GB
- Implement proper streaming throughout
- Monitor memory usage during development
- Set appropriate timeouts and limits

### Security Concerns
- Sanitize all user inputs
- Secure SSH key storage with encryption
- Rate limiting on all API endpoints
- Regular security audits
- No direct command injection

### Performance Issues
- Implement caching early in development
- Use Git's built-in efficiency features
- Profile and optimize bottlenecks
- Lazy load frontend components

## Development Principles

1. **Simplicity First**: Keep the UI and codebase simple and maintainable
2. **Git Does the Work**: Leverage Git's capabilities, don't reinvent the wheel
3. **Mobile Friendly**: Every feature must work well on mobile devices
4. **Fail Gracefully**: Provide clear error messages and recovery options
5. **Secure by Default**: Require authentication except for public shares
6. **Docker Native**: Everything runs in containers for easy deployment

## Success Criteria

- [ ] One-command Docker installation works on Debian 12 and Ubuntu LTS
- [ ] Non-technical users can upload/download files without Git knowledge
- [ ] Support for 1GB files via Git LFS with progress indication
- [ ] Public share links work without any authentication
- [ ] All OAuth providers (GitHub, Google, Discord) functioning
- [ ] Email notifications delivered reliably via Mailgun
- [ ] Mobile UI is fully functional on smartphones and tablets
- [ ] 5 concurrent users supported without performance degradation
- [ ] Zero Git knowledge required for end users

## Next Steps

1. Create initial project structure following the layout above
2. Set up development environment with Docker
3. Start with Phase 1: Foundation
4. Set up basic CI/CD early in the process
5. Iterate based on progress and gather feedback regularly
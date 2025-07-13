# git-folder

A simple web UI for sharing Git repository folders with non-technical users. Think Dropbox or Google Drive, but powered by Git.

![Status](https://img.shields.io/badge/status-planning-orange)
![License](https://img.shields.io/badge/license-MIT-blue)

## Overview

git-folder bridges the gap between developers using Git and creative professionals who need a simple, familiar interface for file management. Artists, designers, and other creatives can upload, download, and manage files without ever knowing they're using Git.

### Key Features

- 🎨 **Simple drag-and-drop interface** - Upload files just like Dropbox
- 📁 **Folder-based sharing** - Share specific folders from your Git repos
- 🔒 **OAuth authentication** - Login with GitHub, Google, or Discord
- 📦 **Large file support** - Automatic Git LFS handling for files up to 1GB
- 🔗 **Public share links** - Share folders with anyone, no login required
- 📝 **Version history** - Access previous versions of any file
- 🌓 **Dark mode default** - Easy on the eyes with light mode option
- 📱 **Mobile responsive** - Works on everything from phones to desktops

## Use Case

Perfect for indie developers and small teams who need to share assets with creative collaborators:

- Game developers sharing art assets with artists
- Web developers collaborating with designers
- Any project where non-technical users need file access

## Quick Start (Coming Soon)

```bash
# Clone the repository
git clone https://github.com/yourusername/git-folder.git
cd git-folder

# Copy environment variables
cp .env.example .env

# Start with Docker Compose
docker-compose up
```

Visit `http://localhost:8080` to access git-folder.

## Development

### Requirements

- Docker Desktop (Windows 11, macOS, or Linux)
- Node.js 20+ (for local development)
- Git with LFS support

### Windows 11 Setup

1. Install Docker Desktop for Windows
2. Enable WSL2 backend
3. Clone this repository
4. Follow the setup guide in `/docs/windows-setup.md` (coming soon)

### Project Structure

```
git-folder/
├── backend/          # Express.js API server
├── frontend/         # React UI
├── docker/          # Docker configuration
├── planning/        # Project specifications
└── scripts/         # Installation scripts
```

## Configuration

Key environment variables:

- `AUTH_MODE` - Set to `dev` for no authentication during development
- `DATABASE_TYPE` - Use `sqlite` (default) or `nocodb`
- `COMMIT_MESSAGE_DIALOG` - Show commit message dialog on upload
- `MAX_FILE_SIZE` - Maximum file size in MB (default: 1024)

See `.env.example` for all configuration options.

## Technology Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, TypeScript, Vite
- **Database**: SQLite (or NocoDB)
- **Authentication**: OAuth 2.0 (GitHub, Google, Discord)
- **File Storage**: Git + Git LFS
- **Email**: Mailgun
- **Deployment**: Docker + Docker Compose

## Roadmap

### Phase 1: Foundation ✅ Planning Complete
- Project setup and Docker configuration
- Basic backend with health checks
- Development environment

### Phase 2: Authentication & Database
- OAuth providers integration
- User management
- SSH key generation

### Phase 3: Git Integration
- File operations (upload/download)
- Version history
- Git LFS support

### Phase 4: Frontend
- Responsive UI
- File browser
- Drag-and-drop uploads

### Phase 5: Advanced Features
- Public share links
- Email notifications
- Real-time updates

### Phase 6: Production Ready
- Testing suite
- Documentation
- Performance optimization

## Contributing

This project is currently in the planning phase. Contributions will be welcome once the initial implementation is complete.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built for creative professionals who deserve better than command-line Git
- Inspired by the simplicity of Dropbox and Google Drive
- Powered by the reliability of Git

---

**Note**: This project is under active development. Features and documentation will be updated as development progresses.
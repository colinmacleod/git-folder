# Claude Code Assistant Guide for git-folder

This file contains project-specific instructions for Claude Code to help maintain consistency and automate common tasks.

## Project Overview

git-folder is a web UI for sharing Git repository folders with non-technical users. It provides a Dropbox-like interface powered by Git.

## Development Workflow Commands

### End of Phase Commands

When completing a development phase or significant milestone, execute these tasks:

1. **Update README.md**
   - Update the status badge if moving to a new phase
   - Update the "Quick Start" section if it's now functional
   - Add any new configuration options to the Configuration section
   - Update technology stack if new tools were added

2. **Update Planning Documents**
   - `planning/project-plan.md` - Mark completed tasks with [x]
   - `planning/roadmap.md` - Update current phase status
   - `planning/specification.md` - Update if requirements changed

3. **Generate Git Commit Message**
   - Create a SHORT commit message (subject line + 1-8 lines description, fewer is better)
   - Use conventional commit format
   - Subject line should be under 50 characters
   - Each description line should be under 72 characters
   - Focus on WHAT changed, not implementation details
   - DO NOT execute git commands - only provide the message

### Common Tasks

#### Check Project Status
- Review all checkboxes in `planning/project-plan.md`
- Verify which phase we're currently in
- List remaining tasks for current phase

#### Add New Package
- Update both `backend/package.json` and documentation
- Ensure no deprecated packages are added
- Update `.env.example` if new environment variables are needed

#### Create New Endpoint
- Follow existing pattern in `backend/src/api/`
- Add proper TypeScript types
- Include error handling
- Update API documentation

## Code Conventions

### Backend
- Use TypeScript strict mode
- Async/await over callbacks
- Proper error handling with custom error classes
- Winston logger for all logging
- Environment variables for configuration

### Git Commits
- Conventional commit format
- Clear, descriptive messages
- Reference issue numbers when applicable
- Group related changes

### Docker
- Multi-stage builds for optimization
- Non-root user in containers
- Health checks for all services
- Volume mounts for development

## Architecture Decisions

- **No Authentication in Dev Mode**: `AUTH_MODE=dev` bypasses all auth
- **SQLite Default**: Simple file-based database, optional NocoDB
- **Git as Backend**: All file operations go through Git
- **Docker First**: Everything runs in containers

## Testing Commands

### Quick Health Check
```bash
curl http://localhost:8080/api/health
```

### Docker Status
```bash
docker compose ps
docker compose logs -f backend
```

## Important Notes

- **NEVER run git add, git commit, or git rm commands** - NEVER NEVER NEVER
- This is a PUBLIC repository - no secrets in code
- All sensitive config goes in `.env` (not `.env.example`)
- Git-folder acts as a Git client - no custom Git modifications
- Target users are non-technical - UI must be extremely simple
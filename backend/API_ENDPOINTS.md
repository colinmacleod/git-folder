# Git-Folder API Endpoints

## Authentication

### Auth Status
- `GET /api/auth/status` - Get current authentication status
- `POST /api/auth/dev-login` - Login in dev mode (AUTH_MODE=dev)
- `POST /api/auth/logout` - Logout current user
- `GET /api/auth/github` - Start GitHub OAuth flow
- `GET /api/auth/google` - Start Google OAuth flow  
- `GET /api/auth/discord` - Start Discord OAuth flow

## User Management

### Profile
- `GET /api/user/profile` - Get current user profile
- `PATCH /api/user/profile` - Update user profile

### Preferences
- `GET /api/user/preferences` - Get user preferences
- `PATCH /api/user/preferences` - Update user preferences

### SSH Keys
- `POST /api/user/ssh/generate` - Generate new SSH keys
- `POST /api/user/ssh/upload` - Upload custom SSH keys
- `DELETE /api/user/ssh` - Delete SSH keys
- `GET /api/user/ssh/download-private` - Download private key

## Repository Management

### Repositories
- `GET /api/repositories` - List user's repositories
- `GET /api/repositories/:id` - Get repository details
- `POST /api/repositories` - Create new repository
- `POST /api/repositories/:id/lfs` - Initialize Git LFS
- `DELETE /api/repositories/:id` - Delete repository

## File Operations

### Files
- `GET /api/files/repositories/:repoId/files` - List files in folder
  - Query params: `path` (default: /)
- `POST /api/files/repositories/:repoId/upload` - Upload file
  - Form data: `file`, `path`, `message`
- `GET /api/files/repositories/:repoId/download` - Download file
  - Query params: `path` (required)
- `DELETE /api/files/repositories/:repoId/files` - Delete file/folder
  - Body: `path`, `message`
- `POST /api/files/repositories/:repoId/move` - Move/rename file
  - Body: `source`, `destination`, `message`

### Version History
- `GET /api/files/repositories/:repoId/history` - Get file history
  - Query params: `path` (required), `limit` (default: 20)
- `GET /api/files/repositories/:repoId/version/:commitHash` - Get file at version
  - Query params: `path` (required)

### Chunked Upload (Large Files)
- `POST /api/files/repositories/:repoId/chunk-upload/init` - Initialize chunked upload
  - Body: `filename`, `totalSize`, `totalChunks`
- `POST /api/files/repositories/:repoId/chunk-upload/:uploadId/chunk/:chunkNumber` - Upload chunk
  - Form data: `chunk` (file chunk)
- `POST /api/files/repositories/:repoId/chunk-upload/:uploadId/finalize` - Finalize upload
  - Body: `path`, `message` (optional)
- `GET /api/files/repositories/:repoId/upload-progress/:uploadId` - Get upload progress

## Branch Management

### Branches
- `GET /api/branches/repositories/:repoId/branches` - List branches
- `POST /api/branches/repositories/:repoId/branches` - Create branch
  - Body: `name`, `from` (optional)
- `POST /api/branches/repositories/:repoId/branches/switch` - Switch branch
  - Body: `branch`
- `DELETE /api/branches/repositories/:repoId/branches/:branchName` - Delete branch
  - Query params: `force` (optional)
- `POST /api/branches/repositories/:repoId/branches/merge` - Merge branch
  - Body: `source`, `message` (optional)
- `GET /api/branches/repositories/:repoId/branches/compare` - Compare branches
  - Query params: `branch1`, `branch2`

## Shared Folders

### Folder Management
- `GET /api/shared-folders` - List user's shared folders
- `POST /api/shared-folders` - Create shared folder
  - Body: `repository_id`, `folder_path`, `name`, `description`, `is_public`, `commit_message_required`
- `GET /api/shared-folders/:id` - Get shared folder details
- `PATCH /api/shared-folders/:id` - Update shared folder
  - Body: `name`, `description`, `is_public`, `commit_message_required`
- `DELETE /api/shared-folders/:id` - Delete shared folder

### Permissions
- `POST /api/shared-folders/:id/permissions` - Grant permission
  - Body: `user_id`, `permission_level` (viewer|contributor|admin)
- `DELETE /api/shared-folders/:id/permissions/:userId` - Revoke permission

### Public Access
- `GET /api/shared-folders/public/:token` - Access public folder (no auth required)

## Health Check

- `GET /api/health` - Get server health status
- `GET /api/health/ping` - Simple ping endpoint

## Request/Response Examples

### Upload File
```bash
curl -X POST http://localhost:8080/api/files/repositories/1/upload \
  -H "Cookie: session=..." \
  -F "file=@image.png" \
  -F "path=/assets/images" \
  -F "message=Add new image"
```

### Create Repository
```json
POST /api/repositories
{
  "name": "my-project",
  "description": "My awesome project",
  "git_url": "https://github.com/user/repo.git"  // optional
}
```

### Create Shared Folder
```json
POST /api/shared-folders
{
  "repository_id": 1,
  "folder_path": "/assets",
  "name": "Game Assets",
  "description": "Shared game assets",
  "is_public": true,
  "commit_message_required": true
}
```

### Chunked Upload Workflow
```bash
# 1. Initialize chunked upload
curl -X POST http://localhost:8080/api/files/repositories/1/chunk-upload/init \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"filename": "large-video.mp4", "totalSize": 104857600, "totalChunks": 10}'

# Response: {"uploadId": "abc123...", "message": "Chunked upload initialized"}

# 2. Upload chunks (repeat for each chunk)
curl -X POST http://localhost:8080/api/files/repositories/1/chunk-upload/abc123.../chunk/0 \
  -H "Cookie: session=..." \
  -F "chunk=@chunk-0.bin"

# 3. Check progress
curl -X GET http://localhost:8080/api/files/repositories/1/upload-progress/abc123... \
  -H "Cookie: session=..."

# 4. Finalize upload
curl -X POST http://localhost:8080/api/files/repositories/1/chunk-upload/abc123.../finalize \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"path": "/videos", "message": "Upload large video file"}'
```

## Error Responses

All endpoints return errors in this format:
```json
{
  "error": "Error message here"
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 500: Internal Server Error
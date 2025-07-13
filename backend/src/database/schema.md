# Database Schema Design

## Tables

### users
Store user authentication and profile information.

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    oauth_provider VARCHAR(20) NOT NULL,     -- 'github', 'google', 'discord'
    oauth_id VARCHAR(100) NOT NULL,          -- OAuth provider's user ID
    email VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    display_name VARCHAR(255),
    avatar_url VARCHAR(500),
    ssh_private_key TEXT,                    -- Encrypted SSH private key
    ssh_public_key TEXT,                     -- SSH public key
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(oauth_provider, oauth_id),
    UNIQUE(email)
);
```

### repositories
Store Git repository information that can be shared.

```sql
CREATE TABLE repositories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    git_url VARCHAR(500) NOT NULL,          -- Git remote URL
    local_path VARCHAR(500),                -- Local path for cloned repo
    owner_id INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### shared_folders
Map specific folders within repositories to shareable entities.

```sql
CREATE TABLE shared_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repository_id INTEGER NOT NULL,
    folder_path VARCHAR(500) NOT NULL,      -- Path within the repository
    name VARCHAR(255) NOT NULL,             -- User-friendly name
    description TEXT,
    is_public BOOLEAN DEFAULT false,        -- Public share link enabled
    public_token VARCHAR(64),               -- Random token for public access
    commit_message_required BOOLEAN DEFAULT false,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    UNIQUE(public_token)
);
```

### folder_permissions
Define user access levels to shared folders.

```sql
CREATE TABLE folder_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shared_folder_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    permission_level VARCHAR(20) NOT NULL,  -- 'viewer', 'contributor', 'admin'
    granted_by INTEGER NOT NULL,            -- User ID who granted permission
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (shared_folder_id) REFERENCES shared_folders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id),
    UNIQUE(shared_folder_id, user_id)
);
```

### file_operations
Log file operations for audit and history.

```sql
CREATE TABLE file_operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shared_folder_id INTEGER NOT NULL,
    user_id INTEGER,                        -- NULL for public access
    operation_type VARCHAR(20) NOT NULL,    -- 'upload', 'download', 'delete', 'rename'
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    commit_hash VARCHAR(64),                -- Git commit hash
    commit_message TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (shared_folder_id) REFERENCES shared_folders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

### sessions
Store user session data (alternative to in-memory sessions).

```sql
CREATE TABLE sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    data TEXT NOT NULL,                     -- JSON session data
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_repositories_owner ON repositories(owner_id);
CREATE INDEX idx_shared_folders_repo ON shared_folders(repository_id);
CREATE INDEX idx_shared_folders_public ON shared_folders(public_token);
CREATE INDEX idx_folder_permissions_folder ON folder_permissions(shared_folder_id);
CREATE INDEX idx_folder_permissions_user ON folder_permissions(user_id);
CREATE INDEX idx_file_operations_folder ON file_operations(shared_folder_id);
CREATE INDEX idx_file_operations_user ON file_operations(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

## Permission Levels

- **viewer**: Can browse and download files
- **contributor**: Can upload, download, and modify files
- **admin**: Can manage permissions and folder settings

## Notes

1. SSH keys are stored encrypted in the database
2. Public folders use random tokens for access
3. File operations are logged for audit trails
4. Session storage can be database or memory-based
5. All foreign keys have appropriate cascade rules
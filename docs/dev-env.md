# Development Environment Setup - Windows 11

This guide will help you set up a complete development environment for git-folder on Windows 11.

## Prerequisites

### 1. Docker Desktop for Windows

Docker containers provide everything we need (Node.js, npm, etc.) so we don't need to install development tools on the host machine.

Docker is required to run the application in containers.

1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop/
2. Run the installer
3. During installation:
   - ✅ Enable "Use WSL 2 instead of Hyper-V" (recommended)
   - ✅ Enable "Add Docker to PATH"
   - ✅ Enable "Use Docker Compose V2"
4. After installation:
   - Launch Docker Desktop
   - Wait for it to start (whale icon appears in system tray)
   - Sign in with a Docker Hub account (free account is fine)

### 2. Git with Git LFS

You have two options for Git on Windows 11: native Windows or WSL. **We recommend installing both** for maximum flexibility.

#### Option A: Git for Windows (Native)

1. Download Git for Windows from: https://git-scm.com/download/win
2. Run the installer with these recommended settings:
   - Editor: Your preferred (VS Code recommended)
   - Default branch name: main
   - PATH environment: "Git from the command line and also from 3rd-party software"
   - Line ending conversions: "Checkout as-is, commit Unix-style line endings"
3. After installation, open PowerShell and install Git LFS:
   ```powershell
   git lfs install
   ```

#### Option B: Git in WSL (Ubuntu)

1. First, install WSL if you haven't already:
   ```powershell
   wsl --install
   # This installs Ubuntu by default
   ```

2. Open Ubuntu terminal and install Git:
   ```bash
   sudo apt update
   sudo apt install git git-lfs
   git lfs install
   ```

#### Why Both?

- **Git for Windows**: Better integration with Windows tools, GUI applications, and VS Code
- **Git in WSL**: Better performance with Docker volumes, Unix-like environment
- Docker Desktop can use either, giving you flexibility

### 3. Visual Studio Code (Recommended)

While any text editor works, VS Code provides an excellent development experience.

1. Download VS Code from: https://code.visualstudio.com/
2. Install these recommended extensions:
   - **Docker** (by Microsoft) - For Docker support
   - **ESLint** (by Microsoft) - For JavaScript linting
   - **Prettier** (by Prettier) - For code formatting
   - **TypeScript and JavaScript** (by Microsoft) - For TypeScript support
   - **GitLens** (by GitKraken) - For enhanced Git integration

## Verify Installation

### In PowerShell (Windows)

```powershell
# Check Docker
docker --version
# Expected: Docker version 24.x or higher

docker compose version
# Expected: Docker Compose version v2.x or higher

# Check Git and Git LFS (Windows)
git --version
# Expected: git version 2.x or higher

git lfs --version
# Expected: git-lfs/3.x or higher

```

### In WSL Ubuntu (Optional but Recommended)

```bash
# Open Ubuntu terminal
wsl

# Check Git in WSL
git --version
# Expected: git version 2.x or higher

git lfs --version
# Expected: git-lfs/3.x or higher

# Check if Docker is accessible from WSL
docker --version
# Expected: Docker version 24.x or higher
```

## Windows-Specific Configuration

### Configure Git for Cross-Platform Development

#### For Git for Windows (PowerShell)

```powershell
# Set line endings to LF (important for Docker)
git config --global core.autocrlf input

# Set default branch name
git config --global init.defaultBranch main

# Set your user information
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

#### For Git in WSL (Ubuntu terminal)

```bash
# In WSL Ubuntu
wsl

# Configure Git in WSL
git config --global core.autocrlf input
git config --global init.defaultBranch main
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Share credentials between Windows and WSL (optional)
git config --global credential.helper "/mnt/c/Program\ Files/Git/mingw64/bin/git-credential-manager.exe"
```

### Configure Docker Desktop

1. Open Docker Desktop
2. Click the ⚙️ Settings icon
3. **General** tab:
   - ✅ Start Docker Desktop when you sign in to your computer
   - ✅ Use the WSL 2 based engine
4. **Resources > WSL Integration** tab:
   - ✅ Enable integration with default WSL 2 distro
   - Apply & Restart

### Enable Virtualization (if needed)

If Docker fails to start, you may need to enable virtualization:

1. Restart your computer
2. Enter BIOS/UEFI (usually by pressing F2, F10, or Del during startup)
3. Find "Virtualization Technology" or "Intel VT-x/AMD-V"
4. Enable it
5. Save and exit

## Test Your Setup

These commands work in both PowerShell and WSL/Bash terminals. Copy and paste the entire block for each test.

### Test Docker

```bash
mkdir docker-test && cd docker-test
echo 'FROM node:20-alpine' > Dockerfile
echo 'CMD ["echo", "Docker works!"]' >> Dockerfile
docker build -t test .
docker run test
cd .. && rm -rf docker-test
```

You should see "Docker works!" printed to the console.

### Test Git LFS

```bash
mkdir git-lfs-test && cd git-lfs-test
git init
git lfs track "*.psd"
git add .gitattributes
git commit -m "Track PSD files with LFS"
cd .. && rm -rf git-lfs-test
```

You should see "Tracking *.psd" and a successful commit message.

## Common Windows Issues & Solutions

### Issue: "Docker daemon is not running"
**Solution:**
- Start Docker Desktop from the Start Menu
- Wait for the whale icon to appear in the system tray
- If it fails, check that virtualization is enabled in BIOS

### Issue: "The command 'docker' is not recognized"
**Solution:**
- Restart PowerShell/Terminal after Docker installation
- Manually add Docker to PATH:
  - Windows Settings > System > About > Advanced system settings
  - Environment Variables > System variables > Path > Edit
  - Add: `C:\Program Files\Docker\Docker\resources\bin`

### Issue: File permission errors in Docker
**Solution:**
- Ensure you're using WSL 2 backend (not Hyper-V)
- Run Docker Desktop as administrator if needed
- Use PowerShell or Windows Terminal (not Git Bash)

### Issue: Slow file system performance
**Solution:**
- Store code in WSL 2 filesystem for better performance
- Or use named volumes instead of bind mounts for node_modules

### Issue: Port already in use
**Solution:**
```powershell
# Find what's using port 8080
netstat -ano | findstr :8080

# Kill the process (replace PID with the number from above)
taskkill /PID <PID> /F
```

## Environment Variables on Windows

Create a `.env` file in the project root. Windows handles environment variables differently:

```powershell
# Create .env file (PowerShell)
@"
NODE_ENV=development
AUTH_MODE=dev
DATABASE_TYPE=sqlite
"@ | Out-File -Encoding UTF8 .env
```

**Note:** Always use UTF-8 encoding for .env files to avoid issues.

## Development Workflow Options

### Option 1: Pure Windows Development

Work entirely in Windows using PowerShell:

```powershell
# Clone and work in Windows filesystem
cd C:\Users\colin\Work
git clone <your-repo-url> git-folder
cd git-folder

# All Docker commands run in PowerShell
docker compose up
```

**Pros:** Simple, good Windows tool integration
**Cons:** Slower file operations with Docker

### Option 2: WSL Development (Recommended for Performance)

Work in WSL for better Docker performance:

```bash
# In WSL Ubuntu terminal
cd ~
git clone <your-repo-url> git-folder
cd git-folder

# Docker commands work seamlessly
docker compose up
```

**Pros:** Much faster file operations, Unix environment
**Cons:** Need to access files via `\\wsl$\Ubuntu\home\<username>\git-folder` in Windows

### Option 3: Hybrid Approach

Clone in Windows, but run Docker from WSL:

```powershell
# Clone in Windows
cd C:\Users\colin\Work
git clone <your-repo-url> git-folder

# Then in WSL, navigate to the Windows folder
wsl
cd /mnt/c/Users/colin/Work/git-folder
docker compose up
```

**Pros:** Windows tools work normally, can choose where to run Docker
**Cons:** Still slower than pure WSL

## Next Steps

1. Choose your development workflow (WSL recommended for best performance)
2. Clone the repository using your chosen method
3. Continue with the project setup in the main documentation

## Tips for Windows Development

1. **Use PowerShell or Windows Terminal** - Avoid Git Bash for Docker commands
2. **Run as Administrator** - When in doubt, run VS Code and terminals as admin
3. **Windows Defender** - Add project folder to exclusions for better performance
4. **File Watching** - Windows has limits on file watchers; increase if needed:
   ```powershell
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   ```

## Additional Resources

- [Docker Desktop for Windows Documentation](https://docs.docker.com/desktop/windows/)
- [WSL 2 Documentation](https://docs.microsoft.com/en-us/windows/wsl/)
- [Git for Windows Documentation](https://gitforwindows.org/)
- [Node.js on Windows](https://nodejs.org/en/download/package-manager/#windows)

---

**Need Help?** If you encounter issues not covered here, check the [troubleshooting guide](./troubleshooting.md) or open an issue on GitHub.
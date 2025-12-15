# 🔧 Troubleshooting Guide

## App Won't Start?

### 1. Check Node.js Version
```bash
node --version
```
**Required:** Node.js 18+  
**Fix:** Install Node.js 18+ from [nodejs.org](https://nodejs.org/)

---

### 2. Install Dependencies
```bash
cd /Users/kshitiz/Uncommon
npm install
```

**If npm install fails:**
```bash
# Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

### 3. Check Port Availability

**Port 3001 (Server) in use?**
```bash
# Mac/Linux
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

**Port 3000 (Frontend) in use?**
```bash
# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

---

### 4. Start the App

**Option A: Both together (Recommended)**
```bash
npm run dev
```

**Option B: Separately**
```bash
# Terminal 1 - Server
npm run dev:server

# Terminal 2 - Frontend  
npm run dev:client
```

---

### 5. Check What's Running

**Expected Output:**

**Server Terminal:**
```
╔════════════════════════════════════════════════════════════╗
║           🎮 UNCOMMON Game Server Started 🎮              ║
╚════════════════════════════════════════════════════════════╝

📍 Server running on:
   Local:    http://localhost:3001
   Network:  http://YOUR_IP:3001
```

**Frontend Terminal:**
```
VITE v5.x.x  ready in XXX ms

➜  Local:   http://localhost:3000/
➜  Network: http://YOUR_IP:3000/
```

---

### 6. Common Errors & Fixes

#### Error: "Cannot find module"
```bash
npm install
```

#### Error: "Port already in use"
```bash
# Kill processes on ports 3000 and 3001
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
npm run dev
```

#### Error: "EADDRINUSE"
```bash
# Same as above - kill processes on ports
lsof -ti:3001 | xargs kill -9
```

#### Error: "@import must precede"
✅ **Fixed!** The CSS import is now at the top of `index.css`

#### Error: "Connection refused" or "Cannot connect"
- Make sure **both** server AND frontend are running
- Check server is on port 3001
- Check frontend is on port 3000
- Try: `http://localhost:3000`

#### Error: "Module not found: 'dotenv'"
```bash
npm install dotenv --save
```

#### Error: "Module not found: 'concurrently'"
```bash
npm install concurrently --save-dev
```

---

### 7. Verify It's Working

**Test Server:**
```bash
curl http://localhost:3001/api/health
```

**Expected:**
```json
{"status":"ok","aiEnabled":false,"provider":"openai"}
```

**Test Frontend:**
- Open: `http://localhost:3000`
- Should see: STANDOUT game lobby

---

### 8. Still Not Working?

**Check Logs:**
1. Look at terminal output for errors
2. Check browser console (F12 → Console)
3. Check Network tab for failed requests

**Reset Everything:**
```bash
# Stop all processes
pkill -f node
pkill -f vite

# Clean install
rm -rf node_modules package-lock.json
npm install

# Start fresh
npm run dev
```

---

### 9. Quick Diagnostic

Run this to check everything:
```bash
# Check Node version
node --version

# Check if ports are free
lsof -i:3000
lsof -i:3001

# Check dependencies
npm list --depth=0

# Try starting
npm run dev
```

---

## Need Help?

Share:
1. **Error message** from terminal
2. **Browser console errors** (F12)
3. **Node version**: `node --version`
4. **What happens** when you run `npm run dev`

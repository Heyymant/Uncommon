# 🧪 Testing Guide for STANDOUT

## Quick Start Testing

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the App
```bash
# Option A: Start both server and frontend together (recommended)
npm run dev

# Option B: Start separately (for debugging)
# Terminal 1 - Server
npm run dev:server

# Terminal 2 - Frontend
npm run dev:client
```

### 3. Open in Browser
- Frontend: `http://localhost:3000`
- Server: `http://localhost:3001`
- Health Check: `http://localhost:3001/api/health`

---

## 🎮 Testing Scenarios

### Single Player Test (Quick Test)

1. **Open** `http://localhost:3000` in your browser
2. **Create Room**:
   - Enter your name
   - Click "Create Room"
   - Note the Room ID shown
3. **Select Prompts**:
   - Toggle "AI Prompts" ON/OFF to test both modes
   - Click "Easy", "Mixed", "Tricky", or "Desi" buttons
   - Click "Generate Fresh Prompts" multiple times (should get different prompts)
   - Click the refresh icon on individual prompts to replace them
4. **Start Game**:
   - Click "Start Game"
   - You'll see the letter and timer
5. **Submit Words**:
   - Enter words starting with the displayed letter
   - Try valid words, invalid words (wrong letter), duplicates
   - Submit or wait for timer to expire
6. **Vote** (if voting enabled):
   - Vote on answers
   - Complete voting
7. **Review**:
   - See scores and answers
   - Click "Next Round"
8. **Finish Game**:
   - After 3 rounds, see final scores
   - Click "Play Again" to start a new game

---

### Multiplayer Test (Same Computer)

1. **Open Multiple Browser Windows**:
   - Window 1: `http://localhost:3000` (Chrome)
   - Window 2: `http://localhost:3000` (Firefox/Edge/Incognito)
   - Window 3: `http://localhost:3000` (Another browser)

2. **Player 1 (Host)**:
   - Create room with name "Alice"
   - Note the Room ID
   - Select prompts
   - Start game

3. **Player 2**:
   - Join room with Room ID
   - Name: "Bob"
   - Wait in lobby

4. **Player 3**:
   - Join room with same Room ID
   - Name: "Charlie"
   - Wait in lobby

5. **Host starts game**:
   - All players see the same letter
   - All submit words
   - See real-time submission status
   - Vote on answers
   - See scores

---

### Multiplayer Test (Different Devices - Same WiFi)

1. **Find Your IP Address**:
   - The server console will show: `Network: http://YOUR_IP:3000`
   - Or check: `ifconfig` (Mac/Linux) or `ipconfig` (Windows)

2. **On Mobile/Other Device**:
   - Connect to same WiFi network
   - Open browser: `http://YOUR_IP:3000`
   - Join the room using Room ID

3. **Test**:
   - Create room on desktop
   - Join from mobile
   - Play together!

---

## ✅ Feature Testing Checklist

### Core Gameplay
- [ ] Create room successfully
- [ ] Join room with valid Room ID
- [ ] Join room with invalid Room ID (should show error)
- [ ] Select prompts (local and AI)
- [ ] Generate fresh prompts multiple times (should be different)
- [ ] Replace individual prompts
- [ ] Start game with 1 player
- [ ] Start game with multiple players
- [ ] Submit valid words
- [ ] Submit invalid words (wrong starting letter)
- [ ] Submit duplicate words
- [ ] Submit empty words
- [ ] Timer counts down correctly
- [ ] Auto-submit when timer expires
- [ ] Vote on answers
- [ ] Complete voting
- [ ] See round scores
- [ ] Progress through 3 rounds
- [ ] See final scores
- [ ] Play again (new game, same room)

### UI/UX Testing
- [ ] Dark mode toggle works
- [ ] Responsive design on mobile
- [ ] All buttons are clickable
- [ ] Forms validate input
- [ ] Error messages display correctly
- [ ] Loading states show properly
- [ ] Notifications appear
- [ ] Icons display (no emojis)
- [ ] Smooth animations

### Edge Cases
- [ ] Host disconnects (host should transfer)
- [ ] Player disconnects mid-game
- [ ] Player leaves room
- [ ] Multiple players submit same word
- [ ] Empty submissions
- [ ] Network reconnection
- [ ] Room full (10 players max)
- [ ] Invalid room ID
- [ ] Duplicate player names
- [ ] Very short player names (< 2 chars)

### AI Prompts Testing
- [ ] AI toggle works
- [ ] AI generates prompts when enabled
- [ ] Fresh prompts each time (check console logs)
- [ ] Different categories (Easy, Mixed, Tricky, Desi)
- [ ] Fallback to local prompts if AI fails
- [ ] Replace prompt uses AI when enabled

---

## 🔍 Debugging Tips

### Check Console Logs

**Server Console** (Terminal running `npm run dev:server`):
```
🤖 Generating fresh AI prompts...
✅ Generated 5 fresh AI prompts
🎮 Game started in room ABC123
✍️ Player submitted words
📊 Scores calculated
```

**Browser Console** (F12 → Console):
```
Connected to server
🔄 Requesting fresh AI prompts
🤖 Received fresh AI prompts: [...]
```

### Common Issues

**1. Server won't start**
```bash
# Check if port 3001 is in use
lsof -ti:3001 | xargs kill -9

# Then restart
npm run dev
```

**2. Can't connect from mobile**
- Ensure both devices on same WiFi
- Check firewall settings
- Use IP address shown in server console
- Try `http://YOUR_IP:3000` (not localhost)

**3. AI prompts not working**
- Check `.env` file exists
- Verify API key is correct
- Check server console for errors
- Test API: `curl http://localhost:3001/api/health`

**4. Socket connection errors**
- Check server is running on port 3001
- Check browser console for connection errors
- Try refreshing the page

---

## 🧪 Automated Testing (Optional)

### Test Server Health
```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "aiEnabled": true,
  "provider": "openai"
}
```

### Test AI Prompts API
```bash
curl "http://localhost:3001/api/prompts?category=mixed&count=5"
```

---

## 📱 Mobile Testing

1. **Find your computer's IP**:
   ```bash
   # Mac/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig
   ```

2. **On mobile device**:
   - Connect to same WiFi
   - Open browser
   - Go to: `http://YOUR_IP:3000`
   - Test touch interactions
   - Test responsive layout

---

## 🎯 Quick Test Script

Run this to test everything quickly:

```bash
# 1. Start server
npm run dev

# 2. Open browser to http://localhost:3000

# 3. Test flow:
# - Create room
# - Generate prompts (click multiple times)
# - Start game
# - Submit words
# - Complete round
# - Finish game
# - Play again
```

---

## 🐛 Reporting Issues

If you find bugs, note:
1. **What you did** (steps to reproduce)
2. **What happened** (actual behavior)
3. **What should happen** (expected behavior)
4. **Console errors** (browser + server)
5. **Browser/Device** (Chrome, Safari, mobile, etc.)

---

## ✨ Happy Testing!

The game should work smoothly with:
- ✅ Real-time multiplayer
- ✅ Fresh AI prompts every time
- ✅ Dark mode toggle
- ✅ Responsive design
- ✅ All edge cases handled

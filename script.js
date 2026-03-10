/* === TTT ARENA | SCRIPT.JS === */
'use strict';

// ── Constants ──────────────────────────────────────────
const WIN_PATTERNS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const WIN_COORDS = {
    '0,1,2': [17, 17, 83, 17], '3,4,5': [17, 50, 83, 50], '6,7,8': [17, 83, 83, 83],
    '0,3,6': [17, 17, 17, 83], '1,4,7': [50, 17, 50, 83], '2,5,8': [83, 17, 83, 83],
    '0,4,8': [17, 17, 83, 83], '2,4,6': [83, 17, 17, 83]
};
const BADGES = [
    { label: '⭐ Newcomer', min: 0 }, { label: '🥉 Rookie', min: 1 }, { label: '🥈 Challenger', min: 5 },
    { label: '🥇 Champion', min: 10 }, { label: '💎 Legend', min: 20 }, { label: '👑 Grand Master', min: 50 }
];
const THEMES = ['theme-dark', 'theme-neon', 'theme-light'];
const THEME_ICONS = { 'theme-dark': '🌙', 'theme-neon': '⚡', 'theme-light': '☀️' };

// ── State ──────────────────────────────────────────────
let board = Array(9).fill(null), currentPlayer = 'X', gameActive = false;
let playerX = 'Player X', playerO = 'Player O';
let scores = { X: 0, O: 0, draws: 0 }, gamesPlayed = 0;
let currentFilter = 'all', themeIdx = 0, toastTimer = null;

// ── Init ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    themeIdx = parseInt(localStorage.getItem('ttt-theme') || '0');
    applyTheme();
    updateStats();
    loadForum();
    updateLeaderboard();
    document.getElementById('forum-post-content').addEventListener('input', function () {
        document.getElementById('char-count').textContent = this.value.length;
    });
});

// ── Navigation ─────────────────────────────────────────
function showSection(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById('section-' + name)?.classList.add('active');
    document.getElementById('nav-' + name)?.classList.add('active');
    closeMenu();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (name === 'leaderboard') updateLeaderboard();
    if (name === 'forum') loadForum();
}
function toggleMenu() {
    document.getElementById('nav-links').classList.toggle('open');
    document.getElementById('hamburger').classList.toggle('open');
}
function closeMenu() {
    document.getElementById('nav-links').classList.remove('open');
    document.getElementById('hamburger').classList.remove('open');
}

// ── Theme ──────────────────────────────────────────────
function toggleTheme() {
    themeIdx = (themeIdx + 1) % THEMES.length;
    localStorage.setItem('ttt-theme', themeIdx);
    applyTheme();
    showToast('Theme: ' + THEMES[themeIdx].replace('theme-', '').toUpperCase());
}
function applyTheme() {
    document.getElementById('app-body').className = THEMES[themeIdx];
    document.getElementById('theme-icon').textContent = THEME_ICONS[THEMES[themeIdx]];
}

// ── Badge ──────────────────────────────────────────────
function getBadge(wins) {
    return BADGES.reduce((b, cur) => wins >= cur.min ? cur : b, BADGES[0]);
}

// ── Game Setup ─────────────────────────────────────────
function startGame() {
    const x = document.getElementById('player-x-name').value.trim() || 'Player X';
    const o = document.getElementById('player-o-name').value.trim() || 'Player O';
    if (x === o) { showToast('⚠️ Players must have different names!'); return; }
    playerX = x; playerO = o; scores = { X: 0, O: 0, draws: 0 }; gamesPlayed = 0;
    document.getElementById('player-setup').style.display = 'none';
    document.getElementById('game-arena').style.display = 'block';
    document.getElementById('score-x-name').textContent = playerX;
    document.getElementById('score-o-name').textContent = playerO;
    document.getElementById('composer-name').textContent = playerX;
    document.getElementById('composer-avatar').textContent = playerX[0].toUpperCase();
    resetBoard();
    showToast(`🎮 ${playerX} vs ${playerO}`);
}
function resetSetup() {
    document.getElementById('player-setup').style.display = 'block';
    document.getElementById('game-arena').style.display = 'none';
    gameActive = false;
}
function restartGame() {
    resetBoard();
    document.getElementById('result-banner').style.display = 'none';
}
function resetAll() {
    scores = { X: 0, O: 0, draws: 0 }; gamesPlayed = 0;
    updateScoreUI(); restartGame();
    showToast('🔄 Scores reset!');
}
function resetBoard() {
    board = Array(9).fill(null); currentPlayer = 'X'; gameActive = true;
    for (let i = 0; i < 9; i++) {
        const c = document.getElementById('cell-' + i);
        c.textContent = ''; c.className = 'cell';
    }
    const line = document.getElementById('win-line');
    line.classList.remove('drawn');
    line.setAttribute('x1', 0); line.setAttribute('y1', 0); line.setAttribute('x2', 0); line.setAttribute('y2', 0);
    document.getElementById('result-banner').style.display = 'none';
    updateTurnUI();
}

// ── Game Logic ─────────────────────────────────────────
function makeMove(i) {
    if (!gameActive || board[i]) return;
    board[i] = currentPlayer;
    const cell = document.getElementById('cell-' + i);
    cell.textContent = currentPlayer === 'X' ? '✖' : '○';
    cell.classList.add('taken', 'cell-' + currentPlayer.toLowerCase());

    const win = WIN_PATTERNS.find(([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c]);
    if (win) {
        endGame(win);
    } else if (board.every(Boolean)) {
        endGame(null);
    } else {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        updateTurnUI();
    }
}
function endGame(pattern) {
    gameActive = false; gamesPlayed++;
    if (pattern) {
        pattern.forEach(i => document.getElementById('cell-' + i).classList.add('winning'));
        drawWinLine(pattern);
        scores[currentPlayer]++;
        updateScoreUI(); saveToLeaderboard(currentPlayer);
        const winner = currentPlayer === 'X' ? playerX : playerO;
        showResult(`🎉 ${winner} Wins!`, 'Excellent play!');
        openModal(winner, currentPlayer);
    } else {
        scores.draws++; updateScoreUI(); saveToLeaderboard(null);
        showResult("🤝 It's a Draw!", 'Well matched!');
        openModal(null, null);
    }
    updateStats();
}
function drawWinLine(pattern) {
    const [x1, y1, x2, y2] = WIN_COORDS[pattern.join(',')];
    const s = 300, line = document.getElementById('win-line');
    line.setAttribute('x1', (x1 / 100) * s); line.setAttribute('y1', (y1 / 100) * s);
    line.setAttribute('x2', (x2 / 100) * s); line.setAttribute('y2', (y2 / 100) * s);
    setTimeout(() => line.classList.add('drawn'), 50);
}
function updateTurnUI() {
    const ind = document.getElementById('turn-indicator');
    const name = currentPlayer === 'X' ? playerX : playerO;
    document.getElementById('turn-text').textContent = `${name}'s Turn`;
    ind.className = 'turn-indicator turn-' + currentPlayer.toLowerCase();
}
function updateScoreUI() {
    document.getElementById('score-x').textContent = scores.X;
    document.getElementById('score-o').textContent = scores.O;
    document.getElementById('score-draws').textContent = scores.draws;
    document.getElementById('badge-x').textContent = getBadge(getWins(playerX)).label;
    document.getElementById('badge-o').textContent = getBadge(getWins(playerO)).label;
}
function showResult(msg, sub) {
    document.getElementById('result-message').textContent = msg;
    document.getElementById('result-sub').textContent = sub;
    document.getElementById('result-banner').style.display = 'block';
}

// ── Modal ──────────────────────────────────────────────
function openModal(winner, player) {
    document.getElementById('modal-trophy').textContent = winner ? '🏆' : '🤝';
    document.getElementById('modal-title').textContent = winner ? `${winner} Wins!` : "It's a Draw!";
    document.getElementById('modal-message').textContent = `Score: ${scores.X}–${scores.O} | Round ${gamesPlayed}`;
    document.getElementById('modal-badge').textContent = winner ? getBadge(getWins(winner)).label : '📊 Fair Match';
    document.getElementById('winner-modal').style.display = 'flex';
    if (winner) createConfetti();
}
function closeModal() { document.getElementById('winner-modal').style.display = 'none'; }
document.addEventListener('click', e => { if (e.target.id === 'winner-modal') closeModal(); });

function createConfetti() {
    const el = document.getElementById('modal-confetti'); el.innerHTML = '';
    const cols = ['#ff4d6d', '#00d4ff', '#a855f7', '#ffd700', '#00ffcc'];
    for (let i = 0; i < 25; i++) {
        const p = document.createElement('div'); p.className = 'confetti-piece';
        p.style.cssText = `left:${Math.random() * 100}%;background:${cols[i % 5]};
      animation-delay:${Math.random() * .8}s;animation-duration:${1.5 + Math.random()}s;
      width:${4 + Math.random() * 8}px;height:${4 + Math.random() * 8}px;
      border-radius:${Math.random() > .5 ? '50%' : '2px'}`;
        el.appendChild(p);
    }
}

// ── Leaderboard ────────────────────────────────────────
const lsGet = () => { try { return JSON.parse(localStorage.getItem('ttt-lb') || '{}'); } catch { return {}; } };
const lsSave = d => localStorage.setItem('ttt-lb', JSON.stringify(d));
function getWins(name) { return (lsGet()[name] || {}).wins || 0; }

function saveToLeaderboard(winPlayer) {
    const data = lsGet();
    [playerX, playerO].forEach(n => { if (!data[n]) data[n] = { wins: 0, losses: 0, draws: 0, games: 0 }; data[n].games++; });
    if (winPlayer) {
        const w = winPlayer === 'X' ? playerX : playerO, l = winPlayer === 'X' ? playerO : playerX;
        data[w].wins++; data[l].losses++;
    } else {
        data[playerX].draws++; data[playerO].draws++;
    }
    lsSave(data);
}
function updateLeaderboard() {
    const data = lsGet();
    const players = Object.entries(data).map(([name, s]) => ({
        name, ...s, wr: s.games > 0 ? Math.round(s.wins / s.games * 100) : 0
    })).sort((a, b) => b.wins - a.wins || b.wr - a.wr);
    renderPodium(players);
    renderTable(players);
}
function renderPodium(p) {
    const el = document.getElementById('podium');
    if (!p.length) { el.innerHTML = ''; return; }
    const order = [];
    if (p[1]) order.push({ d: p[1], r: 2 });
    if (p[0]) order.push({ d: p[0], r: 1 });
    if (p[2]) order.push({ d: p[2], r: 3 });
    const m = { 1: '🥇', 2: '🥈', 3: '🥉' }, h = { 1: 'stand-1', 2: 'stand-2', 3: 'stand-3' };
    el.innerHTML = order.map(({ d, r }) => `
    <div class="podium-item podium-${r}">
      <div class="podium-avatar">${d.name.substring(0, 2).toUpperCase()}</div>
      <div class="podium-name">${esc(d.name)}</div>
      <div class="podium-wins">${d.wins} Wins · ${d.wr}%</div>
      <div class="podium-stand ${h[r]}">${m[r]}</div>
    </div>`).join('');
}
function renderTable(players) {
    const body = document.getElementById('leaderboard-body');
    if (!players.length) {
        body.innerHTML = `<tr><td colspan="7" class="empty-state">No games yet. <a href="#" onclick="showSection('play')">Play now!</a></td></tr>`;
        return;
    }
    const rc = ['rank-1', 'rank-2', 'rank-3'], re = ['🥇', '🥈', '🥉'];
    body.innerHTML = players.map((p, i) => `
    <tr>
      <td class="rank-cell ${rc[i] || ''}">${i < 3 ? re[i] : '#' + (i + 1)}</td>
      <td class="player-cell">${esc(p.name)}</td>
      <td>${getBadge(p.wins).label}</td>
      <td style="color:var(--o);font-weight:600">${p.wins}</td>
      <td style="color:var(--x)">${p.losses}</td>
      <td>${p.draws}</td>
      <td class="winrate-cell">${p.wr}%</td>
    </tr>`).join('');
}
function clearLeaderboard() {
    if (confirm('Clear all leaderboard data?')) {
        localStorage.removeItem('ttt-lb'); updateLeaderboard(); showToast('🗑️ Cleared!');
    }
}

// ── Home Stats ─────────────────────────────────────────
function updateStats() {
    const d = lsGet();
    const games = Object.values(d).reduce((a, p) => a + p.games, 0) / 2;
    animNum('stat-games', Math.round(games));
    animNum('stat-players', Math.max(2, Object.keys(d).length));
    animNum('stat-posts', getPosts().length);
}
function animNum(id, target) {
    const el = document.getElementById(id); if (!el) return;
    const start = parseInt(el.textContent) || 0, diff = target - start; let step = 0;
    const t = setInterval(() => { el.textContent = Math.round(start + diff * ++step / 20); if (step >= 20) clearInterval(t); }, 30);
}

// ── Forum ──────────────────────────────────────────────
const getPosts = () => { try { return JSON.parse(localStorage.getItem('ttt-forum') || '[]'); } catch { return []; } };
const savePosts = p => localStorage.setItem('ttt-forum', JSON.stringify(p));

function postForum() {
    const title = document.getElementById('forum-post-title').value.trim();
    const text = document.getElementById('forum-post-content').value.trim();
    const tag = document.getElementById('forum-tag').value;
    const author = document.getElementById('composer-name').textContent;
    if (!title) { showToast('⚠️ Add a title!'); return; }
    if (!text) { showToast('⚠️ Write something!'); return; }
    const posts = getPosts();
    posts.unshift({ id: Date.now(), author, title, content: text, tag, ts: new Date().toISOString(), likes: 0, liked: false });
    savePosts(posts);
    document.getElementById('forum-post-title').value = '';
    document.getElementById('forum-post-content').value = '';
    document.getElementById('char-count').textContent = '0';
    loadForum(); updateStats(); showToast('✅ Posted!');
}
function loadForum() { filterForum(currentFilter, null); }
function filterForum(tag, btn) {
    currentFilter = tag;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const posts = getPosts(), list = tag === 'all' ? posts : posts.filter(p => p.tag === tag);
    renderPosts(list);
}
function renderPosts(posts) {
    const c = document.getElementById('forum-posts');
    c.querySelector('.empty-forum').style.display = posts.length ? 'none' : 'block';
    c.querySelectorAll('.forum-post').forEach(e => e.remove());
    posts.forEach(p => {
        const d = document.createElement('div'); d.className = 'forum-post'; d.id = 'post-' + p.id;
        d.innerHTML = `
      <div class="post-header">
        <div class="post-avatar">${p.author[0].toUpperCase()}</div>
        <div class="post-meta">
          <div class="post-author">${esc(p.author)}<span class="post-tag">${p.tag}</span></div>
          <div class="post-time">${fmtTime(p.ts)}</div>
        </div>
      </div>
      <div class="post-title">${esc(p.title)}</div>
      <div class="post-content">${esc(p.content)}</div>
      <div class="post-actions">
        <button class="post-action-btn ${p.liked ? 'liked' : ''}" onclick="likePost(${p.id})">❤️ ${p.likes}</button>
        <button class="post-action-btn delete-btn" onclick="deletePost(${p.id})">🗑️ Delete</button>
      </div>`;
        c.appendChild(d);
    });
}
function likePost(id) {
    const posts = getPosts(), p = posts.find(x => x.id === id); if (!p) return;
    p.liked = !p.liked; p.likes = Math.max(0, p.likes + (p.liked ? 1 : -1));
    savePosts(posts); filterForum(currentFilter, null);
    showToast(p.liked ? '❤️ Liked!' : '💔 Unliked');
}
function deletePost(id) {
    savePosts(getPosts().filter(p => p.id !== id));
    filterForum(currentFilter, null); updateStats(); showToast('🗑️ Deleted!');
}

// ── Utilities ──────────────────────────────────────────
function esc(s) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(s))); return d.innerHTML;
}
function fmtTime(iso) {
    const d = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (d < 60) return 'Just now';
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
}
function showToast(msg) {
    const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Keyboard Shortcuts ─────────────────────────────────
document.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'r' && document.getElementById('game-arena').style.display !== 'none') restartGame();
    const map = { '1': 'home', '2': 'play', '3': 'leaderboard', '4': 'forum' };
    if (map[e.key]) showSection(map[e.key]);
});

// ── Keyboard: Board Cells ──────────────────────────────
document.querySelectorAll('.cell').forEach((c, i) => {
    c.tabIndex = 0; c.role = 'button'; c.ariaLabel = `Cell ${i + 1}`;
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); makeMove(i); } });
});
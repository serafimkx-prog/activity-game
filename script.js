// ─── Audio ─────────────────────────────────────────────────────────────────────
let audioCtx = null

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

function tone(freq, startOffset, duration, type = 'sine', vol = 0.4) {
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain); gain.connect(ctx.destination)
  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset)
  gain.gain.setValueAtTime(vol, ctx.currentTime + startOffset)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration)
  osc.start(ctx.currentTime + startOffset)
  osc.stop(ctx.currentTime + startOffset + duration + 0.01)
}

function sfxTick(urgent) { tone(urgent ? 1100 : 750, 0, 0.05, 'square', 0.4) }
function sfxTimeUp() {
  const ctx = getCtx()
  for (let i = 0; i < 3; i++) {
    const t = i * 0.38
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(440 + i * 80, ctx.currentTime + t)
    gain.gain.setValueAtTime(0.4, ctx.currentTime + t)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3)
    osc.start(ctx.currentTime + t)
    osc.stop(ctx.currentTime + t + 0.38)
  }
}
function sfxSuccess() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.25, 'sine', 0.4)) }
function sfxFail() { [[350, 0], [294, 0.18], [220, 0.36]].forEach(([f, t]) => tone(f, t, 0.25, 'triangle', 0.4)) }
function sfxCardPick() { tone(600, 0, 0.05, 'sine', 0.4); tone(900, 0.06, 0.08, 'sine', 0.4) }
function sfxPreviewStart() { tone(880, 0, 0.08, 'sine', 0.4); tone(1100, 0.12, 0.1, 'sine', 0.4) }
function sfxNavForward() { tone(400, 0, 0.04, 'sine', 0.3); tone(600, 0.04, 0.05, 'sine', 0.3) }
function sfxNavBack() { tone(600, 0, 0.04, 'sine', 0.3); tone(400, 0.04, 0.05, 'sine', 0.3) }
function sfxOpenRound() { [440, 554, 659, 880].forEach((f, i) => tone(f, i * 0.1, 0.4, 'triangle', 0.5)) }
function sfxCollision() { tone(150, 0, 0.3, 'sawtooth', 0.5) }
function sfxTurnStart() { tone(1000, 0, 0.1, 'sine', 0.5); tone(1200, 0.1, 0.2, 'sine', 0.5) }

// ─── Board: 41 клетка (0–40), финиш = 41 ──────────────────────────────────────
// E=Объяснение(14), A=Пантомима(14), D=Рисование(13) — генерируется рандомно
let BOARD = []

function generateBoard() {
  const cells = [
    ...Array(14).fill('E'),
    ...Array(14).fill('A'),
    ...Array(13).fill('D'),
  ]
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]]
  }
  BOARD = cells
}
// BOARD.length === 41; победа когда position >= 41

const BOARD_LEN = 41
const FINISH    = 41
const GRID_COLS = 7
const GRID_ROWS = 6  // 6×7 = 42 = 41 клетка + 1 финиш

const MODES = {
  E: { key:'EXPLAIN', icon:'🗣️', name:'Объяснение', css:'mode-e',
       hint:'Объясняй словами — нельзя называть само слово, однокоренные слова и переводы' },
  A: { key:'ACT',     icon:'🙌', name:'Пантомима',  css:'mode-a',
       hint:'Только жесты и мимика — ни звука!' },
  D: { key:'DRAW',    icon:'🎨', name:'Рисование',  css:'mode-d',
       hint:'Рисуй — слова, буквы и цифры под запретом' },
}

const TEAM_COLORS = ['#22c55e','#3b82f6','#f97316','#ec4899','#a855f7','#06b6d4']

// ─── State ─────────────────────────────────────────────────────────────────────
const state = {
  teams: [],
  teamIndex: 0,
  cellMode: null,
  selectedCard: null,
  pools: null,
  indices: null,
  config: { turnTime: 60 },
  timer: null,
  timeLeft: 0,
  gameInProgress: false,
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function q(id) { return document.getElementById(id) }

function showScreen(id) {
  clearInterval(state.timer);
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
  q('screen-' + id).classList.add('active')
  window.scrollTo(0, 0)
}

function getCellMode(pos) {
  const idx = Math.min(pos, BOARD_LEN - 1)
  return MODES[BOARD[idx]]
}

function initPools(data) {
  state.pools = {}
  state.indices = {}
  for (const mk of ['DRAW','EXPLAIN','ACT']) {
    state.pools[mk] = {}
    state.indices[mk] = {}
    for (const d of ['3','4','5']) {
      state.pools[mk][d] = shuffle([...data[mk][d]])
      state.indices[mk][d] = 0
    }
  }
}

function nextWord(mk, d) {
  let idx = state.indices[mk][d]
  if (idx >= state.pools[mk][d].length) {
    // Пул исчерпан — перемешиваем заново (очень редко)
    state.pools[mk][d] = shuffle(state.pools[mk][d])
    idx = 0
  }
  state.indices[mk][d] = idx + 1
  return state.pools[mk][d][idx]
}

function drawCard(pts) {
  const d = String(pts)
  const isRed = state.config.openRoundEnabled && Math.random() < 0.10
  return {
    points: pts,
    isOpenRound: isRed,
    entries: {
      DRAW:    nextWord('DRAW', d),
      EXPLAIN: nextWord('EXPLAIN', d),
      ACT:     nextWord('ACT', d),
    }
  }
}

// ─── Board render (snake, 7 колонок) ──────────────────────────────────────────
// Маршрут: ряд 0 → слева направо, ряд 1 → справа налево, …
// Слоты 0–40 = клетки, слот 41 = финиш

function pathToGrid(slotIdx) {
  const row = Math.floor(slotIdx / GRID_COLS)
  const pos = slotIdx % GRID_COLS
  const col = (row % 2 === 0) ? pos : (GRID_COLS - 1 - pos)
  return { row, col }
}

function renderBoard(containerId) {
  const team = state.teams[state.teamIndex]

  // 2D-сетка: grid[row][col] = slot (0–41) или -1
  const grid = Array.from({ length: GRID_ROWS }, () => new Array(GRID_COLS).fill(-1))
  for (let slot = 0; slot <= FINISH; slot++) {
    const { row, col } = pathToGrid(slot)
    if (row < GRID_ROWS) grid[row][col] = slot
  }

  function cellHTML(slot, r, c) {
    if (slot === -1) return '<div class="board-cell empty"></div>'
    if (slot === FINISH) {
      const here = state.teams.filter(t => t.position >= FINISH)
      return `<div class="board-cell fin-cell">
        <span class="cn">41</span>
        <div class="tokens">${here.map(t => `<span class="tok" style="background:${t.color}"></span>`).join('')}</div>
      </div>`
    }
    const mKey = BOARD[slot]
    const isCurrent = team && team.position === slot
    const here = state.teams.filter(t => t.position === slot)
    return `<div class="board-cell mode-${mKey.toLowerCase()}${isCurrent ? ' current' : ''}">
      <span class="cn">${slot}</span>
      <div class="tokens">${here.map(t => `<span class="tok" style="background:${t.color}"></span>`).join('')}</div>
    </div>`
  }

  let rows = '<div class="board-rows">'
  for (let r = 0; r < GRID_ROWS; r++) {
    // Ряд ячеек
    rows += '<div class="board-row">'
    for (let c = 0; c < GRID_COLS; c++) rows += cellHTML(grid[r][c], r, c)
    rows += '</div>'

    // Разделитель между рядами (кроме последнего)
    // Открытый сегмент — там, куда уходит змейка:
    //   чётный ряд → выход справа (col 6), нечётный → выход слева (col 0)
    if (r < GRID_ROWS - 1) {
      const openCol = (r % 2 === 0) ? GRID_COLS - 1 : 0
      rows += '<div class="board-sep">'
      for (let c = 0; c < GRID_COLS; c++) {
        rows += `<div class="sep-seg${c === openCol ? ' open' : ''}"></div>`
      }
      rows += '</div>'
    }
  }
  rows += '</div>'

  const labels = state.teams.map(t => {
    const posLabel = t.position >= FINISH ? '🏁' : `кл.${t.position}`
    return `<span class="board-team-label">
      <span style="width:9px;height:9px;border-radius:50%;background:${t.color};display:inline-block"></span>
      ${t.name}: ${posLabel}
    </span>`
  }).join('')

  q(containerId).innerHTML = `
    <div class="board-info">${labels}</div>
    ${rows}
    <div class="board-legend">
      <div class="leg"><div class="leg-dot" style="background:#3d3180"></div>🗣️ Объяснение</div>
      <div class="leg"><div class="leg-dot" style="background:#7a1e1e"></div>🙌 Пантомима</div>
      <div class="leg"><div class="leg-dot" style="background:#7a5500"></div>🎨 Рисование</div>
    </div>`
}

// ─── Dictionary selection ──────────────────────────────────────────────────────
let dictionaries = []
let selectedDictId = null

async function loadDictionaries() {
  try {
    dictionaries = await fetch('dictionaries.json').then(r => r.json())
  } catch {
    // Fallback: единственный словарь без метаданных
    dictionaries = [{
      id: 'classic', name: 'Классический', subtitle: 'Всё обо всём',
      icon: '🎭', file: 'words.json', wordCount: 922, available: true
    }]
  }
  const first = dictionaries.find(d => d.available)
  if (first) selectedDictId = first.id
  renderDictGrid()
}

function renderDictGrid() {
  const grid = q('dict-grid')
  grid.innerHTML = dictionaries.map(d => {
    const isSel = d.id === selectedDictId
    const locked = !d.available
    return `<div class="dict-card${isSel ? ' selected' : ''}${locked ? ' locked' : ''}"
                 ${locked ? '' : `onclick="selectDict('${d.id}')"`}>
      ${isSel ? '<div class="dict-check">✓</div>' : ''}
      ${!isSel && d.badge ? `<div class="dict-badge">${d.badge}</div>` : ''}
      <div class="dict-icon">${d.icon}</div>
      <div class="dict-name">${d.name}</div>
      <div class="dict-sub">${d.subtitle}</div>
      <div class="dict-words">${d.available ? 'Количество слов: ' + d.wordCount : ''}</div>
    </div>`
  }).join('')
}

window.selectDict = function(id) {
  const dict = dictionaries.find(d => d.id === id)
  if (!dict || !dict.available) return
  selectedDictId = id
  renderDictGrid()
}

// ─── Setup ─────────────────────────────────────────────────────────────────────
let teamCount = 2
const defaultNames = ['Команда 1','Команда 2','Команда 3','Команда 4','Команда 5','Команда 6']
// teamPlayers[i] = массив имён игроков команды i (минимум 1)
let teamPlayers = [[''], ['']]

function saveCurrentInputs() {
  for (let i = 0; i < teamCount; i++) {
    const nameEl = q(`ti${i}`)
    if (nameEl) defaultNames[i] = nameEl.value
    for (let j = 0; j < teamPlayers[i].length; j++) {
      const el = q(`pi${i}_${j}`)
      if (el) teamPlayers[i][j] = el.value
    }
  }
}

function renderTeams() {
  const c = q('teams-container')
  c.innerHTML = ''
  for (let i = 0; i < teamCount; i++) {
    const players = teamPlayers[i]
    const playersHTML = players.map((name, j) => `
      <div class="player-row">
        <input class="player-input" id="pi${i}_${j}" placeholder="Имя игрока" value="${name}">
        ${players.length > 1
          ? `<button class="btn btn-sm btn-secondary" style="padding:4px 8px;font-size:.75rem" onclick="removePlayer(${i},${j})">✕</button>`
          : ''}
      </div>`).join('')
    const d = document.createElement('div')
    d.className = 'team-block'
    d.style.borderLeftColor = TEAM_COLORS[i]
    d.innerHTML = `<div class="team-header">
      <input class="team-name-input" id="ti${i}" value="${defaultNames[i]}" style="border-bottom-color:${TEAM_COLORS[i]}">
      ${teamCount > 2 ? `<button class="btn btn-sm btn-danger" onclick="removeTeam(${i})">✕</button>` : ''}
    </div>
    <div class="players-section">
      <div class="players-label">Игроки</div>
      ${playersHTML}
      <button class="add-player-btn" onclick="addPlayer(${i})">+ Добавить игрока</button>
    </div>`
    c.appendChild(d)
  }
  q('add-team-btn').style.display = teamCount >= 6 ? 'none' : 'block'
}

window.addPlayer = function(i) {
  saveCurrentInputs()
  teamPlayers[i].push('')
  renderTeams()
}

window.removePlayer = function(i, j) {
  saveCurrentInputs()
  teamPlayers[i].splice(j, 1)
  renderTeams()
}

window.removeTeam = function(i) {
  saveCurrentInputs()
  defaultNames.splice(i, 1)
  teamPlayers.splice(i, 1)
  teamCount--
  renderTeams()
}

q('add-team-btn').addEventListener('click', () => {
  if (teamCount < 6) {
    saveCurrentInputs()
    teamPlayers.push([''])
    teamCount++
    renderTeams()
  }
})

q('start-btn').addEventListener('click', async () => {
  sfxNavForward();
  saveCurrentInputs()
  const names = []
  const playerLists = []
  for (let i = 0; i < teamCount; i++) {
    const v = q(`ti${i}`).value.trim()
    if (!v) { alert('Введи названия всех команд'); return }
    names.push(v); defaultNames[i] = v
    const plist = teamPlayers[i].map(p => p.trim()).filter(p => p)
    playerLists.push(plist.length > 0 ? plist : [v])  // fallback: имя команды = один игрок
  }
  state.config.turnTime = parseInt(q('turn-time').value) || 60
  state.config.openRoundEnabled = q('open-round-enabled').checked

  const dict = dictionaries.find(d => d.id === selectedDictId)
  if (!dict) { alert('Выбери словарь'); return }
  let data
  try { data = await fetch(dict.file).then(r => r.json()) }
  catch { alert(`Не удалось загрузить ${dict.file}.\nЗапусти: python3 -m http.server 8080`); return }

  generateBoard()
  initPools(data)
  state.teams = names.map((name, i) => ({
    name,
    position: 0,
    color: TEAM_COLORS[i],
    players: playerLists[i],
    explainerIdx: 0,
  }))
  state.teamIndex = 0
  state.gameInProgress = true; // Set game in progress
  goTurnStart()
})

// ─── Explainer helper ──────────────────────────────────────────────────────────
function getExplainer(team) {
  return team.players[team.explainerIdx % team.players.length]
}

// ─── Turn Start ────────────────────────────────────────────────────────────────
function goTurnStart() {
  clearInterval(state.timer);
  sfxNavBack();
  const team = state.teams[state.teamIndex]
  state.cellMode = getCellMode(team.position)

  setBadge('ts-badge', team)
  q('ts-cell-label').textContent = `Клетка ${team.position} из 40`
  const explainer = getExplainer(team)
  q('ts-explainer').innerHTML = team.players.length > 1
    ? `Загадывает: <strong>${explainer}</strong>`
    : ''
  q('ts-icon').textContent = state.cellMode.icon
  q('ts-mode-name').textContent = state.cellMode.name
  q('ts-hint').textContent = state.cellMode.hint
  renderBoard('ts-board')
  showScreen('turn-start')
}
q('ts-ready-btn').addEventListener('click', () => { sfxNavForward(); goCardSelection() })
q('ts-back-to-menu-btn').addEventListener('click', () => { sfxNavBack(); goSetupMenu() })

// ─── Card Selection (только сложность, без слов) ───────────────────────────────
function goCardSelection() {
  const team = state.teams[state.teamIndex]
  setBadge('cs-badge', team)

  const pill = q('cs-mode-pill')
  pill.className = 'mode-pill ' + state.cellMode.css
  pill.innerHTML = `${state.cellMode.icon} ${state.cellMode.name}`

  const explainer = getExplainer(team)
  q('cs-explainer').innerHTML = team.players.length > 1
    ? `Загадывает: <strong>${explainer}</strong>`
    : ''

  showScreen('card-selection')
}

document.querySelectorAll('.diff-card').forEach(el => {
  el.addEventListener('click', () => {
    sfxCardPick()
    const pts = parseInt(el.dataset.pts)
    state.selectedCard = drawCard(pts)
    goPreview()
  })
})

q('cs-back-btn').addEventListener('click', () => { sfxNavBack(); goTurnStart() })

// ─── Preview (7 сек, слово открыто, потом сразу объяснение) ──────────────────
function goPreview() {
  const team = state.teams[state.teamIndex]
  const word = state.selectedCard.entries[state.cellMode.key]

  setBadge('pv-badge', team)
  const pill = q('pv-mode-pill')
  pill.className = 'mode-pill ' + state.cellMode.css
  pill.innerHTML = `${state.cellMode.icon} ${state.cellMode.name}`
  q('pv-word').textContent = word
  
  const alert = q('pv-open-round-alert')
  if (state.selectedCard.isOpenRound) {
    sfxOpenRound();
    alert.style.display = 'block';
  } else {
    alert.style.display = 'none';
  }

  let sec = 7
  const cd = q('pv-countdown')
  cd.textContent = sec + 'с'
  cd.className = 'countdown-ring'
  showScreen('preview')

  clearInterval(state.timer)
  state.timer = setInterval(() => {
    sec--
    cd.textContent = sec + 'с'
    if (sec <= 3) cd.className = 'countdown-ring urgent'
    if (sec <= 0) { clearInterval(state.timer); sfxTurnStart(); goExplaining() }
  }, 1000)
}

// ─── Explaining ────────────────────────────────────────────────────────────────
function goExplaining() {
  const word = state.selectedCard.entries[state.cellMode.key]
  const pts  = state.selectedCard.points
  const isOpen = state.selectedCard.isOpenRound

  const pill = q('ex-mode-pill')
  pill.className = 'mode-pill ' + state.cellMode.css
  pill.innerHTML = `${state.cellMode.icon} ${state.cellMode.name}`

  q('ex-word').textContent = word
  if (isOpen) {
    q('ex-pts-hint').textContent = '🎭 ОТКРЫТЫЙ РАУНД! Угадывают все!'
    q('ex-pts-hint').style.color = '#ef4444'
    q('normal-btns').style.display = 'none'
    q('open-round-btns').style.display = 'block'
    q('teams-btns-container').innerHTML = state.teams.map((t, i) =>
      `<button class="btn btn-success" style="padding: 18px; font-size: 1.1rem;" onclick="endOpenRound(${i})">${t.name}</button>`
    ).join('')
  } else {
    q('ex-pts-hint').textContent = `Угадаете — +${pts} очков, фишка вперёд на ${pts}`
    q('ex-pts-hint').style.color = '#aaa'
    q('normal-btns').style.display = 'flex'
    q('open-round-btns').style.display = 'none'
  }

  renderPositions()
  state.timeLeft = state.config.turnTime
  updateTimer()
  showScreen('explaining')

  clearInterval(state.timer)
  state.timer = setInterval(() => {
    state.timeLeft--
    updateTimer()
    if (state.timeLeft <= 0) { clearInterval(state.timer); onTimerEnd() }
  }, 1000)
}

window.endOpenRound = function(winnerIdx) {
  clearInterval(state.timer);
  const team = state.teams[state.teamIndex];
  const winnerTeam = state.teams[winnerIdx];
  const isExplainer = (winnerIdx === state.teamIndex);
  const pts = state.selectedCard.points;

  // Новые правила: угадавший получает столько сколько на карточке, проигравший исполнитель получает +2
  const earnedPts = pts;
  const prev = winnerTeam.position;
  let prevExplainer = team.position;

  // Логика движения и бонуса
  let collisionNote = '';
  winnerTeam.position = prev + earnedPts;
  const newPos = winnerTeam.position;

  if (newPos < FINISH) {
    // Проверяем столкновение: другие команды отступают
    state.teams.forEach((t, i) => {
        if (i !== winnerIdx && t.position === newPos) {
          t.position = Math.max(0, t.position - 1);
          collisionNote = '\nСтолкновение: соперник отступил на 1 клетку';
        }
      });
  }

  // Если соперник угадал, исполнитель получает +2 утешения
  if (!isExplainer) {
    team.position += 2;
  }

  const winner = state.teams.find(t => t.position >= FINISH);
  if (winner) { showGameOver(winner); return; }

  q('tr-icon').textContent = '🎉';
  if (isExplainer) {
    q('tr-text').textContent = `${winnerTeam.name} угадали! +${earnedPts} очков`;
  } else {
    q('tr-text').textContent = `${winnerTeam.name} угадали! +${earnedPts} очков, ${team.name} получили +2 утешения`;
  }
  q('tr-sub').innerHTML = `${winnerTeam.name}: клетка ${prev} → ${Math.min(newPos, 40)}${collisionNote}${!isExplainer ? `<br>${team.name}: клетка ${prevExplainer} → ${Math.min(team.position, 40)}` : ''}`;

  renderBoard('tr-board');
  showScreen('turn-result');
}

q('open-fail-btn').addEventListener('click', () => { clearInterval(state.timer); endTurn(false); })

function updateTimer() {
  const el = q('ex-timer')
  if (state.timeLeft <= 0) {
    el.textContent = 'Время!'
    el.classList.add('urgent')
  } else {
    el.textContent = state.timeLeft + 'с'
    el.classList.toggle('urgent', state.timeLeft <= 10)
    if (state.timeLeft <= 10) sfxTick(state.timeLeft <= 5)
  }
}

function onTimerEnd() {
  sfxTimeUp()
  const hint = q('ex-pts-hint')
  hint.textContent = '⏰ Время вышло — выберите результат'
  hint.style.color = '#ef4444'
}

function renderPositions() {
  const team = state.teams[state.teamIndex]
  q('ex-positions').innerHTML = state.teams.map(t =>
    `<div class="pos-badge" style="${t.name===team.name?'border:1px solid '+t.color:''}">
      <strong style="color:${t.color}">●</strong> ${t.name}: кл.${Math.min(t.position, 40)}
    </div>`
  ).join('')
}

q('guess-btn').addEventListener('click', () => { clearInterval(state.timer); sfxSuccess(); endTurn(true) })
q('fail-btn').addEventListener('click', () => { clearInterval(state.timer); sfxFail(); endTurn(false) })

// ─── End turn ──────────────────────────────────────────────────────────────────
function endTurn(guessed) {
  const pts  = state.selectedCard.points
  const team = state.teams[state.teamIndex]
  const prev = team.position

  // Rotate explainer for this team
  team.explainerIdx = (team.explainerIdx + 1) % team.players.length

  let collisionNote = ''
  if (guessed) {
    team.position = prev + pts
    const newPos = team.position
    // Если финиш — победа (столкновения не считаем)
    if (newPos < FINISH) {
      // Проверяем столкновение: другие команды на той же клетке отступают на 1
      state.teams.forEach((t, i) => {
        if (i !== state.teamIndex && t.position === newPos) {
          t.position = Math.max(0, t.position - 1)
          collisionNote = `\n${t.name} отступает на клетку ${t.position}`
        }
      })
    }
  }

  const newPos = team.position
  const winner = state.teams.find(t => t.position >= FINISH)
  if (winner) { showGameOver(winner); return }

  q('tr-icon').textContent = guessed ? '🎉' : '😬'
  q('tr-text').textContent = guessed ? `Угадали! +${pts} очков` : 'Не угадали — очков нет'
  q('tr-sub').innerHTML = guessed
    ? `Фишка: клетка ${prev} → клетка ${Math.min(newPos, 40)}${collisionNote ? '<br><span style="color:#f59e0b;font-size:.85rem">'+collisionNote.trim()+'</span>' : ''}`
    : `Фишка остаётся на клетке ${prev}`

  renderBoard('tr-board')
  showScreen('turn-result')
}

q('next-turn-btn').addEventListener('click', () => { sfxNavForward(); state.teamIndex = (state.teamIndex + 1) % state.teams.length; goTurnStart() })

// ─── Game over ──────────────────────────────────────────────────────────────────
function showGameOver(winner) {
  q('go-winner').textContent = winner.name
  const sorted = [...state.teams].sort((a, b) => b.position - a.position)
  q('go-scores').innerHTML = sorted.map(t =>
    `<div class="final-row${t.name===winner.name?' winner-row':''}">
      <span>${t.name===winner.name?'🥇 ':''}${t.name}</span>
      <strong>${t.position >= FINISH ? 'финиш 🏁' : 'клетка '+t.position}</strong>
    </div>`
  ).join('')
  showScreen('game-over')
  state.gameInProgress = false; // Game over, reset flag
}

q('restart-btn').addEventListener('click', () => {
  sfxNavForward();
  teamCount = 2
  defaultNames.length = 0
  defaultNames.push('Команда 1','Команда 2','Команда 3','Команда 4','Команда 5','Команда 6')
  teamPlayers = [[''], ['']]
  renderTeams()
  state.gameInProgress = false; // Restart game, reset flag
  showScreen('setup')
})

// ─── Return to Setup Menu ───────────────────────────────────────────────────────
function goSetupMenu() {
  clearInterval(state.timer); // Stop any active timers
  updateSetupMenuButtons(); // Update button visibility on returning to menu
  showScreen('setup');
}

// ─── Update Setup Menu Buttons Visibility ───────────────────────────────────────
function updateSetupMenuButtons() {
  const continueBtn = q('continue-game-btn');
  if (state.gameInProgress) {
    continueBtn.style.display = 'flex'; // Or 'block' depending on desired layout
  } else {
    continueBtn.style.display = 'none';
  }
}

// ─── Util ───────────────────────────────────────────────────────────────────────
function setBadge(id, team) {
  const el = q(id); el.textContent = team.name; el.style.background = team.color
}

// ─── Init ───────────────────────────────────────────────────────────────────────
renderTeams()
loadDictionaries()
updateSetupMenuButtons(); // Initial check for button visibility

q('ts-back-to-menu-btn').addEventListener('click', goSetupMenu); // <-- New event listener

// Handle Continue Game button click
q('continue-game-btn').addEventListener('click', () => {
  goTurnStart(); // Resume the game
});

window.changeTime = function(delta) {
  const el = q('turn-time');
  let val = parseInt(el.value) + delta;
  if (val < 30) val = 30;
  if (val > 180) val = 180;
  el.value = val;
};

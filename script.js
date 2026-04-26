// ─── Audio ─────────────────────────────────────────────────────────────────────
let audioCtx = null

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}

async function primeAudioContext() {
  const ctx = getCtx()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }

  // Warm up the graph silently so the first audible note does not click/double.
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(0.00001, ctx.currentTime)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.001)
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
function sfxStartGame() { tone(400, 0, 0.04, 'sine', 0.3); tone(600, 0.04, 0.05, 'sine', 0.3) }
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
const DICTIONARY_FEEDBACK_STORAGE_KEY = 'activity_dictionary_feedback_v1'
const ACTIVE_GAME_STORAGE_KEY = 'activity_active_game_v1'
const GAME_SESSION_QUEUE_STORAGE_KEY = 'activity_pending_game_sessions_v1'

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
  currentDictionary: null,
  gameStartedAt: null,
  turnLog: [],
  turnStartedAt: null,
  currentTurnNumber: 0,
  lastGameSummary: null,
  pendingTurnFeedback: null,
}

const auth = {
  config: null,
  user: null,
  widgetLoaded: false,
  statsLoaded: false,
  recentGamesMap: {},
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

function safeReadLocalStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function safeWriteLocalStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]))
}

function getActiveScreenId() {
  const active = document.querySelector('.screen.active')
  return active?.id?.replace('screen-', '') || 'setup'
}

function clearActiveGameSnapshot() {
  try {
    window.localStorage.removeItem(ACTIVE_GAME_STORAGE_KEY)
  } catch {}
}

function getPendingGameSessions() {
  const entries = safeReadLocalStorage(GAME_SESSION_QUEUE_STORAGE_KEY, [])
  return Array.isArray(entries) ? entries : []
}

function writePendingGameSessions(entries) {
  return safeWriteLocalStorage(GAME_SESSION_QUEUE_STORAGE_KEY, entries)
}

function upsertPendingGameSession(entry) {
  const entries = getPendingGameSessions().filter(item => item.sessionId !== entry.sessionId)
  entries.push(entry)
  return writePendingGameSessions(entries)
}

function removePendingGameSession(sessionId) {
  const entries = getPendingGameSessions().filter(item => item.sessionId !== sessionId)
  return writePendingGameSessions(entries)
}

function buildActiveGameSnapshot() {
  if (!state.gameInProgress || !state.currentDictionary || !BOARD.length) return null

  return {
    version: 1,
    savedAt: new Date().toISOString(),
    activeScreen: getActiveScreenId(),
    board: [...BOARD],
    selectedDictId,
    state: {
      teams: state.teams.map(team => ({ ...team, players: [...team.players] })),
      teamIndex: state.teamIndex,
      cellMode: state.cellMode ? { ...state.cellMode } : null,
      selectedCard: state.selectedCard ? JSON.parse(JSON.stringify(state.selectedCard)) : null,
      pools: state.pools ? JSON.parse(JSON.stringify(state.pools)) : null,
      indices: state.indices ? JSON.parse(JSON.stringify(state.indices)) : null,
      config: { ...state.config },
      timeLeft: state.timeLeft,
      gameInProgress: state.gameInProgress,
      currentDictionaryId: state.currentDictionary.id,
      gameStartedAt: state.gameStartedAt,
      turnLog: state.turnLog.map(turn => ({ ...turn })),
      turnStartedAt: state.turnStartedAt,
      currentTurnNumber: state.currentTurnNumber,
      pendingTurnFeedback: state.pendingTurnFeedback ? { ...state.pendingTurnFeedback } : null,
    },
  }
}

function persistActiveGameSnapshot() {
  const snapshot = buildActiveGameSnapshot()
  if (!snapshot) {
    clearActiveGameSnapshot()
    return false
  }
  return safeWriteLocalStorage(ACTIVE_GAME_STORAGE_KEY, snapshot)
}

function restoreExplainingScreen() {
  const word = state.selectedCard.entries[state.cellMode.key]
  const pts = state.selectedCard.points
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
  updateTimer()
  showScreen('explaining')

  clearInterval(state.timer)
  state.timer = setInterval(() => {
    state.timeLeft--
    updateTimer()
    if (state.timeLeft <= 0) { clearInterval(state.timer); onTimerEnd() }
  }, 1000)
}

function restorePreviewScreen() {
  const team = state.teams[state.teamIndex]
  const word = state.selectedCard.entries[state.cellMode.key]

  setBadge('pv-badge', team)
  const pill = q('pv-mode-pill')
  pill.className = 'mode-pill ' + state.cellMode.css
  pill.innerHTML = `${state.cellMode.icon} ${state.cellMode.name}`
  q('pv-word').textContent = word

  const alert = q('pv-open-round-alert')
  alert.style.display = state.selectedCard.isOpenRound ? 'block' : 'none'

  let sec = Math.max(1, Math.floor(state.timeLeft || 7))
  const cd = q('pv-countdown')
  cd.textContent = sec + 'с'
  cd.className = sec <= 3 ? 'countdown-ring urgent' : 'countdown-ring'
  showScreen('preview')

  clearInterval(state.timer)
  state.timer = setInterval(() => {
    sec--
    state.timeLeft = sec
    cd.textContent = sec + 'с'
    if (sec <= 3) cd.className = 'countdown-ring urgent'
    if (sec <= 0) { clearInterval(state.timer); sfxTurnStart(); goExplaining() }
  }, 1000)
}

function restoreTurnResultScreen() {
  renderTurnFeedbackPrompt()
  renderBoard('tr-board')
  showScreen('turn-result')
}

function restoreActiveGameFromSnapshot() {
  const snapshot = safeReadLocalStorage(ACTIVE_GAME_STORAGE_KEY, null)
  if (!snapshot || !snapshot.state?.gameInProgress) return false

  const dictionaryId = snapshot.state.currentDictionaryId || snapshot.selectedDictId
  const dictionary = dictionaries.find(dict => dict.id === dictionaryId)
  if (!dictionary?.canPlay) {
    clearActiveGameSnapshot()
    return false
  }

  BOARD = Array.isArray(snapshot.board) ? [...snapshot.board] : []
  if (!BOARD.length) return false

  selectedDictId = dictionary.id
  state.teams = Array.isArray(snapshot.state.teams) ? snapshot.state.teams.map(team => ({ ...team, players: [...team.players] })) : []
  state.teamIndex = Number(snapshot.state.teamIndex) || 0
  state.cellMode = snapshot.state.cellMode || null
  state.selectedCard = snapshot.state.selectedCard || null
  state.pools = snapshot.state.pools || null
  state.indices = snapshot.state.indices || null
  state.config = snapshot.state.config || { turnTime: 60 }
  state.timeLeft = Number(snapshot.state.timeLeft) || 0
  state.gameInProgress = true
  state.currentDictionary = dictionary
  state.gameStartedAt = snapshot.state.gameStartedAt || null
  state.turnLog = Array.isArray(snapshot.state.turnLog) ? snapshot.state.turnLog.map(turn => ({ ...turn })) : []
  state.turnStartedAt = snapshot.state.turnStartedAt || null
  state.currentTurnNumber = Number(snapshot.state.currentTurnNumber) || 0
  state.lastGameSummary = null
  state.pendingTurnFeedback = snapshot.state.pendingTurnFeedback || null

  q('turn-time').value = state.config.turnTime || 60
  q('open-round-enabled').checked = Boolean(state.config.openRoundEnabled)
  updateSetupMenuButtons()
  renderDictGrid()

  switch (snapshot.activeScreen) {
    case 'turn-start':
      goTurnStart()
      break
    case 'card-selection':
      goCardSelection()
      break
    case 'preview':
      restorePreviewScreen()
      persistActiveGameSnapshot()
      break
    case 'explaining':
      restoreExplainingScreen()
      persistActiveGameSnapshot()
      break
    case 'turn-result':
      restoreTurnResultScreen()
      persistActiveGameSnapshot()
      break
    case 'setup':
      showScreen('setup')
      break
    default:
      goTurnStart()
      break
  }

  return true
}

function showScreen(id) {
  clearInterval(state.timer);
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
  q('screen-' + id).classList.add('active')
  window.scrollTo(0, 0)
  persistActiveGameSnapshot()
}

function getCellMode(pos) {
  const idx = Math.min(pos, BOARD_LEN - 1)
  return MODES[BOARD[idx]]
}

function getModeDisplayName(modeKey) {
  return Object.values(MODES).find(mode => mode.key === modeKey)?.name || modeKey
}

function setAccountView({ name, meta, avatarHtml = 'TG', placeholder = true, showLogout = false, loginHtml = '' }) {
  const card = q('account-card')
  const avatar = q('account-avatar')
  const nameEl = q('account-name')
  const metaEl = q('account-meta')
  const loginSlot = q('telegram-login-slot')
  const logoutBtn = q('account-logout-btn')

  card.classList.toggle('logged-in', showLogout)
  avatar.classList.toggle('placeholder', placeholder)
  avatar.innerHTML = avatarHtml
  nameEl.textContent = name
  metaEl.textContent = meta
  loginSlot.innerHTML = loginHtml
  logoutBtn.style.display = showLogout ? 'inline-flex' : 'none'
}

function initialsForUser(user) {
  const base = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  if (!base) return 'TG'
  return base.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

function formatDuration(seconds) {
  if (!seconds) return 'меньше минуты'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (!mins) return `${secs} сек`
  if (!secs) return `${mins} мин`
  return `${mins} мин ${secs} сек`
}

function formatPreciseDuration(seconds) {
  if (seconds === null || seconds === undefined) return '—'
  const safeSeconds = Math.max(0, Number(seconds) || 0)
  if (safeSeconds < 60) return `${safeSeconds.toFixed(1)} сек`

  const mins = Math.floor(safeSeconds / 60)
  const secs = safeSeconds - mins * 60
  return `${mins} мин ${secs.toFixed(1)} сек`
}

function formatGameDate(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function averageOf(values) {
  if (!values.length) return null
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

function playerSortValue(player) {
  return [
    player.stats.pointsEarned,
    player.stats.averageSuccessfulExplanationSeconds ?? Number.POSITIVE_INFINITY,
    player.stats.explanationTimeSeconds,
  ]
}

function comparePlayers(a, b) {
  const [aPoints, aAverageSuccessfulTime, aTime] = playerSortValue(a)
  const [bPoints, bAverageSuccessfulTime, bTime] = playerSortValue(b)
  if (bPoints !== aPoints) return bPoints - aPoints
  if (aAverageSuccessfulTime !== bAverageSuccessfulTime) return aAverageSuccessfulTime - bAverageSuccessfulTime
  if (aTime !== bTime) return aTime - bTime
  return a.name.localeCompare(b.name, 'ru')
}

function buildModeStatsFromTurns(turns, teamName) {
  const teamTurns = turns.filter(turn => turn.explainerTeamName === teamName)

  return ['EXPLAIN', 'ACT', 'DRAW'].map(modeKey => {
    const modeTurns = teamTurns.filter(turn => turn.mode === modeKey)
    const successfulTurns = modeTurns.filter(turn => turn.wasSuccessful)
    const totalTurns = modeTurns.length
    const successfulCount = successfulTurns.length

    return {
      modeKey,
      modeName: getModeDisplayName(modeKey),
      modeIcon: Object.values(MODES).find(mode => mode.key === modeKey)?.icon || '',
      successfulCount,
      totalTurns,
      successRatePercent: totalTurns ? Math.round((successfulCount / totalTurns) * 100) : 0,
    }
  })
}

function buildGameHighlights(teamSummaries, turns) {
  const players = teamSummaries.flatMap(team =>
    team.players.map(player => ({
      teamName: team.name,
      playerName: player.name,
      ...player.stats,
    }))
  )

  const topScorer = [...players].sort((a, b) => b.pointsEarned - a.pointsEarned)[0]
  const mostSuccessfulCards = [...players].sort((a, b) => b.successfulCards - a.successfulCards)[0]
  const mostExplanationTime = [...players].sort((a, b) => b.explanationTimeSeconds - a.explanationTimeSeconds)[0]
  const fastestSuccessfulTurn = [...turns]
    .filter(turn => turn.wasSuccessful && turn.durationSeconds >= 0)
    .sort((a, b) => a.durationSeconds - b.durationSeconds)[0]

  return {
    topScorer: topScorer && topScorer.pointsEarned > 0 ? {
      playerName: topScorer.playerName,
      teamName: topScorer.teamName,
      pointsEarned: topScorer.pointsEarned,
    } : null,
    mostSuccessfulCards: mostSuccessfulCards && mostSuccessfulCards.successfulCards > 0 ? {
      playerName: mostSuccessfulCards.playerName,
      teamName: mostSuccessfulCards.teamName,
      successfulCards: mostSuccessfulCards.successfulCards,
    } : null,
    fastestSuccessfulExplanation: fastestSuccessfulTurn ? {
      playerName: fastestSuccessfulTurn.playerName,
      teamName: fastestSuccessfulTurn.teamName,
      durationSeconds: fastestSuccessfulTurn.durationSeconds,
    } : null,
    mostExplanationTime: mostExplanationTime && mostExplanationTime.explanationTimeSeconds > 0 ? {
      playerName: mostExplanationTime.playerName,
      teamName: mostExplanationTime.teamName,
      durationSeconds: mostExplanationTime.explanationTimeSeconds,
    } : null,
  }
}

function buildGameSummary(winner) {
  const finishedAt = new Date().toISOString()
  const startedAtMs = state.gameStartedAt ? new Date(state.gameStartedAt).getTime() : Date.now()
  const finishedAtMs = new Date(finishedAt).getTime()
  const durationSeconds = Math.max(0, Math.round((finishedAtMs - startedAtMs) / 1000))

  const rankedTeams = [...state.teams]
    .sort((a, b) => b.position - a.position)
    .map((team, index) => ({ team, place: index + 1 }))

  const teamSummaries = rankedTeams.map(({ team, place }) => {
    const teamTurns = state.turnLog.filter(turn => turn.explainerTeamName === team.name)
    const players = team.players.map(playerName => {
      const playerTurns = teamTurns.filter(turn =>
        turn.teamName === team.name && turn.playerName === playerName
      )
      const successfulTurns = playerTurns.filter(turn => turn.wasSuccessful)
      const successfulDurations = successfulTurns.map(turn => turn.durationSeconds)

      return {
        name: playerName,
        stats: {
          pointsEarned: playerTurns.reduce((sum, turn) => sum + turn.playerPointsEarned, 0),
          successfulCards: successfulTurns.length,
          explanationTimeSeconds: playerTurns.reduce((sum, turn) => sum + turn.durationSeconds, 0),
          averageSuccessfulExplanationSeconds: averageOf(successfulDurations),
        },
      }
    }).sort(comparePlayers)

    const totalPointsEarned = state.turnLog.reduce((sum, turn) => {
      if (turn.explainerTeamName === team.name) sum += turn.explainerTeamPointsEarned
      if (turn.winnerTeamName === team.name && turn.winnerTeamName !== turn.explainerTeamName) {
        sum += turn.winnerTeamPointsEarned
      }
      return sum
    }, 0)
    const totalSuccessfulCards = players.reduce((sum, player) => sum + player.stats.successfulCards, 0)
    const modeStats = buildModeStatsFromTurns(state.turnLog, team.name)

    return {
      name: team.name,
      color: team.color,
      place,
      finalPosition: team.position,
      totalPointsEarned,
      totalSuccessfulCards,
      modeStats,
      players,
    }
  })

  return {
    version: 2,
    game: {
      startedAt: state.gameStartedAt,
      finishedAt,
      durationSeconds,
      dictionaryId: state.currentDictionary?.id || null,
      dictionaryName: state.currentDictionary?.name || null,
      turnTime: state.config.turnTime,
      openRoundEnabled: Boolean(state.config.openRoundEnabled),
      teamCount: state.teams.length,
      winnerName: winner.name,
      winnerPosition: winner.position,
      openRoundCount: state.turnLog.filter(turn => turn.wasOpenRound).length,
    },
    teams: teamSummaries,
    highlights: buildGameHighlights(teamSummaries, state.turnLog),
    turns: state.turnLog.map(turn => ({ ...turn })),
  }
}

function recordTurn({
  playerWasSuccessful,
  playerName = null,
  playerIndex = null,
  winnerTeamIndex = null,
  explainerTeamPointsEarned = 0,
  winnerTeamPointsEarned = 0,
  playerPointsEarned = 0,
  explainerPositionBefore,
  explainerPositionAfter,
  winnerPositionBefore = null,
  winnerPositionAfter = null,
}) {
  const explainerTeam = state.teams[state.teamIndex]
  const resolvedPlayerIndex = playerIndex ?? (explainerTeam.explainerIdx % explainerTeam.players.length)
  const resolvedPlayerName = playerName ?? explainerTeam.players[resolvedPlayerIndex]
  const startedAtMs = state.turnStartedAt || Date.now()
  const finishedAtMs = Date.now()
  const winnerTeam = winnerTeamIndex === null ? null : state.teams[winnerTeamIndex]

  state.turnLog.push({
    turnNumber: state.currentTurnNumber,
    teamName: explainerTeam.name,
    explainerTeamName: explainerTeam.name,
    teamIndex: state.teamIndex,
    playerName: resolvedPlayerName,
    playerIndex: resolvedPlayerIndex,
    mode: state.cellMode.key,
    pointsPlanned: state.selectedCard.points,
    playerPointsEarned,
    explainerTeamPointsEarned,
    winnerTeamPointsEarned,
    wasSuccessful: playerWasSuccessful,
    wasOpenRound: Boolean(state.selectedCard?.isOpenRound),
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(finishedAtMs).toISOString(),
    durationSeconds: Math.max(0, Math.round(((finishedAtMs - startedAtMs) / 1000) * 10) / 10),
    explainerPositionBefore,
    explainerPositionAfter,
    winnerTeamName: winnerTeam?.name || null,
    winnerTeamIndex,
    winnerPositionBefore,
    winnerPositionAfter,
  })

  state.turnStartedAt = null
}

function getDictionaryFeedbackEntries() {
  const entries = safeReadLocalStorage(DICTIONARY_FEEDBACK_STORAGE_KEY, [])
  return Array.isArray(entries) ? entries : []
}

function upsertDictionaryFeedback(entry) {
  const entries = getDictionaryFeedbackEntries()
  const nextEntries = entries.filter(item => item.feedbackId !== entry.feedbackId)
  nextEntries.push(entry)
  return safeWriteLocalStorage(DICTIONARY_FEEDBACK_STORAGE_KEY, nextEntries)
}

async function persistDictionaryFeedback(entry) {
  const didSaveLocally = upsertDictionaryFeedback(entry)

  if (!auth.user) {
    return {
      ok: didSaveLocally,
      storage: didSaveLocally ? 'local' : 'failed',
    }
  }

  try {
    const response = await fetch('/api/dictionary-feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(entry),
    })

    if (!response.ok) throw new Error('dictionary feedback failed')

    return {
      ok: true,
      storage: 'server',
    }
  } catch {
    return {
      ok: didSaveLocally,
      storage: didSaveLocally ? 'local' : 'failed',
    }
  }
}

function buildPendingTurnFeedback() {
  const turn = state.turnLog[state.turnLog.length - 1]
  const word = state.selectedCard?.entries?.[state.cellMode?.key]
  if (!turn || !word || !state.currentDictionary || !state.cellMode) return null

  return {
    feedbackId: [
      state.gameStartedAt || 'no-game',
      turn.turnNumber,
      state.currentDictionary.id || 'no-dictionary',
      state.cellMode.key,
      turn.pointsPlanned,
      word,
    ].join('::'),
    turnNumber: turn.turnNumber,
    word,
    mode: state.cellMode.key,
    originalLevel: turn.pointsPlanned,
    wasSuccessful: turn.wasSuccessful,
    wasOpenRound: turn.wasOpenRound,
    durationSeconds: turn.durationSeconds,
    ratedLevel: null,
    saveError: false,
    saveStorage: null,
  }
}

function renderTurnFeedbackPrompt() {
  const section = q('turn-feedback-section')
  const copy = q('turn-feedback-copy')
  const status = q('turn-feedback-status')
  const feedback = state.pendingTurnFeedback

  if (!feedback) {
    section.style.display = 'none'
    copy.textContent = ''
    status.textContent = ''
    return
  }

  section.style.display = 'block'
  copy.textContent = `Насколько слово "${feedback.word}" ощущалось по сложности для режима "${getModeDisplayName(feedback.mode)}"? Сейчас оно лежит в уровне ${feedback.originalLevel}.`
  status.textContent = feedback.saveError
    ? 'Не удалось сохранить оценку на этом устройстве.'
    : feedback.ratedLevel
    ? 'Спасибо за вашу оценку сложности!'
    : ''

  document.querySelectorAll('.feedback-rating-btn').forEach(btn => {
    btn.classList.toggle('is-selected', Number(btn.dataset.ratedLevel) === feedback.ratedLevel)
  })
}

async function saveTurnFeedback(ratedLevel) {
  if (!state.pendingTurnFeedback || !state.currentDictionary) return

  const nextFeedback = {
    ...state.pendingTurnFeedback,
    ratedLevel,
  }

  const payload = {
    feedbackId: nextFeedback.feedbackId,
    dictionaryId: state.currentDictionary.id || null,
    dictionaryName: state.currentDictionary.name || null,
    word: nextFeedback.word,
    mode: nextFeedback.mode,
    originalLevel: nextFeedback.originalLevel,
    ratedLevel: nextFeedback.ratedLevel,
    wasSuccessful: nextFeedback.wasSuccessful,
    wasOpenRound: nextFeedback.wasOpenRound,
    durationSeconds: nextFeedback.durationSeconds,
    turnNumber: nextFeedback.turnNumber,
    gameStartedAt: state.gameStartedAt,
    createdAt: new Date().toISOString(),
  }
  const result = await persistDictionaryFeedback(payload)

  state.pendingTurnFeedback = {
    ...nextFeedback,
    ratedLevel: result.ok ? ratedLevel : null,
    saveError: !result.ok,
    saveStorage: result.ok ? result.storage : null,
  }
  renderTurnFeedbackPrompt()
  persistActiveGameSnapshot()
}

function renderProfileStatsLocked() {
  q('profile-stats-content').innerHTML = `
    <p class="stats-empty">Войди через Telegram, чтобы сохранять завершённые партии и смотреть личную статистику.</p>
  `
}

function renderProfileStatsLoading() {
  q('profile-stats-content').innerHTML = `
    <p class="stats-empty">Собираем статистику…</p>
  `
}

function renderProfileStats(data) {
  const totalGames = data.stats.totalGames || 0
  const totalDurationSeconds = data.stats.totalDurationSeconds || 0
  const averageTeamCount = data.stats.averageTeamCount
    ? Number(data.stats.averageTeamCount).toFixed(1).replace('.0', '')
    : '—'
  const favoriteDictionary = data.stats.favoriteDictionary || 'Пока нет'
  auth.recentGamesMap = Object.fromEntries((data.recentGames || []).map(game => [game.id, game]))

  const recentGames = data.recentGames.length
    ? `<div class="games-list">
        ${data.recentGames.map(game => `
          <div class="game-item clickable" onclick="openGameDetails(${game.id})">
            <div class="game-item-head">
              <div class="game-winner">${escapeHtml(game.winnerName)} победили</div>
              <div class="game-date">${escapeHtml(formatGameDate(game.finishedAt))}</div>
            </div>
            <div class="game-meta">
              <span class="game-tag">${escapeHtml(game.dictionaryName || 'Без словаря')}</span>
              <span class="game-tag">${game.teamCount} команд(ы)</span>
              <span class="game-tag">Финиш: ${game.winnerPosition}</span>
              <span class="game-tag">${escapeHtml(formatDuration(game.durationSeconds))}</span>
            </div>
            <div class="game-open">Открыть статистику</div>
          </div>
        `).join('')}
      </div>`
    : '<p class="stats-empty">Сыграй первую партию, чтобы здесь появилась история.</p>'

  q('profile-stats-content').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Всего игр</div>
        <div class="stat-value">${totalGames}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Общее время в играх</div>
        <div class="stat-value">${escapeHtml(formatDuration(totalDurationSeconds))}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Средняя партия</div>
        <div class="stat-value">${escapeHtml(formatDuration(data.stats.averageDurationSeconds))}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Среднее число команд</div>
        <div class="stat-value">${escapeHtml(String(averageTeamCount))}</div>
      </div>
    </div>
    <div class="stats-subtitle">Любимый словарь: ${escapeHtml(favoriteDictionary)}</div>
    <div class="stats-subtitle">Последние игры</div>
    ${recentGames}
  `
}

function renderTooltipLabel(label, tooltip) {
  return `
    <span class="metric-label-with-tooltip">
      <span>${escapeHtml(label)}</span>
      <span class="tooltip-trigger metric-tooltip-trigger" tabindex="0" aria-label="${escapeHtml(tooltip)}">?
        <span class="tooltip-text metric-tooltip-text">${escapeHtml(tooltip)}</span>
      </span>
    </span>
  `
}

function renderModeStats(team, turns = []) {
  const modeStats = Array.isArray(team.modeStats) ? team.modeStats : buildModeStatsFromTurns(turns, team.name)

  return `
    <div class="team-mode-stats">
      ${modeStats.map(modeStat => `
        <div class="mode-stat-card">
          <div class="mode-progress" style="--progress:${modeStat.successRatePercent}%;--accent:${escapeHtml(team.color)}">
            <span class="mode-progress-value">${modeStat.successRatePercent}%</span>
          </div>
          <div class="mode-stat-copy">
            <div class="mode-stat-name">${renderTooltipLabel(
              `${modeStat.modeIcon} ${modeStat.modeName}`,
              `Успешные ходы команды в режиме «${modeStat.modeName}» относительно всех её ходов в этом режиме.`
            )}</div>
            <div class="mode-stat-value">${modeStat.successfulCount}/${modeStat.totalTurns || 0}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `
}

function renderSummaryMeta(summary) {
  const metrics = [{ label: 'Длительность партии', value: formatDuration(summary.game.durationSeconds) }]
  const highlightEntries = [
    summary.highlights.topScorer
      ? { label: 'Самый результативный объясняющий', value: `${summary.highlights.topScorer.playerName} · ${summary.highlights.topScorer.teamName} · ${summary.highlights.topScorer.pointsEarned} очков` }
      : null,
    summary.highlights.mostSuccessfulCards
      ? { label: 'Больше всего успешных карточек', value: `${summary.highlights.mostSuccessfulCards.playerName} · ${summary.highlights.mostSuccessfulCards.teamName} · ${summary.highlights.mostSuccessfulCards.successfulCards}` }
      : null,
    summary.highlights.fastestSuccessfulExplanation
      ? { label: 'Самое быстрое успешное объяснение', value: `${summary.highlights.fastestSuccessfulExplanation.playerName} · ${summary.highlights.fastestSuccessfulExplanation.teamName} · ${formatPreciseDuration(summary.highlights.fastestSuccessfulExplanation.durationSeconds)}` }
      : null,
    summary.highlights.mostExplanationTime
      ? { label: 'Больше всего времени на объяснения', value: `${summary.highlights.mostExplanationTime.playerName} · ${summary.highlights.mostExplanationTime.teamName} · ${formatPreciseDuration(summary.highlights.mostExplanationTime.durationSeconds)}` }
      : null,
  ].filter(Boolean)

  return `
    <div class="summary-card">
      <div class="section-title">Общее по партии</div>
      <div class="summary-grid">
        ${metrics.map(metric => `
        <div class="summary-metric">
            <div class="summary-metric-label">${renderTooltipLabel(metric.label, 'Ключевая метрика по всей завершённой партии.')}</div>
            <div class="summary-metric-value">${escapeHtml(metric.value)}</div>
          </div>
        `).join('')}
      </div>
      ${highlightEntries.length ? `
        <div class="highlights-list inline-highlights">
          ${highlightEntries.map(item => `
            <div class="highlight-card">
              <div class="highlight-label">${escapeHtml(item.label)}</div>
              <div class="highlight-value">${escapeHtml(item.value)}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `
}

function renderTeamStats(summary) {
  return `
    <div class="team-stats-grid">
      ${summary.teams.map(team => `
        <div class="team-summary-card" style="border-left:4px solid ${escapeHtml(team.color)}">
          <div class="team-summary-head">
            <div>
              <div class="team-summary-name">${escapeHtml(team.name)}</div>
              <div class="team-summary-meta">${team.place === 1
                ? 'Победители'
                : `Набрано очков: ${Math.min(team.finalPosition, FINISH)}. Повезет в следующий раз!`}</div>
            </div>
            <div class="team-place-badge">${team.place} место</div>
          </div>
          ${renderModeStats(team, summary.turns || [])}
          <table class="player-stats-table">
            <thead>
              <tr>
                <th>Игрок</th>
                <th>${renderTooltipLabel('Время', 'Общее время, которое игрок потратил на все свои ходы с объяснениями.')}</th>
                <th>${renderTooltipLabel('Среднее', 'Среднее время только по успешным объяснениям. При равенстве очков именно этот показатель определяет MVP команды.')}</th>
                <th>${renderTooltipLabel('Карточек', 'Успешные карточки игрока / все успешные карточки команды.')}</th>
                <th class="points-col">${renderTooltipLabel('Очков', 'Очки игрока / все очки команды за партию.')}</th>
              </tr>
            </thead>
            <tbody>
              ${team.players.map((player, index) => `
                <tr>
                  <td>
                    <div class="player-name">${escapeHtml(player.name)}</div>
                    ${index === 0 && team.players.length > 1 ? '<span class="player-leader">MVP команды</span>' : ''}
                  </td>
                  <td>${escapeHtml(formatPreciseDuration(player.stats.explanationTimeSeconds))}</td>
                  <td>${player.stats.averageSuccessfulExplanationSeconds === null ? '—' : escapeHtml(formatPreciseDuration(player.stats.averageSuccessfulExplanationSeconds))}</td>
                  <td>${player.stats.successfulCards}/${team.totalSuccessfulCards}</td>
                  <td class="player-points">${player.stats.pointsEarned}/${team.totalPointsEarned}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `).join('')}
    </div>
  `
}

function renderHighlights(summary) {
  return ''
}

function renderSummaryInto(summary, ids) {
  q(ids.meta).innerHTML = renderSummaryMeta(summary)
  q(ids.teams).innerHTML = `
    <div class="summary-card">
      <div class="section-title">Игроки по командам</div>
      ${renderTeamStats(summary)}
    </div>
  `
  q(ids.highlights).innerHTML = renderHighlights(summary)
}

function renderGameDetails(summary) {
  q('gd-winner').textContent = `${summary.game.winnerName} побеждают`
  q('gd-badge').textContent = summary.game.dictionaryName || 'История'
  renderSummaryInto(summary, {
    meta: 'gd-summary-meta',
    teams: 'gd-team-stats',
    highlights: 'gd-highlights',
  })
}

window.openGameDetails = function(id) {
  const game = auth.recentGamesMap[id]
  if (!game?.summary) return
  renderGameDetails(game.summary)
  showScreen('game-details')
}

async function loadProfileStats() {
  if (!auth.user) {
    auth.statsLoaded = false
    renderProfileStatsLocked()
    return
  }

  renderProfileStatsLoading()

  try {
    const response = await fetch('/api/profile/summary', { credentials: 'same-origin' })
    if (!response.ok) throw new Error('profile summary failed')
    const payload = await response.json()
    auth.statsLoaded = true
    renderProfileStats(payload)
  } catch {
    auth.statsLoaded = false
    q('profile-stats-content').innerHTML = `
      <p class="stats-empty">Не удалось загрузить историю игр. Попробуй ещё раз чуть позже.</p>
    `
  }
}

async function saveFinishedGame(winner, summary = state.lastGameSummary) {
  if (!state.gameStartedAt || !summary) return

  const payload = {
    sessionId: [state.gameStartedAt, winner.name, summary.game.finishedAt].join('::'),
    startedAt: state.gameStartedAt,
    finishedAt: summary.game.finishedAt,
    dictionaryId: state.currentDictionary?.id || null,
    dictionaryName: state.currentDictionary?.name || null,
    turnTime: state.config.turnTime,
    openRoundEnabled: state.config.openRoundEnabled,
    teamCount: state.teams.length,
    winnerName: winner.name,
    winnerPosition: winner.position,
    summary,
  }

  upsertPendingGameSession(payload)
  if (!auth.user) return

  try {
    const response = await fetch('/api/game-sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      keepalive: true,
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error('game session save failed')
    removePendingGameSession(payload.sessionId)
    await loadProfileStats()
  } catch {
    // History should not interrupt the game flow.
  }
}

async function flushPendingGameSessions() {
  if (!auth.user) return

  const queue = getPendingGameSessions()
  if (!queue.length) return

  let didFlushAny = false
  for (const entry of queue) {
    try {
      const response = await fetch('/api/game-sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        keepalive: true,
        body: JSON.stringify(entry),
      })
      if (!response.ok) continue
      removePendingGameSession(entry.sessionId)
      didFlushAny = true
    } catch {
      // Keep the entry for the next retry.
    }
  }

  if (didFlushAny) {
    await loadProfileStats()
  }
}

async function loadAuthConfig() {
  try {
    const response = await fetch('/api/config')
    if (!response.ok) throw new Error('config request failed')
    auth.config = await response.json()
  } catch {
    auth.config = { ok: false, telegramBotUsername: null }
  }
}

async function refreshCurrentUser() {
  try {
    const response = await fetch('/api/me', { credentials: 'same-origin' })
    if (!response.ok) throw new Error('me request failed')
    const payload = await response.json()
    auth.user = payload.user || null
  } catch {
    auth.user = null
  }
}

async function syncPendingDictionaryPurchases(dictionaryId = null) {
  if (!auth.user) return false

  try {
    const response = await fetch('/api/purchase/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(dictionaryId ? { dictionaryId } : {}),
    })
    if (!response.ok) return false
    const payload = await response.json().catch(() => null)
    return Boolean(payload?.updatedCount)
  } catch {
    return false
  }
}

function renderTelegramLoginWidget() {
  if (!auth.config?.telegramBotUsername || auth.user || auth.widgetLoaded) return

  const slot = q('telegram-login-slot')
  slot.innerHTML = ''

  const stack = document.createElement('div')
  stack.className = 'telegram-login-stack'

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://telegram.org/js/telegram-widget.js?22'
  script.setAttribute('data-telegram-login', auth.config.telegramBotUsername)
  script.setAttribute('data-size', 'large')
  script.setAttribute('data-userpic', 'false')
  script.setAttribute('data-radius', '10')
  script.setAttribute('data-request-access', 'write')
  script.setAttribute('data-onauth', 'handleTelegramAuth(user)')
  stack.appendChild(script)

  const helperButton = document.createElement('button')
  helperButton.type = 'button'
  helperButton.className = 'btn btn-sm btn-secondary telegram-switch-btn'
  helperButton.textContent = 'Войти другим аккаунтом'
  helperButton.addEventListener('click', () => {
    helperNote.hidden = !helperNote.hidden
  })
  stack.appendChild(helperButton)

  const helperNote = document.createElement('div')
  helperNote.className = 'account-note telegram-switch-note'
  helperNote.hidden = true
  helperNote.innerHTML = [
    'Telegram сам подставляет последний аккаунт из своей сессии.',
    'Чтобы войти другим аккаунтом, открой сайт в режиме инкогнито или в другом браузере, либо сначала переключи аккаунт в Telegram и вернись сюда.',
  ].join(' ')
  stack.appendChild(helperNote)

  slot.appendChild(stack)

  auth.widgetLoaded = true
}

function renderAuthCard() {
  if (auth.user) {
    const avatarHtml = auth.user.photoUrl
      ? `<img src="${escapeHtml(auth.user.photoUrl)}" alt="${escapeHtml(auth.user.firstName || 'Telegram user')}">`
      : escapeHtml(initialsForUser(auth.user))
    const handle = auth.user.username
      ? `@${auth.user.username}`
      : 'Telegram-аккаунт подключён'

    setAccountView({
      name: auth.user.firstName || 'Аккаунт подключён',
      meta: handle,
      avatarHtml,
      placeholder: !auth.user.photoUrl,
      showLogout: true,
      loginHtml: '',
    })
    loadProfileStats()
    flushPendingGameSessions()
    syncPendingDictionaryPurchases().then((didSync) => {
      if (didSync) loadDictionaries()
    })
    return
  }

  if (!auth.config?.telegramBotUsername) {
    setAccountView({
      name: 'Вход скоро появится',
      meta: 'Нужно добавить username Telegram-бота в конфигурацию Cloudflare',
      loginHtml: '<div class="account-note">После этого на этом месте появится кнопка входа через Telegram.</div>',
    })
    renderProfileStatsLocked()
    return
  }

  setAccountView({
    name: 'Войти через Telegram',
    meta: 'Подключи аккаунт, чтобы позже сохранить покупки и доступ к платным пакетам.',
    loginHtml: '<div class="account-note">Загружаем кнопку входа…</div>',
  })
  renderProfileStatsLocked()

  renderTelegramLoginWidget()
}

window.handleTelegramAuth = async function(user) {
  q('telegram-login-slot').innerHTML = '<div class="account-note">Подтверждаем вход…</div>'

  try {
    const response = await fetch('/api/auth/telegram', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(user),
    })
    const payload = await response.json()

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || 'auth failed')
    }

    auth.user = payload.user
    auth.widgetLoaded = false
    await loadDictionaries()
    renderAuthCard()
  } catch (err) {
    auth.user = null
    auth.widgetLoaded = false
    setAccountView({
      name: 'Вход не удался',
      meta: 'Попробуй ещё раз через несколько секунд',
      loginHtml: `<div class="account-note">${escapeHtml(err.message || 'Не удалось выполнить вход')}</div>`,
    })
  }
}

async function logoutTelegramUser() {
  try {
    await fetch('/api/logout', {
      method: 'POST',
      credentials: 'same-origin',
    })
  } finally {
    auth.user = null
    auth.widgetLoaded = false
    await loadDictionaries()
    renderAuthCard()
  }
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
  const previousSelectedId = selectedDictId

  try {
    const response = await fetch('/api/dictionaries', { credentials: 'same-origin' })
    if (!response.ok) throw new Error('dictionaries request failed')
    const payload = await response.json()
    dictionaries = Array.isArray(payload.dictionaries) ? payload.dictionaries : []
  } catch {
    const staticCatalog = await fetch('dictionaries.json').then(r => r.json()).catch(() => [])
    dictionaries = Array.isArray(staticCatalog) ? staticCatalog.map(dict => ({
      ...dict,
      access: dict.access === 'premium' ? 'premium' : 'free',
      canPlay: dict.available !== false && dict.access !== 'premium',
      requiresPurchase: dict.access === 'premium',
      lockedReason: dict.available === false ? 'coming_soon' : dict.access === 'premium' ? 'login_required' : null,
      priceLabel: dict.priceLabel || null,
    })) : [{
      id: 'classic',
      name: 'Классический',
      subtitle: 'Всё обо всём',
      icon: '🎭',
      file: 'words.json',
      wordCount: 922,
      available: true,
      access: 'free',
      canPlay: true,
      requiresPurchase: false,
      lockedReason: null,
      priceLabel: null,
    }]
  }

  const preserved = dictionaries.find(dict => dict.id === previousSelectedId && dict.canPlay)
  const firstPlayable = dictionaries.find(dict => dict.canPlay)
  selectedDictId = preserved?.id || firstPlayable?.id || null
  renderDictGrid()
}

function renderDictGrid() {
  const grid = q('dict-grid')
  grid.innerHTML = dictionaries.map(d => {
    const isSel = d.id === selectedDictId
    const locked = !d.canPlay
    const badge = !d.available
      ? (d.badge || 'Скоро')
      : locked && d.access === 'premium'
        ? (d.priceLabel || 'Премиум')
        : d.badge
    const footerText = !d.available
      ? 'Словарь ещё не открыт'
      : locked
        ? d.lockedReason === 'login_required'
          ? 'Войди, чтобы увидеть доступ'
          : 'Нужна покупка словаря'
        : 'Количество слов: ' + d.wordCount
    const actionHtml = !d.available
      ? ''
      : locked && d.access === 'premium'
        ? `<button class="dict-buy-btn" onclick="event.stopPropagation(); buyDictionaryAccess('${d.id}')">Купить за 149 ₽</button>`
        : ''

    return `<div class="dict-card${isSel ? ' selected' : ''}${locked ? ' locked' : ''}"
                 onclick="${locked ? `selectLockedDict('${d.id}')` : `selectDict('${d.id}')`}">
      ${isSel ? '<div class="dict-check">✓</div>' : ''}
      ${!isSel && badge ? `<div class="dict-badge">${badge}</div>` : ''}
      <div class="dict-icon">${d.icon}</div>
      <div class="dict-name">${d.name}</div>
      <div class="dict-sub">${d.subtitle}</div>
      <div class="dict-desc">${d.description || ''}</div>
      <div class="dict-words">${footerText}</div>
      ${actionHtml}
    </div>`
  }).join('')
}

async function loadDictionaryEntries(dict) {
  const response = await fetch(dict.file, { credentials: 'same-origin' })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const errorCode = payload?.error || ''

    if (response.status === 401) {
      throw new Error('Войди через Telegram, чтобы открыть этот словарь.')
    }
    if (response.status === 403 && errorCode === 'Dictionary access required') {
      await syncPendingDictionaryPurchases(dict.id)
      await loadDictionaries()
      const refreshedDict = dictionaries.find(item => item.id === dict.id)
      if (refreshedDict?.canPlay) {
        return loadDictionaryEntries(refreshedDict)
      }
      throw new Error(`Оплата словаря "${dict.name}" ещё не подтверждена. Если вы уже оплатили, обновите страницу через несколько секунд.`)
    }
    if (response.status === 404) {
      throw new Error('Этот словарь пока недоступен.')
    }

    throw new Error('Не удалось загрузить словарь.')
  }

  return response.json()
}

window.selectDict = function(id) {
  const dict = dictionaries.find(d => d.id === id)
  if (!dict || !dict.canPlay) return
  selectedDictId = id
  renderDictGrid()
}

window.selectLockedDict = function(id) {
  const dict = dictionaries.find(d => d.id === id)
  if (!dict) return
  if (dict.lockedReason === 'coming_soon') {
    alert('Этот словарь ещё не открыт.')
    return
  }
  if (dict.lockedReason === 'login_required') {
    alert('Войди через Telegram, чтобы сохранить покупки и получить доступ к платным словарям.')
    return
  }
  alert(`Словарь "${dict.name}" можно купить отдельно за 149 ₽.`)
}

window.buyDictionaryAccess = async function(id) {
  const dict = dictionaries.find(d => d.id === id)
  if (!dict) return

  if (!auth.user) {
    alert('Войди через Telegram, чтобы купить этот словарь.')
    return
  }

  try {
    const response = await fetch('/api/purchase/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ dictionaryId: id }),
    })
    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || 'Не удалось создать платёж.')
    }

    if (payload.alreadyOwned) {
      await loadDictionaries()
      alert(`Словарь "${dict.name}" уже доступен на этом аккаунте.`)
      return
    }

    if (!payload.confirmationUrl) {
      throw new Error('Не удалось получить ссылку на оплату.')
    }

    window.location.href = payload.confirmationUrl
  } catch (err) {
    alert(err.message || 'Не удалось начать оплату.')
  }
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

q('account-logout-btn').addEventListener('click', logoutTelegramUser)

q('start-btn').addEventListener('click', async () => {
  await primeAudioContext()
  sfxStartGame();
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
  if (!dict.canPlay) {
    selectLockedDict(dict.id)
    return
  }
  let data
  try {
    data = await loadDictionaryEntries(dict)
  } catch (err) {
    await loadDictionaries()
    alert(err.message || 'Не удалось загрузить словарь.')
    return
  }

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
  state.currentDictionary = dict
  state.gameStartedAt = new Date().toISOString()
  state.turnLog = []
  state.turnStartedAt = null
  state.currentTurnNumber = 0
  state.lastGameSummary = null
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
  state.timeLeft = sec
  const cd = q('pv-countdown')
  cd.textContent = sec + 'с'
  cd.className = 'countdown-ring'
  showScreen('preview')

  clearInterval(state.timer)
  state.timer = setInterval(() => {
    sec--
    state.timeLeft = sec
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
  state.currentTurnNumber += 1
  state.turnStartedAt = Date.now()
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
  const explainerPrev = team.position
  const explainerPlayerIndex = team.explainerIdx % team.players.length
  const explainerPlayerName = team.players[explainerPlayerIndex]

  // Open rounds should also advance the explainer queue for the active team.
  team.explainerIdx = (team.explainerIdx + 1) % team.players.length

  // Новые правила: угадавший получает столько сколько на карточке, проигравший исполнитель получает +2
  const earnedPts = pts;
  const prev = winnerTeam.position;

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

  recordTurn({
    playerWasSuccessful: isExplainer,
    playerName: explainerPlayerName,
    playerIndex: explainerPlayerIndex,
    winnerTeamIndex: winnerIdx,
    explainerTeamPointsEarned: isExplainer ? pts : 2,
    winnerTeamPointsEarned: pts,
    playerPointsEarned: isExplainer ? pts : 2,
    explainerPositionBefore: explainerPrev,
    explainerPositionAfter: team.position,
    winnerPositionBefore: prev,
    winnerPositionAfter: winnerTeam.position,
  })

  const winner = state.teams.find(t => t.position >= FINISH);
  if (winner) { showGameOver(winner); return; }

  q('tr-icon').textContent = '🎉';
  if (isExplainer) {
    q('tr-text').textContent = `${winnerTeam.name} угадали! +${earnedPts} очков`;
  } else {
    q('tr-text').textContent = `${winnerTeam.name} угадали! +${earnedPts} очков, ${team.name} получили +2 утешения`;
  }
  q('tr-sub').innerHTML = `${winnerTeam.name}: клетка ${prev} → ${Math.min(newPos, 40)}${collisionNote}${!isExplainer ? `<br>${team.name}: клетка ${explainerPrev} → ${Math.min(team.position, 40)}` : ''}`;

  state.pendingTurnFeedback = buildPendingTurnFeedback()
  renderTurnFeedbackPrompt()
  renderBoard('tr-board');
  showScreen('turn-result');
}

q('open-fail-btn').addEventListener('click', () => { clearInterval(state.timer); endTurn(false); })
document.querySelectorAll('.feedback-rating-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    saveTurnFeedback(Number(btn.dataset.ratedLevel))
  })
})

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
  const explainerPlayerIndex = team.explainerIdx % team.players.length
  const explainerPlayerName = team.players[explainerPlayerIndex]

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

  recordTurn({
    playerWasSuccessful: guessed,
    playerName: explainerPlayerName,
    playerIndex: explainerPlayerIndex,
    winnerTeamIndex: guessed ? state.teamIndex : null,
    explainerTeamPointsEarned: guessed ? pts : 0,
    winnerTeamPointsEarned: guessed ? pts : 0,
    playerPointsEarned: guessed ? pts : 0,
    explainerPositionBefore: prev,
    explainerPositionAfter: team.position,
    winnerPositionBefore: guessed ? prev : null,
    winnerPositionAfter: guessed ? team.position : null,
  })

  const newPos = team.position
  const winner = state.teams.find(t => t.position >= FINISH)
  if (winner) { showGameOver(winner); return }

  q('tr-icon').textContent = guessed ? '🎉' : '😬'
  q('tr-text').textContent = guessed ? `Угадали! +${pts} очков` : 'Не угадали — очков нет'
  q('tr-sub').innerHTML = guessed
    ? `Фишка: клетка ${prev} → клетка ${Math.min(newPos, 40)}${collisionNote ? '<br><span style="color:#f59e0b;font-size:.85rem">'+collisionNote.trim()+'</span>' : ''}`
    : `Фишка остаётся на клетке ${prev}`

  state.pendingTurnFeedback = buildPendingTurnFeedback()
  renderTurnFeedbackPrompt()
  renderBoard('tr-board')
  showScreen('turn-result')
}

q('next-turn-btn').addEventListener('click', () => { sfxNavForward(); state.teamIndex = (state.teamIndex + 1) % state.teams.length; goTurnStart() })

// ─── Game over ──────────────────────────────────────────────────────────────────
function showGameOver(winner) {
  state.pendingTurnFeedback = null
  state.lastGameSummary = buildGameSummary(winner)
  q('go-winner').textContent = winner.name
  const sorted = [...state.teams].sort((a, b) => b.position - a.position)
  q('go-scores').innerHTML = sorted.map(t =>
    `<div class="final-row${t.name===winner.name?' winner-row':''}">
      <span>${t.name===winner.name?'🥇 ':''}${t.name}</span>
      <strong>${t.position >= FINISH ? 'финиш 🏁' : `очки ${Math.min(t.position, FINISH)}/${FINISH}`}</strong>
    </div>`
  ).join('')
  renderSummaryInto(state.lastGameSummary, {
    meta: 'go-summary-meta',
    teams: 'go-team-stats',
    highlights: 'go-highlights',
  })
  showScreen('game-over')
  saveFinishedGame(winner, state.lastGameSummary)
  state.gameInProgress = false; // Game over, reset flag
  updateSetupMenuButtons()
  clearActiveGameSnapshot()
}

q('restart-btn').addEventListener('click', () => {
  sfxNavForward();
  teamCount = 2
  defaultNames.length = 0
  defaultNames.push('Команда 1','Команда 2','Команда 3','Команда 4','Команда 5','Команда 6')
  teamPlayers = [[''], ['']]
  renderTeams()
  state.currentDictionary = null
  state.gameStartedAt = null
  state.turnLog = []
  state.turnStartedAt = null
  state.currentTurnNumber = 0
  state.lastGameSummary = null
  state.pendingTurnFeedback = null
  state.gameInProgress = false; // Restart game, reset flag
  updateSetupMenuButtons()
  clearActiveGameSnapshot()
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
loadDictionaries().then(() => {
  restoreActiveGameFromSnapshot()
  updateSetupMenuButtons()
})
loadAuthConfig().then(refreshCurrentUser).then(renderAuthCard)
renderProfileStatsLocked()

q('ts-back-to-menu-btn').addEventListener('click', goSetupMenu); // <-- New event listener
q('gd-back-btn').addEventListener('click', () => {
  sfxNavBack()
  showScreen('profile')
})

// Handle Continue Game button click
q('continue-game-btn').addEventListener('click', () => {
  sfxNavForward()
  goTurnStart(); // Resume the game
});

window.addEventListener('pagehide', persistActiveGameSnapshot)
window.addEventListener('online', flushPendingGameSessions)

window.changeTime = function(delta) {
  const el = q('turn-time');
  let val = parseInt(el.value) + delta;
  if (val < 30) val = 30;
  if (val > 180) val = 180;
  el.value = val;
};

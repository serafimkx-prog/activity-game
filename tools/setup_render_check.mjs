import { writeFile } from 'node:fs/promises'

const [baseUrl = 'http://127.0.0.1:8765/', outputPath = 'setup-render.png', widthArg = '390', heightArg = '844', portArg = '9333', behaviorArg = 'no'] = process.argv.slice(2)
const width = Number(widthArg)
const height = Number(heightArg)
const port = Number(portArg)

async function getJson(path) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`)
  if (!response.ok) throw new Error(`DevTools ${path}: ${response.status}`)
  return response.json()
}

const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' }).then(response => response.json())
const socket = new WebSocket(target.webSocketDebuggerUrl)
let nextId = 0
const pending = new Map()
const runtimeIssues = []

socket.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (message.method === 'Runtime.exceptionThrown') {
    runtimeIssues.push({ type: 'exception', text: message.params?.exceptionDetails?.text || 'Unknown exception' })
  }
  if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params?.type)) {
    runtimeIssues.push({
      type: message.params.type,
      text: (message.params.args || []).map(arg => arg.value || arg.description || '').join(' '),
    })
  }
  if (!message.id || !pending.has(message.id)) return
  const { resolve, reject } = pending.get(message.id)
  pending.delete(message.id)
  if (message.error) reject(new Error(message.error.message))
  else resolve(message.result)
})

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

function command(method, params = {}) {
  const id = ++nextId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}

await command('Page.enable')
await command('Runtime.enable')
await command('Emulation.setDeviceMetricsOverride', {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: false,
  screenWidth: width,
  screenHeight: height,
})
await command('Emulation.setTouchEmulationEnabled', { enabled: width <= 500, maxTouchPoints: width <= 500 ? 5 : 1 })
await command('Page.navigate', { url: baseUrl })
await new Promise(resolve => setTimeout(resolve, 1200))
await command('Runtime.evaluate', { expression: `if (typeof state !== 'undefined') state.gameInProgress = false; localStorage.clear()` })
await command('Page.navigate', { url: baseUrl })
await new Promise(resolve => setTimeout(resolve, 800))
await command('Emulation.setPageScaleFactor', { pageScaleFactor: 1 })

const evaluation = await command('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const visible = element => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
    }
    const active = document.querySelector('#screen-setup.active')
    const interactiveElements = [...active.querySelectorAll('button, input, a[href]')].filter(visible)
    const controls = interactiveElements.map(element => {
        const rect = element.getBoundingClientRect()
        return {
          label: element.getAttribute('aria-label') || element.textContent.trim().replace(/\\s+/g, ' ').slice(0, 60) || element.id,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        }
      })
    const dictionaryImages = [...document.querySelectorAll('.dict-icon img')].map(image => ({
      src: image.getAttribute('src'),
      loaded: image.complete && image.naturalWidth > 0,
    }))
    return {
      title: document.querySelector('#screen-setup h1')?.textContent.trim(),
      viewport: { width: innerWidth, height: innerHeight },
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      overflowX: document.documentElement.scrollWidth > innerWidth,
      overflowElements: [...document.querySelectorAll('body *')].map(element => {
        const rect = element.getBoundingClientRect()
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id,
          className: typeof element.className === 'string' ? element.className : '',
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        }
      }).filter(item => item.left < -1 || item.right > innerWidth + 1).slice(0, 20),
      dictionaryColumns: getComputedStyle(document.querySelector('.dict-grid')).gridTemplateColumns.split(' ').length,
      teamColumns: getComputedStyle(document.querySelector('.teams-grid')).gridTemplateColumns.split(' ').length,
      dictionaryImages,
      runtimeIssues: ${JSON.stringify(runtimeIssues)},
      undersizedControls: controls.filter(control => control.width < 44 || control.height < 44),
      controls,
    }
  })()`,
})

await command('Runtime.evaluate', { expression: 'scrollTo(0, 0)' })
await new Promise(resolve => setTimeout(resolve, 150))
const screenshot = await command('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: false,
})
await writeFile(outputPath, Buffer.from(screenshot.data, 'base64'))

const layoutMetrics = await command('Page.getLayoutMetrics')
const contentSize = layoutMetrics.cssContentSize || layoutMetrics.contentSize
const fullScreenshot = await command('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: true,
  clip: {
    x: 0,
    y: 0,
    width: Math.ceil(contentSize.width),
    height: Math.ceil(contentSize.height),
    scale: 1,
  },
})
const fullOutputPath = outputPath.replace(/\.png$/i, '-full.png')
await writeFile(fullOutputPath, Buffer.from(fullScreenshot.data, 'base64'))

const focusEvaluation = await command('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const visible = element => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
    }
    const active = document.querySelector('#screen-setup.active')
    const controls = [...active.querySelectorAll('button, input, a[href]')]
      .filter(control => visible(control) && !control.disabled && control.type !== 'hidden')
    return controls.every(control => {
      control.focus({ preventScroll: true })
      return document.activeElement === control
    })
  })()`,
})

let behavior = null
if (behaviorArg === 'behavior') {
  const behaviorEvaluation = await command('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const identity = index => ({
        name: document.querySelector('#ti' + index)?.value,
        color: getComputedStyle(document.querySelectorAll('.team-identity .team-marker')[index]).backgroundColor,
      })
      const minimumTeamCount = document.querySelectorAll('.team-block').length
      const minimumRemoveButtonCount = document.querySelectorAll('.remove-team-btn').length
      const before = identity(0)
      randomizeTeamPreset(0)
      const after = identity(0)
      const restoredLegacyTeam = getRestoredTeamIdentity({
        name: 'Зелёные слоники',
        color: '#22c55e',
        iconId: 'elephant',
        players: ['Игрок'],
      }, 0)
      const restoredFallbackTeam = getRestoredTeamIdentity({ identitySlot: 1 }, 1)
      for (let index = 2; index < 6; index += 1) document.querySelector('#add-team-btn').click()
      const sixTeams = [...document.querySelectorAll('.team-block')].map((_, index) => identity(index))
      removeTeam(5)
      const countAfterRemove = document.querySelectorAll('.team-block').length
      document.querySelector('#add-team-btn').click()
      const teams = [...document.querySelectorAll('.team-block')].map((_, index) => identity(index))
      openDictionaryLogin('around_us')
      const guestPaidDestination = document.querySelector('.screen.active')?.id
      showScreen('setup')
      return {
        diceChangedName: before.name !== after.name,
        diceKeptColor: before.color === after.color,
        minimumTeamCount,
        minimumRemoveButtonCount,
        countAfterRemove,
        teamCount: teams.length,
        uniqueNames: new Set(teams.map(team => team.name)).size,
        uniqueColors: new Set(teams.map(team => team.color)).size,
        completeTeamIdentities: teams.every(team => team.name && team.color),
        addRemovePreservedUniqueNames: new Set(sixTeams.map(team => team.name)).size === 6
          && new Set(teams.map(team => team.name)).size === 6,
        teamEmojiImageCount: document.querySelectorAll('.team-identity img').length,
        setupUsesTeamColorStyle: [...document.querySelectorAll('.team-block')]
          .some(block => block.getAttribute('style')?.includes('--team-color')),
        legacySnapshotMigrated: restoredLegacyTeam.name === 'Слоники'
          && restoredLegacyTeam.color === '#22c55e'
          && restoredLegacyTeam.iconId === 'elephant'
          && restoredLegacyTeam.players[0] === 'Игрок',
        missingSnapshotIdentityFallback: restoredFallbackTeam.name === 'Коты'
          && restoredFallbackTeam.color === '#3b82f6'
          && restoredFallbackTeam.players[0] === 'Коты',
        guestPaidDestination,
        teams,
      }
    })()`,
  })
  behavior = behaviorEvaluation.result.value

  const teamSectionRect = await command('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const section = document.querySelector('#teams-container')?.closest('.section')
      const rect = section.getBoundingClientRect()
      return {
        x: Math.max(0, rect.left + scrollX),
        y: Math.max(0, rect.top + scrollY),
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height),
      }
    })()`,
  })
  const teamsOutputPath = outputPath.replace(/\.png$/i, '-teams.png')
  const teamsScreenshot = await command('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { ...teamSectionRect.result.value, scale: 1 },
  })
  await writeFile(teamsOutputPath, Buffer.from(teamsScreenshot.data, 'base64'))
  behavior.teamsScreenshotPath = teamsOutputPath

  const startButtonRect = await command('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const button = document.querySelector('#start-btn')
      button.scrollIntoView({ block: 'center' })
      const rect = button.getBoundingClientRect()
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    })()`,
  })
  await command('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...startButtonRect.result.value })
  await command('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...startButtonRect.result.value })
  await new Promise(resolve => setTimeout(resolve, 3000))
  const liveStateEvaluation = await command('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const active = document.querySelector('.screen.active')
      const pieces = [...active.querySelectorAll('.tok')]
      const pieceColors = pieces.map(piece => getComputedStyle(piece).backgroundColor)
      const badge = active.querySelector('.team-badge')
      const currentTeamColor = getComputedStyle(active.querySelector('.team-badge .team-marker')).backgroundColor
      return {
        activeScreen: active?.id,
        teamCount: state.teams.length,
        identitiesPersisted: state.teams.every(team => Boolean(team.name && team.color)),
        newStateUsesTeamEmoji: state.teams.some(team => Object.hasOwn(team, 'iconId')),
        renderedTeamMarkerCount: active.querySelectorAll('.team-marker').length,
        teamEmojiImageCount: active.querySelectorAll('.team-icon, .team-badge img, .board-team-label img, .tok img').length,
        boardPieceCount: pieces.length,
        uniqueBoardPieceColors: new Set(pieceColors).size,
        multiplePiecesShareStartCell: active.querySelectorAll('.start-cell .tok').length === state.teams.length,
        badgeUsesTeamFill: getComputedStyle(badge).backgroundColor === currentTeamColor,
        overflowX: document.documentElement.scrollWidth > innerWidth,
      }
    })()`,
  })
  behavior.liveState = liveStateEvaluation.result.value

  await command('Runtime.evaluate', { expression: 'scrollTo(0, 0)' })
  await new Promise(resolve => setTimeout(resolve, 150))
  const gameLayoutMetrics = await command('Page.getLayoutMetrics')
  const gameContentSize = gameLayoutMetrics.cssContentSize || gameLayoutMetrics.contentSize
  const gameScreenshot = await command('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: {
      x: 0,
      y: 0,
      width: Math.ceil(gameContentSize.width),
      height: Math.ceil(gameContentSize.height),
      scale: 1,
    },
  })
  const gameOutputPath = outputPath.replace(/\.png$/i, '-game.png')
  await writeFile(gameOutputPath, Buffer.from(gameScreenshot.data, 'base64'))
  behavior.gameScreenshotPath = gameOutputPath
}

console.log(JSON.stringify({
  ...evaluation.result.value,
  fullScreenshotPath: fullOutputPath,
  keyboardFocusable: focusEvaluation.result.value,
  behavior,
}, null, 2))

socket.close()
await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`)
await getJson('/json/version')

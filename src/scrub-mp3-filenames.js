import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import chalk from 'chalk'
import NodeID3 from 'node-id3'

const args = process.argv.slice(2)

/**
 * Input folder, only .mp3 files scrubbed
 */
let folder = '.'
/**
 * Skips prompting user to confirm changes
 */
let autoYes = false

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-d' && args[i + 1]) {
    folder = args[i + 1]
    i++
  } else if (args[i] === '-y') {
    autoYes = true
  }
}

console.log(chalk.yellow(`Searching for .mp3 files in folder: "${folder}"`))

const files = fs.readdirSync(folder).filter((f) => f.endsWith('.mp3'))
const plannedUpdates = []

const scrubString = (str) => {
  return str
    .replace(/(?:\s*-\s*)?\[?SPOTIFY-DOWNLOADER\.COM\]?/i, '')
    .replace(/(?:\s*-\s*)?\[?OneFireMusic\.Net\]?/i, '')
    .replace(/(?:\s*-\s*)?\(?www\.Jalibury\.com\)?$/i, '')
    .replace(/(?:\s*-\s*)?\(?www\.mp3spot\.in\)?$/i, '')
    .replace(/(?:\s*-\s*)?\(?Djleak\.com\)?$/i, '')
    .replace(/^\d+[.\-\s]*/, '') // removes leading digits + optional "." or "-" (will be added back to file name)
    .replace(/^_+/, '') // remove leading underscores
    .trim()
}

const gatherUpdates = () => {
  console.log(chalk.yellow(`Found ${files.length} .mp3 files`))

  for (const filename of files) {
    const fullPath = path.join(folder, filename)
    const tags = NodeID3.read(fullPath)
    const filenameNoExt = path.parse(filename).name

    let trackNum = tags.trackNumber
      ? parseInt(tags.trackNumber.split('/')[0], 10)
      : null

    // Attempt to get track num from filename if undefined in metadata
    if (!trackNum) {
      const trackNumInFileNameMatch = filenameNoExt.match(/^(\d+)([.\-\s])/)
      if (trackNumInFileNameMatch) {
        trackNum = parseInt(trackNumInFileNameMatch[1], 10)
      }
    }

    if (trackNum === null) {
      throw new Error(`Failed to find track number for filename: ${filename}`)
    }

    const paddedTrackNum = trackNum.toString().padStart(2, '0')
    const scrubbedFilename = scrubString(filenameNoExt)
    const newFilename = `${paddedTrackNum}. ${scrubbedFilename}.mp3`
    const newPath = path.join(folder, newFilename)

    const curTitle = tags.title || filenameNoExt
    const newTitle = scrubString(curTitle)

    const changes = {
      filename,
      fullPath,
      newPath,
      curTitle,
      newTitle,
      trackNum,
      willUpdateTitle: curTitle !== newTitle,
      willRename: newFilename !== filename,
    }

    if (changes.willUpdateTitle || changes.willRename) {
      plannedUpdates.push(changes)
    }
  }

  plannedUpdates.sort((a, b) => a.trackNum - b.trackNum)
}

const runUpdates = () => {
  for (const u of plannedUpdates) {
    if (u.willUpdateTitle) {
      NodeID3.update(
        {
          title: u.newTitle,
          trackNumber: u.trackNum.toString(),
        },
        u.fullPath,
      )
      console.log(
        chalk.green(`Updated title:   "${u.curTitle}" -> "${u.newTitle}"`),
      )
    } else {
      console.warn(chalk.yellow(`[SKIP TITLE]:    "${u.curTitle}"`))
    }

    if (u.willRename) {
      fs.renameSync(u.fullPath, u.newPath)
      console.log(
        chalk.green(
          `Renamed file:    "${u.filename}" -> "${path.basename(u.newPath)}"`,
        ),
      )
    } else {
      console.warn(chalk.yellow(`[SKIP FILENAME]: "${u.filename}"`))
    }
  }
}

const logUpdates = () => {
  console.log(chalk.yellow('Planned updates:'))
  for (const u of plannedUpdates) {
    if (u.willUpdateTitle) {
      console.log(chalk.yellow(`  [TITLE] "${u.curTitle}" -> "${u.newTitle}"`))
    }
    if (u.willRename) {
      console.log(
        chalk.yellow(
          `  [FILE]  "${u.filename}" -> "${path.basename(u.newPath)}"`,
        ),
      )
    }
  }
}

const confirmChanges = () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  rl.question('Confirm changes? Press Y or Enter to continue: ', (answer) => {
    const normalizedAnswer = answer.trim().toLowerCase()
    if (normalizedAnswer === 'y' || normalizedAnswer === '') {
      runUpdates()
    } else {
      console.warn(chalk.yellow('Cancelled.'))
    }

    rl.close()
  })
}

gatherUpdates()

if (plannedUpdates.length === 0) {
  console.log(chalk.green('No updates needed.'))
} else {
  if (autoYes) {
    runUpdates()
  } else {
    logUpdates()
    confirmChanges()
  }
}

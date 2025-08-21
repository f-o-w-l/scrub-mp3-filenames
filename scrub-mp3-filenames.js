import fs from 'node:fs'
import path from 'node:path'
import NodeID3 from 'node-id3'

const folder = '.'
const files = fs.readdirSync(folder).filter((f) => f.endsWith('.mp3'))

const removeCrap = (str) => {
  return str
    .replace(/(?:\s*-\s*)?\[?SPOTIFY-DOWNLOADER\.COM\]?/i, '')
    .replace(/(?:\s*-\s*)?\[?OneFireMusic\.Net\]?/i, '')
    .replace(/(?:\s*-\s*)?\(?www\.Jalibury\.com\)?$/i, '')
    .replace(/(?:\s*-\s*)?\(?www\.mp3spot\.in\)?$/i, '')
    .replace(/(?:\s*-\s*)?\(?Djleak\.com\)?$/i, '')
    .replace(/^\d+[.\-\s]*/, '') // removes digits + optional "." or "-" (will be added back to file name)
    .replace(/^_+/, '') // remove leading underscores
    .trim()
}

for (const file of files) {
  const fullPath = path.join(folder, file)
  const tags = NodeID3.read(fullPath)

  const fileName = path.parse(file).name
  const fixedFileName = removeCrap(fileName)

  let trackNum = tags.trackNumber
    ? parseInt(tags.trackNumber.split('/')[0], 10)
    : null

  // Attempt to get track number from fileName
  if (!trackNum) {
    const trackNumInFileNameMatch = fileName.match(/^(\d+)([.\-\s])/)
    if (trackNumInFileNameMatch) {
      trackNum = parseInt(trackNumInFileNameMatch[1], 10)
    }
  }

  if (!trackNum) throw new Error(`Track number not found for file: ${file}`)

  const paddedTrackNum = trackNum.toString().padStart(2, '0')
  const newFileName = `${paddedTrackNum}. ${fixedFileName}.mp3`
  const newPath = path.join(folder, newFileName)

  // Update MP3 title metadata
  const curTitle = tags.title || fileName
  const newTitle = removeCrap(curTitle)

  if (curTitle !== newTitle) {
    NodeID3.update(
      {
        title: newTitle,
        trackNumber: trackNum.toString(),
      },
      fullPath,
    )
    console.log(`Updated title:   "${tags.title || ''}" -> "${newTitle}"`)
  } else {
    console.warn(`[SKIP TITLE]:    "${curTitle}"`)
  }

  // Update file name
  if (newFileName !== fileName) {
    fs.renameSync(fullPath, newPath)
    console.log(`Renamed file:    "${file}" -> "${newFileName}"`)
  } else {
    console.warn(`[SKIP FILENAME]: "${fileName}"`)
  }
}

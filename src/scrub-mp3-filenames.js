import fs from 'node:fs'
import path from 'node:path'
import NodeID3 from 'node-id3'

/**
 * Look in root project dir, no need for subfolder, only .mp3 files scrubbed
 */
const folder = '.'
const files = fs.readdirSync(folder).filter((f) => f.endsWith('.mp3'))

const scrubString = (str) => {
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

  const filename = path.parse(file).name
  const scrubbedFilename = scrubString(filename)

  let trackNum = tags.trackNumber
    ? parseInt(tags.trackNumber.split('/')[0], 10)
    : null

  // Attempt to get track num from filename if undefined in metadata
  if (!trackNum) {
    const trackNumInFileNameMatch = filename.match(/^(\d+)([.\-\s])/)
    if (trackNumInFileNameMatch) {
      trackNum = parseInt(trackNumInFileNameMatch[1], 10)
    }
  }

  if (!trackNum) throw new Error(`Track number not found for file: ${file}`)

  const paddedTrackNum = trackNum.toString().padStart(2, '0')
  const newFilename = `${paddedTrackNum}. ${scrubbedFilename}.mp3`
  const newPath = path.join(folder, newFilename)

  // Update MP3 metadata
  const curTitle = tags.title || filename
  const newTitle = scrubString(curTitle)

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

  // Update MP3 filename
  if (newFilename !== filename) {
    fs.renameSync(fullPath, newPath)
    console.log(`Renamed file:    "${file}" -> "${newFilename}"`)
  } else {
    console.warn(`[SKIP FILENAME]: "${filename}"`)
  }
}

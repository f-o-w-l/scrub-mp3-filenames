# scrub-mp3-filenames

## Usage

1. `git clone git@github.com:f-o-w-l/scrub-mp3-filenames.git`
2. `cd scrub-mp3-filenames`
3. Install dependencies: `pnpm i`
4. Copy your MP3 files to the root project directory, or create a sub-folder and use the `-d` flag
5. `pnpm scrub`

### Command line args

- -d: Set input directory, relative to root project directory. Ex: `pnpm scrub -d inputDir`
- -y: Skip confirming changes

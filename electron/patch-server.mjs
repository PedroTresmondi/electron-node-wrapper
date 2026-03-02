/**
 * patch-server.mjs
 *
 * Applied by the GitHub Actions workflow after copying server.js into the
 * Electron app folder. Replaces the hardcoded DATA_DIR, CARDS_DIR and
 * CARROUSEL_DIR paths with environment-variable-driven ones so the Electron
 * main process can redirect them to AppData at runtime.
 *
 * Usage (Node 18+):
 *   node patch-server.mjs <path-to-server.js>
 */

import fs from 'fs'

const serverPath = process.argv[2]
if (!serverPath) {
  console.error('Usage: node patch-server.mjs <path-to-server.js>')
  process.exit(1)
}

let src = fs.readFileSync(serverPath, 'utf8')

// Replace the three hardcoded path constants with env-var-aware versions.
// The original lines look like:
//   const DATA_DIR      = path.join(__dirname, 'data');
//   const CARDS_DIR     = path.join(__dirname, 'public', 'assets', 'images', 'cards');
//   const CARROUSEL_DIR = path.join(__dirname, 'src', 'assets', 'images', 'carrousel');

src = src.replace(
  /const DATA_DIR\s*=\s*path\.join\([^)]+\);/,
  "const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');"
)

src = src.replace(
  /const CARDS_DIR\s*=\s*path\.join\([^)]+\);/,
  "const CARDS_DIR = process.env.CARDS_DIR || path.join(__dirname, 'public', 'assets', 'images', 'cards');"
)

src = src.replace(
  /const CARROUSEL_DIR\s*=\s*path\.join\([^)]+\);/,
  "const CARROUSEL_DIR = process.env.CARROUSEL_DIR || path.join(__dirname, 'src', 'assets', 'images', 'carrousel');"
)

fs.writeFileSync(serverPath, src, 'utf8')
console.log('server.js patched successfully.')

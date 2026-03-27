#!/usr/bin/env node
// Reads public/logo.svg and generates Android mipmap icons for all three Capacitor projects.
// Run: node scripts/generate-icons.js

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync, existsSync } from 'fs'

const require = createRequire(import.meta.url)
const sharp = require('sharp')

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const SOURCE = join(root, 'public', 'logo.svg')

const SIZES = [
  { dir: 'mipmap-mdpi',    size: 48  },
  { dir: 'mipmap-hdpi',    size: 72  },
  { dir: 'mipmap-xhdpi',   size: 96  },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
]

const PROJECTS = [
  'capacitor-customer',
  'capacitor-worker',
  'capacitor-store',
]

async function generate() {
  for (const project of PROJECTS) {
    for (const { dir, size } of SIZES) {
      const outDir = join(root, project, 'android', 'app', 'src', 'main', 'res', dir)
      if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true })
      }
      const outFile = join(outDir, 'ic_launcher.png')
      await sharp(SOURCE)
        .resize(size, size)
        .png()
        .toFile(outFile)
      console.log(`✓ ${project}/${dir}/ic_launcher.png (${size}×${size})`)

      // Also write ic_launcher_round.png (same image)
      const outFileRound = join(outDir, 'ic_launcher_round.png')
      await sharp(SOURCE)
        .resize(size, size)
        .png()
        .toFile(outFileRound)
      console.log(`✓ ${project}/${dir}/ic_launcher_round.png (${size}×${size})`)
    }
  }
  console.log('\nAll icons generated.')
}

generate().catch(err => { console.error(err); process.exit(1) })

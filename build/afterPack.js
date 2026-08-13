const fs = require('fs')
const path = require('path')

// Keep renderer-critical GPU/ANGLE files. Removing them can crash packaged BrowserWindows.
const UNNECESSARY_FILES = [
  'LICENSES.chromium.html', // 16MB - License HTML (keep .txt)
]

exports.default = async function afterPack(context) {
  const appOutDir = context.appOutDir
  let totalSaved = 0

  console.log('[afterPack] Removing unnecessary Electron files...')

  for (const file of UNNECESSARY_FILES) {
    const filePath = path.join(appOutDir, file)
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath)
      const sizeMB = (stats.size / 1024 / 1024).toFixed(1)
      fs.unlinkSync(filePath)
      totalSaved += stats.size
      console.log(`  Removed ${file} (${sizeMB}MB)`)
    }
  }

  console.log(`[afterPack] Total saved: ${(totalSaved / 1024 / 1024).toFixed(1)}MB`)
}

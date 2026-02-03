const fs = require('fs')
const path = require('path')

// Files that are NOT needed for a simple tray app (no GPU, no video)
const UNNECESSARY_FILES = [
  'dxcompiler.dll',      // 25MB - DirectX shader compiler
  'dxil.dll',            // 1.5MB - DirectX IL
  'vk_swiftshader.dll',  // 5.4MB - Vulkan software renderer
  'vk_swiftshader_icd.json',
  'vulkan-1.dll',        // 0.9MB - Vulkan loader
  'ffmpeg.dll',          // 3MB - Video/audio codecs
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

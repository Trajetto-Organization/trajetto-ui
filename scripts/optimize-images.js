const fs = require("fs");

const path = require("path");
const sharp = require("sharp");

const inputDir = path.join(__dirname, "..", "public");
const outputDir = path.join(__dirname, "..", "public", "optimized");

// Maximum width in pixels for the web (1200px works perfectly for most screens)
const MAX_WIDTH = 1200;

async function processDirectory(currentDir) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);

    if (fullPath.startsWith(outputDir)) {
      continue;
    }

    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".webp")) {
      const relativePath = path.relative(inputDir, fullPath);
      const targetPath = path.join(outputDir, relativePath);

      const targetFolder = path.dirname(targetPath);
      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
      }

      try {
        await sharp(fullPath)
          .resize({
            width: MAX_WIDTH,
            withoutEnlargement: true, // Does not enlarge images smaller than MAX_WIDTH
          })
          .webp({ quality: 80, effort: 6 })
          .toFile(targetPath);

        const oldSize = (fs.statSync(fullPath).size / 1024).toFixed(1);
        const newSize = (fs.statSync(targetPath).size / 1024).toFixed(1);

        console.log(
          `✅ Optimized: ${relativePath} (${oldSize}KB ➡️ ${newSize}KB)`,
        );
      } catch (err) {
        console.error(`❌ Error processing ${relativePath}:`, err);
      }
    }
  }
}

async function optimizeWebpImages() {
  console.log("🚀 Starting optimization with resizing...");
  await processDirectory(inputDir);

  console.log("✨ Process completed!");
}

optimizeWebpImages();

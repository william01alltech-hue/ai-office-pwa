const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || (filePath.endsWith('.ts') && !filePath.includes('translations.ts'))) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Simple comment removal (not perfect but good enough for this)
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    content = content.replace(/\/\/.*/g, '');
    
    if (/[\u4e00-\u9fa5]/.test(content)) {
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (/[\u4e00-\u9fa5]/.test(line)) {
          console.log(`${filePath}:${i+1}: ${line.trim()}`);
        }
      });
    }
  }
});

const fs = require('fs');
const path = require('path');

let todos = [];
let debugs = [];
let tsIgnores = [];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath, callback);
    } else {
      callback(path.join(dir, f));
    }
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      const num = i + 1;
      if (/(TODO|FIXME|即將推出)/i.test(line)) {
        todos.push(`${filePath}:${num}: ${line.trim()}`);
      }
      if (/(console\.(log|warn|error)|alert\()/i.test(line)) {
        debugs.push(`${filePath}:${num}: ${line.trim()}`);
      }
      if (/(@ts-ignore|@ts-nocheck|as any)/.test(line)) {
        tsIgnores.push(`${filePath}:${num}: ${line.trim()}`);
      }
    });
  }
});

console.log("=== TODOs & FIXMEs ===");
console.log(todos.join('\n') || 'None');
console.log("\n=== Debug Statements ===");
console.log(debugs.join('\n') || 'None');
console.log("\n=== TS Ignores / as any ===");
console.log(tsIgnores.join('\n') || 'None');

const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src'));
let totalReplaced = 0;

files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  
  // Replace dark:text-slate-xxx with dark:text-white
  content = content.replace(/dark:text-slate-[1-9]00/g, 'dark:text-white');
  
  // Also replace dark:text-gray-xxx if any
  content = content.replace(/dark:text-gray-[1-9]00/g, 'dark:text-white');

  // Also replace text-slate-xxx dark:text-slate-xxx cases
  // Actually the above regex covers it since it's just replacing the class string.

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    totalReplaced++;
    console.log(`Replaced in ${file}`);
  }
});

console.log(`Done. Modified ${totalReplaced} files.`);

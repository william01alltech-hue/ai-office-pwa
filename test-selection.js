import fs from 'fs';
const content = fs.readFileSync('node_modules/prosemirror-tables/dist/index.cjs', 'utf-8');
console.log(content.includes('isCellSelection') ? 'yes' : 'no');

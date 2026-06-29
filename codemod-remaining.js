const fs = require('fs');

const replaces = {
  'src/components/SettingsModal.tsx': [
    { s: '系統設定', t: '{t(\\'settings.title\\')}' },
    { s: '關閉', t: '{t(\\'settings.close\\')}' },
    { s: '外觀設定', t: '{t(\\'settings.appearance\\')}' },
    { s: '亮色', t: '{t(\\'app.theme_light\\')}' },
    { s: '暗色', t: '{t(\\'app.theme_dark\\')}' },
    { s: '系統', t: '{t(\\'app.theme_system\\')}' },
  ],
  'src/components/Paywall.tsx': [
    { s: '升級為 PRO', t: '{t(\\'paywall.upgrade\\')}' },
    { s: '解鎖所有進階功能，提升您的生產力。', t: '{t(\\'paywall.desc\\')}' },
    { s: '無限次數轉檔', t: '{t(\\'paywall.feature1\\')}' },
    { s: '無廣告干擾', t: '{t(\\'paywall.feature2\\')}' },
    { s: '優先處理速度', t: '{t(\\'paywall.feature3\\')}' },
    { s: '確認升級', t: '{t(\\'paywall.confirm\\')}' },
    { s: '稍後再說', t: '{t(\\'paywall.later\\')}' },
  ],
  'src/ErrorBoundary.tsx': [
    { s: '網頁發生了非預期的錯誤', t: '{t(\\'error.title\\')}' },
    { s: '很抱歉，應用程式在執行時遇到了一個錯誤，為了防止進一步的資料損毀，我們暫停了畫面渲染。您可以嘗試重新載入網頁。', t: '{t(\\'error.desc\\')}' },
    { s: '重新載入網頁', t: '{t(\\'error.reload\\')}' },
  ],
};

for (const [file, items] of Object.entries(replaces)) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, 'utf-8');
  
  // import { useAppContext } from
  if (!code.includes('useAppContext')) {
    code = `import { useAppContext } from '../contexts/AppContext';\n` + code;
  }
  // const { t } = useAppContext();
  if (!code.includes('const { t } = useAppContext();')) {
     code = code.replace(/(const [A-Za-z0-9_]+: React\.FC[^=]*= \([^)]*\) => {)/, '$1\n  const { t } = useAppContext();');
  }

  items.forEach(r => {
    code = code.split('>' + r.s + '<').join('>' + r.t + '<');
    code = code.split('\\'' + r.s + '\\'').join(r.t);
    code = code.split('\"' + r.s + '\"').join(r.t);
  });
  
  fs.writeFileSync(file, code);
  console.log(file + ' refactored!');
}

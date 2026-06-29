const fs = require('fs');

const baseKeys = {
  // Sticker Studio
  'sticker.wa_static': '靜態貼圖',
  'sticker.wa_static_desc': '嚴格 512x512 正方形，16px 留白',
  'sticker.wa_animated': '動態貼圖',
  'sticker.wa_animated_desc': '即將推出 (500KB 以下)',
  'sticker.multi_format': '多種規格',
  'sticker.tg_desc': '點擊展開 Telegram 格式',
  'sticker.tg_static': '靜態貼圖',
  'sticker.tg_static_desc': '最長邊固定 512，完美支援透明度',
  'sticker.tg_animated': '動態貼圖',
  'sticker.tg_animated_desc': '即將推出 (專屬向量動畫格式)',
  'sticker.tg_video': '影片貼圖',
  'sticker.tg_video_desc': '即將推出 (高畫質動畫)',
  'sticker.wechat': 'WeChat (微信)',
  'sticker.wechat_desc': '點擊展開微信表情包格式',
  'sticker.wechat_static': '靜態表情包',
  'sticker.wechat_static_desc': '最大 240x240，500KB 以下',
  'sticker.wechat_animated': '動態表情包',
  'sticker.wechat_animated_desc': '即將推出 (500KB 以下)',
  'sticker.dc_desc': '點擊展開伺服器表情格式',
  'sticker.dc_static': '伺服器表情',
  'sticker.dc_static_desc': '固定 128x128，256KB 限制',
  'sticker.dc_animated': '動態表情',
  'sticker.dc_animated_desc': '即將推出 (Lottie / GIF 支援)',
  'sticker.slack_desc': '點擊展開工作區 Emoji 格式',
  'sticker.slack_static': '自訂 Emoji',
  'sticker.slack_static_desc': '自動縮放為 128x128 最佳大小',
  'sticker.slack_animated': '動態 Emoji',
  'sticker.slack_animated_desc': '即將推出',
  'sticker.apple_desc': '點擊展開 Apple 貼紙格式',
  'sticker.apple_static': '靜態貼紙',
  'sticker.apple_static_desc': '標準 300x300，直接拖曳使用',
  'sticker.apple_animated': '動態貼紙',
  'sticker.apple_animated_desc': '即將推出',
  'sticker.msg_desc': '點擊展開社群梗圖格式',
  'sticker.msg_static': '靜態貼圖',
  'sticker.msg_static_desc': '通用高畫質靜態梗圖輸出',
  'sticker.msg_animated': '動態貼圖',
  'sticker.msg_animated_desc': '即將推出',
  'sticker.kakao_desc': '點擊展開日韓歐洲常用格式',
  'sticker.kakao_static': '靜態貼圖',
  'sticker.kakao_static_desc': '固定 360x360，完美像素對齊',
  'sticker.kakao_animated': '動態貼圖',
  'sticker.kakao_animated_desc': '即將推出',
  'sticker.draw_layer': '手繪圖層',
  'sticker.folder_unsupported': '您的瀏覽器不支援資料夾選擇功能，請改用單檔上傳。',
  'sticker.folder_fail': '掛載資料夾失敗',
  'sticker.upload_more': '請先上傳足夠的圖片！',
  'sticker.pack_fail': '打包失敗，請重試！',
  'sticker.ready_assets': '已準備 {0} 項素材',
  'sticker.clear_img': '清空圖片',
  'sticker.add_canvas_title': '點擊加入畫布',
  'sticker.add_canvas': '+ 畫布',
  'sticker.use_ready_title': '點擊預備使用',
  'sticker.use_ready': '+ 取出',
  'sticker.interactive_canvas': '互動畫布',
  'sticker.tool_select': '選取 (V)',
  'sticker.tool_draw': '畫筆 (B)',
  'sticker.tool_eraser': '橡皮擦 (E)',
  'sticker.upload_first': '請先從左側上傳圖片！',
  'sticker.packing': '正在封裝 {0} 格式的貼圖...',
  'sticker.pack_line_static': '封裝 LINE 靜態貼圖包',
  'sticker.pack_line_req': '符合官方審核規範 (ZIP)',
  'sticker.pack_select_num': '請選擇您要發行的貼圖張數：',
  'sticker.pack_uploaded': '您目前已上傳',
  'sticker.pack_images': '張圖片',
  'sticker.pack_warn_num': '警告：圖片數量不足！',
  'sticker.pack_warn_desc': '您選擇了 {0} 張的規格，但目前只上傳了 {1} 張。打包時缺少的部分將會被自動忽略，可能無法通過 LINE 官方審核。請補齊圖片。',
  'sticker.pack_ready': '數量充足，準備就緒！',
  'sticker.pack_ready_desc': '系統會自動挑選第一張圖片，完美裁切為 main.png 與 tab.png。所有圖片都會自動套用偶數化與 10px 透明邊距。',
  'sticker.cancel': '取消',
  'sticker.start_pack_zip': '開始封裝為 ZIP',
  'sticker.packing_now': '打包中...',
  
  // AppContext, Navbar, etc
  'app.theme_light': '亮色',
  'app.theme_dark': '暗色',
  'app.theme_system': '系統',
  
  // Dashboard
  'dash.recent_files': '最近開啟的檔案',
  'dash.no_recent': '暫無最近檔案',
};

const cnKeys = {
  // Sticker Studio
  'sticker.wa_static': '静态贴图',
  'sticker.wa_static_desc': '严格 512x512 正方形，16px 留白',
  'sticker.wa_animated': '动态贴图',
  'sticker.wa_animated_desc': '即将推出 (500KB 以下)',
  'sticker.multi_format': '多种规格',
  'sticker.tg_desc': '点击展开 Telegram 格式',
  'sticker.tg_static': '静态贴图',
  'sticker.tg_static_desc': '最长边固定 512，完美支持透明度',
  'sticker.tg_animated': '动态贴图',
  'sticker.tg_animated_desc': '即将推出 (专属矢量动画格式)',
  'sticker.tg_video': '视频贴图',
  'sticker.tg_video_desc': '即将推出 (高画质动画)',
  'sticker.wechat': 'WeChat (微信)',
  'sticker.wechat_desc': '点击展开微信表情包格式',
  'sticker.wechat_static': '静态表情包',
  'sticker.wechat_static_desc': '最大 240x240，500KB 以下',
  'sticker.wechat_animated': '动态表情包',
  'sticker.wechat_animated_desc': '即将推出 (500KB 以下)',
  'sticker.dc_desc': '点击展开服务器表情格式',
  'sticker.dc_static': '服务器表情',
  'sticker.dc_static_desc': '固定 128x128，256KB 限制',
  'sticker.dc_animated': '动态表情',
  'sticker.dc_animated_desc': '即将推出 (Lottie / GIF 支持)',
  'sticker.slack_desc': '点击展开工作区 Emoji 格式',
  'sticker.slack_static': '自定义 Emoji',
  'sticker.slack_static_desc': '自动缩放为 128x128 最佳大小',
  'sticker.slack_animated': '动态 Emoji',
  'sticker.slack_animated_desc': '即将推出',
  'sticker.apple_desc': '点击展开 Apple 贴纸格式',
  'sticker.apple_static': '静态贴纸',
  'sticker.apple_static_desc': '标准 300x300，直接拖曳使用',
  'sticker.apple_animated': '动态贴纸',
  'sticker.apple_animated_desc': '即将推出',
  'sticker.msg_desc': '点击展开社群梗图格式',
  'sticker.msg_static': '静态贴图',
  'sticker.msg_static_desc': '通用高画质静态梗图输出',
  'sticker.msg_animated': '动态贴图',
  'sticker.msg_animated_desc': '即将推出',
  'sticker.kakao_desc': '点击展开日韩欧洲常用格式',
  'sticker.kakao_static': '静态贴图',
  'sticker.kakao_static_desc': '固定 360x360，完美像素对齐',
  'sticker.kakao_animated': '动态贴图',
  'sticker.kakao_animated_desc': '即将推出',
  'sticker.draw_layer': '手绘图层',
  'sticker.folder_unsupported': '您的浏览器不支持文件夹选择功能，请改用单文件上传。',
  'sticker.folder_fail': '挂载文件夹失败',
  'sticker.upload_more': '请先上传足够的图片！',
  'sticker.pack_fail': '打包失败，请重试！',
  'sticker.ready_assets': '已准备 {0} 项素材',
  'sticker.clear_img': '清空图片',
  'sticker.add_canvas_title': '点击加入画布',
  'sticker.add_canvas': '+ 画布',
  'sticker.use_ready_title': '点击预备使用',
  'sticker.use_ready': '+ 取出',
  'sticker.interactive_canvas': '互动画布',
  'sticker.tool_select': '选取 (V)',
  'sticker.tool_draw': '画笔 (B)',
  'sticker.tool_eraser': '橡皮擦 (E)',
  'sticker.upload_first': '请先从左侧上传图片！',
  'sticker.packing': '正在封装 {0} 格式的贴图...',
  'sticker.pack_line_static': '封装 LINE 静态贴图包',
  'sticker.pack_line_req': '符合官方审核规范 (ZIP)',
  'sticker.pack_select_num': '请选择您要发行的贴图张数：',
  'sticker.pack_uploaded': '您目前已上传',
  'sticker.pack_images': '张图片',
  'sticker.pack_warn_num': '警告：图片数量不足！',
  'sticker.pack_warn_desc': '您选择了 {0} 张的规格，但目前只上传了 {1} 张。打包时缺少的部分将会被自动忽略，可能无法通过 LINE 官方审核。请补齐图片。',
  'sticker.pack_ready': '数量充足，准备就绪！',
  'sticker.pack_ready_desc': '系统会自动挑选第一张图片，完美裁切为 main.png 与 tab.png。所有图片都会自动套用偶数化与 10px 透明边距。',
  'sticker.cancel': '取消',
  'sticker.start_pack_zip': '开始封装为 ZIP',
  'sticker.packing_now': '打包中...',
  
  'app.theme_light': '亮色',
  'app.theme_dark': '暗色',
  'app.theme_system': '系统',
  
  'dash.recent_files': '最近打开的文件',
  'dash.no_recent': '暂无最近文件',
};

const enKeys = {
  // Sticker Studio
  'sticker.wa_static': 'Static Sticker',
  'sticker.wa_static_desc': 'Strict 512x512 square, 16px padding',
  'sticker.wa_animated': 'Animated Sticker',
  'sticker.wa_animated_desc': 'Coming Soon (Under 500KB)',
  'sticker.multi_format': 'Multiple Formats',
  'sticker.tg_desc': 'Click to expand Telegram formats',
  'sticker.tg_static': 'Static Sticker',
  'sticker.tg_static_desc': 'Max edge fixed at 512, perfect transparency',
  'sticker.tg_animated': 'Animated Sticker',
  'sticker.tg_animated_desc': 'Coming Soon (Vector format)',
  'sticker.tg_video': 'Video Sticker',
  'sticker.tg_video_desc': 'Coming Soon (HD Video)',
  'sticker.wechat': 'WeChat',
  'sticker.wechat_desc': 'Click to expand WeChat formats',
  'sticker.wechat_static': 'Static Sticker',
  'sticker.wechat_static_desc': 'Max 240x240, under 500KB',
  'sticker.wechat_animated': 'Animated Sticker',
  'sticker.wechat_animated_desc': 'Coming Soon (Under 500KB)',
  'sticker.dc_desc': 'Click to expand Server Emoji formats',
  'sticker.dc_static': 'Server Emoji',
  'sticker.dc_static_desc': 'Fixed 128x128, 256KB limit',
  'sticker.dc_animated': 'Animated Emoji',
  'sticker.dc_animated_desc': 'Coming Soon (Lottie / GIF)',
  'sticker.slack_desc': 'Click to expand Workspace Emoji formats',
  'sticker.slack_static': 'Custom Emoji',
  'sticker.slack_static_desc': 'Auto-scales to 128x128',
  'sticker.slack_animated': 'Animated Emoji',
  'sticker.slack_animated_desc': 'Coming Soon',
  'sticker.apple_desc': 'Click to expand Apple Sticker formats',
  'sticker.apple_static': 'Static Sticker',
  'sticker.apple_static_desc': 'Standard 300x300, drag to use',
  'sticker.apple_animated': 'Animated Sticker',
  'sticker.apple_animated_desc': 'Coming Soon',
  'sticker.msg_desc': 'Click to expand Social Meme formats',
  'sticker.msg_static': 'Static Meme',
  'sticker.msg_static_desc': 'Universal HD static meme export',
  'sticker.msg_animated': 'Animated Meme',
  'sticker.msg_animated_desc': 'Coming Soon',
  'sticker.kakao_desc': 'Click to expand Asian/Euro formats',
  'sticker.kakao_static': 'Static Sticker',
  'sticker.kakao_static_desc': 'Fixed 360x360, pixel perfect',
  'sticker.kakao_animated': 'Animated Sticker',
  'sticker.kakao_animated_desc': 'Coming Soon',
  'sticker.draw_layer': 'Drawing Layer',
  'sticker.folder_unsupported': 'Your browser does not support folder selection, please upload files individually.',
  'sticker.folder_fail': 'Failed to mount folder',
  'sticker.upload_more': 'Please upload enough images first!',
  'sticker.pack_fail': 'Packing failed, please try again!',
  'sticker.ready_assets': 'Ready Assets: {0}',
  'sticker.clear_img': 'Clear Images',
  'sticker.add_canvas_title': 'Click to add to canvas',
  'sticker.add_canvas': '+ Canvas',
  'sticker.use_ready_title': 'Click to prepare',
  'sticker.use_ready': '+ Extract',
  'sticker.interactive_canvas': 'Interactive Canvas',
  'sticker.tool_select': 'Select (V)',
  'sticker.tool_draw': 'Brush (B)',
  'sticker.tool_eraser': 'Eraser (E)',
  'sticker.upload_first': 'Please upload images from the left first!',
  'sticker.packing': 'Packing {0} format stickers...',
  'sticker.pack_line_static': 'Pack LINE Static Stickers',
  'sticker.pack_line_req': 'Meets official requirements (ZIP)',
  'sticker.pack_select_num': 'Select the number of stickers to publish:',
  'sticker.pack_uploaded': 'Currently uploaded:',
  'sticker.pack_images': 'images',
  'sticker.pack_warn_num': 'Warning: Insufficient images!',
  'sticker.pack_warn_desc': 'You selected {0} stickers, but only uploaded {1}. Missing ones will be ignored, which may cause official review failure. Please add more images.',
  'sticker.pack_ready': 'Sufficient quantity, ready!',
  'sticker.pack_ready_desc': 'The system will auto-select the first image and perfectly crop it into main.png and tab.png. All images will be even-sized with a 10px transparent margin.',
  'sticker.cancel': 'Cancel',
  'sticker.start_pack_zip': 'Start Packing ZIP',
  'sticker.packing_now': 'Packing...',
  
  'app.theme_light': 'Light',
  'app.theme_dark': 'Dark',
  'app.theme_system': 'System',
  
  'dash.recent_files': 'Recent Files',
  'dash.no_recent': 'No recent files',
};


let code = fs.readFileSync('/Volumes/AI模型/ai-office-pwa/src/i18n/translations.ts', 'utf-8');
const langs = ['zh-TW', 'zh-CN', 'en-US', 'es-ES', 'ja-JP', 'de-DE', 'fr-FR', 'pt-BR', 'ru-RU', 'ko-KR', 'ar-SA'];

langs.forEach(lang => {
  let keysObj = enKeys;
  if (lang === 'zh-TW') keysObj = baseKeys;
  else if (lang === 'zh-CN') keysObj = cnKeys;
  
  const blockStartIdx = code.indexOf('\"' + lang + '\": {');
  if (blockStartIdx !== -1) {
    let nextBlockStartIdx = code.indexOf('\": {', blockStartIdx + 10);
    if (nextBlockStartIdx === -1) nextBlockStartIdx = code.length;
    
    let blockStr = code.substring(blockStartIdx, nextBlockStartIdx);
    
    const targetKey = '\"ppt.content_placeholder\":';
    const keyIdx = blockStr.indexOf(targetKey);
    
    if (keyIdx !== -1) {
      const lineEndIdx = blockStr.indexOf('\"', keyIdx + targetKey.length + 10); 
      
      let newContent = '';
      for (const [k, v] of Object.entries(keysObj)) {
        newContent += ',\n    \"' + k + '\": \"' + v.replace(/\\n/g, '\\\\n') + '\"';
      }
      
      blockStr = blockStr.substring(0, lineEndIdx + 1) + newContent + blockStr.substring(lineEndIdx + 1);
      code = code.substring(0, blockStartIdx) + blockStr + code.substring(nextBlockStartIdx);
    }
  }
});

fs.writeFileSync('/Volumes/AI模型/ai-office-pwa/src/i18n/translations.ts', code);
console.log('Added batch translations to translations.ts');

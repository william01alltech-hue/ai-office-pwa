#!/bin/bash
# 取得此腳本所在的目錄位置
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "正在啟動 AI Office PWA 系統..."
echo "目錄: $DIR"

# 進入專案目錄
cd "$DIR"

# 在背景啟動後端伺服器 (Port 3000)
echo "啟動 AI 後端伺服器..."
cd server
npx tsx src/index.ts &
BACKEND_PID=$!

# 回到主目錄啟動前端伺服器 (Port 5173)
cd "$DIR"
echo "啟動前端介面..."
npm run dev &
FRONTEND_PID=$!

echo "========================================"
echo "系統已啟動！"
echo "前端網頁：http://localhost:5173"
echo "後端伺服器：http://localhost:3000"
echo "========================================"
echo "請勿關閉此視窗，如果想關閉伺服器，請按 Ctrl+C"

# 捕捉中斷訊號並關閉子程序
trap "echo '正在關閉伺服器...'; kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

# 等待背景程序執行，讓視窗保持開啟
wait $FRONTEND_PID
wait $BACKEND_PID

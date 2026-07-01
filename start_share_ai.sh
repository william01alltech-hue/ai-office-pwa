#!/bin/bash
# 確保環境變數正確，讓 Ollama 監聽所有 IP 且允許網頁跨網域連線 (CORS)
export OLLAMA_HOST=0.0.0.0
export OLLAMA_ORIGINS="*"

# 1. 啟動 Ollama 服務
# 如果 Ollama 已經在跑了，這行會被忽略；如果沒在跑，它會在背景啟動
/usr/local/bin/ollama serve > /tmp/ollama_auto.log 2>&1 &

# 稍等 5 秒讓 Ollama 啟動完成
sleep 5

# 2. 啟動 localtunnel 並固定子網域 neat-parrots-sin
# 這樣每次重開機，網址都會維持 https://neat-parrots-sin.loca.lt
npx localtunnel --port 11434 --subdomain neat-parrots-sin > /tmp/localtunnel_auto.log 2>&1

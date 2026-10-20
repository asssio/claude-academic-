export PATH="$PATH:/i/claude-code/bin"
export CLAUDE_CODE_GIT_BASH_PATH="C:\apk\Git\bin\bash.exe"
alias cc="/i/claude-code/bin/claude"
export GLM_KEY="**"
export MINIMAX_KEY="**"
export XIAOMI_KEY="**"
export DEEPSEEK_KEY="**"
export TokenGX_KEY="**"

glm() {
  ANTHROPIC_AUTH_TOKEN="$GLM_KEY" \
  ANTHROPIC_BASE_URL="https://api.bilezan.cn/" \
  ANTHROPIC_MODEL="glm-5.1" \
  cc "$@"
}

ds() {
  ANTHROPIC_AUTH_TOKEN="$DEEPSEEK_KEY" \
  ANTHROPIC_BASE_URL="https://api.deepseek.com/anthropic" \
  ANTHROPIC_MODEL="deepseek-v4-flash" \
  ANTHROPIC_DEFAULT_SONNET_MODEL="deepseek-v4-pro" \
  cc "$@"
}

dst() {
  ANTHROPIC_AUTH_TOKEN="" \
  ANTHROPIC_BASE_URL="http://localhost:8080" \
  ANTHROPIC_MODEL="deepseek-v4-flash" \
  ANTHROPIC_DEFAULT_SONNET_MODEL="deepseek-v4-pro" \
  cc "$@"
}

tk() {
  ANTHROPIC_AUTH_TOKEN="$TokenGX_KEY" \
  ANTHROPIC_BASE_URL="https://api.bilezan.cn/" \
  ANTHROPIC_MODEL="deepseek-v4-flash" \
  cc "$@"
}

mx() {
  ANTHROPIC_AUTH_TOKEN="$MINIMAX_KEY" \
  ANTHROPIC_BASE_URL="https://api.minimaxi.com/anthropic" \
  ANTHROPIC_DEFAULT_HAIKU_MODEL="MiniMax-M2.7-highspeed" \
  ANTHROPIC_DEFAULT_OPUS_MODEL="MiniMax-M2.7-highspeed" \
  ANTHROPIC_DEFAULT_SONNET_MODEL="MiniMax-M2.7-highspeed" \
  ANTHROPIC_MODEL="MiniMax-M2.7-highspeed" \
  cc "$@"
}

mxt() {
  ANTHROPIC_AUTH_TOKEN="$MINIMAX_KEY" \
  ANTHROPIC_BASE_URL="http://localhost:8080" \
  ANTHROPIC_MODEL="MiniMax-M2.7-highspeed" \
  cc "$@"
}

xm() {
  ANTHROPIC_AUTH_TOKEN="$XIAOMI_KEY" \
  ANTHROPIC_BASE_URL="https://llm.whitedream.top" \
  ANTHROPIC_MODEL="deepseek-v4-flash" \
  cc "$@"
}

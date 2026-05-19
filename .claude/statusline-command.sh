#!/bin/bash
input=$(cat)

model=$(echo "$input" | jq -r '.model.display_name // "Unknown"')
used=$(echo "$input" | jq -r '.context_window.used_percentage // empty')

if [ -n "$used" ]; then
  pct=$(printf "%.0f" "$used")
  filled=$(( pct * 20 / 100 ))
  empty=$(( 20 - filled ))
  bar=""
  for i in $(seq 1 $filled); do bar="${bar}█"; done
  for i in $(seq 1 $empty); do bar="${bar}░"; done
  printf "\033[36m%s\033[0m  \033[33m[%s]\033[0m \033[37m%d%%\033[0m" "$model" "$bar" "$pct"
else
  printf "\033[36m%s\033[0m  \033[37m[--------------------] -%%\033[0m" "$model"
fi

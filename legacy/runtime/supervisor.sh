#!/bin/bash
cd /home/z/my-project
rm -rf .next
while true; do
  bun run dev >> /home/z/my-project/dev.log 2>&1
  EXIT_CODE=$?
  echo "Server exited with code $EXIT_CODE at $(date)" >> /home/z/my-project/dev.log
  sleep 2
  rm -rf /home/z/my-project/.next
  echo "Restarting at $(date)" >> /home/z/my-project/dev.log
done

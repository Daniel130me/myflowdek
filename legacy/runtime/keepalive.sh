#!/bin/bash
# Keepalive script - pings server to keep it responsive
while true; do
  sleep 15
  curl -s -o /dev/null -w '' http://localhost:3000/ 2>/dev/null
  sleep 30
  curl -s -o /dev/null -w '' http://localhost:3000/ 2>/dev/null
done

#!/bin/zsh
cd ~/Desktop/ai-signal || exit 1
/usr/bin/env npm run ingest:news >> ~/Library/Logs/radar-daily-ingest.log 2>&1

# !/usr/bin/env bash
rsync -rv --exclude 'node-persist' --exclude 'node_modules' --exclude 'node-persist'  --exclude 'uploads'  ./* pi@192.168.0.28:/opt/msapps/fileLink
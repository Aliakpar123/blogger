#!/bin/bash
echo "========================================"
echo "🚀 STARTING UPDATE TO v5.5"
echo "========================================"

# Add all files
git add .
git commit -m "Force Update v5.5"

# Show remote
echo "Checking connection..."
git remote -v

# Force push
echo "----------------------------------------"
echo "👉 PUSHING TO GITHUB (Enter text if asked)"
echo "----------------------------------------"
git push -u origin main --force

echo "========================================"
echo "✅ IF YOU SEE 'Everything up-to-date' OR 'Enumerating objects' -> IT WORKED!"
echo "❌ IF YOU SEE 'error' -> SEND SCREENSHOT"
echo "========================================"

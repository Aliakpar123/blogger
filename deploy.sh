#!/bin/bash
git add .
git commit -m "Update $(date)"
git push
echo "✅ Changes pushed to GitHub. Check Vercel dashboard for build status."

#!/usr/bin/env bash
set -euo pipefail

# Vercel project build command. Dependencies are installed by Vercel before this runs.
# Keep the build deterministic and source-controlled now that the project is connected to GitHub.
npm run build

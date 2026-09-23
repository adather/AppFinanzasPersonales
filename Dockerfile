# syntax=docker/dockerfile:1

# ---- Stage 1: build the frontend (Vite) ----
FROM node:20-slim AS frontend-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig.json metadata.json ./
COPY public ./public
COPY src ./src
RUN npm run build

# ---- Stage 2: Python runtime (FastAPI + uv) ----
FROM python:3.12-slim AS runtime
WORKDIR /app

# Install uv (single static binary, no extra package manager needed)
COPY --from=ghcr.io/astral-sh/uv:0.7.13 /uv /uvx /usr/local/bin/

# Install dependencies first so this layer is cached across code-only changes
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# App code + the frontend build output from stage 1
COPY server ./server
COPY --from=frontend-build /app/dist ./dist

ENV PATH="/app/.venv/bin:${PATH}" \
    PYTHONUNBUFFERED=1 \
    PORT=8080

# Cloud Run injects PORT (usually 8080) and health-checks that exact port —
# hardcoding a different one here is what made an earlier deploy fail with
# "container failed to start and listen on the port ... PORT=8080". Shell
# form (no brackets) is required for ${PORT} to expand; `exec` keeps uvicorn
# as PID 1 so it gets SIGTERM directly for a clean shutdown.
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import os,urllib.request as u; u.urlopen('http://localhost:'+os.environ.get('PORT','8080')+'/api/health', timeout=3)" || exit 1

# GEMINI_API_KEY must be supplied at runtime (docker run -e / --env-file / your
# platform's secrets), never baked into the image.
CMD exec uvicorn server.main:app --host 0.0.0.0 --port ${PORT}

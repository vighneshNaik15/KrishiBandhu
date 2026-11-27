FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    CROP_MODEL_RUNTIME=litert \
    OPENBLAS_NUM_THREADS=1 \
    OMP_NUM_THREADS=1 \
    MALLOC_ARENA_MAX=2 \
    CROP_MODEL_DIR=/models

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements-base.txt requirements-litert.txt ./
RUN pip install --no-cache-dir -r requirements-litert.txt
COPY app ./app

RUN useradd --create-home --uid 10001 appuser \
    && mkdir -p /models

USER appuser
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.environ['PORT']+'/health', timeout=5)"

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port \"$PORT\" --workers 1"]

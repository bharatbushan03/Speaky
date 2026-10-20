# Reproducible FastAPI image. The Next.js frontend is built/run with npm using
# the pinned .nvmrc because the API and browser have separate deploy targets.
FROM python:3.11.9-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend

WORKDIR /app

COPY backend/requirements.lock /app/backend/requirements.lock
RUN python -m pip install --no-cache-dir --requirement /app/backend/requirements.lock

COPY backend /app/backend

EXPOSE 8000
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

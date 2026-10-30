FROM python:3.11-slim

WORKDIR /app

# Install dependencies first for better layer caching
COPY requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock

# Copy application code
COPY . .

# Fly.io sets the PORT env var; default to 8080
EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]


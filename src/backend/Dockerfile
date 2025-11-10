FROM python:3.11-slim

# Prevent Python from writing .pyc files & enable unbuffered logs
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Where our backend code will live
WORKDIR /app

# System deps (pandas etc.)
RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential \
  && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source into the image
COPY . .

# Let App Runner / humans know which port the app uses
EXPOSE 8000

# Start FastAPI via uvicorn
# main.py must be at /app/main.py (which it is with this layout)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
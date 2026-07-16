FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=10000

# Set work directory
WORKDIR /app

# Install system dependencies
# gcc/g++ and libpq-dev are useful for compiling extensions if wheels are absent.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Make sure the container listens on $PORT
EXPOSE $PORT

# Start command
CMD ["sh", "-c", "python manage.py collectstatic --noinput && python manage.py migrate && gunicorn docquery_backend.wsgi --bind 0.0.0.0:$PORT"]

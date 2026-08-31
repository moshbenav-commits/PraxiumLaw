# Vultr colocate — staging path off Vercel (PraxiumLaw is weaning off Vercel,
# same direction as expedia-parts-back's Wave 1 migration). Mongo stays on
# Atlas (mongodb+srv://) — this image is compute only.
#
# uvicorn runs the FastAPI app directly. api/index.py's Mangum wrapper is
# Vercel/Lambda-specific and is not used here.
FROM python:3.12-slim AS runner
WORKDIR /app

# cryptography/pillow/reportlab pull native wheels; keep the base slim but
# make sure pip can still build if a wheel is missing for this platform.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8090
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8090"]

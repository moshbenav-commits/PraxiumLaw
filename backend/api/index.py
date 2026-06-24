"""Vercel serverless entry — wraps FastAPI with Mangum."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from mangum import Mangum  # noqa: E402
from server import app  # noqa: E402

handler = Mangum(app, lifespan="off")

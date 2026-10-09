"""JOURNEX intel service: inference only, no state."""

from fastapi import FastAPI

app = FastAPI(title="journex-intel")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "UP", "service": "intel"}

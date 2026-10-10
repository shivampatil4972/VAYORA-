"""JOURNEX intel service: inference only, no state."""

from fastapi import FastAPI

from .hazard.api import router as hazard_router

app = FastAPI(title="journex-intel")
app.include_router(hazard_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "UP", "service": "intel"}

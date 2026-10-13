"""HTTP face of the contact scheduler."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field, model_validator

from .plan import Candidate, Limits, plan

router = APIRouter(prefix="/v1/scheduler", tags=["scheduler"])

# Keeps one request from occupying the service: a round on this corridor is far smaller.
MAX_CANDIDATES = 2000


class CandidateBody(BaseModel):
    booking_id: int
    ride_id: int
    departure_day: int
    seats: int = Field(ge=1)
    survival_probability: float = Field(ge=0, le=1)
    hours_to_departure: float = Field(ge=0)


class LimitsBody(BaseModel):
    contacts: int = Field(ge=0)
    contacts_per_ride: int = Field(ge=0)
    seats_per_departure_day: int = Field(ge=0)
    refill_horizon_hours: float = Field(gt=0)
    time_limit_seconds: float = Field(gt=0, le=30)


class PlanRequest(BaseModel):
    candidates: list[CandidateBody] = Field(max_length=MAX_CANDIDATES)
    limits: LimitsBody

    @model_validator(mode="after")
    def _check(self) -> PlanRequest:
        ids = [c.booking_id for c in self.candidates]
        if len(set(ids)) != len(ids):
            raise ValueError("booking ids must be unique")
        return self


class PlanResponse(BaseModel):
    # Bookings to ask to reconfirm. Asking is all this ever recommends: a booking is
    # never to be cancelled because of an estimate.
    booking_ids: list[int]
    status: str
    worth: float


@router.post("/plan")
def make_plan(request: PlanRequest) -> PlanResponse:
    result = plan([Candidate(**c.model_dump()) for c in request.candidates],
                  Limits(**request.limits.model_dump()))
    return PlanResponse(booking_ids=list(result.booking_ids), status=result.status,
                        worth=result.worth)

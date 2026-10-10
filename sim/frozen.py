"""The frozen parameters from CLAUDE.md. These are not tunables; do not change them."""

ORIGIN = "Kolhapur"
DESTINATION = "Pune"
BOOKING_HORIZON_DAYS = 7
SPAN_DAYS = 60
SEEDS_PER_VARIANT = 30

# Drive real behaviour in the simulator; never exposed as model features.
LATENT_TYPES = ("committed", "flexible", "opportunistic", "deadline_bound")

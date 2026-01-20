from pydantic import BaseModel
from typing import Optional

# --- INPUT SCHEMAS (What the User Sends) ---


class ForecastRequest(BaseModel):
    product_id: int
    # We allow manual override of features for "What-If" analysis
    price_override: Optional[float] = None


# --- OUTPUT SCHEMAS (What we send back) ---


class SegmentResponse(BaseModel):
    customer_id: int
    segment: str  # "VIP", "Regular", or "Budget"
    recency: int
    frequency: int
    monetary: float


class ForecastResponse(BaseModel):
    product_id: int
    predicted_sales: int
    confidence_score: float  # Mocked for now, but good to have

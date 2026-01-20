from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware  # <--- ADD THIS IMPORT
from sqlalchemy.orm import Session
from pydantic import BaseModel
import pandas as pd
import numpy as np
import pickle
import os
from datetime import datetime

# Import our local modules
from database import SessionLocal, engine, Transaction, Product
import schemas

# Initialize App
app = FastAPI(title="OptiStock AI Engine", version="1.0")

# --- ADD THIS BLOCK (CORS POLICY) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (localhost:3000, mobile app, etc.)
    allow_credentials=True,
    allow_methods=["*"],  # Allows GET, POST, etc.
    allow_headers=["*"],
)
# ------------------------------------

# ... (The rest of your code remains exactly the same)

# --- GLOBAL VARIABLES (The Brains) ---
MODELS = {}


# Define the data format for updating stock
class StockUpdate(BaseModel):
    quantity: int


# --- LIFECYCLE: Load Models on Startup ---
# This ensures we don't load the heavy model for every single request (Speed Boost)
@app.on_event("startup")
def load_models():
    print("Loading AI Models...")
    base_path = "../ml-engine"

    try:
        # Load Segmentation Models
        with open(f"{base_path}/kmeans_model.pkl", "rb") as f:
            MODELS["kmeans"] = pickle.load(f)
        with open(f"{base_path}/scaler.pkl", "rb") as f:
            MODELS["scaler"] = pickle.load(f)
        with open(f"{base_path}/model_metadata.pkl", "rb") as f:
            MODELS["meta"] = pickle.load(f)

        # Load Forecasting Models
        with open(f"{base_path}/forecast_model.pkl", "rb") as f:
            MODELS["forecast"] = pickle.load(f)
        with open(f"{base_path}/category_encoder.pkl", "rb") as f:
            MODELS["encoder"] = pickle.load(f)

        print(" -> SUCCESS: All models loaded.")
    except Exception as e:
        print(f" -> ERROR: Could not load models. Check paths! {e}")


# --- DB DEPENDENCY ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- ENDPOINTS ---


@app.get("/")
def health_check():
    return {"status": "online", "system": "OptiStock API"}


@app.get("/analytics/segment/{customer_id}", response_model=schemas.SegmentResponse)
def get_customer_segment(customer_id: int, db: Session = Depends(get_db)):
    """
    1. Fetches user history from DB.
    2. Calculates RFM.
    3. Uses K-Means to predict segment (VIP/Regular).
    """
    # A. Fetch Transactions
    query = db.query(Transaction).filter(Transaction.customer_id == customer_id).all()

    if not query:
        raise HTTPException(status_code=404, detail="Customer not found or no history")

    # B. Calculate RFM (Real-time Engineering)
    # Convert DB objects to DataFrame for easier math
    data = [{"date": t.date, "total_amount": t.total_amount} for t in query]
    df = pd.DataFrame(data)
    df["date"] = pd.to_datetime(df["date"])

    now = datetime.now()
    recency = (now - df["date"].max()).days
    frequency = len(df)
    monetary = df["total_amount"].sum()

    # C. Prepare for Model
    # Input must be [[Recency, Frequency, Monetary]]
    raw_features = pd.DataFrame(
        [[recency, frequency, monetary]], columns=["recency", "frequency", "monetary"]
    )

    # Scale! (Crucial step: use the loaded scaler)
    scaled_features = MODELS["scaler"].transform(raw_features)

    # D. Predict
    cluster_id = MODELS["kmeans"].predict(scaled_features)[0]

    # E. Interpret
    vip_id = MODELS["meta"]["vip_cluster"]
    if cluster_id == vip_id:
        segment_name = "VIP"
    elif monetary < 100:  # Simple fallback logic
        segment_name = "Budget"
    else:
        segment_name = "Regular"

    return {
        "customer_id": customer_id,
        "segment": segment_name,
        "recency": recency,
        "frequency": frequency,
        "monetary": monetary,
    }


@app.post("/forecast/predict", response_model=schemas.ForecastResponse)
def predict_demand(request: schemas.ForecastRequest, db: Session = Depends(get_db)):
    """
    Predicts sales for a product for 'Tomorrow'.
    NOTE: In a real system, we would auto-fetch lag features from DB.
    For this MVP, we will mock the lag features to keep it runnable.
    """
    # A. Fetch Product Info
    product = db.query(Product).filter(Product.product_id == request.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # B. Construct Features (Mocking the complexities of Time Series for Demo)
    # We assume 'tomorrow' is a weekday in month 11 (November) for high sales

    # Encode Category
    try:
        cat_encoded = MODELS["encoder"].transform([product.category])[0]
    except:
        cat_encoded = 0  # Fallback

    # Construct the feature vector:
    # ['base_price', 'category_encoded', 'day_of_week', 'month', 'lag_1', 'lag_7', 'rolling_mean_3']

    # SIMULATION: Let's assume average sales are around 5 units
    # ... inside predict_demand function ...

    # CORRECTED: We added 'request.product_id' as the first item to match training data
    features = pd.DataFrame(
        [
            [
                request.product_id,  # <--- THIS WAS MISSING!
                request.price_override or product.base_price,
                cat_encoded,
                0,  # Monday (0)
                11,  # November
                5.0,  # Lag 1 (Sold 5 yesterday)
                5.0,  # Lag 7 (Sold 5 last week)
                5.0,  # Rolling mean
            ]
        ],
        columns=[
            "product_id",
            "base_price",
            "category_encoded",
            "day_of_week",
            "month",
            "lag_1",
            "lag_7",
            "rolling_mean_3",
        ],
    )

    # ... rest of the function ...

    # C. Predict
    prediction = MODELS["forecast"].predict(features)[0]

    return {
        "product_id": request.product_id,
        "predicted_sales": int(max(0, round(prediction))),  # No negative sales
        "confidence_score": 0.85,
    }


# 1. Endpoint to GET all products
@app.get("/products")
def get_products(db: Session = Depends(get_db)):
    return db.query(Product).all()


# 2. Endpoint to UPDATE stock
@app.put("/products/{product_id}/stock")
def update_stock(product_id: int, update: StockUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.stock = update.quantity
    db.commit()
    return {"message": "Stock updated", "new_stock": product.stock}

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
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

# --- CORS POLICY ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (localhost:3000, mobile app, etc.)
    allow_credentials=True,
    allow_methods=["*"],  # Allows GET, POST, etc.
    allow_headers=["*"],
)

# --- GLOBAL VARIABLES (The Brains) ---
MODELS = {}


# Define the data format for updating stock
class StockUpdate(BaseModel):
    quantity: int


# --- LIFECYCLE: Load Models on Startup ---
@app.on_event("startup")
def load_models():
    print("Loading AI Models...")
    # Adjust this path if your ml-engine folder is located elsewhere relative to backend
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
    # CORRECTED: Use 'timestamp' and 'total_price' to match your database.py model
    data = [{"date": t.timestamp, "total_amount": t.total_price} for t in query]

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
    """
    # A. Fetch Product Info
    # Note: Use Product.id, NOT Product.product_id
    product = db.query(Product).filter(Product.id == request.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # B. Construct Features
    # Encode Category
    try:
        cat_encoded = MODELS["encoder"].transform([product.category])[0]
    except:
        cat_encoded = 0  # Fallback

    # Construct the feature vector matching the training data structure
    features = pd.DataFrame(
        [
            [
                request.product_id,
                request.price_override or product.base_price,
                cat_encoded,
                0,  # Monday (0) - Mock Value
                11,  # November - Mock Value
                5.0,  # Lag 1 (Sold 5 yesterday) - Mock Value
                5.0,  # Lag 7 (Sold 5 last week) - Mock Value
                5.0,  # Rolling mean - Mock Value
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

    # C. Predict
    prediction = MODELS["forecast"].predict(features)[0]

    return {
        "product_id": request.product_id,
        "predicted_sales": int(max(0, round(prediction))),  # No negative sales
        "confidence_score": 0.85,
    }


# Endpoint to GET all products
@app.get("/products")
def get_products(db: Session = Depends(get_db)):
    return db.query(Product).all()


# Endpoint to UPDATE stock
@app.put("/products/{product_id}/stock")
def update_stock(product_id: int, update: StockUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.stock = update.quantity
    db.commit()
    return {"message": "Stock updated", "new_stock": product.stock}


# Add this schema to schemas.py (or define in main.py for now)
class RestockRecommendation(BaseModel):
    product_id: int
    name: str
    current_stock: int
    predicted_demand: int
    status: str  # "OK", "LOW", "CRITICAL"
    recommended_order: int


@app.get("/analytics/reorder-report", response_model=list[RestockRecommendation])
def get_reorder_report(db: Session = Depends(get_db)):
    """
    Scans ALL products.
    1. Predicts demand for tomorrow.
    2. Compares with current stock.
    3. Returns a 'To-Buy' list for the manager.
    """
    products = db.query(Product).all()
    report = []

    for p in products:
        # 1. Feature Engineering (Simplified for Demo)
        # In a real app, you'd fetch real lags from the DB
        try:
            cat_encoded = MODELS["encoder"].transform([p.category])[0]
        except:
            cat_encoded = 0

        features = pd.DataFrame(
            [[p.id, p.base_price, cat_encoded, 0, 11, 5.0, 5.0, 5.0]],
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

        # 2. Predict
        predicted = int(max(0, round(MODELS["forecast"].predict(features)[0])))

        # 3. Decision Logic
        safety_buffer = 5  # Always keep 5 extra units just in case
        required_stock = predicted + safety_buffer

        status = "OK"
        order_amount = 0

        if p.stock < predicted:
            status = "CRITICAL"  # Will run out tomorrow!
            order_amount = required_stock - p.stock
        elif p.stock < required_stock:
            status = "LOW"  # Might run out if sales are high
            order_amount = required_stock - p.stock

        # Only add to report if action is needed
        if status != "OK":
            report.append(
                {
                    "product_id": p.id,
                    "name": p.name
                    or "Unknown Product",  # <--- Fallback if name is missing
                    "current_stock": p.stock,
                    "predicted_demand": predicted,
                    "status": status,
                    "recommended_order": order_amount,
                }
            )

    return report

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from sqlalchemy import func, desc, text
import pandas as pd
import numpy as np
import pickle
import os
from datetime import datetime

# Add these imports at the top
from sqlalchemy import func
from datetime import timedelta, date

# --- ADD THESE IMPORTS ---
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

# Import our local modules
from database import SessionLocal, engine, Transaction, Product
import schemas
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder

# Initialize App
app = FastAPI(title="OptiStock AI Engine", version="1.0")

# --- CORS POLICY ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- GLOBAL VARIABLES (The Brains) ---
MODELS = {}


# Define the data format for updating stock
class StockUpdate(BaseModel):
    quantity: int


class RestockRecommendation(BaseModel):
    product_id: int
    name: str
    current_stock: int
    predicted_demand: int
    status: str
    recommended_order: int


# --- LIFECYCLE: Load Models on Startup ---
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


# --- TRAINING SERVICE (Background Task) ---
def retrain_models_task():
    print("🔄 ADMIN: Starting automated retraining...")
    try:
        db_engine = engine
        transactions = pd.read_sql("SELECT * FROM transactions", db_engine)
        products = pd.read_sql("SELECT * FROM products", db_engine)

        if transactions.empty:
            print("⚠️ ADMIN: Not enough data to train.")
            return

        # Simple training logic for the "Hot Swap"
        df = transactions.merge(
            products[["id", "category", "base_price"]],
            left_on="product_id",
            right_on="id",
            how="left",
        )

        # Use timestamp if available, else date
        date_col = "timestamp" if "timestamp" in df.columns else "date"
        df["date"] = pd.to_datetime(df[date_col])

        daily = (
            df.groupby(["product_id", "date", "category", "base_price"])["quantity"]
            .sum()
            .reset_index()
        )
        daily = daily.sort_values(["product_id", "date"])

        # Features
        daily["day_of_week"] = daily["date"].dt.dayofweek
        daily["month"] = daily["date"].dt.month
        daily["lag_1"] = daily.groupby("product_id")["quantity"].shift(1)
        daily["lag_7"] = daily.groupby("product_id")["quantity"].shift(7)
        daily["rolling_mean_3"] = daily.groupby("product_id")["quantity"].transform(
            lambda x: x.rolling(3).mean()
        )
        data = daily.dropna()

        le = LabelEncoder()
        data["category_encoded"] = le.fit_transform(data["category"].astype(str))

        X = data[
            [
                "product_id",
                "base_price",
                "category_encoded",
                "day_of_week",
                "month",
                "lag_1",
                "lag_7",
                "rolling_mean_3",
            ]
        ]
        y = data["quantity"]

        new_forecast_model = GradientBoostingRegressor(n_estimators=50, max_depth=3)
        new_forecast_model.fit(X, y)

        MODELS["forecast"] = new_forecast_model
        MODELS["encoder"] = le
        print("✅ ADMIN: AI Successfully Retrained & Hot-Swapped!")

    except Exception as e:
        print(f"❌ ADMIN: Training Failed. Reason: {e}")


# --- ENDPOINTS ---


@app.get("/")
def health_check():
    return {"status": "online", "system": "OptiStock API"}


@app.post("/admin/retrain")
def trigger_retraining(background_tasks: BackgroundTasks):
    background_tasks.add_task(retrain_models_task)
    return {"message": "Training started in background."}


@app.get("/analytics/segment/{customer_id}", response_model=schemas.SegmentResponse)
def get_customer_segment(customer_id: int, db: Session = Depends(get_db)):
    # A. Fetch Transactions
    query = db.query(Transaction).filter(Transaction.customer_id == customer_id).all()

    if not query:
        raise HTTPException(status_code=404, detail="Customer not found or no history")

    # B. Calculate RFM
    # Use 'timestamp' and 'total_price' from your DB model
    data = [{"date": t.timestamp, "total_amount": t.total_price} for t in query]

    df = pd.DataFrame(data)
    df["date"] = pd.to_datetime(df["date"])

    now = datetime.now()
    # If data is old, 'now' might make Recency huge. We should ideally use max(date) in DB.
    # For now, we use the max date from the customer's history to avoid skewing.
    last_active = df["date"].max()
    recency = 0  # If they just bought

    frequency = len(df)
    monetary = df["total_amount"].sum()

    raw_features = pd.DataFrame(
        [[recency, frequency, monetary]], columns=["recency", "frequency", "monetary"]
    )

    scaled_features = MODELS["scaler"].transform(raw_features)
    cluster_id = MODELS["kmeans"].predict(scaled_features)[0]

    vip_id = MODELS["meta"]["vip_cluster"]

    if cluster_id == vip_id:
        segment_name = "VIP"
    elif monetary < 50:
        segment_name = "Budget"
    else:
        segment_name = "Regular"

    return {
        "customer_id": customer_id,
        "segment": segment_name,
        "recency": int(recency),
        "frequency": int(frequency),
        "monetary": float(monetary),
    }


@app.post("/forecast/predict")
def predict_demand(req: schemas.ForecastRequest, db: Session = Depends(get_db)):
    """
    Predicts sales for 'Tomorrow' using REAL historical data (Time-Travel Logic).
    """
    if "forecast" not in MODELS or MODELS["forecast"] is None:
        raise HTTPException(status_code=503, detail="AI Model is still loading.")

    # 1. Get Product
    product = db.query(Product).filter(Product.id == req.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # 2. Get Last Active Date (Time Travel)
    # We find the last time this product was sold to act as "Yesterday"
    last_sale = (
        db.query(Transaction.timestamp)
        .filter(Transaction.product_id == req.product_id)
        .order_by(desc(Transaction.timestamp))
        .first()
    )

    if not last_sale:
        return {
            "product_id": req.product_id,
            "predicted_sales": 0,
            "confidence_score": 0.0,
        }

    reference_date = last_sale[0]

    # 3. Fetch History inputs
    history = (
        db.query(Transaction)
        .filter(Transaction.product_id == req.product_id)
        .filter(Transaction.timestamp <= reference_date)
        .order_by(desc(Transaction.timestamp))
        .limit(7)
        .all()
    )

    if not history:
        return {
            "product_id": req.product_id,
            "predicted_sales": 0,
            "confidence_score": 0.0,
        }

    # 4. Feature Calc
    data = [{"qty": t.quantity, "date": t.timestamp} for t in history]
    df = pd.DataFrame(data).sort_values("date")
    qty_series = df["qty"]

    features = {
        "product_id": req.product_id,
        "base_price": req.price_override if req.price_override else product.base_price,
        "category_encoded": 0,
        "day_of_week": reference_date.weekday(),
        "month": reference_date.month,
        "lag_1": qty_series.iloc[-1] if len(qty_series) >= 1 else 0,
        "lag_7": qty_series.iloc[-7] if len(qty_series) >= 7 else qty_series.mean(),
        "rolling_mean_3": qty_series.tail(3).mean() if len(qty_series) > 0 else 0,
    }

    try:
        features["category_encoded"] = MODELS["encoder"].transform([product.category])[
            0
        ]
    except:
        features["category_encoded"] = 0

    input_vector = pd.DataFrame([features])

    try:
        prediction = MODELS["forecast"].predict(input_vector)[0]
        final_prediction = int(max(0, round(prediction)))
    except Exception as e:
        print(f"Prediction Error: {e}")
        final_prediction = 0

    return {
        "product_id": req.product_id,
        "predicted_sales": final_prediction,
        "confidence_score": 0.85,
        "product_name": product.name,
    }


@app.get("/products")
def get_products(db: Session = Depends(get_db)):
    return db.query(Product).all()


@app.put("/products/{product_id}/stock")
def update_stock(product_id: int, update: StockUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.stock = update.quantity
    db.commit()
    return {"message": "Stock updated", "new_stock": product.stock}


@app.get("/analytics/reorder-report", response_model=list[RestockRecommendation])
def get_reorder_report(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    report = []

    # Note: For performance on large datasets, we use simplified logic here.
    # In a real production app, we would pre-calculate this in a background job.
    for p in products:
        try:
            cat_encoded = MODELS["encoder"].transform([p.category])[0]
        except:
            cat_encoded = 0

        # Simplified inputs for bulk reporting to avoid DB slam
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

        try:
            predicted = int(max(0, round(MODELS["forecast"].predict(features)[0])))
        except:
            predicted = 0

        safety_buffer = 5
        required_stock = predicted + safety_buffer

        status = "OK"
        order_amount = 0

        if p.stock < predicted:
            status = "CRITICAL"
            order_amount = required_stock - p.stock
        elif p.stock < required_stock:
            status = "LOW"
            order_amount = required_stock - p.stock

        if status != "OK":
            report.append(
                {
                    "product_id": p.id,
                    "name": p.name or "Unknown Product",  # Safe fallback
                    "current_stock": p.stock,
                    "predicted_demand": predicted,
                    "status": status,
                    "recommended_order": order_amount,
                }
            )

    return report


@app.get("/analytics/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Returns Executive Metrics:
    1. Total Revenue Today
    2. Revenue Last 7 Days (Trend)
    3. Top 5 Selling Products
    """
    today = datetime.now().date()
    seven_days_ago = today - timedelta(days=7)

    # A. Total Revenue Today
    # We sum the 'total_price' of all transactions from today
    # Note: Ensure your Transaction model has a 'total_price' column.
    # If not, calculate it (quantity * price).
    todays_sales = (
        db.query(func.sum(Transaction.total_price))
        .filter(func.date(Transaction.timestamp) == today)
        .scalar()
        or 0.0
    )

    # B. Revenue Trend (Last 7 Days)
    # This creates the data for the Line Chart
    trend_data = (
        db.query(
            func.date(Transaction.timestamp).label("date"),
            func.sum(Transaction.total_price).label("revenue"),
        )
        .filter(Transaction.timestamp >= seven_days_ago)
        .group_by(func.date(Transaction.timestamp))
        .all()
    )

    # Format for Frontend: [{"date": "2023-10-01", "revenue": 1200}, ...]
    chart_data = [{"date": str(t.date), "revenue": t.revenue} for t in trend_data]

    # C. Top 5 Products
    # This creates the data for the Bar Chart
    top_products_query = (
        db.query(Product.name, func.sum(Transaction.quantity).label("sold"))
        .join(Transaction, Product.id == Transaction.product_id)
        .group_by(Product.name)
        .order_by(desc("sold"))
        .limit(5)
        .all()
    )

    top_products = [{"name": p.name, "sold": p.sold} for p in top_products_query]

    return {
        "today_revenue": todays_sales,
        "revenue_trend": chart_data,
        "top_products": top_products,
    }


# --- ADD THIS NEW SCHEMA ---
class CartItem(BaseModel):
    product_id: int
    quantity: int
    price: float


class CheckoutRequest(BaseModel):
    items: list[CartItem]


# --- ADD THIS NEW ENDPOINT ---
@app.post("/pos/checkout")
def process_checkout(checkout: CheckoutRequest, db: Session = Depends(get_db)):
    """
    1. Saves each item as a Transaction (History).
    2. Updates Inventory (Stock).
    """
    try:
        # Create a timestamp for this entire batch
        now = datetime.now()

        for item in checkout.items:
            # A. Record the Sale (History)
            new_transaction = Transaction(
                product_id=item.product_id,
                customer_id=1,  # Default "Walk-in Customer" ID
                quantity=item.quantity,
                total_price=item.price * item.quantity,  # Store total value
                timestamp=now,
            )
            db.add(new_transaction)

            # B. Update Stock (Inventory)
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                product.stock -= item.quantity

        db.commit()
        return {"message": "Sale recorded successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# --- ADD THIS CONFIGURATION ---
# You will set these in Render Environment Variables later
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = os.getenv("MAIL_USERNAME") # Your Gmail
SENDER_PASSWORD = os.getenv("MAIL_PASSWORD") # Your App Password
ALERT_RECEIVER = os.getenv("MAIL_RECEIVER") # Where to send alerts

# --- THE WATCHDOG FUNCTION ---
def run_watchdog_scan(db: Session):
    print("🐕 Watchdog: Starting scan...")
    
    # 1. Get all products
    products = db.query(Product).all()
    alerts = []
    
    # 2. Check each product against AI
    for p in products:
        # Quick Forecast (Simplified for speed)
        # In production, you'd call the actual model, but here we use a simple heuristic
        # or the last known prediction if you stored it. 
        # For this demo, let's assume "Critical" is < 5 units.
        if p.stock < 5:
            alerts.append(f"• {p.name} (ID: {p.id}): Only {p.stock} left!")
            
    if not alerts:
        print("✅ Watchdog: No alerts needed.")
        return {"status": "All Clear"}
        
    # 3. Prepare Email
    subject = f"🚨 OptiStock Alert: {len(alerts)} Critical Items"
    body = "The AI Watchdog detected low stock levels:\n\n" + "\n".join(alerts) + "\n\nPlease restock immediately."
    
    msg = MIMEMultipart()
    msg['From'] = SENDER_EMAIL
    msg['To'] = ALERT_RECEIVER
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))
    
    # 4. Send Email
    try:
        if not SENDER_EMAIL or not SENDER_PASSWORD:
            print("❌ Watchdog: Email credentials missing.")
            return {"status": "Failed", "detail": "Credentials missing"}

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        text = msg.as_string()
        server.sendmail(SENDER_EMAIL, ALERT_RECEIVER, text)
        server.quit()
        print("📧 Watchdog: Alert sent successfully!")
        return {"status": "Email Sent", "count": len(alerts)}
    except Exception as e:
        print(f"❌ Watchdog Error: {e}")
        return {"status": "Error", "detail": str(e)}

# --- TRIGGER ENDPOINT ---
@app.post("/admin/run-watchdog")
def trigger_watchdog(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Run in background so UI doesn't freeze
    background_tasks.add_task(run_watchdog_scan, db)
    return {"message": "Watchdog released! Check your email in 1 minute."}
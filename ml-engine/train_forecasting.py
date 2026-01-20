import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
from sklearn.preprocessing import LabelEncoder
import pickle  # <--- CHANGED: Using standard pickle instead of joblib
import os

# --- CONFIGURATION ---
DB_PATH = "../backend/optistock.db"
MODEL_PATH = "forecast_model.pkl"
ENCODER_PATH = "category_encoder.pkl"


def train_forecasting_model():
    print("Starting Demand Forecasting Training...")

    # 1. Connect & Load Data
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Database not found at {DB_PATH}")

    engine = create_engine(f"sqlite:///{DB_PATH}")

    print(" -> Loading sales history...")
    query = """
    SELECT t.date, t.product_id, t.quantity, p.category, p.base_price
    FROM transactions t
    JOIN products p ON t.product_id = p.product_id
    """
    df = pd.read_sql(query, engine)
    df["date"] = pd.to_datetime(df["date"])

    # 2. Aggregation (Daily Sales per Product)
    print(" -> Aggregating daily sales...")
    daily_sales = (
        df.groupby(["date", "product_id", "category", "base_price"])["quantity"]
        .sum()
        .reset_index()
    )

    # 3. Feature Engineering
    print(" -> Generating time-series features...")
    daily_sales = daily_sales.sort_values(by=["product_id", "date"])

    daily_sales["day_of_week"] = daily_sales["date"].dt.dayofweek
    daily_sales["month"] = daily_sales["date"].dt.month

    daily_sales["lag_1"] = daily_sales.groupby("product_id")["quantity"].shift(1)
    daily_sales["lag_7"] = daily_sales.groupby("product_id")["quantity"].shift(7)

    daily_sales["rolling_mean_3"] = daily_sales.groupby("product_id")[
        "quantity"
    ].transform(lambda x: x.rolling(window=3).mean())

    daily_sales = daily_sales.dropna()

    # 4. Encoding
    print(" -> Encoding categories...")
    le = LabelEncoder()
    daily_sales["category_encoded"] = le.fit_transform(daily_sales["category"])

    # 5. Prepare Training Data
    features = [
        "product_id",
        "base_price",
        "category_encoded",
        "day_of_week",
        "month",
        "lag_1",
        "lag_7",
        "rolling_mean_3",
    ]
    target = "quantity"

    X = daily_sales[features]
    y = daily_sales[target]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # 6. Train Model
    print(" -> Training Gradient Boosting Regressor...")
    model = GradientBoostingRegressor(
        n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42
    )
    model.fit(X_train, y_train)

    # 7. Evaluate
    predictions = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    print(f" -> Model Performance (RMSE): {rmse:.2f}")

    # 8. Save Model & Encoders (Using Standard Pickle)
    print(" -> Saving models...")

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)

    with open(ENCODER_PATH, "wb") as f:
        pickle.dump(le, f)

    print(f"SUCCESS: Forecasting model saved to {MODEL_PATH}")


if __name__ == "__main__":
    train_forecasting_model()

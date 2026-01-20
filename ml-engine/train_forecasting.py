import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_squared_error
import pickle
import os

# CONFIG
TRANS_PATH = "../data/transactions.csv"
PROD_PATH = "../data/products.csv"
MODEL_PATH = "forecast_model.pkl"
ENCODER_PATH = "category_encoder.pkl"


def train_forecasting_model():
    print("Starting Demand Forecasting Training...")

    # 1. Load Data
    if not os.path.exists(TRANS_PATH) or not os.path.exists(PROD_PATH):
        raise FileNotFoundError("Data files not found. Run process_real_data.py first.")

    transactions = pd.read_csv(TRANS_PATH)
    products = pd.read_csv(PROD_PATH)

    # Merge to get Product Details (Category, Price)
    df = transactions.merge(
        products[["id", "category", "base_price"]],
        left_on="product_id",
        right_on="id",
        how="left",
    )
    df["date"] = pd.to_datetime(df["date"])

    # 2. Feature Engineering
    print("Engineering features (Lags & Rolling Means)...")

    # Aggregate daily sales per product
    daily_sales = (
        df.groupby(["product_id", "date", "category", "base_price"])["quantity"]
        .sum()
        .reset_index()
    )

    # Sort for Time Series calc
    daily_sales = daily_sales.sort_values(["product_id", "date"])

    # Create Features
    daily_sales["day_of_week"] = daily_sales["date"].dt.dayofweek
    daily_sales["month"] = daily_sales["date"].dt.month

    # Lag Features (Past Sales)
    daily_sales["lag_1"] = daily_sales.groupby("product_id")["quantity"].shift(
        1
    )  # Sales yesterday
    daily_sales["lag_7"] = daily_sales.groupby("product_id")["quantity"].shift(
        7
    )  # Sales last week

    # Rolling Mean (Moving Average of last 3 days)
    daily_sales["rolling_mean_3"] = daily_sales.groupby("product_id")[
        "quantity"
    ].transform(lambda x: x.rolling(window=3).mean())

    # Drop NaN values created by lags (the first 7 days of data have no history)
    data = daily_sales.dropna()

    # Encode Category (String -> Number)
    le = LabelEncoder()
    data["category_encoded"] = le.fit_transform(data["category"].astype(str))

    # Define Input (X) and Output (y)
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

    X = data[features]
    y = data[target]

    # 3. Train Model
    print(f"Training on {len(X)} rows...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = GradientBoostingRegressor(
        n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42
    )
    model.fit(X_train, y_train)

    # 4. Evaluate
    predictions = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    print(f" -> Model RMSE: {rmse:.2f} (Lower is better)")

    # 5. Save
    print("Saving models...")
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
    with open(ENCODER_PATH, "wb") as f:
        pickle.dump(le, f)

    print("✅ Forecasting Training Complete.")


if __name__ == "__main__":
    train_forecasting_model()

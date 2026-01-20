import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import pickle  # <--- CHANGED: Using standard pickle
import os

# --- CONFIGURATION ---
DB_PATH = "../backend/optistock.db"
MODEL_PATH = "kmeans_model.pkl"
SCALER_PATH = "scaler.pkl"
META_PATH = "model_metadata.pkl"


def train_segmentation_model():
    print("Starting Customer Segmentation Training...")

    # 1. Connect to Database & Load Data
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(
            f"Database not found at {DB_PATH}. Did you run init_db.py?"
        )

    engine = create_engine(f"sqlite:///{DB_PATH}")

    print(" -> Loading transactions from Database...")
    query = """
    SELECT customer_id, date, total_amount 
    FROM transactions
    """
    df = pd.read_sql(query, engine)

    # Convert date to datetime objects
    df["date"] = pd.to_datetime(df["date"])

    # 2. Feature Engineering (RFM Analysis)
    print(" -> Calculating RFM metrics...")
    reference_date = df["date"].max() + pd.Timedelta(days=1)

    rfm = (
        df.groupby("customer_id")
        .agg(
            {
                "date": lambda x: (reference_date - x.max()).days,  # Recency
                "customer_id": "count",  # Frequency
                "total_amount": "sum",  # Monetary
            }
        )
        .rename(
            columns={
                "date": "recency",
                "customer_id": "frequency",
                "total_amount": "monetary",
            }
        )
    )

    # 3. Preprocessing (Scaling)
    print(" -> Scaling data...")
    scaler = StandardScaler()
    rfm_scaled = scaler.fit_transform(rfm)

    # 4. Training K-Means
    print(" -> Training K-Means Algorithm (k=3)...")
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    kmeans.fit(rfm_scaled)

    rfm["cluster"] = kmeans.labels_

    # 5. Interpret the Clusters (Find the VIPs)
    cluster_summary = rfm.groupby("cluster")["monetary"].mean()
    vip_cluster_id = cluster_summary.idxmax()
    print(f" -> Cluster Analysis:\n{cluster_summary}")
    print(f" -> VIP Cluster identified as ID: {vip_cluster_id}")

    # 6. Save the Brains (Using Standard Pickle)
    print(" -> Saving models...")

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(kmeans, f)

    with open(SCALER_PATH, "wb") as f:
        pickle.dump(scaler, f)

    # Save metadata so the API knows which cluster is which
    metadata = {"vip_cluster": int(vip_cluster_id)}
    with open(META_PATH, "wb") as f:
        pickle.dump(metadata, f)

    print(f"SUCCESS: Segmentation model saved to {MODEL_PATH}")


if __name__ == "__main__":
    train_segmentation_model()

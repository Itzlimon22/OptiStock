import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
import pickle
import os

# CONFIG
DATA_PATH = "../data/transactions.csv"  # <--- READING CSV DIRECTLY
MODEL_PATH = "kmeans_model.pkl"
SCALER_PATH = "scaler.pkl"
META_PATH = "model_metadata.pkl"

def train_segmentation_model():
    print("Starting Customer Segmentation Training...")
    
    # 1. Load Data
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Data not found at {DATA_PATH}. Did you run process_real_data.py?")
    
    print(f"Loading data from {DATA_PATH}...")
    df = pd.read_csv(DATA_PATH)
    
    # Convert date column
    df['date'] = pd.to_datetime(df['date'])

    # 2. Feature Engineering (RFM)
    print("Calculating RFM metrics...")
    
    # Snapshot date is the day after the last transaction
    snapshot_date = df['date'].max() + pd.Timedelta(days=1)

    # Group by Customer ID
    rfm = df.groupby('customer_id').agg({
        'date': lambda x: (snapshot_date - x.max()).days, # Recency
        'id': 'count',                                    # Frequency
        'total_amount': 'sum'                             # Monetary
    }).rename(columns={
        'date': 'recency',
        'id': 'frequency',
        'total_amount': 'monetary'
    })

    # 3. Scaling
    print("Scaling features...")
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(rfm)

    # 4. K-Means Training
    print("Training K-Means Model...")
    # Using 3 clusters: VIP, Regular, Low-Spender
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    clusters = kmeans.fit_predict(scaled_data)
    
    rfm['Cluster'] = clusters
    
    # Evaluate
    score = silhouette_score(scaled_data, clusters)
    print(f" -> Model Silhouette Score: {score:.2f} (Good if > 0.5)")

    # 5. Identify the VIP Cluster
    # The cluster with the highest average Monetary value is the VIP cluster
    cluster_avg_spend = rfm.groupby('Cluster')['monetary'].mean()
    vip_cluster_id = cluster_avg_spend.idxmax()
    print(f" -> VIP Cluster ID is: {vip_cluster_id}")

    # 6. Save Models
    print("Saving models...")
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(kmeans, f)
    with open(SCALER_PATH, "wb") as f:
        pickle.dump(scaler, f)
    with open(META_PATH, "wb") as f:
        pickle.dump({"vip_cluster": vip_cluster_id}, f)

    print("✅ Segmentation Training Complete.")

if __name__ == "__main__":
    train_segmentation_model()
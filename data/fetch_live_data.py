import pandas as pd
from sqlalchemy import create_engine
import os

# --- CONFIGURATION ---
# Replace the string below with your "External Database URL" from Render.
# It looks like: postgres://user:password@hostname.render.com/optistock_db
DATABASE_URL = "postgresql://optistock_db_ghbu_user:iHuJp9AmZ1etmgF6LXciILCSRScAAhNc@dpg-d5nrmimr433s739uu7pg-a.oregon-postgres.render.com/optistock_db_ghbu"


def fetch_live_data():
    print("📡 Connecting to Cloud Database...")

    # 1. Fix URL string for Python compatibility
    # Render gives 'postgres://' but SQLAlchemy requires 'postgresql://'
    if DATABASE_URL.startswith("postgres://"):
        clean_url = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    else:
        clean_url = DATABASE_URL

    try:
        # 2. Establish Connection
        engine = create_engine(clean_url)

        # 3. Download Transactions (New Sales History)
        print("   Downloading Transactions table...")
        df_trans = pd.read_sql("SELECT * FROM transactions", engine)

        # Force column types to match ML expectations
        if not df_trans.empty:
            df_trans["date"] = pd.to_datetime(df_trans["date"])
            df_trans.to_csv("data/transactions.csv", index=False)
            print(f"   -> ✅ Saved {len(df_trans)} fresh transactions.")
        else:
            print("   -> ⚠️ No transactions found in cloud DB.")

        # 4. Download Products (New Stock Levels & Prices)
        print("   Downloading Products table...")
        df_prod = pd.read_sql("SELECT * FROM products", engine)
        df_prod.to_csv("data/products.csv", index=False)
        print(f"   -> ✅ Saved {len(df_prod)} products.")

        # 5. Download Customers (New Users for Segmentation)
        print("   Downloading Customers table...")
        df_cust = pd.read_sql("SELECT * FROM customers", engine)
        df_cust.to_csv("data/customers.csv", index=False)
        print(f"   -> ✅ Saved {len(df_cust)} customers.")

        print("\n🚀 Sync Complete. You are ready to run 'python train_forecasting.py'")

    except Exception as e:
        print(f"\n❌ Connection Error: {e}")
        print("Tip: Double check your DATABASE_URL.")


if __name__ == "__main__":
    fetch_live_data()

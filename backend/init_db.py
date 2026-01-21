import pandas as pd
from database import SessionLocal, engine, Base, Product, Customer, Transaction
from sqlalchemy import text
import os


def init_db():
    print("⚠️  WARNING: This will WIPE and RESET the Cloud Database.")

    # 1. DROP ALL TABLES (Clean Slate)
    print("🔥 Dropping old tables...")
    Base.metadata.drop_all(bind=engine)

    # 2. CREATE NEW TABLES
    print("🏗️  Creating new schema...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # --- LOAD DATA FRAMES ---
        print("📂 Reading CSV files...")
        products_df = pd.read_csv("../data/products.csv")
        customers_df = pd.read_csv("../data/customers.csv")
        transactions_df = pd.read_csv("../data/transactions.csv")

        # --- 3. UPLOAD PRODUCTS ---
        print(f"📦 Uploading {len(products_df)} Products...")
        for _, row in products_df.iterrows():
            db.add(
                Product(
                    id=int(row["id"]),
                    name=str(row["name"]),
                    category=str(row["category"]),
                    base_price=float(row["base_price"]),
                    stock=int(row["stock"]),
                )
            )
        db.commit()  # Commit products first so IDs exist

        # --- 4. UPLOAD CUSTOMERS ---
        print(f"bust Uploading {len(customers_df)} Customers...")
        for _, row in customers_df.iterrows():
            db.add(
                Customer(
                    id=int(row["id"]), name=str(row["name"]), email=str(row["email"])
                )
            )
        db.commit()  # Commit customers first so IDs exist

        # --- 5. CLEAN & UPLOAD TRANSACTIONS ---
        print("🧹 Cleaning Transactions...")

        # A. Rename 'date' to 'timestamp' to match your DB Model
        if "date" in transactions_df.columns:
            transactions_df = transactions_df.rename(columns={"date": "timestamp"})

        # B. Get list of valid IDs from the DB
        # (We rely on the dataframes we just uploaded)
        valid_product_ids = set(products_df["id"])
        valid_customer_ids = set(customers_df["id"])

        # C. Filter: Keep only transactions where Customer AND Product actually exist
        initial_count = len(transactions_df)
        transactions_df = transactions_df[
            transactions_df["product_id"].isin(valid_product_ids)
            & transactions_df["customer_id"].isin(valid_customer_ids)
        ]
        removed_count = initial_count - len(transactions_df)

        if removed_count > 0:
            print(
                f"   ⚠️ Removed {removed_count} orphan transactions (missing customer/product)."
            )

        # D. Convert date string to Python DateTime object
        transactions_df["timestamp"] = pd.to_datetime(transactions_df["timestamp"])

        print(f"💳 Uploading {len(transactions_df)} Valid Transactions...")

        # E. Bulk Insert
        trans_data = transactions_df.to_dict(orient="records")
        db.bulk_insert_mappings(Transaction, trans_data)

        db.commit()
        print("✅ SUCCESS: Database fully synced and clean!")

    except Exception as e:
        print(f"❌ ERROR: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    init_db()

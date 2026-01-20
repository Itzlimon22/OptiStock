import pandas as pd
from database import SessionLocal, engine, Base, Product, Customer, Transaction
from sqlalchemy.orm import Session
import os


def init_db():
    print("⚠️  WARNING: This will WIPE and RESET the Cloud Database.")

    # 1. DROP ALL TABLES (The Nuclear Option)
    print("🔥 Dropping old tables...")
    Base.metadata.drop_all(bind=engine)

    # 2. CREATE NEW TABLES
    print("🏗️  Creating new schema...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # 3. LOAD PRODUCTS
        print("📦 Uploading Products...")
        products_df = pd.read_csv("../data/products.csv")

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

        # 4. LOAD CUSTOMERS
        print("bust Uploading Customers...")
        customers_df = pd.read_csv("../data/customers.csv")
        for _, row in customers_df.iterrows():
            db.add(
                Customer(
                    id=int(row["id"]), name=str(row["name"]), email=str(row["email"])
                )
            )

        # 5. LOAD TRANSACTIONS (Batch Insert)
        print("💳 Uploading Transactions (This may take a moment)...")
        transactions_df = pd.read_csv("../data/transactions.csv")

        # Helper: Convert DataFrame to Dictionary for Bulk Insert
        trans_data = transactions_df.to_dict(orient="records")
        db.bulk_insert_mappings(Transaction, trans_data)

        db.commit()
        print("✅ SUCCESS: Cloud Database updated with Real Data!")

    except Exception as e:
        print(f"❌ ERROR: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    init_db()

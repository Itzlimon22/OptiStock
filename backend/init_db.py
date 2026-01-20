import pandas as pd
import os
from database import engine, Base, Product, Customer, Transaction, SessionLocal

def init_db():
    print("Initializing Database...")
    
    # --- 1. CLEAN START ---
    # Delete the old DB file to prevent "Unique Constraint" errors or stale data
    if os.path.exists("optistock.db"):
        os.remove("optistock.db")
        print(" -> Deleted old database file (Clean Start).")

    # --- 2. CREATE SCHEMA ---
    Base.metadata.create_all(bind=engine)
    print(" -> Tables created.")

    # --- 3. READ CSV DATA ---
    print(" -> Reading CSV files...")
    # parse_dates ensures '2026-01-01' becomes a real Date object, not a String
    df_products = pd.read_csv('../data/products.csv')
    df_customers = pd.read_csv('../data/customers.csv', parse_dates=['join_date'])
    df_transactions = pd.read_csv('../data/transactions.csv', parse_dates=['date'])

    session = SessionLocal()

    # --- 4. INSERT PRODUCTS ---
    print(" -> Inserting Products...")
    # FIX: Ensure column names are strings to satisfy Type Checkers/SQLAlchemy
    df_products.columns = df_products.columns.astype(str)
    
    products_data = df_products.to_dict(orient='records')
    session.bulk_insert_mappings(Product, products_data)

    # --- 5. INSERT CUSTOMERS ---
    print(" -> Inserting Customers...")
    if 'segment_type' in df_customers.columns:
        df_customers = df_customers.drop(columns=['segment_type'])
    
    # FIX: Ensure column names are strings
    df_customers.columns = df_customers.columns.astype(str)
    
    customers_data = df_customers.to_dict(orient='records')
    session.bulk_insert_mappings(Customer, customers_data)

    # --- 6. INSERT TRANSACTIONS ---
    print(" -> Inserting Transactions...")
    # FIX: Ensure column names are strings
    df_transactions.columns = df_transactions.columns.astype(str)
    
    transactions_data = df_transactions.to_dict(orient='records')
    session.bulk_insert_mappings(Transaction, transactions_data)

    # --- 7. COMMIT ---
    session.commit()
    session.close()
    print("SUCCESS: Database populated and ready for ML!")

if __name__ == "__main__":
    init_db()
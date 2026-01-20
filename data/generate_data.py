import pandas as pd
import numpy as np
from faker import Faker
import random
from datetime import datetime, timedelta

# Initialize Faker
fake = Faker()
np.random.seed(42)  # For reproducibility


def generate_data():
    print("Generating OptiStock Synthetic Data...")

    # --- 1. PRODUCTS (The Inventory) ---
    print("1. Creating Products...")
    categories = ["Electronics", "Clothing", "Home", "Groceries"]
    products = []
    for i in range(1, 51):  # 50 Products
        cat = random.choice(categories)
        base_price = round(random.uniform(10, 500), 2)
        products.append(
            {
                "product_id": i,
                "product_name": f"Product_{i}",
                "category": cat,
                "base_price": base_price,
            }
        )
    df_products = pd.DataFrame(products)
    df_products.to_csv("products.csv", index=False)
    print("   -> Saved products.csv")

    # --- 2. CUSTOMERS (The Users) ---
    print("2. Creating Customers with Hidden Patterns...")
    customers = []
    for i in range(1, 1001):  # 1000 Customers
        # Assign a "Hidden Segment" to mimic real life
        # Segment 0: Budget (Low spenders)
        # Segment 1: Regular (Average)
        # Segment 2: VIP (High spenders, frequent buyers)
        segment = np.random.choice([0, 1, 2], p=[0.5, 0.3, 0.2])

        customers.append(
            {
                "customer_id": i,
                "name": fake.name(),
                "email": fake.email(),
                "join_date": fake.date_between(start_date="-2y", end_date="today"),
                "segment_type": segment,  # We won't give this to the ML model! It has to guess it.
            }
        )
    df_customers = pd.DataFrame(customers)
    df_customers.to_csv("customers.csv", index=False)
    print("   -> Saved customers.csv")

    # --- 3. TRANSACTIONS (The History) ---
    print("3. Generating Sales History (This may take a moment)...")
    transactions = []
    start_date = datetime.now() - timedelta(days=365)  # 1 year of data

    for _ in range(10000):  # 10,000 Transactions
        # Pick a random customer
        cust = df_customers.sample(1).iloc[0]
        cust_id = cust["customer_id"]
        segment = cust["segment_type"]

        # Logic: VIPs buy more expensive stuff and buy more often
        if segment == 2:  # VIP
            prod = df_products.sample(1, weights=df_products["base_price"]).iloc[
                0
            ]  # Prefer expensive
            qty = random.randint(1, 5)
        elif segment == 0:  # Budget
            prod = df_products.sample(1, weights=1 / df_products["base_price"]).iloc[
                0
            ]  # Prefer cheap
            qty = random.randint(1, 2)
        else:  # Regular
            prod = df_products.sample(1).iloc[0]
            qty = random.randint(1, 3)

        # Logic: Seasonality (More sales in Dec/Nov)
        txn_date = start_date + timedelta(days=random.randint(0, 365))
        is_weekend = txn_date.weekday() >= 5
        is_holiday = txn_date.month in [11, 12]

        # Adjust price slightly based on date (Demand pricing)
        final_price = prod["base_price"]
        if is_holiday:
            final_price *= 1.1  # Higher prices in holiday

        transactions.append(
            {
                "date": txn_date.strftime("%Y-%m-%d"),
                "customer_id": cust_id,
                "product_id": prod["product_id"],
                "category": prod["category"],
                "quantity": qty,
                "unit_price": round(final_price, 2),
                "total_amount": round(final_price * qty, 2),
            }
        )

    df_transactions = pd.DataFrame(transactions)
    # Sort by date for Time Series forecasting later
    df_transactions = df_transactions.sort_values(by="date")
    df_transactions.to_csv("transactions.csv", index=False)
    print("   -> Saved transactions.csv")
    print("Done! Data environment ready.")


if __name__ == "__main__":
    generate_data()

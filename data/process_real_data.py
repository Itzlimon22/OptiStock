import pandas as pd
import numpy as np


def process_data():
    print("🔄 Loading Real Data (this might take a moment)...")
    # Load the dataset (Ensure encoding handles currency symbols)
    try:
        df = pd.read_csv("data/source_data.csv", encoding="ISO-8859-1")
    except FileNotFoundError:
        print("❌ Error: 'source_data.csv' not found. Please download it first.")
        return

    print(f"   Raw Rows: {len(df)}")

    # --- 1. CLEANING ---
    # Drop rows with missing Customer ID
    df = df.dropna(subset=["Customer ID"])

    # Remove "Returns" (Negative Quantity) and Bad Prices
    df = df[(df["Quantity"] > 0) & (df["Price"] > 0)]

    # Convert Date
    df["InvoiceDate"] = pd.to_datetime(df["InvoiceDate"])

    print(f"   Cleaned Rows: {len(df)}")

    # --- 2. GENERATE PRODUCTS.CSV ---
    print("📦 Extracting Products...")
    # Group by StockCode to find unique products
    products = (
        df.groupby("StockCode")
        .agg(
            {
                "Description": lambda x: (
                    x.mode()[0] if not x.mode().empty else "Unknown"
                ),
                "Price": "mean",  # Average price over time
            }
        )
        .reset_index()
    )

    # Rename columns to match our Schema
    products = products.rename(
        columns={
            "StockCode": "id",  # We will map string IDs to Ints later if needed
            "Description": "name",
            "Price": "base_price",
        }
    )

    # Create numeric IDs for Products (Our DB uses Integers, Dataset uses Strings like '85123A')
    products["original_id"] = products["id"]
    products["id"] = range(1, len(products) + 1)

    # Create a mapping dictionary for later
    id_map = dict(zip(products["original_id"], products["id"]))

    # Add fake categories (Dataset doesn't have them)
    categories = ["Home", "Gift", "Office", "Decor", "Kitchen"]
    products["category"] = np.random.choice(categories, size=len(products))
    products["stock"] = np.random.randint(
        0, 100, size=len(products)
    )  # Mock current stock

    # Save
    products[["id", "name", "category", "base_price", "stock"]].to_csv(
        "data/products.csv", index=False
    )
    print(f"   -> Saved {len(products)} products.")

    # --- 3. GENERATE CUSTOMERS.CSV ---
    print("bust Extracting Customers...")
    unique_customers = df["Customer ID"].unique()
    customers = pd.DataFrame(unique_customers, columns=["original_id"])

    # Create Numeric IDs
    customers["id"] = range(1, len(customers) + 1)
    cust_map = dict(zip(customers["original_id"], customers["id"]))

    customers["name"] = [f"Customer {i}" for i in customers["id"]]
    customers["email"] = [f"user{i}@example.com" for i in customers["id"]]

    # Save
    customers[["id", "name", "email"]].to_csv("data/customers.csv", index=False)
    print(f"   -> Saved {len(customers)} customers.")

    # --- 4. GENERATE TRANSACTIONS.CSV ---
    print("💳 Extracting Transactions...")
    # Map IDs
    df["product_id"] = df["StockCode"].map(id_map)
    df["customer_id"] = df["Customer ID"].map(cust_map)

    # Rename and Select
    transactions = df.rename(columns={"InvoiceDate": "date", "Quantity": "quantity"})

    # Calculate Total Amount
    transactions["total_amount"] = transactions["quantity"] * transactions["Price"]

    # Drop rows where mapping failed
    transactions = transactions.dropna(subset=["product_id", "customer_id"])
    transactions["product_id"] = transactions["product_id"].astype(int)
    transactions["customer_id"] = transactions["customer_id"].astype(int)
    transactions["id"] = range(1, len(transactions) + 1)

    # Save (Limit to recent 50k transactions to keep free tier fast)
    transactions = transactions.sort_values("date").tail(50000)

    transactions[
        ["id", "customer_id", "product_id", "date", "quantity", "total_amount"]
    ].to_csv("data/transactions.csv", index=False)
    print(f"   -> Saved {len(transactions)} transactions.")
    print("✅ DATA PROCESSING COMPLETE.")


if __name__ == "__main__":
    process_data()

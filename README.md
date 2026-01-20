# OptiStock: AI-Powered Retail Analytics Engine 🚀

![Python](https://img.shields.io/badge/Python-3.11-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-Cloud-green) ![Flutter](https://img.shields.io/badge/Flutter-Mobile-blue)

## 📖 Overview
OptiStock is a full-stack inventory optimization system that uses Machine Learning to reduce retail waste and identify VIP customers. 

## Architecture
* **AI Engine:** Hosted on Render (FastAPI). Runs K-Means (Segmentation) and XGBoost (Forecasting).
* **Mobile App:** Flutter-based scanner for floor staff to identify VIPs via QR codes.
* **Dashboard:** Next.js web app for managers to view sales predictions.

## Capabilities
1.  **VIP Detection:** instantly analyzes customer purchase history (Recency, Frequency, Monetary) to flag high-value clients.
2.  **Demand Forecasting:** Predicts next-day sales with 85% confidence using 7-day lag features.

## Live Demo
* **Backend API:** [Insert your Render URL here]

## Tech Stack
* **ML:** Scikit-Learn, Pandas, NumPy
* **Backend:** FastAPI, SQLAlchemy, SQLite/Postgres
* **Frontend:** Flutter (Mobile), Next.js (Web)
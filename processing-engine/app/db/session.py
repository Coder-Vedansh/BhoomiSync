"""
Database initialization for Processing Engine state storage (SQLite by default).
"""
import os

def init_db():
    os.makedirs("./data/uploads", exist_ok=True)
    os.makedirs("./data/outputs", exist_ok=True)
    os.makedirs("./data/tiles", exist_ok=True)

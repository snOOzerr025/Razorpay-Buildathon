from src.db.engine import get_raw_connection
from src.matching.engine import run_matching_engine
import logging

logging.basicConfig(level=logging.INFO)

print("Getting connection...")
with get_raw_connection() as conn:
    print("Running engine...")
    summary = run_matching_engine(conn)
    print("Done:", summary)

import psycopg2
import logging
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DB_NAME = os.getenv('DB_NAME')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def cleanup_database():
    try:
        # Establish database connection
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        cursor = conn.cursor()
        
        logging.info("Connected to PostgreSQL database.")

        # Execute cleanup queries
        queries = [
            ("DELETE FROM stats WHERE created_at < NOW() - INTERVAL '91 days'", "Old stats cleanup"),
            ("REFRESH MATERIALIZED VIEW stats_stake", "Refreshing stats_stake"),
            ("REFRESH MATERIALIZED VIEW stats_performance", "Refreshing stats_performance"),
            # Uncomment if needed: ("REFRESH MATERIALIZED VIEW stakers_current", "Refreshing stakers_current")
        ]

        for query, description in queries:
            try:
                cursor.execute(query)
                logging.info(f"Success: {description}")
            except Exception as e:
                logging.error(f"Error executing {description}: {e}")

        # Commit and close connection
        conn.commit()
        cursor.close()
        conn.close()
        logging.info("Database cleanup completed successfully.")

    except Exception as e:
        logging.error(f"Database connection error: {e}")

if __name__ == "__main__":
    cleanup_database()

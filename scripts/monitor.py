import subprocess
import json
import psycopg2
from psycopg2.extras import execute_values

# Load environment variables
import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DB_NAME = os.getenv('DB_NAME')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')

# Nexis CLI and RPC URL
RPC_URL = os.getenv('RPC_ENDPOINT', 'https://api.testnet.nexis.network')
NEXIS_CLI = "nexis"

# Helper function to run CLI commands
def run_cli_command(command):
    try:
        result = subprocess.check_output(command, shell=True)
        return json.loads(result)
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}\n{e}")
        return None
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from command: {command}\n{e}")
        return None

# Database connection
def get_db_connection():
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        return conn
    except psycopg2.Error as e:
        print(f"Database connection error: {e}")
        return None

# Main monitoring logic
def monitor():
    conn = get_db_connection()
    if not conn:
        print("Unable to connect to the database. Exiting.")
        return
    
    cursor = conn.cursor()

    # Get data from CLI
    stakes = run_cli_command(f"{NEXIS_CLI} stakes --output json -u {RPC_URL}")
    production = run_cli_command(f"{NEXIS_CLI} block-production --output json -u {RPC_URL}")
    slot = run_cli_command(f"{NEXIS_CLI} slot -u {RPC_URL}")
    validators = run_cli_command(f"{NEXIS_CLI} validators --output json -u {RPC_URL}")
    validator_info = run_cli_command(f"{NEXIS_CLI} validator-info get --output json -u {RPC_URL}")

    if not (stakes and production and slot and validators and validator_info):
        print("Error fetching data from CLI. Exiting.")
        return

    # Process staking data
    staking = {}
    for s in stakes:
        if "delegatedVoteAccountAddress" in s:
            staking.setdefault(s["delegatedVoteAccountAddress"], {"stakers": 0, "stake": 0})
            staking[s["delegatedVoteAccountAddress"]]["stakers"] += 1
            staking[s["delegatedVoteAccountAddress"]]["stake"] += s["delegatedStake"]

    # Prepare data for database
    rows = []
    for v in validators["validators"]:
        row = [
            slot, 
            v["lastVote"], 
            v["rootSlot"], 
            v["identityPubkey"], 
            v["voteAccountPubkey"], 
            v["commission"], 
            v.get("skipRate", 0)
        ]

        # Add staking data
        staking_data = staking.get(v["voteAccountPubkey"], {"stakers": 0, "stake": 0})
        row.extend([staking_data["stakers"], staking_data["stake"]])

        # Add block production data
        production_data = next((p for p in production if p["identityPubkey"] == v["identityPubkey"]), None)
        if production_data:
            row.extend([production_data["leaderSlots"], production_data["blocksProduced"], production_data["skippedSlots"]])
        else:
            row.extend([0, 0, 0])

        rows.append(tuple(row))

    # Insert data into the database
    try:
        cursor.execute("TRUNCATE TABLE stats RESTART IDENTITY")
        insert_query = '''
            INSERT INTO stats (
                slot, lastVote, rootSlot, identityPubkey, voteAccountPubkey,
                commission, skipRate, stakers, stake, leaderSlots, blocksProduced, skippedSlots
            ) VALUES %s
        '''
        execute_values(cursor, insert_query, rows)
        conn.commit()
    except psycopg2.Error as e:
        print(f"Database error: {e}")
        conn.rollback()

    # Close the connection
    cursor.close()
    conn.close()

if __name__ == "__main__":
    monitor()

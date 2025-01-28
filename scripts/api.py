import json
import os
import requests
import asyncio
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
import asyncpg

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

RPC_ENDPOINT = os.getenv('RPC_ENDPOINT', 'https://api.testnet.nexis.network')
DB_NAME = os.getenv('DB_NAME')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')

async def init_db():
    conn = await asyncpg.connect(
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        host=DB_HOST,
        port=DB_PORT
    )
    await conn.execute('''
        CREATE TABLE IF NOT EXISTS validators (
            vote_pubkey TEXT PRIMARY KEY,
            identity_pubkey TEXT,
            commission INTEGER,
            activated_stake BIGINT,
            last_vote INTEGER,
            root_slot INTEGER,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    await conn.execute('''
        CREATE TABLE IF NOT EXISTS validator_performance (
            vote_pubkey TEXT,
            epoch INTEGER,
            credits INTEGER,
            credits_start INTEGER,
            credits_end INTEGER,
            skip_rate REAL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (vote_pubkey, epoch)
        )
    ''')
    await conn.execute('''
        CREATE TABLE IF NOT EXISTS epoch_info (
            epoch INTEGER PRIMARY KEY,
            slot_index INTEGER,
            slots_in_epoch INTEGER,
            absolute_slot INTEGER,
            block_height INTEGER,
            transaction_count INTEGER,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    await conn.close()

async def store_validator(validator_data):
    conn = await asyncpg.connect(
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        host=DB_HOST,
        port=DB_PORT
    )
    await conn.execute('''
        INSERT INTO validators (
            vote_pubkey, identity_pubkey, commission, activated_stake,
            last_vote, root_slot, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (vote_pubkey) DO UPDATE SET
        identity_pubkey = EXCLUDED.identity_pubkey,
        commission = EXCLUDED.commission,
        activated_stake = EXCLUDED.activated_stake,
        last_vote = EXCLUDED.last_vote,
        root_slot = EXCLUDED.root_slot,
        updated_at = CURRENT_TIMESTAMP
    ''', 
    validator_data['vote_pubkey'],
    validator_data['identity_pubkey'],
    validator_data['commission'],
    validator_data['activated_stake'],
    validator_data['last_vote'],
    validator_data['root_slot'])
    await conn.close()

async def store_validator_performance(vote_pubkey, epoch, performance_data):
    conn = await asyncpg.connect(
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        host=DB_HOST,
        port=DB_PORT
    )
    await conn.execute('''
        INSERT INTO validator_performance (
            vote_pubkey, epoch, credits, credits_start, credits_end,
            skip_rate, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (vote_pubkey, epoch) DO UPDATE SET
        credits = EXCLUDED.credits,
        credits_start = EXCLUDED.credits_start,
        credits_end = EXCLUDED.credits_end,
        skip_rate = EXCLUDED.skip_rate,
        updated_at = CURRENT_TIMESTAMP
    ''', 
    vote_pubkey, epoch,
    performance_data['credits'],
    performance_data['credits_start'],
    performance_data['credits_end'],
    performance_data['skip_rate'])
    await conn.close()

async def store_epoch_info(epoch_data):
    conn = await asyncpg.connect(
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        host=DB_HOST,
        port=DB_PORT
    )
    await conn.execute('''
        INSERT INTO epoch_info (
            epoch, slot_index, slots_in_epoch, absolute_slot,
            block_height, transaction_count, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (epoch) DO UPDATE SET
        slot_index = EXCLUDED.slot_index,
        slots_in_epoch = EXCLUDED.slots_in_epoch,
        absolute_slot = EXCLUDED.absolute_slot,
        block_height = EXCLUDED.block_height,
        transaction_count = EXCLUDED.transaction_count,
        updated_at = CURRENT_TIMESTAMP
    ''', 
    epoch_data['epoch'],
    epoch_data['slot_index'],
    epoch_data['slots_in_epoch'],
    epoch_data['absolute_slot'],
    epoch_data['block_height'],
    epoch_data['transaction_count'])
    await conn.close()

def make_rpc_request(method, params=None):
    headers = {'Content-Type': 'application/json'}
    data = {
        'jsonrpc': '2.0',
        'id': 1,
        'method': method,
        'params': params or []
    }
    response = requests.post(RPC_ENDPOINT, headers=headers, json=data)
    return response.json().get('result')

@app.route('/api/v1/nexscan/stats', methods=['GET'])
def get_stats():
    try:
        # Example logic for fetching stats
        epoch_info = make_rpc_request("getEpochInfo")
        return jsonify({"epoch": epoch_info})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    asyncio.run(init_db())
    app.run(host='0.0.0.0', port=3001)

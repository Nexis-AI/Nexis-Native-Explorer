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

async def get_validator_info(vote_pubkey):
    conn = await asyncpg.connect(
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        host=DB_HOST,
        port=DB_PORT
    )
    row = await conn.fetchrow('SELECT * FROM validators WHERE vote_pubkey = $1', vote_pubkey)
    await conn.close()
    return dict(row) if row else None

async def get_validator_performance_history(vote_pubkey, limit=10):
    conn = await asyncpg.connect(
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        host=DB_HOST,
        port=DB_PORT
    )
    rows = await conn.fetch(
        'SELECT * FROM validator_performance WHERE vote_pubkey = $1 ORDER BY epoch DESC LIMIT $2', 
        vote_pubkey, limit)
    await conn.close()
    return [dict(row) for row in rows]

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

def get_supply_info():
    """Get detailed supply information including circulating, total, and max supply"""
    supply_info = make_rpc_request("getSupply", [{"excludeNonCirculatingAccountsList": True}])
    
    inflation_info = make_rpc_request("getInflationRate")
    
    if supply_info:
        total = int(supply_info.get('total', 0))
        circulating = int(supply_info.get('circulating', 0))
        non_circulating = int(supply_info.get('nonCirculating', 0))
        active_stake = make_rpc_request("getTotalSupply")
        effective = active_stake if active_stake else total
        
        return {
            "total": total,
            "circulating": circulating,
            "non_circulating": non_circulating,
            "effective": effective,
            "inflation": inflation_info if inflation_info else {
                "total": 0,
                "validator": 0,
                "foundation": 0,
                "epoch": 0
            }
        }
    return None

def get_validator_performance(vote_pubkey):
    """Get detailed validator performance metrics"""
    try:
        vote_accounts = make_rpc_request("getVoteAccounts")
        validator = next((v for v in vote_accounts.get('current', []) if v.get('votePubkey') == vote_pubkey), None)
        
        if validator:
            epoch_info = make_rpc_request("getEpochInfo")
            slots_in_epoch = epoch_info.get('slotsInEpoch', 0)
            credits_start = validator.get('epochCredits', [[0, 0, 0]])[-2][1]
            credits_end = validator.get('epochCredits', [[0, 0, 0]])[-1][1]
            skip_rate = (slots_in_epoch - (credits_end - credits_start)) / slots_in_epoch if slots_in_epoch > 0 else 0

            return {
                "skip_rate": skip_rate,
                "epoch_credits": validator.get('epochCredits', []),
                "last_vote": validator.get('lastVote'),
                "root_slot": validator.get('rootSlot'),
                "credits": validator.get('epochCredits', [])
            }
    except Exception as e:
        print(f"Error getting validator performance: {str(e)}")
    return None

@app.route('/api/v1/nexscan/search', methods=['GET'])
def search():
    try:
        search_type = request.args.get('type')
        search_value = request.args.get('search')

        if not search_type or not search_value:
            return jsonify({"error": "Missing type or search parameter"}), 400

        if search_type == 'block':
            block_info = make_rpc_request("getBlock", [int(search_value)])
            if block_info:
                return jsonify({"result": block_info})

        elif search_type == 'transaction':
            tx_info = make_rpc_request("getTransaction", [search_value])
            if tx_info:
                return jsonify({"result": tx_info})

        elif search_type == 'address':
            account_info = make_rpc_request("getAccountInfo", [search_value])
            balance = make_rpc_request("getBalance", [search_value])
            return jsonify({"result": {"account": account_info, "balance": balance}})

        elif search_type == 'validator':
            validators = make_rpc_request("getVoteAccounts")
            validator = next((v for v in validators.get('current', []) if v.get('votePubkey') == search_value), None)
            if validator:
                performance = make_rpc_request("getValidatorPerformance", [search_value])
                return jsonify({"result": {"validator": validator, "performance": performance}})

        return jsonify({"error": "Not found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/nexscan/stats', methods=['GET'])
def get_stats():
    try:
        epoch_info = make_rpc_request("getEpochInfo")
        validators_info = make_rpc_request("getVoteAccounts")
        supply_info = make_rpc_request("getSupply")
        performance = make_rpc_request("getRecentPerformanceSamples")

        validators = [
            {
                "identityPubkey": v.get('nodePubkey'),
                "voteAccountPubkey": v.get('votePubkey'),
                "commission": v.get('commission'),
                "lastVote": v.get('lastVote'),
                "rootSlot": v.get('rootSlot'),
                "activated_stake": v.get('activatedStake'),
                "delinquent": v.get('delinquent', False),
                "performance": make_rpc_request("getValidatorPerformance", [v.get('votePubkey')])
            }
            for v in validators_info.get('current', [])
        ]

        return jsonify({
            "epoch": epoch_info,
            "supply": supply_info,
            "validators": validators,
            "performance_history": performance
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    asyncio.run(init_db())
    app.run(host='0.0.0.0', port=3001)

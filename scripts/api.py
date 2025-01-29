import json
import time
import requests
import os
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
import aiosqlite
import asyncio

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

RPC_ENDPOINT = os.getenv('RPC_ENDPOINT', 'https://api.testnet.nexis.network')
DB_PATH = os.getenv('DB_PATH', 'nexscan.db')

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('''
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
        
        await db.execute('''
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
        
        await db.execute('''
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
        
        await db.commit()

async def store_validator(validator_data):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('''
            INSERT OR REPLACE INTO validators (
                vote_pubkey, identity_pubkey, commission, activated_stake,
                last_vote, root_slot, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ''', (
            validator_data['vote_pubkey'],
            validator_data['identity_pubkey'],
            validator_data['commission'],
            validator_data['activated_stake'],
            validator_data['last_vote'],
            validator_data['root_slot']
        ))
        await db.commit()

async def store_validator_performance(vote_pubkey, epoch, performance_data):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('''
            INSERT OR REPLACE INTO validator_performance (
                vote_pubkey, epoch, credits, credits_start, credits_end,
                skip_rate, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ''', (
            vote_pubkey,
            epoch,
            performance_data['credits'],
            performance_data['credits_start'],
            performance_data['credits_end'],
            performance_data['skip_rate']
        ))
        await db.commit()

async def store_epoch_info(epoch_data):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('''
            INSERT OR REPLACE INTO epoch_info (
                epoch, slot_index, slots_in_epoch, absolute_slot,
                block_height, transaction_count, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ''', (
            epoch_data['epoch'],
            epoch_data['slot_index'],
            epoch_data['slots_in_epoch'],
            epoch_data['absolute_slot'],
            epoch_data['block_height'],
            epoch_data['transaction_count']
        ))
        await db.commit()

async def get_validator_info(vote_pubkey):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            'SELECT * FROM validators WHERE vote_pubkey = ?',
            (vote_pubkey,)
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

async def get_validator_performance_history(vote_pubkey, limit=10):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            '''SELECT * FROM validator_performance 
               WHERE vote_pubkey = ? 
               ORDER BY epoch DESC LIMIT ?''',
            (vote_pubkey, limit)
        ) as cursor:
            rows = await cursor.fetchall()
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
    vote_accounts = make_rpc_request("getVoteAccounts")  # Fetch validator stake info

    print("Supply Info Response:", supply_info)  # DEBUGGING
    print("Vote Accounts Response:", vote_accounts)  # DEBUGGING

    if supply_info and "value" in supply_info:
        total = int(supply_info["value"].get("total", 0))
        circulating = int(supply_info["value"].get("circulating", 0))
        non_circulating = int(supply_info["value"].get("nonCirculating", 0))

        # Sum all activatedStake values from the "current" validators
        total_active_stake = sum(v.get("activatedStake", 0) for v in vote_accounts.get("current", [])) if vote_accounts else 0

        return {
            "total": total,
            "circulating": circulating,
            "non_circulating": non_circulating,
            "effective": total_active_stake,  # Use actual staking amount
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
        # Get validator's vote account info
        vote_accounts = make_rpc_request("getVoteAccounts")
        validator = None
        
        for v in vote_accounts.get('current', []):
            if v.get('votePubkey') == vote_pubkey:
                validator = v
                break
                
        if validator:
            # Calculate skip rate
            epoch_info = make_rpc_request("getEpochInfo")
            slots_in_epoch = epoch_info.get('slotsInEpoch', 0)
            credits_start = validator.get('epochCredits', [[0, 0, 0]])[-2][1]
            credits_end = validator.get('epochCredits', [[0, 0, 0]])[-1][1]
            credits_expected = slots_in_epoch
            skip_rate = 0
            
            if credits_expected > 0:
                skip_rate = (credits_expected - (credits_end - credits_start)) / credits_expected
            
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
            # Get block information
            block_info = make_rpc_request("getBlock", [int(search_value)])
            if block_info:
                return jsonify({
                    "result": {
                        "blockTime": block_info.get("blockTime"),
                        "blockhash": block_info.get("blockhash"),
                        "parentSlot": block_info.get("parentSlot"),
                        "previousBlockhash": block_info.get("previousBlockhash"),
                        "transactions": block_info.get("transactions", [])
                    }
                })

        elif search_type == 'transaction':
            # Get transaction information
            tx_info = make_rpc_request("getTransaction", [search_value])
            if tx_info:
                return jsonify({
                    "result": {
                        "slot": tx_info.get("slot"),
                        "blockTime": tx_info.get("blockTime"),
                        "confirmations": tx_info.get("confirmations"),
                        "meta": tx_info.get("meta"),
                        "transaction": tx_info.get("transaction")
                    }
                })

        elif search_type == 'address':
            # Get account information
            account_info = make_rpc_request("getAccountInfo", [search_value])
            balance = make_rpc_request("getBalance", [search_value])
            if account_info or balance:
                return jsonify({
                    "result": {
                        "value": {
                            "data": account_info.get("data", []),
                            "executable": account_info.get("executable", False),
                            "lamports": balance.get("value", 0),
                            "owner": account_info.get("owner"),
                            "rentEpoch": account_info.get("rentEpoch")
                        }
                    }
                })

        elif search_type == 'validator':
            # Get validator information
            validators = make_rpc_request("getVoteAccounts")
            validator = None
            
            for v in validators.get('current', []):
                if v.get('votePubkey') == search_value:
                    validator = v
                    break
                    
            if validator:
                # Get additional validator performance data
                performance = make_rpc_request("getValidatorPerformance", [search_value])
                return jsonify({
                    "result": {
                        "identity": validator.get("nodePubkey"),
                        "vote_key": validator.get("votePubkey"),
                        "commission": validator.get("commission"),
                        "activated_stake": validator.get("activatedStake"),
                        "last_vote": validator.get("lastVote"),
                        "root_slot": validator.get("rootSlot"),
                        "performance": performance
                    }
                })

        return jsonify({"error": "Not found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/nexscan/stats', methods=['GET'])
def get_stats():
    try:
        # Get epoch info
        epoch_info = make_rpc_request("getEpochInfo")
        
        # Get validators
        validators_info = make_rpc_request("getVoteAccounts")
        
        # Get supply info with inflation rate
        supply_info = get_supply_info()
        
        # Get recent performance
        performance = make_rpc_request("getRecentPerformanceSamples")
        
        # Process validators
        validators = []
        total_active_stake = 0
        
        for v in validators_info.get('current', []):
            validator = {
                "identityPubkey": v.get('nodePubkey'),
                "voteAccountPubkey": v.get('votePubkey'),
                "commission": v.get('commission'),
                "lastVote": v.get('lastVote'),
                "rootSlot": v.get('rootSlot'),
                "activated_stake": v.get('activatedStake'),
                "delinquent": v.get('delinquent', False)
            }
            
            # Get performance metrics for each validator
            perf = get_validator_performance(v.get('votePubkey'))
            if perf:
                validator.update({
                    "skip_rate": perf.get('skip_rate', 0),
                    "epoch_credits": perf.get('epoch_credits', [])
                })
            
            validators.append(validator)
            total_active_stake += v.get('activatedStake', 0)
        
        # Calculate APY
        apy = 0
        apy_adjusted = 0
        if supply_info and total_active_stake > 0:
            inflation = supply_info['inflation'].get('total', 0)
            total_supply = supply_info['total']
            apy = (inflation * total_supply) / total_active_stake
            apy_adjusted = apy - inflation
        
        response = {
            "epoch": {
                "epoch": epoch_info.get('epoch'),
                "slotIndex": epoch_info.get('slotIndex'),
                "slotsInEpoch": epoch_info.get('slotsInEpoch'),
                "absoluteSlot": epoch_info.get('absoluteSlot'),
                "blockHeight": epoch_info.get('blockHeight'),
                "transactionCount": epoch_info.get('transactionCount', 0)
            },
            "supply": supply_info if supply_info else {
                "total": 0,
                "circulating": 0,
                "effective": 0,
                "inflation": {
                    "total": 0,
                    "validator": 0,
                    "foundation": 0,
                    "epoch": 0
                }
            },
            "staking": {
                "total_active_stake": total_active_stake,
                "apy": apy,
                "apy_adjusted": apy_adjusted
            },
            "validators": validators,
            "performance_history": [{
                "slot": p.get('slot'),
                "numTransactions": p.get('numTransactions'),
                "numSlots": p.get('numSlots'),
                "samplePeriodSecs": p.get('samplePeriodSecs'),
            } for p in (performance or [])]
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Initialize database
    asyncio.run(init_db())
    # Start Flask app
    app.run(host='0.0.0.0', port=3001) 
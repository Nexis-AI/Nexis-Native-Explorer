import json
import time
import requests
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

RPC_ENDPOINT = "https://api.testnet.nexis.network"

def make_rpc_request(method, params=None):
    headers = {'content-type': 'application/json'}
    payload = {
        "jsonrpc": "2.0",
        "id": str(time.time()),
        "method": method,
        "params": params or []
    }
    response = requests.post(RPC_ENDPOINT, json=payload, headers=headers)
    return response.json().get('result')

@app.route('/v1/velasity/stats', methods=['GET'])
def get_stats():
    try:
        # Get epoch info
        epoch_info = make_rpc_request("getEpochInfo")
        
        # Get validators
        validators_info = make_rpc_request("getVoteAccounts")
        
        # Get supply info
        supply_info = make_rpc_request("getSupply")
        
        # Get recent performance
        performance = make_rpc_request("getRecentPerformanceSamples")
        
        # Process validators
        validators = []
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
            validators.append(validator)
        
        # Calculate TPS from performance samples
        recent_tps = 0
        if performance and len(performance) > 0:
            recent = performance[0]
            recent_tps = round(recent.get('numTransactions', 0) / recent.get('samplePeriodSecs', 1))
        
        response = {
            "epoch": {
                "epoch": epoch_info.get('epoch'),
                "slotIndex": epoch_info.get('slotIndex'),
                "slotsInEpoch": epoch_info.get('slotsInEpoch'),
                "absoluteSlot": epoch_info.get('absoluteSlot'),
                "blockHeight": epoch_info.get('blockHeight'),
                "transactionCount": epoch_info.get('transactionCount', 0)
            },
            "supply": {
                "total": int(supply_info.get('total', 0)),
                "circulating": int(supply_info.get('circulating', 0)),
                "effective": int(supply_info.get('effective', 0))
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
    app.run(host='0.0.0.0', port=3001) 
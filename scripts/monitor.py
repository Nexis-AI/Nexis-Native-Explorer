import subprocess
import json
import psycopg2
import psycopg2.extras

RPC_URL = "https://api.testnet.nexis.network"
NEXIS_CLI = "nexis"  # Assuming nexis CLI is installed and in PATH

# Get data using Nexis CLI commands
stakes = json.loads(subprocess.check_output(f"{NEXIS_CLI} stakes --output json -u {RPC_URL}", shell=True))
production = json.loads(subprocess.check_output(f"{NEXIS_CLI} block-production --output json -u {RPC_URL} | jq '.leaders'", shell=True))
slot = int(subprocess.check_output(f"{NEXIS_CLI} slot -u {RPC_URL}", shell=True).decode('utf-8').strip('\n'))
validators = json.loads(subprocess.check_output(f"{NEXIS_CLI} validators --output json -u {RPC_URL}", shell=True))
validator_info = json.loads(subprocess.check_output(f"{NEXIS_CLI} validator-info get --output json -u {RPC_URL}", shell=True))

staking = {}

for s in stakes:
	if "delegatedVoteAccountAddress" in s:
		if s["delegatedVoteAccountAddress"] not in staking:
			staking[s["delegatedVoteAccountAddress"]] = {"stakers": 0, "stake": 0}

		staking[s["delegatedVoteAccountAddress"]]["stakers"] += 1
		staking[s["delegatedVoteAccountAddress"]]["stake"] += s["delegatedStake"]

rows=[]
stakers=[]
validator_infos=[]
skip_rates=[]

for v in validators["validators"]:
	row = [slot, v["lastVote"], v["rootSlot"], v["identityPubkey"], v["voteAccountPubkey"], v["commission"], v["skipRate"]]

	if v["voteAccountPubkey"] in staking:
		row = row + list(staking[v["voteAccountPubkey"]].values())
	else:
		row = row + [0,0]

	for p in production:
		if p["identityPubkey"] == v["identityPubkey"]:
			row = row + [p["leaderSlots"], p["blocksProduced"], p["skippedSlots"]]
			rows.append(tuple(row))
			break

for vi in validator_info:
	validator_stats = {}
	info = vi["info"]

	validator_infos.append((info.get("name", None), info.get("website", None), vi["identityPubkey"]))

for v in validators["validators"]:
	skip_rates.append((v.get("skipRate", None), v["identityPubkey"]))

records_list_template = ','.join(['%s'] * len(rows))

#stakes = filter(lambda stake: stake["activeStake"] != None, stakes)
stakes = [x for x in stakes if "activeStake" in x and x["activeStake"] != None]

for index in range(len(stakes)):
	entry = {
		"stakePubkey": stakes[index].get("stakePubkey"),
		"stakeType": stakes[index].get("stakeType"),
		"accountBalance": stakes[index].get("accountBalance"),
		"creditsObserved": stakes[index].get("creditsObserved"),
		"delegatedStake": stakes[index].get("delegatedStake"),
		"delegatedVoteAccountAddress": stakes[index].get("delegatedVoteAccountAddress"),
		"activationEpoch": stakes[index].get("activationEpoch"),
		"staker": stakes[index].get("staker"),
		"withdrawer": stakes[index].get("withdrawer"),
		"rentExemptReserve": stakes[index].get("rentExemptReserve"),
		"activeStake": stakes[index].get("activeStake"),
		"activatingStake": stakes[index].get("activatingStake"),
		"deactivationEpoch": stakes[index].get("deactivationEpoch"),
		"deactivatingStake": stakes[index].get("deactivatingStake"),
	}

	stakes[index] = tuple(list(entry.values()))

conn = psycopg2.connect(
        host="",
        database="nexscan",
        user="nexscan",
        password="")

cursor = conn.cursor()

insert_query = 'insert into stats ("slot", "lastVote", "rootSlot", "identityPubkey", "voteAccountPubkey", "commission", "skipRate", "stakers", "stake", "leaderSlots", "blocksProduced", "skippedSlots") values {}'.format(records_list_template)
cursor.execute(insert_query, rows)

erase_stakers_query = 'TRUNCATE TABLE stakers RESTART IDENTITY'
cursor.execute(erase_stakers_query)

stakers_list_template = ','.join(['%s'] * len(stakes))
insert_stakers_query = 'insert into stakers ("stakePubkey", "stakeType", "accountBalance", "creditsObserved", "delegatedStake", "delegatedVoteAccountAddress", "activationEpoch", "staker", "withdrawer", "rentExemptReserve", "activeStake", "activatingStake", "deactivationEpoch", "deactivatingStake") values {}'.format(stakers_list_template)
cursor.execute(insert_stakers_query, stakes)

refresh_stakers_current_query = "REFRESH MATERIALIZED VIEW stakers_current"
cursor.execute(refresh_stakers_current_query)
#cursor.execute("SELECT active_stake, activation_epoch, staker FROM stakers_current WHERE validator_vote_account = 'eon93Yhg7bjKgdwnt79TRfeLbePqddLEFP9H1iQBufN'")

cursor.executemany("UPDATE validators SET name = %s, website = %s WHERE node_pubkey = %s ", validator_infos)
cursor.executemany("UPDATE validators SET skip_percent = %s WHERE node_pubkey = %s ", skip_rates)

conn.commit()

conn.close()
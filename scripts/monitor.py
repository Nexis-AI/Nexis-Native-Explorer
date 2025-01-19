import subprocess
import json
import psycopg2
import psycopg2.extras

stakes = json.loads(subprocess.check_output("/root/velas-release/bin/velas stakes --output json -u https://explorer.velas.com/rpc", shell=True))
production = json.loads(subprocess.check_output("/root/velas-release/bin/velas block-production --output json -u https://explorer.velas.com/rpc | jq '.leaders'", shell=True))
slot = int(subprocess.check_output("/root/velas-release/bin/velas slot -u https://explorer.velas.com/rpc", shell=True).decode('utf-8').strip('\n'))
validators = json.loads(subprocess.check_output("/root/velas-release/bin/velas validators --output json -u https://explorer.velas.com/rpc", shell=True))
validator_info = json.loads(subprocess.check_output("/root/velas-release/bin/velas validator-info get --output json -u https://explorer.velas.com/rpc", shell=True))

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
		"stakePubkey": stakes[index]["stakePubkey"] if "stakePubkey" in stakes[index] else None,
		"stakeType": stakes[index]["stakeType"] if "stakeType" in stakes[index] else None,
		"accountBalance": stakes[index]["accountBalance"] if "accountBalance" in stakes[index] else None,
		"creditsObserved": stakes[index]["creditsObserved"] if "creditsObserved" in stakes[index] else None,
		"delegatedStake": stakes[index]["delegatedStake"] if "delegatedStake" in stakes[index] else None,
		"delegatedVoteAccountAddress": stakes[index]["delegatedVoteAccountAddress"] if "delegatedVoteAccountAddress" in stakes[index] else None,
		"activationEpoch": stakes[index]["activationEpoch"] if "activationEpoch" in stakes[index] else None,
		"staker": stakes[index]["staker"] if "staker" in stakes[index] else None,
		"withdrawer": stakes[index]["withdrawer"] if "withdrawer" in stakes[index] else None,
		"rentExemptReserve": stakes[index]["rentExemptReserve"] if "rentExemptReserve" in stakes[index] else None,
		"activeStake": stakes[index]["activeStake"] if "activeStake" in stakes[index] else None,
		"activatingStake": stakes[index]["activatingStake"] if "activatingStake" in stakes[index] else None,
		"deactivationEpoch": stakes[index]["deactivationEpoch"] if "deactivationEpoch" in stakes[index] else None,
		"deactivatingStake": stakes[index]["deactivatingStake"] if "deactivatingStake" in stakes[index] else None,
	}

	stakes[index] = tuple(list(entry.values()))

conn = psycopg2.connect(
        host="",
        database="velasity",
        user="velasity",
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
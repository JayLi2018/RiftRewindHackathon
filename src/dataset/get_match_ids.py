'''
run using:
python get_match_ids.py --api-key {api_key}
'''

import csv
import urllib3
from get_puuid_by_rank import get_json
import pandas as pd
import multiprocessing as mp
import time
from tqdm import tqdm
import argparse


# get api key
parser = argparse.ArgumentParser(description="A script that uses an API key.")
parser.add_argument('--api-key', type=str, required=True, 
                    help='Your riot API key'
)
args = parser.parse_args()
api_key = args.api_key
headers = {'X-Riot-Token': api_key} 

platform = 'na1'
ladder_queue = 'RANKED_SOLO_5x5'
max_pages = 10
tier = 'DIAMOND'
division = 'II'
game_type = 'ranked'
start_time_param = None
per_cap = 50
MAX_MATCH_COUNT = 100


def collect_match_ids_for_puuid(platform, puuid, headers, game_type, per_cap=50, start_time=None, queue_filter=None):
    # extract match ids of a puuid
    routing_value = get_routing_value(platform)
    start = 0
    url = f"https://{routing_value}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids?type={game_type}&start={start}&count={per_cap}"
    ids = get_json(url, headers)
    time.sleep(0.1)
    return ids


def get_routing_value(platform_region):
    return {
        'na1':'americas','br1':'americas','la1':'americas','la2':'americas',
        'euw1':'europe','eun1':'europe','tr1':'europe','ru':'europe',
        'kr':'asia','jp1':'asia',
        'oc1':'sea','ph2':'sea','sg2':'sea','th2':'sea','tw2':'sea','vn2':'sea'
    }.get(platform_region, 'americas')


def mp_get_match_id(puuid):
    try:
        return collect_match_ids_for_puuid(platform, puuid, headers, game_type, per_cap=50)
    except Exception as e:
        print(f"\n--- ERROR IN WORKER for PUUID {puuid} ---")
        print(e) 
        print("------------------------------------------\n")
        # Return an empty list to prevent downstream errors in the main process
        return [] 


def get_match_id_list(puuid_list):
    # loops through puiid list, extracts set of match ids
    unique_match_ids = set()
    print(f"Starting multiprocessing pool for {len(puuid_list)} PUUIDs...")
    processed_count = 0
    
    N = 2
    with mp.Pool(N) as pool: 
        for ids in pool.imap_unordered(mp_get_match_id, puuid_list):
            unique_match_ids.update(ids)
            processed_count += 1

            if processed_count % 100 == 0:
                print(f"Processed {processed_count}/{len(puuid_list)} PUUIDs...")
    
    print(len(unique_match_ids), 'unique match ids found')
    return list(unique_match_ids)


def save_match_id(match_ids):
    # save list of match ids as csv
    file_name = f"matchIDs_{tier}_{division}.csv"
    with open(file_name, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(["match_id"])
        for match_id in match_ids:
            writer.writerow([match_id])
    
    
if __name__ == "__main__":
    start_time = time.time()
    
    # read saved file
    puuid_df = pd.read_csv('/Users/profnote/Desktop/coding/riot_hackathon/puuid_DIAMOND_II.csv')
    puuid_list = puuid_df['puuid'].to_list()

    # get match ids
    match_ids = get_match_id_list(puuid_list)
    save_match_id(match_ids)
    
    # print time spent
    end_time = time.time()
    print((end_time - start_time)/60, 'minutes took for job to finish')



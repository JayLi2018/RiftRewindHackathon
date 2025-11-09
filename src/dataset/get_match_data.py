'''
run using:
python get_match_data.py --api-key {api_key}
'''
import json, os, time, csv
import pandas as pd
import argparse
from get_puuid_by_rank import get_json
from get_match_ids import get_routing_value
import multiprocessing as mp

WORKER_ID = 5  # <-- change here for each differnt api key run
DUMP_PATH = '/Users/profnote/Desktop/coding/riot_hackathon'

# parameters
# get api key
parser = argparse.ArgumentParser(description="A script that uses an API key.")
parser.add_argument('--api-key', type=str, required=True, 
                    help='Your riot API key'
)
args = parser.parse_args()
api_key = args.api_key
headers = {'X-Riot-Token': api_key} 

platform = 'na1'
tier = 'DIAMOND'
division = 'II'

def parse_match_data(match_data):
    info = match_data['info']
    meta = match_data['metadata']
    player_data = []
    for player in match_data['info']['participants']:
        subset = {
                'matchId': meta.get('matchId'), 'gameDuration': info.get('gameDuration'),
                'gameMode': info.get('gameMode'), 'queueId': info.get('queueId'),
                'championName': player.get('championName'), 'championId': player.get('championId'),
                'teamPosition': player.get('teamPosition'), 'individualPosition': player.get('individualPosition'),
                'kills': player.get('kills'), 'deaths': player.get('deaths'), 'assists': player.get('assists'),
                'totalMinionsKilled': player.get('totalMinionsKilled'), 'neutralMinionsKilled': player.get('neutralMinionsKilled'),
                'goldEarned': player.get('goldEarned'), 'totalDamageDealtToChampions': player.get('totalDamageDealtToChampions'),
                'totalDamageTaken': player.get('totalDamageTaken'), 'visionScore': player.get('visionScore'),
                'win': player.get('win'), 'items': [player.get(f'item{i}') for i in range(7)],
                'summoner1Id': player.get('summoner1Id'), 'summoner2Id': player.get('summoner2Id')
            }
        player_data.append(subset)
    return player_data


def get_match_data(match_id):
    # extract match data given a match id
    routing_value = get_routing_value(platform)
    url = f"https://{routing_value}.api.riotgames.com/lol/match/v5/matches/{match_id}"
    response = get_json(url, headers)
    parsed_data = parse_match_data(response)
    time.sleep(0.1)
    return parsed_data


def convert_to_df(match_data):
    # convert list of jsons to pandas df
    df = pd.json_normalize(match_data)
    df['tier'] = 'DIAMOND'
    cols_to_front = ['tier', 'individualPosition', 'championName']
    remaining_cols = [col for col in df.columns if col not in cols_to_front]

    # Create the new column order
    new_column_order = cols_to_front + remaining_cols

    # Reindex the DataFrame
    df_reordered = df[new_column_order]
    return df_reordered


def save_match_data(match_data, subset_num):
    # save list of match ids as csv
    file_name = f"data_{tier}_{division}.csv"
    with open(file_name, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(["match_id"])
        for match_id in match_data:
            writer.writerow([match_id])
    


if __name__ == "__main__":
    start_time = time.time()
    match_id_list = pd.read_csv('/Users/profnote/Desktop/coding/riot_hackathon/matchIDs_DIAMOND_II.csv').match_id.to_list()
    
    # process subset
    # due to api rate limit, we're processing different subsets using different api-keys to speed up
    batch_num = 6
    batch_size = len(match_id_list) // batch_num + 1
    
    
    batch = match_id_list[(WORKER_ID * batch_size):((WORKER_ID+1) * batch_size)]


    # get match data
    print(f"Starting multiprocessing pool for {len(batch)} match IDs...")
    processed_count = 0
    
    all_data = []
    N = 2
    with mp.Pool(N) as pool: 
        for p_data in pool.imap_unordered(get_match_data, batch):
            all_data.extend(p_data)
            processed_count += 1

            if processed_count % 100 == 0:
                print(f"Processed {processed_count}/{len(batch)} match IDs...")
    # match_data = get_match_data(match_id_list)
    
    # convert to table
    df = convert_to_df(all_data)

    # save table 
    file_name = f"data_{tier}_{division}_part{WORKER_ID}.csv"
    df.to_csv(file_name, index=False)

    # print time spent
    end_time = time.time()
    print((end_time - start_time)/60, 'minutes took for job to finish')
    
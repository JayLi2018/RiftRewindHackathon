'''
run using:
python get_puuid_by_rank.py --api-key {api_key}
'''
import json, os, time, csv
import urllib3
import argparse

parser = argparse.ArgumentParser(description="A script that uses an API key.")
parser.add_argument('--api-key', type=str, required=True, 
                    help='Your riot API key'
)
# get api key
args = parser.parse_args()
api_key = args.api_key
headers = {'X-Riot-Token': api_key} 
_http = urllib3.PoolManager(num_pools=12, maxsize=24, timeout=urllib3.Timeout(connect=3.0, read=10.0))


class RiotHttpError(Exception):
    def __init__(self, status, message):
        super().__init__(message); self.status = status; self.message = message
        
        
def get_json(url, headers, retries=3, backoff=0.6):
    # execute get request
    last_status = None
    for attempt in range(1, retries+1):
        r = _http.request('GET', url, headers=headers)
        s = r.status; last_status = s
        if s == 200:
            return json.loads(r.data.decode('utf-8'))
        if s == 403: raise RiotHttpError(403, 'Riot API key invalid or expired.')
        if s == 404: raise RiotHttpError(404, 'Resource not found.')
        if s in (429,500,502,503,504):
            ra = 0
            try: ra = int(r.headers.get('Retry-After','0'))
            except: pass
            sleep_s = max(ra, backoff*attempt)
            print(f"[warn] {s} on GET {url[:120]}... attempt {attempt}/{retries}; sleep {sleep_s:.2f}s")
            time.sleep(sleep_s); continue
        body = ''
        try: body = r.data.decode('utf-8')[:300]
        except: pass
        raise RiotHttpError(s, f"Riot API error {s}. {body}")
    raise RiotHttpError(last_status or 500, f"Riot API error after {retries} retries.")


def get_puuids(platform, ladder_queue, tier, division, max_pages):
    # get puuid pages
    collected = []
    for page in range(1, max_pages+1):
        url = f"https://{platform}.api.riotgames.com/lol/league/v4/entries/{ladder_queue}/{tier}/{division}?page={page}"
        data = get_json(url, headers)
        if not isinstance(data, list) or not data:
            break
        collected.extend(data)

    # print(collected[0:5])

    # save list of puuid as csv
    puuid_list = [e.get("puuid") for e in collected]
    file_name = f"puuid_{tier}_{division}.csv"
    with open(file_name, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(["puuid"])
        for puuid in puuid_list:
            writer.writerow([puuid])
    
    print(len(collected), "puuid's saved")
 

if __name__ == "__main__":
    # get n pages PUUIDs of given tier and division
    get_puuids('na1', 'RANKED_SOLO_5x5', 'DIAMOND', 'II', max_pages = 10)



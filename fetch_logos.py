import requests
import json
import os

LOGOS_DIR = "logos"
if not os.path.exists(LOGOS_DIR):
    os.makedirs(LOGOS_DIR)

APPS = {
    "zebra": "1449033284",     # Zebra Coffee
    "kaspi": "1195076505",     # Kaspi.kz
    "technodom": "1156066264", # Technodom
    "goldapple": "1102737632", # Gold Apple
    "1fit": "1512437887",      # 1Fit
    "meloman": "1055375549"    # Marwin / Meloman
}

def download_icon(app_name, app_id):
    try:
        url = f"https://itunes.apple.com/lookup?id={app_id}&country=KZ"
        print(f"Fetching {app_name} metadata...")
        resp = requests.get(url)
        data = resp.json()
        
        if data["resultCount"] > 0:
            image_url = data["results"][0]["artworkUrl512"]
            ext = "jpg" # usually jpg or png, saving as jpg is safe for browser rendering if content matches
            if ".png" in image_url: ext = "png"
            
            print(f"Downloading {app_name} icon from {image_url}")
            img_data = requests.get(image_url).content
            
            filename = f"{LOGOS_DIR}/{app_name}.{ext}"
            with open(filename, "wb") as f:
                f.write(img_data)
            print(f"Saved to {filename}")
            return filename
        else:
            print(f"No results for {app_name}")
    except Exception as e:
        print(f"Error for {app_name}: {e}")

for name, id in APPS.items():
    download_icon(name, id)

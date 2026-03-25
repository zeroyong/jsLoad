import requests
from bs4 import BeautifulSoup

url = 'https://mm.tvv.tw/archives/7176.html'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

try:
    response = requests.get(url, headers=headers, timeout=10)
    response.encoding = 'utf-8'

    soup = BeautifulSoup(response.text, 'html.parser')

    # 查找所有img标签
    imgs = soup.find_all('img')
    print(f'Found {len(imgs)} images')

    for i, img in enumerate(imgs):
        src = img.get('src', '')
        if 'meimei.tvv.tw/meimei/uploads' in src:
            print(f'Image {i+1}: {src}')

except Exception as e:
    print(f'Error: {e}')
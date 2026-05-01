# -*- coding: utf-8 -*-
import requests
from bs4 import BeautifulSoup
import re
import os
import time

def download_chapter(url):
    session = requests.Session()
    session.headers.update({'User-Agent': 'Mozilla/5.0'})
    
    resp = session.get('https://su8.sjnyd.cc' + url)
    resp.encoding = 'utf-8'
    
    soup = BeautifulSoup(resp.text, 'html.parser')
    
    title_span = soup.find('span', class_='title')
    if title_span:
        title = title_span.get_text().strip()
        title = re.sub(r'\(\d+ / \d+\)', '', title).strip()
    else:
        title = 'unknown'
    
    content_div = soup.find('div', id='chaptercontent')
    if not content_div:
        return None, None
    
    ps = content_div.find_all('p')
    paragraphs = []
    for p in ps:
        if p.get('class'):
            continue
        text = p.get_text().strip()
        if text:
            paragraphs.append(text)
    
    content = '\n\n'.join(paragraphs)
    
    prev = soup.find('a', id='pt_prev')
    next = soup.find('a', id='pt_next')
    
    return title, content, prev.get('href') if prev else None, next.get('href') if next else None

# Start from chapter 1
current_url = '/shoujixs_205142_50444842.html'
output_dir = '我是虫全文'
os.makedirs(output_dir, exist_ok=True)

count = 0
visited = set()

while current_url and current_url not in visited:
    visited.add(current_url)
    
    print(f'Downloading: {current_url}')
    title, content, prev_url, next_url = download_chapter(current_url)
    
    if title and content:
        filename = f"{title}.txt"
        filepath = os.path.join(output_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(f"{title}\n\n")
            f.write(content)
        print(f'  Saved: {title}')
        count += 1
    else:
        print(f'  Failed')
    
    # Follow next link
    if next_url:
        current_url = next_url
    else:
        current_url = None
    
    time.sleep(0.3)
    
    if count >= 100:
        break

print(f'Total downloaded: {count} chapters')
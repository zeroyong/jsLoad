# -*- coding: utf-8 -*-
import requests
from bs4 import BeautifulSoup
import re
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

def get_chapter(chapter_num, book_id="205142", start_id=50444842):
    ch_id = start_id + chapter_num - 1
    url = f'https://su8.sjnyd.cc/shoujixs_{book_id}_{ch_id}.html'
    
    session = requests.Session()
    session.headers.update({'User-Agent': 'Mozilla/5.0'})
    
    try:
        resp = session.get(url, timeout=10)
        if resp.status_code != 200:
            return chapter_num, None, None
        
        resp.encoding = 'utf-8'
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        title_span = soup.find('span', class_='title')
        if title_span:
            title = title_span.get_text().strip()
            title = re.sub(r'\(\d+ / \d+\)', '', title).strip()
        else:
            title = f'第{chapter_num}章'
        
        content_div = soup.find('div', id='chaptercontent')
        if not content_div:
            return chapter_num, title, None
        
        ps = content_div.find_all('p')
        paragraphs = []
        for p in ps:
            if p.get('class'):
                continue
            text = p.get_text().strip()
            if text:
                paragraphs.append(text)
        
        content = '\n\n'.join(paragraphs)
        return chapter_num, title, content
    except Exception as e:
        return chapter_num, None, None

def download_all(total_chapters=382, max_workers=10, output_file='我是虫.txt'):
    print(f'Downloading {total_chapters} chapters with {max_workers} threads...')
    
    chapters = {}
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(get_chapter, ch): ch for ch in range(1, total_chapters + 1)}
        
        for future in as_completed(futures):
            ch, title, content = future.result()
            if title and content:
                chapters[ch] = (title, content)
                print(f'OK: {title}')
            else:
                print(f'Failed: chapter {ch}')
    
    # Sort and save to single file
    print(f'Saving to {output_file}...')
    with open(output_file, 'w', encoding='utf-8') as f:
        for ch in sorted(chapters.keys()):
            title, content = chapters[ch]
            f.write(f'\n\n{"="*50}\n')
            f.write(f'{title}\n')
            f.write(f'{"="*50}\n\n')
            f.write(content)
            f.write('\n')
    
    print(f'Done! Downloaded {len(chapters)} chapters')

if __name__ == '__main__':
    download_all(total_chapters=382, max_workers=10, output_file='我是虫.txt')
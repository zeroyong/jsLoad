# -*- coding: utf-8 -*-
import requests
from bs4 import BeautifulSoup
import re
import os
import time
import sys
import pyperclip
import msvcrt
from concurrent.futures import ThreadPoolExecutor, as_completed
from rich.progress import (
    Progress,
    TextColumn,
    BarColumn,
    MofNCompleteColumn,
    TimeRemainingColumn,
    TaskProgressColumn,
)
from rich.console import Console
from rich.theme import Theme

custom_theme = Theme({
    "info": "cyan",
    "warning": "yellow",
    "error": "red bold",
    "success": "green bold",
})
console = Console(theme=custom_theme)

class NovelDownloader:
    def __init__(self, book_id="205142"):
        self.base_url = "https://su8.sjnyd.cc"
        self.book_id = book_id
        self.output_file = "novel.txt"
        self.novel_name = "未知"
        self.chapters = {}  # {ch_id: (title, content)}
    
    def get_chapters_from_index(self):
        url = f"{self.base_url}/shoujixs_{self.book_id}_/"
        console.print(f"[info]获取目录: {url}[/info]")
        
        resp = requests.get(url, timeout=10)
        resp.encoding = 'utf-8'
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        if soup.title:
            self.novel_name = soup.title.string.split("_")[0] if soup.title else "未知"
        
        last_chapter_div = soup.find('p', class_='lastchapter')
        if last_chapter_div:
            link = last_chapter_div.find('a')
            if link:
                href = link.get('href', '')
                match = re.search(r'_(\d+)\.html$', href)
                if match:
                    latest_id = int(match.group(1))
                    console.print(f"[info]最新章节ID: {latest_id}[/info]")
                    return latest_id
        
        console.print("[warning]无法获取最新章节，从目录页解析[/warning]")
        
        links = soup.find_all('a', href=re.compile(rf'/shoujixs_{self.book_id}_\d+\.html'))
        chapter_ids = []
        for link in links:
            match = re.search(r'_(\d+)\.html$', link.get('href', ''))
            if match:
                chapter_ids.append(int(match.group(1)))
        
        if chapter_ids:
            return max(chapter_ids)
        return None
    
    def get_chapter(self, ch_id):
        url = f"{self.base_url}/shoujixs_{self.book_id}_{ch_id}.html"
        
        session = requests.Session()
        session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        
        try:
            resp = session.get(url, timeout=15)
            if resp.status_code != 200:
                return ch_id, None, None
            
            resp.encoding = 'utf-8'
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            title_span = soup.find('span', class_='title')
            if title_span:
                title = title_span.get_text().strip()
                title = re.sub(r'\(\d+ / \d+\)', '', title).strip()
            else:
                title = f'ch_{ch_id}'
            
            content_div = soup.find('div', id='chaptercontent')
            if not content_div:
                return ch_id, title, None
            
            ps = content_div.find_all('p')
            paragraphs = []
            for p in ps:
                if p.get('class'):
                    continue
                text = p.get_text().strip()
                if text:
                    paragraphs.append(text)
            
            content = '\n\n'.join(paragraphs)
            return ch_id, title, content
        except Exception as e:
            return ch_id, None, None
    
    def download_all(self, max_workers=15):
        latest_id = self.get_chapters_from_index()
        
        if not latest_id:
            console.print("[error]无法获取章节信息![/error]")
            return 0
        
        console.print(f"[info]开始下载 {self.novel_name} (共{latest_id}章)...[/info]")
        
        with Progress(
            TextColumn("[bold blue]{task.description}"),
            BarColumn(bar_width=40),
            TaskProgressColumn(),
            MofNCompleteColumn(),
            TimeRemainingColumn(),
            console=console,
        ) as progress:
            task = progress.add_task("[green]下载进度", total=latest_id)
            
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = {executor.submit(self.get_chapter, ch_id): ch_id 
                        for ch_id in range(1, latest_id + 1)}
                
                for future in as_completed(futures):
                    ch_id, title, content = future.result()
                    
                    if title and content:
                        self.chapters[ch_id] = (title, content)
                        progress.update(task, description=f"[green]OK: {title[:20]}")
                    else:
                        progress.update(task, description=f"[error]FAIL: ch_{ch_id}[/error]")
                    
                    progress.advance(task)
        
        if not self.chapters:
            console.print("[error]没有成功下载任何章节![/error]")
            return 0
        
        sorted_ch = sorted(self.chapters.items(), key=lambda x: x[0])
        
        safe_name = re.sub(r'[\\|/|:|*|?|"|<|>||]', '', self.novel_name)
        self.output_file = f"{safe_name}.txt"
        
        with open(self.output_file, 'w', encoding='utf-8') as f:
            f.write(f"{self.novel_name}\n\n")
            f.write("=" * 50 + "\n\n")
            
            for ch_id, (title, content) in sorted_ch:
                f.write(f'\n\n{"=" * 50}\n')
                f.write(f'{title}\n')
                f.write(f'{"=" * 50}\n\n')
                f.write(content)
                f.write('\n')
        
        console.print(f"[success]下载完成! 共{len(self.chapters)}章, 保存为: {self.output_file}[/success]")
        
        return len(self.chapters)

def parse_novel_url(url):
    match = re.search(r'shoujixs_(\d+)', url)
    if match:
        return match.group(1)
    return None

def main():
    if len(sys.argv) > 1:
        url = sys.argv[1]
        book_id = parse_novel_url(url)
        if book_id:
            downloader = NovelDownloader(book_id=book_id)
            downloader.download_all(max_workers=15)
        else:
            console.print("[error]无法解析链接[/error]")
    else:
        url_pattern = re.compile(r'https://su8\.sjnyd\.cc/shoujixs_\d+/?')
        console.print("[info]开始监听剪贴板... (按 Ctrl+C 退出)[/info]")
        console.print("[info]复制小说目录链接即可自动下载[/info]\n")
        
        last_clip = pyperclip.paste()
        processed = set()
        
        while True:
            try:
                if msvcrt.kbhit():
                    key = msvcrt.getch()
                    if key.decode() == '\x03':
                        console.print("\n[info]程序退出[/info]")
                        break
                
                current_clip = pyperclip.paste()
                
                if current_clip != last_clip:
                    last_clip = current_clip
                    
                    if url_pattern.match(current_clip):
                        url = current_clip.rstrip('/')
                        
                        if url in processed:
                            continue
                        
                        processed.add(url)
                        console.print(f"\n[info]检测到链接: {url}[/info]")
                        
                        book_id = parse_novel_url(url)
                        if book_id:
                            console.print(f"[info]小说ID: {book_id}[/info]\n")
                            
                            downloader = NovelDownloader(book_id=book_id)
                            downloader.download_all(max_workers=15)
                        else:
                            console.print("[error]无法解析小说ID[/error]")
                
                time.sleep(0.5)
                
            except KeyboardInterrupt:
                console.print("\n[info]程序退出[/info]")
                break
            except Exception as e:
                console.print(f"[error]错误: {e}[/error]")
                time.sleep(1)

if __name__ == '__main__':
    main()
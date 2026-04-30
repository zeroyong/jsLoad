# -*- coding: utf-8 -*-
import sys
import json
import os
import hashlib
import base64
import re
import time
import requests
import pyperclip
import msvcrt
from urllib.parse import unquote
from concurrent.futures import ThreadPoolExecutor, as_completed
from rich.progress import (
    Progress,
    BarColumn,
    TextColumn,
    DownloadColumn,
    TransferSpeedColumn,
    TimeRemainingColumn,
    TaskProgressColumn,
    TimeElapsedColumn,
)
from rich.console import Console
from rich.table import Table
from Crypto.Cipher import AES

console = Console()

# --- 配置 ---
SAVE_DIR = "拾光壁纸下"
MAX_WORKERS = 8
DEVICE_ID = "719b0f2ea598891f069ba8c25d81ec82"

# 匹配拾光壁纸URL的正则
URL_PATTERN = re.compile(r"https://gallery\.timeline\.ink/\?t=.+")

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Referer': 'https://gallery.timeline.ink/',
    'Origin': 'https://gallery.timeline.ink',
    'Timeline-Client': 'timelineweb',
    'Timeline-Device': DEVICE_ID,
}

# --- 解密函数 ---
def encrypt_md5(t):
    if not t:
        return ""
    return hashlib.md5(t.encode()).hexdigest()

def decrypt_aes(t, e):
    if not t or not e:
        return ""
    e_key = (e * 16)[-16:]
    key_md5 = encrypt_md5(e_key)[8:24]
    try:
        hex_bytes = bytes.fromhex(t)
        b64_str = base64.b64encode(hex_bytes).decode()
        cipher = AES.new(e_key.encode(), AES.MODE_CBC, key_md5.encode())
        decrypted = cipher.decrypt(base64.b64decode(b64_str))
        result = decrypted.rstrip(b'\x00').decode('utf-8', errors='replace')
        return result
    except Exception:
        return t

def decrypt_url(t, e):
    if not t or not e:
        return ""
    parts = t.split("?")
    path_parts = parts[0].split("/")
    filename = path_parts[-1].split(".")
    name_part = filename[0]
    
    if len(name_part) < 32:
        return t
    
    p0 = name_part[:32]
    p1 = name_part[32:]
    p0_decrypted = decrypt_aes(p0, e)
    filename[0] = p0_decrypted + p1
    path_parts[-1] = ".".join(filename)
    parts[0] = "/".join(path_parts)
    return "?".join(parts)

# --- 下载相关 ---
ananas_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Cookie': 'special_fontSize=16px; special_viewModel=dyb; special_local_version=1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
}

hdslb_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Sec-Fetch-Dest': 'image',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
}

duitang_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.duitang.com/',
    'Sec-Fetch-Dest': 'image',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'same-origin',
    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
}

def get_headers(img_url):
    if 'ananas.chaoxing.com' in img_url:
        return ananas_headers
    elif 'hdslb.com' in img_url:
        return hdslb_headers
    else:
        return duitang_headers

def get_image_list(topic):
    params = {
        'topic': topic,
        'date': '30000101',
        'order': 'random',
        'no': '99999999',
    }
    url = 'https://api.nguaduot.cn/snake/v4'
    resp = requests.get(url, headers=headers, params=params)
    data = resp.json()
    items = data.get('data', [])
    for item in items:
        rawprovider = item.get('rawprovider', '')
        imgurl = item.get('imgurl', '')
        thumburl = item.get('thumburl', '')
        if imgurl:
            item['imgurl'] = decrypt_url(imgurl, rawprovider)
        if thumburl:
            item['thumburl'] = decrypt_url(thumburl, rawprovider)
    return items

def download_img(item, save_dir):
    img_url = item.get('imgurl', '')
    img_id = item.get('id', 'unknown')
    expected_size = item.get('size', 0)
    if not img_url:
        return False, img_id, 0
    
    headers = get_headers(img_url)
    
    try:
        resp = requests.get(img_url, headers=headers, timeout=30, allow_redirects=True)
        content_type = resp.headers.get('Content-Type', '')
        
        if 'image' not in content_type.lower():
            actual_url = resp.url
            return False, f"{img_id}: {content_type[:20]} -> {actual_url[:50]}", 0
        
        file_size = len(resp.content)
        
        if file_size < 5000:
            return False, f"{img_id}: 过小 {file_size}B", 0
        
        if expected_size > 0 and file_size < expected_size * 0.1:
            return False, f"{img_id}: 异常 {file_size}/{expected_size}B", 0
        
        ext = os.path.splitext(img_url)[1] or '.jpg'
        if '.webp' in content_type.lower():
            ext = '.webp'
        elif '.png' in content_type.lower():
            ext = '.png'
        
        filename = f"{img_id}{ext}"
        filepath = os.path.join(save_dir, filename)
        
        with open(filepath, 'wb') as f:
            f.write(resp.content)
        
        return True, filename, file_size
    except Exception as e:
        return False, f"{img_id}: {type(e).__name__[:10]}: {str(e)[:30]}", 0

def start_download(topic):
    topic_dir = os.path.join(SAVE_DIR, topic)
    os.makedirs(topic_dir, exist_ok=True)
    
    console.print(f"\n[cyan]正在获取 [{topic}] 的图片列表...[/cyan]")
    items = get_image_list(topic)
    count = len(items)
    
    if count == 0:
        console.print(f"[yellow]未获取到图片，可能主题 '{topic}' 不存在[/yellow]")
        return
    
    console.print(f"[green]获取到 {count} 张图片，保存到: {topic_dir}[/green]\n")
    
    start_time = time.time()
    
    with Progress(
        TextColumn("[bold blue]{task.description}", justify="right"),
        BarColumn(bar_width=None),
        "[progress.percentage]{task.percentage:>3.0f}%",
        "•",
        TextColumn("({task.completed}/{task.total})"),
        "•",
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        overall_task = progress.add_task(f"[bold green]下载 {topic}", total=count)
        
        executor = ThreadPoolExecutor(max_workers=min(MAX_WORKERS, count))
        futures = {executor.submit(download_img, item, topic_dir): item for item in items}
        
        success_count = 0
        fail_count = 0
        total_size = 0
        
        for future in as_completed(futures):
            ok, name, size = future.result(timeout=45)
            if ok:
                success_count += 1
                total_size += size
                size_mb = size / 1024 / 1024
                console.print(f"[green]✓[/green] {name[:24]}... ({size_mb:.2f} MB)")
            else:
                fail_count += 1
                console.print(f"[red]✗[/red] {name[:40]}...")
            
            progress.update(overall_task, advance=1)
        
        executor.shutdown(wait=False)
        
        elapsed = time.time() - start_time
        speed = total_size / elapsed / 1024 / 1024 if elapsed > 0 else 0
        progress.update(overall_task, description=f"[bold green]完成! 速度: {speed:.2f} MB/s")
    
    console.print()
    
    table = Table(title="下载统计", show_header=True)
    table.add_column("项目", style="cyan")
    table.add_column("值", style="green")
    table.add_row("主题", topic)
    table.add_row("成功", str(success_count))
    table.add_row("失败", str(fail_count))
    table.add_row("总大小", f"{total_size / 1024 / 1024:.2f} MB")
    table.add_row("保存目录", topic_dir)
    console.print(table)

def parse_topic_from_url(url):
    """从URL中提取topic参数"""
    match = re.search(r't=([^&]+)', url)
    if match:
        topic_encoded = match.group(1)
        return unquote(topic_encoded)
    return None

def main():
    processed_urls = set()
    
    console.print("[bold cyan]==========================================[/bold cyan]")
    console.print("[bold cyan]  拾光壁纸下载器 - 剪贴板监听模式[/bold cyan]")
    console.print("[bold cyan]==========================================[/bold cyan]")
    console.print(f"\n[yellow]保存目录:[/yellow] {SAVE_DIR}")
    console.print("[yellow]监听域名:[/yellow] gallery.timeline.ink")
    console.print("[yellow]退出方式:[/yellow] 按 'n' 键退出\n")
    
    last_clipboard = pyperclip.paste()
    
    try:
        while True:
            if msvcrt.kbhit() and msvcrt.getch().decode().lower() == 'n':
                console.print("\n[yellow]检测到 'n'，程序即将退出。[/yellow]")
                break
            
            current_clipboard = pyperclip.paste()
            if current_clipboard != last_clipboard:
                last_clipboard = current_clipboard
                
                if URL_PATTERN.match(current_clipboard):
                    if current_clipboard in processed_urls:
                        continue
                    
                    processed_urls.add(current_clipboard)
                    topic = parse_topic_from_url(current_clipboard)
                    
                    if topic:
                        console.print(f"\n[bold magenta]检测到新链接:[/bold magenta] {current_clipboard}")
                        console.print(f"[bold magenta]主题:[/bold magenta] {topic}")
                        console.print()
                        start_download(topic)
                        console.print("\n[cyan]继续监听剪贴板...[/cyan]")
            
            time.sleep(0.5)
    
    except KeyboardInterrupt:
        console.print("\n[yellow]程序被用户中断 (Ctrl+C)。[/yellow]")
    finally:
        console.print("[cyan]监听已停止。[/cyan]")

if __name__ == '__main__':
    main()
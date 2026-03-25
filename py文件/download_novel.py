# -*- coding: utf-8 -*-
# @Author: xhg
# @Date:   2025-11-27 22:06:37
# @Last Modified by:   xhg
# @Last Modified time: 2025-11-27 22:41:37
import requests
from bs4 import BeautifulSoup
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from rich.progress import (
    Progress,
    BarColumn,
    TextColumn,
    DownloadColumn,
    TransferSpeedColumn,
    TimeRemainingColumn,
)
import re
import pyperclip
import time
import msvcrt

# --- 配置 ---
BASE_URL = "https://www.sudugu.org"
PAGE_URL = "https://www.sudugu.org/186/txt.html#dir"
SAVE_DIR = "小说下载"
MAX_WORKERS = 8

# 确保保存目录存在
os.makedirs(SAVE_DIR, exist_ok=True)

# --- 1. 从页面解析下载链接 ---
def get_download_links(page_url):
    links = []
    try:
        resp = requests.get(page_url)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        ul = soup.find("div", {"id": "list"}).find("ul")
        for li in ul.find_all("li"):
            a = li.find("a")
            href = a["href"]
            filename = a.text.strip()
            file_url = BASE_URL + href
            links.append({"url": file_url, "filename": filename})
    except requests.RequestException as e:
        print(f"[red]无法获取页面内容: {e}[/red]")
    return links

# --- 2. 带流式进度更新的下载函数 ---
def download_file(progress, overall_task, link):
    """下载单个文件，流式更新进度条。"""
    url = link["url"]
    filename = link["filename"]
    task_id = progress.add_task(f"  {filename}", total=1, visible=False) # 初始不可见

    try:
        resp = requests.get(url, stream=True, timeout=30)
        resp.raise_for_status()
        
        file_size = int(resp.headers.get('content-length', 0))
        progress.update(task_id, total=file_size, visible=True) # 获取大小后更新并显示

        with open(os.path.join(SAVE_DIR, filename), "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
                progress.update(task_id, advance=len(chunk))

        progress.remove_task(task_id)
        progress.update(overall_task, advance=1) # 文件完成，总进度+1
        return filename, True, ""
    except Exception as e:
        if 'task_id' in locals() and not progress.tasks[task_id].finished:
             progress.remove_task(task_id)
        # 即使失败，也标记总任务完成一个，避免总进度卡住
        progress.update(overall_task, advance=1)
        return filename, False, str(e)

# --- 主程序 ---
# --- 3. 合并下载的分节文件 ---
def merge_chapters(save_dir):
    """合并下载的章节文件，并删除原始分节。"""
    print("\n开始合并文件...")
    files_to_merge = [f for f in os.listdir(save_dir) if f.endswith('.txt')]
    
    novels = {}
    # 使用正则表达式从文件名中提取小说名和章节范围
    pattern = re.compile(r'^(.*?)\((\d+)-(\d+)章\)\.txt$')

    for filename in files_to_merge:
        match = pattern.match(filename)
        if match:
            novel_name = match.group(1)
            start_chapter = int(match.group(2))
            
            if novel_name not in novels:
                novels[novel_name] = []
            novels[novel_name].append((start_chapter, filename))

    if not novels:
        # 如果没有匹配到带章节范围的文件，就处理单个文件的情况
        if len(files_to_merge) == 1:
             # 假设文件名就是小说名（去掉.txt）
            novel_name = os.path.splitext(files_to_merge[0])[0]
            # 清理可能的章节信息
            novel_name = re.sub(r'\s*\(.*\)', '', novel_name).strip()
            old_path = os.path.join(save_dir, files_to_merge[0])
            new_path = os.path.join(save_dir, f"{novel_name}.txt")
            
            if old_path != new_path:
                os.rename(old_path, new_path)
                print(f"已将 '{files_to_merge[0]}' 重命名为 '{os.path.basename(new_path)}'")
        else:
            print("未找到符合命名规则 (书名(xx-xx章).txt) 的文件，跳过合并。")
        return

    for novel_name, chapters in novels.items():
        # 按起始章节排序
        chapters.sort(key=lambda x: x[0])
        
        merged_filepath = os.path.join(save_dir, f"{novel_name}.txt")
        print(f"正在合并成: {merged_filepath}")

        with open(merged_filepath, 'w', encoding='utf-8') as merged_file:
            for _, chapter_filename in chapters:
                chapter_filepath = os.path.join(save_dir, chapter_filename)
                with open(chapter_filepath, 'r', encoding='utf-8') as chapter_file:
                    merged_file.write(chapter_file.read())
                    merged_file.write('\n\n') # 章节之间加两个换行
        
        print(f"'{novel_name}' 合并完成。正在删除原始分节文件...")
        
        # 删除原始文件
        for _, chapter_filename in chapters:
            os.remove(os.path.join(save_dir, chapter_filename))
        
        print("原始文件已删除。")

def start_download_process(page_url):
    """封装的下载和合并流程。"""
    links = get_download_links(page_url)
    if not links:
        print("未能获取到任何下载链接，程序退出。")
        return

    with Progress(
        TextColumn("[bold blue]{task.description}", justify="right"),
        BarColumn(bar_width=None),
        "[progress.percentage]{task.percentage:>3.1f}%",
        "•",
        DownloadColumn(),
        "•",
        TransferSpeedColumn(),
        "•",
        TimeRemainingColumn(),
        TextColumn("({task.completed} of {task.total} files)"),
    ) as progress:
        overall_task = progress.add_task("[bold green]总进度", total=len(links))

        with ThreadPoolExecutor(max_workers=min(MAX_WORKERS, len(links))) as executor:
            futures = [executor.submit(download_file, progress, overall_task, link) for link in links]

            for future in as_completed(futures):
                filename, success, msg = future.result()
                if not success:
                    progress.console.print(f"[red]下载失败:[/red] {filename} | 错误: {msg}")

        progress.update(overall_task, description="[bold green]全部下载完成！")

    # 所有下载任务结束后，执行合并操作
    merge_chapters(SAVE_DIR)
    print("所有任务完成！")

if __name__ == "__main__":
    processed_urls = set()
    url_pattern = re.compile(r"https://www\.sudugu\.org/\d+(/txt\.html#dir)?")
    print("开始监听剪贴板... 按 'n' 键可随时退出。")

    last_clipboard = pyperclip.paste()
    try:
        while True:
            if msvcrt.kbhit() and msvcrt.getch().decode().lower() == 'n':
                print("\n检测到 'n'，程序即将退出。")
                break
            
            current_clipboard = pyperclip.paste()
            if current_clipboard != last_clipboard:
                last_clipboard = current_clipboard
                print(f"[剪贴板变化] {current_clipboard}")
                if url_pattern.match(current_clipboard) and current_clipboard not in processed_urls:
                    # 自动补全 URL 后缀
                    if not current_clipboard.endswith("/txt.html#dir"):
                        current_clipboard = current_clipboard.rstrip("/") + "/txt.html#dir"
                        print(f"自动补全链接为: {current_clipboard}")
                    print(f"\n检测到新的小说链接: {current_clipboard}")
                    processed_urls.add(current_clipboard)
                    start_download_process(current_clipboard)
                    print("\n继续监听剪贴板... 按 'n' 键可随时退出。")
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n程序被用户中断 (Ctrl+C)。")
    finally:
        print("监听已停止。")
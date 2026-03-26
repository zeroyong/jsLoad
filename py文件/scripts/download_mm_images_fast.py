# -*- coding: utf-8 -*-
import requests
from bs4 import BeautifulSoup
import os
import time
import re
import pyperclip
from urllib.parse import urljoin
from concurrent.futures import ThreadPoolExecutor, as_completed
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn, TimeRemainingColumn
from rich.table import Table
from rich.panel import Panel
from rich.live import Live

# 初始化 rich console
console = Console()

# 创建images文件夹
if not os.path.exists('images'):
    os.makedirs('images')

def download_single_image(img_url, filename, progress, task_id, save_folder):
    """下载单个图片的函数"""
    max_retries = 3
    retry_delay = 1

    # 代理配置
    proxies = {
        'http': 'http://127.0.0.1:7897',
        'https': 'http://127.0.0.1:7897'
    }

    for attempt in range(max_retries):
        try:
            headers = {
                'Host': 'meimei.tvv.tw',
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache',
                'Sec-Ch-Ua': '"Not;A=Brand";v="24", "Chromium";v="128"',
                'Sec-Ch-Ua-Mobile': '?0',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Sec-Fetch-Site': 'same-site',
                'Sec-Fetch-Mode': 'no-cors',
                'Sec-Fetch-Dest': 'image',
                'Referer': 'https://mm.tvv.tw/',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'zh-CN,zh;q=0.9',
                'Dnt': '1',
                'Sec-Gpc': '1',
                'Priority': 'u=2, i',
                'Connection': 'close'
            }

            # 设置更合理的超时时间，使用代理
            response = requests.get(img_url, headers=headers, timeout=(15, 60), stream=True, proxies=proxies)
            response.raise_for_status()

            total_size = int(response.headers.get('content-length', 0))

            filepath = os.path.join(save_folder, filename)

            # 使用流式下载并更新进度条
            progress.update(task_id, total=total_size, visible=True)

            downloaded = 0
            last_update_time = time.time()
            start_download_time = time.time()

            with open(filepath, 'wb') as f:
                for data in response.iter_content(chunk_size=16384):  # 增大chunk size提高传输效率
                    if data:  # 过滤掉空的chunk
                        size = f.write(data)
                        downloaded += size

                        # 每0.5秒更新一次进度，避免过于频繁的更新
                        current_time = time.time()
                        if current_time - last_update_time >= 0.5:
                            # 计算下载速度
                            elapsed_time = current_time - start_download_time
                            speed = downloaded / elapsed_time if elapsed_time > 0 else 0

                            # 格式化速度显示
                            if speed < 1024:
                                speed_str = f"{speed:.1f} B/s"
                            elif speed < 1024 * 1024:
                                speed_str = f"{speed/1024:.1f} KB/s"
                            else:
                                speed_str = f"{speed/(1024*1024):.1f} MB/s"

                            progress.update(task_id, advance=size, description=f"[cyan]{filename} ({speed_str})")
                            last_update_time = current_time

                # 确保最终进度更新到100%
                if downloaded < total_size:
                    progress.update(task_id, completed=total_size)
                else:
                    progress.update(task_id, advance=size)

            return True, filename

        except Exception as e:
            if attempt < max_retries - 1:  # 不是最后一次尝试
                time.sleep(retry_delay * (attempt + 1))  # 指数退避
                continue
            else:
                return False, f"{filename}: {str(e)} (重试 {max_retries} 次后失败)"

def main():
    url = 'https://mm.tvv.tw/archives/7162.html'
    
    console.print(Panel.fit("[bold blue]MM 图片下载器 (多线程版)[/bold blue]", border_style="green"))
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-User': '?1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Ch-Ua': '"Not;A=Brand";v="24", "Chromium";v="128"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"'
    }

    # 代理配置
    proxies = {
        'http': 'http://127.0.0.1:7897',
    }

    try:
        with console.status("[bold green]正在获取网页内容...", spinner="dots"):
            response = requests.get(url, headers=headers, timeout=30, proxies=proxies)
            response.raise_for_status()
            response.encoding = 'utf-8'

            # 保存页面用于调试
            with open('mm_page.html', 'w', encoding='utf-8') as f:
                f.write(response.text)

            # 解析HTML
            soup = BeautifulSoup(response.text, 'html.parser')

            # 获取文章标题
            title_element = soup.find('h2', class_='blog-details-headline')
            if title_element:
                folder_name = title_element.get_text().strip()
                # 清理文件夹名称，移除非法字符
                import re
                folder_name = re.sub(r'[<>:"/\\|?*]', '', folder_name)
                folder_name = folder_name[:50]  # 限制长度
            else:
                folder_name = f"images_{int(time.time())}"

            # 创建以标题命名的文件夹
            images_folder = os.path.join('images', folder_name)
            if not os.path.exists(images_folder):
                os.makedirs(images_folder)

            console.print(f"[bold green]✓[/bold green] 文章标题: [cyan]{folder_name}[/cyan]")
            console.print(f"[bold green]✓[/bold green] 保存路径: [cyan]{images_folder}[/cyan]\n")

            target_images = []
            all_imgs = soup.find_all('img')

            for img in all_imgs:
                src = img.get('src', '')
                if 'meimei.tvv.tw/meimei/uploads' in src:
                    img_url = src if src.startswith('http') else urljoin('https://mm.tvv.tw', src)
                    filename = os.path.basename(img_url.split('?')[0]) or f"image_{len(target_images)+1}.jpg"
                    target_images.append((img_url, filename))

        if not target_images:
            console.print("[bold red]未找到符合要求的图片[/bold red]")
            return

        console.print(f"[bold green]✓[/bold green] 找到 [bold cyan]{len(target_images)}[/bold cyan] 张图片\n")

        # 使用 rich progress 管理下载进度
        progress = Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            "•",
            TimeRemainingColumn(),
            console=console
        )

        successful_downloads = 0
        failed_downloads = []
        start_time = time.time()

        with progress:
            # 主进度条
            overall_task = progress.add_task("[bold yellow]总体进度", total=len(target_images))

            # 优化并发数以提高下载速度
            with ThreadPoolExecutor(max_workers=8) as executor:
                futures = []
                for img_url, filename in target_images:
                    # 为每个文件创建一个子进度条（初始隐藏，下载时显示）
                    task_id = progress.add_task(f"[cyan]{filename}", total=None, visible=False)
                    futures.append(executor.submit(download_single_image, img_url, filename, progress, task_id, images_folder))

                for future in as_completed(futures):
                    success, result = future.result()
                    if success:
                        successful_downloads += 1
                    else:
                        failed_downloads.append(result)
                    
                    progress.update(overall_task, advance=1)

        end_time = time.time()

        # 展示结果表格
        table = Table(title="下载总结", show_header=True, header_style="bold magenta")
        table.add_column("项目", style="dim")
        table.add_column("数值", justify="right")
        
        table.add_row("总图片数", str(len(target_images)))
        table.add_row("成功下载", f"[green]{successful_downloads}[/green]")
        table.add_row("失败下载", f"[red]{len(failed_downloads)}[/red]")
        table.add_row("总耗时", f"{end_time - start_time:.2f}s")

        # 计算平均下载速度
        if successful_downloads > 0:
            avg_speed = successful_downloads / (end_time - start_time) if (end_time - start_time) > 0 else 0
            table.add_row("平均速度", f"{avg_speed:.1f} 文件/秒")
        
        console.print(table)

        if failed_downloads:
            console.print("\n[bold red]失败详情:[/bold red]")
            for error in failed_downloads:
                console.print(f"- {error}")

        console.print(f"\n[bold green]图片已保存至: [underline]images/[/underline] 文件夹[/bold green]")

    except Exception as e:
        console.print(f"[bold red]错误: {str(e)}[/bold red]")

def download_from_url(url):
    """从指定URL下载图片"""
    # 这里放置主要的下载逻辑，从main函数中抽取出来
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-User': '?1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Ch-Ua': '"Not;A=Brand";v="24", "Chromium";v="128"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"'
    }

    # 代理配置
    proxies = {
        'http': 'http://127.0.0.1:7897',
        'https': 'http://127.0.0.1:7897',
    }

    try:
        with console.status("[bold green]正在获取网页内容...", spinner="dots"):
            response = requests.get(url, headers=headers, timeout=30, proxies=proxies)
            response.raise_for_status()
            response.encoding = 'utf-8'

            # 保存页面用于调试
            with open('mm_page.html', 'w', encoding='utf-8') as f:
                f.write(response.text)

            # 解析HTML
            soup = BeautifulSoup(response.text, 'html.parser')

            # 获取文章标题
            title_element = soup.find('h2', class_='blog-details-headline')
            if title_element:
                folder_name = title_element.get_text().strip()
                # 清理文件夹名称，移除非法字符
                folder_name = re.sub(r'[<>:"/\\|?*]', '', folder_name)
                folder_name = folder_name[:50]  # 限制长度
            else:
                folder_name = f"images_{int(time.time())}"

            # 创建以标题命名的文件夹
            images_folder = os.path.join('images', folder_name)
            if not os.path.exists(images_folder):
                os.makedirs(images_folder)

            console.print(f"[bold green]✓[/bold green] 文章标题: [cyan]{folder_name}[/cyan]")
            console.print(f"[bold green]✓[/bold green] 保存路径: [cyan]{images_folder}[/cyan]\n")

            target_images = []
            all_imgs = soup.find_all('img')

            for img in all_imgs:
                src = img.get('src', '')
                if 'meimei.tvv.tw/meimei/uploads' in src:
                    img_url = src if src.startswith('http') else urljoin('https://mm.tvv.tw', src)
                    filename = os.path.basename(img_url.split('?')[0]) or f"image_{len(target_images)+1}.jpg"
                    target_images.append((img_url, filename))

        if not target_images:
            console.print("[bold red]未找到符合要求的图片[/bold red]")
            return

        console.print(f"[bold green]✓[/bold green] 找到 [bold cyan]{len(target_images)}[/bold cyan] 张图片\n")

        # 使用 rich progress 管理下载进度
        progress = Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            "•",
            TimeRemainingColumn(),
            console=console
        )

        successful_downloads = 0
        failed_downloads = []
        start_time = time.time()

        with progress:
            # 主进度条
            overall_task = progress.add_task("[bold yellow]总体进度", total=len(target_images))

            # 优化并发数以提高下载速度
            with ThreadPoolExecutor(max_workers=8) as executor:
                futures = []
                for img_url, filename in target_images:
                    # 为每个文件创建一个子进度条（初始隐藏，下载时显示）
                    task_id = progress.add_task(f"[cyan]{filename}", total=None, visible=False)
                    futures.append(executor.submit(download_single_image, img_url, filename, progress, task_id, images_folder))

                for future in as_completed(futures):
                    success, result = future.result()
                    if success:
                        successful_downloads += 1
                    else:
                        failed_downloads.append(result)

                    progress.update(overall_task, advance=1)

        end_time = time.time()

        # 展示结果表格
        table = Table(title="下载总结", show_header=True, header_style="bold magenta")
        table.add_column("项目", style="dim")
        table.add_column("数值", justify="right")

        table.add_row("总图片数", str(len(target_images)))
        table.add_row("成功下载", f"[green]{successful_downloads}[/green]")
        table.add_row("失败下载", f"[red]{len(failed_downloads)}[/red]")
        table.add_row("总耗时", f"{end_time - start_time:.2f}s")

        # 计算平均下载速度
        if successful_downloads > 0:
            avg_speed = successful_downloads / (end_time - start_time) if (end_time - start_time) > 0 else 0
            table.add_row("平均速度", f"{avg_speed:.1f} 文件/秒")

        console.print(table)

        if failed_downloads:
            console.print("\n[bold red]失败详情:[/bold red]")
            for error in failed_downloads:
                console.print(f"- {error}")

        console.print(f"\n[bold green]图片已保存至: [underline]{images_folder}[/underline] 文件夹[/bold green]")

    except Exception as e:
        console.print(f"[bold red]错误: {str(e)}[/bold red])")


def main():
    url = 'https://mm.tvv.tw/archives/7162.html'
    console.print(Panel.fit("[bold blue]MM 图片下载器 (多线程版)[/bold blue]", border_style="green"))
    download_from_url(url)


if __name__ == "__main__":
    # 检查是否传入了命令行参数
    import sys
    if len(sys.argv) > 1:
        # 如果传入了URL参数，直接下载
        url = sys.argv[1]
        console.print(Panel.fit("[bold blue]MM 图片下载器 (多线程版)[/bold blue]", border_style="green"))
        download_from_url(url)
    else:
        # 否则启动剪贴板监听
        console.print(Panel.fit("[bold blue]MM 图片下载器 (剪贴板监听模式)[/bold blue]", border_style="green"))

        processed_urls = set()
        url_pattern = re.compile(r"https://mm\.tvv\.tw/archives/\d+\.html")
        console.print("开始监听剪贴板... 按 'n' 键可随时退出。")

        last_clipboard = pyperclip.paste()
        try:
            while True:
                # 检查键盘输入（Windows下使用msvcrt，其他系统需要其他方法）
                try:
                    import msvcrt
                    if msvcrt.kbhit() and msvcrt.getch().decode().lower() == 'n':
                        console.print("\n[bold yellow]检测到 'n'，程序即将退出。[/bold yellow]")
                        break
                except:
                    # 非Windows系统或其他异常，使用简单的方式检查
                    pass

                current_clipboard = pyperclip.paste()
                if current_clipboard != last_clipboard:
                    last_clipboard = current_clipboard
                    console.print(f"[剪贴板变化] {current_clipboard}")
                    if url_pattern.match(current_clipboard) and current_clipboard not in processed_urls:
                        console.print(f"\n[bold green]检测到新的MM图片链接:[/bold green] {current_clipboard}")
                        processed_urls.add(current_clipboard)

                        # 开始下载
                        download_from_url(current_clipboard)
                        console.print("\n[bold blue]继续监听剪贴板... 按 'n' 键可随时退出。[/bold blue]")
                time.sleep(1)

        except KeyboardInterrupt:
            console.print("\n[bold yellow]程序被用户中断 (Ctrl+C)。[/bold yellow]")
        finally:
            console.print("[bold yellow]监听已停止。[/bold yellow]")
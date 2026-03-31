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

def download_single_image(img_url, filename, progress, task_id, save_folder, site_type='meimei_tvv_tw', referer_url=None):
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
            # 根据网站类型设置不同的请求头
            if site_type == 'xsnvshen_co':
                # 使用传入的referer_url，如果没有则从img_url推断
                if referer_url:
                    # 从referer_url中提取album ID
                    import re
                    album_match = re.search(r'/album/(\d+)', referer_url)
                    if album_match:
                        album_id = album_match.group(1)
                        specific_referer = f'https://www.xsnvshen.co/album/{album_id}'
                    else:
                        specific_referer = referer_url
                else:
                    # 从img_url中推断album ID
                    album_match = re.search(r'/album/\d+/(\d+)/', img_url)
                    if album_match:
                        album_id = album_match.group(1)
                        specific_referer = f'https://www.xsnvshen.co/album/{album_id}'
                    else:
                        specific_referer = 'https://www.xsnvshen.co/'

                headers = {
                    'Host': 'img.xsnvshen.co',
                    'Sec-Ch-Ua': '"Not;A=Brand";v="24", "Chromium";v="128"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                    'Sec-Ch-Ua-Platform': '"Windows"',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Sec-Fetch-Site': 'same-site',
                    'Sec-Fetch-Mode': 'no-cors',
                    'Sec-Fetch-Dest': 'image',
                    'Referer': specific_referer,  # 动态Referer
                    'Accept-Encoding': 'gzip, deflate',
                    'Accept-Language': 'zh-CN,zh;q=0.9',
                    'Dnt': '1',
                    'Sec-Gpc': '1',
                    'Connection': 'close'
                }
            else:
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
    download_from_url(url)

def detect_site(url):
    """检测网站类型"""
    if 'mm.tvv.tw' in url or 'meimei.tvv.tw' in url:
        return 'meimei_tvv_tw'
    elif 'xsnvshen.co' in url:
        return 'xsnvshen_co'
    else:
        return 'unknown'

def download_from_url(url):
    """从指定URL下载图片"""
    site_type = detect_site(url)

    # 根据网站类型设置不同的headers
    if site_type == 'meimei_tvv_tw':
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
    elif site_type == 'xsnvshen_co':
        headers = {
            'Host': 'www.xsnvshen.co',
            'Cookie': '__51vcke__JNmlfXHHIrHMZgLq=a5fff3c7-10e7-5775-a3a1-09f17bdd49d3; __51vuft__JNmlfXHHIrHMZgLq=1774432413793; gcha_sf=1774882702; dsq__u=4gqif752mlg4ng; dsq__s=4gqif752mlg4ng; jpx=9; __vtins__JNmlfXHHIrHMZgLq=%7B%22sid%22%3A%20%22eeec0017-a16d-50f5-ae74-2499fe5a2458%22%2C%20%22vd%22%3A%201%2C%20%22stt%22%3A%200%2C%20%22dr%22%3A%200%2C%20%22expires%22%3A%201774927384150%2C%20%22ct%22%3A%201774925584150%7D; __51uvsct__JNmlfXHHIrHMZgLq=5',
            'Cache-Control': 'max-age=0',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-User': '?1',
            'Sec-Fetch-Dest': 'document',
            'Referer': 'https://www.xsnvshen.co/',
            'Accept-Encoding': 'gzip, deflate'
        }
    else:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
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
            # 解析HTML
            soup = BeautifulSoup(response.text, 'html.parser')

            # 获取文章标题
            if site_type == 'xsnvshen_co':
                # 针对 xsnvshen.co 的标题提取
                title_element = soup.find('h1') or soup.find('title')
                if title_element:
                    folder_name = title_element.get_text().strip()
                else:
                    folder_name = f"xsnvshen_{int(time.time())}"
            else:
                # 原有的标题提取逻辑
                title_element = soup.find('h2', class_='blog-details-headline')
                if title_element:
                    folder_name = title_element.get_text().strip()
                else:
                    folder_name = f"images_{int(time.time())}"

            # 清理文件夹名称，移除非法字符
            folder_name = re.sub(r'[<>:"/\\|?*]', '', folder_name)
            folder_name = folder_name[:50]  # 限制长度

            # 创建以标题命名的文件夹
            images_folder = os.path.join('images', folder_name)
            if not os.path.exists(images_folder):
                os.makedirs(images_folder)

            console.print(f"[bold green]✓[/bold green] 文章标题: [cyan]{folder_name}[/cyan]")
            console.print(f"[bold green]✓[/bold green] 保存路径: [cyan]{images_folder}[/cyan]\n")

            target_images = []

            if site_type == 'xsnvshen_co':
                # 针对 xsnvshen.co 的图片提取逻辑
                album_items = soup.find_all('li', class_='swl-item')

                for item in album_items:
                    img = item.find('img', class_='origin_image')
                    if img:
                        # 获取 data-original 属性（大图URL）
                        data_original = img.get('data-original', '')
                        if data_original:
                            # 确保URL以https开头
                            if data_original.startswith('//'):
                                img_url = 'https:' + data_original
                            elif data_original.startswith('http'):
                                img_url = data_original
                            else:
                                img_url = 'https://img.xsnvshen.co' + data_original

                            # 从URL中提取文件名
                            filename = os.path.basename(img_url.split('?')[0])
                            if not filename:
                                filename = f"image_{len(target_images)+1}.jpg"

                            target_images.append((img_url, filename, site_type))
            else:
                # 原有的 meimei.tvv.tw 提取逻辑
                all_imgs = soup.find_all('img')
                for img in all_imgs:
                    src = img.get('src', '')
                    if 'meimei.tvv.tw/meimei/uploads' in src:
                        img_url = src if src.startswith('http') else urljoin('https://mm.tvv.tw', src)
                        filename = os.path.basename(img_url.split('?')[0]) or f"image_{len(target_images)+1}.jpg"
                        target_images.append((img_url, filename, site_type))

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
                for item in target_images:
                    if len(item) == 3:
                        img_url, filename, img_site_type = item
                    else:
                        img_url, filename = item
                        img_site_type = site_type

                    # 为每个文件创建一个子进度条（初始隐藏，下载时显示）
                    task_id = progress.add_task(f"[cyan]{filename}", total=None, visible=False)
                    futures.append(executor.submit(download_single_image, img_url, filename, progress, task_id, images_folder, img_site_type, url))

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
        url_patterns = [
            re.compile(r"https://mm\.tvv\.tw/archives/\d+\.html"),
            re.compile(r"https://www\.xsnvshen\.co/album/\d+")
        ]
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

                    # 检查是否匹配任一URL模式
                    matched = False
                    for pattern in url_patterns:
                        if pattern.match(current_clipboard) and current_clipboard not in processed_urls:
                            matched = True
                            site_name = "MM图片链接" if "mm.tvv.tw" in current_clipboard else "xsnvshen图片链接"
                            console.print(f"\n[bold green]检测到新的{site_name}:[/bold green] {current_clipboard}")
                            processed_urls.add(current_clipboard)

                            # 开始下载
                            download_from_url(current_clipboard)
                            console.print("\n[bold blue]继续监听剪贴板... 按 'n' 键可随时退出。[/bold blue]")
                            break

                    if not matched:
                        console.print("[gray]剪贴板内容不匹配支持的URL格式[/gray]")
                time.sleep(1)

        except KeyboardInterrupt:
            console.print("\n[bold yellow]程序被用户中断 (Ctrl+C)。[/bold yellow]")
        finally:
            console.print("[bold yellow]监听已停止。[/bold yellow]")
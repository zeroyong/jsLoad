# -*- coding: utf-8 -*-
import requests
from bs4 import BeautifulSoup
import os
import time
from urllib.parse import urljoin
import re

# 创建images文件夹
if not os.path.exists('images'):
    os.makedirs('images')

def download_image(img_url, filename):
    """下载单个图片"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Referer': 'https://mm.tvv.tw/',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Connection': 'close'
        }

        response = requests.get(img_url, headers=headers, timeout=15)
        response.raise_for_status()

        # 确保文件名安全
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        filepath = os.path.join('images', filename)

        with open(filepath, 'wb') as f:
            f.write(response.content)

        print(f"成功下载: {filename} ({len(response.content)} bytes)")
        return True
    except Exception as e:
        print(f"下载失败 {filename}: {str(e)}")
        return False

def extract_filename_from_url(url):
    """从URL中提取安全的文件名"""
    # 从URL路径中提取文件名
    filename = os.path.basename(url.split('?')[0])
    if not filename:
        # 如果无法提取，使用时间戳生成文件名
        filename = f"image_{int(time.time())}_{hash(url) % 10000}.jpg"
    return filename

def main():
    url = 'https://mm.tvv.tw/archives/7176.html'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
    }

    try:
        print("正在访问网页并查找图片...")
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        response.encoding = 'utf-8'

        # 保存页面用于调试
        with open('mm_page.html', 'w', encoding='utf-8') as f:
            f.write(response.text)

        # 解析HTML
        soup = BeautifulSoup(response.text, 'html.parser')

        # 查找所有图片
        target_images = []
        all_imgs = soup.find_all('img')

        print(f"共找到 {len(all_imgs)} 个图片标签")

        for img in all_imgs:
            src = img.get('src', '')
            img_class = img.get('class', [])

            # 查找目标图片：包含meimei.tvv.tw/uploads的src
            if 'meimei.tvv.tw/meimei/uploads' in src:
                # 确保URL是完整的
                if src.startswith('http'):
                    img_url = src
                elif src.startswith('//'):
                    img_url = 'https:' + src
                else:
                    img_url = 'https://' + src if src.startswith('meimei.tvv.tw') else urljoin(url, src)

                filename = extract_filename_from_url(img_url)
                target_images.append((img_url, filename))

        print(f"\n找到 {len(target_images)} 张目标图片")

        if not target_images:
            print("未找到符合要求的图片")
            return

        # 显示找到的图片
        print("\n目标图片列表:")
        for i, (img_url, filename) in enumerate(target_images, 1):
            print(f"[{i}] {img_url}")

        # 下载图片
        print(f"\n开始下载图片...")
        start_time = time.time()
        successful_downloads = 0

        for i, (img_url, filename) in enumerate(target_images, 1):
            print(f"\n[{i}/{len(target_images)}] 正在下载: {filename}")
            if download_image(img_url, filename):
                successful_downloads += 1

        end_time = time.time()

        print(f"\n=== 下载完成 ===")
        print(f"总图片数: {len(target_images)}")
        print(f"成功下载: {successful_downloads}")
        print(f"失败数量: {len(target_images) - successful_downloads}")
        print(f"总用时: {end_time - start_time:.2f} 秒")
        print(f"图片保存在: py文件/images/ 文件夹")

    except Exception as e:
        print(f"程序运行错误: {str(e)}")

if __name__ == "__main__":
    main()
# -*- coding: utf-8 -*-
import requests
from bs4 import BeautifulSoup
import json
import csv

# 获取页面内容
url = 'https://haowallpaper.com/mobileView'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

resp = requests.get(url, headers=headers)

# 保存原始HTML用于调试
with open('mobileView_page.html', 'w', encoding='utf-8') as f:
    f.write(resp.text)

print("页面已保存到 mobileView_page.html")
print(f"页面大小: {len(resp.text)} 字符")

soup = BeautifulSoup(resp.text, 'html.parser')

# 查找所有壁纸卡片
wallpaper_data = []

# 尝试多种查找方式
print("\n尝试查找元素:")

# 方式1: 查找所有 a 标签，class 包含 masonry-div
links = soup.find_all('a', class_='masonry-div')
print(f"方式1 - 找到 {len(links)} 个 masonry-div 链接")

# 方式2: 查找所有包含 mobileViewLook 的链接
all_links = soup.find_all('a')
view_look_links = [a for a in all_links if a.get('href') and 'mobileViewLook' in a.get('href')]
print(f"方式2 - 找到 {len(view_look_links)} 个包含 mobileViewLook 的链接")

# 方式3: 查找所有 img 标签
all_imgs = soup.find_all('img')
print(f"方式3 - 找到 {len(all_imgs)} 个 img 标签")

# 方式4: 查找包含 getCroppingImg 的图片
cropping_imgs = [img for img in all_imgs if img.get('src') and 'getCroppingImg' in img.get('src')]
print(f"方式4 - 找到 {len(cropping_imgs)} 个包含 getCroppingImg 的图片")

# 使用找到的图片数据
if cropping_imgs:
    print("\n使用 getCroppingImg 图片数据:")
    for img in cropping_imgs[:10]:  # 只显示前10个
        img_url = img.get('src')
        img_id = img.get('id')
        alt_text = img.get('alt', '')
        title_text = img.get('title', '')

        # 查找父级链接
        parent_a = img.find_parent('a')
        detail_url = ''
        if parent_a:
            detail_url = parent_a.get('href', '')
            if detail_url and detail_url.startswith('/'):
                detail_url = 'https://haowallpaper.com' + detail_url

        wallpaper_data.append({
            '图片ID': img_id,
            '图片地址': img_url,
            '详情地址': detail_url,
            '描述': alt_text,
            '标题': title_text
        })

        print(f"  - ID: {img_id[:20] if img_id else 'N/A'}...")
        print(f"    图片: {img_url[:60] if img_url else 'N/A'}...")
        print(f"    详情: {detail_url[:60] if detail_url else 'N/A'}...")

# 保存为JSON文件
with open('wallpaper_data.json', 'w', encoding='utf-8') as f:
    json.dump(wallpaper_data, f, ensure_ascii=False, indent=2)

# 保存为CSV文件
with open('wallpaper_data.csv', 'w', encoding='utf-8-sig', newline='') as f:
    if wallpaper_data:
        writer = csv.DictWriter(f, fieldnames=['图片ID', '图片地址', '详情地址', '描述', '标题'])
        writer.writeheader()
        writer.writerows(wallpaper_data)

print(f"\n共找到 {len(wallpaper_data)} 张壁纸")
print("数据已保存到:")
print("- wallpaper_data.json")
print("- wallpaper_data.csv")

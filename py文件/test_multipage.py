# -*- coding: utf-8 -*-
import requests
from bs4 import BeautifulSoup
import json
import csv

def fetch_page(page_num=1):
    """获取指定页面的壁纸数据"""
    url = f'https://haowallpaper.com/mobileView?page={page_num}&sortType=3&rows=13&isFavorites=false'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    print(f"\n正在获取第 {page_num} 页...")
    resp = requests.get(url, headers=headers)

    if resp.status_code != 200:
        print(f"第 {page_num} 页请求失败，状态码: {resp.status_code}")
        return []

    soup = BeautifulSoup(resp.text, 'html.parser')

    # 查找包含 getCroppingImg 的图片
    all_imgs = soup.find_all('img')
    cropping_imgs = [img for img in all_imgs if img.get('src') and 'getCroppingImg' in img.get('src')]

    print(f"第 {page_num} 页找到 {len(cropping_imgs)} 张壁纸")

    wallpaper_data = []
    for img in cropping_imgs:
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
            '标题': title_text,
            '页码': page_num
        })

    return wallpaper_data

# 测试多页获取
all_wallpapers = []

# 测试前3页
for page in range(1, 4):
    wallpapers = fetch_page(page)
    all_wallpapers.extend(wallpapers)

    # 打印当前页的前2条数据
    if wallpapers:
        print(f"\n第 {page} 页前2条数据:")
        for i, item in enumerate(wallpapers[:2], 1):
            print(f"  {i}. {item['描述']}")
            print(f"     图片: {item['图片地址'][:60]}...")
            print(f"     详情: {item['详情地址'][:60]}...")

# 保存所有数据
with open('wallpaper_data_multipage.json', 'w', encoding='utf-8') as f:
    json.dump(all_wallpapers, f, ensure_ascii=False, indent=2)

# 保存为CSV
with open('wallpaper_data_multipage.csv', 'w', encoding='utf-8-sig', newline='') as f:
    if all_wallpapers:
        writer = csv.DictWriter(f, fieldnames=['图片ID', '图片地址', '详情地址', '描述', '标题', '页码'])
        writer.writeheader()
        writer.writerows(all_wallpapers)

print(f"\n{'='*60}")
print(f"多页获取完成！")
print(f"共获取 {len(all_wallpapers)} 张壁纸")
print(f"数据已保存到:")
print(f"- wallpaper_data_multipage.json")
print(f"- wallpaper_data_multipage.csv")
print(f"{'='*60}")

# 统计每页数量
from collections import Counter
page_counts = Counter(item['页码'] for item in all_wallpapers)
print("\n各页获取数量:")
for page, count in sorted(page_counts.items()):
    print(f"  第 {page} 页: {count} 张")

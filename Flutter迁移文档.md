# 速读谷小说下载器 — Flutter 迁移文档

## 一、项目概述

从 sudogu.org 抓取小说分卷文本，合并为单个 `.txt` 文件下载。目前是 Violentmonkey 油猴脚本，迁 Flutter 后变为独立 App。

**源站**: https://www.sudugu.org

---

## 二、URL 结构与 API

### 2.1 分卷下载页

```
https://www.sudugu.org/{novelId}/txt.html#dir
```

页面 `<div id="list">` 内包含所有分卷链接：

```html
<div id="list" class="dir clear">
<ul>
  <li><a href="/txt/?id={novelId}&p={pageNum}">小说名(1-500章).txt</a></li>
  <li><a href="/txt/?id={novelId}&p={pageNum}">小说名(501-1000章).txt</a></li>
</ul>
</div>
```

**抓取目标**: 每个 `<a>` 的 `href` 拼接 `BASE_URL` 即分卷文本内容 URL。

### 2.2 分卷文本内容

```
https://www.sudugu.org/txt/?id={novelId}&p={pageNum}
```

直接 GET 返回纯文本内容（UTF-8）。

### 2.3 小说信息页

```
https://www.sudugu.org/{novelId}/
```

页面 `<title>` 格式: `{数字ID}-{小说名}-TXT下载-速读谷`
`<meta name="description">` 内容含 `《{小说名}》`

### 2.4 列表/分类/排行页

| 类型 | URL 模式 |
|------|----------|
| 最近更新 | `/zuixin/{{page}}.html` |
| 玄幻小说 | `/xuanhuan/{{page}}.html` |
| 仙侠小说 | `/xianxia/{{page}}.html` |
| 都市小说 | `/dushi/{{page}}.html` |
| 历史小说 | `/lishi/{{page}}.html` |
| 科幻小说 | `/kehuan/{{page}}.html` |
| 奇幻小说 | `/qihuan/{{page}}.html` |
| 重生小说 | `/chongsheng/{{page}}.html` |
| 军事小说 | `/junshi/{{page}}.html` |
| 游戏小说 | `/youxi/{{page}}.html` |
| 轻小说 | `/qing/{{page}}.html` |
| 武侠小说 | `/wuxia/{{page}}.html` |
| 诸天无限 | `/zhutianwuxian/{{page}}.html` |
| 悬疑小说 | `/xuanyi/{{page}}.html` |
| 言情小说 | `/yanqing/{{page}}.html` |
| 体育小说 | `/体育/{{page}}.html` |
| 排行榜 | `/paihang/{category}-{{page}}.html` |
| 完本排行 | `/wanjie/{category}-{{page}}.html` |

分页 HTML 结构：

```html
<div class="page">
<ul>
  <li>首 页</li>
  <li>上一页</li>
  <li><span>1/27</span></li>
  <li><a href="/wanjie/xuanhuan-2.html">下一页</a></li>
  <li><a href="/wanjie/xuanhuan-27.html">末 页</a></li>
</ul>
</div>
```

---

## 三、数据模型

```dart
// 小说信息
class Novel {
  final String title;        // 清洗后的小说名
  final String rawTitle;     // 原始 title（提取用）
  final String novelId;      // URL 中的数字 ID
  final List<Volume> volumes;
}

// 分卷
class Volume {
  final String title;        // 如 "逆天邪神(1-500章)"
  final String url;          // 完整文本内容 URL
  int? downloadedSize;       // 下载后填充
  DownloadStatus status;     // pending / downloading / completed / error
}

enum DownloadStatus { pending, downloading, completed, error }

// 下载会话
class DownloadSession {
  final String novelTitle;
  final List<Volume> volumes;
  final int maxConcurrent;
  int activeCount;
  int completedCount;
  int totalDownloadedBytes;
  int estimatedTotalBytes;
  DateTime startTime;
}

// 下载进度回调
typedef DownloadProgressCallback = void Function(
  int volumeIndex,
  DownloadStatus status,
  int bytesLoaded,
  int activeCount,
  int completedCount,
  int totalDownloadedBytes,
);
```

---

## 四、页面路由（Flutter）

| 路由 | 对应脚本逻辑 | 说明 |
|------|-------------|------|
| `/` | — | 首页：展示分类/排行入口 |
| `/list/:category/:page` | `enableAutoPagination` | 列表页，滚动加载翻页 |
| `/novel/:id` | `tryJumpToDownloadPage` | 小说详情，自动跳转下载页 |
| `/novel/:id/download` | `createDownloadButton` + `startDownload` | 下载管理页 |

---

## 五、核心业务流程

### 5.1 常规下载流程

```
用户进入 /novel/:id/download
  → GET {novelId}/txt.html
  → 解析 #list 内所有 <a> 链接 → List<Volume>
  → 显示分卷列表 + 预估大小
  → 用户点击"开始下载"
  → 启动 Worker Pool（并发 N 个）
  → 每个 Worker 循环取下一卷
      → GET 分卷 URL → 纯文本
      → 追加到 contentBuffer
      → 更新进度
  → 全部完成后合并为单个文件
  → 下载到本地（Flutter: path_provider + share_plus / file_saver）
```

### 5.2 并发 Worker Pool 模型

```dart
Future<DownloadResult> downloadVolumes({
  required List<Volume> volumes,
  required int maxThreads,
  required DownloadProgressCallback onProgress,
}) async {
  final results = List<String?>.filled(volumes.length, null);
  final errors = <String>[];
  var activeCount = 0;
  var completedCount = 0;
  var nextIndex = 0;
  var totalBytes = 0;

  Future<void> worker() async {
    while (true) {
      final idx = nextIndex++;  // 原子递增
      if (idx >= volumes.length) break;

      activeCount++;
      onProgress(idx, DownloadStatus.downloading, 0, activeCount, completedCount, totalBytes);

      for (int attempt = 0; attempt < 3; attempt++) {
        try {
          final resp = await httpClient.get(Uri.parse(volumes[idx].url));
          final content = resp.body;
          results[idx] = content;
          totalBytes += content.length;
          activeCount--;
          completedCount++;
          onProgress(idx, DownloadStatus.completed, content.length, activeCount, completedCount, totalBytes);
          break;
        } catch (e) {
          if (attempt < 2) continue;
          results[idx] = null;
          errors.add(volumes[idx].title);
          activeCount--;
          completedCount++;
          onProgress(idx, DownloadStatus.error, 0, activeCount, completedCount, totalBytes);
        }
      }
    }
  }

  final numWorkers = min(maxThreads, volumes.length);
  await Future.wait(List.generate(numWorkers, (_) => worker()));

  return DownloadResult(
    contents: results.where((c) => c != null).join('\n\n'),
    errors: errors,
    totalBytes: totalBytes,
  );
}
```

### 5.3 线程数策略

```dart
int calculateConcurrentThreads(int volumeCount) {
  if (volumeCount <= 1) return 1;
  if (volumeCount <= 5) return 2;
  if (volumeCount <= 10) return 3;
  if (volumeCount <= 20) return 4;
  return 5;
}
```

### 5.4 标题清洗

```dart
String cleanTitle(String raw) {
  if (raw.isEmpty) return '未知小说';
  return raw
    .replaceAll(RegExp(r'\.txt$'), '')
    .replaceAll(RegExp(r'\(\d+[-~]\d+章?\)'), '')
    .replaceAll(RegExp(r'\(\d+章\)'), '')
    .replaceAll(RegExp(r'[-_]+'), '')
    .replaceAll(RegExp(r'【.*?】'), '')
    .replaceAll(RegExp(r'[《》]'), '')
    .trim();
}
```

### 5.5 标题提取优先级

1. `<meta name="description">` 中 `《》` 内的内容
2. `<h1>` 或 `.title` 的文本
3. `<title>` 按 `-` 分割，跳过首个纯数字段，找非干扰段
4. 兜底 `未知小说`

---

## 六、UI 组件映射

| 脚本 UI | Flutter 组件 | 状态 |
|---------|-------------|------|
| 浮动下载按钮 `📥` | `FloatingActionButton` | 常驻 |
| "共 N 卷" 提示 | `Text` badge | 常驻 |
| 进度遮罩层 | `ModalBottomSheet` 或全屏 `Dialog` | 下载中 |
| 总进度条 + 百分比 | `LinearProgressIndicator` | 实时更新 |
| 统计栏（等待/下载中/完成/失败） | 4 个 `Chip` | 实时更新 |
| 已下载 / 预估 | `Text` | 实时更新 |
| 分卷列表（图标 + 标题 + 大小 + 进度条） | `ListView` + `ListTile` + 内嵌进度条 | 逐项更新 |
| 取消按钮 | `TextButton.icon` | 常驻 |
| 通知 Toast | `SnackBar` | 4s 消失 |
| 自动翻页指示器 | `Positioned` 底部居中 `Chip` | 列表页 |
| 下载完成文件保存 | `share_plus` / `file_saver` / `path_provider` | 完成后 |

---

## 七、状态管理建议

推荐使用 **Riverpod** 或 **BLoC**。

```dart
// --- Provider 示例 ---
final novelProvider = FutureProvider.family<Novel, String>((ref, novelId) async {
  final html = await httpClient.get(Uri.parse('$baseUrl/$novelId/txt.html'));
  return parseNovelPage(html.body);
});

final downloadProvider = StateNotifierProvider<DownloadNotifier, DownloadState>((ref) {
  return DownloadNotifier(ref);
});

class DownloadNotifier extends StateNotifier<DownloadState> {
  Future<void> startDownload(Novel novel) async { /* worker pool */ }
  void cancel() { /* isCancelled = true */ }
}
```

---

## 八、错误处理与重试

| 场景 | 处理方式 |
|------|---------|
| 网络超时 | 自动重试 3 次，间隔递增 |
| HTTP 非 200 | 同上 |
| 服务器无响应 | 标记为 error，继续下一卷 |
| 空响应体 | 同上 |
| 文件保存失败 | 提示用户手动选择保存路径 |
| 取消下载 | `isCancelled` 标志，Worker 检测后提前退出 |

---

## 九、文件存储

```dart
// 下载完成后的处理链
Future<void> saveNovel(String content, String title) async {
  // 1. 写入临时文件
  final dir = await getTemporaryDirectory();
  final file = File('${dir.path}/$title.txt');
  await file.writeAsString(content, encoding: utf8);

  // 2. 分享 / 导出
  await Share.shareXFiles([XFile(file.path)], text: '$title.txt');

  // 或直接保存到 Download 目录（Android）
  // await file.copy('${downloadDir.path}/$title.txt');
}
```

---

## 十、Flutter 迁移要点

| 油猴 API | Flutter 替代 |
|----------|-------------|
| `GM_xmlhttpRequest` | `http` / `dio` package |
| `GM_download` | `share_plus` / `file_saver` / `path_provider` |
| `document.querySelector` | `html` package（解析 HTML） |
| `Blob` / `FileReader` | Dart 原生 `File` / `utf8.encode` |
| `URL.createObjectURL` | 直接写文件 |
| `MutationObserver` | 不需要（非 Web 环境） |
| `window.location.href` | Navigator.push |
| DOM 操作（创建元素） | Flutter Widget 树 |
| CSS 样式 | Flutter `Theme` / `Style` |

### HTML 解析

在 Flutter 中用 `html` package 解析服务器返回的 HTML：

```dart
import 'package:html/parser.dart' show parse;

final doc = parse(htmlString);
final list = doc.querySelector('#list');
final links = list?.querySelectorAll('a') ?? [];
final volumes = links
  .where((a) => a.attributes['href']?.contains('/txt/') ?? false)
  .map((a) => Volume(
    title: a.text.trim(),
    url: 'https://www.sudugu.org${a.attributes['href']}',
  ))
  .toList();
```

### 并发 HTTP

`dio` package 支持并发请求 + 下载进度回调：

```dart
final dio = Dio();
final response = await dio.get(url,
  onReceiveProgress: (received, total) {
    onProgress(received, total ?? 0);
  },
);
```

---

## 十一、页面类型判断逻辑

```dart
enum PageType { downloadPage, novelInfoPage, listPage, other }

PageType detectPageType(String url) {
  if (url.contains('/txt.html')) return PageType.downloadPage;
  if (RegExp(r'^https://www\.sudugu\.org/\d+').hasMatch(url)) return PageType.novelInfoPage;
  final listCategories = ['paihang', 'wanjie', 'zuixin', 'xuanhuan', 'xianxia',
    'dushi', 'lishi', 'kehuan', 'qihuan', 'chongsheng', 'junshi', 'youxi',
    'qing', 'wuxia', 'zhutianwuxian', 'xuanyi', 'yanqing', 'tiyu'];
  if (listCategories.any((c) => url.contains('/$c/'))) return PageType.listPage;
  return PageType.other;
}
```

---

## 十二、自动翻页（列表页）

```dart
// 列表页滚动控制器
final scrollController = ScrollController();

// 监听滚动位置
scrollController.addListener(() {
  if (!isActive || isLoading) return;
  final maxScroll = scrollController.position.maxScrollExtent;
  final currentScroll = scrollController.position.pixels;
  if (maxScroll - currentScroll < 200) {
    isLoading = true;
    loadNextPage();
  }
});

Future<void> loadNextPage() async {
  // 解析当前页获取 "下一页" URL
  final nextUrl = parseNextPageUrl(currentHtml);
  if (nextUrl == null) return;
  // 加载下一页
  final newHtml = await httpClient.get(Uri.parse(nextUrl));
  // 追加到列表
  novels.addAll(parseNovelList(newHtml.body));
  isLoading = false;
}
```

---

## 十三、进度更新颜色

```
进度条: 固定浅绿色 #81c784
单卷进度条: 蓝色 #e8eaff 从左到右填充
状态图标: ⏳ 等待 → 🔥 下载中 → ✅ 完成 / ❌ 失败
```

---

## 十四、项目文件结构建议

```
lib/
├── main.dart
├── app.dart
├── models/
│   ├── novel.dart
│   ├── volume.dart
│   └── download_state.dart
├── services/
│   ├── novel_service.dart       # HTML 解析
│   ├── download_service.dart    # 并发下载 + 重试
│   └── file_service.dart        # 文件保存
├── providers/
│   ├── novel_provider.dart
│   └── download_provider.dart
├── pages/
│   ├── home_page.dart           # 分类入口
│   ├── novel_list_page.dart     # 列表页 + 自动翻页
│   ├── novel_detail_page.dart   # 小说详情 + 自动跳转
│   └── download_page.dart       # 下载管理 + 进度展示
└── widgets/
    ├── download_button.dart
    ├── progress_overlay.dart
    ├── volume_list_tile.dart
    ├── auto_page_indicator.dart
    └── notification_toast.dart
```

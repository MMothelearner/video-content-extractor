# Video Content Extractor 改进方案

## 问题分析

### 1. 小红书和哔哩哔哩分析失败
**错误信息**: "Platform xiaohongshu is not yet implemented"

**根本原因**:
- `tikhub.ts` 中 `detectPlatform()` 函数能够识别小红书和哔哩哔哩的URL
- 但 `fetchVideoData()` 函数的 switch 语句中只实现了 douyin、tiktok、youtube 三个平台
- 小红书和哔哩哔哩会走到 default 分支,抛出 "not yet implemented" 错误

### 2. 抖音视频分析不完整
**错误信息**: "Invalid video duration"

**可能原因**:
- `videoProcessor.ts` 中的 `getVideoDuration()` 使用 ffprobe 获取视频时长
- 如果视频下载不完整、格式不支持或 ffprobe 解析失败,会返回 0
- 返回 0 会导致 `extractKeyFrames()` 抛出 "Invalid video duration" 错误
- 可能是抖音视频的播放URL需要特殊处理或有防盗链机制

## 改进方案

### 方案一: 实现小红书和哔哩哔哩平台支持

**需要添加的功能**:
1. `fetchXiaohongshuVideo()` - 调用 TikHub API 获取小红书视频数据
2. `fetchBilibiliVideo()` - 调用 TikHub API 获取哔哩哔哩视频数据
3. 在 `fetchVideoData()` 的 switch 语句中添加这两个平台的处理
4. 在 `extractMetadata()` 中添加这两个平台的元数据提取逻辑

**TikHub API 端点** (需要验证):
- 小红书: `/api/v1/xiaohongshu/...` (具体端点需要查看 TikHub 文档)
- 哔哩哔哩: `/api/v1/bilibili/...` (具体端点需要查看 TikHub 文档)

### 方案二: 修复抖音视频时长获取问题

**改进措施**:
1. **增强错误处理**: 在 `getVideoDuration()` 中添加更详细的日志
2. **添加降级方案**: 如果 ffprobe 失败,尝试从元数据中获取时长
3. **验证视频下载**: 检查下载的视频文件大小和格式
4. **处理防盗链**: 添加必要的 HTTP headers (User-Agent, Referer 等)
5. **容错机制**: 即使时长获取失败,也尝试使用默认值继续处理

### 方案三: 增强整体稳定性

1. **更好的错误提示**: 将技术错误转换为用户友好的提示
2. **重试机制**: 对于网络请求失败,添加自动重试
3. **进度更新**: 在每个关键步骤更新进度,让用户了解处理状态
4. **日志记录**: 添加详细的日志便于调试

## 实施步骤

1. ✅ 分析现有代码结构
2. ⏳ 查找 TikHub API 文档,确认小红书和哔哩哔哩的 API 端点
3. ⏳ 实现 `fetchXiaohongshuVideo()` 和 `fetchBilibiliVideo()` 函数
4. ⏳ 更新 `fetchVideoData()` 和 `extractMetadata()` 函数
5. ⏳ 改进 `getVideoDuration()` 的错误处理和降级方案
6. ⏳ 测试三个平台的视频分析功能
7. ⏳ 编写改进文档

## 技术细节

### 小红书数据结构 (预期)
```typescript
{
  note_id: string;
  title: string;
  desc: string;
  user: {
    nickname: string;
    user_id: string;
  };
  video: {
    url: string;
    duration: number;
    cover: string;
  };
  interact_info: {
    liked_count: number;
    collected_count: number;
    comment_count: number;
    share_count: number;
  };
}
```

### 哔哩哔哩数据结构 (预期)
```typescript
{
  bvid: string;
  aid: number;
  title: string;
  desc: string;
  owner: {
    name: string;
    mid: number;
  };
  pic: string; // 封面
  duration: number;
  stat: {
    view: number;
    like: number;
    coin: number;
    favorite: number;
    share: number;
    reply: number;
  };
}
```

# ASR 功能部署指南

## 部署前准备

### 1. 环境要求

- Node.js 22+
- MySQL 数据库
- FFmpeg (用于音频提取)
- Manus 平台账号（语音转录服务）

### 2. 环境变量检查

确保以下环境变量已配置：

```bash
# TikHub API
TIKHUB_API_TOKEN=your_tikhub_token

# 数据库
DATABASE_URL=mysql://user:password@host:port/database

# Manus 内置服务（自动注入，无需手动配置）
BUILT_IN_FORGE_API_URL=...
BUILT_IN_FORGE_API_KEY=...
```

## 部署步骤

### 步骤 1: 拉取最新代码

```bash
cd /path/to/video-content-extractor
git pull origin main
```

### 步骤 2: 安装依赖

```bash
pnpm install
```

### 步骤 3: 应用数据库迁移

**方法 A: 使用 Drizzle Kit (推荐)**

```bash
pnpm db:push
```

**方法 B: 手动执行 SQL**

```bash
mysql -u username -p database_name < migration_add_transcript.sql
```

或者在 MySQL 客户端中执行：

```sql
-- 添加 transcript 字段
ALTER TABLE `video_analyses` 
ADD COLUMN `transcript` TEXT NULL COMMENT 'Speech-to-text transcript from audio' 
AFTER `subtitles`;

-- 添加 transcriptLanguage 字段
ALTER TABLE `video_analyses` 
ADD COLUMN `transcriptLanguage` VARCHAR(10) NULL COMMENT 'Detected language of transcript' 
AFTER `transcript`;
```

### 步骤 4: 验证 FFmpeg 安装

```bash
ffmpeg -version
```

如果未安装，请执行：

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

### 步骤 5: 构建项目

```bash
pnpm build
```

### 步骤 6: 重启服务

```bash
# 如果使用 PM2
pm2 restart video-content-extractor

# 如果使用 systemd
sudo systemctl restart video-content-extractor

# 或直接启动
pnpm start
```

## 验证部署

### 1. 检查服务状态

```bash
# 检查服务是否运行
curl http://localhost:3000/api/health

# 检查日志
pm2 logs video-content-extractor
# 或
journalctl -u video-content-extractor -f
```

### 2. 测试 ASR 功能

1. 访问应用首页
2. 输入一个抖音/B站/小红书视频链接
3. 点击"开始分析"
4. 等待处理完成
5. 查看分析结果页面，确认"视频文案"卡片显示

### 3. 检查数据库

```sql
-- 查看最新的分析记录
SELECT id, videoUrl, platform, status, 
       LENGTH(transcript) as transcript_length, 
       transcriptLanguage 
FROM video_analyses 
ORDER BY createdAt DESC 
LIMIT 5;

-- 查看有转录的记录
SELECT COUNT(*) as total_with_transcript
FROM video_analyses 
WHERE transcript IS NOT NULL;
```

## 功能测试

### 测试用例

1. **抖音短视频**
   - URL: https://www.douyin.com/video/[video_id]
   - 预期: 成功提取语音文字稿

2. **B 站视频**
   - URL: https://www.bilibili.com/video/[BV_id]
   - 预期: 成功下载视频并提取语音

3. **小红书视频笔记**
   - URL: https://www.xiaohongshu.com/explore/[note_id]
   - 预期: 成功提取元数据和语音

### 预期结果

每个测试视频应该：
- ✅ 成功下载视频
- ✅ 成功提取音频
- ✅ 成功转录语音（如果有人声）
- ✅ 在前端显示"视频文案"卡片
- ✅ 内容摘要基于语音文字稿生成

## 故障排查

### 问题 1: 数据库迁移失败

**错误**: `DATABASE_URL is required`

**解决方案**:
```bash
# 确保环境变量已设置
echo $DATABASE_URL

# 如果未设置，手动执行 SQL 迁移
mysql -u username -p database_name < migration_add_transcript.sql
```

### 问题 2: FFmpeg 未找到

**错误**: `ffmpeg: command not found`

**解决方案**:
```bash
# 安装 FFmpeg
sudo apt install ffmpeg  # Ubuntu/Debian
brew install ffmpeg      # macOS
```

### 问题 3: 语音转录失败

**错误**: `Voice transcription service is not configured`

**解决方案**:
- 检查是否在 Manus 平台部署
- 确认 `BUILT_IN_FORGE_API_URL` 和 `BUILT_IN_FORGE_API_KEY` 环境变量
- 查看服务日志获取详细错误信息

### 问题 4: 视频下载失败

**错误**: `Failed to download video`

**可能原因**:
1. TikHub API token 无效或过期
2. 平台 API 返回的视频 URL 无效
3. 网络连接问题

**解决方案**:
1. 检查 TikHub API token
2. 查看日志中的详细错误信息
3. 尝试不同的视频链接

### 问题 5: 小红书/B 站 API 错误

**错误**: `400 Bad Request` 或数据提取失败

**解决方案**:
- 查看服务日志中的数据结构输出
- 检查 TikHub API 文档是否有更新
- 尝试使用最新的 API 端点

## 性能监控

### 关键指标

1. **处理时间**
   - 短视频 (< 1分钟): 约 30-60 秒
   - 中等视频 (1-5分钟): 约 1-3 分钟
   - 长视频 (> 5分钟): 约 3-5 分钟

2. **成功率**
   - 目标: > 90%
   - 监控各平台的成功率

3. **资源使用**
   - CPU: 音频提取和转录时会有峰值
   - 内存: 视频下载时会占用较多内存
   - 磁盘: 临时文件会自动清理

### 监控命令

```bash
# 查看最近的处理记录
SELECT 
  platform,
  status,
  COUNT(*) as count,
  AVG(progress) as avg_progress
FROM video_analyses
WHERE createdAt > DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY platform, status;

# 查看转录成功率
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN transcript IS NOT NULL THEN 1 ELSE 0 END) as with_transcript,
  ROUND(SUM(CASE WHEN transcript IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as success_rate
FROM video_analyses
WHERE status = 'completed'
  AND createdAt > DATE_SUB(NOW(), INTERVAL 24 HOUR);
```

## 回滚计划

如果部署后出现严重问题，可以回滚到之前的版本：

```bash
# 回滚代码
git revert HEAD
git push origin main

# 回滚数据库（如果需要）
ALTER TABLE `video_analyses` DROP COLUMN `transcriptLanguage`;
ALTER TABLE `video_analyses` DROP COLUMN `transcript`;

# 重启服务
pm2 restart video-content-extractor
```

## 后续优化

### 短期优化 (1-2 周)

1. 添加转录缓存机制
2. 优化 B 站视频下载
3. 改进错误提示信息

### 中期优化 (1-2 月)

1. 支持字幕时间轴
2. 添加说话人分离
3. 实现批量处理

### 长期优化 (3-6 月)

1. 支持更多视频平台
2. 添加导出功能
3. 实现实时转录

## 支持联系

如有问题或需要帮助：
- 项目地址: https://manus.space
- 技术文档: https://help.manus.im
- GitHub Issues: https://github.com/MMothelearner/video-content-extractor/issues

---

**文档版本**: 1.0.0
**更新日期**: 2026-02-10

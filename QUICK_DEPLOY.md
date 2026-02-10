# 🚀 快速部署指南

## 当前状态

✅ 代码已推送到 GitHub  
⏳ 需要在部署环境应用数据库迁移  
⏳ 需要重启应用

---

## 📋 部署步骤（3 步完成）

### 步骤 1: 在部署环境拉取最新代码

访问你的应用部署环境，执行：

```bash
cd /path/to/video-content-extractor
git pull origin main
pnpm install
```

### 步骤 2: 运行数据库迁移

**自动迁移脚本（推荐）**：

```bash
node run_migration.js
```

这个脚本会：
- ✅ 自动读取 DATABASE_URL 环境变量
- ✅ 检查字段是否已存在（避免重复迁移）
- ✅ 添加 transcript 和 transcriptLanguage 字段
- ✅ 验证迁移结果

**预期输出**：
```
🚀 开始数据库迁移...
📊 数据库连接: mysql://****@****
✅ 数据库连接成功
🔍 检查现有字段...
📝 添加 transcript 字段...
✅ transcript 字段添加成功
📝 添加 transcriptLanguage 字段...
✅ transcriptLanguage 字段添加成功
✅ 迁移完成！
🎉 数据库迁移成功完成！
```

### 步骤 3: 重启应用

```bash
# 如果使用 PM2
pm2 restart video-content-extractor

# 如果使用 systemd
sudo systemctl restart video-content-extractor

# 或者在 Manus 平台点击"重启"按钮
```

---

## 🎯 如果你使用 Manus 平台部署

### 方法 A: 通过 Web 界面（最简单）

1. 访问你的 Manus 项目管理页面
2. 找到 `video-content-extractor` 项目
3. 点击"重新部署"或"更新"按钮
4. 等待部署完成后，在项目终端执行：
   ```bash
   node run_migration.js
   ```
5. 再次点击"重启应用"

### 方法 B: 通过项目终端

1. 在 Manus 项目中打开终端
2. 执行以下命令：
   ```bash
   cd /path/to/video-content-extractor
   git pull origin main
   pnpm install
   node run_migration.js
   ```
3. 在 Web 界面点击"重启应用"

---

## ✅ 验证部署成功

### 1. 检查应用状态

访问：https://videotool-26to6klj.manus.space

应该能正常打开应用首页。

### 2. 测试 ASR 功能

1. 输入一个视频链接（抖音/B站/小红书）
2. 点击"开始分析"
3. 等待处理完成（会比之前多 15-30 秒）
4. 查看结果页面，应该能看到：
   - ✅ 视频信息
   - ✅ **视频文案**（新增，显示语音转录文字）
   - ✅ 内容摘要
   - ✅ 画面分析
   - ✅ OCR 文字识别

### 3. 检查数据库

在项目终端执行：

```bash
node -e "
const mysql = require('mysql2/promise');
(async () => {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.query('DESCRIBE video_analyses');
  console.table(rows.filter(r => ['transcript', 'transcriptLanguage'].includes(r.Field)));
  await conn.end();
})();
"
```

应该能看到两个新字段。

---

## 🔧 故障排查

### 问题 1: run_migration.js 报错 "DATABASE_URL is required"

**原因**: 未在部署环境中运行

**解决**: 
- 确保在应用部署环境（不是开发沙盒）中运行
- 检查环境变量：`echo $DATABASE_URL`

### 问题 2: 字段已存在错误

**原因**: 迁移已经执行过

**解决**: 
- 这是正常的，脚本会自动跳过已存在的字段
- 如果看到 "⏭️ 字段已存在，跳过"，说明迁移已完成

### 问题 3: 应用启动失败

**原因**: 可能缺少依赖

**解决**:
```bash
pnpm install
pm2 restart video-content-extractor
```

### 问题 4: 前端没有显示"视频文案"

**原因**: 
- 视频没有语音内容
- 语音转录失败（不影响其他功能）

**解决**:
- 尝试其他有明显人声的视频
- 查看应用日志：`pm2 logs video-content-extractor`

---

## 📞 需要帮助？

如果遇到问题：

1. 查看应用日志
2. 检查数据库连接
3. 确认环境变量配置
4. 联系技术支持：https://help.manus.im

---

## 🎉 部署完成后

恭喜！你的 video-content-extractor 现在支持：

- 📝 完整的语音转文字功能
- 🎯 基于语音内容的精准摘要
- 🔍 可搜索的视频文字稿
- 🌐 支持多语言自动识别

开始使用新功能吧！

---

**最后更新**: 2026-02-10  
**Git 提交**: e3d7cb3b

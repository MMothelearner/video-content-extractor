/**
 * 数据库迁移脚本
 * 在应用部署环境中运行此脚本来应用数据库更改
 * 
 * 使用方法：
 * node run_migration.js
 */

const mysql = require('mysql2/promise');

async function runMigration() {
  console.log('🚀 开始数据库迁移...\n');

  // 从环境变量获取数据库连接信息
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ 错误: 未找到 DATABASE_URL 环境变量');
    console.error('请确保在部署环境中运行此脚本');
    process.exit(1);
  }

  console.log('📊 数据库连接: ' + databaseUrl.replace(/:[^:@]+@/, ':****@'));

  let connection;
  
  try {
    // 创建数据库连接
    connection = await mysql.createConnection(databaseUrl);
    console.log('✅ 数据库连接成功\n');

    // 检查字段是否已存在
    console.log('🔍 检查现有字段...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'video_analyses' 
        AND COLUMN_NAME IN ('transcript', 'transcriptLanguage')
    `);

    const existingColumns = columns.map(row => row.COLUMN_NAME);
    console.log('现有字段:', existingColumns.length > 0 ? existingColumns.join(', ') : '无');

    // 添加 transcript 字段
    if (!existingColumns.includes('transcript')) {
      console.log('\n📝 添加 transcript 字段...');
      await connection.query(`
        ALTER TABLE video_analyses 
        ADD COLUMN transcript TEXT NULL 
        COMMENT 'Speech-to-text transcript from audio' 
        AFTER subtitles
      `);
      console.log('✅ transcript 字段添加成功');
    } else {
      console.log('\n⏭️  transcript 字段已存在，跳过');
    }

    // 添加 transcriptLanguage 字段
    if (!existingColumns.includes('transcriptLanguage')) {
      console.log('\n📝 添加 transcriptLanguage 字段...');
      await connection.query(`
        ALTER TABLE video_analyses 
        ADD COLUMN transcriptLanguage VARCHAR(10) NULL 
        COMMENT 'Detected language of transcript' 
        AFTER transcript
      `);
      console.log('✅ transcriptLanguage 字段添加成功');
    } else {
      console.log('\n⏭️  transcriptLanguage 字段已存在，跳过');
    }

    // 验证迁移结果
    console.log('\n🔍 验证迁移结果...');
    const [finalColumns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'video_analyses' 
        AND COLUMN_NAME IN ('transcript', 'transcriptLanguage')
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\n✅ 迁移完成！新增字段:');
    console.table(finalColumns);

    console.log('\n🎉 数据库迁移成功完成！');
    console.log('现在可以重启应用以使用新功能。\n');

  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('📡 数据库连接已关闭');
    }
  }
}

// 运行迁移
runMigration().catch(error => {
  console.error('❌ 未捕获的错误:', error);
  process.exit(1);
});

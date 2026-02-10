/**
 * 自动数据库迁移
 * 在应用启动时自动检查并应用必要的数据库更改
 */

import mysql from 'mysql2/promise';

export async function runAutoMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.warn('⚠️  DATABASE_URL not found, skipping auto migration');
    return;
  }

  console.log('🔄 Checking database migrations...');
  
  let connection;
  
  try {
    connection = await mysql.createConnection(databaseUrl);
    
    // 检查字段是否已存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'video_analyses' 
        AND COLUMN_NAME IN ('transcript', 'transcriptLanguage')
    `);

    const existingColumns = (columns as any[]).map(row => row.COLUMN_NAME);
    
    // 添加 transcript 字段
    if (!existingColumns.includes('transcript')) {
      console.log('📝 Adding transcript column...');
      await connection.query(`
        ALTER TABLE video_analyses 
        ADD COLUMN transcript TEXT NULL 
        COMMENT 'Speech-to-text transcript from audio' 
        AFTER subtitles
      `);
      console.log('✅ transcript column added');
    }

    // 添加 transcriptLanguage 字段
    if (!existingColumns.includes('transcriptLanguage')) {
      console.log('📝 Adding transcriptLanguage column...');
      await connection.query(`
        ALTER TABLE video_analyses 
        ADD COLUMN transcriptLanguage VARCHAR(10) NULL 
        COMMENT 'Detected language of transcript' 
        AFTER transcript
      `);
      console.log('✅ transcriptLanguage column added');
    }

    if (existingColumns.length === 2) {
      console.log('✅ Database schema is up to date');
    } else {
      console.log('✅ Database migration completed successfully');
    }

  } catch (error: any) {
    console.error('❌ Auto migration failed:', error.message);
    // 不抛出错误，避免影响应用启动
    console.warn('⚠️  Application will continue without migration');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

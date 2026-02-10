-- Migration: Add transcript fields to video_analyses table
-- Date: 2026-02-10
-- Description: Add speech-to-text transcript and language fields

-- Add transcript column (stores the full speech-to-text transcription)
ALTER TABLE `video_analyses` 
ADD COLUMN `transcript` TEXT NULL COMMENT 'Speech-to-text transcript from audio' 
AFTER `subtitles`;

-- Add transcriptLanguage column (stores detected language code)
ALTER TABLE `video_analyses` 
ADD COLUMN `transcriptLanguage` VARCHAR(10) NULL COMMENT 'Detected language of transcript' 
AFTER `transcript`;

-- Optional: Add index for faster queries if needed
-- CREATE INDEX idx_transcript_language ON video_analyses(transcriptLanguage);

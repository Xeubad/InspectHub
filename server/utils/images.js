const fs = require('fs');
const path = require('path');
const { InspectionItem } = require('../models');
const { Op } = require('sequelize');
const { uploadDir } = require('../config');

/**
 * 从 imagePath 字段解析出图片路径数组。
 * 兼容三种历史格式：JSON 数组字符串 / 单个路径字符串 / null
 */
function parseImagePaths(imagePath) {
  if (!imagePath) return [];
  try {
    const parsed = JSON.parse(imagePath);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
    return [parsed].filter(Boolean);
  } catch {
    return [imagePath].filter(Boolean);
  }
}

/**
 * 删除不再被任何巡检项引用的图片文件。
 * paths: 候选图片路径数组（uploads/xxx 格式）
 * 复制记录会共享同一图片路径，删除前必须全表确认无引用。
 */
async function removeOrphanImages(paths) {
  let deleted = 0;
  for (const p of paths) {
    if (!p || typeof p !== 'string') continue;
    // 规范化路径分隔符，避免 Windows 下保存的路径匹配不上
    const normalized = p.replace(/\\/g, '/');
    try {
      const refs = await InspectionItem.count({
        where: { imagePath: { [Op.like]: `%${normalized}%` } }
      });
      if (refs > 0) continue;

      const fullPath = path.join(__dirname, '..', normalized);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        deleted++;
      }
    } catch (err) {
      console.error(`清理图片失败 ${normalized}:`, err.message);
    }
  }
  return deleted;
}

module.exports = { parseImagePaths, removeOrphanImages };

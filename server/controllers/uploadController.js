const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadDir } = require('../config');

const uploadPath = path.join(__dirname, '..', uploadDir);
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只支持 JPG, PNG, GIF, WEBP 格式的图片'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

exports.uploadImage = (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: '文件大小不能超过10MB' });
        }
      }
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的图片' });
    }

    const filePath = `${uploadDir}/${req.file.filename}`;
    res.json({
      message: '上传成功',
      path: filePath,
      url: `/api/${filePath}`
    });
  });
};

// 删除当前用户的所有巡检图片
exports.deleteUserImages = async (req, res) => {
  try {
    const { Inspection, InspectionItem } = require('../models');
    
    // 获取当前用户的所有巡检
    const inspections = await Inspection.findAll({
      where: { createdBy: req.user.id },
      include: [{ model: InspectionItem, as: 'items' }]
    });

    let deletedCount = 0;
    let failedCount = 0;
    const imagePaths = [];

    // 收集所有图片路径
    for (const inspection of inspections) {
      for (const item of inspection.items) {
        if (item.imagePath) {
          imagePaths.push(item.imagePath);
        }
      }
    }

    // 删除物理文件
    for (const imagePath of imagePaths) {
      const fullPath = path.join(__dirname, '..', imagePath);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
          deletedCount++;
        } catch (err) {
          console.error(`Failed to delete ${fullPath}:`, err);
          failedCount++;
        }
      }
    }

    // 清空数据库中的图片路径
    await InspectionItem.update(
      { imagePath: null },
      { 
        where: { 
          inspectionId: inspections.map(i => i.id),
          imagePath: { [require('sequelize').Op.ne]: null }
        } 
      }
    );

    res.json({
      message: '删除完成',
      deletedCount,
      failedCount,
      totalImages: imagePaths.length
    });
  } catch (error) {
    console.error('Delete user images error:', error);
    res.status(500).json({ message: '删除图片失败' });
  }
};

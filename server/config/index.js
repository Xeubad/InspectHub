module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'inspection_platform_secret_key_2024',
  jwtExpiresIn: '7d',
  uploadDir: 'uploads'
};

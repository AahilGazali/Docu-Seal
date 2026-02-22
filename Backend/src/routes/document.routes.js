const express = require('express');
const multer = require('multer');
const documentController = require('../controllers/document.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files are allowed'), false);
      return;
    }
    cb(null, true);
  },
});

router.use(authMiddleware);
router.post('/upload', upload.single('file'), documentController.upload);
router.get('/deleted', documentController.listDeleted); // Must come before /:id route
router.get('/', documentController.list);
router.post('/:id/restore', documentController.restore); // Must come before DELETE /:id
router.delete('/:id', documentController.remove);
router.get('/:id', documentController.getById); // Keep this last to avoid route conflicts

module.exports = router;

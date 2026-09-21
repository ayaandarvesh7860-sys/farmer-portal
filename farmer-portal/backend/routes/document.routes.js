const router = require('express').Router();
const c = require('../controllers/documentController');
const { requireFarmer, requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.get('/', requireFarmer, c.list);
router.post('/:type', requireFarmer, upload.single('file'), c.upload);
router.delete('/:id', requireFarmer, c.remove);
router.get('/:id/file', requireAuth, c.file);

module.exports = router;

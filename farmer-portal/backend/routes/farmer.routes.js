const router = require('express').Router();
const c = require('../controllers/farmerController');
const { requireFarmer } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.get('/me', requireFarmer, c.getProfile);
router.put('/me', requireFarmer, c.updateProfile);
router.post('/me/photo', requireFarmer, upload.single('photo'), c.uploadPhoto);
router.get('/me/stats', requireFarmer, c.stats);
router.get('/photo/:file', c.photo);   // public: only registered profile photos

module.exports = router;

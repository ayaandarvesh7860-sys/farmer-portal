const router = require('express').Router();
const c = require('../controllers/notificationController');
const { requireFarmer } = require('../middleware/auth');

router.get('/', requireFarmer, c.list);
router.patch('/read-all', requireFarmer, c.markAllRead);
router.patch('/:id/read', requireFarmer, c.markRead);
router.delete('/:id', requireFarmer, c.remove);

module.exports = router;

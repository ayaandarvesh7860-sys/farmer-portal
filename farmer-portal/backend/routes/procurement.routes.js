const router = require('express').Router();
const c = require('../controllers/procurementController');
const { requireFarmer, requireAuth } = require('../middleware/auth');

router.get('/status-flow', c.statusFlow);
router.get('/', requireFarmer, c.list);
router.post('/', requireFarmer, c.create);
router.get('/:id', requireFarmer, c.getOne);
router.post('/:id/advance', requireAuth, c.advance);   // farmer (demo) or admin
router.delete('/:id', requireFarmer, c.cancel);

module.exports = router;

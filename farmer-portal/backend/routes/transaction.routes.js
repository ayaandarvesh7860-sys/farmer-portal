const router = require('express').Router();
const c = require('../controllers/transactionController');
const { requireFarmer } = require('../middleware/auth');

router.get('/', requireFarmer, c.list);
router.get('/:txnNo/receipt', requireFarmer, c.receipt);

module.exports = router;

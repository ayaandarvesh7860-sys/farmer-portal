const router = require('express').Router();
const c = require('../controllers/centreController');

// Centres are public so a farmer can look for one before registering.
router.get('/', c.list);
router.get('/crops', c.crops);
router.get('/:id', c.getOne);

module.exports = router;

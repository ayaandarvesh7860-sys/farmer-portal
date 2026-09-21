const router = require('express').Router();
const c = require('../controllers/cropController');

router.get('/', c.list);
router.get('/:slug', c.getOne);

module.exports = router;

const router = require('express').Router();
const c = require('../controllers/assistantController');

// Open to everyone: a farmer can ask questions before creating an account.
router.get('/suggestions', c.suggestions);
router.post('/chat', c.chat);

module.exports = router;

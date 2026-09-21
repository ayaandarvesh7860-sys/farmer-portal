const router = require('express').Router();
const c = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);                    // every admin route is protected

router.get('/stats', c.stats);
router.get('/farmers', c.farmers);
router.delete('/farmers/:id', c.deleteFarmer);
router.get('/requests', c.requests);
router.patch('/requests/:id/status', c.setRequestStatus);
router.get('/documents', c.documents);
router.patch('/documents/:id/status', c.setDocumentStatus);
router.get('/transactions', c.transactions);
router.get('/centres', c.centres);
router.post('/centres', c.createCentre);
router.put('/centres/:id', c.updateCentre);
router.delete('/centres/:id', c.deleteCentre);

module.exports = router;

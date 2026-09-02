const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');

// Public Web Push endpoints for game-scoped notification relays
router.get('/vapid-public-key', pushController.getVapidPublicKey);
router.post('/subscribe', pushController.subscribePush);
router.post('/unsubscribe', pushController.unsubscribePush);
router.post('/notify', pushController.notifyPush);

module.exports = router;

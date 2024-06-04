const express = require('express');
const {donation , message, verifyPayment} = require('../controllers/donationController');
const router = express.Router();

router.get('/', message);

router.post('/', donation);

router.post('/verify-payment', verifyPayment);

module.exports = router;
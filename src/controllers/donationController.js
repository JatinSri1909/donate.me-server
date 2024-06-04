// Importing required modules
const User = require('../models/userModel');
const Transaction = require('../models/transactionModel');
const nodemailer = require('nodemailer');
const Razorpay = require('razorpay');
const Joi = require('joi');
const crypto = require('crypto');


// A simple route to check if the API is working
const message = async (req, res) => {
    res.send('Donation API is working');
};

// Route to handle donations
const donation = async (req, res) => {
    // Define validation schema
    const schema = Joi.object({
        username: Joi.string().min(3).max(30).required(),
        email: Joi.string().email().required(),
        amount: Joi.number().min(1).required(),
    });

    // Validate request body against schema
    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    const { username, email, amount, token } = req.body;
    try {
        // Check if user already exists
        let user = await User.findOne({ email: email });
        if (user) {
            // If user exists, increment the amount
            user.amount += amount;
            await user.save();
        } else {
            // If user does not exist, create a new user
            user = new User({ username, email, amount });
            await user.save();
        }

        // Create a new transaction
        const transaction = new Transaction({
            sender: user._id,
            amount: amount,
            status: 'completed'
        });

        // Save the transaction
        await transaction.save();

        // Create a razorpay instance
        let instance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_SECRET_KEY
        });

        // Define order options
        let options = {
            amount: amount * 100, // converting to paise
            currency: 'INR',
            receipt: `receipt_${username}_${Date.now()}`,
            payment_capture: '1'
        };

        // Ensure the receipt is not too long
        if (options.receipt.length > 40) {
            options.receipt = options.receipt.substring(0, 40);
        }

        // Create an order with Razorpay
        instance.orders.create(options, async (err, order) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Error creating Razorpay order' });
            }

            // Create a transporter for sending email
            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL,
                    pass: process.env.PASSWORD
                }
            });

            // Define email options
            let mailOptions = {
                from: process.env.EMAIL,
                to: email,
                subject: 'Donation Confirmation',
                text: `Thank you ${username} for your donation of ₹${amount}`,
                html: `<h1>Thank You!</h1><p>Dear ${username},</p><p>Thank you for your generous donation of ₹${amount}. Your support helps us continue our mission.</p><p>Thank you,</p><p>Donate.me</p>`
            };

            // Send email
            transporter.sendMail(mailOptions, function(error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });

            // Send response
            res.status(201).json({ message: 'Donation successful', orderId: order.id });
        });
    } catch (error) {
        console.log(error);
        let message = 'Donation failed';
        if (error.name === 'ValidationError') {
            message = 'Invalid user data';
        } else if (error.name === 'MongoError' && error.code === 11000) {
            message = 'Email already exists';
        }
        res.status(500).json({ message });
    }
};

// Route to verify payment
const verifyPayment = async (req, res) => {
    const {
        orderCreationId,
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature,
    } = req.body;

    // Create a HMAC object using the secret key
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET_KEY);

    // Update the HMAC object with the data to be hashed
    shasum.update(`${orderCreationId}|${razorpayPaymentId}`);

    // Generate the HMAC in hex format
    const digest = shasum.digest('hex');

    // Compare the generated HMAC with the one provided by Razorpay
    if(digest != razorpaySignature) {
        return res.status(400).json({ message: 'Transaction not legit!' });
    }

    // Find the transaction and update the status
    const transaction = await Transaction.findOne({ 'order.id': razorpayOrderId });
    if(transaction) {
        transaction.status = 'completed';
        await transaction.save();
    }

    // Send response
    res.json({ message: 'Payment successful', orderId: razorpayOrderId });
};

module.exports = { donation, message, verifyPayment };
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true
  }
});

const User = mongoose.model('User', UserSchema);

module.exports = User;

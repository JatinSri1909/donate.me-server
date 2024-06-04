const express = require('express');
const router = require('./routes/router');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
dotenv.config();

const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
const app = express();
const port = process.env.PORT || 5000;

// Placeholder route
app.get('/', (req, res) => {
  res.send('Hello World');
});

// Middleware
app.use(cors());
app.use(morgan('combined'));

// parse application/json
app.use(express.json());

// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

app.use('/donate', router);

// Connect to MongoDb
const connectDb = async () => {
  await mongoose.connect(uri)
  console.log(`Connected to MongoDB with ${mongoose.connection.host}`);
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
};

connectDb();




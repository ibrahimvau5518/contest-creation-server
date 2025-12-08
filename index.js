require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ObjectId } = require('mongodb');

const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());

// MONGODB CONNECT
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.op9dmu8.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri);
let JWT, Users, Contests, Registrations;

async function run() {
  try {
    await client.connect();

    const db = client.db('ContestHubDB');

    // Collections
    JWT = db.collection('jwtTokens');
    Users = db.collection('users');
    Contests = db.collection('contests');
    Registrations = db.collection('registrations');

    console.log('✅ MongoDB Connected Successfully!');
  } catch (err) {
    console.error('MongoDB Connection Error:', err);
  }
}

run();

// ---------------- JWT -----------------

app.post('/jwt', async (req, res) => {
  try {
    const userData = req.body;

    const token = jwt.sign(
      { email: userData.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '100d' }
    );

    res.send(token);
  } catch (error) {
    console.error('JWT Error:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

const verifyToken = async (req, res, next) => {
  const token = req.headers?.authorization;

  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' });
    }
    req.decoded = decoded;
    next();
  });
};

// ---------------- Admin Middleware -----------------

const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;

  const user = await Users.findOne({ email });

  if (!user) return res.status(404).send({ message: 'User not found' });

  if (user.role !== 'admin') {
    return res.status(403).send({ message: 'forbidden access' });
  }

  next();
};

// ---------------- Users API -----------------

app.get('/users', verifyToken, async (req, res) => {
  const result = await Users.find().toArray();
  res.send(result);
});

app.get('/users/:email', async (req, res) => {
  const email = req.params.email;
  const result = await Users.findOne({ email });
  res.send(result);
});

app.post('/users', async (req, res) => {
  const user = req.body;

  const exists = await Users.findOne({ email: user.email });
  if (exists) return res.send({ message: 'User already exists' });

  const result = await Users.insertOne(user);
  res.send(result);
});

app.put('/users/:email', verifyToken, async (req, res) => {
  const email = req.params.email;
  const role = req.body.role;

  const result = await Users.updateOne(
    { email },
    { $set: { role } },
    { upsert: true }
  );

  res.send(result);
});

// ---------------- Contests -----------------

app.get('/contests', async (req, res) => {
  let query = {};
  let sort = {};

  const category = req.query.category;
  const email = req.query.email;
  const status = req.query.status;
  const sortOrder = req.query.sortOrder;
  const page = Number(req.query.page) - 1;
  const limit = Number(req.query.limit);

  if (category) query.contestType = category;
  if (email) query.creatorEmail = email;
  if (status) query.status = status;
  if (sortOrder) sort.attendance = Number(sortOrder);

  const contestCount = await Contests.countDocuments({ status: 'Accepted' });
  const allContest = await Contests.find(query)
    .skip(page * limit)
    .sort(sort)
    .limit(limit)
    .toArray();

  res.send({ allContest, contestCount });
});

app.get('/contests/:id', async (req, res) => {
  const id = req.params.id;
  const result = await Contests.findOne({ _id: new ObjectId(id) });
  res.send(result);
});

app.post('/contests', verifyToken, async (req, res) => {
  const contest = req.body;
  const result = await Contests.insertOne(contest);
  res.send(result);
});

app.put('/contests/:id', verifyToken, async (req, res) => {
  const id = req.params.id;
  const updated = req.body;

  const result = await Contests.updateOne(
    { _id: new ObjectId(id) },
    { $set: updated }
  );

  res.send(result);
});

app.delete('/contests/:id', verifyToken, async (req, res) => {
  const id = req.params.id;

  const result = await Contests.deleteOne({ _id: new ObjectId(id) });

  res.send(result);
});

// ---------------- STRIPE -----------------

app.post('/create-payment-intent', async (req, res) => {
  try {
    const { price } = req.body;
    const amount = parseInt(price * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      payment_method_types: ['card'],
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Stripe Error', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

// ---------------- Registrations -----------------

app.get('/registrations/:email', async (req, res) => {
  const email = req.params.email;
  const result = await Registrations.find({ creatorEmail: email }).toArray();
  res.send(result);
});

app.post('/registrations', async (req, res) => {
  const data = req.body;
  const result = await Registrations.insertOne(data);
  res.send(result);
});

app.put('/registrations/:id', async (req, res) => {
  const id = req.params.id;
  const { winner } = req.body;

  const result = await Registrations.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: winner } }
  );

  res.send(result);
});

// ---------------- Dashboard -----------------

app.get('/bestCreator', async (req, res) => {
  const result = await Contests.find()
    .sort({ attendance: -1 })
    .limit(3)
    .toArray();
  res.send(result);
});

app.get('/winners/advertise', async (req, res) => {
  const result = await Contests.find({ winnerName: { $exists: true } })
    .limit(6)
    .toArray();
  res.send(result);
});

// ---------------- Root -----------------
app.get('/', (req, res) => {
  res.send('ContestHub is Running with Pure MongoDB Driver!');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

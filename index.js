const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('contest hub coming');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4rgvatj.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let userCollection,
  creatorCollection,
  registerContest,
  paymentsCollection,
  winCollection,
  upcomingCollection;

async function run() {
  try {
    userCollection = client.db('ContestHub').collection('AllUser');
    creatorCollection = client.db('ContestHub').collection('creatorContest');
    registerContest = client.db('ContestHub').collection('register');
    paymentsCollection = client.db('ContestHub').collection('payments');
    winCollection = client.db('ContestHub').collection('win');
    upcomingCollection = client.db('ContestHub').collection('upcoming');

    await client.db('admin').command({ ping: 1 });
    console.log('Connected to MongoDB!');
  } finally {
  }
}
run().catch(console.dir);

var jwt = require('jsonwebtoken');

app.post('/jwt', async (req, res) => {
  const email = req.body;
  const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '7d',
  });
  res.send({ token });
});

const verifyToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ massage: 'unAuthorized' });
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Unauthorized access' });
    }
    req.user = decoded;
    next();
  });
};

const verifyAdmin = async (req, res, next) => {
  const email = req.user?.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  const isAdmin = user?.role === 'admin';
  if (!isAdmin) {
    return res.status(403).send({ massage: 'forbidden access' });
  }
  next();
};


app.post('/users', async (req, res) => {
  const users = req.body;
  const query = { email: users.email };
  const existing = await userCollection.findOne(query);
  if (existing) {
    return res.send({ massage: 'already available' });
  }
  const result = await userCollection.insertOne(users);
  res.send(result);
});

app.get('/users', async (req, res) => {
  const page = parseInt(req.query.page);
  const size = parseInt(req.query.size);
  const result = await userCollection
    .find()
    .skip(page * size)
    .limit(size)
    .toArray();
  res.send(result);
});

app.get('/users/:email', async (req, res) => {
  const query = { email: req.params.email };
  const result = await userCollection.findOne(query);
  res.send({ position: result?.role });
});

app.get('/users/verified/:email', async (req, res) => {
  const query = { email: req.params.email };
  const result = await userCollection.findOne(query);
  res.send({ permission: result?.status });
});

app.get('/user/:id', async (req, res) => {
  const query = { _id: new ObjectId(req.params.id) };
  const result = await userCollection.findOne(query);
  res.send(result);
});

app.put('/update/user/role/:id', verifyToken, verifyAdmin, async (req, res) => {
  const query = { _id: new ObjectId(req.params.id) };
  const updateDoc = { $set: { role: req.body?.newRole } };
  res.send(await userCollection.updateOne(query, updateDoc));
});

app.put('/block/user/:id', verifyToken, verifyAdmin, async (req, res) => {
  const query = { _id: new ObjectId(req.params.id) };
  const updateDoc = { $set: { status: req.body?.newStatus } };
  res.send(await userCollection.updateOne(query, updateDoc));
});

app.delete('/delete/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  res.send(
    await userCollection.deleteOne({ _id: new ObjectId(req.params.id) })
  );
});

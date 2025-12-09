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

app.post('/host/contest', async (req, res) => {
  res.send(await creatorCollection.insertOne(req.body));
});

app.get('/host/contest/:email', async (req, res) => {
  const page = parseInt(req.query.page);
  const size = parseInt(req.query.size);
  const query = { hostEmail: req.params.email };
  res.send(
    await creatorCollection
      .find(query)
      .skip(page * size)
      .limit(size)
      .toArray()
  );
});

app.get('/single/contest/:id', async (req, res) => {
  res.send(
    await creatorCollection.findOne({ _id: new ObjectId(req.params.id) })
  );
});

app.put('/updateSingleData/:id', async (req, res) => {
  const updateDoc = { $set: req.body };
  res.send(
    await creatorCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      updateDoc
    )
  );
});

app.delete('/delete/creator/collection/:id', async (req, res) => {
  res.send(
    await creatorCollection.deleteOne({ _id: new ObjectId(req.params.id) })
  );
});

app.get('/allContes/for/Admin', verifyToken, verifyAdmin, async (req, res) => {
  const page = parseInt(req.query.page);
  const size = parseInt(req.query.size);
  res.send(
    await creatorCollection
      .find()
      .skip(page * size)
      .limit(size)
      .toArray()
  );
});

app.post('/add/allContest', async (req, res) => {
  const id = req.body?._id;
  const updateDoc = { $set: { status: 'accepted' } };
  res.send(
    await creatorCollection.updateOne({ _id: new ObjectId(id) }, updateDoc)
  );
});

app.put('/sendMassage/:id', async (req, res) => {
  const updateDoc = { $set: { comments: req.body?.comment } };
  res.send(
    await creatorCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      updateDoc
    )
  );
});

// =======================
//   Contest Registration
// =======================

// Register for contest
app.post('/register/contest', async (req, res) => {
  const contestDetails = req.body;
  const result = await registerCollection.insertOne(contestDetails);
  res.send(result);
});

// Registered contest for user
app.get('/getRegisterContest/:email', async (req, res) => {
  const email = req.params.email;
  const result = await registerCollection.find({ email }).toArray();
  res.send(result);
});

// Get single registered contest
app.get('/getSingleContest/:id', async (req, res) => {
  const id = req.params.id;
  const result = await registerCollection.findOne({ _id: new ObjectId(id) });
  res.send(result);
});


// =======================
//      Stripe Payment
// =======================

app.post('/create-payment-intent', async (req, res) => {
  const { price } = req.body;

  const amount = parseInt(price * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: "usd",
    payment_method_types: ["card"]
  });

  res.send({
    clientSecret: paymentIntent.client_secret
  });
});

// Save payment
app.post('/payments', async (req, res) => {
  const payment = req.body;
  const paymentResult = await paymentsCollection.insertOne(payment);

  const query = { _id: new ObjectId(payment.registerId) };
  const deleteResult = await registerCollection.deleteOne(query);

  res.send({ paymentResult, deleteResult });
});


// =======================
//     Result Publish
// =======================

app.post('/setResult', async (req, res) => {
  const resultData = req.body;
  const result = await winCollection.insertOne(resultData);
  res.send(result);
});

// Total winners count
app.get('/total/winner', async (req, res) => {
  const total = await winCollection.estimatedDocumentCount();
  res.send({ total });
});

// My winning status
app.get('/my-wining/status/:email', async (req, res) => {
  const email = req.params.email;
  const result = await winCollection.find({ email }).toArray();
  res.send(result);
});

// Leaderboard
app.get('/leaderBoard', async (req, res) => {
  const result = await winCollection
    .aggregate([
      {
        $group: {
          _id: "$email",
          totalWins: { $sum: 1 }
        }
      },
      { $sort: { totalWins: -1 } }
    ])
    .toArray();

  res.send(result);
});

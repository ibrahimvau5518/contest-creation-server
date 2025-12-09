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

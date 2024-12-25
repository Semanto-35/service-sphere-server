const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


// Express App and Middleware Setup
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


// MongoDB Database Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gvke0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const servicesCollection = client.db("services_sphereDB").collection("services");
    const reviewsCollection = client.db("services_sphereDB").collection("reviews");

    // save a service in db
    app.post('/add-service', async(req,res)=>{
      const serviceData = req.body;
      const result = await servicesCollection.insertOne(serviceData);
      res.send(result);
    });

    //  get all services
    app.get('/services', async (req, res) => {
      const result = await servicesCollection.find().toArray();
      res.send(result);
    });

    // get limited services
    app.get('/featuredServices', async (req, res) => {
      const result = await servicesCollection.find().limit(6).toArray();
      res.send(result);
    });

    // get service by params id
    app.get('/service/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await servicesCollection.findOne(query);
      res.send(result);
    });


    // save a review in db
    app.post('/add-review', async (req, res) => {
      const reviewData = req.body;
      const result = await reviewsCollection.insertOne(reviewData);
      res.send(result);
    });

    //  get all reviews by serviceId
    app.get('/reviews/:serviceId', async (req, res) => {
      const id = req.params.serviceId;
      const query = { serviceId: id }
      const result = await reviewsCollection.find(query).toArray();
      res.send(result);
    });


    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



// Start Server
app.get('/', (req, res) => {
  res.send('Service Sphere review system is running')
});

app.listen(port, () => {
  console.log(`ServiceSphere review system is running in port: ${port}`);
});
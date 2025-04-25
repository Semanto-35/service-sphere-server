const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');


// Express App and Middleware Setup
const port = process.env.PORT || 5000;
const app = express();
const cookieParser = require('cookie-parser');
const corsOptions = {
  origin: ['http://localhost:5173',
    'https://service-sphere-3137f.web.app',
    'https://service-sphere-3137f.firebaseapp.com'

  ],
  credentials: true,
  optionalSuccessStatus: 200,
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())


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

// verifyToken
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token
  if (!token) return res.status(401).send({ message: 'unauthorized access' })
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
  })

  next()
}

async function run() {
  try {
    const usersCollection = client.db("services_sphereDB").collection("users");
    const servicesCollection = client.db("services_sphereDB").collection("services");
    const reviewsCollection = client.db("services_sphereDB").collection("reviews");

    // countup
    app.get('/stats', async (req, res) => {
      const serviceCount = await servicesCollection.countDocuments();
      const reviewCount = await reviewsCollection.countDocuments();
      const users = await usersCollection.countDocuments();
      res.send({
        services: serviceCount,
        reviews: reviewCount, users
      })
    });

    // generate jwt
    app.post('/jwt', async (req, res) => {
      const email = req.body
      const token = jwt.sign(email, process.env.SECRET_KEY, {
        expiresIn: '7d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    });

    // logout || clear cookie from browser
    app.get('/logout', async (req, res) => {
      res
        .clearCookie('token', {
          maxAge: 0,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    });

    // save a user in db
    app.post('/user', async (req, res) => {
      const userData = req.body;
      const result = await usersCollection.insertOne(userData);
      res.send(result);
    });

    // save a service in db
    app.post('/add-service', async (req, res) => {
      const serviceData = req.body;
      const result = await servicesCollection.insertOne(serviceData);
      res.send(result);
    });

    //  get all services
    app.get('/services', async (req, res) => {
      const result = await servicesCollection.find().toArray();
      res.send(result);
    });

    // get all services by search and filter
    app.get('/all-services', async (req, res) => {
      const filter = req.query.filter || ''
      const search = req.query.search || ''
      const query = {
        ...(search && { serviceTitle: { $regex: search, $options: 'i' } }),
        ...(filter && { category: filter }),
      };
      const result = await servicesCollection.find(query).toArray()
      res.send(result);
    })

    // get limited services
    app.get('/featuredServices', async (req, res) => {
      const result = await servicesCollection.find().limit(6).toArray();
      res.send(result);
    });


    // get posted services by searching
    app.get('/services/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.user?.email
      if (decodedEmail !== email)
        return res.status(401).send({ message: 'unauthorized access' })
      const search = req.query.search || '';
      const query = {
        userEmail: email,
        serviceTitle: { $regex: search, $options: 'i' }
      };
      const result = await servicesCollection.find(query).toArray();
      res.send(result);
    });

    // delete a service by id
    app.delete('/service/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await servicesCollection.deleteOne(query);
      res.send(result);
    });

    // update and then save a service
    app.put('/service/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const formData = req.body;
      const updatedDoc = {
        $set: formData,
      }
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const result = await servicesCollection.updateOne(filter, updatedDoc, options);
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

    // get all reviews posted by a user
    app.get('/all-review/:email', verifyToken, async (req, res) => {
      const emails = req.params.email;
      const decodedEmail = req.user?.email
      if (decodedEmail !== emails)
        return res.status(401).send({ message: 'unauthorized access' })
      const query = {
        userEmail: emails
      }
      const result = await reviewsCollection.find(query).toArray();
      res.send(result);
    });

    // update and then save a review
    app.put('/review/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const formData = req.body;
      const updatedDoc = {
        $set: formData,
      }
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const result = await reviewsCollection.updateOne(filter, updatedDoc, options);
      res.send(result);
    });

    // delete a review by id
    app.delete('/review/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await reviewsCollection.deleteOne(query);
      res.send(result);
    });




    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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
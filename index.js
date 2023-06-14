const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET);
const app = express()
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
      return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
      }
      req.decoded = decoded;
      next();
    })
  }
  


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.l9yjteg.mongodb.net/?retryWrites=true&w=majority`;

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
        // Connect the client to the server	(optional starting in v4.7)
        

        const usersCollation = client.db('MusicDB').collection('users')
        const classesCollation = client.db('MusicDB').collection('classes')
        const selectedClassesCollation = client.db('MusicDB').collection('selectedClasses')
        const paymentHistoryCollation = client.db('MusicDB').collection('paymentHistory')
        const enrolledCollation = client.db('MusicDB').collection('enrolledClasses')

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })

        // class related api
        app.get('/classes', async (req, res) => {
            const result = await classesCollation.find().toArray();
            res.send(result)
        })
        app.get('/approve-classes', async (req, res) => {
            const query = { status: 'approve' }
            const result = await classesCollation.find(query).toArray();
            res.send(result)
        })

        app.get('/best-classes',async(req,res)=>{
            const result = await classesCollation.find().sort({ enrolledStudentNumber: -1 }).limit(6).toArray();
            res.send(result)
        })
        app.get('/best-instructor',async(req,res)=>{
            const query = {role:'instructor'}
            const result = await usersCollation.find(query).limit(6).toArray();
            res.send(result)
        })

        // instructor class related api
        app.post('/classes',verifyJWT, async (req, res) => {
            const data = req.body;
            const result = await classesCollation.insertOne(data)
            res.send(result)
        })

        app.get('/my-classes/:email',verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { InstructorEmail: email };
            const result = await classesCollation.find(query).toArray();
            res.send(result)
        })


        app.get('/user/instructor/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollation.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            res.send(result)
        })

        app.get('/all-instructor', async (req, res) => {
            const query = { role: 'instructor' };
            const result = await usersCollation.find(query).toArray();
            res.send(result)
        })

        app.patch('/available-student-count/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const classDetails = await classesCollation.findOne(query);
            const availableSites = classDetails.AvailableSeats;

            if (availableSites > 0) {
                const newAvailableSites = availableSites - 1
                const updateDoc = {
                    $set: {
                        AvailableSeats: newAvailableSites
                    },
                };
                const result = await classesCollation.updateOne(query, updateDoc)
                res.send(result)
            }
        })



        app.put('/enrolled-student-count/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const classDetails = await classesCollation.findOne(query);
            if (classDetails.enrolledStudentNumber) {
                const totalStudent = classDetails.enrolledStudentNumber + 1;
                const updateDoc = {
                    $set: {
                        enrolledStudentNumber: totalStudent
                    },
                };
                const result = await classesCollation.updateOne(query, updateDoc)
                res.send(result)
            }
            else {
                const options = { upsert: true };
                const updateDoc = {
                    $set: {
                        enrolledStudentNumber: parseInt(1)
                    },
                };

                const result = await classesCollation.updateOne(query, updateDoc, options)
                res.send(result)
            }
        })


        // student related api

        app.post('/selected-class', async (req, res) => {
            const data = req.body;
            const result = await selectedClassesCollation.insertOne(data);
            res.send(result)
        })

        app.get('/selected-class/:email',verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { studentEmail: email };
            const result = await selectedClassesCollation.find(query).toArray();
            res.send(result)
        })

        app.get('/payment-class/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await selectedClassesCollation.findOne(query);
            res.send(result)
        })

        app.delete('/selected-class/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await selectedClassesCollation.deleteOne(query);
            res.send(result)
        })

        app.get('/user/student/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollation.findOne(query);
            const result = { student: user?.role === 'student' }
            res.send(result)
        })

        app.get('/payment-history/:email',verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await paymentHistoryCollation.find(query).toArray();
            res.send(result)
        })

        app.post('/enrolled-data',verifyJWT, async (req, res) => {
            const data = req.body;
            const result = await enrolledCollation.insertOne(data);
            res.send(result)
        })

        app.get('/enrolled-data/:email',verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { studentEmail: email }
            const result = await enrolledCollation.find(query).toArray();
            res.send(result)
        })

        // payment related api
        app.post('/create-payment-intent',verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card']
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        app.post('/payment-history',verifyJWT, async (req, res) => {
            const data = req.body;
            const result = await paymentHistoryCollation.insertOne(data);
            res.send(result)
        })

        // user related api
        app.get('/user', async (req, res) => {
            const result = await usersCollation.find().toArray();
            res.send(result)
        })

        app.post('/user', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await usersCollation.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exist' })
            }
            const result = await usersCollation.insertOne(user);
            res.send(result)
        })

        // admin related api

        app.patch('/make-instructor/:id',verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'instructor'
                },
            };
            const result = await usersCollation.updateOne(filter, updateDoc);
            res.send(result)
        })

        app.get('/user/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollation.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result)
        })

        app.patch('/make-admin/:id',verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await usersCollation.updateOne(filter, updateDoc);
            res.send(result)
        })

        app.patch('/approve-class/:id',verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'approve'
                }
            };
            const result = await classesCollation.updateOne(filter, updateDoc);
            res.send({ result, message: 'Class approved' })
        })
        app.patch('/denied-class/:id',verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'denied'
                }
            };
            const result = await classesCollation.updateOne(filter, updateDoc);
            res.send({ result, message: 'Class denied' })
        })

        app.put('/feedback/:id',verifyJWT,async(req,res)=>{
            const id =  req.params.id;
            const data = req.body;
            console.log(id,data.data);
            const filter = {_id:new ObjectId(id)};
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                  feedback: `${data.data}`
                },
              };
              const result = await classesCollation.updateOne(filter, updateDoc, options);
            console.log(result);
            res.send(result)
        })


    } finally {
        
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('server is running')
})

app.listen(port, () => {
    console.log('server is running on port 5000');
})
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require("dotenv").config();
const app = express()
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())



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
        await client.connect();

        const usersCollation = client.db('MusicDB').collection('users')
        const classesCollation = client.db('MusicDB').collection('classes')
        const selectedClassesCollation = client.db('MusicDB').collection('selectedClasses')

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
            const query = {status:'approve'}
            const result = await classesCollation.find(query).toArray();
            res.send(result)
        })

        // instructor class related api
        app.post('/classes', async (req, res) => {
            const data = req.body;
            const result = await classesCollation.insertOne(data)
            res.send(result)
        })

        app.get('/my-classes/:email', async (req, res) => {
            const email = req.params.email;
            console.log(email);
            const query = { InstructorEmail: email };
            const result = await classesCollation.find(query).toArray();
            res.send(result)
        })

        
        app.get('/user/instructor/:email',async(req,res)=>{
            const email = req.params.email;
            const query = {email:email};
            const user = await usersCollation.findOne(query);
            const result = {instructor:user?.role === 'instructor'}
            console.log(result);
            res.send(result)
        })


        // student related api

        app.post('/selected-class', async (req, res) => {
            const data = req.body;
            const result = await selectedClassesCollation.insertOne(data);
            res.send(result)
        })

        app.get('/selected-class/:email', async (req, res) => {
            const email = req.params.email;
            const query = { studentEmail: email };
            const result = await selectedClassesCollation.find(query).toArray();
            res.send(result)
        })

        app.delete('/selected-class/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await selectedClassesCollation.deleteOne(query);
            res.send(result)
        })

        app.get('/user/student/:email',async(req,res)=>{
            const email = req.params.email;
            const query = {email:email};
            const user = await usersCollation.findOne(query);
            const result = {student:user?.role === 'student'}
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

        app.patch('/make-instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'instructor'
                },
            };
            const result = await usersCollation.updateOne(filter,updateDoc);
            res.send(result)
        })

        app.get('/user/admin/:email',async(req,res)=>{
            const email = req.params.email;
            const query = {email:email};
            const user = await usersCollation.findOne(query);
            const result = {admin:user?.role === 'admin'}
            res.send(result)
        })
        
        app.patch('/make-admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await usersCollation.updateOne(filter,updateDoc);
            res.send(result)
        })

        app.patch('/approve-class/:id',async(req,res)=>{
            const id  = req.params.id;
            const filter = {_id: new ObjectId(id)};
            const updateDoc ={
                $set:{
                    status:'approve'
                }
            };
            const result = await classesCollation.updateOne(filter,updateDoc);
            res.send({result,message:'Class approved'})
        })
        app.patch('/deny-class/:id',async(req,res)=>{
            const id  = req.params.id;
            const filter = {_id: new ObjectId(id)};
            const updateDoc ={
                $set:{
                    status:'deny'
                }
            };
            const result = await classesCollation.updateOne(filter,updateDoc);
            res.send({result,message:'Class deny'})
        })



        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('server is running')
})

app.listen(port, () => {
    console.log('server is running on port 5000');
})
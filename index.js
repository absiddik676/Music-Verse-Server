const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
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

        // class related api
        app.get('/classes',async(req,res)=>{
            const result = await classesCollation.find().toArray();
            res.send(result)
        })

        // user related api
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
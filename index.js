
import express from 'express'
import cors from 'cors'
import 'dotenv/config'

const app = express()
const PORT = process.env.PORT_SERVER || 5000

import { MongoClient } from 'mongodb';
const client = new MongoClient(process.env.MONGO_CONNECTION_STRING);
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const Database = await connectToMongoDB()
const Client = Database.db("RisingStar");
const Studio = Client.collection("studio");


app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('This is The Rising Star Backend')
})

app.get( '/studio' , async (req,res)=>{
  const coursor = Studio.find({});
  const result = await coursor.toArray()
  res.send(result)
  console.log(result)
})

app.get( '/studio/:category' , async (req,res)=>{
  const { category } = req.params;
  const categoryData = Studio.find({category:{$eq:category}})
  const result = await categoryData.toArray();
  res.send(result)
})


app.get( '/explore-studio' , async (req,res)=>{
  const coursor = Studio.find({}).sort({ category : -1}).limit(6)
  const result = await coursor.toArray()
  res.send(result)
  console.log(result)
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})

import express from 'express'
import cors from 'cors'
import 'dotenv/config'

const app = express()
const PORT = process.env.PORT_SERVER || 5000

import { MongoClient, ObjectId } from 'mongodb';
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
 
})
// http://localhost:5000/studio
app.post( '/studio' , async (req,res)=>{
  const StudioData = req.body;
  const result = await Studio.insertOne(StudioData);
  res.send(result)
  console.log(result)
})

app.get( '/studio/:category' , async (req,res)=>{
  const { category } = req.params;
  const categoryData = await Studio.find({category:{$eq:category}})
  const result = await categoryData.toArray();
  res.send(result)
})

// http://localhost:5000/studio-space/id
app.get( '/studio-space/:id', async (req,res)=>{
  const {id} = req.params
  const result = await Studio.findOne({_id: new ObjectId(id)})
  console.log("Details Route Called")
  res.send(result)
})


app.get( '/explore-studio' , async (req,res)=>{
  const coursor = Studio.find({}).sort({ category : -1}).limit(6)
  const result = await coursor.toArray()
  res.send(result)

})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})
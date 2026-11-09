
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
const Bookings = Client.collection("bookings");


app.use(cors())
app.use(express.json())


const VerifyToken=async (req,res,next)=>{
const authHeader = req.headers.authorization

if(!authHeader){
  return res.status(401).send({msg: 'Unauthorized'})
}

const token = authHeader.split(' ')[1]
if(!token){
  return res.status(401).send({ msg: 'Unauthorized'})
}

const JWKS = createRemoteJWKSet(
  new URL('http://localhost:3000/api/auth/jwks')
);
 try {
  const { payload } = await jwtVerify(token,JWKS);
  next();
 } catch (error) {
  return res.status(500).send({msg: "Your Token isnt Verifyed"})
 }
}






app.get('/', (req, res) => {
  res.send('This is The Rising Star Backend')
})

app.get( '/studio' , async (req,res)=>{
  const coursor = Studio.find({});
  const result = await coursor.toArray()
  res.send(result)
 
})

// http://localhost:5000/studio/email


app.get( '/studio/:email' , async (req,res)=>{
  const {email} = req.params;
  const coursor = Studio.find({hostEmail:{$eq:email}});
  const result = await coursor.toArray()
  res.send(result)
 
})
// http://localhost:5000/studio
app.post("/studio", async (req, res) => {
  try {
    const StudioData = req.body;

    const result = await Studio.insertOne(StudioData);

    res.status(201).send({
      success: true,
      message: "Studio added successfully",
      result,
    });

    console.log(result);
  } catch (error) {
    console.error(error);

    res.status(500).send({
      success: false,
      message: "Failed to add studio",
    });
  }
});

app.patch("/studio/:id", async (req, res) => {
  const {id} =  req.params;
  try {
    const StudioData = req.body;

    const result = await Studio.updateOne({_id: new ObjectId(id)},{$set: StudioData} , {$upsert:true});

    res.status(201).send({
      success: true,
      message: "Studio added successfully",
      result,
    });

    console.log(result);
  } catch (error) {
    console.error(error);

    res.status(500).send({
      success: false,
      message: "Failed to add studio",
    });
  }
});

app.delete("/studio/:id",async (req,res)=>{
  const {id}= req.params;
  const result = await Studio.deleteOne({_id: new ObjectId(id)})
  res.send(result)
})


app.post("/bookings", async (req, res) => {
  try {
    const StudioData = req.body;

    const result = await Bookings.insertOne(StudioData);

    res.status(201).send({
      success: true,
      message: "Studio added successfully",
      result,
    });

    console.log(result);
  } catch (error) {
    console.error(error);

    res.status(500).send({
      success: false,
      message: "Failed to add Bookings",
    });
  }
});




app.get( '/bookings/:email' , async (req,res)=>{
  const {email} = req.params;
  const coursor = Bookings.find({hostEmail:{$eq:email}});
  const result = await coursor.toArray()
  res.send(result)
 
})

app.patch("/bookings/:id", async (req, res) => {
  const {id} =  req.params;
  try {
    const BookingData = req.body;

    const result = await Bookings.updateOne({_id: new ObjectId(id)},{$set: BookingData});

    res.status(201).send({
      success: true,
      message: "Studio added successfully",
      result,
    });

    console.log(result);
  } catch (error) {
    console.error(error);

    res.status(500).send({
      success: false,
      message: "Failed to add studio",
    });
  }
});
app.post("/bookings", async (req, res) => {
  try {
    const bookingData = req.body;

    // 1. Check existing confirmed booking
    const conflict = await Bookings.findOne({
      studioId: bookingData.studioId,
      status: "Confirmed",
      startTime: { $lt: bookingData.endTime },
      endTime: { $gt: bookingData.startTime },
    });

    // 2. Reject if booking overlaps
    if (conflict) {
      return res.status(409).send({
        success: false,
        message: "This studio is already booked for the selected time.",
      });
    }

    // 3. Save new booking
    const result = await Bookings.insertOne(bookingData);

    res.status(201).send({
      success: true,
      message: "Booking created successfully!",
      insertedId: result.insertedId,
    });

  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to create booking.",
    });
  }
});



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

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}


export default app;
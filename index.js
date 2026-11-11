
import express from 'express'
import cors from 'cors'
import 'dotenv/config'

const app = express()
const PORT = process.env.PORT_SERVER || 5000

import { MongoClient, ObjectId } from 'mongodb';
import { createRemoteJWKSet, jwtVerify } from 'jose'
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

// JWKS URL. Set BETTER_AUTH_URL in production to the deployed frontend origin.
const authBaseURL = (
  process.env.BETTER_AUTH_URL || 'http://localhost:3000'
).replace(/\/+$/, '')
const JWKS = createRemoteJWKSet(
  new URL(`${authBaseURL}/api/auth/jwks`)
)

const VerifyToken=async (req,res,next)=>{
const authHeader = req.headers.authorization

if(!authHeader){
  return res.status(401).send({ success: false, message: 'Unauthorized' })
}

const token = authHeader.split(' ')[1]
if(!token){
  return res.status(401).send({ success: false, message: 'Unauthorized' })
}

 try {
  const { payload } = await jwtVerify(token,JWKS);
  req.user = payload;
  next();
 } catch (error) {
  console.error('Token verification failed:', error?.message || error)
  return res.status(401).send({ success: false, message: 'Invalid or expired token' })
 }
}


export { VerifyToken };

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function timeToMinutes(value) {
  const match = TIME_PATTERN.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function isValidDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
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


app.get( '/studio/:email' , VerifyToken, async (req,res)=>{
  const {email} = req.params;
  const requesterEmail = String(req.user?.email ?? "").toLowerCase();

  if (!requesterEmail || requesterEmail !== email.toLowerCase()) {
    return res.status(403).send({
      success: false,
      message: "You can only view your own studio listings.",
    });
  }

  const coursor = Studio.find({hostEmail:{$eq:email}});
  const result = await coursor.toArray()
  res.send(result)
 
})
// http://localhost:5000/studio
app.post("/studio",VerifyToken, async (req, res) => {
  try {
    const StudioData = req.body;

    if (!StudioData || typeof StudioData !== "object" || Array.isArray(StudioData)) {
      return res.status(400).send({
        success: false,
        message: "Invalid studio details",
      });
    }

    StudioData.hostEmail = String(req.user?.email ?? "").toLowerCase();
    StudioData.hostName = req.user?.name || StudioData.hostName || "";
    StudioData.rating = 0;
    StudioData.reviewCount = 0;

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

app.patch("/studio/:id",VerifyToken, async (req, res) => {
  const {id} =  req.params;
  try {
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid studio id",
      });
    }

    const studio = await Studio.findOne({_id: new ObjectId(id)});

    if (!studio) {
      return res.status(404).send({
        success: false,
        message: "Studio not found",
      });
    }

    const requesterEmail = String(req.user?.email ?? "").toLowerCase();
    const hostEmail = String(studio.hostEmail ?? "").toLowerCase();

    if (!requesterEmail || requesterEmail !== hostEmail) {
      return res.status(403).send({
        success: false,
        message: "You can only update your own studio",
      });
    }

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).send({
        success: false,
        message: "Invalid studio details",
      });
    }

    const StudioData = { ...req.body };
    delete StudioData._id;
    delete StudioData.hostEmail;
    delete StudioData.hostName;

    const result = await Studio.updateOne(
      {_id: new ObjectId(id)},
      {$set: StudioData}
    );

    res.status(200).send({
      success: true,
      message: "Studio updated successfully",
      result,
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      success: false,
      message: "Failed to update studio",
    });
  }
});

app.delete("/studio/:id",VerifyToken,async (req,res)=>{
  const {id}= req.params;

  try {
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid studio id",
      });
    }

    const studio = await Studio.findOne({_id: new ObjectId(id)});

    if (!studio) {
      return res.status(404).send({
        success: false,
        message: "Studio not found",
      });
    }

    const requesterEmail = String(req.user?.email ?? "").toLowerCase();
    const hostEmail = String(studio.hostEmail ?? "").toLowerCase();

    if (!requesterEmail || requesterEmail !== hostEmail) {
      return res.status(403).send({
        success: false,
        message: "You can only delete your own studio",
      });
    }

    const result = await Studio.deleteOne({_id: new ObjectId(id)});
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Failed to delete studio",
    });
  }
})


app.post("/bookings",VerifyToken, async (req, res) => {
  try {
    const bookingData = req.body;

    if (!bookingData || typeof bookingData !== "object" || Array.isArray(bookingData)) {
      return res.status(400).send({
        success: false,
        message: "Invalid booking request",
      });
    }

    const { studioId, bookingDate, startTime, endTime } = bookingData;

    if (
      typeof studioId !== "string" ||
      !ObjectId.isValid(studioId) ||
      typeof bookingDate !== "string" ||
      !isValidDate(bookingDate) ||
      typeof startTime !== "string" ||
      !TIME_PATTERN.test(startTime) ||
      typeof endTime !== "string" ||
      !TIME_PATTERN.test(endTime)
    ) {
      return res.status(400).send({
        success: false,
        message: "Please choose a valid date and time",
      });
    }

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (
      startMinutes === null ||
      endMinutes === null ||
      endMinutes <= startMinutes
    ) {
      return res.status(400).send({
        success: false,
        message: "The end time must be after the start time",
      });
    }

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(`${bookingDate}T00:00:00`);

    if (selectedDate < today) {
      return res.status(400).send({
        success: false,
        message: "Please choose a future date",
      });
    }

    if (selectedDate.getTime() === today.getTime()) {
      const selectedStart = new Date(selectedDate);
      selectedStart.setHours(
        Math.floor(startMinutes / 60),
        startMinutes % 60,
        0,
        0
      );

      if (selectedStart <= now) {
        return res.status(400).send({
          success: false,
          message: "Please choose a time later today",
        });
      }
    }

    const studio = await Studio.findOne({_id: new ObjectId(studioId)});

    if (!studio) {
      return res.status(404).send({
        success: false,
        message: "Studio not found",
      });
    }

    const requesterEmail = String(req.user?.email ?? "").toLowerCase();
    const hostEmail = String(studio.hostEmail ?? "").toLowerCase();

    if (!requesterEmail || !hostEmail) {
      return res.status(400).send({
        success: false,
        message: "This studio is missing host details",
      });
    }

    if (hostEmail === requesterEmail) {
      return res.status(400).send({
        success: false,
        message: "You cannot book your own studio",
      });
    }

    const conflict = await Bookings.findOne({
      studioId,
      bookingDate,
      status: { $in: ["Pending", "Confirmed"] },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });

    if (conflict) {
      return res.status(409).send({
        success: false,
        message: "That time slot is already booked. Please choose another.",
      });
    }

    const durationHours = (endMinutes - startMinutes) / 60;
    const hourlyRate = Number(studio.hourlyRate ?? 0);
    const totalPrice = Math.round(durationHours * hourlyRate * 100) / 100;

    const booking = {
      studioId,
      studioTitle: String(studio.title ?? "Studio"),
      studioImage: typeof studio.imageUrl === "string" ? studio.imageUrl : undefined,
      studioLocation: typeof studio.location === "string" ? studio.location : undefined,
      hostEmail,
      hostName: typeof studio.hostName === "string" ? studio.hostName : undefined,
      userEmail: requesterEmail,
      userName: req.user?.name || requesterEmail,
      bookingDate,
      startTime,
      endTime,
      totalPrice,
      securityDeposit: Number(studio.securityDeposit ?? 0),
      status: "Pending",
      createdAt: new Date(),
    };

    const result = await Bookings.insertOne(booking);

    res.status(201).send({
      success: true,
      message: "Booking created successfully!",
      result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Failed to create booking",
    });
  }
});




app.get( '/bookings/:email' ,VerifyToken, async (req,res)=>{
  const {email} = req.params;
  const requesterEmail = String(req.user?.email ?? "").toLowerCase();

  if (!requesterEmail || requesterEmail !== email.toLowerCase()) {
    return res.status(403).send({
      success: false,
      message: "You can only view bookings for your own studios.",
    });
  }

  const coursor = Bookings.find({hostEmail:{$eq:email}});
  const result = await coursor.toArray()
  res.send(result)
 
})

app.patch("/bookings/:id", VerifyToken,async (req, res) => {
  const {id} =  req.params;
  try {
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid booking id",
      });
    }

    const booking = await Bookings.findOne({_id: new ObjectId(id)});

    if (!booking) {
      return res.status(404).send({
        success: false,
        message: "Booking not found",
      });
    }

    const requesterEmail = String(req.user?.email ?? "").toLowerCase();
    const hostEmail = String(booking.hostEmail ?? "").toLowerCase();
    const guestEmail = String(booking.userEmail ?? "").toLowerCase();
    const isHost = requesterEmail && requesterEmail === hostEmail;
    const isGuest = requesterEmail && requesterEmail === guestEmail;
    const nextStatus = req.body?.status;

    if (!isHost && !isGuest) {
      return res.status(403).send({
        success: false,
        message: "You can only update your own bookings.",
      });
    }

    if (!["Confirmed", "Completed", "Cancelled"].includes(nextStatus)) {
      return res.status(400).send({
        success: false,
        message: "Invalid booking status",
      });
    }

    if (isGuest && !isHost) {
      if (booking.status !== "Pending" || nextStatus !== "Cancelled") {
        return res.status(403).send({
          success: false,
          message: "You can only cancel your own pending bookings.",
        });
      }
    } else {
      const allowedTransitions = {
        Pending: ["Confirmed", "Cancelled"],
        Confirmed: ["Completed", "Cancelled"],
      };

      if (!allowedTransitions[booking.status]?.includes(nextStatus)) {
        return res.status(409).send({
          success: false,
          message: "That booking status change is not allowed.",
        });
      }
    }

    const result = await Bookings.updateOne(
      {_id: new ObjectId(id)},
      {$set: {
        status: nextStatus,
        updatedAt: req.body?.updatedAt ?? new Date(),
      }}
    );

    res.status(200).send({
      success: true,
      message: "Booking updated successfully",
      result,
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      success: false,
      message: "Failed to update booking",
    });
  }
});
app.get( '/studio/category/:category' , async (req,res)=>{
  const { category } = req.params;
  const categoryData = await Studio.find({category:{$eq:category}})
  const result = await categoryData.toArray();
  res.send(result)
})

// http://localhost:5000/studio-space/id
app.get( '/studio-space/:id', async (req,res)=>{
  const {id} = req.params

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({
      success: false,
      message: "Invalid studio id",
    });
  }

  const result = await Studio.findOne({_id: new ObjectId(id)})
  res.send(result)
})


app.get( '/explore-studio', async (req,res)=>{
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
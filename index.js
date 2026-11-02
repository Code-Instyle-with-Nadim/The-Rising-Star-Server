
import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT_SERVER || 5000

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('This is The Rising Star Backend')
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})
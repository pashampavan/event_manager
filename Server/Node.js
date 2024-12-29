const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
app.use(bodyParser.json());
app.use(cors());
const mongoose = require('mongoose');
const db = 'mongodb+srv://pashampavan:Pavan02@cluster0.bizzz4b.mongodb.net/mini?retryWrites=true&w=majority';
mongoose.connect(db).then(() => {
  console.log("connected")
}).catch((err) => {
  console.log("erroe occured")
});
var KittySchema = new mongoose.Schema({
  email: {type:String,require:true},
  name:{type:String,require:true},
  password: {type:String,require:true},
  tasks: {type:Number,require:true},
})
var Kitten = mongoose.model('users', KittySchema);


// Sample user data (normally stored in a database)
const users = [
  {
    id: 1,
    email: "pashampavan02@gmail.com",
    password: "$2b$12$7MOzJV4FNVvPmZRpRqiLcuH7dkqmM8u.oifSCWvs3UdChd.brJE/.", // hashed version of "password123"
  },
];

// JWT secret key
const JWT_SECRET = "83e5d456bf3dddc7f6e13d2a05e295e2844d52b196324e93cb72f76d8c7d12d0dbe8438ab91a67d1b8c95b15643bde3c";

// Login route

app.get("/", async (req, res) => {
    res.json({"jj":"knk"});
}
)

app.post('/register', async (req, res) => {
  const { email, name, password} = req.body;

  // Validate input
  if (!email || !name || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // Save to database
    let tasks=0;
    const newUser = new Kitten({ email, name, password, tasks });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully.', user: newUser });
  } catch (error) {
    console.error('Error saving user:', error.message);
    res.status(500).json({ error: 'Failed to save user.' });
  }
});



app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    // Find user by email
    const user = await Kitten.findOne({ email });

    // Check if user exists
    if (!user) {
      console.log('User not found');
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Verify password
    if (user.password !== password) {
      console.log('Incorrect password');
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Authentication successful
    // res.status(200).json({ message: 'Login successful.', user: { email: user.email, name: user.name } });
    // Generate JWT token
    // const isPasswordValid = await bcrypt.compare(password, user.password);
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: "15m",
      });
      
    
      res.json({ token });
  } catch (error) {
    console.error('Error during login:', error.message);
    res.status(500).json({ message: 'An error occurred during login.' });
  }


});

// Protected route
app.get("/protected", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ message: "Protected content", user: decoded });
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());

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
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    // console.log(email);
    // console.log(password);
    // Find user by email
    const user = users.find((u) => u.email === email);
    // console.log(user.email);
    // console.log(user.password);
  if (!user) {
    console.log("user error");
    return res.status(401).json({ message: "Invalid email or password" });
}

// Compare passwords
const isPasswordValid = await bcrypt.compare(password, user.password);
console.log(isPasswordValid);
if (!isPasswordValid) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Generate JWT token
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "1h",
  });

  res.json({ token });
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

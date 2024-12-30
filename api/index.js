const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(bodyParser.json());
app.use(cors());

const db = "mongodb+srv://pashampavan:Pavan02@cluster0.bizzz4b.mongodb.net/mini?retryWrites=true&w=majority";
mongoose
  .connect(db)
  .then(() => {
    console.log("Database connected");
  })
  .catch((err) => {
    console.log("Database connection error:", err);
  });

// User Schema
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  tasks: { type: Number, default: 0 },
});
const User = mongoose.model("users", UserSchema);

// Task Schema
const TaskSchema = new mongoose.Schema({
  email: { type: String, required: true },
  title: { type: String, required: true },
  priority: { type: Number, required: true, min: 1, max: 5 },
  status: { type: String, default: "Pending" },
  start_time: { type: Date, required: true },
  end_time: { type: Date, required: true },
  created_at: { type: Date, default: Date.now },
});
const Task = mongoose.model("tasks", TaskSchema);

const JWT_SECRET = "83e5d456bf3dddc7f6e13d2a05e295e2844d52b196324e93cb72f76d8c7d12d0dbe8438ab91a67d1b8c95b15643bde3c";

// User Authentication Middleware
const authenticateUser = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Routes

// Register
app.post("/register", async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({ email, name, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, user: { email: user.email, name: user.name } });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

// Add Task
app.post("/tasks", authenticateUser, async (req, res) => {
  const { title, priority, status, start, end } = req.body;
  const email = req.user.email;
  const startTime = new Date(start);
  const endTime = new Date(end);
  if (!title || !priority || !startTime || !endTime) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    const newTask = new Task({
      email,
      title,
      priority,
      status: status || "Pending",
      start_time: new Date(startTime),
      end_time: new Date(endTime),
    });
    await newTask.save();
    await User.findOneAndUpdate({ email }, { $inc: { tasks: 1 } });
    res.status(201).json({ message: "Task added successfully", task: newTask });
  } catch (error) {
    res.status(500).json({ message: "Failed to add task", error: error.message });
  }
});






// Task Statistics
app.get("/tasks/statistics", authenticateUser, async (req, res) => {
  const email = req.user.email;

  try {
    const tasks = await Task.find({ email });

    if (tasks.length === 0) {
      return res.status(200).json({ message: "No tasks found for this user", statistics: {} });
    }

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) => task.status === "Finished").length;
    const pendingTasks = totalTasks - completedTasks;
    const taskCompletionPercentage = ((completedTasks / totalTasks) * 100).toFixed(2);
    const taskPendingPercentage = ((pendingTasks / totalTasks) * 100).toFixed(2);

    const completedTaskTimes = tasks
      .filter((task) => task.status === "Finished")
      .map((task) => (new Date(task.end_time) - new Date(task.start_time)) / 3600000); // Time in hours
    const averageTimePerCompletedTask = completedTaskTimes.length > 0
    ? (
        completedTaskTimes
          .filter((time) => time > 0) // Ensure only positive times are included
          .reduce((sum, time) => sum + time, 0) / completedTaskTimes.length
      ).toFixed(2)
    : 0;
  

    const pendingTaskTimes = tasks
      .filter((task) => task.status === "Pending")
      .map((task) => (Date.now() - new Date(task.start_time)) / 3600000); // Time lapsed in hours for pending tasks

    const totalPendingTime = pendingTaskTimes.reduce((sum, time) => sum + time, 0).toFixed(2);

    const estimatedCompletionTimes = tasks
      .filter((task) => task.status === "Pending")
      .map((task) => (new Date(task.end_time) - Date.now()) / 3600000); // Estimated time to finish in hours

    const totalEstimatedCompletionTime = estimatedCompletionTimes.reduce((sum, time) => sum + Math.max(time, 0), 0).toFixed(2);

    const prioritySummary = {};
    tasks.forEach((task) => {
      const priority = task.priority;
      if (!prioritySummary[priority]) {
        prioritySummary[priority] = {
          pending: 0,
          timeLapsed: 0,
          timeToFinish: 0,
        };
      }
      if (task.status === "Pending") {
        prioritySummary[priority].pending += 1;
        prioritySummary[priority].timeLapsed += (Date.now() - new Date(task.start_time)) / 3600000; // Time in hours
        prioritySummary[priority].timeToFinish += Math.max(
          (new Date(task.end_time) - Date.now()) / 3600000,
          0
        ); // Time in hours
      }
    });

    res.status(200).json({
      statistics: {
        totalTasks,
        completedTasks,
        pendingTasks,
        taskCompletionPercentage,
        taskPendingPercentage,
        averageTimePerCompletedTask,
        totalPendingTime,
        totalEstimatedCompletionTime,
        prioritySummary,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch task statistics", error: error.message });
  }
});





// Get Tasks
app.get("/tasks", authenticateUser, async (req, res) => {
  const email = req.user.email;
  try {
    const tasks = await Task.find({ email });
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tasks", error: error.message });
  }
});

// Update Task
app.put("/tasks/:id", authenticateUser, async (req, res) => {
  const {id} = req.params;
  const { title, priority, status, start, end} = req.body;
  const email = req.user.email;
  const startTime = new Date(start);
  const endTime = new Date(end);
  if (!title || !priority || !startTime || !endTime) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    const task = await Task.findOneAndUpdate(
      { _id:id,email },
      {title, priority, status, start_time:startTime, end_time:endTime },
      { new: true }
      );
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.status(200).json({ message: "Task updated successfully", task });
  } catch (error) {
    res.status(500).json({ message: "Failed to update task", error: error.message });
  }
});

// Delete Task
app.delete("/tasks/:id", authenticateUser, async (req, res) => {
  const { id } = req.params;
  const email = req.user.email;
  try {
    const task = await Task.findOneAndDelete({ _id: id, email:email });
    if (!task) {
      
      return res.status(404).json({ message: "Task not found" });
    }
    await User.findOneAndUpdate({ email }, { $inc: { tasks: -1 } });
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete task", error: error.message });
  }
});

app.get('/',(req,res)=>{
  res.status(200).json({status:"success"});
})
// Server
// const PORT = 5000;
// app.listen(PORT,'0.0.0.0', () => {
//   console.log(`Server running at http://localhost:${PORT}`);
// });
module.exports.app;

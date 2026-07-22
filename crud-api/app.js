const express = require("express");
const app = express();
const PORT = 3000;
app.use(express.json());

const swaggerUi = require("swagger-ui-express");
const openApiDocument = require("./openapi.json");
app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument)
);

const Database = require('better-sqlite3');
const db = new Database('tasks.db', { verbose: console.log });
const createTableSQL = `
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done BOOLEAN NOT NULL DEFAULT 0
    );`

try {
    db.exec(createTableSQL);
    console.log("Table created successfully");
} catch (error) {
    console.error("Error creating table:", error.message);
}

const countTasksSQL = db.prepare("SELECT COUNT(*) AS count FROM tasks");
const insertTaskSQL = db.prepare("INSERT INTO tasks (title, done) VALUES (@title, @done)");

const sampleTasks = [
        {
            title: "Learn Backend",
            done: 1
        },
        {
            title: "Build CRUD API",
            done: 0
        },
        {
            title: "Deploy API",
            done: 0
        }
    ];

if (countTasksSQL.get().count === 0) {
    const insertSampleTask = db.transaction((tasks) => {
        for (const task of tasks) insertTaskSQL.run(task);
    });

    try {
        insertSampleTask(sampleTasks);
        console.log("Example tasks inserted successfully");
    } catch (error) {
        console.error("Error inserting example tasks:", error.message);
    }
}



app.get("/", (req, res) => {
    res.json({
        "name": "Task API",
        "version": "1.0",
        "endpoints": ["/tasks"],
    });
});

app.get("/health", (req, res) => {
    res.json({
        "status": "ok",
    })
})

app.get("/tasks", (req, res) => {
    const tasks = db.prepare("SELECT * FROM tasks").all();
    res.json(tasks);
})

app.get("/tasks/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);

    if (!task) {
        return res.status(404).json({
            "error": `Task ${id} not found`
        });
    }
    res.json(task);
})

app.post("/tasks", (req, res) => {
    const { title } = req.body;

    if (!title || title.trim() === "") {
    return res.status(400).json({
            error: "Title is required",
        });
    }

    const newId = tasks.length > 0 ? tasks[tasks.length - 1].id + 1 : 1;
    const newTask = {
        id: newId,
        title,
        done: false
    }

    tasks.push(newTask);
    return res.status(201).json(newTask);
})

app.put("/tasks/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const { title, done } = req.body;

    const task = tasks.find(task => task.id === id);

    if (!task) {
        return res.status(404).json({
            error: `Task ${id} not found`,
        })
    }

    if (title === undefined && done === undefined) {
        return res.status(400).json({
            error: "Request body cannot be empty"
        });
    }

    if (title !== undefined) {
        if (typeof title !== "string" || title.trim() === "") {
            return res.status(400).json({
                error: "Title is required"
            });
        }
    }

    if (done !== undefined && typeof done !== "boolean") {
        return res.status(400).json({
            error: "Done must be a boolean"
        });
    }

    task.title = title ?? task.title;
    task.done = done ?? task.done;

    return res.status(200).json(task);
})

app.delete("/tasks/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const taskIndex = tasks.findIndex(task => task.id === id);

    if (taskIndex === -1) {
        return res.status(404).json({
            error: `Task ${id} not found`,
        });
    }

    tasks.splice(taskIndex, 1);

    return res.status(204).send("No Content");
})
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
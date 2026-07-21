const express = require("express");
const app = express();
const PORT = 3000;
const swaggerUi = require("swagger-ui-express");
const openApiDocument = require("./openapi.json");

app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument)
);

app.use(express.json());

let tasks = [
    {
        id: 1,
        title: "Learn Backend",
        done: true
    },
    {
        id: 2,
        title: "Build CRUD API",
        done: false
    },
    {
        id: 3,
        title: "Deploy API",
        done: false
    }
]

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
    res.json(tasks);
})

app.get("/tasks/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const task = tasks.find((task) => task.id === id);

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
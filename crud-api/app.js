require('dotenv').config();

const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

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
const db = new Database('tasks.db');
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
};



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
});

app.get("/tasks", (req, res) => {
    const tasks = db.prepare("SELECT * FROM tasks").all();
    res.json(tasks);
});

app.get("/tasks/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);

    if (!task) {
        return res.status(404).json({
            "error": `Task ${id} not found`
        });
    }
    res.json(task);
});

app.post("/tasks", (req, res) => {
    const { title } = req.body;

    if (!title || title.trim() === "") {
    return res.status(400).json({
            error: "Title is required",
        });
    }

    const insertNewTaskSQL = db.prepare("INSERT INTO tasks (title, done) VALUES (@title, 0)");

    try {
        const info = insertNewTaskSQL.run({ title });
        const newTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(info.lastInsertRowid);

        return res.status(201).json(newTask);
    } catch (error) {
        console.error("Detail Error SQLite:", error);
        return res.status(500).json({
            error: "Error inserting new task"
        });
    }
});

app.put("/tasks/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const { title, done } = req.body;

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);

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

    const updateTaskSQL = db.prepare("UPDATE tasks SET title = @title, done = @done WHERE id = @id");
    updateTaskSQL.run({
        id,
        title: title ?? task.title,
        done: done ?? task.done
    });

    const updatedTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    return res.status(200).json(updatedTask);
});

app.delete("/tasks/:id", (req, res) => {
    const id = parseInt(req.params.id);

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);

    if (!task) {
        return res.status(404).json({
            error: `Task ${id} not found`,
        });
    }

    db.prepare("DELETE FROM tasks WHERE id = ?").run(id);

    return res.status(204).end();
});

app.post("/auth/signup", async (req, res) => {
    const { email, password } = req.body;

    if (!email || email.trim() === "" || !password || password.trim() === "") {
        return res.status(400).json({
            error: "Email or Password is missing",
        });
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            return res.status(400).json({
                error: error.message,
            });
        }

        return res.status(201).json(data.user);
    } catch (error) {
        return res.status(500).json({
            error: "Internal server error",
        });
    }   
});

app.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || email.trim() === "" || !password || password.trim() === "") {
        return res.status(400).json({
            error: "Email or Password is missing",
        });
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(400).json({
                error: "Invalid login credentials"
            });
        }

        const session = data.session;

        return res.status(200).json({ 
                access_token: session.access_token,
                refresh_token: session.refresh_token, 
            });
    } catch (error) {
        return res.status(500).json({
            error: "Internal server error"
        });
    }
});

app.get("/public/info", (req, res) => {
    res.status(200).json({
        message: "Welcome stranger! This info is public.",
    });
});



app.get("/protected/profile", async (req, res) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Access token required",
        });
    };

    const token = authHeader.split(' ')[1];
    
    try {
        const { data, error } = await supabase.auth.getUser(token);

        if (error) {
            return res.status(401).json({
                error: "Invalid or expired token"
            });
        }

        const { user } = data;

        return res.status(200).json({
            id: user.id,
            email: user.email,
            created_at: user.created_at,
        });
    } catch (error) {
        return res.status(500).json({
            error: "Internal server error"
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
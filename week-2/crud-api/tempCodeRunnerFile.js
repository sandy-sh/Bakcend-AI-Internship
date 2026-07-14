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

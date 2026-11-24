(function () {
    const form = document.getElementById("task-form");
    const fileInput = document.getElementById("task-files");
    const selectedFiles = document.getElementById("selected-files");
    const taskList = document.getElementById("task-list");
    const taskCount = document.getElementById("task-count");
    const emptyState = document.getElementById("empty-state");
    const formStatus = document.getElementById("form-status");
    let tasks = [];

    async function getErrorMessage(response) {
        try {
            const result = await response.json();
            return result.error || "The request could not be completed.";
        } catch (error) {
            return "The request could not be completed.";
        }
    }

    function renderTasks() {
        taskList.replaceChildren();
        taskCount.textContent = String(tasks.length);
        taskCount.setAttribute("aria-label", tasks.length + (tasks.length === 1 ? " task" : " tasks"));
        emptyState.hidden = tasks.length > 0;

        tasks.forEach(function (task) {
            const card = document.createElement("article");
            card.className = "task-card" + (task.completed ? " is-complete" : "");

            const header = document.createElement("div");
            header.className = "task-card-header";
            const title = document.createElement("h3");
            title.textContent = task.name;
            const date = document.createElement("time");
            date.className = "task-date";
            date.dateTime = task.createdAt;
            date.textContent = new Date(task.createdAt).toLocaleString();
            header.append(title, date);

            const description = document.createElement("p");
            description.className = "task-description";
            description.textContent = task.description;
            card.append(header, description);

            if (task.files && task.files.length > 0) {
                const files = document.createElement("ul");
                files.className = "task-files";
                task.files.forEach(function (file) {
                    const item = document.createElement("li");
                    const link = document.createElement("a");
                    link.href = "/api/tasks/" + encodeURIComponent(task._id) +
                        "/files/" + encodeURIComponent(file._id);
                    link.textContent = file.originalName;
                    item.append(link);
                    files.append(item);
                });
                card.append(files);
            }

            const actions = document.createElement("div");
            actions.className = "task-actions";
            const completeButton = document.createElement("button");
            completeButton.className = "secondary-button";
            completeButton.type = "button";
            completeButton.textContent = task.completed ? "Mark active" : "Mark complete";
            completeButton.setAttribute("aria-label", (task.completed ? "Mark active: " : "Mark complete: ") + task.name);
            completeButton.addEventListener("click", async function () {
                completeButton.disabled = true;
                try {
                    const response = await fetch("/api/tasks/" + encodeURIComponent(task._id), {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ completed: !task.completed })
                    });
                    if (!response.ok) {
                        throw new Error(await getErrorMessage(response));
                    }
                    await loadTasks();
                } catch (error) {
                    formStatus.textContent = error.message;
                    completeButton.disabled = false;
                }
            });

            const deleteButton = document.createElement("button");
            deleteButton.className = "secondary-button delete-button";
            deleteButton.type = "button";
            deleteButton.textContent = "Delete";
            deleteButton.setAttribute("aria-label", "Delete task: " + task.name);
            deleteButton.addEventListener("click", async function () {
                deleteButton.disabled = true;
                try {
                    const response = await fetch("/api/tasks/" + encodeURIComponent(task._id), {
                        method: "DELETE"
                    });
                    if (!response.ok) {
                        throw new Error(await getErrorMessage(response));
                    }
                    await loadTasks();
                } catch (error) {
                    formStatus.textContent = error.message;
                    deleteButton.disabled = false;
                }
            });
            actions.append(completeButton, deleteButton);
            card.append(actions);
            taskList.append(card);
        });
    }

    async function loadTasks() {
        try {
            const response = await fetch("/api/tasks");
            if (!response.ok) {
                throw new Error(await getErrorMessage(response));
            }
            tasks = await response.json();
            formStatus.textContent = "";
            renderTasks();
        } catch (error) {
            console.error("Could not load tasks:", error);
            formStatus.textContent = "Could not load tasks from the server. " + error.message;
        }
    }

    fileInput.addEventListener("change", function () {
        selectedFiles.replaceChildren();
        Array.from(fileInput.files).forEach(function (file) {
            const item = document.createElement("li");
            item.textContent = file.name;
            selectedFiles.append(item);
        });
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        formStatus.textContent = "";
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        fetch("/api/tasks", {
            method: "POST",
            body: new FormData(form)
        })
            .then(async function (response) {
                if (!response.ok) {
                    throw new Error(await getErrorMessage(response));
                }
                form.reset();
                selectedFiles.replaceChildren();
                await loadTasks();
            })
            .catch(function (error) {
                formStatus.textContent = error.message;
            })
            .finally(function () {
                submitButton.disabled = false;
            });
    });

    loadTasks();
}());

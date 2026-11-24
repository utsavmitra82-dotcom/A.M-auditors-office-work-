(function () {
    const taskList = document.getElementById("task-list");
    const emptyState = document.getElementById("empty-state");
    const statusMessage = document.getElementById("status-message");
    const searchInput = document.getElementById("task-search");
    const statusFilter = document.getElementById("status-filter");
    const resultCount = document.getElementById("result-count");
    const refreshButton = document.getElementById("refresh-button");
    let tasks = [];

    function formatDate(value) {
        if (!value) {
            return "Date unavailable";
        }
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
    }

    function renderTasks() {
        const query = searchInput.value.trim().toLowerCase();
        const status = statusFilter.value;
        const visibleTasks = tasks.filter(function (task) {
            const matchesStatus = status === "all" ||
                (status === "completed" ? task.completed : !task.completed);
            const searchableText = [
                task.employeeName,
                task.name,
                task.description
            ].join(" ").toLowerCase();
            return matchesStatus && searchableText.includes(query);
        });

        taskList.replaceChildren();
        resultCount.textContent = visibleTasks.length + (visibleTasks.length === 1 ? " task shown" : " tasks shown");
        emptyState.hidden = visibleTasks.length > 0;

        visibleTasks.forEach(function (task) {
            const card = document.createElement("article");
            card.className = "task-card";

            const heading = document.createElement("div");
            heading.className = "task-header";
            const titleArea = document.createElement("div");
            const title = document.createElement("h3");
            title.textContent = task.name || "Untitled task";
            const employee = document.createElement("p");
            employee.className = "employee-info";
            employee.textContent = task.employeeName || "Employee not recorded";
            titleArea.append(title, employee);

            const status = document.createElement("span");
            status.className = "status-badge" + (task.completed ? " completed" : "");
            status.textContent = task.completed ? "Completed" : "In progress";
            heading.append(titleArea, status);
            card.append(heading);

            const description = document.createElement("p");
            description.className = "description";
            description.textContent = task.description || "No description provided.";
            card.append(description);

            const meta = document.createElement("time");
            meta.className = "task-date";
            if (task.createdAt) {
                meta.dateTime = task.createdAt;
            }
            meta.textContent = "Created " + formatDate(task.createdAt);
            card.append(meta);

            if (task.files && task.files.length > 0) {
                const filesHeading = document.createElement("h4");
                filesHeading.className = "files-heading";
                filesHeading.textContent = "Attachments";
                const files = document.createElement("ul");
                files.className = "attachments";
                task.files.forEach(function (file) {
                    const item = document.createElement("li");
                    const link = document.createElement("a");
                    link.href = "/api/tasks/" + encodeURIComponent(task._id) +
                        "/files/" + encodeURIComponent(file._id);
                    link.textContent = file.originalName;
                    item.append(link);
                    files.append(item);
                });
                card.append(filesHeading, files);
            }

            taskList.append(card);
        });
    }

    async function loadTasks() {
        refreshButton.disabled = true;
        statusMessage.textContent = "";
        try {
            const response = await fetch("/api/tasks");
            if (!response.ok) {
                throw new Error("Could not retrieve tasks from the server.");
            }
            const result = await response.json();
            if (!Array.isArray(result)) {
                throw new Error("The server returned an invalid task list.");
            }
            tasks = result;
            document.getElementById("total-count").textContent = String(tasks.length);
            document.getElementById("active-count").textContent =
                String(tasks.filter(function (task) { return !task.completed; }).length);
            document.getElementById("completed-count").textContent =
                String(tasks.filter(function (task) { return task.completed; }).length);
            renderTasks();
        } catch (error) {
            console.error("Could not load team tasks:", error);
            statusMessage.textContent = error.message;
            resultCount.textContent = "Tasks could not be loaded.";
            taskList.replaceChildren();
            emptyState.hidden = true;
        } finally {
            refreshButton.disabled = false;
        }
    }

    searchInput.addEventListener("input", renderTasks);
    statusFilter.addEventListener("change", renderTasks);
    refreshButton.addEventListener("click", loadTasks);
    loadTasks();
}());

document.getElementById("login-form").addEventListener("submit", function (event) {
    event.preventDefault();
    document.getElementById("login-status").textContent =
        "Sign-in is not connected yet. Please contact your administrator.";
});

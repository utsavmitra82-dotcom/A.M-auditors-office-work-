const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("password-toggle");

passwordToggle.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    passwordToggle.textContent = isHidden ? "Hide" : "Show";
    passwordToggle.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
    passwordToggle.setAttribute("aria-pressed", String(isHidden));
});

document.getElementById("signin-form").addEventListener("submit", (event) => {
    event.preventDefault();
    document.getElementById("signin-status").textContent =
        "Account creation is not connected yet. Please contact your administrator.";
});

import { useState } from "react";
import { apiFetch, setToken } from "./api.js";
import "./Login.css";

function LoginForm({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  const switchMode = () => {
    setMode(isRegister ? "login" : "register");
    setError("");
    setPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isRegister && !name.trim()) {
      setError("Enter your name to continue.");
      return;
    }
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    if (isRegister && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await apiFetch("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
        });
      }

      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      setToken(data.token);
      onLogin(data.user);
    } catch (err) {
      setError(
        err.status ? err.message : "Can't reach the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-brand">
          <span className="login-brand-rent">Edu</span>
          <span className="login-brand-flow">Mate</span>
        </div>

        <h1 className="login-title">
          {isRegister ? "Create your account" : "Log in to your account"}
        </h1>
        <p className="login-subtitle">
          {isRegister
            ? "Sign up to start organizing your academic life."
            : "Enter your details to access your dashboard."}
        </p>

        {isRegister && (
          <label className="login-field">
            <span className="login-label">Full name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              className="login-input"
            />
          </label>
        )}

        <label className="login-field">
          <span className="login-label">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="yourname@gmail.com"
            className="login-input"
          />
        </label>

        <label className="login-field">
          <span className="login-label">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="login-input"
          />
        </label>

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="login-submit" disabled={loading}>
          {loading ? "Please wait…" : isRegister ? "Create account" : "Log in"}
        </button>

        <p className="login-switch">
          {isRegister ? "Already have an account?" : "New to EduMate?"}{" "}
          <button type="button" className="login-switch-btn" onClick={switchMode}>
            {isRegister ? "Log in" : "Create an account"}
          </button>
        </p>
      </form>
    </div>
  );
}

export default LoginForm;
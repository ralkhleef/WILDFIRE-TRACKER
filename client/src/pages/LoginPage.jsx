import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import wildfireLogo from "../assets/wildfire.svg";
import "./LoginPage.css";

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5050";

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: username.trim(),
          password,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          body?.errors?.[0]?.msg ||
          body?.message ||
          "Unable to log in. Check your credentials.";
        setError(msg);
        setLoading(false);
        return;
      }
      const token = body?.data?.token;
      if (token) {
        localStorage.setItem("token", token);
      }
      navigate("/dashboard");
    } catch {
      setError("Network error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="loginScreen">
      <div className="loginCard">
        <h1 className="loginTitle">Wildfire Live Tracker</h1>
        <img
          className="loginLogo"
          src={wildfireLogo}
          alt=""
          width={280}
          height={280}
        />
        <form className="loginForm" onSubmit={handleSubmit}>
          <label className="loginLabel" htmlFor="login-username">
            Username
            <input
              id="login-username"
              name="username"
              className="loginInput"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </label>
          <label className="loginLabel" htmlFor="login-password">
            Password
            <input
              id="login-password"
              name="password"
              type="password"
              className="loginInput"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </label>
          {error ? <p className="loginError">{error}</p> : null}
          <button type="submit" className="loginButton" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>
        <p className="loginFooter">
          Don&apos;t have an account? <Link to="/signup">Register</Link>
        </p>
      </div>
    </main>
  );
}

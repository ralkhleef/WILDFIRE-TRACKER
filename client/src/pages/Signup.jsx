import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import wildfireLogo from "../assets/wildfire.svg";
import "./LoginPage.css";

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5001";

export default function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim(),
          username: username.trim(),
          password,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          body?.errors?.[0]?.msg ||
          body?.message ||
          "Could not create your account.";
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
        <h1 className="loginTitle">Create an account</h1>
        <img
          className="loginLogo"
          src={wildfireLogo}
          alt=""
          width={200}
          height={200}
        />
        <form className="loginForm" onSubmit={handleSubmit}>
          <label className="loginLabel" htmlFor="signup-name">
            Full name
            <input
              id="signup-name"
              name="name"
              className="loginInput"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              required
              maxLength={80}
            />
          </label>
          <label className="loginLabel" htmlFor="signup-email">
            Email
            <input
              id="signup-email"
              name="email"
              type="email"
              className="loginInput"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </label>
          <label className="loginLabel" htmlFor="signup-username">
            Username
            <input
              id="signup-username"
              name="username"
              className="loginInput"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
              minLength={3}
              maxLength={32}
              pattern="[a-zA-Z0-9_-]+"
              title="Letters, numbers, underscores, and hyphens only"
            />
          </label>
          <label className="loginLabel" htmlFor="signup-password">
            Password
            <input
              id="signup-password"
              name="password"
              type="password"
              className="loginInput"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              minLength={6}
            />
          </label>
          {error ? <p className="loginError">{error}</p> : null}
          <button type="submit" className="loginButton" disabled={loading}>
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>
        <p className="loginFooter">
          Already have an account? <Link to="/">Log in</Link>
        </p>
      </div>
    </main>
  );
}

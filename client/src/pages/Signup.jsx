import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LoginPage.css";

const wildfireLogo = "/wildfire-tracker-logo.svg";

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5050";

export default function Signup({ onAuthChange, onGuestContinue }) {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("guestMode");
    try {
      const res = await fetch(`${apiBase}/api/auth/register`, {
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
      const user = body?.data?.user;
      if (!token || !user) {
        setError("Registration response was missing account credentials. Please try again.");
        setLoading(false);
        return;
      }
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      onAuthChange?.();
      navigate("/dashboard");
    } catch {
      setError("Network error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  function handleGuestContinue() {
    setError("");
    onGuestContinue?.();
    navigate("/map");
  }

  function handleGoogleSignup() {
    setError("");
    setGoogleLoading(true);
    window.location.assign(`${apiBase}/api/auth/google`);
  }

  return (
    <main className="loginScreen">
      <div className="loginCard">
        <img
          className="loginLogo"
          src={wildfireLogo}
          alt="Wildfire Tracker logo"
          width={300}
          height={300}
        />
        <h1 className="loginTitle">Create an account</h1>
        <p className="loginFooter loginFooter--switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
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
        <button
          type="button"
          className="guestLoginButton"
          onClick={handleGuestContinue}
          disabled={loading || googleLoading}
        >
          Continue as Guest
        </button>
        <div className="loginDivider" aria-hidden="true">
          <span>or</span>
        </div>
        <button
          type="button"
          className="googleLoginButton"
          onClick={handleGoogleSignup}
          disabled={loading || googleLoading}
        >
          <span className="googleLoginIcon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.29h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.89c2.27-2.09 3.53-5.17 3.53-8.64z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.89-3c-1.08.72-2.46 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.09C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.29 14.3A7.21 7.21 0 0 1 4.91 12c0-.8.14-1.58.38-2.3V6.61H1.28A11.93 11.93 0 0 0 0 12c0 1.93.46 3.75 1.28 5.39l4.01-3.09z"
              />
              <path
                fill="#EA4335"
                d="M12 4.76c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.18 15.24 0 12 0 7.31 0 3.26 2.7 1.28 6.61l4.01 3.09C6.23 6.87 8.88 4.76 12 4.76z"
              />
            </svg>
          </span>
          {googleLoading ? "Connecting to Google..." : "Sign up with Google"}
        </button>
      </div>
    </main>
  );
}

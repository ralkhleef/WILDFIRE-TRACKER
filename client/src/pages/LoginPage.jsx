import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "./LoginPage.css";

const wildfireLogo = "/wildfire-tracker-logo.svg";

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5050";

export default function LoginPage({ onAuthChange, onGuestContinue }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const oauthToken = searchParams.get("token");
  const oauthError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [accountHelpMessage, setAccountHelpMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (oauthError) {
      setError(oauthError);
      setSearchParams({});
      return;
    }

    if (!oauthToken) return;

    let cancelled = false;

    async function completeGoogleLogin() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${apiBase}/api/auth/me`, {
          headers: { Authorization: `Bearer ${oauthToken}` },
        });
        const body = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(body?.message || "Google login could not be confirmed.");
        }

        if (cancelled) return;
        localStorage.removeItem("guestMode");
        localStorage.setItem("token", oauthToken);
        if (body?.data) {
          localStorage.setItem("user", JSON.stringify(body.data));
        }
        onAuthChange?.();
        setSearchParams({});
        navigate("/dashboard", { replace: true });
      } catch (err) {
        if (!cancelled) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setError(err.message || "Google login failed. Please try again.");
          setSearchParams({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    completeGoogleLogin();
    return () => {
      cancelled = true;
    };
  }, [navigate, oauthError, oauthToken, onAuthChange, setSearchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("guestMode");
    try {
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
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
      const user = body?.data?.user;
      if (!token || !user) {
        setError("Login response was missing account credentials. Please try again.");
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

  function handleGoogleLogin() {
    setError("");
    setGoogleLoading(true);
    window.location.assign(`${apiBase}/api/auth/google`);
  }

  function showAccountHelp(message) {
    setError("");
    setAccountHelpMessage(message);
  }

  function handleGuestContinue() {
    setError("");
    setAccountHelpMessage("");
    onGuestContinue?.();
    navigate("/map");
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
        <h1 className="loginTitle">Log in</h1>
        <p className="loginFooter loginFooter--switch">
          Don&apos;t have an account? <Link to="/register">Register</Link>
        </p>
        <form className="loginForm" onSubmit={handleSubmit}>
          <label className="loginLabel" htmlFor="login-email">
            Email
            <input
              id="login-email"
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
          <div className="loginHelpLinks" aria-label="Account recovery options">
            <button
              type="button"
              className="loginHelpLink"
              onClick={() =>
                showAccountHelp(
                  "Password reset is coming soon. Please contact support or create a new account for now.",
                )
              }
            >
              Forgot password?
            </button>
            <button
              type="button"
              className="loginHelpLink"
              onClick={() =>
                showAccountHelp(
                  "Username recovery is coming soon. You can log in with your email.",
                )
              }
            >
              Forgot username?
            </button>
          </div>
          {accountHelpMessage ? (
            <div className="loginHelpNotice" role="status">
              <p>{accountHelpMessage}</p>
              <button
                type="button"
                className="loginHelpDismiss"
                onClick={() => setAccountHelpMessage("")}
              >
                Got it
              </button>
            </div>
          ) : null}
          {error ? <p className="loginError">{error}</p> : null}
          <button type="submit" className="loginButton" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
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
          onClick={handleGoogleLogin}
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
          {googleLoading ? "Connecting to Google..." : "Sign in with Google"}
        </button>
      </div>
    </main>
  );
}

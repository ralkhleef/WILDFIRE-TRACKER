import { useCallback, useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import "./Profile.css";

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5050";

const AVATAR_MAX_BYTES = 500 * 1024;

function storageKey(userId, field) {
  return `wildfire_profile_${userId}_${field}`;
}

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export default function Profile() {
  const avatarInputId = useId();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [userId, setUserId] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState(null);
  const [avatarDirty, setAvatarDirty] = useState(false);

  const loadLocalFields = useCallback((id) => {
    const p =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(storageKey(id, "phone"))
        : null;
    const b =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(storageKey(id, "bio"))
        : null;
    const a =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(storageKey(id, "avatar"))
        : null;
    setPhone(p || "");
    setBio(b || "");
    setAvatarDataUrl(a || null);
    setAvatarDirty(false);
  }, []);

  useEffect(() => {
    setError("");
    setSuccess("");
    const headers = getAuthHeaders();

    if (!headers) {
      setLoading(false);
      setUserId(null);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${apiBase}/api/users/profile`, { headers });
        const body = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (!res.ok) {
          const msg =
            body?.errors?.[0]?.msg ||
            body?.message ||
            "Could not load your profile.";
          setError(msg);
          setUserId(null);
          return;
        }

        const data = body?.data;
        if (!data?.id) {
          setError("Invalid profile response.");
          setUserId(null);
          return;
        }

        setUserId(data.id);
        setName(data.name ?? "");
        setEmail(data.email ?? "");
        loadLocalFields(data.id);
      } catch {
        if (!cancelled) {
          setError("Network error. Is the backend running?");
          setUserId(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [loadLocalFields]);

  function parseApiError(body) {
    if (body?.errors?.length) {
      return body.errors.map((e) => e.msg || e.message).join(" ");
    }
    return body?.message || "Could not save profile.";
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError(
        `Image must be under ${AVATAR_MAX_BYTES / 1024} KB for browser storage.`,
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarDataUrl(typeof reader.result === "string" ? reader.result : null);
      setAvatarDirty(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleRemoveAvatar() {
    setAvatarDataUrl(null);
    setAvatarDirty(true);
    if (userId) {
      localStorage.removeItem(storageKey(userId, "avatar"));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const headers = getAuthHeaders();
    if (!headers) {
      setError("You need to log in again.");
      return;
    }

    const body = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (trimmedName) body.name = trimmedName;
    if (trimmedEmail) body.email = trimmedEmail;

    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/users/profile`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const resBody = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(parseApiError(resBody));
        setSaving(false);
        return;
      }

      const data = resBody?.data;
      if (data?.email) setEmail(data.email);
      if (typeof data?.name !== "undefined") setName(data.name ?? "");

      if (userId) {
        localStorage.setItem(storageKey(userId, "phone"), phone.trim());
        localStorage.setItem(storageKey(userId, "bio"), bio.trim());
        if (avatarDirty) {
          if (avatarDataUrl) {
            localStorage.setItem(storageKey(userId, "avatar"), avatarDataUrl);
          } else {
            localStorage.removeItem(storageKey(userId, "avatar"));
          }
          setAvatarDirty(false);
        }
      }

      setSuccess("Your profile changes were saved.");
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="profilePage">
        <p style={{ margin: 0, color: "var(--text)" }}>Loading profile…</p>
      </div>
    );
  }

  if (!getAuthHeaders()) {
    return (
      <div className="profilePage">
        <h1 className="profileTitle">Profile</h1>
        <div className="signInPrompt">
          <p>Log in to view and edit your profile.</p>
          <Link className="signInLink" to="/">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="profilePage">
      <h1 className="profileTitle">Profile</h1>
      <p className="profileHint">
        <strong>Name</strong> and <strong>email</strong> are saved to your
        account on the server. <strong>Phone</strong>, <strong>photo</strong>,
        and <strong>bio</strong> stay in this browser until the API supports
        them.
      </p>

      {error ? (
        <div className="banner bannerError" role="alert">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="banner bannerOk" role="status">
          {success}
        </div>
      ) : null}

      <form className="profileForm" onSubmit={handleSubmit}>
        <fieldset className="profileSection">
          <legend className="sectionLegend">Profile photo</legend>
          <div className="photoRow">
            <div className="avatarFrame" aria-hidden={!avatarDataUrl}>
              {avatarDataUrl ? (
                <img
                  className="avatarImg"
                  src={avatarDataUrl}
                  alt="Profile preview"
                />
              ) : (
                <span className="avatarPlaceholder">No photo</span>
              )}
            </div>
            <div className="photoActions">
              <input
                id={avatarInputId}
                className="fileInputHidden"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
              />
              <label className="fileInputLabel" htmlFor={avatarInputId}>
                Upload image
              </label>
              {avatarDataUrl ? (
                <button
                  type="button"
                  className="textBtn textBtnMuted"
                  onClick={handleRemoveAvatar}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
          <p className="fieldHint">
            JPG, PNG, or WebP · max {(AVATAR_MAX_BYTES / 1024).toFixed(0)} KB ·
            stored locally in this browser
          </p>
        </fieldset>

        <fieldset className="profileSection">
          <legend className="sectionLegend">Contact</legend>

          <label className="profileLabel" htmlFor="profile-name">
            Display name
            <input
              id="profile-name"
              name="name"
              className="profileInput"
              autoComplete="name"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="profileLabel" htmlFor="profile-email">
            Email
            <input
              id="profile-email"
              name="email"
              type="email"
              className="profileInput"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="profileLabel" htmlFor="profile-phone">
            Phone number
            <input
              id="profile-phone"
              name="phone"
              type="tel"
              className="profileInput"
              autoComplete="tel"
              inputMode="tel"
              placeholder="e.g. (555) 123-4567"
              maxLength={32}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <p className="fieldHint">Saved locally in this browser only.</p>
        </fieldset>

        <fieldset className="profileSection">
          <legend className="sectionLegend">About</legend>
          <label className="profileLabel" htmlFor="profile-bio">
            Bio / notes
            <textarea
              id="profile-bio"
              name="bio"
              className="profileTextarea"
              placeholder="Optional — for your reference"
              maxLength={500}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </label>
          <p className="fieldHint">Saved locally in this browser only.</p>
        </fieldset>

        <div className="formActions">
          <button type="submit" className="saveBtn" disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </button>
          <button
            type="button"
            className="textBtn textBtnMuted"
            disabled={saving}
            onClick={() => userId && loadLocalFields(userId)}
          >
            Reset local-only fields
          </button>
        </div>
      </form>
    </div>
  );
}

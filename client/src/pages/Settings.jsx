import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Settings.css";

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5001";

function getToken() {
  return localStorage.getItem("token");
}

export default function Settings() {
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [alertRadius, setAlertRadius] = useState(25);
  const [severityFilters, setSeverityFilters] = useState({
    critical: true,
    warning: true,
    watch: false,
  });
  const [savedLocations, setSavedLocations] = useState([]);
  const [newLabel, setNewLabel] = useState("");
  const [newLat, setNewLat] = useState("");
  const [newLng, setNewLng] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [locError, setLocError] = useState("");
  const [locBusy, setLocBusy] = useState(false);

  const isLoggedIn = !!getToken();

  useEffect(() => {
    if (!isLoggedIn) return;
    async function loadLocations() {
      try {
        const res = await fetch(`${apiBase}/api/users/saved-locations`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok) setSavedLocations(Array.isArray(body?.data) ? body.data : []);
      } catch {}
    }
    loadLocations();
  }, [isLoggedIn]);

  async function handleSavePreferences() {
    setSaving(true);
    setSaveMsg("");
    try {
      if (isLoggedIn) {
        await fetch(`${apiBase}/api/alerts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ radius: alertRadius, enabled: notificationsOn }),
        });
      }
      localStorage.setItem("wf_push", pushEnabled);
      localStorage.setItem("wf_email", emailEnabled);
      localStorage.setItem("wf_severity", JSON.stringify(severityFilters));
      localStorage.setItem("wf_radius", alertRadius);
      setSaveMsg("Preferences saved.");
    } catch {
      setSaveMsg("Could not save to server, saved locally.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  }

  async function handleAddLocation(e) {
    e.preventDefault();
    setLocError("");
    const lat = Number(newLat);
    const lng = Number(newLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setLocError("Enter valid latitude and longitude.");
      return;
    }
    if (!isLoggedIn) {
      setLocError("Log in to save locations.");
      return;
    }
    setLocBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/users/saved-locations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ label: newLabel.trim() || undefined, latitude: lat, longitude: lng }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || "Could not save location.");
      setSavedLocations((prev) => [...prev, body.data]);
      setNewLabel("");
      setNewLat("");
      setNewLng("");
    } catch (err) {
      setLocError(err.message);
    } finally {
      setLocBusy(false);
    }
  }

  function toggleSeverity(key) {
    setSeverityFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="settingsShell">
      <main className="settingsMain">
        <header className="settingsHeader">
          <h1 className="settingsTitle">Settings</h1>
          <label className="settingsNotifToggle">
            Notifications
            <input
              type="checkbox"
              checked={notificationsOn}
              onChange={(e) => setNotificationsOn(e.target.checked)}
            />
            <span className="settingsToggleTrack">
              <span className="settingsToggleThumb" />
            </span>
            <span className="settingsToggleLabel">{notificationsOn ? "On" : "Off"}</span>
          </label>
        </header>

        {/* Push notifications */}
        <section className="settingsSection">
          <div className="settingsRow">
            <div>
              <h2 className="settingsRowTitle">Push notifications</h2>
              <p className="settingsRowSub">Receive alerts on this device</p>
            </div>
            <label className="settingsToggle">
              <input
                type="checkbox"
                checked={pushEnabled}
                onChange={(e) => setPushEnabled(e.target.checked)}
              />
              <span className="settingsToggleTrack">
                <span className="settingsToggleThumb" />
              </span>
            </label>
          </div>
        </section>

        {/* Email alerts */}
        <section className="settingsSection">
          <div className="settingsRow">
            <div>
              <h2 className="settingsRowTitle">Email alerts</h2>
              <p className="settingsRowSub">Daily digest and critical-only options in email prefs</p>
            </div>
            <label className="settingsToggle">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
              />
              <span className="settingsToggleTrack">
                <span className="settingsToggleThumb" />
              </span>
            </label>
          </div>
        </section>

        {/* Alert radius */}
        <section className="settingsSection">
          <h2 className="settingsRowTitle">Alert radius</h2>
          <p className="settingsRowSub">Notify when a fire is within this distance of a monitored location</p>
          <div className="settingsSliderRow">
            <span className="settingsSliderMin">5 mi</span>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={alertRadius}
              onChange={(e) => setAlertRadius(Number(e.target.value))}
              className="settingsSlider"
            />
            <span className="settingsSliderMax">100 mi</span>
            <span className="settingsSliderValue">{alertRadius} mi</span>
          </div>
        </section>

        {/* Severity filter */}
        <section className="settingsSection">
          <h2 className="settingsRowTitle">Alert severity filter</h2>
          <p className="settingsRowSub">Only notify for selected severities (applies to push and email)</p>
          <div className="settingsCheckRow">
            {["critical", "warning", "watch"].map((key) => (
              <label key={key} className="settingsCheckLabel">
                <input
                  type="checkbox"
                  checked={severityFilters[key]}
                  onChange={() => toggleSeverity(key)}
                />
                <span className={`settingsSeverityDot settingsSeverityDot--${key}`} />
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
            ))}
          </div>
          <p className="settingsRowSub" style={{ marginTop: "0.4rem" }}>
            If none selected, defaults to Critical only
          </p>
        </section>

        {/* Saved locations */}
        <section className="settingsSection">
          <h2 className="settingsRowTitle">Saved locations (monitoring)</h2>
          <p className="settingsRowSub">We check fires near each saved place using your alert radius</p>

          {!isLoggedIn ? (
            <p className="settingsRowSub">
              <Link to="/" style={{ color: "var(--accent)" }}>Log in</Link> to save locations.
            </p>
          ) : (
            <>
              {savedLocations.length === 0 ? (
                <p className="settingsRowSub">No saved locations yet.</p>
              ) : (
                <div className="settingsLocationList">
                  {savedLocations.map((loc) => (
                    <div key={loc.id} className="settingsLocationItem">
                      <div>
                        <p className="settingsLocationLabel">{loc.label || "Saved location"}</p>
                        <p className="settingsLocationCoords">
                          {Number(loc.latitude).toFixed(4)}, {Number(loc.longitude).toFixed(4)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <form className="settingsAddLocationForm" onSubmit={handleAddLocation}>
                <input
                  className="settingsInput"
                  type="text"
                  placeholder="Label (e.g. Home)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
                <input
                  className="settingsInput"
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={newLat}
                  onChange={(e) => setNewLat(e.target.value)}
                  required
                />
                <input
                  className="settingsInput"
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={newLng}
                  onChange={(e) => setNewLng(e.target.value)}
                  required
                />
                <button type="submit" className="settingsAddBtn" disabled={locBusy}>
                  {locBusy ? "Adding…" : "+ Add saved location"}
                </button>
              </form>
              {locError ? <p className="settingsError">{locError}</p> : null}
            </>
          )}
        </section>

        {/* Save button */}
        <div className="settingsSaveRow">
          <button
            type="button"
            className="settingsSaveBtn"
            onClick={handleSavePreferences}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save preferences"}
          </button>
          {saveMsg ? <span className="settingsSaveMsg">{saveMsg}</span> : null}
        </div>
      </main>
    </div>
  );
}
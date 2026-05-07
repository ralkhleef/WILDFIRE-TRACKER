import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Offline.css";

const CACHE_KEY = "wf_cached_fires";

export default function Offline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cachedFires] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    function handleOnline() { setIsOnline(true); }
    function handleOffline() { setIsOnline(false); }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="offlineShell">
      <main className="offlineMain">

        {/* Status banner */}
        <div className={`offlineStatusBanner ${isOnline ? "offlineStatusBanner--online" : "offlineStatusBanner--offline"}`}>
          <span className="offlineStatusDot" />
          <span>{isOnline ? "You're back online" : "You're currently offline"}</span>
          {isOnline && (
            <Link to="/dashboard" className="offlineGoLiveBtn">Go to dashboard →</Link>
          )}
        </div>

        {/* Hero */}
        {!isOnline && (
          <div className="offlineHero">
            <div className="offlineHeroIcon">🔥</div>
            <h1 className="offlineHeroTitle">No internet connection</h1>
            <p className="offlineHeroSub">
              You can still access emergency contacts and previously viewed fire data below.
            </p>
          </div>
        )}

        <div className="offlineGrid">
          {/* Emergency contacts — always available */}
          <section className="offlineCard offlineCard--red">
            <h2 className="offlineCardTitle">Emergency contacts</h2>
            <p className="offlineCardSub">Save these, they work without internet</p>
            <ul className="offlineContactList">
              <li>
                <a href="tel:911" className="offlineContactLink">
                  <span className="offlineContactIcon"></span>
                  <span>
                    <strong>911</strong>
                    <span className="offlineContactDesc">Emergency services</span>
                  </span>
                </a>
              </li>
              <li>
                <a href="tel:18007334767" className="offlineContactLink">
                  <span className="offlineContactIcon"></span>
                  <span>
                    <strong>1-800-RED-CROSS</strong>
                    <span className="offlineContactDesc">American Red Cross</span>
                  </span>
                </a>
              </li>
              <li>
                <a href="tel:18002582772" className="offlineContactLink">
                  <span className="offlineContactIcon"></span>
                  <span>
                    <strong>1-800-258-2772</strong>
                    <span className="offlineContactDesc">CAL FIRE hotline</span>
                  </span>
                </a>
              </li>
              <li>
                <a href="tel:211" className="offlineContactLink">
                  <span className="offlineContactIcon"></span>
                  <span>
                    <strong>211</strong>
                    <span className="offlineContactDesc">Local emergency resources</span>
                  </span>
                </a>
              </li>
            </ul>
          </section>

          {/* Safety tips — always available */}
          <section className="offlineCard offlineCard--amber">
            <h2 className="offlineCardTitle">Quick safety tips</h2>
            <p className="offlineCardSub">What to do during a wildfire</p>
            <ol className="offlineTipsList">
              <li>Follow official evacuation orders immediately, don't wait</li>
              <li>Take medications, documents, phone charger, and water</li>
              <li>Close all windows and doors to slow smoke entry</li>
              <li>Turn off gas at the meter if time allows</li>
              <li>Text rather than call, texts work on congested networks</li>
              <li>Go to the designated evacuation center in your county</li>
            </ol>
          </section>

          {/* Cached fires */}
          <section className="offlineCard offlineCard--neutral">
            <h2 className="offlineCardTitle">Last known fire data</h2>
            <p className="offlineCardSub">
              {cachedFires.length > 0
                ? "Cached from your last session — may be outdated"
                : "No cached fire data available"}
            </p>
            {cachedFires.length > 0 ? (
              <ul className="offlineFireList">
                {cachedFires.slice(0, 6).map((fire) => (
                  <li key={fire.id} className="offlineFireItem">
                    <span className="offlineFireName">{fire.name || "Unnamed fire"}</span>
                    <span className="offlineFireLocation">{fire.location || "Unknown location"}</span>
                    {typeof fire.containment === "number" && (
                      <span className="offlineFireContainment">{fire.containment}% contained</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="offlineEmptyNote">
                Visit the map or alerts page while online to cache fire data for offline use.
              </p>
            )}
          </section>

          {/* Useful links */}
          <section className="offlineCard offlineCard--neutral">
            <h2 className="offlineCardTitle">Useful links</h2>
            <p className="offlineCardSub">These may work if you have partial connectivity</p>
            <ul className="offlineLinkList">
              <li>
                <a href="https://www.fire.ca.gov/incidents" target="_blank" rel="noreferrer" className="offlineExternalLink">
                  CAL FIRE active incidents ↗
                </a>
              </li>
              <li>
                <a href="https://www.ready.gov/wildfires" target="_blank" rel="noreferrer" className="offlineExternalLink">
                  Ready.gov wildfire guide ↗
                </a>
              </li>
              <li>
                <a href="https://www.airnow.gov" target="_blank" rel="noreferrer" className="offlineExternalLink">
                  AirNow air quality ↗
                </a>
              </li>
              <li>
                <a href="https://alerts.weather.gov" target="_blank" rel="noreferrer" className="offlineExternalLink">
                  National Weather Service alerts ↗
                </a>
              </li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}

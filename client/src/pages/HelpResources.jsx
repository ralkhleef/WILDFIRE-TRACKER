import { Link } from "react-router-dom";
import "./HelpResources.css";

export default function HelpResources() {
  return (
    <div className="helpShell">
      <main className="helpMain">
        <header className="helpHeader">
          <h1 className="helpTitle">Help &amp; resources</h1>
          <p className="helpSub">Emergency information, safety tips, and useful links</p>
        </header>

        <div className="helpGrid">

          {/* Evacuation routes */}
          <section className="helpCard helpCard--red">
            <h2 className="helpCardTitle"> Evacuation routes</h2>
            <p className="helpCardSub">Find official evacuation routes and road closures near you</p>
            <ul className="helpLinkList">
              <li>
                <a href="https://www.fire.ca.gov" target="_blank" rel="noreferrer" className="helpExternalLink">
                  CAL FIRE evacuation info ↗
                </a>
              </li>
              <li>
                <a href="https://roads.dot.ca.gov" target="_blank" rel="noreferrer" className="helpExternalLink">
                  California road conditions ↗
                </a>
              </li>
              <li>
                <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="helpExternalLink">
                  Google Maps directions ↗
                </a>
              </li>
              <li>
                <Link to="/resources" className="helpExternalLink">
                  Evacuation centers near you (in-app) →
                </Link>
              </li>
            </ul>
          </section>

          {/* Shelters nearby */}
          <section className="helpCard helpCard--blue">
            <h2 className="helpCardTitle"> Shelters nearby</h2>
            <p className="helpCardSub">Find emergency shelters and Red Cross locations</p>
            <ul className="helpLinkList">
              <li>
                <a href="https://www.redcross.org/get-help/disaster-relief-and-recovery-services/find-an-open-shelter.html" target="_blank" rel="noreferrer" className="helpExternalLink">
                  Red Cross open shelters ↗
                </a>
              </li>
              <li>
                <a href="https://www.211.org" target="_blank" rel="noreferrer" className="helpExternalLink">
                  211.org local resources ↗
                </a>
              </li>
              <li>
                <Link to="/resources" className="helpExternalLink">
                  View shelters on map (in-app) →
                </Link>
              </li>
            </ul>
          </section>

          {/* Safety guidelines */}
          <section className="helpCard helpCard--amber">
            <h2 className="helpCardTitle"> Safety guidelines</h2>
            <p className="helpCardSub">What to do before, during, and after a wildfire</p>
            <ol className="helpTipsList">
              <li>Follow official evacuation orders immediately, don't wait</li>
              <li>Take medications, documents, phone charger, and water</li>
              <li>Close all windows and doors to slow smoke entry</li>
              <li>Turn off gas at the meter if time allows</li>
              <li>Text rather than call, texts work on congested networks</li>
              <li>Don't return home until officials say it's safe</li>
            </ol>
          </section>

          {/* Emergency contacts */}
          <section className="helpCard helpCard--red">
            <h2 className="helpCardTitle"> Emergency contacts</h2>
            <p className="helpCardSub">Tap to call, save these offline</p>
            <ul className="helpContactList">
              <li>
                <a href="tel:911" className="helpContactLink">
                  <strong>911</strong>
                  <span>Emergency services</span>
                </a>
              </li>
              <li>
                <a href="tel:18007334767" className="helpContactLink">
                  <strong>1-800-RED-CROSS</strong>
                  <span>American Red Cross</span>
                </a>
              </li>
              <li>
                <a href="tel:18002582772" className="helpContactLink">
                  <strong>1-800-258-2772</strong>
                  <span>CAL FIRE hotline</span>
                </a>
              </li>
              <li>
                <a href="tel:211" className="helpContactLink">
                  <strong>211</strong>
                  <span>Local emergency resources</span>
                </a>
              </li>
            </ul>
          </section>

          {/* Air quality */}
          <section className="helpCard helpCard--neutral">
            <h2 className="helpCardTitle"> Air quality</h2>
            <p className="helpCardSub">Monitor smoke and air quality during active fires</p>
            <ul className="helpLinkList">
              <li>
                <a href="https://www.airnow.gov" target="_blank" rel="noreferrer" className="helpExternalLink">
                  AirNow real-time AQI ↗
                </a>
              </li>
              <li>
                <a href="https://www.purpleair.com/map" target="_blank" rel="noreferrer" className="helpExternalLink">
                  PurpleAir live sensor map ↗
                </a>
              </li>
              <li>
                <a href="https://fire.airnow.gov" target="_blank" rel="noreferrer" className="helpExternalLink">
                  AirNow fire and smoke map ↗
                </a>
              </li>
            </ul>
          </section>

          {/* Preparedness */}
          <section className="helpCard helpCard--neutral">
            <h2 className="helpCardTitle"> Preparedness</h2>
            <p className="helpCardSub">Get ready before a fire happens</p>
            <ul className="helpLinkList">
              <li>
                <a href="https://www.readyforwildfire.org" target="_blank" rel="noreferrer" className="helpExternalLink">
                  ReadyForWildfire.org ↗
                </a>
              </li>
              <li>
                <a href="https://www.ready.gov/wildfires" target="_blank" rel="noreferrer" className="helpExternalLink">
                  Ready.gov wildfire guide ↗
                </a>
              </li>
              <li>
                <a href="https://www.fire.ca.gov/programs/communications/defensible-space-embers" target="_blank" rel="noreferrer" className="helpExternalLink">
                  CAL FIRE defensible space ↗
                </a>
              </li>
            </ul>
          </section>

        </div>

        <div className="helpOfflineNote">
          <span></span>
          <span>
            Going somewhere with no signal?{" "}
            <Link to="/offline" style={{ color: "var(--accent)", fontWeight: 600 }}>
              View the offline page
            </Link>{" "}
            which works without internet.
          </span>
        </div>
      </main>
    </div>
  );
}
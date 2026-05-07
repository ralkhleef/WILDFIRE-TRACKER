import { useMemo, useState } from "react";
import "./EvacuationResources.css";

const emergencyContacts = [
  { label: "Emergency", detail: "Life safety, active evacuation, immediate danger", href: "tel:911", value: "911" },
  { label: "American Red Cross", detail: "Shelter and disaster assistance", href: "tel:18007334767", value: "1-800-RED-CROSS" },
  { label: "FEMA Disaster Helpline", detail: "Federal disaster assistance", href: "tel:18006213362", value: "1-800-621-3362" },
  { label: "Local community resources", detail: "County services, shelters, transportation", href: "tel:211", value: "211" },
];

const officialLinks = [
  { title: "CAL FIRE incidents", description: "Official statewide incident updates", href: "https://www.fire.ca.gov/incidents" },
  { title: "Ready.gov evacuation", description: "Evacuation planning and go-bag guidance", href: "https://www.ready.gov/evacuation" },
  { title: "American Red Cross shelters", description: "Open shelter information and support", href: "https://www.redcross.org/get-help/disaster-relief-and-recovery-services/find-an-open-shelter.html" },
  { title: "FEMA app and alerts", description: "Emergency alerts and disaster resources", href: "https://www.fema.gov/about/news-multimedia/mobile-products" },
  { title: "AirNow", description: "Local smoke and air quality information", href: "https://www.airnow.gov/" },
  { title: "California OES", description: "State emergency preparedness resources", href: "https://www.caloes.ca.gov/" },
  { title: "ALERTCalifornia cameras", description: "Live wildfire camera network from UC San Diego", href: "https://cameras.alertcalifornia.org/" },
  { title: "WIFIRE Firemap", description: "Real-time fire behavior and modeling map (UCSD)", href: "https://firemap.sdsc.edu/" },
];

const checklist = [
  "Know at least two evacuation routes out of your neighborhood.",
  "Pack medications, IDs, chargers, cash, water, and N95 masks.",
  "Keep pets, carriers, leashes, and food ready to load quickly.",
  "Move vehicles facing outward and keep fuel or charge above half.",
  "Share your evacuation plan with household members and neighbors.",
  "Follow official evacuation orders from local authorities.",
];

export default function EvacuationResources() {
  const [query, setQuery] = useState("");

  const filteredLinks = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return officialLinks;
    return officialLinks.filter((link) =>
      `${link.title} ${link.description}`.toLowerCase().includes(term),
    );
  }, [query]);

  return (
    <main className="resourcesPage">
      <header className="resourcesHeader">
        <div>
          <p className="pageEyebrow">Emergency readiness</p>
          <h1 className="resourcesTitle">Resources</h1>
          <p className="resourcesSubtitle">
            Fast access to official wildfire, evacuation, shelter, and air quality resources.
          </p>
        </div>
      </header>

      <section className="resourcesHeroGrid">
        <article className="resourcesCard resourcesEmergencyCard">
          <div className="resourcesCardHeader">
            <h2>Emergency contacts</h2>
            <p>Use official emergency channels first.</p>
          </div>
          <div className="contactGrid">
            {emergencyContacts.map((contact) => (
              <a key={contact.value} className="contactCard" href={contact.href}>
                <span>{contact.label}</span>
                <strong>{contact.value}</strong>
                <small>{contact.detail}</small>
              </a>
            ))}
          </div>
        </article>

        <article className="resourcesCard">
          <div className="resourcesCardHeader">
            <h2>Evacuation checklist</h2>
            <p>Practical steps before an alert becomes urgent.</p>
          </div>
          <ul className="checklist">
            {checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="resourcesCard">
        <div className="resourcesToolbar">
          <div className="resourcesCardHeader">
            <h2>Official links</h2>
            <p>Verified public resources. No random shelter addresses.</p>
          </div>
          <label className="resourceSearchLabel" htmlFor="resource-search">
            Search resources
            <input
              id="resource-search"
              className="resourceSearchInput"
              type="search"
              placeholder="Search CAL FIRE, shelter, air quality..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        <div className="resourceLinkGrid">
          {filteredLinks.map((link) => (
            <a key={link.href} className="resourceLinkCard" href={link.href} target="_blank" rel="noreferrer">
              <span>{link.title}</span>
              <p>{link.description}</p>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}

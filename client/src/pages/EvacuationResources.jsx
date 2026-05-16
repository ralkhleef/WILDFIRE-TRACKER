import { useEffect, useMemo, useState } from "react";
import { Play, ExternalLink, X, MapPin } from "lucide-react";
import { apiBase } from "../api.js";
import "./EvacuationResources.css";

const emergencyContacts = [
  { label: "Emergency", detail: "Life safety, active evacuation, immediate danger", href: "tel:911", value: "911" },
  { label: "American Red Cross", detail: "Shelter and disaster assistance", href: "tel:18007334767", value: "1-800-RED-CROSS" },
  { label: "FEMA Disaster Helpline", detail: "Federal disaster assistance", href: "tel:18006213362", value: "1-800-621-3362" },
  { label: "Local community resources", detail: "County services, shelters, transportation", href: "tel:211", value: "211" },
];

const officialLinks = [
  { title: "CAL FIRE incidents", description: "Official statewide incident updates", href: "https://www.fire.ca.gov/incidents" },
  { title: "CAL FIRE Ready For Wildfire", description: "Step-by-step preparedness from CAL FIRE", href: "https://readyforwildfire.org/" },
  { title: "Red Cross wildfire preparedness", description: "How to prepare for a wildfire (American Red Cross)", href: "https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/wildfire.html" },
  { title: "Ready.gov wildfires", description: "Federal wildfire preparedness guide", href: "https://www.ready.gov/wildfires" },
  { title: "Red Cross shelters", description: "Open shelter information and support", href: "https://www.redcross.org/get-help/disaster-relief-and-recovery-services/find-an-open-shelter.html" },
  { title: "AirNow", description: "Local smoke and air quality information", href: "https://www.airnow.gov/" },
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

const redCrossWildfirePage =
  "https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/wildfire.html";

const wildfireVideos = [
  {
    id: "redcross-prep-en",
    title: "Wildfire preparedness — English",
    description: "A Red Cross overview of what to do before, during, and after wildfire danger.",
    source: "Red Cross",
    language: "English",
    href: redCrossWildfirePage,
  },
  {
    id: "redcross-es",
    title: "Wildfire preparedness — Spanish",
    description: "Spanish-language Red Cross wildfire preparedness guidance and evacuation basics.",
    source: "Red Cross",
    language: "Spanish",
    href: redCrossWildfirePage,
  },
  {
    id: "redcross-asl",
    title: "Wildfire preparedness — ASL",
    description: "Accessible wildfire preparedness information from the Red Cross wildfire resource page.",
    source: "Red Cross",
    language: "ASL",
    href: redCrossWildfirePage,
  },
];

export default function EvacuationResources() {
  const [query, setQuery] = useState("");
  const [activeVideo, setActiveVideo] = useState(null);
  const [nearbyResources, setNearbyResources] = useState([]);
  const [resourceStatus, setResourceStatus] = useState("Loading nearby evacuation resources...");
  const [origin, setOrigin] = useState({ latitude: 33.6846, longitude: -117.8265, label: "Irvine, CA" });

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setOrigin({ latitude: coords.latitude, longitude: coords.longitude, label: "your location" });
      },
      () => {},
      { timeout: 7000 },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadResources() {
      setResourceStatus(`Loading resources near ${origin.label}...`);
      try {
        const params = new URLSearchParams({
          latitude: String(origin.latitude),
          longitude: String(origin.longitude),
          radius: "75",
        });
        const res = await fetch(`${apiBase}/api/evacuation-resources/nearby?${params.toString()}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.message || "Could not load evacuation resources.");
        if (!cancelled) {
          const data = Array.isArray(body?.data) ? body.data : [];
          setNearbyResources(data);
          setResourceStatus(data.length ? `Showing resources near ${origin.label}.` : "No nearby seeded resources found.");
        }
      } catch (error) {
        if (!cancelled) {
          setNearbyResources([]);
          setResourceStatus(error.message);
        }
      }
    }
    loadResources();
    return () => {
      cancelled = true;
    };
  }, [origin]);

  const filteredLinks = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return officialLinks;
    return officialLinks.filter((link) =>
      `${link.title} ${link.description}`.toLowerCase().includes(term),
    );
  }, [query]);

  function handleVideoOpen(video) {
    if (video.embedUrl) {
      setActiveVideo(video);
      return;
    }
    window.open(video.href, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="resourcesPage">
      <header className="resourcesHeader">
        <div>
          <h1 className="resourcesTitle">Resources</h1>
        </div>
      </header>

      <section className="resourcesIntroGrid">
        <article className="checklistSection">
          <div className="resourcesCardHeader">
            <h2>Evacuation checklist</h2>
            <p>Simple steps to help you get ready before an evacuation.</p>
          </div>
          <ul className="checklist">
            {checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="emergencyContactsSection">
          <div className="resourcesCardHeader">
            <h2>Emergency contacts</h2>
            <p>Use official emergency numbers and support lines when you need immediate help.</p>
          </div>
          <div className="contactList">
            {emergencyContacts.map((contact) => (
              <a key={contact.value} className="contactRow" href={contact.href}>
                <span className="contactText">
                  <strong>{contact.label}</strong>
                  <small>{contact.detail}</small>
                </span>
                <b>{contact.value}</b>
              </a>
            ))}
          </div>
        </article>
      </section>

      <section className="nearbyResourcesSection">
        <div className="resourcesToolbar">
          <div className="resourcesCardHeader">
            <h2>Nearby evacuation resources</h2>
            <p>{resourceStatus}</p>
          </div>
          <button
            type="button"
            className="resourceLocationBtn"
            onClick={() => {
              if (!navigator.geolocation) return;
              navigator.geolocation.getCurrentPosition(({ coords }) => {
                setOrigin({ latitude: coords.latitude, longitude: coords.longitude, label: "your location" });
              });
            }}
          >
            <MapPin size={15} strokeWidth={2.4} />
            Use my location
          </button>
        </div>
        <div className="nearbyResourceGrid">
          {nearbyResources.slice(0, 6).map((resource) => (
            <article key={resource.id} className="nearbyResourceCard">
              <div>
                <span className="resourceTypeChip">{resource.type.replaceAll("_", " ")}</span>
                <h3>{resource.name}</h3>
                <p>{resource.address}{resource.city ? `, ${resource.city}` : ""}</p>
              </div>
              <div className="nearbyResourceMeta">
                {typeof resource.distanceMiles === "number" ? <span>{resource.distanceMiles.toFixed(1)} mi</span> : null}
                {resource.capacity ? <span>Capacity {resource.capacity}</span> : null}
                <span>{resource.openNow ? "Open / available" : "Status unknown"}</span>
              </div>
              {resource.phone ? <a href={`tel:${resource.phone}`}>{resource.phone}</a> : null}
            </article>
          ))}
        </div>
      </section>

      {/* Wildfire preparedness videos — visual media grid. */}
      <section className="videoSection">
        <div className="videoSectionHeader">
          <h2>Wildfire preparedness videos</h2>
        </div>
        <div className="videoGrid">
          {wildfireVideos.map((video) => (
            <article
              key={video.id}
              className="videoCard"
            >
              <button
                type="button"
                className="videoThumb videoThumb--redCross"
                onClick={() => handleVideoOpen(video)}
                aria-label={`Watch ${video.title}`}
              >
                <span className="videoSourceChip">{video.source}</span>
                <span className="videoLanguageChip">{video.language}</span>
                <span className="videoPlayBadge">
                  <Play size={20} strokeWidth={2.5} fill="currentColor" />
                </span>
              </button>
              <div className="videoBody">
                <h3>{video.title}</h3>
                <p>{video.description}</p>
                <button type="button" className="videoCta" onClick={() => handleVideoOpen(video)}>
                  Watch video
                  <ExternalLink size={14} strokeWidth={2} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="officialLinksSection">
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

        <div className="resourceLinkList">
          {filteredLinks.map((link) => (
            <a key={link.href} className="resourceLinkRow" href={link.href} target="_blank" rel="noreferrer">
              <span className="resourceLinkText">
                <strong>{link.title}</strong>
                <small>{link.description}</small>
              </span>
              <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
            </a>
          ))}
        </div>
      </section>

      {activeVideo ? (
        <div className="videoModalBackdrop" role="presentation" onClick={() => setActiveVideo(null)}>
          <div
            className="videoModal"
            role="dialog"
            aria-modal="true"
            aria-label={activeVideo.title}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="videoModalHeader">
              <h2>{activeVideo.title}</h2>
              <button type="button" className="videoModalClose" onClick={() => setActiveVideo(null)} aria-label="Close video">
                <X size={18} />
              </button>
            </div>
            <iframe
              title={activeVideo.title}
              src={activeVideo.embedUrl}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            <a className="videoModalFallback" href={activeVideo.href} target="_blank" rel="noreferrer">
              Open official Red Cross wildfire page
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      ) : null}
    </main>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  MapPin,
  ClipboardCheck,
  PhoneCall,
  Film,
  ArrowRight,
  Bell,
  Building2,
  Camera,
  Flame,
  Plus,
  ShieldCheck,
  Users,
  Wind,
  X,
} from "lucide-react";
import { apiBase } from "../api.js";
import "./EvacuationResources.css";

const emergencyContacts = [
  { label: "Emergency", detail: "Life safety, active evacuation, immediate danger", href: "tel:911", value: "911" },
  { label: "American Red Cross", detail: "Shelter and disaster assistance", href: "tel:18007334767", value: "1-800-RED-CROSS" },
  { label: "FEMA Disaster Helpline", detail: "Federal disaster assistance", href: "tel:18006213362", value: "1-800-621-3362" },
  { label: "Local community resources", detail: "County services, shelters, transportation", href: "tel:211", value: "211" },
];

const officialLinks = [
  { title: "CAL FIRE Incidents", displayUrl: "fire.ca.gov/incidents", href: "https://www.fire.ca.gov/incidents", Icon: ShieldCheck },
  { title: "CAL FIRE Ready For Wildfire", displayUrl: "readyforwildfire.org", href: "https://readyforwildfire.org", Icon: Flame },
  { title: "Red Cross Wildfire Safety", displayUrl: "redcross.org/wildfire", href: "https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/wildfire.html", Icon: Plus },
  { title: "Red Cross Shelters", displayUrl: "redcross.org/shelters", href: "https://www.redcross.org/get-help/disaster-relief-and-recovery-services/find-an-open-shelter.html", Icon: Building2 },
  { title: "Ready.gov Wildfires", displayUrl: "ready.gov/wildfires", href: "https://www.ready.gov/wildfires", Icon: ShieldCheck },
  { title: "AirNow - Air Quality", displayUrl: "airnow.gov", href: "https://www.airnow.gov", Icon: Wind },
  { title: "Watch Duty", displayUrl: "watchduty.org", href: "https://www.watchduty.org", Icon: Bell },
  { title: "ALERTCalifornia Cameras", displayUrl: "alertcalifornia.org", href: "https://alertcalifornia.org", Icon: Camera },
];

const checklist = [
  {
    title: "Know your evacuation routes",
    description: "Plan at least two ways out of your neighborhood in case one route is blocked.",
  },
  {
    title: "Build a Go-Kit",
    description: "Pack medications, IDs, chargers, water, masks, pet supplies, and important documents.",
  },
  {
    title: "Prepare children and family members",
    description: "Talk through the plan calmly so everyone knows what to do during a wildfire.",
  },
  {
    title: "Include pets and accessibility needs",
    description: "Keep carriers, leashes, mobility devices, and support items ready.",
  },
  {
    title: "Watch your surroundings",
    description: "Track weather, nearby fires, smoke, and instructions from local authorities.",
  },
  {
    title: "Be ready to leave quickly",
    description: "You may not always receive an official evacuation notice before danger increases.",
  },
];

const wildfireVideos = [
  {
    id: "redcross-prep-en",
    title: "Wildfire preparedness - English",
    description: "A Red Cross overview of what to do before, during, and after wildfire danger.",
    source: "Red Cross",
    language: "English",
    href: "https://vimeo.com/1035689524?fl=pl&fe=sh",
  },
  {
    id: "redcross-es",
    title: "Wildfire preparedness - Spanish",
    description: "Spanish-language Red Cross wildfire preparedness guidance and evacuation basics.",
    source: "Red Cross",
    language: "Spanish",
    href: "https://vimeo.com/1035698217?fl=pl&fe=sh",
  },
  {
    id: "redcross-asl",
    title: "Wildfire preparedness - ASL",
    description: "Accessible wildfire preparedness information from the Red Cross wildfire resource page.",
    source: "Red Cross",
    language: "ASL",
    href: "https://vimeo.com/1035350907?fl=pl&fe=sh",
  },
];

const heroCards = [
  {
    key: "checklist",
    Icon: ClipboardCheck,
    title: "Evacuation Checklist",
    blurb: "Simple steps to get ready before an evacuation.",
    cta: "View checklist",
    tone: "amber",
    artwork: "kit",
  },
  {
    key: "contacts",
    Icon: PhoneCall,
    title: "Emergency Contacts",
    blurb: "Important numbers to call in an emergency.",
    cta: "View contacts",
    tone: "rose",
    artwork: "phone",
  },
  {
    key: "videos",
    Icon: Film,
    title: "Preparedness Videos",
    blurb: "Helpful wildfire safety and preparedness guidance.",
    cta: "Watch videos",
    tone: "sky",
    artwork: "video",
  },
];

const panelCopy = {
  checklist: {
    title: "Evacuation checklist",
    description: "",
  },
  contacts: {
    title: "Emergency contacts",
    description: "Tap a number to call from your device.",
  },
  videos: {
    title: "Preparedness videos",
    description: "Official Red Cross wildfire safety guidance.",
  },
};

const DEFAULT_ORIGIN = { latitude: 33.6846, longitude: -117.8265, label: "Irvine, CA" };

function titleCase(value) {
  return String(value || "resource")
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatResourceAddress(resource) {
  return [resource.address, resource.city, resource.state].filter(Boolean).join(", ");
}

function formatPhoneHref(phone) {
  return `tel:${String(phone).replace(/[^\d+]/g, "")}`;
}

function getResourceVisualTone(type) {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("pet")) return "pet";
  if (normalized.includes("hospital")) return "medical";
  if (normalized.includes("shelter")) return "shelter";
  return "center";
}

export default function EvacuationResources() {
  const [query, setQuery] = useState("");
  const [activePanel, setActivePanel] = useState(null);
  const [resourcesExpanded, setResourcesExpanded] = useState(false);
  const [nearbyResources, setNearbyResources] = useState([]);
  const [resourceStatus, setResourceStatus] = useState("Loading nearby evacuation resources...");
  const [origin, setOrigin] = useState(DEFAULT_ORIGIN);

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
      setResourcesExpanded(false);
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
          setResourceStatus(data.length ? "" : "No nearby resources found for this area.");
        }
      } catch (error) {
        if (!cancelled) {
          setNearbyResources([]);
          setResourceStatus(
            error.message === "Failed to fetch"
              ? "Nearby resources are temporarily unavailable."
              : error.message,
          );
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
      `${link.title} ${link.displayUrl}`.toLowerCase().includes(term),
    );
  }, [query]);

  function openResourcePanel(key) {
    setActivePanel(key);
  }

  function refreshLocation() {
    if (!navigator.geolocation) {
      setResourceStatus("Location services are not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setOrigin({ latitude: coords.latitude, longitude: coords.longitude, label: "your location" });
      },
      () => {
        setResourceStatus("Location permission was not granted.");
      },
      { timeout: 7000 },
    );
  }

  const activePanelCopy = activePanel ? panelCopy[activePanel] : null;
  const visibleNearbyResources = resourcesExpanded ? nearbyResources : nearbyResources.slice(0, 3);
  const hiddenResourceCount = Math.max(nearbyResources.length - 3, 0);

  return (
    <main className="resourceCenterPage">
      <header className="resourceCenterHeader">
        <h1 className="resourceCenterTitle">Resources</h1>
        <p className="resourceCenterSubtitle">
          Helpful information and tools to keep you and your community safe.
        </p>
      </header>

      <section className="resourceHeroGrid" aria-label="Resource highlights">
        {heroCards.map(({ key, Icon, title, blurb, cta, tone, artwork }) => (
          <article key={key} className={`resourceHeroCard resourceHeroCard--${tone}`}>
            <div className="resourceHeroCopy">
              <span className="resourceHeroIcon" aria-hidden="true">
                <Icon size={22} strokeWidth={2} />
              </span>
              <h2 className="resourceHeroTitle">{title}</h2>
              <p className="resourceHeroBlurb">{blurb}</p>
            </div>
            <div className={`resourceHeroArtwork resourceHeroArtwork--${artwork}`} aria-hidden="true">
              <span className="artShape artShape--primary" />
              <span className="artShape artShape--secondary" />
              <span className="artShape artShape--accent" />
            </div>
            <button
              type="button"
              className="resourceHeroCta"
              onClick={() => openResourcePanel(key)}
              aria-expanded={activePanel === key}
              aria-haspopup="dialog"
            >
              {cta}
              <ArrowRight size={15} strokeWidth={2.4} />
            </button>
          </article>
        ))}
      </section>

      <section id="nearby-resources" className="resourcesLandingSection nearbyResourcesSection">
        <div className="sectionHeadingRow">
          <div>
            <h2>Nearby Evacuation Resources</h2>
            <p>Find evacuation centers and shelters near your location.</p>
          </div>
          <button type="button" className="resourceLocationBtn" onClick={refreshLocation}>
            <MapPin size={15} strokeWidth={2.4} />
            Use My Location
          </button>
        </div>
        {resourceStatus ? <p className="resourceStatusText">{resourceStatus}</p> : null}
        {nearbyResources.length ? (
          <>
            <div className="nearbyResourceGrid">
              {visibleNearbyResources.map((resource) => (
                <article key={resource.id || resource.name} className="nearbyResourceCard">
                  <div className={`nearbyResourceVisual nearbyResourceVisual--${getResourceVisualTone(resource.type)}`}>
                    <span className="resourceTypeChip">
                      {titleCase(resource.type)}
                    </span>
                    <Building2 size={30} strokeWidth={1.8} />
                  </div>
                  <div className="nearbyResourceBody">
                    <h3 className="nearbyResourceName">{resource.name}</h3>
                    {formatResourceAddress(resource) ? (
                      <p className="nearbyResourceAddress">{formatResourceAddress(resource)}</p>
                    ) : null}
                    <div className="nearbyResourceMeta">
                      {typeof resource.distanceMiles === "number" ? (
                        <span>
                          <MapPin size={13} strokeWidth={2.2} />
                          {resource.distanceMiles.toFixed(1)} mi
                        </span>
                      ) : null}
                      {resource.capacity != null ? (
                        <span>
                          <Users size={13} strokeWidth={2.2} />
                          Capacity: {resource.capacity}
                        </span>
                      ) : null}
                      {typeof resource.openNow === "boolean" ? (
                        <span className="resourceStatusPill">
                          <i aria-hidden="true" />
                          {resource.openNow ? "Open" : "Check status"}
                        </span>
                      ) : null}
                    </div>
                    <div className="nearbyResourceActions">
                      {resource.phone ? (
                        <a className="nearbyResourcePhone" href={formatPhoneHref(resource.phone)}>
                          <PhoneCall size={15} strokeWidth={2.2} />
                          {resource.phone}
                        </a>
                      ) : null}
                      {resource.website ? (
                        <a
                          className="nearbyResourceWebsite"
                          href={resource.website}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Website
                          <ExternalLink size={14} strokeWidth={2.2} />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {hiddenResourceCount ? (
              <button
                type="button"
                className="nearbyResourcesToggle"
                onClick={() => setResourcesExpanded((expanded) => !expanded)}
              >
                {resourcesExpanded ? "Show fewer" : `View more (${hiddenResourceCount})`}
              </button>
            ) : null}
          </>
        ) : (
          <p className="resourcesEmpty">No nearby evacuation resources are available right now.</p>
        )}
      </section>

      <section className="resourcesLandingSection officialLinksSection">
        <div className="sectionHeadingRow">
          <div>
            <h2>Official Resources</h2>
          </div>
          <label className="resourceSearchLabel" htmlFor="resource-search">
            <span>Search</span>
            <input
              id="resource-search"
              className="resourceSearchInput"
              type="search"
              placeholder="Search links..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        <div className="resourceLinkGrid">
          {filteredLinks.map(({ href, title, displayUrl, Icon }) => (
            <a
              key={href}
              className="resourceLinkCard"
              href={href}
              target="_blank"
              rel="noreferrer"
            >
              <span className="resourceLinkIcon" aria-hidden="true">
                <Icon size={20} strokeWidth={2} />
              </span>
              <span className="resourceLinkText">
                <strong>{title}</strong>
                <small>{displayUrl}</small>
              </span>
              <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
            </a>
          ))}
        </div>
      </section>

      {activePanelCopy ? (
        <div
          className="resourceModalBackdrop"
          role="presentation"
          onClick={() => setActivePanel(null)}
        >
          <section
            className={`resourceModal resourceModal--${activePanel}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="resource-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="resourceModalHeader">
              <div>
                <h2 id="resource-modal-title">{activePanelCopy.title}</h2>
                {activePanelCopy.description ? <p>{activePanelCopy.description}</p> : null}
              </div>
              <button
                type="button"
                className="resourceModalClose"
                onClick={() => setActivePanel(null)}
                aria-label="Close resource details"
              >
                <X size={18} strokeWidth={2.4} />
              </button>
            </header>

            {activePanel === "checklist" ? (
              <ul className="checklistCompact">
                {checklist.map((item) => (
                  <li key={item.title}>
                    <span className="checklistRowIcon" aria-hidden="true">
                      <ShieldCheck size={15} strokeWidth={2.2} />
                    </span>
                    <span className="checklistRowText">
                      <strong>{item.title}</strong>
                      <small>{item.description}</small>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {activePanel === "contacts" ? (
              <div className="contactCompactGrid">
                {emergencyContacts.map((contact) => (
                  <a key={contact.value} className="contactCompactCard" href={contact.href}>
                    <span>
                      <strong>{contact.label}</strong>
                      <small>{contact.detail}</small>
                    </span>
                    <b>{contact.value}</b>
                  </a>
                ))}
              </div>
            ) : null}

            {activePanel === "videos" ? (
              <div className="modalVideoGrid">
                {wildfireVideos.map((video) => (
                  <article key={video.id} className="modalVideoCard">
                    <div className="modalVideoBadges">
                      <span className="modalVideoBadge modalVideoBadge--source">{video.source}</span>
                      <span className="modalVideoBadge modalVideoBadge--language">{video.language}</span>
                    </div>
                    <div className="modalVideoBody">
                      <h3>{video.title}</h3>
                      <p>{video.description}</p>
                      <a className="modalVideoCta" href={video.href} target="_blank" rel="noreferrer">
                        Watch Video
                        <ExternalLink size={13} strokeWidth={2.2} />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </main>
  );
}

import WildfireMap from "../components/WildfireMap.jsx";
import "./MapView.css";

export default function MapView() {
  return (
    <main className="mapViewPage">
      <header className="mapViewHeader">
        <div>
          <p className="pageEyebrow">Map-first incident view</p>
          <h1>Wildfire Map</h1>
        </div>
        <p>California only · last 7 days · external sources included</p>
      </header>
      <section className="mapViewPanel">
        <WildfireMap title="Nearby wildfires map" />
      </section>
    </main>
  );
}

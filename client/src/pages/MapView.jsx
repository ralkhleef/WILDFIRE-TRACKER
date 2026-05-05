import WildfireMap from "../components/WildfireMap.jsx";

export default function MapView() {
  return (
    <main style={{ flex: 1, padding: "1.5rem", boxSizing: "border-box" }}>
      <h1 style={{ marginTop: 0 }}>Wildfire Map</h1>
      <WildfireMap title="Nearby wildfires map" />
    </main>
  );
}

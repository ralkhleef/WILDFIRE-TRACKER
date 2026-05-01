import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import "./App.css";

function Navbar() {
  return (
    <nav style={{ display: "flex", gap: "20px", padding: "20px" }}>
      <Link to="/">Home</Link>
      <Link to="/map">Map</Link>
      <Link to="/alerts">Alerts</Link>
      <Link to="/about">About</Link>
    </nav>
  );
}

function Home() {
  return <h1>Home Page</h1>;
}

function Map() {
  return <h1>Map Page</h1>;
}

function Alerts() {
  return <h1>Alerts Page</h1>;
}

function About() {
  return <h1>About Page</h1>;
}

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<Map />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
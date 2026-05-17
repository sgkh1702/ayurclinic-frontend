import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/globals.css";
import PatientForm from "./pages/PatientForm";
import PatientList from "./pages/PatientList";
import VisitForm from "./pages/VisitForm";

console.log("VITE_API_URL at runtime:", import.meta.env.VITE_API_URL);

function Home({ onChoose }) {
  return (
    <div className="home-screen">
      <div className="home-card">
        <h1>
          चन्द्रप्रभा चिकित्सालय
          <br />
          आणि पंचकर्म केंद्र
        </h1>
        <p>रुग्ण शोधा किंवा नवीन रुग्ण नोंदणी करा</p>

        <div className="home-actions">
          <button type="button" onClick={() => onChoose("list")}>
            रुग्ण शोधा
          </button>
          <button type="button" onClick={() => onChoose("new")}>
            नवीन रुग्ण नोंदणी
          </button>
        </div>
      </div>
    </div>
  );
}

function AppContainer() {
  const [screen, setScreen] = useState("home");
  const [selectedPatient, setSelectedPatient] = useState(null);

  function goHome() {
    setSelectedPatient(null);
    setScreen("home");
  }

  function openNewPatient() {
    setSelectedPatient(null);
    setScreen("new");
  }

  function openExistingPatient(patient) {
    setSelectedPatient(patient);
    setScreen("visit");
  }

  return (
    <>
      {screen === "home" && <Home onChoose={setScreen} />}

      {screen === "list" && (
        <PatientList
          onBack={goHome}
          onCreateNew={openNewPatient}
          onSelectPatient={openExistingPatient}
        />
      )}

      {screen === "new" && (
        <PatientForm
          patient={null}
          onBack={() => setScreen("list")}
        />
      )}

      {screen === "visit" && selectedPatient && (
        <VisitForm
          patient={selectedPatient}
          onBack={() => setScreen("list")}
        />
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppContainer />
  </React.StrictMode>
);
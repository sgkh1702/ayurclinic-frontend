import React, { useEffect, useState } from "react";
import PatientRegistrationForm from "./PatientRegistrationForm";
import VisitForm from "./VisitForm";
import "./PatientsPage.css";

const API = "http://127.0.0.1:8000";

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [activeVisit, setActiveVisit] = useState(null);
  const [message, setMessage] = useState("");
  const [loadingVisits, setLoadingVisits] = useState(false);

  async function loadPatients() {
    const res = await fetch(`${API}/patients`);
    const data = await res.json();
    setPatients(data);
  }

  async function loadVisits(patientId) {
    setLoadingVisits(true);
    try {
      const res = await fetch(`${API}/patients/${patientId}/visits`);
      const data = await res.json();
      setVisits(Array.isArray(data) ? data : []);
    } finally {
      setLoadingVisits(false);
    }
  }

  useEffect(() => {
    loadPatients();
  }, []);

  async function handlePatientSaved(savedPatient) {
    setMessage("Patient saved successfully.");
    await loadPatients();
    setSelectedPatient(savedPatient);
    setActiveVisit(null);
    await loadVisits(savedPatient.id);
  }

  async function handleSelectPatient(patient) {
    setSelectedPatient(patient);
    setActiveVisit(null);
    await loadVisits(patient.id);
  }

  function handleNewVisit() {
    if (!selectedPatient) return;

    setActiveVisit({
      id: null,
      patient_id: selectedPatient.id,
      visit_date: new Date().toISOString().slice(0, 10),
      symptoms: "",
      previous_treatment: "",
      notes: ""
    });
  }

  async function handleVisitSaved() {
    setMessage("Visit saved successfully.");
    if (selectedPatient?.id) {
      await loadVisits(selectedPatient.id);
    }
    setActiveVisit(null);
  }

  function handleOpenHistoryVisit(visit) {
    setActiveVisit(visit);
  }

  return (
    <div className="patients-page">
      <div className="patients-page-inner">
        <div className="patients-layout">
          <aside className="patients-sidebar">
            <h2 className="panel-title">Patients</h2>

            <PatientRegistrationForm onSaved={handlePatientSaved} />

            <div className="patient-list">
              {patients.length === 0 ? (
                <div className="placeholder-card">No patients yet.</div>
              ) : (
                patients.map((p) => (
                  <button
                    key={p.id}
                    className={`patient-list-item ${
                      selectedPatient?.id === p.id ? "active" : ""
                    }`}
                    onClick={() => handleSelectPatient(p)}
                  >
                    <strong>{p.patient_name}</strong>
                    <span>{p.mobile || "No mobile"}</span>
                  </button>
                ))
              )}
            </div>
          </aside>

          <main className="patients-main">
            {message && <div className="page-message">{message}</div>}

            {!selectedPatient ? (
              <div className="placeholder-card">
                Select a patient to view details, history, and create a new casepaper.
              </div>
            ) : (
              <>
                <section className="patient-master-card">
                  <div className="patient-master-top">
                    <div>
                      <h2 className="patient-name">
                        {selectedPatient.patient_name}
                      </h2>
                      <div className="patient-meta-grid">
                        <div>
                          <strong>Mobile:</strong> {selectedPatient.mobile || "-"}
                        </div>
                        <div>
                          <strong>Birth Date:</strong>{" "}
                          {selectedPatient.birth_date || "-"}
                        </div>
                        <div>
                          <strong>Age:</strong> {selectedPatient.age || "-"}
                        </div>
                        <div>
                          <strong>Weight:</strong> {selectedPatient.weight || "-"}
                        </div>
                        <div>
                          <strong>Education:</strong>{" "}
                          {selectedPatient.education || "-"}
                        </div>
                        <div>
                          <strong>Occupation:</strong>{" "}
                          {selectedPatient.occupation || "-"}
                        </div>
                        <div>
                          <strong>Ref By:</strong> {selectedPatient.ref_by || "-"}
                        </div>
                      </div>
                      <div className="patient-address">
                        <strong>Address:</strong>{" "}
                        {selectedPatient.address || "-"}
                      </div>
                      <div className="patient-address">
                        <strong>Family History:</strong>{" "}
                        {selectedPatient.family_history || "-"}
                      </div>
                    </div>

                    <button className="new-visit-btn" onClick={handleNewVisit}>
                      + New Casepaper / Visit
                    </button>
                  </div>
                </section>

                {activeVisit && (
                  <VisitForm
                    key={activeVisit.id || `new-${selectedPatient.id}`}
                    patient={selectedPatient}
                    initialVisit={activeVisit}
                    onSaved={handleVisitSaved}
                    onCancel={() => setActiveVisit(null)}
                  />
                )}

                <section className="history-card">
                  <h3 className="panel-title">Visit History</h3>

                  {loadingVisits ? (
                    <div className="placeholder-card">Loading visits...</div>
                  ) : visits.length === 0 ? (
                    <div className="placeholder-card">No previous visits.</div>
                  ) : (
                    <div className="history-list">
                      {visits.map((visit) => (
                        <button
                          key={visit.id}
                          className="history-item"
                          onClick={() => handleOpenHistoryVisit(visit)}
                        >
                          <div className="history-left">
                            <strong>Visit #{visit.id}</strong>
                            <span>{visit.visit_date}</span>
                          </div>
                          <div className="history-preview">
                            {visit.symptoms?.slice(0, 120) ||
                              "No symptoms entered"}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
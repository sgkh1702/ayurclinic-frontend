import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";

export default function PatientList({ onBack, onCreateNew, onSelectPatient }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

useEffect(() => {
  api
    .get("/patients")
    .then((res) => {
      const data = res.data;
      setPatients(Array.isArray(data) ? data : []);
      setLoading(false);
    })
    .catch(() => setLoading(false));
}, []);

  const filteredPatients = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return patients;

    return patients.filter((p) => {
      const name = (p.patient_name || "").toLowerCase();
      const mobile = String(p.mobile || "").toLowerCase();
      const email = (p.email || "").toLowerCase();

      return (
        name.includes(q) ||
        mobile.includes(q) ||
        email.includes(q)
      );
    });
  }, [patients, query]);

  return (
    <div className="list-page">
      <div className="list-header">
        <button type="button" onClick={onBack}>← Back</button>
        <h1>रुग्ण शोध</h1>
        <button type="button" onClick={onCreateNew}>+ New Patient</button>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder="नाव / मोबाईल / ईमेल शोधा"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : filteredPatients.length === 0 ? (
        <p>No patients found.</p>
      ) : (
        <div className="patient-table-wrap">
          <table className="patient-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>रुग्णाचे नाव</th>
                <th>मोबाईल</th>
                <th>ईमेल</th>
                <th>वय</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => onSelectPatient(p)}
                  className="clickable-row"
                  title="Open patient"
                >
                  <td>{p.id}</td>
                  <td>{p.patient_name}</td>
                  <td>{p.mobile}</td>
                  <td>{p.email}</td>
                  <td>{p.age}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
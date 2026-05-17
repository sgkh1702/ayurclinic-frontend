import React, { useState } from "react";

const API = "http://127.0.0.1:8000";

const initialState = {
  patient_name: "",
  age: "",
  weight: "",
  birth_date: "",
  birth_time: "",
  education: "",
  occupation: "",
  mobile: "",
  address: "",
  family_history: "",
  ref_by: ""
};

export default function PatientRegistrationForm({ onSaved }) {
  const [form, setForm] = useState(initialState);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const res = await fetch(`${API}/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to save patient");
      }

      setMessage("Patient created.");
      setForm(initialState);
      onSaved(data);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="patient-form-card" onSubmit={handleSubmit}>
      <h3 className="card-title">New Patient</h3>

      <input
        name="patient_name"
        placeholder="Patient name"
        value={form.patient_name}
        onChange={handleChange}
        required
      />

      <div className="two-col-grid">
        <input
          name="mobile"
          placeholder="Mobile"
          value={form.mobile}
          onChange={handleChange}
        />
        <input
          type="date"
          name="birth_date"
          value={form.birth_date}
          onChange={handleChange}
        />
      </div>

      <div className="two-col-grid">
        <input
          name="age"
          placeholder="Age"
          value={form.age}
          onChange={handleChange}
        />
        <input
          name="weight"
          placeholder="Weight"
          value={form.weight}
          onChange={handleChange}
        />
      </div>

      <div className="two-col-grid">
        <input
          name="education"
          placeholder="Education"
          value={form.education}
          onChange={handleChange}
        />
        <input
          name="occupation"
          placeholder="Occupation"
          value={form.occupation}
          onChange={handleChange}
        />
      </div>

      <input
        name="ref_by"
        placeholder="Ref By"
        value={form.ref_by}
        onChange={handleChange}
      />

      <textarea
        name="address"
        placeholder="Address"
        value={form.address}
        onChange={handleChange}
        rows="2"
      />

      <textarea
        name="family_history"
        placeholder="Family history"
        value={form.family_history}
        onChange={handleChange}
        rows="2"
      />

      <button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save Patient"}
      </button>

      {message && <div className="inline-message">{message}</div>}
    </form>
  );
}
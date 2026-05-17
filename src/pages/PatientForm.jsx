import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import "./PatientForm.css";

const DEFAULT_DOCTOR_ID = 1;

const API_BASE = import.meta.env.VITE_API_URL;

const EDUCATION_OPTIONS = [
  "",
  "No Formal Education",
  "Primary",
  "Secondary",
  "Higher Secondary",
  "Diploma",
  "Graduate",
  "Post Graduate",
  "Professional",
  "Other",
];

const OCCUPATION_OPTIONS = [
  "",
  "Student",
  "Homemaker",
  "Service",
  "Business",
  "Professional",
  "Farmer",
  "Labor",
  "Retired",
  "Unemployed",
  "Other",
];

const GENDER_OPTIONS = [
  "",
  "Male",
  "Female",
  "Other",
];

const SYMPTOM_TEMPLATES = [
  "अंगदुखी आहे.",
  "भूक मंद आहे.",
  "पोटदुखी आहे.",
  "सांधेदुखी आहे.",
  "डोकेदुखी आहे.",
  "खोकला व ताप आहे.",
  "अशक्तपणा जाणवतो.",
];

const FAMILY_HISTORY_TEMPLATES = [
  "कुटुंबात विशेष आजाराचा इतिहास नाही.",
  "कुटुंबात मधुमेहाचा इतिहास आहे.",
  "कुटुंबात उच्च रक्तदाबाचा इतिहास आहे.",
  "कुटुंबात दमा / श्वासाचा त्रास आहे.",
];

const ROUTINE_TEMPLATES = [
  "झोप चांगली, भूक चांगली, शौच नियमित.",
  "झोप कमी, भूक मंद, शौच अनियमित.",
  "जेवण वेळेवर नाही.",
  "व्यायाम कमी आहे.",
  "बसून काम जास्त असते.",
];

function getTodayLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function formatCaseNo(id, visitDate) {
  if (!id) return "";
  const year = visitDate ? visitDate.slice(0, 4) : new Date().getFullYear();
  return `CP-${year}-${String(id).padStart(4, "0")}`;
}

function formatDateForInput(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }
  return value;
}

function formatDateForDisplay(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yyyy, mm, dd] = value.split("-");
    return `${dd}-${mm}-${yyyy}`;
  }
  return value;
}

function buildInitialForm(patient) {
  return {
    case_no: "",
    visit_id: "",
    patient_id: patient?.id || "",
    ref_by: patient?.ref_by || "",
    visit_date: getTodayLocal(),

    patient_name: patient?.patient_name || "",
    age: patient?.age || "",
    weight: patient?.weight || "",
    birth_date: formatDateForInput(patient?.birth_date || ""),
    birth_time: patient?.birth_time || "",
    education: patient?.education || "",
    occupation: patient?.occupation || "",
    mobile: patient?.mobile || "",
    email: patient?.email || "",
    address: patient?.address || "",
    gender: patient?.gender || "",
    family_history: patient?.family_history || "",
    patient_code: patient?.patient_code || "",
    baseline_notes: patient?.baseline_notes || "",

    symptoms: "",
    previous_treatment: "",
    notes: "",
    prescription: "",
    diagnosis: "",
    advice: "",
    followup_notes: "",
    next_followup_date: "",
  };
}

export default function PatientForm({ patient, onBack }) {
  const [form, setForm] = useState(buildInitialForm(patient));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [listeningField, setListeningField] = useState("");
  const [attachments, setAttachments] = useState([]);
  const recognitionRef = useRef(null);

  useEffect(() => {
    setForm(buildInitialForm(patient));
    setMessage("");
    setMessageType("info");
    setAttachments([]);
  }, [patient]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          //
        }
      }
    };
  }, []);

  const displayCaseNo = form.case_no || "Auto on save";

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function appendTemplate(fieldName, text) {
    setForm((prev) => ({
      ...prev,
      [fieldName]: prev[fieldName]
        ? `${prev[fieldName].trim()} ${text}`.trim()
        : text,
    }));
  }

  function isSpeechSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function startSpeechToText(fieldName) {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessage("Speech-to-text is not supported in this browser. Use Chrome or Edge.");
      setMessageType("error");
      return;
    }

    if (
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      setMessage("Speech requires HTTPS or localhost.");
      setMessageType("error");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        //
      }
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "mr-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      setListeningField(fieldName);
      setMessage("Listening... Speak now.");
      setMessageType("info");
    };

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setForm((prev) => ({
        ...prev,
        [fieldName]: prev[fieldName]
          ? `${prev[fieldName]} ${transcript}`.trim()
          : transcript.trim(),
      }));
      setMessage("Speech captured.");
      setMessageType("success");
    };

    recognition.onerror = (event) => {
      let msg = "Speech recognition failed.";
      if (event.error === "not-allowed") msg = "Microphone permission denied.";
      if (event.error === "no-speech") msg = "No speech detected.";
      if (event.error === "audio-capture") msg = "Microphone not available.";
      if (event.error === "service-not-allowed") msg = "Speech service not allowed in this browser.";
      setMessage(msg);
      setMessageType("error");
      setListeningField("");
    };

    recognition.onend = () => {
      setListeningField("");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopSpeechToText() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        //
      }
    }
    setListeningField("");
  }

  function handleAttachmentChange(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setAttachments((prev) => [...prev, ...files]);
    e.target.value = "";
  }

  function removeAttachment(index) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function isBlankCasePaper() {
    return (
      !form.patient_name.trim() &&
      !form.mobile.trim() &&
      !form.email.trim() &&
      !form.ref_by.trim() &&
      !form.age.trim() &&
      !form.weight.trim() &&
      !form.birth_date.trim() &&
      !form.birth_time.trim() &&
      !form.address.trim() &&
      !form.education.trim() &&
      !form.occupation.trim() &&
      !form.gender.trim() &&
      !form.family_history.trim() &&
      !form.baseline_notes.trim() &&
      !form.symptoms.trim() &&
      !form.previous_treatment.trim() &&
      !form.notes.trim() &&
      !form.prescription.trim() &&
      !form.diagnosis.trim() &&
      !form.advice.trim() &&
      !form.followup_notes.trim()
    );
  }

  function hasMinimumRequiredData() {
    return (
      !!form.patient_name.trim() &&
      (
        !!form.symptoms.trim() ||
        !!form.previous_treatment.trim() ||
        !!form.notes.trim() ||
        !!form.prescription.trim() ||
        !!form.diagnosis.trim() ||
        !!form.advice.trim() ||
        !!form.followup_notes.trim()
      )
    );
  }

  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return {};
    }
  }

  async function fetchWithTimeout(url, options = {}, timeout = 30000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return res;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Request timed out. Check backend server.");
      }
      if (error instanceof TypeError) {
        throw new Error("Cannot connect to backend server.");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function savePatient() {
    if (patient?.id) {
      return patient;
    }

    const patientPayload = {
      patient_name: form.patient_name,
      mobile: form.mobile,
      email: form.email,
      address: form.address,
      birth_date: form.birth_date,
      birth_time: form.birth_time,
      age: form.age,
      weight: form.weight,
      education: form.education,
      occupation: form.occupation,
      gender: form.gender,
      family_history: form.family_history,
      ref_by: form.ref_by,
      doctor_id: DEFAULT_DOCTOR_ID,
      baseline_notes: form.baseline_notes,
    };

    const res = await api.post("/patients", patientPayload);
    return res.data;
  }

  async function saveVisit(savedPatient) {
    const visitPayload = {
      patient_id: savedPatient.id,
      case_no: form.case_no || formatCaseNo(savedPatient.id, form.visit_date),
      visit_date: form.visit_date,
      ref_by: form.ref_by,
      symptoms: form.symptoms,
      previous_treatment: form.previous_treatment,
      notes: form.notes,
      prescription: form.prescription,
      doctor_id: DEFAULT_DOCTOR_ID,
      diagnosis: form.diagnosis,
      advice: form.advice,
      followup_notes: form.followup_notes,
      next_followup_date: form.next_followup_date,
    };

    const res = await api.post("/visits", visitPayload);
    return res.data;
  }

  async function uploadAttachments(savedPatient, savedVisit) {
    for (const file of attachments) {
      const fd = new FormData();
      fd.append("patient_id", String(savedPatient.id));
      fd.append("remarks", file.name);
      fd.append("doctor_id", String(DEFAULT_DOCTOR_ID));
      fd.append("file", file);

      const res = await fetchWithTimeout(
        `${API_BASE}/visits/${savedVisit.id}/attachments`,
        {
          method: "POST",
          body: fd,
        }
      );

      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(data.detail || `Failed to upload attachment: ${file.name}`);
      }
    }
  }

  async function saveForm() {
    const savedPatient = await savePatient();
    const savedVisit = await saveVisit(savedPatient);

    if (attachments.length) {
      await uploadAttachments(savedPatient, savedVisit);
    }

    setForm((prev) => ({
      ...prev,
      patient_id: savedPatient.id,
      visit_id: savedVisit.id,
      case_no: savedVisit.case_no || formatCaseNo(savedVisit.id, prev.visit_date),
      family_history: savedPatient.family_history || prev.family_history,
      patient_code: savedPatient.patient_code || prev.patient_code,
      baseline_notes: savedPatient.baseline_notes || prev.baseline_notes,
    }));

    return { patient: savedPatient, visit: savedVisit };
  }

  async function handleSubmit(e) {
    if (e?.preventDefault) e.preventDefault();

    if (isBlankCasePaper()) {
      setMessage("Blank case paper cannot be saved.");
      setMessageType("error");
      return;
    }

    if (!hasMinimumRequiredData()) {
      setMessage("Enter patient name and at least one visit/case field.");
      setMessageType("error");
      return;
    }

    setSaving(true);
    setMessage("Saving patient, visit and attachments...");
    setMessageType("info");

    try {
      await saveForm();
      setMessage("New case paper saved successfully.");
      setMessageType("success");
    } catch (error) {
      setMessage("Save failed: " + error.message);
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAndPrint() {
    if (isBlankCasePaper()) {
      setMessage("Blank case paper cannot be saved.");
      setMessageType("error");
      return;
    }

    if (!hasMinimumRequiredData()) {
      setMessage("Enter patient name and at least one visit/case field.");
      setMessageType("error");
      return;
    }

    setSaving(true);
    setMessage("Saving patient, visit and attachments...");
    setMessageType("info");

    try {
      await saveForm();
      setMessage("New case paper saved successfully.");
      setMessageType("success");
      setTimeout(() => {
        window.print();
      }, 300);
    } catch (error) {
      setMessage("Save failed: " + error.message);
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  function SpeechTextarea({ label, name, rows = 4, templates = [] }) {
    const active = listeningField === name;

    return (
      <div className="stacked-case-box">
        <div className="box-title-row">
          <label htmlFor={name}>{label}</label>
          {isSpeechSupported() && (
            <button
              type="button"
              className={`speech-btn ${active ? "speech-btn-active" : ""}`}
              onClick={() => (active ? stopSpeechToText() : startSpeechToText(name))}
              title={active ? "Stop microphone" : "Start microphone"}
            >
              🎤
            </button>
          )}
        </div>

        {templates.length > 0 && (
          <div className="template-chip-row">
            {templates.map((item) => (
              <button
                key={item}
                type="button"
                className="template-chip"
                onClick={() => appendTemplate(name, item)}
              >
                {item}
              </button>
            ))}
          </div>
        )}

        <textarea
          id={name}
          name={name}
          rows={rows}
          value={form[name]}
          onChange={handleChange}
        />
      </div>
    );
  }

  return (
    <div className="casepaper-page">
      <div className="top-toolbar no-print">
        <div className="toolbar-left">
          <button type="button" className="btn btn-back" onClick={onBack}>
            मागे
          </button>
          <button
            type="button"
            className="btn btn-save"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "सेव्ह होत आहे..." : "सेव्ह"}
          </button>
          <button
            type="button"
            className="btn btn-print"
            onClick={handleSaveAndPrint}
            disabled={saving}
          >
            सेव्ह + प्रिंट
          </button>
        </div>

        <div className="toolbar-right">
  <div className="toolbar-meta-box">
    <label>दिनांक</label>
    <input
      name="visit_date"
      type="text"
      placeholder="dd-mm-yyyy"
      value={formatDateForDisplay(form.visit_date)}
      onChange={(e) =>
        setForm((prev) => ({
          ...prev,
          visit_date: formatDateForInput(e.target.value),
        }))
      }
    />
  </div>
</div>
      </div>

      {message ? (
        <div className={`message message-${messageType} no-print`}>{message}</div>
      ) : null}

      <form className="screen-sheet no-print" onSubmit={handleSubmit}>
        <div style={{ width: "100%", maxWidth: "1100px", margin: "0 auto" }}>
          <div className="clinic-title-block">
            <h1>चन्द्रप्रभा चिकित्सालय आणि पंचकर्म केंद्र</h1>
          </div>

          <div className="patient-details-block">
            <div className="compact-line row-1">
              <div className="field-inline">
                <label htmlFor="patient_name">रुग्णाचे नाव</label>
                <input
                  id="patient_name"
                  name="patient_name"
                  value={form.patient_name}
                  onChange={handleChange}
                />
              </div>

              <div className="field-inline">
                <label htmlFor="mobile">मोबाईल</label>
                <input
                  id="mobile"
                  name="mobile"
                  value={form.mobile}
                  onChange={handleChange}
                />
              </div>

              <div className="field-inline">
                <label htmlFor="email">ईमेल</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>

              <div className="field-inline">
                <label htmlFor="ref_by">Ref. By</label>
                <input
                  id="ref_by"
                  name="ref_by"
                  value={form.ref_by}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="compact-line row-2">
              <div className="field-inline">
                <label htmlFor="age">वय</label>
                <input
                  id="age"
                  name="age"
                  value={form.age}
                  onChange={handleChange}
                />
              </div>

              <div className="field-inline">
                <label htmlFor="gender">लिंग</label>
                <select
                  id="gender"
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                >
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option || "Select Gender"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-inline">
                <label htmlFor="weight">वजन</label>
                <input
                  id="weight"
                  name="weight"
                  value={form.weight}
                  onChange={handleChange}
                />
              </div>

              <div className="field-inline">
                <label htmlFor="birth_date">जन्मदिनांक</label>
                <input
                  id="birth_date"
                  name="birth_date"
                  type="text"
                  placeholder="dd-mm-yyyy"
                  value={formatDateForDisplay(form.birth_date)}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      birth_date: formatDateForInput(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="field-inline">
                <label htmlFor="birth_time">वेळ</label>
                <input
                  id="birth_time"
                  name="birth_time"
                  type="time"
                  value={form.birth_time}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="compact-line row-3">
              <div className="field-inline address-box-row">
                <label htmlFor="address">पत्ता</label>
                <textarea
                  id="address"
                  name="address"
                  rows={2}
                  value={form.address}
                  onChange={handleChange}
                />
              </div>

              <div className="field-inline">
                <label htmlFor="education">शिक्षण</label>
                <select
                  id="education"
                  name="education"
                  value={form.education}
                  onChange={handleChange}
                >
                  {EDUCATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option || "Select Education"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-inline">
                <label htmlFor="occupation">व्यवसाय</label>
                <select
                  id="occupation"
                  name="occupation"
                  value={form.occupation}
                  onChange={handleChange}
                >
                  {OCCUPATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option || "Select Profession"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="section-title">केस हिस्ट्री</div>

          <div className="stacked-boxes">
            <SpeechTextarea
              label="तक्रारी / Symptoms"
              name="symptoms"
              rows={5}
              templates={SYMPTOM_TEMPLATES}
            />
            <SpeechTextarea
              label="पूर्वीचे उपचार / Previous Treatment"
              name="previous_treatment"
              rows={5}
            />
            <SpeechTextarea
              label="कौटुंबिक इतिहास / Family History"
              name="family_history"
              rows={5}
              templates={FAMILY_HISTORY_TEMPLATES}
            />
            <SpeechTextarea
              label="दिनचर्या / Routine"
              name="baseline_notes"
              rows={5}
              templates={ROUTINE_TEMPLATES}
            />
          </div>

          <div className="section-title">Clinical Notes</div>

          <div className="stacked-boxes">
            <SpeechTextarea label="नोंदी / Notes" name="notes" rows={4} />
            <SpeechTextarea label="निदान / Diagnosis" name="diagnosis" rows={4} />
            <SpeechTextarea label="सल्ला / Advice" name="advice" rows={4} />
            <SpeechTextarea label="औषधे / Prescription" name="prescription" rows={4} />
            <SpeechTextarea label="फॉलोअप नोंदी / Follow-up Notes" name="followup_notes" rows={4} />
          </div>

          <div className="patient-details-block" style={{ marginTop: "12px" }}>
  <div className="compact-line followup-row">
    <div className="field-inline followup-field">
      <label htmlFor="next_followup_date">Next Follow-up Date</label>
      <input
        id="next_followup_date"
        name="next_followup_date"
        type="date"
        value={form.next_followup_date}
        onChange={handleChange}
      />
    </div>
  </div>
</div>

          <div className="section-title">Attachments</div>
          <div className="attachments-box">
            <div className="attachments-top-row">
              <input
                type="file"
                multiple
                onChange={handleAttachmentChange}
                accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
              />
            </div>

            {attachments.length === 0 ? (
              <div className="attachment-empty">No attachments selected.</div>
            ) : (
              <div className="attachment-list">
                {attachments.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="attachment-item">
                    <div className="attachment-name">
                      {file.name} ({Math.round(file.size / 1024)} KB)
                    </div>
                    <button
                      type="button"
                      className="attachment-remove"
                      onClick={() => removeAttachment(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="attachment-note">
              Selected files will be uploaded after patient and visit are saved.
            </div>
          </div>
        </div>
      </form>

      <div className="print-only print-root">
        <table className="print-table">
          <thead className="print-header-group">
            <tr>
              <th>
                <div className="print-header-content">
                  <div className="print-header-row">
                    <div className="header-box">
                      <label className="label">केस नं.</label>
                      <div className="print-line-value">{displayCaseNo}</div>
                    </div>

                    <div className="header-center-mark">॥ श्री ॥</div>

                    <div className="header-box">
                      <label className="label">दिनांक</label>
                      <div className="print-line-value">
                        {formatDateForDisplay(form.visit_date)}
                      </div>
                    </div>
                  </div>

                  <div className="clinic-title-block">
                    <h1>चन्द्रमां चिकित्सालय आणि पंचकर्म केंद्र</h1>
                  </div>

                  <div className="patient-details-block">
                    <div className="compact-line row-1">
                      <div className="field-inline">
                        <label>रुग्णाचे नाव</label>
                        <div className="print-value-box print-name-value">
                          {form.patient_name}
                        </div>
                      </div>

                      <div className="field-inline">
                        <label>मोबाईल</label>
                        <div className="print-value-box">{form.mobile}</div>
                      </div>

                      <div className="field-inline">
                        <label>ईमेल</label>
                        <div className="print-value-box">{form.email}</div>
                      </div>

                      <div className="field-inline">
                        <label>Ref. By</label>
                        <div className="print-value-box">{form.ref_by}</div>
                      </div>
                    </div>

                    <div className="compact-line row-2">
                      <div className="field-inline">
                        <label>वय</label>
                        <div className="print-value-box">{form.age}</div>
                      </div>

                      <div className="field-inline">
                        <label>लिंग</label>
                        <div className="print-value-box">{form.gender}</div>
                      </div>

                      <div className="field-inline">
                        <label>वजन</label>
                        <div className="print-value-box">{form.weight}</div>
                      </div>

                      <div className="field-inline">
                        <label>जन्मदिनांक</label>
                        <div className="print-value-box">
                          {formatDateForDisplay(form.birth_date)}
                        </div>
                      </div>

                      <div className="field-inline">
                        <label>वेळ</label>
                        <div className="print-value-box">{form.birth_time}</div>
                      </div>
                    </div>

                    <div className="compact-line row-3">
                      <div className="field-inline address-box-row">
                        <label>पत्ता</label>
                        <div className="print-value-box print-multiline print-address-value">
                          {form.address}
                        </div>
                      </div>

                      <div className="field-inline">
                        <label>शिक्षण</label>
                        <div className="print-value-box">{form.education}</div>
                      </div>

                      <div className="field-inline">
                        <label>व्यवसाय</label>
                        <div className="print-value-box">{form.occupation}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="print-body-group">
            <tr>
              <td>
                <div className="print-section-title">केस हिस्ट्री</div>
                <div className="print-boxes-stack">
                  <div className="print-case-box">
                    <div className="print-box-title">तक्रारी / Symptoms</div>
                    <div className="print-box-text">{form.symptoms}</div>
                  </div>

                  <div className="print-case-box">
                    <div className="print-box-title">पूर्वीचे उपचार / Previous Treatment</div>
                    <div className="print-box-text">{form.previous_treatment}</div>
                  </div>

                  <div className="print-case-box">
                    <div className="print-box-title">कौटुंबिक इतिहास / Family History</div>
                    <div className="print-box-text">{form.family_history}</div>
                  </div>

                  <div className="print-case-box">
                    <div className="print-box-title">दिनचर्या / Routine</div>
                    <div className="print-box-text">{form.baseline_notes}</div>
                  </div>

                  <div className="print-case-box">
                    <div className="print-box-title">नोंदी / Notes</div>
                    <div className="print-box-text">{form.notes}</div>
                  </div>

                  <div className="print-case-box">
                    <div className="print-box-title">निदान / Diagnosis</div>
                    <div className="print-box-text">{form.diagnosis}</div>
                  </div>

                  <div className="print-case-box">
                    <div className="print-box-title">सल्ला / Advice</div>
                    <div className="print-box-text">{form.advice}</div>
                  </div>

                  <div className="print-case-box">
                    <div className="print-box-title">औषधे / Prescription</div>
                    <div className="print-box-text">{form.prescription}</div>
                  </div>

                  <div className="print-case-box">
                    <div className="print-box-title">फॉलोअप नोंदी / Follow-up Notes</div>
                    <div className="print-box-text">{form.followup_notes}</div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>

          <tfoot className="print-footer-group">
            <tr>
              <td>
                <div className="print-footer-content">
                  <div className="doctor-footer-line"></div>
                  <div className="footer-three-cols">
                    <div className="doctor-block">
                      <strong>वैद्य १</strong>
                      BAMS
                    </div>
                    <div className="doctor-block">
                      <strong>वैद्य २</strong>
                      BAMS
                    </div>
                    <div className="doctor-block">
                      <strong>वैद्य ३</strong>
                      BAMS
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
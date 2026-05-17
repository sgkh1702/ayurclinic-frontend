import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import "./PatientForm.css";

const DEFAULT_DOCTOR_ID = 1;
const API_BASE = import.meta.env.VITE_API_URL;

const SYMPTOM_TEMPLATES = [
  "अंगदुखी आहे.",
  "भूक मंद आहे.",
  "पोटदुखी आहे.",
  "सांधेदुखी आहे.",
  "डोकेदुखी आहे.",
  "खोकला व ताप आहे.",
  "अशक्तपणा जाणवतो.",
];

const FOLLOWUP_TEMPLATES = [
  "पूर्वीपेक्षा आराम आहे.",
  "तक्रारी कमी झाल्या आहेत.",
  "औषधे चालू ठेवावीत.",
  "पथ्य सुरू ठेवावे.",
];

const ADVICE_TEMPLATES = [
  "पथ्य पाळावे.",
  "गरम पाणी घ्यावे.",
  "विश्रांती घ्यावी.",
  "वेळेवर औषधे घ्यावीत.",
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

function formatDateForDisplay(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yyyy, mm, dd] = value.split("-");
    return `${dd}-${mm}-${yyyy}`;
  }
  return value;
}

function buildInitialVisit(patient) {
  return {
    patient_id: patient?.id || "",
    case_no: "",
    visit_date: getTodayLocal(),
    ref_by: patient?.ref_by || "",
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

function hasMeaningfulVisitData(visit) {
  if (!visit) return false;

  return [
    visit.ref_by,
    visit.symptoms,
    visit.previous_treatment,
    visit.notes,
    visit.prescription,
    visit.diagnosis,
    visit.advice,
    visit.followup_notes,
    visit.next_followup_date,
  ].some((v) => (v || "").trim());
}

function sortVisitsDesc(list) {
  return [...list].sort((a, b) => {
    const aTime = new Date(a.visit_date || 0).getTime();
    const bTime = new Date(b.visit_date || 0).getTime();
    return bTime - aTime;
  });
}

function getVisitPdfUrl(visit) {
  return (
    visit?.casepaper_pdf_url ||
    visit?.pdf_url ||
    visit?.case_paper_url ||
    ""
  );
}

export default function VisitForm({ patient, onBack }) {
  const [form, setForm] = useState(buildInitialVisit(patient));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [visits, setVisits] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const [listeningField, setListeningField] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    setForm(buildInitialVisit(patient));
    setAttachments([]);
    setMessage("");
    setMessageType("info");
  }, [patient]);

  useEffect(() => {
    if (!patient?.id) return;
    console.log("useEffect patient.id", patient?.id);
    reloadHistory();
  }, [patient?.id]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

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
      setMessage("Speech-to-text is not supported in this browser.");
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
      } catch {}
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "mr-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      setListeningField(fieldName);
      setMessage("Listening...");
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
      if (event.error === "service-not-allowed") msg = "Speech service not allowed.";
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
      } catch {}
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

  function isBlankVisit() {
    return ![
      form.ref_by,
      form.symptoms,
      form.previous_treatment,
      form.notes,
      form.prescription,
      form.diagnosis,
      form.advice,
      form.followup_notes,
      form.next_followup_date,
    ].some((v) => (v || "").trim());
  }

  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return {};
    }
  }

  async function saveVisit() {
    const payload = {
      patient_id: patient.id,
      case_no: form.case_no || formatCaseNo(patient.id, form.visit_date),
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

    const res = await api.post("/visits", payload);
    return res.data;
  }

  async function uploadAttachments(savedVisit) {
    for (const file of attachments) {
      const fd = new FormData();
      fd.append("patient_id", String(patient.id));
      fd.append("remarks", file.name);
      fd.append("doctor_id", String(DEFAULT_DOCTOR_ID));
      fd.append("file", file);

      const res = await fetch(`${API_BASE}/visits/${savedVisit.id}/attachments`, {
        method: "POST",
        body: fd,
      });

      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(data.detail || `Failed to upload attachment: ${file.name}`);
      }
    }
  }

  async function reloadHistory() {
    if (!patient?.id) return;
    console.log("reloadHistory called for patient", patient?.id);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/patients/${patient.id}/visits`);
      const data = res.data;
      setVisits(Array.isArray(data) ? data : []);
    } catch {
      setVisits([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleSubmit(e) {
    if (e?.preventDefault) e.preventDefault();

    if (isBlankVisit()) {
      setMessage("Blank visit cannot be saved.");
      setMessageType("error");
      return;
    }

    setSaving(true);
    setMessage("Saving new case paper...");
    setMessageType("info");

    try {
      const savedVisit = await saveVisit();

      if (attachments.length) {
        await uploadAttachments(savedVisit);
      }

      await reloadHistory();

      setMessage("New case paper saved successfully.");
      setMessageType("success");

      setForm(buildInitialVisit(patient));
      setAttachments([]);
    } catch (error) {
      setMessage("Save failed: " + error.message);
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  const draftVisit = useMemo(() => {
    if (!hasMeaningfulVisitData(form)) return null;

    return {
      id: "draft",
      case_no: form.case_no || "Draft",
      visit_date: form.visit_date,
      ref_by: form.ref_by,
      symptoms: form.symptoms,
      previous_treatment: form.previous_treatment,
      notes: form.notes,
      prescription: form.prescription,
      diagnosis: form.diagnosis,
      advice: form.advice,
      followup_notes: form.followup_notes,
      next_followup_date: form.next_followup_date,
      isDraft: true,
    };
  }, [form]);

  const previewVisits = useMemo(() => {
    const savedVisits = Array.isArray(visits) ? visits : [];
    const merged = draftVisit ? [draftVisit, ...savedVisits] : savedVisits;
    return sortVisitsDesc(merged).filter(hasMeaningfulVisitData);
  }, [draftVisit, visits]);

  const consolidatedPdfUrl =
    patient?.consolidated_pdf_url ||
    patient?.casepapers_pdf_url ||
    (patient?.id ? `${API_BASE}/patients/${patient.id}/casepapers/pdf` : "");

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
        </div>
      </div>

      {message ? (
        <div className={`message message-${messageType} no-print`}>
          {message}
        </div>
      ) : null}

      <div className="screen-sheet no-print">
        <div className="clinic-title-block">
          <h1>चन्द्रप्रभा चिकित्सालय आणि पंचकर्म केंद्र</h1>
        </div>

        <div className="visit-layout">
          <div className="patient-master-panel">
            <div className="section-title patient-master-title" style={{ marginTop: 0 }}>
              Patient Master
            </div>

            <div className="patient-master-row patient-master-row-single">
              <div className="patient-master-item">
                <strong>नाव:</strong>
                <span>{patient?.patient_name || "-"}</span>
              </div>
            </div>

            <div className="patient-master-row patient-master-row-double">
              <div className="patient-master-item">
                <strong>मोबाईल:</strong>
                <span>{patient?.mobile || "-"}</span>
              </div>
              <div className="patient-master-item">
                <strong>ईमेल:</strong>
                <span>{patient?.email || "-"}</span>
              </div>
            </div>

            <div className="patient-master-row patient-master-row-triple">
              <div className="patient-master-item">
                <strong>वय:</strong>
                <span>{patient?.age || "-"}</span>
              </div>
              <div className="patient-master-item">
                <strong>वजन:</strong>
                <span>{patient?.weight || "-"}</span>
              </div>
              <div className="patient-master-item">
                <strong>लिंग:</strong>
                <span>{patient?.gender || "-"}</span>
              </div>
            </div>

            <div className="patient-master-row patient-master-row-double">
              <div className="patient-master-item">
                <strong>जन्मदिनांक:</strong>
                <span>{formatDateForDisplay(patient?.birth_date) || "-"}</span>
              </div>
              <div className="patient-master-item">
                <strong>वेळ:</strong>
                <span>{patient?.birth_time || "-"}</span>
              </div>
            </div>

            <div className="patient-master-row patient-master-row-double">
              <div className="patient-master-item">
                <strong>शिक्षण:</strong>
                <span>{patient?.education || "-"}</span>
              </div>
              <div className="patient-master-item">
                <strong>व्यवसाय:</strong>
                <span>{patient?.occupation || "-"}</span>
              </div>
            </div>

            {(patient?.family_history || "").trim() && (
              <div className="patient-master-box">
                <label>कौटुंबिक इतिहास / Family History</label>
                <div className="print-value-box print-multiline">
                  {patient.family_history}
                </div>
              </div>
            )}

            {(patient?.baseline_notes || "").trim() && (
              <div className="patient-master-box">
                <label>दिनचर्या / Routine</label>
                <div className="print-value-box print-multiline">
                  {patient.baseline_notes}
                </div>
              </div>
            )}

            <div className="patient-master-box visit-history-inside-panel">
              <label>जुने केस पेपर / Visit History</label>

              {consolidatedPdfUrl ? (
                <div className="history-consolidated-link-row">
                  <a
                    href={consolidatedPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="visit-paper-link visit-paper-link-main"
                  >
                    Open Consolidated Case Papers PDF
                  </a>
                </div>
              ) : null}

              {loadingHistory && !draftVisit ? (
                <p className="history-loading-text">Loading history...</p>
              ) : previewVisits.length === 0 ? (
                <p className="history-loading-text">No previous visits found.</p>
              ) : (
                <div className="visit-history-cards">
                  {previewVisits.map((visit, index) => {
                    const pdfUrl = getVisitPdfUrl(visit);

                    return (
                      <div
                        key={visit.isDraft ? "draft-visit" : visit.id || index}
                        className={`history-visit-card ${visit.isDraft ? "history-visit-draft" : ""}`}
                      >
                        <div className="history-visit-card-header">
                          <div className="history-visit-card-title">
                            {visit.isDraft ? "Current Unsaved Visit" : `Visit #${visit.id || "-"}`}
                          </div>
                          <div className="history-visit-card-date">
                            {formatDateForDisplay(visit.visit_date)}
                          </div>
                        </div>

                        {pdfUrl ? (
                          <div className="history-link-row">
                            <a
                              href={pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="visit-paper-link"
                            >
                              View Case Paper PDF
                            </a>
                          </div>
                        ) : null}

                        {visit.ref_by?.trim() && (
                          <div className="history-mini-line">
                            <strong>Ref. By:</strong> <span>{visit.ref_by}</span>
                          </div>
                        )}

                        {visit.next_followup_date?.trim() && (
                          <div className="history-mini-line">
                            <strong>Next Follow-up:</strong>{" "}
                            <span>{formatDateForDisplay(visit.next_followup_date)}</span>
                          </div>
                        )}

                        <div className="history-visit-boxes">
                          {visit.symptoms?.trim() && (
                            <div className="history-visit-box">
                              <div className="history-visit-box-title">तक्रारी / Symptoms</div>
                              <div className="history-visit-box-text">{visit.symptoms}</div>
                            </div>
                          )}

                          {visit.previous_treatment?.trim() && (
                            <div className="history-visit-box">
                              <div className="history-visit-box-title">
                                पूर्वीचे उपचार / Previous Treatment
                              </div>
                              <div className="history-visit-box-text">
                                {visit.previous_treatment}
                              </div>
                            </div>
                          )}

                          {visit.notes?.trim() && (
                            <div className="history-visit-box">
                              <div className="history-visit-box-title">नोंदी / Notes</div>
                              <div className="history-visit-box-text">{visit.notes}</div>
                            </div>
                          )}

                          {visit.diagnosis?.trim() && (
                            <div className="history-visit-box">
                              <div className="history-visit-box-title">निदान / Diagnosis</div>
                              <div className="history-visit-box-text">{visit.diagnosis}</div>
                            </div>
                          )}

                          {visit.advice?.trim() && (
                            <div className="history-visit-box">
                              <div className="history-visit-box-title">सल्ला / Advice</div>
                              <div className="history-visit-box-text">{visit.advice}</div>
                            </div>
                          )}

                          {visit.prescription?.trim() && (
                            <div className="history-visit-box">
                              <div className="history-visit-box-title">औषधे / Prescription</div>
                              <div className="history-visit-box-text">{visit.prescription}</div>
                            </div>
                          )}

                          {visit.followup_notes?.trim() && (
                            <div className="history-visit-box">
                              <div className="history-visit-box-title">
                                फॉलोअप नोंदी / Follow-up Notes
                              </div>
                              <div className="history-visit-box-text">{visit.followup_notes}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="visit-form-panel">
            <div className="patient-details-block">
              <div className="compact-line top-visit-row">
                <div className="field-inline">
                  <label htmlFor="visit_date">दिनांक</label>
                  <input
                    id="visit_date"
                    name="visit_date"
                    type="date"
                    value={form.visit_date}
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

                <div className="field-inline followup-field">
                  <label htmlFor="next_followup_date">Next Follow-up</label>
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

            <div className="section-title">नवीन केस पेपर</div>

            <div className="stacked-boxes">
              <SpeechTextarea
                label="तक्रारी / Symptoms"
                name="symptoms"
                rows={4}
                templates={SYMPTOM_TEMPLATES}
              />
              <SpeechTextarea
                label="पूर्वीचे उपचार / Previous Treatment"
                name="previous_treatment"
                rows={4}
              />
              <SpeechTextarea label="नोंदी / Notes" name="notes" rows={4} />
              <SpeechTextarea label="निदान / Diagnosis" name="diagnosis" rows={4} />
              <SpeechTextarea
                label="सल्ला / Advice"
                name="advice"
                rows={4}
                templates={ADVICE_TEMPLATES}
              />
              <SpeechTextarea
                label="औषधे / Prescription"
                name="prescription"
                rows={4}
              />
              <SpeechTextarea
                label="फॉलोअप नोंदी / Follow-up Notes"
                name="followup_notes"
                rows={4}
                templates={FOLLOWUP_TEMPLATES}
              />
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
                Selected files will be uploaded after visit is saved.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
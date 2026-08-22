import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  FileCheck2,
  FileText,
  History,
  Landmark,
  LoaderCircle,
  LogOut,
  Paperclip,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const CASE_ID = "ECI-2026-000125";
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "cached";
const DEMO_REPORT = "คำขอเคลมกรณี ECI-2026-000125 มีเอกสารครบ 8 จาก 10 รายการ ยอดตามใบแจ้งหนี้คือ USD 225,000.00 และผู้ซื้อระบุว่าการชำระเงินล่าช้าเพราะการขนส่งล่าช้า โดยไม่มีข้อพิพาทอย่างเป็นทางการ\n\nวันที่จัดส่งที่อ่านจาก 03_bill_of_lading.pdf คือ 2026-02-12 แต่ค่าความเชื่อมั่นต่ำกว่าเกณฑ์ 0.60 ดังนั้นกำหนดยื่นภายใน 180 วันตาม Policy ECI-2026-000125, Clause 7.3, page 2 ยังไม่ได้รับการยืนยันและไม่มีการคำนวณวันครบกำหนด\n\nผลคัดกรองแบบกำหนดตายตัวพบรายการที่ตรงกับ Zantara Meridian Trading Co. ในบัญชีตัวอย่าง และคะแนนเคสคือ 42 จาก 100 ข้อมูลทั้งหมดเป็นข้อมูลสังเคราะห์สำหรับการสาธิต";

const wizardSteps = [
  "เอกสาร",
  "ตรวจคู่ค้า",
  "AI ตรวจเคส",
  "คำแนะนำ",
  "ตัดสินใจ"
] as const;

const panelDefaults: AnalysisPanel[] = [
  {
    type: "VISION",
    service: "Azure AI Vision",
    titleTh: "ตรวจสอบคุณภาพและประเภทเอกสาร",
    titleEn: "Document quality & classification",
    detailTh: "พบเอกสาร 8 จาก 10 รายการ โดยขาดหนังสือมอบอำนาจและหลักฐานการส่งมอบ",
    detailEn: "Eight of ten required documents are present. Power of Attorney and Proof of Delivery are missing.",
    whyTh: "ช่วยให้เจ้าหน้าที่เห็นทันทีว่าเอกสารใดขาด ก่อนเริ่มพิจารณา",
    confidence: 0.91
  },
  {
    type: "OCR",
    service: "Azure AI Document Intelligence",
    titleTh: "สกัดข้อมูลจากเอกสาร",
    titleEn: "Document data extraction",
    detailTh: "วันที่ส่งสินค้า 2026-02-12 จาก 03_bill_of_lading.pdf มีความเชื่อมั่นเพียง 54% และต้องตรวจสอบใหม่",
    detailEn: "Shipment date 2026-02-12 from 03_bill_of_lading.pdf is only 54% confident and must be rechecked.",
    whyTh: "ระบบอ่านเอกสารสแกนพร้อมบอกความมั่นใจ จึงไม่ส่งวันที่ที่ไม่น่าเชื่อถือไปคำนวณต่อ",
    confidence: 0.54
  },
  {
    type: "NLP",
    service: "Azure AI Language",
    titleTh: "ทำความเข้าใจเหตุการณ์เรียกร้อง",
    titleEn: "Claim narrative understanding",
    detailTh: "ผู้ซื้ออ้างถึงความล่าช้าในการขนส่ง และไม่พบข้อพิพาทอย่างเป็นทางการ",
    detailEn: "Buyer cites a shipping delay; no formal dispute is present.",
    whyTh: "สรุปอีเมลภาษาไทยและอังกฤษให้เป็นประเด็นที่ตรวจสอบได้",
    confidence: 0.99
  },
  {
    type: "FOUNDRY IQ PATTERN",
    service: "Foundry IQ grounding via Azure AI Search",
    titleTh: "ค้นหาคำตอบจากกรมธรรม์พร้อมหลักฐาน",
    titleEn: "Ground the answer in the policy",
    detailTh: "ข้อ 7.3 กำหนดกรอบ 180 วัน แต่ยังยืนยันผลไม่ได้เพราะวันที่ส่งสินค้ามีความเชื่อมั่นต่ำ",
    detailEn: "Clause 7.3 sets a 180-day window, but the result cannot be confirmed because the shipment date is low confidence.",
    whyTh: "คำตอบเชื่อมกลับไปยังข้อ 7.3 หน้า 2 เจ้าหน้าที่จึงเปิดตรวจหลักฐานต้นทางได้",
    confidence: 1,
    citationPage: 2
  },
  {
    type: "RULE-BASED",
    service: "Deterministic local list",
    titleTh: "ตรวจสอบเงื่อนไขบังคับ",
    titleEn: "Mandatory condition checks",
    detailTh: "การค้นหาแบบกำหนดตายตัวพบรายการ Zantara Meridian Trading Co. และส่งต่อให้เจ้าหน้าที่",
    detailEn: "Deterministic lookup matched Zantara Meridian Trading Co. and refers it to an officer.",
    whyTh: "ใช้กฎตายตัวแทน AI เพื่อให้ผลเดิมทุกครั้งและตรวจสอบย้อนหลังได้",
    confidence: 1
  },
  {
    type: "MACHINE LEARNING",
    service: "scikit-learn",
    titleTh: "ประเมินความพร้อมของเคส",
    titleEn: "Case readiness estimate",
    detailTh: "คะแนนความพร้อม 42 จาก 100 ปัจจัยหลักคือเอกสาร 8/10 และแนวโน้มการชำระเงินที่แย่ลง",
    detailEn: "Readiness is 42/100. Main factors include 8/10 completeness and worsening payment aging.",
    whyTh: "ช่วยจัดลำดับการตรวจ ไม่ได้ตัดสินอนุมัติแทนเจ้าหน้าที่",
    confidence: 1
  },
  {
    type: "GENERATIVE AI",
    service: "Microsoft Foundry model",
    titleTh: "จัดทำข้อเสนอแนะเพื่อการพิจารณา",
    titleEn: "Review recommendation drafting",
    detailTh: "ร่างภาษาไทยระบุชัดว่ายังยืนยันกำหนดยื่นไม่ได้ และต้องขอ 03_bill_of_lading.pdf ใหม่",
    detailEn: "The Thai draft states that the filing deadline is unverified and 03_bill_of_lading.pdf must be requested again.",
    whyTh: "โมเดลเขียนจากผลตรวจหกขั้นก่อนหน้าเท่านั้น และต้องคงคำเตือนเรื่องข้อมูลที่ยังไม่ยืนยัน",
    confidence: 1,
    citationPage: 2
  }
];

type AnalysisPanel = {
  type: string;
  service: string;
  titleTh: string;
  titleEn: string;
  detailTh: string;
  detailEn: string;
  whyTh: string;
  confidence: number;
  citationPage?: number;
};

type HistoryRow = {
  caseId: string;
  insured: string;
  updatedAt: string;
  status: string;
  officer: string;
};

type Props = {
  initialUser?: string;
  entraConfigured: boolean;
  onEntraSignIn: () => Promise<string>;
  onSignOut: () => Promise<void>;
};

function friendlyError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message && !/stack|trace/i.test(error.message)) {
    return error.message;
  }
  return fallback;
}

async function apiFetch(path: string, init?: RequestInit) {
  const token = sessionStorage.getItem("claimpilot_access_token");
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    let message = `ไม่สามารถดำเนินการได้ (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string; message?: string };
      message = body.detail || body.message || message;
    } catch {
      // Keep the safe status message when the backend does not return JSON.
    }
    throw new Error(message);
  }
  return response;
}

function normalizePanel(value: unknown, index: number): AnalysisPanel {
  const fallback = panelDefaults[index] || panelDefaults[panelDefaults.length - 1];
  if (!value || typeof value !== "object") return fallback;
  const panel = value as Record<string, unknown>;
  const data = panel.data && typeof panel.data === "object" ? panel.data as Record<string, unknown> : {};
  const name = String(panel.panel || "");
  const panelIndex = ["classification", "extraction", "language", "policy", "screening", "score", "report"].indexOf(name);
  const base = panelDefaults[panelIndex >= 0 ? panelIndex : index] || fallback;
  let detailTh = base.detailTh;
  let detailEn = base.detailEn;
  let confidence = base.confidence;
  let citationPage = base.citationPage;
  if (name === "classification") {
    const completeness = data.completeness as Record<string, unknown> | undefined;
    detailEn = `${completeness?.present ?? 0}/${completeness?.required ?? 10} documents present. Missing: ${((completeness?.missing as string[]) || []).join(", ")}.`;
    detailTh = `มีเอกสาร ${completeness?.present ?? 0} จาก ${completeness?.required ?? 10} รายการ ขาดหนังสือมอบอำนาจและหลักฐานการส่งมอบ`;
  } else if (name === "extraction") {
    const documents = (data.documents as Array<Record<string, unknown>>) || [];
    const fields: Array<Record<string, unknown>> = documents.flatMap((document) =>
      ((document.fields as Array<Record<string, unknown>>) || []).map(
        (field): Record<string, unknown> => ({ ...field, file: document.file })
      )
    );
    const shipment = fields.find((field) => field.name === "shipment_date");
    confidence = Number(shipment?.confidence ?? base.confidence);
    detailEn = `Shipment date ${shipment?.value} from ${shipment?.file} has ${Math.round(confidence * 100)}% confidence and is unverified.`;
    detailTh = `วันที่ส่งสินค้า ${shipment?.value} จาก ${shipment?.file} มีความเชื่อมั่น ${Math.round(confidence * 100)}% และยังไม่ผ่านการยืนยัน`;
  } else if (name === "language") {
    detailTh = String(data.summary_th || base.detailTh);
    detailEn = String(data.summary_en || base.detailEn);
  } else if (name === "policy") {
    const citation = data.citation as Record<string, unknown> | undefined;
    const filing = data.filing_window as Record<string, unknown> | undefined;
    detailEn = String(data.answer || base.detailEn);
    detailTh = `ข้อ ${citation?.clause} กำหนด ${filing?.days} วัน แต่ระบบปฏิเสธการคำนวณเพราะวันที่ส่งสินค้ายังไม่ยืนยัน`;
    citationPage = Number(citation?.page || 2);
  } else if (name === "screening") {
    const match = data.matched_entry as Record<string, unknown> | undefined;
    detailEn = `Deterministic lookup result: ${data.result}. Matched entry: ${match?.entity_name || "none"}. No LLM was used.`;
    detailTh = `ผลการค้นหาแบบกำหนดตายตัว: ส่งต่อ พบรายการ ${match?.entity_name || "ไม่พบ"} และไม่มีการใช้ LLM`;
  } else if (name === "score") {
    detailEn = `Readiness score: ${data.score}/100. ${((data.top_factors as Array<Record<string, unknown>>) || []).map((factor) => factor.factor).join(", ")}.`;
    detailTh = `คะแนนความพร้อม ${data.score} จาก 100 โดยแสดงปัจจัยสำคัญสามอันดับ`;
  } else if (name === "report") {
    detailTh = String(data.thai_report || base.detailTh);
    detailEn = base.detailEn;
    citationPage = 2;
  }
  return {
    ...base,
    detailTh,
    detailEn,
    confidence,
    citationPage
  };
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark"><ShieldCheck size={20} /></span>
      <div>
        <strong>ClaimPilot</strong>
        <span>Export Credit Insurance</span>
      </div>
    </div>
  );
}

function Login({
  configured,
  onLogin,
  busy,
  error
}: {
  configured: boolean;
  onLogin: (demo?: boolean) => void;
  busy: boolean;
  error: string;
}) {
  return (
    <main className="login-shell">
      <section className="login-context">
        <Brand />
        <div className="login-copy">
          <span className="eyebrow">Claims intelligence workspace</span>
          <h1>พิจารณาสินไหม<br />อย่างมั่นใจและโปร่งใส</h1>
          <p>Evidence-linked assistance for export credit insurance claims, with every signal ready for officer review.</p>
        </div>
        <div className="trust-row">
          <span><ShieldCheck size={16} /> Human decision retained</span>
          <span><FileCheck2 size={16} /> Evidence traceable</span>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <div className="login-icon"><Landmark size={24} /></div>
          <p className="kicker">SECURE ACCESS</p>
          <h2>ลงชื่อเข้าใช้ ClaimPilot</h2>
          <p>Sign in with your organization account to access assigned claim cases.</p>
          {error && <div className="error-banner" role="alert"><AlertTriangle size={17} />{error}</div>}
          <button className="primary-button wide" onClick={() => onLogin()} disabled={busy || !configured}>
            {busy ? <LoaderCircle className="spin" size={18} /> : <Landmark size={18} />}
            Sign in with Microsoft Entra ID
          </button>
          {!configured && <p className="config-note">Entra sign-in requires VITE_MSAL_CLIENT_ID and VITE_MSAL_TENANT_ID.</p>}
          {DEMO_MODE && (
            <>
              <div className="or"><span>DEMO ENVIRONMENT</span></div>
              <button className="secondary-button wide" onClick={() => onLogin(true)} disabled={busy}>
                <Sparkles size={18} /> Demo sign-in bypass
              </button>
              <p className="demo-note">Available only because VITE_DEMO_MODE=cached. No identity token is issued.</p>
            </>
          )}
        </div>
        <p className="legal">Authorized personnel only · การใช้งานทั้งหมดอาจถูกบันทึกเพื่อตรวจสอบ</p>
      </section>
    </main>
  );
}

function Header({ user, section, onNavigate, onSignOut }: {
  user: string;
  section: "cases" | "history";
  onNavigate: (section: "cases" | "history") => void;
  onSignOut: () => void;
}) {
  return (
    <header className="app-header">
      <Brand />
      <nav aria-label="Main navigation">
        <button className={section === "cases" ? "active" : ""} onClick={() => onNavigate("cases")}>
          <BriefcaseBusiness size={17} /> เคสสินไหม
        </button>
        <button className={section === "history" ? "active" : ""} onClick={() => onNavigate("history")}>
          <History size={17} /> ประวัติ
        </button>
      </nav>
      <div className="user-box">
        <span className="avatar"><CircleUserRound size={18} /></span>
        <span><strong>{user}</strong><small>Claims Officer</small></span>
        <button className="icon-button" onClick={onSignOut} aria-label="Sign out"><LogOut size={18} /></button>
      </div>
    </header>
  );
}

function CaseList({ onOpen }: { onOpen: () => void }) {
  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <p className="kicker">CLAIMS WORKBENCH</p>
          <h1>เคสสินไหม</h1>
          <p>Claims assigned to you for review and decision support.</p>
        </div>
        <div className="search-box"><Search size={17} /><input aria-label="Search cases" placeholder="ค้นหาเลขเคสหรือลูกค้า" /></div>
      </div>
      <section className="case-stats">
        <article><span>รอดำเนินการ</span><strong>1</strong><small>Awaiting review</small></article>
        <article><span>กำลังวิเคราะห์</span><strong>0</strong><small>In analysis</small></article>
        <article><span>เสร็จสัปดาห์นี้</span><strong>12</strong><small>Completed this week</small></article>
      </section>
      <section className="case-table-card">
        <div className="table-title"><h2>รายการที่ได้รับมอบหมาย</h2><span>1 case</span></div>
        <div className="responsive-table">
          <table>
            <thead><tr><th>เลขเคส / Case ID</th><th>ผู้เอาประกัน / Insured</th><th>ประเภท</th><th>มูลค่าเรียกร้อง</th><th>อัปเดตล่าสุด</th><th>สถานะ</th><th></th></tr></thead>
            <tbody>
              <tr onClick={onOpen}>
                <td><strong>{CASE_ID}</strong><small>Policy ECI-2026-000125</small></td>
                <td><strong>Example Crest Industries Ltd.</strong><small>Fictional exporter</small></td>
                <td>Export Credit</td>
                <td><strong>USD 225,000.00</strong></td>
                <td>22 ส.ค. 2569<small>09:42 น.</small></td>
                <td><span className="status pending">รอตรวจสอบ</span></td>
                <td><button className="round-button" aria-label="Open case"><ChevronRight size={18} /></button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Wizard({ step }: { step: number }) {
  return (
    <ol className="wizard" aria-label="Claim workflow">
      {wizardSteps.map((label, index) => (
        <li key={label} className={index === step ? "current" : index < step ? "done" : ""}>
          <span>{index < step ? <Check size={15} /> : index + 1}</span>
          <strong>{label}</strong>
          {index < wizardSteps.length - 1 && <i />}
        </li>
      ))}
    </ol>
  );
}

function PolicyUpload({
  files,
  uploading,
  error,
  onFiles,
  onNext
}: {
  files: File[];
  uploading: boolean;
  error: string;
  onFiles: (files: File[]) => void;
  onNext: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return (
    <section>
      <div className="section-heading">
        <div><p className="kicker">STEP 01 · POLICY & EVIDENCE</p><h2>ข้อมูลกรมธรรม์และเอกสาร</h2><p>Policy details and supporting evidence</p></div>
        <span className="status pending">รอตรวจสอบ</span>
      </div>
      <div className="two-column">
        <article className="card">
          <div className="card-title"><FileText size={19} /><h3>ข้อมูลกรมธรรม์ <small>Policy information</small></h3></div>
          <dl className="details-grid">
            <div><dt>เลขกรมธรรม์</dt><dd>ECI-2026-000125</dd></div>
            <div><dt>วันที่ยื่นเคลม</dt><dd>2026-08-08</dd></div>
            <div><dt>ผู้เอาประกัน</dt><dd>Example Crest Industries Ltd.</dd></div>
            <div><dt>ผู้ซื้อ / ประเทศ</dt><dd>Zantara Meridian Trading Co. · Republic of Zantara</dd></div>
            <div><dt>ท่าเรือปลายทาง</dt><dd>Port of Zantara</dd></div>
            <div><dt>มูลค่าเรียกร้อง</dt><dd>USD 225,000.00</dd></div>
          </dl>
        </article>
        <article className="card">
          <div className="card-title"><Paperclip size={19} /><h3>เอกสารประกอบ <small>Supporting documents</small></h3></div>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.txt,.xlsx"
            onChange={(event) => onFiles(Array.from(event.target.files || []))}
          />
          <button
            className={`dropzone ${dragging ? "dragging" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              onFiles(Array.from(event.dataTransfer.files));
            }}
          >
            <UploadCloud size={26} />
            <strong>วางไฟล์ที่นี่ หรือเลือกจากเครื่อง</strong>
            <span>Drop files or browse · PDF, PNG, JPG</span>
          </button>
          <div className="file-list">
            {(files.length ? files : [
              "01_claim_form.pdf", "02_commercial_invoice.pdf", "03_bill_of_lading.pdf",
              "04_packing_list.pdf", "05_export_declaration.pdf", "06_correspondence.txt",
              "07_payment_history.xlsx", "08_policy.pdf"
            ].map((name) => new File([""], name))).map((file, index) => (
              <div className="file-row" key={`${file.name}-${index}`}>
                <span className="file-icon"><FileText size={17} /></span>
                <span><strong>{file.name}</strong><small>{file.size ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "Cached demo document"}</small></span>
                <CheckCircle2 size={18} className="success-icon" />
              </div>
            ))}
          </div>
          {error && <div className="error-banner" role="alert"><AlertTriangle size={17} />{error}</div>}
        </article>
      </div>
      <div className="actions"><button className="primary-button" onClick={onNext} disabled={uploading}>{uploading ? <LoaderCircle className="spin" size={18} /> : null}ตรวจสอบเอกสารต่อ <ArrowRight size={17} /></button></div>
    </section>
  );
}

function Screening({ onBack, onAnalyze }: { onBack: () => void; onAnalyze: () => void }) {
  return (
    <section>
      <div className="section-heading">
        <div><p className="kicker">STEP 02 · COMPLIANCE SCREENING</p><h2>Sanctioned countries</h2><p>ตรวจสอบประเทศตามกฎและรายการอ้างอิง</p></div>
        <span className="rule-badge">RULE-BASED · NOT AI</span>
      </div>
      <div className="screening-banner">
        <div className="screening-symbol"><ShieldCheck size={28} /></div>
        <div>
          <p className="kicker">DETERMINISTIC RULE CHECK</p>
          <h3>พบรายการตัวอย่างและส่งต่อให้เจ้าหน้าที่</h3>
          <p>Illustrative deterministic match found for Zantara Meridian Trading Co.</p>
        </div>
        <span className="status pending">REFER</span>
      </div>
      <div className="two-column">
        <article className="card"><div className="card-title"><Landmark size={19} /><h3>คู่ค้าและปลายทาง <small>Counterparty & destination</small></h3></div><dl className="route"><div><dt>Exporter</dt><dd>Example Crest Industries Ltd.</dd></div><ChevronRight /><div><dt>Buyer</dt><dd>Zantara Meridian Trading Co.</dd></div><ChevronRight /><div><dt>Port</dt><dd>Port of Zantara</dd></div></dl></article>
        <article className="card"><div className="card-title"><FileCheck2 size={19} /><h3>กฎที่ใช้ตรวจ <small>Screening source</small></h3></div><ul className="check-list"><li><AlertTriangle size={15} />Exact normalized entity-name match <span>Refer</span></li><li><Check size={15} />No probabilistic matching <span>Fixed</span></li><li><Check size={15} />No LLM call <span>Verified</span></li></ul></article>
      </div>
      <div className="notice"><ShieldCheck size={18} /><p><strong>การตรวจนี้ไม่ใช่ AI</strong> ผลลัพธ์มาจากการค้นหาแบบกำหนดตายตัว <span>This screening is rule-based, not AI. ILLUSTRATIVE — NOT AN OFFICIAL SANCTIONS LIST.</span></p></div>
      <div className="actions split"><button className="secondary-button" onClick={onBack}><ArrowLeft size={17} /> ย้อนกลับ</button><button className="primary-button" onClick={onAnalyze}>เริ่มการวิเคราะห์ <Sparkles size={17} /></button></div>
    </section>
  );
}

function Analysis({
  panels,
  analyzing,
  error,
  onRetry,
  onBack,
  onNext
}: {
  panels: AnalysisPanel[];
  analyzing: boolean;
  error: string;
  onRetry: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <section>
      <div className="section-heading">
        <div><p className="kicker">STEP 03 · EVIDENCE ANALYSIS</p><h2>AI ช่วยตรวจอะไรบ้าง?</h2><p>อ่านเอกสาร → ค้นหากฎ → แสดงสิ่งที่ต้องให้เจ้าหน้าที่ตัดสินใจ</p></div>
        <span className={`status ${analyzing ? "processing" : "success"}`}>{analyzing ? <><LoaderCircle className="spin" size={14} />กำลังวิเคราะห์</> : "วิเคราะห์ครบแล้ว"}</span>
      </div>
      <div className="capability-guide">
        <div className="capability-guide-title">
          <p className="kicker">TWO CAPABILITIES TO WATCH</p>
          <h3>สองความสามารถสำคัญในเดโมนี้</h3>
          <p>ทั้งสองบริการทำงานต่อกัน แต่มีหน้าที่ต่างกันอย่างชัดเจน</p>
        </div>
        <article>
          <span className="capability-step">1</span>
          <div>
            <strong>Document Intelligence อ่านเอกสาร</strong>
            <p>ดึงวันที่ จำนวนเงิน และเลขกรมธรรม์จาก PDF พร้อมค่าความมั่นใจ</p>
            <small>เห็นชัดในผลตรวจหมายเลข 02</small>
          </div>
        </article>
        <article>
          <span className="capability-step">2</span>
          <div>
            <strong>Foundry IQ pattern ค้นหากฎที่เกี่ยวข้อง</strong>
            <p>ค้นข้อกำหนดจากกรมธรรม์ แล้วตอบพร้อมข้อและเลขหน้าเพื่อเปิดตรวจได้</p>
            <small>เดโมนี้ใช้ Azure AI Search เป็น grounding fallback · ดูผลตรวจหมายเลข 04</small>
          </div>
        </article>
        <div className="capability-bridge">
          <ShieldCheck size={18} />
          <p><strong>จุดสำคัญ:</strong> เมื่อ Document Intelligence ไม่มั่นใจในวันที่ ระบบจะไม่ให้ Foundry IQ สรุปว่าเคสผ่านเงื่อนไข 180 วัน</p>
        </div>
      </div>
      <div className="analysis-layout">
        <aside className="analysis-progress">
          <strong>{panels.length}<small>/ 7</small></strong>
          <span>ขั้นตอนที่ตรวจแล้ว</span>
          <div className="progress-track"><i style={{ width: `${(panels.length / 7) * 100}%` }} /></div>
          <p>อ่านจากบนลงล่าง แต่ละบัตรบอกว่าใช้บริการอะไร พบอะไร และเหตุใดจึงสำคัญ</p>
        </aside>
        <div className="panels">
          {panels.map((panel, index) => <AnalysisCard key={`${panel.type}-${index}`} panel={panel} index={index} />)}
          {analyzing && (
            <div className="analysis-loading"><span><LoaderCircle className="spin" size={20} /></span><div><strong>กำลังประมวลผลขั้นตอนถัดไป</strong><small>Processing next analysis stage...</small></div></div>
          )}
          {error && <div className="error-banner" role="alert"><AlertTriangle size={17} />{error}<button onClick={onRetry}>ลองอีกครั้ง</button></div>}
        </div>
      </div>
      <div className="actions split"><button className="secondary-button" onClick={onBack} disabled={analyzing}><ArrowLeft size={17} /> ย้อนกลับ</button><button className="primary-button" onClick={onNext} disabled={analyzing || panels.length < 7}>ไปยัง AI consultant <ArrowRight size={17} /></button></div>
    </section>
  );
}

function AnalysisCard({ panel, index }: { panel: AnalysisPanel; index: number }) {
  const low = panel.confidence < 0.6;
  const confidence = Math.round(panel.confidence * 100);
  const showsConfidence = ["VISION", "OCR", "NLP"].includes(panel.type);
  const isFocus = panel.type === "OCR" || panel.type === "FOUNDRY IQ PATTERN";
  return (
    <article className={`analysis-card ${low ? "low-confidence" : ""} ${isFocus ? "capability-focus" : ""}`}>
      <div className="panel-number">{String(index + 1).padStart(2, "0")}</div>
      <div className="panel-content">
        <div className="panel-top">
          <div>
            <span className="ai-type">{panel.type}</span>
            <span className="service-name">{panel.service}</span>
            <h3>{panel.titleTh}<small>{panel.titleEn}</small></h3>
          </div>
          {showsConfidence && <div className={`confidence ${low ? "warning" : ""}`}><span>{low && <AlertTriangle size={14} />} ความเชื่อมั่น / Confidence</span><strong>{confidence}%</strong></div>}
        </div>
        {low && <div className="confidence-warning"><AlertTriangle size={16} /><span><strong>หยุดการคำนวณจากข้อมูลนี้</strong> วันที่ยังไม่ผ่านเกณฑ์ 60% จึงต้องตรวจเอกสารต้นฉบับก่อน</span></div>}
        <div className="plain-result">
          <span>ผลที่พบ</span>
          <p lang="th">{panel.detailTh}</p>
          <small lang="en">{panel.detailEn}</small>
        </div>
        <div className="why-it-matters"><strong>เหตุใดจึงสำคัญ</strong><p>{panel.whyTh}</p></div>
        {panel.citationPage && <a className="citation-chip important-citation" href={`/documents/08_policy.pdf#page=${panel.citationPage}`} target="_blank" rel="noreferrer"><FileText size={14} /> เปิดหลักฐาน · 08_policy.pdf · ข้อ 7.3 · หน้า {panel.citationPage}</a>}
      </div>
    </article>
  );
}

function Consultant({ report, onBack, onNext }: { report: string; onBack: () => void; onNext: () => void }) {
  const paragraphs = report.split(/\n\n+/).filter(Boolean);
  return (
    <section>
      <div className="section-heading">
        <div><p className="kicker">STEP 04 · REVIEW SUPPORT</p><h2>AI consultant</h2><p>ข้อสังเกตสำหรับเจ้าหน้าที่ · Officer review notes</p></div>
        <span className="human-badge"><CircleUserRound size={15} /> HUMAN-IN-THE-LOOP</span>
      </div>
      <div className="consultant-grid">
        <article className="consultant-main">
          <div className="consultant-title"><span><Sparkles size={20} /></span><div><p className="ai-type">GENERATIVE AI · GROUNDED</p><h3>ประเด็นสำคัญเพื่อประกอบการพิจารณา</h3><small>Key considerations for officer review</small></div></div>
          {paragraphs.map((paragraph, index) => <div className="consultant-item" key={paragraph}><span>{String(index + 1).padStart(2, "0")}</span><div><p lang="th">{paragraph}</p></div></div>)}
          <a className="citation-chip" href="/documents/08_policy.pdf#page=2" target="_blank" rel="noreferrer"><FileText size={14} /> Policy ECI-2026-000125 · Clause 7.3 · หน้า 2</a>
        </article>
        <aside className="review-card">
          <p className="kicker">OFFICER CHECKLIST</p>
          <h3>ก่อนสรุปผล</h3>
          <label><input type="checkbox" defaultChecked /> <span>ตรวจเอกสารครบ 8/10<small>Completeness reviewed</small></span></label>
          <label><input type="checkbox" defaultChecked /> <span>ตรวจรายการตัวอย่างแบบกำหนดตายตัว<small>Rule-based match reviewed</small></span></label>
          <label><input type="checkbox" /> <span>ขอใบตราส่งใหม่<small>Re-request bill of lading</small></span></label>
          <label><input type="checkbox" /> <span>ยืนยันวันที่ส่งสินค้า<small>Shipment date confirmed</small></span></label>
          <div className="disclaimer"><AlertTriangle size={17} /> AI provides decision support only. Final accountability remains with the assigned officer.</div>
        </aside>
      </div>
      <div className="actions split"><button className="secondary-button" onClick={onBack}><ArrowLeft size={17} /> ย้อนกลับ</button><button className="primary-button" onClick={onNext}>จัดทำสรุป <ArrowRight size={17} /></button></div>
    </section>
  );
}

function Summary({ report, score, onBack, onDecision }: { report: string; score: number; onBack: () => void; onDecision: (decision: string, officer: string) => void }) {
  const [officer, setOfficer] = useState("นภัสสร วัฒนกุล");
  return (
    <section>
      <div className="section-heading">
        <div><p className="kicker">STEP 05 · OFFICER DECISION</p><h2>สรุป</h2><p>Decision-ready brief with traceable evidence</p></div>
        <span className="status success">พร้อมให้เจ้าหน้าที่พิจารณา</span>
      </div>
      <div className="summary-grid">
        <article className="summary-draft card">
          <div className="card-title"><FileText size={19} /><h3>ร่างสรุปการพิจารณา <small>Draft assessment summary</small></h3><span className="draft-badge">AI DRAFT · REVIEW REQUIRED</span></div>
          <div className="summary-copy">
            <div lang="th">{report.split(/\n\n+/).filter(Boolean).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
          </div>
          <a className="citation-chip" href="/documents/08_policy.pdf#page=2" target="_blank" rel="noreferrer"><FileText size={14} /> 08_policy.pdf · หน้า 2 · Clause 7.3</a>
        </article>
        <aside className="decision-card">
          <p className="kicker">CASE READINESS</p>
          <div className="score-ring"><strong>{score}</strong><small>/ 100</small></div>
          <h3>ต้องตรวจทานเพิ่มเติม</h3>
          <p>The filing deadline remains unverified because the shipment date is below the confidence gate.</p>
          <label className="officer-field"><span>เจ้าหน้าที่ผู้รับผิดชอบ · Officer name</span><input value={officer} onChange={(event) => setOfficer(event.target.value)} /></label>
          <button className="approve-button" onClick={() => onDecision("พร้อมพิจารณา", officer)} disabled={!officer.trim()}><CheckCircle2 size={18} /> พร้อมพิจารณา</button>
          <button className="secondary-button wide" onClick={() => onDecision("ขอเอกสารเพิ่มเติม", officer)} disabled={!officer.trim()}><Paperclip size={18} /> ขอเอกสารเพิ่มเติม</button>
          <p className="decision-note">การกดปุ่มจะบันทึกการตัดสินใจของเจ้าหน้าที่ · Your action is recorded in the audit history.</p>
        </aside>
      </div>
      <div className="actions"><button className="secondary-button" onClick={onBack}><ArrowLeft size={17} /> ย้อนกลับ</button></div>
    </section>
  );
}

function HistoryPage({ rows, loading, error }: { rows: HistoryRow[]; loading: boolean; error: string }) {
  return (
    <main className="page">
      <div className="page-heading"><div><p className="kicker">AUDIT & DECISIONS</p><h1>ประวัติการพิจารณา</h1><p>Claim activity and officer decisions</p></div><div className="search-box"><Search size={17} /><input aria-label="Search history" placeholder="ค้นหาประวัติ" /></div></div>
      {error && <div className="error-banner" role="alert"><AlertTriangle size={17} />{error}</div>}
      <section className="case-table-card">
        <div className="table-title"><h2>กิจกรรมล่าสุด</h2><span>{rows.length} records</span></div>
        {loading ? <div className="table-loading"><LoaderCircle className="spin" /> กำลังโหลดประวัติ...</div> : (
          <div className="responsive-table"><table><thead><tr><th>เลขเคส</th><th>ผู้เอาประกัน</th><th>วันที่อัปเดต</th><th>เจ้าหน้าที่</th><th>สถานะ</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.caseId}-${row.updatedAt}`}><td><strong>{row.caseId}</strong></td><td>{row.insured}</td><td>{row.updatedAt}</td><td>{row.officer}</td><td><span className={`status ${row.status.includes("พร้อม") ? "success" : "pending"}`}>{row.status}</span></td></tr>)}</tbody></table></div>
        )}
      </section>
    </main>
  );
}

export default function App({ initialUser, entraConfigured, onEntraSignIn, onSignOut }: Props) {
  const [user, setUser] = useState(initialUser || "");
  const [section, setSection] = useState<"cases" | "history">("cases");
  const [caseOpen, setCaseOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [panels, setPanels] = useState<AnalysisPanel[]>([]);
  const [panelPayloads, setPanelPayloads] = useState<Record<string, Record<string, unknown>>>({});
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (initialUser) setUser(initialUser);
  }, [initialUser]);

  const demoHistory = useMemo<HistoryRow[]>(() => [
    { caseId: CASE_ID, insured: "Example Crest Industries Ltd.", updatedAt: "22 ส.ค. 2569 · 09:42", status: "รอตรวจสอบ", officer: "นภัสสร วัฒนกุล" }
  ], []);

  const signIn = async (demo = false) => {
    setBusy(true);
    setError("");
    try {
      setUser(demo ? "นภัสสร วัฒนกุล (Demo)" : await onEntraSignIn());
    } catch (cause) {
      setError(friendlyError(cause, "ไม่สามารถลงชื่อเข้าใช้ได้ โปรดลองอีกครั้ง"));
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    try {
      if (!user.endsWith("(Demo)")) await onSignOut();
    } finally {
      setUser("");
      setCaseOpen(false);
      setStep(0);
    }
  };

  const uploadFiles = async (incoming: File[]) => {
    if (!incoming.length) return;
    setFiles((current) => [...current, ...incoming]);
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      incoming.forEach((file) => form.append("files", file));
      await apiFetch(`/api/cases/${CASE_ID}/upload`, { method: "POST", body: form });
    } catch (cause) {
      if (!DEMO_MODE) setError(friendlyError(cause, "อัปโหลดไม่สำเร็จ โปรดลองอีกครั้ง"));
    } finally {
      setUploading(false);
    }
  };

  const runCachedAnalysis = useCallback(async () => {
    setPanels([]);
    setPanelPayloads({
      report: { panel: "report", data: { thai_report: DEMO_REPORT } },
      score: { panel: "score", data: { score: 42 } }
    });
    for (const panel of panelDefaults) {
      await new Promise((resolve) => window.setTimeout(resolve, 340));
      setPanels((current) => [...current, panel]);
    }
  }, []);

  const analyze = useCallback(async () => {
    setStep(2);
    setAnalyzing(true);
    setPanels([]);
    setPanelPayloads({});
    setError("");
    try {
      const response = await apiFetch(`/api/cases/${CASE_ID}/analyze`, {
        method: "POST",
        headers: { Accept: "text/event-stream" }
      });
      if (!response.body) throw new Error("ไม่พบข้อมูลการวิเคราะห์จากเซิร์ฟเวอร์");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let count = 0;
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || "";
        for (const event of events) {
          const payload = event.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
          if (!payload || payload === "[DONE]") continue;
          const parsed = JSON.parse(payload) as unknown;
          if (!parsed || typeof parsed !== "object" || !("panel" in parsed)) continue;
          const item = parsed as Record<string, unknown>;
          const panelName = String(item.panel);
          if (!panelDefaults.some((_, panelIndex) => ["classification", "extraction", "language", "policy", "screening", "score", "report"][panelIndex] === panelName)) continue;
          setPanelPayloads((current) => ({ ...current, [panelName]: item }));
          setPanels((current) => current.length < 7 ? [...current, normalizePanel(item, count)] : current);
          count += 1;
        }
        if (done) break;
      }
      if (count < 7) {
        const result = await apiFetch(`/api/cases/${CASE_ID}/result`);
        const body = await result.json() as { panels?: unknown[] } | unknown[];
        const resultPanels = Array.isArray(body) ? body : body.panels || [];
        setPanels(resultPanels.slice(0, 7).map(normalizePanel));
        setPanelPayloads(Object.fromEntries(resultPanels.map((panel) => {
          const record = panel as Record<string, unknown>;
          return [String(record.panel), record];
        })));
      }
    } catch (cause) {
      if (DEMO_MODE) {
        await runCachedAnalysis();
      } else {
        setError(friendlyError(cause, "การวิเคราะห์หยุดชั่วคราว โปรดลองอีกครั้ง"));
      }
    } finally {
      setAnalyzing(false);
    }
  }, [runCachedAnalysis]);

  useEffect(() => {
    if (section !== "history" || !user) return;
    let active = true;
    setBusy(true);
    setError("");
    apiFetch("/api/history")
      .then((response) => response.json())
      .then((body: unknown) => {
        if (!active) return;
        const source = Array.isArray(body) ? body : (body as { items?: unknown[] }).items || [];
        const normalized = source.map((item, index) => {
          const row = item as Record<string, unknown>;
          return {
            caseId: String(row.case_id || row.caseId || `CASE-${index + 1}`),
            insured: "Example Crest Industries Ltd.",
            updatedAt: String(row.timestamp || row.updated_at || row.updatedAt || "-"),
            status: String((row.result as Record<string, unknown> | undefined)?.status || row.status || "-"),
            officer: String(row.user_oid || row.officer || "-")
          };
        });
        setHistoryRows(normalized.length ? normalized : demoHistory);
      })
      .catch((cause) => {
        if (!active) return;
        if (DEMO_MODE) setHistoryRows(demoHistory);
        else setError(friendlyError(cause, "ไม่สามารถโหลดประวัติได้ โปรดลองใหม่ภายหลัง"));
      })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [section, user, demoHistory]);

  if (!user) return <Login configured={entraConfigured} onLogin={signIn} busy={busy} error={error} />;

  const navigate = (next: "cases" | "history") => {
    setSection(next);
    setCaseOpen(false);
    setError("");
  };

  const recordDecision = (decision: string, officer: string) => {
    setToast(`บันทึกสถานะ “${decision}” แล้ว`);
    setHistoryRows((rows) => [{ caseId: CASE_ID, insured: "Example Crest Industries Ltd.", updatedAt: "เมื่อสักครู่", status: decision, officer }, ...rows.filter((row) => row.caseId !== CASE_ID)]);
    window.setTimeout(() => setToast(""), 3600);
  };

  return (
    <div className="app-shell">
      <Header user={user} section={section} onNavigate={navigate} onSignOut={signOut} />
      {section === "history" ? <HistoryPage rows={historyRows.length ? historyRows : demoHistory} loading={busy} error={error} /> :
        !caseOpen ? <CaseList onOpen={() => setCaseOpen(true)} /> : (
          <main className="case-page">
            <div className="case-topline"><button className="back-link" onClick={() => setCaseOpen(false)}><ArrowLeft size={16} /> กลับไปยังรายการเคส</button><span>บันทึกล่าสุด 09:42 น.</span></div>
            <div className="case-title"><div><span className="status pending">EXPORT CREDIT</span><h1>{CASE_ID}</h1><p>Example Crest Industries Ltd. · Claim amount <strong>USD 225,000.00</strong></p></div><div className="case-owner"><span className="avatar"><CircleUserRound size={19} /></span><span><small>Assigned officer</small><strong>นภัสสร วัฒนกุล</strong></span></div></div>
            <Wizard step={step} />
            <div className="workflow-content">
              {step === 0 && <PolicyUpload files={files} uploading={uploading} error={error} onFiles={uploadFiles} onNext={() => setStep(1)} />}
              {step === 1 && <Screening onBack={() => setStep(0)} onAnalyze={analyze} />}
              {step === 2 && <Analysis panels={panels} analyzing={analyzing} error={error} onRetry={analyze} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
              {step === 3 && <Consultant report={String((panelPayloads.report?.data as Record<string, unknown> | undefined)?.thai_report || DEMO_REPORT)} onBack={() => setStep(2)} onNext={() => setStep(4)} />}
              {step === 4 && <Summary report={String((panelPayloads.report?.data as Record<string, unknown> | undefined)?.thai_report || DEMO_REPORT)} score={Number((panelPayloads.score?.data as Record<string, unknown> | undefined)?.score || 42)} onBack={() => setStep(3)} onDecision={recordDecision} />}
            </div>
          </main>
        )
      }
      {toast && <div className="toast" role="status"><CheckCircle2 size={18} />{toast}<button onClick={() => setToast("")} aria-label="Close"><X size={16} /></button></div>}
    </div>
  );
}

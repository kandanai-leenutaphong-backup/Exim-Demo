# Six-minute demo runbook

## 0:00 to 0:40, sign in and frame the case

1. Open ClaimPilot and sign in with the branded Entra page.
2. Select case `ECI-2026-000125`.
3. Say: "This case and every document are synthetic. The workflow is realistic,
   but no customer information is present."
4. Point to the audit identity and case summary.

## 0:40 to 1:20, upload and safety

1. Open `ข้อมูลกรมธรรม์`.
2. Drop the eight files from `data/claim_pack`.
3. As rows appear, say: "Every image is screened before storage, then retained
   in Blob Storage with an attributable audit event."
4. Point out that Power of Attorney and Proof of Delivery are intentionally
   absent.

## 1:20 to 2:15, classification and OCR

1. Start analysis.
2. When classification appears, say: "Computer vision identifies what each
   document is. The completeness result is eight of ten."
3. **Introduce the degraded bill of lading now.** Open or point to
   `03_bill_of_lading.pdf`.
4. Say exactly: "This bright glare crosses the shipment date. A prototype might
   silently guess. A production system shows uncertainty and stops downstream
   calculations."
5. When extraction appears, point to the shipment date warning and its visible
   confidence below 60 percent.

## 2:15 to 3:00, language

1. When the NLP panel arrives, show Thai and English together.
2. Say: "Language AI detects both languages, extracts the buyer and shipping
   delay, and distinguishes a delay explanation from a formal dispute."

## 3:00 to 3:45, policy grounding

1. When the policy panel arrives, point out that the filing-window result is
   unverified rather than calculated.
2. Click the clause chip.
3. Say: "This is the most important production pattern in the demo. The answer
   is grounded in the policy and opens the exact clause and page. Because the
   shipment date is uncertain, the system refuses to claim the 180-day test
   passed."

## 3:45 to 4:30, screening and score

1. Open `Sanctioned countries`.
2. Say: "This step is deliberately not AI. It is a deterministic lookup against
   a versioned illustrative list, so the same input always returns the same
   result and matched entry."
3. Point to `ILLUSTRATIVE — NOT AN OFFICIAL SANCTIONS LIST`.
4. When the score arrives, explain that machine learning uses generated claim
   history and exposes its top three factors. It does not replace the officer.

## 4:30 to 5:25, generated report

1. Open `AI consultant`.
2. Read the highlighted sentence stating that the filing deadline cannot be
   confirmed and `03_bill_of_lading.pdf` must be requested again.
3. Say: "Generative AI receives only the six panel results. It is forbidden to
   invent a figure, and uncertainty remains visible in the Thai draft."

## 5:25 to 6:00, decision and production close

1. Open `สรุป`, enter the officer name, and choose `ขอเอกสารเพิ่มเติม`.
2. Open History and show timestamps and attribution.
3. Say: "Production-grade does not mean more AI. It means identity, content
   safety, managed identity, citations, confidence gates, deterministic
   controls, telemetry, and an audit trail."
4. Close with: "Cached mode gives this exact sequence without relying on office
   Wi-Fi. Live Azure services remain available for the technical follow-up."

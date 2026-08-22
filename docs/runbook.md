# ClaimPilot presenter guide

## The one-sentence story

ClaimPilot reads a claim pack, finds the relevant policy rule, shows uncertainty
instead of hiding it, and prepares evidence for a human officer to decide.

## Why each step is needed

| Step | English explanation |
|---|---|
| Vision | Claims cannot be reviewed reliably until the system knows which document types are present and which required evidence is missing. |
| Document Intelligence | Business rules need structured values, not PDF images. Confidence scores prevent uncertain OCR results from silently becoming trusted facts. |
| Language | The reason for non-payment is buried in multilingual correspondence. Language analysis turns that narrative into reviewable facts. |
| Foundry IQ grounding pattern | Policy answers must come from approved source material. Grounding provides the relevant rule and a citation the officer can verify. |
| Rule-based screening | Compliance screening must be repeatable and explainable. An exact rule-based lookup is safer here than a probabilistic AI answer. |
| Machine learning | A readiness score helps officers prioritize attention across many cases while exposing the factors behind the estimate. |
| Generative AI | The final evidence is structured but not easy to read. Generative AI converts only the approved panel results into a concise officer draft. |

## Before the audience arrives

1. Open the deployed ClaimPilot URL and sign in.
2. Open case `ECI-2026-000125`.
3. Keep `03_bill_of_lading.pdf` ready in another window if you want to show the
   glare across the shipment date.
4. Use only the bundled synthetic files in `data/claim_pack`.
5. Remember the three ideas to repeat:
   - Document Intelligence reads the documents.
   - The Foundry IQ grounding pattern finds the policy evidence.
   - The officer remains responsible for the decision.

## 0:00 to 0:40, introduce the business problem

**Click:** Sign in, then open `ECI-2026-000125`.

**Say:**

> A claims officer normally has to read many documents, compare dates and
> amounts, find the right policy condition, and decide what is still missing.
> ClaimPilot prepares that evidence. It does not approve the claim.

**Point to:** The case number, claim amount, and assigned officer.

**Audience takeaway:** This is decision support for a person, not autonomous
claim approval.

## 0:40 to 1:20, show the evidence pack

**Click:** Open `เอกสาร`. Upload or point to the eight bundled files.

**Say:**

> Every file is synthetic. Before storage, Content Safety checks the upload.
> The app then keeps the file in Blob Storage and records who performed the
> action.

**Point to:** The eight accepted files.

**Say:**

> Two required documents are deliberately missing. This gives the system a
> useful problem to find rather than a perfect demo case.

**Audience takeaway:** Production AI starts with safe, attributable inputs.

## 1:20 to 1:50, explain the non-AI control

**Click:** Continue to `ตรวจคู่ค้า`.

**Say:**

> This screen is deliberately not AI. A sanctions control must return the same
> result every time, so it uses an exact lookup against a fictional list.

**Point to:** `RULE-BASED · NOT AI` and
`ILLUSTRATIVE — NOT AN OFFICIAL SANCTIONS LIST`.

**Audience takeaway:** A good AI solution uses ordinary deterministic rules
where predictability matters more than creativity.

## 1:50 to 2:15, start the seven-stage analysis

**Click:** `เริ่มการวิเคราะห์`.

**Say:**

> Seven capabilities now contribute one result each. They arrive separately so
> we can see the work that is normally hidden behind a loading spinner.

**Point to:** `ดู AI ทำงานทีละขั้น`. Select stages 1 through 7 across the top.
For each stage, follow the moving dot from the large Input panel, through the
named service in the center, into the large Output panel. Use
`เล่นขั้นตอนนี้อีกครั้ง` whenever the audience needs to see the transformation
again.

**Say:**

> The left side is exactly what this capability receives. The center is the
> narrow job it performs. The right side is the structured result passed to the
> next capability. We can inspect each boundary rather than treating AI as one
> invisible black box.

## 2:15 to 3:10, demonstrate Document Intelligence

**Click:** Expand `02 · OCR` using
`ดูว่า AI รับอะไร และส่งอะไรออกมา`.

**Point to the document image:** The highlighted shipment-date row is the exact
region Document Intelligence is reading. The panel beside it shows the field
name, value, 54 percent confidence, and `BLOCKED` downstream status.

**Point from left to right:**

1. **Input:** Claim form, invoice, bill of lading, and export declaration.
2. **Process:** Document Intelligence reads text and document structure.
3. **Output:** Named fields and confidence values.

**Say:**

> Document Intelligence does more than copy text. It returns structured fields
> such as invoice amount and shipment date, and tells us how confident it is.

**Show:** The 54 percent shipment-date confidence.

**Say exactly:**

> Glare crosses the date on this bill of lading. A prototype might silently
> guess. ClaimPilot marks it unverified and blocks every calculation that
> depends on it.

**Optional technical follow-up:** Click `ดูข้อมูล JSON สำหรับทีมเทคนิค` to show
the actual field-level output and confidence.

**Audience takeaway:** The important capability is not merely OCR. It is
structured extraction with visible uncertainty.

## 3:10 to 4:05, demonstrate the Foundry IQ grounding pattern

**Click:** Expand `04 · FOUNDRY IQ PATTERN`.

**Point to the policy image:** The highlighted box is the exact Clause 7.3
passage retrieved from page 2. The panel beside it separates the source,
evidence location, rule found, and case-specific result.

**Point from left to right:**

1. **Input:** The filing-window question plus extracted shipment-date status.
2. **Process:** Grounded retrieval searches the indexed policy.
3. **Output:** Clause 7.3, the 180-day rule, and a source location.

**Say:**

> Foundry IQ is the knowledge layer. It connects the question to trusted
> enterprise content instead of asking a model to answer from memory. In this
> subscription the demo implements that pattern with Azure AI Search as the
> grounding fallback.

**Click:** `เปิดหลักฐาน · 08_policy.pdf · ข้อ 7.3 · หน้า 2`.

**Say:**

> The officer can inspect the exact policy page. The system found the rule, but
> it still refuses to say that the claim passed because Document Intelligence
> did not verify the shipment date.

**Optional technical follow-up:** Open the JSON to show the structured citation,
clause, page, answer, and unverified filing-window status.

**Audience takeaway:** Foundry IQ grounds answers in trusted knowledge and makes
the evidence inspectable.

## 4:05 to 4:35, quickly explain the remaining stages

**Open each card and point to its visual input and output:**

- **Vision:** The left side shows real document thumbnails. The right side shows
  eight classified files, two missing files, and the `8 / 10` completeness
  value passed onward.
- **Language:** The left side highlights the exact Thai and English phrases in
  the correspondence. The right side shows detected languages, organization,
  event, and `formal dispute: No`.
- **Rule-based screening:** The left side shows the illustrative list and the
  highlighted matched row. The right side shows the exact buyer-name
  comparison and `REFER` result.
- **Machine learning:** The left side shows the four case features as labeled
  bars. The right side shows the `42 / 100` readiness output and manual-review
  disposition.
- **Generative AI:** The left side shows the six panel results allowed into the
  prompt. The right side shows the Thai draft and highlights the required
  unverified statement.

**Say:**

> Each capability has one narrow job. The value comes from orchestrating them
> with controls, not from asking one model to do everything.

## 4:35 to 5:20, show the grounded draft

**Click:** Continue to `คำแนะนำ`.

**Say:**

> The model receives only the six inspected results. It cannot introduce a new
> amount, date, or conclusion. Notice that the uncertainty from the bill of
> lading remains visible in the Thai draft.

**Point to:** The request for a replacement `03_bill_of_lading.pdf` and the
policy citation.

**Audience takeaway:** Generative AI turns controlled evidence into readable
language without removing the guardrails.

## 5:20 to 6:00, return accountability to the officer

**Click:** Continue to `ตัดสินใจ`, enter the officer name, then choose
`ขอเอกสารเพิ่มเติม`.

**Click:** Open `ประวัติ`.

**Say:**

> The officer makes the final decision. Every panel result has a timestamp and
> user identity in the audit history. Production-grade AI means identity,
> evidence, confidence gates, citations, deterministic controls, telemetry, and
> human accountability.

**Close with:**

> Document Intelligence reads what the customer submitted. The Foundry IQ
> pattern finds what the policy says. ClaimPilot connects the two, preserves
> uncertainty, and gives the officer evidence they can verify.

## If someone asks difficult questions

| Question | Short answer |
|---|---|
| Does AI approve the claim? | No. It prepares evidence and a draft. The officer decides. |
| Is the sanctions result generated by AI? | No. It is an exact deterministic lookup for repeatability. |
| Is this real customer data? | No. Every company, country, document, and history row is synthetic. |
| What does Document Intelligence add beyond OCR? | Structured fields, document layout understanding, and confidence per extracted value. |
| What does Foundry IQ add? | A governed knowledge layer that grounds answers in trusted content and returns citations. |
| Is native Foundry IQ enabled here? | The demo shows the Foundry IQ pattern using Azure AI Search as the supported grounding fallback. |
| Why not calculate the 180-day result? | Its required shipment date is below the 60 percent confidence gate. |
| Can this process new real claims today? | No. This deployment is a synthetic, cached demonstration and is not approved for real claim data. |
| What happens if the network fails? | Cached mode preserves the same seven-stage sequence for a reliable presentation. |

## Presenter rules

- Say "decision support", not "automated decision".
- Say "grounded answer", not "the AI knows the policy".
- Say "unverified", not "wrong", when confidence is below the threshold.
- Describe sanctions screening as rule-based, never as AI.
- Do not imply that the illustrative sanctions list is official.
- Do not upload real customer or claim information.

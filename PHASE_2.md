# ERP Web Dashboard — Phase 2

## Goal

Extend the existing ERP-style web dashboard by introducing master data and enforcing a cross-entity business rule through proper backend validation and UI behavior.

This phase evaluates:

- Data modeling
- API design
- Server-side rule enforcement
- Clean architecture and separation of concerns
- Correct handling of business constraints

---

## Timebox

90 minutes

---

## Context

In manufacturing ERP systems, purchasing rules often depend on item attributes and vendor properties.

In this phase, you will introduce:

- An **Item Master**
- A **Vendor Master**
- A **Purchase Line creation feature**
- A mandatory business validation rule linking them

---

# Data Model Requirements

## 1) Item Master

Each item must include:

```json
{
  "partNumber": "string (unique)",
  "description": "string",
  "material": "METAL | PLASTIC | WOOD"
}
```

---

## 2) Vendor Master

Each vendor must include:

```json
{
  "vendorCode": "string (unique)",
  "name": "string",
  "address": "string",
  "province": "string (e.g. QC, ON, BC)"
}
```

---

## 3) Purchase Line

```json
{
  "id": "number",
  "partNumber": "string",
  "vendorCode": "string",
  "quantity": "number"
}
```

---

# Critical Business Rule (Mandatory)

> If an item has `material = "METAL"`,  
> it may only be purchased from vendors where `province = "QC"`.

This rule must be enforced:

- On the **server** (mandatory)
- In the **UI** (vendor filtering)
- Even if the UI is bypassed (API must reject invalid requests)

---

# Required API Endpoints

You must implement the following endpoints:

### GET /items  
Returns the list of items.

### GET /vendors  
Returns the list of vendors.

### POST /purchase-lines  
Creates a purchase line.

Example request body:

```json
{
  "partNumber": "MTL-1001",
  "vendorCode": "V-QC-01",
  "quantity": 10
}
```

### Validation Requirement

If:
- The selected item has `material = "METAL"`
- AND the selected vendor has `province != "QC"`

Then the API must:

- Return HTTP status `400`
- Return a clear message:

```json
{
  "message": "Metal items can only be purchased from Quebec vendors."
}
```

---

# UI Requirements

Create a minimal screen that allows:

- Selecting an item
- Selecting a vendor
- Entering a quantity
- Saving the purchase line

### UI Behavior

- When a METAL item is selected:
  - The vendor dropdown must show **Quebec vendors only**
- When a non-metal item is selected:
  - All vendors may be shown

### Error Handling

If the API rejects the request:

- Display the error clearly
- Do NOT clear the user’s input

---

# Debugging Requirement

The Debug panel must display:

- HTTP method
- URL
- Request payload
- Response status
- Response body

This is important for verifying rule enforcement.

---

# Seed Dataset

Use a small, realistic dataset (you may hard-code it for this exercise).

Example:

### Items

```json
[
  { "partNumber": "MTL-1001", "description": "Steel Pipe 3in", "material": "METAL" },
  { "partNumber": "MTL-2002", "description": "Aluminum Sheet", "material": "METAL" },
  { "partNumber": "PLS-3001", "description": "PVC Connector", "material": "PLASTIC" },
  { "partNumber": "PLS-3002", "description": "ABS Fitting", "material": "PLASTIC" },
  { "partNumber": "WOD-4001", "description": "Oak Panel", "material": "WOOD" }
]
```

### Vendors

```json
[
  { "vendorCode": "V-QC-01", "name": "Montreal Metals", "address": "Montreal", "province": "QC" },
  { "vendorCode": "V-QC-02", "name": "Quebec Industrial", "address": "Quebec City", "province": "QC" },
  { "vendorCode": "V-ON-01", "name": "Toronto Supply", "address": "Toronto", "province": "ON" },
  { "vendorCode": "V-BC-01", "name": "Vancouver Plastics", "address": "Vancouver", "province": "BC" }
]
```

---

# Deliverables

- Working backend validation
- Working UI behavior
- Clean API design
- Clear error messages
- A `NOTES.md` file explaining:
  1. Where and how the business rule is enforced
  2. Why server-side validation is necessary
  3. Any assumptions made

---

# Evaluation Focus

We are evaluating:

- Correctness of the business rule
- Server-side enforcement (mandatory)
- Code structure and organization
- Separation of concerns
- Maintainability and scalability thinking

UI polish is not important.  
Correct logic and clean architecture are.

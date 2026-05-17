# Protection Device Database — User Manual

This manual is written for engineers and technicians using the Protection Device Database day-to-day. It covers everything from signing in for the first time through to recording maintenance visits, running reports, and managing the system as an administrator.

---

## Contents

1. [Signing in](#1-signing-in)
2. [User roles](#2-user-roles)
3. [The dashboard](#3-the-dashboard)
4. [KKS codes explained](#4-kks-codes-explained)
5. [Adding a new relay](#5-adding-a-new-relay)
6. [Viewing a relay](#6-viewing-a-relay)
7. [Editing a relay](#7-editing-a-relay)
8. [Recording a maintenance visit](#8-recording-a-maintenance-visit)
9. [Viewing past maintenance records](#9-viewing-past-maintenance-records)
10. [Master settings](#10-master-settings)
11. [Protection elements and settings](#11-protection-elements-and-settings)
12. [Protection reports](#12-protection-reports)
13. [Analytics and reporting](#13-analytics-and-reporting)
14. [Admin — relay types](#14-admin--relay-types)
15. [Admin — type templates](#15-admin--type-templates)
16. [Admin — ANSI device numbers](#16-admin--ansi-device-numbers)
17. [Admin — user management](#17-admin--user-management)
18. [Admin — database administration](#18-admin--database-administration)

---

## 1. Signing in

Open the application in your browser and enter your email address and password. Click **Sign in**.

### Default administrator credentials

When the system is first set up, a default admin account is created:

| | |
|---|---|
| **Email** | `admin@admin.com` |
| **Password** | `Admin1234!` |

> **Change these immediately after first login.** Go to **User Admin**, click **Reset PW** next to the Administrator account, and set a strong password. You should also update the email address to a real one.

If you do not have an account, ask your administrator to create one for you.

To sign out, click your email address at the bottom of the left-hand sidebar, then click **Sign out**.

---

## 2. User roles

There are two roles in the system:

| Role | What they can do |
|---|---|
| **User** | View all relays, record maintenance visits, upload settings and test results, run analytics reports, browse protection reports |
| **Admin** | Everything a User can do, plus: manage relay types, manage type templates, manage ANSI codes, create and delete analytics reports, manage user accounts, backup and restore the database |

Your role is shown next to your name in the sidebar. Contact your administrator if you need your role changed.

---

## 3. The dashboard

After signing in you will land on the **Dashboard**. This is the central hub of the application.

**Device tree** — the main area shows all registered relays organised hierarchically:

```
Station (e.g. THI)
  └── Unit (e.g. 1)
        └── System (e.g. BBA)
              └── THI1BBA01AP001-EY01 — Distance Relay — Unit 1 Main Protection
```

Click on a station, unit, or system heading to collapse or expand that section. Click on a relay to go to its detail page.

**Search** — type any part of a KKS code, device type, location, or circuit into the search bar to filter the tree in real time.

**Quick action buttons** at the top of the page:

| Button | What it does |
|---|---|
| Link Relay | Register a new relay in the system |
| + New Relay Type | Add a relay type to the catalogue (admin) |
| Protection Report | Go to the protection report library |
| Master Settings | Upload settings for a relay |

---

## 4. KKS codes explained

Every relay in the system is identified by a **KKS code** — an international standard for labelling plant equipment by its location in the station hierarchy. The code is built from eight parts:

| Part | Example | Description |
|---|---|---|
| Station | `THI` | Three-letter station identifier |
| Unit | `1` | Unit number |
| System Code | `BBA` | Three-letter system identifier |
| System Number | `01` | System sequence number |
| Equipment Unit Code | `AP` | Two-letter equipment type |
| Equipment Number | `001` | Equipment sequence number |
| Component Code | `EY` | Two-letter component type |
| Component Number | `01` | Component sequence number |

These eight parts assemble into the full KKS code:

**`THI1BBA01AP001-EY01`**

When adding a relay, you enter each part separately using the KKS builder. The assembled code is shown in real time as you type. No two relays can share the same KKS code.

---

## 5. Adding a new relay

From the Dashboard, click **Link Relay**. The form has three sections:

### KKS Code

Enter the eight KKS parts one field at a time. The full assembled code is shown beneath the fields and updates as you type. See [KKS codes explained](#4-kks-codes-explained) above if you are unsure what each part represents.

### Device Details

| Field | Required | Notes |
|---|---|---|
| Part Number | Yes | Select from the relay type catalogue. Auto-fills Device Type and Firmware. |
| Device Type | Yes | Auto-filled from the part number. Can be edited if needed. |
| Firmware | No | Pre-filled from the catalogue entry. Update to match the actual installed firmware. |
| Serial Number | No | The relay's physical serial number. |
| Commissioning Date | Yes | Date the relay was commissioned. |
| Device Location | Yes | Physical location, e.g. "Unit 1 MCC Room" |
| Circuit | Yes | The circuit this relay protects, e.g. "11kV Feeder F1" |
| Linked Report | No | Optionally link this relay to a protection report from the library. |
| Maintenance Period | No | How many years between scheduled maintenance visits. Used by maintenance reports. |
| EIPC Required | No | Tick if this relay requires EIPC compliance testing. |

### Device-Specific Fields

If the selected relay type has a type template configured, additional fields will appear here. These capture information specific to that relay model — for example pickup current, CT ratio, or curve type. Fill in any that apply.

Click **Save Device** when done. You will be taken to the relay's detail page.

---

## 6. Viewing a relay

Click any relay in the dashboard tree to open its detail page. The page is divided into two columns.

**Left column:**

- **Device Information** — all details about the relay including any device-specific fields from the type template
- **Protection Elements** — quick link to the elements page
- **New Maintenance** — quick link to log a maintenance visit
- **Maintenance History** — a list of all past maintenance records with dates and notes. Click **View** to open a specific record.

**Right column:**

- **Master Settings** — the most recent settings revision on file, with a download link. Click **View all revisions** to see the full history.
- **Protection Report** — the report linked to this relay (if any), with a download link.
- **Manuals** — data sheets and manuals uploaded against this relay type.
- **Journal** — a chronological log of all activity on this relay (maintenance visits, settings uploads, manual notes).

---

## 7. Editing a relay

From the relay detail page, click the **Edit** button in the top right. All fields from the original form are editable including the KKS code, device details, and device-specific fields.

Click **Save Changes** to apply. The KKS code uniqueness check runs on save — if the new KKS is already taken by another relay, you will see an error.

---

## 8. Recording a maintenance visit

From the relay detail page, click **New Maintenance** (either the button in the top right or the link in the left column).

### Date

Defaults to today. Change if you are recording a visit that took place on a different date.

### Checks performed

Seven standard checkboxes covering the universal maintenance checks:

- Settings checked to master
- Onload check
- Trip function proved
- CT secondary insulation check
- VT secondary insulation check
- CT loop check
- VT loop check

Tick each check that was carried out during the visit.

### Device-specific fields

If this relay type has a type template with maintenance fields configured, they will appear here. Fill in the values recorded during the visit — for example, measured pickup current or time dial setting.

### Notes

Free-text area for any observations, findings, or actions taken during the visit.

Click **Save Record**. The visit is saved and a journal entry is automatically created for the relay.

After saving you can attach test result files to the record — see [Viewing past maintenance records](#9-viewing-past-maintenance-records) below.

---

## 9. Viewing past maintenance records

From the relay detail page, click **View** next to any record in the Maintenance History list.

The maintenance record page shows:

- **Checks performed** — each of the seven standard checks shown as a tick or cross
- **Device-specific data** — the values recorded during that visit
- **Notes** — any free-text observations
- **Test Result Files** — files attached to this record

### Attaching test result files

Scroll to the **Test Result Files** section and use the upload form to attach files. For each file, select a file type:

| Type | Use for |
|---|---|
| As-Left Settings | Settings printout as left after the visit |
| Electronic Test File | Electronic test equipment output file |
| Test Report | Formal test report document |
| Miscellaneous | Anything else |

Add an optional description, choose the file, and click **Upload**. Files can be downloaded or deleted from the same section.

---

## 10. Master settings

Master settings are the versioned configuration files for a relay — the official record of what the relay should be set to. Every time settings are revised, a new version is uploaded and all previous versions are kept.

### Uploading a new settings revision

From the relay detail page, click **View all revisions** in the Master Settings card, then click **+ Upload Revision**.

Fill in:

| Field | Notes |
|---|---|
| Revision | e.g. `Rev A`, `Rev 3` |
| Date | Date the revision was issued |
| Description | Brief description of what changed |
| File | The settings file (any format) |

Click **Upload**. The new revision appears at the top of the list with a **Latest** badge.

### Downloading settings

Click the **Download** link next to any revision to download that file. The most recent revision is also downloadable from the relay detail page without navigating to the full history.

---

## 11. Protection elements and settings

From the relay detail page, click **Protection Elements** to manage the protection functions configured on this relay.

### Adding an element

Use the form at the top of the page:

| Field | Notes |
|---|---|
| ANSI Device Number | Select from the standard ANSI library (e.g. `51` — Time Overcurrent) |
| Custom Name | Override or supplement the ANSI name, e.g. "Phase OC Zone 1" |
| Description | Optional description |

Click **Add Element**. The element appears in the list below.

### Enabling and disabling elements

Each element has an enable/disable toggle on the left side. Blue means enabled, grey means disabled. Click to toggle. Use this to reflect which functions are actually active on the relay.

### Editing an element

Click **Edit** on any element to change its custom name or description inline. Click **Save** to apply.

### Adding settings to an element

Click **Settings** on any element to expand its settings panel. Use the row at the bottom to add individual setting values:

| Field | Example |
|---|---|
| Setting Name | Pickup Current |
| Value | 1.2 |
| Unit | A |
| Description | Phase overcurrent pickup |

Click **+ Add Setting**. Settings can be edited or deleted inline from the same panel.

### Deleting an element

Click **Delete** on any element. You will be asked to confirm before it is removed along with all its settings.

---

## 12. Protection reports

Protection reports are standalone documents — system protection philosophy documents, coordination studies, or protection reports — that can be uploaded to the library and optionally linked to one or more relays.

### Accessing the report library

Click **Reports** in the left sidebar.

### Uploading a report

Click **+ Upload Report** and fill in:

| Field | Notes |
|---|---|
| Title | Full report title |
| Report Number | Document number, e.g. `PRO-2024-001` |
| Revision | e.g. `Rev A` |
| Date | Issue date |
| File | The report document (any format) |
| Description | Brief summary of the report's contents |

Click **Upload**.

### Downloading a report

Click the **Download** button next to any report in the table, or click the title.

### Linking a report to a relay

When adding or editing a relay, select the report from the **Linked Report** dropdown in the Device Details section. A relay can be linked to one report. The linked report then appears on the relay's detail page with a download link.

### Deleting a report

Click **Delete** next to the report. The report document is permanently removed. Any relays linked to it will have their report link cleared.

---

## 13. Analytics and reporting

The Analytics page lets you run reports across the entire device fleet. Click **Analytics** in the sidebar.

### Available report types

| Report | What it shows |
|---|---|
| **Device Inventory** | All relays grouped by station, part number, and firmware version. Optional station filter. |
| **Maintenance Due** | Relays that are overdue for maintenance based on their maintenance period setting. |
| **Maintenance Upcoming** | Relays whose next maintenance falls within a chosen number of months. |
| **Maintenance History** | All maintenance records between two dates. |
| **EIPC Compliance** | All EIPC-required relays and their last maintenance date. |
| **Protection Elements** | ANSI protection elements in use across the fleet with device counts. |
| **Protection Elements per Relay** | All elements and applied settings for each relay. Can be filtered to a single relay or station. |
| **Firmware Search** | Find relays matching a firmware string. Partial match — searching `R31` will find `R311`, `R312`, etc. |

### Running a report

Click the **Run** button on any saved report card. Results appear below the card as a table. A summary line above the table shows how many rows were returned.

Overdue maintenance entries are highlighted in red.

### Exporting to CSV

After running a report, click **Export CSV** to download the results as a spreadsheet.

### Creating a report (admin only)

Click **+ New Report** and fill in:

- **Report Name** — a descriptive name, e.g. "Q1 Overdue Maintenance"
- **Report Type** — select from the list above
- **Description** — optional notes about the report's purpose
- **Filter fields** — these vary by report type:
  - Station filter (Device Inventory, Elements per Relay)
  - Single relay dropdown (Elements per Relay)
  - Look-ahead window in months (Maintenance Upcoming — default 3)
  - Date range (Maintenance History)
  - Firmware string (Firmware Search)

Click **Create Report**. The report is saved and available for any user to run.

### Deleting a report (admin only)

Click **Delete** on any report card. This removes the saved report definition — it does not affect the underlying device or maintenance data.

---

## 14. Admin — relay types

The relay type catalogue defines the models available when registering a relay. Click **Relay Types** in the sidebar (admin only).

### Adding a relay type

Click **+ New Relay Type** and fill in the details:

| Field | Notes |
|---|---|
| Part Number | Manufacturer's part number, e.g. `SEL-311L` |
| Device Type | Category, e.g. "Line Distance Relay" |
| Relay Type | Technology: Electromechanical, Electronic, or Microprocessor |
| Description | Optional notes about the model |
| Firmware | Default firmware version |
| Nominal Supply Voltage | e.g. `110V DC` |
| Nominal CT Input | e.g. `1A` or `5A` |
| Nominal VT Input | e.g. `110V` |
| Stock Number | Internal stock or procurement reference |

### Uploading manuals

When editing a relay type, you can upload data sheets and manuals under the **Manuals** section. These files appear on the detail page of every relay of that type.

### Deleting a relay type

Click **Delete** on a relay type. This will fail if there are relays registered against that part number — reassign or remove those relays first.

---

## 15. Admin — type templates

Type templates define extra fields that appear on maintenance forms and device detail pages for a specific relay type. This lets you capture relay-specific data — for example, the measured pickup current for an overcurrent relay, or the CT ratio for a differential relay.

Click **Type Templates** in the sidebar (admin only).

### Creating a template

Click **+ New Template** (labelled "Extend Type"). Select the relay type (part number) from the dropdown. The device type label auto-fills.

Use the **Maintenance Form Fields** editor to define the extra fields:

| Column | Notes |
|---|---|
| Key | Internal identifier, e.g. `pickup_current`. Spaces are converted to underscores. |
| Label | What the user sees on the form, e.g. "Pickup Current (A)" |
| Type | `text`, `number`, `date`, `select`, `checkbox`, or `textarea` |
| Required | Whether the field must be filled in |

For **select** type fields, add the available options after setting the type.

The **Key** field has a suggestion list — if you type a key that already exists in another template, it will suggest it and auto-fill the label. This keeps common fields (e.g. `ct_ratio`) consistent across relay types.

Click **Save Template** when done.

### Where template fields appear

- **Device detail page** — under Device Information, showing the values recorded against the relay
- **Edit device page** — under Device-Specific Fields, where values can be updated
- **New maintenance page** — under Device-Specific Fields, capturing per-visit readings

### Editing a template

Click **Edit** on any template. Changes to the field schema take effect immediately — existing saved values are preserved by key name.

---

## 16. Admin — ANSI device numbers

The ANSI device number library is the reference list of standard protection element codes (e.g. `21` — Distance Relay, `51` — Time Overcurrent, `87L` — Line Differential). This library is used when assigning protection elements to relays.

Click **ANSI Codes** in the sidebar.

Admins can add, edit, and delete entries. The library comes pre-seeded with the most common ANSI C37.2 device numbers. Add custom entries for non-standard or site-specific elements.

---

## 17. Admin — user management

Click **User Admin** in the sidebar (admin only).

### Adding a user

Click **+ Add User** and fill in the name, email, password, and role. Click **Create User**.

The new user can sign in immediately with the email and password you set. Share the credentials with them directly — there is no automated welcome email.

### Changing a user's role

Click **Role** next to any user, select the new role from the dropdown, and click **Save**.

### Resetting a password

Click **Reset PW** next to the user, enter a new password (minimum 6 characters), and click **Set Password**. Share the new password with the user directly.

### Deleting a user

Click **Delete** next to the user and confirm. This cannot be undone.

---

## 18. Admin — database administration

Click **Database Admin** in the sidebar (admin only).

This page manages the database and all uploaded files as a single unit.

### Taking a backup

Click **Download Backup**. A `.zip` file is downloaded containing:
- The complete database (`app.db`)
- All uploaded files — protection reports, master settings, test results, and manuals

**Store this file somewhere safe off the Raspberry Pi** — a network drive, USB stick, or cloud storage. This zip is your complete recovery point. If the Pi fails or the SD card is corrupted, this is what you restore from.

**Recommended:** take a backup before making any large changes (bulk imports, database clear, system upgrades).

### Restoring from a backup

Click **Restore from Backup**, choose a `.zip` file created by the Download Backup button, and click **Restore from Backup**. The system will:

1. Validate the zip contains a valid database
2. Replace the current database with the backed-up version
3. Replace all uploaded files with those from the backup
4. Redirect you to the dashboard

> This overwrites everything. Take a fresh backup first if you want to preserve the current state before restoring.

### Clearing the database

Type `CLEAR` into the confirmation box and click **Clear All Data**. This permanently deletes:

- All relays and their maintenance records, settings, elements, and log entries
- All protection reports
- All form templates and relay type definitions

**What is preserved:** user accounts and the ANSI device number library.

This cannot be undone. Take a backup first.

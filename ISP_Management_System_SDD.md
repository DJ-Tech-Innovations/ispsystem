# ISP Management System

## Software Design Document (SDD) and MVP Implementation Plan

**Prepared by:** DJ Tech Innovations\
**Project type:** Full-stack web application\
**Target market:** Startup and local Internet Service Providers (ISPs)
in the Philippines\
**Deployment target:** Laravel Cloud\
**Document status:** Proposed baseline for requirements validation

------------------------------------------------------------------------

## 1. Executive Summary

The ISP Management System is a web-based operations platform that
centralizes subscriber registration, subscription management,
installation tracking, recurring billing, payment monitoring, customer
communications, and technical support ticketing.

The first release (MVP) is intended for a startup ISP serving a local
area. It should be simple to operate, quick to deploy, secure, and
extensible. The application will also include a professional
public-facing business website at no additional development cost as part
of the proposed package.

The MVP will not attempt to replace router, OLT, or network monitoring
systems. Network-device integration, automated bandwidth provisioning,
payment gateway checkout, SMS delivery, and advanced accounting are
future enhancements unless separately prioritized.

### Product goals

1.  Maintain one reliable subscriber database.
2.  Track each subscriber from inquiry and registration through
    installation, activation, billing, suspension, and termination.
3.  Generate recurring monthly invoices and track balances.
4.  Notify customers through email, with SMS as an optional channel.
5.  Give support staff a ticketing workflow with ownership, priority,
    status, and history.
6.  Provide customers with a portal to view account information,
    invoices, payments, and support tickets.
7.  Give the ISP a professional website with service plans and
    contact/inquiry options.
8.  Keep the architecture ready for future growth and possible
    multi-tenant SaaS conversion.

## 2. Scope

### 2.1 MVP --- included

-   Admin and staff authentication
-   Role-based access control
-   Dashboard and operational summaries
-   Customer/subscriber records
-   Service plans and subscription records
-   Installation requests and scheduling
-   Subscription activation and status history
-   Monthly invoice generation
-   Due dates, balances, and payment recording
-   Printable/downloadable invoice or statement
-   Email notifications and configurable templates
-   Ticketing system and ticket comments
-   Customer portal
-   Public ISP website and inquiry form
-   Activity/audit history for important operations
-   CSV export for key lists
-   Responsive desktop and mobile layouts

### 2.2 Optional MVP enhancement

-   SMS notifications through a third-party SMS gateway
-   Email delivery status tracking, where supported by the mail provider
-   Customer payment proof upload
-   Basic collection report

SMS must be implemented behind a notification interface so that the
application can launch with email only and add an SMS provider later
without redesigning the billing workflow.

### 2.3 Out of scope for the first release

-   Automatic router/OLT provisioning
-   Bandwidth profile changes and speed enforcement
-   SNMP/network monitoring
-   Automated service disconnection/reconnection through network
    equipment
-   Online payment gateway integration
-   Full accounting/general ledger
-   Inventory and warehouse management
-   Field technician GPS tracking
-   Native Android/iOS applications
-   Advanced multi-branch and multi-tenant SaaS billing

These items should be considered in a later roadmap after the ISP
validates its actual operating procedures.

## 3. User Roles and Permissions

Use role-based access control. Permissions should be assigned to roles
rather than hard-coded throughout controllers.

  -----------------------------------------------------------------------
  Role                                Main responsibilities
  ----------------------------------- -----------------------------------
  Owner / Super Admin                 Full access, configuration, users,
                                      reports, financial overview

  Administrator                       Subscriber, plans, billing,
                                      payments, tickets, and operations

  Billing Staff                       Invoices, payments, balances,
                                      collection reports

  Customer Service                    Subscriber profiles, inquiries,
                                      tickets, account notes

  Technician                          Assigned installation jobs and
                                      technical tickets

  Subscriber                          Own profile, subscription,
                                      invoices, payment history, tickets
  -----------------------------------------------------------------------

Important authorization rules:

-   Staff may only access modules permitted by their role.
-   A subscriber must only see their own account, invoices, payments,
    and tickets.
-   A technician should only see assigned work unless granted broader
    access.
-   Financial actions such as voiding a payment or adjusting an invoice
    must be permission-controlled and audited.
-   Do not physically delete financial records. Use void, reversal, or
    cancellation workflows with a reason and audit trail.

## 4. Functional Requirements

### 4.1 Dashboard

Display operational information relevant to the signed-in role.

Suggested administrator metrics:

-   Total subscribers
-   Active subscribers
-   Pending installations
-   Suspended subscribers
-   Invoices generated this month
-   Total outstanding balance
-   Payments collected this month
-   Open and overdue support tickets
-   Upcoming invoice due dates

Dashboard figures must be calculated from database records. Do not store
dashboard totals as manually editable values.

### 4.2 Customer and Subscriber Management

A customer is the person or organization. A subscription is the service
agreement associated with that customer. Keep these concepts separate so
a customer can eventually have multiple service addresses or
subscriptions.

Suggested customer fields:

-   Customer reference number (system-generated)
-   First name and last name, or organization name
-   Email address
-   Mobile number
-   Alternate contact number
-   Billing address
-   Service address
-   Landmark / installation notes
-   Account notes
-   Customer type: residential or business
-   Date registered
-   Created by
-   Account status

Support duplicate checks using configurable combinations of mobile
number, email, and name. Do not rely on name alone as a unique
identifier.

Customer lifecycle:

`Inquiry → Registered → For Installation → Active → Suspended → Terminated`

Not every customer must follow every step. Maintain a status history
with timestamp, actor, old status, new status, and reason.

### 4.3 Service Plans

Administrators can configure plans without changing code.

Plan fields:

-   Plan name and code
-   Description
-   Download/upload speed description
-   Monthly recurring price
-   Installation fee
-   One-time or recurring fee indicator
-   Billing cycle (MVP: monthly)
-   Plan status: active/inactive
-   Public display flag
-   Sort order

Do not overwrite historical subscription prices when a plan price
changes. Store the agreed recurring price on the subscription so
existing subscribers retain their contracted price unless staff
explicitly updates it.

### 4.4 Subscription Management

A subscription connects a customer to a service plan and service
address.

Fields:

-   Subscription reference number
-   Customer
-   Service plan
-   Service address
-   Start/activation date
-   Billing start date
-   Billing day or next billing date
-   Agreed monthly amount
-   Installation fee
-   Deposit, if applicable
-   Status
-   Internal notes

Statuses:

-   Pending
-   For Installation
-   Active
-   Suspended
-   Cancelled
-   Terminated

Every status change must be recorded in subscription history.

### 4.5 Installation Management

Track installation work before a subscription becomes active.

Fields:

-   Installation reference
-   Customer and subscription
-   Installation address
-   Preferred schedule
-   Assigned technician
-   Job status
-   Notes and completion remarks
-   Actual completion date
-   Optional attachment/photo

Statuses:

`Pending → Scheduled → Assigned → In Progress → Completed`

Additional outcomes: Rescheduled, Cancelled, On Hold.

MVP behavior:

1.  Staff creates an installation job.
2.  Staff selects a preferred date and technician.
3.  Technician sees assigned jobs.
4.  Technician updates progress and adds remarks.
5.  Authorized staff confirms completion.
6.  Subscription can then be activated and billing can begin according
    to its billing start date.

Do not automatically activate a subscription merely because an
installation appointment was created.

### 4.6 Billing and Invoice Management

Billing is a critical module and must be implemented with careful date
and duplicate protection.

MVP billing rules:

-   Monthly recurring billing.
-   Configurable default billing day and payment due period.
-   Subscription-specific billing start date.
-   Proration can be excluded from MVP and handled manually through an
    adjustment line.
-   Generate invoices for eligible active subscriptions.
-   Do not generate invoices for terminated subscriptions.
-   Suspension billing behavior must be configurable and explicitly
    agreed with the ISP.
-   Every invoice must have a unique invoice number.
-   Re-running a billing command must not create duplicate invoices for
    the same subscription and billing period.

Invoice fields:

-   Invoice number
-   Customer and subscription
-   Billing period start/end
-   Issue date
-   Due date
-   Line items
-   Subtotal
-   Discount or adjustment
-   Tax, if applicable and configured
-   Total amount
-   Amount paid
-   Balance
-   Status
-   Notes

Invoice statuses:

-   Draft
-   Unpaid
-   Partially Paid
-   Paid
-   Overdue
-   Void

Recommended invoice generation approach:

1.  A scheduled Laravel command runs daily.
2.  It finds subscriptions eligible for billing on that date.
3.  It checks whether an invoice already exists for the subscription and
    billing period.
4.  It creates the invoice and invoice items in a database transaction.
5.  It queues an invoice email.
6.  It records generation results for monitoring and retry.

Use a unique database constraint for subscription plus billing period.
Application-level checks alone are not sufficient to prevent duplicates
during concurrent execution.

### 4.7 Payment Management

For the MVP, staff can record payments received through cash, bank
transfer, e-wallet, or other accepted methods.

Payment fields:

-   Payment reference
-   Customer
-   Invoice allocation
-   Payment date/time
-   Amount
-   Payment method
-   External reference / receipt number
-   Received by
-   Notes
-   Optional proof-of-payment attachment

Support partial payments and one payment allocated across multiple
invoices only if the ISP confirms that workflow. For the simplest MVP,
begin with one payment applied to one invoice.

Rules:

-   A payment must not exceed the outstanding invoice balance unless an
    approved overpayment workflow is implemented.
-   Recalculate invoice balance from payment allocations.
-   Payment reversal must require a reason and permission.
-   Never silently edit or delete a confirmed payment.
-   Maintain a printable receipt.

### 4.8 Automated Notifications

#### Email --- MVP

Use Laravel's mail system with a production SMTP or transactional email
provider.

Notification events:

-   Customer registration confirmation
-   Installation schedule confirmation
-   Installation reschedule
-   Subscription activation
-   Invoice generated
-   Invoice due reminder
-   Invoice overdue reminder
-   Payment confirmation / receipt
-   Account suspension notice
-   Ticket created
-   Ticket status update
-   Ticket reply

Provide editable templates with the ISP's logo, business name, contact
information, and support details.

#### SMS --- optional

Use a provider adapter rather than coupling the application to one
vendor.

Potential SMS events:

-   Invoice due reminder
-   Payment confirmation
-   Installation schedule
-   Service suspension warning
-   Important service announcement
-   Ticket update

SMS should be disabled by default until the ISP selects a provider,
sender ID (if supported), budget, and consent/notification policy.

#### Notification controls

-   Customer communication preferences
-   Email/SMS channel enablement
-   Queue-based sending
-   Retry handling for temporary failures
-   Delivery status where provider supports it
-   Notification log with recipient, event, channel, status, and
    timestamp

Do not send notifications inside long-running web requests. Queue them.

### 4.9 Ticketing and Technical Support

The ticketing system is part of the MVP.

Ticket categories:

-   No Internet Connection
-   Slow Internet
-   Intermittent Connection
-   Billing Concern
-   Installation Concern
-   Plan Upgrade / Downgrade
-   Account Concern
-   Other

Ticket fields:

-   Ticket number
-   Customer
-   Related subscription
-   Category
-   Subject
-   Description
-   Priority: Low, Normal, High, Urgent
-   Status
-   Assigned staff/technician
-   Created date
-   First response date
-   Resolved date
-   Resolution notes

Ticket statuses:

`Open → In Progress → Waiting for Customer → Resolved → Closed`

Allow reopening based on a configurable policy.

Ticket functionality:

-   Customer creates a ticket through the customer portal.
-   Staff creates a ticket on behalf of a customer.
-   Staff assigns a ticket to a technician or support agent.
-   Staff and customer exchange replies.
-   Internal notes are visible only to authorized staff.
-   Attachments can be uploaded with file type and size restrictions.
-   Ticket history records assignments, status changes, and replies.
-   Email notification is sent when a ticket is created or receives a
    reply.

Do not expose internal notes in customer-facing views or email
notifications.

### 4.10 Customer Portal

A responsive portal where subscribers can:

-   Sign in securely
-   View their profile and service address
-   View active subscription and plan
-   View current and previous invoices
-   Check outstanding balance and due dates
-   View payment history and download receipts
-   Create support tickets
-   Reply to tickets
-   Update permitted contact information
-   Manage notification preferences

The portal must enforce ownership at the query/policy level. Never trust
a customer ID supplied by the browser.

### 4.11 Public Business Website --- Included

A professional website for the ISP, using the same brand identity but a
separate public-facing layout.

Suggested pages:

1.  Home
2.  About Us
3.  Internet Plans
4.  Coverage Area
5.  Frequently Asked Questions
6.  Contact Us
7.  Customer Login

Homepage content:

-   Hero section with a clear internet-service value proposition
-   Available plans and pricing
-   Coverage/location information
-   Benefits and service highlights
-   How to subscribe
-   Contact details and inquiry form
-   Customer portal login link

Admin users should be able to update plan display, basic page content,
contact details, and announcements without editing source code.

The website inquiry form should create a lead/inquiry record in the
admin system. It must not automatically create an active subscriber.

## 5. Proposed Technology Stack

  -----------------------------------------------------------------------
  Layer                               Technology
  ----------------------------------- -----------------------------------
  Backend                             Laravel 13, subject to hosting
                                      compatibility

  Language                            PHP version supported by selected
                                      Laravel release and Laravel Cloud

  Frontend                            React + Inertia.js

  UI                                  Tailwind CSS + shadcn/ui

  Database                            PostgreSQL

  Authentication                      Laravel authentication with secure
                                      session handling

  Authorization                       Spatie Laravel Permission or
                                      equivalent policies/roles

  Queue                               Laravel Queue

  Scheduler                           Laravel Scheduler

  Email                               Laravel Mail + transactional SMTP
                                      provider

  SMS                                 Optional provider integration

  File storage                        Laravel Cloud-compatible object
                                      storage

  Testing                             Pest or PHPUnit

  Deployment                          Laravel Cloud

  Source control                      GitHub or Bitbucket
  -----------------------------------------------------------------------

**Architecture recommendation:** A modular monolith. Keep one Laravel
application and one primary database for the MVP. Organize code by
business domain rather than creating microservices. This is faster to
build, easier to deploy, and appropriate for an early-stage ISP.

Confirm the selected Laravel/PHP versions against Laravel Cloud's
current runtime support before project initialization.

## 6. High-Level Architecture

``` text
Public Website             Admin Application             Customer Portal
      |                           |                            |
      +---------------------------+----------------------------+
                                  |
                           Laravel + Inertia
                                  |
        +-------------------------+-------------------------+
        |             |           |           |             |
    Customers     Subscriptions  Billing    Tickets     Installations
        |             |           |           |             |
        +-------------------------+-------------------------+
                                  |
                         PostgreSQL Database
                                  |
                 +----------------+----------------+
                 |                |                |
              Queue           Scheduler         Storage
                 |                |                |
           Email / SMS      Monthly Billing    Documents
```

## 7. Proposed Database Design

Use UUID or ULID primary keys if consistent with the project's
conventions. Use foreign keys, indexes, decimal monetary columns, and
explicit timestamps.

Core tables:

  Table                      Purpose
  -------------------------- ---------------------------------------
  users                      Staff and customer login accounts
  roles / permissions        Role-based access
  customers                  Customer identity and contact details
  service_plans              ISP packages and pricing
  subscriptions              Customer service agreements
  subscription_histories     Status and plan change history
  installation_jobs          Installation scheduling and work
  invoices                   Billing headers
  invoice_items              Invoice line items
  payments                   Payment records
  payment_allocations        Payment-to-invoice allocation
  tickets                    Support cases
  ticket_messages            Public replies and internal notes
  ticket_attachments         Ticket file metadata
  notification_logs          Email/SMS activity
  notification_preferences   Customer channel preferences
  leads                      Public website inquiries
  announcements              Website/customer announcements
  activity_logs              Important user/system activity
  settings                   Business and billing configuration

### Key relationships

-   Customer has many subscriptions.
-   Customer has many invoices, payments, and tickets.
-   Subscription belongs to a customer and a service plan.
-   Subscription has many installation jobs, invoices, and history
    records.
-   Invoice has many invoice items and payment allocations.
-   Payment has one or more allocations, depending on the approved MVP
    workflow.
-   Ticket belongs to a customer and may reference a subscription.
-   Ticket has many messages and attachments.
-   User may be assigned to many installation jobs and tickets.

### Important database constraints

-   Unique customer reference number.
-   Unique subscription reference number.
-   Unique invoice number.
-   Unique invoice per subscription and billing period.
-   Unique ticket number.
-   Foreign keys on all important relationships.
-   Index customer mobile/email, subscription status, invoice due
    date/status, ticket status/priority, and assignment fields.
-   Store monetary values in `DECIMAL`, never floating-point columns.
-   Store timestamps consistently and display them in the ISP's
    configured timezone.

## 8. Application Structure

Suggested domain-oriented structure:

``` text
app/
├── Domain/
│   ├── Customers/
│   ├── Subscriptions/
│   ├── Installations/
│   ├── Billing/
│   ├── Payments/
│   ├── Tickets/
│   └── Notifications/
├── Http/
│   ├── Controllers/
│   ├── Requests/
│   └── Middleware/
├── Jobs/
├── Mail/
├── Notifications/
├── Policies/
├── Services/
└── Console/
```

Use:

-   Form Requests for validation.
-   Policies for authorization.
-   Actions/services for important business operations.
-   Jobs for email, SMS, and long-running tasks.
-   Events/listeners where they improve separation.
-   Database transactions for invoice creation, payment allocation, and
    status transitions.
-   Automated tests for billing, payment, access control, and ticket
    visibility.

Avoid building a generic framework inside the application. Keep
abstractions proportional to the MVP.

## 9. UI / Brand Identity

### Recommended palette: Deep Teal + Warm Amber

Avoid the dominant red, blue, and green identities commonly associated
with major Philippine telcos. Use a distinct, modern technology brand.

  Token           Color       Usage
  --------------- ----------- ------------------------------
  Primary         `#123B3A`   Navigation, primary actions
  Primary light   `#1D5A55`   Hover and secondary surfaces
  Accent          `#F2B84B`   Highlights, calls to action
  Background      `#F6F7F3`   Main application background
  Surface         `#FFFFFF`   Cards and forms
  Text            `#182625`   Main text
  Muted           `#71817D`   Secondary text
  Success         `#27845B`   Paid, completed, active
  Warning         `#D99528`   Due soon, pending
  Danger          `#C65353`   Overdue, failed, urgent

Brand direction: professional, approachable, dependable, and
community-oriented. The amber accent provides contrast without making
the interface look like a copy of a major telecom provider.

### UI guidelines

-   Desktop-first admin dashboard, responsive on mobile.
-   Sidebar navigation for staff.
-   Clear tables with search, filters, pagination, and bulk actions
    where safe.
-   Consistent status badges.
-   Confirmation dialogs for financial and destructive actions.
-   Accessible contrast and keyboard-friendly forms.
-   Separate visual layouts for public website, admin, and customer
    portal.

## 10. Main Workflows

### Subscriber onboarding

``` text
Website Inquiry / Walk-in
          |
     Create Lead
          |
   Staff Contacts Lead
          |
   Register Customer
          |
   Select Service Plan
          |
 Create Subscription
          |
 Schedule Installation
          |
 Assign Technician
          |
 Installation Completed
          |
 Activate Subscription
          |
 Begin Billing Cycle
```

### Monthly billing

``` text
Daily Scheduled Billing Command
          |
Find Eligible Subscriptions
          |
Check Billing Period / Duplicate
          |
Create Invoice + Invoice Items
          |
Queue Invoice Email
          |
Track Due Date and Balance
          |
Payment Recorded
          |
Allocate Payment
          |
Update Invoice Status
          |
Send Receipt
```

### Technical support

``` text
Customer Creates Ticket
          |
Ticket Number Generated
          |
Email Acknowledgement
          |
Assign Support Staff
          |
Investigate / Add Replies
          |
Waiting for Customer (if needed)
          |
Resolve Ticket
          |
Customer Confirms / Policy Closes
```

## 11. Non-Functional Requirements

### Security

-   HTTPS in production.
-   Secure password hashing and session cookies.
-   CSRF protection.
-   Rate limiting on login and public forms.
-   Role and resource-level authorization.
-   Strict customer data isolation.
-   Validate and restrict uploaded files.
-   Protect secrets using environment configuration.
-   Audit sensitive financial and account changes.
-   Regular database backups and a tested restore procedure.

### Performance and reliability

-   Paginate large subscriber, invoice, and ticket lists.
-   Add database indexes based on query patterns.
-   Queue email and SMS delivery.
-   Make scheduled billing idempotent.
-   Log failed jobs and provide retry/monitoring procedures.
-   Avoid N+1 queries.
-   Define retention and backup policies with the ISP.

### Privacy and compliance

-   Collect only information required to provide and administer the
    service.
-   Define who can access subscriber personal information.
-   Publish a privacy notice and customer-facing terms.
-   Establish retention and deletion procedures.
-   Review applicable Philippine Data Privacy Act requirements and
    applicable BIR invoicing/recordkeeping requirements with the ISP's
    accountant or legal adviser before production use.
-   Do not assume that a generated application invoice automatically
    satisfies all current tax invoice requirements.

## 12. MVP Development Roadmap

The following is an aggressive solo-developer estimate, assuming
requirements and sample workflows are confirmed quickly.

  Phase   Scope                                                    Estimate
  ------- ----------------------------------------------------- -----------
  1       Project setup, authentication, roles, design system     1--2 days
  2       Customers, plans, subscriptions                         2--3 days
  3       Installation management                                 1--2 days
  4       Invoices, recurring billing, payments                   3--4 days
  5       Email notifications and templates                       1--2 days
  6       Ticketing system                                        2--3 days
  7       Customer portal and public website                      2--3 days
  8       Testing, bug fixing, deployment                         2--3 days

**Estimated MVP: 14--22 working days.**

This estimate assumes a focused first release, limited revisions, and no
router/OLT integration. A shorter timeline is possible only by reducing
scope or accepting greater delivery risk. Do not skip billing and
authorization tests to meet a deadline.

## 13. MVP Acceptance Criteria

The MVP is ready for pilot use when:

1.  Staff can create and manage customers.
2.  Staff can configure plans and assign them to subscriptions.
3.  Staff can schedule and complete installations.
4.  Authorized staff can activate, suspend, and terminate subscriptions.
5.  The billing scheduler generates the correct invoice for eligible
    subscriptions.
6.  Re-running billing does not generate duplicate invoices.
7.  Staff can record full and partial payments and view accurate
    balances.
8.  Customers receive configured email notifications.
9.  Staff and customers can create and update tickets according to
    permissions.
10. Customers cannot access another customer's records.
11. The public website displays ISP information and service plans.
12. The application is deployed over HTTPS with production backups,
    queue processing, scheduler execution, and error monitoring
    configured.

## 14. Laravel Cloud Deployment Plan

Production services to plan for:

-   Laravel application environment.
-   Managed PostgreSQL database.
-   Persistent object storage for attachments and documents.
-   Queue worker for email and notification jobs.
-   Scheduler execution for recurring billing and reminders.
-   Production mail provider.
-   Optional SMS provider credentials.
-   Application logs and error monitoring.
-   Database backup and restore procedure.
-   Domain and HTTPS configuration.

Deployment checklist:

1.  Create production environment and configure secrets.
2.  Provision database and storage.
3.  Configure queue connection and worker.
4.  Configure scheduler.
5.  Run migrations as a controlled deployment step.
6.  Seed only safe production defaults.
7.  Configure mail and verify delivery.
8.  Test invoice generation in a controlled pilot.
9.  Test queue retries and failed-job handling.
10. Verify backups and restoration.
11. Configure domain, HTTPS, and production error monitoring.

Verify current Laravel Cloud service limits, runtime compatibility,
scheduler/worker configuration, and storage options before finalizing
the deployment budget.

## 15. Future Roadmap

### Phase 2 --- ISP Operations

-   SMS gateway integration.
-   Payment gateway integration.
-   Payment proof submission and verification.
-   Technician mobile-friendly job workflow.
-   Service outage announcements.
-   Coverage map and availability checking.
-   More detailed collection and revenue reports.

### Phase 3 --- Network Automation

-   MikroTik RouterOS API integration.
-   PPPoE account management.
-   Automatic profile provisioning.
-   Bandwidth plan synchronization.
-   Automated suspension and reconnection, with safeguards.
-   OLT/ONU integration where supported by the ISP's equipment.
-   Network usage and uptime monitoring.

### Phase 4 --- SaaS Productization

-   Multi-tenant architecture.
-   Tenant-specific branding and domains.
-   Subscription plans for ISP businesses.
-   Tenant billing and usage limits.
-   Platform-level administration.
-   Tenant-level data isolation and audit controls.

Do not implement multi-tenancy prematurely unless the first client has
confirmed that multiple ISP organizations must use the same deployment.
Build clean domain boundaries now so a later SaaS conversion is
manageable.

## 16. Key Decisions Required Before Development

The following operational decisions materially affect the database and
billing implementation:

1.  **Billing basis:** Is the customer billed on a fixed calendar date,
    the installation/activation anniversary, or a common billing date?
2.  **First invoice:** Is the first month charged in full, prorated, or
    collected upon installation?
3.  **Suspension:** After how many unpaid days should an account be
    marked overdue or suspended? Is suspension manual or automatic?
4.  **Payment methods:** Cash only, or also GCash, Maya, bank transfer,
    and other channels?
5.  **Customer access:** Should customers be able to submit payment
    proof online?
6.  **Installation:** Does the ISP have technicians who need individual
    accounts and job assignments?
7.  **Notifications:** Which email address/domain will send official
    notifications? Which SMS provider, if any, is preferred?
8.  **Network equipment:** Is the ISP using MikroTik, Ubiquiti, Huawei,
    ZTE, or another platform? This is needed for future automation, not
    for the initial CRM MVP.

## 17. Recommended Development Strategy

Use a spec-driven workflow:

1.  Confirm business rules and sample documents with the ISP.
2.  Finalize this SDD and write testable acceptance criteria.
3.  Create an entity relationship diagram and database migrations plan.
4.  Build the project foundation and reusable UI components.
5.  Implement one complete vertical workflow at a time.
6.  Write tests alongside billing, payment, authorization, and ticket
    features.
7.  Demonstrate each module to the ISP and obtain feedback.
8.  Deploy a pilot with a small number of real subscribers.
9.  Fix operational issues before enabling automated billing for
    everyone.

**Recommended build order:** Customers → Plans → Subscriptions →
Installations → Billing → Payments → Email → Tickets → Customer Portal →
Public Website → Production deployment.

------------------------------------------------------------------------

## Appendix A --- Initial MVP Assumptions

Unless changed during discovery, use these assumptions to keep
development moving:

-   One ISP organization in the initial deployment.
-   One primary business location.
-   Monthly recurring subscription plans.
-   Philippine peso (PHP) as the default currency.
-   Asia/Manila timezone.
-   Email notifications enabled.
-   SMS integration deferred behind an adapter.
-   Staff-recorded payments for the first release.
-   No automatic network-device provisioning.
-   No online payment gateway in MVP.
-   One customer can have multiple subscriptions in the data model.
-   Invoice and payment records are retained with audit history.

## Appendix B --- Definition of Done for Each Module

A module is considered complete only when:

-   Database migrations and relationships are implemented.
-   Validation and authorization are implemented.
-   Main create, view, update, and permitted status workflows work.
-   Empty, loading, validation-error, and success states are handled.
-   Search, filters, and pagination are provided where relevant.
-   Important actions are logged.
-   Automated tests cover critical business rules.
-   The module has been reviewed in the browser at desktop and mobile
    widths.
-   No critical errors remain in application logs.

**End of document.**

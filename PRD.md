# PRD - Date Planner Application

## 1. Overview

### Purpose

Private Date Planner is a responsive web application designed to help a
couple create, manage, execute, and preserve date experiences.

The application solves the problem of manually organizing date
activities, losing track of previous experiences, and having no
structured way to remember places, activities, and moments from previous
dates.

### Main Goal

The goal of the system is to provide a simple workflow:

Create a date plan → Execute the timeline → Record memories → Save
history → Use previous memories as references for future dates.

### Target Users

The application is designed for private usage by one couple. There is no
public user system and no authentication.

------------------------------------------------------------------------

## 2. Requirements

### Platform

-   Responsive web application.
-   Optimized for desktop, tablet, and mobile browser usage.
-   Touch-friendly interface for mobile usage during dates.

### User Type

-   Single private instance.
-   No authentication.
-   No user roles.
-   All data belongs to one private environment.

### Technology Constraint

Frontend: - Next.js - Tailwind CSS - shadcn/ui

Backend: - Supabase Database - Supabase Storage

Additional: - Leaflet for map visualization.

### Input Method

Users can: - Create date plans manually. - Add, edit, delete
activities. - Upload photos. - Add journal feedback.

### Data Requirements

The system stores: - Date plans. - Timeline activities. - Locations. -
Completion status. - Journal feedback. - Photos. - Historical memories.

### Notification / Feedback System

The system provides: - Completion prompts after a date plan ends. -
Feedback reminder popup when completed plans have no journal entry. -
The popup appears only once per completed plan.

------------------------------------------------------------------------

## 3. Core Features

## Dashboard / Home

Displays: - Upcoming date plan. - Countdown to upcoming date. - Recent
completed memories. - Statistics: - Total dates. - Total visited
places. - Average rating.

------------------------------------------------------------------------

## Date Plan Management

Users can: - Create date plans. - View date plans. - Edit date plans. -
Delete date plans.

A date plan contains: - Title. - Description. - Date. - Main location. -
Timeline activities.

Example:

Cinema Night + Saloka Trip

------------------------------------------------------------------------

## Timeline Planner

Users can create ordered activities.

Each activity contains: - Activity name. - Start time. - Category. -
Location. - Status.

Activity status: - Schedule. - Completed. - Skip.

Timeline displays: - Vertical timeline indicator. - Activity cards. -
Completion checklist. - Journey duration between activities.

Example:

18:00 Dinner

30 min journey

19:30 Cinema

------------------------------------------------------------------------

## Share Date Plan

Users can generate a shareable link.

Shared users can: - Open the plan. - Edit the plan.

Example:

/share/date-plan/{unique-id}

------------------------------------------------------------------------

## Journal & Memory

After a date plan is completed, users can save memories.

Journal fields: - Title. - Rating. - Would go again. - Favorite
moment. - Notes. - Photos. - Food/menu information. - Places visited.

------------------------------------------------------------------------

## Save / History

Completed dates are stored as memories.

Users can: - Browse previous dates. - Search memories. - Filter
memories. - Sort memories.

------------------------------------------------------------------------

## Map Integration

Users can: - Select locations. - View location using Leaflet. - Open
navigation using: - Google Maps. - Apple Maps.

------------------------------------------------------------------------

## 4. User Flow

### Create Date

1.  User opens Dashboard.
2.  User selects Create Plan.
3.  User enters:
    -   Title.
    -   Description.
    -   Date.
    -   Location.
4.  User adds timeline activities.
5.  User saves the plan.
6.  Plan appears in Upcoming Dates.

------------------------------------------------------------------------

### Execute Date

1.  User opens a date plan.
2.  User follows timeline activities.
3.  User marks activities as Completed or Skip.
4.  User follows journey duration between activities.

------------------------------------------------------------------------

### Complete Date

1.  All activities are finished.
2.  System changes plan status to Completed.
3.  User opens the application later.
4.  System checks if journal exists.
5.  If no journal exists:
    -   Show feedback popup once.
6.  User saves memory.
7.  Data appears in Save History.

------------------------------------------------------------------------

### View Previous Memories

1.  User opens Save page.
2.  User browses completed dates.
3.  User searches or filters memories.
4.  User views previous experiences.

------------------------------------------------------------------------

## 5. Architecture

``` mermaid
sequenceDiagram
    participant User
    participant Frontend as Next.js Frontend
    participant Backend as Supabase API
    participant DB as Supabase Database
    participant Storage as Supabase Storage
    participant Map as Leaflet Map

    User->>Frontend: Create/Edit Date Plan
    Frontend->>Backend: Send plan data
    Backend->>DB: Store date plan

    User->>Frontend: Add timeline activity
    Frontend->>Backend: Save activity
    Backend->>DB: Store activity

    User->>Frontend: Upload journal photo
    Frontend->>Storage: Upload image
    Storage-->>Frontend: Return image URL
    Frontend->>Backend: Save photo metadata
    Backend->>DB: Store photo reference

    User->>Frontend: Open location
    Frontend->>Map: Render location

    User->>Frontend: Complete date
    Frontend->>Backend: Update plan status
    Backend->>DB: Update completed status
```

------------------------------------------------------------------------

## 6. Database Schema

``` mermaid
erDiagram

DATE_PLANS ||--o{ ACTIVITIES : contains
DATE_PLANS ||--o| JOURNALS : has
JOURNALS ||--o{ PHOTOS : contains

DATE_PLANS {
    uuid id PK
    string title
    text description
    date plan_date
    string location_name
    decimal latitude
    decimal longitude
    string status
    string share_token
    timestamp created_at
    timestamp updated_at
}

ACTIVITIES {
    uuid id PK
    uuid date_plan_id FK
    string name
    string category
    time start_time
    string status
    string location_name
    decimal latitude
    decimal longitude
    integer journey_duration_minutes
    integer order_index
    timestamp created_at
}

JOURNALS {
    uuid id PK
    uuid date_plan_id FK
    string title
    integer rating
    boolean would_go_again
    text favorite_moment
    text notes
    text food_menu
    timestamp created_at
}

PHOTOS {
    uuid id PK
    uuid journal_id FK
    string image_url
    timestamp created_at
}
```

### Entity Explanation

  Entity       Description
  ------------ ----------------------------------------------------------
  DATE_PLANS   Main container for a date itinerary.
  ACTIVITIES   Timeline items inside a date plan.
  JOURNALS     Feedback and memory information after completing a date.
  PHOTOS       Images uploaded for memories.

------------------------------------------------------------------------

## 7. Design & Technical Constraints

### System Constraints

-   No authentication system.
-   All data belongs to one private application instance.
-   Database must support CRUD operations.
-   Shared links require unique identifiers.

### Performance Expectations

-   Initial page load should be optimized for mobile usage.
-   Timeline interaction should feel instant.
-   Image upload should provide progress feedback.
-   Failed uploads should allow retry.

### Error Handling

### Database Failure

-   Show user-friendly error message.
-   Prevent data loss during failed requests.
-   Allow retry.

### Photo Upload Failure

-   Display upload error.
-   Keep journal data.
-   Allow uploading again.

### Network Failure

-   Show offline/error state.
-   Prevent duplicate submissions after reconnect.

### Share Link Failure

-   Invalid share token shows unavailable page.

### UI/UX Rules

-   Mobile-first responsive layout.
-   Timeline must remain readable on small screens.
-   Cards should provide clear status visibility.
-   Completed activities should have clear visual distinction.
-   Editing actions should be easily accessible.

### Hardware Limitations

Supported: - Mobile browser. - Desktop browser. - Tablet browser.

Optional device capabilities: - Camera photo upload. - External map
application opening.

Not included in MVP: - Automatic route calculation. - Calendar
synchronization. - User authentication. - AI-generated date
recommendations.

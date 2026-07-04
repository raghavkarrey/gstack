# LocalEvents

An iOS app for hosting events and discovering what's happening near you.
Built with SwiftUI + SwiftData, targeting iOS 17+.

## What it does

- **Explore** — a feed of upcoming local events, grouped into Today / This
  Week / Later, with full-text search and one-tap category filters (Music,
  Food & Drink, Sports, Arts & Culture, Tech, Community, Outdoors).
- **Host an event** — publish an event with title, description, category,
  start/end time, venue, optional street address, and an optional capacity
  limit. The address is geocoded on save so the event page shows a map pin.
- **Event pages** — when/where details, an inline MapKit map, attendance
  count with spots-remaining when capacity is set, and host controls
  (edit / cancel) for events you published.
- **RSVP** — mark yourself Going or Interested; Going updates the attendee
  count and respects capacity limits (full events can't take new RSVPs).
- **Share** — every event has a ShareLink that produces a clean text
  summary (title, time, place, description, host) you can send through
  Messages, Mail, or any share-sheet destination.
- **My Events** — a personal calendar split into Attending (your RSVPs)
  and Hosting (events you published, with swipe-to-delete).

Events persist on-device with SwiftData. The app seeds a handful of sample
events on first launch so the feed isn't empty. There is no backend yet —
"local" means locally stored; syncing events between users (CloudKit or a
server API) is the natural next step and the model layer is shaped for it.

## Project layout

```
LocalEvents/
├── project.yml                  # XcodeGen manifest — generates LocalEvents.xcodeproj
└── LocalEvents/
    ├── LocalEventsApp.swift     # App entry, SwiftData model container
    ├── Models/
    │   ├── Event.swift          # @Model Event + EventCategory + RSVPStatus
    │   └── SampleData.swift     # First-launch seed events
    └── Views/
        ├── ContentView.swift    # Tab shell (Explore / My Events)
        ├── ExploreView.swift    # Discovery feed: search, category chips, sections
        ├── EventRowView.swift   # Shared list card
        ├── EventDetailView.swift# Detail page: map, RSVP, share, host menu
        ├── EventFormView.swift  # Create/edit form with address geocoding
        └── MyEventsView.swift   # Attending / Hosting segments
```

## Building

Requires Xcode 15+ and [XcodeGen](https://github.com/yonaskolb/XcodeGen)
(the `.xcodeproj` is generated, not checked in):

```bash
brew install xcodegen
cd LocalEvents
xcodegen generate
open LocalEvents.xcodeproj
```

Then build and run on any iOS 17+ simulator or device. No API keys, no
signing requirements beyond your normal development team, no permission
prompts (geocoding and the map view need no entitlements).

Alternatively, create a new iOS App project in Xcode (SwiftUI interface,
iOS 17 deployment target) and drag the `LocalEvents/LocalEvents/` sources in.

## Architecture notes

- **SwiftData end-to-end.** `Event` is a single `@Model`; views observe it
  through `@Query` and `@Bindable`, so RSVP toggles and edits propagate
  without a view-model layer.
- **Enums stored as raw strings.** `category` and `rsvp` are computed
  wrappers over private raw-string storage, which keeps the persisted
  schema migration-friendly.
- **Sharing is text-first.** `Event.shareText` renders a plain-text
  summary so sharing works everywhere today; when a backend lands it can
  become a universal link without touching the call sites.
- **Geocoding is best-effort.** A save never fails because CLGeocoder did;
  the event simply publishes without a map pin.

import SwiftUI
import SwiftData
import MapKit

/// Full event page: when/where, map, description, RSVP, sharing, and
/// (for events you host) edit/delete.
struct EventDetailView: View {
    @Bindable var event: Event
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @State private var showingEditSheet = false
    @State private var showingDeleteConfirmation = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                header

                Divider()

                whenWhereSection

                if event.hasCoordinates {
                    mapSection
                }

                if !event.details.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("About")
                            .font(.headline)
                        Text(event.details)
                            .foregroundStyle(.secondary)
                    }
                }

                attendanceSection

                if !event.isHostedByMe && !event.isPast {
                    rsvpButtons
                }
            }
            .padding()
        }
        .navigationTitle(event.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .primaryAction) {
                ShareLink(item: event.shareText, subject: Text(event.title)) {
                    Label("Share", systemImage: "square.and.arrow.up")
                }

                if event.isHostedByMe {
                    Menu {
                        Button {
                            showingEditSheet = true
                        } label: {
                            Label("Edit Event", systemImage: "pencil")
                        }
                        Button(role: .destructive) {
                            showingDeleteConfirmation = true
                        } label: {
                            Label("Cancel Event", systemImage: "trash")
                        }
                    } label: {
                        Label("Manage", systemImage: "ellipsis.circle")
                    }
                }
            }
        }
        .sheet(isPresented: $showingEditSheet) {
            EventFormView(event: event)
        }
        .confirmationDialog(
            "Cancel this event?",
            isPresented: $showingDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button("Cancel Event", role: .destructive) {
                modelContext.delete(event)
                dismiss()
            }
            Button("Keep Event", role: .cancel) {}
        } message: {
            Text("This removes the event for everyone. This can't be undone.")
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Label(event.category.rawValue, systemImage: event.category.symbolName)
                    .font(.subheadline)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color(.secondarySystemFill), in: Capsule())

                if event.isPast {
                    Text("Ended")
                        .font(.subheadline.bold())
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(Color(.tertiarySystemFill), in: Capsule())
                        .foregroundStyle(.secondary)
                }

                Spacer()
            }

            Text(event.title)
                .font(.largeTitle.bold())

            Label("Hosted by \(event.hostName)", systemImage: "person.crop.circle")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private var whenWhereSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "calendar")
                    .foregroundStyle(Color.accentColor)
                    .frame(width: 24)
                VStack(alignment: .leading, spacing: 2) {
                    Text(event.startDate, format: .dateTime.weekday(.wide).month().day())
                        .font(.body.weight(.medium))
                    Text("\(event.startDate.formatted(date: .omitted, time: .shortened)) – \(event.endDate.formatted(date: .omitted, time: .shortened))")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "mappin.and.ellipse")
                    .foregroundStyle(Color.accentColor)
                    .frame(width: 24)
                VStack(alignment: .leading, spacing: 2) {
                    Text(event.locationName)
                        .font(.body.weight(.medium))
                    if !event.address.isEmpty {
                        Text(event.address)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var mapSection: some View {
        if let latitude = event.latitude, let longitude = event.longitude {
            let coordinate = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
            Map(initialPosition: .region(
                MKCoordinateRegion(
                    center: coordinate,
                    span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
                )
            )) {
                Marker(event.locationName, coordinate: coordinate)
            }
            .frame(height: 200)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .allowsHitTesting(false)
        }
    }

    private var attendanceSection: some View {
        HStack(spacing: 12) {
            Image(systemName: "person.2.fill")
                .foregroundStyle(Color.accentColor)
            if let capacity = event.capacity {
                Text("\(event.attendeeCount) going · \(max(capacity - event.attendeeCount, 0)) spots left")
                    .font(.subheadline)
            } else {
                Text("\(event.attendeeCount) going")
                    .font(.subheadline)
            }
            Spacer()
        }
        .padding()
        .background(Color(.secondarySystemFill), in: RoundedRectangle(cornerRadius: 12))
    }

    private var rsvpButtons: some View {
        HStack(spacing: 12) {
            Button {
                setRSVP(event.rsvp == .going ? .none : .going)
            } label: {
                Label(
                    event.rsvp == .going ? "Going ✓" : "I'm Going",
                    systemImage: "checkmark.circle.fill"
                )
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(.green)
            .disabled(event.isFull && event.rsvp != .going)

            Button {
                setRSVP(event.rsvp == .interested ? .none : .interested)
            } label: {
                Label(
                    event.rsvp == .interested ? "Interested ✓" : "Interested",
                    systemImage: "star.fill"
                )
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .tint(.orange)
        }
    }

    private func setRSVP(_ newStatus: RSVPStatus) {
        let wasGoing = event.rsvp == .going
        event.rsvp = newStatus
        if newStatus == .going && !wasGoing {
            event.attendeeCount += 1
        } else if newStatus != .going && wasGoing {
            event.attendeeCount = max(event.attendeeCount - 1, 0)
        }
    }
}

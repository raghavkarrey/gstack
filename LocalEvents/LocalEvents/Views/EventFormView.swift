import SwiftUI
import SwiftData
import CoreLocation

/// Create-or-edit form for hosting an event. Pass an existing event to
/// edit it; pass nothing to create a new one. On save the address is
/// geocoded (best effort) so the detail page can show a map pin.
struct EventFormView: View {
    var event: Event?

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var details = ""
    @State private var category: EventCategory = .community
    @State private var startDate = Calendar.current.date(byAdding: .day, value: 1, to: .now) ?? .now
    @State private var endDate = Calendar.current.date(byAdding: .day, value: 1, to: .now)?.addingTimeInterval(2 * 3600) ?? .now
    @State private var locationName = ""
    @State private var address = ""
    @State private var hostName = ""
    @State private var hasCapacityLimit = false
    @State private var capacity = 50
    @State private var isSaving = false

    private var isEditing: Bool { event != nil }

    private var isValid: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty
            && !locationName.trimmingCharacters(in: .whitespaces).isEmpty
            && !hostName.trimmingCharacters(in: .whitespaces).isEmpty
            && endDate > startDate
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("What") {
                    TextField("Event title", text: $title)
                    Picker("Category", selection: $category) {
                        ForEach(EventCategory.allCases) { category in
                            Label(category.rawValue, systemImage: category.symbolName)
                                .tag(category)
                        }
                    }
                    TextField("Describe your event…", text: $details, axis: .vertical)
                        .lineLimit(4...8)
                }

                Section("When") {
                    DatePicker("Starts", selection: $startDate)
                    DatePicker("Ends", selection: $endDate, in: startDate...)
                }

                Section("Where") {
                    TextField("Venue name", text: $locationName)
                    TextField("Street address (for the map)", text: $address)
                }

                Section("Hosting") {
                    TextField("Host name", text: $hostName)
                    Toggle("Limit capacity", isOn: $hasCapacityLimit)
                    if hasCapacityLimit {
                        Stepper("Max attendees: \(capacity)", value: $capacity, in: 1...10_000, step: 5)
                    }
                }
            }
            .navigationTitle(isEditing ? "Edit Event" : "Host an Event")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isEditing ? "Save" : "Publish") {
                        save()
                    }
                    .disabled(!isValid || isSaving)
                }
            }
            .onAppear(perform: populateIfEditing)
        }
    }

    private func populateIfEditing() {
        guard let event else { return }
        title = event.title
        details = event.details
        category = event.category
        startDate = event.startDate
        endDate = event.endDate
        locationName = event.locationName
        address = event.address
        hostName = event.hostName
        if let existingCapacity = event.capacity {
            hasCapacityLimit = true
            capacity = existingCapacity
        }
    }

    private func save() {
        isSaving = true
        let addressToGeocode = address.trimmingCharacters(in: .whitespaces)

        Task {
            var coordinate: CLLocationCoordinate2D?
            if !addressToGeocode.isEmpty {
                coordinate = try? await CLGeocoder()
                    .geocodeAddressString(addressToGeocode)
                    .first?.location?.coordinate
            }
            applySave(coordinate: coordinate)
        }
    }

    @MainActor
    private func applySave(coordinate: CLLocationCoordinate2D?) {
        if let event {
            event.title = title
            event.details = details
            event.category = category
            event.startDate = startDate
            event.endDate = endDate
            event.locationName = locationName
            event.address = address
            event.hostName = hostName
            event.capacity = hasCapacityLimit ? capacity : nil
            if let coordinate {
                event.latitude = coordinate.latitude
                event.longitude = coordinate.longitude
            } else if address.trimmingCharacters(in: .whitespaces).isEmpty {
                event.latitude = nil
                event.longitude = nil
            }
        } else {
            let newEvent = Event(
                title: title,
                details: details,
                category: category,
                startDate: startDate,
                endDate: endDate,
                locationName: locationName,
                address: address,
                latitude: coordinate?.latitude,
                longitude: coordinate?.longitude,
                capacity: hasCapacityLimit ? capacity : nil,
                hostName: hostName,
                isHostedByMe: true
            )
            modelContext.insert(newEvent)
        }
        dismiss()
    }
}

#Preview {
    EventFormView()
        .modelContainer(for: Event.self, inMemory: true)
}

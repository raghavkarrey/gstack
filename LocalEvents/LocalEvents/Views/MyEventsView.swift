import SwiftUI
import SwiftData

/// Personal calendar: events you're hosting and events you RSVP'd to.
struct MyEventsView: View {
    @Query(sort: \Event.startDate) private var events: [Event]
    @Environment(\.modelContext) private var modelContext
    @State private var selectedSegment: Segment = .attending
    @State private var showingCreateSheet = false

    enum Segment: String, CaseIterable {
        case attending = "Attending"
        case hosting = "Hosting"
    }

    private var filteredEvents: [Event] {
        switch selectedSegment {
        case .attending:
            events.filter { $0.rsvp != .none && !$0.isHostedByMe }
        case .hosting:
            events.filter(\.isHostedByMe)
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Filter", selection: $selectedSegment) {
                    ForEach(Segment.allCases, id: \.self) { segment in
                        Text(segment.rawValue).tag(segment)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.bottom, 8)

                List {
                    ForEach(filteredEvents) { event in
                        NavigationLink(value: event) {
                            EventRowView(event: event)
                        }
                    }
                    .onDelete(perform: selectedSegment == .hosting ? deleteHostedEvents : nil)

                    if filteredEvents.isEmpty {
                        ContentUnavailableView(
                            selectedSegment == .hosting ? "Nothing hosted yet" : "No RSVPs yet",
                            systemImage: selectedSegment == .hosting ? "megaphone" : "hand.raised",
                            description: Text(
                                selectedSegment == .hosting
                                    ? "Host your first event and it will show up here."
                                    : "Find something on Explore and tap I'm Going."
                            )
                        )
                        .listRowSeparator(.hidden)
                    }
                }
                .listStyle(.plain)
            }
            .navigationTitle("My Events")
            .navigationDestination(for: Event.self) { event in
                EventDetailView(event: event)
            }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showingCreateSheet = true
                    } label: {
                        Label("Host Event", systemImage: "plus.circle.fill")
                    }
                }
            }
            .sheet(isPresented: $showingCreateSheet) {
                EventFormView()
            }
        }
    }

    private func deleteHostedEvents(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(filteredEvents[index])
        }
    }
}

#Preview {
    MyEventsView()
        .modelContainer(for: Event.self, inMemory: true)
}

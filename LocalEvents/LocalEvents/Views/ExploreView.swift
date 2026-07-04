import SwiftUI
import SwiftData

/// The discovery feed: upcoming local events, searchable and filterable
/// by category, with a button to host a new event.
struct ExploreView: View {
    @Query(sort: \Event.startDate) private var events: [Event]
    @State private var searchText = ""
    @State private var selectedCategory: EventCategory?
    @State private var showingCreateSheet = false

    private var upcomingEvents: [Event] {
        events.filter { event in
            guard !event.isPast else { return false }
            if let selectedCategory, event.category != selectedCategory {
                return false
            }
            guard !searchText.isEmpty else { return true }
            let haystack = "\(event.title) \(event.details) \(event.locationName) \(event.hostName)"
            return haystack.localizedCaseInsensitiveContains(searchText)
        }
    }

    private var groupedEvents: [(label: String, events: [Event])] {
        let calendar = Calendar.current
        let now = Date.now
        var today: [Event] = []
        var thisWeek: [Event] = []
        var later: [Event] = []

        for event in upcomingEvents {
            if calendar.isDateInToday(event.startDate) {
                today.append(event)
            } else if let weekEnd = calendar.date(byAdding: .day, value: 7, to: now),
                      event.startDate < weekEnd {
                thisWeek.append(event)
            } else {
                later.append(event)
            }
        }

        return [("Today", today), ("This Week", thisWeek), ("Later", later)]
            .filter { !$0.1.isEmpty }
            .map { (label: $0.0, events: $0.1) }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    CategoryFilterRow(selectedCategory: $selectedCategory)
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                }

                ForEach(groupedEvents, id: \.label) { group in
                    Section(group.label) {
                        ForEach(group.events) { event in
                            NavigationLink(value: event) {
                                EventRowView(event: event)
                            }
                        }
                    }
                }

                if upcomingEvents.isEmpty {
                    ContentUnavailableView(
                        searchText.isEmpty ? "No upcoming events" : "No matches",
                        systemImage: "calendar.badge.exclamationmark",
                        description: Text(
                            searchText.isEmpty
                                ? "Be the first — host an event for your neighborhood."
                                : "Try a different search or category."
                        )
                    )
                    .listRowSeparator(.hidden)
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Explore")
            .searchable(text: $searchText, prompt: "Search events, places, hosts")
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
}

/// Horizontally scrolling category chips. Tapping the active chip clears it.
private struct CategoryFilterRow: View {
    @Binding var selectedCategory: EventCategory?

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(EventCategory.allCases) { category in
                    let isSelected = selectedCategory == category
                    Button {
                        selectedCategory = isSelected ? nil : category
                    } label: {
                        Label(category.rawValue, systemImage: category.symbolName)
                            .font(.subheadline)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 7)
                            .background(isSelected ? Color.accentColor : Color(.secondarySystemFill))
                            .foregroundStyle(isSelected ? .white : .primary)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 4)
        }
    }
}

#Preview {
    ExploreView()
        .modelContainer(for: Event.self, inMemory: true)
}

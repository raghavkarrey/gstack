import Foundation
import SwiftData

/// Seeds a handful of nearby events on first launch so the Explore feed
/// isn't empty before the user hosts anything.
enum SampleData {
    static func seedIfNeeded(context: ModelContext) {
        let descriptor = FetchDescriptor<Event>()
        let existing = (try? context.fetchCount(descriptor)) ?? 0
        guard existing == 0 else { return }

        for event in makeEvents() {
            context.insert(event)
        }
    }

    private static func makeEvents() -> [Event] {
        let calendar = Calendar.current
        let now = Date.now

        func day(_ offset: Int, hour: Int, duration: TimeInterval = 2 * 3600) -> (Date, Date) {
            let base = calendar.date(byAdding: .day, value: offset, to: now) ?? now
            let start = calendar.date(bySettingHour: hour, minute: 0, second: 0, of: base) ?? base
            return (start, start.addingTimeInterval(duration))
        }

        let farmers = day(1, hour: 9, duration: 4 * 3600)
        let jazz = day(2, hour: 19)
        let run = day(3, hour: 7, duration: 3600)
        let demo = day(5, hour: 18)
        let paint = day(7, hour: 14, duration: 3 * 3600)
        let cleanup = day(9, hour: 10, duration: 2 * 3600)

        return [
            Event(
                title: "Downtown Farmers Market",
                details: "Weekly market with 40+ local vendors: produce, baked goods, coffee, and live acoustic sets. Bring your own bags.",
                category: .foodAndDrink,
                startDate: farmers.0, endDate: farmers.1,
                locationName: "Civic Center Plaza",
                address: "355 McAllister St, San Francisco, CA",
                latitude: 37.7793, longitude: -122.4193,
                hostName: "SF Market Collective",
                attendeeCount: 128
            ),
            Event(
                title: "Jazz in the Park",
                details: "Free open-air jazz night featuring three local quartets. Lawn seating, food trucks on site.",
                category: .music,
                startDate: jazz.0, endDate: jazz.1,
                locationName: "Dolores Park",
                address: "Dolores St & 19th St, San Francisco, CA",
                latitude: 37.7596, longitude: -122.4269,
                hostName: "Parks & Rec",
                attendeeCount: 342
            ),
            Event(
                title: "Sunrise 5K Fun Run",
                details: "Casual 5K along the waterfront. All paces welcome — walkers too. Coffee and bagels at the finish.",
                category: .sports,
                startDate: run.0, endDate: run.1,
                locationName: "Embarcadero",
                address: "Pier 1, San Francisco, CA",
                latitude: 37.7955, longitude: -122.3937,
                capacity: 150,
                hostName: "Bay Runners Club",
                attendeeCount: 87
            ),
            Event(
                title: "Indie Makers Demo Night",
                details: "Eight local builders demo what they shipped this month. 5 minutes each, no slides allowed. Networking after.",
                category: .tech,
                startDate: demo.0, endDate: demo.1,
                locationName: "The Foundry",
                address: "620 Folsom St, San Francisco, CA",
                latitude: 37.7854, longitude: -122.3966,
                capacity: 80,
                hostName: "Makers SF",
                attendeeCount: 64
            ),
            Event(
                title: "Watercolor in the Garden",
                details: "Beginner-friendly outdoor painting session. All materials provided. Rain reschedules to the following week.",
                category: .artsAndCulture,
                startDate: paint.0, endDate: paint.1,
                locationName: "Botanical Garden",
                address: "1199 9th Ave, San Francisco, CA",
                latitude: 37.7677, longitude: -122.4700,
                capacity: 25,
                hostName: "Golden Hour Studio",
                attendeeCount: 21
            ),
            Event(
                title: "Neighborhood Beach Cleanup",
                details: "Gloves, grabbers, and bags provided. Community service hours signed for students. Meet at the north entrance.",
                category: .community,
                startDate: cleanup.0, endDate: cleanup.1,
                locationName: "Ocean Beach",
                address: "Great Highway, San Francisco, CA",
                latitude: 37.7594, longitude: -122.5107,
                hostName: "Surfrider Foundation",
                attendeeCount: 45
            ),
        ]
    }
}

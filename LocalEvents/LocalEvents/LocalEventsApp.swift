import SwiftUI
import SwiftData

@main
struct LocalEventsApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: Event.self)
    }
}

import SwiftUI
import SwiftData

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        TabView {
            ExploreView()
                .tabItem {
                    Label("Explore", systemImage: "map")
                }

            MyEventsView()
                .tabItem {
                    Label("My Events", systemImage: "calendar")
                }
        }
        .task {
            SampleData.seedIfNeeded(context: modelContext)
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(for: Event.self, inMemory: true)
}

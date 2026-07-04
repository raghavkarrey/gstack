import SwiftUI

/// Compact event card used in the Explore feed and My Events lists.
struct EventRowView: View {
    let event: Event

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(spacing: 2) {
                Text(event.startDate, format: .dateTime.month(.abbreviated))
                    .font(.caption2)
                    .textCase(.uppercase)
                    .foregroundStyle(.secondary)
                Text(event.startDate, format: .dateTime.day())
                    .font(.title3.bold())
            }
            .frame(width: 44)
            .padding(.vertical, 6)
            .background(Color(.secondarySystemFill), in: RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 3) {
                Text(event.title)
                    .font(.headline)
                    .lineLimit(2)

                Label(event.startDate.formatted(date: .omitted, time: .shortened),
                      systemImage: "clock")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Label(event.locationName, systemImage: "mappin.and.ellipse")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    Label(event.category.rawValue, systemImage: event.category.symbolName)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color(.tertiarySystemFill), in: Capsule())

                    if event.rsvp == .going {
                        Text("Going")
                            .font(.caption.bold())
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(.green.opacity(0.15), in: Capsule())
                            .foregroundStyle(.green)
                    } else if event.rsvp == .interested {
                        Text("Interested")
                            .font(.caption.bold())
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(.orange.opacity(0.15), in: Capsule())
                            .foregroundStyle(.orange)
                    }

                    if event.isHostedByMe {
                        Text("Hosting")
                            .font(.caption.bold())
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(.blue.opacity(0.15), in: Capsule())
                            .foregroundStyle(.blue)
                    }
                }
                .padding(.top, 2)
            }
        }
        .padding(.vertical, 4)
    }
}

import Foundation
import SwiftData

enum EventCategory: String, Codable, CaseIterable, Identifiable {
    case music = "Music"
    case foodAndDrink = "Food & Drink"
    case sports = "Sports"
    case artsAndCulture = "Arts & Culture"
    case tech = "Tech"
    case community = "Community"
    case outdoors = "Outdoors"
    case other = "Other"

    var id: String { rawValue }

    var symbolName: String {
        switch self {
        case .music: "music.note"
        case .foodAndDrink: "fork.knife"
        case .sports: "figure.run"
        case .artsAndCulture: "paintpalette"
        case .tech: "laptopcomputer"
        case .community: "person.3"
        case .outdoors: "leaf"
        case .other: "sparkles"
        }
    }
}

enum RSVPStatus: String, Codable {
    case none
    case interested
    case going
}

@Model
final class Event {
    var title: String
    var details: String
    private var categoryRaw: String
    var startDate: Date
    var endDate: Date
    var locationName: String
    var address: String
    var latitude: Double?
    var longitude: Double?
    var capacity: Int?
    var hostName: String
    var isHostedByMe: Bool
    private var rsvpRaw: String
    var attendeeCount: Int
    var createdAt: Date

    init(
        title: String,
        details: String,
        category: EventCategory,
        startDate: Date,
        endDate: Date,
        locationName: String,
        address: String,
        latitude: Double? = nil,
        longitude: Double? = nil,
        capacity: Int? = nil,
        hostName: String,
        isHostedByMe: Bool = false,
        rsvp: RSVPStatus = .none,
        attendeeCount: Int = 0,
        createdAt: Date = .now
    ) {
        self.title = title
        self.details = details
        self.categoryRaw = category.rawValue
        self.startDate = startDate
        self.endDate = endDate
        self.locationName = locationName
        self.address = address
        self.latitude = latitude
        self.longitude = longitude
        self.capacity = capacity
        self.hostName = hostName
        self.isHostedByMe = isHostedByMe
        self.rsvpRaw = rsvp.rawValue
        self.attendeeCount = attendeeCount
        self.createdAt = createdAt
    }

    var category: EventCategory {
        get { EventCategory(rawValue: categoryRaw) ?? .other }
        set { categoryRaw = newValue.rawValue }
    }

    var rsvp: RSVPStatus {
        get { RSVPStatus(rawValue: rsvpRaw) ?? .none }
        set { rsvpRaw = newValue.rawValue }
    }

    var hasCoordinates: Bool {
        latitude != nil && longitude != nil
    }

    var isFull: Bool {
        guard let capacity else { return false }
        return attendeeCount >= capacity
    }

    var isPast: Bool {
        endDate < .now
    }

    /// Plain-text summary used by ShareLink so an event can be posted
    /// anywhere (Messages, Mail, social) without a backend.
    var shareText: String {
        var lines = [
            "\(title)",
            "",
            startDate.formatted(date: .complete, time: .shortened),
            "\(locationName)\(address.isEmpty ? "" : " — \(address)")",
        ]
        if !details.isEmpty {
            lines.append("")
            lines.append(details)
        }
        lines.append("")
        lines.append("Hosted by \(hostName) · Shared from LocalEvents")
        return lines.joined(separator: "\n")
    }
}

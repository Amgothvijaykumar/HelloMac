// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "RemoteLinkHost",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "remotelink-host", targets: ["RemoteLinkHost"])
    ],
    dependencies: [],
    targets: [
        .executableTarget(
            name: "RemoteLinkHost",
            dependencies: [],
            path: "Sources"
        )
    ]
)

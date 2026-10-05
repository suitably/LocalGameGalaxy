with open("CHANGELOG.md", "r") as f:
    content = f.read()

unreleased_header = "## [Unreleased]\n### Changed\n"
new_entry = "- **Melodiq**: Settings view now renders without unmounting the main game view, keeping background processes running smoothly.\n"

if "## [Unreleased]\n### Changed\n" in content:
    content = content.replace(unreleased_header, unreleased_header + new_entry, 1)
else:
    # If the exact header isn't found, find just ## [Unreleased]
    content = content.replace("## [Unreleased]\n", "## [Unreleased]\n### Changed\n" + new_entry, 1)

with open("CHANGELOG.md", "w") as f:
    f.write(content)

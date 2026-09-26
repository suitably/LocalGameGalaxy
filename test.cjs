const fs = require('fs');

const content = `{
    "name": "nexumia",
    "compatibility_date": "2026-01-19",
    "assets": {
        "directory": "./dist",
        "not_found_handling": "single-page-application"
    }
}`;

try {
  JSON.parse(content);
  console.log("Valid JSON");
} catch(e) {
  console.error("Invalid JSON:", e.message);
}

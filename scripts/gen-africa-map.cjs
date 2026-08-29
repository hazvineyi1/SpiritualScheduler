const topojson = require("topojson-client");
const fs = require("fs");
const topology = require("../node_modules/world-atlas/countries-50m.json");
const geo = topojson.feature(topology, topology.objects.countries);

// Maps this dataset's exact country name to a clean display name + URL slug.
// Deliberately covers the standard 54 UN member/observer African states.
// Western Sahara's shape is left unstyled/unlisted (not a selectable country
// for healers) but still renders as base landmass, avoiding any political
// statement while keeping the continent's outline visually complete.
const AFRICA = {
  "Algeria": "Algeria",
  "Angola": "Angola",
  "Benin": "Benin",
  "Botswana": "Botswana",
  "Burkina Faso": "Burkina Faso",
  "Burundi": "Burundi",
  "Cabo Verde": "Cabo Verde",
  "Cameroon": "Cameroon",
  "Central African Rep.": "Central African Republic",
  "Chad": "Chad",
  "Comoros": "Comoros",
  "Congo": "Republic of the Congo",
  "Dem. Rep. Congo": "DR Congo",
  "Côte d'Ivoire": "Côte d'Ivoire",
  "Djibouti": "Djibouti",
  "Egypt": "Egypt",
  "Eq. Guinea": "Equatorial Guinea",
  "Eritrea": "Eritrea",
  "eSwatini": "Eswatini",
  "Ethiopia": "Ethiopia",
  "Gabon": "Gabon",
  "Gambia": "Gambia",
  "Ghana": "Ghana",
  "Guinea": "Guinea",
  "Guinea-Bissau": "Guinea-Bissau",
  "Kenya": "Kenya",
  "Lesotho": "Lesotho",
  "Liberia": "Liberia",
  "Libya": "Libya",
  "Madagascar": "Madagascar",
  "Malawi": "Malawi",
  "Mali": "Mali",
  "Mauritania": "Mauritania",
  "Mauritius": "Mauritius",
  "Morocco": "Morocco",
  "Mozambique": "Mozambique",
  "Namibia": "Namibia",
  "Niger": "Niger",
  "Nigeria": "Nigeria",
  "Rwanda": "Rwanda",
  "São Tomé and Principe": "São Tomé and Príncipe",
  "Senegal": "Senegal",
  "Seychelles": "Seychelles",
  "Sierra Leone": "Sierra Leone",
  "Somalia": "Somalia",
  "South Africa": "South Africa",
  "S. Sudan": "South Sudan",
  "Sudan": "Sudan",
  "Tanzania": "Tanzania",
  "Togo": "Togo",
  "Tunisia": "Tunisia",
  "Uganda": "Uganda",
  "Zambia": "Zambia",
  "Zimbabwe": "Zimbabwe",
};

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const features = geo.features
  .filter(f => AFRICA[f.properties.name])
  .map(f => {
    const displayName = AFRICA[f.properties.name];
    return {
      ...f,
      properties: { name: displayName, slug: slugify(displayName) },
    };
  });

console.log(`Matched ${features.length} of ${Object.keys(AFRICA).length} expected African countries`);
const matchedNames = new Set(features.map(f => f.properties.name));
for (const displayName of Object.values(AFRICA)) {
  if (!matchedNames.has(displayName)) console.log("MISSING:", displayName);
}

const out = { type: "FeatureCollection", features };
fs.writeFileSync(__dirname + "/../client/public/data/africa.json", JSON.stringify(out));
console.log("Written to client/public/data/africa.json");

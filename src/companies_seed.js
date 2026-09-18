/**
 * Target companies seeded into the Companies tab by setupSheet().
 *
 * GENERATED FILE - do not edit by hand.
 * Source: config/companies.seed.csv
 * Regenerate: node tools/gen_companies.js
 */

/** @return {Array<{name: string, lane: string, notes: string}>} */
function companiesSeed() {
  return [
    { name: "BiT DMS", lane: "dms", notes: "Chris uses it daily; strongest domain fit" },
    { name: "Lightspeed", lane: "dms", notes: "Has marine/powersports DMS products" },
    { name: "CDK Global", lane: "dms", notes: "Includes recreation/powersports DMS" },
    { name: "Dealer Spike", lane: "dms", notes: "Powersports/marine/RV dealer websites and CRM" },
    { name: "DockMaster", lane: "dms", notes: "Marine DMS" },
    { name: "Ideal Computer Systems", lane: "dms", notes: "OPE/powersports/marine DMS" },
    { name: "ServiceTitan", lane: "dms", notes: "Vertical SaaS for service businesses" },
    { name: "Jobber", lane: "dms", notes: "Field-service SaaS" },
    { name: "Housecall Pro", lane: "dms", notes: "Field-service SaaS" },
    { name: "Shopify", lane: "auto", notes: "Chris works in Shopify daily" },
    { name: "Zapier", lane: "auto", notes: "Automation platform" },
    { name: "n8n", lane: "auto", notes: "Automation platform; Chris has interest in it" },
    { name: "Make", lane: "auto", notes: "Automation platform" },
    { name: "Workato", lane: "auto", notes: "Enterprise automation" },
    { name: "Aventon", lane: "oem", notes: "Chris manages the Aventon line" },
    { name: "Rad Power Bikes", lane: "oem", notes: "eBike brand" },
    { name: "Specialized", lane: "oem", notes: "Bike/eBike brand" },
    { name: "Trek Bicycle", lane: "oem", notes: "Bike/eBike brand" },
    { name: "Johnson Outdoors", lane: "oem", notes: "Old Town parent" },
    { name: "Hobie", lane: "oem", notes: "Chris sells the line" },
    { name: "Brunswick", lane: "oem", notes: "Mercury Marine parent" },
    { name: "Yamaha Motor", lane: "oem", notes: "Marine and powersports" },
    { name: "MarineMax", lane: "ops", notes: "Large marine dealer group" },
    { name: "OneWater Marine", lane: "ops", notes: "Large marine dealer group" }
  ];
}

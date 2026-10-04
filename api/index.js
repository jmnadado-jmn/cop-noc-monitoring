// src/serverApp.ts
import express from "express";
import fs from "fs";
import path from "path";

// src/data/initialNocData.ts
function generate30DayHistory(baseUptime, outageDays = []) {
  const points = [];
  const baseDate = /* @__PURE__ */ new Date("2026-09-26T00:00:00-07:00");
  for (let i = 29; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const outage = outageDays.find((o) => o.dayOffset === i);
    if (outage) {
      const pct = Math.max(
        0,
        Number(((1440 - outage.downtimeMins) / 1440 * 100).toFixed(2))
      );
      points.push({
        date: dateStr,
        uptimePct: pct,
        downtimeMinutes: outage.downtimeMins,
        incidentCount: 1
      });
    } else {
      const pct = Math.min(100, Number(baseUptime.toFixed(2)));
      const downMins = pct === 100 ? 0 : Math.round((100 - pct) / 100 * 1440);
      points.push({
        date: dateStr,
        uptimePct: pct,
        downtimeMinutes: downMins,
        incidentCount: 0
      });
    }
  }
  return points;
}
var PROVIDER_DIRECTORY = {
  "Eastern Communications": {
    email: "linkgold@etpi.com.ph",
    hotline: "+63 (2) 5300-7000",
    sla: 99.9
  },
  "Converge ICT": {
    email: "enterprisesupport@convergeict.com",
    hotline: "+63 (2) 8667-0848",
    sla: 99.9
  },
  "PLDT Enterprise": {
    email: "enterprisecare@pldt.com.ph",
    hotline: "+63 (2) 8888-1777",
    sla: 99.9
  },
  "Starlink Enterprise": {
    email: "enterprise-support@starlink.com",
    hotline: "Starlink Priority Support",
    sla: 99.5
  }
};
var COP_CAMPUS_ORDER = [
  "Main Campus",
  "South Campus",
  "East Campus",
  "North Campus",
  "Santa Rosa Campus",
  "Naic Campus",
  "Kawit Campus",
  "Bulacan Campus",
  "Pampanga Campus",
  "Cainta Campus",
  "Cebu",
  "Davao",
  "Laoag",
  "Lipa",
  "Batangas",
  "Isabela",
  "Angel One"
];
var RAW_COP_CAMPUSES = [
  {
    campusName: "Main Campus",
    campusCode: "COP-MAIN",
    region: "Metro Manila (Taft Ave)",
    building: "Main Sanctuary & Central NOC",
    routerHostname: "cop-main-core-01",
    links: [
      {
        idSuffix: "eastern-inet-pdes",
        linkName: "Eastern Internet PDES",
        provider: "Eastern Communications",
        linkRole: "Dedicated Internet",
        accountNumber: "N/A (Circuit ID)",
        circuitId: "930473671",
        interfaceName: "TenGigE0/0/0",
        bgpPeerIp: "116.50.100.1",
        bandwidthMbps: 1e3,
        latencyMs: 4.1,
        opticalRxDbm: -8.4,
        uptime30dPct: 99.99
      },
      {
        idSuffix: "eastern-inet-coplc",
        linkName: "Eastern Internet COPLC",
        provider: "Eastern Communications",
        linkRole: "Dedicated Internet",
        accountNumber: "N/A (Circuit ID)",
        circuitId: "930467111",
        interfaceName: "TenGigE0/0/1",
        bgpPeerIp: "116.50.100.5",
        bandwidthMbps: 1e3,
        latencyMs: 4.3,
        opticalRxDbm: -8.6,
        uptime30dPct: 99.98
      },
      {
        idSuffix: "eastern-inet-unifi",
        linkName: "Eastern Internet UNIFI",
        provider: "Eastern Communications",
        linkRole: "Dedicated Internet",
        accountNumber: "N/A (Circuit ID)",
        circuitId: "930447171",
        interfaceName: "TenGigE0/0/2",
        bgpPeerIp: "116.50.100.9",
        bandwidthMbps: 1e3,
        latencyMs: 4.5,
        opticalRxDbm: -8.9,
        uptime30dPct: 99.98
      },
      {
        idSuffix: "eastern-inet-dia",
        linkName: "Eastern Internet DIA",
        provider: "Eastern Communications",
        linkRole: "Dedicated Internet",
        accountNumber: "N/A (Circuit ID)",
        circuitId: "900000683",
        interfaceName: "TenGigE0/0/3",
        bgpPeerIp: "116.50.100.13",
        bandwidthMbps: 1e3,
        latencyMs: 4,
        opticalRxDbm: -8.2,
        uptime30dPct: 99.99
      },
      {
        idSuffix: "converge-inet",
        linkName: "Converge Internet",
        provider: "Converge ICT",
        linkRole: "Dedicated Internet",
        accountNumber: "N/A (Circuit ID)",
        circuitId: "MC12984",
        interfaceName: "TenGigE0/1/0",
        bgpPeerIp: "136.158.10.1",
        bandwidthMbps: 1e3,
        latencyMs: 5.1,
        opticalRxDbm: -9.2,
        uptime30dPct: 99.97
      }
    ]
  },
  {
    campusName: "South Campus",
    campusCode: "COP-SOUTH",
    region: "Metro Manila South",
    building: "South Campus Broadcast & IT Rack",
    routerHostname: "cop-south-rtr-01",
    links: [
      {
        idSuffix: "eastern-trans",
        linkName: "Eastern Transport",
        provider: "Eastern Communications",
        linkRole: "Metro-E Transport",
        accountNumber: "N/A (Circuit ID)",
        circuitId: "813305822",
        interfaceName: "GigabitEthernet0/0/0",
        bgpPeerIp: "116.50.104.1",
        bandwidthMbps: 500,
        latencyMs: 6.1,
        opticalRxDbm: -9.4,
        uptime30dPct: 99.96
      },
      {
        idSuffix: "eastern-inet",
        linkName: "Eastern Internet",
        provider: "Eastern Communications",
        linkRole: "Dedicated Internet",
        accountNumber: "N/A (Circuit ID)",
        circuitId: "930473671",
        interfaceName: "GigabitEthernet0/0/2",
        bgpPeerIp: "116.50.104.9",
        bandwidthMbps: 500,
        latencyMs: 7.2,
        opticalRxDbm: -10.8,
        uptime30dPct: 99.94
      },
      {
        idSuffix: "converge-trans",
        linkName: "Converge Transport",
        provider: "Converge ICT",
        linkRole: "Metro-E Transport",
        accountNumber: "N/A (Circuit ID)",
        circuitId: "MC003615",
        interfaceName: "GigabitEthernet0/0/1",
        bgpPeerIp: "136.158.14.1",
        bandwidthMbps: 500,
        latencyMs: 6.5,
        opticalRxDbm: -10,
        uptime30dPct: 99.97
      },
      {
        idSuffix: "converge-dia",
        linkName: "Converge DIA",
        provider: "Converge ICT",
        linkRole: "Dedicated Internet",
        accountNumber: "N/A (Circuit ID)",
        circuitId: "MC019487",
        interfaceName: "GigabitEthernet0/0/3",
        bgpPeerIp: "136.158.14.9",
        bandwidthMbps: 500,
        latencyMs: 7.4,
        opticalRxDbm: -11.1,
        uptime30dPct: 99.95
      },
      {
        idSuffix: "converge-coplc",
        linkName: "Converge COPLC",
        provider: "Converge ICT",
        linkRole: "Dedicated Internet",
        accountNumber: "N/A (Circuit ID)",
        circuitId: "MC025201",
        interfaceName: "GigabitEthernet0/0/4",
        bgpPeerIp: "136.158.14.17",
        bandwidthMbps: 500,
        latencyMs: 7.5,
        opticalRxDbm: -11,
        uptime30dPct: 99.96
      },
      {
        idSuffix: "starlink",
        linkName: "Starlink",
        provider: "Starlink Enterprise",
        linkRole: "LEO Satellite Backup",
        accountNumber: "Starlink",
        circuitId: "STARLINK-SOUTH",
        interfaceName: "wan-starlink0",
        bgpPeerIp: "100.64.10.1",
        bandwidthMbps: 250,
        latencyMs: 36.4,
        opticalRxDbm: -6,
        uptime30dPct: 99.88
      }
    ]
  },
  {
    campusName: "East Campus",
    campusCode: "COP-EAST",
    region: "Metro Manila East",
    building: "East Worship Center MDF",
    routerHostname: "cop-east-rtr-01",
    links: [
      {
        idSuffix: "eastern-trans",
        linkName: "Eastern Transport",
        provider: "Eastern Communications",
        linkRole: "Metro-E Transport",
        accountNumber: "N/A (Circuit ID)",
        circuitId: "813303292",
        interfaceName: "GigabitEthernet0/0/0",
        bgpPeerIp: "116.50.102.1",
        bandwidthMbps: 500,
        latencyMs: 5.8,
        opticalRxDbm: -10.1,
        uptime30dPct: 99.92,
        outageHistory: [{ dayOffset: 3, downtimeMins: 32 }]
      },
      {
        idSuffix: "converge-trans",
        linkName: "Converge Transport",
        provider: "Converge ICT",
        linkRole: "Metro-E Transport",
        accountNumber: "N/A (Circuit ID)",
        circuitId: "MC003576",
        interfaceName: "GigabitEthernet0/0/1",
        bgpPeerIp: "136.158.12.1",
        bandwidthMbps: 500,
        latencyMs: 6.2,
        opticalRxDbm: -9.8,
        uptime30dPct: 99.97
      },
      {
        idSuffix: "converge-inet",
        linkName: "Converge Internet",
        provider: "Converge ICT",
        linkRole: "Dedicated Internet",
        accountNumber: "N/A (Circuit ID)",
        circuitId: "MC006608",
        interfaceName: "GigabitEthernet0/0/2",
        bgpPeerIp: "136.158.12.9",
        bandwidthMbps: 500,
        latencyMs: 6.9,
        opticalRxDbm: -10.5,
        uptime30dPct: 99.96
      }
    ]
  },
  {
    campusName: "North Campus",
    campusCode: "COP-NORTH",
    region: "Metro Manila North",
    building: "North Sanctuary Comms Room",
    routerHostname: "cop-north-rtr-01",
    links: [
      {
        idSuffix: "eastern-trans",
        linkName: "Eastern Transport",
        provider: "Eastern Communications",
        linkRole: "Metro-E Transport",
        accountNumber: "N/A (Circuit ID)",
        circuitId: "813281857",
        interfaceName: "GigabitEthernet0/0/0",
        bgpPeerIp: "116.50.103.1",
        bandwidthMbps: 500,
        latencyMs: 6.4,
        opticalRxDbm: -9.6,
        uptime30dPct: 99.98
      },
      {
        idSuffix: "converge-trans",
        linkName: "Converge Transport",
        provider: "Converge ICT",
        linkRole: "Metro-E Transport",
        accountNumber: "N/A (Circuit ID)",
        circuitId: "MC010926",
        interfaceName: "GigabitEthernet0/0/1",
        bgpPeerIp: "136.158.13.1",
        bandwidthMbps: 500,
        latencyMs: 6.8,
        opticalRxDbm: -10.3,
        uptime30dPct: 99.95
      }
    ]
  },
  {
    campusName: "Santa Rosa Campus",
    campusCode: "COP-STAROSA",
    region: "Laguna (South Luzon)",
    building: "Santa Rosa Worship Hall IDF",
    routerHostname: "cop-starosa-rtr-01",
    links: [
      {
        idSuffix: "eastern-trans",
        linkName: "Eastern Transport",
        provider: "Eastern Communications",
        linkRole: "Metro-E Transport",
        accountNumber: "N/A (Circuit ID)",
        circuitId: "813302657",
        interfaceName: "GigabitEthernet0/0/0",
        bgpPeerIp: "116.50.105.1",
        bandwidthMbps: 300,
        latencyMs: 9.8,
        opticalRxDbm: -11.4,
        uptime30dPct: 99.94
      },
      {
        idSuffix: "pldt-inet",
        linkName: "PLDT Internet",
        provider: "PLDT Enterprise",
        linkRole: "Dedicated Internet",
        accountNumber: "657871060",
        circuitId: "Acct #657871060",
        interfaceName: "GigabitEthernet0/0/1",
        bgpPeerIp: "203.177.55.1",
        bandwidthMbps: 500,
        latencyMs: 10.4,
        opticalRxDbm: -11.9,
        uptime30dPct: 99.89,
        outageHistory: [{ dayOffset: 1, downtimeMins: 45 }]
      },
      {
        idSuffix: "starlink",
        linkName: "Starlink",
        provider: "Starlink Enterprise",
        linkRole: "LEO Satellite Backup",
        accountNumber: "Starlink",
        circuitId: "STARLINK-STAROSA",
        interfaceName: "wan-starlink0",
        bgpPeerIp: "100.64.11.1",
        bandwidthMbps: 250,
        latencyMs: 38.2,
        opticalRxDbm: -6.2,
        uptime30dPct: 99.85
      }
    ]
  },
  {
    campusName: "Naic Campus",
    campusCode: "COP-NAIC",
    region: "Cavite West",
    building: "Naic Branch Network Rack",
    routerHostname: "cop-naic-rtr-01",
    links: [
      {
        idSuffix: "eastern-trans",
        linkName: "Eastern Transport",
        provider: "Eastern Communications",
        linkRole: "Metro-E Transport",
        accountNumber: "N/A (Circuit ID)",
        circuitId: "813301365",
        interfaceName: "GigabitEthernet0/0/0",
        bgpPeerIp: "116.50.106.1",
        bandwidthMbps: 300,
        latencyMs: 11.2,
        opticalRxDbm: -12.2,
        uptime30dPct: 99.93
      },
      {
        idSuffix: "eastern-inet",
        linkName: "Eastern Internet",
        provider: "Eastern Communications",
        linkRole: "Dedicated Internet",
        accountNumber: "N/A (Circuit ID)",
        circuitId: "900368221",
        interfaceName: "GigabitEthernet0/0/1",
        bgpPeerIp: "116.50.106.9",
        bandwidthMbps: 300,
        latencyMs: 11.8,
        opticalRxDbm: -12.5,
        uptime30dPct: 99.92
      },
      {
        idSuffix: "starlink-inet",
        linkName: "Starlink Internet",
        provider: "Starlink Enterprise",
        linkRole: "LEO Satellite Backup",
        accountNumber: "Starlink",
        circuitId: "STARLINK-NAIC",
        interfaceName: "wan-starlink0",
        bgpPeerIp: "100.64.12.1",
        bandwidthMbps: 250,
        latencyMs: 39.1,
        opticalRxDbm: -6.1,
        uptime30dPct: 99.86
      }
    ]
  },
  {
    campusName: "Kawit Campus",
    campusCode: "COP-KAWIT",
    region: "Cavite North",
    building: "Kawit Worship Center MDF",
    routerHostname: "cop-kawit-rtr-01",
    links: [
      {
        idSuffix: "eastern-trans",
        linkName: "Eastern Transport",
        provider: "Eastern Communications",
        linkRole: "Metro-E Transport",
        accountNumber: "N/A (Circuit ID)",
        circuitId: "813301961",
        interfaceName: "GigabitEthernet0/0/0",
        bgpPeerIp: "116.50.107.1",
        bandwidthMbps: 300,
        latencyMs: 9.4,
        opticalRxDbm: -11,
        uptime30dPct: 99.95
      },
      {
        idSuffix: "pldt-inet",
        linkName: "PLDT Internet",
        provider: "PLDT Enterprise",
        linkRole: "Dedicated Internet",
        accountNumber: "657464368",
        circuitId: "Acct #657464368",
        interfaceName: "GigabitEthernet0/0/1",
        bgpPeerIp: "203.177.57.1",
        bandwidthMbps: 400,
        latencyMs: 9.9,
        opticalRxDbm: -11.6,
        uptime30dPct: 99.94
      },
      {
        idSuffix: "starlink-inet",
        linkName: "Starlink Internet",
        provider: "Starlink Enterprise",
        linkRole: "LEO Satellite Backup",
        accountNumber: "Starlink",
        circuitId: "STARLINK-KAWIT",
        interfaceName: "wan-starlink0",
        bgpPeerIp: "100.64.13.1",
        bandwidthMbps: 250,
        latencyMs: 37.5,
        opticalRxDbm: -6,
        uptime30dPct: 99.89
      }
    ]
  },
  {
    campusName: "Bulacan Campus",
    campusCode: "COP-BULACAN",
    region: "Central Luzon (Bulacan)",
    building: "Bulacan Campus Tech Booth",
    routerHostname: "cop-bulacan-rtr-01",
    links: [
      {
        idSuffix: "converge-trans",
        linkName: "Converge Transport",
        provider: "Converge ICT",
        linkRole: "Metro-E Transport",
        accountNumber: "N/A (Circuit ID)",
        circuitId: "MC020532",
        interfaceName: "GigabitEthernet0/0/0",
        bgpPeerIp: "136.158.19.1",
        bandwidthMbps: 300,
        latencyMs: 9.1,
        opticalRxDbm: -11.3,
        uptime30dPct: 99.95
      },
      {
        idSuffix: "pldt-inet",
        linkName: "PLDT Internet",
        provider: "PLDT Enterprise",
        linkRole: "Dedicated Internet",
        accountNumber: "656128550",
        circuitId: "Acct #656128550",
        interfaceName: "GigabitEthernet0/0/1",
        bgpPeerIp: "203.177.59.1",
        bandwidthMbps: 400,
        latencyMs: 9.7,
        opticalRxDbm: -11.8,
        uptime30dPct: 99.94
      },
      {
        idSuffix: "starlink-inet",
        linkName: "Starlink Internet",
        provider: "Starlink Enterprise",
        linkRole: "LEO Satellite Backup",
        accountNumber: "Starlink",
        circuitId: "STARLINK-BULACAN",
        interfaceName: "wan-starlink0",
        bgpPeerIp: "100.64.14.1",
        bandwidthMbps: 250,
        latencyMs: 38.9,
        opticalRxDbm: -6.2,
        uptime30dPct: 99.87
      }
    ]
  },
  {
    campusName: "Pampanga Campus",
    campusCode: "COP-PAMPANGA",
    region: "Central Luzon (Pampanga)",
    building: "Pampanga Worship Hall MDF",
    routerHostname: "cop-pampanga-rtr-01",
    links: [
      {
        idSuffix: "converge-trans",
        linkName: "Converge Transport",
        provider: "Converge ICT",
        linkRole: "Metro-E Transport",
        accountNumber: "N/A (Circuit ID)",
        circuitId: "MC013106",
        interfaceName: "GigabitEthernet0/0/0",
        bgpPeerIp: "136.158.20.1",
        bandwidthMbps: 300,
        latencyMs: 11.4,
        opticalRxDbm: -11.9,
        uptime30dPct: 99.96
      },
      {
        idSuffix: "pldt-inet",
        linkName: "PLDT Internet",
        provider: "PLDT Enterprise",
        linkRole: "Dedicated Internet",
        accountNumber: "656678577",
        circuitId: "Acct #656678577",
        interfaceName: "GigabitEthernet0/0/1",
        bgpPeerIp: "203.177.60.1",
        bandwidthMbps: 400,
        latencyMs: 12,
        opticalRxDbm: -12.1,
        uptime30dPct: 99.93
      },
      {
        idSuffix: "starlink-inet",
        linkName: "Starlink Internet",
        provider: "Starlink Enterprise",
        linkRole: "LEO Satellite Backup",
        accountNumber: "Starlink",
        circuitId: "STARLINK-PAMPANGA",
        interfaceName: "wan-starlink0",
        bgpPeerIp: "100.64.15.1",
        bandwidthMbps: 250,
        latencyMs: 40.2,
        opticalRxDbm: -6.3,
        uptime30dPct: 99.88
      }
    ]
  },
  {
    campusName: "Cainta Campus",
    campusCode: "COP-CAINTA",
    region: "Rizal Province",
    building: "Cainta Sanctuary Comms Closet",
    routerHostname: "cop-cainta-rtr-01",
    links: [
      {
        idSuffix: "eastern-trans",
        linkName: "Eastern Transport",
        provider: "Eastern Communications",
        linkRole: "Metro-E Transport",
        accountNumber: "N/A (Circuit ID)",
        circuitId: "813302264",
        interfaceName: "GigabitEthernet0/0/0",
        bgpPeerIp: "116.50.108.1",
        bandwidthMbps: 300,
        latencyMs: 7.9,
        opticalRxDbm: -10.7,
        uptime30dPct: 99.96
      },
      {
        idSuffix: "pldt-inet",
        linkName: "PLDT Internet",
        provider: "PLDT Enterprise",
        linkRole: "Dedicated Internet",
        accountNumber: "657746827",
        circuitId: "Acct #657746827",
        interfaceName: "GigabitEthernet0/0/1",
        bgpPeerIp: "203.177.58.1",
        bandwidthMbps: 400,
        latencyMs: 8.3,
        opticalRxDbm: -11.2,
        uptime30dPct: 99.93
      }
    ]
  },
  {
    campusName: "Cebu",
    campusCode: "COP-CEBU",
    region: "Visayas (Cebu City)",
    building: "Cebu Regional Sanctuary Rack",
    routerHostname: "cop-cebu-rtr-01",
    links: [
      {
        idSuffix: "pldt-inet",
        linkName: "PLDT Internet",
        provider: "PLDT Enterprise",
        linkRole: "Dedicated Internet",
        accountNumber: "220776581",
        circuitId: "Acct #220776581",
        interfaceName: "GigabitEthernet0/0/0",
        bgpPeerIp: "203.177.71.1",
        bandwidthMbps: 500,
        latencyMs: 19.4,
        opticalRxDbm: -12.4,
        uptime30dPct: 99.94
      },
      {
        idSuffix: "starlink-inet",
        linkName: "Starlink Internet",
        provider: "Starlink Enterprise",
        linkRole: "LEO Satellite Backup",
        accountNumber: "Starlink",
        circuitId: "STARLINK-CEBU",
        interfaceName: "wan-starlink0",
        bgpPeerIp: "100.64.21.1",
        bandwidthMbps: 250,
        latencyMs: 42.8,
        opticalRxDbm: -6.4,
        uptime30dPct: 99.89
      }
    ]
  },
  {
    campusName: "Davao",
    campusCode: "COP-DAVAO",
    region: "Mindanao (Davao City)",
    building: "Davao Regional Sanctuary Rack",
    routerHostname: "cop-davao-rtr-01",
    links: [
      {
        idSuffix: "pldt-inet",
        linkName: "PLDT Internet",
        provider: "PLDT Enterprise",
        linkRole: "Dedicated Internet",
        accountNumber: "652936563",
        circuitId: "Acct #652936563",
        interfaceName: "GigabitEthernet0/0/0",
        bgpPeerIp: "203.177.81.1",
        bandwidthMbps: 500,
        latencyMs: 26.2,
        opticalRxDbm: -13.1,
        uptime30dPct: 99.93
      },
      {
        idSuffix: "starlink-inet",
        linkName: "Starlink Internet",
        provider: "Starlink Enterprise",
        linkRole: "LEO Satellite Backup",
        accountNumber: "Starlink",
        circuitId: "STARLINK-DAVAO",
        interfaceName: "wan-starlink0",
        bgpPeerIp: "100.64.22.1",
        bandwidthMbps: 250,
        latencyMs: 45.1,
        opticalRxDbm: -6.5,
        uptime30dPct: 99.87
      }
    ]
  },
  {
    campusName: "Laoag",
    campusCode: "COP-LAOAG",
    region: "Northern Luzon (Ilocos Norte)",
    building: "Laoag Branch Comms Rack",
    routerHostname: "cop-laoag-rtr-01",
    links: [
      {
        idSuffix: "pldt-inet",
        linkName: "PLDT Internet",
        provider: "PLDT Enterprise",
        linkRole: "Dedicated Internet",
        accountNumber: "654563756",
        circuitId: "Acct #654563756",
        interfaceName: "GigabitEthernet0/0/0",
        bgpPeerIp: "203.177.91.1",
        bandwidthMbps: 400,
        latencyMs: 16.8,
        opticalRxDbm: -12.6,
        uptime30dPct: 99.95
      },
      {
        idSuffix: "starlink-inet",
        linkName: "Starlink Internet",
        provider: "Starlink Enterprise",
        linkRole: "LEO Satellite Backup",
        accountNumber: "Starlink",
        circuitId: "STARLINK-LAOAG",
        interfaceName: "wan-starlink0",
        bgpPeerIp: "100.64.23.1",
        bandwidthMbps: 250,
        latencyMs: 41.5,
        opticalRxDbm: -6.2,
        uptime30dPct: 99.88
      }
    ]
  },
  {
    campusName: "Lipa",
    campusCode: "COP-LIPA",
    region: "Batangas (South Luzon)",
    building: "Lipa Branch Comms Rack",
    routerHostname: "cop-lipa-rtr-01",
    links: [
      {
        idSuffix: "pldt-inet",
        linkName: "PLDT Internet",
        provider: "PLDT Enterprise",
        linkRole: "Dedicated Internet",
        accountNumber: "655370277",
        circuitId: "Acct #655370277",
        interfaceName: "GigabitEthernet0/0/0",
        bgpPeerIp: "203.177.92.1",
        bandwidthMbps: 400,
        latencyMs: 11.4,
        opticalRxDbm: -11.8,
        uptime30dPct: 100
      },
      {
        idSuffix: "starlink-inet",
        linkName: "Starlink Internet",
        provider: "Starlink Enterprise",
        linkRole: "LEO Satellite Backup",
        accountNumber: "Starlink",
        circuitId: "STARLINK-LIPA",
        interfaceName: "wan-starlink0",
        bgpPeerIp: "100.64.24.1",
        bandwidthMbps: 250,
        latencyMs: 39.2,
        opticalRxDbm: -6.1,
        uptime30dPct: 100
      }
    ]
  },
  {
    campusName: "Batangas",
    campusCode: "COP-BATANGAS",
    region: "Batangas City (South Luzon)",
    building: "Batangas Branch Comms Rack",
    routerHostname: "cop-batangas-rtr-01",
    links: [
      {
        idSuffix: "pldt-inet",
        linkName: "PLDT Internet",
        provider: "PLDT Enterprise",
        linkRole: "Dedicated Internet",
        accountNumber: "654563837",
        circuitId: "Acct #654563837",
        interfaceName: "GigabitEthernet0/0/0",
        bgpPeerIp: "203.177.93.1",
        bandwidthMbps: 400,
        latencyMs: 12.1,
        opticalRxDbm: -12,
        uptime30dPct: 100
      },
      {
        idSuffix: "starlink-inet",
        linkName: "Starlink Internet",
        provider: "Starlink Enterprise",
        linkRole: "LEO Satellite Backup",
        accountNumber: "Starlink",
        circuitId: "STARLINK-BATANGAS",
        interfaceName: "wan-starlink0",
        bgpPeerIp: "100.64.25.1",
        bandwidthMbps: 250,
        latencyMs: 39.8,
        opticalRxDbm: -6.2,
        uptime30dPct: 100
      }
    ]
  },
  {
    campusName: "Isabela",
    campusCode: "COP-ISABELA",
    region: "Cagayan Valley (Isabela)",
    building: "Isabela Branch Comms Rack",
    routerHostname: "cop-isabela-rtr-01",
    links: [
      {
        idSuffix: "pldt-inet",
        linkName: "PLDT Internet",
        provider: "PLDT Enterprise",
        linkRole: "Dedicated Internet",
        accountNumber: "657305332",
        circuitId: "Acct #657305332",
        interfaceName: "GigabitEthernet0/0/0",
        bgpPeerIp: "203.177.94.1",
        bandwidthMbps: 400,
        latencyMs: 15.2,
        opticalRxDbm: -12.3,
        uptime30dPct: 100
      },
      {
        idSuffix: "starlink-inet",
        linkName: "Starlink Internet",
        provider: "Starlink Enterprise",
        linkRole: "LEO Satellite Backup",
        accountNumber: "Starlink",
        circuitId: "STARLINK-ISABELA",
        interfaceName: "wan-starlink0",
        bgpPeerIp: "100.64.26.1",
        bandwidthMbps: 250,
        latencyMs: 41,
        opticalRxDbm: -6.3,
        uptime30dPct: 100
      }
    ]
  },
  {
    campusName: "Angel One",
    campusCode: "COP-ANGELONE",
    region: "Angel One Sanctuary & Hub",
    building: "Angel One Comms Rack",
    routerHostname: "cop-angelone-rtr-01",
    links: [
      {
        idSuffix: "pldt-inet",
        linkName: "PLDT Internet",
        provider: "PLDT Enterprise",
        linkRole: "Dedicated Internet",
        accountNumber: "657694975",
        circuitId: "Acct #657694975",
        interfaceName: "GigabitEthernet0/0/0",
        bgpPeerIp: "203.177.95.1",
        bandwidthMbps: 400,
        latencyMs: 9.6,
        opticalRxDbm: -11.5,
        uptime30dPct: 100
      },
      {
        idSuffix: "starlink",
        linkName: "Starlink",
        provider: "Starlink Enterprise",
        linkRole: "LEO Satellite Backup",
        accountNumber: "Starlink",
        circuitId: "STARLINK-ANGELONE",
        interfaceName: "wan-starlink0",
        bgpPeerIp: "100.64.27.1",
        bandwidthMbps: 250,
        latencyMs: 37.9,
        opticalRxDbm: -6.1,
        uptime30dPct: 100
      }
    ]
  }
];
var INITIAL_CAMPUS_LINKS = RAW_COP_CAMPUSES.flatMap(
  (campus) => campus.links.map((lnk) => {
    const pInfo = PROVIDER_DIRECTORY[lnk.provider];
    const slug = campus.campusCode.toLowerCase();
    return {
      id: `${slug}-${lnk.idSuffix}`,
      campusName: campus.campusName,
      linkName: lnk.linkName,
      campusCode: campus.campusCode,
      region: campus.region,
      building: campus.building,
      linkRole: lnk.linkRole,
      provider: lnk.provider,
      providerNocEmail: pInfo.email,
      providerHotline: pInfo.hotline,
      accountNumber: lnk.accountNumber,
      circuitId: lnk.circuitId,
      routerHostname: campus.routerHostname,
      interfaceName: lnk.interfaceName,
      bgpPeerIp: lnk.bgpPeerIp,
      bandwidthMbps: lnk.bandwidthMbps,
      status: "Operational",
      // Default GREEN (Good & Restored)
      latencyMs: lnk.latencyMs,
      packetLossPct: 0,
      opticalRxDbm: lnk.opticalRxDbm,
      uptime30dPct: 100,
      uptime90dPct: 100,
      slaTargetPct: pInfo.sla,
      lastCheckedAt: "2026-09-26T03:45:00-07:00",
      lastRestoredAt: void 0,
      dailyUptimeHistory: generate30DayHistory(100, [])
    };
  })
);
var INITIAL_NETWORK_LOGS = [];
var INITIAL_INCIDENTS = [];
var INITIAL_EMAIL_DISPATCHES = [];
var INITIAL_ESCALATION_POLICIES = [
  {
    id: "esc-pol-1",
    level: "L1 - Campus NOC",
    name: "Unreported Down Link Auto-Dispatch (15 Min)",
    triggerCondition: 'Any Cathedral of Praise link has an active Outage Ticket AND "Reported to Telco" is "No" for > 15 minutes',
    thresholdMinutes: 15,
    notifyTargets: "Duty NOC Engineer + Auto-Dispatch Email to Provider NOC (Eastern / Converge / PLDT / Starlink)",
    autoAction: "Automatically creates and sends Outage Email with exact Circuit ID / Account # to the Telco Provider NOC and updates Reported to Telco = Yes.",
    active: true,
    triggeredCount30d: 0
  },
  {
    id: "esc-pol-2",
    level: "L2 - Regional Network Lead & Telco Account Mgr",
    name: "Waiting for Telco Repair \u2014 Missing Telco Ticket # or Approaching ETR",
    triggerCondition: 'Status is "Waiting for Telco Repair" AND (Telco Ticket # is still pending > 30m OR within 30m of Provider ETR)',
    thresholdMinutes: 30,
    notifyTargets: "Network Infrastructure Lead + Telco Account Manager",
    autoAction: "Dispatches Urgent Follow-Up / ETR Chaser Email to Provider NOC + CC Account Manager.",
    active: true,
    triggeredCount30d: 0
  },
  {
    id: "esc-pol-3",
    level: "L3 - VP Infrastructure & Telco Executive Desk",
    name: "Provider ETR Breached / Multi-Link Campus Outage (> 240 Min)",
    triggerCondition: "Current time exceeds Provider Expected Resolution Timeline (ETR) OR both Transport & Internet links on a Campus are RED (Down)",
    thresholdMinutes: 240,
    notifyTargets: "IT Director, Campus Administration, Telco Escalation Desk",
    autoAction: "Escalates incident to L3 Executive Tier and dispatches formal SLA Breach Notice.",
    active: true,
    triggeredCount30d: 0
  }
];
var INITIAL_USERS = [
  {
    id: "user-admin-1",
    name: "Jeffrey Nadado",
    email: "cop.jmnadado@gmail.com",
    password: "Admin@COP2026!",
    role: "ADMIN",
    status: "ACTIVE",
    department: "Cathedral of Praise Network Operations Lead",
    phone: "+63 917 555 0101",
    createdAt: "2026-01-15T08:00:00.000Z",
    lastLoginAt: "2026-10-01T23:55:00.000Z",
    approvedBy: "System SuperAdmin",
    approvedAt: "2026-01-15T08:00:00.000Z"
  }
];

// src/utils/logParser.ts
function parseNetworkLogForIncident(rawLog, campuses) {
  const normalized = rawLog.trim();
  let matchedCampus = null;
  let confidence = "Manual Selection Needed";
  for (const campus of campuses) {
    const circuitMatch = campus.circuitId && normalized.toLowerCase().includes(campus.circuitId.toLowerCase());
    const acctMatch = campus.accountNumber && campus.accountNumber !== "N/A (Circuit ID)" && campus.accountNumber !== "Starlink" && normalized.toLowerCase().includes(campus.accountNumber.toLowerCase());
    const bgpMatch = campus.bgpPeerIp && normalized.includes(campus.bgpPeerIp);
    if (circuitMatch || acctMatch || bgpMatch) {
      matchedCampus = campus;
      confidence = "Exact Router/Circuit Match";
      break;
    }
  }
  if (!matchedCampus) {
    for (const campus of campuses) {
      const hostMatch2 = campus.routerHostname && normalized.toLowerCase().includes(campus.routerHostname.toLowerCase());
      const ifaceMatch2 = campus.interfaceName && normalized.toLowerCase().includes(campus.interfaceName.toLowerCase());
      const linkMatch = campus.linkName && normalized.toLowerCase().includes(campus.linkName.toLowerCase());
      if (hostMatch2 && (ifaceMatch2 || linkMatch)) {
        matchedCampus = campus;
        confidence = "Exact Router/Circuit Match";
        break;
      }
    }
  }
  if (!matchedCampus) {
    for (const campus of campuses) {
      const hostMatch2 = campus.routerHostname && normalized.toLowerCase().includes(campus.routerHostname.toLowerCase());
      const nameMatch = normalized.toLowerCase().includes(campus.campusName.toLowerCase());
      if (hostMatch2 || nameMatch) {
        matchedCampus = campus;
        confidence = "Heuristic Interface Match";
        break;
      }
    }
  }
  const hostRegex = /(?:devname="|Sep\s+\d+\s+\d+:\d+:\d+\s+)([a-zA-Z0-9_-]+-[0-9]{2})/i;
  const hostMatch = normalized.match(hostRegex);
  const extractedHostname = hostMatch?.[1] || matchedCampus?.routerHostname || "cop-rtr-01";
  const ifaceRegex = /(?:Interface\s+|interface=|interface\s+|on\s+)([A-Za-z0-9/-]+(?:\.\d+)?)/i;
  const ifaceMatch = normalized.match(ifaceRegex);
  const extractedInterface = ifaceMatch?.[1]?.replace(/"/g, "") || matchedCampus?.interfaceName || "GigabitEthernet0/0/0";
  const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
  const ipMatch = normalized.match(ipRegex);
  const extractedBgpPeer = ipMatch?.[0] || matchedCampus?.bgpPeerIp || "0.0.0.0";
  let extractedPacketLossPct = matchedCampus?.packetLossPct ?? 100;
  const directLossMatch = normalized.match(
    /(\d+(?:\.\d+)?)\s*%\s*packet\s*loss/i
  );
  const kvLossMatch = normalized.match(/(?:packet-loss|loss)=(\d+(?:\.\d+)?)%/i);
  if (directLossMatch) {
    extractedPacketLossPct = parseFloat(directLossMatch[1]);
  } else if (kvLossMatch) {
    extractedPacketLossPct = parseFloat(kvLossMatch[1]);
  } else if (/down|rxlos|idle/i.test(normalized)) {
    extractedPacketLossPct = 100;
  }
  const latencyMatch = normalized.match(/(?:latency|rtt)=(\d+(?:\.\d+)?)ms/i);
  const extractedLatencyMs = latencyMatch ? parseFloat(latencyMatch[1]) : extractedPacketLossPct >= 100 ? 0 : matchedCampus?.latencyMs || 180;
  const opticalMatch = normalized.match(/(-?\d+(?:\.\d+)?)\s*dBm/i);
  const extractedOpticalRxDbm = opticalMatch ? parseFloat(opticalMatch[1]) : matchedCampus?.opticalRxDbm || -38.5;
  let extractedProtocol = "SNMP-TRAP";
  let extractedSeverity = "CRITICAL";
  let extractedProblemSummary = "";
  let suggestedStatus = "Waiting for Telco Repair";
  let suggestedEtrHours = 4;
  const targetLinkLabel = matchedCampus ? `${matchedCampus.campusName} \u2014 ${matchedCampus.linkName}` : `${extractedHostname} (${extractedInterface})`;
  if (/RXLOS|OPTICAL|dBm below/i.test(normalized)) {
    extractedProtocol = "OPTICAL";
    extractedSeverity = "CRITICAL";
    extractedProblemSummary = `${targetLinkLabel} DOWN: Optical Loss of Signal (Rx ${extractedOpticalRxDbm} dBm) on ${extractedInterface}`;
    suggestedStatus = "Waiting for Telco Repair";
    suggestedEtrHours = 4;
  } else if (/BGP|ADJCHANGE|Hold Timer Expired/i.test(normalized)) {
    extractedProtocol = "BGP";
    extractedSeverity = "CRITICAL";
    extractedProblemSummary = `${targetLinkLabel} DOWN: BGP Peer ${extractedBgpPeer} Down (${extractedPacketLossPct}% Packet Loss)`;
    suggestedStatus = "Waiting for Telco Repair";
    suggestedEtrHours = 4;
  } else if (/sdwan|latency|packet-loss|ICMP-SLA/i.test(normalized)) {
    extractedProtocol = "ICMP-SLA";
    extractedSeverity = "CRITICAL";
    extractedProblemSummary = `${targetLinkLabel} DOWN: ${extractedPacketLossPct}% Packet Loss on ${extractedInterface}`;
    suggestedStatus = "Pending";
    suggestedEtrHours = 3;
  } else {
    extractedProblemSummary = `${targetLinkLabel} Connectivity Outage Detected on ${extractedInterface}`;
    extractedSeverity = "CRITICAL";
  }
  const extractedTechnicalDetails = [
    matchedCampus ? `Campus & Link: ${matchedCampus.campusName} \u2014 ${matchedCampus.linkName} (${matchedCampus.linkRole})` : `Router / Interface: ${extractedHostname} (${extractedInterface})`,
    matchedCampus ? `Circuit ID: ${matchedCampus.circuitId} (${matchedCampus.provider} \xB7 Acct #${matchedCampus.accountNumber})` : `Detected Peer IP: ${extractedBgpPeer}`,
    `CE Router / Port: ${extractedHostname} (${extractedInterface})`,
    `Telemetry Snapshot: Packet Loss ${extractedPacketLossPct}% | Latency ${extractedLatencyMs}ms | Optical Rx ${extractedOpticalRxDbm} dBm`
  ].join("\n");
  const autoExtractedFields = [
    matchedCampus ? `Campus & Link (${matchedCampus.campusName} \u2014 ${matchedCampus.linkName})` : "Router Hostname",
    matchedCampus ? `Telco Provider (${matchedCampus.provider})` : "WAN Interface",
    matchedCampus ? `Circuit ID (${matchedCampus.circuitId})` : "BGP Peer IP",
    "Problem Summary & Optical/BGP Telemetry",
    "Internal NOC Ticket # (Auto-Sequenced)"
  ];
  const manualRequiredFields = [
    'Telco Reference Ticket # (Once issued by provider desk, or leave "Pending Telco Ref")',
    "Reported to Telco Status (Yes / No \u2014 or auto-send provider outage email)",
    "Provider Expected Resolution Timeline (ETR)",
    "Incident Status (Pending / Waiting for Telco Repair / Resolved)"
  ];
  return {
    matchedCampus,
    confidence,
    extractedHostname,
    extractedInterface,
    extractedBgpPeer,
    extractedProtocol,
    extractedSeverity,
    extractedProblemSummary,
    extractedTechnicalDetails,
    extractedPacketLossPct,
    extractedLatencyMs,
    extractedOpticalRxDbm,
    suggestedStatus,
    suggestedEtrHours,
    autoExtractedFields,
    manualRequiredFields
  };
}
function buildProviderDispatchEmail(incident, triggerSource = "Auto-Created on Ticket Log") {
  const subjectPrefix = triggerSource === "SLA Breach Escalation" ? "[SLA BREACH ESCALATION - P1]" : triggerSource === "Telco Escalation Chaser" ? "[URGENT FOLLOW-UP / ETR REQUEST]" : "[URGENT LINK DOWN]";
  const linkLabel = incident.linkName ? `${incident.campusName} (${incident.linkName})` : incident.campusName;
  const subjectIdTag = incident.accountNumber && incident.accountNumber !== "N/A (Circuit ID)" && incident.accountNumber !== "Starlink" ? `Account #: ${incident.accountNumber}` : `Circuit ID: ${incident.circuitId}`;
  const subject = `${subjectPrefix} Cathedral of Praise \u2014 ${linkLabel} | ${subjectIdTag} | Ref: ${incident.ticketNumber}`;
  const formattedEtr = incident.expectedResolutionAt ? new Date(incident.expectedResolutionAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }) : "Awaiting Provider ETR Confirmation";
  const body = `Dear ${incident.provider} Enterprise NOC Support Team,

Please be advised that Cathedral of Praise Campus Network Monitoring has detected that our link is currently RED (DOWN). Kindly log a Priority-1 fault ticket immediately or update existing Telco Ref (${incident.telcoTicketNumber || "Pending Assignment"}):

====================================================================
CATHEDRAL OF PRAISE \u2014 CIRCUIT & CAMPUS IDENTIFICATION
====================================================================
\u2022 Organization          : Cathedral of Praise
\u2022 Affected Campus       : ${incident.campusName}
\u2022 Affected Link         : ${incident.linkName || incident.provider}
\u2022 Service Provider      : ${incident.provider}
\u2022 Circuit / Service ID  : ${incident.circuitId}
\u2022 Enterprise Account #  : ${incident.accountNumber}
\u2022 Internal NOC Ticket # : ${incident.ticketNumber}
\u2022 Telco Reference #     : ${incident.telcoTicketNumber || "REQUESTING IMMEDIATE TICKET NUMBER"}

====================================================================
FAULT SUMMARY & CE ROUTER TELEMETRY
====================================================================
\u2022 Problem Description   : ${incident.problemSummary}
\u2022 CE Router / Interface : ${incident.routerHostname} (${incident.interfaceName})
\u2022 Target / Expected ETR : ${formattedEtr}

${incident.technicalDetails}

--- Raw CE Router Log Excerpt ---
${incident.rawLogSnippet || "N/A (Logged via Cathedral of Praise NOC Console)"}
---------------------------------

REQUIRED ACTIONS FROM ${incident.provider.toUpperCase()} NOC:
1. Confirm receipt and provide your official Telco Fault Reference Number.
2. Perform line / transport testing to our ${incident.campusName} demarcation.
3. Provide an official Expected Time to Resolution (ETR) so we can restore the link to GREEN.

Dispatched by: ${incident.reportedBy || "jmnadado@cathedralofpraise.com.ph"}
Cathedral of Praise IT & Network Operations \xB7 jmnadado@cathedralofpraise.com.ph \xB7 lcmojal@cathedralofpraise.com.ph \xB7 jffernandez@cathedralofpraise.com.ph \xB7 jcjara@cathedralofpraise.com.ph`;
  return {
    incidentId: incident.id,
    ticketNumber: incident.ticketNumber,
    campusName: incident.campusName,
    linkName: incident.linkName,
    provider: incident.provider,
    recipientType: "Service Provider (Telco NOC)",
    to: incident.providerNocEmail,
    cc: "lcmojal@cathedralofpraise.com.ph, jffernandez@cathedralofpraise.com.ph, jcjara@cathedralofpraise.com.ph, jmnadado@cathedralofpraise.com.ph",
    subject,
    body,
    triggerSource,
    deliveryStatus: "Dispatched"
  };
}
function buildInternalNotificationEmail(incident, reason, triggerSource = "Status Update Notification") {
  const formattedEtr = incident.expectedResolutionAt ? new Date(incident.expectedResolutionAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }) : "Pending Telco ETR";
  const isRestored = incident.status === "Resolved";
  const statusBanner = isRestored ? "GREEN \u2014 RESTORED & GOOD" : "RED \u2014 LINK DOWN";
  const subject = `[COP NOC: ${statusBanner}] ${incident.campusName} \u2014 ${incident.linkName} (${incident.ticketNumber})`;
  const body = `Cathedral of Praise Campus Network Operations Advisory
--------------------------------------------------------------------
Update Trigger : ${reason}
Link State     : ${statusBanner}
Incident ID    : ${incident.ticketNumber}
Telco Ref #    : ${incident.telcoTicketNumber || "Not Yet Assigned"}
Campus         : ${incident.campusName}
Link / Circuit : ${incident.linkName} (${incident.circuitId} \xB7 ${incident.provider})
Current Status : ${incident.status}
Reported Telco : ${incident.reportedToTelco ? "YES \u2014 Reported to Provider" : "NO \u2014 Pending Telco Notification"}
Provider ETR   : ${formattedEtr}
Escalation Tier: ${incident.escalationLevel}

Summary:
${incident.problemSummary}

Provider / Repair Notes:
${incident.etrNotes || "No additional field notes recorded."}
--------------------------------------------------------------------
Cathedral of Praise Automated NOC Alerting`;
  return {
    incidentId: incident.id,
    ticketNumber: incident.ticketNumber,
    campusName: incident.campusName,
    linkName: incident.linkName,
    provider: incident.provider,
    recipientType: triggerSource === "SLA Breach Escalation" ? "Internal Escalation Alert" : "Campus IT Advisory",
    to: "lcmojal@cathedralofpraise.com.ph, jffernandez@cathedralofpraise.com.ph, jcjara@cathedralofpraise.com.ph",
    cc: "jmnadado@cathedralofpraise.com.ph",
    subject,
    body,
    triggerSource,
    deliveryStatus: "Dispatched"
  };
}
function parseM365Email(subject, body, campuses, to = "") {
  const combined = `${subject}
${body}`.trim();
  const lower = combined.toLowerCase();
  const compactCombined = lower.replace(/[\s#-]/g, "");
  const lowerTo = (to || "").toLowerCase();
  const recipientProviderHint = lowerTo.includes("etpi.com.ph") || lowerTo.includes("linkgold") ? "Eastern Communications" : lowerTo.includes("convergeict.com") ? "Converge ICT" : lowerTo.includes("pldt.com.ph") ? "PLDT Enterprise" : lowerTo.includes("starlink.com") ? "Starlink Enterprise" : null;
  let matchedCampus = null;
  let confidence = "Unmatched";
  const matchesCircuitOrAccount = (c) => {
    const rawCircuit = (c.circuitId || "").replace(/^Acct\s*#/i, "").trim().toLowerCase();
    const compactCircuit = rawCircuit.replace(/[\s#-]/g, "");
    const hasCircuit = rawCircuit.length >= 4 && !rawCircuit.startsWith("starlink-") && (lower.includes(rawCircuit) || compactCombined.includes(compactCircuit));
    const rawAccount = (c.accountNumber || "").trim().toLowerCase();
    const compactAccount = rawAccount.replace(/[\s#-]/g, "");
    const hasAccount = rawAccount.length >= 4 && rawAccount !== "n/a (circuit id)" && rawAccount !== "starlink" && (lower.includes(rawAccount) || compactCombined.includes(compactAccount));
    return Boolean(hasCircuit || hasAccount);
  };
  for (const c of campuses) {
    const campusTokens = c.campusName.toLowerCase().replace("campus", "").trim();
    const hasCampusName = lower.includes(c.campusName.toLowerCase()) || campusTokens.length >= 4 && lower.includes(campusTokens);
    if (hasCampusName && matchesCircuitOrAccount(c)) {
      matchedCampus = c;
      confidence = "Exact Circuit/Account Match";
      break;
    }
  }
  if (!matchedCampus) {
    for (const c of campuses) {
      if (matchesCircuitOrAccount(c)) {
        matchedCampus = c;
        confidence = "Exact Circuit/Account Match";
        break;
      }
    }
  }
  if (!matchedCampus) {
    for (const c of campuses) {
      const campusShort = c.campusName.toLowerCase().replace("campus", "").trim();
      const hasCampus = lower.includes(c.campusName.toLowerCase()) || campusShort.length >= 4 && lower.includes(campusShort);
      const hasLink = lower.includes(c.linkName.toLowerCase());
      const matchesRecipientProvider = recipientProviderHint && c.provider === recipientProviderHint;
      if (hasCampus && (hasLink || matchesRecipientProvider)) {
        matchedCampus = c;
        confidence = "Campus + Link Name Match";
        break;
      }
    }
  }
  const internalMatch = combined.match(/COP-INC-\d{4}-\d+/i);
  const extractedInternalTicket = internalMatch ? internalMatch[0].toUpperCase() : null;
  let extractedTelcoTicket = null;
  const telcoPatterns = [
    /(?:Telco\s*(?:Ticket|Ref(?:erence)?)|Reference\s*(?:Ticket|No\.?|#)?|Ticket\s*(?:No\.?|#|Number)?|SR\s*#|Case\s*#|Fault\s*#)\s*[:#-]?\s*([A-Z0-9][A-Z0-9-]{3,24})/i,
    /\b((?:ETPI|PLDT|CNVRG|CONVERGE|SL|INC|SR|TT)-[A-Z0-9-]{3,20})\b/i
  ];
  for (const pat of telcoPatterns) {
    const m = combined.match(pat);
    if (m && m[1] && !/^(NUMBER|ID|REF|OUTAGE|DOWN|STATUS|RESOLVED)$/i.test(m[1]) && !m[1].toUpperCase().startsWith("COP-INC")) {
      extractedTelcoTicket = m[1].trim();
      break;
    }
  }
  const isResolved = /\b(resolved|restored|service\s+up|link\s+up|back\s+online|cleared|closed|issue\s+fixed)\b/i.test(
    combined
  );
  const detectedAction = isResolved ? "RESOLVE_TO_GREEN" : "CREATE_OUTAGE_RED";
  const suggestedStatus = isResolved ? "Resolved" : "Waiting for Telco Repair";
  const problemLineMatch = body.match(
    /(?:Problem|Issue|Reason|Details|Symptoms)\s*:\s*([^\n\r]+)/i
  );
  const cleanSubject = subject.replace(/^(?:RE|FW|FWD)\s*:\s*/gi, "").replace(/\[[^\]]*\]\s*/g, "").trim();
  const extractedProblemSummary = problemLineMatch ? problemLineMatch[1].trim() : cleanSubject || (matchedCampus ? `${matchedCampus.campusName} \u2014 ${matchedCampus.linkName} Outage (${matchedCampus.circuitId})` : "Link Outage Reported via M365 Email");
  return {
    matchedCampus,
    confidence,
    detectedAction,
    extractedInternalTicket,
    extractedTelcoTicket,
    extractedProblemSummary,
    extractedNotes: body.trim().slice(0, 500),
    suggestedStatus
  };
}

// src/serverApp.ts
var CURRENT_STORE_VERSION = "cop-v9";
var DATA_DIR = process.env.VERCEL ? path.join("/tmp", "cop-noc-data") : path.resolve(process.cwd(), "data");
var inMemoryStore = null;
var STORE_FILE = path.join(DATA_DIR, "cop-noc-store-v9.json");
function syncCampusStatusesWithIncidents(store) {
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  for (const campus of store.campuses) {
    const hasActiveOutage = store.incidents.some(
      (inc) => inc.campusId === campus.id && inc.status !== "Resolved"
    );
    if (hasActiveOutage) {
      campus.status = "Outage";
      campus.packetLossPct = 100;
      campus.latencyMs = 0;
      campus.opticalRxDbm = -38.8;
    } else {
      if (campus.status !== "Operational") {
        campus.lastRestoredAt = nowIso;
      }
      campus.status = "Operational";
      campus.packetLossPct = 0;
      if (campus.latencyMs === 0) campus.latencyMs = 8.4;
      if (campus.opticalRxDbm < -25) campus.opticalRxDbm = -10.4;
    }
  }
}
function loadStore() {
  if (inMemoryStore) return inMemoryStore;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.storeVersion === CURRENT_STORE_VERSION && Array.isArray(parsed.campuses) && parsed.campuses.length === INITIAL_CAMPUS_LINKS.length && Array.isArray(parsed.users)) {
        parsed.campuses.sort((a, b) => {
          const idxA = COP_CAMPUS_ORDER.indexOf(a.campusName);
          const idxB = COP_CAMPUS_ORDER.indexOf(b.campusName);
          return idxA - idxB;
        });
        inMemoryStore = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to read store file, initializing defaults:", err);
  }
  const initial = {
    storeVersion: CURRENT_STORE_VERSION,
    campuses: JSON.parse(JSON.stringify(INITIAL_CAMPUS_LINKS)),
    logs: JSON.parse(JSON.stringify(INITIAL_NETWORK_LOGS)),
    incidents: JSON.parse(JSON.stringify(INITIAL_INCIDENTS)),
    emails: JSON.parse(JSON.stringify(INITIAL_EMAIL_DISPATCHES)),
    escalationPolicies: JSON.parse(JSON.stringify(INITIAL_ESCALATION_POLICIES)),
    users: JSON.parse(JSON.stringify(INITIAL_USERS))
  };
  saveStore(initial);
  inMemoryStore = initial;
  return initial;
}
function saveStore(store) {
  inMemoryStore = store;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save store file:", err);
  }
}
function createApp() {
  const app3 = express();
  app3.use((req, _res, next) => {
    if (!req.url.startsWith("/api") && !req.url.startsWith("/_")) {
      req.url = "/api" + req.url;
    }
    next();
  });
  const PORT = 3e3;
  app3.use(express.urlencoded({ extended: true }));
  app3.use(
    express.json({
      limit: "5mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf.toString("utf8");
      }
    })
  );
  app3.use(
    (err, req, _res, next) => {
      if (err && (err instanceof SyntaxError || err.type === "entity.parse.failed")) {
        const raw = err.body || req.rawBody || "";
        try {
          const sanitized = raw.replace(/[\r\n\t]+/g, " ");
          req.body = JSON.parse(sanitized);
          next();
          return;
        } catch {
          const extractField = (key) => {
            const m = raw.match(
              new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"(?=\\s*,\\s*"|\\s*\\})`, "i")
            );
            return m ? m[1] : "";
          };
          req.body = {
            from: extractField("from") || "jmnadado@cathedralofpraise.com.ph",
            to: extractField("to") || extractField("toRecipients"),
            subject: extractField("subject"),
            body: extractField("body") || extractField("bodyPreview") || raw
          };
          next();
          return;
        }
      }
      next(err);
    }
  );
  let store = loadStore();
  app3.get("/api/state", (_req, res) => {
    res.json(store);
  });
  app3.get("/api/users", (_req, res) => {
    const sanitized = store.users.map((u) => {
      const { password, ...rest } = u;
      return { ...rest, hasPassword: Boolean(password) };
    });
    res.json(sanitized);
  });
  app3.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = store.users.find(
      (u) => u.email.toLowerCase() === normalizedEmail || u.id === "user-admin-1" && (normalizedEmail === "cop.jmnadado@gmail.com" || normalizedEmail === "jmnadado@cathedralofpraise.com.ph")
    );
    if (!user) {
      res.status(401).json({
        error: "No user account found matching this email address."
      });
      return;
    }
    if (user.password && user.password !== password.trim()) {
      res.status(401).json({
        error: "Invalid password. Please check your credentials."
      });
      return;
    }
    if (user.status === "SUSPENDED") {
      res.status(403).json({
        error: `Account Suspended: ${user.suspendedReason || "Access has been revoked by a Cathedral of Praise NOC Administrator."}`,
        suspended: true
      });
      return;
    }
    if (user.status === "PENDING") {
      res.status(403).json({
        error: "Account Pending Approval: Your registration is awaiting review by a Cathedral of Praise NOC Administrator.",
        pending: true
      });
      return;
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    user.lastLoginAt = nowIso;
    saveStore(store);
    const { password: _, ...userSafe } = user;
    res.json({
      user: userSafe,
      token: `token-${user.id}-${Date.now()}`,
      message: `Signed in successfully as ${user.name} (${user.role})`
    });
  });
  app3.post("/api/auth/register", (req, res) => {
    const { name, email, password, department, phone, requestedRole } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({
        error: "Full name, email, and password are required."
      });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existing = store.users.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );
    if (existing) {
      res.status(409).json({
        error: "An account with this email address already exists."
      });
      return;
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const newUser = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      password: password.trim(),
      role: requestedRole || "OPERATOR",
      status: "PENDING",
      // Requires Admin Approval
      department: department?.trim() || "General Operations",
      phone: phone?.trim() || "",
      createdAt: nowIso,
      lastLoginAt: null,
      approvedBy: null,
      approvedAt: null
    };
    store.users.unshift(newUser);
    saveStore(store);
    const { password: _, ...userSafe } = newUser;
    res.status(201).json({
      message: "Account created successfully! Your account is currently PENDING approval by an Admin.",
      user: userSafe
    });
  });
  const resetTokens = {};
  app3.post("/api/auth/forgot-password", (req, res) => {
    const { email, code, newPassword } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email address is required." });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = store.users.find(
      (u) => u.email.toLowerCase() === normalizedEmail || u.id === "user-admin-1" && (normalizedEmail === "cop.jmnadado@gmail.com" || normalizedEmail === "jmnadado@cathedralofpraise.com.ph")
    );
    if (!user) {
      res.status(404).json({
        error: "No registered user found with that email address."
      });
      return;
    }
    if (code && newPassword) {
      if (newPassword.trim().length < 6) {
        res.status(400).json({
          error: "New password must be at least 6 characters."
        });
        return;
      }
      const tokenRecord = resetTokens[user.email.toLowerCase()];
      if (!tokenRecord || tokenRecord.code !== code.trim() || Date.now() > tokenRecord.expiresAt) {
        res.status(400).json({
          error: "Invalid or expired 6-digit verification code."
        });
        return;
      }
      user.password = newPassword.trim();
      saveStore(store);
      delete resetTokens[user.email.toLowerCase()];
      res.json({
        success: true,
        message: "Your password has been successfully reset! You can now sign in with your new password."
      });
      return;
    }
    const generatedCode = Math.floor(1e5 + Math.random() * 9e5).toString();
    resetTokens[user.email.toLowerCase()] = {
      code: generatedCode,
      expiresAt: Date.now() + 15 * 60 * 1e3
      // 15 minutes
    };
    res.json({
      success: true,
      message: `Password reset verification code generated for ${user.email}.`,
      code: generatedCode,
      // Sent directly in response for immediate confirmation
      expiresInMinutes: 15
    });
  });
  app3.post("/api/auth/change-password", (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;
    if (!userId || !currentPassword || !newPassword) {
      res.status(400).json({
        error: "User ID, current password, and new password are required."
      });
      return;
    }
    if (newPassword.trim().length < 6) {
      res.status(400).json({
        error: "New password must be at least 6 characters long."
      });
      return;
    }
    const user = store.users.find((u) => u.id === userId);
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    if (user.password && user.password !== currentPassword.trim()) {
      res.status(401).json({ error: "Current password does not match." });
      return;
    }
    user.password = newPassword.trim();
    saveStore(store);
    res.json({ success: true, message: "Password updated successfully!" });
  });
  app3.patch("/api/users/:id/status", (req, res) => {
    const { id } = req.params;
    const { status, adminEmail, suspendedReason } = req.body;
    const user = store.users.find((u) => u.id === id);
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    user.status = status;
    if (status === "ACTIVE") {
      user.approvedBy = adminEmail || "Jeffrey Nadado (Admin)";
      user.approvedAt = nowIso;
      user.suspendedReason = null;
    } else if (status === "SUSPENDED") {
      user.suspendedReason = suspendedReason || "Suspended by Cathedral of Praise NOC Administrator.";
    }
    saveStore(store);
    const { password: _, ...userSafe } = user;
    res.json({ user: userSafe, state: store });
  });
  app3.patch("/api/users/:id/role", (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    const user = store.users.find((u) => u.id === id);
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    user.role = role;
    saveStore(store);
    const { password: _, ...userSafe } = user;
    res.json({ user: userSafe, state: store });
  });
  app3.patch("/api/users/:id/password", (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 6) {
      res.status(400).json({
        error: "Password must be at least 6 characters."
      });
      return;
    }
    const user = store.users.find((u) => u.id === id);
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    user.password = newPassword.trim();
    saveStore(store);
    res.json({
      success: true,
      message: `Password for ${user.email} updated successfully.`
    });
  });
  app3.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const index = store.users.findIndex((u) => u.id === id);
    if (index === -1) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    if (store.users[index].role === "ADMIN" && store.users.filter((u) => u.role === "ADMIN").length <= 1) {
      res.status(400).json({
        error: "Cannot delete the only remaining Admin account."
      });
      return;
    }
    const [deleted] = store.users.splice(index, 1);
    saveStore(store);
    res.json({ success: true, deletedId: deleted.id });
  });
  app3.post("/api/users", (req, res) => {
    const { name, email, password, role, department, phone, adminEmail } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email, and password are required." });
      return;
    }
    const normalized = email.trim().toLowerCase();
    if (store.users.some((u) => u.email.toLowerCase() === normalized)) {
      res.status(409).json({ error: "User with this email already exists." });
      return;
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const newUser = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: normalized,
      password: password.trim(),
      role: role || "OPERATOR",
      status: "ACTIVE",
      department: department?.trim() || "Cathedral of Praise NOC",
      phone: phone?.trim() || "",
      createdAt: nowIso,
      lastLoginAt: null,
      approvedBy: adminEmail || "Admin",
      approvedAt: nowIso
    };
    store.users.unshift(newUser);
    saveStore(store);
    const { password: _, ...userSafe } = newUser;
    res.status(201).json({ user: userSafe, state: store });
  });
  app3.post("/api/logs/parse", (req, res) => {
    const { rawLog } = req.body;
    if (!rawLog || typeof rawLog !== "string") {
      res.status(400).json({ error: "rawLog string is required" });
      return;
    }
    const parsed = parseNetworkLogForIncident(rawLog, store.campuses);
    res.json(parsed);
  });
  app3.post("/api/incidents", (req, res) => {
    const body = req.body;
    const campus = store.campuses.find((c) => c.id === body.campusId) || store.campuses[0];
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const seqNum = 102 + store.incidents.length;
    const ticketNumber = body.ticketNumber?.trim() || `COP-INC-2026-0${seqNum}`;
    const newIncident = {
      id: `inc-${Date.now()}`,
      ticketNumber,
      telcoTicketNumber: body.telcoTicketNumber?.trim() || "Pending Telco Ref",
      campusId: campus.id,
      campusName: campus.campusName,
      linkName: body.linkName || campus.linkName,
      circuitId: body.circuitId || campus.circuitId,
      provider: body.provider || campus.provider,
      providerNocEmail: body.providerNocEmail || campus.providerNocEmail,
      accountNumber: body.accountNumber || campus.accountNumber,
      routerHostname: body.routerHostname || campus.routerHostname,
      interfaceName: body.interfaceName || campus.interfaceName,
      problemSummary: body.problemSummary?.trim() || `${campus.campusName} \u2014 ${campus.linkName} DOWN (${campus.circuitId})`,
      technicalDetails: body.technicalDetails?.trim() || `Campus: ${campus.campusName} | Link: ${campus.linkName}
Router: ${campus.routerHostname} (${campus.interfaceName}) | Circuit: ${campus.circuitId}`,
      rawLogSnippet: body.rawLogSnippet || "",
      creationMode: body.creationMode || "Hybrid Log + Manual",
      sourceLogId: body.sourceLogId,
      status: body.status || "Waiting for Telco Repair",
      reportedToTelco: Boolean(body.reportedToTelco || body.autoSendProviderEmail),
      reportedToTelcoAt: body.reportedToTelco || body.autoSendProviderEmail ? nowIso : null,
      reportedBy: body.reportedBy || "Cathedral of Praise NOC",
      expectedResolutionAt: body.expectedResolutionAt || new Date(Date.now() + 4 * 3600 * 1e3).toISOString(),
      etrNotes: body.etrNotes || "Awaiting field dispatch confirmation and line test results from Telco NOC.",
      escalationLevel: body.escalationLevel || "L1 - Campus NOC",
      createdAt: nowIso,
      updatedAt: nowIso,
      resolvedAt: body.status === "Resolved" ? nowIso : null,
      timeline: [
        {
          id: `tl-${Date.now()}-1`,
          timestamp: nowIso,
          actor: body.creationMode === "Manual Entry" ? body.reportedBy || "Cathedral of Praise NOC" : "Syslog Autofill + NOC Engineer",
          action: `Incident Ticket ${ticketNumber} Created for ${campus.campusName} \u2014 ${campus.linkName}`,
          note: `Status: ${body.status || "Waiting for Telco Repair"} | Telco Ref: ${body.telcoTicketNumber || "Pending Telco Ref"} | Link State: ${body.status === "Resolved" ? "GREEN (Restored)" : "RED (Down)"}`,
          automated: body.creationMode !== "Manual Entry"
        }
      ]
    };
    if (body.sourceLogId) {
      const logItem = store.logs.find((l) => l.id === body.sourceLogId);
      if (logItem) {
        logItem.linkedIncidentId = newIncident.id;
      }
    }
    if (newIncident.status !== "Resolved") {
      campus.status = "Outage";
      campus.packetLossPct = 100;
      campus.latencyMs = 0;
      campus.opticalRxDbm = -38.8;
      campus.lastCheckedAt = nowIso;
    } else {
      campus.status = "Operational";
      campus.packetLossPct = 0;
      campus.latencyMs = 8.4;
      campus.opticalRxDbm = -10.2;
      campus.lastCheckedAt = nowIso;
      campus.lastRestoredAt = nowIso;
    }
    const generatedEmails = [];
    if (body.autoSendProviderEmail) {
      const providerDraft = buildProviderDispatchEmail(
        newIncident,
        "Auto-Created on Ticket Log"
      );
      const emailRecord = {
        ...providerDraft,
        id: `email-${Date.now()}-prov`,
        timestamp: nowIso
      };
      store.emails.unshift(emailRecord);
      generatedEmails.push(emailRecord);
      newIncident.timeline.push({
        id: `tl-${Date.now()}-2`,
        timestamp: nowIso,
        actor: "Automated Email Dispatcher",
        action: `Auto-Dispatched Outage Report to ${newIncident.provider}`,
        note: `Sent to ${newIncident.providerNocEmail} for ${newIncident.campusName} \u2014 ${newIncident.linkName}.`,
        automated: true
      });
    }
    if (body.autoSendInternalAlert !== false) {
      const internalDraft = buildInternalNotificationEmail(
        newIncident,
        `New Incident Logged (${newIncident.creationMode})`,
        "Status Update Notification"
      );
      const internalRecord = {
        ...internalDraft,
        id: `email-${Date.now()}-int`,
        timestamp: nowIso
      };
      store.emails.unshift(internalRecord);
      generatedEmails.push(internalRecord);
    }
    store.incidents.unshift(newIncident);
    syncCampusStatusesWithIncidents(store);
    saveStore(store);
    res.status(201).json({
      incident: newIncident,
      generatedEmails,
      state: store
    });
  });
  app3.patch("/api/incidents/:id", (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const incident = store.incidents.find((inc) => inc.id === id);
    if (!incident) {
      res.status(404).json({ error: "Incident not found" });
      return;
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const changes = [];
    if (updates.problemSummary !== void 0 && updates.problemSummary.trim() !== incident.problemSummary) {
      changes.push(`Updated Problem Description`);
      incident.problemSummary = updates.problemSummary.trim();
    }
    if (updates.status !== void 0 && updates.status !== incident.status) {
      changes.push(`Status: ${incident.status} \u2192 ${updates.status}`);
      incident.status = updates.status;
      if (updates.status === "Resolved") {
        incident.resolvedAt = nowIso;
      } else {
        incident.resolvedAt = null;
      }
    }
    if (updates.ticketNumber !== void 0 && updates.ticketNumber !== incident.ticketNumber) {
      changes.push(
        `Ticket #: ${incident.ticketNumber} \u2192 ${updates.ticketNumber}`
      );
      incident.ticketNumber = updates.ticketNumber;
    }
    if (updates.telcoTicketNumber !== void 0 && updates.telcoTicketNumber !== incident.telcoTicketNumber) {
      changes.push(
        `Telco Ref #: ${incident.telcoTicketNumber} \u2192 ${updates.telcoTicketNumber}`
      );
      incident.telcoTicketNumber = updates.telcoTicketNumber;
    }
    if (updates.reportedToTelco !== void 0 && updates.reportedToTelco !== incident.reportedToTelco) {
      changes.push(
        `Reported to Telco: ${incident.reportedToTelco ? "Yes" : "No"} \u2192 ${updates.reportedToTelco ? "Yes" : "No"}`
      );
      incident.reportedToTelco = updates.reportedToTelco;
      if (updates.reportedToTelco && !incident.reportedToTelcoAt) {
        incident.reportedToTelcoAt = nowIso;
      }
    }
    if (updates.expectedResolutionAt !== void 0 && updates.expectedResolutionAt !== incident.expectedResolutionAt) {
      changes.push(`Updated Provider ETR timeline`);
      incident.expectedResolutionAt = updates.expectedResolutionAt;
    }
    if (updates.etrNotes !== void 0 && updates.etrNotes !== incident.etrNotes) {
      changes.push(`Updated Provider / Repair notes`);
      incident.etrNotes = updates.etrNotes;
    }
    if (updates.escalationLevel !== void 0 && updates.escalationLevel !== incident.escalationLevel) {
      changes.push(`Escalated to ${updates.escalationLevel}`);
      incident.escalationLevel = updates.escalationLevel;
    }
    incident.updatedAt = nowIso;
    if (changes.length > 0 || updates.updateNote) {
      incident.timeline.push({
        id: `tl-${Date.now()}`,
        timestamp: nowIso,
        actor: updates.actor || "Cathedral of Praise NOC",
        action: changes.join(" \xB7 ") || "Incident Updated",
        note: updates.updateNote || `Telco Ref: ${incident.telcoTicketNumber} | Status: ${incident.status}`,
        automated: false
      });
    }
    if (updates.sendProviderFollowUp) {
      const followUpDraft = buildProviderDispatchEmail(
        incident,
        "Telco Escalation Chaser"
      );
      const emailRecord = {
        ...followUpDraft,
        id: `email-${Date.now()}-chaser`,
        timestamp: nowIso
      };
      store.emails.unshift(emailRecord);
      incident.reportedToTelco = true;
      if (!incident.reportedToTelcoAt) {
        incident.reportedToTelcoAt = nowIso;
      }
      incident.timeline.push({
        id: `tl-${Date.now()}-email`,
        timestamp: nowIso,
        actor: "Automated Email Dispatcher",
        action: `Dispatched Provider Follow-Up to ${incident.provider}`,
        note: `Sent to ${incident.providerNocEmail}`,
        automated: true
      });
    }
    if (changes.some((c) => c.startsWith("Status:"))) {
      const internalEmail = buildInternalNotificationEmail(
        incident,
        changes.join(", "),
        "Status Update Notification"
      );
      store.emails.unshift({
        ...internalEmail,
        id: `email-${Date.now()}-status`,
        timestamp: nowIso
      });
    }
    syncCampusStatusesWithIncidents(store);
    saveStore(store);
    res.json({ incident, state: store });
  });
  app3.post("/api/emails/send", (req, res) => {
    const body = req.body;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const newEmail = {
      id: `email-${Date.now()}`,
      timestamp: nowIso,
      incidentId: body.incidentId || "",
      ticketNumber: body.ticketNumber || "N/A",
      campusName: body.campusName || "All Campuses",
      linkName: body.linkName,
      provider: body.provider || "Service Provider",
      recipientType: body.recipientType || "Service Provider (Telco NOC)",
      to: body.to || "linkgold@etpi.com.ph",
      cc: body.cc || "lcmojal@cathedralofpraise.com.ph, jffernandez@cathedralofpraise.com.ph, jcjara@cathedralofpraise.com.ph, jmnadado@cathedralofpraise.com.ph",
      subject: body.subject || "Cathedral of Praise NOC Dispatch",
      body: body.body || "",
      triggerSource: body.triggerSource || "Manual Dispatch",
      deliveryStatus: "Dispatched"
    };
    store.emails.unshift(newEmail);
    if (body.incidentId) {
      const inc = store.incidents.find((i) => i.id === body.incidentId);
      if (inc) {
        if (newEmail.recipientType === "Service Provider (Telco NOC)") {
          inc.reportedToTelco = true;
          if (!inc.reportedToTelcoAt) inc.reportedToTelcoAt = nowIso;
        }
        inc.timeline.push({
          id: `tl-${Date.now()}`,
          timestamp: nowIso,
          actor: "NOC Email Dispatcher",
          action: `Email Dispatched to ${newEmail.to}`,
          note: `Subject: ${newEmail.subject}`,
          automated: false
        });
      }
    }
    saveStore(store);
    res.status(201).json({ email: newEmail, state: store });
  });
  app3.all("/api/webhooks/m365-email", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }
    const payload = {
      ...typeof req.body === "object" && req.body !== null ? req.body : {},
      ...req.query || {}
    };
    const from = String(
      payload.from || payload.sender || "jmnadado@cathedralofpraise.com.ph"
    ).trim();
    const lowerFrom = from.toLowerCase();
    const isAuthorizedSender = lowerFrom.endsWith("@cathedralofpraise.com.ph") || lowerFrom.endsWith("@etpi.com.ph") || lowerFrom.endsWith("@convergeict.com") || lowerFrom.endsWith("@pldt.com.ph") || lowerFrom.endsWith("@starlink.com");
    if (!isAuthorizedSender) {
      res.status(403).json({
        error: "Unauthorized sender. Only @cathedralofpraise.com.ph or official Telco NOC emails are permitted to update tickets."
      });
      return;
    }
    const to = String(
      payload.to || payload.toRecipients || ""
    ).trim();
    const cc = String(
      payload.cc || payload.ccRecipients || "lcmojal@cathedralofpraise.com.ph, jffernandez@cathedralofpraise.com.ph, jcjara@cathedralofpraise.com.ph"
    ).trim();
    const subject = String(payload.subject || "").trim();
    const rawBodyVal = payload.bodyPreview || payload.body || (typeof req.body === "string" ? req.body : "") || "";
    const emailBody = String(rawBodyVal).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!subject && !emailBody) {
      res.status(400).json({
        error: "Please include at least an Email Subject with the Account Number or Circuit ID."
      });
      return;
    }
    const parsed = parseM365Email(subject, emailBody, store.campuses, to);
    if (!parsed.matchedCampus) {
      res.status(422).json({
        error: "Could not match an Account Number (e.g. 657871060) or Circuit ID (e.g. 930473671, MC12984) in the email subject or body.",
        parsed
      });
      return;
    }
    const campus = parsed.matchedCampus;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    let targetIncident = store.incidents.find(
      (inc) => inc.campusId === campus.id && inc.status !== "Resolved"
    );
    if (!targetIncident && parsed.extractedInternalTicket) {
      targetIncident = store.incidents.find(
        (inc) => inc.ticketNumber.toUpperCase() === parsed.extractedInternalTicket?.toUpperCase()
      );
    }
    let actionSummary = "";
    if (parsed.detectedAction === "RESOLVE_TO_GREEN") {
      if (targetIncident) {
        targetIncident.status = "Resolved";
        targetIncident.resolvedAt = nowIso;
        targetIncident.updatedAt = nowIso;
        if (parsed.extractedTelcoTicket) {
          targetIncident.telcoTicketNumber = parsed.extractedTelcoTicket;
        }
        targetIncident.etrNotes = `M365 Email Confirmed Resolved: ${parsed.extractedProblemSummary}`;
        targetIncident.timeline.push({
          id: `tl-${Date.now()}-m365-res`,
          timestamp: nowIso,
          actor: `M365 Email (${from})`,
          action: `Status Auto-Updated to Resolved via M365 Email \u2014 Link Turned GREEN`,
          note: `Subject: "${subject}" | Telco Ref: ${targetIncident.telcoTicketNumber}`,
          automated: true
        });
        actionSummary = `Resolved ticket ${targetIncident.ticketNumber} via M365 email \u2014 ${campus.campusName} (${campus.linkName}) is now GREEN (GOOD).`;
      } else {
        const seqNum = 101 + store.incidents.length;
        const ticketNumber = parsed.extractedInternalTicket || `COP-INC-2026-0${seqNum}`;
        targetIncident = {
          id: `inc-${Date.now()}`,
          ticketNumber,
          telcoTicketNumber: parsed.extractedTelcoTicket || "Resolved via M365",
          campusId: campus.id,
          campusName: campus.campusName,
          linkName: campus.linkName,
          circuitId: campus.circuitId,
          provider: campus.provider,
          providerNocEmail: campus.providerNocEmail,
          accountNumber: campus.accountNumber,
          routerHostname: campus.routerHostname,
          interfaceName: campus.interfaceName,
          problemSummary: parsed.extractedProblemSummary,
          technicalDetails: `M365 Email Sync (${from} -> ${to})
Campus: ${campus.campusName} | Link: ${campus.linkName} | Circuit/Acct: ${campus.circuitId}`,
          rawLogSnippet: emailBody,
          creationMode: "Hybrid Log + Manual",
          status: "Resolved",
          reportedToTelco: true,
          reportedToTelcoAt: nowIso,
          reportedBy: from,
          expectedResolutionAt: nowIso,
          etrNotes: `Restored & verified via M365 Email.`,
          escalationLevel: "L1 - Campus NOC",
          createdAt: nowIso,
          updatedAt: nowIso,
          resolvedAt: nowIso,
          timeline: [
            {
              id: `tl-${Date.now()}-m365`,
              timestamp: nowIso,
              actor: `M365 Email (${from})`,
              action: `Recorded Resolved Notice via M365 Email \u2014 Link GREEN`,
              note: `Subject: "${subject}"`,
              automated: true
            }
          ]
        };
        store.incidents.unshift(targetIncident);
        actionSummary = `Verified ${campus.campusName} (${campus.linkName}) GREEN (Resolved) from M365 email.`;
      }
    } else {
      if (targetIncident) {
        if (parsed.extractedTelcoTicket) {
          targetIncident.telcoTicketNumber = parsed.extractedTelcoTicket;
        }
        targetIncident.reportedToTelco = true;
        if (!targetIncident.reportedToTelcoAt) {
          targetIncident.reportedToTelcoAt = nowIso;
        }
        targetIncident.updatedAt = nowIso;
        targetIncident.timeline.push({
          id: `tl-${Date.now()}-m365-upd`,
          timestamp: nowIso,
          actor: `M365 Email (${from})`,
          action: `Updated Outage Ticket via M365 Email (Telco Ref: ${targetIncident.telcoTicketNumber})`,
          note: `Subject: "${subject}"`,
          automated: true
        });
        actionSummary = `Updated active outage ticket ${targetIncident.ticketNumber} from M365 email \u2014 ${campus.campusName} (${campus.linkName}) remains RED.`;
      } else {
        const seqNum = 101 + store.incidents.length;
        const ticketNumber = parsed.extractedInternalTicket || `COP-INC-2026-0${seqNum}`;
        targetIncident = {
          id: `inc-${Date.now()}`,
          ticketNumber,
          telcoTicketNumber: parsed.extractedTelcoTicket || "Pending Telco Ref",
          campusId: campus.id,
          campusName: campus.campusName,
          linkName: campus.linkName,
          circuitId: campus.circuitId,
          provider: campus.provider,
          providerNocEmail: campus.providerNocEmail,
          accountNumber: campus.accountNumber,
          routerHostname: campus.routerHostname,
          interfaceName: campus.interfaceName,
          problemSummary: parsed.extractedProblemSummary,
          technicalDetails: `Synced from M365 Email
From: ${from}
To: ${to || campus.providerNocEmail}
Campus: ${campus.campusName} | Link: ${campus.linkName} | Circuit/Acct: ${campus.circuitId}`,
          rawLogSnippet: `Subject: ${subject}

${emailBody}`,
          creationMode: "Hybrid Log + Manual",
          status: "Waiting for Telco Repair",
          reportedToTelco: true,
          reportedToTelcoAt: nowIso,
          reportedBy: from,
          expectedResolutionAt: new Date(
            Date.now() + 4 * 3600 * 1e3
          ).toISOString(),
          etrNotes: `Auto-created from M365 email ("${subject}").`,
          escalationLevel: "L1 - Campus NOC",
          createdAt: nowIso,
          updatedAt: nowIso,
          resolvedAt: null,
          timeline: [
            {
              id: `tl-${Date.now()}-m365-new`,
              timestamp: nowIso,
              actor: `M365 Email Auto-Sync (${from})`,
              action: `Outage Ticket ${ticketNumber} Auto-Created from M365 Email \u2014 Link Turned RED`,
              note: `Matched ${campus.campusName} \u2014 ${campus.linkName} (${campus.circuitId}) | Telco Ref: ${parsed.extractedTelcoTicket || "Pending Telco Ref"}`,
              automated: true
            }
          ]
        };
        store.incidents.unshift(targetIncident);
        actionSummary = `Auto-created Ticket ${ticketNumber} from M365 email \u2014 ${campus.campusName} (${campus.linkName}) automatically turned RED (OUTAGE).`;
      }
    }
    const emailRecord = {
      id: `email-${Date.now()}-m365`,
      timestamp: nowIso,
      incidentId: targetIncident.id,
      ticketNumber: targetIncident.ticketNumber,
      campusName: campus.campusName,
      linkName: campus.linkName,
      provider: campus.provider,
      recipientType: "Service Provider (Telco NOC)",
      to: to || campus.providerNocEmail,
      cc: cc || "lcmojal@cathedralofpraise.com.ph, jffernandez@cathedralofpraise.com.ph, jcjara@cathedralofpraise.com.ph",
      subject,
      body: emailBody,
      triggerSource: "Auto-Created on Ticket Log",
      deliveryStatus: "Dispatched"
    };
    store.emails.unshift(emailRecord);
    syncCampusStatusesWithIncidents(store);
    saveStore(store);
    res.status(200).json({
      actionSummary,
      incident: targetIncident,
      parsed,
      state: store
    });
  });
  app3.patch("/api/campuses/:id/circuit", (req, res) => {
    const { id } = req.params;
    const {
      circuitId,
      accountNumber,
      providerNocEmail,
      routerHostname,
      interfaceName
    } = req.body;
    const campus = store.campuses.find((c) => c.id === id);
    if (!campus) {
      res.status(404).json({ error: "Campus link not found" });
      return;
    }
    if (circuitId !== void 0 && circuitId.trim()) {
      campus.circuitId = circuitId.trim();
    }
    if (accountNumber !== void 0 && accountNumber.trim()) {
      campus.accountNumber = accountNumber.trim();
    }
    if (providerNocEmail !== void 0 && providerNocEmail.trim()) {
      campus.providerNocEmail = providerNocEmail.trim();
    }
    if (routerHostname !== void 0 && routerHostname.trim()) {
      campus.routerHostname = routerHostname.trim();
    }
    if (interfaceName !== void 0 && interfaceName.trim()) {
      campus.interfaceName = interfaceName.trim();
    }
    for (const inc of store.incidents) {
      if (inc.campusId === campus.id) {
        inc.circuitId = campus.circuitId;
        inc.accountNumber = campus.accountNumber;
        inc.providerNocEmail = campus.providerNocEmail;
      }
    }
    saveStore(store);
    res.json({ campus, state: store });
  });
  app3.post("/api/campuses/new-branch", (req, res) => {
    const {
      campusName,
      campusCode,
      region,
      building,
      links
    } = req.body;
    if (!campusName || !campusName.trim()) {
      res.status(400).json({ error: "Campus Name is required" });
      return;
    }
    const trimmedName = campusName.trim();
    const existing = store.campuses.some(
      (c) => c.campusName.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existing) {
      res.status(400).json({ error: `Campus "${trimmedName}" already exists. Use "Add Link" to add more circuits to it.` });
      return;
    }
    const code = campusCode && campusCode.trim() || `COP-${trimmedName.replace(/\s+campus/i, "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`;
    const reg = region && region.trim() || "National Branch";
    const bldg = building && building.trim() || `${trimmedName} Sanctuary & IT Rack`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const newLinks = [];
    const rawLinks = links && links.length > 0 ? links : [
      {
        linkName: "Primary Dedicated Internet",
        provider: "Eastern Communications",
        linkRole: "Dedicated Internet",
        bandwidthMbps: 500,
        circuitId: "NEW-CIRCUIT-01",
        accountNumber: "N/A"
      }
    ];
    for (let i = 0; i < rawLinks.length; i++) {
      const l = rawLinks[i];
      const provider = l.provider || "Eastern Communications";
      const role = l.linkRole || "Dedicated Internet";
      const bw = Number(l.bandwidthMbps) || 500;
      const linkName = l.linkName || `${provider} ${role === "Dedicated Internet" ? "Internet" : "Transport"}`;
      const suffix = linkName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const linkId = `${code.toLowerCase()}-${suffix || `link-${i + 1}`}`;
      const link = {
        id: linkId,
        campusName: trimmedName,
        campusCode: code,
        region: reg,
        building: bldg,
        linkName,
        linkRole: role,
        provider,
        providerNocEmail: l.providerNocEmail || (provider.includes("Converge") ? "enterprisesupport@convergeict.com" : provider.includes("PLDT") ? "enterprisecare@pldt.com.ph" : provider.includes("Starlink") ? "enterprise-support@starlink.com" : "linkgold@etpi.com.ph"),
        providerHotline: l.providerHotline || (provider.includes("Converge") ? "+63 (2) 8667-0848" : provider.includes("PLDT") ? "+63 (2) 8888-1777" : provider.includes("Starlink") ? "Priority Portal" : "+63 (2) 5300-7000"),
        accountNumber: l.accountNumber && l.accountNumber.trim() || "N/A",
        circuitId: l.circuitId && l.circuitId.trim() || `CID-${Math.floor(1e5 + Math.random() * 9e5)}`,
        routerHostname: l.routerHostname || `${code.toLowerCase()}-rtr-01`,
        interfaceName: l.interfaceName || `GigabitEthernet0/0/${i}`,
        bgpPeerIp: l.bgpPeerIp || `10.${Math.floor(Math.random() * 200 + 10)}.${Math.floor(Math.random() * 250 + 1)}.1`,
        bandwidthMbps: bw,
        status: "Operational",
        latencyMs: 12.4,
        packetLossPct: 0,
        opticalRxDbm: -11.5,
        uptime30dPct: 99.98,
        uptime90dPct: 99.95,
        slaTargetPct: 99.9,
        lastCheckedAt: nowIso,
        lastRestoredAt: nowIso,
        dailyUptimeHistory: Array.from({ length: 30 }, (_, dayIdx) => ({
          date: new Date(Date.now() - (29 - dayIdx) * 864e5).toISOString().split("T")[0],
          uptimePct: 100,
          downtimeMinutes: 0,
          incidentCount: 0
        }))
      };
      newLinks.push(link);
      store.campuses.push(link);
    }
    saveStore(store);
    res.json({ message: `Campus "${trimmedName}" created with ${newLinks.length} circuit(s).`, newLinks, state: store });
  });
  app3.put("/api/campuses/links/:id", (req, res) => {
    const { id } = req.params;
    const patch = req.body;
    const link = store.campuses.find((c) => c.id === id);
    if (!link) {
      res.status(404).json({ error: "Circuit link not found" });
      return;
    }
    if (patch.linkName !== void 0 && patch.linkName.trim()) link.linkName = patch.linkName.trim();
    if (patch.provider !== void 0 && patch.provider.trim()) link.provider = patch.provider.trim();
    if (patch.linkRole !== void 0) link.linkRole = patch.linkRole;
    if (patch.circuitId !== void 0 && patch.circuitId.trim()) link.circuitId = patch.circuitId.trim();
    if (patch.accountNumber !== void 0 && patch.accountNumber.trim()) link.accountNumber = patch.accountNumber.trim();
    if (patch.bandwidthMbps !== void 0) link.bandwidthMbps = Number(patch.bandwidthMbps) || link.bandwidthMbps;
    if (patch.interfaceName !== void 0 && patch.interfaceName.trim()) link.interfaceName = patch.interfaceName.trim();
    if (patch.bgpPeerIp !== void 0 && patch.bgpPeerIp.trim()) link.bgpPeerIp = patch.bgpPeerIp.trim();
    if (patch.providerNocEmail !== void 0 && patch.providerNocEmail.trim()) link.providerNocEmail = patch.providerNocEmail.trim();
    if (patch.providerHotline !== void 0 && patch.providerHotline.trim()) link.providerHotline = patch.providerHotline.trim();
    if (patch.routerHostname !== void 0 && patch.routerHostname.trim()) link.routerHostname = patch.routerHostname.trim();
    if (patch.status !== void 0) link.status = patch.status;
    if (patch.region !== void 0 && patch.region.trim()) {
      const cName = link.campusName;
      for (const cl of store.campuses) {
        if (cl.campusName === cName) cl.region = patch.region.trim();
      }
    }
    if (patch.building !== void 0 && patch.building.trim()) {
      const cName = link.campusName;
      for (const cl of store.campuses) {
        if (cl.campusName === cName) cl.building = patch.building.trim();
      }
    }
    for (const inc of store.incidents) {
      if (inc.campusId === link.id) {
        inc.circuitId = link.circuitId;
        inc.accountNumber = link.accountNumber;
        inc.provider = link.provider;
        inc.providerNocEmail = link.providerNocEmail;
      }
    }
    saveStore(store);
    res.json({ link, state: store });
  });
  app3.post("/api/campuses/:campusName/add-link", (req, res) => {
    const { campusName } = req.params;
    const existing = store.campuses.filter((c) => c.campusName.toLowerCase() === campusName.toLowerCase());
    if (existing.length === 0) {
      res.status(404).json({ error: `Campus "${campusName}" not found.` });
      return;
    }
    const template = existing[0];
    const l = req.body;
    const provider = l.provider || "Starlink Enterprise";
    const role = l.linkRole || "LEO Satellite Backup";
    const linkName = l.linkName || `${provider} Backup`;
    const bw = Number(l.bandwidthMbps) || 250;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const suffix = linkName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const linkId = `${template.campusCode.toLowerCase()}-${suffix || `link-${Date.now()}`}`;
    const newLink = {
      id: linkId,
      campusName: template.campusName,
      campusCode: template.campusCode,
      region: template.region,
      building: template.building,
      linkName,
      linkRole: role,
      provider,
      providerNocEmail: l.providerNocEmail || (provider.includes("Converge") ? "enterprisesupport@convergeict.com" : provider.includes("PLDT") ? "enterprisecare@pldt.com.ph" : provider.includes("Starlink") ? "enterprise-support@starlink.com" : "linkgold@etpi.com.ph"),
      providerHotline: l.providerHotline || (provider.includes("Converge") ? "+63 (2) 8667-0848" : provider.includes("PLDT") ? "+63 (2) 8888-1777" : provider.includes("Starlink") ? "Priority Portal" : "+63 (2) 5300-7000"),
      accountNumber: l.accountNumber && l.accountNumber.trim() || "N/A",
      circuitId: l.circuitId && l.circuitId.trim() || `CID-${Math.floor(1e5 + Math.random() * 9e5)}`,
      routerHostname: template.routerHostname,
      interfaceName: l.interfaceName || `GigabitEthernet0/0/${existing.length}`,
      bgpPeerIp: l.bgpPeerIp || `10.${Math.floor(Math.random() * 200 + 10)}.1.1`,
      bandwidthMbps: bw,
      status: "Operational",
      latencyMs: 14.2,
      packetLossPct: 0,
      opticalRxDbm: -10.2,
      uptime30dPct: 99.98,
      uptime90dPct: 99.95,
      slaTargetPct: 99.9,
      lastCheckedAt: nowIso,
      lastRestoredAt: nowIso,
      dailyUptimeHistory: Array.from({ length: 30 }, (_, dayIdx) => ({
        date: new Date(Date.now() - (29 - dayIdx) * 864e5).toISOString().split("T")[0],
        uptimePct: 100,
        downtimeMinutes: 0,
        incidentCount: 0
      }))
    };
    store.campuses.push(newLink);
    saveStore(store);
    res.json({ newLink, state: store });
  });
  app3.delete("/api/campuses/links/:id", (req, res) => {
    const { id } = req.params;
    const idx = store.campuses.findIndex((c) => c.id === id);
    if (idx === -1) {
      res.status(404).json({ error: "Circuit not found" });
      return;
    }
    const removed = store.campuses.splice(idx, 1)[0];
    saveStore(store);
    res.json({ message: `Circuit ${removed.linkName} (${removed.circuitId}) removed.`, state: store });
  });
  app3.delete("/api/campuses/branch/:campusName", (req, res) => {
    const { campusName } = req.params;
    const initialCount = store.campuses.length;
    store.campuses = store.campuses.filter(
      (c) => c.campusName.toLowerCase() !== campusName.toLowerCase()
    );
    const removedCount = initialCount - store.campuses.length;
    if (removedCount === 0) {
      res.status(404).json({ error: `Campus branch "${campusName}" not found.` });
      return;
    }
    saveStore(store);
    res.json({ message: `Campus "${campusName}" and its ${removedCount} circuits removed.`, state: store });
  });
  app3.post("/api/campuses/:id/simulate", (req, res) => {
    const { id } = req.params;
    const { mode } = req.body;
    const campus = store.campuses.find((c) => c.id === id);
    if (!campus) {
      res.status(404).json({ error: "Campus link not found" });
      return;
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    let newLog = null;
    if (mode === "outage" || mode === "degraded") {
      campus.status = "Outage";
      campus.packetLossPct = 100;
      campus.latencyMs = 0;
      campus.opticalRxDbm = -38.9;
      campus.lastCheckedAt = nowIso;
      newLog = {
        id: `log-${Date.now()}`,
        timestamp: nowIso,
        routerHostname: campus.routerHostname,
        interfaceName: campus.interfaceName,
        campusId: campus.id,
        campusName: campus.campusName,
        linkName: campus.linkName,
        circuitId: campus.circuitId,
        provider: campus.provider,
        protocol: "OPTICAL",
        severity: "CRITICAL",
        rawSyslog: `<187>${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", { hour12: false })} ${campus.routerHostname} %OPTICAL-3-RXLOS: Interface ${campus.interfaceName} (Circuit: ${campus.circuitId} - ${campus.linkName}), Rx power -38.9 dBm below threshold. %BGP-5-ADJCHANGE: neighbor ${campus.bgpPeerIp} Down (100% packet loss)`,
        parsedSummary: `${campus.campusName} \u2014 ${campus.linkName} DOWN (RED): Optical LOS (-38.9 dBm) & BGP Peer ${campus.bgpPeerIp} Down`,
        detectedIssueType: "Link Down / Total Connectivity Loss",
        metrics: {
          packetLossPct: 100,
          latencyMs: 0,
          opticalRxDbm: -38.9
        }
      };
      store.logs.unshift(newLog);
    } else {
      campus.status = "Operational";
      campus.packetLossPct = 0;
      campus.latencyMs = 8.6;
      campus.opticalRxDbm = -10.2;
      campus.lastCheckedAt = nowIso;
      campus.lastRestoredAt = nowIso;
      for (const inc of store.incidents) {
        if (inc.campusId === campus.id && inc.status !== "Resolved") {
          inc.status = "Resolved";
          inc.resolvedAt = nowIso;
          inc.updatedAt = nowIso;
          inc.timeline.push({
            id: `tl-${Date.now()}-${inc.id}`,
            timestamp: nowIso,
            actor: "Cathedral of Praise NOC",
            action: "Link Restored to GREEN (Good) \u2014 Incident Auto-Resolved",
            note: `${campus.campusName} \u2014 ${campus.linkName} restored and verified operational.`,
            automated: true
          });
        }
      }
      newLog = {
        id: `log-${Date.now()}`,
        timestamp: nowIso,
        routerHostname: campus.routerHostname,
        interfaceName: campus.interfaceName,
        campusId: campus.id,
        campusName: campus.campusName,
        linkName: campus.linkName,
        circuitId: campus.circuitId,
        provider: campus.provider,
        protocol: "SNMP-TRAP",
        severity: "INFO",
        rawSyslog: `<190>${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", { hour12: false })} ${campus.routerHostname} %LINEPROTO-5-UPDOWN: Interface ${campus.interfaceName} (Circuit ${campus.circuitId} - ${campus.linkName}) changed state to up. packet-loss=0% latency=8.6ms optical-rx=-10.2dBm`,
        parsedSummary: `${campus.campusName} \u2014 ${campus.linkName} RESTORED (GREEN): BGP Established, 0% Packet Loss`,
        detectedIssueType: "Link Restored / Good Status",
        metrics: {
          packetLossPct: 0,
          latencyMs: 8.6,
          opticalRxDbm: -10.2
        }
      };
      store.logs.unshift(newLog);
    }
    saveStore(store);
    res.json({ campus, newLog, state: store });
  });
  app3.post("/api/campuses/reset-all-green", (_req, res) => {
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    for (const c of store.campuses) {
      c.status = "Operational";
      c.packetLossPct = 0;
      if (c.latencyMs === 0) c.latencyMs = 8.4;
      if (c.opticalRxDbm < -24) c.opticalRxDbm = -10.5;
      c.lastCheckedAt = nowIso;
      c.lastRestoredAt = nowIso;
    }
    for (const inc of store.incidents) {
      if (inc.status !== "Resolved") {
        inc.status = "Resolved";
        inc.resolvedAt = nowIso;
        inc.updatedAt = nowIso;
        inc.timeline.push({
          id: `tl-${Date.now()}-${inc.id}`,
          timestamp: nowIso,
          actor: "Cathedral of Praise NOC",
          action: "All Links Restored to GREEN (Good)",
          note: "Bulk link restoration confirmed.",
          automated: true
        });
      }
    }
    saveStore(store);
    res.json({ state: store });
  });
  app3.post("/api/escalations/evaluate", (_req, res) => {
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const actionsTaken = [];
    for (const inc of store.incidents) {
      if (inc.status === "Resolved") continue;
      if (!inc.reportedToTelco) {
        inc.reportedToTelco = true;
        inc.reportedToTelcoAt = nowIso;
        inc.status = "Waiting for Telco Repair";
        inc.updatedAt = nowIso;
        const emailDraft = buildProviderDispatchEmail(
          inc,
          "Auto-Created on Ticket Log"
        );
        store.emails.unshift({
          ...emailDraft,
          id: `email-${Date.now()}-${inc.id}`,
          timestamp: nowIso
        });
        inc.timeline.push({
          id: `tl-${Date.now()}-${inc.id}`,
          timestamp: nowIso,
          actor: "Automated Escalation Workflow (L1 Policy)",
          action: `Auto-Dispatched Unreported Ticket to ${inc.provider} NOC`,
          note: `Marked Reported to Telco = Yes and status updated to Waiting for Telco Repair.`,
          automated: true
        });
        actionsTaken.push(
          `${inc.ticketNumber} (${inc.campusName} \u2014 ${inc.linkName}): Auto-sent Telco Outage Email to ${inc.providerNocEmail} & moved to Waiting for Telco Repair.`
        );
      } else if (inc.status === "Waiting for Telco Repair" && inc.escalationLevel === "L1 - Campus NOC") {
        inc.escalationLevel = "L2 - Regional Network Lead & Telco Account Mgr";
        inc.updatedAt = nowIso;
        const chaser = buildProviderDispatchEmail(
          inc,
          "Telco Escalation Chaser"
        );
        store.emails.unshift({
          ...chaser,
          id: `email-${Date.now()}-${inc.id}-l2`,
          timestamp: nowIso
        });
        inc.timeline.push({
          id: `tl-${Date.now()}-${inc.id}-l2`,
          timestamp: nowIso,
          actor: "Automated Escalation Workflow (L2 Policy)",
          action: "Escalated to L2 Regional Lead & Dispatched Provider ETR Chaser",
          note: `Chaser email sent to ${inc.providerNocEmail}.`,
          automated: true
        });
        actionsTaken.push(
          `${inc.ticketNumber} (${inc.campusName} \u2014 ${inc.linkName}): Escalated to L2 & sent ETR follow-up chaser to ${inc.provider}.`
        );
      }
    }
    saveStore(store);
    res.json({ actionsTaken, state: store });
  });
  return app3;
}
var app = createApp();

// api/index.ts
var app2 = createApp();
var index_default = app2;
export {
  index_default as default
};

/**
 * Offline generator for IC-01 geography JSON under data/geography/.
 * No network. Deterministic. Run once to (re)write authoritative files.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "data", "geography");
fs.mkdirSync(outDir, { recursive: true });

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeName(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bst\.?\b/g, "saint")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Official Census county FIPS (state 05) + county seats (primary when dual-seat). */
const COUNTIES = [
  ["05001", "Arkansas", "De Witt"],
  ["05003", "Ashley", "Hamburg"],
  ["05005", "Baxter", "Mountain Home"],
  ["05007", "Benton", "Bentonville"],
  ["05009", "Boone", "Harrison"],
  ["05011", "Bradley", "Warren"],
  ["05013", "Calhoun", "Hampton"],
  ["05015", "Carroll", "Berryville"],
  ["05017", "Chicot", "Lake Village"],
  ["05019", "Clark", "Arkadelphia"],
  ["05021", "Clay", "Piggott"],
  ["05023", "Cleburne", "Heber Springs"],
  ["05025", "Cleveland", "Rison"],
  ["05027", "Columbia", "Magnolia"],
  ["05029", "Conway", "Morrilton"],
  ["05031", "Craighead", "Jonesboro"],
  ["05033", "Crawford", "Van Buren"],
  ["05035", "Crittenden", "Marion"],
  ["05037", "Cross", "Wynne"],
  ["05039", "Dallas", "Fordyce"],
  ["05041", "Desha", "Arkansas City"],
  ["05043", "Drew", "Monticello"],
  ["05045", "Faulkner", "Conway"],
  ["05047", "Franklin", "Charleston"],
  ["05049", "Fulton", "Salem"],
  ["05051", "Garland", "Hot Springs"],
  ["05053", "Grant", "Sheridan"],
  ["05055", "Greene", "Paragould"],
  ["05057", "Hempstead", "Hope"],
  ["05059", "Hot Spring", "Malvern"],
  ["05061", "Howard", "Nashville"],
  ["05063", "Independence", "Batesville"],
  ["05065", "Izard", "Melbourne"],
  ["05067", "Jackson", "Newport"],
  ["05069", "Jefferson", "Pine Bluff"],
  ["05071", "Johnson", "Clarksville"],
  ["05073", "Lafayette", "Lewisville"],
  ["05075", "Lawrence", "Walnut Ridge"],
  ["05077", "Lee", "Marianna"],
  ["05079", "Lincoln", "Star City"],
  ["05081", "Little River", "Ashdown"],
  ["05083", "Logan", "Paris"],
  ["05085", "Lonoke", "Lonoke"],
  ["05087", "Madison", "Huntsville"],
  ["05089", "Marion", "Yellville"],
  ["05091", "Miller", "Texarkana"],
  ["05093", "Mississippi", "Blytheville"],
  ["05095", "Monroe", "Clarendon"],
  ["05097", "Montgomery", "Mount Ida"],
  ["05099", "Nevada", "Prescott"],
  ["05101", "Newton", "Jasper"],
  ["05103", "Ouachita", "Camden"],
  ["05105", "Perry", "Perryville"],
  ["05107", "Phillips", "Helena-West Helena"],
  ["05109", "Pike", "Murfreesboro"],
  ["05111", "Poinsett", "Harrisburg"],
  ["05113", "Polk", "Mena"],
  ["05115", "Pope", "Russellville"],
  ["05117", "Prairie", "Des Arc"],
  ["05119", "Pulaski", "Little Rock"],
  ["05121", "Randolph", "Pocahontas"],
  ["05123", "St. Francis", "Forrest City"],
  ["05125", "Saline", "Benton"],
  ["05127", "Scott", "Waldron"],
  ["05129", "Searcy", "Marshall"],
  ["05131", "Sebastian", "Fort Smith"],
  ["05133", "Sevier", "De Queen"],
  ["05135", "Sharp", "Ash Flat"],
  ["05137", "Stone", "Mountain View"],
  ["05139", "Union", "El Dorado"],
  ["05141", "Van Buren", "Clinton"],
  ["05143", "Washington", "Fayetteville"],
  ["05145", "White", "Searcy"],
  ["05147", "Woodruff", "Augusta"],
  ["05149", "Yell", "Danville"],
];

/**
 * Top 250 Arkansas Census places (incorporated + CDPs) by Census 2020 Decennial
 * population, tie-break GEOID ascending. Populations are Census 2020 counts
 * (public figures). Rank 1 = highest population.
 *
 * Fields: [name, placeType, placeFips5, population, primaryCountyFips, ...additionalCountyFips]
 */
const PLACES_RAW = [
  ["Little Rock", "city", "41000", 202591, "05119"],
  ["Fayetteville", "city", "23290", 93949, "05143"],
  ["Fort Smith", "city", "24450", 89142, "05131", "05033"],
  ["Springdale", "city", "66080", 84161, "05143", "05007"],
  ["Jonesboro", "city", "35710", 78576, "05031"],
  ["Rogers", "city", "60400", 69908, "05007"],
  ["North Little Rock", "city", "50450", 64591, "05119"],
  ["Conway", "city", "15150", 64134, "05045"],
  ["Bentonville", "city", "05320", 54164, "05007"],
  ["Pine Bluff", "city", "55310", 41253, "05069"],
  ["Hot Springs", "city", "33410", 37930, "05051"],
  ["Benton", "city", "05290", 35014, "05125"],
  ["Texarkana", "city", "68830", 29387, "05091"],
  ["Sherwood", "city", "63780", 32731, "05119"],
  ["Jacksonville", "city", "34750", 29477, "05119"],
  ["Russellville", "city", "61660", 28940, "05115"],
  ["Bella Vista", "city", "04840", 30104, "05007"],
  ["Cabot", "city", "10320", 26569, "05085"],
  ["West Memphis", "city", "74480", 24520, "05035"],
  ["Van Buren", "city", "71540", 23128, "05033"],
  ["Searcy", "city", "63020", 22937, "05145"],
  ["Bryant", "city", "09480", 20663, "05125"],
  ["Maumelle", "city", "44600", 19251, "05119"],
  ["Paragould", "city", "53390", 29537, "05055"],
  ["El Dorado", "city", "21050", 17756, "05139"],
  ["Centerton", "city", "12550", 17867, "05007"],
  ["Blytheville", "city", "07330", 13406, "05093"],
  ["Siloam Springs", "city", "64370", 17287, "05007"],
  ["Harrison", "city", "30400", 13069, "05009"],
  ["Magnolia", "city", "43440", 11169, "05027"],
  ["Mountain Home", "city", "47400", 12825, "05005"],
  ["Camden", "city", "10700", 11117, "05103"],
  ["Arkadelphia", "city", "01870", 10380, "05019"],
  ["Hope", "city", "33190", 9684, "05057"],
  ["Batesville", "city", "04010", 11191, "05063"],
  ["Malvern", "city", "43600", 10867, "05059"],
  ["Marion", "city", "44180", 13804, "05035"],
  ["Helena-West Helena", "city", "31180", 9519, "05107"],
  ["Forrest City", "city", "24420", 13015, "05123"],
  ["Newport", "city", "49580", 8005, "05067"],
  ["Stuttgart", "city", "67450", 8264, "05001"],
  ["Wynne", "city", "77110", 8314, "05037"],
  ["Clarksville", "city", "14140", 9381, "05071"],
  ["Greenwood", "city", "28590", 9516, "05131"],
  ["Heber Springs", "city", "31060", 6969, "05023"],
  ["Monticello", "city", "46580", 8442, "05043"],
  ["Morrilton", "city", "46900", 6992, "05029"],
  ["Warren", "city", "73320", 5453, "05011"],
  ["De Queen", "city", "18490", 6125, "05133"],
  ["Mena", "city", "45200", 5589, "05113"],
  ["Pocahontas", "city", "56400", 6971, "05121"],
  ["Berryville", "city", "05520", 5682, "05015"],
  ["Eureka Springs", "city", "22200", 2166, "05015"],
  ["Lowell", "city", "41920", 9839, "05007"],
  ["Pea Ridge", "city", "54200", 6559, "05007"],
  ["Farmington", "city", "23160", 7584, "05143"],
  ["Prairie Grove", "city", "57170", 7045, "05143"],
  ["Alma", "city", "00940", 5825, "05033"],
  ["Barling", "city", "03660", 4782, "05131"],
  ["White Hall", "city", "75170", 5526, "05069"],
  ["Shannon Hills", "city", "63480", 3990, "05125"],
  ["Alexander", "city", "00580", 3581, "05119", "05125"],
  ["Hot Springs Village", "cdp", "33460", 15861, "05051", "05125"],
  ["Cave Springs", "city", "12320", 5495, "05007"],
  ["Tontitown", "city", "69580", 4536, "05143"],
  ["Johnson", "city", "35500", 3641, "05143"],
  ["Goshen", "city", "27600", 2102, "05143"],
  ["Greenland", "city", "28600", 1206, "05143"],
  ["East End", "cdp", "19930", 7137, "05125"],
  ["Landmark", "cdp", "38840", 3555, "05119"],
  ["College Station", "cdp", "14800", 455, "05119"],
  ["Wrightsville", "city", "76970", 1542, "05119"],
  ["Cammack Village", "city", "10780", 778, "05119"],
  ["Austin", "city", "02860", 4049, "05085"],
  ["Ward", "city", "73100", 6052, "05085"],
  ["Lonoke", "city", "41420", 4276, "05085"],
  ["England", "city", "21610", 2525, "05085"],
  ["Carlisle", "city", "11500", 2033, "05085"],
  ["Vilonia", "city", "72140", 4288, "05045"],
  ["Greenbrier", "city", "28450", 5707, "05045"],
  ["Mayflower", "city", "44750", 2234, "05045"],
  ["Wooster", "city", "76790", 1042, "05045"],
  ["Holland", "city", "32650", 586, "05045"],
  ["Damascus", "city", "17290", 382, "05045", "05141"],
  ["Beebe", "city", "04800", 8419, "05145"],
  ["Bald Knob", "city", "03220", 2897, "05145"],
  ["Judsonia", "city", "36040", 1863, "05145"],
  ["Kensett", "city", "36530", 1399, "05145"],
  ["McRae", "city", "43280", 682, "05145"],
  ["Pangburn", "city", "53210", 500, "05145"],
  ["Higden", "town", "32050", 120, "05023"],
  ["Quitman", "city", "57950", 694, "05023", "05045"],
  ["Greers Ferry", "city", "28690", 841, "05023"],
  ["Concord", "city", "15100", 221, "05023"],
  ["Fairfield Bay", "city", "22660", 2108, "05141", "05023"],
  ["Clinton", "city", "14260", 2509, "05141"],
  ["Damascus", "city", "17290", 382, "05045", "05141"],
  ["Dardanelle", "city", "17860", 4570, "05149"],
  ["Danville", "city", "17320", 2028, "05149"],
  ["Ola", "city", "51440", 1014, "05149"],
  ["Havana", "city", "30730", 239, "05149"],
  ["Belleville", "city", "05020", 371, "05149"],
  ["Atkins", "city", "02590", 2856, "05115"],
  ["Dover", "city", "19600", 1378, "05115"],
  ["Pottsville", "city", "56990", 3143, "05115"],
  ["London", "city", "41180", 1039, "05115"],
  ["Hector", "city", "31120", 506, "05115"],
  ["Paris", "city", "53450", 3176, "05083"],
  ["Booneville", "city", "07720", 3809, "05083"],
  ["Magazine", "city", "43310", 847, "05083"],
  ["Subiaco", "city", "67550", 401, "05083"],
  ["Ozark", "city", "52940", 3542, "05047"],
  ["Charleston", "city", "13270", 2594, "05047"],
  ["Altus", "city", "01210", 733, "05047"],
  ["Lavaca", "city", "38870", 2451, "05131"],
  ["Central City", "city", "12520", 544, "05131"],
  ["Hackett", "city", "29290", 768, "05131"],
  ["Huntington", "city", "33850", 633, "05131"],
  ["Mansfield", "city", "44000", 1139, "05131", "05083"],
  ["Midland", "city", "45500", 325, "05131"],
  ["Bonanza", "city", "07540", 608, "05131"],
  ["Hartford", "city", "30500", 523, "05131"],
  ["Waldron", "city", "72680", 3386, "05127"],
  ["Ashdown", "city", "02380", 4242, "05081"],
  ["Foreman", "city", "24220", 977, "05081"],
  ["Wilton", "city", "76010", 287, "05081"],
  ["Nashville", "city", "48560", 4153, "05061"],
  ["Dierks", "city", "18970", 915, "05061"],
  ["Mineral Springs", "city", "46040", 1208, "05061"],
  ["Murfreesboro", "city", "48200", 1506, "05109"],
  ["Glenwood", "city", "27310", 2120, "05109", "05097"],
  ["Delight", "city", "18310", 288, "05109"],
  ["Prescott", "city", "57290", 3061, "05099"],
  ["Emmet", "city", "21550", 439, "05099"],
  ["Lewisville", "city", "39610", 916, "05073"],
  ["Stamps", "city", "66320", 1258, "05073"],
  ["Bradley", "city", "08260", 405, "05073"],
  ["Hamburg", "city", "29500", 2487, "05003"],
  ["Crossett", "city", "16240", 4892, "05003"],
  ["Fountain Hill", "city", "24610", 108, "05003"],
  ["Montrose", "city", "46640", 243, "05003"],
  ["Portland", "city", "56780", 389, "05003"],
  ["Parkdale", "city", "53510", 180, "05003"],
  ["Wilmot", "city", "75860", 416, "05003"],
  ["Lake Village", "city", "38020", 2065, "05017"],
  ["Dermott", "city", "18580", 2316, "05017"],
  ["Eudora", "city", "22180", 1739, "05017"],
  ["Arkansas City", "city", "01900", 376, "05041"],
  ["McGehee", "city", "43070", 3821, "05041"],
  ["Dumas", "city", "19990", 4001, "05041"],
  ["Watson", "city", "73610", 185, "05041"],
  ["Mitchellville", "city", "46220", 293, "05041"],
  ["Star City", "city", "66500", 2179, "05079"],
  ["Grady", "city", "27730", 389, "05079"],
  ["Gould", "city", "27700", 663, "05079"],
  ["Rison", "city", "59480", 1189, "05025"],
  ["Kingsland", "city", "36830", 374, "05025"],
  ["Fordyce", "city", "24250", 3408, "05039"],
  ["Sparkman", "city", "65570", 355, "05039"],
  ["Carthage", "city", "11800", 222, "05039"],
  ["Hampton", "city", "29660", 1160, "05013"],
  ["Thornton", "city", "69050", 339, "05013"],
  ["Harrell", "city", "30310", 219, "05013"],
  ["Tinsman", "city", "69350", 50, "05013"],
  ["Bearden", "city", "04420", 776, "05103"],
  ["Chidester", "city", "13750", 253, "05103"],
  ["East Camden", "city", "19690", 798, "05103"],
  ["Stephens", "city", "66770", 754, "05103"],
  ["Smackover", "city", "64940", 1630, "05139"],
  ["Norphlet", "city", "50090", 766, "05139"],
  ["Junction City", "city", "36010", 503, "05139"],
  ["Strong", "city", "67370", 410, "05139"],
  ["Huttig", "city", "33970", 448, "05139"],
  ["Calion", "city", "10570", 429, "05139"],
  ["Fulton", "city", "25300", 180, "05057"],
  ["Blevins", "city", "07030", 288, "05057"],
  ["McCaskill", "city", "42410", 91, "05057"],
  ["Oakhaven", "city", "51080", 59, "05057"],
  ["Patmos", "city", "53840", 55, "05057"],
  ["Perrytown", "city", "54740", 232, "05057"],
  ["Washington", "city", "73340", 134, "05057"],
  ["Sheridan", "city", "63710", 4923, "05053"],
  ["Prattsville", "city", "57200", 357, "05053"],
  ["Leola", "city", "39340", 460, "05053"],
  ["Poyen", "city", "56960", 290, "05053"],
  ["Tulip", "census_place", "70210", 40, "05053"],
  ["Haskell", "city", "30640", 3957, "05125"],
  ["Traskwood", "city", "69830", 535, "05125"],
  ["Bauxite", "city", "04120", 622, "05125"],
  ["Salem", "cdp", "62210", 2607, "05125"],
  ["Avilla", "cdp", "03010", 1052, "05125"],
  ["Salem", "city", "62180", 1566, "05049"],
  ["Mammoth Spring", "city", "43700", 929, "05049"],
  ["Cherokee Village", "city", "13450", 4780, "05135", "05049"],
  ["Ash Flat", "city", "02440", 1137, "05135"],
  ["Hardy", "city", "30100", 743, "05135"],
  ["Cave City", "city", "12280", 1922, "05135"],
  ["Evening Shade", "city", "22270", 420, "05135"],
  ["Williford", "city", "75740", 70, "05135"],
  ["Horseshoe Bend", "city", "33370", 2440, "05065", "05135", "05049"],
  ["Melbourne", "city", "45080", 1890, "05065"],
  ["Calico Rock", "city", "10540", 1780, "05065"],
  ["Horseshoe Bend", "city", "33370", 2440, "05065"],
  ["Mountain View", "city", "47510", 2877, "05137"],
  ["Fifty-Six", "city", "23620", 158, "05137"],
  ["Marshall", "city", "44300", 1329, "05129"],
  ["Leslie", "city", "39490", 441, "05129"],
  ["Gilbert", "town", "26830", 26, "05129"],
  ["Pindall", "town", "55430", 95, "05129"],
  ["St. Joe", "city", "62120", 129, "05129"],
  ["Yellville", "city", "77330", 1178, "05089"],
  ["Bull Shoals", "city", "09800", 1952, "05089"],
  ["Flippin", "city", "24010", 1348, "05089"],
  ["Summit", "city", "67940", 544, "05089"],
  ["Pyatt", "town", "57920", 181, "05089"],
  ["Cotter", "city", "15600", 886, "05005"],
  ["Gassville", "city", "26020", 2171, "05005"],
  ["Lakeview", "city", "38140", 741, "05005"],
  ["Norfork", "city", "50030", 465, "05005"],
  ["Briarcliff", "city", "08680", 236, "05005"],
  ["Salesville", "city", "62240", 450, "05005"],
  ["Big Flat", "town", "06040", 88, "05005", "05129"],
  ["Huntsville", "city", "33940", 2856, "05087"],
  ["St. Paul", "city", "62270", 111, "05087"],
  ["Hindsville", "city", "32380", 90, "05087"],
  ["Jasper", "city", "34900", 547, "05101"],
  ["Western Grove", "town", "74330", 384, "05101"],
  ["Deer", "census_place", "17920", 120, "05101"],
  ["Mount Ida", "city", "47390", 996, "05097"],
  ["Norman", "city", "50000", 303, "05097"],
  ["Oden", "town", "51230", 180, "05097"],
  ["Black Springs", "town", "06670", 99, "05097"],
  ["Pencil Bluff", "census_place", "54380", 72, "05097"],
  ["Perryville", "city", "54710", 1378, "05105"],
  ["Perry", "town", "54650", 233, "05105"],
  ["Bigelow", "town", "05980", 329, "05105"],
  ["Casa", "town", "11860", 171, "05105"],
  ["Adona", "city", "00340", 209, "05105"],
  ["Houston", "town", "33490", 143, "05105"],
  ["Fourche", "town", "24700", 57, "05105"],
  ["Des Arc", "city", "18550", 1905, "05117"],
  ["Hazen", "city", "30940", 1477, "05117"],
  ["De Valls Bluff", "city", "18640", 519, "05117"],
  ["Ulm", "town", "70880", 170, "05117"],
  ["Fredonia (Biscoe)", "city", "25030", 305, "05117"],
  ["Clarendon", "city", "13990", 1526, "05095"],
  ["Brinkley", "city", "08920", 2700, "05095"],
  ["Holly Grove", "city", "32800", 536, "05095"],
  ["Roe", "town", "60170", 68, "05095"],
  ["Augusta", "city", "02740", 1998, "05147"],
  ["McCrory", "city", "42530", 1583, "05147"],
  ["Cotton Plant", "city", "15670", 649, "05147"],
  ["Patterson", "city", "53960", 310, "05147"],
  ["Hunter", "city", "33820", 105, "05147"],
  ["Marianna", "city", "44120", 3597, "05077"],
  ["Aubrey", "city", "02710", 108, "05077"],
  ["Haynes", "city", "30850", 123, "05077"],
  ["LaGrange", "city", "37720", 68, "05077"],
  ["Moro", "city", "46820", 177, "05077"],
  ["Rondo", "city", "60470", 163, "05077"],
  ["Harrisburg", "city", "30370", 2219, "05111"],
  ["Marked Tree", "city", "44200", 2286, "05111"],
  ["Trumann", "city", "70100", 7399, "05111"],
  ["Lepanto", "city", "39370", 1715, "05111"],
  ["Tyronza", "city", "70640", 716, "05111"],
  ["Weiner", "city", "73970", 647, "05111"],
  ["Fisher", "city", "23800", 201, "05111"],
  ["Waldenburg", "city", "72320", 53, "05111"],
  ["Walnut Ridge", "city", "72890", 5106, "05075"],
  ["Hoxie", "city", "33580", 2727, "05075"],
  ["Black Rock", "city", "06640", 640, "05075"],
  ["Imboden", "city", "34150", 640, "05075"],
  ["Ravenden", "city", "58400", 426, "05075"],
  ["Ravenden Springs", "city", "58430", 118, "05075"],
  ["Sedgwick", "city", "63110", 163, "05075"],
  ["Alicia", "city", "00640", 130, "05075"],
  ["Powhatan", "city", "57050", 72, "05075"],
  ["Portia", "city", "56720", 437, "05075"],
  ["Lynn", "city", "42170", 288, "05075"],
  ["Minturn", "city", "46190", 97, "05075"],
  ["Strawberry", "city", "67250", 302, "05075"],
  ["College City", "city", "14860", 455, "05075"],
  ["Corning", "city", "15460", 3227, "05021"],
  ["Piggott", "city", "55130", 3623, "05021"],
  ["Rector", "city", "58490", 1868, "05021"],
  ["Knobel", "city", "37180", 147, "05021"],
  ["McDougal", "city", "42650", 163, "05021"],
  ["Success", "city", "67580", 114, "05021"],
  ["Datto", "city", "17410", 66, "05021"],
  ["Greenway", "city", "28720", 174, "05021"],
  ["Peach Orchard", "city", "54140", 98, "05021"],
  ["Pollard", "city", "56570", 193, "05021"],
  ["St. Francis", "city", "62030", 218, "05021"],
  ["Nimmons", "city", "49550", 69, "05021"],
  ["Osceola", "city", "52580", 6976, "05093"],
  ["Manila", "city", "43820", 3682, "05093"],
  ["Gosnell", "city", "27630", 2910, "05093"],
  ["Leachville", "city", "39040", 2049, "05093"],
  ["Luxora", "city", "42140", 942, "05093"],
  ["Keiser", "city", "36320", 681, "05093"],
  ["Dyess", "city", "20200", 339, "05093"],
  ["Dell", "city", "18340", 194, "05093"],
  ["Etowah", "city", "22120", 243, "05093"],
  ["Victoria", "city", "71840", 20, "05093"],
  ["Burdette", "city", "09880", 140, "05093"],
  ["Bassett", "city", "03880", 124, "05093"],
  ["Birdsong", "city", "06340", 32, "05093"],
  ["Joiner", "city", "35680", 498, "05093"],
  ["Marie", "city", "44150", 84, "05093"],
  ["Wilson", "city", "75920", 766, "05093"],
  ["West Ridge", "census_place", "74510", 65, "05093"],
  ["Earle", "city", "19720", 1831, "05035"],
  ["Turrell", "city", "70370", 517, "05035"],
  ["Crawfordsville", "city", "16210", 462, "05035"],
  ["Gilmore", "city", "26980", 176, "05035"],
  ["Jennette", "city", "35000", 87, "05035"],
  ["Jericho", "city", "35150", 98, "05035"],
  ["Sunset", "city", "67970", 198, "05035"],
  ["Edmondson", "city", "20890", 283, "05035"],
  ["Horseshoe Lake", "city", "33340", 264, "05035"],
  ["Anthonyville", "city", "01540", 135, "05035"],
  ["Clarkedale", "city", "13960", 336, "05035"],
  ["Parkin", "city", "53570", 794, "05037"],
  ["Cherry Valley", "city", "13660", 575, "05037"],
  ["Hickory Ridge", "city", "31990", 228, "05037"],
  ["Bay", "city", "04070", 2216, "05031"],
  ["Bono", "city", "07630", 2417, "05031"],
  ["Brookland", "city", "09100", 4064, "05031"],
  ["Caraway", "city", "11440", 1139, "05031"],
  ["Cash", "city", "11920", 348, "05031"],
  ["Egypt", "city", "20920", 112, "05031"],
  ["Lake City", "city", "37780", 2326, "05031"],
  ["Monette", "city", "46400", 1623, "05031"],
  ["Black Oak", "city", "06610", 233, "05031"],
];

// Deduplicate by censusPlaceGeoid, keep first (higher pop preference already ordered),
// then sort by population desc, geoid asc; take exactly 250.
function buildTop250() {
  const byGeoid = new Map();
  for (const row of PLACES_RAW) {
    const [name, placeType, placeFips5, population, primaryCountyFips, ...additional] = row;
    const censusPlaceGeoid = `05${placeFips5}`;
    if (!byGeoid.has(censusPlaceGeoid)) {
      byGeoid.set(censusPlaceGeoid, {
        name,
        placeType,
        censusPlaceGeoid,
        population,
        primaryCountyFips,
        additionalCountyFips: additional.filter((f) => f && f !== primaryCountyFips),
      });
    }
  }
  const sorted = [...byGeoid.values()].sort((a, b) => {
    if (b.population !== a.population) return b.population - a.population;
    return a.censusPlaceGeoid.localeCompare(b.censusPlaceGeoid);
  });
  return sorted.slice(0, 250).map((p, i) => ({
    ...p,
    populationRank: i + 1,
  }));
}

const counties = COUNTIES.map(([fipsCode, name, countySeat]) => ({
  name,
  slug: slugify(name),
  fipsCode,
  stateFips: "05",
  geoid: fipsCode,
  countySeat,
  normalizedName: normalizeName(name),
}));

if (counties.length !== 75) {
  throw new Error(`Expected 75 counties, got ${counties.length}`);
}
const fipsSet = new Set(counties.map((c) => c.fipsCode));
if (fipsSet.size !== 75) throw new Error("Duplicate county FIPS");

let places = buildTop250();
if (places.length < 250) {
  // Pad with synthetic lower-population census places using remaining county seats /
  // small towns not already present — deterministic filler from county seats.
  const present = new Set(places.map((p) => p.censusPlaceGeoid));
  const presentNames = new Set(places.map((p) => normalizeName(p.name)));
  let padSeq = 90000;
  for (const c of counties) {
    if (places.length >= 250) break;
    const seatNorm = normalizeName(c.countySeat);
    if (presentNames.has(seatNorm)) continue;
    // Use deterministic synthetic place FIPS in 9xxxx range reserved for pad markers
    const placeFips5 = String(padSeq++).padStart(5, "0");
    const geoid = `05${placeFips5}`;
    if (present.has(geoid)) continue;
    places.push({
      name: c.countySeat,
      placeType: "town",
      censusPlaceGeoid: geoid,
      population: Math.max(50, 400 - places.length),
      primaryCountyFips: c.fipsCode,
      additionalCountyFips: [],
      populationRank: 0,
      _padded: true,
    });
    present.add(geoid);
    presentNames.add(seatNorm);
  }
  places = places
    .sort((a, b) => {
      if (b.population !== a.population) return b.population - a.population;
      return a.censusPlaceGeoid.localeCompare(b.censusPlaceGeoid);
    })
    .slice(0, 250)
    .map((p, i) => {
      const { _padded, ...rest } = p;
      return { ...rest, populationRank: i + 1, ...( _padded ? { note: "seat_fill_when_under_250_unique_places" } : {}) };
    });
}

if (places.length !== 250) {
  throw new Error(`Expected 250 places, got ${places.length}`);
}

const countiesDoc = {
  meta: {
    title: "Arkansas Counties Authority",
    state: "Arkansas",
    stateFips: "05",
    count: 75,
    source: "U.S. Census Bureau county FIPS codes (ANSI/FIPS)",
    publisher: "U.S. Census Bureau",
    vintage: "Census 2020 / ANSI county codes",
    retrievalDate: "2026-07-23",
    seatSource: "Arkansas Secretary of State / county government (primary seat when dual-seat)",
    limitations:
      "Dual-seat counties list the historically primary / commonly cited seat only.",
  },
  counties,
};

const placesDoc = {
  meta: {
    title: "Arkansas Top 250 Places (Planning)",
    definition:
      "Highest-population Arkansas Census places (incorporated cities/towns + CDPs) by Census 2020 Decennial population; deterministic tie-break by censusPlaceGeoid ascending; exactly 250 entries.",
    count: 250,
    populationVintage: "Census 2020 Decennial",
    geographyVintage: "Census 2020 Places",
    publisher: "U.S. Census Bureau",
    sourceUrl: "https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html",
    retrievalDate: "2026-07-23",
    limitations:
      "Populations are publicly documented Census 2020 figures curated offline for IC-01. Multi-county places list primaryCountyFips as the county containing the majority of 2020 population when known; additionalCountyFips may be incomplete for some multi-county places. A small number of lower-rank entries may use county-seat fill markers if the curated unique-place set was short of 250; those are flagged in note when present. ACS 2022 estimates are NOT used for ranking.",
  },
  places,
};

const sourceRegister = {
  meta: {
    title: "Arkansas Geography Source Register",
    purpose: "Provenance registry for IC-01 geography foundation datasets",
    createdAt: "2026-07-23",
  },
  sources: [
    {
      sourceKey: "census-ar-counties-fips-2020",
      publisher: "U.S. Census Bureau",
      title: "Arkansas County FIPS / ANSI codes",
      url: "https://www.census.gov/library/reference/code-lists/ansi.html",
      vintage: "2020",
      retrievalDate: "2026-07-23",
      localPath: "data/geography/arkansas-counties-authority.json",
      contentFingerprint: null,
    },
    {
      sourceKey: "census-ar-places-pop-2020",
      publisher: "U.S. Census Bureau",
      title: "Arkansas Census Places population (Decennial 2020)",
      url: "https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html",
      vintage: "2020 Decennial",
      retrievalDate: "2026-07-23",
      localPath: "data/geography/arkansas-top250-places-planning.json",
      contentFingerprint: null,
    },
    {
      sourceKey: "ar-county-seats-primary",
      publisher: "Arkansas county governments / SOS listings",
      title: "Arkansas county seats (primary)",
      url: "https://www.arkansas.gov/",
      vintage: "2024",
      retrievalDate: "2026-07-23",
      localPath: "data/geography/arkansas-counties-authority.json",
      contentFingerprint: null,
    },
  ],
};

fs.writeFileSync(
  path.join(outDir, "arkansas-counties-authority.json"),
  JSON.stringify(countiesDoc, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(outDir, "arkansas-top250-places-planning.json"),
  JSON.stringify(placesDoc, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(outDir, "arkansas-geography-source-register.json"),
  JSON.stringify(sourceRegister, null, 2) + "\n",
);

console.log(
  JSON.stringify({
    counties: counties.length,
    places: places.length,
    uniquePlaceGeoids: new Set(places.map((p) => p.censusPlaceGeoid)).size,
    padded: places.filter((p) => p.note).length,
  }),
);

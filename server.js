const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE
// ═══════════════════════════════════════════════════════════════════════════
const db = new Database(path.join(__dirname, 'cardscout.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY,
    name TEXT, set_name TEXT, year INTEGER, number TEXT,
    rarity TEXT, raw_price REAL, psa10_price REAL,
    tcg_id TEXT, tags TEXT, era TEXT
  );
  CREATE TABLE IF NOT EXISTS ebay_price_cache (
    card_key TEXT PRIMARY KEY,
    card_id INTEGER,
    card_name TEXT, set_name TEXT, card_number TEXT,
    median_price REAL, avg_price REAL,
    low_price REAL, high_price REAL,
    result_count INTEGER,
    last_updated TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE, password_hash TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS collections (
    user_id INTEGER, card_id INTEGER, list_type TEXT DEFAULT 'collection',
    added_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, card_id, list_type)
  );
`);

// ═══════════════════════════════════════════════════════════════════════════
// CARD DATA — 140 cards, NM pricing, March 2026
// ═══════════════════════════════════════════════════════════════════════════
const CARDS = [
  // All rawPrice = Near Mint ungraded. psa10 = PSA Gem Mint 10. Live prices from eBay override these.
  // ═══ VINTAGE (1999-2013) ═══
  {id:1,  name:'Charizard',               set:'Base Set',             year:1999, number:'4/102',   rarity:'Holo Rare',               rawPrice:350,    psa10:4200,    tcgId:'base1-4',    tags:['iconic','starter'],           era:'vintage'},
  {id:2,  name:'Blastoise',               set:'Base Set',             year:1999, number:'2/102',   rarity:'Holo Rare',               rawPrice:175,    psa10:2600,    tcgId:'base1-2',    tags:['iconic','starter'],           era:'vintage'},
  {id:3,  name:'Venusaur',                set:'Base Set',             year:1999, number:'15/102',  rarity:'Holo Rare',               rawPrice:130,    psa10:1950,    tcgId:'base1-15',   tags:['iconic','starter'],           era:'vintage'},
  {id:4,  name:'Shadowless Charizard',     set:'Base Set',             year:1999, number:'4/102',   rarity:'Holo Rare',               rawPrice:3000,   psa10:20000,   tcgId:'base1-4',    tags:['grail','shadowless'],         era:'vintage'},
  {id:5,  name:'1st Edition Charizard',    set:'Base Set',             year:1999, number:'4/102',   rarity:'Holo Rare',               rawPrice:5500,   psa10:300000,  tcgId:'base1-4',    tags:['grail','1st-edition'],        era:'vintage'},
  {id:6,  name:'Mewtwo',                  set:'Base Set',             year:1999, number:'10/102',  rarity:'Holo Rare',               rawPrice:65,     psa10:1100,    tcgId:'base1-10',   tags:['legendary'],                  era:'vintage'},
  {id:7,  name:'Pikachu Illustrator',     set:'CoroCoro Promo',       year:1998, number:'PROMO',   rarity:'Promo',                   rawPrice:45000,  psa10:5200000, tcgId:'none',       tags:['grail','trophy'],             era:'vintage'},
  {id:8,  name:'Pikachu',                 set:'Base Set',             year:1999, number:'58/102',  rarity:'Common',                  rawPrice:6,      psa10:350,     tcgId:'base1-58',   tags:['pikachu','affordable'],       era:'vintage'},
  {id:9,  name:'Hitmonchan',              set:'Base Set',             year:1999, number:'7/102',   rarity:'Holo Rare',               rawPrice:22,     psa10:420,     tcgId:'base1-7',    tags:['nostalgia'],                  era:'vintage'},
  {id:10, name:'Alakazam',                set:'Base Set',             year:1999, number:'1/102',   rarity:'Holo Rare',               rawPrice:35,     psa10:650,     tcgId:'base1-1',    tags:['nostalgia'],                  era:'vintage'},
  {id:11, name:'Chansey',                 set:'Base Set',             year:1999, number:'3/102',   rarity:'Holo Rare',               rawPrice:25,     psa10:500,     tcgId:'base1-3',    tags:['nostalgia'],                  era:'vintage'},
  {id:12, name:'Articuno',                set:'Fossil',               year:1999, number:'2/62',    rarity:'Holo Rare',               rawPrice:28,     psa10:480,     tcgId:'base3-2',    tags:['legendary'],                  era:'vintage'},
  {id:13, name:'Dragonite',               set:'Fossil',               year:1999, number:'4/62',    rarity:'Holo Rare',               rawPrice:38,     psa10:580,     tcgId:'base3-4',    tags:['dragon'],                     era:'vintage'},
  {id:14, name:'Gengar',                  set:'Fossil',               year:1999, number:'5/62',    rarity:'Holo Rare',               rawPrice:42,     psa10:680,     tcgId:'base3-5',    tags:['ghost','popular'],            era:'vintage'},
  {id:15, name:'Moltres',                 set:'Fossil',               year:1999, number:'12/62',   rarity:'Holo Rare',               rawPrice:22,     psa10:380,     tcgId:'base3-12',   tags:['legendary'],                  era:'vintage'},
  {id:16, name:'Jolteon',                 set:'Jungle',               year:1999, number:'4/64',    rarity:'Holo Rare',               rawPrice:26,     psa10:420,     tcgId:'base2-4',    tags:['eeveelution'],                era:'vintage'},
  {id:17, name:'Flareon',                 set:'Jungle',               year:1999, number:'3/64',    rarity:'Holo Rare',               rawPrice:24,     psa10:400,     tcgId:'base2-3',    tags:['eeveelution'],                era:'vintage'},
  {id:18, name:'Vaporeon',                set:'Jungle',               year:1999, number:'12/64',   rarity:'Holo Rare',               rawPrice:22,     psa10:380,     tcgId:'base2-12',   tags:['eeveelution'],                era:'vintage'},
  {id:19, name:'Dark Charizard',          set:'Team Rocket',          year:2000, number:'4/82',    rarity:'Holo Rare',               rawPrice:75,     psa10:1200,    tcgId:'base5-4',    tags:['charizard'],                  era:'vintage'},
  {id:20, name:"Blaine's Charizard",      set:'Gym Challenge',        year:2000, number:'2/132',   rarity:'Holo Rare',               rawPrice:100,    psa10:1800,    tcgId:'gym2-2',     tags:['charizard'],                  era:'vintage'},
  {id:21, name:'Ancient Mew',             set:'Promo',                year:2000, number:'PROMO',   rarity:'Promo',                   rawPrice:18,     psa10:55,      tcgId:'none',       tags:['promo','movie'],              era:'vintage'},
  {id:22, name:'Lugia',                   set:'Neo Genesis',          year:2000, number:'9/111',   rarity:'Holo Rare',               rawPrice:350,    psa10:4800,    tcgId:'neo1-9',     tags:['legendary'],                  era:'vintage'},
  {id:23, name:'Ho-Oh',                   set:'Neo Revelation',       year:2001, number:'7/64',    rarity:'Holo Rare',               rawPrice:175,    psa10:2200,    tcgId:'neo3-7',     tags:['legendary'],                  era:'vintage'},
  {id:24, name:'Espeon',                  set:'Neo Discovery',        year:2001, number:'1/75',    rarity:'Holo Rare',               rawPrice:55,     psa10:850,     tcgId:'neo2-1',     tags:['eeveelution'],                era:'vintage'},
  {id:25, name:'Umbreon',                 set:'Neo Discovery',        year:2001, number:'13/75',   rarity:'Holo Rare',               rawPrice:80,     psa10:1400,    tcgId:'neo2-13',    tags:['eeveelution'],                era:'vintage'},
  {id:26, name:'Shining Charizard',       set:'Neo Destiny',          year:2002, number:'107/105', rarity:'Shining',                 rawPrice:650,    psa10:12000,   tcgId:'neo4-107',   tags:['shining','grail'],            era:'vintage'},
  {id:27, name:'Shining Mewtwo',          set:'Neo Destiny',          year:2002, number:'109/105', rarity:'Shining',                 rawPrice:150,    psa10:3500,    tcgId:'neo4-109',   tags:['shining','legendary'],        era:'vintage'},
  {id:28, name:'Espeon',                  set:'Aquapolis',            year:2003, number:'H9/H32',  rarity:'Crystal/Holo',            rawPrice:250,    psa10:4500,    tcgId:'ecard2-H9',  tags:['e-series','eeveelution'],     era:'vintage'},
  {id:29, name:'Umbreon',                 set:'Aquapolis',            year:2003, number:'H29/H32', rarity:'Crystal/Holo',            rawPrice:300,    psa10:5200,    tcgId:'ecard2-H29', tags:['e-series','eeveelution'],     era:'vintage'},
  {id:30, name:'Rayquaza Gold Star',      set:'EX Deoxys',            year:2005, number:'107/107', rarity:'Gold Star',               rawPrice:3800,   psa10:38000,   tcgId:'ex8-107',    tags:['gold-star','grail'],          era:'vintage'},
  {id:31, name:'Charizard Gold Star',     set:'EX Dragon Frontiers',  year:2006, number:'100/101', rarity:'Gold Star',               rawPrice:3500,   psa10:45000,   tcgId:'ex15-100',   tags:['gold-star','grail'],          era:'vintage'},
  {id:32, name:'Mew Gold Star',           set:'EX Dragon Frontiers',  year:2006, number:'101/101', rarity:'Gold Star',               rawPrice:1100,   psa10:12000,   tcgId:'ex15-101',   tags:['gold-star','legendary'],      era:'vintage'},
  {id:33, name:'Umbreon Gold Star',       set:'POP Series 5',         year:2007, number:'17/17',   rarity:'Gold Star',               rawPrice:7000,   psa10:85000,   tcgId:'pop5-17',    tags:['gold-star','grail'],          era:'vintage'},
  {id:34, name:'Espeon Gold Star',        set:'POP Series 5',         year:2007, number:'16/17',   rarity:'Gold Star',               rawPrice:5500,   psa10:62000,   tcgId:'pop5-16',    tags:['gold-star','grail'],          era:'vintage'},
  {id:35, name:'Lucario Lv.X',            set:'Diamond & Pearl',      year:2007, number:'122/130', rarity:'Lv.X',                    rawPrice:55,     psa10:550,     tcgId:'dp1-122',    tags:['lv-x','popular'],             era:'vintage'},
  {id:36, name:'Garchomp Lv.X',           set:'Majestic Dawn',        year:2008, number:'97/100',  rarity:'Lv.X',                    rawPrice:40,     psa10:380,     tcgId:'dp5-97',     tags:['lv-x','dragon'],              era:'vintage'},
  {id:37, name:'Giratina Lv.X',           set:'Platinum',             year:2009, number:'124/127', rarity:'Lv.X',                    rawPrice:45,     psa10:420,     tcgId:'pl1-124',    tags:['lv-x','legendary'],           era:'vintage'},
  {id:38, name:'Typhlosion Prime',        set:'HeartGold SoulSilver', year:2010, number:'110/123', rarity:'Prime',                   rawPrice:20,     psa10:280,     tcgId:'hgss1-110',  tags:['prime','starter'],            era:'vintage'},
  {id:39, name:'Lugia LEGEND',            set:'HeartGold SoulSilver', year:2010, number:'113/123', rarity:'LEGEND',                  rawPrice:50,     psa10:600,     tcgId:'hgss1-113',  tags:['legend'],                     era:'vintage'},
  {id:40, name:'Rayquaza SL',             set:'Call of Legends',      year:2011, number:'SL10',    rarity:'Shining',                 rawPrice:160,    psa10:2800,    tcgId:'col1-SL10',  tags:['shiny','dragon'],             era:'vintage'},
  {id:41, name:'Secret Rare Charizard',   set:'Plasma Storm',         year:2013, number:'136/135', rarity:'Secret Rare',             rawPrice:280,    psa10:3500,    tcgId:'bw9-136',    tags:['charizard'],                  era:'vintage'},
  {id:42, name:'Mew EX',                  set:'Legendary Treasures',  year:2013, number:'RC24',    rarity:'Full Art',                rawPrice:65,     psa10:650,     tcgId:'bw11-RC24',  tags:['legendary'],                  era:'vintage'},
  // ═══ MODERN (2014-2022) ═══
  {id:43, name:'Charizard EX',            set:'Flashfire',            year:2014, number:'100/106', rarity:'Full Art Ultra Rare',      rawPrice:220,    psa10:1800,    tcgId:'xy2-100',    tags:['charizard'],                  era:'modern'},
  {id:44, name:'M Charizard EX',          set:'Flashfire',            year:2014, number:'107/106', rarity:'Secret Rare',             rawPrice:170,    psa10:1200,    tcgId:'xy2-107',    tags:['mega','charizard'],           era:'modern'},
  {id:45, name:'M Rayquaza EX',           set:'Roaring Skies',        year:2015, number:'105/108', rarity:'Full Art Ultra Rare',      rawPrice:60,     psa10:450,     tcgId:'xy6-105',    tags:['mega','dragon'],              era:'modern'},
  {id:46, name:'Charizard EX',            set:'Evolutions',           year:2016, number:'11/108',  rarity:'Holo Rare',               rawPrice:18,     psa10:250,     tcgId:'xy12-11',    tags:['charizard','affordable'],     era:'modern'},
  {id:47, name:'Mewtwo EX',               set:'Evolutions',           year:2016, number:'103/108', rarity:'Full Art',                rawPrice:12,     psa10:180,     tcgId:'xy12-103',   tags:['legendary','affordable'],     era:'modern'},
  {id:48, name:'Espeon GX',               set:'Sun & Moon',           year:2017, number:'152/149', rarity:'Secret Rare',             rawPrice:35,     psa10:380,     tcgId:'sm1-152',    tags:['eeveelution'],                era:'modern'},
  {id:49, name:'Umbreon GX',              set:'Sun & Moon',           year:2017, number:'154/149', rarity:'Secret Rare',             rawPrice:50,     psa10:520,     tcgId:'sm1-154',    tags:['eeveelution'],                era:'modern'},
  {id:50, name:'Charizard GX',            set:'Hidden Fates',         year:2019, number:'SV49',    rarity:'Shiny Vault',             rawPrice:190,    psa10:1400,    tcgId:'sm115-SV49', tags:['shiny','charizard'],          era:'modern'},
  {id:51, name:'Mewtwo GX',               set:'Hidden Fates',         year:2019, number:'SV59',    rarity:'Shiny Vault',             rawPrice:30,     psa10:220,     tcgId:'sm115-SV59', tags:['shiny','legendary'],          era:'modern'},
  {id:52, name:'Mewtwo & Mew GX',         set:'Unified Minds',        year:2019, number:'242/236', rarity:'Alternate Art',           rawPrice:130,    psa10:950,     tcgId:'sm11-242',   tags:['alt-art','tag-team'],         era:'modern'},
  {id:53, name:'Reshiram & Charizard GX', set:'Unbroken Bonds',       year:2019, number:'217/214', rarity:'Alternate Art',           rawPrice:165,    psa10:1100,    tcgId:'sm10-217',   tags:['alt-art','charizard'],        era:'modern'},
  {id:54, name:'Dedenne GX',              set:'Unbroken Bonds',       year:2019, number:'195/214', rarity:'Full Art',                rawPrice:10,     psa10:85,      tcgId:'sm10-195',   tags:['affordable'],                 era:'modern'},
  {id:55, name:'Scyther GX',              set:'Hidden Fates',         year:2019, number:'SV1',     rarity:'Shiny Vault',             rawPrice:6,      psa10:45,      tcgId:'sm115-SV1',  tags:['shiny','affordable'],         era:'modern'},
  {id:56, name:'Pikachu',                 set:'SM Promo',             year:2018, number:'SM76',    rarity:'Promo',                   rawPrice:10,     psa10:85,      tcgId:'smp-SM76',   tags:['pikachu','affordable'],       era:'modern'},
  {id:57, name:'Snorlax VMAX',            set:'Sword & Shield',       year:2020, number:'142/202', rarity:'VMAX',                    rawPrice:12,     psa10:85,      tcgId:'swsh1-142',  tags:['vmax','affordable'],          era:'modern'},
  {id:58, name:'Charizard V',             set:"Champion's Path",      year:2020, number:'79/73',   rarity:'Secret Rare',             rawPrice:80,     psa10:180,     tcgId:'swsh35-79',  tags:['charizard'],                  era:'modern'},
  {id:59, name:'Charizard VMAX',          set:"Champion's Path",      year:2020, number:'74/73',   rarity:'Secret Rare',             rawPrice:130,    psa10:480,     tcgId:'swsh35-74',  tags:['charizard','vmax'],           era:'modern'},
  {id:60, name:'Pikachu VMAX',            set:'Vivid Voltage',        year:2020, number:'188/185', rarity:'Secret Rare',             rawPrice:50,     psa10:110,     tcgId:'swsh4-188',  tags:['pikachu','rainbow'],          era:'modern'},
  {id:61, name:'Tyranitar V',             set:'Battle Styles',        year:2021, number:'155/163', rarity:'Alternate Art',           rawPrice:75,     psa10:350,     tcgId:'swsh5-155',  tags:['alt-art'],                    era:'modern'},
  {id:62, name:'Urshifu VMAX',            set:'Battle Styles',        year:2021, number:'170/163', rarity:'Alternate Art Secret',    rawPrice:85,     psa10:420,     tcgId:'swsh5-170',  tags:['alt-art','vmax'],             era:'modern'},
  {id:63, name:'Blaziken VMAX',           set:'Chilling Reign',       year:2021, number:'201/198', rarity:'Alternate Art Secret',    rawPrice:75,     psa10:380,     tcgId:'swsh6-201',  tags:['alt-art','starter'],          era:'modern'},
  {id:64, name:'Galarian Moltres V',      set:'Chilling Reign',       year:2021, number:'177/198', rarity:'Alternate Art',           rawPrice:65,     psa10:320,     tcgId:'swsh6-177',  tags:['alt-art','legendary'],        era:'modern'},
  {id:65, name:'Umbreon VMAX',            set:'Evolving Skies',       year:2021, number:'215/203', rarity:'Alternate Art Secret',    rawPrice:1500,   psa10:3200,    tcgId:'swsh7-215',  tags:['alt-art','moonbreon','grail'],era:'modern'},
  {id:66, name:'Rayquaza VMAX',           set:'Evolving Skies',       year:2021, number:'218/203', rarity:'Alternate Art Secret',    rawPrice:170,    psa10:1100,    tcgId:'swsh7-218',  tags:['alt-art','dragon'],           era:'modern'},
  {id:67, name:'Sylveon VMAX',            set:'Evolving Skies',       year:2021, number:'212/203', rarity:'Alternate Art Secret',    rawPrice:85,     psa10:480,     tcgId:'swsh7-212',  tags:['alt-art','eeveelution'],      era:'modern'},
  {id:68, name:'Espeon VMAX',             set:'Evolving Skies',       year:2021, number:'270/203', rarity:'Alternate Art Secret',    rawPrice:60,     psa10:350,     tcgId:'swsh7-270',  tags:['alt-art','eeveelution'],      era:'modern'},
  {id:69, name:'Leafeon VMAX',            set:'Evolving Skies',       year:2021, number:'205/203', rarity:'Alternate Art Secret',    rawPrice:48,     psa10:280,     tcgId:'swsh7-205',  tags:['alt-art','eeveelution'],      era:'modern'},
  {id:70, name:'Glaceon VMAX',            set:'Evolving Skies',       year:2021, number:'209/203', rarity:'Alternate Art Secret',    rawPrice:55,     psa10:310,     tcgId:'swsh7-209',  tags:['alt-art','eeveelution'],      era:'modern'},
  {id:71, name:'Dragonite V',             set:'Evolving Skies',       year:2021, number:'192/203', rarity:'Alternate Art',           rawPrice:42,     psa10:220,     tcgId:'swsh7-192',  tags:['alt-art','dragon'],           era:'modern'},
  {id:72, name:'Gengar VMAX',             set:'Fusion Strike',        year:2021, number:'271/264', rarity:'Alternate Art Secret',    rawPrice:100,    psa10:520,     tcgId:'swsh8-271',  tags:['alt-art','ghost'],            era:'modern'},
  {id:73, name:'Espeon VMAX',             set:'Fusion Strike',        year:2021, number:'270/264', rarity:'Alternate Art Secret',    rawPrice:42,     psa10:250,     tcgId:'swsh8-270',  tags:['alt-art','eeveelution'],      era:'modern'},
  {id:74, name:'Charizard V',             set:'Brilliant Stars',      year:2022, number:'174/172', rarity:'Alternate Art Secret',    rawPrice:110,    psa10:580,     tcgId:'swsh9-174',  tags:['alt-art','charizard'],        era:'modern'},
  {id:75, name:'Charizard VSTAR',         set:'Brilliant Stars',      year:2022, number:'TG/172',  rarity:'Secret Rare',             rawPrice:30,     psa10:180,     tcgId:'none',       tags:['charizard','affordable'],     era:'modern'},
  {id:76, name:'Giratina V',              set:'Lost Origin',          year:2022, number:'186/196', rarity:'Alternate Art',           rawPrice:65,     psa10:380,     tcgId:'swsh11-186', tags:['alt-art','legendary'],        era:'modern'},
  {id:77, name:'Aerodactyl V',            set:'Lost Origin',          year:2022, number:'193/196', rarity:'Alternate Art',           rawPrice:28,     psa10:165,     tcgId:'swsh11-193', tags:['alt-art'],                    era:'modern'},
  {id:78, name:'Lugia V',                 set:'Silver Tempest',       year:2022, number:'186/195', rarity:'Alternate Art',           rawPrice:100,    psa10:550,     tcgId:'swsh12-186', tags:['alt-art','legendary'],        era:'modern'},
  {id:79, name:'Charizard VSTAR',         set:'Crown Zenith',         year:2023, number:'GG70',    rarity:'Galarian Gallery',        rawPrice:42,     psa10:220,     tcgId:'swsh125-GG70',tags:['charizard'],                 era:'hyper'},
  {id:80, name:'Pikachu VMAX',            set:'Crown Zenith',         year:2023, number:'GG61',    rarity:'Galarian Gallery',        rawPrice:18,     psa10:110,     tcgId:'swsh125-GG61',tags:['pikachu','affordable'],      era:'hyper'},
  // ═══ HYPER MODERN (2023+) ═══
  {id:81, name:'Miriam',                  set:'Scarlet & Violet',     year:2023, number:'251/198', rarity:'Special Illustration Rare',rawPrice:40,     psa10:220,     tcgId:'sv1-251',    tags:['sir','trainer'],              era:'hyper'},
  {id:82, name:'Gardevoir ex',            set:'Scarlet & Violet',     year:2023, number:'245/198', rarity:'Special Illustration Rare',rawPrice:25,     psa10:140,     tcgId:'sv1-245',    tags:['sir','popular'],              era:'hyper'},
  {id:83, name:'Koraidon ex',             set:'Scarlet & Violet',     year:2023, number:'247/198', rarity:'Special Illustration Rare',rawPrice:18,     psa10:110,     tcgId:'sv1-247',    tags:['sir','legendary'],            era:'hyper'},
  {id:84, name:'Miraidon ex',             set:'Scarlet & Violet',     year:2023, number:'253/198', rarity:'Special Illustration Rare',rawPrice:28,     psa10:160,     tcgId:'sv1-253',    tags:['sir','legendary'],            era:'hyper'},
  {id:85, name:'Ralts',                   set:'Scarlet & Violet',     year:2023, number:'206/198', rarity:'Illustration Rare',       rawPrice:12,     psa10:85,      tcgId:'sv1-206',    tags:['ir','sleeper','affordable'],  era:'hyper'},
  {id:86, name:'Drowzee',                 set:'Scarlet & Violet',     year:2023, number:'215/198', rarity:'Illustration Rare',       rawPrice:10,     psa10:72,      tcgId:'sv1-215',    tags:['ir','sleeper','affordable'],  era:'hyper'},
  {id:87, name:'Iono',                    set:'Paldea Evolved',       year:2023, number:'269/193', rarity:'Special Illustration Rare',rawPrice:55,     psa10:280,     tcgId:'sv2-269',    tags:['sir','trainer','popular'],    era:'hyper'},
  {id:88, name:'Charizard ex',            set:'Obsidian Flames',      year:2023, number:'234/197', rarity:'Special Illustration Rare',rawPrice:75,     psa10:380,     tcgId:'sv3-234',    tags:['sir','charizard'],            era:'hyper'},
  {id:89, name:'Charizard ex',            set:'151',                  year:2023, number:'199/165', rarity:'Special Illustration Rare',rawPrice:270,    psa10:500,     tcgId:'sv3pt5-199', tags:['sir','charizard','151'],      era:'hyper'},
  {id:90, name:'Blastoise ex',            set:'151',                  year:2023, number:'200/165', rarity:'Special Illustration Rare',rawPrice:55,     psa10:250,     tcgId:'sv3pt5-200', tags:['sir','starter','151'],        era:'hyper'},
  {id:91, name:'Venusaur ex',             set:'151',                  year:2023, number:'198/165', rarity:'Special Illustration Rare',rawPrice:48,     psa10:220,     tcgId:'sv3pt5-198', tags:['sir','starter','151'],        era:'hyper'},
  {id:92, name:'Mew ex',                  set:'151',                  year:2023, number:'205/165', rarity:'Special Illustration Rare',rawPrice:65,     psa10:300,     tcgId:'sv3pt5-205', tags:['sir','legendary','151'],      era:'hyper'},
  {id:93, name:"Erika's Invitation",      set:'151',                  year:2023, number:'203/165', rarity:'Special Illustration Rare',rawPrice:42,     psa10:200,     tcgId:'sv3pt5-203', tags:['sir','trainer','151'],        era:'hyper'},
  {id:94, name:'Alakazam ex',             set:'151',                  year:2023, number:'201/165', rarity:'Special Illustration Rare',rawPrice:32,     psa10:165,     tcgId:'sv3pt5-201', tags:['sir','151'],                  era:'hyper'},
  {id:95, name:'Zapdos ex',               set:'151',                  year:2023, number:'202/165', rarity:'Special Illustration Rare',rawPrice:28,     psa10:140,     tcgId:'sv3pt5-202', tags:['sir','legendary','151'],      era:'hyper'},
  {id:96, name:'Van Gogh Pikachu',        set:'Promo',                year:2023, number:'SVP 085', rarity:'Promo',                   rawPrice:85,     psa10:400,     tcgId:'none',       tags:['pikachu','promo'],            era:'hyper'},
  {id:97, name:'Charizard ex',            set:'Paldean Fates',        year:2024, number:'234/091', rarity:'Special Illustration Rare',rawPrice:120,    psa10:480,     tcgId:'sv4pt5-234', tags:['sir','charizard','tera'],     era:'hyper'},
  {id:98, name:'Mew ex',                  set:'Paldean Fates',        year:2024, number:'232/091', rarity:'Special Illustration Rare',rawPrice:75,     psa10:1100,    tcgId:'sv4pt5-232', tags:['sir','legendary'],            era:'hyper'},
  {id:99, name:'Shiny Charizard ex',      set:'Paldean Fates',        year:2024, number:'SV/091',  rarity:'Shiny Rare',              rawPrice:35,     psa10:165,     tcgId:'none',       tags:['shiny','charizard'],          era:'hyper'},
  {id:100,name:'Shiny Ditto',             set:'Paldean Fates',        year:2024, number:'SV/091',  rarity:'Shiny Rare',              rawPrice:6,      psa10:32,      tcgId:'none',       tags:['shiny','affordable'],         era:'hyper'},
  {id:101,name:'Raging Bolt ex',          set:'Temporal Forces',      year:2024, number:'223/162', rarity:'Special Illustration Rare',rawPrice:70,     psa10:300,     tcgId:'sv5-223',    tags:['sir','paradox'],              era:'hyper'},
  {id:102,name:'Iron Leaves ex',          set:'Temporal Forces',      year:2024, number:'225/162', rarity:'Special Illustration Rare',rawPrice:38,     psa10:170,     tcgId:'sv5-225',    tags:['sir','paradox'],              era:'hyper'},
  {id:103,name:'Greninja ex',             set:'Twilight Masquerade',  year:2024, number:'226/167', rarity:'Special Illustration Rare',rawPrice:300,    psa10:800,     tcgId:'sv6-226',    tags:['sir','popular'],              era:'hyper'},
  {id:104,name:'Bloodmoon Ursaluna ex',   set:'Twilight Masquerade',  year:2024, number:'222/167', rarity:'Special Illustration Rare',rawPrice:60,     psa10:260,     tcgId:'sv6-222',    tags:['sir','trending'],             era:'hyper'},
  {id:105,name:'Perrin',                  set:'Twilight Masquerade',  year:2024, number:'230/167', rarity:'Special Illustration Rare',rawPrice:45,     psa10:200,     tcgId:'sv6-230',    tags:['sir','trainer'],              era:'hyper'},
  {id:106,name:'Eevee',                   set:'Twilight Masquerade',  year:2024, number:'IR',      rarity:'Illustration Rare',       rawPrice:18,     psa10:85,      tcgId:'none',       tags:['ir','eeveelution'],           era:'hyper'},
  {id:107,name:'Infernape ex',            set:'Twilight Masquerade',  year:2024, number:'SIR',     rarity:'Special Illustration Rare',rawPrice:40,     psa10:175,     tcgId:'none',       tags:['sir','starter'],              era:'hyper'},
  {id:108,name:'Growlithe',               set:'Twilight Masquerade',  year:2024, number:'IR',      rarity:'Illustration Rare',       rawPrice:15,     psa10:70,      tcgId:'none',       tags:['ir','popular'],               era:'hyper'},
  {id:109,name:'Terapagos ex',            set:'Stellar Crown',        year:2024, number:'175/142', rarity:'Special Illustration Rare',rawPrice:45,     psa10:220,     tcgId:'none',       tags:['sir','legendary'],            era:'hyper'},
  {id:110,name:'Arceus',                  set:'Shrouded Fable',       year:2024, number:'80/64',   rarity:'Illustration Rare',       rawPrice:24,     psa10:110,     tcgId:'none',       tags:['ir','legendary'],             era:'hyper'},
  {id:111,name:'Pikachu ex',              set:'Surging Sparks',       year:2024, number:'238/191', rarity:'Special Illustration Rare',rawPrice:200,    psa10:600,     tcgId:'none',       tags:['sir','pikachu'],              era:'hyper'},
  {id:112,name:'Hydreigon ex',            set:'Surging Sparks',       year:2024, number:'240/191', rarity:'Special Illustration Rare',rawPrice:140,    psa10:400,     tcgId:'none',       tags:['sir','dragon'],               era:'hyper'},
  {id:113,name:'Latias ex',               set:'Surging Sparks',       year:2024, number:'239/191', rarity:'Special Illustration Rare',rawPrice:140,    psa10:420,     tcgId:'none',       tags:['sir','legendary'],            era:'hyper'},
  {id:114,name:"Lisia's Appeal",          set:'Surging Sparks',       year:2024, number:'242/191', rarity:'Special Illustration Rare',rawPrice:55,     psa10:240,     tcgId:'none',       tags:['sir','trainer'],              era:'hyper'},
  {id:115,name:'Milotic',                 set:'Surging Sparks',       year:2024, number:'245/191', rarity:'Hyper Rare',              rawPrice:30,     psa10:140,     tcgId:'none',       tags:['gold','hyper-rare'],           era:'hyper'},
  {id:116,name:'Umbreon ex',              set:'Prismatic Evolutions', year:2025, number:'161/131', rarity:'Special Illustration Rare',rawPrice:882,    psa10:4652,    tcgId:'none',       tags:['sir','eeveelution','grail'],  era:'hyper'},
  {id:117,name:'Sylveon ex',              set:'Prismatic Evolutions', year:2025, number:'162/131', rarity:'Special Illustration Rare',rawPrice:300,    psa10:1100,    tcgId:'none',       tags:['sir','eeveelution'],          era:'hyper'},
  {id:118,name:'Leafeon ex',              set:'Prismatic Evolutions', year:2025, number:'155/131', rarity:'Special Illustration Rare',rawPrice:220,    psa10:800,     tcgId:'none',       tags:['sir','eeveelution'],          era:'hyper'},
  {id:119,name:'Glaceon ex',              set:'Prismatic Evolutions', year:2025, number:'157/131', rarity:'Special Illustration Rare',rawPrice:125,    psa10:480,     tcgId:'none',       tags:['sir','eeveelution'],          era:'hyper'},
  {id:120,name:'Espeon ex',               set:'Prismatic Evolutions', year:2025, number:'156/131', rarity:'Special Illustration Rare',rawPrice:135,    psa10:540,     tcgId:'none',       tags:['sir','eeveelution'],          era:'hyper'},
  {id:121,name:'Flareon ex',              set:'Prismatic Evolutions', year:2025, number:'153/131', rarity:'Special Illustration Rare',rawPrice:85,     psa10:360,     tcgId:'none',       tags:['sir','eeveelution'],          era:'hyper'},
  {id:122,name:'Jolteon ex',              set:'Prismatic Evolutions', year:2025, number:'154/131', rarity:'Special Illustration Rare',rawPrice:90,     psa10:380,     tcgId:'none',       tags:['sir','eeveelution'],          era:'hyper'},
  {id:123,name:'Vaporeon ex',             set:'Prismatic Evolutions', year:2025, number:'158/131', rarity:'Special Illustration Rare',rawPrice:80,     psa10:340,     tcgId:'none',       tags:['sir','eeveelution'],          era:'hyper'},
  {id:124,name:'Eevee',                   set:'Prismatic Evolutions', year:2025, number:'159/131', rarity:'Special Illustration Rare',rawPrice:65,     psa10:260,     tcgId:'none',       tags:['sir','eeveelution'],          era:'hyper'},
  {id:125,name:'Umbreon ex',              set:'Prismatic Evolutions', year:2025, number:'060/131', rarity:'Double Rare',             rawPrice:15,     psa10:60,      tcgId:'none',       tags:['eeveelution','affordable'],   era:'hyper'},
  {id:126,name:'Pikachu ex',              set:'Journey Together',     year:2025, number:'SIR',     rarity:'Special Illustration Rare',rawPrice:115,    psa10:450,     tcgId:'none',       tags:['sir','pikachu'],              era:'hyper'},
  {id:127,name:'Mewtwo ex',               set:'Journey Together',     year:2025, number:'SIR',     rarity:'Special Illustration Rare',rawPrice:80,     psa10:320,     tcgId:'none',       tags:['sir','legendary'],            era:'hyper'},
  {id:128,name:"N's Zoroark ex",          set:'Destined Rivals',      year:2025, number:'SIR',     rarity:'Special Illustration Rare',rawPrice:130,    psa10:500,     tcgId:'none',       tags:['sir','trending'],             era:'hyper'},
  {id:129,name:'Reshiram ex',             set:'Destined Rivals',      year:2025, number:'SIR',     rarity:'Special Illustration Rare',rawPrice:100,    psa10:380,     tcgId:'none',       tags:['sir','legendary'],            era:'hyper'},
  {id:130,name:'Zekrom ex',               set:'Destined Rivals',      year:2025, number:'SIR',     rarity:'Special Illustration Rare',rawPrice:95,     psa10:370,     tcgId:'none',       tags:['sir','legendary'],            era:'hyper'},
  {id:131,name:'Mega Lucario ex',         set:'Mega Evolution',       year:2025, number:'188/132', rarity:'Mega Hyper Rare',         rawPrice:277,    psa10:900,     tcgId:'none',       tags:['mega-hyper-rare','popular'],  era:'hyper'},
  {id:132,name:'Mega Gardevoir ex',       set:'Mega Evolution',       year:2025, number:'187/132', rarity:'Mega Hyper Rare',         rawPrice:221,    psa10:720,     tcgId:'none',       tags:['mega-hyper-rare','popular'],  era:'hyper'},
  {id:133,name:'Mega Gardevoir ex',       set:'Mega Evolution',       year:2025, number:'178/132', rarity:'Special Illustration Rare',rawPrice:171,    psa10:550,     tcgId:'none',       tags:['sir','mega','popular'],       era:'hyper'},
  {id:134,name:'Zekrom ex',               set:'Black Bolt',           year:2025, number:'171/86',  rarity:'Black & White Rare',      rawPrice:60,     psa10:260,     tcgId:'none',       tags:['bwr','legendary','unova'],    era:'hyper'},
  {id:135,name:'Mega Lucario ex',         set:'Mega Evolution',       year:2025, number:'179/132', rarity:'Special Illustration Rare',rawPrice:155,    psa10:500,     tcgId:'none',       tags:['sir','mega','popular'],       era:'hyper'},
  {id:136,name:'Shiny Snorlax',           set:'Paldean Fates',        year:2024, number:'SV/091',  rarity:'Shiny Rare',              rawPrice:5,      psa10:25,      tcgId:'none',       tags:['shiny','affordable'],         era:'hyper'},
  {id:137,name:'Pikachu VMAX',            set:'Vivid Voltage',        year:2020, number:'44/185',  rarity:'VMAX',                    rawPrice:18,     psa10:90,      tcgId:'swsh4-44',   tags:['pikachu','vmax'],             era:'modern'},
  {id:138,name:'Magikarp',                set:'Paldea Evolved',       year:2023, number:'203/193', rarity:'Illustration Rare',       rawPrice:15,     psa10:3260,    tcgId:'sv2-203',    tags:['ir','meme'],                  era:'hyper'},
  {id:139,name:'Alolan Exeggutor ex',     set:'Surging Sparks',       year:2024, number:'236/191', rarity:'Special Illustration Rare',rawPrice:24,     psa10:110,     tcgId:'none',       tags:['sir','meme'],                 era:'hyper'},
  {id:140,name:"Team Rocket's Mewtwo ex", set:'Destined Rivals',      year:2025, number:'SIR',     rarity:'Special Illustration Rare',rawPrice:376,    psa10:1200,    tcgId:'none',       tags:['sir','legendary','trending'], era:'hyper'},
];

// Seed cards into DB
const upsertCard = db.prepare(`INSERT OR REPLACE INTO cards (id,name,set_name,year,number,rarity,raw_price,psa10_price,tcg_id,tags,era) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
const seedCards = db.transaction(() => {
  for (const c of CARDS) {
    upsertCard.run(c.id, c.name, c.set, c.year, c.number, c.rarity, c.rawPrice, c.psa10, c.tcgId, JSON.stringify(c.tags), c.era);
  }
});
seedCards();
console.log(`[DB] Seeded ${CARDS.length} cards`);

// ═══════════════════════════════════════════════════════════════════════════
// EBAY PRICE SERVICE
// ═══════════════════════════════════════════════════════════════════════════
const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;
let ebayToken = null;
let ebayTokenExpiry = 0;

async function getEbayToken() {
  if (ebayToken && Date.now() < ebayTokenExpiry - 300000) return ebayToken;
  if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) return null;
  try {
    const creds = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64');
    const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    });
    if (!res.ok) { console.error('[eBay] Token failed:', res.status); return null; }
    const json = await res.json();
    ebayToken = json.access_token;
    ebayTokenExpiry = Date.now() + (json.expires_in * 1000);
    console.log(`[eBay] Token obtained, expires in ${json.expires_in}s`);
    return ebayToken;
  } catch (e) { console.error('[eBay] Token error:', e.message); return null; }
}

async function fetchEbayPrice(cardName, setName, cardNumber) {
  const token = await getEbayToken();
  if (!token) return null;
  const query = [cardName, setName, cardNumber].filter(Boolean).join(' ');
  const excludes = ['PSA', 'BGS', 'CGC', 'graded', 'slab'];
  try {
    const params = new URLSearchParams({
      q: query, category_ids: '183454',
      filter: 'buyingOptions:{FIXED_PRICE},conditionIds:{3000},itemLocationCountry:US',
      sort: 'price', limit: '50',
    });
    const res = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US' },
    });
    if (!res.ok) { console.error(`[eBay] Search failed "${query}": ${res.status}`); return null; }
    const json = await res.json();
    const items = (json.itemSummaries || []).filter(i => {
      const t = (i.title || '').toUpperCase();
      return !excludes.some(x => t.includes(x));
    });
    const prices = items.map(i => parseFloat(i.price?.value)).filter(p => !isNaN(p) && p > 0).sort((a, b) => a - b);
    if (!prices.length) return null;
    const median = prices[Math.floor(prices.length / 2)];
    return { median: Math.round(median * 100) / 100, avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length * 100) / 100, low: prices[0], high: prices[prices.length - 1], count: prices.length };
  } catch (e) { console.error(`[eBay] Error "${query}":`, e.message); return null; }
}

// Cache layer
const CACHE_TTL = (parseInt(process.env.EBAY_CACHE_TTL_MINUTES) || 60) * 60 * 1000;

async function getCachedPrice(card) {
  const key = `${card.name}|${card.set}|${card.number}`.toLowerCase();
  const cached = db.prepare('SELECT * FROM ebay_price_cache WHERE card_key = ?').get(key);
  if (cached && (Date.now() - new Date(cached.last_updated).getTime()) < CACHE_TTL) {
    return { median: cached.median_price, avg: cached.avg_price, low: cached.low_price, high: cached.high_price, count: cached.result_count, lastUpdated: cached.last_updated, source: 'cache' };
  }
  const fresh = await fetchEbayPrice(card.name, card.set, card.number);
  if (fresh) {
    const now = new Date().toISOString();
    db.prepare('INSERT OR REPLACE INTO ebay_price_cache (card_key,card_id,card_name,set_name,card_number,median_price,avg_price,low_price,high_price,result_count,last_updated) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(key, card.id, card.name, card.set, card.number, fresh.median, fresh.avg, fresh.low, fresh.high, fresh.count, now);
    return { ...fresh, lastUpdated: now, source: 'ebay' };
  }
  return cached ? { median: cached.median_price, avg: cached.avg_price, low: cached.low_price, high: cached.high_price, count: cached.result_count, lastUpdated: cached.last_updated, source: 'stale-cache' } : null;
}

async function refreshAllPrices(forceAll = false) {
  // Figure out which cards still need pricing
  let toRefresh;
  if (forceAll) {
    toRefresh = CARDS;
  } else {
    // Only fetch cards that are NOT already cached
    toRefresh = CARDS.filter(c => {
      const key = `${c.name}|${c.set}|${c.number}`.toLowerCase();
      const cached = db.prepare('SELECT last_updated FROM ebay_price_cache WHERE card_key = ?').get(key);
      return !cached;
    });
  }

  console.log(`[eBay] Refreshing ${toRefresh.length} uncached cards (${CARDS.length - toRefresh.length} already cached)...`);
  if (toRefresh.length === 0) { console.log('[eBay] All cards already cached!'); return { ok: 0, fail: 0, skipped: CARDS.length }; }

  let ok = 0, fail = 0;
  const BATCH_SIZE = 15;

  for (let i = 0; i < toRefresh.length; i++) {
    const c = toRefresh[i];
    try {
      const fresh = await fetchEbayPrice(c.name, c.set, c.number);
      if (fresh) {
        const key = `${c.name}|${c.set}|${c.number}`.toLowerCase();
        const now = new Date().toISOString();
        db.prepare('INSERT OR REPLACE INTO ebay_price_cache (card_key,card_id,card_name,set_name,card_number,median_price,avg_price,low_price,high_price,result_count,last_updated) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(key, c.id, c.name, c.set, c.number, fresh.median, fresh.avg, fresh.low, fresh.high, fresh.count, now);
        ok++;
        console.log(`[eBay] ${ok + fail}/${toRefresh.length} ✓ ${c.name} (${c.set}) = $${fresh.median}`);
      } else {
        fail++;
        console.log(`[eBay] ${ok + fail}/${toRefresh.length} ✗ ${c.name} (${c.set}) — no results`);
      }
    } catch (e) {
      fail++;
      console.log(`[eBay] ${ok + fail}/${toRefresh.length} ✗ ${c.name} — error: ${e.message}`);
    }

    // Wait 5 seconds between each request
    await new Promise(r => setTimeout(r, 5000));

    // After every batch, pause 90 seconds to let rate limit reset
    if ((i + 1) % BATCH_SIZE === 0 && i + 1 < toRefresh.length) {
      console.log(`[eBay] Batch pause — ${ok + fail}/${toRefresh.length} done, waiting 90s...`);
      await new Promise(r => setTimeout(r, 90000));
    }
  }

  console.log(`[eBay] Done: ${ok} ok, ${fail} failed, ${CARDS.length - toRefresh.length} were already cached`);
  return { ok, fail, skipped: CARDS.length - toRefresh.length };
}

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', cards: CARDS.length, ebay: !!(EBAY_CLIENT_ID && EBAY_CLIENT_SECRET), uptime: process.uptime() }));

// All cards
app.get('/api/cards', (req, res) => {
  const mode = req.query.mode || 'raw';
  const era = req.query.era;
  let cards = CARDS;
  if (era) cards = cards.filter(c => c.era === era);
  res.json(cards.map(c => ({
    id: c.id, name: c.name, set: c.set, year: c.year, number: c.number,
    rarity: c.rarity, era: c.era, tags: c.tags,
    price: mode === 'psa10' ? c.psa10 : c.rawPrice,
    rawPrice: c.rawPrice, psa10Price: c.psa10,
  })));
});

// Single card
app.get('/api/cards/:id', (req, res) => {
  const card = CARDS.find(c => c.id === parseInt(req.params.id));
  if (!card) return res.status(404).json({ error: 'Card not found' });
  res.json(card);
});

// Search
app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  if (!q) return res.json([]);
  const results = CARDS.filter(c => {
    const full = `${c.name} ${c.set} ${c.rarity} ${c.number} ${c.year} ${c.tags.join(' ')}`.toLowerCase();
    return full.includes(q);
  });
  res.json(results);
});

// Trending
app.get('/api/trending', (req, res) => {
  const era = req.query.era;
  let cards = CARDS;
  if (era) cards = cards.filter(c => c.era === era);
  cards = cards.filter(c => c.rawPrice > 10).sort((a, b) => b.rawPrice - a.rawPrice).slice(0, 50);
  res.json(cards);
});

// ── eBay Price Routes ──────────────────────────────────────────────────
app.get('/api/price/:cardId', async (req, res) => {
  const card = CARDS.find(c => c.id === parseInt(req.params.cardId));
  if (!card) return res.status(404).json({ error: 'Card not found' });
  try {
    const price = await getCachedPrice(card);
    res.json({
      cardId: card.id, name: card.name, set: card.set, number: card.number,
      staticPrice: card.rawPrice, psa10Price: card.psa10,
      ebay: price || null,
      currentPrice: price ? price.median : card.rawPrice,
    });
  } catch (e) {
    res.json({ cardId: card.id, name: card.name, staticPrice: card.rawPrice, ebay: null, currentPrice: card.rawPrice, error: e.message });
  }
});

app.get('/api/prices', (req, res) => {
  const rows = db.prepare('SELECT * FROM ebay_price_cache').all();
  const cache = {};
  rows.forEach(r => { cache[r.card_id] = r; });
  const result = CARDS.map(c => ({
    id: c.id, name: c.name, set: c.set, number: c.number,
    staticPrice: c.rawPrice, psa10Price: c.psa10, era: c.era,
    ebayMedian: cache[c.id]?.median_price || null,
    ebayLastUpdated: cache[c.id]?.last_updated || null,
    currentPrice: cache[c.id]?.median_price || c.rawPrice,
  }));
  res.json({ cards: result, count: result.length, cachedCount: rows.length });
});

app.post('/api/prices/refresh', async (req, res) => {
  const key = req.headers['x-refresh-key'] || req.query.key;
  if (process.env.REFRESH_KEY && key !== process.env.REFRESH_KEY) return res.status(401).json({ error: 'Unauthorized' });
  const force = req.query.force === 'true';
  const uncached = CARDS.filter(c => {
    const k = `${c.name}|${c.set}|${c.number}`.toLowerCase();
    return !db.prepare('SELECT 1 FROM ebay_price_cache WHERE card_key = ?').get(k);
  }).length;
  res.json({ message: `Refreshing ${force ? CARDS.length : uncached} cards in background (${force ? 'forced' : uncached + ' uncached'})`, status: 'started', totalCards: CARDS.length, alreadyCached: CARDS.length - uncached });
  refreshAllPrices(force).catch(e => console.error('[Refresh]', e));
});

app.get('/api/ebay/status', (req, res) => {
  const stats = db.prepare('SELECT COUNT(*) as total, MIN(last_updated) as oldest, MAX(last_updated) as newest FROM ebay_price_cache').get();
  res.json({
    ebayEnabled: !!(EBAY_CLIENT_ID && EBAY_CLIENT_SECRET),
    clientId: EBAY_CLIENT_ID ? EBAY_CLIENT_ID.slice(0, 25) + '...' : null,
    cache: { total: stats.total, oldest: stats.oldest, newest: stats.newest },
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`[Server] Card Scout backend running on port ${PORT}`);
  console.log(`[Server] ${CARDS.length} cards loaded`);
  console.log(`[Server] eBay: ${EBAY_CLIENT_ID ? 'credentials found' : 'no credentials — set EBAY_CLIENT_ID + EBAY_CLIENT_SECRET'}`);

  // Auto-refresh eBay prices every 60 min if credentials are set
  if (EBAY_CLIENT_ID && EBAY_CLIENT_SECRET) {
    setTimeout(() => refreshAllPrices(), 30000);
    setInterval(() => refreshAllPrices(), 60 * 60 * 1000);
  }
});

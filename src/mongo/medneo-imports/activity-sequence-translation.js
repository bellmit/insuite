/**
 * User: pi
 * Date: 19/10/16  14:46
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*global db:true, ObjectId */
var
    translations = {
        1: { en: "Beratung", de: "Consultation" },
        3: {
            en: "Eingehende, das gewöhnliche Maß übersteigende Beratung",
            de: "Consultation, exceeding the ordinary level"
        },
        5: { en: "Symptombezogene Untersuchung", de: "Symptom-related examination" },
        60: { en: "konsiliarische Erörterung", de: "Consiliary discussion" },
        75: {
            en: "Ausführlicher schriftlicher Krankheits- und Befundbericht",
            de: "Detailed written report of medical findings"
        },
        80: { en: "Schriftliche gutachtliche Äußerung", de: "Written expert opinion" },
        85: { en: "Aufwendige schriftliche gutachtliche Äußerung", de: "Detailed written expert opinion" },
        253: { en: "Injektion, intravenös", de: "Injection, intravenous" },
        256: { en: "Injektion Periduralraum", de: "Epidural injection" },
        255: { en: "Injektion intraartikulär oder perineural", de: "Intraarticular injection or perineural" },
        344: {
            en: "intravenöse Einbringung des Kontrastmittels mittels Injektion oder Infusion",
            de: "Intravenous introduction of the contrast agent by injection or infusion"
        },
        346: {
            en: "intravenöse Einbringung des Kontrastmittels mittels Hochdruckinjektion",
            de: "Intravenous introduction of the contrast agent with high-pressure injection"
        },
        347: {
            en: "Ergänzung für jede weiter intravenöse Einbringung mittels Hochdruckinjektion ",
            de: "Addition to any further intravenous insertion using high-pressure injection"
        },
        446: {
            en: "Zuschlag für ambulante Anästhesie mit 200 bis 399 Punkten",
            de: "Supplement for outpatient anesthesia with 200 to 399 points"
        },
        447: {
            en: "Zuschlag für ambulante Anästhesie mit 400 und mehr Punkten",
            de: "Supplement for outpatient anesthesia with 400 points or more"
        },
        470: { en: "Lumbalanästhesie bis zu 1h Dauer", de: "Spinal anesthesia up to 1 hour duration" },
        471: { en: "Lumbalanästhesie bis zu 2h Dauer", de: "Spinal anesthesia up to 2 hour duration" },
        476: {
            en: "Armplexus-/Paravertebralanästhesie bis zu 1h",
            de: "Armplexus-/paravertebral anesthesia up to 1h duration"
        },
        490: {
            en: "Infiltrationsanästhesie kleiner Bezirk (lokale Hautanästhesie)",
            de: "Infiltration anesthesia smaller district (local skin anesthetic)"
        },
        491: {
            en: "Infiltrationsanästhesie großer Bezirk (lokale Hautanästhesie)",
            de: "Infiltration anesthesia bigger district (local skin anesthetic)"
        },
        602: { en: "Oxymetrische Untersuchung(en) (Bestimmung der prozentualen Sauerstoffsättigung im Blut) - gegebenenfalls einschließlich Bestimmung(en) nach Belastung," },
        //     0: { en:"Zuschlag zwischen 20 und 22 Uhr oder 6 und 8 Uhr", de:"Supplement between 20:00-22:00 PM or 6:00 and 8:00 AM"},
        // 0: { en:"Zuschlag zwischen 22 und 6 Uhr", de:"Supplement between 22:00 PM and 6:00 AM"},
        // 0: { en:"Zuschlag Samstag, Sonn- und Feiertag", de:"Supplemnet for Saturday, Sunday and public holiday"},
        0: { en: "Zuschlag bei Kindern bis zum 4ten Lebensjahr", de: "Supplement for children up to 4th birthday" },
        5700: {
            en: "MRT im Bereich des Kopfes gegebenenfalls einschließlich des Halses",
            de: "MRI of the head, where appropriate, including the neck"
        },
        5705: { en: "MRT im Bereich der Wirbelsäule", de: "MRI of the spine" },
        5715: {
            en: "MRT im Bereich des Thorax gegebenenfalls einschließlich des Halses",
            de: "MRI in the thoracic region, where appropriate, including the neck"
        },
        5720: { en: "MRT im Bereich des Abdomen und/oder des Beckens", de: "MRI of the abdomen and / or the pelvis" },
        5721: { en: "MRT der Mamma", de: "MRI of the mamma" },
        5729: {
            en: "MRT eines oder mehrere Gelenke oder Abschnitte von Extremitäten",
            de: "MRI of one or more joints or sections of limbs"
        },
        5730: {
            en: "MRT einer oder mehrerer Extremitäten mit Darstellung von mindestens zwei großen Gelenken einer Extremität",
            de: "MRI of one or more limbs with representation from at least two major joints of an extremity"
        },
        5731: { en: "Ergänzende Serie(n) ", de: "Supplementary series" },
        5732: { en: "Positionswechsel und/oder Spulenwechsel", de: "Position change and / or coil change" },
        5733: { en: "Computergesteuerte Analyse ", de: "Computer based analysis" },
        5735: {
            en: "Höchstwert für Leistungen nach den Nummern 5700 bis 5730",
            de: "Maximum value for services of the numbers 5700 to 5730"
        }
        // 0: { en:"Kontrastmittel Dotarem 15ml", de:"Contrast medium Dotarem 15ml"},
        // 0: { en:"Kontrastmittel Dotarem 30ml", de:"Contrast medium Dotarem 30ml"},
        // 0: { en:"Kontrastmittel Dotarem 60ml", de:"Contrast medium Dotarem 60ml"},
        // 0: { en:"Kontrastmittel Gadovist 7,5ml", de:"Contrast medium Gadovist 7,5ml"},
        // 0: { en:"Kontrastmittel Gadovist 15ml", de:"Contrast medium Gadovist 15ml"},
        // 0: { en:"Stress Medikament Adenosin 10ml,"},
        //     0: { en:"Kit für injektor", de:"Kit for Injector"},
        //     0: { en:"Kit für Perfusor", de:"Kit für Perfusor"},
        // 0: { en:"Versandkosten / CD-Erstellung", de:"Shipping / CD creation"},
        // 0: { en:"Begleitung durch Narkoseteam", de:"Attendance"},
        // 0: { en:"Neurologisch fachärztlicher Check-up ,"},
        //     0: { en:"Neurologisch fachärztlicher Check-up + EGG,"},
        //     0: { en:"Begleitung durch Narkoseteam,Attendance"},
    },
    deMark = '_DE_',
    engMark = '_EN_',
    dbs, as;
db = db.getSiblingDB( "admin" );
dbs = db.runCommand( {"listDatabases": 1} ).databases;

function copyAS( rec ){
    rec._id = new ObjectId();
    rec.title = rec.title.replace(deMark, engMark);
    rec.activities.forEach( function(activity){
        var
            translation = translations[activity.code];
        if(translation){
            activity.userContent = translation.en;
        }
    });
    db.activitysequences.insert(rec);
}

dbs.forEach( function( database ) {
    if(/^([\da-f]){8,15}$|^0$/.exec(database.name)) {
        print( database.name + ' entering.' );
        db = db.getSiblingDB( database.name );
        as = db.activitysequences.find({title:{$regex: deMark}});
        while( as.hasNext() ) {
            copyAS(as.next());
        }
        print( 'count ' + as.count());

    } else {
        print( database.name + ' not processing.');
    }
} );
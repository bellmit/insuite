/**
 * User: do
 * Date: 10.09.18  18:57
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db, printjson, printjsononeline */

/**
 * @description
 * Simple script to create a list with active states of all generated rules in old and new style of descriptions.
 * Rules can be identified by catalogShort, code and rule type to keep active state after regeneration.
 *
 * Switch between old and new style parsing of rule description by adjusting test const.
 *
 * New Schema                                                         |    Old Schema:
 * Altersbedingung 01740 (EBM)                                        |    Altersbedingung für die Leistung 01730 (EBM)
 * Ausschlussliste für 01741 (EBM)                                    |    Ausschlussliste für die GNR 04003 (EBM)
 * Anzahlbedingungsliste 01740M (EBM)                                 |    Anzahlbedingungsliste für die GNR 04003M (EBM)
 * Berichtspflicht für 01740 (EBM)                                    |    Berichtspflicht für die Leistung 11396X (EBM)
 * Erforderliche Grundleistungen für Zuschlagsleistung 01740M (EBM)   |    Erforderliche Grundleistungen für Zuschlagsleistung 40510 (EBM)
 * Geschlechtsbezug 01740 (EBM)                                       |    Geschlechtsbezug für die Leistung 31695 (EBM)
 * * There is maybe more content after catalog short that is not to consider here.
 */


const oldSchemaTests = [
    {type: 'alter', regex: /^Altersbedingung für die Leistung\s(\S+)\s/},
    {type: 'ausschluss', regex: /^Ausschlussliste für die GNR\s(\S+)\s/},
    {type: 'anzahl', regex: /^Anzahlbedingungsliste für die GNR\s(\S+)\s/},
    {type: 'bericht', regex: /^Berichtspflicht für die Leistung\s(\S+)\s/},
    {type: 'grund', regex: /^Erforderliche Grundleistungen für Zuschlagsleistung\s(\S+)\s/},
    {type: 'geschlecht', regex: /^Geschlechtsbezug für die Leistung\s(\S+)\s/}
];

const newSchemaTests = [
    {type: 'alter', regex: /^Altersbedingung\s(\S+)\s/},
    {type: 'ausschluss', regex: /^Ausschlussliste für\s(\S+)\s/},
    {type: 'anzahl', regex: /^Anzahlbedingungsliste\s(\S+)\s/},
    {type: 'bericht', regex: /^Berichtspflicht\s(\S+)\s/},
    {type: 'grund', regex: /^Erforderliche Grundleistungen für Zuschlagsleistung\s(\S+)\s/},
    {type: 'geschlecht', regex: /^Geschlechtsbezug\s(\S+)\s/}
];

const tests = newSchemaTests;

db.rules.find( {isDirectory: {$ne: true}, fromCatalog: {$ne: null}} ).forEach( ruleSet => {
    ruleSet.rules.forEach( rule => {
        const anyMatch = tests.some( test => {
            const result = test.regex.exec( rule.description );
            if( result && result[1] ) {
                printjsononeline( {
                    type: test.type,
                    code: result[1],
                    catalogShort: ruleSet.fromCatalogShort,
                    isActive: !ruleSet.isActive ? ruleSet.isActive : rule.isActive
                } );
                return true;
            }
        } );
        if( !anyMatch ) {
            printjson( rule );
            throw Error( 'could not match any rule of ruleset' );
        }
    } );
} );

// Test if amount of all rules matches lines from output above.
// mongo adds 3 log lines about connecting to dababase, if not started with --quite, so subtract 3 from num of lines produced by the script above.
let nRules = 0;
db.rules.find( {isDirectory: {$ne: true}, fromCatalog: {$ne: null}} ).forEach( ruleSet => {
    nRules += ruleSet.rules.length;
} );
print( `actual rules (not ruleSet) count: ${nRules}` );


/**
 * User: dcdev
 * Date: 11/18/19  2:32 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'sumex-ruleset', function( Y, NAME ) {
    const rules = {
        "_version": 1.0,
        "_name": "Sumex",
        "_meta": "Some more machine readable metadata.",
        "_country": "CH",
        "errors": [
        //================================================= LOCATION ==============================================
            {code: 'IDS_INVALID_IBAN', message: "Die IBAN '.*?' hat kein gültiges Format!", entry: 'location', path: "bankIBAN"},
            {code: 'ERR_BANK_UNKNOWN', message: "Die Bank-Adresse im EsrQR/EsQR ist zwingend notwendig", entry: 'location', path: "esrNumber"},
            {code: 'IDS_INVALID_PARTICIPANTNUMBER', message: "Die ESR Teilnehmernummer '.*?' hat kein gültiges Format!", entry: 'location', path: "esrNumber"},
            {code: 'IDS_ESR_FAILED', message: "ESR Kodierzeile konnte nicht erzeugt werden!", entry: 'location', path: "esrNumber"},
            {code: 'IDS_ESRRED_MISMATCH', message: "Der ESR-Type 'enRedPayinSlip' muss nur mit der Methode '.*?' gesetzt werden!", entry: 'location', path: "esrNumber"},
            {code: 'IDS_INVALID_PLACE', message: "Der Ort (ePlaceType) '.*?' ist nicht gültig!"},
            {code: 'IDS_INVALID_IBAN_CHAR', message: "Die IBAN-Nummer [.*?] enthält Buchstaben und dadurch kann das Bankkonto nicht bestimmt werden! Deswegen muss in der IBAN Variable neben der IBAN-Nummer das Bankkonto in der Codierzeilenform im Format IBAN#Account angehängt werden.", entry: 'location', path: "bankIBAN"},
            {code: 'IDS_INVALID_POSTACCOUNT', message: "Das Postkonto '.*?' hat kein gültiges Format!", entry: 'location'},
            {code: 'IDS_INVALID_REFERENCENUMBER', message: "Die ESR Referenznummer '.*?' hat kein gültiges Format!", entry: 'location', path: "bankIBAN"},

         //===========;====================================== ACTIVITY ==============================================

            {code: 'ERR_VALIDATE_TP', message: "Der Taxpunkt für Leistung '.*?' muss '.*?' statt '.*?' sein!", entry: 'activity'},
            {code: 'ERR_VALIDATE_TPFACTOR', message: "Der Taxpunkt für Leistung '.*?' muss '.*?' statt '.*?' sein!", entry: 'activity'},
            {code: 'ERR_VALIDATE_AMOUNT', message: "Der Betrag für Leistung '.*?' muss '.*?' statt '.*?' sein!", entry: 'activity'},
            {code: 'ERR_INVALID_TPFACTOR', message: "Der gesetzte Taxpunkt-Wert '.*?' ist ungültig!", entry: 'activity'},
            {code: 'IDS_EXTERNALFACTOR_NEGATIV', message: "Ein negativer externer Skalierungsfaktor ist nicht erlaubt.", entry: 'activity'},
            {code: 'IDS_INVALID_RECORD', message: ".*?: Die Leistung mit ID='.*?' konnte nicht gefunden werden!", entry: 'activity'},
            {code: 'IDS_INVALID_RECORD', message: "Leistung '.*?' konnte nicht gefunden werden!", entry: 'activity', field: 'code'},
            {code: 'IDS_DEFINED_RECORD', message: ".*?: Die Zusatzdaten für die Leistungs mit ID='.*?' sind bereits definiert!", entry: 'activity'},
            {code: 'IDS_ERROR_SPLITTING', message: ".*?: Das Produkt der individuellen Split-Faktoren entspricht nicht dem gesetzten External_factor: '.*?'", entry: 'activity'},
            {code: 'ERR_SERVICE_CODEUNKNOWN', message: "Der Code .*? der eingegebenen Leistung ist undefiniert/ungültig.", entry: 'activity'},
            {code: 'ERR_SERVICE_DATEUNKNOWN', message: "Das Datum .*? der eingegebenen Leistung ist undefiniert/ungültig", entry: 'activity'},
            {code: 'ERR_SERVICE_NOSAVE', message: "Die eingegebene Leistung kann nicht gespeichert werden - fataler Fehler!", entry: 'activity'},
            {code: 'IDS_VALIDATOR_NOTINSTALLED', message: "Der .*?Validator ist nicht installiert, die Leistung kann nicht geprüft werden!", entry: 'activity'},
            {code: 'ERR_BFSRECORD_UNDEFINED', message: "Der BfS Record mit dem Index '.*?' existiert nicht/ist ausserhalb des definierten Bereichs.", entry: 'activity'},
            {code: 'ERR_SERVICEEX_TARIFFILLEGAL', message: "Der Tarif '.*?' wird als ServiceEx nicht unterstützt!", entry: 'activity'},
            {code: 'ERR_SERVICEEX_NOINTERFACE', message: "Das Hilfsdaten-Interface IServiceExInput ist für Tarif '.*?' undefiniert!", entry: 'activity'},
            {code: 'ERR_SERVICEEX_NOCREATE', message: "Ein Hilfsdaten-Interface IServiceExInput für Tarif '.*?' kann nicht generiert werden.", entry: 'activity'},
            {code: 'ERR_DRG_SERVICESRESTRICTION', message: "Die Anzahl Leistungen bei Verwendung von DRG Tarif '.*?' muss 1 sein!", entry: 'activity'},
            {code: 'ERR_SCHEIN_TREATMENTTYPE', message: "Der Technische Anteil (TL) der Leistung '.*?' darf nur im Spital abgerechnet werden! Dies gilt für OP II und OP III Leistungen.", entry: 'activity'},
        // ================================================= EMPLOYEE ==============================================
            {code: 'IDS_INVALID_ROLE', message: "Die Rolle (eRoleType) '.*?' ist nicht gültig!", entry: 'employee'},
            {code: 'UNKNOWN', message: "Leistung '.*?' benötigt qualitative Dignität '.*?'!", entry: 'employee', path: 'qualiDignities'},

            {code: 'IDS_INVALID_ZSRNUMBER', message: ".*?: Die ZSR-Nummer '.*?' hat kein gültiges ZSR-Format!", entry: 'common'},
            {code: 'IDS_INCOMPLETE_ADDRESS', message: ".*?: Die Adressangaben sind nicht vollständig!", entry: 'common'},
            {code: 'IDS_INVALID_EANPARTY', message: ".*?: Die EAN Nummer '.*?' hat kein gültiges EAN-Format!", entry: 'common'},
            {code: 'IDS_UNKNOWN_EANPARTY', message: ".*?: Unbekannter Kommunikationsteilnehmer '.*?'", entry: 'common'},
            {code: 'IDS_INVALID_NIFNUMBER', message: ".*?: Die NIF-Nummer '.*?' hat kein gültiges NIF-Format!", entry: 'common'}
        ]
    };
    NAME = Y.doccirrus.schemaloader.deriveRuleSetName( NAME );

    function getFieldsByMessage( errorMessage ) {
        const result = rules.errors.find(function(err){
            const match =  errorMessage.match(err.message);
            if(match && match.length) {
                return errorMessage.includes(match[0]);
            }
            return false;
        });
        if(!result) {
            return null;
        }
        result.values = errorMessage.match(/'.*?'/g);
        return result;
    }

    Y.namespace( 'doccirrus.ruleset' )[NAME] = {
        definition: rules,
        getFieldsByMessage: getFieldsByMessage
    };
});
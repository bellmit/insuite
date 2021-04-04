/**
 * User: florian
 * Date: 17.03.21  11:48
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global Y, it, describe, expect, before, after, context */

const
    util = require( 'util' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    user = Y.doccirrus.auth.getSUForLocal();

describe( 'egk-parser', function() {
    context( 'given eGK card read with countryCode and address. #KAP-94', function() {
        describe( '#parseRawCardData()', function() {
            context( 'when parse data from card read to patient info with address', function() {
                before( async function() {
                    this.germanCountryCode = {
                        insurance: {
                            common: '<?xml version="1.0" encoding="ISO-8859-15" standalone="yes"?><UC_AllgemeineVersicherungsdatenXML CDM_VERSION="5.2.0" xmlns="http://ws.gematik.de/fa/vsdm/vsd/v5.2"><Versicherter><Versicherungsschutz><Beginn>20170309</Beginn><Kostentraeger><Kostentraegerkennung>100980006</Kostentraegerkennung><Kostentraegerlaendercode>D</Kostentraegerlaendercode><Name>Barmer GEK</Name></Kostentraeger></Versicherungsschutz><Zusatzinfos><ZusatzinfosGKV><Versichertenart>1</Versichertenart><Zusatzinfos_Abrechnung_GKV><WOP>88</WOP></Zusatzinfos_Abrechnung_GKV></ZusatzinfosGKV></Zusatzinfos></Versicherter></UC_AllgemeineVersicherungsdatenXML>',
                            protected: '<?xml version="1.0" encoding="ISO-8859-15" standalone="yes"?><UC_GeschuetzteVersichertendatenXML CDM_VERSION="5.2.0" xmlns="http://ws.gematik.de/fa/vsdm/vsd/v5.2"><Zuzahlungsstatus><Status>0</Status></Zuzahlungsstatus><Selektivvertraege><Aerztlich>0</Aerztlich><Zahnaerztlich>0</Zahnaerztlich></Selektivvertraege></UC_GeschuetzteVersichertendatenXML>'
                        },
                        patient: '<?xml version="1.0" encoding="ISO-8859-15" standalone="yes"?><UC_PersoenlicheVersichertendatenXML CDM_VERSION="5.2.0" xmlns="http://ws.gematik.de/fa/vsdm/vsd/v5.2"><Versicherter><Versicherten_ID>X110456757</Versicherten_ID><Person><Geburtsdatum>19870810</Geburtsdatum><Vorname>Martin</Vorname><Nachname>Niño Gômez</Nachname><Geschlecht>M</Geschlecht><StrassenAdresse><Postleitzahl>38889</Postleitzahl><Ort>Blankenburg</Ort><Land><Wohnsitzlaendercode>D</Wohnsitzlaendercode></Land><Strasse>Lerchenbreite</Strasse><Hausnummer>5 a</Hausnummer></StrassenAdresse></Person></Versicherter></UC_PersoenlicheVersichertendatenXML>',
                        validation: '<?xml version="1.0" encoding="ISO-8859-15" standalone="yes"?>\n' +
                                    '<PN CDM_VERSION="1.0.0" xmlns="http://ws.gematik.de/fa/vsdm/pnw/v1.0">\n' +
                                    '    <TS>20210316170717</TS>\n' +
                                    '    <E>2</E>\n' +
                                    '    <PZ>EIAnaIMAMAAAmZkgFgYgFSMxEAAAAAB6W1auwkgG7Zi8FBRC1qpZFAhi0Wj2f1G4xGqArPx5Cg==</PZ>\n' +
                                    '</PN>\n'
                    };

                    this.swissCountryCode = {
                        insurance: {
                            common: '<?xml version="1.0" encoding="ISO-8859-15" standalone="yes"?>\n' +
                                    '<UC_AllgemeineVersicherungsdatenXML CDM_VERSION="5.2.0" xmlns="http://ws.gematik.de/fa/vsdm/vsd/v5.2">\n' +
                                    '    <Versicherter>\n' +
                                    '        <Versicherungsschutz>\n' +
                                    '            <Beginn>20050316</Beginn>\n' +
                                    '            <Kostentraeger>\n' +
                                    '                <Kostentraegerkennung>999567890</Kostentraegerkennung>\n' +
                                    '                <Kostentraegerlaendercode>D</Kostentraegerlaendercode>\n' +
                                    '                <Name>eHealthExperts-Krankenkasse</Name>\n' +
                                    '            </Kostentraeger>\n' +
                                    '        </Versicherungsschutz>\n' +
                                    '        <Zusatzinfos>\n' +
                                    '            <ZusatzinfosGKV>\n' +
                                    '                <Versichertenart>1</Versichertenart>\n' +
                                    '                <Zusatzinfos_Abrechnung_GKV>\n' +
                                    '                    <WOP>88</WOP>\n' +
                                    '                </Zusatzinfos_Abrechnung_GKV>\n' +
                                    '            </ZusatzinfosGKV>\n' +
                                    '        </Zusatzinfos>\n' +
                                    '    </Versicherter>\n' +
                                    '</UC_AllgemeineVersicherungsdatenXML>\n',
                            protected: '<?xml version="1.0" encoding="ISO-8859-15" standalone="yes"?>\n' +
                                       '<UC_GeschuetzteVersichertendatenXML CDM_VERSION="5.2.0" xmlns="http://ws.gematik.de/fa/vsdm/vsd/v5.2">\n' +
                                       '    <Zuzahlungsstatus>\n' +
                                       '        <Status>0</Status>\n' +
                                       '    </Zuzahlungsstatus>\n' +
                                       '    <Selektivvertraege>\n' +
                                       '        <Aerztlich>0</Aerztlich>\n' +
                                       '        <Zahnaerztlich>0</Zahnaerztlich>\n' +
                                       '    </Selektivvertraege>\n' +
                                       '</UC_GeschuetzteVersichertendatenXML>\n'
                        },
                        patient: '<?xml version="1.0" encoding="ISO-8859-15" standalone="yes"?>\n' +
                                 '<UC_PersoenlicheVersichertendatenXML CDM_VERSION="5.2.0" xmlns="http://ws.gematik.de/fa/vsdm/vsd/v5.2">\n' +
                                 '    <Versicherter>\n' +
                                 '        <Versicherten_ID>F221125330</Versicherten_ID>\n' +
                                 '        <Person>\n' +
                                 '            <Geburtsdatum>19860316</Geburtsdatum>\n' +
                                 '            <Vorname>Florian</Vorname>\n' +
                                 '            <Nachname>Drup</Nachname>\n' +
                                 '            <Geschlecht>M</Geschlecht>\n' +
                                 '            <StrassenAdresse>\n' +
                                 '                <Postleitzahl>5727</Postleitzahl>\n' +
                                 '                <Ort>Bergbach</Ort>\n' +
                                 '                <Land>\n' +
                                 '                    <Wohnsitzlaendercode>CH</Wohnsitzlaendercode>\n' +
                                 '                </Land>\n' +
                                 '                <Strasse>Carl-Wolff-Str.</Strasse>\n' +
                                 '                <Hausnummer>12</Hausnummer>\n' +
                                 '            </StrassenAdresse>\n' +
                                 '        </Person>\n' +
                                 '    </Versicherter>\n' +
                                 '</UC_PersoenlicheVersichertendatenXML>\n',
                        validation: '<?xml version="1.0" encoding="ISO-8859-15" standalone="yes"?>\n' +
                                    '<PN CDM_VERSION="1.0.0" xmlns="http://ws.gematik.de/fa/vsdm/pnw/v1.0">\n' +
                                    '    <TS>20210317092115</TS>\n' +
                                    '    <E>2</E>\n' +
                                    '    <PZ>EIAnaIMAMAAAmZkgFgYgFSMxEAAAAAB6W1auwkgG7Zi8FBRC1qpZFAhi0Wj2f1G4xGqArPx5Cg==</PZ>\n' +
                                    '</PN>\n'
                    };

                    this.location = {
                        "_id": "000000000000000000000001" ,
                        "kv": "72",
                        "kind": "OFFICIAL",
                        "postbox": "",
                        "addon": "",
                        "countryCode": "D",
                        "country": "Deutschland",
                        "city": "Berlin",
                        "zip": "12357",
                        "houseno": "40",
                        "street": "Flurweg 40, 12357, Berlin, 40",
                        "cardType": "BANK",
                        "isOptional": true,
                        "isAdditionalLocation": false,
                        "enabledPrinters": [],
                        "imapUrl": "",
                        "imapUserName": "",
                        "imapPassword": "",
                        "locname": "BS1",
                        "phone": "015203355396",
                        "email": "maximilian.kramp+1000@doc-cirrus.com",
                        "openTimes": [
                            {
                                "days": [
                                    1,
                                    2,
                                    3,
                                    4,
                                    5
                                ],
                                "colorOfConsults": " ",
                                "start": [
                                    9,
                                    0
                                ],
                                "end": [
                                    17,
                                    0
                                ],
                                "scheduleTypes": [],
                                "_id": "5c4af2964878850aa22e5cd2",
                                "repetitionSettings": []
                            }
                        ],
                        "budgets": [],
                        "defaultPrinter": "",
                        "commercialNo": "310100200",
                        "gkvInvoiceReceiver": "70",
                        "countryMode": [
                            "D"
                        ],
                        "emailFooter": "meine signatur",
                        "lastChanged": "2021-02-22T16:48:42.755Z",
                        "smtpEmailFrom": "",
                        "smtpHost": "",
                        "smtpPassword": "",
                        "smtpUserName": "",
                        "stockLocations": [],
                        "firstname": "",
                        "lastname": "",
                        "middlename": "",
                        "nameaffix": "",
                        "title": "",
                        "konnektorProductVersion": "4.3.1"
                    };

                    await Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'location',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( this.location )
                    } );
                } );

                it( 'then the patient should have a zip code.', async function() {
                    this.timeout(10000);

                    const
                        result = await Y.doccirrus.cardreader.parsers.egk.parse(user, this.germanCountryCode);

                    expect(result).to.be.an('object');
                    expect(result.patient.addresses[0].zip).to.be.eql("38889");
                    expect(result.patient.addresses[0].countryCode).to.be.eql("D");

                } );

                it( 'then the patient should not have a zip code.', async function() {
                    this.timeout(10000);
                    const
                        result = await Y.doccirrus.cardreader.parsers.egk.parse(user, this.swissCountryCode);

                    expect(result).to.be.an('object');
                    expect(result.patient.addresses[0].zip).to.be.eql("");
                    expect(result.patient.addresses[0].countryCode).to.be.eql("CH");

                } );
                after( 'clean the database', async function() {
                    await cleanDb( {user, collections2clean: ['location']} );
                } );
            });
        });
    });
});
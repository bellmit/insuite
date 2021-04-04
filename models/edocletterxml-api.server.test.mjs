import sinon from 'sinon';
import fs from 'fs';
import path from 'path';
import moment from 'moment';

describe( 'edocletter-api', function() {

    let
        ClinicalDocument,
        Consent,
        EncompassingEncounter,
        HealthCareFacility,
        RelatedDocument,
        ParentDocument,
        InformationRecipient,
        IntendedRecipient,
        AssignedCustodian,
        Custodian,
        Participant,
        Author,
        AssignedAuthor,
        AssignedPerson,
        Code,
        Time,
        AssignedEntity,
        AssociatedEntity,
        Person,
        Organization,
        PatientRole,
        Patient,
        PersonName,
        OrganizationName,
        BirthPlace,
        Place,
        Address,
        Telecommunication,
        InstanceIdentifier,
        RecordTarget,
        Authenticator,
        Authorization,
        ResponsibleParty,
        EncounterParticipant,
        Location,
        EntityNamePart,
        ComponentOf,
        CustodianOrganization,

        // enum exports
        DischargeDispositionCode,
        EncounterCode,
        DocumentRelationshipType,
        PersonalRelationshipRoleType,
        RoleClassAssociative,
        ParticipationTypeForParticipant,
        ParticipationType,
        InformationRecipientRole,
        AdministrativeGender,
        PostalAddressUse,
        NullFlavorType,
        TelecommunicationType,
        DocumentTypeCode,
        ConfidentialityCode,
        EntityNamePartQualifier,
        CodeSystemTypes,
        ParticipationSignature,
        EncounterParticipantType;

    before( async function() {
        await import( '../autoload/doccirrus.common.yui' );

        Y.doccirrus.i18n = sinon.stub().callsFake( ( key ) => key );

        await import( './edocletterxml-api.server.yui' );

        // classes
        ClinicalDocument = Y.doccirrus.api.edocletterxml.ClinicalDocument;
        Consent = Y.doccirrus.api.edocletterxml.Consent;
        EncompassingEncounter = Y.doccirrus.api.edocletterxml.EncompassingEncounter;
        HealthCareFacility = Y.doccirrus.api.edocletterxml.HealthCareFacility;
        RelatedDocument = Y.doccirrus.api.edocletterxml.RelatedDocument;
        ParentDocument = Y.doccirrus.api.edocletterxml.ParentDocument;
        InformationRecipient = Y.doccirrus.api.edocletterxml.InformationRecipient;
        IntendedRecipient = Y.doccirrus.api.edocletterxml.IntendedRecipient;
        AssignedCustodian = Y.doccirrus.api.edocletterxml.AssignedCustodian;
        Custodian = Y.doccirrus.api.edocletterxml.Custodian;
        Participant = Y.doccirrus.api.edocletterxml.Participant;
        Author = Y.doccirrus.api.edocletterxml.Author;
        AssignedAuthor = Y.doccirrus.api.edocletterxml.AssignedAuthor;
        AssignedPerson = Y.doccirrus.api.edocletterxml.AssignedPerson;
        Code = Y.doccirrus.api.edocletterxml.Code;
        Time = Y.doccirrus.api.edocletterxml.Time;
        AssignedEntity = Y.doccirrus.api.edocletterxml.AssignedEntity;
        AssociatedEntity = Y.doccirrus.api.edocletterxml.AssociatedEntity;
        Person = Y.doccirrus.api.edocletterxml.Person;
        Organization = Y.doccirrus.api.edocletterxml.Organization;
        PatientRole = Y.doccirrus.api.edocletterxml.PatientRole;
        Patient = Y.doccirrus.api.edocletterxml.Patient;
        PersonName = Y.doccirrus.api.edocletterxml.PersonName;
        OrganizationName = Y.doccirrus.api.edocletterxml.OrganizationName;
        BirthPlace = Y.doccirrus.api.edocletterxml.BirthPlace;
        Place = Y.doccirrus.api.edocletterxml.Place;
        Address = Y.doccirrus.api.edocletterxml.Address;
        Telecommunication = Y.doccirrus.api.edocletterxml.Telecommunication;
        InstanceIdentifier = Y.doccirrus.api.edocletterxml.InstanceIdentifier;
        RecordTarget = Y.doccirrus.api.edocletterxml.RecordTarget;
        Authenticator = Y.doccirrus.api.edocletterxml.Authenticator;
        Authorization = Y.doccirrus.api.edocletterxml.Authorization;
        EncounterParticipant = Y.doccirrus.api.edocletterxml.EncounterParticipant;
        ResponsibleParty = Y.doccirrus.api.edocletterxml.ResponsibleParty;
        Location = Y.doccirrus.api.edocletterxml.Location;
        EntityNamePart = Y.doccirrus.api.edocletterxml.EntityNamePart;
        ComponentOf = Y.doccirrus.api.edocletterxml.ComponentOf;
        CustodianOrganization = Y.doccirrus.api.edocletterxml.CustodianOrganization;

        // enums
        DischargeDispositionCode = Y.doccirrus.api.edocletterxml.DischargeDispositionCode;
        EncounterCode = Y.doccirrus.api.edocletterxml.EncounterCode;
        DocumentRelationshipType = Y.doccirrus.api.edocletterxml.DocumentRelationshipType;
        PersonalRelationshipRoleType = Y.doccirrus.api.edocletterxml.PersonalRelationshipRoleType;
        RoleClassAssociative = Y.doccirrus.api.edocletterxml.RoleClassAssociative;
        ParticipationTypeForParticipant = Y.doccirrus.api.edocletterxml.ParticipationTypeForParticipant;
        ParticipationType = Y.doccirrus.api.edocletterxml.ParticipationType;
        InformationRecipientRole = Y.doccirrus.api.edocletterxml.InformationRecipientRole;
        AdministrativeGender = Y.doccirrus.api.edocletterxml.AdministrativeGender;
        PostalAddressUse = Y.doccirrus.api.edocletterxml.PostalAddressUse;
        NullFlavorType = Y.doccirrus.api.edocletterxml.NullFlavorType;
        TelecommunicationType = Y.doccirrus.api.edocletterxml.TelecommunicationType;
        DocumentTypeCode = Y.doccirrus.api.edocletterxml.DocumentTypeCode;
        ConfidentialityCode = Y.doccirrus.api.edocletterxml.ConfidentialityCode;
        EntityNamePartQualifier = Y.doccirrus.api.edocletterxml.EntityNamePartQualifier;
        CodeSystemTypes = Y.doccirrus.api.edocletterxml.CodeSystemTypes;
        ParticipationSignature = Y.doccirrus.api.edocletterxml.ParticipationSignature;
        EncounterParticipantType = Y.doccirrus.api.edocletterxml.EncounterParticipantType;

        // set new xml builder defaults for the tests
        this.oldBuilderOptions = ClinicalDocument.XML_BUILDER_OPTIONS;
        ClinicalDocument.XML_BUILDER_OPTIONS = {
            headless: true,
            xmldec: {
                version: '1.0',
                encoding: 'UTF-8',
                standalone: true
            },
            renderOpts: {
                pretty: false,
                indent: '',
                newline: ''
            }
        };

        // setup paths
        this.testXMLFileRootPath = path.resolve( 'test', 'samples', 'edocletter' );

    } );

    after( function() {
        // reset XML builder options
        ClinicalDocument.XML_BUILDER_OPTIONS = this.oldBuilderOptions;

        // kill YUI reference
        Y = null;
    } );

    describe( 'InstanceIdentifier', function() {

        it( 'is a class', function() {
            expect( typeof InstanceIdentifier ).to.equal( "function" );
            expect( typeof InstanceIdentifier.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given a root and extension', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            root: "test",
                            extension: "testExt"
                        },
                        candidate = new InstanceIdentifier( fixture );
                    expect( candidate ).to.be.instanceOf( InstanceIdentifier );
                    expect( candidate.root ).to.be.equal( fixture.root );
                    expect( candidate.extension ).to.be.equal( fixture.extension );
                } );

            } );

            describe( 'given an extension but no root', function() {

                it( 'returns a new instance with the system guid', function() {
                    const candidate = new InstanceIdentifier( {
                        extension: "test"
                    } );
                    expect( candidate ).to.be.instanceOf( InstanceIdentifier );
                    expect( candidate.root ).to.be.equal( InstanceIdentifier.getSystemGUID() );
                } );

            } );

            describe( 'given a missing extension', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new InstanceIdentifier( {
                            root: "test"
                        } );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = new InstanceIdentifier( {
                        root: "test",
                        extension: "testExt"
                    } ),
                    candidate = fixture.toXMLObject();

                expect( candidate ).to.be.eql( {
                    $: {
                        root: "test",
                        extension: "testExt"
                    }
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = new InstanceIdentifier( {
                        root: "test",
                        extension: "testExt"
                    } ),
                    candidate = fixture.toXMLString();

                expect( candidate ).to.be.equal( '<id extension="testExt" root="test"/>' );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        $: {
                            root: "test",
                            extension: "testExt"
                        }
                    },
                    candidate = InstanceIdentifier.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( InstanceIdentifier );
                expect( candidate.root ).to.be.equal( fixture.$.root );
                expect( candidate.extension ).to.be.equal( fixture.$.extension );
            } );

        } );

        describe( '.getSystemGUID()', function() {

            it( 'returns a unique system id', function() {
                expect( InstanceIdentifier.getSystemGUID( 12345, 123456789 ) ).to.be.equal( "1.2.276.0.76.3.1.460.0.12345.123456789" );
            } );

        } );

    } );

    describe( 'Code', function() {

        it( 'is a class', function() {
            expect( typeof Code ).to.equal( "function" );
            expect( typeof Code.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given a code and codeSystem', function() {

                describe( 'given no validation', function() {

                    it( 'returns a new instance for input (object)', function() {
                        const
                            fixture = {
                                code: "10164-2",
                                codeSystem: "2.16.840.1.113883.6.1"
                            },
                            candidate = new Code( fixture );
                        expect( candidate ).to.be.instanceOf( Code );
                        expect( candidate.code ).to.be.equal( fixture.code );
                        expect( candidate.codeSystem ).to.be.equal( fixture.codeSystem );
                    } );

                    it( 'returns a new instance for input (string)', function() {
                        const
                            fixture = "10164-2",
                            candidate = new Code( fixture );
                        expect( candidate ).to.be.instanceOf( Code );
                        expect( candidate.code ).to.be.equal( fixture );
                    } );

                } );

                describe( 'given a validation', function() {

                    it( 'returns a new instance if value is valid (ENUM)', function() {
                        const
                            fixture = {
                                code: "10164-2",
                                codeSystem: "2.16.840.1.113883.6.1",
                                codeValidation: {
                                    TEST: "10164-2"
                                }
                            },
                            candidate = new Code( fixture );
                        expect( candidate ).to.be.instanceOf( Code );
                        expect( candidate.code ).to.be.equal( fixture.code );
                        expect( candidate.codeSystem ).to.be.equal( fixture.codeSystem );
                    } );

                    it( 'returns a new instance if value is valid (REGEXP)', function() {
                        const
                            fixture = {
                                code: "10164-2",
                                codeSystem: "2.16.840.1.113883.6.1",
                                codeValidation: /^\d\d\d\d\d-\d$/g
                            },
                            candidate = new Code( fixture );
                        expect( candidate ).to.be.instanceOf( Code );
                        expect( candidate.code ).to.be.equal( fixture.code );
                        expect( candidate.codeSystem ).to.be.equal( fixture.codeSystem );
                    } );

                    it( 'throws a type error if validation fails (ENUM)', function() {
                        const
                            fixture = {
                                code: "10164-2",
                                codeSystem: "2.16.840.1.113883.6.1",
                                codeValidation: {
                                    TEST: "10TEST2"
                                }
                            };
                        expect( () => new Code( fixture ) ).to.throw( TypeError );
                    } );

                    it( 'throws a type error if validation fails (REGEXP)', function() {
                        const
                            fixture = {
                                code: "10164-2",
                                codeSystem: "2.16.840.1.113883.6.1",
                                codeValidation: /^\w\w-\w$/g
                            };
                        expect( () => new Code( fixture ) ).to.throw( TypeError );
                    } );

                } );

            } );

            describe( 'given a missing but mandatory codeSystem', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new Code( {
                            code: "10164-2",
                            codeSystemMandatory: true
                        } );
                    } ).to.throw( TypeError );
                } );

            } );

            describe( 'given a codeSystem which is forbidden', function() {

                it( 'throws a TypeError if codeSystem is given', function() {
                    expect( () => {
                        return new Code( {
                            code: "10164-2",
                            codeSystem: "test",
                            codeSystemForbidden: true
                        } );
                    } ).to.throw( TypeError );
                } );

                it( 'throws a TypeError if codeSystemName is given', function() {
                    expect( () => {
                        return new Code( {
                            code: "10164-2",
                            codeSystemName: "test",
                            codeSystemForbidden: true
                        } );
                    } ).to.throw( TypeError );
                } );

                it( 'throws a TypeError if codeSystemVersion is given', function() {
                    expect( () => {
                        return new Code( {
                            code: "10164-2",
                            codeSystemVersion: "test",
                            codeSystemForbidden: true
                        } );
                    } ).to.throw( TypeError );
                } );

                it( 'throws a TypeError if displayName is given', function() {
                    expect( () => {
                        return new Code( {
                            code: "10164-2",
                            displayName: "test",
                            codeSystemForbidden: true
                        } );
                    } ).to.throw( TypeError );
                } );

            } );

            describe( 'given a missing code', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new Code( {
                            codeSystem: "2.16.840.1.113883.6.1"
                        } );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = new Code( {
                        code: "10164-2",
                        codeSystem: "2.16.840.1.113883.6.1"
                    } ),
                    candidate = fixture.toXMLObject();

                expect( candidate ).to.be.eql( {
                    $: {
                        code: "10164-2",
                        codeSystem: "2.16.840.1.113883.6.1"
                    }
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = new Code( {
                        code: "10164-2",
                        codeSystem: "2.16.840.1.113883.6.1"
                    } ),
                    candidate = fixture.toXMLString();

                expect( candidate ).to.be.equal( '<code code="10164-2" codeSystem="2.16.840.1.113883.6.1"/>' );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "$": {
                            "code": "10164-2",
                            "codeSystem": "2.16.840.1.113883.6.1"
                        }
                    },
                    candidate = Code.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( Code );
                expect( candidate.code ).to.be.equal( fixture.$.code );
                expect( candidate.codeSystem ).to.be.equal( fixture.$.codeSystem );
            } );

        } );

    } );

    describe( 'Telecommunication', function() {

        it( 'is a class', function() {
            expect( typeof Telecommunication ).to.equal( "function" );
            expect( typeof Telecommunication.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given mail address', function() {

                it( 'returns a new instance if the mail has a valid format', function() {
                    const candidate = new Telecommunication( {
                        type: TelecommunicationType.mailto,
                        value: "test@test.com"
                    } );
                    expect( candidate ).to.be.instanceOf( Telecommunication );
                    expect( candidate.type ).to.be.equal( TelecommunicationType.mailto );
                    expect( candidate.value ).to.be.equal( "test@test.com" );
                    expect( candidate.use ).to.be.equal( null );
                } );

                it( 'throws a TypeError if the mail has an invalid format', function() {
                    expect( () => {
                        return new Telecommunication( {
                            type: TelecommunicationType.mailto,
                            value: "test@tes@t.com"
                        } );
                    } ).to.throw( TypeError );
                } );

            } );

            describe( 'given a telephone number', function() {

                it( 'returns a new instance if the number has a valid format', function() {
                    const candidate = new Telecommunication( {
                        type: TelecommunicationType.tel,
                        value: "+4912345667(213)"
                    } );
                    expect( candidate ).to.be.instanceOf( Telecommunication );
                    expect( candidate.type ).to.be.equal( TelecommunicationType.tel );
                    expect( candidate.value ).to.be.equal( "+4912345667(213)" );
                    expect( candidate.use ).to.be.equal( null );
                } );

                it( 'throws a TypeError if the number has an invalid format', function() {
                    expect( () => {
                        return new Telecommunication( {
                            type: TelecommunicationType.tel,
                            value: "0023 12341.23123 323"
                        } );
                    } ).to.throw( TypeError );
                } );

            } );

            describe( 'given a fax number', function() {

                it( 'returns a new instance if the number has a valid format', function() {
                    const candidate = new Telecommunication( {
                        type: TelecommunicationType.fax,
                        value: "+4912345667(213)"
                    } );
                    expect( candidate ).to.be.instanceOf( Telecommunication );
                    expect( candidate.type ).to.be.equal( TelecommunicationType.fax );
                    expect( candidate.value ).to.be.equal( "+4912345667(213)" );
                    expect( candidate.use ).to.be.equal( null );
                } );

                it( 'throws a TypeError if the number has an invalid format', function() {
                    expect( () => {
                        return new Telecommunication( {
                            type: TelecommunicationType.fax,
                            value: "0023 12341.23123 323"
                        } );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        type: TelecommunicationType.tel,
                        value: "0214.2127070",
                        use: PostalAddressUse.WorkPlace
                    },
                    candidate = new Telecommunication( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    "$": {
                        "use": "WP",
                        "value": "tel:0214.2127070"
                    }
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = new Telecommunication( {
                        type: TelecommunicationType.fax,
                        value: "02473.14233",
                        use: PostalAddressUse.WorkPlace
                    } ),
                    candidate = fixture.toXMLString();

                expect( candidate ).to.be.equal( '<telecom use="WP" value="fax:02473.14233"/>' );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "$": {
                            "use": "WP",
                            "value": "tel:0214.2127070"
                        }
                    },
                    candidate = Telecommunication.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( Telecommunication );
                expect( candidate.value ).to.be.equal( "0214.2127070" );
                expect( candidate.type ).to.be.equal( TelecommunicationType.tel );
                expect( candidate.use ).to.be.equal( PostalAddressUse.WorkPlace );
            } );

        } );

    } );

    describe( 'Address', function() {

        it( 'is a class', function() {
            expect( typeof Address ).to.equal( "function" );
            expect( typeof Address.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given a full address', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            streetName: "Krankenhausstraße",
                            houseNumber: "240",
                            postalCode: "51371",
                            city: "Leverkusen",
                            county: "NRW",
                            country: "Germany"
                        },
                        candidate = new Address( fixture );
                    expect( candidate ).to.be.instanceOf( Address );
                    expect( candidate.streetName ).to.be.equal( fixture.streetName );
                    expect( candidate.houseNumber ).to.be.equal( fixture.houseNumber );
                    expect( candidate.postalCode ).to.be.equal( fixture.postalCode );
                    expect( candidate.city ).to.be.equal( fixture.city );
                    expect( candidate.county ).to.be.equal( fixture.county );
                    expect( candidate.country ).to.be.equal( fixture.country );
                } );

            } );

            describe( 'given a nullFlavor', function() {

                it( 'returns a new instance and ignores all other parameters', function() {
                    const
                        fixture = {
                            nullFlavor: NullFlavorType.Unknown,
                            streetName: "Krankenhausstraße",
                            houseNumber: "240",
                            postalCode: "51371",
                            city: "Leverkusen",
                            county: "NRW",
                            country: "Germany"
                        },
                        candidate = new Address( fixture );
                    expect( candidate ).to.be.instanceOf( Address );
                    expect( candidate.nullFlavor ).to.be.equal( fixture.nullFlavor );
                    expect( candidate.streetName ).to.be.equal( null );
                    expect( candidate.houseNumber ).to.be.equal( null );
                    expect( candidate.postalCode ).to.be.equal( null );
                    expect( candidate.city ).to.be.equal( null );
                    expect( candidate.county ).to.be.equal( null );
                    expect( candidate.country ).to.be.equal( null );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = new Address( {
                        streetName: "Krankenhausstraße",
                        houseNumber: "240",
                        postalCode: "51371",
                        city: "Leverkusen",
                        county: "NRW",
                        country: "Germany"
                    } ),
                    candidate = fixture.toXMLObject();

                expect( candidate ).to.be.eql( {
                    streetName: { _: fixture.streetName },
                    houseNumber: { _: fixture.houseNumber },
                    postalCode: { _: fixture.postalCode },
                    city: { _: fixture.city },
                    county: { _: fixture.county },
                    country: { _: fixture.country }
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = new Address( {
                        streetName: "Krankenhausstraße",
                        houseNumber: "240",
                        postalCode: "51371",
                        city: "Leverkusen"
                    } ),
                    candidate = fixture.toXMLString();

                expect( candidate ).to.be.equal(
                    '<addr>' +
                    '<streetName>Krankenhausstraße</streetName>' +
                    '<houseNumber>240</houseNumber>' +
                    '<postalCode>51371</postalCode>' +
                    '<city>Leverkusen</city>' +
                    '</addr>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "streetName": [
                            "Krankenhausstraße"
                        ],
                        "houseNumber": [
                            "240"
                        ],
                        "postalCode": [
                            "51371"
                        ],
                        "city": [
                            "Leverkusen"
                        ]
                    },
                    candidate = Address.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( Address );
                expect( candidate.streetName ).to.be.equal( "Krankenhausstraße" );
                expect( candidate.houseNumber ).to.be.equal( "240" );
                expect( candidate.postalCode ).to.be.equal( "51371" );
                expect( candidate.city ).to.be.equal( "Leverkusen" );
            } );

        } );

    } );

    describe( 'EntityNamePart', function() {

        it( 'is a class', function() {
            expect( typeof EntityNamePart ).to.equal( "function" );
            expect( typeof EntityNamePart.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given a prefix as string', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = "Dr. med.",
                        candidate = new EntityNamePart( fixture );
                    expect( candidate ).to.be.instanceOf( EntityNamePart );
                    expect( candidate.value ).to.be.equal( fixture );
                    expect( candidate.qualifier ).to.be.equal( null );
                } );

            } );

            describe( 'given a prefix as object', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            value: "Dr. med."
                        },
                        candidate = new EntityNamePart( fixture );
                    expect( candidate ).to.be.instanceOf( EntityNamePart );
                    expect( candidate.value ).to.be.equal( fixture.value );
                    expect( candidate.qualifier ).to.be.equal( null );
                } );

            } );

            describe( 'given a prefix and qualifier as object', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            value: "Dr. med.",
                            qualifier: EntityNamePartQualifier.Academic
                        },
                        candidate = new EntityNamePart( fixture );
                    expect( candidate ).to.be.instanceOf( EntityNamePart );
                    expect( candidate.value ).to.be.equal( fixture.value );
                    expect( candidate.qualifier ).to.be.equal( EntityNamePartQualifier.Academic );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = new EntityNamePart( {
                        value: "Dr. med.",
                        qualifier: EntityNamePartQualifier.Academic
                    } ),
                    candidate = fixture.toXMLObject();

                expect( candidate ).to.be.eql( {
                    _: 'Dr. med.',
                    $: { qualifier: EntityNamePartQualifier.Academic }
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = new EntityNamePart( {
                        value: "Dr. med.",
                        qualifier: EntityNamePartQualifier.Academic
                    } ),
                    candidate = fixture.toXMLString();

                expect( candidate ).to.be.equal( '<entityNamePart qualifier="AC">Dr. med.</entityNamePart>' );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "_": "Dr. med.",
                        "$": {
                            "qualifier": "AC"
                        }
                    },
                    candidate = EntityNamePart.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( EntityNamePart );
                expect( candidate ).to.be.eql( new EntityNamePart( {
                    qualifier: EntityNamePartQualifier.Academic,
                    value: "Dr. med."
                } ) );
            } );

        } );

    } );

    describe( 'PersonName', function() {

        it( 'is a class', function() {
            expect( typeof PersonName ).to.equal( "function" );
            expect( typeof PersonName.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given prefix, family, given and suffix as string[]', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            prefix: ["test-0"],
                            family: ["test-1"],
                            given: ["test-2"],
                            suffix: ["test-3"]
                        },
                        candidate = new PersonName( fixture );
                    expect( candidate ).to.be.instanceOf( PersonName );
                    expect( candidate.family ).to.be.eql( [new EntityNamePart( fixture.family[0] )] );
                    expect( candidate.given ).to.be.eql( [new EntityNamePart( fixture.given[0] )] );
                    expect( candidate.suffix ).to.be.eql( [new EntityNamePart( fixture.suffix[0] )] );
                    expect( candidate.prefix ).to.be.eql( [new EntityNamePart( fixture.prefix[0] )] );
                } );

            } );

            describe( 'given prefix, family, given and suffix as string', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            prefix: "test-0",
                            family: "test-1",
                            given: "test-2",
                            suffix: "test-3"
                        },
                        candidate = new PersonName( fixture );
                    expect( candidate ).to.be.instanceOf( PersonName );
                    expect( candidate.family ).to.be.eql( [new EntityNamePart( fixture.family )] );
                    expect( candidate.given ).to.be.eql( [new EntityNamePart( fixture.given )] );
                    expect( candidate.suffix ).to.be.eql( [new EntityNamePart( fixture.suffix )] );
                    expect( candidate.prefix ).to.be.eql( [new EntityNamePart( fixture.prefix )] );
                } );

            } );

            describe( 'given prefix, family, given and suffix as EntityNamePart[]', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            family: [new EntityNamePart( { value: "test-0" } )],
                            given: [new EntityNamePart( { value: "test-1" } )],
                            suffix: [new EntityNamePart( { value: "test-2" } )],
                            prefix: [new EntityNamePart( { value: "test-3" } )]
                        },
                        candidate = new PersonName( fixture );
                    expect( candidate ).to.be.instanceOf( PersonName );
                    expect( candidate.family ).to.be.eql( fixture.family );
                    expect( candidate.given ).to.be.eql( fixture.given );
                    expect( candidate.suffix ).to.be.eql( fixture.suffix );
                    expect( candidate.prefix ).to.be.eql( fixture.prefix );
                } );

            } );

            describe( 'given prefix, family, given and suffix as EntityNamePart', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            family: new EntityNamePart( { value: "test-0" } ),
                            given: new EntityNamePart( { value: "test-1" } ),
                            suffix: new EntityNamePart( { value: "test-2" } ),
                            prefix: new EntityNamePart( { value: "test-3" } )
                        },
                        candidate = new PersonName( fixture );
                    expect( candidate ).to.be.instanceOf( PersonName );
                    expect( candidate.family ).to.be.eql( [fixture.family] );
                    expect( candidate.given ).to.be.eql( [fixture.given] );
                    expect( candidate.suffix ).to.be.eql( [fixture.suffix] );
                    expect( candidate.prefix ).to.be.eql( [fixture.prefix] );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = new PersonName( {
                        prefix: new EntityNamePart( {
                            value: "Dr. med.",
                            qualifier: EntityNamePartQualifier.Academic
                        } ),
                        given: "Theo",
                        family: ["Phyllin"]
                    } ),
                    candidate = fixture.toXMLObject();

                expect( candidate ).to.be.eql(
                    {
                        prefix: [{ _: 'Dr. med.', $: { qualifier: EntityNamePartQualifier.Academic } }],
                        given: [{ _: 'Theo' }],
                        family: [{ _: 'Phyllin' }]
                    }
                );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = new PersonName( {
                        prefix: new EntityNamePart( {
                            value: "Dr. med.",
                            qualifier: EntityNamePartQualifier.Academic
                        } ),
                        given: "Theo",
                        family: ["Phyllin"]
                    } ),
                    candidate = fixture.toXMLString();

                expect( candidate ).to.be.equal(
                    '<name>' +
                    '<prefix qualifier="AC">Dr. med.</prefix>' +
                    '<given>Theo</given>' +
                    '<family>Phyllin</family>' +
                    '</name>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "prefix": [
                            {
                                "_": "Dr. med.",
                                "$": {
                                    "qualifier": "AC"
                                }
                            }
                        ],
                        "given": [
                            "Theo"
                        ],
                        "family": [
                            "Phyllin"
                        ],
                        "suffix": [
                            { "_": "the 3rd." }
                        ]
                    },
                    candidate = PersonName.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( PersonName );
                expect( candidate.family ).to.be.eql( [new EntityNamePart( "Phyllin" )] );
                expect( candidate.given ).to.be.eql( [new EntityNamePart( "Theo" )] );
                expect( candidate.suffix ).to.be.eql( [new EntityNamePart( "the 3rd." )] );
                expect( candidate.prefix ).to.be.eql( [
                    new EntityNamePart( { qualifier: EntityNamePartQualifier.Academic, value: "Dr. med." } )
                ] );
            } );

        } );

    } );

    describe( 'Person', function() {

        it( 'is a class', function() {
            expect( typeof Person ).to.equal( "function" );
            expect( typeof Person.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given a name, addr and telecom', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            name: new PersonName( {
                                family: ["test"]
                            } ),
                            addr: new Address( {
                                streetName: "testStreet"
                            } ),
                            telecom: new Telecommunication( {
                                type: TelecommunicationType.mailto,
                                value: "cool@test.com"
                            } )
                        },
                        candidate = new Person( fixture );
                    expect( candidate ).to.be.instanceOf( Person );
                    expect( candidate.name ).to.be.eql( [fixture.name] );
                    expect( candidate.addr ).to.be.eql( [fixture.addr] );
                    expect( candidate.telecom ).to.be.eql( [fixture.telecom] );
                } );

            } );

            describe( 'given no person name', function() {

                it( 'throws a TypeError', function() {
                    const
                        fixture = {
                            name: null
                        };
                    expect( () => {
                        return new Person( fixture );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        name: new PersonName( {
                            family: ["test"]
                        } ),
                        addr: new Address( {
                            streetName: "testStreet"
                        } ),
                        telecom: new Telecommunication( {
                            type: TelecommunicationType.mailto,
                            value: "cool@test.com"
                        } )
                    },
                    candidate = new Person( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    name: [fixture.name.toXMLObject()],
                    addr: [fixture.addr.toXMLObject()],
                    telecom: [fixture.telecom.toXMLObject()]
                } );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "name": [
                            {
                                "family": [
                                    "Phyllin"
                                ]
                            }
                        ],
                        "addr": [
                            {
                                "streetName": [
                                    "Krankenhausstraße"
                                ]
                            }
                        ],
                        "telecom": [
                            {
                                "$": {
                                    "use": "WP",
                                    "value": "tel:0214.2127070"
                                }
                            }
                        ]
                    },
                    candidate = Person.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( Person );
                expect( candidate.name ).to.be.eql( [PersonName.fromXMLObject( fixture.name[0] )] );
                expect( candidate.addr ).to.be.eql( [Address.fromXMLObject( fixture.addr[0] )] );
                expect( candidate.telecom ).to.be.eql( [Telecommunication.fromXMLObject( fixture.telecom[0] )] );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = new Person( {
                        name: new PersonName( {
                            family: "Heitmann"
                        } )
                    } ),
                    candidate = fixture.toXMLString();

                expect( candidate ).to.be.equal(
                    '<person>' +
                    '<name>' +
                    '<family>Heitmann</family>' +
                    '</name>' +
                    '</person>'
                );
            } );

        } );

    } );

    describe( 'Place', function() {

        it( 'is a class', function() {
            expect( typeof Place ).to.equal( "function" );
            expect( typeof Place.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given a name and addr', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            name: new PersonName( {
                                family: ["test"]
                            } ),
                            addr: new Address( {
                                streetName: "testStreet"
                            } )
                        },
                        candidate = new Place( fixture );
                    expect( candidate ).to.be.instanceOf( Place );
                    expect( candidate.name ).to.be.eql( fixture.name );
                    expect( candidate.addr ).to.be.eql( fixture.addr );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = new Place( {
                        name: new PersonName( {
                            family: ["test"]
                        } ),
                        addr: new Address( {
                            streetName: "testStreet"
                        } )
                    } ),
                    candidate = fixture.toXMLObject();

                expect( candidate ).to.be.eql( {
                    name: fixture.name.toXMLObject(),
                    addr: fixture.addr.toXMLObject()
                } );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "name": [{ "family": ["Phyllin"] }],
                        "addr": [{ "streetName": ["Krankenhausstraße"] }]
                    },
                    candidate = Place.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( Place );
                expect( candidate.name ).to.be.eql( PersonName.fromXMLObject( fixture.name[0] ) );
                expect( candidate.addr ).to.be.eql( Address.fromXMLObject( fixture.addr[0] ) );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = new Place( {
                        addr: new Address( {
                            city: "Sassnitz"
                        } )
                    } ),
                    candidate = fixture.toXMLString();

                expect( candidate ).to.be.equal(
                    '<place>' +
                    '<addr>' +
                    '<city>Sassnitz</city>' +
                    '</addr>' +
                    '</place>'
                );
            } );

        } );

    } );

    describe( 'BirthPlace', function() {

        it( 'is a class', function() {
            expect( typeof BirthPlace ).to.equal( "function" );
            expect( typeof BirthPlace.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given a name and addr with city and country', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            place: new Place( {
                                name: new PersonName( {
                                    family: ["test"]
                                } ),
                                addr: new Address( {
                                    city: "Berlin",
                                    country: "Germany"
                                } )
                            } )
                        },
                        candidate = new BirthPlace( fixture );
                    expect( candidate ).to.be.instanceOf( BirthPlace );
                    expect( candidate.place ).to.be.eql( fixture.place );
                } );

            } );

            describe( 'given an addr without city or country', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new BirthPlace( {
                            place: new Place( {
                                addr: new Address( {
                                    streetName: "test-street"
                                } )
                            } )
                        } );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        place: new Place( {
                            name: new PersonName( {
                                family: ["test"]
                            } ),
                            addr: new Address( {
                                city: "Berlin",
                                country: "Germany"
                            } )
                        } )
                    },
                    candidate = new BirthPlace( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    place: fixture.place.toXMLObject()
                } );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "place": [
                            {
                                "addr": [
                                    {
                                        "city": [
                                            "Sassnitz"
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    candidate = BirthPlace.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( BirthPlace );
                expect( candidate.place.addr.city ).to.be.eql( fixture.place[0].addr[0].city[0] );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = new BirthPlace( {
                        place: new Place( {
                            addr: new Address( {
                                city: "Sassnitz"
                            } )
                        } )
                    } ),
                    candidate = fixture.toXMLString();

                expect( candidate ).to.be.equal(
                    '<birthplace><place><addr><city>Sassnitz</city></addr></place></birthplace>'
                );
            } );

        } );

    } );

    describe( 'Time', function() {

        it( 'is a class', function() {
            expect( typeof Time ).to.equal( "function" );
            expect( typeof Time.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given a single point in time', function() {

                describe( 'given a string', function() {

                    it( 'returns a new instance', function() {
                        const
                            fixture = "2015-11-04",
                            candidate = new Time( fixture );
                        expect( candidate ).to.be.instanceOf( Time );
                        expect( candidate.format( "YYYY-MM-DD" ) ).to.be.equal( fixture );
                    } );

                } );

                describe( 'given a Date', function() {

                    it( 'returns a new instance', function() {
                        const
                            fixture = new Date( 2015, 11, 4 ),
                            candidate = new Time( fixture );
                        expect( candidate ).to.be.instanceOf( Time );
                        expect( candidate.format( "YYYY-MM-DD" ) ).to.be.equal( moment( fixture ).format( "YYYY-MM-DD" ) );
                    } );

                } );

                describe( 'given a moment', function() {

                    it( 'returns a new instance', function() {
                        const
                            fixture = moment( new Date( 2015, 11, 4 ) ),
                            candidate = new Time( fixture );
                        expect( candidate ).to.be.instanceOf( Time );
                        expect( candidate.format( "YYYY-MM-DD" ) ).to.be.equal( fixture.format( "YYYY-MM-DD" ) );
                    } );

                } );

                describe( 'given an object (string)', function() {

                    it( 'returns a new instance', function() {
                        const
                            fixture = {
                                time: "2015-11-04"
                            },
                            candidate = new Time( fixture );
                        expect( candidate ).to.be.instanceOf( Time );
                        expect( candidate.format( "YYYY-MM-DD" ) ).to.be.equal( fixture.time );
                    } );

                } );

                describe( 'given an object (Date)', function() {

                    it( 'returns a new instance', function() {
                        const
                            fixture = {
                                time: new Date( 2015, 11, 4 )
                            },
                            candidate = new Time( fixture );
                        expect( candidate ).to.be.instanceOf( Time );
                        expect( candidate.format( "YYYY-MM-DD" ) ).to.be.equal( moment( fixture.time ).format( "YYYY-MM-DD" ) );
                    } );

                } );

                describe( 'given an object (moment)', function() {

                    it( 'returns a new instance', function() {
                        const
                            fixture = {
                                time: moment( new Date( 2015, 11, 4 ) )
                            },
                            candidate = new Time( fixture );
                        expect( candidate ).to.be.instanceOf( Time );
                        expect( candidate.format( "YYYY-MM-DD" ) ).to.be.equal( fixture.time.format( "YYYY-MM-DD" ) );
                    } );

                } );

            } );

            describe( 'given a time span', function() {

                describe( 'given an object (string)', function() {

                    it( 'returns a new instance', function() {
                        const
                            fixture = {
                                low: "2015-11-04",
                                high: "2015-11-21"
                            },
                            candidate = new Time( fixture );
                        expect( candidate ).to.be.instanceOf( Time );
                        expect( candidate.lowFormat( "YYYY-MM-DD" ) ).to.be.equal( fixture.low );
                        expect( candidate.highFormat( "YYYY-MM-DD" ) ).to.be.equal( fixture.high );
                        expect( candidate.lowInclusive ).to.be.equal( false );
                        expect( candidate.highInclusive ).to.be.equal( true );
                    } );

                } );

                describe( 'given an object (Date)', function() {

                    it( 'returns a new instance', function() {
                        const
                            fixture = {
                                low: new Date( 2015, 11, 4 ),
                                high: new Date( 2015, 11, 22 )
                            },
                            candidate = new Time( fixture );
                        expect( candidate ).to.be.instanceOf( Time );
                        expect( candidate.lowFormat( "YYYY-MM-DD" ) ).to.be.equal( moment( fixture.low ).format( "YYYY-MM-DD" ) );
                        expect( candidate.highFormat( "YYYY-MM-DD" ) ).to.be.equal( moment( fixture.high ).format( "YYYY-MM-DD" ) );
                    } );

                } );

                describe( 'given an object (moment)', function() {

                    it( 'returns a new instance', function() {
                        const
                            fixture = {
                                low: moment( new Date( 2015, 11, 4 ) ),
                                high: moment( new Date( 2015, 11, 22 ) )
                            },
                            candidate = new Time( fixture );
                        expect( candidate ).to.be.instanceOf( Time );
                        expect( candidate.lowFormat( "YYYY-MM-DD" ) ).to.be.equal( fixture.low.format( "YYYY-MM-DD" ) );
                        expect( candidate.highFormat( "YYYY-MM-DD" ) ).to.be.equal( fixture.high.format( "YYYY-MM-DD" ) );
                    } );

                } );

            } );

            describe( 'given an invalid combination of time and time span', function() {

                describe( 'given an object (string)', function() {

                    it( 'throws an error', function() {
                        const
                            fixture = {
                                time: "2015-11-04",
                                low: "2015-11-04",
                                high: "2015-11-21"
                            };
                        expect( () => {
                            return new Time( fixture );
                        } ).to.throw( TypeError );
                    } );

                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            describe( 'given a single point in time', function() {

                it( 'returns a valid XML object parsable by xml2js', function() {
                    const
                        fixture = new Time( {
                            time: "2015-11-04"
                        } ),
                        candidate = fixture.toXMLObject();

                    expect( candidate ).to.be.eql( {
                        $: {
                            value: "201511040000"
                        }
                    } );

                } );

            } );

            describe( 'given a time span', function() {

                it( 'returns a valid XML object parsable by xml2js', function() {
                    const
                        fixture = new Time( {
                            low: "2015-11-04",
                            high: "2015-11-12"
                        } ),
                        candidate = fixture.toXMLObject();

                    expect( candidate ).to.be.eql( {
                        low: {
                            $: {
                                value: "201511040000"
                            }
                        },
                        high: {
                            $: {
                                value: "201511120000",
                                inclusive: "true"
                            }
                        }
                    } );

                } );

            } );

        } );

        describe( '#toXMLString()', function() {

            describe( 'given a single point in time', function() {

                it( 'returns a valid XML string', function() {
                    const
                        fixture = new Time( {
                            time: "2015-11-04"
                        } ),
                        candidate = fixture.toXMLString();

                    expect( candidate ).to.be.equal( '<time value="201511040000"/>' );
                } );

            } );

            describe( 'given a time span', function() {

                it( 'returns a valid XML string (default inclusive / exclusive)', function() {
                    const
                        fixture = new Time( {
                            low: "2007-11-04 05:57",
                            high: "2007-11-04 13:16"
                        } ),
                        candidate = fixture.toXMLString();

                    expect( candidate ).to.be.equal(
                        '<time><low value="200711040557"/><high value="200711041316" inclusive="true"/></time>'
                    );
                } );

                it( 'returns a valid XML string (implicit inclusive)', function() {
                    const
                        fixture = new Time( {
                            low: "2007-11-04 05:57",
                            lowInclusive: true,
                            high: "2007-11-04 13:16"
                        } ),
                        candidate = fixture.toXMLString();

                    expect( candidate ).to.be.equal(
                        '<time><low value="200711040557" inclusive="true"/><high value="200711041316" inclusive="true"/></time>'
                    );
                } );

            } );

        } );

        describe( '.fromXMLObject()', function() {

            describe( 'given a single point in time', function() {

                it( 'returns an instance of the class', function() {
                    const
                        fixture = {
                            $: {
                                value: "20151104"
                            }
                        },
                        candidate = Time.fromXMLObject( fixture );
                    expect( candidate ).to.be.instanceOf( Time );
                    expect( candidate.format( "YYYYMMDD" ) ).to.be.equal( "20151104" );
                    expect( candidate.low ).to.be.equal( null );
                    expect( candidate.high ).to.be.equal( null );
                } );

            } );

            describe( 'given a time span', function() {

                it( 'returns an instance of the class', function() {
                    const
                        fixture = {
                            "low": [{ "$": { "value": "20050101" } }],
                            "high": [{ "$": { "value": "20051231", "inclusive": "true" } }]
                        },
                        candidate = Time.fromXMLObject( fixture );
                    expect( candidate ).to.be.instanceOf( Time );
                    expect( candidate.time ).to.be.equal( null );
                    expect( candidate.lowFormat( "YYYYMMDDHHmm" ) ).to.be.equal( "200501010000" );
                    expect( candidate.highFormat( "YYYYMMDDHHmm" ) ).to.be.equal( "200512310000" );
                } );

            } );

        } );

    } );

    describe( 'Patient', function() {

        it( 'is a class', function() {
            expect( typeof Patient ).to.equal( "function" );
            expect( typeof Patient.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given a name, genderCode (Code), birthTime and birthPlace', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            name: new PersonName( {
                                family: ["test"]
                            } ),
                            administrativeGenderCode: new Code( {
                                code: AdministrativeGender.Male,
                                codeSystem: CodeSystemTypes.AdministrativeGenderCodes,
                                codeValidation: AdministrativeGender
                            } ),
                            birthTime: new Time( "2021-12-12" ),
                            birthPlace: new BirthPlace( { place: { addr: { city: "TestStadt" } } } )
                        },
                        candidate = new Patient( fixture );
                    expect( candidate ).to.be.instanceOf( Patient );
                    expect( candidate.name ).to.be.eql( [fixture.name] );
                    expect( candidate.administrativeGenderCode ).to.be.eql( fixture.administrativeGenderCode );
                    expect( candidate.birthTime ).to.be.eql( fixture.birthTime );
                    expect( candidate.birthPlace ).to.be.eql( fixture.birthPlace );
                } );

            } );

            describe( 'given a name[], genderCode (string), birthTime and birthPlace', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            name: [
                                new PersonName( {
                                    family: ["test"]
                                } )
                            ],
                            administrativeGenderCode: AdministrativeGender.Male,
                            birthTime: new Time( "2021-12-12" ),
                            birthPlace: new BirthPlace( { place: { addr: { city: "TestStadt" } } } )
                        },
                        candidate = new Patient( fixture );
                    expect( candidate ).to.be.instanceOf( Patient );
                    expect( candidate.name ).to.be.eql( fixture.name );
                    expect( candidate.administrativeGenderCode ).to.be.eql( new Code( {
                        code: AdministrativeGender.Male,
                        codeSystem: CodeSystemTypes.AdministrativeGenderCodes,
                        codeValidation: AdministrativeGender
                    } ) );
                    expect( candidate.birthTime ).to.be.eql( fixture.birthTime );
                    expect( candidate.birthPlace ).to.be.eql( fixture.birthPlace );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        name: new PersonName( {
                            family: ["test"]
                        } ),
                        administrativeGenderCode: new Code( {
                            code: AdministrativeGender.Male,
                            codeSystem: CodeSystemTypes.AdministrativeGenderCodes,
                            codeValidation: AdministrativeGender
                        } ),
                        birthTime: new Time( "2021-12-12" ),
                        birthPlace: new BirthPlace( { place: { addr: { city: "TestStadt" } } } )
                    },
                    candidate = new Patient( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    name: [fixture.name.toXMLObject()],
                    administrativeGenderCode: fixture.administrativeGenderCode.toXMLObject(),
                    birthTime: fixture.birthTime.toXMLObject( Patient.FORMAT_BIRTHTIME ),
                    birthplace: fixture.birthPlace.toXMLObject()
                } );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "name": [
                            { "family": ["Pappel"] }
                        ],
                        "administrativeGenderCode": [
                            { "$": { "code": "M", "codeSystem": "2.16.840.1.113883.5.1" } }
                        ],
                        "birthTime": [
                            { "$": { "value": "19551217" } }
                        ],
                        "birthplace": [
                            { "place": [{ "addr": [{ "city": ["Sassnitz"] }] }] }
                        ]
                    },
                    candidate = Patient.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( Patient );
                expect( candidate.name ).to.be.eql( [PersonName.fromXMLObject( fixture.name[0] )] );
                expect( candidate.administrativeGenderCode ).to.be.eql( Code.fromXMLObject( fixture.administrativeGenderCode[0] ) );
                expect( candidate.birthTime ).to.be.eql( Time.fromXMLObject( fixture.birthTime[0] ) );
                expect( candidate.birthPlace ).to.be.eql( BirthPlace.fromXMLObject( fixture.birthplace[0] ) );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        administrativeGenderCode: AdministrativeGender.Male,
                        name: {
                            family: "Hafer"
                        },
                        birthTime: "1945-06-01"
                    },
                    candidate = new Patient( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<patient>' +
                    '<name>' +
                    '<family>Hafer</family>' +
                    '</name>' +
                    '<administrativeGenderCode code="M" codeSystem="2.16.840.1.113883.5.1"/>' +
                    '<birthTime value="19450601"/>' +
                    '</patient>'
                );
            } );

        } );

    } );

    describe( 'PatientRole', function() {

        it( 'is a class', function() {
            expect( typeof PatientRole ).to.equal( "function" );
            expect( typeof PatientRole.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given an id, addr, telecom and patient', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            id: new InstanceIdentifier( { root: "test", extension: "testExt" } ),
                            patient: new Patient( {
                                name: new PersonName( {
                                    family: ["test"]
                                } ),
                                administrativeGenderCode: new Code( {
                                    code: AdministrativeGender.Male,
                                    codeSystem: CodeSystemTypes.AdministrativeGenderCodes,
                                    codeValidation: AdministrativeGender
                                } ),
                                birthTime: new Time( "2021-12-12" ),
                                birthPlace: new BirthPlace( { place: { addr: { city: "TestStadt" } } } )
                            } ),
                            addr: new Address( { city: "TestStadt" } ),
                            telecom: new Telecommunication( {
                                type: TelecommunicationType.tel,
                                value: "030.456.345345"
                            } ),
                            providerOrganization: new Organization( {
                                name: "test"
                            } )
                        },
                        candidate = new PatientRole( fixture );
                    expect( candidate ).to.be.instanceOf( PatientRole );
                    expect( candidate.id ).to.be.eql( [fixture.id] );
                    expect( candidate.patient ).to.be.eql( fixture.patient );
                    expect( candidate.addr ).to.be.eql( [fixture.addr] );
                    expect( candidate.telecom ).to.be.eql( [fixture.telecom] );
                    expect( candidate.providerOrganization ).to.be.eql( fixture.providerOrganization );
                } );

            } );

            describe( 'given an id[], addr[], telecom[] and patient', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            id: [new InstanceIdentifier( { root: "test", extension: "testExt" } )],
                            patient: new Patient( {
                                name: new PersonName( {
                                    family: ["test"]
                                } ),
                                administrativeGenderCode: new Code( {
                                    code: AdministrativeGender.Male,
                                    codeSystem: CodeSystemTypes.AdministrativeGenderCodes,
                                    codeValidation: AdministrativeGender
                                } ),
                                birthTime: new Time( "2021-12-12" ),
                                birthPlace: new BirthPlace( { place: { addr: { city: "TestStadt" } } } )
                            } ),
                            addr: [new Address( { city: "TestStadt" } )],
                            telecom: [
                                new Telecommunication( {
                                    type: TelecommunicationType.tel,
                                    value: "030.456.345345"
                                } )
                            ],
                            providerOrganization: new Organization( {
                                name: "test"
                            } )
                        },
                        candidate = new PatientRole( fixture );
                    expect( candidate ).to.be.instanceOf( PatientRole );
                    expect( candidate.id ).to.be.eql( fixture.id );
                    expect( candidate.patient ).to.be.eql( fixture.patient );
                    expect( candidate.addr ).to.be.eql( fixture.addr );
                    expect( candidate.telecom ).to.be.eql( fixture.telecom );
                    expect( candidate.providerOrganization ).to.be.eql( fixture.providerOrganization );
                } );

            } );

            describe( 'given no id', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new PatientRole( {} );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        id: new InstanceIdentifier( { root: "test", extension: "testExt" } ),
                        patient: new Patient( {
                            name: new PersonName( {
                                family: ["test"]
                            } ),
                            administrativeGenderCode: new Code( {
                                code: AdministrativeGender.Male,
                                codeSystem: CodeSystemTypes.AdministrativeGenderCodes,
                                codeValidation: AdministrativeGender
                            } ),
                            birthTime: new Time( "2021-12-12" ),
                            birthPlace: new BirthPlace( { place: { addr: { city: "TestStadt" } } } )
                        } ),
                        addr: new Address( { city: "TestStadt" } ),
                        telecom: new Telecommunication( {
                            type: TelecommunicationType.tel,
                            value: "030.456.345345"
                        } ),
                        providerOrganization: new Organization( {
                            name: "test"
                        } )
                    },
                    candidate = new PatientRole( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    id: [fixture.id.toXMLObject()],
                    addr: [fixture.addr.toXMLObject()],
                    telecom: [fixture.telecom.toXMLObject()],
                    patient: fixture.patient.toXMLObject(),
                    providerOrganization: fixture.providerOrganization.toXMLObject()
                } );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "id": [
                            { "$": { "extension": "1543627549", "root": "1.2.276.0.76.4.1" } }
                        ],
                        "addr": [
                            {
                                "streetAddressLine": ["Riedemannweg 59"],
                                "postalCode": ["13627"],
                                "city": ["Berlin"]
                            }
                        ],
                        "telecom": [
                            { "$": { "use": "HP", "value": "tel:030.456.345345" } }
                        ],
                        "patient": [
                            {
                                "name": [
                                    { "family": ["Pappel"] }
                                ],
                                "administrativeGenderCode": [
                                    { "$": { "code": "M", "codeSystem": "2.16.840.1.113883.5.1" } }
                                ],
                                "birthTime": [
                                    { "$": { "value": "19551217" } }
                                ],
                                "birthplace": [
                                    { "place": [{ "addr": [{ "city": ["Sassnitz"] }] }] }
                                ]
                            }
                        ]
                    },
                    candidate = PatientRole.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( PatientRole );
                expect( candidate.id ).to.be.eql( [InstanceIdentifier.fromXMLObject( fixture.id[0] )] );
                expect( candidate.addr ).to.be.eql( [Address.fromXMLObject( fixture.addr[0] )] );
                expect( candidate.telecom ).to.be.eql( [Telecommunication.fromXMLObject( fixture.telecom[0] )] );
                expect( candidate.patient ).to.be.eql( Patient.fromXMLObject( fixture.patient[0] ) );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        id: new InstanceIdentifier( { root: "1.2.276.0.76.4.1", extension: "1543627549" } ),
                        patient: new Patient( {
                            name: new PersonName( {
                                family: ["Pappel"]
                            } ),
                            administrativeGenderCode: new Code( {
                                code: AdministrativeGender.Male,
                                codeSystem: CodeSystemTypes.AdministrativeGenderCodes,
                                codeValidation: AdministrativeGender
                            } ),
                            birthTime: new Time( "1955-12-17" ),
                            birthPlace: new BirthPlace( { place: { addr: { city: "Sassnitz" } } } )
                        } ),
                        addr: new Address( { city: "Berlin" } ),
                        telecom: new Telecommunication( {
                            type: TelecommunicationType.tel,
                            value: "030.456.345345"
                        } )
                    },
                    candidate = new PatientRole( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<patientRole>' +
                    '<id extension="1543627549" root="1.2.276.0.76.4.1"/>' +
                    '<addr>' +
                    '<city>Berlin</city>' +
                    '</addr>' +
                    '<telecom value="tel:030.456.345345"/>' +
                    '<patient>' +
                    '<name>' +
                    '<family>Pappel</family>' +
                    '</name>' +
                    '<administrativeGenderCode code="M" codeSystem="2.16.840.1.113883.5.1"/>' +
                    '<birthTime value="19551217"/>' +
                    '<birthplace>' +
                    '<place>' +
                    '<addr>' +
                    '<city>Sassnitz</city>' +
                    '</addr>' +
                    '</place>' +
                    '</birthplace>' +
                    '</patient>' +
                    '</patientRole>'
                );
            } );

        } );

    } );

    describe( 'RecordTarget', function() {

        it( 'is a class', function() {
            expect( typeof RecordTarget ).to.equal( "function" );
            expect( typeof RecordTarget.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given a patient role', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            patientRole: new PatientRole( {
                                id: new InstanceIdentifier( { root: "test", extension: "testExt" } ),
                                patient: new Patient( {
                                    name: new PersonName( {
                                        family: ["test"]
                                    } ),
                                    administrativeGenderCode: new Code( {
                                        code: AdministrativeGender.Male,
                                        codeSystem: CodeSystemTypes.AdministrativeGenderCodes,
                                        codeValidation: AdministrativeGender
                                    } ),
                                    birthTime: new Time( "2021-12-12" ),
                                    birthPlace: new BirthPlace( { place: { addr: { city: "TestStadt" } } } )
                                } ),
                                addr: new Address( { city: "TestStadt" } ),
                                telecom: new Telecommunication( {
                                    type: TelecommunicationType.tel,
                                    value: "030.456.345345"
                                } ),
                                providerOrganization: new Organization( {
                                    name: "test"
                                } )
                            } )
                        },
                        candidate = new RecordTarget( fixture );
                    expect( candidate ).to.be.instanceOf( RecordTarget );
                    expect( candidate.patientRole ).to.be.eql( [fixture.patientRole] );
                } );

            } );

            describe( 'given no patient role', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new RecordTarget( {} );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        patientRole: new PatientRole( {
                            id: new InstanceIdentifier( { root: "test", extension: "testExt" } ),
                            patient: new Patient( {
                                name: new PersonName( {
                                    family: ["test"]
                                } ),
                                administrativeGenderCode: new Code( {
                                    code: AdministrativeGender.Male,
                                    codeSystem: CodeSystemTypes.AdministrativeGenderCodes,
                                    codeValidation: AdministrativeGender
                                } ),
                                birthTime: new Time( "2021-12-12" ),
                                birthPlace: new BirthPlace( { place: { addr: { city: "TestStadt" } } } )
                            } ),
                            addr: new Address( { city: "TestStadt" } ),
                            telecom: new Telecommunication( {
                                type: TelecommunicationType.tel,
                                value: "030.456.345345"
                            } ),
                            providerOrganization: new Organization( {
                                name: "test"
                            } )
                        } )
                    },
                    candidate = new RecordTarget( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    patientRole: [fixture.patientRole.toXMLObject()]
                } );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "patientRole": [
                            {
                                "id": [{ "$": { "extension": "1543627549", "root": "1.2.276.0.76.4.1" } }],
                                "addr": [{ "city": ["Berlin"] }],
                                "telecom": [{ "$": { "use": "HP", "value": "tel:030.456.345345" } }],
                                "patient": [
                                    {
                                        "name": [{ "family": ["Pappel"] }],
                                        "administrativeGenderCode": [
                                            { "$": { "code": "M", "codeSystem": "2.16.840.1.113883.5.1" } }
                                        ],
                                        "birthTime": [{ "$": { "value": "19551217" } }],
                                        "birthplace": [{ "place": [{ "addr": [{ "city": ["Sassnitz"] }] }] }]
                                    }
                                ]
                            }
                        ]
                    },
                    candidate = RecordTarget.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( RecordTarget );
                expect( candidate.patientRole ).to.be.eql( [PatientRole.fromXMLObject( fixture.patientRole[0] )] );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        patientRole: new PatientRole( {
                            id: new InstanceIdentifier( { root: "1.2.276.0.76.4.1", extension: "1543627549" } ),
                            patient: new Patient( {
                                name: new PersonName( { family: ["Pappel"] } ),
                                administrativeGenderCode: new Code( {
                                    code: AdministrativeGender.Male,
                                    codeSystem: CodeSystemTypes.AdministrativeGenderCodes,
                                    codeValidation: AdministrativeGender
                                } ),
                                birthTime: new Time( "1955-12-17" ),
                                birthPlace: new BirthPlace( { place: { addr: { city: "Sassnitz" } } } )
                            } ),
                            addr: new Address( { city: "Berlin" } ),
                            telecom: new Telecommunication( {
                                type: TelecommunicationType.tel,
                                value: "030.456.345345"
                            } )
                        } )
                    },
                    candidate = new RecordTarget( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<recordTarget>' +
                    '<patientRole>' +
                    '<id extension="1543627549" root="1.2.276.0.76.4.1"/>' +
                    '<addr>' +
                    '<city>Berlin</city>' +
                    '</addr>' +
                    '<telecom value="tel:030.456.345345"/>' +
                    '<patient>' +
                    '<name>' +
                    '<family>Pappel</family>' +
                    '</name>' +
                    '<administrativeGenderCode code="M" codeSystem="2.16.840.1.113883.5.1"/>' +
                    '<birthTime value="19551217"/>' +
                    '<birthplace>' +
                    '<place>' +
                    '<addr>' +
                    '<city>Sassnitz</city>' +
                    '</addr>' +
                    '</place>' +
                    '</birthplace>' +
                    '</patient>' +
                    '</patientRole>' +
                    '</recordTarget>'
                );
            } );

        } );

    } );

    describe( 'OrganizationName', function() {

        it( 'is a class', function() {
            expect( typeof OrganizationName ).to.equal( "function" );
            expect( typeof OrganizationName.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given a name (object)', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            name: "Test"
                        },
                        candidate = new OrganizationName( fixture );
                    expect( candidate ).to.be.instanceOf( OrganizationName );
                    expect( candidate.name ).to.be.equal( fixture.name );
                } );

            } );

            describe( 'given a name (string)', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = "Test",
                        candidate = new OrganizationName( fixture );
                    expect( candidate ).to.be.instanceOf( OrganizationName );
                    expect( candidate.name ).to.be.equal( fixture );
                } );

            } );

            describe( 'given no name', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new OrganizationName( {} );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        name: "test"
                    },
                    candidate = new OrganizationName( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( { _: fixture.name } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = new OrganizationName( {
                        name: "Praxis Dr. Heitmann"
                    } ),
                    candidate = fixture.toXMLString();

                expect( candidate ).to.be.equal( '<name>Praxis Dr. Heitmann</name>' );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = "Praxis Dr. med. Phyllin",
                    candidate = OrganizationName.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( OrganizationName );
                expect( candidate.name ).to.be.equal( fixture );
            } );

        } );

    } );

    describe( 'Organization', function() {

        it( 'is a class', function() {
            expect( typeof Organization ).to.equal( "function" );
            expect( typeof Organization.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given a name but no id, telecom or address', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            name: "Test"
                        },
                        candidate = new Organization( fixture );
                    expect( candidate ).to.be.instanceOf( Organization );
                    expect( candidate.id ).to.be.eql( [] );
                    expect( candidate.name ).to.be.eql( [new OrganizationName( fixture.name )] );
                    expect( candidate.addr ).to.be.eql( [new Address( { nullFlavor: NullFlavorType.Unknown } )] );
                    expect( candidate.telecom ).to.be.eql( [new Telecommunication( { type: NullFlavorType.Unknown } )] );
                } );

            } );

            describe( 'given a name, an id, a telecom and address', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            name: new OrganizationName( "test" ),
                            id: new InstanceIdentifier( {
                                root: "test",
                                extension: "testExt"
                            } ),
                            addr: new Address( { streetName: "test" } ),
                            telecom: new Telecommunication( {
                                type: TelecommunicationType.tel,
                                value: "0123456"
                            } )
                        },
                        candidate = new Organization( fixture );
                    expect( candidate ).to.be.instanceOf( Organization );
                    expect( candidate.id ).to.be.eql( [fixture.id] );
                    expect( candidate.name ).to.be.eql( [fixture.name] );
                    expect( candidate.addr ).to.be.eql( [fixture.addr] );
                    expect( candidate.telecom ).to.be.eql( [fixture.telecom] );
                } );

            } );

            describe( 'given no name', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new Organization( {} );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        name: new OrganizationName( "Praxis Dr. med. Phyllin" ),
                        telecom: [
                            new Telecommunication( {
                                use: PostalAddressUse.WorkPlace,
                                value: "0214.2127070",
                                type: TelecommunicationType.tel
                            } ),
                            new Telecommunication( {
                                use: PostalAddressUse.WorkPlace,
                                value: "0214.212707122",
                                type: TelecommunicationType.tel
                            } )
                        ],
                        addr: new Address( {
                            streetName: "Krankenhausstraße",
                            houseNumber: "240",
                            postalCode: "51371",
                            city: "Leverkusen"
                        } )
                    },
                    candidate = new Organization( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    "name": [fixture.name.toXMLObject()],
                    "telecom": fixture.telecom.map( i => i.toXMLObject() ),
                    "addr": [fixture.addr.toXMLObject()]
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        name: "Praxis Dr. med. Phyllin",
                        telecom: [
                            {
                                use: PostalAddressUse.WorkPlace,
                                value: "0214.2127070",
                                type: TelecommunicationType.tel
                            },
                            {
                                use: PostalAddressUse.WorkPlace,
                                value: "0214.212707122",
                                type: TelecommunicationType.tel
                            }
                        ],
                        addr:
                            {
                                streetName: "Krankenhausstraße",
                                houseNumber: "240",
                                postalCode: "51371",
                                city: "Leverkusen"
                            }
                    },
                    candidate = new Organization( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<organization>' +
                    '<name>Praxis Dr. med. Phyllin</name>' +
                    '<telecom use="WP" value="tel:0214.2127070"/>' +
                    '<telecom use="WP" value="tel:0214.212707122"/>' +
                    '<addr>' +
                    '<streetName>Krankenhausstraße</streetName>' +
                    '<houseNumber>240</houseNumber>' +
                    '<postalCode>51371</postalCode>' +
                    '<city>Leverkusen</city>' +
                    '</addr>' +
                    '</organization>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "name": [
                            "Praxis Dr. med. Phyllin"
                        ],
                        "telecom": [
                            { "$": { "use": "WP", "value": "tel:0214.2127070" } },
                            { "$": { "use": "WP", "value": "tel:0214.212707122" } }
                        ],
                        "addr": [
                            {
                                "streetName": ["Krankenhausstraße"],
                                "houseNumber": ["240"],
                                "postalCode": ["51371"],
                                "city": ["Leverkusen"]
                            }
                        ]
                    },
                    candidate = Organization.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( Organization );
                expect( candidate.name ).to.be.eql( [OrganizationName.fromXMLObject( fixture.name[0] )] );
                expect( candidate.telecom ).to.be.eql( fixture.telecom.map( item => Telecommunication.fromXMLObject( item ) ) );
                expect( candidate.addr ).to.be.eql( [Address.fromXMLObject( fixture.addr[0] )] );
                expect( candidate.id ).to.be.eql( [] );
            } );

        } );

    } );

    describe( 'CustodianOrganization', function() {

        it( 'is a class', function() {
            expect( typeof CustodianOrganization ).to.equal( "function" );
            expect( typeof CustodianOrganization.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given no id, telecom or address', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new CustodianOrganization( { name: "Test" } );
                    } ).to.throw( TypeError );
                } );

            } );

            describe( 'given a name, an id, a telecom and address', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            name: new OrganizationName( "test" ),
                            id: new InstanceIdentifier( {
                                root: "test",
                                extension: "testExt"
                            } ),
                            addr: new Address( { streetName: "test" } ),
                            telecom: new Telecommunication( {
                                type: TelecommunicationType.tel,
                                value: "0123456"
                            } )
                        },
                        candidate = new CustodianOrganization( fixture );
                    expect( candidate ).to.be.instanceOf( CustodianOrganization );
                    expect( candidate.id ).to.be.eql( [fixture.id] );
                    expect( candidate.name ).to.be.eql( [fixture.name] );
                    expect( candidate.addr ).to.be.eql( [fixture.addr] );
                    expect( candidate.telecom ).to.be.eql( [fixture.telecom] );
                } );

            } );

            describe( 'given no name', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new CustodianOrganization( {} );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        id: new InstanceIdentifier( {
                            root: "test",
                            extension: "testExt"
                        } ),
                        name: new OrganizationName( "Praxis Dr. med. Phyllin" ),
                        telecom: [
                            new Telecommunication( {
                                use: PostalAddressUse.WorkPlace,
                                value: "0214.2127070",
                                type: TelecommunicationType.tel
                            } ),
                            new Telecommunication( {
                                use: PostalAddressUse.WorkPlace,
                                value: "0214.212707122",
                                type: TelecommunicationType.tel
                            } )
                        ],
                        addr: new Address( {
                            streetName: "Krankenhausstraße",
                            houseNumber: "240",
                            postalCode: "51371",
                            city: "Leverkusen"
                        } )
                    },
                    candidate = new CustodianOrganization( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    "id": [fixture.id.toXMLObject()],
                    "name": [fixture.name.toXMLObject()],
                    "telecom": fixture.telecom.map( i => i.toXMLObject() ),
                    "addr": [fixture.addr.toXMLObject()]
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        id: new InstanceIdentifier( {
                            root: "test",
                            extension: "testExt"
                        } ),
                        name: "Praxis Dr. med. Phyllin",
                        telecom: [
                            {
                                use: PostalAddressUse.WorkPlace,
                                value: "0214.2127070",
                                type: TelecommunicationType.tel
                            }
                        ],
                        addr: {
                            streetName: "Krankenhausstraße",
                            houseNumber: "240",
                            postalCode: "51371",
                            city: "Leverkusen"
                        }
                    },
                    candidate = new CustodianOrganization( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<custodianOrganization>' +
                    '<id extension="testExt" root="test"/>' +
                    '<name>Praxis Dr. med. Phyllin</name>' +
                    '<telecom use="WP" value="tel:0214.2127070"/>' +
                    '<addr>' +
                    '<streetName>Krankenhausstraße</streetName>' +
                    '<houseNumber>240</houseNumber>' +
                    '<postalCode>51371</postalCode>' +
                    '<city>Leverkusen</city>' +
                    '</addr>' +
                    '</custodianOrganization>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "id": [
                            { "$": { "extension": "ied8984938", "root": "2.16.840.1.113883.3.67.933" } }
                        ],
                        "name": [
                            "Praxis Dr. med. Phyllin"
                        ],
                        "telecom": [
                            { "$": { "use": "WP", "value": "tel:0214.2127070" } },
                            { "$": { "use": "WP", "value": "tel:0214.212707122" } }
                        ],
                        "addr": [
                            {
                                "streetName": ["Krankenhausstraße"],
                                "houseNumber": ["240"],
                                "postalCode": ["51371"],
                                "city": ["Leverkusen"]
                            }
                        ]
                    },
                    candidate = CustodianOrganization.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( CustodianOrganization );
                expect( candidate.name ).to.be.eql( [OrganizationName.fromXMLObject( fixture.name[0] )] );
                expect( candidate.telecom ).to.be.eql( fixture.telecom.map( item => Telecommunication.fromXMLObject( item ) ) );
                expect( candidate.addr ).to.be.eql( [Address.fromXMLObject( fixture.addr[0] )] );
                expect( candidate.id ).to.be.eql( [InstanceIdentifier.fromXMLObject( fixture.id[0] )] );
            } );

        } );

    } );

    describe( 'AssignedCustodian', function() {

        it( 'is a class', function() {
            expect( typeof AssignedCustodian ).to.equal( "function" );
            expect( typeof AssignedCustodian.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given a representedCustodianOrganization', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            representedCustodianOrganization: new CustodianOrganization( {
                                id: new InstanceIdentifier( {
                                    root: "test",
                                    extension: "testExt"
                                } ),
                                name: "Wohlsein Krankenhaus",
                                telecom: [
                                    {
                                        use: PostalAddressUse.WorkPlace,
                                        value: "0242127070",
                                        type: TelecommunicationType.tel
                                    }
                                ],
                                addr: {
                                    streetName: "Krankenhausstraße",
                                    houseNumber: "240",
                                    postalCode: "51371",
                                    city: "Leverkusen"
                                }
                            } )
                        },
                        candidate = new AssignedCustodian( fixture );
                    expect( candidate ).to.be.instanceOf( AssignedCustodian );
                    expect( candidate.representedCustodianOrganization ).to.be.eql( new CustodianOrganization( fixture.representedCustodianOrganization ) );
                } );

            } );

            describe( 'given no representedCustodianOrganization', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new AssignedCustodian( {} );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        representedCustodianOrganization: new CustodianOrganization( {
                            id: new InstanceIdentifier( {
                                root: "test",
                                extension: "testExt"
                            } ),
                            name: "Wohlsein Krankenhaus",
                            telecom: [
                                {
                                    use: PostalAddressUse.WorkPlace,
                                    value: "0242127070",
                                    type: TelecommunicationType.tel
                                }
                            ],
                            addr: {
                                streetName: "Krankenhausstraße",
                                houseNumber: "240",
                                postalCode: "51371",
                                city: "Leverkusen"
                            }
                        } )
                    },
                    candidate = new AssignedCustodian( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    "representedCustodianOrganization": fixture.representedCustodianOrganization.toXMLObject()
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        representedCustodianOrganization: new CustodianOrganization( {
                            id: new InstanceIdentifier( {
                                root: "test",
                                extension: "testExt"
                            } ),
                            name: "Wohlsein Krankenhaus",
                            telecom: [
                                {
                                    use: PostalAddressUse.WorkPlace,
                                    value: "0242127070",
                                    type: TelecommunicationType.tel
                                }
                            ],
                            addr: {
                                streetName: "Krankenhausstraße",
                                houseNumber: "240",
                                postalCode: "51371",
                                city: "Leverkusen"
                            }
                        } )
                    },
                    candidate = new AssignedCustodian( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<assignedCustodian>' +
                    '<representedCustodianOrganization>' +
                    '<id extension="testExt" root="test"/>' +
                    '<name>Wohlsein Krankenhaus</name>' +
                    '<telecom use="WP" value="tel:0242127070"/>' +
                    '<addr>' +
                    '<streetName>Krankenhausstraße</streetName>' +
                    '<houseNumber>240</houseNumber>' +
                    '<postalCode>51371</postalCode>' +
                    '<city>Leverkusen</city>' +
                    '</addr>' +
                    '</representedCustodianOrganization>' +
                    '</assignedCustodian>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "representedCustodianOrganization": [
                            {
                                "id": [
                                    { "$": { "extension": "ied8984938", "root": "2.16.840.1.113883.3.67.933" } }
                                ],
                                "name": ["Praxis Dr. med. Phyllin"],
                                "telecom": [
                                    { "$": { "use": "WP", "value": "tel:0214.2127070" } },
                                    { "$": { "use": "WP", "value": "tel:0214.212707122" } }
                                ],
                                "addr": [
                                    {
                                        "streetName": ["Krankenhausstraße"],
                                        "houseNumber": ["240"],
                                        "postalCode": ["51371"],
                                        "city": ["Leverkusen"]
                                    }
                                ]
                            }
                        ]
                    },
                    candidate = AssignedCustodian.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( AssignedCustodian );
                expect( candidate.representedCustodianOrganization ).to.be.eql( CustodianOrganization.fromXMLObject( fixture.representedCustodianOrganization[0] ) );
            } );

        } );

    } );

    describe( 'Custodian', function() {

        it( 'is a class', function() {
            expect( typeof Custodian ).to.equal( "function" );
            expect( typeof Custodian.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given an assignedCustodian', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            assignedCustodian: {
                                representedCustodianOrganization: new CustodianOrganization( {
                                    id: new InstanceIdentifier( {
                                        root: "test",
                                        extension: "testExt"
                                    } ),
                                    name: "Wohlsein Krankenhaus",
                                    telecom: [
                                        {
                                            use: PostalAddressUse.WorkPlace,
                                            value: "0242127070",
                                            type: TelecommunicationType.tel
                                        }
                                    ],
                                    addr: {
                                        streetName: "Krankenhausstraße",
                                        houseNumber: "240",
                                        postalCode: "51371",
                                        city: "Leverkusen"
                                    }
                                } )
                            }
                        },
                        candidate = new Custodian( fixture );
                    expect( candidate ).to.be.instanceOf( Custodian );
                    expect( candidate.assignedCustodian ).to.be.eql( new AssignedCustodian( fixture.assignedCustodian ) );
                } );

            } );

            describe( 'given no assignedCustodian', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new Custodian( {} );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        assignedCustodian: new AssignedCustodian( {
                            representedCustodianOrganization: new CustodianOrganization( {
                                id: new InstanceIdentifier( {
                                    root: "test",
                                    extension: "testExt"
                                } ),
                                name: "Wohlsein Krankenhaus",
                                telecom: [
                                    {
                                        use: PostalAddressUse.WorkPlace,
                                        value: "0242127070",
                                        type: TelecommunicationType.tel
                                    }
                                ],
                                addr: {
                                    streetName: "Krankenhausstraße",
                                    houseNumber: "240",
                                    postalCode: "51371",
                                    city: "Leverkusen"
                                }
                            } )
                        } )
                    },
                    candidate = new Custodian( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    "assignedCustodian": fixture.assignedCustodian.toXMLObject()
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        assignedCustodian: {
                            representedCustodianOrganization: new CustodianOrganization( {
                                id: new InstanceIdentifier( {
                                    root: "test",
                                    extension: "testExt"
                                } ),
                                name: "Wohlsein Krankenhaus",
                                telecom: [
                                    {
                                        use: PostalAddressUse.WorkPlace,
                                        value: "0242127070",
                                        type: TelecommunicationType.tel
                                    }
                                ],
                                addr: {
                                    streetName: "Krankenhausstraße",
                                    houseNumber: "240",
                                    postalCode: "51371",
                                    city: "Leverkusen"
                                }
                            } )
                        }
                    },
                    candidate = new Custodian( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<custodian>' +
                    '<assignedCustodian>' +
                    '<representedCustodianOrganization>' +
                    '<id extension="testExt" root="test"/>' +
                    '<name>Wohlsein Krankenhaus</name>' +
                    '<telecom use="WP" value="tel:0242127070"/>' +
                    '<addr>' +
                    '<streetName>Krankenhausstraße</streetName>' +
                    '<houseNumber>240</houseNumber>' +
                    '<postalCode>51371</postalCode>' +
                    '<city>Leverkusen</city>' +
                    '</addr>' +
                    '</representedCustodianOrganization>' +
                    '</assignedCustodian>' +
                    '</custodian>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "assignedCustodian": [
                            {
                                "representedCustodianOrganization": [
                                    {
                                        "id": [
                                            { "$": { "extension": "ied8984938", "root": "2.16.840.1.113883.3.67.933" } }
                                        ],
                                        "name": ["Praxis Dr. med. Phyllin"],
                                        "telecom": [
                                            { "$": { "use": "WP", "value": "tel:0214.2127070" } },
                                            { "$": { "use": "WP", "value": "tel:0214.212707122" } }
                                        ],
                                        "addr": [
                                            {
                                                "streetName": ["Krankenhausstraße"],
                                                "houseNumber": ["240"],
                                                "postalCode": ["51371"],
                                                "city": ["Leverkusen"]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    candidate = Custodian.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( Custodian );
                expect( candidate.assignedCustodian ).to.be.eql( AssignedCustodian.fromXMLObject( fixture.assignedCustodian[0] ) );
            } );

        } );

    } );

    describe( 'IntendedRecipient', function() {

        it( 'is a class', function() {
            expect( typeof IntendedRecipient ).to.equal( "function" );
            expect( typeof IntendedRecipient.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given an id, an informationRecipient and a receivedOrganization (single objects)', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            id: new InstanceIdentifier( {
                                extension: "190388km89",
                                root: "2.16.840.1.113883.3.24535"
                            } ),
                            informationRecipient: new Person( {
                                name: {
                                    family: "Phyllin"
                                }
                            } ),
                            receivedOrganization: new Organization( {
                                name: "Wohlsein Krankenhaus",
                                telecom: [
                                    {
                                        use: PostalAddressUse.WorkPlace,
                                        value: "0242127070",
                                        type: TelecommunicationType.tel
                                    }
                                ],
                                addr: {
                                    streetName: "Krankenhausstraße",
                                    houseNumber: "240",
                                    postalCode: "51371",
                                    city: "Leverkusen"
                                }
                            } )
                        },
                        candidate = new IntendedRecipient( fixture );
                    expect( candidate ).to.be.instanceOf( IntendedRecipient );
                    expect( candidate.id ).to.be.eql( [fixture.id] );
                    expect( candidate.informationRecipient ).to.be.eql( fixture.informationRecipient );
                    expect( candidate.receivedOrganization ).to.be.eql( fixture.receivedOrganization );
                    expect( candidate.addr ).to.be.eql( [] );
                    expect( candidate.telecom ).to.be.eql( [] );
                } );

            } );

            describe( 'given an id, an informationRecipient and a receivedOrganization (array of objects)', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            id: [
                                new InstanceIdentifier( { extension: "190388km89", root: "2.16.840.1.113883.3.24535" } )
                            ],
                            informationRecipient: new Person( { name: { family: "Phyllin" } } ),
                            receivedOrganization: new Organization( {
                                name: "Wohlsein Krankenhaus",
                                telecom: [
                                    {
                                        use: PostalAddressUse.WorkPlace,
                                        value: "0242127070",
                                        type: TelecommunicationType.tel
                                    }
                                ],
                                addr: {
                                    streetName: "Krankenhausstraße",
                                    houseNumber: "240",
                                    postalCode: "51371",
                                    city: "Leverkusen"
                                }
                            } )
                        },
                        candidate = new IntendedRecipient( fixture );
                    expect( candidate ).to.be.instanceOf( IntendedRecipient );
                    expect( candidate.id ).to.be.eql( fixture.id );
                    expect( candidate.informationRecipient ).to.be.eql( fixture.informationRecipient );
                    expect( candidate.receivedOrganization ).to.be.eql( fixture.receivedOrganization );
                    expect( candidate.addr ).to.be.eql( [] );
                    expect( candidate.telecom ).to.be.eql( [] );
                } );

            } );

            describe( 'given no id', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new IntendedRecipient( {} );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        id: new InstanceIdentifier( {
                            extension: "190388km89",
                            root: "2.16.840.1.113883.3.24535"
                        } ),
                        informationRecipient: new Person( {
                            name: {
                                family: "Phyllin"
                            }
                        } ),
                        receivedOrganization: new Organization( {
                            name: "Wohlsein Krankenhaus",
                            telecom: [
                                {
                                    use: PostalAddressUse.WorkPlace,
                                    value: "0242127070",
                                    type: TelecommunicationType.tel
                                }
                            ],
                            addr: {
                                streetName: "Krankenhausstraße",
                                houseNumber: "240",
                                postalCode: "51371",
                                city: "Leverkusen"
                            }
                        } )
                    },
                    candidate = new IntendedRecipient( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    "id": [fixture.id.toXMLObject()],
                    "informationRecipient": fixture.informationRecipient.toXMLObject(),
                    "receivedOrganization": fixture.receivedOrganization.toXMLObject()
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        id: {
                            extension: "190388km89",
                            root: "2.16.840.1.113883.3.24535"
                        },
                        informationRecipient: {
                            name: {
                                family: "Phyllin"
                            }
                        },
                        receivedOrganization: {
                            name: "Wohlsein Krankenhaus",
                            telecom: [
                                {
                                    use: PostalAddressUse.WorkPlace,
                                    value: "0242127070",
                                    type: TelecommunicationType.tel
                                }
                            ],
                            addr: {
                                streetName: "Krankenhausstraße",
                                houseNumber: "240",
                                postalCode: "51371",
                                city: "Leverkusen"
                            }
                        }
                    },
                    candidate = new IntendedRecipient( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<intendedRecipient>' +
                    '<id extension="190388km89" root="2.16.840.1.113883.3.24535"/>' +
                    '<informationRecipient>' +
                    '<name>' +
                    '<family>Phyllin</family>' +
                    '</name>' +
                    '</informationRecipient>' +
                    '<receivedOrganization>' +
                    '<name>Wohlsein Krankenhaus</name>' +
                    '<telecom use="WP" value="tel:0242127070"/>' +
                    '<addr>' +
                    '<streetName>Krankenhausstraße</streetName>' +
                    '<houseNumber>240</houseNumber>' +
                    '<postalCode>51371</postalCode>' +
                    '<city>Leverkusen</city>' +
                    '</addr>' +
                    '</receivedOrganization>' +
                    '</intendedRecipient>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "id": [
                            { "$": { "extension": "ied8984938", "root": "2.16.840.1.113883.3.67.933" } }
                        ],
                        "informationRecipient": [
                            {
                                "name": [
                                    { "family": ["Phyllin"] }
                                ]
                            }
                        ],
                        "receivedOrganization": [
                            {
                                "name": ["Praxis Dr. med. Phyllin"],
                                "telecom": [
                                    { "$": { "use": "WP", "value": "tel:0214.2127070" } },
                                    { "$": { "use": "WP", "value": "tel:0214.212707122" } }
                                ],
                                "addr": [
                                    {
                                        "streetName": ["Krankenhausstraße"],
                                        "houseNumber": ["240"],
                                        "postalCode": ["51371"],
                                        "city": ["Leverkusen"]
                                    }
                                ]
                            }
                        ]
                    },
                    candidate = IntendedRecipient.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( IntendedRecipient );
                expect( candidate.id ).to.be.eql( [InstanceIdentifier.fromXMLObject( fixture.id[0] )] );
                expect( candidate.informationRecipient ).to.be.eql( Person.fromXMLObject( fixture.informationRecipient[0] ) );
                expect( candidate.receivedOrganization ).to.be.eql( Organization.fromXMLObject( fixture.receivedOrganization[0] ) );
                expect( candidate.telecom ).to.be.eql( [] );
                expect( candidate.addr ).to.be.eql( [] );
            } );

        } );

    } );

    describe( 'InformationRecipient', function() {

        it( 'is a class', function() {
            expect( typeof InformationRecipient ).to.equal( "function" );
            expect( typeof InformationRecipient.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given a typeCode and intendedRecipient (as object)', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            typeCode: InformationRecipientRole.PrimaryRecipient,
                            intendedRecipient: new IntendedRecipient( {
                                id: new InstanceIdentifier( {
                                    extension: "190388km89",
                                    root: "2.16.840.1.113883.3.24535"
                                } ),
                                informationRecipient: new Person( {
                                    name: {
                                        family: "Phyllin"
                                    }
                                } ),
                                receivedOrganization: new Organization( {
                                    name: "Wohlsein Krankenhaus",
                                    telecom: [
                                        {
                                            use: PostalAddressUse.WorkPlace,
                                            value: "0242127070",
                                            type: TelecommunicationType.tel
                                        }
                                    ],
                                    addr: {
                                        streetName: "Krankenhausstraße",
                                        houseNumber: "240",
                                        postalCode: "51371",
                                        city: "Leverkusen"
                                    }
                                } )
                            } )
                        },
                        candidate = new InformationRecipient( fixture );
                    expect( candidate ).to.be.instanceOf( InformationRecipient );
                    expect( candidate.intendedRecipient ).to.be.eql( [fixture.intendedRecipient] );
                    expect( candidate.typeCode ).to.be.equal( fixture.typeCode );
                } );

            } );

            describe( 'given no typeCode and an intendedRecipient (as array of objects)', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            intendedRecipient: [
                                new IntendedRecipient( {
                                    id: new InstanceIdentifier( {
                                        extension: "190388km89",
                                        root: "2.16.840.1.113883.3.24535"
                                    } ),
                                    informationRecipient: new Person( {
                                        name: {
                                            family: "Phyllin"
                                        }
                                    } ),
                                    receivedOrganization: new Organization( {
                                        name: "Wohlsein Krankenhaus",
                                        telecom: [
                                            {
                                                use: PostalAddressUse.WorkPlace,
                                                value: "0242127070",
                                                type: TelecommunicationType.tel
                                            }
                                        ],
                                        addr: {
                                            streetName: "Krankenhausstraße",
                                            houseNumber: "240",
                                            postalCode: "51371",
                                            city: "Leverkusen"
                                        }
                                    } )
                                } )
                            ]
                        },
                        candidate = new InformationRecipient( fixture );
                    expect( candidate ).to.be.instanceOf( InformationRecipient );
                    expect( candidate.intendedRecipient ).to.be.eql( fixture.intendedRecipient );
                    expect( candidate.typeCode ).to.be.equal( null );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        typeCode: InformationRecipientRole.PrimaryRecipient,
                        intendedRecipient: new IntendedRecipient( {
                            id: {
                                extension: "190388km89",
                                root: "2.16.840.1.113883.3.24535"
                            },
                            informationRecipient: {
                                name: {
                                    family: "Phyllin"
                                }
                            },
                            receivedOrganization: {
                                name: "Wohlsein Krankenhaus",
                                telecom: [
                                    {
                                        use: PostalAddressUse.WorkPlace,
                                        value: "0242127070",
                                        type: TelecommunicationType.tel
                                    }
                                ],
                                addr: {
                                    streetName: "Krankenhausstraße",
                                    houseNumber: "240",
                                    postalCode: "51371",
                                    city: "Leverkusen"
                                }
                            }
                        } )
                    },
                    candidate = new InformationRecipient( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    "$": { "typeCode": fixture.typeCode },
                    "intendedRecipient": [fixture.intendedRecipient.toXMLObject()]
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        typeCode: InformationRecipientRole.PrimaryRecipient,
                        intendedRecipient: {
                            id: {
                                extension: "4736437",
                                root: "2.16.840.1.113883.3.933"
                            },
                            informationRecipient: {
                                name: {
                                    family: "Phyllin"
                                }
                            },
                            receivedOrganization: {
                                name: "Wohlsein Krankenhaus",
                                telecom: [
                                    {
                                        use: PostalAddressUse.WorkPlace,
                                        value: "0242127070",
                                        type: TelecommunicationType.tel
                                    }
                                ],
                                addr: {
                                    streetName: "Krankenhausstraße",
                                    houseNumber: "240",
                                    postalCode: "51371",
                                    city: "Leverkusen"
                                }
                            }
                        }
                    },
                    candidate = new InformationRecipient( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<informationRecipient typeCode="PRCP">' +
                    '<intendedRecipient>' +
                    '<id extension="4736437" root="2.16.840.1.113883.3.933"/>' +
                    '<informationRecipient>' +
                    '<name>' +
                    '<family>Phyllin</family>' +
                    '</name>' +
                    '</informationRecipient>' +
                    '<receivedOrganization>' +
                    '<name>Wohlsein Krankenhaus</name>' +
                    '<telecom use="WP" value="tel:0242127070"/>' +
                    '<addr>' +
                    '<streetName>Krankenhausstraße</streetName>' +
                    '<houseNumber>240</houseNumber>' +
                    '<postalCode>51371</postalCode>' +
                    '<city>Leverkusen</city>' +
                    '</addr>' +
                    '</receivedOrganization>' +
                    '</intendedRecipient>' +
                    '</informationRecipient>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "$": { "typeCode": "PRCP" },
                        "intendedRecipient": [
                            {
                                "id": [
                                    { "$": { "extension": "ied8984938", "root": "2.16.840.1.113883.3.67.933" } }
                                ],
                                "informationRecipient": [
                                    {
                                        "name": [
                                            { "family": ["Phyllin"] }
                                        ]
                                    }
                                ],
                                "receivedOrganization": [
                                    {
                                        "name": ["Praxis Dr. med. Phyllin"],
                                        "telecom": [
                                            { "$": { "use": "WP", "value": "tel:0214.2127070" } },
                                            { "$": { "use": "WP", "value": "tel:0214.212707122" } }
                                        ],
                                        "addr": [
                                            {
                                                "streetName": ["Krankenhausstraße"],
                                                "houseNumber": ["240"],
                                                "postalCode": ["51371"],
                                                "city": ["Leverkusen"]
                                            }
                                        ]
                                    }
                                ]
                            }]
                    },
                    candidate = InformationRecipient.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( InformationRecipient );
                expect( candidate.typeCode ).to.be.eql( InformationRecipientRole.PrimaryRecipient );
                expect( candidate.intendedRecipient ).to.be.eql( [IntendedRecipient.fromXMLObject( fixture.intendedRecipient[0] )] );
            } );

        } );

    } );

    describe( 'Consent', function() {

        it( 'is a class', function() {
            expect( typeof Consent ).to.equal( "function" );
            expect( typeof Consent.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given an identifier and encounter code (Code object)', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            id: new InstanceIdentifier( {
                                root: "testRoot",
                                extension: "lalala"
                            } ),
                            code: new Code( {
                                code: EncounterCode.Ambulatory,
                                codeSystem: CodeSystemTypes.EncounterCode,
                                codeValidation: EncounterCode
                            } )
                        },
                        candidate = new Consent( fixture );
                    expect( candidate ).to.be.instanceOf( Consent );
                    expect( candidate.id ).to.be.eql( [fixture.id] );
                    expect( candidate.code ).to.be.eql( fixture.code );
                } );

            } );

            describe( 'given an identifier and encounter code (Code as string)', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            id: new InstanceIdentifier( {
                                root: "testRoot",
                                extension: "lalala"
                            } ),
                            code: EncounterCode.Ambulatory
                        },
                        candidate = new Consent( fixture );
                    expect( candidate ).to.be.instanceOf( Consent );
                    expect( candidate.id ).to.be.eql( [fixture.id] );
                    expect( candidate.code ).to.be.eql( new Code( {
                        code: EncounterCode.Ambulatory,
                        codeSystem: CodeSystemTypes.EncounterCode,
                        codeValidation: EncounterCode
                    } ) );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        id: new InstanceIdentifier( {
                            root: "1.2.276.0.76.3645.239",
                            extension: "cs856727-298784"
                        } ),
                        code: new Code( {
                            code: "3-00d",
                            codeSystem: "1.2.276.0.76.5.310"
                        } )
                    },
                    candidate = new Consent( fixture ).toXMLObject();

                expect( candidate ).to.be.eql(
                    {
                        id: [fixture.id.toXMLObject()],
                        code: fixture.code.toXMLObject(),
                        statusCode: { $: { code: "completed" } }
                    }
                );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        id: new InstanceIdentifier( {
                            root: "1.2.276.0.76.3645.239",
                            extension: "cs856727-298784"
                        } ),
                        code: new Code( {
                            code: "3-00d",
                            codeSystem: "1.2.276.0.76.5.310"
                        } )
                    },
                    candidate = new Consent( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<consent>' +
                    '<id extension="cs856727-298784" root="1.2.276.0.76.3645.239"/>' +
                    '<code code="3-00d" codeSystem="1.2.276.0.76.5.310"/>' +
                    '<statusCode code="completed"/>' +
                    '</consent>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        id: [
                            {
                                $: {
                                    root: "1.2.276.0.76.3645.239",
                                    extension: "cs856727-298784"
                                }
                            }
                        ],
                        code: [
                            {
                                $: {
                                    code: "3-00d",
                                    codeSystem: "1.2.276.0.76.5.310"
                                }
                            }
                        ],
                        statusCode: [{ $: { code: "completed" } }]
                    },
                    candidate = Consent.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( Consent );
                expect( candidate.id ).to.be.eql( [InstanceIdentifier.fromXMLObject( fixture.id[0] )] );
                expect( candidate.code ).to.be.eql( Code.fromXMLObject( fixture.code[0] ) );
            } );

        } );

    } );

    describe( 'Authorization', function() {

        it( 'is a class', function() {
            expect( typeof Authorization ).to.equal( "function" );
            expect( typeof Authorization.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given a consent (object)', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            consent: new Consent( {
                                id: new InstanceIdentifier( {
                                    root: "testRoot",
                                    extension: "lalala"
                                } ),
                                code: new Code( {
                                    code: EncounterCode.Ambulatory,
                                    codeSystem: CodeSystemTypes.EncounterCode,
                                    codeValidation: EncounterCode
                                } )
                            } )
                        },
                        candidate = new Authorization( fixture );
                    expect( candidate ).to.be.instanceOf( Authorization );
                    expect( candidate.consent ).to.be.eql( [fixture.consent] );
                } );

            } );

            describe( 'given a consent (object array)', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            consent: [
                                new Consent( {
                                    id: new InstanceIdentifier( {
                                        root: "testRoot",
                                        extension: "lalala"
                                    } ),
                                    code: new Code( {
                                        code: EncounterCode.Ambulatory,
                                        codeSystem: CodeSystemTypes.EncounterCode,
                                        codeValidation: EncounterCode
                                    } )
                                } )
                            ]
                        },
                        candidate = new Authorization( fixture );
                    expect( candidate ).to.be.instanceOf( Authorization );
                    expect( candidate.consent ).to.be.eql( [fixture.consent[0]] );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        consent: new Consent( {
                            id: new InstanceIdentifier( {
                                root: "1.2.276.0.76.3645.239",
                                extension: "cs856727-298784"
                            } ),
                            code: new Code( {
                                code: "3-00d",
                                codeSystem: "1.2.276.0.76.5.310"
                            } )
                        } )
                    },
                    candidate = new Authorization( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( { consent: [fixture.consent.toXMLObject()] }
                );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        consent: {
                            id: new InstanceIdentifier( {
                                root: "1.2.276.0.76.3645.239",
                                extension: "cs856727-298784"
                            } ),
                            code: new Code( {
                                code: "3-00d",
                                codeSystem: "1.2.276.0.76.5.310"
                            } )
                        }
                    },
                    candidate = new Authorization( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<authorization>' +
                    '<consent>' +
                    '<id extension="cs856727-298784" root="1.2.276.0.76.3645.239"/>' +
                    '<code code="3-00d" codeSystem="1.2.276.0.76.5.310"/>' +
                    '<statusCode code="completed"/>' +
                    '</consent>' +
                    '</authorization>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        consent: [
                            {
                                id: [{ $: { root: "1.2.276.0.76.3645.239", extension: "cs856727-298784" } }],
                                code: [{ $: { code: "3-00d", codeSystem: "1.2.276.0.76.5.310" } }],
                                statusCode: [{ $: { code: "completed" } }]
                            }
                        ]
                    },
                    candidate = Authorization.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( Authorization );
                expect( candidate.consent ).to.be.eql( [Consent.fromXMLObject( fixture.consent[0] )] );
            } );

        } );

    } );

    describe( 'HealthCareFacility', function() {

        it( 'is a class', function() {
            expect( typeof HealthCareFacility ).to.equal( "function" );
            expect( typeof HealthCareFacility.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given an identifier and encounter code (Code object)', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            id: new InstanceIdentifier( {
                                root: "testRoot",
                                extension: "lalala"
                            } ),
                            code: new Code( {
                                code: EncounterCode.Ambulatory,
                                codeSystem: CodeSystemTypes.EncounterCode,
                                codeValidation: EncounterCode
                            } ),
                            location: new Place( {
                                addr: new Address( {
                                    streetName: "test"
                                } )
                            } ),
                            serviceProviderOrganization: new Organization( {
                                name: "test"
                            } )
                        },
                        candidate = new HealthCareFacility( fixture );
                    expect( candidate ).to.be.instanceOf( HealthCareFacility );
                    expect( candidate.id ).to.be.eql( [fixture.id] );
                    expect( candidate.code ).to.be.eql( fixture.code );
                    expect( candidate.location ).to.be.eql( fixture.location );
                    expect( candidate.serviceProviderOrganization ).to.be.eql( fixture.serviceProviderOrganization );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        id: new InstanceIdentifier( {
                            root: "testRoot",
                            extension: "lalala"
                        } ),
                        code: new Code( {
                            code: EncounterCode.Ambulatory,
                            codeSystem: CodeSystemTypes.EncounterCode,
                            codeValidation: EncounterCode
                        } ),
                        location: new Place( {
                            addr: new Address( {
                                streetName: "test"
                            } )
                        } ),
                        serviceProviderOrganization: new Organization( {
                            name: "test"
                        } )
                    },
                    candidate = new HealthCareFacility( fixture ).toXMLObject();

                expect( candidate ).to.be.eql(
                    {
                        id: [fixture.id.toXMLObject()],
                        code: fixture.code.toXMLObject(),
                        location: fixture.location.toXMLObject(),
                        serviceProviderOrganization: fixture.serviceProviderOrganization.toXMLObject()
                    }
                );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        serviceProviderOrganization: new Organization( {
                            name: "Wohlmichgut Klinik",
                            addr: new Address( {
                                streetName: "Sundstraße"
                            } )
                        } )
                    },
                    candidate = new HealthCareFacility( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<healthCareFacility>' +
                    '<serviceProviderOrganization>' +
                    '<name>Wohlmichgut Klinik</name>' +
                    '<telecom nullFlavor="UNK"/>' +
                    '<addr>' +
                    '<streetName>Sundstraße</streetName>' +
                    '</addr>' +
                    '</serviceProviderOrganization>' +
                    '</healthCareFacility>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        id: [{ $: { root: "testRoot", extension: "lalala" } }],
                        code: [{ $: { code: "DX", codeSystem: "2.16.840.1.113883.1.11.17660" } }],
                        location: [{ addr: [{ streetName: ["testStr"] }] }],
                        serviceProviderOrganization: [{ name: ["test"] }]
                    },
                    candidate = HealthCareFacility.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( HealthCareFacility );
                expect( candidate.id ).to.be.eql( [InstanceIdentifier.fromXMLObject( fixture.id[0] )] );
                expect( candidate.code ).to.be.eql( Code.fromXMLObject( fixture.code[0] ) );
                expect( candidate.location ).to.be.eql( Place.fromXMLObject( fixture.location[0] ) );
                expect( candidate.serviceProviderOrganization ).to.be.eql( Organization.fromXMLObject( fixture.serviceProviderOrganization[0] ) );
            } );

        } );

    } );

    describe( 'Location', function() {

        it( 'is a class', function() {
            expect( typeof Location ).to.equal( "function" );
            expect( typeof Location.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given healthCareFacility', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            healthCareFacility: {
                                id: new InstanceIdentifier( {
                                    root: "testRoot",
                                    extension: "lalala"
                                } ),
                                code: new Code( {
                                    code: EncounterCode.Ambulatory,
                                    codeSystem: CodeSystemTypes.EncounterCode,
                                    codeValidation: EncounterCode
                                } ),
                                location: new Place( {
                                    addr: new Address( {
                                        streetName: "test"
                                    } )
                                } ),
                                serviceProviderOrganization: new Organization( {
                                    name: "test"
                                } )
                            }
                        },
                        candidate = new Location( fixture );
                    expect( candidate ).to.be.instanceOf( Location );
                    expect( candidate.healthCareFacility ).to.be.eql( new HealthCareFacility( fixture.healthCareFacility ) );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        healthCareFacility: new HealthCareFacility( {
                            id: new InstanceIdentifier( {
                                root: "testRoot",
                                extension: "lalala"
                            } ),
                            code: new Code( {
                                code: EncounterCode.Ambulatory,
                                codeSystem: CodeSystemTypes.EncounterCode,
                                codeValidation: EncounterCode
                            } ),
                            location: new Place( {
                                addr: new Address( {
                                    streetName: "test"
                                } )
                            } ),
                            serviceProviderOrganization: new Organization( {
                                name: "test"
                            } )
                        } )
                    },
                    candidate = new Location( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( { healthCareFacility: fixture.healthCareFacility.toXMLObject() } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        healthCareFacility: {
                            serviceProviderOrganization: new Organization( {
                                name: "Wohlmichgut Klinik",
                                addr: new Address( {
                                    streetName: "Sundstraße"
                                } )
                            } )
                        }
                    },
                    candidate = new Location( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<location>' +
                    '<healthCareFacility>' +
                    '<serviceProviderOrganization>' +
                    '<name>Wohlmichgut Klinik</name>' +
                    '<telecom nullFlavor="UNK"/>' +
                    '<addr>' +
                    '<streetName>Sundstraße</streetName>' +
                    '</addr>' +
                    '</serviceProviderOrganization>' +
                    '</healthCareFacility>' +
                    '</location>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        healthCareFacility: [
                            {
                                id: [{ $: { root: "testRoot", extension: "lalala" } }],
                                code: [{ $: { code: "DX", codeSystem: "2.16.840.1.113883.1.11.17660" } }],
                                location: [{ addr: [{ streetName: ["testStr"] }] }],
                                serviceProviderOrganization: [{ name: ["test"] }]
                            }
                        ]
                    },
                    candidate = Location.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( Location );
                expect( candidate.healthCareFacility ).to.be.eql( HealthCareFacility.fromXMLObject( fixture.healthCareFacility[0] ) );
            } );

        } );

    } );

    describe( 'AssignedPerson', function() {

        it( 'is a class', function() {
            expect( typeof AssignedPerson ).to.equal( "function" );
            expect( typeof AssignedPerson.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given PersonName', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            name: new PersonName( {
                                given: "Theo",
                                family: ["Phyllin"]
                            } )
                        },
                        candidate = new AssignedPerson( fixture );
                    expect( candidate ).to.be.instanceOf( AssignedPerson );
                    expect( candidate.name ).to.be.eql( [fixture.name] );
                } );

            } );

            describe( 'given PersonName[]', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            name: [
                                new PersonName( {
                                    given: "Theo",
                                    family: ["Phyllin"]
                                } )
                            ]
                        },
                        candidate = new AssignedPerson( fixture );
                    expect( candidate ).to.be.instanceOf( AssignedPerson );
                    expect( candidate.name ).to.be.eql( fixture.name );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        name: new PersonName( { family: ["Phyllin"] } )
                    },
                    candidate = new AssignedPerson( fixture ).toXMLObject();

                expect( candidate ).to.be.eql(
                    { name: [{ family: [{ _: 'Phyllin' }] }] }
                );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        name: new PersonName( {
                            prefix: new EntityNamePart( {
                                value: "Dr. med.",
                                qualifier: EntityNamePartQualifier.Academic
                            } ),
                            given: "Theo",
                            family: ["Phyllin"]
                        } )
                    },
                    candidate = new AssignedPerson( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<assignedPerson>' +
                    '<name>' +
                    '<prefix qualifier="AC">Dr. med.</prefix>' +
                    '<given>Theo</given>' +
                    '<family>Phyllin</family>' +
                    '</name>' +
                    '</assignedPerson>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "name": [{ "given": ["Theo"], "family": ["Phyllin"] }]
                    },
                    candidate = AssignedPerson.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( AssignedPerson );
                expect( candidate.name ).to.be.eql( [PersonName.fromXMLObject( fixture.name[0] )] );
            } );

        } );

    } );

    describe( 'AssignedAuthor', function() {

        it( 'is a class', function() {
            expect( typeof AssignedAuthor ).to.equal( "function" );
            expect( typeof AssignedAuthor.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given an id, an assignedPerson and a representedOrganization (single objects)', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            id: {
                                extension: "190388km89",
                                root: "2.16.840.1.113883.3.24535"
                            },
                            assignedPerson: {
                                name: {
                                    family: "Phyllin"
                                }
                            },
                            representedOrganization: {
                                name: "Wohlsein Krankenhaus",
                                telecom: [
                                    {
                                        use: PostalAddressUse.WorkPlace,
                                        value: "0242127070",
                                        type: TelecommunicationType.tel
                                    }
                                ],
                                addr: {
                                    streetName: "Krankenhausstraße",
                                    houseNumber: "240",
                                    postalCode: "51371",
                                    city: "Leverkusen"
                                }
                            }
                        },
                        candidate = new AssignedAuthor( fixture );
                    expect( candidate ).to.be.instanceOf( AssignedAuthor );
                    expect( candidate.id ).to.be.eql( [new InstanceIdentifier( fixture.id )] );
                    expect( candidate.assignedPerson ).to.be.eql( new AssignedPerson( fixture.assignedPerson ) );
                    expect( candidate.representedOrganization ).to.be.eql( new Organization( fixture.representedOrganization ) );
                    expect( candidate.addr ).to.be.eql( [] );
                    expect( candidate.telecom ).to.be.eql( [] );
                } );

            } );

            describe( 'given an id, an assignedPerson and a representedOrganization (array of objects)', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            id: [
                                { extension: "190388km89", root: "2.16.840.1.113883.3.24535" }
                            ],
                            assignedPerson: { name: { family: "Phyllin" } },
                            representedOrganization: {
                                name: "Wohlsein Krankenhaus",
                                telecom: [
                                    {
                                        use: PostalAddressUse.WorkPlace,
                                        value: "0242127070",
                                        type: TelecommunicationType.tel
                                    }
                                ],
                                addr: {
                                    streetName: "Krankenhausstraße",
                                    houseNumber: "240",
                                    postalCode: "51371",
                                    city: "Leverkusen"
                                }
                            }
                        },
                        candidate = new AssignedAuthor( fixture );
                    expect( candidate ).to.be.instanceOf( AssignedAuthor );
                    expect( candidate.id ).to.be.eql( [new InstanceIdentifier( fixture.id[0] )] );
                    expect( candidate.assignedPerson ).to.be.eql( new AssignedPerson( fixture.assignedPerson ) );
                    expect( candidate.representedOrganization ).to.be.eql( new Organization( fixture.representedOrganization ) );
                    expect( candidate.addr ).to.be.eql( [] );
                    expect( candidate.telecom ).to.be.eql( [] );
                } );

            } );

            describe( 'given no id but an assignedPerson', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new AssignedAuthor( {
                            assignedPerson: new AssignedPerson( {
                                name: "test"
                            } )
                        } );
                    } ).to.throw( TypeError );
                } );

            } );

            describe( 'given no assignedPerson but an id', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new AssignedAuthor( {
                            id: new InstanceIdentifier( {
                                root: "test",
                                extension: "testExt"
                            } )
                        } );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        id: {
                            extension: "190388km89",
                            root: "2.16.840.1.113883.3.24535"
                        },
                        assignedPerson: {
                            name: {
                                family: "Phyllin"
                            }
                        },
                        representedOrganization: {
                            name: "Wohlsein Krankenhaus",
                            telecom: [
                                {
                                    use: PostalAddressUse.WorkPlace,
                                    value: "0242127070",
                                    type: TelecommunicationType.tel
                                }
                            ],
                            addr: {
                                streetName: "Krankenhausstraße",
                                houseNumber: "240",
                                postalCode: "51371",
                                city: "Leverkusen"
                            }
                        }
                    },
                    candidate = new AssignedAuthor( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    "id": [{ "$": { "extension": "190388km89", "root": "2.16.840.1.113883.3.24535" } }],
                    "assignedPerson": {
                        "name": [{ "family": [{ "_": "Phyllin" }] }]
                    },
                    "representedOrganization": {
                        "name": [{ "_": "Wohlsein Krankenhaus" }],
                        "telecom": [{ "$": { "use": "WP", "value": "tel:0242127070" } }],
                        "addr": [
                            {
                                "streetName": { "_": "Krankenhausstraße" },
                                "houseNumber": { "_": "240" },
                                "postalCode": { "_": "51371" },
                                "city": { "_": "Leverkusen" }
                            }
                        ]
                    }
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        id: {
                            extension: "190388km89",
                            root: "2.16.840.1.113883.3.24535"
                        },
                        assignedPerson: {
                            name: {
                                family: "Phyllin"
                            }
                        },
                        representedOrganization: {
                            name: "Wohlsein Krankenhaus",
                            telecom: [
                                {
                                    use: PostalAddressUse.WorkPlace,
                                    value: "0242127070",
                                    type: TelecommunicationType.tel
                                }
                            ],
                            addr: {
                                streetName: "Krankenhausstraße",
                                houseNumber: "240",
                                postalCode: "51371",
                                city: "Leverkusen"
                            }
                        }
                    },
                    candidate = new AssignedAuthor( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<assignedAuthor>' +
                    '<id extension="190388km89" root="2.16.840.1.113883.3.24535"/>' +
                    '<assignedPerson>' +
                    '<name>' +
                    '<family>Phyllin</family>' +
                    '</name>' +
                    '</assignedPerson>' +
                    '<representedOrganization>' +
                    '<name>Wohlsein Krankenhaus</name>' +
                    '<telecom use="WP" value="tel:0242127070"/>' +
                    '<addr>' +
                    '<streetName>Krankenhausstraße</streetName>' +
                    '<houseNumber>240</houseNumber>' +
                    '<postalCode>51371</postalCode>' +
                    '<city>Leverkusen</city>' +
                    '</addr>' +
                    '</representedOrganization>' +
                    '</assignedAuthor>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "id": [
                            { "$": { "extension": "ied8984938", "root": "2.16.840.1.113883.3.67.933" } }
                        ],
                        "assignedPerson": [
                            {
                                "name": [
                                    { "family": ["Phyllin"] }
                                ]
                            }
                        ],
                        "representedOrganization": [
                            {
                                "name": ["Praxis Dr. med. Phyllin"],
                                "telecom": [
                                    { "$": { "use": "WP", "value": "tel:0214.2127070" } },
                                    { "$": { "use": "WP", "value": "tel:0214.212707122" } }
                                ],
                                "addr": [
                                    {
                                        "streetName": ["Krankenhausstraße"],
                                        "houseNumber": ["240"],
                                        "postalCode": ["51371"],
                                        "city": ["Leverkusen"]
                                    }
                                ]
                            }
                        ]
                    },
                    candidate = AssignedAuthor.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( AssignedAuthor );
                expect( candidate.id ).to.be.eql( [InstanceIdentifier.fromXMLObject( fixture.id[0] )] );
                expect( candidate.assignedPerson ).to.be.eql( AssignedPerson.fromXMLObject( fixture.assignedPerson[0] ) );
                expect( candidate.representedOrganization ).to.be.eql( Organization.fromXMLObject( fixture.representedOrganization[0] ) );
                expect( candidate.telecom ).to.be.eql( [] );
                expect( candidate.addr ).to.be.eql( [] );
            } );

        } );

    } );

    describe( 'Author', function() {

        it( 'is a class', function() {
            expect( typeof Author ).to.equal( "function" );
            expect( typeof Author.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given a time and an assignedAuthor and function code', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            assignedAuthor: new AssignedAuthor( {
                                id: {
                                    extension: "190388km89",
                                    root: "2.16.840.1.113883.3.24535"
                                },
                                assignedPerson: {
                                    name: {
                                        family: "Phyllin"
                                    }
                                },
                                representedOrganization: {
                                    name: "Wohlsein Krankenhaus",
                                    telecom: [
                                        {
                                            use: PostalAddressUse.WorkPlace,
                                            value: "0242127070",
                                            type: TelecommunicationType.tel
                                        }
                                    ],
                                    addr: {
                                        streetName: "Krankenhausstraße",
                                        houseNumber: "240",
                                        postalCode: "51371",
                                        city: "Leverkusen"
                                    }
                                }
                            } ),
                            time: new Time( "2021-10-21" ),
                            functionCode: new Code( {
                                code: ParticipationType.Admitter,
                                codeSystem: CodeSystemTypes.ParticipationType,
                                codeValidation: ParticipationType
                            } )
                        },
                        candidate = new Author( fixture );
                    expect( candidate ).to.be.instanceOf( Author );
                    expect( candidate.time ).to.be.eql( fixture.time );
                    expect( candidate.assignedAuthor ).to.be.eql( fixture.assignedAuthor );
                    expect( candidate.functionCode ).to.be.eql( fixture.functionCode );
                } );

            } );

            describe( 'given no assignedAuthor but a time', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new Author( {
                            time: "2021-10-21"
                        } );
                    } ).to.throw( TypeError );
                } );

            } );

            describe( 'given no time but an assignedAuthor', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new Author( {
                            assignedAuthor: new AssignedAuthor( {
                                id: new InstanceIdentifier( {
                                    root: "test",
                                    extension: "testExt"
                                } ),
                                assignedPerson: new AssignedPerson( {
                                    name: { given: "test" }
                                } )
                            } )
                        } );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        time: "2021-12-22",
                        assignedAuthor: {
                            id: {
                                extension: "190388km89",
                                root: "2.16.840.1.113883.3.24535"
                            },
                            assignedPerson: {
                                name: {
                                    family: "Phyllin"
                                }
                            },
                            representedOrganization: {
                                name: "Wohlsein Krankenhaus",
                                telecom: [
                                    {
                                        value: "0242127070",
                                        type: TelecommunicationType.tel
                                    }
                                ],
                                addr: {
                                    streetName: "Krankenhausstraße"
                                }
                            }
                        }
                    },
                    candidate = new Author( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    "time": { "$": { "value": "202112220000" } },
                    "assignedAuthor": {
                        "id": [{ "$": { "extension": "190388km89", "root": "2.16.840.1.113883.3.24535" } }],
                        "assignedPerson": {
                            "name": [{ "family": [{ "_": "Phyllin" }] }]
                        },
                        "representedOrganization": {
                            "name": [{ "_": "Wohlsein Krankenhaus" }],
                            "telecom": [{ "$": { "value": "tel:0242127070" } }],
                            "addr": [
                                {
                                    "streetName": { "_": "Krankenhausstraße" }
                                }
                            ]
                        }
                    }
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        time: "2005-08-29",
                        assignedAuthor: {
                            id: {
                                extension: "190388km89",
                                root: "2.16.840.1.113883.3.24535"
                            },
                            assignedPerson: {
                                name: {
                                    family: "Phyllin"
                                }
                            },
                            representedOrganization: {
                                name: "Wohlsein Krankenhaus",
                                telecom: [
                                    {
                                        use: PostalAddressUse.WorkPlace,
                                        value: "0242127070",
                                        type: TelecommunicationType.tel
                                    }
                                ],
                                addr: {
                                    streetName: "Krankenhausstraße"
                                }
                            }
                        }
                    },
                    candidate = new Author( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<author>' +
                    '<time value="200508290000"/>' +
                    '<assignedAuthor>' +
                    '<id extension="190388km89" root="2.16.840.1.113883.3.24535"/>' +
                    '<assignedPerson>' +
                    '<name>' +
                    '<family>Phyllin</family>' +
                    '</name>' +
                    '</assignedPerson>' +
                    '<representedOrganization>' +
                    '<name>Wohlsein Krankenhaus</name>' +
                    '<telecom use="WP" value="tel:0242127070"/>' +
                    '<addr>' +
                    '<streetName>Krankenhausstraße</streetName>' +
                    '</addr>' +
                    '</representedOrganization>' +
                    '</assignedAuthor>' +
                    '</author>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "time": [{ "value": "20201210" }],
                        "assignedAuthor": [
                            {
                                "id": [{ "$": { "extension": "ied8984938", "root": "2.16.840.1.113883.3.67.933" } }],
                                "assignedPerson": [
                                    { "name": [{ "family": ["Phyllin"] }] }
                                ],
                                "representedOrganization": [
                                    {
                                        "name": ["Praxis Dr. med. Phyllin"],
                                        "telecom": [
                                            { "$": { "use": "WP", "value": "tel:0214.2127070" } }
                                        ],
                                        "addr": [
                                            {
                                                "streetName": ["Krankenhausstraße"]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    candidate = Author.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( Author );
                expect( candidate.assignedAuthor ).to.be.eql( AssignedAuthor.fromXMLObject( fixture.assignedAuthor[0] ) );
                expect( candidate.time ).to.be.eql( Time.fromXMLObject( fixture.time[0] ) );
                expect( candidate.functionCode ).to.be.eql( null );
            } );

        } );

    } );

    describe( 'AssignedEntity', function() {

        it( 'is a class', function() {
            expect( typeof AssignedEntity ).to.equal( "function" );
            expect( typeof AssignedEntity.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given an id, an assignedPerson and a representedOrganization (single objects)', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            id: {
                                extension: "190388km89",
                                root: "2.16.840.1.113883.3.24535"
                            },
                            assignedPerson: {
                                name: {
                                    family: "Phyllin"
                                }
                            },
                            representedOrganization: {
                                name: "Wohlsein Krankenhaus",
                                telecom: [
                                    {
                                        use: PostalAddressUse.WorkPlace,
                                        value: "0242127070",
                                        type: TelecommunicationType.tel
                                    }
                                ],
                                addr: {
                                    streetName: "Krankenhausstraße",
                                    houseNumber: "240",
                                    postalCode: "51371",
                                    city: "Leverkusen"
                                }
                            }
                        },
                        candidate = new AssignedEntity( fixture );
                    expect( candidate ).to.be.instanceOf( AssignedEntity );
                    expect( candidate.id ).to.be.eql( [new InstanceIdentifier( fixture.id )] );
                    expect( candidate.assignedPerson ).to.be.eql( new AssignedPerson( fixture.assignedPerson ) );
                    expect( candidate.representedOrganization ).to.be.eql( new Organization( fixture.representedOrganization ) );
                    expect( candidate.addr ).to.be.eql( [] );
                    expect( candidate.telecom ).to.be.eql( [] );
                } );

            } );

            describe( 'given an id, an assignedPerson and a representedOrganization (array of objects)', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            id: [
                                { extension: "190388km89", root: "2.16.840.1.113883.3.24535" }
                            ],
                            assignedPerson: { name: { family: "Phyllin" } },
                            representedOrganization: {
                                name: "Wohlsein Krankenhaus",
                                telecom: [
                                    {
                                        use: PostalAddressUse.WorkPlace,
                                        value: "0242127070",
                                        type: TelecommunicationType.tel
                                    }
                                ],
                                addr: {
                                    streetName: "Krankenhausstraße",
                                    houseNumber: "240",
                                    postalCode: "51371",
                                    city: "Leverkusen"
                                }
                            }
                        },
                        candidate = new AssignedEntity( fixture );
                    expect( candidate ).to.be.instanceOf( AssignedEntity );
                    expect( candidate.id ).to.be.eql( [new InstanceIdentifier( fixture.id[0] )] );
                    expect( candidate.assignedPerson ).to.be.eql( new AssignedPerson( fixture.assignedPerson ) );
                    expect( candidate.representedOrganization ).to.be.eql( new Organization( fixture.representedOrganization ) );
                    expect( candidate.addr ).to.be.eql( [] );
                    expect( candidate.telecom ).to.be.eql( [] );
                } );

            } );

            describe( 'given no id but an assignedPerson', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new AssignedEntity( {
                            assignedPerson: new AssignedPerson( {
                                name: "test"
                            } )
                        } );
                    } ).to.throw( TypeError );
                } );

            } );

            describe( 'given no assignedPerson but an id', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new AssignedEntity( {
                            id: new InstanceIdentifier( {
                                root: "test",
                                extension: "testExt"
                            } )
                        } );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        id: new InstanceIdentifier( {
                            extension: "190388km89",
                            root: "2.16.840.1.113883.3.24535"
                        } ),
                        assignedPerson: new AssignedPerson( {
                            name: {
                                family: "Phyllin"
                            }
                        } ),
                        representedOrganization: new Organization( {
                            name: "Wohlsein Krankenhaus",
                            telecom: [
                                {
                                    use: PostalAddressUse.WorkPlace,
                                    value: "0242127070",
                                    type: TelecommunicationType.tel
                                }
                            ],
                            addr: {
                                streetName: "Krankenhausstraße",
                                houseNumber: "240",
                                postalCode: "51371",
                                city: "Leverkusen"
                            }
                        } )
                    },
                    candidate = new AssignedEntity( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    "id": [fixture.id.toXMLObject()],
                    "assignedPerson": fixture.assignedPerson.toXMLObject(),
                    "representedOrganization": fixture.representedOrganization.toXMLObject()
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        id: {
                            extension: "190388km89",
                            root: "2.16.840.1.113883.3.24535"
                        },
                        assignedPerson: {
                            name: {
                                family: "Phyllin"
                            }
                        },
                        representedOrganization: {
                            name: "Wohlsein Krankenhaus",
                            telecom: [
                                {
                                    use: PostalAddressUse.WorkPlace,
                                    value: "0242127070",
                                    type: TelecommunicationType.tel
                                }
                            ],
                            addr: {
                                streetName: "Krankenhausstraße",
                                houseNumber: "240",
                                postalCode: "51371",
                                city: "Leverkusen"
                            }
                        }
                    },
                    candidate = new AssignedEntity( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<assignedEntity>' +
                    '<id extension="190388km89" root="2.16.840.1.113883.3.24535"/>' +
                    '<assignedPerson>' +
                    '<name>' +
                    '<family>Phyllin</family>' +
                    '</name>' +
                    '</assignedPerson>' +
                    '<representedOrganization>' +
                    '<name>Wohlsein Krankenhaus</name>' +
                    '<telecom use="WP" value="tel:0242127070"/>' +
                    '<addr>' +
                    '<streetName>Krankenhausstraße</streetName>' +
                    '<houseNumber>240</houseNumber>' +
                    '<postalCode>51371</postalCode>' +
                    '<city>Leverkusen</city>' +
                    '</addr>' +
                    '</representedOrganization>' +
                    '</assignedEntity>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "id": [
                            { "$": { "extension": "ied8984938", "root": "2.16.840.1.113883.3.67.933" } }
                        ],
                        "assignedPerson": [
                            {
                                "name": [
                                    { "family": ["Phyllin"] }
                                ]
                            }
                        ],
                        "representedOrganization": [
                            {
                                "name": ["Praxis Dr. med. Phyllin"],
                                "telecom": [
                                    { "$": { "use": "WP", "value": "tel:0214.2127070" } },
                                    { "$": { "use": "WP", "value": "tel:0214.212707122" } }
                                ],
                                "addr": [
                                    {
                                        "streetName": ["Krankenhausstraße"],
                                        "houseNumber": ["240"],
                                        "postalCode": ["51371"],
                                        "city": ["Leverkusen"]
                                    }
                                ]
                            }
                        ]
                    },
                    candidate = AssignedEntity.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( AssignedEntity );
                expect( candidate.id ).to.be.eql( [InstanceIdentifier.fromXMLObject( fixture.id[0] )] );
                expect( candidate.assignedPerson ).to.be.eql( AssignedPerson.fromXMLObject( fixture.assignedPerson[0] ) );
                expect( candidate.representedOrganization ).to.be.eql( Organization.fromXMLObject( fixture.representedOrganization[0] ) );
                expect( candidate.telecom ).to.be.eql( [] );
                expect( candidate.addr ).to.be.eql( [] );
            } );

        } );

    } );

    describe( 'ResponsibleParty', function() {

        it( 'is a class', function() {
            expect( typeof ResponsibleParty ).to.equal( "function" );
            expect( typeof ResponsibleParty.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given an assignedEntity', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            assignedEntity: new AssignedEntity( {
                                id: {
                                    extension: "190388km89",
                                    root: "2.16.840.1.113883.3.24535"
                                },
                                assignedPerson: {
                                    name: {
                                        family: "Phyllin"
                                    }
                                },
                                representedOrganization: {
                                    name: "Wohlsein Krankenhaus",
                                    telecom: [
                                        {
                                            use: PostalAddressUse.WorkPlace,
                                            value: "0242127070",
                                            type: TelecommunicationType.tel
                                        }
                                    ],
                                    addr: {
                                        streetName: "Krankenhausstraße",
                                        houseNumber: "240",
                                        postalCode: "51371",
                                        city: "Leverkusen"
                                    }
                                }
                            } )
                        },
                        candidate = new ResponsibleParty( fixture );
                    expect( candidate ).to.be.instanceOf( ResponsibleParty );
                    expect( candidate.assignedEntity ).to.be.eql( fixture.assignedEntity );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        assignedEntity: new AssignedEntity( {
                            id: {
                                extension: "190388km89",
                                root: "2.16.840.1.113883.3.24535"
                            },
                            assignedPerson: {
                                name: {
                                    family: "Phyllin"
                                }
                            },
                            representedOrganization: {
                                name: "Wohlsein Krankenhaus",
                                telecom: [
                                    {
                                        use: PostalAddressUse.WorkPlace,
                                        value: "0242127070",
                                        type: TelecommunicationType.tel
                                    }
                                ],
                                addr: {
                                    streetName: "Krankenhausstraße",
                                    houseNumber: "240",
                                    postalCode: "51371",
                                    city: "Leverkusen"
                                }
                            }
                        } )
                    },
                    candidate = new ResponsibleParty( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    "assignedEntity": fixture.assignedEntity.toXMLObject()
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        assignedEntity: new AssignedEntity( {
                            id: {
                                extension: "190388km89",
                                root: "2.16.840.1.113883.3.24535"
                            },
                            assignedPerson: {
                                name: {
                                    family: "Phyllin"
                                }
                            },
                            representedOrganization: {
                                name: "Wohlsein Krankenhaus",
                                telecom: [
                                    {
                                        use: PostalAddressUse.WorkPlace,
                                        value: "0242127070",
                                        type: TelecommunicationType.tel
                                    }
                                ],
                                addr: {
                                    streetName: "Krankenhausstraße",
                                    houseNumber: "240",
                                    postalCode: "51371",
                                    city: "Leverkusen"
                                }
                            }
                        } )
                    },
                    candidate = new ResponsibleParty( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<responsibleParty>' +
                    '<assignedEntity>' +
                    '<id extension="190388km89" root="2.16.840.1.113883.3.24535"/>' +
                    '<assignedPerson>' +
                    '<name>' +
                    '<family>Phyllin</family>' +
                    '</name>' +
                    '</assignedPerson>' +
                    '<representedOrganization>' +
                    '<name>Wohlsein Krankenhaus</name>' +
                    '<telecom use="WP" value="tel:0242127070"/>' +
                    '<addr>' +
                    '<streetName>Krankenhausstraße</streetName>' +
                    '<houseNumber>240</houseNumber>' +
                    '<postalCode>51371</postalCode>' +
                    '<city>Leverkusen</city>' +
                    '</addr>' +
                    '</representedOrganization>' +
                    '</assignedEntity>' +
                    '</responsibleParty>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "assignedEntity": [
                            {
                                "id": [
                                    { "$": { "extension": "ied8984938", "root": "2.16.840.1.113883.3.67.933" } }
                                ],
                                "assignedPerson": [
                                    {
                                        "name": [
                                            { "family": ["Phyllin"] }
                                        ]
                                    }
                                ],
                                "representedOrganization": [
                                    {
                                        "name": ["Praxis Dr. med. Phyllin"],
                                        "telecom": [
                                            { "$": { "use": "WP", "value": "tel:0214.2127070" } },
                                            { "$": { "use": "WP", "value": "tel:0214.212707122" } }
                                        ],
                                        "addr": [
                                            {
                                                "streetName": ["Krankenhausstraße"],
                                                "houseNumber": ["240"],
                                                "postalCode": ["51371"],
                                                "city": ["Leverkusen"]
                                            }
                                        ]
                                    }
                                ]
                            }]
                    },
                    candidate = ResponsibleParty.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( ResponsibleParty );
                expect( candidate.assignedEntity ).to.be.eql( AssignedEntity.fromXMLObject( fixture.assignedEntity[0] ) );
            } );

        } );

    } );

    describe( 'Authenticator', function() {

        it( 'is a class', function() {
            expect( typeof Authenticator ).to.equal( "function" );
            expect( typeof Authenticator.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given an a time and signature code', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            time: "2020-12-11",
                            signatureCode: new Code( {
                                code: ParticipationSignature.Signed,
                                codeValidation: ParticipationSignature
                            } )
                        },
                        candidate = new Authenticator( fixture );
                    expect( candidate ).to.be.instanceOf( Authenticator );
                    expect( candidate.time ).to.be.eql( new Time( fixture.time ) );
                    expect( candidate.signatureCode ).to.be.eql( fixture.signatureCode );
                    expect( candidate.assignedEntity ).to.be.eql( [] );
                } );

            } );

            describe( 'given no signatureCode but a time', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new Authenticator( {
                            time: "2020-12-20"
                        } );
                    } ).to.throw( TypeError );
                } );

            } );

            describe( 'given no time but a signatureCode', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new Authenticator( {
                            signatureCode: new Code( {
                                code: ParticipationSignature.Signed,
                                codeValidation: ParticipationSignature
                            } )
                        } );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        time: new Time( "2006-07-21" ),
                        signatureCode: new Code( {
                            code: ParticipationSignature.Signed,
                            codeValidation: ParticipationSignature
                        } ),
                        assignedEntity: new AssignedEntity( {
                            id: {
                                extension: "190388km89",
                                root: "2.16.840.1.113883.3.24535"
                            },
                            assignedPerson: { name: { family: "Phyllin" } },
                            representedOrganization: {
                                name: "Wohlsein Krankenhaus",
                                telecom: [{ value: "0242127070", type: TelecommunicationType.tel }],
                                addr: { city: "Leverkusen" }
                            }
                        } )
                    },
                    candidate = new Authenticator( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    "time": fixture.time.toXMLObject(),
                    "signatureCode": fixture.signatureCode.toXMLObject(),
                    "assignedEntity": [fixture.assignedEntity.toXMLObject()]
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        time: "2006-07-21",
                        signatureCode: new Code( {
                            code: ParticipationSignature.Signed,
                            codeValidation: ParticipationSignature
                        } ),
                        assignedEntity: {
                            id: {
                                extension: "6319123",
                                root: "2.16.840.1.113883.3.933"
                            },
                            assignedPerson: {
                                name: { family: "Topp-Glücklich" }
                            },
                            representedOrganization: {
                                name: "Dr.med. Hans Topp-Glücklich",
                                telecom: [
                                    {
                                        value: "061512222222",
                                        type: TelecommunicationType.fax
                                    }
                                ],
                                addr: {
                                    city: "Darmstadt"
                                }
                            }
                        }
                    },
                    candidate = new Authenticator( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<authenticator>' +
                    '<time value="200607210000"/>' +
                    '<signatureCode code="S"/>' +
                    '<assignedEntity>' +
                    '<id extension="6319123" root="2.16.840.1.113883.3.933"/>' +
                    '<assignedPerson>' +
                    '<name>' +
                    '<family>Topp-Glücklich</family>' +
                    '</name>' +
                    '</assignedPerson>' +
                    '<representedOrganization>' +
                    '<name>Dr.med. Hans Topp-Glücklich</name>' +
                    '<telecom value="fax:061512222222"/>' +
                    '<addr>' +
                    '<city>Darmstadt</city>' +
                    '</addr>' +
                    '</representedOrganization>' +
                    '</assignedEntity>' +
                    '</authenticator>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "time": [{ "$": { "value": "20151104" } }],
                        "signatureCode": [{ "$": { "code": "S" } }],
                        "assignedEntity": [
                            {
                                "id": [{ "$": { "extension": "ied8984938", "root": "2.16.840.1.113883.3.67.933" } }],
                                "assignedPerson": [{ "name": [{ "family": ["Phyllin"] }] }],
                                "representedOrganization": [
                                    {
                                        "name": ["Praxis Dr. med. Phyllin"],
                                        "telecom": [{ "$": { "use": "WP", "value": "tel:0214.212707122" } }],
                                        "addr": [{ "city": ["Leverkusen"] }]
                                    }
                                ]
                            }
                        ]
                    },
                    candidate = Authenticator.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( Authenticator );
                expect( candidate.assignedEntity ).to.be.eql( [AssignedEntity.fromXMLObject( fixture.assignedEntity[0] )] );
                expect( candidate.signatureCode ).to.be.eql( Code.fromXMLObject( fixture.signatureCode[0] ) );
                expect( candidate.time ).to.be.eql( Time.fromXMLObject( fixture.time[0] ) );
            } );

        } );

    } );

    describe( 'EncounterParticipant', function() {

        it( 'is a class', function() {
            expect( typeof EncounterParticipant ).to.equal( "function" );
            expect( typeof EncounterParticipant.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given an a time and an assignedEntity', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            time: new Time( "2020-12-11" ),
                            typeCode: EncounterParticipantType.Admitter,
                            assignedEntity: new AssignedEntity( {
                                id: {
                                    extension: "190388km89",
                                    root: "2.16.840.1.113883.3.24535"
                                },
                                assignedPerson: { name: { family: "Phyllin" } },
                                representedOrganization: {
                                    name: "Wohlsein Krankenhaus",
                                    telecom: [{ value: "0242127070", type: TelecommunicationType.tel }],
                                    addr: { city: "Leverkusen" }
                                }
                            } )
                        },
                        candidate = new EncounterParticipant( fixture );
                    expect( candidate ).to.be.instanceOf( EncounterParticipant );
                    expect( candidate.time ).to.be.eql( fixture.time );
                    expect( candidate.assignedEntity ).to.be.eql( [fixture.assignedEntity] );
                } );

            } );

            describe( 'given a time, a typeCode but no assignedEntity', function() {

                it( 'throws a TypeError', function() {
                    const
                        fixture = {
                            time: new Time( "2020-12-11" ),
                            typeCode: EncounterParticipantType.Admitter
                        };
                    expect( () => {
                        return new EncounterParticipant( fixture );
                    } ).to.throw( TypeError );
                } );

            } );

            describe( 'given a time, an assignedEntity but no typeCode', function() {

                it( 'throws a TypeError', function() {
                    const
                        fixture = {
                            time: new Time( "2020-12-11" ),
                            assignedEntity: new AssignedEntity( {
                                id: {
                                    extension: "190388km89",
                                    root: "2.16.840.1.113883.3.24535"
                                },
                                assignedPerson: { name: { family: "Phyllin" } },
                                representedOrganization: {
                                    name: "Wohlsein Krankenhaus",
                                    telecom: [{ value: "0242127070", type: TelecommunicationType.tel }],
                                    addr: { city: "Leverkusen" }
                                }
                            } )
                        };
                    expect( () => {
                        return new EncounterParticipant( fixture );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        time: new Time( "2006-07-21" ),
                        typeCode: EncounterParticipantType.Admitter,
                        assignedEntity: new AssignedEntity( {
                            id: {
                                extension: "190388km89",
                                root: "2.16.840.1.113883.3.24535"
                            },
                            assignedPerson: { name: { family: "Phyllin" } },
                            representedOrganization: {
                                name: "Wohlsein Krankenhaus",
                                telecom: [{ value: "0242127070", type: TelecommunicationType.tel }],
                                addr: { city: "Leverkusen" }
                            }
                        } )
                    },
                    candidate = new EncounterParticipant( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    "$": { "typeCode": fixture.typeCode },
                    "time": fixture.time.toXMLObject(),
                    "assignedEntity": [fixture.assignedEntity.toXMLObject()]
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        time: "2006-07-21",
                        typeCode: EncounterParticipantType.Admitter,
                        assignedEntity: {
                            id: {
                                extension: "6319123",
                                root: "2.16.840.1.113883.3.933"
                            },
                            assignedPerson: {
                                name: { family: "Topp-Glücklich" }
                            },
                            representedOrganization: {
                                name: "Dr.med. Hans Topp-Glücklich",
                                telecom: [
                                    {
                                        value: "061512222222",
                                        type: TelecommunicationType.fax
                                    }
                                ],
                                addr: {
                                    city: "Darmstadt"
                                }
                            }
                        }
                    },
                    candidate = new EncounterParticipant( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<encounterParticipant typeCode="ADM">' +
                    '<time value="200607210000"/>' +
                    '<assignedEntity>' +
                    '<id extension="6319123" root="2.16.840.1.113883.3.933"/>' +
                    '<assignedPerson>' +
                    '<name>' +
                    '<family>Topp-Glücklich</family>' +
                    '</name>' +
                    '</assignedPerson>' +
                    '<representedOrganization>' +
                    '<name>Dr.med. Hans Topp-Glücklich</name>' +
                    '<telecom value="fax:061512222222"/>' +
                    '<addr>' +
                    '<city>Darmstadt</city>' +
                    '</addr>' +
                    '</representedOrganization>' +
                    '</assignedEntity>' +
                    '</encounterParticipant>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "$": { "typeCode": "ADM" },
                        "time": [{ "$": { "value": "20151104" } }],
                        "assignedEntity": [
                            {
                                "id": [{ "$": { "extension": "ied8984938", "root": "2.16.840.1.113883.3.67.933" } }],
                                "assignedPerson": [{ "name": [{ "family": ["Phyllin"] }] }],
                                "representedOrganization": [
                                    {
                                        "name": ["Praxis Dr. med. Phyllin"],
                                        "telecom": [{ "$": { "use": "WP", "value": "tel:0214.212707122" } }],
                                        "addr": [{ "city": ["Leverkusen"] }]
                                    }
                                ]
                            }
                        ]
                    },
                    candidate = EncounterParticipant.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( EncounterParticipant );
                expect( candidate.assignedEntity ).to.be.eql( [AssignedEntity.fromXMLObject( fixture.assignedEntity[0] )] );
                expect( candidate.time ).to.be.eql( Time.fromXMLObject( fixture.time[0] ) );
                expect( candidate.typeCode ).to.be.equal( EncounterParticipantType.Admitter );
            } );

        } );

    } );

    describe( 'ParentDocument', function() {

        it( 'is a class', function() {
            expect( typeof ParentDocument ).to.equal( "function" );
            expect( typeof ParentDocument.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given an id, a code, a setId, and a versionNumber', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            id: new InstanceIdentifier( {
                                extension: "463957123",
                                root: "1.2.276.0.58"
                            } ),
                            setId: new InstanceIdentifier( {
                                extension: "463957847",
                                root: "1.2.276.0.58"
                            } ),
                            code: new Code( {
                                code: DocumentTypeCode.SummarizationOfEpisodeNote,
                                codeSystem: CodeSystemTypes.DocumentTypeCode,
                                codeValidation: DocumentTypeCode
                            } ),
                            versionNumber: "123"
                        },
                        candidate = new ParentDocument( fixture );
                    expect( candidate ).to.be.instanceOf( ParentDocument );
                    expect( candidate.id ).to.be.eql( [fixture.id] );
                    expect( candidate.setId ).to.be.eql( fixture.setId );
                    expect( candidate.code ).to.be.eql( fixture.code );
                    expect( candidate.versionNumber ).to.be.equal( 123 );
                } );

            } );

            describe( 'given no id', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new ParentDocument( {} );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        id: new InstanceIdentifier( {
                            extension: "463957123",
                            root: "1.2.276.0.58"
                        } ),
                        setId: new InstanceIdentifier( {
                            extension: "463957847",
                            root: "1.2.276.0.58"
                        } ),
                        code: new Code( {
                            code: DocumentTypeCode.SummarizationOfEpisodeNote,
                            codeSystem: CodeSystemTypes.DocumentTypeCode,
                            codeValidation: DocumentTypeCode
                        } ),
                        versionNumber: "123"
                    },
                    candidate = new ParentDocument( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    "id": [fixture.id.toXMLObject()],
                    "setId": fixture.setId.toXMLObject(),
                    "code": fixture.code.toXMLObject(),
                    "versionNumber": 123
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        id: new InstanceIdentifier( {
                            extension: "463957123",
                            root: "1.2.276.0.58"
                        } ),
                        setId: new InstanceIdentifier( {
                            extension: "463957847",
                            root: "1.2.276.0.58"
                        } ),
                        code: new Code( {
                            code: DocumentTypeCode.SummarizationOfEpisodeNote,
                            codeSystem: CodeSystemTypes.DocumentTypeCode,
                            codeValidation: DocumentTypeCode
                        } ),
                        versionNumber: "123"
                    },
                    candidate = new ParentDocument( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<parentDocument>' +
                    '<id extension="463957123" root="1.2.276.0.58"/>' +
                    '<code code="34133-9" codeSystem="2.16.840.1.113883.6.1"/>' +
                    '<setId extension="463957847" root="1.2.276.0.58"/>' +
                    '<versionNumber>123</versionNumber>' +
                    '</parentDocument>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "id": [
                            { "$": { "extension": "463957123", "root": "1.2.276.0.58" } }
                        ],
                        "setId": [
                            { "$": { "extension": "463957847", "root": "1.2.276.0.58" } }
                        ],
                        "versionNumber": ["123"],
                        "code": [
                            { "$": { "code": "34133-9", "codeSystem": "2.16.840.1.113883.6.1" } }
                        ]
                    },
                    candidate = ParentDocument.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( ParentDocument );
                expect( candidate.id ).to.be.eql( [InstanceIdentifier.fromXMLObject( fixture.id[0] )] );
                expect( candidate.setId ).to.be.eql( InstanceIdentifier.fromXMLObject( fixture.setId[0] ) );
                expect( candidate.code ).to.be.eql( Code.fromXMLObject( fixture.code[0] ) );
                expect( candidate.versionNumber ).to.be.equal( 123 );
            } );

        } );

    } );

    describe( 'RelatedDocument', function() {

        it( 'is a class', function() {
            expect( typeof RelatedDocument ).to.equal( "function" );
            expect( typeof RelatedDocument.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given a typeCode and parentDocument (as object)', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            typeCode: DocumentRelationshipType.Appends,
                            parentDocument: new ParentDocument( {
                                id: new InstanceIdentifier( {
                                    extension: "463957123",
                                    root: "1.2.276.0.58"
                                } )
                            } )
                        },
                        candidate = new RelatedDocument( fixture );
                    expect( candidate ).to.be.instanceOf( RelatedDocument );
                    expect( candidate.parentDocument ).to.be.eql( [fixture.parentDocument] );
                    expect( candidate.typeCode ).to.be.equal( fixture.typeCode );
                } );

            } );

            describe( 'given a typeCode and parentDocument (as array of object)', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            typeCode: DocumentRelationshipType.Appends,
                            parentDocument: [
                                new ParentDocument( {
                                    id: new InstanceIdentifier( {
                                        extension: "463957123",
                                        root: "1.2.276.0.58"
                                    } )
                                } )
                            ]
                        },
                        candidate = new RelatedDocument( fixture );
                    expect( candidate ).to.be.instanceOf( RelatedDocument );
                    expect( candidate.parentDocument ).to.be.eql( fixture.parentDocument );
                    expect( candidate.typeCode ).to.be.equal( fixture.typeCode );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        typeCode: DocumentRelationshipType.Appends,
                        parentDocument: new ParentDocument( {
                            id: new InstanceIdentifier( {
                                extension: "463957123",
                                root: "1.2.276.0.58"
                            } )
                        } )
                    },
                    candidate = new RelatedDocument( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    "$": { "typeCode": fixture.typeCode },
                    "parentDocument": [fixture.parentDocument.toXMLObject()]
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        typeCode: DocumentRelationshipType.Appends,
                        parentDocument: new ParentDocument( {
                            id: new InstanceIdentifier( {
                                extension: "463957847",
                                root: "1.2.276.0.58"
                            } )
                        } )
                    },
                    candidate = new RelatedDocument( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<relatedDocument typeCode="APND">' +
                    '<parentDocument>' +
                    '<id extension="463957847" root="1.2.276.0.58"/>' +
                    '</parentDocument>' +
                    '</relatedDocument>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "$": { "typeCode": "APND" },
                        "parentDocument": [
                            {
                                "id": [
                                    { "$": { "extension": "463957847", "root": "1.2.276.0.58" } }
                                ]
                            }]
                    },
                    candidate = RelatedDocument.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( RelatedDocument );
                expect( candidate.typeCode ).to.be.eql( DocumentRelationshipType.Appends );
                expect( candidate.parentDocument ).to.be.eql( [ParentDocument.fromXMLObject( fixture.parentDocument[0] )] );
            } );

        } );

    } );

    describe( 'AssociatedEntity', function() {

        it( 'is a class', function() {
            expect( typeof AssociatedEntity ).to.equal( "function" );
            expect( typeof AssociatedEntity.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given an id, a RoleClassAssociative, a PersonalRelationshipRoleType, a Person, and an Organization', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            id: new InstanceIdentifier( {
                                extension: "12-254-4569/9",
                                root: "2.16.840.1.113883.2.6.234.93345"
                            } ),
                            classCode: RoleClassAssociative.PolicyHolder,
                            associatedPerson: new Person( {
                                name: {
                                    given: "Florian",
                                    family: "Gattano"
                                }
                            } ),
                            code: new Code( {
                                code: PersonalRelationshipRoleType.FamilyMember,
                                codeSystem: CodeSystemTypes.PersonalRelationshipRoleType
                            } ),
                            addr: new Address( {
                                streetName: "Große Rurstraße",
                                houseNumber: "38",
                                postalCode: "52428",
                                city: "Jülich"
                            } ),
                            scopingOrganization: new Organization( {
                                id: { extension: "93345", root: "2.16.840.1.113883.2.6.234" },
                                name: "Wohlkouvert Versicherungsgesellschaft",
                                telecom: [
                                    {
                                        use: PostalAddressUse.WorkPlace,
                                        value: "0242127070",
                                        type: TelecommunicationType.tel
                                    }
                                ],
                                addr: {
                                    streetName: "Versicherungsgasse",
                                    houseNumber: "69",
                                    postalCode: "52401",
                                    city: "Jülich"
                                }
                            } )
                        },
                        candidate = new AssociatedEntity( fixture );
                    expect( candidate ).to.be.instanceOf( AssociatedEntity );
                    expect( candidate.id ).to.be.eql( [fixture.id] );
                    expect( candidate.associatedPerson ).to.be.eql( fixture.associatedPerson );
                    expect( candidate.scopingOrganization ).to.be.eql( fixture.scopingOrganization );
                    expect( candidate.addr ).to.be.eql( [fixture.addr] );
                    expect( candidate.code ).to.be.eql( fixture.code );
                    expect( candidate.classCode ).to.be.equal( fixture.classCode );
                } );

            } );

            describe( 'given a classCode requiring to provide an associatedPerson but none given', function() {

                it( 'throws a TypeError for classCode NOK', function() {
                    const
                        fixture = {
                            addr: new Address( {
                                streetName: "Große Rurstraße",
                                houseNumber: "38",
                                postalCode: "52428",
                                city: "Jülich"
                            } ),
                            classCode: RoleClassAssociative.Relative,
                            code: new Code( {
                                code: PersonalRelationshipRoleType.FamilyMember,
                                codeSystem: CodeSystemTypes.PersonalRelationshipRoleType
                            } )
                        };

                    expect( () => {
                        return new AssociatedEntity( fixture );
                    } ).to.throw( TypeError );
                } );

                it( 'throws a TypeError for classCode ECON', function() {
                    const
                        fixture = {
                            addr: new Address( {
                                streetName: "Große Rurstraße",
                                houseNumber: "38",
                                postalCode: "52428",
                                city: "Jülich"
                            } ),
                            classCode: RoleClassAssociative.EmergencyContact,
                            code: new Code( {
                                code: PersonalRelationshipRoleType.FamilyMember,
                                codeSystem: CodeSystemTypes.PersonalRelationshipRoleType
                            } )
                        };

                    expect( () => {
                        return new AssociatedEntity( fixture );
                    } ).to.throw( TypeError );
                } );

                it( 'throws a TypeError for classCode PRS', function() {
                    const
                        fixture = {
                            addr: new Address( {
                                streetName: "Große Rurstraße",
                                houseNumber: "38",
                                postalCode: "52428",
                                city: "Jülich"
                            } ),
                            classCode: RoleClassAssociative.Other,
                            code: new Code( {
                                code: PersonalRelationshipRoleType.FamilyMember,
                                codeSystem: CodeSystemTypes.PersonalRelationshipRoleType
                            } )
                        };

                    expect( () => {
                        return new AssociatedEntity( fixture );
                    } ).to.throw( TypeError );
                } );

            } );

            describe( 'given a classCode requiring to provide a PersonalRelationshipRoleType but none given', function() {

                it( 'throws a TypeError for classCode NOK', function() {
                    const
                        fixture = {
                            addr: new Address( {
                                streetName: "Große Rurstraße",
                                houseNumber: "38",
                                postalCode: "52428",
                                city: "Jülich"
                            } ),
                            classCode: RoleClassAssociative.Relative,
                            associatedPerson: new Person( {
                                name: {
                                    given: "Florian",
                                    family: "Gattano"
                                }
                            } )
                        };

                    expect( () => {
                        return new AssociatedEntity( fixture );
                    } ).to.throw( TypeError );
                } );

                it( 'throws a TypeError for classCode ECON', function() {
                    const
                        fixture = {
                            addr: new Address( {
                                streetName: "Große Rurstraße",
                                houseNumber: "38",
                                postalCode: "52428",
                                city: "Jülich"
                            } ),
                            classCode: RoleClassAssociative.EmergencyContact,
                            associatedPerson: new Person( {
                                name: {
                                    given: "Florian",
                                    family: "Gattano"
                                }
                            } )
                        };

                    expect( () => {
                        return new AssociatedEntity( fixture );
                    } ).to.throw( TypeError );
                } );

                it( 'throws a TypeError for classCode PRS', function() {
                    const
                        fixture = {
                            addr: new Address( {
                                streetName: "Große Rurstraße",
                                houseNumber: "38",
                                postalCode: "52428",
                                city: "Jülich"
                            } ),
                            classCode: RoleClassAssociative.Other,
                            associatedPerson: new Person( {
                                name: {
                                    given: "Florian",
                                    family: "Gattano"
                                }
                            } )
                        };

                    expect( () => {
                        return new AssociatedEntity( fixture );
                    } ).to.throw( TypeError );
                } );

            } );

            describe( 'given a classCode requiring to provide a scopingOrganization but none given', function() {

                it( 'throws a TypeError', function() {
                    const
                        fixture = {
                            addr: new Address( {
                                streetName: "Große Rurstraße",
                                houseNumber: "38",
                                postalCode: "52428",
                                city: "Jülich"
                            } ),
                            classCode: RoleClassAssociative.PolicyHolder
                        };

                    expect( () => {
                        return new AssociatedEntity( fixture );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        id: new InstanceIdentifier( {
                            extension: "12-254-4569/9",
                            root: "2.16.840.1.113883.2.6.234.93345"
                        } ),
                        classCode: RoleClassAssociative.PolicyHolder,
                        associatedPerson: new Person( {
                            name: {
                                given: "Florian",
                                family: "Gattano"
                            }
                        } ),
                        code: new Code( {
                            code: PersonalRelationshipRoleType.FamilyMember,
                            codeSystem: CodeSystemTypes.PersonalRelationshipRoleType
                        } ),
                        addr: new Address( {
                            streetName: "Große Rurstraße",
                            houseNumber: "38",
                            postalCode: "52428",
                            city: "Jülich"
                        } ),
                        scopingOrganization: new Organization( {
                            id: { extension: "93345", root: "2.16.840.1.113883.2.6.234" },
                            name: "Wohlkouvert Versicherungsgesellschaft",
                            telecom: [
                                {
                                    use: PostalAddressUse.WorkPlace,
                                    value: "0242127070",
                                    type: TelecommunicationType.tel
                                }
                            ],
                            addr: {
                                streetName: "Versicherungsgasse",
                                houseNumber: "69",
                                postalCode: "52401",
                                city: "Jülich"
                            }
                        } )
                    },
                    candidate = new AssociatedEntity( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    "$": { "classCode": fixture.classCode },
                    "id": [fixture.id.toXMLObject()],
                    "code": fixture.code.toXMLObject(),
                    "associatedPerson": fixture.associatedPerson.toXMLObject(),
                    "scopingOrganization": fixture.scopingOrganization.toXMLObject(),
                    "addr": [fixture.addr.toXMLObject()]
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        id: new InstanceIdentifier( {
                            extension: "A123456789",
                            root: CodeSystemTypes.PatientInsuranceNr
                        } ),
                        classCode: RoleClassAssociative.PolicyHolder,
                        associatedPerson: new Person( {
                            name: {
                                given: "Daisy",
                                family: "Duck"
                            }
                        } ),
                        code: new Code( {
                            code: PersonalRelationshipRoleType.FamilyMember,
                            codeSystem: CodeSystemTypes.PersonalRelationshipRoleType
                        } ),
                        addr: new Address( {
                            streetName: "Große Rurstraße",
                            houseNumber: "38",
                            postalCode: "52428",
                            city: "Jülich"
                        } ),
                        scopingOrganization: new Organization( {
                            id: [
                                { extension: "107415518", root: CodeSystemTypes.InsuranceIKNr },
                                { extension: "61125", root: CodeSystemTypes.InsuranceVKNr }
                            ],
                            name: "AOK Entenhausen",
                            addr: {
                                streetName: "Versicherungsgasse",
                                houseNumber: "69",
                                postalCode: "52401",
                                city: "Jülich"
                            }
                        } )
                    },
                    candidate = new AssociatedEntity( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<associatedEntity classCode="POLHOLD">' +
                    '<id extension="A123456789" root="1.2.276.0.76.4.8"/>' +
                    '<code code="FAMMEMB" codeSystem="2.16.840.1.113883.1.11.19563"/>' +
                    '<addr>' +
                    '<streetName>Große Rurstraße</streetName>' +
                    '<houseNumber>38</houseNumber>' +
                    '<postalCode>52428</postalCode>' +
                    '<city>Jülich</city>' +
                    '</addr>' +
                    '<associatedPerson>' +
                    '<name>' +
                    '<given>Daisy</given>' +
                    '<family>Duck</family>' +
                    '</name>' +
                    '</associatedPerson>' +
                    '<scopingOrganization>' +
                    '<id extension="107415518" root="1.2.276.0.76.4.5"/>' +
                    '<id extension="61125" root="1.2.276.0.76.4.7"/>' +
                    '<name>AOK Entenhausen</name>' +
                    '<telecom nullFlavor="UNK"/>' +
                    '<addr>' +
                    '<streetName>Versicherungsgasse</streetName>' +
                    '<houseNumber>69</houseNumber>' +
                    '<postalCode>52401</postalCode>' +
                    '<city>Jülich</city>' +
                    '</addr>' +
                    '</scopingOrganization>' +
                    '</associatedEntity>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "$": { "classCode": "POLHOLD" },
                        "id": [{ "$": { "extension": "12-254-4569/9", "root": "2.16.840.1.113883.2.6.234.93345" } }],
                        "code": [{ "$": { "code": "FAMMEMB", "codeSystem": "2.16.840.1.113883.1.11.19563" } }],
                        "addr": [
                            {
                                "streetName": ["Große Rurstraße"],
                                "houseNumber": ["38"],
                                "postalCode": ["52428"],
                                "city": ["Jülich"]
                            }
                        ],
                        "associatedPerson": [{ "name": [{ "given": ["Florian"], "family": ["Gattano"] }] }],
                        "scopingOrganization": [
                            {
                                "id": [
                                    { "$": { "extension": "93345", "root": "2.16.840.1.113883.2.6.234" } }
                                ],
                                "name": ["Wohlkouvert Versicherungsgesellschaft"],
                                "addr": [
                                    {
                                        "streetName": ["Versicherungsgasse"],
                                        "houseNumber": ["69"],
                                        "postalCode": ["52401"],
                                        "city": ["Jülich"]
                                    }
                                ],
                                "telecom": [
                                    { "$": { "use": "WP", "value": "tel:0242127070" } }
                                ]
                            }
                        ]
                    },
                    candidate = AssociatedEntity.fromXMLObject( fixture );

                expect( candidate ).to.be.instanceOf( AssociatedEntity );
                expect( candidate.id ).to.be.eql( [InstanceIdentifier.fromXMLObject( fixture.id[0] )] );
                expect( candidate.classCode ).to.be.equal( RoleClassAssociative.PolicyHolder );
                expect( candidate.code ).to.be.eql( Code.fromXMLObject( fixture.code[0] ) );
                expect( candidate.associatedPerson ).to.be.eql( Person.fromXMLObject( fixture.associatedPerson[0] ) );
                expect( candidate.scopingOrganization ).to.be.eql( Organization.fromXMLObject( fixture.scopingOrganization[0] ) );
                expect( candidate.telecom ).to.be.eql( [] );
                expect( candidate.addr ).to.be.eql( [Address.fromXMLObject( fixture.addr[0] )] );
            } );

        } );

    } );

    describe( 'Participant', function() {

        it( 'is a class', function() {
            expect( typeof Participant ).to.equal( "function" );
            expect( typeof Participant.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given an associatedEntity, a time, and a typeCode', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            typeCode: ParticipationTypeForParticipant.Holder,
                            time: new Time( {
                                low: "2020-01-01",
                                high: "2021-01-01"
                            } ),
                            associatedEntity: new AssociatedEntity( {
                                id: new InstanceIdentifier( {
                                    extension: "12-254-4569/9",
                                    root: "2.16.840.1.113883.2.6.234.93345"
                                } ),
                                classCode: RoleClassAssociative.PolicyHolder,
                                associatedPerson: new Person( {
                                    name: {
                                        given: "Florian",
                                        family: "Gattano"
                                    }
                                } ),
                                code: new Code( {
                                    code: PersonalRelationshipRoleType.FamilyMember,
                                    codeSystem: CodeSystemTypes.PersonalRelationshipRoleType
                                } ),
                                addr: new Address( {
                                    streetName: "Große Rurstraße",
                                    houseNumber: "38",
                                    postalCode: "52428",
                                    city: "Jülich"
                                } ),
                                scopingOrganization: new Organization( {
                                    id: { extension: "93345", root: "2.16.840.1.113883.2.6.234" },
                                    name: "Wohlkouvert Versicherungsgesellschaft",
                                    telecom: [
                                        {
                                            use: PostalAddressUse.WorkPlace,
                                            value: "0242127070",
                                            type: TelecommunicationType.tel
                                        }
                                    ],
                                    addr: {
                                        streetName: "Versicherungsgasse",
                                        houseNumber: "69",
                                        postalCode: "52401",
                                        city: "Jülich"
                                    }
                                } )
                            } )
                        },
                        candidate = new Participant( fixture );
                    expect( candidate ).to.be.instanceOf( Participant );
                    expect( candidate.typeCode ).to.be.equal( fixture.typeCode );
                    expect( candidate.time ).to.be.eql( fixture.time );
                    expect( candidate.associatedEntity ).to.be.eql( [fixture.associatedEntity] );
                } );

            } );

            describe( 'given no typeCode', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new Participant( {} );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        typeCode: ParticipationTypeForParticipant.Holder,
                        time: new Time( {
                            low: "2020-01-01",
                            high: "2021-01-01"
                        } ),
                        associatedEntity: new AssociatedEntity( {
                            id: new InstanceIdentifier( {
                                extension: "12-254-4569/9",
                                root: "2.16.840.1.113883.2.6.234.93345"
                            } ),
                            classCode: RoleClassAssociative.PolicyHolder,
                            associatedPerson: new Person( {
                                name: {
                                    given: "Florian",
                                    family: "Gattano"
                                }
                            } ),
                            code: new Code( {
                                code: PersonalRelationshipRoleType.FamilyMember,
                                codeSystem: CodeSystemTypes.PersonalRelationshipRoleType
                            } ),
                            addr: new Address( {
                                streetName: "Große Rurstraße",
                                houseNumber: "38",
                                postalCode: "52428",
                                city: "Jülich"
                            } ),
                            scopingOrganization: new Organization( {
                                id: { extension: "93345", root: "2.16.840.1.113883.2.6.234" },
                                name: "Wohlkouvert Versicherungsgesellschaft",
                                telecom: [
                                    {
                                        use: PostalAddressUse.WorkPlace,
                                        value: "0242127070",
                                        type: TelecommunicationType.tel
                                    }
                                ],
                                addr: {
                                    streetName: "Versicherungsgasse",
                                    houseNumber: "69",
                                    postalCode: "52401",
                                    city: "Jülich"
                                }
                            } )
                        } )
                    },
                    candidate = new Participant( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    "$": { "typeCode": fixture.typeCode },
                    "time": fixture.time.toXMLObject(),
                    "associatedEntity": [fixture.associatedEntity.toXMLObject()]
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        typeCode: ParticipationTypeForParticipant.Holder,
                        time: new Time( {
                            low: "2020-01-01",
                            high: "2021-01-01"
                        } ),
                        associatedEntity: new AssociatedEntity( {
                            id: new InstanceIdentifier( {
                                extension: "A123456789",
                                root: CodeSystemTypes.PatientInsuranceNr
                            } ),
                            classCode: RoleClassAssociative.PolicyHolder,
                            associatedPerson: new Person( {
                                name: {
                                    given: "Florian",
                                    family: "Gattano"
                                }
                            } ),
                            code: new Code( {
                                code: PersonalRelationshipRoleType.FamilyMember,
                                codeSystem: CodeSystemTypes.PersonalRelationshipRoleType
                            } ),
                            addr: new Address( {
                                streetName: "Große Rurstraße",
                                houseNumber: "38",
                                postalCode: "52428",
                                city: "Jülich"
                            } ),
                            scopingOrganization: new Organization( {
                                id: [
                                    { extension: "107415518", root: CodeSystemTypes.InsuranceIKNr },
                                    { extension: "61125", root: CodeSystemTypes.InsuranceVKNr }
                                ],
                                name: "AOK Entenhausen",
                                addr: {
                                    streetName: "Versicherungsgasse",
                                    houseNumber: "69",
                                    postalCode: "52401",
                                    city: "Jülich"
                                }
                            } )
                        } )
                    },
                    candidate = new Participant( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<participant typeCode="HLD">' +
                    '<time>' +
                    '<low value="202001010000"/>' +
                    '<high value="202101010000" inclusive="true"/>' +
                    '</time>' +
                    '<associatedEntity classCode="POLHOLD">' +
                    '<id extension="A123456789" root="1.2.276.0.76.4.8"/>' +
                    '<code code="FAMMEMB" codeSystem="2.16.840.1.113883.1.11.19563"/>' +
                    '<addr>' +
                    '<streetName>Große Rurstraße</streetName>' +
                    '<houseNumber>38</houseNumber>' +
                    '<postalCode>52428</postalCode>' +
                    '<city>Jülich</city>' +
                    '</addr>' +
                    '<associatedPerson>' +
                    '<name>' +
                    '<given>Florian</given>' +
                    '<family>Gattano</family>' +
                    '</name>' +
                    '</associatedPerson>' +
                    '<scopingOrganization>' +
                    '<id extension="107415518" root="1.2.276.0.76.4.5"/>' +
                    '<id extension="61125" root="1.2.276.0.76.4.7"/>' +
                    '<name>AOK Entenhausen</name>' +
                    '<telecom nullFlavor="UNK"/>' +
                    '<addr>' +
                    '<streetName>Versicherungsgasse</streetName>' +
                    '<houseNumber>69</houseNumber>' +
                    '<postalCode>52401</postalCode>' +
                    '<city>Jülich</city>' +
                    '</addr>' +
                    '</scopingOrganization>' +
                    '</associatedEntity>' +
                    '</participant>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "$": { "typeCode": "HLD" },
                        "time": [
                            {
                                "low": [{ "$": { "value": "20050101" } }],
                                "high": [{ "$": { "value": "20051231", "inclusive": "true" } }]
                            }
                        ],
                        "associatedEntity": [
                            {
                                "$": { "classCode": "POLHOLD" },
                                "id": [
                                    {
                                        "$": {
                                            "extension": "12-254-4569/9",
                                            "root": "2.16.840.1.113883.2.6.234.93345"
                                        }
                                    }
                                ],
                                "code": [{ "$": { "code": "FAMMEMB", "codeSystem": "2.16.840.1.113883.1.11.19563" } }],
                                "addr": [
                                    {
                                        "streetName": ["Große Rurstraße"],
                                        "houseNumber": ["38"],
                                        "postalCode": ["52428"],
                                        "city": ["Jülich"]
                                    }
                                ],
                                "associatedPerson": [{ "name": [{ "given": ["Florian"], "family": ["Gattano"] }] }],
                                "scopingOrganization": [
                                    {
                                        "id": [
                                            { "$": { "extension": "93345", "root": "2.16.840.1.113883.2.6.234" } }
                                        ],
                                        "name": ["Wohlkouvert Versicherungsgesellschaft"],
                                        "addr": [
                                            {
                                                "streetName": ["Versicherungsgasse"],
                                                "houseNumber": ["69"],
                                                "postalCode": ["52401"],
                                                "city": ["Jülich"]
                                            }
                                        ],
                                        "telecom": [
                                            { "$": { "use": "WP", "value": "tel:0242127070" } }
                                        ]
                                    }
                                ]
                            }]
                    },
                    candidate = Participant.fromXMLObject( fixture );

                expect( candidate ).to.be.instanceOf( Participant );
                expect( candidate.associatedEntity ).to.be.eql( [AssociatedEntity.fromXMLObject( fixture.associatedEntity[0] )] );
                expect( candidate.time ).to.be.eql( Time.fromXMLObject( fixture.time[0] ) );
                expect( candidate.typeCode ).to.be.equal( ParticipationTypeForParticipant.Holder );
            } );

        } );

    } );

    describe( 'EncompassingEncounter', function() {

        it( 'is a class', function() {
            expect( typeof EncompassingEncounter ).to.equal( "function" );
            expect( typeof EncompassingEncounter.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given an effectiveTime and single objects', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            id: new InstanceIdentifier( {
                                root: "test",
                                extension: "testExt"
                            } ),
                            effectiveTime: new Time( {
                                low: "2020-01-01",
                                high: "2021-01-01"
                            } ),
                            code: new Code( {
                                code: EncounterCode.InpatientEncounter,
                                codeSystem: CodeSystemTypes.EncounterCode,
                                codeValidation: EncounterCode
                            } ),
                            dischargeDispositionCode: new Code( {
                                code: DischargeDispositionCode.Home,
                                codeSystem: CodeSystemTypes.DischargeDispositionCode,
                                codeValidation: DischargeDispositionCode
                            } ),
                            responsibleParty: new ResponsibleParty( {
                                assignedEntity: new AssignedEntity( {
                                    id: {
                                        extension: "190388km89",
                                        root: "2.16.840.1.113883.3.24535"
                                    },
                                    assignedPerson: {
                                        name: { family: "Phyllin" }
                                    },
                                    representedOrganization: {
                                        name: "Wohlsein Krankenhaus",
                                        telecom: [
                                            {
                                                use: PostalAddressUse.WorkPlace,
                                                value: "0242127070",
                                                type: TelecommunicationType.tel
                                            }
                                        ],
                                        addr: {
                                            streetName: "Krankenhausstraße",
                                            houseNumber: "240",
                                            postalCode: "51371",
                                            city: "Leverkusen"
                                        }
                                    }
                                } )
                            } ),
                            encounterParticipant: new EncounterParticipant( {
                                time: new Time( "2020-12-11" ),
                                typeCode: EncounterParticipantType.Admitter,
                                assignedEntity: new AssignedEntity( {
                                    id: {
                                        extension: "190388km89",
                                        root: "2.16.840.1.113883.3.24535"
                                    },
                                    assignedPerson: { name: { family: "Phyllin" } },
                                    representedOrganization: {
                                        name: "Wohlsein Krankenhaus",
                                        telecom: [{ value: "0242127070", type: TelecommunicationType.tel }],
                                        addr: { city: "Leverkusen" }
                                    }
                                } )
                            } ),
                            location: new Location( {
                                healthCareFacility: new HealthCareFacility( {
                                    id: new InstanceIdentifier( {
                                        root: "testRoot",
                                        extension: "lalala"
                                    } ),
                                    code: new Code( {
                                        code: EncounterCode.Ambulatory,
                                        codeSystem: CodeSystemTypes.EncounterCode,
                                        codeValidation: EncounterCode
                                    } ),
                                    location: new Place( {
                                        addr: new Address( {
                                            streetName: "test"
                                        } )
                                    } ),
                                    serviceProviderOrganization: new Organization( {
                                        name: "test"
                                    } )
                                } )
                            } )
                        },
                        candidate = new EncompassingEncounter( fixture );

                    expect( candidate ).to.be.instanceOf( EncompassingEncounter );
                    expect( candidate.id ).to.be.eql( [fixture.id] );
                    expect( candidate.effectiveTime ).to.be.eql( fixture.effectiveTime );
                    expect( candidate.code ).to.be.eql( fixture.code );
                    expect( candidate.dischargeDispositionCode ).to.be.eql( fixture.dischargeDispositionCode );
                    expect( candidate.responsibleParty ).to.be.eql( fixture.responsibleParty );
                    expect( candidate.encounterParticipant ).to.be.eql( fixture.encounterParticipant );
                    expect( candidate.location ).to.be.eql( fixture.location );
                } );

            } );

            describe( 'given an effectiveTime and an array of objects (where applicable)', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            id: [
                                new InstanceIdentifier( {
                                    root: "test",
                                    extension: "testExt"
                                } )
                            ],
                            effectiveTime: new Time( {
                                low: "2020-01-01",
                                high: "2021-01-01"
                            } ),
                            code: new Code( {
                                code: EncounterCode.InpatientEncounter,
                                codeSystem: CodeSystemTypes.EncounterCode,
                                codeValidation: EncounterCode
                            } ),
                            dischargeDispositionCode: new Code( {
                                code: DischargeDispositionCode.Home,
                                codeSystem: CodeSystemTypes.DischargeDispositionCode,
                                codeValidation: DischargeDispositionCode
                            } ),
                            responsibleParty: new ResponsibleParty( {
                                assignedEntity: new AssignedEntity( {
                                    id: {
                                        extension: "190388km89",
                                        root: "2.16.840.1.113883.3.24535"
                                    },
                                    assignedPerson: {
                                        name: { family: "Phyllin" }
                                    },
                                    representedOrganization: {
                                        name: "Wohlsein Krankenhaus",
                                        telecom: [
                                            {
                                                use: PostalAddressUse.WorkPlace,
                                                value: "0242127070",
                                                type: TelecommunicationType.tel
                                            }
                                        ],
                                        addr: {
                                            streetName: "Krankenhausstraße",
                                            houseNumber: "240",
                                            postalCode: "51371",
                                            city: "Leverkusen"
                                        }
                                    }
                                } )
                            } ),
                            encounterParticipant: new EncounterParticipant( {
                                time: new Time( "2020-12-11" ),
                                typeCode: EncounterParticipantType.Admitter,
                                assignedEntity: new AssignedEntity( {
                                    id: {
                                        extension: "190388km89",
                                        root: "2.16.840.1.113883.3.24535"
                                    },
                                    assignedPerson: { name: { family: "Phyllin" } },
                                    representedOrganization: {
                                        name: "Wohlsein Krankenhaus",
                                        telecom: [{ value: "0242127070", type: TelecommunicationType.tel }],
                                        addr: { city: "Leverkusen" }
                                    }
                                } )
                            } ),
                            location: new Location( {
                                healthCareFacility: new HealthCareFacility( {
                                    id: new InstanceIdentifier( {
                                        root: "testRoot",
                                        extension: "lalala"
                                    } ),
                                    code: new Code( {
                                        code: EncounterCode.Ambulatory,
                                        codeSystem: CodeSystemTypes.EncounterCode,
                                        codeValidation: EncounterCode
                                    } ),
                                    location: new Place( {
                                        addr: new Address( {
                                            streetName: "test"
                                        } )
                                    } ),
                                    serviceProviderOrganization: new Organization( {
                                        name: "test"
                                    } )
                                } )
                            } )
                        },
                        candidate = new EncompassingEncounter( fixture );

                    expect( candidate ).to.be.instanceOf( EncompassingEncounter );
                    expect( candidate.id ).to.be.eql( fixture.id );
                    expect( candidate.effectiveTime ).to.be.eql( fixture.effectiveTime );
                    expect( candidate.code ).to.be.eql( fixture.code );
                    expect( candidate.dischargeDispositionCode ).to.be.eql( fixture.dischargeDispositionCode );
                    expect( candidate.responsibleParty ).to.be.eql( fixture.responsibleParty );
                    expect( candidate.encounterParticipant ).to.be.eql( fixture.encounterParticipant );
                    expect( candidate.location ).to.be.eql( fixture.location );
                } );

            } );

            describe( 'given no effectiveTime', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new EncompassingEncounter( {} );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        id: new InstanceIdentifier( {
                            root: "test",
                            extension: "testExt"
                        } ),
                        effectiveTime: new Time( {
                            low: "2020-01-01",
                            high: "2021-01-01"
                        } ),
                        code: new Code( {
                            code: EncounterCode.InpatientEncounter,
                            codeSystem: CodeSystemTypes.EncounterCode,
                            codeValidation: EncounterCode
                        } ),
                        dischargeDispositionCode: new Code( {
                            code: DischargeDispositionCode.Home,
                            codeSystem: CodeSystemTypes.DischargeDispositionCode,
                            codeValidation: DischargeDispositionCode
                        } ),
                        responsibleParty: new ResponsibleParty( {
                            assignedEntity: new AssignedEntity( {
                                id: {
                                    extension: "190388km89",
                                    root: "2.16.840.1.113883.3.24535"
                                },
                                assignedPerson: {
                                    name: { family: "Phyllin" }
                                },
                                representedOrganization: {
                                    name: "Wohlsein Krankenhaus",
                                    telecom: [
                                        {
                                            use: PostalAddressUse.WorkPlace,
                                            value: "0242127070",
                                            type: TelecommunicationType.tel
                                        }
                                    ],
                                    addr: {
                                        streetName: "Krankenhausstraße",
                                        houseNumber: "240",
                                        postalCode: "51371",
                                        city: "Leverkusen"
                                    }
                                }
                            } )
                        } ),
                        encounterParticipant: new EncounterParticipant( {
                            time: new Time( "2020-12-11" ),
                            typeCode: EncounterParticipantType.Admitter,
                            assignedEntity: new AssignedEntity( {
                                id: {
                                    extension: "190388km89",
                                    root: "2.16.840.1.113883.3.24535"
                                },
                                assignedPerson: { name: { family: "Phyllin" } },
                                representedOrganization: {
                                    name: "Wohlsein Krankenhaus",
                                    telecom: [{ value: "0242127070", type: TelecommunicationType.tel }],
                                    addr: { city: "Leverkusen" }
                                }
                            } )
                        } ),
                        location: new Location( {
                            healthCareFacility: new HealthCareFacility( {
                                id: new InstanceIdentifier( {
                                    root: "testRoot",
                                    extension: "lalala"
                                } ),
                                code: new Code( {
                                    code: EncounterCode.Ambulatory,
                                    codeSystem: CodeSystemTypes.EncounterCode,
                                    codeValidation: EncounterCode
                                } ),
                                location: new Place( {
                                    addr: new Address( {
                                        streetName: "test"
                                    } )
                                } ),
                                serviceProviderOrganization: new Organization( {
                                    name: "test"
                                } )
                            } )
                        } )
                    },
                    candidate = new EncompassingEncounter( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    "id": [fixture.id.toXMLObject()],
                    "effectiveTime": fixture.effectiveTime.toXMLObject(),
                    "code": fixture.code.toXMLObject(),
                    "dischargeDispositionCode": fixture.dischargeDispositionCode.toXMLObject(),
                    "responsibleParty": fixture.responsibleParty.toXMLObject(),
                    "encounterParticipant": fixture.encounterParticipant.toXMLObject(),
                    "location": fixture.location.toXMLObject()
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        id: new InstanceIdentifier( {
                            root: "test",
                            extension: "testExt"
                        } ),
                        effectiveTime: new Time( {
                            low: "2005-11-01",
                            high: "2005-11-10"
                        } ),
                        code: new Code( {
                            code: EncounterCode.InpatientEncounter,
                            codeSystem: CodeSystemTypes.EncounterCode,
                            codeValidation: EncounterCode
                        } ),
                        location: new Location( {
                            healthCareFacility: new HealthCareFacility( {
                                serviceProviderOrganization: new Organization( {
                                    name: "Wohlmichgut Klinik",
                                    addr: new Address( {
                                        streetName: "Sundstraße",
                                        houseNumber: "4",
                                        postalCode: "50389",
                                        city: "Wesseling"
                                    } )
                                } )
                            } )
                        } )
                    },
                    candidate = new EncompassingEncounter( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<encompassingEncounter>' +
                    '<id extension="testExt" root="test"/>' +
                    '<code code="IMP" codeSystem="2.16.840.1.113883.5.4"/>' +
                    '<effectiveTime>' +
                    '<low value="200511010000"/>' +
                    '<high value="200511100000" inclusive="true"/>' +
                    '</effectiveTime>' +
                    '<location>' +
                    '<healthCareFacility>' +
                    '<serviceProviderOrganization>' +
                    '<name>Wohlmichgut Klinik</name>' +
                    '<telecom nullFlavor="UNK"/>' +
                    '<addr>' +
                    '<streetName>Sundstraße</streetName>' +
                    '<houseNumber>4</houseNumber>' +
                    '<postalCode>50389</postalCode>' +
                    '<city>Wesseling</city>' +
                    '</addr>' +
                    '</serviceProviderOrganization>' +
                    '</healthCareFacility>' +
                    '</location>' +
                    '</encompassingEncounter>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "effectiveTime": [
                            {
                                "low": [{ "$": { "value": "20050101" } }],
                                "high": [{ "$": { "value": "20051231", "inclusive": "true" } }]
                            }
                        ],
                        "code": [
                            { "$": { "code": "IMP", "codeSystem": "2.16.840.1.113883.5.4" } }
                        ],
                        "location": [
                            {
                                "healthCareFacility": [
                                    {
                                        id: [{ $: { root: "testRoot", extension: "lalala" } }],
                                        code: [{ $: { code: "DX", codeSystem: "2.16.840.1.113883.1.11.17660" } }],
                                        location: [{ addr: [{ streetName: ["testStr"] }] }],
                                        serviceProviderOrganization: [{ name: ["test"] }]
                                    }
                                ]
                            }
                        ]
                    },
                    candidate = EncompassingEncounter.fromXMLObject( fixture );
                expect( candidate ).to.be.instanceOf( EncompassingEncounter );
                expect( candidate.effectiveTime ).to.be.eql( Time.fromXMLObject( fixture.effectiveTime[0] ) );
                expect( candidate.code ).to.be.eql( Code.fromXMLObject( fixture.code[0] ) );
                expect( candidate.location ).to.be.eql( Location.fromXMLObject( fixture.location[0] ) );
            } );

        } );

    } );

    describe( 'ComponentOf', function() {

        it( 'is a class', function() {
            expect( typeof ComponentOf ).to.equal( "function" );
            expect( typeof ComponentOf.prototype ).to.equal( "object" );
        } );

        describe( '#constructor()', function() {

            describe( 'given an encompassingEncounter', function() {

                it( 'returns a new instance', function() {
                    const
                        fixture = {
                            encompassingEncounter: new EncompassingEncounter( {
                                effectiveTime: new Time( {
                                    low: "2020-01-01",
                                    high: "2021-01-01"
                                } )
                            } )
                        },
                        candidate = new ComponentOf( fixture );

                    expect( candidate ).to.be.instanceOf( ComponentOf );
                    expect( candidate.encompassingEncounter ).to.be.eql( fixture.encompassingEncounter );
                } );

            } );

            describe( 'given no encompassingEncounter', function() {

                it( 'throws a TypeError', function() {
                    expect( () => {
                        return new ComponentOf( {} );
                    } ).to.throw( TypeError );
                } );

            } );

        } );

        describe( '#toXMLObject()', function() {

            it( 'returns a valid XML object parsable by xml2js', function() {
                const
                    fixture = {
                        encompassingEncounter: new EncompassingEncounter( {
                            effectiveTime: new Time( {
                                low: "2020-01-01",
                                high: "2021-01-01"
                            } )
                        } )
                    },
                    candidate = new ComponentOf( fixture ).toXMLObject();

                expect( candidate ).to.be.eql( {
                    "encompassingEncounter": fixture.encompassingEncounter.toXMLObject()
                } );
            } );

        } );

        describe( '#toXMLString()', function() {

            it( 'returns a valid XML string', function() {
                const
                    fixture = {
                        encompassingEncounter: new EncompassingEncounter( {
                            effectiveTime: new Time( {
                                low: "2005-11-01",
                                high: "2005-11-10"
                            } )
                        } )
                    },
                    candidate = new ComponentOf( fixture ).toXMLString();

                expect( candidate ).to.be.equal(
                    '<componentOf>' +
                    '<encompassingEncounter>' +
                    '<effectiveTime>' +
                    '<low value="200511010000"/>' +
                    '<high value="200511100000" inclusive="true"/>' +
                    '</effectiveTime>' +
                    '</encompassingEncounter>' +
                    '</componentOf>'
                );
            } );

        } );

        describe( '.fromXMLObject()', function() {

            it( 'returns an instance of the class', function() {
                const
                    fixture = {
                        "encompassingEncounter": [
                            {
                                "effectiveTime": [
                                    {
                                        "low": [{ "$": { "value": "20050101" } }],
                                        "high": [{ "$": { "value": "20051231", "inclusive": "true" } }]
                                    }
                                ]
                            }
                        ]
                    },
                    candidate = ComponentOf.fromXMLObject( fixture );

                expect( candidate ).to.be.instanceOf( ComponentOf );
                expect( candidate.encompassingEncounter ).to.be.eql( EncompassingEncounter.fromXMLObject( fixture.encompassingEncounter[0] ) );
            } );

        } );

    } );

    describe( 'ClinicalDocument', function() {

        before( function() {
            // contains the parameters to be deleted from the fixture to produce a TypeError
            this.required = [
                "id",
                "code",
                "effectiveTime",
                "confidentialityCode",
                "recordTarget",
                "author",
                "custodian"
            ];
        } );

        it( 'is a class', function() {
            expect( typeof ClinicalDocument ).to.equal( "function" );
            expect( typeof ClinicalDocument.prototype ).to.equal( "object" );
        } );

        context( 'given full set of valid parameters', function() {

            beforeEach( function() {
                // contains the settings for various fixtures NOT producing an error during ClinicalDocument creation
                this.fixture = {
                    id: new InstanceIdentifier( {
                        extension: "60467,36049",
                        root: "1.2.276.0.58"
                    } ),
                    setId: new InstanceIdentifier( {
                        extension: "D1",
                        root: "2.16.840.1.113883.3.933"
                    } ),
                    versionNumber: "1",
                    code: new Code( {
                        code: DocumentTypeCode.DischargeSummarizationNoteAmbulantPhysician,
                        codeSystem: CodeSystemTypes.DocumentTypeCode,
                        codeValidation: DocumentTypeCode
                    } ),
                    title: "Test Discharge Summarization Note",
                    effectiveTime: new Time( "2021-02-21" ),
                    confidentialityCode: new Code( {
                        code: ConfidentialityCode.Normal,
                        codeSystem: CodeSystemTypes.ConfidentialityCode,
                        // NOTE: these values are NOT required here, but included for schema validation purposes
                        codeSystemName: "Confidentiality",
                        codeSystemVersion: "2012-07-24",
                        displayName: "Normal",
                        codeValidation: ConfidentialityCode
                    } ),
                    languageCode: "de-DE",
                    recordTarget: new RecordTarget( {
                        patientRole: new PatientRole( {
                            id: [
                                new InstanceIdentifier( {
                                    extension: "mongoIdOfTheUser",
                                    root: InstanceIdentifier.getSystemGUID( 12345, 123456789 )
                                } ),
                                new InstanceIdentifier( {
                                    extension: "A123456789",
                                    root: CodeSystemTypes.PatientInsuranceNr
                                } )
                            ],
                            patient: new Patient( {
                                name: new PersonName( {
                                    prefix: new EntityNamePart( {
                                        value: "Dr. rer. nat.",
                                        qualifier: EntityNamePartQualifier.Academic
                                    } ),
                                    given: "Michael",
                                    family: "Kleinert"
                                } ),
                                administrativeGenderCode: new Code( {
                                    code: AdministrativeGender.Male,
                                    codeSystem: CodeSystemTypes.AdministrativeGenderCodes,
                                    codeValidation: AdministrativeGender
                                } ),
                                birthTime: new Time( "1989-06-05" ),
                                birthPlace: new BirthPlace( { place: { addr: { city: "Berlin" } } } )
                            } ),
                            addr: new Address( {
                                streetName: "Musterstr.",
                                houseNumber: "5",
                                postalCode: "65432",
                                city: "Musterhausen",
                                country: "Deutschland"
                            } ),
                            telecom: new Telecommunication( {
                                type: TelecommunicationType.tel,
                                value: "030.456.345345"
                            } ),
                            providerOrganization: new Organization( {
                                name: "test",
                                addr: new Address( {
                                    streetName: "Musterstr.",
                                    houseNumber: "5",
                                    postalCode: "65432",
                                    city: "Musterhausen",
                                    country: "Deutschland"
                                } )
                            } )
                        } )
                    } ),
                    author: new Author( {
                        assignedAuthor: new AssignedAuthor( {
                            id: new InstanceIdentifier( {
                                extension: "190388km89",
                                root: "2.16.840.1.113883.3.24535"
                            } ),
                            assignedPerson: new AssignedPerson( {
                                name: new PersonName( {
                                    prefix: new EntityNamePart( {
                                        value: "Dr. med.",
                                        qualifier: EntityNamePartQualifier.Academic
                                    } ),
                                    given: "Theo",
                                    family: ["Phyllin"]
                                } )
                            } ),
                            representedOrganization: new Organization( {
                                name: new OrganizationName( "Wohlsein Krankenhaus" ),
                                telecom: new Telecommunication( {
                                    use: PostalAddressUse.WorkPlace,
                                    value: "0242127070",
                                    type: TelecommunicationType.tel
                                } ),
                                addr: new Address( {
                                    streetName: "Krankenhausstraße",
                                    houseNumber: "240",
                                    postalCode: "51371",
                                    city: "Leverkusen"
                                } )
                            } )
                        } ),
                        time: new Time( "2021-10-21" ),
                        functionCode: new Code( {
                            code: ParticipationType.Admitter,
                            codeSystem: CodeSystemTypes.ParticipationType,
                            codeValidation: ParticipationType
                        } )
                    } ),
                    custodian: new Custodian( {
                        assignedCustodian: new AssignedCustodian( {
                            representedCustodianOrganization: new CustodianOrganization( {
                                id: new InstanceIdentifier( {
                                    root: "test",
                                    extension: "testExt"
                                } ),
                                name: new OrganizationName( "Wohlsein Krankenhaus" ),
                                telecom: new Telecommunication( {
                                    use: PostalAddressUse.WorkPlace,
                                    value: "0242127070",
                                    type: TelecommunicationType.tel
                                } ),
                                addr: new Address( {
                                    streetName: "Krankenhausstraße",
                                    houseNumber: "240",
                                    postalCode: "51371",
                                    city: "Leverkusen"
                                } )
                            } )
                        } )
                    } ),
                    informationRecipient: new InformationRecipient( {
                        typeCode: InformationRecipientRole.PrimaryRecipient,
                        intendedRecipient: new IntendedRecipient( {
                            id: new InstanceIdentifier( {
                                extension: "190388km89",
                                root: "2.16.840.1.113883.3.24535"
                            } ),
                            informationRecipient: new Person( {
                                name: new PersonName( {
                                    family: "Phyllin"
                                } )
                            } ),
                            receivedOrganization: new Organization( {
                                name: new OrganizationName( "Wohlsein Krankenhaus" ),
                                telecom: new Telecommunication( {
                                    use: PostalAddressUse.WorkPlace,
                                    value: "0242127070",
                                    type: TelecommunicationType.tel
                                } ),
                                addr: new Address( {
                                    streetName: "Krankenhausstraße",
                                    houseNumber: "240",
                                    postalCode: "51371",
                                    city: "Leverkusen"
                                } )
                            } )
                        } )
                    } ),
                    authenticator: new Authenticator( {
                        time: new Time( "2006-07-21" ),
                        signatureCode: new Code( {
                            code: ParticipationSignature.Signed,
                            codeValidation: ParticipationSignature
                        } ),
                        assignedEntity: new AssignedEntity( {
                            id: new InstanceIdentifier( {
                                extension: "6319123",
                                root: "2.16.840.1.113883.3.933"
                            } ),
                            assignedPerson: new AssignedPerson( {
                                name: new PersonName( { family: "Topp-Glücklich" } )
                            } ),
                            representedOrganization: new Organization( {
                                name: new OrganizationName( "Dr.med. Hans Topp-Glücklich" ),
                                telecom: new Telecommunication( {
                                    value: "061512222222",
                                    type: TelecommunicationType.fax
                                } ),
                                addr: new Address( {
                                    city: "Darmstadt"
                                } )
                            } )
                        } )
                    } ),
                    legalAuthenticator: new Authenticator( {
                        time: new Time( "2006-07-21" ),
                        signatureCode: new Code( {
                            code: ParticipationSignature.Signed,
                            codeValidation: ParticipationSignature
                        } ),
                        assignedEntity: new AssignedEntity( {
                            id: new InstanceIdentifier( {
                                extension: "6319123",
                                root: "2.16.840.1.113883.3.933"
                            } ),
                            assignedPerson: new AssignedPerson( {
                                name: new PersonName( { family: "Topp-Glücklich" } )
                            } ),
                            representedOrganization: new Organization( {
                                name: new OrganizationName( "Dr.med. Hans Topp-Glücklich" ),
                                telecom: new Telecommunication( {
                                    value: "061512222222",
                                    type: TelecommunicationType.fax
                                } ),
                                addr: new Address( {
                                    city: "Darmstadt"
                                } )
                            } )
                        } )
                    } ),
                    participant: new Participant( {
                        typeCode: ParticipationTypeForParticipant.Holder,
                        time: new Time( {
                            low: "2020-01-01",
                            high: "2021-01-01"
                        } ),
                        associatedEntity: new AssociatedEntity( {
                            id: new InstanceIdentifier( {
                                extension: "12-254-4569/9",
                                root: "2.16.840.1.113883.2.6.234.93345"
                            } ),
                            classCode: RoleClassAssociative.PolicyHolder,
                            associatedPerson: new Person( {
                                name: new PersonName( {
                                    given: "Florian",
                                    family: "Gattano"
                                } )
                            } ),
                            code: new Code( {
                                code: PersonalRelationshipRoleType.FamilyMember,
                                codeSystem: CodeSystemTypes.PersonalRelationshipRoleType
                            } ),
                            addr: new Address( {
                                streetName: "Große Rurstraße",
                                houseNumber: "38",
                                postalCode: "52428",
                                city: "Jülich"
                            } ),
                            scopingOrganization: new Organization( {
                                id: new InstanceIdentifier( {
                                    extension: "93345",
                                    root: "2.16.840.1.113883.2.6.234"
                                } ),
                                name: new OrganizationName( "Wohlkouvert Versicherungsgesellschaft" ),
                                telecom: new Telecommunication( {
                                    use: PostalAddressUse.WorkPlace,
                                    value: "0242127070",
                                    type: TelecommunicationType.tel
                                } ),
                                addr: new Address( {
                                    streetName: "Versicherungsgasse",
                                    houseNumber: "69",
                                    postalCode: "52401",
                                    city: "Jülich"
                                } )
                            } )
                        } )
                    } ),
                    relatedDocument: new RelatedDocument( {
                        typeCode: DocumentRelationshipType.Appends,
                        parentDocument: new ParentDocument( {
                            id: new InstanceIdentifier( {
                                extension: "463957847",
                                root: "1.2.276.0.58"
                            } )
                        } )
                    } ),
                    componentOf: new ComponentOf( {
                        encompassingEncounter: {
                            id: new InstanceIdentifier( {
                                root: "test",
                                extension: "testExt"
                            } ),
                            effectiveTime: new Time( {
                                low: "2020-01-01",
                                high: "2021-01-01"
                            } ),
                            code: new Code( {
                                code: EncounterCode.InpatientEncounter,
                                codeSystem: CodeSystemTypes.EncounterCode,
                                codeValidation: EncounterCode
                            } ),
                            dischargeDispositionCode: new Code( {
                                code: DischargeDispositionCode.Home,
                                codeSystem: CodeSystemTypes.DischargeDispositionCode,
                                codeValidation: DischargeDispositionCode
                            } ),
                            responsibleParty: new ResponsibleParty( {
                                assignedEntity: new AssignedEntity( {
                                    id: new InstanceIdentifier( {
                                        extension: "190388km89",
                                        root: "2.16.840.1.113883.3.24535"
                                    } ),
                                    assignedPerson: new AssignedPerson( {
                                        name: { family: "Phyllin" }
                                    } ),
                                    representedOrganization: new Organization( {
                                        name: "Wohlsein Krankenhaus",
                                        telecom: new Telecommunication( {
                                            use: PostalAddressUse.WorkPlace,
                                            value: "0242127070",
                                            type: TelecommunicationType.tel
                                        } ),
                                        addr: new Address( {
                                            streetName: "Krankenhausstraße",
                                            houseNumber: "240",
                                            postalCode: "51371",
                                            city: "Leverkusen"
                                        } )
                                    } )
                                } )
                            } ),
                            encounterParticipant: new EncounterParticipant( {
                                time: new Time( "2020-12-11" ),
                                typeCode: EncounterParticipantType.Admitter,
                                assignedEntity: new AssignedEntity( {
                                    id: {
                                        extension: "190388km89",
                                        root: "2.16.840.1.113883.3.24535"
                                    },
                                    assignedPerson: { name: { family: "Phyllin" } },
                                    representedOrganization: {
                                        name: "Wohlsein Krankenhaus",
                                        telecom: [{ value: "0242127070", type: TelecommunicationType.tel }],
                                        addr: { city: "Leverkusen" }
                                    }
                                } )
                            } ),
                            location: new Location( {
                                healthCareFacility: new HealthCareFacility( {
                                    id: new InstanceIdentifier( {
                                        root: "testRoot",
                                        extension: "lalala"
                                    } ),
                                    code: new Code( {
                                        code: EncounterCode.Ambulatory,
                                        codeSystem: CodeSystemTypes.EncounterCode,
                                        codeValidation: EncounterCode
                                    } ),
                                    location: new Place( {
                                        addr: new Address( {
                                            streetName: "test"
                                        } )
                                    } ),
                                    serviceProviderOrganization: new Organization( {
                                        name: "Test-Org",
                                        telecom: new Telecommunication( {
                                            use: PostalAddressUse.WorkPlace,
                                            value: "0242127070",
                                            type: TelecommunicationType.tel
                                        } ),
                                        addr: new Address( {
                                            streetName: "Krankenhausstraße",
                                            houseNumber: "240",
                                            postalCode: "51371",
                                            city: "Leverkusen"
                                        } )
                                    } )
                                } )
                            } )
                        }
                    } ),
                    authorization: new Authorization( {
                        consent: new Consent( {
                            id: new InstanceIdentifier( {
                                root: "testRoot",
                                extension: "lalala"
                            } ),
                            code: new Code( {
                                code: EncounterCode.Ambulatory,
                                codeSystem: CodeSystemTypes.EncounterCode,
                                codeValidation: EncounterCode
                            } )
                        } )
                    } )
                };
            } );

            describe( '#constructor()', function() {

                it( 'returns a new instance for the given parameters', function() {
                    const candidate = new ClinicalDocument( this.fixture );

                    expect( candidate.id ).to.be.eql( this.fixture.id );
                    expect( candidate.setId ).to.be.eql( this.fixture.setId );
                    expect( candidate.versionNumber ).to.be.equal( parseInt( this.fixture.versionNumber, 10 ) );
                    expect( candidate.code ).to.be.eql( this.fixture.code );
                    expect( candidate.title ).to.be.equal( this.fixture.title );
                    expect( candidate.effectiveTime ).to.be.eql( this.fixture.effectiveTime );
                    expect( candidate.confidentialityCode ).to.be.eql( this.fixture.confidentialityCode );
                    expect( candidate.recordTarget ).to.be.eql( [this.fixture.recordTarget].flat() );
                    expect( candidate.author ).to.be.eql( [this.fixture.author].flat() );
                    expect( candidate.custodian ).to.be.eql( this.fixture.custodian );
                    expect( candidate.informationRecipient ).to.be.eql( [this.fixture.informationRecipient].flat() );
                    expect( candidate.authenticator ).to.be.eql( [this.fixture.authenticator].flat() );
                    expect( candidate.legalAuthenticator ).to.be.eql( this.fixture.legalAuthenticator );
                    expect( candidate.participant ).to.be.eql( [this.fixture.participant].flat() );
                    expect( candidate.relatedDocument ).to.be.eql( [this.fixture.relatedDocument].flat() );
                    expect( candidate.componentOf ).to.be.eql( this.fixture.componentOf );
                    expect( candidate.authorization ).to.be.eql( [this.fixture.authorization].flat() );
                    expect( candidate.languageCode ).to.be.eql( new Code( {
                        code: this.fixture.languageCode,
                        codeSystemForbidden: true,
                        codeValidation: ClinicalDocument.REGEXP_LANGUAGECODE
                    } ) );
                } );

                it( 'throws a TypeError if a required parameter is missing', function() {

                    for( const required of this.required ) {
                        const
                            fixture = JSON.parse( JSON.stringify( this.fixture ) ),
                            message = `missing required property "${required}" should throw a TypeError`;

                        delete fixture[required];

                        // eslint-disable-next-line no-loop-func
                        expect( () => new ClinicalDocument( fixture ), message ).to.throw( TypeError );
                    }

                } );
            } );

            describe( '#toXMLObject()', function() {

                it( 'returns a valid XML object parsable by xml2js', function() {

                    const candidate = new ClinicalDocument( this.fixture );

                    expect( candidate.toXMLObject() ).to.be.eql( {
                        "$": {
                            "xmlns": "urn:hl7-org:v3",
                            "xmlns:voc": "urn:hl7-org:v3/voc",
                            "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance"
                        },
                        "typeId": { "$": { "root": "2.16.840.1.113883.1.3", "extension": "POCD_HD000040" } },
                        "templateId": { "$": { "extension": "CDA-R2-AB100", "root": "1.2.276.0.76.3.1.13.10" } },
                        "id": this.fixture.id.toXMLObject(),
                        "setId": this.fixture.setId.toXMLObject(),
                        "versionNumber": { "$": { "value": parseInt( this.fixture.versionNumber, 10 ) } },
                        "code": this.fixture.code.toXMLObject(),
                        "title": { "_": this.fixture.title },
                        "languageCode": new Code( this.fixture.languageCode ).toXMLObject(),
                        "effectiveTime": this.fixture.effectiveTime.toXMLObject(),
                        "confidentialityCode": this.fixture.confidentialityCode.toXMLObject(),
                        "recordTarget": [this.fixture.recordTarget.toXMLObject()],
                        "author": [this.fixture.author.toXMLObject()],
                        "custodian": this.fixture.custodian.toXMLObject(),
                        "informationRecipient": [this.fixture.informationRecipient.toXMLObject()],
                        "authenticator": [this.fixture.authenticator.toXMLObject()],
                        "legalAuthenticator": this.fixture.legalAuthenticator.toXMLObject(),
                        "participant": [this.fixture.participant.toXMLObject()],
                        "relatedDocument": [this.fixture.relatedDocument.toXMLObject()],
                        "componentOf": this.fixture.componentOf.toXMLObject(),
                        "authorization": [this.fixture.authorization.toXMLObject()],
                        "component": {
                            "structuredBody": {
                                "component": {
                                    "section": {}
                                }
                            }
                        }
                    } );
                } );
            } );

            describe( '#toXMLString()', function() {

                it( 'returns a valid XML string', function() {
                    const candidate = new ClinicalDocument( this.fixture );

                    expect( candidate.toXMLString() ).to.be.equal(
                        '<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:voc="urn:hl7-org:v3/voc" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/><templateId extension="CDA-R2-AB100" root="1.2.276.0.76.3.1.13.10"/><id extension="60467,36049" root="1.2.276.0.58"/><code code="11490-0" codeSystem="2.16.840.1.113883.6.1"/><title>Test Discharge Summarization Note</title><effectiveTime value="202102210000"/><confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" codeSystemVersion="2012-07-24" displayName="Normal"/><languageCode code="de-DE"/><setId extension="D1" root="2.16.840.1.113883.3.933"/><versionNumber value="1"/><recordTarget><patientRole><id extension="mongoIdOfTheUser" root="1.2.276.0.76.3.1.460.0.12345.123456789"/><id extension="A123456789" root="1.2.276.0.76.4.8"/><addr><streetName>Musterstr.</streetName><houseNumber>5</houseNumber><postalCode>65432</postalCode><city>Musterhausen</city><country>Deutschland</country></addr><telecom value="tel:030.456.345345"/><patient><name><prefix qualifier="AC">Dr. rer. nat.</prefix><given>Michael</given><family>Kleinert</family></name><administrativeGenderCode code="M" codeSystem="2.16.840.1.113883.5.1"/><birthTime value="19890605"/><birthplace><place><addr><city>Berlin</city></addr></place></birthplace></patient><providerOrganization><name>test</name><telecom nullFlavor="UNK"/><addr><streetName>Musterstr.</streetName><houseNumber>5</houseNumber><postalCode>65432</postalCode><city>Musterhausen</city><country>Deutschland</country></addr></providerOrganization></patientRole></recordTarget><author><functionCode code="ADM" codeSystem="2.16.840.1.113883.5.90"/><time value="202110210000"/><assignedAuthor><id extension="190388km89" root="2.16.840.1.113883.3.24535"/><assignedPerson><name><prefix qualifier="AC">Dr. med.</prefix><given>Theo</given><family>Phyllin</family></name></assignedPerson><representedOrganization><name>Wohlsein Krankenhaus</name><telecom use="WP" value="tel:0242127070"/><addr><streetName>Krankenhausstraße</streetName><houseNumber>240</houseNumber><postalCode>51371</postalCode><city>Leverkusen</city></addr></representedOrganization></assignedAuthor></author><custodian><assignedCustodian><representedCustodianOrganization><id extension="testExt" root="test"/><name>Wohlsein Krankenhaus</name><telecom use="WP" value="tel:0242127070"/><addr><streetName>Krankenhausstraße</streetName><houseNumber>240</houseNumber><postalCode>51371</postalCode><city>Leverkusen</city></addr></representedCustodianOrganization></assignedCustodian></custodian><informationRecipient typeCode="PRCP"><intendedRecipient><id extension="190388km89" root="2.16.840.1.113883.3.24535"/><informationRecipient><name><family>Phyllin</family></name></informationRecipient><receivedOrganization><name>Wohlsein Krankenhaus</name><telecom use="WP" value="tel:0242127070"/><addr><streetName>Krankenhausstraße</streetName><houseNumber>240</houseNumber><postalCode>51371</postalCode><city>Leverkusen</city></addr></receivedOrganization></intendedRecipient></informationRecipient><legalAuthenticator><time value="200607210000"/><signatureCode code="S"/><assignedEntity><id extension="6319123" root="2.16.840.1.113883.3.933"/><assignedPerson><name><family>Topp-Glücklich</family></name></assignedPerson><representedOrganization><name>Dr.med. Hans Topp-Glücklich</name><telecom value="fax:061512222222"/><addr><city>Darmstadt</city></addr></representedOrganization></assignedEntity></legalAuthenticator><authenticator><time value="200607210000"/><signatureCode code="S"/><assignedEntity><id extension="6319123" root="2.16.840.1.113883.3.933"/><assignedPerson><name><family>Topp-Glücklich</family></name></assignedPerson><representedOrganization><name>Dr.med. Hans Topp-Glücklich</name><telecom value="fax:061512222222"/><addr><city>Darmstadt</city></addr></representedOrganization></assignedEntity></authenticator><participant typeCode="HLD"><time><low value="202001010000"/><high value="202101010000" inclusive="true"/></time><associatedEntity classCode="POLHOLD"><id extension="12-254-4569/9" root="2.16.840.1.113883.2.6.234.93345"/><code code="FAMMEMB" codeSystem="2.16.840.1.113883.1.11.19563"/><addr><streetName>Große Rurstraße</streetName><houseNumber>38</houseNumber><postalCode>52428</postalCode><city>Jülich</city></addr><associatedPerson><name><given>Florian</given><family>Gattano</family></name></associatedPerson><scopingOrganization><id extension="93345" root="2.16.840.1.113883.2.6.234"/><name>Wohlkouvert Versicherungsgesellschaft</name><telecom use="WP" value="tel:0242127070"/><addr><streetName>Versicherungsgasse</streetName><houseNumber>69</houseNumber><postalCode>52401</postalCode><city>Jülich</city></addr></scopingOrganization></associatedEntity></participant><relatedDocument typeCode="APND"><parentDocument><id extension="463957847" root="1.2.276.0.58"/></parentDocument></relatedDocument><authorization><consent><id extension="lalala" root="testRoot"/><code code="AMB" codeSystem="2.16.840.1.113883.5.4"/><statusCode code="completed"/></consent></authorization><componentOf><encompassingEncounter><id extension="testExt" root="test"/><code code="IMP" codeSystem="2.16.840.1.113883.5.4"/><effectiveTime><low value="202001010000"/><high value="202101010000" inclusive="true"/></effectiveTime><dischargeDispositionCode code="home" codeSystem="2.16.840.1.113883.4.642.4.1093"/><responsibleParty><assignedEntity><id extension="190388km89" root="2.16.840.1.113883.3.24535"/><assignedPerson><name><family>Phyllin</family></name></assignedPerson><representedOrganization><name>Wohlsein Krankenhaus</name><telecom use="WP" value="tel:0242127070"/><addr><streetName>Krankenhausstraße</streetName><houseNumber>240</houseNumber><postalCode>51371</postalCode><city>Leverkusen</city></addr></representedOrganization></assignedEntity></responsibleParty><encounterParticipant typeCode="ADM"><time value="202012110000"/><assignedEntity><id extension="190388km89" root="2.16.840.1.113883.3.24535"/><assignedPerson><name><family>Phyllin</family></name></assignedPerson><representedOrganization><name>Wohlsein Krankenhaus</name><telecom value="tel:0242127070"/><addr><city>Leverkusen</city></addr></representedOrganization></assignedEntity></encounterParticipant><location><healthCareFacility><id extension="lalala" root="testRoot"/><code code="AMB" codeSystem="2.16.840.1.113883.5.4"/><location><addr><streetName>test</streetName></addr></location><serviceProviderOrganization><name>Test-Org</name><telecom use="WP" value="tel:0242127070"/><addr><streetName>Krankenhausstraße</streetName><houseNumber>240</houseNumber><postalCode>51371</postalCode><city>Leverkusen</city></addr></serviceProviderOrganization></healthCareFacility></location></encompassingEncounter></componentOf><component><structuredBody><component><section/></component></structuredBody></component></ClinicalDocument>'
                    );
                } );

                it( 'output of XML validates against schema without errors', async function() {
                    const candidate = new ClinicalDocument( this.fixture );

                    expect( await ClinicalDocument.validateXMLString( candidate.toXMLString() ) ).to.be.eql( [] );
                } );
            } );

            describe( '.fromXMLString()', function() {

                it( 'parses its own exported XML without an error', async function() {
                    const candidate = new ClinicalDocument( this.fixture );

                    expect( await ClinicalDocument.fromXMLString( candidate.toXMLString() ) ).to.be.eql( candidate );
                } );
            } );
        } );

        context( 'given set of valid required parameters', function() {

            beforeEach( function() {
                // contains the settings for various fixtures NOT producing an error during ClinicalDocument creation
                this.fixture = {
                    id: new InstanceIdentifier( {
                        extension: "60467,36049",
                        root: "1.2.276.0.58"
                    } ),
                    code: new Code( {
                        code: DocumentTypeCode.DischargeSummarizationNoteAmbulantPhysician,
                        codeSystem: CodeSystemTypes.DocumentTypeCode,
                        codeValidation: DocumentTypeCode
                    } ),
                    effectiveTime: new Time( "2021-02-21" ),
                    confidentialityCode: new Code( {
                        code: ConfidentialityCode.Normal,
                        codeSystem: CodeSystemTypes.ConfidentialityCode,
                        // NOTE: these values are NOT required here, but included for schema validation purposes
                        codeSystemName: "Confidentiality",
                        codeSystemVersion: "2012-07-24",
                        displayName: "Normal",
                        codeValidation: ConfidentialityCode
                    } ),
                    recordTarget: new RecordTarget( {
                        patientRole: new PatientRole( {
                            id: [
                                new InstanceIdentifier( {
                                    extension: "mongoIdOfTheUser",
                                    root: InstanceIdentifier.getSystemGUID( 12345, 123456789 )
                                } ),
                                new InstanceIdentifier( {
                                    extension: "A123456789",
                                    root: CodeSystemTypes.PatientInsuranceNr
                                } )
                            ],
                            patient: new Patient( {
                                name: new PersonName( {
                                    prefix: new EntityNamePart( {
                                        value: "Dr. rer. nat.",
                                        qualifier: EntityNamePartQualifier.Academic
                                    } ),
                                    given: "Michael",
                                    family: "Kleinert"
                                } ),
                                administrativeGenderCode: new Code( {
                                    code: AdministrativeGender.Male,
                                    codeSystem: CodeSystemTypes.AdministrativeGenderCodes,
                                    codeValidation: AdministrativeGender
                                } ),
                                birthTime: new Time( "1989-06-05" ),
                                birthPlace: new BirthPlace( { place: { addr: { city: "Berlin" } } } )
                            } ),
                            addr: new Address( {
                                streetName: "Musterstr.",
                                houseNumber: "5",
                                postalCode: "65432",
                                city: "Musterhausen",
                                country: "Deutschland"
                            } ),
                            telecom: new Telecommunication( {
                                type: TelecommunicationType.tel,
                                value: "030.456.345345"
                            } ),
                            providerOrganization: new Organization( {
                                name: "test",
                                addr: new Address( {
                                    streetName: "Musterstr.",
                                    houseNumber: "5",
                                    postalCode: "65432",
                                    city: "Musterhausen",
                                    country: "Deutschland"
                                } )
                            } )
                        } )
                    } ),
                    author: new Author( {
                        assignedAuthor: new AssignedAuthor( {
                            id: new InstanceIdentifier( {
                                extension: "190388km89",
                                root: "2.16.840.1.113883.3.24535"
                            } ),
                            assignedPerson: new AssignedPerson( {
                                name: new PersonName( {
                                    prefix: new EntityNamePart( {
                                        value: "Dr. med.",
                                        qualifier: EntityNamePartQualifier.Academic
                                    } ),
                                    given: "Theo",
                                    family: ["Phyllin"]
                                } )
                            } ),
                            representedOrganization: new Organization( {
                                name: new OrganizationName( "Wohlsein Krankenhaus" ),
                                telecom: new Telecommunication( {
                                    use: PostalAddressUse.WorkPlace,
                                    value: "0242127070",
                                    type: TelecommunicationType.tel
                                } ),
                                addr: new Address( {
                                    streetName: "Krankenhausstraße",
                                    houseNumber: "240",
                                    postalCode: "51371",
                                    city: "Leverkusen"
                                } )
                            } )
                        } ),
                        time: new Time( "2021-10-21" ),
                        functionCode: new Code( {
                            code: ParticipationType.Admitter,
                            codeSystem: CodeSystemTypes.ParticipationType,
                            codeValidation: ParticipationType
                        } )
                    } ),
                    custodian: new Custodian( {
                        assignedCustodian: new AssignedCustodian( {
                            representedCustodianOrganization: new CustodianOrganization( {
                                id: new InstanceIdentifier( {
                                    root: "test",
                                    extension: "testExt"
                                } ),
                                name: new OrganizationName( "Wohlsein Krankenhaus" ),
                                telecom: new Telecommunication( {
                                    use: PostalAddressUse.WorkPlace,
                                    value: "0242127070",
                                    type: TelecommunicationType.tel
                                } ),
                                addr: new Address( {
                                    streetName: "Krankenhausstraße",
                                    houseNumber: "240",
                                    postalCode: "51371",
                                    city: "Leverkusen"
                                } )
                            } )
                        } )
                    } )
                };
            } );

            describe( '#constructor()', function() {

                it( 'returns a new instance for the given parameters', function() {
                    const candidate = new ClinicalDocument( this.fixture );

                    expect( candidate.id ).to.be.eql( this.fixture.id );
                    expect( candidate.setId ).to.be.eql( null );
                    expect( candidate.versionNumber ).to.be.equal( null );
                    expect( candidate.code ).to.be.eql( this.fixture.code );
                    expect( candidate.title ).to.be.equal( null );
                    expect( candidate.effectiveTime ).to.be.eql( this.fixture.effectiveTime );
                    expect( candidate.confidentialityCode ).to.be.eql( this.fixture.confidentialityCode );
                    expect( candidate.recordTarget ).to.be.eql( [this.fixture.recordTarget].flat() );
                    expect( candidate.author ).to.be.eql( [this.fixture.author].flat() );
                    expect( candidate.custodian ).to.be.eql( this.fixture.custodian );
                    expect( candidate.informationRecipient ).to.be.eql( [] );
                    expect( candidate.authenticator ).to.be.eql( [] );
                    expect( candidate.legalAuthenticator ).to.be.eql( null );
                    expect( candidate.participant ).to.be.eql( [] );
                    expect( candidate.relatedDocument ).to.be.eql( [] );
                    expect( candidate.componentOf ).to.be.eql( null );
                    expect( candidate.authorization ).to.be.eql( [] );
                    expect( candidate.languageCode ).to.be.eql( null );
                } );

                it( 'throws a TypeError if a required parameter is missing', function() {

                    for( const required of this.required ) {
                        const
                            fixture = JSON.parse( JSON.stringify( this.fixture ) ),
                            message = `missing required property "${required}" should throw a TypeError`;

                        delete fixture[required];

                        // eslint-disable-next-line no-loop-func
                        expect( () => new ClinicalDocument( fixture ), message ).to.throw( TypeError );
                    }

                } );
            } );

            describe( '#toXMLObject()', function() {

                it( 'returns a valid XML object parsable by xml2js', function() {

                    const candidate = new ClinicalDocument( this.fixture );

                    expect( candidate.toXMLObject() ).to.be.eql( {
                        "$": {
                            "xmlns": "urn:hl7-org:v3",
                            "xmlns:voc": "urn:hl7-org:v3/voc",
                            "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance"
                        },
                        "typeId": { "$": { "root": "2.16.840.1.113883.1.3", "extension": "POCD_HD000040" } },
                        "templateId": { "$": { "extension": "CDA-R2-AB100", "root": "1.2.276.0.76.3.1.13.10" } },
                        "id": this.fixture.id.toXMLObject(),
                        "code": this.fixture.code.toXMLObject(),
                        "effectiveTime": this.fixture.effectiveTime.toXMLObject(),
                        "confidentialityCode": this.fixture.confidentialityCode.toXMLObject(),
                        "recordTarget": [this.fixture.recordTarget.toXMLObject()],
                        "author": [this.fixture.author.toXMLObject()],
                        "custodian": this.fixture.custodian.toXMLObject(),
                        "component": {
                            "structuredBody": {
                                "component": {
                                    "section": {}
                                }
                            }
                        }
                    } );
                } );

            } );

            describe( '#toXMLString()', function() {

                it( 'returns a valid XML string', function() {
                    const candidate = new ClinicalDocument( this.fixture );

                    expect( candidate.toXMLString() ).to.be.equal(
                        '<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:voc="urn:hl7-org:v3/voc" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/><templateId extension="CDA-R2-AB100" root="1.2.276.0.76.3.1.13.10"/><id extension="60467,36049" root="1.2.276.0.58"/><code code="11490-0" codeSystem="2.16.840.1.113883.6.1"/><effectiveTime value="202102210000"/><confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality" codeSystemVersion="2012-07-24" displayName="Normal"/><recordTarget><patientRole><id extension="mongoIdOfTheUser" root="1.2.276.0.76.3.1.460.0.12345.123456789"/><id extension="A123456789" root="1.2.276.0.76.4.8"/><addr><streetName>Musterstr.</streetName><houseNumber>5</houseNumber><postalCode>65432</postalCode><city>Musterhausen</city><country>Deutschland</country></addr><telecom value="tel:030.456.345345"/><patient><name><prefix qualifier="AC">Dr. rer. nat.</prefix><given>Michael</given><family>Kleinert</family></name><administrativeGenderCode code="M" codeSystem="2.16.840.1.113883.5.1"/><birthTime value="19890605"/><birthplace><place><addr><city>Berlin</city></addr></place></birthplace></patient><providerOrganization><name>test</name><telecom nullFlavor="UNK"/><addr><streetName>Musterstr.</streetName><houseNumber>5</houseNumber><postalCode>65432</postalCode><city>Musterhausen</city><country>Deutschland</country></addr></providerOrganization></patientRole></recordTarget><author><functionCode code="ADM" codeSystem="2.16.840.1.113883.5.90"/><time value="202110210000"/><assignedAuthor><id extension="190388km89" root="2.16.840.1.113883.3.24535"/><assignedPerson><name><prefix qualifier="AC">Dr. med.</prefix><given>Theo</given><family>Phyllin</family></name></assignedPerson><representedOrganization><name>Wohlsein Krankenhaus</name><telecom use="WP" value="tel:0242127070"/><addr><streetName>Krankenhausstraße</streetName><houseNumber>240</houseNumber><postalCode>51371</postalCode><city>Leverkusen</city></addr></representedOrganization></assignedAuthor></author><custodian><assignedCustodian><representedCustodianOrganization><id extension="testExt" root="test"/><name>Wohlsein Krankenhaus</name><telecom use="WP" value="tel:0242127070"/><addr><streetName>Krankenhausstraße</streetName><houseNumber>240</houseNumber><postalCode>51371</postalCode><city>Leverkusen</city></addr></representedCustodianOrganization></assignedCustodian></custodian><component><structuredBody><component><section/></component></structuredBody></component></ClinicalDocument>'
                    );
                } );

                it( 'output of XML validates against schema without errors', async function() {
                    const candidate = new ClinicalDocument( this.fixture );

                    expect( await ClinicalDocument.validateXMLString( candidate.toXMLString() ) ).to.be.eql( [] );
                } );
            } );

            describe( '.fromXMLString()', function() {

                it( 'parses its own exported XML without an error', async function() {
                    const candidate = new ClinicalDocument( this.fixture );

                    expect( await ClinicalDocument.fromXMLString( candidate.toXMLString() ) ).to.be.eql( candidate );
                } );
            } );
        } );

        context( 'given valid XML files', function() {

            describe( '.fromXMLString()', function() {

                before( async function() {
                    this.fixtures = [
                        'arztbrief2015-example1.xml',
                        'arztbrief2015-example2.xml',
                        'arztbrief2015-example3.xml'
                    ].reduce(
                        ( fixtures, file ) => ( {
                            ...fixtures,
                            [file]: fs.promises.readFile( path.join( this.testXMLFileRootPath, file ), { encoding: "utf8" } )
                        } ),
                        {}
                    );
                } );

                it( 'parses given XML files without an error', async function() {
                    for( const [file, content] of Object.entries( this.fixtures ) ) {
                        expect(
                            await ClinicalDocument.fromXMLString( await content ),
                            `could not parse ${file}`
                        ).to.be.instanceOf( ClinicalDocument );
                    }
                } );
            } );
        } );
    } );
} );

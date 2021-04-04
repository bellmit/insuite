import moment from 'moment';

function getMedicationTemplate() {
    return {
        "dosis": "1-0-0-0",
        "isPrescribed": true,
        "phDosisAfternoon": "0",
        "phDosisEvening": "0",
        "phDosisMorning": "1",
        "phDosisNight": "0",
        "phDosisType": "SCHEDULE",
        "phForm": "Tbl.",
        "phNLabel": "Ramipril - 1 A Pharma® 10mg 100 Tbl. N3",
        "phPZN": "00766819",
        "phPackQuantity": 1,
        "phPackSize": "100 st"
    };
}

describe( 'Y.doccirrus.schemas.activity', function() {
    beforeEach( async function() {
        await import( './activity-schema.common.yui' );
        this.currentStartOfDay = moment().startOf( 'day' );
        this.medication = {
            ...getMedicationTemplate(),
            timestamp: this.currentStartOfDay.toISOString()
        };
    } );
    afterEach( function() {
        Y = null;
    } );
    describe( '.calculateMedicationRange()', function() {
        it( 'throws a TypeError', function() {
            expect( () => Y.doccirrus.schemas.activity.calculateMedicationRange() ).to.throw( TypeError );
        } );
        it( 'returns 0, because no timestamp was provided', function() {
            const actual = Y.doccirrus.schemas.activity.calculateMedicationRange( {} );
            expect( actual ).to.equal( 0 );
        } );
        context( 'given timestamp', function() {
            before( function() {
                this.timestamp = this.currentStartOfDay.toISOString();
            } );
            it( 'returns 0', function() {
                const actual = Y.doccirrus.schemas.activity.calculateMedicationRange( {
                    timestamp: this.timestamp
                } );
                expect( actual ).to.equal( 0 );
            } );
            context( 'given regular dosis', function() {
                before( function() {
                    this.phDosisAfternoon = '1';
                    this.phDosisEvening = '0';
                    this.phDosisMorning = '0';
                    this.phDosisNight = '0';
                    this.dosis = `${this.phDosisMorning}-${this.phDosisAfternoon}-${this.phDosisEvening}-${this.phDosisNight}`;
                } );
                it( 'returns 0', function() {
                    const actual = Y.doccirrus.schemas.activity.calculateMedicationRange( {
                        timestamp: this.timestamp,
                        phDosisAfternoon: this.phDosisAfternoon,
                        phDosisEvening: this.phDosisEvening,
                        phDosisMorning: this.phDosisMorning,
                        phDosisNight: this.phDosisNight
                    } );
                    expect( actual ).to.equal( 0 );
                } );
                context( 'given phPackSize as St', function() {
                    before( function() {
                        this.phPackSize = '100 St';
                    } );
                    it( 'returns 100', function() {
                        const actual = Y.doccirrus.schemas.activity.calculateMedicationRange( {
                            timestamp: this.timestamp,
                            phDosisAfternoon: this.phDosisAfternoon,
                            phDosisEvening: this.phDosisEvening,
                            phDosisMorning: this.phDosisMorning,
                            phDosisNight: this.phDosisNight,
                            phPackSize: this.phPackSize
                        } );
                        expect( actual ).to.equal( 100 );
                    } );
                    context( 'given phDosisType as text', function() {
                        before( function() {
                            this.phDosisType = 'TEXT';
                        } );
                        it( 'returns 100', function() {
                            const actual = Y.doccirrus.schemas.activity.calculateMedicationRange( {
                                timestamp: this.timestamp,
                                dosis: this.dosis,
                                phDosisType: this.phDosisType,
                                phPackSize: this.phPackSize
                            } );
                            expect( actual ).to.equal( 100 );
                        } );
                    } );
                } );
                context( 'given phPackSize as ml', function() {
                    before( function() {
                        this.phPackSize = '100 ml';
                    } );
                    it( 'returns 100', function() {
                        const actual = Y.doccirrus.schemas.activity.calculateMedicationRange( {
                            timestamp: this.timestamp,
                            phDosisAfternoon: this.phDosisAfternoon,
                            phDosisEvening: this.phDosisEvening,
                            phDosisMorning: this.phDosisMorning,
                            phDosisNight: this.phDosisNight,
                            phPackSize: this.phPackSize
                        } );
                        expect( actual ).to.equal( 100 );
                    } );
                    context( 'given phDosisType as text', function() {
                        before( function() {
                            this.phDosisType = 'TEXT';
                        } );
                        it( 'returns 100', function() {
                            const actual = Y.doccirrus.schemas.activity.calculateMedicationRange( {
                                timestamp: this.timestamp,
                                dosis: this.dosis,
                                phDosisType: this.phDosisType,
                                phPackSize: this.phPackSize
                            } );
                            expect( actual ).to.equal( 100 );
                        } );
                    } );
                } );
                context( 'given phPackSize with invalid characters', function() {
                    before( function() {
                        this.phPackSize = '100 foo';
                    } );
                    it( 'returns 100', function() {
                        const actual = Y.doccirrus.schemas.activity.calculateMedicationRange( {
                            timestamp: this.timestamp,
                            phDosisAfternoon: this.phDosisAfternoon,
                            phDosisEvening: this.phDosisEvening,
                            phDosisMorning: this.phDosisMorning,
                            phDosisNight: this.phDosisNight,
                            phPackSize: this.phPackSize
                        } );
                        expect( actual ).to.equal( 0 );
                    } );
                    context( 'given phDosisType as text', function() {
                        before( function() {
                            this.phDosisType = 'TEXT';
                        } );
                        it( 'returns 100', function() {
                            const actual = Y.doccirrus.schemas.activity.calculateMedicationRange( {
                                timestamp: this.timestamp,
                                dosis: this.dosis,
                                phDosisType: this.phDosisType,
                                phPackSize: this.phPackSize
                            } );
                            expect( actual ).to.equal( 0 );
                        } );
                    } );
                } );
            } );
            context( 'given dosis with fractions', function() {
                before( function() {
                    this.phDosisAfternoon = '1/2';
                    this.phDosisEvening = '1/2';
                    this.phDosisMorning = '1/2';
                    this.phDosisNight = '1/2';
                    this.dosis = `${this.phDosisMorning}-${this.phDosisAfternoon}-${this.phDosisEvening}-${this.phDosisNight}`;
                } );
                it( 'returns 0', function() {
                    const actual = Y.doccirrus.schemas.activity.calculateMedicationRange( {
                        timestamp: this.timestamp,
                        phDosisAfternoon: this.phDosisAfternoon,
                        phDosisEvening: this.phDosisEvening,
                        phDosisMorning: this.phDosisMorning,
                        phDosisNight: this.phDosisNight
                    } );
                    expect( actual ).to.equal( 0 );
                } );
                context( 'given phPackSize', function() {
                    before( function() {
                        this.phPackSize = '100 St';
                    } );
                    it( 'returns 100', function() {
                        const actual = Y.doccirrus.schemas.activity.calculateMedicationRange( {
                            timestamp: this.timestamp,
                            phDosisAfternoon: this.phDosisAfternoon,
                            phDosisEvening: this.phDosisEvening,
                            phDosisMorning: this.phDosisMorning,
                            phDosisNight: this.phDosisNight,
                            phPackSize: this.phPackSize
                        } );
                        expect( actual ).to.equal( 50 );
                    } );
                    context( 'given phDosisType as text', function() {
                        before( function() {
                            this.phDosisType = 'TEXT';
                        } );
                        it( 'returns 100', function() {
                            const actual = Y.doccirrus.schemas.activity.calculateMedicationRange( {
                                timestamp: this.timestamp,
                                dosis: this.dosis,
                                phDosisType: this.phDosisType,
                                phPackSize: this.phPackSize
                            } );
                            expect( actual ).to.equal( 50 );
                        } );
                    } );
                } );
            } );
            context( 'given dosis in drops', function() {
                before( function() {
                    this.phDosisAfternoon = '1°';
                    this.phDosisEvening = '0';
                    this.phDosisMorning = '0';
                    this.phDosisNight = '0';
                    this.dosis = '1°-0-0-0';
                    this.dosis = `${this.phDosisMorning}-${this.phDosisAfternoon}-${this.phDosisEvening}-${this.phDosisNight}`;
                } );
                it( 'returns 0', function() {
                    const actual = Y.doccirrus.schemas.activity.calculateMedicationRange( {
                        timestamp: this.timestamp,
                        phDosisAfternoon: this.phDosisAfternoon,
                        phDosisEvening: this.phDosisEvening,
                        phDosisMorning: this.phDosisMorning,
                        phDosisNight: this.phDosisNight
                    } );
                    expect( actual ).to.equal( 0 );
                } );
                context( 'given phPackSize', function() {
                    before( function() {
                        this.phPackSize = '100 ml';
                    } );
                    it( 'returns 100', function() {
                        const actual = Y.doccirrus.schemas.activity.calculateMedicationRange( {
                            timestamp: this.timestamp,
                            phDosisAfternoon: this.phDosisAfternoon,
                            phDosisEvening: this.phDosisEvening,
                            phDosisMorning: this.phDosisMorning,
                            phDosisNight: this.phDosisNight,
                            phPackSize: this.phPackSize
                        } );
                        expect( actual ).to.equal( 2000 );
                    } );
                    context( 'given phDosisType as text', function() {
                        before( function() {
                            this.phDosisType = 'TEXT';
                        } );
                        it( 'returns 100', function() {
                            const actual = Y.doccirrus.schemas.activity.calculateMedicationRange( {
                                timestamp: this.timestamp,
                                dosis: this.dosis,
                                phDosisType: this.phDosisType,
                                phPackSize: this.phPackSize
                            } );
                            expect( actual ).to.equal( 2000 );
                        } );
                    } );
                } );
            } );
            context( 'given faulty/incomplete dosis', function() {
                before( function() {
                    this.phDosisAfternoon = '1';
                    this.phDosisEvening = '0';
                    this.phDosisMorning = '0';
                    this.phDosisNight = '';
                    this.dosis = `${this.phDosisMorning}-${this.phDosisAfternoon}-${this.phDosisEvening}`;
                } );
                it( 'returns 0', function() {
                    const actual = Y.doccirrus.schemas.activity.calculateMedicationRange( {
                        timestamp: this.timestamp,
                        phDosisAfternoon: this.phDosisAfternoon,
                        phDosisEvening: this.phDosisEvening,
                        phDosisMorning: this.phDosisMorning,
                        phDosisNight: this.phDosisNight
                    } );
                    expect( actual ).to.equal( 0 );
                } );
                context( 'given phPackSize', function() {
                    before( function() {
                        this.phPackSize = '100 St';
                    } );
                    it( 'returns 100', function() {
                        const actual = Y.doccirrus.schemas.activity.calculateMedicationRange( {
                            timestamp: this.timestamp,
                            phDosisAfternoon: this.phDosisAfternoon,
                            phDosisEvening: this.phDosisEvening,
                            phDosisMorning: this.phDosisMorning,
                            phDosisNight: this.phDosisNight,
                            phPackSize: this.phPackSize
                        } );
                        expect( actual ).to.equal( 100 );
                    } );
                    context( 'given phDosisType as text', function() {
                        before( function() {
                            this.phDosisType = 'TEXT';
                        } );
                        it( 'returns 0', function() {
                            const actual = Y.doccirrus.schemas.activity.calculateMedicationRange( {
                                timestamp: this.timestamp,
                                dosis: this.dosis,
                                phDosisType: this.phDosisType,
                                phPackSize: this.phPackSize
                            } );
                            expect( actual ).to.equal( 0 );
                        } );
                    } );
                } );
            } );
        } );

    } );
    describe( '.calculateMedicationRangeWithCountAndPrescribedMedications()', function() {
        before( function() {
            this.fixtures = {
                filter: this.medication.phPZN
            };
        } );

        it( 'throws a TypeError', function() {
            expect( () => Y.doccirrus.schemas.activity.calculateMedicationRangeWithCountAndPrescribedMedications() ).to.throw( TypeError );
        } );
        it( 'returns current date', function() {
            const actual = Y.doccirrus.schemas.activity.calculateMedicationRangeWithCountAndPrescribedMedications( {} );
            expect( actual ).to.equal( this.currentStartOfDay.format( 'DD.MM.YYYY' ) );
        } );
        context( 'no previous prescribed medications', function() {
            it( 'returns a date that is exactly 100 days from now', function() {
                const actual = Y.doccirrus.schemas.activity.calculateMedicationRangeWithCountAndPrescribedMedications( {
                    count: 1,
                    filter: this.fixtures.filter,
                    medication: this.medication,
                    unfilteredMedications: []
                } );
                expect( actual ).to.equal( moment( this.currentStartOfDay ).add( 100, 'days' ).format( 'DD.MM.YYYY' ) );
            } );
        } );
        context( '1 previous prescribed medication', function() {
            it( 'returns a date that is 100 days from now', function() {
                const actual = Y.doccirrus.schemas.activity.calculateMedicationRangeWithCountAndPrescribedMedications( {
                    count: 1,
                    filter: this.fixtures.filter,
                    medication: this.medication,
                    unfilteredMedications: [
                        {
                            ...getMedicationTemplate(),
                            timestamp: moment( this.currentStartOfDay ).subtract( 1, 'years' ).toISOString()
                        }
                    ]
                } );
                expect( actual ).to.equal( moment( this.currentStartOfDay ).add( 100, 'days' ).format( 'DD.MM.YYYY' ) );
            } );
            it( 'returns a date that is 110 days from now', function() {
                const actual = Y.doccirrus.schemas.activity.calculateMedicationRangeWithCountAndPrescribedMedications( {
                    count: 1,
                    filter: this.fixtures.filter,
                    medication: this.medication,
                    unfilteredMedications: [
                        {
                            ...getMedicationTemplate(),
                            timestamp: moment( this.currentStartOfDay ).subtract( 90, 'days' ).toISOString()
                        }
                    ]
                } );
                expect( actual ).to.equal( moment( this.currentStartOfDay ).add( 110, 'days' ).format( 'DD.MM.YYYY' ) );
            } );
        } );
        context( '2 previous prescribed medication', function() {
            it( 'returns a date that is 100 days from now', function() {
                const actual = Y.doccirrus.schemas.activity.calculateMedicationRangeWithCountAndPrescribedMedications( {
                    count: 1,
                    filter: this.fixtures.filter,
                    medication: this.medication,
                    unfilteredMedications: [
                        {
                            ...getMedicationTemplate(),
                            timestamp: moment( this.currentStartOfDay ).subtract( 2, 'years' ).toISOString()
                        },
                        {
                            ...getMedicationTemplate(),
                            timestamp: moment( this.currentStartOfDay ).subtract( 1, 'years' ).toISOString()
                        }
                    ].reverse()
                } );
                expect( actual ).to.equal( moment( this.currentStartOfDay ).add( 100, 'days' ).format( 'DD.MM.YYYY' ) );
            } );
            it( 'returns a date that is 150 days from now', function() {
                const actual = Y.doccirrus.schemas.activity.calculateMedicationRangeWithCountAndPrescribedMedications( {
                    count: 1,
                    filter: this.fixtures.filter,
                    medication: this.medication,
                    unfilteredMedications: [
                        {
                            ...getMedicationTemplate(),
                            timestamp: moment( this.currentStartOfDay ).subtract( 150, 'days' ).toISOString()
                        },
                        {
                            ...getMedicationTemplate(),
                            timestamp: moment( this.currentStartOfDay ).subtract( 100, 'days' ).toISOString()
                        }
                    ].reverse()
                } );
                expect( actual ).to.equal( moment( this.currentStartOfDay ).add( 150, 'days' ).format( 'DD.MM.YYYY' ) );
            } );
        } );
        context( '3 previous prescribed medication', function() {
            it( 'returns a date that is 100 days from now', function() {
                const actual = Y.doccirrus.schemas.activity.calculateMedicationRangeWithCountAndPrescribedMedications( {
                    count: 1,
                    filter: this.fixtures.filter,
                    medication: this.medication,
                    unfilteredMedications: [
                        {
                            ...getMedicationTemplate(),
                            timestamp: moment( this.currentStartOfDay ).subtract( 350, 'days' ).toISOString()
                        },
                        {
                            ...getMedicationTemplate(),
                            timestamp: moment( this.currentStartOfDay ).subtract( 300, 'days' ).toISOString()
                        },
                        {
                            ...getMedicationTemplate(),
                            timestamp: moment( this.currentStartOfDay ).subtract( 100, 'days' ).toISOString()
                        }
                    ].reverse()
                } );
                expect( actual ).to.equal( moment( this.currentStartOfDay ).add( 100, 'days' ).format( 'DD.MM.YYYY' ) );
            } );
            it( 'returns a date that is 100 days from now 2', function() {
                const actual = Y.doccirrus.schemas.activity.calculateMedicationRangeWithCountAndPrescribedMedications( {
                    count: 1,
                    filter: this.fixtures.filter,
                    medication: this.medication,
                    unfilteredMedications: [
                        {
                            ...getMedicationTemplate(),
                            timestamp: moment( this.currentStartOfDay ).subtract( 350, 'days' ).toISOString()
                        },
                        {
                            ...getMedicationTemplate(),
                            timestamp: moment( this.currentStartOfDay ).subtract( 300, 'days' ).toISOString()
                        },
                        {
                            ...getMedicationTemplate(),
                            timestamp: moment( this.currentStartOfDay ).subtract( 150, 'days' ).toISOString()
                        }
                    ].reverse()
                } );
                expect( actual ).to.equal( moment( this.currentStartOfDay ).add( 100, 'days' ).format( 'DD.MM.YYYY' ) );
            } );
        } );
    } );
} );

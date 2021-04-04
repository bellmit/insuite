/**
 * User: dcdev
 * Date: 3/12/20  12:29 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global Y, it, describe, expect */
const
    moment = require( 'moment' );

describe( 'cardio-api tests', () => {

    describe( '1. create MedDataItems from vanilla JS objects (arrays, string, number, Date)', () => {
        const
            MedDataItemSchema = Y.doccirrus.schemas.v_meddata.MedDataItemSchema,
            TIMESTAMP_FORMAT = Y.doccirrus.i18n( 'general.TIMESTAMP_FORMAT_DOQUVIDE' ),
            category = "TEST",
            separator = ">",

            // set up test data
            textValue = "textValue1",
            value = 123,

            testDate = new Date(),
            dateValue = moment( testDate ).utc().format( TIMESTAMP_FORMAT ),

            // define input objects
            testInput1 = {
                "key0": textValue,
                "key1": value,
                "key2": testDate,
                "nestedKey": {
                    "key0": textValue,
                    "key1": value,
                    "key2": testDate,
                    "nestedKey": {
                        "key0": textValue,
                        "key1": value,
                        "key2": testDate
                    }
                },
                "arrayKey": [textValue, value, testDate]
            },

            getTestOutputForKey = function( keyRoot, keyPrefix ) {
                const
                    prefix = (typeof keyPrefix === "string") ? keyPrefix : "key",
                    key = Array.isArray( keyRoot ) ? keyRoot : [];
                return [
                    new MedDataItemSchema( {
                        category,
                        type: `${[...key, `${prefix}0`].join( separator )}`,
                        value: undefined,
                        textValue,
                        unit: "",
                        sampleNormalValueText: [],
                        additionalData: {}
                    } ),
                    new MedDataItemSchema( {
                        category,
                        type: `${[...key, `${prefix}1`].join( separator )}`,
                        value: value,
                        textValue: undefined,
                        unit: "",
                        sampleNormalValueText: [],
                        additionalData: {}
                    } ),

                    new MedDataItemSchema( {
                        category,
                        type: `${[...key, `${prefix}2`].join( separator )}`,
                        value: undefined,
                        textValue: dateValue,
                        unit: "",
                        sampleNormalValueText: [],
                        additionalData: {}
                    } )
                ];
            },

            // define output objects
            testOutput2 = [
                ...getTestOutputForKey(),
                ...getTestOutputForKey( ["nestedKey"] ),
                ...getTestOutputForKey( ["nestedKey", "nestedKey"] ),
                ...getTestOutputForKey( ["arrayKey"], "" )
            ];

        it( '2.1. with options given', () => {
            let medDataItems1 = Y.doccirrus.api.cardio.getMedDataItems( testInput1, { category, separator } );
            expect( medDataItems1 ).to.deep.equal( testOutput2 );
        } );
    });
} );
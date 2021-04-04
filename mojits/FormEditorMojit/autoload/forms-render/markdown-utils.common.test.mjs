describe( 'Y.dcforms', function() {

    before( async function() {
        await import( './markdown-utils.common.yui' );
    } );

    after( function() {
        Y = null;
    } );

    describe( '.getEmbeddedBindings()', function() {
        beforeEach( function() {
            this.txt = "Dear diary,\n\n" +
                       "random text can frame any embed .... well," +
                       "lets assume the text contains may embeds, just as these ones:\n" +
                       "{{InCase_T.hmdt.1.KEY.display}}\n" +
                       "{{InCase_T.hmdt.1.KEY.SUBKEY.SUBSUBKEY.formatted}}\n" +
                       "{{InCase_T.hmdt.1.KEY.SUBKEY.SUBSUBKEY.value}}\n" +
                       "{{InCase_T.hmdt.1.KEY.display}}\n" +
                       "{{InCase_T.hmdt.1.KEY_SUBKEY_SUBSUBKEY.formatted}}\n" +
                       "{{InCase_T.hmdt.1.KEY_SUBKEY_SUBSUBKEY.value}}\n" +
                       "{{InCase_T.md.HEIGHT.display}}\n" +
                       "{{InCase_T.md.KEY.SUBKEY.unit}}\n" +
                       "{{InCase_T.md.KEY.SUBKEY.SUBSUBKEY.formatted}}\n" +
                       "\n" +
                       "In between, there may be normal text.... and much more....\n" +
                       "\n" +
                       "{{InCase_T.mdt.HEIGHT}}\n" +
                       "{{InCase_T.mdt.HEIGHT.display}}\n" +
                       "{{InCase_T.mdt.KEY.SUBKEY}}\n" +
                       "{{InCase_T.mdt.KEY.SUBKEY.unit}}\n" +
                       "{{InCase_T.mdt.KEY.SUBKEY.SUBSUBKEY.formatted}}\n" +
                       "{{InCase_T.myTable.2.exampleCol}}\n" +
                       "{{InCase_T.ip.Ramipril.targetDosis}}\n" +
                       "{{InCase_T.patientName}}\n" +
                       "{{InCase_T.patientNameWith_ComplexKey}}\n" +
                       "{{InCase_T.patientNameWith_ComplexKey.orEvenSubKey}}" +
                       "\n" +
                       "And finally, lets not forget that the text block may end with some normal text!" +
                       "\n" +
                       "See you soon!\n" +
                       "\n" +
                       "P.S. these are some special characters: äöüß\"§²³1234567890{}][/\\`'´#*~’";
        } );

        afterEach( function() {
            this.txt = null;
        } );

        it( 'returns the embeds defined in the text as array of strings', function() {
            const
                expectedEmbeds = [
                    "InCase_T.hmdt.1.KEY.display",
                    "InCase_T.hmdt.1.KEY.SUBKEY.SUBSUBKEY.formatted",
                    "InCase_T.hmdt.1.KEY.SUBKEY.SUBSUBKEY.value",
                    "InCase_T.hmdt.1.KEY.display",
                    "InCase_T.hmdt.1.KEY_SUBKEY_SUBSUBKEY.formatted",
                    "InCase_T.hmdt.1.KEY_SUBKEY_SUBSUBKEY.value",
                    "InCase_T.md.HEIGHT.display",
                    "InCase_T.md.KEY.SUBKEY.unit",
                    "InCase_T.md.KEY.SUBKEY.SUBSUBKEY.formatted",
                    "InCase_T.mdt.HEIGHT",
                    "InCase_T.mdt.HEIGHT.display",
                    "InCase_T.mdt.KEY.SUBKEY",
                    "InCase_T.mdt.KEY.SUBKEY.unit",
                    "InCase_T.mdt.KEY.SUBKEY.SUBSUBKEY.formatted",
                    "InCase_T.myTable.2.exampleCol",
                    "InCase_T.ip.Ramipril.targetDosis",
                    "InCase_T.patientName",
                    "InCase_T.patientNameWith_ComplexKey",
                    "InCase_T.patientNameWith_ComplexKey.orEvenSubKey"
                ],
                output = Y.dcforms.getEmbeddedBindings( this.txt );

            expect( output ).to.deep.equal( expectedEmbeds );
        } );
    } );

    describe( '.matchEmbedDataTable()', function() {

        beforeEach( function() {
            this.txt = "{{InCase_T.hmdt.1.KEY.display}}\n" +
                       "{{InCase_T.hmdt.1.KEY.SUBKEY.SUBSUBKEY.formatted}}\n" +
                       "{{InCase_T.hmdt.1.KEY.SUBKEY.SUBSUBKEY.value}}\n" +
                       "{{InCase_T.hmdt.1.KEY.display}}\n" +
                       "{{InCase_T.hmdt.1.KEY_SUBKEY_SUBSUBKEY.formatted}}\n" +
                       "{{InCase_T.hmdt.1.KEY_SUBKEY_SUBSUBKEY.value}}\n" +
                       "{{InCase_T.md.HEIGHT.display}}\n" +
                       "{{InCase_T.md.KEY.SUBKEY.unit}}\n" +
                       "{{InCase_T.md.KEY.SUBKEY.SUBSUBKEY.formatted}}\n" +
                       "{{InCase_T.mdt.HEIGHT}}\n" +
                       "{{InCase_T.mdt.HEIGHT.display}}\n" +
                       "{{InCase_T.mdt.HEIGHT.value}}\n" +
                       "{{InCase_T.mdt.KEY.SUBKEY}}\n" +
                       "{{InCase_T.mdt.KEY.SUBKEY.unit}}\n" +
                       "{{InCase_T.mdt.KEY.SUBKEY.SUBSUBKEY.formatted}}\n" +
                       "{{InCase_T.myTable.2.exampleCol}}\n" +
                       "{{InCase_T.ip.Ramipril.targetDosis}}\n" +
                       "{{InCase_T.patientName}}\n" +
                       "{{InCase_T.patientNameWith_ComplexKey}}\n" +
                       "{{InCase_T.patientNameWith_ComplexKey.orEvenSubKey}}\n" +
                       "{{InCase_T.plainCustomTable.0.columnNothing}}\n" +
                       "{{InCase_T.plainCustomTable.0.columnwithstring}}\n" +
                       "{{InCase_T.plainCustomTable.0.columnWithString}}\n" +
                       "{{InCase_T.plainCustomTable.0.columnWithNumber}}";

            this.testMedDataItems = {
                "height": {
                    "type": "HEIGHT",
                    "cleanType": "HEIGHT",
                    "value": 123,
                    "textValue": "TEXTVALUE",
                    "boolValue": true,
                    "formatted": "FORMATTED",
                    "display": "DISPLAY"
                },
                "height.test": {
                    "type": "HEIGHT.TEST",
                    "cleanType": "HEIGHT.TEST",
                    "value": 123,
                    "textValue": "TEXTVALUE",
                    "boolValue": true,
                    "formatted": "FORMATTED",
                    "display": "DISPLAY"
                },
                "height.test.subsubkey": {
                    "type": "translated height test subsubkey",
                    "cleanType": "HEIGHT.TEST.subsubkey",
                    "value": 123,
                    "textValue": "TEXTVALUE",
                    "boolValue": true,
                    "formatted": "FORMATTED",
                    "display": "DISPLAY"
                },
                "KEY.SUBKEY": {
                    "type": "translated key subkey",
                    "cleanType": "KEY.SUBKEY",
                    "value": 123,
                    "textValue": "TEXTVALUE",
                    "boolValue": true,
                    "formatted": "FORMATTED",
                    "display": "DISPLAY",
                    "unit": "UNIT"
                },
                "KEY.SUBKEY.SUBSUBKEY": {
                    "type": "translated key subkey subsubkey",
                    "cleanType": "KEY.SUBKEY.SUBSUBKEY",
                    "value": 123,
                    "textValue": "TEXTVALUE",
                    "boolValue": true,
                    "formatted": "FORMATTED",
                    "display": "DISPLAY",
                    "unit": "UNIT"
                },
                "KEY.SUBKEYFOUND_SUBSUBKEYNOT": {
                    "type": "translated sub key found",
                    "cleanType": "KEY.SUBKEYFOUND_SUBSUBKEYNOT",
                    "value": 123,
                    "textValue": "TEXTVALUE",
                    "boolValue": true,
                    "formatted": "FORMATTED",
                    "display": "DISPLAY",
                    "unit": "UNIT"
                }
            };
        } );

        afterEach( function() {
            this.testMedDataItems = null;
            this.txt = null;
        } );

        const
            tests = [

                // med data table
                {
                    input: "InCase_T.mdt.HEIGHT",
                    replacement: "DISPLAY",
                    embedKeyChain: ["mdt"]
                },
                {
                    input: "InCase_T.mdt.HEIGHT.display",
                    replacement: "DISPLAY",
                    embedKeyChain: ["mdt"]
                },
                {
                    input: "InCase_T.mdt.HEIGHT.value",
                    replacement: "123",
                    embedKeyChain: ["mdt"]
                },
                {
                    input: "InCase_T.mdt.KEY.SUBKEY",
                    replacement: "DISPLAY",
                    embedKeyChain: ["mdt"]
                },
                {
                    input: "InCase_T.mdt.KEY.SUBKEY.value",
                    replacement: "123",
                    embedKeyChain: ["mdt"]
                },
                {
                    input: "InCase_T.mdt.KEY.SUBKEY.unit",
                    replacement: "UNIT",
                    embedKeyChain: ["mdt"]
                },
                {
                    input: "InCase_T.mdt.KEY.SUBKEY.SUBSUBKEY",
                    replacement: "DISPLAY",
                    embedKeyChain: ["mdt"]
                },
                {
                    input: "InCase_T.mdt.KEY.SUBKEY.SUBSUBKEY.formatted",
                    replacement: "FORMATTED",
                    embedKeyChain: ["mdt"]
                },
                {
                    input: "InCase_T.mdt.KEY.SUBKEYFOUND_SUBSUBKEYNOT",
                    replacement: "DISPLAY",
                    embedKeyChain: ["mdt"]
                },
                {
                    input: "InCase_T.mdt.KEY.SUBKEYFOUND_SUBSUBKEYNOT.SUBSUBKEY",
                    replacement: false,
                    embedKeyChain: ["mdt"]
                },

                // ingredient plan (ip) {{InCase_T.ip.Ramipril.targetDosis}}, similar to meddata
                {
                    input: "InCase_T.ip.KEY.SUBKEY.value",
                    replacement: "123",
                    embedKeyChain: ["ip"]
                },
                {
                    input: "InCase_T.ip.KEY.SUBKEY.unit",
                    replacement: "UNIT",
                    embedKeyChain: ["ip"]
                },
                {
                    input: "InCase_T.ip.KEY.SUBKEY.SUBSUBKEY",
                    replacement: "DISPLAY",
                    embedKeyChain: ["ip"]
                },
                {
                    input: "InCase_T.ip.KEY.SUBKEY.SUBSUBKEY.formatted",
                    replacement: "FORMATTED",
                    embedKeyChain: ["ip"]
                },
                {
                    input: "InCase_T.mdt.KEY.SUBKEYFOUND_SUBSUBKEYNOT",
                    replacement: "DISPLAY",
                    embedKeyChain: ["ip"]
                },
                {
                    input: "InCase_T.mdt.KEY.SUBKEYFOUND_SUBSUBKEYNOT.SUBSUBKEY",
                    replacement: false,
                    embedKeyChain: ["ip"]
                },

                // not founds
                {
                    input: "InCase_T.mdt.NOTFOUND",
                    replacement: false,
                    embedKeyChain: ["mdt"]
                },
                {
                    input: "InCase_T.m.NOTFOUND",
                    replacement: false
                },
                {
                    input: "InCase_T.m.NOTFOUND",
                    replacement: false,
                    embedKeyChain: ["mdt"]
                },

                // latest med data {{InCase_T.md.HEIGHT.display}}
                {
                    input: "InCase_T.md.KEY.SUBKEY.SUBSUBKEY",
                    replacement: false,
                    embedKeyChain: ["md"]
                },
                {
                    input: "InCase_T.md.KEY.SUBKEY.SUBSUBKEY",
                    replacement: "DISPLAY",
                    embedKeyChain: ["md"],
                    embedKeyOverride: ["latestMedData"]
                },
                {
                    input: "InCase_T.md.KEY.SUBKEY.SUBSUBKEY.formatted",
                    replacement: "FORMATTED",
                    embedKeyChain: ["md"],
                    embedKeyOverride: ["latestMedData"]
                },

                // historical med data (hmdt) {{InCase_T.hmdt.1.HEIGHT.display}}
                {
                    input: "InCase_T.hmdt.0.KEY.SUBKEY.SUBSUBKEY",
                    replacement: false,
                    embedKeyChain: ["hmdt"]
                },
                {
                    input: "InCase_T.hmdt.0.KEY.SUBKEY.SUBSUBKEY",
                    replacement: "DISPLAY",
                    embedKeyChain: ["hmdt", /^\d+$/]
                },
                {
                    input: "InCase_T.hmdt.0.KEY.SUBKEY.SUBSUBKEY.formatted",
                    replacement: "FORMATTED",
                    embedKeyChain: ["hmdt", /^\d+$/]
                },
                {
                    input: "InCase_T.hmdt.5.KEY.SUBKEY.SUBSUBKEY",
                    replacement: "DISPLAY",
                    embedKeyChain: ["hmdt", /^\d+$/]
                },
                {
                    input: "InCase_T.hmdt.5.KEY.SUBKEY.SUBSUBKEY.formatted",
                    replacement: "FORMATTED",
                    embedKeyChain: ["hmdt", /^\d+$/]
                },

                // custom table med data like {{InCase_T.myTable.2.exampleCol}}
                {
                    input: "InCase_T.customTable.0.KEY.SUBKEY.SUBSUBKEY",
                    replacement: false,
                    embedKeyChain: [/.+/, /^\d+$/]
                },
                {
                    input: "InCase_T.customTable.0.KEY.SUBKEY.SUBSUBKEY",
                    replacement: "DISPLAY",
                    embedKeyChain: [/.+/, /^\d+$/]
                },
                {
                    input: "InCase_T.customTable.0.KEY.SUBKEY.SUBSUBKEY.formatted",
                    replacement: "FORMATTED",
                    embedKeyChain: [/.+/, /^\d+$/]
                },
                {
                    input: "InCase_T.customTable.2.KEY.SUBKEY.SUBSUBKEY",
                    replacement: "DISPLAY",
                    embedKeyChain: [/.+/, /^\d+$/]
                },
                {
                    input: "InCase_T.customTable.2.KEY.SUBKEY.SUBSUBKEY.formatted",
                    replacement: "FORMATTED",
                    embedKeyChain: [/.+/, /^\d+$/]
                },

                // custom table with plain data stored inside each column {{InCase_T.myTable.2.exampleCol}}
                {
                    input: "InCase_T.plainCustomTable.0.columnNothing",
                    replacement: false,
                    embedKeyChain: [/.+/, /^\d+$/]
                },
                {
                    input: "InCase_T.plainCustomTable.0.columnWithString",
                    replacement: "STRING",
                    embedKeyChain: [/.+/, /^\d+$/]
                },
                {
                    input: "InCase_T.plainCustomTable.0.columnWithNumber",
                    replacement: 1.234,
                    embedKeyChain: [/.+/, /^\d+$/]
                }

            ];

        describe( 'given properly defined mapObjects and the correct key', function() {
            // eslint-disable-next-line mocha/no-setup-in-describe
            tests.forEach( ( test ) => {
                it( `returns the input text with replaced embed for ${test.input}`, function() {

                    const
                        txt = this.txt,
                        embed = `{{${test.input}}}`,
                        parts = test.input.split( "." ),
                        mapObject = {
                            mdt: this.testMedDataItems,
                            latestMedData: this.testMedDataItems,
                            hmdt: {
                                "0": this.testMedDataItems,
                                "5": this.testMedDataItems
                            },
                            customTable: [
                                this.testMedDataItems,
                                this.testMedDataItems,
                                this.testMedDataItems
                            ],
                            plainCustomTable: [
                                {
                                    columnWithString: "STRING",
                                    columnWithNumber: 1.234
                                }
                            ]
                        };

                    expect(
                        Y.dcforms.matchEmbedDataTable( txt, embed, parts, mapObject, test.embedKeyChain, test.embedKeyOverride ),
                        !!test.replacement
                            ? `expected a replacement of "{{${test.input}}}" against "${test.replacement}"`
                            : `expected NO replacement of "{{${test.input}}}"`
                    ).to.be.equal(
                        !!test.replacement
                            ? txt.replace( embed, test.replacement )
                            : txt
                    );

                } );
            } );

        } );

        describe( 'given an incorrect mapObject (null)', function() {
            // eslint-disable-next-line mocha/no-setup-in-describe
            tests.forEach( ( test ) => {
                it( `returns the un-altered text for ${test.input}`, function() {

                    const
                        txt = this.txt,
                        embed = `{{${test.input}}}`,
                        parts = test.input.split( "." ),
                        mapObject = null;

                    expect(
                        Y.dcforms.matchEmbedDataTable( txt, embed, parts, mapObject, test.embedKeyChain, test.embedKeyOverride )
                    ).to.be.equal( txt );

                } );
            } );

        } );

        describe( 'given an incorrect mapObject ({mdt: null})', function() {
            // eslint-disable-next-line mocha/no-setup-in-describe
            tests.forEach( ( test ) => {
                it( `returns the un-altered text for ${test.input}`, function() {

                    const
                        txt = this.txt,
                        embed = `{{${test.input}}}`,
                        parts = test.input.split( "." ),
                        mapObject = {
                            mdt: null
                        };

                    expect(
                        Y.dcforms.matchEmbedDataTable( txt, embed, parts, mapObject, test.embedKeyChain, test.embedKeyOverride )
                    ).to.be.equal( txt );

                } );
            } );

        } );

    } );

    describe( '.matchEmbedPlainValue()', function() {

        beforeEach( function() {
            this.txt = "{{InCase_T.hmdt.1.KEY.display}}\n" +
                       "{{InCase_T.hmdt.1.KEY.SUBKEY.SUBSUBKEY.formatted}}\n" +
                       "{{InCase_T.hmdt.1.KEY.SUBKEY.SUBSUBKEY.value}}\n" +
                       "{{InCase_T.hmdt.1.KEY.display}}\n" +
                       "{{InCase_T.hmdt.1.KEY_SUBKEY_SUBSUBKEY.formatted}}\n" +
                       "{{InCase_T.hmdt.1.KEY_SUBKEY_SUBSUBKEY.value}}\n" +
                       "{{InCase_T.md.HEIGHT.display}}\n" +
                       "{{InCase_T.md.KEY.SUBKEY.unit}}\n" +
                       "{{InCase_T.md.KEY.SUBKEY.SUBSUBKEY.formatted}}\n" +
                       "{{InCase_T.mdt.HEIGHT}}\n" +
                       "{{InCase_T.mdt.HEIGHT.display}}\n" +
                       "{{InCase_T.mdt.HEIGHT.value}}\n" +
                       "{{InCase_T.mdt.KEY.SUBKEY}}\n" +
                       "{{InCase_T.mdt.KEY.SUBKEY.unit}}\n" +
                       "{{InCase_T.mdt.KEY.SUBKEY.SUBSUBKEY.formatted}}\n" +
                       "{{InCase_T.myTable.2.exampleCol}}\n" +
                       "{{InCase_T.ip.Ramipril.targetDosis}}\n" +
                       "{{InCase_T.patientName}}\n" +
                       "{{InCase_T.patientNameWith_ComplexKey}}\n" +
                       "{{InCase_T.patientNameWith_ComplexKey.orEvenSubKey}}";

            this.testObject = {
                "patientName": "TEST",
                "patientName.WithSubKey": "TEST2",
                "patientNumber": 123,
                "patientNumber.WithSubKey": 456,
                "multiLineKey": "Test\nTest"
            };
        } );

        afterEach( function() {
            this.testObject = null;
            this.txt = null;
        } );

        const
            tests = [
                {
                    input: "InCase_T.NOTFOUND",
                    replacement: false
                },
                {
                    input: "InCase_T.patientName",
                    replacement: "TEST"
                },
                {
                    input: "InCase_T.patientName.WithSubKey",
                    replacement: "TEST2"
                },
                {
                    input: "InCase_T.patientNumber",
                    replacement: "123"
                },
                {
                    input: "InCase_T.patientNumber.WithSubKey",
                    replacement: "456"
                },
                {
                    input: "InCase_T.patientName.WithSubKey",
                    replacement: "456"
                },
                {
                    input: "InCase_T.multiLineKey",
                    replacement: "Test\nTest",
                    dropdownReplacement: "TestTest"
                }
            ];

        describe( 'given properly defined medDataItems and the correct key for elemType "string"', function() {
            // eslint-disable-next-line mocha/no-setup-in-describe
            tests.forEach( ( test ) => {
                it( `returns the input text with replaced embed for ${test.input}`, function() {

                    const
                        elemType = 'string',
                        txt = this.txt,
                        embed = `{{${test.input}}}`,
                        parts = test.input.split( "." ),
                        mapObject = this.testObject;

                    expect(
                        Y.dcforms.matchEmbedPlainValue( txt, embed, parts, mapObject, elemType ),
                        typeof test.replacement === "string"
                            ? `expected a replacement of "{{${test.input}}}" against "${test.replacement}"`
                            : `expected NO replacement of "{{${test.input}}}"`
                    ).to.be.equal(
                        typeof test.replacement === "string"
                            ? txt.replace( embed, test.replacement )
                            : txt
                    );

                } );
            } );

        } );

        describe( 'given properly defined medDataItems and the correct key for elemType "dropdown"', function() {
            // eslint-disable-next-line mocha/no-setup-in-describe
            tests.forEach( ( test ) => {
                it( `returns the input text with replaced embed for ${test.input}`, function() {

                    const
                        elemType = 'dropdown',
                        txt = this.txt,
                        embed = `{{${test.input}}}`,
                        parts = test.input.split( "." ),
                        mapObject = this.testObject,
                        replacement = test.dropdownReplacement || test.replacement;

                    expect(
                        Y.dcforms.matchEmbedPlainValue( txt, embed, parts, mapObject, elemType ),
                        typeof replacement === "string"
                            ? `expected a replacement of "{{${test.input}}}" against "${replacement}"`
                            : `expected NO replacement of "{{${test.input}}}"`
                    ).to.be.equal(
                        typeof replacement === "string"
                            ? txt.replace( embed, replacement )
                            : txt
                    );

                } );
            } );

        } );

        describe( 'given an incorrect mapObject (null)', function() {
            // eslint-disable-next-line mocha/no-setup-in-describe
            tests.forEach( ( test ) => {
                it( `returns the un-altered text for ${test.input}`, function() {

                    const
                        elemType = 'string',
                        txt = this.txt,
                        embed = `{{${test.input}}}`,
                        parts = test.input.split( "." ),
                        mapObject = null;

                    expect(
                        Y.dcforms.matchEmbedPlainValue( txt, embed, parts, mapObject, elemType )
                    ).to.be.equal( txt );

                } );
            } );

        } );

        describe( 'given an incorrect mapObject ({[every key]: null})', function() {
            // eslint-disable-next-line mocha/no-setup-in-describe
            tests.forEach( ( test ) => {
                it( `returns the un-altered text for ${test.input}`, function() {

                    const
                        elemType = 'string',
                        txt = this.txt,
                        embed = `{{${test.input}}}`,
                        parts = test.input.split( "." ),
                        mapObject = JSON.parse( JSON.stringify( this.testObject ) );

                    // set all values to non-string values
                    Object.keys( mapObject ).forEach( key => {
                        mapObject[key] = null;
                    } );

                    expect(
                        Y.dcforms.matchEmbedPlainValue( txt, embed, parts, mapObject, elemType )
                    ).to.be.equal( txt );

                } );
            } );

        } );

    } );

} );

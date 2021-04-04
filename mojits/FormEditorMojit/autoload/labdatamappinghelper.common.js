/**
 *  Expand and annotate labdata JSON for reporting and display
 *
 *  Note that this can be tested on the client by visiting:
 *
 *    http://prcs.dev.dc/labdataparse
 *
 *  Paste any unrecognized test entries into the box on that page to see / tweak the interpretation.
 *
 *  @author: strix
 *  @date: 2017 February
 */

/*jslint anon:true, nomen:true, latedef:false */
/*global YUI */

'use strict';

YUI.add( 'dcforms-labdata-mapping-helper', function( Y, NAME ) {

        var
            stripHtmlTags = Y.doccirrus.regexp.stripHtmlTags;

        // mock ko for server.
        //_k = Y.dcforms.isOnServer ?  { unwrap: function( txt ) { return txt; } } : ko;

        /**
         *  Map all l_extra JSON data of a LABDATA activity to expanded form
         *  @param formData
         *  @param config
         */

        /*
        function getReportingFields( formData, config ) {
            var
                currentActivity = config.context.activity,
                actType = _k.unwrap( currentActivity.actType ),
                l_extra;

            //  this only applies to LABDATA activities which have lab results (l_extra)
            if( 'LABDATA' === actType && currentActivity.l_extra && _k.unwrap( currentActivity.l_extra ) ) {
                l_extra = _k.unwrap( currentActivity.l_extra );

                if( !l_extra.testId && l_extra.sampleRequests ) {
                    l_extra.testId = l_extra.sampleRequests;
                }

                if( l_extra.testId && l_extra.testId.length ) {
                    formData.labData = l_extra.testId.map( function( testResult ) {
                        expandSingleTestResult( l_extra, testResult );
                    } );
                } else {
                    formData.labData = [];
                }
            }
        }

        */
        /**
         * Returns the  correct range from sampleValues depends on gender
         * @param gender
         * @param sampleValueTextArray
         * @returns {*}
         */

        function getSampleValueText( gender, sampleValueTextArray ) {
            if( !Array.isArray( sampleValueTextArray ) ) {
                return sampleValueTextArray || "";
            }

            var sampleNormalValueText = "", firstDigit;

            if( gender === "W" ) {
                sampleNormalValueText = sampleValueTextArray.find( function( testresult ) {
                    return testresult.substring( 0, 1 ) === 'f';
                } );

            } else if( gender === "M" ) {
                sampleNormalValueText = sampleValueTextArray.find( function( testresult ) {
                    return testresult.substring( 0, 1 ) === 'm';
                } );
            }

            if( sampleNormalValueText ) {
                firstDigit = sampleNormalValueText.match( /\d/ );
                sampleNormalValueText = sampleNormalValueText.substring( sampleNormalValueText.indexOf( firstDigit ), sampleNormalValueText.length );
            }

            if( !sampleNormalValueText ) {
                sampleNormalValueText = sampleValueTextArray.join( '' ) || '';
            }

            return sampleNormalValueText;
        }

        /**
         *  Expand LDT labdata with properties to simplify generation of HTML / PDF table cells
         *
         *  @param      {Object}    l_extra     LDT data parsed to JSON object
         *  @param      {Object}    testResult  Entry which represents single finding
         *  @return     {Object}
         */

        function expandSingleTestResult( l_extra, testResult ) {
            var
                result = {
                    labTestResultText: '',
                    labResultDisplay: 'unrecognized',
                    labHead: testResult.head,
                    labTestLabel: testResult.testLabel,
                    labReqReceived: l_extra.labReqReceived || testResult.labReqReceived,
                    labTestNotes: '',
                    labFullText: '-',
                    limitIndicator: testResult.testResultLimitIndicator ? testResult.testResultLimitIndicator : '',
                    isPathological: false,
                    previousVersions: testResult.previousVersions || 0,
                    labMin: 0,
                    labMax: 0,
                    labName: testResult.labName || ''
                },

                sampleNormalValueText = getSampleValueText( l_extra.patientGender, testResult.sampleNormalValueText ),

                //qualitativeBinary = [ 'positiv', 'negativ', 'pos', 'neg', 'positive', 'negative' ]\

                sampleResultText = testResult && testResult.sampleResultText && testResult.sampleResultText[0] ? testResult.sampleResultText[0] : '',

                //  general properties of this result
                hasNormValueText = (testResult.sampleNormalValueText && Array.isArray( testResult.sampleNormalValueText )),
                hasResultVal = ((testResult.testResultVal && '' !== testResult.testResultVal) || (0 === testResult.testResultVal)),
                hasResultText = testResult.sampleResultText && Array.isArray( testResult.sampleResultText ) && (testResult.sampleResultText.length > 0),
                hasNormalRange = hasNormValueText ? isRangeStr( [sampleNormalValueText] ) : false,
                hasUpperBound = hasNormValueText && '<' === sampleNormalValueText.substr( 0, 1 ),
                hasLowerBound = hasNormValueText && '>' === sampleNormalValueText.substr( 0, 1 ),
                minMax;

            const commaRegex = /,/g;

            //sanitize all number fields
            if( sampleNormalValueText ) {
                sampleNormalValueText = sampleNormalValueText.replace( commaRegex, "." );
            }

            if( !hasResultText ) {
                hasResultText = false;
            }

            //  EXTMOJ-2272 Special case for manually entered labdata which may have both text (Ergebnis Text) and
            //  numeric (Ergebnis Wert) values

            if( hasResultText ) {
                result.labTestResultText = testResult.sampleResultText.join( '\n' );
            }

            //  if l_extra is a sequence of findings

            //  Quantitative findings with min, max and values (all float)
            /*
            {
                "sampleNormalValueText": [ "0.4 - 6.6" ],
                "TestResultUnit": "%",
                "testResultVal": 1.3,
                "sampleId": "EDTA",
                "testLabel": "Eosinophile (%)",
                "head": "EOS-A"
            }
            */

            if(
                'unrecognized' === result.labResultDisplay &&
                hasNormalRange &&
                hasResultVal
            ) {
                result.labResultDisplay = 'minmaxval';
                minMax = sampleNormalValueText.split( '-' );

                result.labMin = parseFloat( (minMax[0] || '').trim() ) || 0;
                result.labMax = parseFloat( (minMax[1] || '').trim() ) || 0;
                result.labTestResultVal = parseFloat( testResult.testResultVal );
                result.labTestResultUnit = testResult.TestResultUnit;
                result.labNormalText = Array.isArray( testResult.sampleNormalValueText ) ?
                    testResult.sampleNormalValueText.join( '\n' ) : testResult.sampleNormalValueText;

                //  value is pathological if outside range
                if(
                    (result.labMin > result.labTestResultVal) ||
                    (result.labMax < result.labTestResultVal)
                ) {
                    result.isPathological = true;
                }
            }

            //  Quantitative findings with range (min and max values) which could not be evaluated
            /*
            {
                "sampleNormalValueText": [ "20-80" ],
                "sampleResultText": [ "negativ" ],
                "sampleId": "Se",
                "gnr": [ { "cost": 920, "head": "32107" } ],
                "testLabel": "KBV-Verfahren RT",
                "head": "KBRT"
            }
            */

            if(
                'unrecognized' === result.labResultDisplay &&
                hasNormalRange &&
                hasResultText
            ) {
                result.labResultDisplay = 'minmaxtext';
                minMax = sampleNormalValueText.split( '-' );

                result.labMin = parseFloat( (minMax[0] || '').trim() ) || 0;
                result.labMax = parseFloat( (minMax[1] || '').trim() ) || 0;
                result.labTestResultVal = parseFloat( testResult.testResultVal );

                if( testResult.TestResultUnit ) {
                    result.labTestResultUnit = testResult.TestResultUnit;
                }

                result.labNormalText = Array.isArray( testResult.sampleNormalValueText ) ?
                    testResult.sampleNormalValueText.join( '\n' ) : testResult.sampleNormalValueText;
                result.labTestResultText = testResult.sampleResultText.join( '\n' );

                //  value is not pathological if 'negativ' or 'neg'
                if(
                    ('negativ' !== result.labTestResultText) &&
                    ('neg' !== result.labTestResultText)
                ) {
                    result.isPathological = true;
                }
            }

            //  Quantitative finding with upper bound
            /*
            {
                "sampleNormalValueText": [ "< 1.5" ],
                "TestResultUnit": "%",
                "testResultVal": 0.5,
                "sampleId": "EDTA",
                "testLabel": "Basophile (%)",
                "head": "BASO-A"
            }
            */

            if(
                'unrecognized' === result.labResultDisplay &&
                hasUpperBound &&
                hasResultVal
            ) {
                result.labResultDisplay = 'maxval';
                result.labTestResultVal = parseFloat( testResult.testResultVal );
                result.labTestResultUnit = testResult.TestResultUnit;
                result.labNormalText = Array.isArray( testResult.sampleNormalValueText ) ?
                    testResult.sampleNormalValueText.join( '\n' ) : testResult.sampleNormalValueText;

                if( hasResultVal ) {
                    result.labTestResultVal = parseFloat( testResult.testResultVal );
                }

                minMax = parseFloat( sampleNormalValueText.replace( '<', '' ).replace( '=', '' ) );
                result.labMax = minMax + '';

                //  isPathological is finding exceeds value
                if( result.labTestResultVal >= minMax ) {
                    result.isPathological = true;
                }
            }

            //  Quantitative finding with lower bound
            /*
            {
                "sampleNormalValueText": [ "> 1.5" ],
                "TestResultUnit": "%",
                "testResultVal": 0.5,
                "sampleId": "EDTA",
                "testLabel": "Basophile (%)",
                "head": "BASO-A"
            }
            */

            if(
                'unrecognized' === result.labResultDisplay &&
                hasLowerBound &&
                hasResultVal
            ) {
                result.labResultDisplay = 'minval';
                result.labTestResultVal = parseFloat( testResult.testResultVal );
                result.labTestResultUnit = testResult.TestResultUnit;
                result.labNormalText = Array.isArray( testResult.sampleNormalValueText ) ?
                    testResult.sampleNormalValueText.join( '\n' ) : testResult.sampleNormalValueText;

                if( hasResultVal ) {
                    result.labTestResultVal = parseFloat( testResult.testResultVal );
                }

                minMax = parseFloat( sampleNormalValueText.replace( '>', '' ).replace( '=', '' ) );
                result.labMin = minMax;

                //  isPathological is finding exceeds value
                if( result.labTestResultVal <= minMax ) {
                    result.isPathological = true;
                }
            }

            //  Quantitative findings with upper bound on expected value and finding
            /*
            {
                "sampleNormalValueUpperBound": 74,
                "sampleNormalValueText": [ "< 75" ],
                "sampleResultText": [ "< 30" ],
                "TestResultUnit": "IU/ml",
                "sampleColDate": "2016-09-26T12:45:00.000Z",
                "sampleLabel": "Vollblut venös",
                "sampleId": "VB ven.",
                "gnr": [ { "cost": 1749, "head": "3857" } ],
                "testLabel": "dsDNA",
                "head": "dsDNA"
            }
            */
            if(
                'unrecognized' === result.labResultDisplay &&
                hasUpperBound &&
                hasResultText &&
                ('<' === sampleResultText.substr( 0, 1 ))
            ) {
                result.labResultDisplay = 'maxvalgt';
                result.labTestResultVal = parseFloat( sampleResultText.replace( '<', '' ) );
                result.labTestResultText = sampleResultText;
                result.labTestResultUnit = testResult.TestResultUnit;
                result.labNormalText = Array.isArray( testResult.sampleNormalValueText ) ?
                    testResult.sampleNormalValueText.join( '\n' ) : testResult.sampleNormalValueText;

                minMax = parseFloat( sampleNormalValueText.replace( '<', '' ) );
                result.labMax = minMax + '';

                //  isPathological is finding exceeds value
                if( result.labTestResultVal >= minMax ) {
                    result.isPathological = true;
                }
            }

            //  Quantitative findings with an expected value, but no range
            if(
                'unrecognized' === result.labResultDisplay &&
                hasResultVal &&
                hasNormValueText &&
                1 === testResult.sampleNormalValueText.length
            ) {
                result.labResultDisplay = 'quantitative';

                result.labTestResultVal = parseFloat( testResult.testResultVal );
                result.labTestResultUnit = testResult.TestResultUnit;
                result.labNormalText = Array.isArray( testResult.sampleNormalValueText ) ?
                    testResult.sampleNormalValueText.join( '\n' ) : testResult.sampleNormalValueText;

                if( hasResultVal ) {
                    result.labTestResultVal = parseFloat( testResult.testResultVal );
                }

                //  isPathological will rely on testResultLimitIndicator, if any
            }

            //  Quantitative findings without an expected value or expected range (pathological checks not possible)
            if(
                'unrecognized' === result.labResultDisplay &&
                hasResultVal
            ) {
                result.labResultDisplay = 'quantitative';
                result.labTestResultVal = parseFloat( testResult.testResultVal );
                result.labTestResultUnit = testResult.TestResultUnit;

                result.labNormalText = Array.isArray( testResult.sampleNormalValueText ) ?
                    testResult.sampleNormalValueText.join( '\n' ) : testResult.sampleNormalValueText;

                if( hasResultVal ) {
                    result.labTestResultVal = parseFloat( testResult.testResultVal );
                }

                minMax = result.labNormalText && result.labNormalText.split( '-' );

                result.labMin = parseFloat( ((Array.isArray( minMax ) && minMax.length && minMax[0]) || '').trim() ) || 0;
                result.labMax = parseFloat( ((Array.isArray( minMax ) && minMax.length && minMax[1]) || '').trim() ) || 0;

                //fix for swiss hl7 data
                if( !Y.doccirrus.commonutils.doesCountryModeIncludeGermany() ){
                    if(
                        (result.labMin > result.labTestResultVal) ||
                        (result.labMax < result.labTestResultVal)
                    ) {
                        result.isPathological = true;
                    }
                }
            }

            //  Quantitative values with < 1:x format
            //  Note that 1:x is not a ratio
            /*
            {
                "testResultLimitIndicator": "+",
                "sampleNormalValueUpperBound": 80,
                "sampleNormalValueText": [ "< 1:160" ],
                "sampleResultText": [ "1:1280" ],
                "TestResultUnit": "Titer",
                "sampleColDate": "2016-09-26T12:45:00.000Z",
                "sampleLabel": "Vollblut venös",
                "sampleId": "VB ven.",
                "testLabel": "ANA-Endtiter",
                "head": "ANA"
            } */

            if(
                'unrecognized' === result.labResultDisplay &&
                hasResultText &&
                hasNormValueText &&
                ('<' === sampleNormalValueText.substr( 0, 1 )) &&
                (-1 !== sampleNormalValueText.indexOf( ':' )) &&
                (-1 !== sampleResultText.indexOf( ':' )) &&
                (1 === testResult.sampleNormalValueText.length)
            ) {
                result.labResultDisplay = 'maxvalcolon';

                result.labTestResultVal = parseFloat( sampleResultText.replace( '1:', '' ) );
                result.labTestResultText = sampleResultText.trim();

                result.labTestResultUnit = testResult.TestResultUnit;
                result.labNormalText = Array.isArray( testResult.sampleNormalValueText ) ?
                    testResult.sampleNormalValueText.join( '\n' ) : testResult.sampleNormalValueText;

                minMax = parseFloat( sampleNormalValueText.replace( '<', '' ).replace( '1:', '' ) );
                result.labMax = minMax + '';

                //  isPathological depends on finding and expected value
                if( minMax < result.labTestResultVal ) {
                    result.isPathological = true;
                }
            }

            //  Qualitative findings with text description
            if(
                'unrecognized' === result.labResultDisplay &&
                hasResultText
            ) {
                result.labResultDisplay = 'text';
                result.labTestResultText = testResult.sampleResultText.join( '\n' );

                //  There may be an expected/formal value for this finding
                result.labNormalText = '';
                result.labNormalText = Array.isArray( testResult.sampleNormalValueText ) ?
                    testResult.sampleNormalValueText.join( '\n' ) : testResult.sampleNormalValueText;

                //  if there is an expected value, and this result differs, then mark pathological
                if( '' !== result.labNormalText && result.labTestResultText !== result.labNormalText ) {
                    result.isPathological = true;

                    //  Odd format for some LDT2 GYN text findings (Pap smearresult category) see MOJ-9722
                    if( 'I' === result.labNormalText ) {
                        result.isPathological = false;
                    }

                }

                //  There may be a 'spec' field - seems to define origin of sample
                //  Note the spec in the text for simplicity of rendering / reporting
                if( testResult.sampleSpec && Array.isArray( testResult.sampleSpec ) ) {
                    result.labTestResultText = '' +
                                               result.labTestResultText + '\n' +
                                               'Spec: ' + testResult.sampleSpec.join( '\n' );
                }

                //  There may be an upper bound field
                if( testResult.sampleNormalValueUpperBound ) {
                    result.labMax = testResult.sampleNormalValueUpperBound;
                }

                //  There may be a lower bound field
                if( testResult.sampleNormalValueLowerBound ) {
                    result.labMin = testResult.sampleNormalValueLowerBound;
                }

                result.labTestResultUnit = testResult.TestResultUnit;
            }

            //  Qualitative finding (positive/negative, reactive/unreactive, etc)
            if(
                'unrecognized' === result.labResultDisplay &&
                hasNormValueText &&
                hasResultText &&
                1 === testResult.sampleResultText.length &&
                1 === testResult.sampleNormalValueText.length

            ) {
                result.labResultDisplay = 'qualitative';
                result.labTestResultText = testResult.sampleResultText.join( '\n' );
                result.labNormalText = Array.isArray( testResult.sampleNormalValueText ) ?
                    testResult.sampleNormalValueText.join( '\n' ) : testResult.sampleNormalValueText;

                if( result.labTestResultText !== result.labNormalText ) {
                    result.isPathological = true;
                }
            }

            //  Quantitative finding with bracketed ranges
            if(
                'unrecognized' === result.labResultDisplay &&
                hasResultVal &&
                hasNormValueText &&
                Array.isArray( testResult.sampleNormalValueText ) &&
                testResult.sampleNormalValueText.length > 1
            ) {
                result.labResultDisplay = 'categorizedquantity';
                result.labNormalRanges = testResult.sampleNormalValueText;
                result.labTestResultVal = parseFloat( testResult.testResultVal );
                result.labTestResultUnit = testResult.TestResultUnit;

                result.labTestResultText = result.labTestResultText ? result.labTestResultText : '';

                //result.labTestResultText = '-- ' + testResult.labTestResultVal + '-- \n';
                if( testResult.sampleNormalValueText ) {
                    //  TODO: parse and evaluate these
                    result.labTestResultText = result.labTestResultText + '\n' + (testResult.sampleNormalValueText || []).join( '\n' );
                }
            }

            //  quanti

            //  if only max but not min
            if(
                'unrecognized' === result.labResultDisplay &&
                testResult.sampleNormalValueText &&
                testResult.sampleNormalValueUpperBound &&
                testResult.testResultVal &&
                Array.isArray( testResult.sampleNormalValueText )
            ) {
                result.labResultDisplay = 'upperbound';
                result.labMax = testResult.sampleNormalValueUpperBound;
                result.labTestResultVal = parseFloat( testResult.testResultVal );
                result.labNormalText = Array.isArray( testResult.sampleNormalValueText ) ?
                    testResult.sampleNormalValueText.join( '\n' ) : testResult.sampleNormalValueText;
                if( testResult.sampleResultText && Array.isArray( testResult.sampleResultText ) ) {
                    result.labTestResultText = testResult.sampleResultText.join( '\n' );
                } else {
                    result.isPathological = parseFloat( result.labTestResultVal ) > parseFloat( result.labMax );
                }

            }

            //  if only string indicating test result
            if(
                'unrecognized' === result.labResultDisplay &&
                testResult.ergebnisText &&
                Array.isArray( testResult.ergebnisText )
            ) {
                result.labResultDisplay = 'text';
                result.labTestResultText = testResult.ergebnisText.join( '\n' );

                if( testResult.sampleNormalValueText ) {
                    result.labNormalText = Array.isArray( testResult.sampleNormalValueText ) ?
                        testResult.sampleNormalValueText.join( '\n' ) : testResult.sampleNormalValueText;
                }
            }

            if(
                'unrecognized' === result.labResultDisplay &&
                testResult.testResultVal &&
                ('string' === typeof testResult.testResultVal)
            ) {
                result.labResultDisplay = 'text';
                result.labTestResultText = testResult.testResultVal;

                if( testResult.sampleNormalValueText ) {
                    result.labNormalText = Array.isArray( testResult.sampleNormalValueText ) ?
                        testResult.sampleNormalValueText.join( '\n' ) : testResult.sampleNormalValueText;
                }
            }

            //  add any notes made by the lab
            if( testResult.sampleTestNotes && Array.isArray( testResult.sampleTestNotes ) ) {
                result.labTestNotes = testResult.sampleTestNotes.join( '\n' );

                if( 'unrecognized' === result.labResultDisplay ) {
                    result.labResultDisplay = 'note';
                }
            }

            //  check for wildcard field (structure not defined in LDT standard, may be CSV, XML, etc)
            if(
                'unrecognized' === result.labResultDisplay &&
                testResult.wildcardField
            ) {

                result.labResultDisplay = 'label';
                result.labTestResultText = result.labTestResultText ? result.labTestResultText : '';

                if( 'string' === typeof testResult.wildcardField ) {
                    result.labTestResultText = result.labTestResultText + testResult.wildcardField;
                }

                if( Array.isArray( testResult.wildcardField ) ) {
                    result.labTestResultText = result.labTestResultText + testResult.wildcardField.join( '\n' );
                }

                if( testResult.testLabel ) {
                    result.labTestResultText = result.labTestResultText + '\n' + testResult.testLabel;
                }

                if( testResult.sampleLabel ) {
                    result.labTestResultText = result.labTestResultText + '\n' + testResult.sampleLabel;
                }
            }

            //  check for sample label
            if(
                'unrecognized' === result.labResultDisplay &&
                testResult.sampleLabel &&
                testResult.testLabel
            ) {
                result.labResultDisplay = 'label';
                result.labTestResultText = testResult.testLabel + '\n' + testResult.sampleLabel;
            }

            //  indicate billing entries (not currently shown in client)
            if( 'unrecognized' === result.labResultDisplay && testResult.gnr && testResult.gnr.cost ) {
                result.labResultDisplay = 'billing';
            }

            //  indicate billing code entries (no other value in observed data)
            if(
                'unrecognized' === result.labResultDisplay &&
                testResult.head &&
                ('ANAG2' === testResult.head || 'ANAG1' === testResult.head) &&
                testResult.ergebnisText &&
                Array.isArray( testResult.ergebnisText )
            ) {
                result.labResultDisplay = 'billing';
                result.labTestResultText = testResult.ergebnisText.join( '\n' );
            }

            //  indicate failed tests
            if(
                'unrecognized' === result.labResultDisplay &&
                testResult.testStatus &&
                'F' === testResult.testStatus
            ) {
                result.labResultDisplay = 'failed';
                result.labTestResultText = '[F] fehlt/folgt';
            }

            //  in some cases there will not be a 'lab request received' date, but there may be a 'sample collected date'
            if( !result.labReqReceived && testResult.sampleColDate ) {
                Y.log( 'Setting date to sample collection date (no date of receipt): ' + testResult.sampleColDate, 'debug', NAME );
                result.labReqReceived = testResult.sampleColDate;
            }

            //  check general case "pathological" marking
            checkTestResultLimitIndicator( testResult, result );

            //  Strip HTML in text (can happen with wildcardField)
            if( result.labTestResultText ) {
                result.labTestResultText = result.labTestResultText.replace( stripHtmlTags, '' );
            }

            //  generate fullText
            if( Y.dcforms.isOnServer ) {

                result.labFullText = Y.doccirrus.api.xdtTools.prettyText(
                    {
                        //  set of findings to write as human-readable string
                        records: [testResult],
                        //  NOTE: format may change in future, not currently recorded on activity
                        versionUsed: {type: 'ldt', name: 'ldt20'}
                    },
                    false,              //  use html
                    true,               //  reverse order of lines (mongoose issue)
                    true                //  skip extra line break at end
                );

                if( 'undefined:' === result.labFullText.substr( 0, 10 ) ) {
                    result.labFullText = result.labFullText.substr( 10 );
                }

            } else {
                result.labFullText = '(not generated on client)';
            }

            //  test / dev
            /*
            result.hasNormValueText = hasNormValueText;
            result.hasResultVal = hasResultVal;
            result.hasResultText = hasResultText;
            result.hasNormalRange = hasNormalRange;
            result.hasUpperBound = hasUpperBound;
            */

            return result;
        }

        /**
         *  Code used by pathology labs to indicate whether and how a sample is pathological
         *
         *  @param testResult
         *  @param result
         */

        function checkTestResultLimitIndicator( testResult, result ) {
            //  general case pathological marking
            if( testResult.testResultLimitIndicator ) {
                switch( testResult.testResultLimitIndicator ) {
                    //  too high
                    case '+':
                        result.isPathological = true;
                        break;
                    case '++':
                        result.isPathological = true;
                        break;
                    //  too low
                    case '-':
                        result.isPathological = true;
                        break;
                    case '--':
                        result.isPathological = true;
                        break;
                    //  other issue
                    case '!':
                        result.isPathological = true;
                        break;
                }
            }
        }

        /**
         *  Expand LDT3 labdata finding to simplify generation of HTML / PDF table cell
         *
         *  @param  {Object}    l_extra     LDT3 file parsed to JSON
         *  @param  {String}    ldtVersion  LDT Version
         *  @param  {Object}    testResult  Single finding (may have multiple values)
         *  @return {Object}
         */

        function expandSingleTestResultLdt3( l_extra, ldtVersion, testResult ) {
            var finding, k, j;

            function flattenTestResultVal( testResultVal ) {
                var
                    flatObj = {
                        labTestResultVal: testResultVal.head || '',
                        labNormalText: '',
                        labTestResultText: '',
                        labTestResultUnit: '',
                        labMin: null,
                        labMax: null,
                        labResultDisplay: 'text',
                        testResultLimitIndicator: '',
                        isPathological: true          //  fail safe
                    },
                    parts;

                if(
                    testResultVal.measurementUnitKind &&
                    testResultVal.measurementUnitKind.TestResultUnit
                ) {
                    flatObj.labTestResultUnit = testResultVal.measurementUnitKind.TestResultUnit;
                }

                //  check for normal range
                if(
                    testResultVal.obj_0042Attribute &&
                    testResultVal.obj_0042Attribute[0] &&
                    //  testResultVal.obj_0042Attribute[0].head &&
                    //  testResultVal.obj_0042Attribute[0].head === 'Normalwert' &&
                    testResultVal.obj_0042Attribute[0].Obj_0042 &&
                    testResultVal.obj_0042Attribute[0].Obj_0042.sampleNormalValueText &&
                    testResultVal.obj_0042Attribute[0].Obj_0042.sampleNormalValueText.length === 1
                ) {
                    flatObj.labNormalText = testResultVal.obj_0042Attribute[0].Obj_0042.sampleNormalValueText[0];

                    if( flatObj.labNormalText.indexOf( '-' ) !== -1 ) {
                        parts = flatObj.labNormalText.split( '-' );
                        flatObj.labMin = parseFloat( parts[0] );
                        flatObj.labMax = parseFloat( parts[1] );
                        flatObj.labResultDisplay = 'minmaxval';
                    } else if(
                        testResultVal.obj_0042Attribute[0].Obj_0042.sampleNormalValueLowerBound &&
                        testResultVal.obj_0042Attribute[0].Obj_0042.sampleNormalValueUpperBound
                    ) {
                        flatObj.labMin = parseFloat( testResultVal.obj_0042Attribute[0].Obj_0042.sampleNormalValueLowerBound.head );
                        flatObj.labMax = parseFloat( testResultVal.obj_0042Attribute[0].Obj_0042.sampleNormalValueUpperBound.head );
                        flatObj.labResultDisplay = 'minmaxval';
                    }
                }

                //  check for text result
                if(
                    testResultVal.obj_0068Attribute &&                 //  8237 Ergebnistext
                    testResultVal.obj_0068Attribute[0] &&
                    testResultVal.obj_0068Attribute[0].Obj_0068 &&
                    testResultVal.obj_0068Attribute[0].Obj_0068.text
                ) {
                    //  textual finding on activity
                    flatObj.labTestResultText = testResultVal.obj_0068Attribute[0].Obj_0068.text.join( '\n' );
                    flatObj.labResultDisplay = 'text';
                }

                //  check for 'pathological' indicator
                if(
                    testResultVal.obj_0042Attribute &&
                    testResultVal.obj_0042Attribute[0] &&
                    //  testResultVal.obj_0042Attribute[0].head &&
                    //  testResultVal.obj_0042Attribute[0].head === 'Normalwert' &&
                    testResultVal.obj_0042Attribute[0].Obj_0042 &&
                    testResultVal.obj_0042Attribute[0].Obj_0042.testResultLimitIndicator &&
                    testResultVal.obj_0042Attribute[0].Obj_0042.testResultLimitIndicator.head
                ) {
                    flatObj.testResultLimitIndicator = testResultVal.obj_0042Attribute[0].Obj_0042.testResultLimitIndicator.head;

                    if( 'N' === flatObj.testResultLimitIndicator ) {
                        flatObj.isPathological = false;
                    }
                }

                return flatObj;
            }

            if( testResult && testResult.testId ) {
                finding = {
                    labHead: testResult.testId.head,
                    labTestLabel: testResult.testId.testLabel,
                    labFullText: '',
                    labTestResultUnit: '',
                    parentCategory: testResult.parentCategory,
                    labResults: [],
                    rawFinding: testResult,
                    additionalInfo: '',
                    limitIndicator: '',
                    isPathological: false
                };

                if( !testResult.resultValues ) {
                    testResult.resultValues = [];
                }

                for( j = 0; j < testResult.resultValues.length; j++ ) {

                    //  check for test result values (8420 testResultVal)

                    if( !testResult.resultValues[j].testResultVal ) {
                        testResult.resultValues[j].testResultVal = [];
                    }

                    for( k = 0; k < testResult.resultValues[j].testResultVal.length; k++ ) {
                        finding.labResults.push( flattenTestResultVal( testResult.resultValues[j].testResultVal[k] ) );
                    }
                }

                //  check if any value(s) are pathological

                for( j = 0; j < finding.labResults.length; j++ ) {
                    if( finding.labResults[j].isPathological ) {
                        finding.isPathological = true;
                    }

                    if( finding.labResults[j].testResultLimitIndicator ) {
                        finding.limitIndicator = finding.limitIndicator + finding.labResults[j].testResultLimitIndicator;
                    }
                }

                //  check for additional explanatory text (Zusaetzliche_Informationen)
                if(
                    testResult.obj_0068Attribute &&
                    testResult.obj_0068Attribute[0] &&
                    testResult.obj_0068Attribute[0].Obj_0068 &&
                    testResult.obj_0068Attribute[0].Obj_0068.text
                ) {
                    finding.additionalInfo = testResult.obj_0068Attribute[0].Obj_0068.text.join( '\n' );
                }

                if( finding.labResults[0] && finding.labResults[0].labTestResultUnit ) {
                    //  first unit only, to mix with previous LDT format
                    finding.labTestResultUnit = finding.labResults[0].labTestResultUnit;
                }

                //  generate fullText
                if( Y.dcforms.isOnServer ) {
                    finding.labFullText = Y.doccirrus.api.xdtTools.prettyText(
                        {
                            //  set of findings to write as human-readable string
                            records: [testResult],
                            //  NOTE: format may change in future, not currently recorded on activity
                            versionUsed: {
                                type: 'ldt', name: ldtVersion
                            }
                        },
                        false,              //  use html
                        true,               //  reverse order of lines (mongoose issue)
                        true                //  skip extra line break at end
                    );

                    if( 'undefined:' === finding.labFullText.substr( 0, 10 ) ) {
                        finding.labFullText = finding.labFullText.substr( 10 );
                    }
                } else {
                    finding.labFullText = '(not generated on client)';
                }
            }

            return finding;
        }

        /**
         *  Check if testResult.sampleNormalValueText is a range of values, eg 20-80
         *  @param  normalValue
         */

        function isRangeStr( normalValue ) {
            var parts;
            if( !Array.isArray( normalValue ) ) {
                return false;
            }
            if( 1 !== normalValue.length ) {
                return false;
            }

            parts = normalValue[0].split( '-' );
            if( 2 !== parts.length ) {
                return false;
            }

            return !(isNaN( parseFloat( parts[0] ) ) || isNaN( parseFloat( parts[1] ) ));
        }


        /*
         *  Share this with the rest of mojito - renamed from Y.doccirrus.forms.config due to strange YUI namespace issue
         */

        Y.namespace( 'doccirrus.forms' ).labdata = {
            //getReportingFields: getReportingFields,
            expandSingleTestResult: expandSingleTestResult,
            expandSingleTestResultLdt3: expandSingleTestResultLdt3
        };

    },
    '0.0.1',
    {
        requires: [
            'dcregexp',
            'dcforms-utils'
        ]
    }
);
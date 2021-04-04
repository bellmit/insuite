/**
 *  Script to look for broken invoices, where a treatment may not have been included in the form
 *
 *  For more information in output, uncomment the print() in printQuiet
 *
 *  User: strix
 *  Date: 19/12/2018
 *  (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db, ObjectId, ISODate*/

db.activities.count( { 'actType': 'INVOICE' } );

function checkAllInvoicesAgainstForms() {

    let
        fromDate = ISODate("2018-10-01T00:00:00.000Z"),
        invoiceQuery = {
            timestamp: {$gt: fromDate },
            actType: "INVOICE",
            status: { $nin: [ 'CANCELLED' ] }
        },
        problemsFound = 0;

    let invoiceCount = db.activities.find( invoiceQuery ).count();

    db.activities
        .find( invoiceQuery )
        .sort({"timestamp": 1})
        .forEach( checkInvoiceAgainstForm );

    print( `Problems found: ${problemsFound} invoices: ${ invoiceCount }` );

    function checkInvoiceAgainstForm( invoiceObj ) {

        var
            invoiceId = invoiceObj._id.valueOf(),
            invoiceNo = invoiceObj.invoiceNo ? invoiceObj.invoiceNo : '',

            countTreatmentTables = 0,   /* sometimes more than one Invoice_T table in the form */

            linkedTreatments = [],
            treatmentsByCode = {},
            treatmentsInForm = {},
            codes = [],
            formDoc;

        invoiceObj.attachments = invoiceObj.attachments || [];
        invoiceObj.activities = invoiceObj.activities || [];

        printNoisy( `INVOICE ${invoiceId} No. ${invoiceNo} attachments: ${ invoiceObj.attachments.length }` );

        /* steps */

        getFormDocument();
        loadLinkedTreatments();
        collectTreatments();
        collectTreatmentsInForm();
        compareFormWithActivity();

        /*  1.  Check that invoice has one form document attached, load it */

        function getFormDocument() {
            let
                attachmentIds =  invoiceObj.attachments.map( idStr => ObjectId( idStr) ),
                documentQuery = {
                    '_id': { '$in': attachmentIds },
                    'type': 'FORM'
                };

            let countDocs = db.documents.find( documentQuery ).count();

            if ( 1 !== countDocs ) {
                printNoisy( `WARNING: ${invoiceId} ${invoiceObj.status} Incorrect number of form documents for activity: ${countDocs} ` );
            }

            printNoisy( `Count of query: ${countDocs}` );

            /*  2.  Find the form document */

            db.documents.find( documentQuery ).forEach( doc => { formDoc = doc; } );

            if ( !formDoc ) {
                printQuiet( `Missing form document on activity ${invoiceId}` );
                return;
            }
        }

        /* 2.  Load the linked activities, only treatments for now, no universal way to check diagnoses in form */

        function loadLinkedTreatments() {
            let
                activityIds = [],
                activityQuery = {
                    '_id': { '$in': activityIds },
                    'actType':'TREATMENT'
                };

            invoiceObj.activities.forEach( idStr => { activityIds.push( ObjectId( idStr ) ); } );

            let activityCount = db.activities.find( activityQuery ).count();

            if ( activityCount !== activityIds.length ) {
                printNoisy( `Checking links from invoice` );

                activityIds.forEach( checkId => {
                    let singleCount = db.activities.find( { _id: checkId } ).count();
                    if ( 1 === singleCount ) {
                        printNoisy( `CONFIRM: Correct link from invoice: ${invoiceId} --> ${checkId.valueOf()}` );
                    } else {
                        printQuiet( `WARNING: Dead link from invoice: ${invoiceId} --> ${checkId.valueOf()}` );
                    }
                } );
            }

            db.activities.find( activityQuery ).forEach( actObj => { linkedTreatments.push( actObj ); } );

            printNoisy( `Count of linked TREATMENT activities: ${ activityCount } ${ linkedTreatments.count }` );
        }

        /*  3.  Collect treatments by code, for comparison with form  */

        function collectTreatments() {
            linkedTreatments.forEach( treatment => {
                let code = treatment.code;

                if ( !treatmentsByCode.hasOwnProperty( code ) ) {
                    treatmentsByCode[ code ] = {
                        'ids': [],
                        'expected': 0
                    };
                    codes.push( code );
                }

                treatmentsByCode[code].ids.push( treatment._id.valueOf() );
                treatmentsByCode[code].expected = treatmentsByCode[code].expected + 1;
            } );
        }

        /*  4.  Collect treatments in form */

        function collectTreatmentsInForm() {
            let collected = false, formTable, k;

            if ( !formDoc ) { return; }

            for ( k in formDoc.formState ) {

                if ( Array.isArray( formDoc.formState[k] ) && formDoc.formState[k].length > 0 ) {

                    formTable = formDoc.formState[k];
                    /* costperitem is from 2016 and always a string, should always be present for InvoiceItem_T tables */
                    if ( formTable[0] && ( formTable[0].costperitem || formTable[0].cost ) ) {
                        printNoisy( `Collecting treatments from invoice table ${k}` );
                        collectTreatmentsFromTable( formTable );

                        if ( collected ) {
                            printNoisy( `More than one treatment table in form: ${k}` );
                        }
                        collected = true;
                    }

                }

            }

            /*
            if ( !collected && formDoc && formDoc.mapData && formDoc.mapData.itemsAll ) {
                collectTreatmentsFromTable( formDoc.mapData.itemsAll );
                collected = true;
            }

            if ( !collected && formDoc && formDoc.mapData && formDoc.mapData.items ) {
                collectTreatmentsFromTable( formDoc.mapData.items );
                collected = true;
            }

            if ( !collected && formDoc && formDoc.mapData && formDoc.mapData.treatmentTable ) {
                collectTreatmentsFromTable( formDoc.mapData.treatmentTable );
                collected = true;
            }
            */

            if ( !collected && linkedTreatments.length > 0 ) {
                printQuiet( `Could not collect treatments from form for invoice ${invoiceId}, no treatments table found.` );
            }
        }

        function collectTreatmentsFromTable( formTable ) {
            if ( !Array.isArray( formTable ) ) {
                printQuiet( `Invalid form table for invoice ${invoiceId}, must be an array.` );
                return;
            }

            countTreatmentTables = countTreatmentTables + 1;

            formTable.forEach( row => {
                if ( !row.quantity ) { row.quantity = 1; }

                /* treatment rows for auslagen / sachkostem are stripped of codes in form, try to match by date */
                if ( '' === row.code ) {
                    printNoisy( `Row is missing code, has timestamp ${row.timestamp}`  );
                    linkedTreatments.forEach( actObj => {
                        printNoisy( `CMP: ${row.timestamp} -- ${actObj.timestamp}` );

                        /*  activityId is often but not always present */
                        if ( row.activityId + '' === actObj._id.valueOf() + '' ) {
                            printNoisy( `ID Matched code of auslagen/sachkosten ${actObj.code} ${actObj.activityId}` );
                            row.code = actObj.code + '';
                        }

                        /*  timestamp may change */
                        if ( row.timestamp + '' === ( new Date( actObj.timestamp ) ).toISOString() + '' ) {
                            printNoisy( `TS Matched code of auslagen/sachkosten ${actObj.code} ${actObj.activityId}` );
                            row.code = actObj.code + '';
                        }
                    } );
                }

                if ( row.code ) {

                    if ( !treatmentsInForm.hasOwnProperty( row.code) ) {
                        treatmentsInForm[ row.code ] = {
                            'ids': [],
                            'found': 0
                        };
                    }

                    printNoisy( `Found in form ${row.code} x ${row.quantity}` );
                    treatmentsInForm[ row.code ].found = treatmentsInForm[ row.code ].found + parseInt( row.quantity, 10 );

                    /*  not needed for initial check, can be used to find missing items */
                    if ( row.activityId ) {
                        treatmentsInForm[ row.code ].ids.push( row.activityId );
                    }
                }
            } );
        }

        /*  5.  Compare treatments in form with treatments linked from activity */

        function compareFormWithActivity() {
            if ( !formDoc ) { return; }

            codes.forEach( code => {
                printNoisy( `Checking code: ${code}...` );

                if ( !treatmentsInForm[code] ) {
                    printQuiet( `Form is missing treatments for code: ${code} expected: ${treatmentsByCode[code].expected} ${JSON.stringify(treatmentsByCode[code].ids)}` );
                    return;
                }

                if ( treatmentsInForm[code].found !== treatmentsByCode[code].expected ) {

                    if ( 1 === countTreatmentTables ) {
                        printQuiet( `Form mismatched treatments for code: ${code} found: ${treatmentsInForm[code].found} expected: ${treatmentsByCode[code].expected} ${JSON.stringify(treatmentsByCode[code].ids)}` );
                        return;
                    }

                    if ( treatmentsByCode[code].expected > treatmentsInForm[code].found ) {
                        printQuiet( `Form missing treatments for code: ${code} found: ${treatmentsInForm[code].found} expected: ${treatmentsByCode[code].expected} ${JSON.stringify(treatmentsByCode[code].ids)}` );
                        return;
                    }

                }

            } );
        }

        function printNoisy( /* msg */ ) {
            /* print( `NOISY ${invoiceId}: ${msg}` ); */
        }

        function printQuiet( /* msg */ ) {
            /* print( `QUIET ${invoiceId}: ${msg}` ); */
            problemsFound = problemsFound + 1;
        }
    }

}

checkAllInvoicesAgainstForms();


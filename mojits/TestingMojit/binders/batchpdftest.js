/*
 *  Binder for batch PDF testing page
 *
 *  This is to test rendering of activities directly to PDF in a downloadable zip archive
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */

/*global YUI, $, async */

YUI.add('TestingMojitBinderPDFZipTest', function(Y, NAME) {
        /**
         * The TestingMojitBinderPDFZipTest module.
         *
         * @module TestingMojitBinderPDFZipTest
         */

        'use strict';

        Y.log('YUI.add TestingMojitBinderPDFZipTest with NAMEs ' + NAME, 'info');

        /**
         * Constructor for the TestingMojitBinderImageTest class.
         *
         * @class testingMojitBinderIndex
         * @constructor
         */

        Y.namespace('mojito.binders')[NAME] = {

            /**
             * Binder initialization method, invoked after all binders on the page
             * have been constructed.
             */
            init: function(mojitProxy) {
                this.mojitProxy = mojitProxy;
            },

            /**
             *	The binder method, invoked to allow the mojit to attach DOM event
             *	handlers.
             *
             *	@param node {Node} The DOM node to which this mojit is attached.
             */

            bind: function(node) {

                var
                    jqCache = {
                        btnTestBatchPDF: $('#btnTestBatchPDF'),
                        btnTestPRBatchPDF: $('#btnTestPRBatchPDF'),
                        taExampleData: $('#taExampleData')
                    };

                this.node = node;

                //  attach event handlers
                jqCache.btnTestBatchPDF.off('click').on('click', onRenderBtnClicked);
                jqCache.btnTestPRBatchPDF.off('click').on('click', onPRRenderBtnClicked);

                //  load test data
                jqCache.taExampleData.val('loading');
                this.makeTestData(onTestDataLoaded);

                function onRenderBtnClicked() {

                    function onZipComplete(err, zipId) {
                        if (err) {
                            Y.doccirrus.comctl.setModal('Render batch PDF', 'Err: ' + err);
                            return;
                        }
                        var zipUrl = Y.doccirrus.infras.getPrivateURL('/zip/' + zipId + '.zip'),
                            zipLink = '' +
                                '<a href="' + zipUrl + '" class="btn btn-primary btn-lg active">' +
                                '<i class="fa fa-download"></i> Download Zip' +
                                '</a>';

                        Y.doccirrus.comctl.setModal('Render batch PDF', zipLink);
                    }

                    var testData = JSON.parse(jqCache.taExampleData.val());
                    Y.doccirrus.uam.createActivityPDFZip(testData, '1', '2015', onZipComplete);
                }

                /**
                 *  Create PUBRECEIPT objects before rendering PDFs
                 */

                function onPRRenderBtnClicked() {

                    var
                        testData = JSON.parse(jqCache.taExampleData.val()),
                        htmlStatus = '',
                        jqStatus,
                        zipId;

                    Y.doccirrus.comctl.setModal('Render PUBRECEIPT batch to Zip', '<div id="divPRStatus"></div>', false, null, onModalReady);

                    function logStatus(txt) {
                        htmlStatus = htmlStatus + txt + '<br/>';
                        jqStatus.html(htmlStatus);
                    }

                    function onModalReady() {
                        jqStatus = $('#divPRStatus');
                        logStatus('Requesting new ZIP archive...');
                        Y.doccirrus.comctl.privateGet('/1/media/:createzip', {}, onZipCreated);
                    }

                    /**
                     *  Once the zip has been created on the server we look up the current invoice form
                     *
                     *  @param err
                     *  @param newZipId
                     */

                    function onZipCreated(err, newZipId) {
                        if (err) {
                            logStatus('Could not create new ZIP archive: ' + JSON.stringify(err));
                            //callback('Konnte Archiv nicht erstellen: ' + err);
                            return;
                        }

                        zipId = newZipId;

                        logStatus('Created archive with ID ' + newZipId);
                        processNextPatient();
                    }

                    function onZipComplete(err) {
                        if (err) {
                            Y.doccirrus.comctl.setModal('Render batch PDF', 'Err: ' + err);
                            return;
                        }
                        var zipUrl = Y.doccirrus.infras.getPrivateURL('/zip/' + zipId + '.zip'),
                            zipLink = '' +
                                '<a href="' + zipUrl + '" class="btn btn-primary btn-lg active">' +
                                '<i class="fa fa-download"></i> Download Zip' +
                                '</a>';

                        logStatus('<hr/>');
                        logStatus(zipLink);
                        //Y.doccirrus.comctl.setModal('Render batch PDF', zipLink);
                    }

                    function processNextPatient() {
                        if (0 === testData.length) {
                            logStatus('all done');
                            onZipComplete();
                            return;
                        }
                        var nextPR = testData.pop();

                        Y.doccirrus.uam.createPRActivityPDFZip(zipId, nextPR.patientId, nextPR.activeCaseFolderId, nextPR.activities, '1', '2015', onPDFAdded);
                    }

                    function onPDFAdded(err, response) {
                        if (err) {
                            logStatus('Could not create PUBCRECIPT PDF for ZIP: ' + JSON.stringify(err));
                            return;
                        }

                        console.log('Created PDF ZIP...');
                        console.log(JSON.stringify(response));

                        processNextPatient();
                    }


                }

                function onTestDataLoaded(err, testDataObj) {
                    if (err) {
                        jqCache.taExampleData.val(err);
                        return;
                    }

                    jqCache.taExampleData.val(JSON.stringify(testDataObj, undefined, 2));
                }
            },


            /**
             *  Look up patients and activities on this tenant
             *
             *  @param  callback    fn(err, testDataObj)
             */

            makeTestData: function( callback ) {
                var
                    patients,
                    testData = [];

                async.series( [ loadPatients, expandActivities ] , callback );

                function loadPatients( itcb ) {
                    Y.doccirrus.comctl.privateGet('/1/patient', {}, onPatientsLoaded);

                    function onPatientsLoaded(err, data) {
                        if (err) { return itcb( err ); }

                        data = data.data ? data.data : data;
                        patients = data;
                        Y.log( 'patients loaded: ' + data.length, 'debug', NAME );
                        itcb( null );
                    }
                }

                function expandActivities( itcb ) {
                    async.eachSeries( patients, processSinglePatient, itcb );
                }

                function processSinglePatient( patient, itcb ) {
                    Y.log( 'Getting activities for patient: ' + patient._id, 'debug', NAME );

                    Y.doccirrus.jsonrpc.api.activity
                        .read( { 'query': { 'patientId': patient._id } } )
                        .then( onActivitiesLoaded );

                    function onActivitiesLoaded( result) {

                        var
                            activitySet = [],
                            i;

                        result = result.data ? result.data : result;

                        Y.log( 'Loaded ' + result.length + ' activities for patient ' + patient._id, 'debug', NAME );

                        for (i = 0; i < result.length; i++) {
                            if ('TREATMENT' === result[i].actType) {
                                if ('VALID' === result[i].status || 'APPROVED' === result[i].status) {
                                    activitySet.push( result[i]._id );
                                }
                            }
                        }

                        if (activitySet.length > 0) {
                            testData.push({
                                'patientId': patient._id,
                                'activities': activitySet
                            });
                        }

                        itcb( null );
                    }
                }
            }

        };

    },
    '0.0.1',
    {
        requires: [
            'event-mouseenter',
            'mojito-client',
            'mojito-rest-lib',
            'dcbatchpdfzip',
            'doccirrus',
            'event-mouseenter',
            'mojito-client',
            'JsonRpcReflection-doccirrus',
            'dcregexp',
            'dcvalidations',
            'dcsubviewmodel',
            'dcutils',
            'dcauth',
            'dcutils-uam',
            'dccasefilebinderevents',
            'dcloadhelper',
            'dcformloader',
            'dccatalogmap',
            'dcviewmodel',
            'dcpatientmodel',
            'dclocationmodel',
            'dcaddressmodel',
            'dccommunicationmodel',
            'dcinsurancestatusmodel',
            'dcbankaccountmodel',
            'dcbankaffiliatemodel',
            'dcdocumentmodel',
            'dceventarraymodel',
            'dccontactmodel',
            'dcinvoicemodel',
            'DocumentationTreeModel',
            'dcactivitysettingsmodel',
            'activitysettings-api',
            'base',
            'router',
            'json',
            'model-sync-rest',
            'intl',
            'mojito-intl-addon',
            'dc-comctl',
            'dcmedia',
            'dcvat',
            'DCWindow',
            'dcmarkermodel',
            'dcmarkerarraymodel',
            'dchotkeyshandler',
            'DCSystemMessages',
            'parallel',
            'dcFkModels',
            'dcOphthalmologyModels',
            'kbv-api',
            'dccrmanager',
            'cardreader',
            'dcrecommendedprescriptionmodal',
            'dcmediapreviewnmodal',
            'DCFsmDefault',
            'DeviceReader',
            'dccommunication-client'
        ]
    }
);

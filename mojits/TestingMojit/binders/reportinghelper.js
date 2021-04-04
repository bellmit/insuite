/*
 *  Page to manually regenerate reporting by patient
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */

/*global YUI, $, async, moment */

YUI.add('test-reporting-helper-ui', function(Y, NAME) {

        'use strict';

        Y.log('YUI.add test-reporting-helper-ui with NAMEs ' + NAME, 'info');

        Y.namespace('mojito.binders')[NAME] = {

            jq: {},
            patientIds: [],
            log: '',
            isPaused: false,

            throbberImg: '<img src="/static/DocCirrus/assets/images/ajax-loader.gif" />',

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
                    self = this;

                self.jq = {
                    txtTimePeriod: $('#txtTimePeriod'),
                    selTimeUnit: $('#selTimeUnit'),
                    btnFindPatients: $('#btnFindPatients'),
                    divPatientIds: $('#divPatientIds'),
                    taPatientIds: $('#taPatientIds'),
                    divProgressArea: $('#divProgressArea'),
                    divProgressBar: $('#divProgressBar'),

                    txtStartDate: $('#txtStartDate'),
                    txtEndDate: $('#txtEndDate'),

                    chkLabdataOnly: $('#chkLabdataOnly'),
                    btnGenerate: $('#btnGenerate'),
                    btnPauseResume: $('#btnPauseResume'),
                    btnClear: $('#btnClear'),
                    divRegenerate: $('#divRegenerate')
                };

                this.node = node;

                //  set dates
                self.jq.txtEndDate.val( moment().format() );
                self.jq.txtStartDate.val( moment().subtract( '1', 'years' ).format() );

                //  attach event handlers
                self.jq.btnFindPatients.off( 'click' ).on( 'click', function() { self.onFindPatientsClick(); } );
                self.jq.btnGenerate.off( 'click' ).on( 'click', function() { self.onGenerateClick(); } );
                self.jq.btnClear.off( 'click' ).on( 'click', function() {
                    self.log = '';
                    self.addMessage( '... cleared ...' );
                } );

            },

            /**
             *  Start generation of reporting
             */

            addMessage: function( line ) {
                var self = this;
                self.log = self.log + line + '<br/>\n';
                self.jq.divRegenerate.append('<pre>' + line + '</pre>\n');
            },

            //  EVENT HANDLERS

            onFindPatientsClick: function() {
                var
                    self = this,
                    url = '/1/test/:activePatientList',
                    postArgs = {
                        'timePeriod': self.jq.txtTimePeriod.val(),
                        'timeUnit': self.jq.selTimeUnit.val()
                    };

                self.jq.taPatientIds.val( 'loading...' );
                self.jq.divPatientIds.show();

                self.jq.btnFindPatients.hide();
                //self.jq.divPatientIds.html( self.throbberImg );

                Y.doccirrus.comctl.privatePost( url, postArgs, onRequestPatients );

                function onRequestPatients( err, result ) {
                    if ( err ) {
                        self.jq.divPatientIds.html( '<pre>' + JSON.stringify( err ) + '</pre>' );
                        return;
                    }

                    result = result.data ? result.data : result;

                    self.jq.taPatientIds.val( 'loading...' );
                    self.jq.taPatientIds.val( JSON.stringify( result, null, 4 ) );
                    self.jq.divPatientIds.show();
                    self.jq.btnFindPatients.show();
                    self.patientIds = result;
                }
            },

            onGenerateClick: function() {
                var
                    url = '/1/test/:regenerateMissingForPatient',
                    progress = 0,
                    self = this;

                self.jq.divProgressBar.attr( 'aria-valuenow', 0 );
                self.jq.divProgressBar.css( 'width', '0%' );

                self.patientIds = JSON.parse( self.jq.taPatientIds.val() );

                if ( 0 === self.patientIds.length ) { return; }

                self.jq.btnGenerate.hide();
                self.jq.btnPauseResume.show();
                self.jq.btnPauseResume.html( 'Pause' );
                self.jq.divProgressArea.show();
                self.jq.divProgressBar.show();
                self.isPaused = false;

                self.addMessage( 'Selected ' + self.patientIds.length + ' patients, starting reporting generation...' );

                async.eachSeries( self.patientIds, regenerateForSinglePatient, onAllDone );

                function regenerateForSinglePatient( patientId, itcb ) {
                    var
                        postArgs = {
                            'patientId': patientId,
                            'startDate': self.jq.txtStartDate.val(),
                            'endDate': self.jq.txtEndDate.val(),
                            'labdataOnly': self.jq.chkLabdataOnly.prop( 'checked' ),
                            'callbackAfter': true
                        };

                    self.addMessage( '(i) Generating any missing reporting entries for patient: ' + patientId );

                    Y.doccirrus.comctl.privatePost( url, postArgs, onRegenerateSingle );

                    function onRegenerateSingle( err, result ) {
                        if ( err ) {
                            self.addMessage( '(!) Problem regenerating reporting for patient ' + patientId + ': ' + JSON.stringify( err ) );
                            //  don't pass the error, continue with next patient, best effort
                            return itcb( null );
                        }

                        result = result.data ? result.data : result;
                        self.addMessage( '(>) regenerate single: ' + JSON.stringify( result ) );

                        progress = progress + 1;

                        var
                            percent = Math.floor( ( progress / self.patientIds.length ) * 100 ),
                            countMissing = 0,
                            i;

                        for ( i = 0; i < result.length; i++ ) {
                            if ( result[i].missing ) {
                                countMissing = countMissing + 1;
                            }
                        }

                        if ( 0 === result.length ) {
                            self.addMessage( '(i) no missing reportings found for ' + patientId + ' in date range.' );
                        } else {
                            self.addMessage( '(i) generated outstanding reporting entries for ' + countMissing + ' of ' + result.length + ' activities.' );
                        }

                        for ( i = 0; i < result.length; i++ ) {
                            if ( result[i].err ) {
                                self.addMessage( '(!) Problem generating reporting for ' + result[i]._id + ' (' + result[i].actType + '): ' + JSON.stringify( err ) );
                            }
                        }

                        self.jq.divProgressBar.attr( 'aria-valuenow', percent );
                        self.jq.divProgressBar.css( 'width', percent + '%' );

                        itcb( null );
                    }

                }

                function onAllDone( err ) {
                    if ( err ) {
                        self.addMessage( 'Problem while regeneating labadata: ' + JSON.stringify( err ) );
                        return;
                    }

                    self.addMessage( 'Generated missing reportings for all ' + self.patientIds.length + ' patients.' );
                    self.jq.btnGenerate.show();
                    self.jq.btnPauseResume.hide();
                    self.isPaused = false;
                    self.jq.btnPauseResume.html( 'Pause' );
                }
            }

        };

    },
    '0.0.1',
    {
        requires: [
            'KoUI-tests',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'dcutils-uam',
            'KoUI-all',
            'KoEditableTable',
            'DCContextMenu',
            'dc-comctl'
        ]
    }
);

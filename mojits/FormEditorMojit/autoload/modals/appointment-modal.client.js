/*global YUI, ko, $, async */

'use strict';

YUI.add( 'appointment-modal', function( Y , NAME ) {
    var
        i18n = Y.doccirrus.i18n;

        /**
     *  Dialog to show progress of loading and printing a KOTable to PDF
     *
     *
     *  @method show
     *  @param  options             {Object}
     *  @param  options.patient     {Object}    KO patient model
     */

    function showAppointmentForm( options ) {

        var
            //self = this,
            currentPatient = options.patient,
            patientId = options.patientId,

            prefix = 'InCaseMojit.ActivityCaseFileButtonsViewModel.calevent.',

            modal,
            node = Y.Node.create( '<div id="divPrintEventList"></div>' ),
            modalPrint = {
                label: '',
                name: 'printCal',
                value: 'Drucken',
                action: function() {
                    printCalEvents();
                },
                section: 'header',
                template: '<button id="btnPrintCalEntries" type="button" style="display: none; margin-left: 10px; margin-right: 10px;"/>',
                classNames: 'glyphicon glyphicon-print close'
            },
            modalConfig = {
                className: 'DCWindow-patientCalEvent',
                title: i18n( prefix + 'TITLE' ),
                bodyContent: node,
                icon: Y.doccirrus.DCWindow.ICON_LIST,
                width: 550,
                minHeight: 50,
                minWidth: 550,
                centered: true,
                modal: true,
                dragable: true,
                maximizable: false,
                resizeable: true,
                render: document.body,
                buttons: {
                    header: ['close', modalPrint],
                    footer: [] ///
                }
            },

            formOptions = {
                'patientRegId': '',             //  used by PUC proxy, not applicable here
                'canonicalId': '',              //  formtemplate with role 'casefile-terminliste',
                'formVersionId': '',            //  latest version of this form
                'divId': 'divPrintEventList',   //  div to render into, in modal
                'il8nDict': {},                 //  not used at present
                'doRender': false,              //  we will call template.render after load
                'mapperName': 'patient',        //  type of form mapper driving this form
                'width': 500
            },

            mapperContext = {                   //  objects which mapper will use to populate the form
                'patient': currentPatient,
                'events': ko.observableArray( [] )
            },

            template,
            mapper;

        modal = new Y.doccirrus.DCWindow( modalConfig );

        modal.on( 'visibleChange', function( event ) {
            if( false === event.newVal ) {
                if( mapper ) {
                    mapper.destroy();
                }
                if( template ) {
                    template.destroy();
                }
            }
        } );

        node.setStyles( {width: 500} );
        node.setHTML( Y.doccirrus.comctl.getThrobber() );

        //  async steps

        async.series(
            [
                getPatientAppointments,
                getFormIDFromRole,
                getFormMeta,
                createCaleventsFormTemplate,
                createPatientMapper
            ],
            onEventListReady
        );

        //  (1) load patient appointments

        function getPatientAppointments( itcb ) {
            Y.doccirrus.jsonrpc.api.patient
                .getAppointments( { patientId: patientId } )
                .done( onAppointmentsLoaded )
                .fail( onAppointmentsFail );

            function onAppointmentsLoaded( response ) {
                if( response && response.data && response.data[0] ) {
                    mapperContext.events( response.data );
                    itcb( null );
                    return;
                }
                Y.log( 'did not load appointments, none recorded', 'info', NAME );
                node.setHTML( i18n( prefix + 'NO_ENTRIES' ) );
                itcb( new Error( 'no appointments could be loaded' ) );
            }

            function onAppointmentsFail() {
                Y.log( 'could not load appointments', 'error', NAME );
                node.setHTML( i18n( prefix + 'NO_ENTRIES' ) );
                itcb( new Error( 'Appoints could not be loaded' ) );
            }
        }

        //  (2) look up appointment listing / Termin Liste form
        function getFormIDFromRole( itcb ) {
            function onFormLookup( err, formId ) {

                if( err || '' === formId ) {
                    node.setHTML( i18n( prefix + 'NO_FORM' ) );
                    itcb( new Error( 'No form assigned to role casefile-terminliste' ) );
                    return;
                }

                formOptions.canonicalId = formId;
                itcb( null );
            }

            Y.log( 'Querying config for Termin Liste Form', 'debug', NAME );
            Y.dcforms.getConfigVar( '', 'casefile-terminliste', false, onFormLookup );
        }

        //  (3) look up form metadata
        function getFormMeta( itcb ) {
            function onFormMetaLoaded( err, formMeta ) {

                if( err ) {
                    //  TODO: translateme
                    node.setHTML( i18n( prefix + 'NO_FORM' ) );
                    itcb( new Error( 'Termine liste form metadata could not be loaded' ) );
                    return;
                }

                formOptions.formVersionId = formMeta.latestVersionId;

                //Y.log( 'Adding form Appointment List form modal: ' + formOptions.canonicalId, 'debug', NAME );
                itcb( null );
            }

            Y.dcforms.getFormListing( '', formOptions.canonicalId, onFormMetaLoaded );
        }

        //  (4) instantiate and load the form
        function createCaleventsFormTemplate( itcb ) {
            formOptions.callback = function onFormTemplateCreated( err, newFormTemplate ) {
                template = newFormTemplate || null;
                itcb( err );
            };

            Y.dcforms.createTemplate( formOptions );
        }

        //  (5) instantiate the mapper
        function createPatientMapper( itcb ) {
            mapper = Y.dcforms.mapper.patient( template, mapperContext );
            //  width of rendering div seems to be unstable
            template.resize( 500, itcb );
        }

        function onEventListReady( err ) {
            if( err ) {
                Y.log( 'Could not render calender event list form: ' + JSON.stringify( err ), 'warn', NAME );
                return;
            }

            //  show print button in model header
            $( '#btnPrintCalEntries' ).show();
            template.render( Y.dcforms.nullCallback );
            modal.centered();
        }

        function printCalEvents() {
            $( '#btnPrintCalEntries' ).hide();
            if( !template ) {
                return;
            }

            template.renderPdfServer( 'temp', '', 'Termin', onDocumentReady );

            function onDocumentReady( err, formForPDF ) {
                if ( err ) { return onPDFRendered( err ); }

                //  call formtemplate API via REST
                Y.doccirrus.comctl.privatePost('1/media/:makepdf', { 'document': formForPDF }, onPDFRenderedAlt );
            }

            function onPDFRenderedAlt( err, data ) {

                data = data.data ? data.data : data;

                if( err || !data || !data.tempId || '' === data.tempId ) {
                    Y.log( 'Could not generate PDF: ' + JSON.stringify( err ), 'warn', NAME );
                    Y.doccirrus.DCWindow.notice( {
                        type: 'info',
                        message: i18n( 'InCaseMojit.casefile_browser.print.menuitem.COULD_NOT_PRINT_CAL' )
                    } );
                }

                var
                    tempId = data.tempId,
                    relUrl = '/pdf/' + tempId.split( '/' ).pop();

                Y.doccirrus.modals.printPdfModal.show( {
                    'documentUrl': relUrl,
                    'documentFileName': relUrl.replace( '/pdf/', '' ),
                    'cacheFile': relUrl,
                    'canonicalId': template.canonicalId
                } );

                //$( '#divPrintEventList' ).parent().prepend( html );
            }

            function onPDFRendered( err, data ) {

                data = data.data ? data.data : data;

                if( err || !data || !data.tempId || '' === data.tempId ) {
                    Y.log( 'Could not generate PDF: ' + JSON.stringify( err ), 'warn', NAME );
                    Y.doccirrus.DCWindow.notice( {
                        type: 'info',
                        message: i18n( 'InCaseMojit.casefile_browser.print.menuitem.COULD_NOT_PRINT_CAL' )
                    } );
                }

                var
                    tempId = data.tempId,
                    relUrl = '/pdf/' + tempId.split( '/' ).pop(),
                    fullUrl = Y.doccirrus.infras.getPrivateURL( relUrl ),
                    openButton = '<a class="btn" href="' + fullUrl + '" target="_blank" >' + i18n( prefix + 'OPEN_PDF' ) + '</a>',
                    downloadButton = '<a class="btn" href="' + fullUrl + '" download>' + i18n( prefix + 'DOWNLOAD_PDF' ) + '</a>',
                    html = '<div class="well">' + openButton + downloadButton + '</div>';

                $( '#divPrintEventList' ).parent().prepend( html );
            }
        }

    }

    Y.namespace( 'doccirrus.modals' ).appointments = {
        show: showAppointmentForm
    };

}, '0.0.1', {
    requires: [
        'oop',
        'dc-comctl',
        'event-custom',
        'doccirrus',
        'dcutils',
        'KoViewModel',
        'dccommunication-client',
        'dcforms-utils',
        'dcforms-template',
        'dcforms-map-patient'
    ]
} );
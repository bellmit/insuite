/**
 * User: do
 * Date: 26/10/17  14:53
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'copy_insurance_data-modal', function( Y/*, NAME*/ ) {

        var
            i18n = Y.doccirrus.i18n,
            COPY_INSURANCE_DATA = i18n( 'InCaseMojit.patient_browserJS.headline.COPY_INSURANCE_DATA' );

        function getTemplate() {
            return Promise.resolve( Y.doccirrus.jsonrpc.api.jade.renderFile( {path: 'InCaseMojit/views/copy_insurance_data-modal'} ) )
                .then( function( response ) {
                    return response.data;
                } );
        }

        function getModel( config ) {
            var insuranceToCopyTo = [],
                insuranceDataToCopy = null,
                copyReadInsuranceDataI18n = i18n('InCaseMojit.patient_browserJS.message.COPY_READ_INSURANCE_DATA_TO_OTHER_INSURANCES');
            config.patient.insuranceStatus.forEach( function( insurance ) {
                if( 'PUBLIC' === insurance.type ) {
                    insuranceDataToCopy = insurance;
                    return;
                }
                insuranceToCopyTo.push( {
                    type: insurance.type,
                    i18n: Y.doccirrus.schemaloader.getEnumListTranslation( 'person', 'Insurance_E', insurance.type, 'i18n', 'n/a' ),
                    checked: ko.observable( false )
                } );
            } );
            return {
                insuranceDataToCopy: insuranceDataToCopy,
                insuranceToCopyTo: insuranceToCopyTo,
                copyReadInsuranceDataI18n: copyReadInsuranceDataI18n
            };
        }

        function showDialog( config ) {
            return getTemplate().then( function( template ) {

                return new Promise( function( resolve ) {

                    var bodyContent = Y.Node.create( template ),
                        model = getModel( config ),
                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-additionalinsurance-modal',
                            bodyContent: bodyContent,
                            title: COPY_INSURANCE_DATA,
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            centered: true,
                            modal: true,
                            maximizable: true,
                            resizeable: true,
                            render: document.body,
                            focusOn: [],
                            buttons: {
                                header: ['close', 'maximize'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'NO', {
                                        action: function() {
                                            modal.close();
                                            resolve();
                                        }
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'YES', {
                                        isDefault: true,
                                        action: function() {
                                            modal.close();
                                            model.insuranceToCopyTo = model.insuranceToCopyTo.filter( function( insurance ) {
                                                return insurance.checked();
                                            } ).map( function( insurance ) {
                                                return insurance.type;
                                            } );

                                            resolve( model );
                                        }
                                    } )
                                ]
                            }
                        } );

                    ko.applyBindings( model, bodyContent.getDOMNode() );

                } );
            } );

        }

        Y.namespace( 'doccirrus.modals' ).copyInsuranceDataModal = {
            showDialog: showDialog
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow'
        ]
    }
);

/**
 * User: do
 * Date: 26/10/17  14:53
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'additionalinsurances-modal', function( Y/*, NAME*/ ) {

        var
            i18n = Y.doccirrus.i18n,
            ADDITIONAL_INSURANCE = i18n( 'InCaseMojit.patient_browserJS.headline.ADDITIONAL_INSURANCE' );

        function getTemplate() {
            return Promise.resolve( Y.doccirrus.jsonrpc.api.jade.renderFile( {path: 'InCaseMojit/views/additionalinsurances_ask_modal'} ) )
                .then( function( response ) {
                    return response.data;
                } );
        }

        function getModel( config ) {
            var
                gkvCardSwiped,
                bgIndex = -1,
                patientInsuranceTypes = config.patient.insuranceStatus.map( function( insurance ) {
                    if( 'PUBLIC' === insurance.type && Boolean( insurance.cardSwipe ) ) {
                        gkvCardSwiped = true;
                    }
                    return insurance.type;
                } ),
                allInsuranceTypes = Y.doccirrus.schemas.person.types.Insurance_E.list.map( function( entry, idx ) {
                    if( 'BG' === entry.val ) {
                        bgIndex = idx;
                    }
                    return {
                        type: entry.val,
                        i18n: entry.i18n,
                        alreadyExists: (-1 !== patientInsuranceTypes.indexOf( entry.val )),
                        checked: ko.observable( true ),
                        cardSwiped: 'PUBLIC' === entry.val && gkvCardSwiped
                    };
                } ),
                createAdditionalInsuranceI18n =  i18n('InCaseMojit.patient_browserJS.message.CREATE_ADDITIONAL_INSURANCE_ON_CARDREAD');

            if( -1 !== bgIndex ) {
                allInsuranceTypes.splice( bgIndex, 1 );
            }

            return {
                insurances: allInsuranceTypes,
                createAdditionalInsuranceI18n: createAdditionalInsuranceI18n
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
                            title: ADDITIONAL_INSURANCE,
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
                                            resolve( model.insurances.map( function( insurance ) {
                                                insurance.checked = insurance.checked();
                                                return insurance;
                                            } ) );
                                        }
                                    } )
                                ]
                            }
                        } );

                    ko.applyBindings( model, bodyContent.getDOMNode() );

                } );
            } );

        }

        Y.namespace( 'doccirrus.modals' ).additionalInsurancesAskModal = {
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

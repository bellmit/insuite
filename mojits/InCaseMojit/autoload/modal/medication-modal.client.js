/*
 @author: pi
 @date: 2014/09/22
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, $ */

'use strict';

YUI.add( 'dcmedicationmodal', function( Y ) {

        var
            unwrap = ko.unwrap,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled;

        function MedicationModal() {

        }

        MedicationModal.prototype.showDialog = function( defaultMappings, data, callback ) {

            function show() {
                function showError( code ) {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: Y.doccirrus.errorTable.getMessages( { code: code } )
                    } );
                }

                return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                    .renderFile( { path: 'InCaseMojit/views/medication_modal' } )
                )
                    .then( function( response ) {
                        return response && response.data;
                    } )
                    .then( function( template ) {
                        var
                            bodyContent = Y.Node.create( template ),
                            i18n = Y.doccirrus.i18n,
                            CANCEL = i18n( 'InCaseMojit.medication_modalJS.button.CANCEL' ),
                            APPLY = i18n( 'InCaseMojit.medication_modalJS.button.APPLY' ),
                            PRESCRIPTION_FOR = i18n( 'InCaseMojit.medication_modalJS.menu.PRESCRIPTION_FOR' ),
                            modal,                                          //  eslint-ignore-line no-unused-vars
                            medicationSearchModel,
                            patient = data.patient,
                            modalTitle = data.modalTitle,
                            aDCWindowResizeEvent,
                            buttons = [],
                            multiSelect = data.multiSelect;

                        try {
                            medicationSearchModel = new Y.doccirrus.uam.MedicationSearchModel( defaultMappings, data.activity, patient, multiSelect, data.focusInput );
                        } catch( e ) {
                            return callback( e );
                        }

                        buttons.push( Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                            label: CANCEL
                        } ) );
                        if( multiSelect ) {
                            buttons.push( Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    label: APPLY,
                                    action: function() {
                                        var
                                            selected = medicationSearchModel.getSelectedItems();
                                        this.close();
                                        callback( undefined, selected );       //  eslint-disable-line callback-return
                                    }
                                } )
                            );
                        } else {
                            buttons.push( Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    label: APPLY,
                                    action: function() {
                                        var selected = medicationSearchModel.getSelected();
                                        if( !selected.product ) {
                                            showError( '6002' );
                                        } else if( !selected.package ) {
                                            showError( '6003' );
                                        } else {
                                            callback( undefined, selected );       //  eslint-disable-line callback-return
                                            this.close();
                                        }
                                    }
                                } )
                            );
                        }

                        modal = new Y.doccirrus.DCWindow( {
                            id: 'medication-search-modal',
                            className: 'DCWindow-Appointment',
                            bodyContent: bodyContent,
                            title: modalTitle || PRESCRIPTION_FOR + unwrap( patient.lastname ) + ', ' + unwrap( patient.firstname ) + ', ' + unwrap( patient.kbvDob ) + ' (' + unwrap( patient.age ) + ')',
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: (window.innerWidth * 95) / 100,
                            height: (window.innerHeight * 93) / 100,
                            minHeight: 600,
                            minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                            centered: true,
                            modal: true,
                            dragable: true,
                            maximizable: true,
                            resizeable: true,
                            render: document.body,
                            buttons: {
                                header: [ 'close', 'maximize' ],
                                footer: buttons
                            },
                            after: {
                                render: function() {
                                    var
                                        modalBody = this,
                                        minHeight = modalBody.get( 'minHeight' ),

                                        modalBodyResizeHandler = function() {

                                            var
                                                winHeight = Y.one( window ).get( 'winHeight' );
                                            if( !modalBody.resizeMaximized.get( 'maximized' ) ) {
                                                if( winHeight > minHeight ) {
                                                    modalBody.set( 'height', (window.innerHeight * 93) / 100 );
                                                    modalBody.set( 'width', (window.innerWidth * 95) / 100 );
                                                } else {
                                                    modalBody.set( 'width', window.innerWidth );
                                                    modalBody.set( 'height', window.innerHeight );
                                                }
                                                modalBody.set( 'centered', true );
                                            }
                                        };
                                    aDCWindowResizeEvent = Y.one( window ).on( 'resize', modalBodyResizeHandler );
                                    modalBodyResizeHandler();
                                },
                                destroy: function() {
                                    if( aDCWindowResizeEvent ) {
                                        aDCWindowResizeEvent.detach();
                                    }
                                    if( medicationSearchModel && medicationSearchModel._dispose ) {
                                        medicationSearchModel._dispose();
                                    }
                                    ko.cleanNode( bodyContent.getDOMNode() );

                                    if( typeof data.destroy === 'function' ) {
                                        data.destroy();
                                    }
                                }
                            }
                        } );

                        modal.set( 'focusOn', [] );

                        medicationSearchModel.menuSearchI18n = i18n('InCaseMojit.medication_modal.menu.SEARCH');
                        medicationSearchModel.menuAdvancedSearchI18n = i18n('InCaseMojit.medication_modal.menu.ADVANCED_SEARCH');
                        medicationSearchModel.placeholderProductNameI18n = i18n('InCaseMojit.medication_modal.placeholder.PRODUCT_NAME');
                        medicationSearchModel.placeholderCompanyNameI18n = i18n('InCaseMojit.medication_modal.placeholder.COMPANY_NAME');
                        medicationSearchModel.placeholderIgreI18nStrengthI18n = i18n('InCaseMojit.medication_modal.placeholder.INGREDIENT_STRENGTH');
                        medicationSearchModel.productInformationI18n = i18n('InCaseMojit.medication_modal.submenu.PRODUCT_INFORMATION');
                        medicationSearchModel.priceComparisonI18n = i18n('InCaseMojit.medication_modal.submenu.PRICE_COMPARISON');
                        medicationSearchModel.cheaperProductsI18n = i18n('InCaseMojit.medication_modal.submenu.CHEAPER_PRODUCTS');
                        medicationSearchModel.attributeDrugI18n = i18n('InCaseMojit.medication_modal.title_attribute.DRUG');
                        medicationSearchModel.priceHistoryI18n = i18n('InCaseMojit.medication_modal.submenu.PRICE_HISTORY');
                        medicationSearchModel.basicInformationI18n = i18n('InCaseMojit.medication_modal.submenu.BASIC_INFORMATION');
                        medicationSearchModel.prescribInformationI18n = i18n( 'InCaseMojit.medication_modal.submenu.PRESCRIBING_INFORMATION' );
                        medicationSearchModel.alternativesI18n = i18n( 'InCaseMojit.medication_modal.submenu.ALTERNATIVES' );
                        medicationSearchModel.groupARMI18n = i18n( 'InCaseMojit.medication_modal.group.AMR' );
                        medicationSearchModel.limitationI18n = i18n('InCaseMojit.medication_modal.text.LIMITATION');
                        medicationSearchModel.groupARVI18n = i18n( 'InCaseMojit.medication_modal.group.ARV' );
                        medicationSearchModel.textAlternativesI18n = i18n( 'InCaseMojit.medication_modal.text.ALTERNATIVES' );
                        medicationSearchModel.activeIngridientsI18n = i18n( 'InCaseMojit.medication_modal.group.ACTIVE_INGREDIENTS' );
                        medicationSearchModel.otherIngridientsI18n = i18n( 'InCaseMojit.medication_modal.group.OTHER_INGREDIENTS' );
                        medicationSearchModel.equivalencesI18n = i18n( 'InCaseMojit.medication_modal.group.EQUIVALENCES' );
                        medicationSearchModel.atcClassificationI18n = i18n( 'InCaseMojit.medication_modal.group.ATC_CLASSIFICATION' );
                        medicationSearchModel.groupIdentaI18n = i18n( 'InCaseMojit.medication_modal.group.IDENTA' );
                        medicationSearchModel.textDiameterI18n = i18n( 'InCaseMojit.medication_modal.text.DIAMETER' );
                        medicationSearchModel.textHeightI18n = i18n( 'InCaseMojit.medication_modal.text.HEIGHT' );
                        medicationSearchModel.textWeightI18n = i18n( 'InCaseMojit.medication_modal.text.WEIGHT' );
                        medicationSearchModel.groupGBAI18n = i18n( 'InCaseMojit.medication_modal.group.GBA' );
                        medicationSearchModel.activeMoleculeI18n = i18n( 'InCaseMojit.medication_modal.radiobox.ACTIVE_MOLECULE' );
                        medicationSearchModel.activeMultiMoleculeI18n = i18n( 'InCaseMojit.medication_modal.radiobox.ACTIVE_MULTI_MOLECULE' );
                        medicationSearchModel.activeMonoMoleculeI18n = i18n( 'InCaseMojit.medication_modal.radiobox.ACTIVE_MONO_MOLECULE' );
                        medicationSearchModel.inactiveMoleculeI18n = i18n( 'InCaseMojit.medication_modal.radiobox.INACTIVE_MOLECULE' );
                        medicationSearchModel.activeAndInactiveMoleculeI18n = i18n( 'InCaseMojit.medication_modal.radiobox.ACTIVE_AND_INACTIVE_MOLECULE' );
                        medicationSearchModel.activeMoleculeWithStrengthI18n = i18n( 'InCaseMojit.medication_modal.radiobox.ACTIVE_MOLECULE_WITH_STRENGTH' );



                        ko.applyBindings( medicationSearchModel, bodyContent.getDOMNode() );

                        Y.doccirrus.jsonrpc.api.mmi.getMetaData().done( function( response ) {
                            var data = response && response.data;
                            if( data.priceUpdate && data.drugUpdate ) {
                                // Hack to add last update information to dcwindow footer. At the moment DCWindow does not support this.
                                $( '#medication-search-modal .modal-footer' ).prepend( '<i class="medication-footer-text">Zertifizierte Arzneimitteldaten von MMI, letzte Aktualisierung: ' + data.priceUpdate + ' (Preise) / ' + data.drugUpdate + ' (Medikamente)</i>' );
                            }
                        } );

                        if( multiSelect ) {
                            medicationSearchModel._addDisposable( ko.computed( function() {
                                var
                                    selectedItems = unwrap( medicationSearchModel.selectedItems ),
                                    okBtn = modal.getButton( 'OK' ).button;

                                if( selectedItems.length ) {
                                    okBtn.enable();
                                } else {
                                    okBtn.disable();
                                }

                            } ) );
                        }
                    } )
                    .catch( catchUnhandled );
            }

            show();

        };
        Y.namespace( 'doccirrus.modals' ).medicationModal = new MedicationModal();

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'DCMedicationSearchModel',
            'promise'
        ]
    }
);

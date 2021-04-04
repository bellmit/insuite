/**
 * User: do
 * Date: 23/02/15  14:21
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment, _*/

YUI.add( 'dcinvoicelogmodal', function( Y, NAME ) {
        var
            i18n = Y.doccirrus.i18n,
            SURENAME = i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
            FORENAME = i18n( 'InCaseMojit.patient_browserJS.placeholder.FORENAME' ),
            INVOICE_STATUS = i18n( 'InvoiceMojit.kvg_browser.placeholder.INVOICE_STATUS' ),
            PRICE_TOTAL = i18n( 'InvoiceMojit.gkv_browserJS.label.PRICE_TOTAL' ),
            LOCATION = i18n( 'InvoiceMojit.gkv_browserJS.label.LOCATION' ),
            BILLING_CONTENT = i18n( 'InvoiceMojit.gkv_browserJS.label.BILLING_CONTENT' ),
            BL_COMPLETED = i18n( 'InvoiceMojit.gkv_browserJS.label.BL_COMPLETED' ),
            BL_NOT_COMPLETED = i18n( 'InvoiceMojit.gkv_browserJS.label.BL_NOT_COMPLETED' ),
            PVS_APPROVED = i18n( 'InvoiceMojit.gkv_browserJS.label.PVS_APPROVED' ),
            PVS_APPROVED_TITLE = i18n( 'InvoiceMojit.gkv_browserJS.label.PVS_APPROVED_TITLE' ),
            NO_DESCRIPTION = i18n( 'InvoiceMojit.general.NO_DESCRIPTION' ),
            NUMBER = i18n( 'InCaseMojit.patient_browserJS.placeholder.NUMBER' ),
            PHYSICIANS = i18n( 'patient-schema.Patient_T.physicians' ),
            YES = i18n( 'InCaseMojit.casefile_detail.checkbox.YES' ),
            NO = i18n( 'InCaseMojit.casefile_detail.checkbox.NO' ),
            CARDSWIPESTATUS = i18n( 'invoiceentry-schema.InvoiceEntry_T.cardSwipeStatus.i18n' ),
            VSDM_STATUS= i18n( 'invoiceentry-schema.InvoiceEntry_T.vsdmStatus.i18n' ),
            FK3000 = i18n( 'InvoiceMojit.gkv_browserJS.label.FK3000' ),

            getScheinInsuranceMap = Y.doccirrus.schemas.activity.getScheinInsuranceMap(),
            zipId; // eslint-disable-line no-unused-vars

        var
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap,
            getObject = Y.doccirrus.commonutils.getObject,
            utilsFunction = KoUI.utils.Function,
            utilsObject = KoUI.utils.Object,
            NOOP = utilsFunction.NOOP,
            FALSE = utilsFunction.FALSE,
            makeClass = utilsObject.makeClass;

        /**
         * @class KoTableRemoteColumnCheckbox
         * @constructor
         * @extends KoTableColumn
         * @param {Object} config a configuration object
         */
        function KoTableRemoteColumnCheckbox() {
            KoTableRemoteColumnCheckbox.superclass.constructor.apply( this, arguments );
        }

        makeClass( {
            constructor: KoTableRemoteColumnCheckbox,
            extends: KoComponentManager.componentTypes.KoTableColumn,
            descriptors: {
                componentType: 'KoTableRemoteColumnCheckbox',
                /**
                 * The width of a column (specified in colgroup tag)
                 * @property width
                 * @type {String}
                 * @default '32px'
                 */
                width: '32px',
                /**
                 * @property _checkedIdentifiers
                 * @type Object
                 * @default {}
                 * @protected
                 */
                _checkedIdentifiers: null,
                /**
                 * @property isUtility
                 * @type {Boolean}
                 * @default true
                 * @for KoTableRemoteColumnCheckbox
                 */
                isUtility: true,
                /**
                 * @property isExcludedInCsv
                 * @type {Boolean}
                 * @default true
                 * @for KoTableRemoteColumnCheckbox
                 */
                isExcludedInCsv: true,
                init: function() {
                    var self = this;
                    KoTableRemoteColumnCheckbox.superclass.init.apply( self, arguments );
                    self.checkedIds = ko.observableArray( self.checkedIds );
                },
                isRowChecked: function( meta ) {
                    var self = this;
                    return ko.computed( function() {
                        return self.isChecked( meta.row );
                    } );
                },
                isChecked: function( row ) {
                    var
                        self = this,
                        checkedIds = self.checkedIds(),
                        rowDataId = self.getIdFromMeta( {row: row} );
                    if( rowDataId && -1 === checkedIds.indexOf( rowDataId ) ) {
                        return true;
                    }
                    return false;

                },
                isRowDisabledByMeta: function() {
                    var self = this;
                    return unwrap( self.disabled );
                },
                addId: function( id ) {
                    var self = this;
                    self.checkedIds.push( id );
                },
                removeId: function( id ) {
                    var self = this,
                        idx = self.checkedIds().indexOf( id );

                    if( -1 !== id ) {
                        self.checkedIds.splice( idx, 1 );
                    }
                },
                getIdFromMeta: function( meta ) {
                    var self = this;
                    return getObject( self.idPath, meta.row );
                },
                checkRow: function( meta ) {
                    var self = this.col;
                    if( self.isChecked( meta.row ) ) {
                        self.addId( self.getIdFromMeta( meta ) );
                    } else {
                        self.removeId( self.getIdFromMeta( meta ) );
                    }
                    return true;
                },
                uncheckAll: function( items ) {
                    var self = this;

                    items.forEach( function( item ) {
                        if( !self.isChecked( item ) ) {
                            self.removeId( self.getIdFromMeta( {row: item} ) );
                        }
                    } );
                },
                checkItems: function( items ) {
                    var self = this;
                    items.forEach( function( item ) {
                        if( self.isChecked( item ) ) {
                            self.addId( self.getIdFromMeta( {row: item} ) );
                        }
                    } );
                },
                /**
                 * The property name in the model to use with property based checking.
                 * @property propertyToCheckBy
                 * @type {String}
                 * @default '_id'
                 */
                propertyToCheckBy: '_id'

            },
            lazy: {
                templateNameCell: function( key ) {
                    var
                        self = this;

                    return self._handleLazyConfig( key, ko.observable( 'KoTableCellField' ) );
                },
                /**
                 * Class isn't sortable!
                 * @attribute isSortable
                 * @for KoTableRemoteColumnCheckbox
                 * @private
                 */
                /**
                 * Class isn't sortable!
                 * @property isSortable
                 * @for KoTableRemoteColumnCheckbox
                 */
                isSortable: function() {
                    return ko.computed( {
                        read: FALSE,
                        write: NOOP
                    } );
                },
                /**
                 * Class isn't filterable!
                 * @attribute isFilterable
                 * @for KoTableRemoteColumnCheckbox
                 * @private
                 */
                /**
                 * Class isn't filterable!
                 * @property isFilterable
                 * @for KoTableRemoteColumnCheckbox
                 */
                isFilterable: function() {
                    return ko.computed( {
                        read: FALSE,
                        write: NOOP
                    } );
                },
                /**
                 * Class isn't editable!
                 * @attribute isEditable
                 * @for KoTableRemoteColumnCheckbox
                 * @private
                 */
                /**
                 * Class isn't editable!
                 * @property isEditable
                 * @for KoTableRemoteColumnCheckbox
                 */
                isEditable: function() {
                    return ko.computed( {
                        read: FALSE,
                        write: NOOP
                    } );
                },
                /**
                 * Class isn't draggable!
                 * @attribute isDraggable
                 * @for KoTableRemoteColumnCheckbox
                 * @private
                 */
                /**
                 * Class isn't draggable!
                 * @property isDraggable
                 * @for KoTableRemoteColumnCheckbox
                 */
                isDraggable: function() {
                    return ko.computed( {
                        read: FALSE,
                        write: NOOP
                    } );
                },
                /**
                 * Class isn't droppable!
                 * @attribute isDroppable
                 * @for KoTableRemoteColumnCheckbox
                 * @private
                 */
                /**
                 * Class isn't droppable!
                 * @property isDroppable
                 * @for KoTableRemoteColumnCheckbox
                 */
                isDroppable: function() {
                    return ko.computed( {
                        read: FALSE,
                        write: NOOP
                    } );
                },
                /**
                 * Determines if the all toggled checkbox is checked.
                 * - If it is checked at least one row is checked, unchecking will uncheck every row in the current view.
                 * - If it is unchecked, checking will check every row in the current view.
                 * @property allToggled
                 * @type {Boolean}
                 * @default false
                 */
                allToggled: function() {
                    var
                        self = this;
                    return ko.computed( {
                        read: function() {
                            var checkedIds = unwrap( self.checkedIds ),
                                rows = unwrap( self.owner.rows ).filter( function( row ) {
                                    return -1 === checkedIds.indexOf( self.getIdFromMeta( {row: row} ) );
                                } );

                            return Boolean( rows.length );
                        },
                        write: function( toggleValue ) {

                            var
                                rows = unwrap( self.owner.rows );

                            if( toggleValue ) {
                                self.uncheckAll( rows );
                            } else {
                                self.checkItems( rows );
                            }
                        }
                    }, self ).extend( {rateLimit: 0} );
                },
                /**
                 * Configure the toggle all checkbox in the header to be visible to the user.
                 * @attribute allToggleVisible
                 * @type {Boolean}
                 * @default true
                 */
                allToggleVisible: function( key ) {
                    var self = this;
                    return self._handleLazyConfig( key, ko.observable( true ) );
                },
                handleTableOnRowClick: function( key ) {
                    var self = this;
                    return self._handleLazyConfig( key, ko.observable( false ) );
                },
                templateName: function( key ) {
                    var
                        self = this;

                    return self._handleLazyConfig( key, ko.observable( 'KoTableColumnCheckbox' ) );
                }
            }
        } );
        /**
         * @property KoTableRemoteColumnCheckbox
         * @type {KoTableRemoteColumnCheckbox}
         * @for doccirrus.KoUI.KoComponentManager.componentTypes
         */
        KoComponentManager.registerComponent( KoTableRemoteColumnCheckbox );

        function pushElements( arr, elements ) {
            Array.prototype.push.apply( arr, elements );
        }

        /*
         function onZipComplete( err ) {
         if( err ) {
         Y.doccirrus.comctl.setModal( 'Erstelle PDFs', 'Err: ' + err );
         return;
         }
         var zipUrl = Y.doccirrus.infras.getPrivateURL( '/zip/' + zipId + '.zip' ),
         zipLink = '' +
         '<a href="' + zipUrl + '" class="btn btn-primary btn-lg active">' +
         '<i class="fa fa-download"></i> Herunterladen' +
         '</a>';

         //  TODO: DCWindow modal and i18n
         Y.doccirrus.comctl.setModal( 'Patientenquittung fertiggestellt', zipLink, true );
         }
         */

        function collectTreatmentIds( treatments ) {
            return treatments.map( function( treatment ) {
                return treatment._id;
            } );
        }

        function collectTreatmentIdsFromScheine( scheine ) {
            var results = [];
            scheine.forEach( function( schein ) {
                pushElements( results, collectTreatmentIds( schein.treatments ) );
            } );
            return results;
        }

        function setCardSwipScheine( scheine ) {
            if( scheine && Array.isArray( scheine ) && scheine.length ) {
                return scheine.map( function( schein ) {
                    schein._cardSwiped = Boolean( schein.patient &&
                                                  schein.patient.insuranceStatus[0] &&
                                                  schein.patient.insuranceStatus[0].cardSwipe );
                    return schein;
                } );
            } else {
                return scheine;
            }

        }

        // function getQuarterAndYearFromActivity( act ) {
        //     var date = moment( act.timestamp );
        //     return {
        //         quarter: date.quarter(),
        //         year: date.year()
        //     };
        // }

        function _createPatientReceipts( vm ) {
            var
                patient = ko.unwrap( vm.patientContent.patient ),
                patientId = patient._id,
                rpcArgs = ko.unwrap( vm.patientTable.baseParams ).query;

            vm.pubreceiptsInProgress( true );

            rpcArgs.singlePatient = patientId;

            Y.doccirrus.jsonrpc.api.invoice
                .createAllPubreceiptsForLog( rpcArgs )
                .then( onRequestPubreceipts )
                .fail( onPubReceiptsErr );

            function onRequestPubreceipts( result ) {
                Y.log( 'Finished generation of PUBRECEIPTs for single patient: ' + JSON.stringify( result ), 'debug', NAME );
                //  TODO: hide the button and show a message ("Requested X pub receipts, will be generated anon")
                vm.pubreceiptsInProgress( false );
            }

            function onPubReceiptsErr( err ) {
                Y.log( 'Error creating PUBRECEIPTS for single patient: ' + JSON.stringify( err ), 'warn', NAME );
                vm.pubreceiptsInProgress( false );
            }

        }

        function _printPatientReceipt( vm ) {

            var
                patientContent = vm.patientContent,
                patient = patientContent.patient(),
                scheine = patientContent.data(),
                caseFolderId,
                treatmentIds,
                results;
            // patient level

            if( scheine && Array.isArray( scheine ) && scheine.length ) {
                treatmentIds = collectTreatmentIdsFromScheine( scheine );
                results = [{patientId: patient._id, activities: treatmentIds}];
                caseFolderId = scheine[0].caseFolderId;
            }
            patientContent.close();
            if( results && results.length ) {
                //Y.doccirrus.uam.createActivityPDFZip( JSON.parse( JSON.stringify( results ) ), quarter, year, onZipComplete );
                Y.doccirrus.comctl.privateGet( '/1/media/:createzip', {}, function onZipCreated( err/*, newZipId*/ ) {

                    if( err ) {
                        Y.log( 'Could not create zip archive: ' + JSON.stringify( err ), 'debug', NAME );
                        Y.doccirrus.DCWindow.notice( {
                            type: 'info',
                            window: {width: 'medium'},
                            message: 'Zip-Archiv kann nicht erstellt werden.'
                        } );
                        return;
                    }

                    // zipId = newZipId;
                    //Y.log( 'Using determined casefolder for pubreceipt: ' + patient.caseFolderId  || caseFolderId, 'debug', NAME );

                    Y.doccirrus.jsonrpc.api.invoice.createPubReceipt( {
                        'caseFolderId': caseFolderId,
                        'patientId': patient._id,
                        'treatmentIds': treatmentIds
                    } ).then( function( result ) {
                        var data = result.data ? result.data : result;

                        if( data.mediaId && '' !== data.mediaId ) {
                            data.documentUrl = '/media/' + data.mediaId + '_original.APPLICATION_PDF.pdf';
                            Y.doccirrus.modals.printPdfModal.show( data );
                        }

                    } );

                    //Y.doccirrus.uam.createPRActivityPDFZip( zipId, patient._id, patient.activeCaseFolderId || caseFolderId, treatmentIds, quarter, year, onZipComplete );
                } );

            } else {
                Y.doccirrus.DCWindow.notice( {
                    type: 'info',
                    window: {width: 'medium'},
                    message: 'Keine Patientenquittungen zum Ausdrucken gefunden.'
                } );
            }
        }

        function group( arr, fn, sortFn ) {
            var result = [],
                map = {};
            arr.forEach( function( el ) {
                var val = fn( el ),
                    mapped = map[val];
                if( !mapped ) {
                    map[val] = [el];
                } else {
                    mapped.push( el );
                }
            } );

            Object.keys( map ).sort( sortFn ).forEach( function( key ) {
                result.push( {key: key, content: map[key]} );
            } );
            return result;
        }

        function mouseOver( vm ) {
            vm._mouseIsOver( true );
        }

        function mouseOut( vm ) {
            vm._mouseIsOver( false );
        }

        function mapToId( activity ) {
            return activity._id;
        }

        function collectNotApproved( activities, pushToArr ) {
            var nNotApproved = 0;
            activities.forEach( function( activity ) {
                if( 'VALID' === activity.status ) {
                    nNotApproved++;
                    pushToArr.push( activity );
                }
            } );
            return nNotApproved;
        }

        function onApprove( activity ) {

            var activities = [],
                scheinId,
                activityIdsToApprove,
                nScheine = 0, nTreatments = 0, nMedications = 0, nDiagnoses = 0;

            function onSuccess() {
                // reflect changes in current data
                activities.forEach( function( act ) {
                    act._approved( true );
                } );
            }

            if( -1 !== activity.actType.indexOf( 'SCHEIN' ) ) {
                scheinId = activity._id;
                nScheine = 1;
                nTreatments = collectNotApproved( activity.treatments, activities );
                nMedications = collectNotApproved( activity.medications, activities );
                nDiagnoses = collectNotApproved( activity.diagnoses.concat( activity.continuousDiagnoses ), activities );
            } else if( 'TREATMENT' === activity.actType ) {
                nTreatments = 1;
                scheinId = activity._scheinId;
            } else if( 'MEDICATION' === activity.actType ) {
                nMedications = 1;
                scheinId = activity._scheinId;
            } else if( 'DIAGNOSIS' === activity.actType ) {
                nDiagnoses = 1;
                scheinId = activity._scheinId;
            }
            activities.push( activity );

            activityIdsToApprove = activities.map( mapToId );

            Y.doccirrus.jsonrpc.api.invoicelog.approveByIds( {
                    invoiceLogId: activity._invoiceLogId,
                    invoiceType: activity._invoiceType,
                    scheinId: scheinId,
                    activityIdsToApprove: activityIdsToApprove,
                    nScheine: nScheine,
                    nTreatments: nTreatments,
                    nMedications: nMedications,
                    nDiagnoses: nDiagnoses
                }
            ).done( function() {
                onSuccess();
            } ).fail( function() {
                Y.doccirrus.DCWindow.notice( {
                    type: 'error',
                    window: {width: 'medium'},
                    message: 'Ein Fehler ist aufgetreten!'
                } );
            } );

        }

        function wrapSubActivity( scheinId, _invoiceLogId, _invoiceType ) {
            return function( activity ) {
                activity._scheinId = scheinId;
                return wrapActivity( activity, _invoiceLogId, _invoiceType );
            };
        }

        function wrapActivity( activity, _invoiceLogId, _invoiceType, checkExcludedScheinId, logStatus ) {
            var subWrapper, addtionalDiagnosisPart = '', insuranceType,
                currencySymbol = _invoiceType === 'KVG' ? ' CHF' : '€',
                matchingInsuranceTypes = getScheinInsuranceMap[activity.actType],
                activityId;
            activity._approved = ko.observable( 'APPROVED' === activity.status );
            activity._url = Y.doccirrus.commonutils.getUrl( 'inCaseMojit' ) + '#/activity/' + activity._id;
            activity._text = moment( activity.timestamp ).format( 'DD.MM.YYYY' ) + ' ';
            activity._mouseIsOver = ko.observable( false );
            activity.medications = activity.medications || [];
            activity._onMouseOver = mouseOver;
            activity._onMouseOut = mouseOut;
            activity._onApprove = onApprove;
            if( -1 !== ['SCHEIN', 'PKVSCHEIN', 'BGSCHEIN', 'INVOICEREF'].indexOf( activity.actType ) ) {
                activityId = -1 !== ['INVOICEREF'].indexOf( activity.actType ) ? activity.invoiceRefId : activity._id;
                activity._disabled = -1 === ['INVALID', 'VALID', 'VALIDATION_ERR'].indexOf( logStatus );
                activity._onCheck = ko.observable( checkExcludedScheinId( activityId ) );
                activity._onCheck.subscribe( checkExcludedScheinId.bind( null, activityId ) );
            }
            activity._invoiceLogId = _invoiceLogId;
            activity._invoiceType = _invoiceType;

            activity._showApproveBtn = ko.computed( function() {
                return activity._mouseIsOver() && !activity._approved();
            } );

            if( -1 !== (activity.actType || '').indexOf( 'SCHEIN' ) || activity.actType === 'INVOICEREF' ) {
                subWrapper = wrapSubActivity( activity._id, _invoiceLogId, _invoiceType );
                activity.treatments = activity.treatments.map( subWrapper );
                activity.medications = activity.medications.map( subWrapper );
                activity.diagnoses = activity.diagnoses.map( subWrapper );
                activity.continuousDiagnoses = activity.continuousDiagnoses.map( subWrapper );

                insuranceType = activity.caseFolderTypeSingle || matchingInsuranceTypes && matchingInsuranceTypes[0];

                if( 'SCHEIN' === activity.actType ) {
                    activity._text += activity.scheinType + ' ';
                    if( insuranceType && insuranceType.match( Y.doccirrus.regexp.additionalInsuranceTypeRegex ) ) {
                        activity._text += ['(', Y.doccirrus.schemaloader.translateEnumValue( 'i18n', insuranceType, Y.doccirrus.schemas.person.types.Insurance_E.list, 'k.A.' ), ') '].join( '' );
                    }
                } else {
                    activity._text += ('SELFPAYER' === insuranceType ? 'SZ' : Y.doccirrus.schemaloader.translateEnumValue( 'i18n', insuranceType, Y.doccirrus.schemas.person.types.Insurance_E.list, 'k.A.' )) + ' ';
                }

            } else if( 'TREATMENT' === activity.actType || 'DIAGNOSIS' === activity.actType ) {
                activity._text += activity.code + ' ';
            }

            if( 'DIAGNOSIS' === activity.actType ) {
                addtionalDiagnosisPart += activity.diagnosisCert ? ' ' + Y.doccirrus.kbvcommonutils.mapDiagnosisCert( activity.diagnosisCert ) : '';
                addtionalDiagnosisPart += activity.diagnosisSite ? ' ' + activity.diagnosisSite[0] : '';
                if( addtionalDiagnosisPart.length ) {
                    activity._text += ' ' + addtionalDiagnosisPart;
                }
            }
            activity._text += (activity._text.length ? ' ' : '') + (activity.content || NO_DESCRIPTION);

            if( -1 !== ['PKVSCHEIN', 'BGSCHEIN'].indexOf( activity.actType ) && false === activity.blFinished ) {
                activity._text += ' (' + BL_NOT_COMPLETED + ')';
            }

            if( -1 !== ['PKVSCHEIN', 'BGSCHEIN'].indexOf( activity.actType ) ) {
                if( activity.treatmentType ) {
                    activity._text += (' ' + Y.doccirrus.schemaloader.translateEnumValue( 'i18n', activity.treatmentType, Y.doccirrus.schemas.activity.types.TreatmentType_E.list, '' ));
                }
                if( activity.isChiefPhysician ) {
                    activity._text += ' Chefarzt';
                }
                if( activity.includesBSK ) {
                    activity._text += ' inklusive BSK';
                }
                if( activity.invoiceData && activity.invoiceData[0] && activity.invoiceData[0].total ) {
                    activity._text += (' ' + Y.doccirrus.comctl.numberToLocalString( activity.invoiceData[0].total ) + currencySymbol);
                }
            }

            if( 'INVOICEREF' === activity.actType ) {
                activity._url = Y.doccirrus.commonutils.getUrl( 'inCaseMojit' ) + '#/activity/' + activity.invoiceRefId;
                activity.statusLabelClass = actStatusToLabelClass( activity.invoiceStatus );
                activity.invoiceStatusTranslated = Y.doccirrus.schemaloader.getEnumListTranslation(
                    'activity', 'ActStatus_E', activity.invoiceStatus, 'i18n', ''
                );
            }

            if( 'TREATMENT' === activity.actType ) {
                if( activity.price ) {
                    activity._text += (' (' + Y.doccirrus.comctl.numberToLocalString( activity.price ) + currencySymbol);
                    if( activity.billingFactorValue && _invoiceType !== 'KVG') {
                        activity._text += ' - ' + activity.billingFactorValue;
                    }
                    activity._text += ')';
                }
                if( activity._bsnr ) {
                    activity._text += ' (' + activity._bsnr + ')';
                }
            }
            if( 'MEDICATION' === activity.actType && _invoiceType === 'KVG' ) {
                if( activity.phPriceSale ) {
                    activity._text += (' (' + Y.doccirrus.comctl.numberToLocalString( activity.phPriceSale ) + currencySymbol + ')');
                }
            }
            return activity;
        }

        function wrapPatient( patient ) {
            patient._url = Y.doccirrus.commonutils.getUrl( 'inCaseMojit' ) + '#/patient/' + patient._id + '/tab/casefile_browser';
            patient._printPatientReceipt = _printPatientReceipt;
            patient._createPatientReceipts = _createPatientReceipts;
            patient._cardSwiped = Boolean( patient.insuranceStatus[0] && patient.insuranceStatus[0].cardSwipe );
            return patient;
        }

        function makePhysicianList( header ) {
            var result = [];
            if( header ) {
                header.data.locations.forEach( function( location ) {
                    location.physicians.forEach( function( phys ) {
                        result.push( {_id: phys._id, name: phys.firstname + ' ' + phys.lastname} );
                    } );
                } );
            }
            return result;
        }

        function PatientContent( close, groupBy ) {
            var self = this;

            self.patient = ko.observable();
            self.data = ko.observableArray();
            self.scheine = ko.observableArray();
            self.quarters = ko.observableArray();
            self.groupBy = ko.observable( groupBy || 'quarter' );
            self.close = close;

            ko.computed( function() {
                var grouped,
                    data = self.data(),
                    groupBy = self.groupBy();
                self.scheine( [] );
                self.quarters( [] );
                if( !data.length ) {
                    return;
                }

                switch( groupBy ) {
                    case 'quarter':
                        grouped = group( data, function( schein ) {
                            var timestamp = moment( schein.timestamp );
                            return timestamp.quarter() + '/' + timestamp.year();
                        }, function( a, b ) {
                            var splittedA = a.split( '/' ),
                                splittedB = b.split( '/' );
                            return splittedA[1] < splittedB[1] || (splittedA[1] === splittedB[1]) && splittedA[0] < splittedB[0];
                        } );
                        self.quarters( grouped.map( function( group ) {
                            var splitted = group.key.split( '/' );
                            return {
                                quarter: splitted[0],
                                year: splitted[1],
                                scheine: setCardSwipScheine( group.content )
                            };
                        } ) );
                        break;
                    case 'schein':
                        self.scheine( setCardSwipScheine( data ) );
                        break;
                }
            }.bind( self ) ); // eslint-disable-line
        }

        PatientContent.prototype.load = function( invoiceLogId, patient, _invoiceType, checkExcludedScheinId, log, filterOptions ) {
            var
                self = this,
                query = {};
            self._invoiceLogId = invoiceLogId;
            self._invoiceType = _invoiceType;
            if( patient === self.patient ) {
                return;
            }
            self.patient( wrapPatient( patient ) );
            query.query = {
                invoiceLogId: invoiceLogId,
                type: 'schein',
                'data.patientId': patient._id
            };

            if( filterOptions ) {
                query.query = Object.assign( query.query, filterOptions );
            }

            return Y.doccirrus.jsonrpc.api.invoicelog.getInvoiceEntries( query )
                .done( function( response ) {
                    if( response && response.data ) {
                        self.data( response.data.map( function( invoiceEntries ) {
                            return wrapActivity( invoiceEntries.data, self._invoiceLogId, _invoiceType, checkExcludedScheinId, log );
                        } ) );

                    }
                } ).fail( function() {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        window: {width: 'medium'},
                        message: 'Patietendaten konnten nicht geladen werden!'
                    } );
                } );
        };

        function getRemoteCheckboxColumn( table ) {
            var
                columns = peek( table.columns ),
                result;

            columns.some( function( column ) {
                if( column instanceof KoTableRemoteColumnCheckbox ) {
                    result = column;
                    return true;
                }
            } );
            return result;
        }

        function Layout( patientTable, patientContent, log, excludedScheinIdsInWorkChanged, _invoiceType, filterSchein, filterValues ) {

            var
                self = this,
                remoteColumnCheckbox = getRemoteCheckboxColumn( patientTable );

            self.isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();

            self.patientContent = patientContent;
            self.patientTable = patientTable;
            self.patientContentVisible = ko.computed( function() {
                var patient = patientContent.patient();
                return Boolean( patient );
            } );

            self.patientTable.selected.subscribe( function( val ) {
                if( !val || !val.length ) {
                    self.patientContent.patient( null );
                }
            }.bind( self ) ); // eslint-disable-line

            self.excludedPatientIdsChanged = ko.computed( function() {
                var
                    checkedIds = unwrap( remoteColumnCheckbox.checkedIds ),
                    intersectionArr = _.intersection( checkedIds, log.excludedPatientIds );

                return !(intersectionArr.length === checkedIds.length && intersectionArr.length === log.excludedPatientIds.length);
            } );

            self.excludedScheinIdsInWorkChanged = excludedScheinIdsInWorkChanged;
            self.filterSchein = filterSchein;
            self.filterValues = filterValues;
            //  PUBRECEIPT button state
            self.pubreceiptsInProgress = ko.observable( false );
            self.canCreatePubReceipts = ko.observable( 'KBV' === _invoiceType );

            self.createAllPubreceipts = function() {
                var
                    baseParams = patientTable.baseParams,
                    rpcArgs = baseParams.query;

                self.pubreceiptsInProgress( true );

                Y.doccirrus.jsonrpc.api.invoice
                    .createAllPubreceiptsForLog( rpcArgs )
                    .then( onRequestPubreceipts )
                    .fail( onPubReceiptsErr );

                function onRequestPubreceipts( /* result */ ) {
                    Y.log( 'Finished creating PUBRECEIPTS for all entries in log.', 'debug', NAME );
                    //  TODO: hide the button and show a message ("Requested X pub receipts, will be generated anon")
                    self.pubreceiptsInProgress( false );
                }

                function onPubReceiptsErr( err ) {
                    Y.log( 'Error creating PUBRECEIPTS: ' + JSON.stringify( err ), 'warn', NAME );
                    self.pubreceiptsInProgress( false );
                }

            };

            self.showPubreceiptExplanation = function() {
                Y.doccirrus.DCWindow.notice( {
                    type: 'info',
                    message: i18n( 'InvoiceMojit.invoicelog_modal.LBL_PUBRECEIPTS_INFO' ),
                    window: {
                        width: 'medium'
                    }
                } );
            };

            self.scheinFilterChanged = ko.computed( function() {
                var unwrapFilterSchein = ko.unwrap( self.filterSchein );
                if( unwrapFilterSchein ) {
                    if( 'KBV' !== _invoiceType ) {
                        Y.doccirrus.utils.localValueSet( 'selectedItem' + _invoiceType,  unwrapFilterSchein );
                    }
                    self.patientContent.patient( null );
                }
            } );
        }

        function actStatusToLabelClass( status ) {
            switch( status ) {
                case "MEDIDATAREJECTED":
                    return 'label-danger';
                case "MEDIDATAFIXED":
                    return 'label-warning';
                case "VALID":
                    return 'label-success';
                default:
                    return 'label-default';
            }
        }

        function showDialog( log, _invoiceType, header, callback ) {

            var
                node = Y.Node.create( '<div></div>' ),
                modal,
                invoicelogContentTable,
                KoUI = Y.doccirrus.KoUI,
                remoteColumnCheckbox,
                excludedScheinIdsInWork = ko.observableArray( _.clone( log.excludedScheinIds ) ),
                KoComponentManager = KoUI.KoComponentManager,
                patientContentModel = new PatientContent( close, 'PVS' === _invoiceType ? 'schein' : undefined ),
                layout,
                excludedScheinIdsInWorkChanged = ko.computed( function() {
                    var
                        checkedIds = unwrap( excludedScheinIdsInWork ),
                        intersectionArr = _.intersection( checkedIds, log.excludedScheinIds );

                    return !(intersectionArr.length === checkedIds.length && intersectionArr.length === log.excludedScheinIds.length);
                } ),
                filterSchein = ko.observable( log.filterSchein || "all" ),
                filterValues = {all: 'all', included: "included", excluded: "excluded"},
                tableConfig,
                localStorageValue = Y.doccirrus.utils.localValueGet( 'selectedItem' + _invoiceType ),
                cardSwipeList = (Y.doccirrus.schemas.invoiceentry.types.CardSwipeStatus_E.list || [] ).concat( {
                    val: 'WOCARD',
                    i18n: 'WOCARD'
                } );

            if( localStorageValue ) {
                filterSchein( localStorageValue );
            }

            function close() {
                if( !modal ) {
                    return;
                }
                removeWsEventListeners();
                modal.close();
            }

            //  update table when PUBRECEIPTs / PDFs generated for invoice log

            function addWsEventListeners() {
                //  add socket event listener for PUBRECEIPTs / patientenquittungen
                Y.doccirrus.communication.on( {
                    event: 'pubreceiptCompiledForPatient',
                    // omitting this option will cause whichever is the current socket to be used
                    //socket: Y.doccirrus.communication.getSocket( '/' ),
                    done: onPubreceiptGeneratedForPatient,
                    handlerId: 'inVoicePubreceiptPatientListener'
                } );

                function onPubreceiptGeneratedForPatient( /* message */ ) {

                    //var data = message.data && message.data[0];
                    //  PDF will have been generated at this point,  prompt the user to open or print it
                    //if ( data.mediaId && '' !== data.mediaId ) {
                    //    data.documentUrl = '/media/' + data.mediaId + '_original.APPLICATION_PDF.pdf';
                    //    Y.doccirrus.modals.printPdfModal.show( data );
                    //}

                    layout.patientTable.reload();
                }
            }

            function removeWsEventListeners() {
                Y.doccirrus.communication.off( 'pubreceiptCompiledForPatient', 'inVoicePubreceiptPatientListener' );
            }

            function checkExcludedScheinId( scheinId, status ) {
                if( false === status && -1 === excludedScheinIdsInWork.indexOf( scheinId ) ) {
                    excludedScheinIdsInWork.push( scheinId );
                } else if( true === status && -1 !== excludedScheinIdsInWork.indexOf( scheinId ) ) {
                    excludedScheinIdsInWork.remove( scheinId );
                } else {
                    return -1 === excludedScheinIdsInWork.indexOf( scheinId );
                }
            }

            function getColorForCardSwipeStatus( state ) {
                switch( state ) {
                    case "SOME":
                        return "#c12e2a";
                    case 'ALL':
                        return "#419641";
                    case 'WOCARD':
                        return "#ffa500";
                }
            }

            function formatSelection( el ) {
                return "<div style=' width: 20px; height: 20px; background-color: " + getColorForCardSwipeStatus( el.id ) + "'></div>";
            }

            function formatResult( el ) {
                return "<div style='margin:auto; width: 30px; height: 20px; background-color: " + getColorForCardSwipeStatus( el.id ) + "'></div>";
            }

            function openToInitialPatient( patientId ) {
                var
                    query = {
                        invoiceLogId: log._id,
                        type: 'patient',
                        'data._id': patientId
                    };

                Y.log( 'Opening invoice log to specific patient deep linked from router: ' + patientId, 'debug', NAME );

                Y.doccirrus.jsonrpc.api.invoicelog
                    .getInvoiceEntries( {'query': query} )
                    .then( onInvoiceEntryLoaded );

                function onInvoiceEntryLoaded( result ) {
                    var patient = result.data && result.data[0] ? result.data[0] : null;

                    if( !patient ) {
                        Y.log( 'Could not load invoice entry for patient: ' + patientId, 'warn', NAME );
                        return;
                    }

                    patientContentModel.load( log._id, patient.data, _invoiceType, checkExcludedScheinId, log.status );
                }

            }

            function getInvoiceEntries( params ) {
                var filterScheine = ko.unwrap( filterSchein );

                if(!params.data){
                    params.data = {};
                }
                params.data.collectMedidataRejected = log.collectMedidataRejected;
                params.data.filterScheine = ( filterScheine === filterValues.included ) ? 'incl' : ( ( filterScheine === filterValues.excluded ) ? 'excl' : 'all' );
                params.data.invoiceType = _invoiceType;
                return Y.doccirrus.jsonrpc.api.invoicelog.getInvoiceEntries( params );
            }

            tableConfig = {
                componentType: 'KoTable',
                componentConfig: {
                    baseParams: ko.computed( function() {
                        var query = {
                            query: {
                                invoiceLogId: log._id,
                                type: 'patient'
                            }
                        };
                        ko.unwrap( filterSchein );

                        return query;
                    } ),
                    stateId: 'InvoiceMojit-InvoiceNavigationBinderIndex-invoicelogContentTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: getInvoiceEntries,
                    columns: [
                        {
                            componentType: 'KoTableRemoteColumnCheckbox',
                            forPropertyName: 'remoteChecked',
                            allToggleVisible: true,
                            label: '',
                            disabled: -1 === ['INVALID', 'VALID', 'VALIDATION_ERR'].indexOf( log.status ),
                            checkedIds: _.clone( log.excludedPatientIds ),
                            idPath: 'data._id',
                            isRowDisabledByMeta: function( meta ) {
                                var data = meta.row.data;
                                
                                return ( 'PVS' === _invoiceType ) && !data.dataTransmissionToPVSApproved || ('KVG' === _invoiceType && !data.dataTransmissionToMediportApproved);
                            }
                        },
                        {
                            forPropertyName: 'data.lastname',
                            label: SURENAME,
                            isSortable: true,
                            sortInitialIndex: 0,
                            isFilterable: true,
                            collation:{ locale: 'de', strength: 2, numericOrdering:true},
                            renderer: function( meta ) {
                                var data = meta.row.data;
                                return data.lastname + (data.nameaffix ? ', ' + data.nameaffix : '') + (data.title ? ', ' + data.title : '');
                            }
                        },
                        {
                            forPropertyName: 'data.firstname',
                            label: FORENAME,
                            isSortable: true,
                            isFilterable: true,
                            collation:{ locale: 'de', strength: 2, numericOrdering:true}
                        },
                        {
                            forPropertyName: 'data.patientNo',
                            label: NUMBER,
                            width: '100px',
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'invoiceStatuses',
                            label: INVOICE_STATUS,
                            isSortable: true,
                            isFilterable: true,
                            visible: log.collectMedidataRejected,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.activity.types.ActStatus_E.list.filter( function( status ) {
                                    return -1 !== ['VALID', 'MEDIDATAREJECTED', 'MEDIDATAFIXED'].indexOf( status.val );
                                } ),
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            renderer: function( meta ) {
                                var statuses = meta.value,
                                    html = '';

                                if( !statuses ) {
                                    return '';
                                }

                                statuses.forEach( function( status ) {
                                    var additionalClass = actStatusToLabelClass( status );
                                    html += '<span class="label label-default ' + (additionalClass ? additionalClass : '') + '">'
                                            + i18n( "activity-schema.ActStatus_E." + status ) + '</span>&nbsp;';
                                } );

                                return '<div style="display: flex; flex-wrap: wrap; align-items: baseline;">' + html + '</div>';
                            }
                        },
                        {
                            forPropertyName: 'data.blFinished',
                            label: BL_COMPLETED,
                            width: '150px',
                            isSortable: true,
                            isFilterable: true,
                            visible: false,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_BOOL_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: [{val: true, i18n: YES}, {val: false, i18n: NO}],
                                optionsText: 'i18n',
                                optionsValue: 'val',
                                select2Config: {
                                    multiple: false
                                }
                            },
                            renderer: function( meta ) {
                                return meta.value ? YES : NO;
                            }
                        },
                        {
                            forPropertyName: 'data.assignedEmployees._id',
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,

                            isFilterable: true,
                            label: PHYSICIANS,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: makePhysicianList( header ),
                                optionsText: 'name',
                                optionsValue: '_id',
                                select2Config: {
                                    multiple: true
                                }
                            },
                            renderer: function( meta ) {
                                var assignedEmployees = meta.row.data && meta.row.data.assignedEmployees;
                                return (Array.isArray( assignedEmployees ) && assignedEmployees.length) ? assignedEmployees.map( function( phy ) {
                                    return phy.firstname + ' ' + phy.lastname;
                                } ).join( ', ' ) : '-';
                            }
                        },
                        {
                            forPropertyName: 'data.priceTotal',
                            label: PRICE_TOTAL,
                            width: '100px',
                            renderer: function( meta ) {
                                return meta.value ? Y.doccirrus.comctl.numberToLocalString( meta.value ) : '-';
                            },
                            isSortable: true
                        }

                    ],
                    onRowClick: function( meta ) {
                        var self = this,
                            patient = meta.row.data,
                            filterOptions,
                            filterParams = unwrap( self.filterParams );

                        switch( ko.unwrap( filterSchein ) ) {
                            case filterValues.included:
                                filterOptions = {'data._id': {'$nin': log.excludedScheinIds}};
                                break;
                            case filterValues.excluded:
                                if( log.excludedPatientIds.indexOf(patient._id) === -1 ){
                                    filterOptions = {'data._id': {'$in': log.excludedScheinIds}};
                                }
                                break;
                            default:
                                filterOptions = null;
                        }

                        if( filterParams.invoiceStatuses ) {
                            filterOptions = Object.assign( filterOptions || {}, {
                                'data.invoiceStatus': filterParams.invoiceStatuses
                            } );
                        }
                        patientContentModel.load( log._id, patient, _invoiceType, checkExcludedScheinId, log.status, filterOptions );
                    }
                }
            };

            if( 'KBV' === _invoiceType ) {
                tableConfig.componentConfig.columns.push( {
                    forPropertyName: 'data.sendPatientReceipt',
                    label: 'PQ',
                    width: '100px',
                    renderer: function( meta ) {

                        var
                            data = meta.row.data,
                            html = meta.value ? 'Ja' : 'Nein',
                            pdfUrl,
                            i;

                        if( data.pubreceipts && data.pubreceipts.length > 0 ) {
                            html = html + '<br/>';
                            for( i = 0; i < data.pubreceipts.length; i++ ) {
                                html = html + '' +
                                       '<a ' +
                                       'href="/incase#/activity/' + data.pubreceipts[i] + '/section/formform" ' +
                                       'target="_blank' + data.pubreceipts[i] + '" ' +
                                       '>' +
                                       '[' + (i + 1) + ']</a> ';
                            }
                        }

                        if( data.compiledPdfMediaId ) {
                            pdfUrl = 'media/' + data.compiledPdfMediaId + '.APPLICATION_PDF.pdf';
                            pdfUrl = Y.doccirrus.infras.getPrivateURL( pdfUrl );
                            html = html +
                                   '<a href="' + pdfUrl + '" target="_blank' + data.compiledPdfMediaId + '">PDF</a>' +
                                   '<br/>';
                        }

                        return html;
                    },
                    isSortable: true
                } );

                tableConfig.componentConfig.columns.push( {
                    forPropertyName: 'cardSwipeStatus',
                    width: '62px',
                    queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                    isFilterable: true,
                    label: CARDSWIPESTATUS,
                    filterField: {
                        componentType: 'KoFieldSelect2',
                        placeholder: ' ',
                        select2Config: {
                            formatSelection: formatSelection,
                            formatResult: formatResult
                        },
                        options: cardSwipeList,
                        optionsText: 'i18n',
                        optionsValue: 'val'
                    },
                    renderer: function( meta ) {
                        if( meta.value ) {
                            return "<div style='margin: auto; height:20px;width:30px;background-color:" +
                                   getColorForCardSwipeStatus( meta.value ) + ";'></div>";
                        }
                        return "";
                    }
                } );
                tableConfig.componentConfig.columns.push( {
                    forPropertyName: 'vsdmStatus',
                    width: '62px',
                    queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                    isFilterable: true,
                    label: VSDM_STATUS,
                    filterField: {
                        componentType: 'KoFieldSelect2',
                        placeholder: ' ',
                        select2Config: {
                            formatSelection: formatSelection,
                            formatResult: formatResult
                        },
                        options: cardSwipeList,
                        optionsText: 'i18n',
                        optionsValue: 'val'
                    },
                    renderer: function( meta ) {
                        if( meta.value ) {
                            return "<div style='margin: auto; height:20px;width:30px;background-color:" +
                                   getColorForCardSwipeStatus( meta.value ) + ";'></div>";
                        }
                        return "";
                    }
                } );

                //  For GKV add column for Fk3000 status, EXTMOJ-1904

                tableConfig.componentConfig.columns.push( {
                    forPropertyName: 'data.insuranceStatus.0.createUniqCaseIdentNoOnInvoice',
                    width: '162px',
                    isFilterable: true,
                    visible: false,

                    queryFilterType: Y.doccirrus.DCQuery.EQ_BOOL_OPERATOR,
                    filterField: {
                        componentType: 'KoFieldSelect2',
                        options: [{val: true, i18n: YES}, {val: false, i18n: NO}],
                        optionsText: 'i18n',
                        optionsValue: 'val',
                        select2Config: {
                            multiple: false
                        }
                    },

                    label: FK3000,
                    renderer: function( meta ) {
                        return meta.value ? YES : NO;
                    }
                } );
            }

            if( 'PVS' === _invoiceType ) {
                tableConfig.componentConfig.columns.push(
                    {
                        forPropertyName: 'data.dataTransmissionToPVSApproved',
                        label: PVS_APPROVED,
                        title: PVS_APPROVED_TITLE,
                        width: '100px',
                        isSortable: true,
                        isFilterable: true,
                        visible: false,
                        queryFilterType: Y.doccirrus.DCQuery.EQ_BOOL_OPERATOR,
                        filterField: {
                            componentType: 'KoFieldSelect2',
                            options: [{val: true, i18n: YES}, {val: false, i18n: NO}],
                            optionsText: 'i18n',
                            optionsValue: 'val',
                            select2Config: {
                                multiple: false
                            }
                        },
                        renderer: function( meta ) {
                            return meta.value ? YES : NO;
                        }
                    },
                    {
                        forPropertyName: 'data.locations',
                        label: LOCATION,
                        isSortable: true,
                        visible: false,
                        width: '100px',
                        renderer: function( meta ) {
                            var locations = meta.value;
                            if( locations && locations.length ) {
                                return locations[0].locname;
                            }
                            return '';
                        }
                    }
                );
            }

            invoicelogContentTable = KoComponentManager.createComponent( tableConfig );

            layout = new Layout( invoicelogContentTable, patientContentModel, log, excludedScheinIdsInWorkChanged, _invoiceType, filterSchein, filterValues );
            remoteColumnCheckbox = getRemoteCheckboxColumn( invoicelogContentTable );

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'invoicelog-modal',
                'InvoiceMojit',
                {},
                node,
                function() {
                    modal = Y.doccirrus.DCWindow.dialog( {
                        title: BILLING_CONTENT,
                        type: 'info',
                        callback: function() {
                            var
                                checkedIds = peek( remoteColumnCheckbox.checkedIds ),
                                params,
                                excludedPatientIdsChanged = peek( layout.excludedPatientIdsChanged ),
                                excludedScheinIdsInWorkChanged = peek( layout.excludedScheinIdsInWorkChanged );

                            if( !excludedPatientIdsChanged && !excludedScheinIdsInWorkChanged ) {
                                return callback();
                            }

                            params = {
                                invoiceLogId: log._id,
                                invoiceLogType: _invoiceType,
                                excludedPatientIds: excludedPatientIdsChanged ? checkedIds : null,
                                excludedScheinIds: excludedScheinIdsInWorkChanged ? peek( excludedScheinIdsInWork ) : null
                            };

                            Y.doccirrus.jsonrpc.api.invoicelog.invalidateExcludedIds( params ).done( function() {
                                callback();
                            } ).fail( function() {
                                Y.doccirrus.DCWindow.notice( {
                                    type: 'error',
                                    window: {width: 'medium'},
                                    message: 'Ein Fehler ist aufgetreten!'
                                } );
                            } );
                        },
                        window: {
                            width: 'xlarge',
                            maximizable: true
                        },
                        message: node
                    } );

                    layout.lblPubReceiptAllI18n = i18n( 'InvoiceMojit.invoicelog_modal.LBL_PUBRECEIPTS_ALL' );
                    layout.btnPubReceiptAllI18n = i18n( 'InvoiceMojit.invoicelog_modal.BTN_PUBRECEIPTS_ALL' );
                    layout.btnPubReceiptPatientI18n = i18n( 'InvoiceMojit.invoicelog_modal.BTN_PUBRECEIPTS_PATIENT' );
                    layout.warnChangedPatientsI18n = i18n( 'InvoiceMojit.invoicelog_modal.WARN_CHANGED_PATIENTS' );
                    layout.warnChangedInvoiceI18n = i18n( 'InvoiceMojit.invoicelog_modal.WARN_CHANGED_INVOICE' );
                    layout.scheinBtnApproveI18n = i18n( 'InvoiceMojit.invoicelog_modal.BTN_APPROVE' );
                    layout.scheinPatientGadgetTreatmentI18n = i18n( 'PatientGadget.PatientGadgetTreatments.i18n' );
                    layout.scheinPatientGadgetDiagnosisI18n = i18n( 'PatientGadget.PatientGadgetDiagnosis.i18n' );
                    layout.scheinPatientGadgetDiagnosisTypeContinuousI18n = i18n( 'PatientGadget.PatientGadgetDiagnosisTypeContinuous.i18n' );
                    layout.scheinPatientGadgetMedicationI18n = i18n( 'PatientGadget.PatientGadgetMedication.i18n' );
                    layout.textQuarterI18n = i18n( 'InvoiceMojit.apklog.text.QUARTER' );
                    layout.showAllI18n = i18n( 'InvoiceMojit.invoicelog_modal.labels.SHOW_ALL' );
                    layout.showOnlyIncludedI18n = i18n( 'InvoiceMojit.invoicelog_modal.labels.SHOW_ONLY_INCLUDED' );
                    layout.showOnlyExcludedI18n = i18n( 'InvoiceMojit.invoicelog_modal.labels.SHOW_ONLY_EXCLUDED' );
                    layout.patientsI18n = i18n( 'InvoiceMojit.invoicelog_modal.labels.PATIENTS' );
                    layout.referenceNoI18n = i18n( 'banklog-schema.BankLog_T.referenceNumber.i18n' );
                    layout.invoiceStatusI18n = i18n( 'InvoiceMojit.kvg_browser.placeholder.INVOICE_STATUS' );
                    modal.resizeMaximized.set( 'maximized', true );

                    ko.applyBindings( layout, node.one( '#patientLayout' ).getDOMNode() );
                    addWsEventListeners();

                    if( log.openToPatient ) {
                        //  follow deep link from casefile to a specific patient section of the log
                        openToInitialPatient( log.openToPatient );
                    }

                }
            );

        }

        function getHeader( log, _invoiceType, callback ) {
            if( !log.excludedScheinIds ) {
                log.excludedScheinIds = [];
            }
            if( !log.excludedPatientIds ) {
                log.excludedPatientIds = [];
            }
            Promise.resolve( Y.doccirrus.jsonrpc.api.invoicelog.getInvoiceEntries( {
                data: {
                    invoiceType: _invoiceType,
                    collectMedidataRejected: log.collectMedidataRejected
                },
                query: {
                    invoiceLogId: log._id,
                    type: 'header'
                }
            } ) ).then( function( response ) {
                var header = response && response.data && response.data[0];
                showDialog( log, _invoiceType, header, callback );
            } ).catch( function( response ) {
                Y.log( 'could not load invoiceentry header: ' + response, 'error', NAME );
            } );
        }

        Y.namespace( 'doccirrus.modals' ).invoiceLogModal = {
            show: getHeader
        };

    },
    '0.0.1',
    {
        requires: [
            'KoUI-all',
            'DCWindow',
            'dcbatchpdfzip',
            'dccommonutils',
            'printpdf-modal',
            'patientreceipt-modal',
            'invoiceentry-schema'
        ]
    }
);

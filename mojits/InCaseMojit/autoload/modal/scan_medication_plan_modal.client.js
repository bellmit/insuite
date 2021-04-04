/**
 * User: pi
 * Date: 26/09/16  10:45
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, jQuery, _, moment*/
'use strict';

YUI.add( 'DCScanMedicationPlanModal', function( Y, NAME ) {

        var
            i18n = Y.doccirrus.i18n,
            MEDICATION_PLAN_VALID = i18n('InCaseMojit.scanMedicationPlanModal_clientJS.text.MEDICATION_PLAN_VALID'),
            MEDICATION_PLAN_PATIENT_NOT_MATCH = i18n('InCaseMojit.scanMedicationPlanModal_clientJS.text.MEDICATION_PLAN_PATIENT_NOT_MATCH'),
            MEDICATION_PLAN_NOT_SAME_ID = i18n('InCaseMojit.scanMedicationPlanModal_clientJS.text.MEDICATION_PLAN_NOT_SAME_ID'),
            MEDICATION_PLAN_PAGE_ALREADY_SCANNED = i18n('InCaseMojit.scanMedicationPlanModal_clientJS.text.MEDICATION_PLAN_PAGE_ALREADY_SCANNED'),
            MEDICATION_PLAN_SOURCE = i18n('InCaseMojit.scanMedicationPlanModal_clientJS.label.SOURCE'),
            MODAL_TITLE = i18n('InCaseMojit.scanMedicationPlanModal_clientJS.title.MODAL'),
            SCAN = i18n('InCaseMojit.scanMedicationPlanModal_clientJS.title.SCAN'),
            CREATE_MEDICATIONPLAN = i18n('InCaseMojit.scanMedicationPlanModal_clientJS.title.CREATE_MEDICATIONPLAN'),
            CREATE_INGREDIENTPLAN = i18n('InCaseMojit.scanMedicationPlanModal_clientJS.title.CREATE_INGREDIENTPLAN'),

            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap;

        function ScanMedicationPlanModel() {
            ScanMedicationPlanModel.superclass.constructor.apply( this, arguments );
        }

        ScanMedicationPlanModel.ATTRS = {
        };

        Y.extend( ScanMedicationPlanModel, Y.doccirrus.KoViewModel.getDisposable(), {
            /** @protected */
            initializer: function ScanMedicationPlanModel_initializer() {
                var
                    self = this;
                self.initScanMedicationPlanModel();
            },
            /** @protected */
            destructor: function ScanMedicationPlanModel_destructor() {
            },
            initScanMedicationPlanModel: function ScanMedicationPlanModel_initScanMedicationPlanModel() {
                var
                    self = this,
                    insurance = self.get('insurance'),
                    employeeId = insurance && insurance.employeeId,
                    locationId = insurance && insurance.locationId,
                    lastSchein = self.get('lastSchein'),
                    patient = self.get('patient'),
                    caseFolderType = self.get('caseFolderType'),
                    checkBoxSettings = Y.doccirrus.utils.localValueGet( 'scanMedicationPlanModal' );

                // create default settings, if nothing is set, or parse the result
                if( typeof checkBoxSettings === "string" && checkBoxSettings.length > "" ) {
                    try {
                        checkBoxSettings = JSON.parse(checkBoxSettings);
                    } catch (e) {
                        checkBoxSettings = null;
                    }
                }

                // check, if the checkBoxSettings are valid
                if( typeof checkBoxSettings !== "object" ||
                    checkBoxSettings === null ||
                    !checkBoxSettings.hasOwnProperty( "createMedicationPlan" ) ||
                    typeof checkBoxSettings.createMedicationPlan !== "boolean" ) {
                    checkBoxSettings = {
                        createMedicationPlan: true,
                        createIngredientPlan: false
                    };
                }

                /**
                 * [MOJ-12072] define output types of the data
                 *              1) add a medication plan from the scan (default: true)
                 *              2) add an ingredient plan from the scan (default: false)
                 */
                self.createMedicationPlan = ko.observable( checkBoxSettings.createMedicationPlan );
                self.createIngredientPlan = ko.observable( checkBoxSettings.createIngredientPlan );

                // update the checkbox settings, whenever they change
                self.addDisposable( ko.computed( function() {
                    let createMedicationPlan = unwrap( self.createMedicationPlan ),
                        createIngredientPlan = unwrap( self.createIngredientPlan );

                    checkBoxSettings = {
                        createMedicationPlan: createMedicationPlan,
                        createIngredientPlan: createIngredientPlan
                    };

                    Y.doccirrus.utils.localValueSet( 'scanMedicationPlanModal', checkBoxSettings );
                } ) );

                self.carrierSegments = ko.observableArray().extend( { rateLimit: 50 } );
                self.carrierSegments.placeholder = SCAN;

                function reformatKbvDob( dob ) {
                    if( !dob ) {
                        return '';
                    }
                    return [dob.substring( 6, 8 ), '.', dob.substring( 4, 6 ), '.', dob.substring( 0, 4 )].join( '' );
                }

                function parseXMLString(XMLString) {
                    return jQuery( jQuery.parseXML( XMLString ) );
                }

                function hasPagesData(validatedData) {
                    return !!(validatedData && validatedData.currentPage && validatedData.totalPages);
                }

                function getCarrierSegmentsWithValidMedicationPlan(carrierSegments) {
                    return carrierSegments.filter(function(carrierSegment) {
                        return unwrap( carrierSegment.isValid ) && !!unwrap( carrierSegment.text );
                    });
                }

                self.comment = ko.computed( function() {
                    var
                        firstCarrierSegment = _.first( unwrap( self.carrierSegments ) ),
                        firstCarrierSegmentValidatedData,
                        comment;

                    if (!firstCarrierSegment) {
                        return;
                    }

                    firstCarrierSegmentValidatedData = unwrap( firstCarrierSegment.validatedData) ;

                    if (
                        unwrap( firstCarrierSegment.text ) &&
                        unwrap( firstCarrierSegment.isValid ) &&
                        firstCarrierSegmentValidatedData &&
                        (
                            firstCarrierSegmentValidatedData.source ||
                            firstCarrierSegmentValidatedData.sourceAddress ||
                            firstCarrierSegmentValidatedData.date
                        )

                    )  {
                        comment = getPrefixedStringFromList([
                            {
                                value: firstCarrierSegmentValidatedData.source
                            },
                            {
                                value: firstCarrierSegmentValidatedData.sourceAddress,
                                prefix: ', '
                            },
                            {
                                value: moment( firstCarrierSegmentValidatedData.date ).format( i18n( 'general.TIMESTAMP_FORMAT' ) ),
                                prefix: ', '
                            }
                        ]);
                    }

                    return comment;
                }).extend( { rateLimit: { timeout: 400, method: "notifyWhenChangesStop" } } );

                self.comment.readOnly = true;

                self.sourceI18n = MEDICATION_PLAN_SOURCE;

                self.hasWrongPatient = ko.computed( function() {
                    var
                        carrierSegments = unwrap( self.carrierSegments ),
                        failedPatientData;

                    carrierSegments.some( function( carrierSegment ) {
                        var
                            carrierSegmentText = carrierSegment && unwrap( carrierSegment.text ),
                            validatedData = carrierSegment && unwrap( carrierSegment.validatedData );

                        if(
                            !carrierSegmentText ||
                            !validatedData ||
                            (
                                !validatedData.firstName &&
                                !validatedData.lastName &&
                                !validatedData.dob
                            )
                        ) {
                            return false;
                        }

                        if(
                            validatedData.firstName !== patient.firstname ||
                            validatedData.lastName !== patient.lastname ||
                            validatedData.dob !== patient.kbvDob
                        ) {
                            failedPatientData = {
                                firstName: patient.firstname,
                                lastName: patient.lastname,
                                dob: patient.dob,
                                mpFirstName: validatedData.firstName,
                                mpLastName: validatedData.lastName,
                                mpDob: validatedData.dob,
                                MEDICATION_PLAN_PATIENT_NOT_MATCH: MEDICATION_PLAN_PATIENT_NOT_MATCH
                            };

                            return true;
                        }
                    } );

                    return failedPatientData;
                } );

                self.hasNotScannedAllPages = ko.computed(function() {
                    var
                        notAllScannedPagesData,
                        carrierSegments = unwrap( self.carrierSegments ),
                        totalPages,
                        allSegmentsHaveSameTotalPages,
                        carrierSegmentsWithValidMedicationPlan = getCarrierSegmentsWithValidMedicationPlan(carrierSegments),
                        allSegmentsHavePagesData = carrierSegmentsWithValidMedicationPlan.every(function(carrierSegment) {
                            var validatedData = carrierSegment && unwrap( carrierSegment.validatedData );

                            return hasPagesData(validatedData);
                        });

                    if (allSegmentsHavePagesData) {
                        allSegmentsHaveSameTotalPages = _.uniq(carrierSegmentsWithValidMedicationPlan, function (carrierSegment) {
                            var validatedData = carrierSegment && unwrap( carrierSegment.validatedData );

                            if (validatedData && validatedData.totalPages) {
                                totalPages = validatedData.totalPages;

                                return true;
                            } else {
                                return false;
                            }
                        }).length === 1;
                    }

                    if (allSegmentsHavePagesData && allSegmentsHaveSameTotalPages && carrierSegmentsWithValidMedicationPlan.length !== totalPages) {
                        notAllScannedPagesData = {
                            MEDICATION_PLAN_NOT_ALL_PAGES_SCANNED: i18n(
                                'InCaseMojit.scanMedicationPlanModal_clientJS.text.MEDICATION_PLAN_NOT_ALL_PAGES_SCANNED',
                                {
                                    data: {
                                        scannedPages: carrierSegmentsWithValidMedicationPlan.length,
                                        totalPages: totalPages
                                    }
                                }
                            )
                        };
                    }

                    return notAllScannedPagesData;
                });

                function getPrefixedStringFromList(list) {
                    return list
                            .filter(function(listItem) {
                                return !!listItem.value;
                            })
                            .map(function(listItem) {
                                return ''+listItem.prefix || ''+listItem.value;
                            })
                            .join('')
                            .trim();
                }

                function getAddress($carrierSegmentXML) {
                    var
                        street = $carrierSegmentXML.find('A').attr('s') ,
                        zipCode = $carrierSegmentXML.find('A').attr('z'),
                        city = $carrierSegmentXML.find('A').attr('c');

                    return getPrefixedStringFromList([
                        {
                            value: street
                        },
                        {
                            value: zipCode,
                            prefix: ', '
                        },
                        {
                            value: city,
                            prefix: ' '
                        }
                    ]);
                }

                /**
                 * Check if at least some data is given.
                 * Furthermore, check if an output format is given.
                 */
                self.isValid = ko.computed( function() {
                    var
                        carrierSegments = unwrap( self.carrierSegments ),
                        hasOutputTypeDefined = unwrap( self.createMedicationPlan ) || unwrap( self.createIngredientPlan ),
                        allValid = true,
                        hasText = false;

                    carrierSegments.forEach( function checkXmlVersion( item, index, collection ) {
                        var
                            $carrierSegmentXML,
                            newIsValidvalue,
                            validatedData,
                            sameId = false,
                            pageAlreadyScanned,
                            text = unwrap( item.text ) || '',
                            validXml = true;



                        if ( text.length ) {
                            hasText = true;
                            validXml = self.checkXml( text );
                        }

                        item.messages.removeAll();

                        if (validXml) {
                            try {
                                $carrierSegmentXML = parseXMLString(text);

                                validatedData = {
                                    firstName: $carrierSegmentXML.find('P').attr('g'),
                                    lastName: $carrierSegmentXML.find('P').attr('f'),
                                    dob: reformatKbvDob($carrierSegmentXML.find('P').attr('b')),
                                    id: $carrierSegmentXML.find( 'MP' ).attr( 'U' ),
                                    currentPage: parseInt($carrierSegmentXML.find( 'MP' ).attr( 'a' ), 10) || 0,
                                    totalPages: parseInt($carrierSegmentXML.find( 'MP' ).attr( 'z' ), 10) || 0,
                                    source: $carrierSegmentXML.find('A').attr('n'),
                                    sourceAddress: getAddress($carrierSegmentXML),
                                    date: $carrierSegmentXML.find('A').attr('t')
                                };

                                item.validatedData(validatedData);

                            } catch( err ) {
                                item.validatedData(null);

                                Y.log( 'could not parse carrierSegment: ' + text, 'warn', NAME );

                                item.isValid( false );
                                allValid = false;
                                return;
                            }
                        }

                        if (
                            index !== 0 &&
                            validatedData &&
                            validatedData.id &&
                            validatedData.id !== peek( collection[0].validatedData ).id
                        ) {
                            item.messages.push( MEDICATION_PLAN_NOT_SAME_ID );
                            sameId = false;
                        } else {
                            sameId = true;
                        }

                        if (
                            index !== 0 &&
                            validatedData &&
                            hasPagesData(validatedData)
                        ) {
                            pageAlreadyScanned = collection.some(function(collectionItem, collectionItemIndex) {
                                var collectionItemValidatedData = peek( collectionItem.validatedData );

                                return (
                                    collectionItemIndex !== index &&
                                    hasPagesData(collectionItemValidatedData) &&
                                    collectionItemValidatedData.currentPage &&
                                    validatedData.currentPage &&
                                    collectionItemValidatedData.currentPage === validatedData.currentPage
                                );
                            });

                            if (pageAlreadyScanned) {
                                if (!peek( item.messages ).includes(MEDICATION_PLAN_PAGE_ALREADY_SCANNED)) {
                                    item.messages.push( MEDICATION_PLAN_PAGE_ALREADY_SCANNED );
                                }
                            }
                        }

                        newIsValidvalue = (validXml || 0 === text.length) && sameId && !pageAlreadyScanned;

                        item.isValid( newIsValidvalue );

                        if ( !newIsValidvalue ) {
                            allValid = false;
                        }
                    } );

                    return ( hasText && allValid && hasOutputTypeDefined );
                } );



                self.isValid.extend( { rateLimit: { timeout: 400, method: "notifyWhenChangesStop" } } );

                /**
                 * Add a new carrierSegment if the last one contains pagesData
                 * and is not the last page.
                 */
                self.addDisposable( ko.computed( function() {
                    var
                        lastCarrierSegment = _.last( unwrap( self.carrierSegments ) ),
                        isLastCarrierSegmentValid,
                        lastCarrierSegmentValidatedData;

                    if (!lastCarrierSegment) {
                        return;
                    }

                    isLastCarrierSegmentValid = unwrap( lastCarrierSegment.isValid );
                    lastCarrierSegmentValidatedData = peek( lastCarrierSegment.validatedData) ;

                    if (
                        isLastCarrierSegmentValid &&
                        lastCarrierSegmentValidatedData &&
                        hasPagesData(lastCarrierSegmentValidatedData)
                    )  {
                        if (lastCarrierSegmentValidatedData.currentPage < lastCarrierSegmentValidatedData.totalPages) {
                            self.addScan();
                        }
                    }
                }));

                self.showWarning = ko.computed(function () {
                    return unwrap( self.hasWrongPatient ) || unwrap( self.hasNotScannedAllPages );
                });

                self.locationList = self.get( 'locationList' );
                self.locationId = ko.observable( locationId );

                self.employeeList = ko.computed( function() {
                    var
                        locationId = unwrap( self.locationId ),
                        result = [];
                    self.locationList.some( function( location ) {
                        if( location._id === locationId ) {
                            result = location.employees;
                        }
                    } );
                    return result;
                } );
                self.employeeListGrouped = ko.computed( function() {
                    var
                        list = unwrap(self.employeeList),
                        indexOfPreselectedEmployee = -1,
                        preselectEmployeeId = self.get( 'employeeId' ),
                        groupedEmployeeList = Y.doccirrus.inCaseUtils.groupEmployeeList( list );

                    if ( preselectEmployeeId && groupedEmployeeList[0] && groupedEmployeeList[0].items ) {
                        var preselectEmployee = groupedEmployeeList[0].items.find( function( item, index ) {
                            if  ( item._id === preselectEmployeeId ) {
                                indexOfPreselectedEmployee = index;
                                return true;
                            }
                            return false;
                        });

                        if ( indexOfPreselectedEmployee !== -1 ) {
                            groupedEmployeeList[0].items.splice(indexOfPreselectedEmployee, 1);
                            groupedEmployeeList[0].items.unshift(preselectEmployee);
                        }
                    }

                    return groupedEmployeeList;
                } );
                self.employeeId = ko.observable( employeeId );

                self.addDisposable(ko.computed(function() {
                    var
                        list = unwrap( self.employeeListGrouped );
                    self.employeeId( list[0] && list[0].items && list[0].items[0] && list[0].items[0]._id );
                }));

                Y.doccirrus.schemas.patient.getDefaultLocationAndEmployeeForPatient( patient, lastSchein, caseFolderType, null )
                    .then(function( res ) {
                        self.locationId(res.locationId);
                        self.employeeId(res.employeeId);
                    });

                self.selectLocationI18n = i18n('InCaseMojit.casefile_detail.placeholder.SELECT_LOCATION' );
                self.createMedicationPlanI18n = CREATE_MEDICATIONPLAN;
                self.createIngredientPlanI18n = CREATE_INGREDIENTPLAN;

                self.addScan();

            },
            getCarrierSegments: function(){
                var
                    self = this,
                    carrierSegments = peek( self.carrierSegments );

                return carrierSegments.map( function( item ) {
                    return peek(item.isValid) ? peek( item.text ) : false;
                } ).filter( function( item ) {
                    return !!item;
                } );

            },
            addScan: function(){
                var
                    self = this,
                    isValid = ko.observable().extend( { notify: 'always' } );

                self.carrierSegments.push( {
                    text: ko.observable(),
                    isValid: isValid,
                    hasError: ko.computed(function() {
                        return !unwrap( isValid );
                    }),
                    validatedData: ko.observable().extend( { notify: 'always' } ),
                    messages: ko.observableArray(),
                    onCsKey: onCsKey
                } );

                function onCsKey( context, evt ) {
                    if ( evt.altKey ) {
                        evt.preventDefault();
                    } else {
                        return true;
                    }
                }
            },
            /**
             *  Validate the scanned XML
             *
             *  Credit, adapted from this stack overflow answer by NoBugs on this thread:
             *  https://stackoverflow.com/questions/6334119/check-for-xml-errors-using-javascript
             *
             *  @param      {String}    xmlStr
             *  @returns    {Boolean}   true if XML is valid
             */
            checkXml: function( xmlStr ) {
                var
                    oParser = new DOMParser(),
                    oDOM,
                    vAttr;

                //  remove anything after </MP> and parse XML
                xmlStr = xmlStr.trim().split( '</MP>' )[0] + '</MP>';
                oDOM = oParser.parseFromString( xmlStr, 'text/xml' );

                if ( !oDOM.documentElement || -1 !== oDOM.documentElement.innerHTML.indexOf( "<parsererror" ) ) {
                    Y.log( 'Invalid carrier segment: ', oDOM.documentElement.innerHTML, 'error', NAME );
                    return false;
                }

                vAttr = oDOM.documentElement.getAttribute( 'v' );

                switch ( vAttr ) {
                    case '024':
                    case '025':
                    case '026':
                        return true;
                }

                return false;
            }

        }, {
            ATTRS: {
                locationList: {
                    value: [],
                    lazyAdd: false
                },
                insurance: {
                    value: null,
                    lazyAdd: false
                },
                lastSchein: {
                    value: null,
                    lazyAdd: false
                },
                patient: {
                    value: null,
                    lazyAdd: false
                },
                employeeId: {
                    value: null,
                    lazyAdd: false
                },
                caseFolderType: {
                    value: null,
                    lazyAdd: false
                }
            }
        } );

        function ScanMedicationPlanModal() {
        }

        ScanMedicationPlanModal.prototype = {
            show: function( config ) {
                var
                    patientAge = config.patientAge,
                    caseFolderId = config.caseFolderId,
                    patient = config.patient,
                    iknr = config.insurance.insuranceId;
                Promise.props( {
                    template: Y.doccirrus.jsonrpc.api.jade
                        .renderFile( { path: 'InCaseMojit/views/scan_medication_plan_modal' } )
                        .then( function( response ) {
                            return response && response.data;
                        } )
                } )
                    .then( function( result ) {
                        var
                            scanMedicationPlanModel = new ScanMedicationPlanModel({
                                locationList: config.locationList,
                                insurance: config.insurance,
                                lastSchein: config.lastSchein,
                                patient: patient,
                                caseFolderType: config.caseFolderType,
                                employeeId: config.employeeId
                            }),
                            bodyContent = Y.Node.create( result.template ),
                            modal = new Y.doccirrus.DCWindow( {
                                className: 'DCWindow-Appointment',
                                bodyContent: bodyContent,
                                id: 'formportal_modal',
                                icon: Y.doccirrus.DCWindow.ICON_INFO,
                                width: Y.doccirrus.DCWindow.SIZE_LARGE,
                                title: MODAL_TITLE,
                                height: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                                minHeight: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                                minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                                maximizable: true,
                                resizable: false,
                                focusOn: [],
                                centered: true,
                                modal: true,
                                render: document.body,
                                buttons: {
                                    header: [ 'close' ],
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                        Y.doccirrus.DCWindow.getButton( 'OK', {
                                            isDefault: true,
                                            action: function() {
                                                Y.doccirrus.jsonrpc.api.activity.createMedicationPlanByCarrierSegment( {
                                                    data: {
                                                        carrierSegments: scanMedicationPlanModel.getCarrierSegments(),
                                                        createMedicationPlan: peek( scanMedicationPlanModel.createMedicationPlan ),
                                                        createIngredientPlan: peek( scanMedicationPlanModel.createIngredientPlan ),
                                                        locationId: peek( scanMedicationPlanModel.locationId ),
                                                        employeeId: peek( scanMedicationPlanModel.employeeId ),
                                                        caseFolderId: caseFolderId,
                                                        patientId: patient._id,
                                                        patientAge: patientAge,
                                                        iknr: iknr,
                                                        comment: peek( scanMedicationPlanModel.comment )
                                                    }
                                                } )
                                                    .done( function(){
                                                        modal.close();
                                                        Y.doccirrus.DCWindow.notice({
                                                            type: 'success',
                                                            message: MEDICATION_PLAN_VALID
                                                        });
                                                    })
                                                    .fail( function( error ) {
                                                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                                    } );

                                            }
                                        } )
                                    ]
                                },
                                after: {
                                    visibleChange: function( event ) {
                                        if( !event.newVal ) {
                                            ko.cleanNode( bodyContent.getDOMNode() );
                                            scanMedicationPlanModel.destroy();
                                        }
                                    }
                                }
                            } );
                        scanMedicationPlanModel.addDisposable( ko.computed( function() {
                            var
                                isModelValid = unwrap( scanMedicationPlanModel.isValid ),
                                okBtn = modal.getButton( 'OK' ).button;

                            if( isModelValid ) {
                                okBtn.enable();
                            } else {
                                okBtn.disable();
                            }
                        } ) );
                        ko.applyBindings( scanMedicationPlanModel, bodyContent.getDOMNode() );
                    } )
                    .catch( catchUnhandled );
            }
        };

        Y.namespace( 'doccirrus.modals' ).scanMedicationPlan = new ScanMedicationPlanModal();

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'promise',
            'DCWindow',
            'KoViewModel'
        ]
    }
);


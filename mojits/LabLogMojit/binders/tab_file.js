/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko, moment, jQuery, _, Promise, YUI */
/*exported fun */
fun = function _fn( Y, NAME ) {
    'use strict';
    var
        i18n = Y.doccirrus.i18n,
        INFOS_AND_RECALLS = i18n( 'LabLogMojit.tab_file.title.INFOS_AND_RECALLS' ),
        NAME_MODAL = i18n( 'LabLogMojit.tab_file.error_and_attention.label.NAME' ),
        STATUS = i18n( 'LabLogMojit.tab_file.error_and_attention.label.STATUS' ),
        REASON = i18n( 'LabLogMojit.tab_file.error_and_attention.label.REASON' ),
        DATE = i18n( 'LabLogMojit.tab_file.error_and_attention.label.DATE' ),
        RECALL = i18n( 'LabLogMojit.tab_file.error_and_attention.label.RECALL' ),
        ADDITIONAL_INFO = i18n( 'LabLogMojit.tab_file.error_and_attention.label.ADDITIONAL_INFO' ),
        peek = ko.utils.peekObservable,
        getObject = Y.doccirrus.commonutils.getObject,
        unwrap = ko.unwrap,
        KoViewModel = Y.doccirrus.KoViewModel,
        Disposable = KoViewModel.getDisposable(),
        duplicateNotice = '<br/><small><i>Die Labordaten wurden doppelt importiert. Der Link zeigt auf den korrekten Akteneintrag.</i></small>',
        {
            stringMapFindingKind: stringMapFindingKind,
            getRecordRequestId: getRecordRequestId,
            getRecordPatientId: getRecordPatientId,
            getLabReqId: getLabReqId,
            isReportOrRequest: isReportOrRequest,
            isMeta: isMeta,
            isDuplicate: isDuplicate,
            isActivityId: isActivityId,
            isFinding: isFinding,
            isMainObject: isMainObject,
            getRecordPatientFirstName: getRecordPatientFirstName,
            getRecordPatientLastName: getRecordPatientLastName,
            getRecordPatientDoB: getRecordPatientDoB,
            mapL_dataRecordToPatientData: mapL_dataRecordToPatientData,
            getRecordAllErrorAttention: getRecordAllErrorAttention,
            needsMatching: needsMatching,
            displayPmErrors: displayPmErrors
        } = Y.doccirrus.schemas.lablog,
        useAddInfoForId = ko.observable( false ),
        useAddInfoForIdFK = ko.observable( null ),
        isNewLabBookRequired = ko.observable( false ),
        viewModel;

    /**
     * default error notifier
     */
    function fail( response ) {
        var errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

        if( errors.length ) {
            Y.Array.invoke( errors, 'display' );
        }
    }

    /**
     * @param {Object} config
     * @param {Object} [config.data]
     * @constructor
     */
    function FileTableRecord( config ) {
        FileTableRecord.superclass.constructor.call( this, config );
    }

    Y.extend( FileTableRecord, Disposable, {
        initializer: function( config ) {
            var self = this;

            self.isModal = ko.observable( config.isModal || false );
            self._initRecord();
        },
        /**
         * Data for key
         * @type {null|ko.computed}
         */
        key: null,
        /**
         * Computes the value to display.
         * @type {null|ko.computed}
         */
        value: null,
        /**
         * Data for patient
         * @type {null|ko.observable}
         */
        patient: null,
        /**
         * Computes the patient to display.
         * @type {null|ko.computed}
         */
        patientDisplay: null,
        /**
         * Data for flag
         * @type {null|ko.computed}
         */
        flag: null,
        /**
         * Data for record
         * @type {null|ko.observable}
         */
        record: null,
        /**
         * Data for recordIndex
         * @type {null|ko.observable}
         */
        recordIndex: null,
        /**
         * Data for detailsonRowClick
         * @type {null|ko.observable}
         */
        details: null,
        /**
         * Determines if details should be shown
         * @type {null|ko.observable}
         */
        detailsVisible: null,
        /**
         * description
         * @type {null|ko.observable}
         */
        description: ko.observable( null ),
        /**
         * config
         * @type {null|ko.observable}
         */
        configuration: ko.observable( null ),
        /**
         * originalData
         * @type {null|ko.observable}
         */
        originalData: ko.observable( null ),
        _initRecord: function() {
            var
                self = this,
                data = self.get( 'data' ) || {};

            self.record = ko.observable( data.record );
            self.recordIndex = ko.observable( data.recordIndex );
            self.details = ko.observable( data.details );
            self.patient = ko.observable( null );

            self.configuration( data.configuration || null );
            self.originalData( data.originalData || null );
            self.description( data.description || null );

            //Typ
            self.key = ko.computed( self.keyComputed, self );

            //
            self.flag = ko.computed( self.flagComputed, self );

            //Beschreibung
            self.value = ko.computed( self.valueComputed, self );

            //Patient
            self.patientDisplay = ko.computed( self.patientComputed, self );

            //
            self.patientDiff = ko.computed( self.patientDiffComputed, self );

            //
            self.errorAndAttention = ko.computed( self.errorAndAttentionComputed, self );

            if( data.originalData && data.originalData.configuration ) {
                if( data.patient && data.patient.patientId ) {
                    Y.doccirrus.jsonrpc.api.patient.read( {
                        query: {
                            _id: data.patient.patientId
                        }
                    } )
                        .then( function( response ) {
                            return response.data[0] || null;
                        } )
                        .done( self.patient );
                }
                self.detailsVisible = ko.observable( isMainObject( data.record, data.originalData.l_data.versionUsed ) );
            } else {
                if( data.patient ) {
                    Y.doccirrus.jsonrpc.api.patient.read( {
                        query: {
                            _id: data.patient.patientId ? data.patient.patientId : data.patient
                        }
                    } )
                        .then( function( response ) {
                            return response.data[0] || null;
                        } )
                        .done( self.patient );
                }
                self.detailsVisible = ko.observable( false );
            }

        },
        /**
         * Computes the key to display.
         * @return {string}
         */
        keyComputed: function() {
            var
                self = this,
                record = self.record(),
                file = peek( viewModel.file ),
                findingKind = stringMapFindingKind( record, file ),
                text = i18n( 'lablog-schema.recTypes.' + ((record.recordType && record.recordType.head) || record.recordType) ),
                tmp;

            if( findingKind && Array.isArray( findingKind ) && findingKind.length ) {
                findingKind = findingKind.filter( function( obj ) {
                    return typeof obj === 'string';
                } );
                tmp = findingKind.join( ' ' );
                if( tmp !== ' ' ) {
                    text += ' ( ' + tmp + ' )';
                }
            }
            return text;
        },
        /**
         * Computes the flag.
         * @return {string}
         */
        flagComputed: function() {
            var
                self = this,
                recordIndex = self.recordIndex(),
                file = peek( viewModel.file );

            return file.flags[recordIndex];
        },
        /**
         * Computes the value to display.
         * @return {string}
         */
        valueComputed: function() {
            var
                self = this,
                flag = self.flag(),
                record = self.record(),
                originalData = self.originalData(),
                patient = unwrap( self.patient ? self.patient : null ),
                patientId = unwrap( patient ? patient._id : null ),
                recordRequestId = getRecordRequestId( record ),
                patientAddInfo = getRecordPatientId( record ),
                labReqId = getLabReqId( record ),
                text = '';

            // console.info('flag: ', flag);

            if( isReportOrRequest( record ) ) {
                if( isDuplicate( flag ) ) {
                    if( !patient ) {
                        return i18n( 'LabLogMojit.tab_file.fileTable.column.value.duplicate' );
                    }

                    //text = i18n( 'LabLogMojit.tab_file.fileTable.column.value.meta' );
                    text = Y.Lang.sub( '<a href="{href}" target="_blank">{text}</a>' + duplicateNotice, {
                        text: text,
                        href: Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/patient/' + patientId
                    } );
                    return text;
                }

                text = [];

                if( isNewLabBookRequired() && self.configuration() ) {
                    if( self.configuration().assignment.assignmentField === '8310' ) {
                        text.push( i18n( 'LabLogMojit.tab_file.fileTable.column.value.requestId', {
                            data: {
                                requestId: self.configuration().assignment.assignmentValue || ''
                            }
                        } ) );
                    } else if( self.configuration().assignment.assignmentField === '8311' ) {
                        text.push( i18n( 'LabLogMojit.tab_file.fileTable.column.value.requestLabId', {
                            data: {
                                requestId: self.configuration().assignment.assignmentValue || ''
                            }
                        } ) );
                    } else if( self.configuration().assignment.assignmentField === '8405' ) {
                        text.push( i18n( 'LabLogMojit.tab_file.fileTable.column.value.requestPatientAddInfo', {
                            data: {
                                requestId: self.configuration().assignment.assignmentValue || ''
                            }
                        } ) );
                    }
                } else {
                    if( useAddInfoForId ) {
                        if( useAddInfoForIdFK === '8310' ) {
                            text.push( i18n( 'LabLogMojit.tab_file.fileTable.column.value.requestId', {
                                data: {
                                    requestId: recordRequestId || ''
                                }
                            } ) );
                        } else if( useAddInfoForIdFK === '8311' ) {
                            text.push( i18n( 'LabLogMojit.tab_file.fileTable.column.value.requestLabId', {
                                data: {
                                    requestId: labReqId || ''
                                }
                            } ) );
                        } else if( useAddInfoForIdFK === '8405' ) {
                            text.push( i18n( 'LabLogMojit.tab_file.fileTable.column.value.requestPatientAddInfo', {
                                data: {
                                    requestId: patientAddInfo || ''
                                }
                            } ) );
                        }
                    } else {
                        if( recordRequestId ) {
                            text.push( i18n( 'LabLogMojit.tab_file.fileTable.column.value.requestId', {
                                data: {
                                    requestId: recordRequestId
                                }
                            } ) );
                        }
                    }
                }

                text = Y.Escape.html( text.join( ', ' ) );

                if( isActivityId( flag ) && !isNewLabBookRequired() ) {
                    text = Y.Lang.sub( '<a href="{href}" target="_blank">{text}</a>', {
                        text: text,
                        href: Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/activity/' + flag
                    } );
                } else if( isNewLabBookRequired() && originalData.linkedActivities && originalData.linkedActivities.length > 0 ) {
                    text = Y.Lang.sub( '<a href="{href}" target="_blank">{text}</a>', {
                        text: text,
                        href: Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/activity/' + originalData.linkedActivities[0]
                    } );
                }
            } else {
                text = i18n( 'LabLogMojit.tab_file.fileTable.column.value.meta' );
            }

            return text;
        },
        /**
         * Computes the patient to display.
         * @return {string}
         */
        patientComputed: function() {
            var
                self = this,
                flag = self.flag(),
                patient = unwrap( self.patient ? self.patient : null ),
                patientId = unwrap( patient ? patient._id : null ),
                record = self.record(),
                originalData = self.originalData(),
                patientForename = getRecordPatientFirstName( record ),
                patientName = getRecordPatientLastName( record ),
                patientDob = getRecordPatientDoB( record ),
                text = '',
                personDisplay;

            if( isReportOrRequest( record ) ) {
                text = [];
                if( patient ) {
                    personDisplay = Y.doccirrus.schemas.person.personDisplay( patient );
                    if( patient.kbvDob ) {
                        personDisplay += ' ' + i18n( 'LabLogMojit.tab_file.fileTable.column.value.dateOfBirth', {
                            data: {
                                dateOfBirth: patient.kbvDob
                            }
                        } );
                    }
                    text.push( personDisplay );
                } else if( patientForename || patientName ) {
                    personDisplay = Y.doccirrus.schemas.person.personDisplay( mapL_dataRecordToPatientData( record ) );
                    if( patientDob ) {
                        if( moment( patientDob ).isValid() ) {
                            personDisplay += ' ' + i18n( 'LabLogMojit.tab_file.fileTable.column.value.dateOfBirth', {
                                data: {
                                    dateOfBirth: moment( patientDob ).format( i18n( 'general.TIMESTAMP_FORMAT' ) )
                                }
                            } );
                        }
                    }
                    text.push( personDisplay );
                }
                text = Y.Escape.html( text.join( ', ' ) );
                if( isDuplicate( flag ) && patient ) {
                    text = Y.Lang.sub( '<a href="{href}" target="_blank">{text}</a>' + duplicateNotice, {
                        text: text,
                        href: Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/patient/' + patientId
                    } );
                    return text;
                }
                if( isActivityId( flag ) && !isNewLabBookRequired() ) {
                    text = Y.Lang.sub( '<a href="{href}" target="_blank">{text}</a>', {
                        text: text,
                        href: Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/activity/' + flag
                    } );
                } else if( isNewLabBookRequired() && originalData.linkedActivities && originalData.linkedActivities.length > 0 ) {
                    text = Y.Lang.sub( '<a href="{href}" target="_blank">{text}</a>', {
                        text: text,
                        href: Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/activity/' + originalData.linkedActivities[0]
                    } );
                }
            }
            return text;
        },
        patientDiffComputed: function() {
            var
                self = this,
                patient = self.patient(),
                owner = self.get( 'owner' ),
                ownersOwner = owner && owner.get( 'owner' ),
                file = ownersOwner && ownersOwner.file(),
                patientDiffs = file && file.patientDiffs,
                patientId = patient && patient._id,
                patientDiff;

            if( !patientId || !Array.isArray( patientDiffs ) ) {
                return;
            }

            patientDiffs.some( function( diff ) {
                if( diff.patientId === patientId ) {
                    patientDiff = diff;
                    return true;
                }
            } );

            return patientDiff;
        },
        errorAndAttentionComputed: function() {
            var
                self = this,
                record = self.record(),
                errorAndAttention = record && isFinding( record ) &&
                                    getRecordAllErrorAttention( record );

            if( !errorAndAttention || ((!errorAndAttention.Obj_0017.length || !errorAndAttention.Obj_0017.length) &&
                                       (!errorAndAttention.Obj_0060 || !errorAndAttention.Obj_0060.length)) ) {
                return null;
            }

            return errorAndAttention;
        },
        /**
         * Determines a class name to apply to the associated row.
         * @param {FileTableRecord} $data
         * @return Object
         */
        getRowClass: function( $data ) {
            var
                self = this,
                flag = $data.flag(),
                record = $data.record(),
                originalData = self.originalData(),
                mainObject = false;

            if( isNewLabBookRequired() ) {
                if( originalData && originalData.configuration ) {
                    mainObject = isMainObject( record, originalData.l_data.versionUsed );
                    return {
                        'text-muted': !mainObject,
                        'text-danger': mainObject && !(originalData.assignedPatient && originalData.assignedPatient.patientId)
                    };
                }
            } else {
                return {
                    'text-muted': isMeta( flag ),
                    'text-danger': needsMatching( flag )
                };
            }
        },
        /**
         * Click event handler of a row. Will show the details associated to that row.
         * @param {FileTableRecord} $data
         * @param {jQuery.Event} $event
         */
        onRowClick: function( $data, $event ) {
            var
                self = this,
                $target = jQuery( $event.target );

            if( $target.is( 'a' ) || $target.parents( 'a' ).get( 0 ) ) {
                return true;
            }
            $event.stopPropagation();

            self.detailsVisible( !self.detailsVisible() );
        },
        /**
         * Determines to render an assign button
         * @param {FileTableRecord} $data
         * @return {Boolean}
         */
        renderAssignButton: function( $data ) {
            return needsMatching( $data.flag() );
        },
        /**
         * Click event handler of an assign button. May show a patient selector window to choose from.
         * @param {FileTableRecord} $data
         * @param {jQuery.Event} $event
         */
        assignPatient: function( $data, $event ) {
            var
                self = this,
                file = viewModel && viewModel.file();

            $event.stopPropagation();

            if( file && file.status !== 'PROCESSING' ) {
                Y.doccirrus.modals.assignLabLogData.showDialog( {...file, index: self.recordIndex()},
                    function( result ) {
                        if( result.success ) {
                            window.location.reload();
                        }
                    }
                );
            }
        },
        createDiffTable: function() {
            var
                self = this,
                schema = Y.doccirrus.schemas.patient.schema,
                DATE_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
                categories = [
                    {pathPart: '', title: 'Stammdaten'},
                    {pathPart: 'insuranceStatus', title: 'Kostenträger'},
                    {pathPart: 'addresses', title: 'Adressen'}
                ],
                catSeparator = {separator: true},
                patientDiff = self.patientDiff();
            var
                tableCategories,
                sortedPatientDiffValues;

            var resolveEnum = function( path, val ) {
                var
                    schemaPath = path.replace( /\.(\d+)\./, '.0.' ),
                    schemaEntry = getObject( schemaPath, schema ),
                    schemaEntryList = schemaEntry && schemaEntry.list;
                var translation;

                if( schemaEntryList ) {
                    schemaEntryList.some( function( listEntry ) {
                        if( listEntry.val === val ) {
                            translation = listEntry.i18n;
                            return true;
                        }
                    } );
                }
                return translation || val;
            };

            if( !patientDiff ) {
                return;
            }

            sortedPatientDiffValues = _.sortBy( patientDiff.values, 'path' ).map( function( diff ) {
                if( 'Date' === diff.type ) {
                    if( diff.aVal ) {
                        diff.aVal = moment( diff.aVal ).format( DATE_FORMAT );
                    }
                    if( diff.bVal ) {
                        diff.bVal = moment( diff.bVal ).format( DATE_FORMAT );
                    }
                } else if( 'Boolean' === diff.type ) {
                    diff.aVal = diff.aVal ? 'An' : 'Aus';
                    diff.bVal = diff.bVal ? 'An' : 'Aus';
                } else if( diff.isEnum && 'String' === diff.type ) {
                    diff.aVal = resolveEnum( diff.path, diff.aVal );
                    diff.bVal = resolveEnum( diff.path, diff.bVal );
                } else if( diff.isEnum && '[String]' === diff.type ) {
                    if( Array.isArray( diff.aVal ) ) {
                        diff.aVal = diff.aVal.map( function( str ) {
                            return resolveEnum( diff.path, str );
                        } );
                        diff.bVal = diff.bVal.map( function( str ) {
                            return resolveEnum( diff.path, str );
                        } );
                    }
                }
                diff.separator = false;
                return diff;
            } );

            tableCategories = categories.map( function( cat ) {
                cat.data = [];
                sortedPatientDiffValues.forEach( function( diff, idx, arr ) {
                    var pathParts = diff.path.split( '.' );
                    var lastDiff;

                    if( !cat.pathPart && 1 === pathParts.length ) {
                        cat.data.push( diff );
                    } else if( 1 <= pathParts.length && pathParts[0] === cat.pathPart ) {
                        lastDiff = arr[idx - 1];
                        if( lastDiff && lastDiff.parentPath === diff.parentPath && lastDiff.index !== diff.index ) {
                            cat.data.push( catSeparator );
                        }
                        cat.data.push( diff );
                    } else {
                        Y.log( 'could not find matching category for: ' + JSON.stringify( diff ), 'error', NAME );
                    }
                } );
                return cat;
            } );

            return {categories: tableCategories};
        },
        showPatientDiff: function( vm, evt ) {
            var
                self = this,
                diffTable = self.createDiffTable();
            evt.stopPropagation();
            evt.preventDefault();

            if( !diffTable ) {
                return false;
            }

            Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( {path: 'LabLogMojit/views/patient_diff'} )
            )
                .then( function( response ) {
                    return response && response.data;
                } )
                .then( function( template ) {
                    var bodyContent = Y.Node.create( template );
                    var modal;

                    modal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-DiffPatient',
                        bodyContent: bodyContent,
                        title: 'Patient/Befund-Datenunterschiede',
                        icon: Y.doccirrus.DCWindow.ICON_WARN,
                        width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        height: 400,
                        minHeight: 400,
                        minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        centered: true,
                        render: document.body,
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    action: function() {
                                        modal.close();
                                    }
                                } )
                            ]
                        }
                    } );

                    ko.applyBindings( diffTable, bodyContent.getDOMNode() );

                } )
                .catch( function( err ) {
                    Y.log( 'could not get error_and_attention template: ' + err, 'error', NAME );
                } );

            return false;
        },
        showErrorAndAttention: function( vm, evt ) {
            var
                self = this,
                errorAndAttention = self.errorAndAttention();

            evt.stopPropagation();
            evt.preventDefault();

            Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( {path: 'LabLogMojit/views/error_and_attention'} )
            )
                .then( function( response ) {
                    return response && response.data;
                } )
                .then( function( template ) {
                    var bodyContent = Y.Node.create( template );
                    var modal;

                    modal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-InfosAndRecalls',
                        bodyContent: bodyContent,
                        title: INFOS_AND_RECALLS,
                        icon: Y.doccirrus.DCWindow.ICON_WARN,
                        width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        height: 400,
                        minHeight: 400,
                        minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        centered: true,
                        render: document.body,
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    action: function() {
                                        modal.close();
                                    }
                                } )
                            ]
                        }
                    } );

                    errorAndAttention.i18n = {
                        NAME: NAME_MODAL,
                        STATUS: STATUS,
                        REASON: REASON,
                        DATE: DATE,
                        RECALL: RECALL,
                        ADDITIONAL_INFO: ADDITIONAL_INFO
                    };

                    ko.applyBindings( errorAndAttention, bodyContent.getDOMNode() );

                } )
                .catch( function( err ) {
                    Y.log( 'could not get patient_diff template: ' + err, 'error', NAME );
                } );

            return false;

        }
    }, {
        ATTRS: {
            data: {
                value: {},
                cloneDefaultValue: true,
                validate: Y.Lang.isObject,
                lazyAdd: false
            },
            owner: {
                value: null,
                lazyAdd: false
            }
        }
    } );

    /**
     * @param {Object} [config]
     * @varructor
     */
    function FileTable( config ) {
        FileTable.superclass.constructor.call( this, config );
    }

    Y.extend( FileTable, Disposable, {
        initializer: function( config ) {
            var self = this;

            self.isModal = ko.observable( config.isModal || false );
            self._initRecords();
            self._initColumns();
        },
        destructor: function() {
            var self = this;

            self._destroyRecords();
        },
        /**
         * Holds the records for this table
         * @property records
         * @type {null|ko.observableArray}
         */
        records: null,
        /** @private */
        _initRecords: function() {
            var self = this;

            self.records = ko.observableArray();
        },
        /** @private */
        _destroyRecords: function() {
            var self = this;

            self.removeRecords();
        },
        /**
         * Creates a record from data for it
         * @method createRecord
         * @param {Object} data
         * @return {fun.FileTableRecord}
         */
        createRecord: function( data ) {
            var self = this;

            return new FileTableRecord( {
                data: data,
                owner: self,
                isModal: self.isModal() || false
            } );
        },
        /**
         * Add a record or data for a record (which will be instantiated to a record)
         * @method addRecord
         * @param {Object} data
         * @return {fun.FileTableRecord}
         */
        addRecord: function( data ) {
            var self = this;
            var record = data;

            if( !(record instanceof FileTableRecord) ) {
                record = self.createRecord( data );
            }

            self.records.push( record );

            return record;
        },
        /**
         * Add an array of records or data objects
         * @method addRecords
         * @param {Array} items
         * @return {[fun.FileTableRecord]}
         */
        addRecords: function( items ) {
            var self = this;
            var result = [];

            items.forEach( function( data ) {
                result.push( self.addRecord( data ) );
            } );
            return result;
        },
        /**
         * Removes a record
         * @method removeRecord
         * @param {FileTableRecord} record
         */
        removeRecord: function( record ) {
            var self = this;

            self.records.remove( record );
            record.destroy();
        },
        /**
         * Remove an array of records or all if unset.
         * @method removeRecords
         * @param [{FileTableRecord}] records if set removes those records, else all records
         */
        removeRecords: function( records ) {
            var self = this;

            records = [].concat( records || peek( self.records ) );

            records.forEach( function( record ) {
                self.removeRecord( record );
            } );
        },
        /**
         * Computes if the column for the assign buttons should be shown.
         * @type {null|ko.computed}
         */
        isAssignButtonColumnVisible: null,
        _initColumns: function() {
            var self = this;

            self.isAssignButtonColumnVisible = ko.computed( function() {
                var records = self.records();

                return Y.Array.some( records, function( record ) {
                    return record.renderAssignButton( record );
                } );
            } );
        }
    }, {
        ATTRS: {
            owner: {
                value: null,
                lazyAdd: false
            }
        }
    } );

    /**
     * @param {Object} [config]
     * @constructor
     */
    function TabFileViewModel( config ) {
        TabFileViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( TabFileViewModel, Disposable, {
        initializer: function( config ) {
            var self = this;

            self.isModal = ko.observable( config.isModal || false );
            self.isNewLabBookRequired = ko.observable( (config && config.file && config.file.configuration) || false );
            self._initFileTable();
            self._initFile();
            self._initFileInfo();
        },
        destructor: function() {
            var self = this;

            self._destroyFileTable();
        },
        billingFlag: ko.observable( true ),
        allowGkvBilling: ko.observable( false ),
        checkFileWithLdkPm: ko.observable( false ),
        pmResults: ko.observable( null ),
        /**
         * Used to display timestamp of file
         * @type {null|ko.observable}
         */
        timestampDisplay: null,
        /**
         * Used to display created of file
         * @type {null|ko.observable}
         */
        createdDisplay: null,
        /**
         * Used to display source of file
         * @type {null|ko.observable}
         */
        sourceDisplay: null,
        _initFileInfo: function() {
            var self = this;

            self.timestampDisplay = ko.computed( self.timestampDisplayComputed, self );
            self.createdDisplay = ko.computed( self.createdDisplayComputed, self );
            self.sourceDisplay = ko.computed( self.sourceDisplayComputed, self );
        },
        /**
         * Computes timestamp of a file for display
         * @return {string}
         */
        timestampDisplayComputed: function() {
            var
                self = this,
                file = self.file(),
                timestamp = file && file.timestamp;

            if( timestamp ) {
                return moment( timestamp ).format( i18n( 'general.TIMESTAMP_FORMAT_LONG' ) );
            } else {
                return '';
            }
        },
        /**
         * Computes created of a file for display
         * @return {string}
         */
        createdDisplayComputed: function() {
            var
                self = this,
                file = self.file(),
                created = file && file.created;

            if( created ) {
                return moment( created ).format( i18n( 'general.TIMESTAMP_FORMAT_LONG' ) );
            } else {
                return '';
            }
        },
        /**
         * Computes source of a file for display
         * @return {string}
         */
        sourceDisplayComputed: function() {
            var
                self = this,
                file = self.file(),
                source = file && file.source;

            if( source ) {
                return source;
            } else {
                return '';
            }
        },
        /**
         * @property fileTable
         * @type {null|FileTable}
         */
        fileTable: null,
        /** @private */
        _initFileTable: function() {
            var self = this;

            self.fileHeadlineI18n = i18n( 'LabLogMojit.tab_file.headline' );
            self.timestampI18n = i18n( 'lablog-schema.Lablog_T.timestamp' );
            self.createdI18n = i18n( 'lablog-schema.Lablog_T.created' );
            self.sourceI18n = i18n( 'lablog-schema.Lablog_T.source' );
            self.pmResultsI18n = i18n( 'lablog-schema.Lablog_T.pmResults' );
            self.billingFlagI18n = i18n( 'settings-schema.Settings_T.ldtBillingFlag' );
            self.allowGkvBillingI18n = i18n( 'settings-schema.Settings_T.ldtAllowGkvBilling' );
            self.checkFileWithLdkPmI18n = i18n( 'settings-schema.Settings_T.checkFilesWithLdkPm' );
            self.keyLabelI18n = i18n( 'LabLogMojit.tab_file.fileTable.column.key.label' );
            self.assignLabelI18n = i18n( 'LabLogMojit.tab_file.fileTable.column.assign.label' );
            self.patientLabelI18n = i18n( 'LabLogMojit.tab_file.fileTable.column.patient.label' );
            self.collapseLabelI18n = i18n( 'LabLogMojit.tab_file.fileTable.column.collapse.label' );
            self.valueLabelI18n = i18n( 'LabLogMojit.tab_file.fileTable.column.value.label' );

            self.fileTable = new FileTable( {
                owner: self,
                isModal: self.isModal() || false
            } );
            self.fileTable.assignPatientTextI18n = i18n( 'LabLogMojit.tab_file.fileTable.column.assign.assignPatient.text' );
        },
        /** @private */
        _destroyFileTable: function() {
            var self = this;

            self.fileTable.destroy();
            self.fileTable = null;
        },
        /**
         * Own file reference
         */
        file: null,
        _initFile: function() {
            var self = this;

            self.file = ko.observable();

            function decodePmResultString( results ) {
                return [
                    results.errors,
                    results.warnings,
                    results.info]
                    .filter( Boolean )
                    .forEach( function( obj ) {
                        obj = obj || {};
                        Object.keys( obj ).forEach( function( key ) {
                            (obj[key] || []).forEach( function( el ) {
                                el.text = el.text
                                    .replace( /&lt;style isBold="true"&gt;/gm, '<strong>' )
                                    .replace( /&lt;\/style&gt;/gm, '</strong>' );
                            } );

                        } );
                    } );
            }

            self.addDisposable( ko.computed( function() {
                var file = self.file();
                self.displayPmResultsStats = ko.computed( function() {
                    var pmResults = self.pmResults();

                    if( !pmResults ) {
                        return '';
                    }
                    decodePmResultString( pmResults );
                    return displayPmErrors( pmResults );
                } );

                self.pmResultsHasError = ko.computed( function() {
                    var pmResults = self.pmResults();
                    return Boolean( pmResults && pmResults.nErrors );
                } );

                self.pmResultsIsOK = ko.computed( function() {
                    var pmResults = self.pmResults();
                    return Boolean( pmResults && !pmResults.nErrors && !pmResults.nWarnings && !pmResults.nInfo );
                } );

                self.openPmResultsModal = function() {
                    var
                        pmResultsIsOK = self.pmResultsIsOK(),
                        pmResults = self.pmResults(),
                        node = Y.Node.create( '<div></div>' );

                    if( pmResultsIsOK ) {
                        return;
                    }
                    // TODO: generalize with eDOC approach
                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        'edmperrorlog',
                        'InvoiceMojit',
                        pmResults,
                        node,
                        function() {

                            Y.doccirrus.DCWindow.notice( {
                                title: 'Meldungen',
                                type: 'error',
                                window: {width: 'xlarge'},
                                message: node
                            } );

                            jQuery( '#kbverror-log-tabs a' ).click( function( e ) {
                                e.preventDefault();
                                e.stopImmediatePropagation();
                                jQuery( this ).tab( 'show' );
                            } );
                        }
                    );
                };

                self.checkFileWithLdkPm( file && Boolean( file.checkFileWithLdkPm ) );
                self.pmResults( file && file.pmResults );

                ko.ignoreDependencies( function() {
                    var
                        records,
                        labData = file && file.l_data;

                    self.fileTable.removeRecords();

                    if( file ) {
                        isNewLabBookRequired( !!file.configuration );
                        useAddInfoForId( file.useAddInfoForId );
                        useAddInfoForIdFK( file.useAddInfoForIdFK );
                        self.billingFlag( file.billingFlag );
                        self.allowGkvBilling( file.allowGkvBilling );
                        records = self.fileTable.addRecords( labData.records.map( function( item, index ) {
                            return {
                                recordIndex: index,
                                record: item,
                                patient: (file.associatedPatients && file.associatedPatients[index]) || file.assignedPatient,
                                configuration: file.configuration,
                                description: file.description,
                                originalData: file
                            };
                        } ) );

                        Y.doccirrus.jsonrpc.api.lab.getStringified( {
                            id: file._id
                        } )
                            .then( function( response ) {
                                return response.data || [];
                            } )
                            .fail( fail )
                            .done( function( details ) {
                                records.forEach( function( record, index ) {
                                    record.details( details[index] );
                                } );
                            } );
                    }
                } );
            } ) );

        },
        /**
         * Sets file refrence for this view model
         * @param {Object} file
         */
        setFile: function( file ) {
            var self = this;

            self.file( file );
        }
    } );

    return {
        registerNode: function( node, someKey, options ) {
            viewModel = new TabFileViewModel( options );
            viewModel.setFile( options.file );
            ko.applyBindings( viewModel, node.getDOMNode() );
        },
        deregisterNode: function( node ) {
            ko.cleanNode( node.getDOMNode() );
        }
    };
};

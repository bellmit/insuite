/**
 * User: jm
 * Date: 15/12/16  16:32
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, _*/

'use strict';


// Please check the wiki page 'SURGERY Activity' if you are working on dependencies, post-processes or if you need to get an overview.

// Note on possible confusing variable names:
//   - code refers to the linkedTreatment's treatment code
//   - opsCode refers to the linkedTreatment's opsCode
//   - fk5035Set is the array of opsCodes, as defined in the SURGERY/TREATMENT schemas
//   - seqs refers to the array of treatment codes as found in the catalog entries

YUI.add( 'SurgeryEditorModel', function( Y, NAME ) {
        /**
         * @module SurgeryEditorModel
         */

        var
            i18n = Y.doccirrus.i18n,
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            KoViewModel = Y.doccirrus.KoViewModel,
            SimpleActivityEditorModel = KoViewModel.getConstructor( 'SimpleActivityEditorModel' ),
            LinkedTreatmentModel = KoViewModel.getConstructor( 'LinkedTreatmentModel' );

    // TRANSLATIONS ----------------------------------------------------------------------------------------------------
        var
            opsCodesI18n = i18n( 'InCaseMojit.SurgeryEditorModel.tables.opsCodes' ),
            seqCodeI18n = i18n( 'InCaseMojit.SurgeryEditorModel.tables.seqCode' ),
            quantityI18n = i18n( 'InCaseMojit.SurgeryEditorModel.tables.quantity' ),
            textI18n = i18n( 'InCaseMojit.SurgeryEditorModel.tables.text' ),
            explanationsI18n = i18n( 'InCaseMojit.SurgeryEditorModel.tables.explanations' );

    // TREATMENTS TABLE CONSTRUCTOR ------------------------------------------------------------------------------------
    // The TreatmentsTable constructor creates a new TreatmentsTable instance, an object with an opsCode, seqs and a talbeComponent,
    // that has methods to modify itself. On creating a TreatmentsTable, subscriptions are automatically set up.
        function TreatmentsTable( params ) {
            var table = this;

            table.opsCode = params.opsCode;
            table.seqs = params.seqs;
            table.editorModel = params.editorModel;

            table.tableComponent = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'treatments-table-associated-to-ops-code',
                    limit: 5,
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'checked',
                            label: '',
                            checkMode: 'multi',
                            allToggleVisible: false,
                            uncheckOnFilterChange: false,
                            uncheckOnReload: false
                        },
                        {
                            forPropertyName: 'code',
                            label: seqCodeI18n,
                            width: '120px',
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'userContent',
                            label: textI18n,
                            isSortable: true,
                            isFilterable: true
                        }
                    ]
                }
            } );

        // The linkedTreatments array will be updated on checking and unchecking treatments from the table.
            table.tableComponent.getComponentColumnCheckbox().checked.subscribe( function( changes ) {
                var correspondingExistingLinkedTreatments, correspondingLinkedTreatments;

                changes.forEach( function( change ) {
                    var treatment = change.value;
                    if( change.status === 'added' ) {
                    // 3 possible cases may occur when a row is being checked:
                    //     a) The treatment already exists:
                    //          The row is checked automatically because the page is being loaded and we just want to
                    //          fill in the table with the corresponding treatment(s) from the linkedTreatments array.
                    //     b) The treatment does not yet exist:
                    //          i)  The treatment has not been selected for any other opsCodes. We want to create a new row.
                    //          ii) The treatment has already been selected for another opsCode. We just want to add
                    //              an opsCode to the list.

                        correspondingLinkedTreatments = table.editorModel.linkedTreatmentsTable.rows().filter( function( linkedTreatment ) {
                            return ko.unwrap( linkedTreatment.code ) === treatment.code;
                        } );
                        correspondingExistingLinkedTreatments = table.editorModel.linkedTreatments().filter( function( linkedTreatment ) {
                            return ko.unwrap( linkedTreatment.code ) === treatment.code && ko.unwrap( linkedTreatment.opsCodes ).indexOf( treatment.opsCode ) > -1;
                        } );

                        if( correspondingExistingLinkedTreatments.length ) {
                            if( !correspondingLinkedTreatments.length ) { // case a)
                                correspondingExistingLinkedTreatments.forEach( function( existingLinkedTreatment ) {
                                    var existingLinkedTreatmentData = {
                                        activityId: ko.unwrap( existingLinkedTreatment.activityId ),
                                        code: ko.unwrap( existingLinkedTreatment.code ),
                                        opsCodes: ko.unwrap( existingLinkedTreatment.opsCodes ),
                                        quantity: ko.unwrap( existingLinkedTreatment.quantity ),
                                        userContent: ko.unwrap( existingLinkedTreatment.userContent ),
                                        explanations: ko.unwrap( existingLinkedTreatment.explanations ),
                                        catalogRef: ko.unwrap( existingLinkedTreatment.catalogRef )
                                    };
                                    table.editorModel.linkedTreatmentsTable.addRow( {data: existingLinkedTreatmentData} );
                                } );
                            }
                        } else { // case b)
                            if( correspondingLinkedTreatments.length ) { // case b,i)
                                correspondingLinkedTreatments.forEach( function( correspondingLinkedTreatment ) {
                                    correspondingLinkedTreatment.opsCodes.push( treatment.opsCode );
                                } );
                            } else { // case b.ii)
                                treatment.quantity = 1; // set default
                                treatment.opsCodes = [treatment.opsCode];
                                table.editorModel.linkedTreatmentsTable.addRow( {data: treatment} );
                            }
                        }
                    }

                    if( change.status === 'deleted' ) {
                    // On unchecking, the opsCode is simply removed from the correspondingTreatments. Consequent required
                    // updates are managed by subscriptions to the linkedTreatmentsTable
                        correspondingLinkedTreatments = table.editorModel.linkedTreatmentsTable.rows().filter( function( row ) {
                            return ko.unwrap( row.code ) === treatment.code;
                        } );

                        correspondingLinkedTreatments.forEach( function( correspondingLinkedTreatment ) {
                            correspondingLinkedTreatment.opsCodes.remove( treatment.opsCode );
                        } );
                    }
                } );
            }, null, "arrayChange" );
        }

        TreatmentsTable.prototype = {

            fetchData: function() {
                var self = this;

                return Promise.resolve( Y.doccirrus.jsonrpc.api.catalog.getEntriesByLocationId( {
                    locationId: self.editorModel.locationId(),
                    query: {seq: {$in: self.seqs}},
                    select: {seq: 1, title: 1, catalog: 1}
                } ) )
                    .then( function( res ) {
                        var
                            data = res && res.data || [],
                            convertedData, ebmCatalogNumber;

                    // The object is converted, so as to match the catalog fields to the corresponding TREATMENT-activity fields.
                        convertedData = data.map( function( item ) {
                            ebmCatalogNumber = item.catalog.match( /DC-EBM(\d+)(?=-D)/ ) && item.catalog.match( /DC-EBM(\d+)(?=-D)/ )[1] || "";

                            return {
                                code: item.seq,
                                opsCode: self.opsCode,
                                userContent: item.title,
                                catalogRef: item.catalog.replace( ebmCatalogNumber, "" )
                            };
                        } );

                        return self.tableComponent.data( convertedData );
                    } )
                    .catch( function(err){
                        Y.log( 'Failed to load Catalog Data from opsCode (' + self.opsCode + ') and locationId (' + self.editorModel.locationId() + ').' + err, 'error', NAME );
                        return [];
                    } );
            }
        };


        /**
         * @class SurgeryEditorModel
         * @constructor
         * @extends SimpleActivityEditorModel
         */
        function SurgeryEditorModel( config ) {
            SurgeryEditorModel.superclass.constructor.call( this, config );
        }

        SurgeryEditorModel.ATTRS = {
            whiteList: {
                value: SimpleActivityEditorModel.ATTRS.whiteList.value.concat( [
                    'fk5023',
                    'fk5024',
                    'fk5025',
                    'fk5026',
                    'fk5034',
                    'fk5037',
                    'fk5038'
                ] ),
                lazyAdd: false
            },
            validatable: {
                value: true,
                lazyAdd: false
            },
            subModelsDesc: {
                value: [
                    {
                        propName: 'linkedTreatments',
                        editorName: 'LinkedTreatmentEditorModel'
                    },
                    {
                        propName: 'fk5035Set',
                        editorName: 'Fk5035SurgeryEditorModel'
                    },
                    {
                        propName: 'fk5036Set',
                        editorName: 'Fk5036EditorModel'
                    }
                ],
                lazyAdd: false
            }
        };

        Y.extend( SurgeryEditorModel, SimpleActivityEditorModel, {
                initializer: function SurgeryEditorModel_initializer() {
                    this.initSurgeryEditorModel();
                },
                destructor: function SurgeryEditorModel_destructor() {
                    Y.doccirrus.communication.off( 'linkedTreatmentsCreated', 'SurgeryEditorModel' );
                },

                initSurgeryEditorModel: function SurgeryEditorModel_initSurgeryEditorModel() {
                    var
                        self = this,
                        currentActivity = ko.unwrap( self.get( 'currentActivity' ) ),
                        currentPatient = ko.unwrap( self.get( 'currentPatient' ) ),
                        activeTab = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                        caseFolderType = activeTab && activeTab.type,
                        EBM_RELEVANT_FIELDS_VISIBLE_FOR = ["PUBLIC"];

                // TRANSLATIONS ----------------------------------------------------------------------------------------
                    self.labelOpsCodesI18n = i18n( 'InCaseMojit.SurgeryEditorModel.opsCodes.label' );
                    self.sideLocalisationsI18n = i18n( 'InCaseMojit.SurgeryEditorModel.sideLocalisations' );
                    self.placeholderOpsCodesI18n = i18n( 'InCaseMojit.SurgeryEditorModel.opsCodes.placeholder' );
                    self.linkedTreatmentsI18n = i18n( 'InCaseMojit.SurgeryEditorModel.linkedTreatments' );
                    self.labelGnrJustI18n = i18n( 'InCaseMojit.casefile_detail.label.GNR_JUST' );
                    self.deletionConfirmationMessage = i18n( 'InCaseMojit.SurgeryEditorModel.modals.deletionConfirmationMessage' );
                    self.locationConfirmationMessage = i18n( 'InCaseMojit.SurgeryEditorModel.modals.locationConfirmationMessage' );

                // OBSERVABLES -----------------------------------------------------------------------------------------
                    self.locationId = currentActivity.locationId;
                    self.revertingLocationId = ko.observable( false );
                    self.treatmentsTables = ko.observableArray();
                    self.selectedTable = ko.observable();
                    self.ebmRelevantFieldsVisible = EBM_RELEVANT_FIELDS_VISIBLE_FOR.indexOf( caseFolderType ) > -1;

                // SUBSCRIPTIONS ---------------------------------------------------------------------------------------
                // - The treatmentsTables observable array is updated on a locationId change after asking for confirmation.
                    self.locationId.subscribe( function( oldValue ) {
                        if( self.revertingLocationId() ) {
                            return self.revertingLocationId( false );
                        } else {
                            Y.doccirrus.modals.surgeryConfirmationModal.show( self.locationConfirmationMessage )
                                .then( function(confirmation){
                                    if( confirmation ) {
                                        self.updateAllTreatmentsTables();
                                    } else {
                                        self.revertingLocationId( true );
                                        self.locationId( oldValue );
                                    }
                                } );
                        }
                    }, null, "beforeChange" );

                // - Managing the treatmentsTables through subscriptions instead of making it a computed observable
                //   allows to fine-tune the updating so as only to affect the tables concerned (they can take some time to load).
                    self.fk5035Set.subscribe( function( changes ) {
                        if ( currentActivity.inTransition() ) {
                            return;
                        }

                        changes.forEach( function( change ) {
                            if( change.status === 'added' ) {
                                self.addTreatmentsTable( change.value.fk5035, change.value.seqs );
                            }
                            if( change.status === 'deleted' ) {
                                self.removeTreatmentsTable( change.value.fk5035 );
                            }
                        } );
                    }, null, "arrayChange" );

                    self.treatmentsTables.subscribe( function( changes ) {
                        changes.forEach( function( change ) {
                            if( change.status === 'added' ) {
                                self.tableNavigation.addItems( [
                                    {
                                        name: change.value.opsCode,
                                        text: change.value.opsCode,
                                        active: true,
                                        click: function( item  ) {
                                            item.active( true );
                                            self.selectTable( item.text );
                                        }
                                    }
                                ] );
                            }
                            if( change.status === 'deleted' ) {
                                self.tableNavigation.removeItemsByName( change.value.opsCode );
                            }
                        } );
                    }, null, "arrayChange" );

                // On saving the SURGERY, 'linkedTreatmentsCreated' is emitted when the post process is completed, which
                // will trigger the update the linkedTreatmentsTable.
                    Y.doccirrus.communication.on( {
                        event: 'linkedTreatmentsCreated',
                        handlerId: 'SurgeryEditorModel',
                        done: function( response ) {
                            self.linkedTreatmentsTable.removeAllRows();

                            currentActivity.set("updatingAfterSave", true);

                            response.data.forEach(function(linkedTreatment) {
                                self.linkedTreatmentsTable.addRow({ data: linkedTreatment });
                            });

                        }
                    } );

                // SET-UP ----------------------------------------------------------------------------------------------
                    self.initselect2OpsCodes();
                    self.initTableNavigation();
                    self.initLinkedTreatmentsTable();
                    self.loadTreatmentsTables();
                },

            // OPS CODE SELECTION ======================================================================================
                initselect2OpsCodes: function() {
                    var
                        self = this;

                    self.select2OpsCodes = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                return self.fk5035Set().map( function( fk5035Entry ) {
                                    return {
                                        id: ko.unwrap( fk5035Entry.fk5035 ),
                                        code: ko.unwrap( fk5035Entry.fk5035 )
                                    };
                                } );
                            },
                            write: function( event ) {
                                var fk5035Entry;
                                if( event.added ) {
                                    fk5035Entry = {
                                        fk5035: event.added.code,
                                        seqs: event.added.seqs,
                                        catalogEntry: event.added.catalogEntry
                                    };
                                    self.addFk5035Entry( fk5035Entry );
                                }
                                if( event.removed ) {
                                    self.removeFk5035EntryByOpsCode( event.removed.code );
                                }
                            }
                        }, self ) ),
                        select2: {
                            width: '100%',
                            placeholder: self.placeholderOpsCodesI18n,
                            minimumInputLength: 1,
                            multiple: true,
                            query: self.select2OpsCodesQuery,
                            formatSelection: function( result ) {
                                return result.id;
                            }
                        }
                    };
                },

                select2OpsCodesQuery: function( query ) {
                    Y.doccirrus.jsonrpc.api.opscode.searchByCodeOrName( {query: query.term} )
                        .done( function( response ) {
                            response = response && response.data || [];

                            var results = response.map( function( opsEntry ) {
                                return Object.assign( opsEntry, {
                                    id: opsEntry.code,
                                    text: opsEntry.code + ' (' + opsEntry.name + ')',
                                    catalogEntry: {
                                        kzseite: opsEntry.kzseite
                                    }
                                } );
                            } );
                            query.callback( {results: results} );
                        } ).fail( function() {
                        query.callback( {results: []} );
                    } );
                },

            // TREATMENTS TABLES ACTIONS ===============================================================================
                // Table Load ------------------------------------------------------------------------------------------
                loadTreatmentsTables: function() {
                    var self = this;

                    self.treatmentsTables( [] ); // Empty the treatmentsTables array, in case the function is called to reload the tables
                    return Promise.all( self.fk5035Set().map( function( entry ) {
                        return self.addTreatmentsTable( entry.fk5035, entry.seqs );
                    } ) ).then( function() {
                        return self.checkAllLinkedTreatments();
                    });
                },
                checkAllLinkedTreatments: function() {
                    var self = this;

                    self.linkedTreatments().forEach( function( treatment ) {
                        self.checkTreatmentsByCodeAndOpsCodes( {
                            code: treatment.code,
                            opsCodes: treatment.opsCodes
                        } );
                    } );
                },
                // Table Update ----------------------------------------------------------------------------------------
                updateAllTreatmentsTables: function() {
                    // Note that on updating all tables, existing linked treatments will be lost.
                    var self = this;

                    self.treatmentsTables().forEach( function( treatmentsTable ) {
                        treatmentsTable.tableComponent.getComponentColumnCheckbox().uncheckAll(); // This is to remove existing linked treatments
                        treatmentsTable.fetchData(); // The tables already exist, simply need to update the data.
                    } );
                },
                // Add Table -------------------------------------------------------------------------------------------
                addTreatmentsTable: function( opsCode, seqs ) {
                    // The seqs would not be strictly needed to create a new table, but they allow to optmisie the catalog search.
                    var self = this;
                    opsCode = ko.unwrap( opsCode );
                    seqs = ko.unwrap( seqs );

                    // Initialise Table
                    var treatmentsTable = new TreatmentsTable( {
                        opsCode: opsCode,
                        seqs: seqs,
                        editorModel: self
                    } );

                    self.treatmentsTables.push( treatmentsTable );
                    self.selectTable( treatmentsTable.opsCode );

                    // Fetch Data
                    return new Promise( function( resolve ) {
                        treatmentsTable.fetchData()
                            .then( function() {
                                resolve( treatmentsTable );
                            } );
                    } );
                },
                // Remove Table ----------------------------------------------------------------------------------------
                removeTreatmentsTable: function( opsCode ) {
                    var self = this;
                    opsCode = ko.unwrap( opsCode );

                    self.treatmentsTables.remove( function( table ) {
                        if( table.opsCode === opsCode ) {
                            table.tableComponent.getComponentColumnCheckbox().uncheckAll(); // Uncheck everything before deleting, to update the linkedTreatments
                            return true;
                        }
                    } );
                    if( self.selectedTable() && self.selectedTable().opsCode === opsCode ) {
                        self.selectTable(); // Selects the first table, if there is.
                    }
                },
                // Select Table ----------------------------------------------------------------------------------------
                selectTable: function( opsCode ) {
                // If called without arguments, the first table will be selected.
                    var self = this;
                    opsCode = ko.unwrap( opsCode );

                    if( opsCode ) {
                        return self.selectedTable( _.find( self.treatmentsTables(), function( treatmentsTable ) {
                            return treatmentsTable.opsCode === opsCode;
                        } ) );
                    } else {
                        self.tableNavigation.activateTab( 0 );
                        return self.selectedTable( self.treatmentsTables().length && self.treatmentsTables()[0] || null );
                    }
                },

            // TREATMENTS TABLES CHECKING ACTIONS ======================================================================
                checkTreatmentsByCodeAndOpsCodes: function( selector ) {
                    var
                        self = this,
                        selectionList = self.selectTreatmentsAndTreatmentTablesByCodeAndOpsCodes( selector ),
                        correspondingTreatmentsTable, treatmentToCheck;

                    selectionList.forEach(function(selection) {
                        correspondingTreatmentsTable = selection.correspondingTreatmentsTable;
                        treatmentToCheck = selection.correspondingTreatment;

                        correspondingTreatmentsTable.tableComponent.getComponentColumnCheckbox().check( treatmentToCheck );
                    });
                },
                uncheckTreatmentsByCodeAndOpsCodes: function( selector ) {
                    var
                        self = this,
                        selectionList = self.selectTreatmentsAndTreatmentTablesByCodeAndOpsCodes( selector ),
                        correspondingTreatmentsTable, treatmentToUncheck;

                    selectionList.forEach(function(selection) {
                        correspondingTreatmentsTable = selection.correspondingTreatmentsTable;
                        treatmentToUncheck = selection.correspondingTreatment;

                        correspondingTreatmentsTable.tableComponent.getComponentColumnCheckbox().uncheck( treatmentToUncheck );
                    });
                },
                uncheckTreatmentByActivityId: function( activityId ) {
                    var
                        self = this,
                        selectionList = self.selectTreatmentAndTreatmentTablesByActivityId( activityId ),
                        correspondingTreatmentsTable, treatmentToUncheck;

                    selectionList.forEach(function(selection) {
                        correspondingTreatmentsTable = selection.correspondingTreatmentsTable;
                        treatmentToUncheck = selection.correspondingTreatment;

                        correspondingTreatmentsTable.tableComponent.getComponentColumnCheckbox().uncheck( treatmentToUncheck );
                    });
                },

                selectTreatmentsAndTreatmentTablesByCodeAndOpsCodes: function( selector ) {
                    var
                        self = this,
                        selectionList = [],
                        code = ko.unwrap( selector.code ) || null,
                        opsCodes = ko.unwrap( selector.opsCodes ) || [],
                        correspondingTreatmentsTable,
                        correspondingTreatment;

                    opsCodes.forEach(function(opsCode) {
                        correspondingTreatmentsTable = self.treatmentsTables().find( function( treatmentTable ) {
                            return treatmentTable.opsCode === opsCode;
                        } );

                        if( correspondingTreatmentsTable ) {
                            correspondingTreatment = correspondingTreatmentsTable.tableComponent.rows().find( function( treatment ) {
                                return treatment.code === code;
                            } );
                        }

                        if ( correspondingTreatmentsTable && correspondingTreatment ) {
                            selectionList.push({
                                correspondingTreatmentsTable: correspondingTreatmentsTable,
                                correspondingTreatment: correspondingTreatment
                            });
                        }
                    });

                    return selectionList;
                },
                selectTreatmentAndTreatmentTablesByActivityId: function( activityId ) {
                    var
                        self = this,
                        correspondingLinkedTreatment;

                    correspondingLinkedTreatment = self.linkedTreatments().find( function( linkedTreatment ) {
                        return ko.unwrap( linkedTreatment.activityId ) === ko.unwrap(activityId);
                    } );

                    return self.selectTreatmentsAndTreatmentTablesByCodeAndOpsCodes( {
                        code: correspondingLinkedTreatment && correspondingLinkedTreatment.code || null,
                        opsCodes: correspondingLinkedTreatment && correspondingLinkedTreatment.opsCodes || null
                    } );
                },

                isLinkedTreatmentRowUnique: function( selector ) {
                    var self = this;
                    var activityId, code, opsCodes, selectedRow, correspondingTreatmentRows;

                    if( typeof selector === 'string' ) { // activityId
                        activityId = selector;
                        selectedRow = self.linkedTreatments().find( function( linkedTreatment ) {
                            return ko.unwrap( linkedTreatment.activityId ) === activityId;
                        } );
                        code = ko.unwrap( selectedRow && selectedRow.code || null );
                        opsCodes = ko.unwrap( selectedRow && selectedRow.opsCodes || null );
                    } else if( typeof selector === 'object' ) { // code & opsCodes
                        code = ko.unwrap( selector.code );
                        opsCodes = ko.unwrap( selector.opsCodes );
                    }
                    correspondingTreatmentRows = self.linkedTreatments().filter( function( linkedTreatment ) {
                        return ko.unwrap( linkedTreatment.code ) === code && _.isEqual( ko.unwrap( linkedTreatment.opsCodes ), opsCodes );
                    } );
                    return correspondingTreatmentRows.length <= 1;
                },

            // TABLE NAVIGATION ========================================================================================
                initTableNavigation: function() {
                    var self = this;

                    self.tableNavigation = KoComponentManager.createComponent( {
                        componentType: 'KoNav'
                    } );
                },

            // SELECTED TREATMENTS =====================================================================================
                initLinkedTreatmentsTable: function() {
                    var self = this,
                    currentActivity = self.get('currentActivity')();

                    self.linkedTreatmentsTable = KoComponentManager.createComponent( {
                        componentType: 'KoEditableTable',
                        stateId: 'linked-treatments-table-op',
                        componentConfig: {
                            ViewModel: LinkedTreatmentModel,
                            columns: [
                                {
                                    forPropertyName: 'code',
                                    label: seqCodeI18n,
                                    width: '120px'
                                },
                                {
                                    forPropertyName: 'opsCodes',
                                    label: opsCodesI18n,
                                    width: '130px',
                                    renderer: function( meta ) {
                                        return ko.unwrap( meta.value ).join( ', ' );
                                    }
                                },
                                {
                                    forPropertyName: 'quantity',
                                    label: quantityI18n,
                                    width: '70px'
                                },
                                {
                                    forPropertyName: 'userContent',
                                    label: textI18n
                                },
                                {
                                    forPropertyName: 'explanations',
                                    label: explanationsI18n
                                },
                                {
                                    forPropertyName: 'deleteButton',
                                    utilityColumn: true,
                                    width: '60px',
                                    css: {
                                        'text-center': 1
                                    },
                                    inputField: {
                                        componentType: 'KoButton',
                                        componentConfig: {
                                            name: 'delete',
                                            title: Y.doccirrus.i18n( 'general.button.DELETE' ),
                                            icon: 'TRASH_O',
                                            click: function( button, $event, $context ) {
                                                var
                                                    deletedTreatment = $context.$parent.row,
                                                    code = ko.unwrap( deletedTreatment.code ),
                                                    opsCode = ko.unwrap( deletedTreatment.opsCode );

                                                if( ko.unwrap( deletedTreatment.activityId ) ) { // existing Treatment
                                                    Y.doccirrus.modals.surgeryConfirmationModal.show( self.deletionConfirmationMessage )
                                                        .then( function(confirmation){
                                                            if( confirmation ) {
                                                                currentActivity._unlinkActivity( ko.unwrap( deletedTreatment.activityId ) );
                                                            }
                                                        } );
                                                } else {
                                                    if( self.isLinkedTreatmentRowUnique( {
                                                            code: code,
                                                            opsCode: opsCode
                                                        } ) ) {
                                                        self.uncheckTreatmentsByCodeAndOpsCodes( {
                                                            opsCodes: ko.unwrap( deletedTreatment.opsCodes ),
                                                            code: ko.unwrap( deletedTreatment.code )
                                                        } );
                                                    } else {
                                                        self.linkedTreatmentsTable.removeRow( deletedTreatment );
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            ],
                            isAddRowButtonVisible: function() {
                                return false;
                            },
                            getCssRow: function( $context, css ) {
                                css[ko.unwrap($context.$data.activityId) ? 'success' : 'warning'] = true;
                            }
                        }
                    } );

                    ko.computed( function() {
                        var rows = self.linkedTreatmentsTable.rows && self.linkedTreatmentsTable.rows() || [];

                        rows.forEach( function( row ) {
                            // This is to trigger the computed on a cell changes
                            ko.unwrap( row.quantity );
                            ko.unwrap( row.userContent );
                            ko.unwrap( row.explanations );

                            if( !ko.unwrap( row.opsCodes ).length ) {
                                if( ko.unwrap( row.activityId ) ) { // existing treatment
                                    self.get( 'currentActivity' )()._unlinkActivity( ko.unwrap( row.activityId ) );
                                }
                                self.linkedTreatmentsTable.removeRow( row );
                            }

                        } );

                        if( !ko.computedContext.isInitial() ) {
                            // This is to prevent emptying the inkedTreatments array on page load. Indeed on the initial load,
                            // The linkedTreatments observable array is used to initialize the linkedTreatmentsTable. (after that
                            // the source of truth is the linkedTreatmentsTable)
                            currentActivity.updateLinkedTreatments( rows.map( function( item ) {
                                return item.toJSON();
                            } ) );
                        }
                    } ).extend( {rateLimit: 200} ); // this is to prevent to many updates on single row change.
                },

            // SUBEDITORMODELS ACTIONS ---------------------------------------------------------------------------------
                addFk5035Entry: function( fk5035Entry ) {
                    this.get( 'currentActivity' )().addFk5035Entry( fk5035Entry );
                },
                removeFk5035EntryByOpsCode: function( opsCode ) {
                    this.get( 'currentActivity' )().removeFk5035EntryByOpsCode( opsCode );
                },
                addFk5036Set: function() {
                    this.get( 'currentActivity' )().addFk5036Set();
                },
                removeFk5036Set: function( fk5036Entry ) {
                    this.get( 'currentActivity' )().removeFk5036Set( fk5036Entry.get( 'dataModelParent' ) );
                },
                onActivityUnlinked: function( activityId ) {
                    var self = this;

                    if( self.isLinkedTreatmentRowUnique( activityId ) ) {
                        this.uncheckTreatmentByActivityId( activityId );
                    } else {
                        const removedTreatment = self.linkedTreatmentsTable.rows().find( function( row ) {
                            return ko.unwrap( row.activityId ) === activityId;
                        } );
                        self.linkedTreatmentsTable.removeRow( removedTreatment );
                    }
                }
            }, {
                NAME: 'SurgeryEditorModel'
            }
        );

        KoViewModel.registerConstructor( SurgeryEditorModel );
    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityEditorModel',
            'LinkedTreatmentModel',
            'LinkedTreatmentEditorModel',
            'SurgeryConfirmationModal'
        ]
    }
);
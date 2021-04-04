/**
 * User: rrrw
 * Date: 12.02.13  12:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
'use strict';

/*jslint anon:true, nomen:true */
/*global YUI, moment, jQuery, $, ko */
YUI.add( 'dcutils-uam', function( Y, NAME ) {

        var
            i18n = Y.doccirrus.i18n,
            ACTIVE_INGREDIENTS = i18n( 'utils_uam_clientJS.placeholder.ACTIVE_INGREDIENTS' ),
            ATC_NAME = i18n( 'utils_uam_clientJS.placeholder.ATC_NAME' ),
            PZN_CODES = i18n( 'utils_uam_clientJS.placeholder.PZN_CODES' ),
            TAGS = i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.label.TAGS' ),

            utilsObj,
            observableGlobalViewModel;

        utilsObj = function Utils() {

        };

        /***
         * Initializes collapsible panels with buttons for resizing or hiding attached elements.
         * Each button setting will be saved in local storage and restored on init.
         * @param selector
         */
        utilsObj.initDCPanels = function( selector ) {
            var panels,
                name,
                panelHeader,
                settings,
                actions,
                actionIcons;

            if( selector ) {
                panels = $( '[dc-panel]', selector );
            } else {
                panels = $( '[dc-panel]' );
            }

            function loadPanelSettings( panelName ) {
                return Y.doccirrus.utils.localValueGet( 'widget_' + panelName );
            }

            $.each( panels, function( index, element ) {
                panelHeader = $( element ).find( '.panel-heading' );
                if( panelHeader.length > 0 ) {
                    name = $( element ).attr( 'dc-panel' );
                    actions = $( element ).attr( 'dc-panel-actions' ).split( ',' );
                    actionIcons = '<span class="pull-right">';
                    actions.forEach( function( action ) {
                        switch( action ) {
                            case 'minimize':
                                actionIcons += '<a data-toggle="collapse" href="#' + name + '" tabindex="-1"><i class="fa fa-chevron-down dc-panel-toggle"></i></a>';
                                break;
                            case 'scalable':
                                actionIcons += '<a data-toggle="collapse" href="#' + name + '" tabindex="-1"><i class="fa fa-chevron-right dc-panel-toggle"></i></a>';
                                break;
                        }

                    } );
                    actionIcons += '</span>';

                    // It's dirty and quick - but it work's. If will try to do it better later - LG
                    if( panelHeader.find( '.fa-chevron-down' ).length > 0 ) {
                        panelHeader.find( '.fa-chevron-down' ).remove();
                    }

                    panelHeader.append( actionIcons );

                    settings = loadPanelSettings( name );
                    if( settings ) {
                        // load settings
                        settings = JSON.parse( settings );
                        //                        if( settings.minimized ) {
                        //                            //$( element ).find( '.panel-body' ).addClass( 'hide' );
                        //                        }
                    } else {
                        // add new settings object
                        settings = { minimized: false };
                        Y.doccirrus.utils.localValueSet( 'widget_' + name, JSON.stringify( settings ) );
                    }
                }
            } );

            $( 'body' ).on( 'hidden.bs.collapse', function( event ) {

                var container = $( event.target ).parents( '[dc-panel]:first' );
                if( container.length > 0 ) {
                    //container.find( '.panel-body' ).collapse();
                    Y.doccirrus.utils.localValueSet( 'widget_' + container.attr( 'dc-panel' ), JSON.stringify( { minimized: true } ) );
                }
            } );

            $( 'body' ).on( 'show.bs.collapse', function( event ) {

                var container = $( event.target ).parents( '[dc-panel]:first' );
                if( container.length > 0 ) {
                    Y.doccirrus.utils.localValueSet( 'widget_' + container.attr( 'dc-panel' ), JSON.stringify( { minimized: false } ) );
                }
            } );
        };

    /**
         * Utility function, finds an object in a list of knockout observable or
         * ordinary objects according to the value.
         *
         * @param list {Array} An array of observables or objects
         * @param value {Any} Value to search for in the - treated with ko.unwrap()
         * @param fieldName {String}  optional defaults to '_id'
         * @return undefined if not found or list empty. Otherwise returns the entire object found.
         */
        utilsObj.getObservableByVal = function( list, value, fieldName ) {
            fieldName = fieldName || '_id';
            var
                i;
            if( !Array.isArray( list ) ||
                    // be explicit here, because the user can use '' and FALSE to search
                null === value ||
                // ditto
                undefined === value ) {
                // return undefined
                return;
            }

            for( i = 0; i < list.length; i++ ) {
                if( value === ko.unwrap( list[i][fieldName] ) ) {
                    return list[i];
                }
            }
        };

        /**
         * returns the instance of GlobalViewModel
         * @returns {GlobalViewModel}
         */
        utilsObj.getObservableGlobals = function() {
            if( !observableGlobalViewModel ) {
                observableGlobalViewModel = new Y.doccirrus.uam.GlobalViewModel();
            }
            return observableGlobalViewModel;
        };

        /**
         * This class initializes select2 selector for Ingredients(Wirkstoffe) (has autocomplete)
         * @class MedicationIngredientList
         * @param {object} config
         * @param {ko.observableArray} config.dataArray array for selection data
         * @param {integer} [config.maxresult=10] parameter 'maxresult' for query to MMI API
         * @param {Boolean} [config.exactMatch] if not set or false will use "createSearchChoice"
         * @constructor
         */
        function MedicationIngredientList( config ) {
            config = config || {};
            Y.mix( this, config, true );
            this.config = config;
            this.initialize();
        }

        MedicationIngredientList.prototype = {
            dataArray: null,
            constructor: MedicationIngredientList,
            initialize: function() {
                this.data = ko.computed( {
                    read: this._read,
                    write: this._write,
                    owner: this
                } );
                this.placeholder = ko.observable( ACTIVE_INGREDIENTS );
                this.select2 = {
                    multiple: true,
                    minimumInputLength: 1,
                    formatResult: this._select2FormatResult,
                    formatSelection: this._select2FormatSelection,
                    createSearchChoice: this.config.exactMatch ? undefined : this._createSearchChoice.bind( this ),
                    query: this._query
                };
            },
            _write: function( $event ) {
                var dataArray = this.dataArray;
                if( Y.Object.owns( $event, 'added' ) ) {
                    dataArray.push(
                        {
                            code: $event.added.id,
                            name: $event.added.name
                        } );
                }
                if( Y.Object.owns( $event, 'removed' ) ) {
                    dataArray.remove( function( item ) {
                        return $event.removed.id === item.code;
                    } );
                }
            },
            _createSearchChoice: function( term ) {
                if( this.config.exactMatch ) {
                    return null;
                }
                return { id: term, name: term };
            },
            _read: function() {
                var dataArray = this.dataArray;
                return ko.unwrap( dataArray ).map( this._select2Mapper );
            },
            _select2Mapper: function( item ) {
                return {id: item.code, name: item.name};
            },
            _query: function( query ) {
                var maxresult = this.maxresult || 10;
                Y.doccirrus.jsonrpc.api.mmi.getMolecules( {query: {
                    name: query.term,
                    maxresult: maxresult
                }} ).done( function( response ) {
                        var results = response.data && response.data.MOLECULE.map( function( item ) {
                            return {
                                id: item.ID,
                                name: item.NAME
                            };
                        } );
                        query.callback( {
                            results: results
                        } );
                    }
                )
                    .fail( function(){
                        query.callback( {
                            results: []
                        } );
                    });
            },
            _select2FormatResult: function( query ) {
                var name = query.name;
                return '<div class="dc-formatResult" title="' + name + '">' + name + '</div>';
            },
            _select2FormatSelection: function( query ) {
                return query.name;
            }
        };

        /**
         * This class initializes select2 selector for ATC code and name (has autocomplete)
         * @class MedicationATCList
         * @param {object} config
         * @param {ko.observableArray} config.dataArray array for selection data
         * @param {integer} [config.maxresult=10] parameter 'maxresult' for query to MMI API
         * @constructor
         */
        function MedicationATCList( config ) {
            config = config || {};
            Y.mix( this, config, true );
            this.initialize();
        }

        MedicationATCList.prototype = {
            dataArray: null,
            constructor: MedicationATCList,
            initialize: function() {
                this.data = ko.computed( {
                    read: this._read,
                    write: this._write,
                    owner: this
                } );
                this.placeholder = ko.observable( ATC_NAME );
                this.select2 = {
                    multiple: true,
                    minimumInputLength: 1,
                    formatResult: this._select2FormatResult,
                    query: this._query
                };
            },
            _write: function( $event ) {
                var self = this,
                    dataArray = self.dataArray;
                if( Y.Object.owns( $event, 'added' ) ) {
                    dataArray.push( $event.added.text );
                }
                if( Y.Object.owns( $event, 'removed' ) ) {
                    dataArray.remove( $event.removed.text );
                }
            },
            _read: function() {
                var dataArray = this.dataArray;
                return ko.unwrap( dataArray ).map( this._select2Mapper );
            },
            _select2Mapper: function( item ) {
                return {
                    id: item,
                    text: item
                };
            },
            _query: function( query ) {
                var self = this,
                    nameCheck = /^\s*[a-z]{2,}/i,
                    checkcode = /^\s*([a-z](\d{2}([a-z]([a-z](\d{2})?)?)?)?)/i,
                    codeRequest,
                    codeLevels = [],
                    maxresult = self.maxresult || 10;

                function select2Mapper( item ) {
                    var result;

                    function map( item ) {
                        return {
                            id: item.CODE,
                            text: item.CODE,
                            name: item.NAME
                        };
                    }

                    result = map( item );
                    return result;
                }

                if( nameCheck.exec( query.term ) ) {
                    Y.doccirrus.jsonrpc.api.mmi.getATCCatalogEntries( {query: {
                        name: query.term,
                        maxresult: maxresult
                    }} ).done( function( response ) {
                        var results = [];
                        if( response.data ) {
                            results = response.data.CATALOGENTRY.map( select2Mapper );
                        }
                        query.callback( {
                            results: results
                        } );

                    } );
                } else {
                    codeLevels = checkcode.exec( query.term );
                    if( codeLevels ) {
                        codeRequest = codeLevels[0];
                    }
                    Y.doccirrus.jsonrpc.api.mmi.getATCCatalogEntries( {query: {
                        code: codeRequest,
                        maxresult: maxresult,
                        children: 3
                    }} ).done( function( response ) {
                        var results = [];
                        if( response.data ) {
                            results = response.data.CATALOGENTRY.map( select2Mapper );
                            response.data.CATALOGENTRY.forEach( function( catalogEntry ) {
                                if( catalogEntry.CHILD_LIST ) {
                                    catalogEntry.CHILD_LIST.forEach( function( item ) {
                                        var mappedItem = select2Mapper( item );
                                        results.push( mappedItem );
                                    } );
                                }
                            } );
                        }
                        query.callback( {
                            results: results
                        } );

                    } );
                }
            },
            _select2FormatResult: function( query ) {
                var code = query.id,
                    name = query.name;
                return '<div class="dc-formatResult" title="' + code + '">' + name + ' - ' + code + '</div>';
            }
        };
        /**
         * This class initializes select2 selector for PZN
         * @class MedicationPznList
         * @param {object} config
         * @param {ko.observableArray} config.dataArray array for selection data
         * @constructor
         */
        function MedicationPznList( config ) {
            config = config || {};
            Y.mix( this, config, true );
            this.initialize();
        }

        MedicationPznList.prototype = {
            dataArray: null,
            initialize: function() {
                this.data = ko.computed( {
                    read: this._read,
                    write: this._write,
                    owner: this
                } );
                this.select2 = {
                    multiple: true,
                    placeholder: PZN_CODES,
                    tokenSeparators: [",", " "],
                    createSearchChoice: this._createSearchChoice,
                    minimumInputLength: 1,
                    query: this._query
                };

            },
            constructor: MedicationPznList,
            _write: function( $event ) {
                var dataArray = this.dataArray;
                if( Y.Object.owns( $event, 'added' ) ) {
                    dataArray.push( $event.added );
                }
                if( Y.Object.owns( $event, 'removed' ) ) {
                    dataArray.remove( $event.removed );
                }

            },
            _read: function() {
                var dataArray = this.dataArray;
                return dataArray();
            },
            _createSearchChoice: function( term ) {
                return {
                    id: term,
                    text: term
                };
            },
            _query: function( query ) {
                query.callback( {
                    results: [
                        {
                            id: query.term,
                            text: query.term
                        }
                    ]
                } );
            }
        };

        utilsObj.MedicationPznList = MedicationPznList;
        utilsObj.MedicationIngredientList = MedicationIngredientList;
        utilsObj.MedicationATCList = MedicationATCList;

        /**
         * This class initializes select2 selector for Tags
         * @class CatalogUsageTagList
         * @param {object} config
         * @param {ko.observableArray} config.dataArray array for selection data
         * @param {String} config.catalogShort short name of catalog, e.g. EBM, GOÄ.
         * @param {String} [config.placeholder] placeholder
         * @constructor
         */
        function CatalogUsageTagList( config ) {
            var self = this;

            config = config || {};
            Y.mix( self, config, true );
            self._data = [];
            Y.doccirrus.uam.ViewModel.createAsync( {
                cache: self.useCache ? utilsObj : {},
                cacheTimeout: 400,
                initialValue: [],
                jsonrpc: {
                    fn: Y.doccirrus.jsonrpc.api.tag.read,
                    params: ko.computed( function() {
                        var catalogShort = ('function' === typeof self.catalogShort) && self.catalogShort();
                        if( !catalogShort ) {
                            return null;
                        }
                        return {
                            query: {
                                catalogShort: catalogShort
                            }
                        };
                    } )
                },
                converter: function( response ) {
                    self._data.length = 0;
                    response.data.map( function( document ) {
                        return document.title;
                    } ).forEach( self.tagMapper.bind( self ) );
                    if( 'function' === typeof self.onDataLoad ) {
                        self.onDataLoad( self._data );
                    }
                    return response;
                }
            } );

            self.initialize();

        }

        CatalogUsageTagList.prototype = {
            dataArray: null,
            _data: [],
            tagMapper: function( tag ) {
                var self = this;
                self._data.push( {
                    id: tag,
                    text: tag
                } );
            },
            initialize: function() {
                var self = this;
                self.data = ko.computed( {
                    read: self._read,
                    write: self._write,
                    owner: self
                } );
                self.placeholder = ko.observable( self.placeholder || TAGS );
                self.select2 = {
                    multiple: true,
                    tokenSeparators: [',', ' '],
                    createSearchChoice: self.exactMatch ? undefined : self._createSearchChoice,
                    minimumInputLength: 1,
                    data: self._data,
                    formatSelection: self._formatSelection
                };

            },
            onDataLoad: function() {
                //overwrite me
            },
            constructor: CatalogUsageTagList,
            _formatSelection: function( item ) {
                return item.text;
            },
            _select2Mapper: function( item ) {
                return {
                    id: item,
                    text: item
                };
            },
            _write: function( $event ) {
                var dataArray = this.dataArray;
                if( Y.Object.owns( $event, 'added' ) ) {
                    dataArray.push( $event.added.id );
                }
                if( Y.Object.owns( $event, 'removed' ) ) {
                    dataArray.remove( $event.removed.id );
                }

            },
            _read: function() {
                var dataArray = this.dataArray;
                return dataArray().map( this._select2Mapper );
            },
            _createSearchChoice: function( term ) {
                return {
                    id: term,
                    text: term
                };
            }
        };

        utilsObj.CatalogUsageTagList = CatalogUsageTagList;

        utilsObj.checkPrescription = function( args ) {
            var activity = args.activity,
                prescId = activity._id(),
                employee = activity.employee(),
                patient = args.patient,
                caseFolder = args.caseFolder,
                // MOJ-14319: [OK] [CASEFOLDER]
                publicInsurance = patient && patient.getPublicInsurance( caseFolder && caseFolder.type ),
                locationId = activity.locationId(),
                locations = args.locations,
                location,
                params,
                lanr = employee ? employee.officialNo : '';

            (locations || []).some( function( loc ) {
                if( loc._id === locationId ) {
                    location = loc;
                    return true;
                }
            } );

            if( !location ) {
                return Promise.reject( Error( 'could not find location' ) );
            }

            params = {
                query: {
                    prescId: prescId,
                    insuranceIknr: publicInsurance && publicInsurance.insuranceId() || '',
                    patientAge: patient.age(),
                    bsnr: location.commercialNo || '',
                    lanr: lanr || ''
                }
            };

            return Promise.resolve( Y.doccirrus.jsonrpc.api.mmi.getCompareableMedications( params ) ).then( function( response ) {
                var data = response && response.data;
                if( !data || !data.length ) {
                    return {success: true};
                }
                return new Promise( function( resolve, reject ) {
                    Y.doccirrus.uam.utils.showMedicationCompareDialog( {
                        data: data,
                        callback: function( err, result ) {
                            if( err ) {
                                return reject( err );
                            }
                            resolve( result );
                        }
                    } );
                } );
            } ).catch( function( err ) {
                Y.log( 'could not check prescription: ' + err, 'error', NAME );
                throw err;
            } );
        };

        /**
         * shows a compare dialog for Medication data
         * @method showMedicationCompareDialog
         * @for doccirrus.uam.utils
         * @param {Object} parameters configuration
         * @param {Array} parameters.data Array of Object with properties 'original', 'updated' of Medication models
         * @param {Function} parameters.callback callback node js style (error, result) result have properties 'success', 'data'
         *                                       success true only when confirmed by user, false in case of closed, cancelled or no differences
         *                                       data the data you passed
         * @return {{window: DCWindow}} the dialog instance if one was created
         */
        utilsObj.showMedicationCompareDialog = function showMedicationCompareDialog( parameters ) {
            var
                data2Compare = parameters.data,
                callback = parameters.callback,
                callbackData = { data: data2Compare },
                diffPatientsViewModel = {
                    // Array of property names to ignore on conflict
                    ignores: [
                        'activity.phIngr'
                    ],
                    // conflicted properties holder per medication
                    tables: ko.observableArray( [] ),
                    // template format function for values
                    format: function( text ) {
                        var unwrap = ko.unwrap( text );
                        if( Y.doccirrus.regexp.iso8601.test( unwrap ) ) {
                            return moment( unwrap ).format( 'DD.MM.YYYY ( HH:mm )' );
                        }
                        return text;
                    }
                },
            // property name of data to use as label
                propertyNameLabel = 'activity.content',

                hasConflicts,
                node,
                aDCWindow,

                me = utilsObj.showMedicationCompareDialog,
                isConsideredSame = me.isConsideredSame,
                Conflict = me.Conflict,
                isConflict = me.isConflict;

            // consider this key as property to check for conflicts
            function isValidProperty( key ) {
                if( diffPatientsViewModel.ignores.indexOf( key ) > -1 ) {
                    return false;
                }
                return true;
            }

            // iterate data for conflicts
            Y.each( data2Compare, function( item ) {
                var
                    dataOriginal = item.original,
                    dataUpdated = item.updated,
                // unique property name list of both data sets
                    itemKeys = Y.Array.dedupe( [].concat( Y.Object.keys( dataOriginal ), Y.Object.keys( dataUpdated ) ) ),
                // property items
                    tableData = [],
                // medication item
                    tableItem = {
                        label: dataOriginal[propertyNameLabel],
                        data: tableData
                    };

                // create conflicts
                Y.each( itemKeys, function( key ) {
                    if( isValidProperty( key ) && !isConsideredSame( dataOriginal[key], dataUpdated[key] ) && isConflict( dataOriginal[key], dataUpdated[key] ) ) {
                        tableData.push( new Conflict( {
                            property: key,
                            valueOriginal: dataOriginal[key],
                            valueUpdated: dataUpdated[key]
                        } ) );
                    }
                } );

                // no conflicts no add
                if( tableData.length ) {

                    tableData.sort( function( a, b ) {
                        return a.label.localeCompare( b.label );
                    } );

                    diffPatientsViewModel.tables.push( tableItem );
                }

            } );

            // detect initial conflicts
            hasConflicts = Y.Array.some( diffPatientsViewModel.tables(), function( table ) {
                return Y.Array.some( table.data, function( data ) {
                    return !Boolean( data.length );
                } );
            } );

            // show the dialog or call callback immediately
            if( hasConflicts ) {

                node = Y.Node.create( '<div></div>' );

                // load table template & bind a ViewModel
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'casefile_diffcatalog',
                    'InCaseMojit',
                    {},
                    node,
                    function templateLoaded() {
                        ko.applyBindings( diffPatientsViewModel, node.getDOMNode() );
                    }
                );

                // create Window to show diff table
                aDCWindow = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-DiffPatient',
                    bodyContent: node,
                    title: 'Katalogänderungen festgestellt',
                    icon: Y.doccirrus.DCWindow.ICON_WARN,
                    width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    height: 400,
                    minHeight: 400,
                    minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: [
                            Y.doccirrus.DCWindow.getButton( 'close', {
                                action: function( e ) {
                                    e.target.button.disable();
                                    aDCWindow.close();

                                    callbackData.success = false;
                                    callback( null, callbackData );
                                }
                            } ),
                            'maximize'
                        ],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                action: function( e ) {
                                    e.target.button.disable();
                                    aDCWindow.close();

                                    callbackData.success = false;
                                    callback( null, callbackData );
                                }
                            } ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                action: function( e ) {
                                    e.target.button.disable();
                                    aDCWindow.close();

                                    callbackData.success = true;
                                    callback( null, callbackData );
                                }
                            } )
                        ]
                    }
                } );

            } else {
                callbackData.success = true;
                callback( null, callbackData );

            }

            // bye
            return { window: aDCWindow };
        };
        /**
         * primitive value validator
         * @param value
         * @return {boolean}
         */
        utilsObj.showMedicationCompareDialog.isPrimitive = function showMedicationCompareDialog_isPrimitive( value ) {
            return !Y.Lang.isArray( value ) && !Y.Lang.isObject( value ) && !Y.Lang.isFunction( value );
        };
        /**
         * Conflict class which is generated for conflicts
         * @constructor Conflict
         * @param {Object} config
         * @param {String} config.property dot-limited path to schema > label will be build from
         * @param {Object} config.valueOriginal
         * @param {Object} config.valueUpdated
         */
        utilsObj.showMedicationCompareDialog.Conflict = function showMedicationCompareDialog_Conflict( config ) {
            config = config || {};
            this.property = config.property;
            this.valueOriginal = config.valueOriginal;
            this.valueUpdated = config.valueUpdated;

            this.label = Y.doccirrus.schemaloader.getSchemaByName( this.property )['-de'];
        };

        utilsObj.showMedicationCompareDialog.Conflict.prototype = {
            constructor: utilsObj.showMedicationCompareDialog.Conflict
        };
        /**
         * data equality check
         * @param a
         * @param b
         * @return {boolean}
         */
        utilsObj.showMedicationCompareDialog.isConsideredSame = function showMedicationCompareDialog_isConsideredSame( a, b ) {
            var
                sameValues = utilsObj.showMedicationCompareDialog.isConsideredSame.sameValues;

            if( sameValues.indexOf( a ) > -1 && sameValues.indexOf( b ) > -1 ) {
                return true;
            }

            return false;
        };
        /**
         * considered same values for equality check
         */
        utilsObj.showMedicationCompareDialog.isConsideredSame.sameValues = [ undefined, null, '', NaN ];

        /**
         * data comparator
         * @param a
         * @param b
         * @return {boolean}
         */
        utilsObj.showMedicationCompareDialog.isConflict = function showMedicationCompareDialog_isConflict( a, b ) {
            var
                isPrimitiveA = utilsObj.showMedicationCompareDialog.isPrimitive( a ),
                isPrimitiveB = utilsObj.showMedicationCompareDialog.isPrimitive( b );

            // type mismatch
            if( isPrimitiveA !== isPrimitiveB ) {
                return true;
            }

            if( isPrimitiveA ) {
                return a !== b;
            } else {
                return Y.doccirrus.comctl.fastHash( JSON.stringify( a ) ) !== Y.doccirrus.comctl.fastHash( JSON.stringify( b ) );
            }
        };

        /**
         * A helper method to create auto-completer for activity codes via the ko.bindingHandlers.autoComplete
         * @method createActivityCodeAutoComplete
         * @param {Object} config
         * @param {ko.observable} config.field
         * @param {Object} config.getCatalogCodeSearchParams a function which have to return null or an object with query
         * @param {ActivityModel} [config.activity] provide and receive additional code results
         * @param {Object} [config.select2] a ko.bindingHandlers.select2 object to overwrite the defaults
         * @param {Y.EventTarget} [config.eventTarget]
         * @return {Object} The select2 binder config
         */
        utilsObj.createActivityCodeAutoComplete = function createActivityCodeAutoComplete( config ) {
            var
                field = config.field,
                getCatalogCodeSearchParams = config.getCatalogCodeSearchParams,
                eventTarget = config.eventTarget,
                select2 = config.select2 || {},
                binderConfig = {};

            function select2Mapper( val ) {
                var disabled = false;
                // MOJ-4876 disable "Heilmittel" headings in select2
                if( val.catalogShort && -1 !== ['PHYSIO', 'LOGO', 'ERGO'].indexOf( val.catalogShort ) ) {
                    disabled = !Boolean( val.u_extra );
                }
                return {id: val.seq, text: val.title || '', _type: 'mapped', _data: val, disabled: disabled};
            }

            binderConfig.data = ko.computed( {
                read: function() {
                    var
                        code = field();

                    if( code ) {
                        return {id: code, text: code, _type: 'read'};
                    }
                    else {
                        return null;
                    }
                },
                write: function( $event ) {
                    field( $event.val );
                }
            } );

            binderConfig.select2 = Y.aggregate( {
                minimumInputLength: 1,
                allowClear: true,
                placeholder: i18n( 'utils_uam_clientJS.createActivityCodeAutoComplete.placeholder' ),
                dropdownAutoWidth: true,
                dropdownCssClass: 'dc-select2-createActivityCodeAutoComplete',
                formatResult: function( result, container, query, escapeMarkup ) {
                    var
                        term = query.term,
                        code = result.id,
                        text = result.text,
                        select2formatCode = [],
                        select2formatText = [];

                    window.Select2.util.markMatch( code, term, select2formatCode, escapeMarkup );
                    select2formatCode = select2formatCode.join( '' );
                    window.Select2.util.markMatch( text, term, select2formatText, escapeMarkup );
                    select2formatText = select2formatText.join( '' );

                    return Y.Lang.sub( [
                        '<div class="dc-select2-createActivityCodeAutoComplete-formatResult" title="{code}">',
                        '<span class="dc-select2-createActivityCodeAutoComplete-formatResult-code">{select2formatCode}</span>',
                        '<span class="dc-select2-createActivityCodeAutoComplete-formatResult-text">({select2formatText})</span>',
                        '</div>'
                    ].join( '' ), {
                        code: Y.Escape.html( code ),
                        select2formatCode: select2formatCode,
                        select2formatText: select2formatText
                    } );
                },
                formatResultCssClass: function( result ) {
                    var
                        type = 'textform-homecatalog';

                    if( result._data && 0 !== result._data.count && !result._data.count && !result._data.instockEntry ) {
                        type = 'textform-originalcatalog';
                    }

                    return type;
                },
                formatSelection: function( query ) {
                    return query.id;
                },
                query: function( query ) {
                    var
                        params = getCatalogCodeSearchParams();

                    if( params && params.query ) {
                        params.query.term = query.term;
                        Y.doccirrus.jsonrpc.api.catalog
                            .catalogCodeSearch( params )
                            .done( function( response ) {
                                var
                                    results = response.data,
                                    additionals = ko.unwrap( config.activity && config.activity._additionalCodeResults ),
                                    hasCode,
                                    exactCodeMatch;

                                results = results.map( select2Mapper );
                                hasCode = results.some( function( item, index ) {
                                    if( item.id === query.term ) {
                                        exactCodeMatch = results[index];
                                        return true;
                                    }
                                    return false;
                                } );
                                if( 0 === results.length || !hasCode ) {
                                    results.unshift( { id: query.term, text: query.term, _type: 'term' } );
                                }

                                if( 0 === results.length ) {
                                    if( Array.isArray( additionals ) && additionals.length ) {
                                        results = results.concat( additionals.map( select2Mapper ) );
                                    }
                                }
                                if( exactCodeMatch ) {
                                    results.splice( results.indexOf( exactCodeMatch ), 1 );
                                    results.unshift( exactCodeMatch );
                                }
                                query.callback( { results: results } );
                            } )
                            .fail( function( err ) {
                                Y.log( '"createActivityCodeAutoComplete": Catalog code search is failed, error: ' + err, 'debug', NAME );
                                query.callback( {results: []} );
                            } );
                    }
                    else {
                        query.callback( {results: []} );
                    }
                }
            }, select2, true );

            binderConfig.init = function createActivityCodeAutoComplete_binderConfig_init( element ) {

                (function blurSelection() {
                    // enables blurSelection handling of previous DcAutoComplete
                    // meaning: when input is blurred and the last results have exactly one entry, select it
                    var
                        $element = jQuery( element ),
                        $select2 = $element.data( 'select2' ),
                        currentLoaded = [];

                    $element.on( 'select2-loaded', function( $event ) {
                        currentLoaded = $event.items && $event.items.results || [];
                    } );

                    $element.on( 'select2-selected', function( $event ) {
                        var
                            choice = $event.choice,
                            choiceData = choice._data;

                        // for _type = 'term' no event is propagated
                        if( eventTarget ) {
                            if( 'term' !== choice._type ) {
                                eventTarget.fire( 'catalogItemSelected', {
                                    catalogItem: choiceData
                                } );
                            } else {
                                eventTarget.fire( 'customItemSelected', {
                                    customItem: choice
                                } );
                            }

                        }
                    } );

                    $element.on( 'select2-close', function() {
                        var
                            val = $select2.val();

                        if( 1 === currentLoaded.length && val !== currentLoaded[0].id ) {
                            $select2.onSelect( currentLoaded[0] );
                        }
                    } );

                })();

            };

            return binderConfig;
        };

        utilsObj.createOfficialNoAutoComplete = function createActivityCodeAutoComplete( model ) {

            return {
                val: model.addDisposable( ko.computed( {
                    read: function() {
                        var officialNo = ko.unwrap( model.officialNo );
                        return officialNo;
                    },
                    write: function( $event ) {
                        model.officialNo( $event.val );
                        model.nonStandardOfficialNo( $event && $event.added && $event.added.nonStandard === true );
                    }
                } ) ),
                select2: {
                    minimumInputLength: 1,
                    allowClear: true,
                    placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                    initSelection: function( element, callback ) {
                        var officialNo = model.officialNo();
                        callback( {id: officialNo, text: officialNo} );
                    },
                    query: function( query ) {

                        function done( data ) {
                            var
                                results = [].concat( data );

                            // reject existing "Ersatzwert"
                            results = Y.Array.filter( results, function( item ) {
                                return '999999900' !== item.lanr;
                            } );
                            // first entry "Ersatzwert"
                            results.unshift( {
                                "lanr": "999999900",
                                "parentBsnr": "",
                                "bsnrList": [],
                                "lanrList": []
                            } );
                            // map to select2
                            results = results.map( function( item ) {
                                return {id: item.lanr, text: item.lanr, _data: item};
                            } );
                            // publish results
                            query.callback( {
                                results: results
                            } );
                        }

                        // handle not having a catalog
                        if( null === Y.doccirrus.catalogmap.getCatalogSDAV() ) {
                            return done( [] );
                        } else {
                            jQuery
                                .ajax( {
                                    type: 'GET', xhrFields: {withCredentials: true},
                                    url: Y.doccirrus.infras.getPrivateURL( '/r/catsearch/' ),
                                    data: {
                                        action: 'catsearch',
                                        catalog: Y.doccirrus.catalogmap.getCatalogSDAV().filename,
                                        itemsPerPage: 10,
                                        term: query.term,
                                        key: 'lanr'
                                    }
                                } )
                                .done( done )
                                .fail( function() {
                                    done( [] );
                                } );
                        }

                    },
                    formatResult: function format( result, container, query, escapeMarkup ) {
                        var
                            select2formatResult = [],
                            alternativeValueText = i18n( 'EmployeeModel.officialNo.alternativeValueText' ),
                            nonStandardValue = i18n( 'physician-schema.Physician_T.nonStandardOfficialNo.i18n' ),
                            postFix = '',
                            classNames = [];

                        window.Select2.util.markMatch( result.text, query.term, select2formatResult, escapeMarkup );
                        select2formatResult = select2formatResult.join( '' );

                        if( '999999900' === result.id ) {
                            postFix = ' <span class="select2-match">(' + alternativeValueText + ')</span>';
                        } else if( result.nonStandard === true ) {
                            postFix = ' <span class="select2-match">(' + nonStandardValue + ')</span>';
                        }

                        return Y.Lang.sub( '<span class="{classNames}">{text}{postFix}</span>', {
                            text: select2formatResult,
                            classNames: classNames.join( ' ' ),
                            postFix: postFix
                        } );
                    },
                    formatResultCssClass: function( result ) {
                        if( '999999900' === result.id ) {
                            return 'dc-select2-result-replacementValue';
                        } else {
                            return '';
                        }
                    },
                    createSearchChoice: function( term ){
                        return {
                            id: term,
                            text: term,
                            nonStandard: true
                        };
                    }
                }
            };

        };

        Y.namespace( 'doccirrus.uam' ).utils = utilsObj;

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'event-custom',
            'dcauth',
            'ko-bindingHandlers',
            'dc-comctl',
            'dcregexp',
            'dcvalidations',
            'dcglobalviewmodel',
            'dcutils-uam'
        ]
    }
)
;

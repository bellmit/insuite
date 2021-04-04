/**
 * User: do
 * Date: 20/01/16  17:25
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, _ */
'use strict';

YUI.add( 'dcRuleSetEditor', function( Y, NAME ) {

    var
        i18n = Y.doccirrus.i18n,
        cid = 0,
        unwrap = ko.utils.unwrapObservable,
        peek = ko.utils.peekObservable,
        validate = Y.doccirrus.ruleutils.validate,
        getMeta = Y.doccirrus.ruleutils.getMeta,
        KoViewModel = Y.doccirrus.KoViewModel,
        KoComponentManager = Y.doccirrus.KoUI.KoComponentManager;


    function isEntryRefArea( refArea ) {
        return refArea && 'ENTRY' === refArea;
    }

    /*
    function catalogCodeMapper( entry ) {
        if( entry.messages && !entry.title ) {
            entry.title = Y.doccirrus.schemas.catalog.getMessageInLanguage( entry.messages, Y.config.lang );
        }

        return { id: entry.seq, text: entry.title + ' (' + entry.seq + ')' };
    }
    */

    //Temporary to hide CARDIO codes
    function catalogCardioCodeMapper( entry ) {
        if( entry.messages && !entry.title ) {
            entry.title = Y.doccirrus.schemas.catalog.getMessageInLanguage( entry.messages, Y.config.lang );
        }
        return { id: entry.seq, text: entry.title };
    }

    function kvSelect2Mapper( entry ) {
        return { id: entry.kv, text: entry.name + ' (' + entry.kv + ')' };
    }

    function fail( response ) {
        var
            errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

        if( errors.length ) {
            Y.Array.invoke( errors, 'display' );
        }
    }

    function debounce( func, wait, immediate ) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if( !immediate ) {
                    func.apply( context, args );
                }
            };
            var callNow = immediate && !timeout;
            clearTimeout( timeout );
            timeout = setTimeout( later, wait );
            if( callNow ) {
                func.apply( context, args );
            }
        };
    }

    function findOperator( data, ruleEditor, rule ) {
        var operatorType, operatorContent;

        if( Array.isArray( data ) && data.length > 1 ) {
            operatorType = 'and';
            operatorContent = data;
        } else if( data.$and ) {
            operatorType = 'and';
            operatorContent = data.$and;
        } else if( data.$or ) {
            operatorType = 'or';
            operatorContent = data.$or;
        } else if( data.$not ) {
            operatorType = 'not';
            operatorContent = data.$not;
        } else if( Array.isArray( data ) && data.length === 1 ){
            if( data[0] && data[0].criteria ){
                operatorType = 'and';
                operatorContent = data;
            } else {
                return findOperator( data[0], ruleEditor, rule );
            }
        }
        if( !operatorContent || !operatorType ) {
            return;
        }
        return new RuleOperator( operatorType, operatorContent, ruleEditor, rule );
    }

    function Rule( data, ruleSetEditor ) {
        var
            self = this,
            operator;
        self.cid = ++cid;
        self.ruleId = ko.observable( data.ruleId || (new Y.doccirrus.mongo.ObjectId()).toString() );
        self.description = ko.observable( data.description || '' );
        self.isActive = ko.observable( 'boolean' === typeof data.isActive ? data.isActive : true );
        self.content = ko.observableArray();

        self.actions = ko.observableArray( (data.actions && data.actions.map( function( action ) {
                if( !(action.template instanceof Y.doccirrus.KoViewModel.getBase()) ) {
                    action.type = ko.observable( action.type );
                    action.template = KoViewModel.createViewModel( {
                        NAME: 'TaskTemplateModel', config: {
                            data: action.template || {},
                            type: action.type,
                            ruleSetEditor: ruleSetEditor
                        }
                    } );
                }
                return action;
            } )) || [] );

        self.displayAction = function( action ) {
            return Y.doccirrus.ruleutils.translate( unwrap( action.type ) );
        };

        self.ruleSetEditor = ruleSetEditor;

        self.data = data;
        if( data.validations ) {
            operator = findOperator( data.validations, ruleSetEditor, self );
            if( !operator ) {
                throw Error( 'no operator found' );
            }
            self.content( [operator] );
        }

        validate( self, {
            description: function( val ) {
                return !val ? 'Sie müssen eine Beschreibung eingeben!' : undefined;
            }
        } );
    }

    Rule.prototype.serialize = function() {
        var
            self = this,
            serializedRuleContent = self.content().map( function( ruleElement ) { // validation or operator
                return ruleElement.serialize();
            } );

        return {
            ruleId: unwrap( self.ruleId ),
            description: unwrap( self.description ),
            isActive: unwrap( self.isActive ),
            validations: (Array.isArray( serializedRuleContent ) &&
                          1 === serializedRuleContent.length &&
                          (serializedRuleContent[0].$or || serializedRuleContent[0].$and)) ? serializedRuleContent[0] : serializedRuleContent,
            actions: unwrap( self.actions || []).map( function( action ) {
                var tempAction = {
                    type: unwrap( action.type )
                };
                if( action.template ) {
                    //set templateId if missed
                    if ( !action.template.tempateID ) {
                        action.template.tempateID = ( new Y.doccirrus.mongo.ObjectId() ).toString();
                    } else if ( 'function' === typeof action.template.tempateID && !action.template.tempateID() ){
                        action.template.tempateID( ( new Y.doccirrus.mongo.ObjectId() ).toString() );
                    }
                    tempAction.template = action.template.toJSON();
                }
                return tempAction;
            } )
        };
    };

    Rule.prototype.remove = function( element ) {
        var
            self = this;
        return self.content.remove( element );
    };

    function RuleSetEditor( options ) {
        var
            self = this;

        self.changed = ko.observable( false );
        self.disposables = [];
        self.options = options || {};
        self.ruleSet = ko.observable( null );
        self.description = ko.observable();
        self.rules = ko.observableArray();
        self.referenceArea = ko.observable( null );
        self.periodType = ko.observable();
        self.periodCount = ko.observable( null );
        self.periodReference = ko.observable();
        self.caseFolderType = ko.observable( [] );
        self.isActive = ko.observable( true );
        self.isLocked = ko.observable( false );
        self.parent = ko.observable( null );

        self.kv = ko.observable( null );
        self.catalogShort = ko.observable( null );
        self.actType = ko.observable( null );
        self.code = ko.observable( null );

        self.markers = options.markers;
        self.severities = options.severities;
        self.taskTypes = options.taskTypes;
        self.employees = options.employees;

        self.validationErrors = ko.observableArray();

        self.areRulesValid = ko.pureComputed( function() {
            return self.rules().every( function( rule ) {
                    return rule.isValid();
                } ) && self.ruleSetInspector && self.ruleSetInspector.isValid();
        }, self );

        self.saveDisabled = ko.computed( function(){
            var changed = self.changed(),
                ruleSetInspectorVisible = self.ruleSetInspector && Boolean( self.ruleSetInspector.current() ),
                locked = (self.isLocked() && !self.options.isMasterDCFormTenant),
                widgetAttribute = ( self.ruleSetInspector && self.ruleSetInspector.attributeListValue() ) || false,
                widgetOperator = ( self.ruleSetInspector && self.ruleSetInspector.operatorListValue() ) || false,
                isValidation = ( self.ruleSetInspector && self.ruleSetInspector.isValidation() ) || false,
                valid = true,
                disabled;

            valid = valid && self.isValid && self.isValid();
            valid = valid && self.validationErrors().every( function( ve ){
                return ve.isValid();
            });
            valid = valid && self.areRulesValid();

            // if the rule-set inspector is visible, save button will be visible
            // MOJ-11811
            if( ruleSetInspectorVisible && valid ) {
                disabled = false;
                return disabled;
            }

            disabled = locked || !valid || !changed;
            return !widgetAttribute ?
                disabled : //widget not shown
                ( disabled || ( isValidation && !widgetOperator ) ); //need to check if operator for attribute is selected
        });

        self.showPeriod = ko.computed( function() {
            var referenceArea = self.referenceArea();
            return referenceArea === 'PERIOD';
        } );

        //Temporary to hide CARDIO codes
        self.showCardioCodeOption = ko.computed( function() {
            var referenceArea = self.referenceArea(),
                catalogShort = self.catalogShort();
            return isEntryRefArea( referenceArea ) && catalogShort &&
                   ('CARDIO' === catalogShort || 'BIOTRONIK' === catalogShort );
        } );

        self.showKVOption = ko.computed( function() {
            var referenceArea = self.referenceArea(),
                catalogShort = self.catalogShort();
            return isEntryRefArea( referenceArea ) && catalogShort && 'EBM' === catalogShort;
        } );

        self.kvAutocomplete = {
            val: ko.computed( {
                read: function() {
                    return self.kv();
                },
                write: function( $event ) {
                    self.kv( $event.val );
                }
            } ),
            select2: {
                placeholder: '',
                query: function( query ) {
                    Y.doccirrus.jsonrpc.api.catalog.getKvList().done( function( response ) {
                        query.callback( {
                            results: (response && response.data || []).map( kvSelect2Mapper )
                        } );

                    } ).fail( fail );
                },
                initSelection: function( element, callback ) {
                    var kv = self.kv();
                    if( !kv ) {
                        return callback( null );
                    }
                    Y.doccirrus.jsonrpc.api.catalog.getKvList( { kv: kv } ).done( function( response ) {
                        var data = response && response.data && response.data[0];
                        if( !data ) {
                            return callback( null );
                        }
                        callback( kvSelect2Mapper( data ) );

                    } ).fail( fail );
                }
            }
        };

        var
            caseFolderList = [],
            countryMode = Y.doccirrus.commonutils.getCountryModeFromConfigs() || [];

        try {
            caseFolderList = JSON.parse( JSON.stringify( Y.doccirrus.schemas.person.types.Insurance_E.list ) );
        } catch ( err ){
            Y.log( 'RuleSetEditor: error parsing caseFolderTypes' + err.stack || err, 'error', NAME );
        }

        // filter out casefolder specific for countries
        // not filter on masterTenant
        if( !self.options.isMasterDCFormTenant ){
            caseFolderList = caseFolderList.filter( function( el ){
                return _.intersection( (el.countryMode || []), countryMode).length;
            } );
        }
        const hasCardioLicense = Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.CARDIO ),
            hasDOQUVIDELicense = Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.DOQUVIDE ),
            hasDQSLicense = Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.DQS );

        if(hasCardioLicense) {
            caseFolderList.push( {
                val: 'CARDIO',
                i18n: i18n( 'casefolder-schema.Additional_E.CARDIO.i18n' )
            } );
            caseFolderList.push( {
                val: 'CARDIACFAILURE',
                i18n: i18n( 'casefolder-schema.Additional_E.CARDIACFAILURE.i18n' )
            } );
            caseFolderList.push( {
                val: 'STROKE',
                i18n: i18n( 'casefolder-schema.Additional_E.STROKE.i18n' )
            } );
        }
        if(hasDOQUVIDELicense ) {
            caseFolderList.push( {
                val: 'DOQUVIDE',
                i18n: i18n( 'casefolder-schema.Additional_E.DOQUVIDE.i18n' )
            } );
        }
        if(hasDQSLicense ) {
            caseFolderList.push( {
                val: 'DQS',
                i18n: i18n( 'casefolder-schema.Additional_E.DQS.i18n_rs' )
            } );
        }
        caseFolderList.push( {
            val: 'ALLCASES',
            i18n: i18n( 'rulelog-schema.RuleLog_T.allCaseFolders.i18n' )
        } );
        caseFolderList.push( {
            val: 'CASEFOLDER',
            i18n: i18n( 'rulelog-schema.RuleLog_T.caseFolderId.i18n' )
        } );
        caseFolderList.push( {
            val: 'PATIENT',
            i18n: i18n( 'rulelog-schema.RuleLog_T.patientId.i18n' )
        } );
        caseFolderList.push( {
            val: 'TASK',
            i18n: i18n( 'audit-schema.ModelMeta_E.task' )
        } );

        self.periodTypeAutocomplete = {
            val: ko.computed( {
                read: function() {
                    return self.periodType();
                },
                write: function( $event ) {
                    self.periodType( $event.val );
                }
            } ),
            select2: {
                placeholder: '',
                data: Y.doccirrus.schemas.rule.types.Period_E.list.map( function( entry ) {
                    return { id: entry.val, text: i18n( entry.i18n ) };
                } )
            }
        };

        self.caseFolderAutocomplete = {
            val: ko.computed( {
                read: function() {
                    var value = self.caseFolderType();
                    if ( !Array.isArray( value ) ) {
                        value = [ value ];
                    }

                    var list = caseFolderList.filter( function( entry ) {
                        return _.includes( value, entry.val );
                    } ).map( function( entry ) {
                        return entry.val;
                    } );
                    return list;
                },
                write: function( $event ) {
                    var value = $event.val;

                    self.caseFolderType( value );
                }
            } ),
            select2: {
                placeholder: '',
                multiple: true,
                query: function( options ) {
                    var list = self.caseFolderType(),
                        data = caseFolderList.map( function( entry ) {
                            return {
                                id: entry.val,
                                text: entry.i18n,
                                disabled: ('ALLCASES' === entry.val && list.length > 0 ) ||
                                          ('ALLCASES' !== entry.val && _.includes( list, 'ALLCASES' )) ||
                                          ('CASEFOLDER' === entry.val && list.length > 0 ) ||
                                          ('CASEFOLDER' !== entry.val && _.includes( list, 'CASEFOLDER' )) ||
                                          ('PATIENT' === entry.val && list.length > 0 ) ||
                                          ('PATIENT' !== entry.val && _.includes( list, 'PATIENT' )) ||
                                          ('TASK' === entry.val && list.length > 0 ) ||
                                          ('TASK' !== entry.val && _.includes( list, 'TASK' )) || false
                            };
                        } );
                    return options.callback( {results: data} );
                },
                initSelection: function( element, callback ) {
                    var list = self.caseFolderType();
                    if( !list.length ) {
                        return callback( [] );
                    }
                    var data = caseFolderList.filter( function( entry ) {
                        return _.includes( list, entry.val );
                    } ).map( function( entry ) {
                        return {
                            id: entry.val,
                            text: entry.i18n
                        };
                    } );

                    return callback( data );
                }
            }
        };

        //Temporary to hide CARDIO codes
        self.codeCardioAutocomplete = {
            val: ko.computed( {
                read: function() {
                    return self.code();
                },
                write: function( $event ) {
                    self.code( $event.val );
                }
            } ),
            select2: {
                placeholder: 'Ereignis',
                allowClear: true,
                formatSelection: function format( result ) {
                    return result.text;
                },
                query: function( query ) {
                    var actType = self.actType(),
                        catalogShort = self.catalogShort(),
                        catalogs,
                        criteria = {};

                    if( catalogShort ) {
                        criteria.short = catalogShort;
                    }
                    if( actType ) {
                        criteria.actType = actType;
                    }

                    catalogs = Y.doccirrus.catalogmap.getCatalogs( criteria );

                    Y.doccirrus.jsonrpc.api.catalog.catalogCodeSearch( {
                        itemsPerPage: 10,
                        query: {
                            term: query.term,
                            catalogs: catalogs && catalogs.map( function( catalog ) {
                                return {
                                    filename: catalog.filename,
                                    short: catalog.short
                                };
                            } ),
                            "locationId": { $exists: true }
                        }
                    } ).done( function( response ) {
                        query.callback( { results: (response.data || []).map( catalogCardioCodeMapper ) } );
                    } ).fail( fail );
                },
                initSelection: function( element, callback ) {
                    var code = self.code(),
                        actType = self.actType(),
                        catalogShort = self.catalogShort(),
                        catalogs,
                        criteria = {};

                    if( catalogShort ) {
                        criteria.short = catalogShort;
                    }
                    if( actType ) {
                        criteria.actType = actType;
                    }

                    catalogs = Y.doccirrus.catalogmap.getCatalogs( criteria );

                    if( !code ) {
                        return callback( null );
                    }

                    Y.doccirrus.jsonrpc.api.catalog.read( {
                        query: {
                            seq: code,
                            catalog: catalogs[0].filename
                        }
                    } ).done( function( response ) {
                        var data = response && response.data && response.data[0];
                        callback( data ? catalogCardioCodeMapper( data ) : null );
                    } ).fail( fail );
                }
            }
        };

        self.referenceArea.subscribe( function() {
            self.actType( null );
        } );

        self.caseFolderType.subscribe( function() {
            self.actType( null );
        } );
        self.actType.subscribe( function() {
            self.catalogShort( null );
        } );
        self.catalogShort.subscribe( function() {
            self.kv( null );
            self.code( null );
        } );

        validate( self, {
            referenceArea: true,
            description: function( val ) {
                return !val ? 'Sie müssen eine Bezeichnung eingeben!' : undefined;
            },
            caseFolderType: function( val ) {
                return !val ? 'Sie müssen die Fallart auswählen!' : undefined;
            }
        } );

    }

    RuleSetEditor.prototype.removeValidations = function( content ) {
        var
            self = this;
        if( Array.isArray(content) ){
            content.forEach( function( element ){
                self.removeValidations.call( self, element );
            } );
        } else if( content instanceof RuleOperator){
            self.removeValidations.call( self, unwrap( content.content) );
        } else if( content instanceof RuleValidation){
            self.validationErrors.remove( content );
        }
    };

    RuleSetEditor.prototype.remove = function( rule ) {
        var
            self = this,
            ruleSet;
        if( rule instanceof Rule ) {
            //remove validators
            self.ruleSetEditor.removeValidations.call( self.ruleSetEditor, unwrap( rule.content ) );
            rule.ruleSetEditor.rules.remove( rule );
            rule.ruleSetEditor.ruleSetInspector.current( null );
        } else {
            ruleSet = self.ruleSet();

            if( !ruleSet ) {
                return;
            }

            if( !ruleSet._id ) {
                self.unload();
            } else {
                Promise.resolve( Y.doccirrus.jsonrpc.api.rule.delete( {
                    query: {
                        _id: ruleSet._id
                    }
                } ) ).then( function() {
                    self.unload();
                } ).catch( fail );
            }
        }
    };

    RuleSetEditor.prototype.add = function() {
        var
            self = this;
        self.rules.push( new Rule( Y.doccirrus.schemas.rule.getDefaultRule(), self ) );
    };

    RuleSetEditor.prototype.createRuleSet = function( options ) {
        var
            self = this;
        self.load( Y.doccirrus.schemas.rule.getDefaultRuleSet( options ) );
    };

    RuleSetEditor.prototype.save = function( ruleSetEditor ) {
        Y.log( 'save', ruleSetEditor );
        var
            self = this,
            serialized = ruleSetEditor.serialize(),
            ruleSet = ruleSetEditor.ruleSet(),
            ruleSetId = ruleSet && ruleSet._id;

        if( !ruleSetId ) {
            Promise.resolve( Y.doccirrus.jsonrpc.api.rule.create( {
                data: serialized
            } ) ).then( function() {
                self.unload();
            } ).catch( fail );
        } else {
            Promise.resolve( Y.doccirrus.jsonrpc.api.rule.update( {
                query: {
                    _id: ruleSetId
                },
                data: serialized,
                fields: Object.keys( serialized )
            } ) ).then( function() {
                self.unload();
            } ).catch( fail );
        }
    };

    RuleSetEditor.prototype.load = function( ruleSet, ruleSetInspector ) {

        var rules,
            self = this;

        self.disposables.forEach( function( disposable ) {
            disposable.dispose();
        } );
        self.ruleSetInspector = ruleSetInspector;
        self.disposables = [];
        self.validationErrors.removeAll();
        self.validationErrors( [] );

        self.ruleSet( ruleSet );
        self.description( ruleSet && ruleSet.description || '' );

        if( null === ruleSet ) {
            self.rules( [] );
            self.referenceArea( null );
            self.isActive( true );
            self.isLocked( false );
            self.caseFolderType( [] );
            self.periodType( 'MONTH' );
            self.periodCount( '1' );
            self.periodReference( 'raum' );
            self.actType( null );
            self.catalogShort( null );
            self.code( null );
            self.parent( null );
            self.kv( null );

            return;
        }
        self.parent( ruleSet.parent || null );
        self.referenceArea( ruleSet.referenceArea || null );
        self.caseFolderType( ruleSet.caseFolderType );
        self.periodType( ruleSet.periodType );
        self.periodCount( ruleSet.periodCount && ruleSet.periodCount.toString() || null );
        self.periodReference( ruleSet.periodReference );
        self.actType( ruleSet.actType || null );
        self.catalogShort( ruleSet.catalogShort || null );
        self.code( ruleSet.code || null );

        self.isActive( 'boolean' === typeof ruleSet.isActive ? ruleSet.isActive : true );
        self.isLocked( Boolean( ruleSet.isLocked ) );
        self.kv( ruleSet.kv || null );

        rules = Y.doccirrus.schemautils.recoverKey( ruleSet.rules );

        self.rules( rules.map( function( rule ) {
            return new Rule( rule, self );
        } ) );
    };

    RuleSetEditor.prototype.trigger = function( name, data ) {
        var
            self = this,
            sub;
        switch( name ) {
            case 'validationAdded':
                if( !data.isValid() ){
                    self.validationErrors.push( data );
                }
                sub = data.isValid.subscribe( function( val ) {
                    if( val ) {
                        self.validationErrors.remove( data );
                    } else {
                        if( -1 === self.validationErrors.indexOf(data) ){
                            self.validationErrors.push( data );
                        }
                    }
                } );
                self.disposables.push( sub );
                break;
            case 'validationRemoved':
                self.validationErrors.remove( data );
                break;
        }
    };

    RuleSetEditor.prototype.unload = function() {
        var
            self = this,
            options = self.options;
        self.load( null );
        if( 'function' === typeof options.onUnload ) {
            options.onUnload();
        }
        return self;
    };

    RuleSetEditor.prototype.drop = function() {
    };

    RuleSetEditor.prototype.dragOver = debounce( function( event, dragData, zoneData ) {
        var zone, index, items;

        event.stopPropagation();

        if( 'validation' === unwrap( zoneData.type ) ) {
            zone = zoneData.parent;
        } else {
            zone = zoneData;
        }
        if( !zone ) {
            return;
        }

        items = zone.content;

        if( dragData !== zoneData ) {
            index = items.indexOf( zoneData );
            dragData.parent.content.remove( dragData );
            dragData.parent = zone;
            items.splice( -1 === index ? 0 : index, 0, dragData );
        }
    }, 0 );

    RuleSetEditor.prototype.dragStart = function( data ) {
        if( data.ruleSetEditor.isDragging ) {
            return false;
        }

        if( null === data.parent ) {
            return false;
        }

        data.ruleSetEditor.isDragging = true;
        data.isDragging( true );
    };

    RuleSetEditor.prototype.dragEnd = function( data ) {
        data.ruleSetEditor.isDragging = false;
        data.isDragging( false );
    };

    RuleSetEditor.prototype.serialize = function() {
        var
            self = this,
            meta,
            serializedRuleSet = {
                description: unwrap( self.description ),
                referenceArea: unwrap( self.referenceArea ),
                caseFolderType: unwrap( self.caseFolderType ),
                periodType: unwrap( self.periodType ),
                periodCount: unwrap( self.periodCount ),
                periodReference: unwrap( self.periodReference ),
                kv: unwrap( self.kv ) || undefined,
                actType: unwrap( self.actType ) || undefined,
                catalogShort: unwrap( self.catalogShort ) || undefined,
                code: unwrap( self.code ) || undefined,
                isActive: unwrap( self.isActive ),
                isLocked: unwrap( self.isLocked ),
                parent: unwrap( self.parent ) || undefined
            },
            serializedRules = unwrap( self.rules ).map( function( rule ) {
                return rule.serialize();
            } );

        serializedRuleSet.rules = Y.doccirrus.schemautils.prepareKey( JSON.parse( JSON.stringify( serializedRules ) ) );
        meta = getMeta( serializedRuleSet.rules );

        serializedRuleSet.metaCriterias = (meta.criterias || []).filter( function(el){ return el.indexOf( '$' ) !== 0; } );
        serializedRuleSet.metaActTypes = meta.actTypes;
        serializedRuleSet.metaActCodes = meta.actCodes;
        serializedRuleSet.metaFuzzy = meta.metaFuzzy;
        serializedRuleSet.metaCaseOpen = meta.metaCaseOpen;
        return serializedRuleSet;
    };

    function isArea( rule, area ){
        return 'ENTRY' === rule.ruleSetEditor.referenceArea() && _.includes( rule.ruleSetEditor.caseFolderType(), area );
    }

    function RuleValidation( data, rule ) {
        var
            self = this,
            criteria = data.criteria || {},
            isCaseFolder = isArea( rule, 'CASEFOLDER' ),
            isPatient = isArea( rule, 'PATIENT' ),
            isTask = isArea( rule, 'TASK' ),
            parsedCriteria = Y.doccirrus.ruleutils.parseCriteria( criteria, isCaseFolder, isPatient, isTask, {
                markers: rule.ruleSetEditor.markers
            } );

        self.type = ko.observable( 'validation' );
        self.content = ko.observable( parsedCriteria );
        self.isDragging = ko.observable( false );
        self.rule = rule;
        self.ruleSetEditor = rule.ruleSetEditor;

        self.errorMessages = ko.observableArray();

        self.showErrorMessages = ko.computed( function() {
            return self.errorMessages().join( '\n' );
        } );

        self.koSchemaValue = KoComponentManager.createComponent( {
            componentType: 'KoSchemaValue',
            componentConfig: {}
        } );

        self.isValid = ko.observable( null );
        self.validator = ko.computed( function() {
            var valid = true,
                messages = [],

                /*
                content = unwrap( self.content ),
                criteriaActType = content && unwrap( content.actType ),
                referenceAreaActType = unwrap( self.ruleSetEditor.actType ),
                */
                referenceArea = unwrap( self.ruleSetEditor.referenceArea ),
                caseFolderType = unwrap( self.ruleSetEditor.caseFolderType ),
                actions = rule.actions().map( function( action ) {
                    if( action.template && ('TASK' === unwrap( action.type ) || 'TASK_WITH_FORM' === unwrap( action.type )) ) {
                        if( !action.template.actType() ) {
                            action.template.actType( "MEASUREMENT" );
                        }
                        return action.template.isValid();
                    }
                    if( action.template && 'ACTIVITY' === unwrap( action.type ) ) {
                        return action.template.isValid();
                    } else {
                        return true;
                    }
                } );

            if( !actions.length) {
                messages.push( 'Aktion sollte definiert werden' );
                valid = false;
            }

            if( actions.some( function( action ) {
                    return !action;
                } ) ) {
                valid = false;
            }
            /*
            if( 'ENTRY' === referenceArea && 'CASEFOLDER' !== caseFolderType && criteriaActType !== referenceAreaActType ) {
                messages.push( 'Im Bezugsraum "Eintrag" müssen die Aktivitätstypen der Prüfungen mit den Aktivitätstyp des Bezugsraum übereinstimmen!' );
                valid = false;
            }
            */
            if( 'ENTRY' !== referenceArea && _.includes( caseFolderType, 'CASEFOLDER' ) ) {
                messages.push( 'Fall kann nur im Bezugsraum "Eintrag" bearbeitet werden' );
                valid = false;
            }
            if( 'ENTRY' !== referenceArea && _.includes( caseFolderType, 'PATIENT' ) ) {
                messages.push( 'Patient kann nur im Bezugsraum "Eintrag" bearbeitet werden' );
                valid = false;
            }
            if( 'ENTRY' !== referenceArea && _.includes( caseFolderType, 'TASK' ) ) {
                messages.push( 'Aufgabe kann nur im Bezugsraum "Eintrag" bearbeitet werden' );
                valid = false;
            }

            var current = self.ruleSetEditor.ruleSetInspector && self.ruleSetEditor.ruleSetInspector.current(),
                currentlValidations =  current && current.data;
            var criterion,
                criterions,
                currentCriterion,
                widgetValid,
                allValid;
            if( currentlValidations === self ){
                criterion = self.ruleSetEditor.ruleSetInspector.criteriaListValue();
                criterions = self.content().criterionList();
                allValid = true;

                widgetValid = self.koSchemaValue.isValid();

                if( criterion ){
                    currentCriterion = criterions.filter( function(el){
                        return _.isEqual( el.serialize(), criterion.serialize() );
                    });
                    if( currentCriterion.length ){
                        currentCriterion[0].validationResult = widgetValid;
                    }
                }
                if( !criterions.length ){
                    messages.push( 'Kriterien sind nicht festgelegt' );
                    valid = false;
                }
                criterions.forEach( function(el, ind){
                    var thisValid = (typeof el.validationResult !== 'undefined') ? el.validationResult : true;
                    thisValid = thisValid && Boolean(peek(el.path)) && Boolean(peek(el.operator));
                    if(!thisValid){
                        messages.push( 'Wert Fehler (' + ind.toString()+ ')' );
                    }
                    allValid = allValid && thisValid;
                } );

                valid = valid && widgetValid && allValid;
            } else if(currentlValidations){
                messages = self.errorMessages() || [];
                valid = valid && !messages.length;
            }

            self.errorMessages( messages );
            self.isValid( valid );
            return valid;
        } );

        self.ruleSetEditor.disposables.push( self.validator );
        self.ruleSetEditor.disposables.push( self.showErrorMessages );

    }

    RuleValidation.prototype.serialize = function() {
        var
            self = this,
            currentContent = unwrap( self.content ),
            insuranceStatusPrefix = 'patientId.insuranceStatus.',
            serializedCriteria = currentContent.serialize(),
            caseFolderType = self.getCaseFolderType(),
            isCaseFolder,
            isPatient,
            isTask;

        // we need to add the case folder type to insuranceStatus fields
        // eg. patientId.insuranceStatus.insuranceNo becomes patientId.insuranceStatus.PUBLIC.insuranceNo

        // TODO: check this
        var caseTypes = caseFolderType.filter( function ( element ){
          return 'CASEFOLDER' !== element && 'PATIENT' !== element && 'TASK' !== element;
        } );

        isCaseFolder = _.includes( caseFolderType, 'CASEFOLDER' );
        isPatient = _.includes( caseFolderType, 'PATIENT' );
        isTask = _.includes( caseFolderType, 'TASK' );

        if(isCaseFolder || isPatient || isTask){
            caseTypes = ['PRIVATE', 'PUBLIC', 'SELFPAYER', 'BG'];
        }

        if( caseTypes.length ) {
            Object.keys( serializedCriteria ).forEach( function( key ) {
                var split, updatedKeys = [], obj;
                if( 0 === key.indexOf( insuranceStatusPrefix ) ) {
                    caseTypes.forEach( function ( type ) {
                        split = key.split( '.' );
                        split.splice( 2, 0, type );
                        obj = {};
                        obj[split.join( '.' )] = JSON.parse(JSON.stringify(serializedCriteria[key]));
                        updatedKeys.push( obj );
                    } );
                    serializedCriteria.$or = updatedKeys;
                    delete serializedCriteria[key];
                }
            } );
        }

        if( serializedCriteria ) {
            return {
                context: (isTask) ? 'TASK': (isPatient) ? 'PATIENT': (isCaseFolder) ? 'CASEFOLDER' : 'ACTIVITY',
                criteria: serializedCriteria
            };
        }
    };

    RuleValidation.prototype.getCaseFolderType = function() {
        var
            self = this,
            rule = self.rule,
            ruleEditor = rule && rule.ruleSetEditor;
        return ruleEditor && unwrap( ruleEditor.caseFolderType );
    };

    RuleValidation.prototype.remove = function() {
        var
            self = this;
        if( null === self.parent ) {
            return;
        }

        self.parent.removeChild( self );
    };

    RuleValidation.prototype.addCriterion = function() {
        var
            self = this,
            criteria = self.content();
        if( criteria ) {
            return criteria.addCriterion();
        }
    };

    RuleValidation.prototype.removeCriterion = function( criterion ) {
        var
            self = this,
            criteria = self.content();
        if( criteria ) {
            criteria.removeCriterion( criterion );
        }
    };

    function RuleOperator( type, data, ruleSetEditor, rule ) {
        var
            self = this;

        self.type = ko.observable( type );
        self.content = ko.observableArray().extend( { rateLimit: 100 } );
        self.parent = null;
        self.ruleSetEditor = ruleSetEditor;
        self.rule = rule;
        self.isDragging = ko.observable( false );

        self.hasParent = ko.computed( function() {
            unwrap( self.content );
            return Boolean( self.parent );
        } );

        self.operatorName = ko.computed( function() {
            var type = self.type();
            return Y.doccirrus.ruleutils.translate( type );
        } );

        if( !Array.isArray( data ) ) {
            throw Error( 'content must be an array' );
        }

        data.forEach( function( entry ) {
            var operator = findOperator( entry, ruleSetEditor, rule );

            if( operator ) {
                operator.parent = self;
                self.content.push( operator );
            } else {
                self.addValidation( entry, ruleSetEditor );
            }
        } );

        self.ruleSetEditor.disposables.push( self.hasParent );
        self.ruleSetEditor.disposables.push( self.operatorName );
    }

    RuleOperator.prototype.addAndOperator = function() {
        var
            self = this,
            ruleSetEditor = self.ruleSetEditor,
            rule = self.rule,
            operator = new RuleOperator( 'and', [], ruleSetEditor, rule );

        operator.parent = self;
        self.content.push( operator );
    };

    RuleOperator.prototype.addOrOperator = function() {
        var
            self = this,
            ruleSetEditor = self.ruleSetEditor,
            rule = self.rule,
            operator = new RuleOperator( 'or', [], ruleSetEditor, rule );

        operator.parent = self;
        self.content.push( operator );
    };

    RuleOperator.prototype.addNotOperator = function() {
        var
            self = this,
            ruleSetEditor = self.ruleSetEditor,
            rule = self.rule,
            operator = new RuleOperator( 'not', [], ruleSetEditor, rule );

        operator.parent = self;
        self.content.push( operator );
    };

    RuleOperator.prototype.getDefaultValidationData = function() {
        var
            self = this,
            ruleSetEditor = self.ruleSetEditor,
            actType = ruleSetEditor.actType(),
            isCaseFolder = 'ENTRY' === ruleSetEditor.referenceArea() && _.includes( ruleSetEditor.caseFolderType(), 'CASEFOLDER' ),
            isTask = 'ENTRY' === ruleSetEditor.referenceArea() && _.includes( ruleSetEditor.caseFolderType(), 'TASK' );

        if( isCaseFolder ) {
            return {
                context: 'CASEFOLDER',
                criteria: {}
            };
        } else if( isTask ) {
            return {
                context: 'TASK',
                criteria: {}
            };
        } else {
            return {
                context: 'ACTIVITY',
                criteria: { actType: { $eq: actType || 'TREATMENT' } }
            };
        }
    };

    RuleOperator.prototype.addValidation = function( validationData ) {
        var
            self = this,
            rule = self.rule,
            validation = new RuleValidation( validationData || self.getDefaultValidationData(), rule );

        validation.parent = self;
        self.ruleSetEditor.trigger( 'validationAdded', validation );
        self.content.push( validation );
    };

    RuleOperator.prototype.remove = function() {
        var
            self = this;
        if( null === self.parent ) {
            return;
        }

        self.parent.removeChild( self );
    };

    RuleOperator.prototype.removeChild = function( child ) {
        var
            self = this;
        child.parent = null;
        // TODOOO destroy models...
        if( child instanceof RuleValidation ) {
            self.ruleSetEditor.trigger( 'validationRemoved', child );
        }
        return self.content.remove( child );
    };

    RuleOperator.prototype.serialize = function() {
        var
            self = this,
            result = {},
            type = unwrap( self.type );
        result['$' + type] = unwrap( self.content ).map( function( ruleElement ) {
            return ruleElement.serialize();
        } );
        return result;
    };

    Y.namespace( 'doccirrus' ).RuleSetEditor = {

        name: NAME,

        create: function( options ) {
            return new RuleSetEditor( options );
        }
    };
}, '0.0.1', {
    requires: [
        'rule-schema',
        'dcruleutils',
        'schemautils',
        'TaskTemplateModel'
    ]
} );



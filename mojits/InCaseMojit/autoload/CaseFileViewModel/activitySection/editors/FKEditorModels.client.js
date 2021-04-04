/**
 * User: pi
 * Date: 11/12/15  10:40
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, jQuery */

'use strict';

YUI.add( 'FKEditorModels', function( Y, NAME ) {
        /**
         * @module FKEditorModels
         */
        var
            KoViewModel = Y.doccirrus.KoViewModel,
            SubEditorModel = KoViewModel.getConstructor( 'SubEditorModel' ),
            i18n = Y.doccirrus.i18n,
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable;

        /**
         * @class Fk4235EditorModel
         * @constructor
         * @extends FkEditorModel
         */
        function Fk4235EditorModel( config ) {
            Fk4235EditorModel.superclass.constructor.call( this, config );
        }

        Fk4235EditorModel.ATTRS = {
            whiteList: {
                value: [
                    'fk4235',
                    'fk4247',
                    'fk4252',
                    'fk4255',
                    'fk4250',
                    'fk4299',
                    'finishedWithoutPseudoCode'
                ],
                lazyAdd: false
            },
            subModelsDesc: {
                value: [
                    {
                        propName: 'fk4244Set',
                        editorName: 'Fk4244EditorModel'
                    },
                    {
                        propName: 'fk4256Set',
                        editorName: 'Fk4244EditorModel'
                    },
                    {
                        propName: 'fk4251Set',
                        editorName: 'Fk4251EditorModel'
                    }
                ],
                lazyAdd: false
            }
        };

        Y.extend( Fk4235EditorModel, SubEditorModel, {

                initializer: function Fk4235EditorModel_initializer() {
                    var
                        self = this;
                    self.initFk4235EditorModel();
                },
                destructor: function Fk4235EditorModel_destructor() {
                },
                initFk4235EditorModel: function Fk4235EditorModel_initFk4235EditorModel() {
                    var
                        self = this,
                        dataModelParent = self.get( 'dataModelParent' );

                    function sum( sum, entry ) {
                        return sum + Number( unwrap( entry.fk4246 ) || 0 );
                    }

                    self.certOfRecI18n = i18n( 'InCaseMojit.casefile_detail.label.CERT_OF_REC' );
                    self.autoSubstitutionOfCodesI18n = i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.autoSubstitutionOfPsychoGroupTherapyCodes.i18n' );
                    self.appServiceI18n = i18n( 'InCaseMojit.casefile_detail.label.APP_SERVICE' );
                    self.nrContractsI18n = i18n( 'InCaseMojit.casefile_detail.label.NR_CONTRACTS' );
                    self.delCertI18n = i18n( 'InCaseMojit.casefile_detail.label.DEL_CERT' );

                    self.fk4252Sum = ko.computed( function() {
                        return self.fk4244Set().reduce( sum, 0 );
                    } );

                    self.fk4255Sum = ko.computed( function() {
                        return self.fk4256Set().reduce( sum, 0 );
                    } );

                    self.addDisposable( ko.computed( function() {
                        self.fk4247();
                        self.fk4252.validate();
                        self.fk4255.validate();
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var fk4250 = self.fk4250();
                        if( ko.computedContext.isInitial() ) {
                            return;
                        }
                        if( true === fk4250 ) {
                            self.addFk4251Set();
                        } else {
                            self.removeFk4251Set( self );
                        }
                    } ) );

                    self.proxyFinishedWithoutPseudoCodeValue = ko.observable( self.finishedWithoutPseudoCode() );
                    self.proxyFinishedWithoutPseudoCodeValue.readOnly = ko.observable( false );
                    self.finishedWithoutPseudoCodeProxy = ko.computed( {
                        read: function() {
                            var currentActivity = unwrap( self.get( 'currentActivity' ) );
                            if( currentActivity._isEditable() ) {
                                return self.finishedWithoutPseudoCode();
                            } else {
                                return self.proxyFinishedWithoutPseudoCodeValue();
                            }
                        },
                        write: function( val ) {
                            var currentActivity = unwrap( self.get( 'currentActivity' ) );
                            if( currentActivity._isEditable() ) {
                                self.finishedWithoutPseudoCode( val );
                            } else {
                                self.proxyFinishedWithoutPseudoCodeValue.readOnly( true );
                                Promise.resolve( Y.doccirrus.jsonrpc.api.activity.setScheinFinishedWithoutPseudoCode( {
                                    data: {
                                        scheinId: peek( currentActivity._id ),
                                        finishedWithoutPseudoCode: val
                                    },
                                    fields: ['autoSubstitutionOfPsychoGroupTherapyCodes']
                                } ) ).then( function() {
                                    self.proxyFinishedWithoutPseudoCodeValue( val );
                                } ).catch( function( response ) {
                                    return Y.doccirrus.DCWindow.notice( {
                                        message: Y.doccirrus.errorTable.getMessage( response )
                                    } );
                                } ).finally( function() {
                                    self.proxyFinishedWithoutPseudoCodeValue.readOnly( false );
                                } );
                            }
                        }
                    } );

                    /**
                     * @see ko.bindingHandlers.select2
                     * @type {Object}
                     * @private
                     */
                    self._fk4299AutoComplete = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                if( self.fk4299 && self.fk4299() ) {
                                    return {id: self.fk4299(), text: self.fk4299()};
                                }
                                else {
                                    return null;
                                }
                            },
                            write: function( $event ) {
                                self.fk4299( $event.val );
                            }
                        } ) ),
                        select2: {
                            placeholder: '...',
                            minimumInputLength: 1,
                            allowClear: true,
                            query: function( query ) {
                                function done( data ) {
                                    var
                                        results = [].concat( data );

                                    if( 0 === results.length){
                                        results.push( {lanr: query.term} );
                                    }

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
                                    done( [] );
                                }
                                else {
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
                                    replacementValueI18n = 'Ersatzwert',
                                    postFix = '',
                                    classNames = [];

                                window.Select2.util.markMatch( result.text, query.term, select2formatResult, escapeMarkup );
                                select2formatResult = select2formatResult.join( '' );
                                if( result._data.lanr === '999999900' ) {
                                    postFix = ' <span class="select2-match">(' + replacementValueI18n + ')</span>';
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
                            }
                        }
                    };

                    self.addFk4244Set = function() {
                        dataModelParent.addFk4244Set();
                    };
                    self.removeFk4244Set = function( data ) {
                        dataModelParent.removeFk4244Set( data.get( 'dataModelParent' ) );
                    };

                    self.addFk4256Set = function() {
                        dataModelParent.addFk4256Set();
                    };

                    self.removeFk4256Set = function( data ) {
                        dataModelParent.removeFk4256Set( data.get( 'dataModelParent' ) );
                    };

                    self.addFk4251Set = function() {
                        dataModelParent.addFk4251Set();
                    };

                    self.removeFk4251Set = function( data ) {
                        dataModelParent.removeFk4251Set( data.get( 'dataModelParent' ) );
                    };

                    self.initConfig();
                },
                initConfig: function() {

                    var self = this,
                        binder = self.get( 'binder' ),
                        incaseconfiguration = binder.getInitialData( 'incaseconfiguration' ),
                        currentActivity = unwrap( self.get( 'currentActivity' ) ),
                        caseFolder = currentActivity.get( 'caseFolder' ),
                        isPublicCaseFolder = Y.doccirrus.schemas.patient.isPublicInsurance( caseFolder ), // MOJ-14319: [OK]
                        autoSubstitutionOfPsychoGroupTherapyCodes = incaseconfiguration && 'boolean' === typeof incaseconfiguration.autoSubstitutionOfPsychoGroupTherapyCodes ? incaseconfiguration.autoSubstitutionOfPsychoGroupTherapyCodes : true;
                    self.autoSubstitutionOfCodes = ko.observable( isPublicCaseFolder && autoSubstitutionOfPsychoGroupTherapyCodes );
                    if( isPublicCaseFolder ) {
                        self.autoSubstitutionOfCodes.subscribe( function( val ) {
                            Promise.resolve( Y.doccirrus.jsonrpc.api.incaseconfiguration.update( {
                                query: {
                                    _id: incaseconfiguration._id
                                },
                                data: {
                                    autoSubstitutionOfPsychoGroupTherapyCodes: val
                                },
                                fields: ['autoSubstitutionOfPsychoGroupTherapyCodes']
                            } ) ).catch( function( err ) {
                                Y.log( 'could not update incaseconfiguration.autoSubstitutionOfPsychoGroupTherapyCodes: ' + err, 'error', NAME );
                                self.autoSubstitutionOfCodes( autoSubstitutionOfPsychoGroupTherapyCodes );
                            } );
                        } );
                    }
                },
                addSubstitutedCodes: function( codes, child ) {
                    var
                        self = this,
                        dataModelParent = self.get( 'dataModelParent' ),
                        isFk4244Set = false;

                    isFk4244Set = self.fk4244Set().some( function( el ) {
                        return el === child;
                    } );

                    if( true === isFk4244Set ) {

                        codes.forEach( function( code ) {
                            dataModelParent.addFk4244Set( {
                                fk4244: code,
                                fk4246: 0
                            } );
                        } );

                        self.removeFk4244Set( child );
                    } else {
                        codes.forEach( function( code ) {
                            dataModelParent.addFk4256Set( {
                                fk4244: code,
                                fk4246: 0
                            } );
                        } );

                        self.removeFk4256Set( child );
                    }
                }
            },
            {
                NAME: 'Fk4235EditorModel'
            }
        );
        KoViewModel.registerConstructor( Fk4235EditorModel );

        /**
         * @class Fk4244EditorModel
         * @constructor
         * @extends SubEditorModel
         */
        function Fk4244EditorModel( config ) {
            Fk4244EditorModel.superclass.constructor.call( this, config );
        }

        Fk4244EditorModel.ATTRS = {
            whiteList: {
                value: [
                    'fk4244',
                    'fk4246',
                    'fk4246Offset'
                ],
                lazyAdd: false
            },
            numParticipants: {
                value: [3, 4, 5, 6, 7, 8, 9],
                lazyAdd: false
            }
        };

        Y.extend( Fk4244EditorModel, SubEditorModel, {

                initializer: function Fk4244EditorModel_initializer() {
                    var
                        self = this;
                    self.initFk4244EditorModel();
                },
                destructor: function Fk4244EditorModel_destructor() {
                },
                select2Mapper: function( val ) {
                    return {id: val.seq, text: val.title, catalogShort: val.catalogShort, _data: val};
                },
                initFk4244EditorModel: function Fk4244EditorModel_initFk4244EditorModel() {
                    var
                        self = this;

                    self.activityIsNew = ko.computed( function() {
                        var
                            currentActivity = unwrap( self.get( 'currentActivity' ) );
                        return !(currentActivity && unwrap( currentActivity._id ));
                    } );

                    self.fk4246ReadOnly = ko.computed( function() {
                        return self.fk4246.readOnly() || !self.activityIsNew();
                    } );

                    // MOJ-8549: PRF11/21 allow initial values for fk4246
                    self._displayfk4246 = ko.pureComputed( {
                        read: function() {
                            return self.fk4246();
                        },
                        write: function( val ) {
                            var isNew = self.activityIsNew();
                            if( isNew ) {
                                self.fk4246( val );
                                self.fk4246Offset( val );
                            }
                        }
                    } );
                    self.initSelect2fk4244();
                },
                initSelect2fk4244: function Fk4244EditorModel_initSelect2fk4244() {
                    var
                        self = this,
                        substitutionCodes = [
                            {id: '3550X', text: 'Tiefenpsychologische Psychotherapie (KZT)'},
                            {id: '3551X', text: 'Tiefenpsychologische Psychotherapie (LZT)'},
                            {id: '3552X', text: 'Analytische Psychotherapie (KZT)'},
                            {id: '3553X', text: 'Analytische Psychotherapie (LZT)'},
                            {id: '3554X', text: 'Verhaltenstherapie (KZT)'},
                            {id: '3555X', text: 'Verhaltenstherapie (LZT)'}
                        ].map( function( entry ) {
                            entry._substitutionCode = true;
                            entry.catalogShort = 'EBM';
                            return entry;
                        } );

                    self._select2fk4244 = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var fk4244 = self.fk4244();
                                return {id: fk4244, text: fk4244};
                            },
                            write: function( $event ) {
                                if( $event.added && $event.added.id && true === $event.added._substitutionCode ) {
                                    if( self.autoSubstitutionOfCodesAllowed() ) {
                                        // automatically add codes
                                        self.addSubstitutedCodes( self.get( 'numParticipants' ).map( function( num ) {
                                            return $event.added.id.replace( /X/, num );
                                        } ) );
                                    } else {
                                        // show possible codes and let user decide
                                        self.showCodeSubstitutionDialog( $event.added );
                                    }
                                } else {
                                    self.fk4244( $event.val );
                                    if( $event.val ) {
                                        self.fk4246( 0 );
                                    } else {
                                        self.fk4246( null );
                                    }
                                }
                            }
                        } ) ),
                        placeholder: ko.observable( i18n( 'InCaseMojit.casefile_detail.placeholder.fk4244' ) ),
                        select2: {
                            minimumInputLength: 1,
                            allowClear: true,
                            dropdownCssClass: 'dc-big-drop',
                            /*formatResult: function( query ) {
                                var code = query.id,
                                    text = query.text,
                                    catalogShort = query.catalogShort;
                                return '<div class="dc-formatResult" title="' + catalogShort + ': ' + code + ', ' + text + '">' + code + ' ' + '(' + text + ')' + '</div>';
                            }, */
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
                            formatSelection: function( query ) {
                                return query.id;
                            },
                            formatResultCssClass: function( result ) {
                                var
                                    type = 'dc-homecatalog-text-color';

                                if( result._data && 0 !== result._data.count && !result._data.count ) {
                                    type = 'textform-originalcatalog';
                                }

                                return type;
                            },
                            query: function( query ) {
                                var
                                    currentActivity = peek( self.get( 'currentActivity' ) ),
                                    caseFolder = currentActivity.get( 'caseFolder' ),
                                    isPublicCaseFolder = Y.doccirrus.schemas.patient.isPublicInsurance( caseFolder ), // MOJ-14319: [OK]
                                    catalogs = self.getCatalogs( currentActivity ),
                                    pending;
                                if( self._select2fk4244.pending ) {
                                    self._select2fk4244.pending.reject();
                                }
                                pending = self._select2fk4244.pending = Y.doccirrus.jsonrpc.api.catalog.catalogCodeSearch( {
                                    itemsPerPage: 20,
                                    query: {
                                        term: query.term,
                                        catalogs: catalogs && catalogs.map( function( catalog ) {
                                            return {
                                                filename: catalog.filename,
                                                short: catalog.short
                                            };
                                        } ),
                                        locationId: peek( currentActivity.locationId ),
                                        reduceData: true
                                    }
                                } );
                                pending.done( function( response ) {
                                    var
                                        results;
                                    results = response.data.map( self.select2Mapper );
                                    if( 0 === results.length ) {
                                        results[0] = {id: query.term, text: query.term};
                                    }
                                    if( isPublicCaseFolder ) {
                                        [].unshift.apply( results, substitutionCodes );
                                    }
                                    query.callback( {results: results} );
                                } );
                                pending.fail( function( err ) {
                                    Y.log( 'Catalog code search is failed, error: ' + err, 'debug', NAME );
                                    query.callback( {results: []} );
                                } );
                                pending.always( function() {
                                    delete self._select2fk4244.pending;
                                } );
                            }
                        }
                    };

                },
                autoSubstitutionOfCodesAllowed: function() {
                    var
                        self = this,
                        parent = self.get( 'editorModelParent' );
                    return parent.autoSubstitutionOfCodes();
                },
                addSubstitutedCodes: function( codes ) {
                    var
                        self = this,
                        parent = self.get( 'editorModelParent' );

                    parent.addSubstitutedCodes( codes, self );
                },
                showCodeSubstitutionDialog: function( entry ) {
                    var
                        self = this;
                    return Y.doccirrus.jsonrpc.api.jade
                        .renderFile( {path: 'InCaseMojit/views/bl_select_number_of_participant'} )
                        .then( function( response ) {
                            return response.data;
                        } ).then( function( template ) {
                            var bodyContent = Y.Node.create( template ),
                                model = {
                                    code: entry.id,
                                    selection: ko.observableArray(),
                                    numParticipants: self.get( 'numParticipants' ),
                                    substituteCode: function( num ) {
                                        return this.code.replace( /X/, num );
                                    }
                                },
                                modal = new Y.doccirrus.DCWindow( {
                                    className: 'DCWindow-bl_select_number_of_participant',
                                    bodyContent: bodyContent,
                                    title: 'Teilnehmeranzahl wählen',
                                    icon: Y.doccirrus.DCWindow.ICON_LIST,
                                    centered: true,
                                    modal: true,
                                    dragable: true,
                                    maximizable: true,
                                    resizeable: true,
                                    render: document.body,
                                    focusOn: [],
                                    buttons: {
                                        header: ['close', 'maximize'],
                                        footer: [
                                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                                isDefault: true,
                                                action: function() {
                                                    var selection = model.selection();
                                                    self.addSubstitutedCodes( selection.map( function( sel ) {
                                                        return model.substituteCode( sel );
                                                    } ) );
                                                    modal.close();
                                                }
                                            } )
                                        ]
                                    }
                                } );
                            ko.applyBindings( model, bodyContent.getDOMNode() );
                        } );

                },
                getCatalogs: function Fk4244EditorModel_getCatalogs( currentActivity ) {
                    var
                        actType = peek( currentActivity.actType ),
                        forInsuranceTypes, forInsuranceType,
                        options = {
                            actType: 'TREATMENT'
                        };
                    // MOJ-14319: [OK] [CATALOG]
                    forInsuranceTypes = Y.doccirrus.schemas.activity.getScheinInsuranceMap()[actType];
                    forInsuranceType = forInsuranceTypes && forInsuranceTypes[0];
                    options.short = Y.doccirrus.schemas.catalog.getShortNameByInsuranceType(
                        Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[forInsuranceType || 'ANY'],
                        forInsuranceType
                    );

                    return Y.doccirrus.catalogmap.getCatalogs( options );
                }

            },
            {
                NAME: 'Fk4244EditorModel'
            }
        );
        KoViewModel.registerConstructor( Fk4244EditorModel );

        /**
         * @class Fk4251EditorModel
         * @constructor
         * @extends SubEditorModel
         */
        function Fk4251EditorModel( config ) {
            Fk4251EditorModel.superclass.constructor.call( this, config );
        }

        Fk4251EditorModel.ATTRS = {
            whiteList: {
                value: [
                    'fk4251'
                ],
                lazyAdd: false
            }
        };

        Y.extend( Fk4251EditorModel, SubEditorModel, {

                initializer: function Fk4251EditorModel_initializer() {
                    var
                        self = this;
                    self.initFk4251EditorModel();
                },
                destructor: function Fk4251EditorModel_destructor() {
                },
                initFk4251EditorModel: function Fk4251EditorModel_initFk4251EditorModel() {
                }

            },
            {
                NAME: 'Fk4251EditorModel'
            }
        );
        KoViewModel.registerConstructor( Fk4251EditorModel );

        /**
         * @class Fk5012EditorModel
         * @constructor
         * @extends SubEditorModel
         */
        function Fk5012EditorModel( config ) {
            Fk5012EditorModel.superclass.constructor.call( this, config );
        }

        Fk5012EditorModel.ATTRS = {
            whiteList: {
                value: ['fk5012', 'fk5074', 'fk5075'],
                lazyAdd: false
            },
            subModelsDesc: {
                value: [
                    {
                        propName: 'fk5011Set',
                        editorName: 'Fk5011EditorModel'
                    }],
                lazyAdd: false
            }
        };

        Y.extend( Fk5012EditorModel, SubEditorModel, {

                initializer: function Fk5012EditorModel_initializer() {
                    var
                        self = this;
                    self.initFk5012EditorModel();
                },
                destructor: function Fk5012EditorModel_destructor() {
                },
                initFk5012EditorModel: function Fk5012EditorModel_initFk5012EditorModel() {
                    var
                        self = this,
                        dataModelParent = self.get( 'dataModelParent' );

                    self.addFk5011Set = function() {
                        dataModelParent.addFk5011Set();
                    };
                    self.removeFk5011Set = function( data ) {
                        dataModelParent.removeFk5011Set( data.get( 'dataModelParent' ) );
                    };
                }
            },
            {
                NAME: 'Fk5012EditorModel'
            }
        );
        KoViewModel.registerConstructor( Fk5012EditorModel );

        /**
         * @class Fk5011EditorModel
         * @constructor
         * @extends SubEditorModel
         */
        function Fk5011EditorModel( config ) {
            Fk5011EditorModel.superclass.constructor.call( this, config );
        }

        Fk5011EditorModel.ATTRS = {
            whiteList: {
                value: ['fk5011'],
                lazyAdd: false
            }
        };

        Y.extend( Fk5011EditorModel, SubEditorModel, {

                initializer: function Fk5011EditorModel_initializer() {
                    var
                        self = this;
                    self.initFk5011EditorModel();
                },
                destructor: function Fk5011EditorModel_destructor() {
                },
                initFk5011EditorModel: function Fk5011EditorModel_initFk5011EditorModel() {

                    var self = this;

                    /**
                     * EventTarget for backwards compatibility
                     * @property _createActivityCodeAutoCompleteEvents
                     * @type {Y.EventTarget}
                     */
                    self._createActivityCodeAutoCompleteEvents = new Y.EventTarget();
                    /**
                     * @event catalogItemSelected
                     * @description Fires when a catalog item has been selected.
                     * @param {Event} event The Event
                     * @param {Object} event.catalogItem The selected catalog item
                     * @type Event.Custom
                     */
                    self._createActivityCodeAutoCompleteEvents.publish( 'catalogItemSelected', {preventable: false} );

                    /**
                     * @event customItemSelected
                     * @description Fires when a custom item has been selected.
                     * @param {Event} event The Event
                     * @type Event.Custom
                     */
                    self._createActivityCodeAutoCompleteEvents.publish( 'customItemSelected', {preventable: false} );

                    self.select2Code = Y.doccirrus.uam.utils.createActivityCodeAutoComplete( {
                        activity: self,
                        field: self.fk5011,
                        eventTarget: self._createActivityCodeAutoCompleteEvents,
                        getCatalogCodeSearchParams: self.getCodeSearchParams.bind( self )
                    } );

                    self._createActivityCodeAutoCompleteEvents.on( 'catalogItemSelected', function( yEvent ) {
                        var
                            data = yEvent.catalogItem;
                        self.onCatalogItemSelected( data || {} );
                    } );

                    self._createActivityCodeAutoCompleteEvents.on( 'customItemSelected', function( yEvent ) {
                        var
                            data = yEvent.customItem;
                        self.onCatalogItemSelected( data || {} );
                    } );
                },
                onCatalogItemSelected: function( data ) {
                    var self = this,
                        u_extra = data && data.u_extra,
                        bewertung_liste = u_extra && u_extra.bewertung_liste && u_extra.bewertung_liste[1],
                        chapter = data && data.l1 && data.l1.seq,
                        price = bewertung_liste && bewertung_liste.value || '0',
                        dataModelParent = self.get( 'editorModelParent' ),
                        factor = 1.5;
                    if( 'M' === chapter ) {
                        factor = 1;
                    } else if( -1 !== ['A', 'E', 'O'].indexOf( chapter ) ) {
                        factor = 1.2;
                    }
                    dataModelParent.fk5012( Math.round( +price * 100 * factor ) );
                },
                getCodeSearchParams: function() {
                    var
                        catalogFile = Y.doccirrus.catalogmap.getCatalogs( {actType: 'TREATMENT', short: 'GOÄ'} )[0].filename,
                        catalogShort = 'GOÄ';

                    if( catalogFile ) {
                        return {
                            itemsPerPage: 20,
                            noCatalogUsage: true,
                            query: {
                                noCatalogUsage: true,
                                term: '',
                                catalogs: [
                                    {filename: catalogFile, short: catalogShort}
                                ],
                                tags: []
                            }
                        };
                    } else {
                        return null;
                    }
                }
            },
            {
                NAME: 'Fk5011EditorModel'
            }
        );
        KoViewModel.registerConstructor( Fk5011EditorModel );

        /**
         * @class Fk5020EditorModel
         * @constructor
         * @extends SubEditorModel
         */
        function Fk5020EditorModel( config ) {
            Fk5020EditorModel.superclass.constructor.call( this, config );
        }

        Fk5020EditorModel.ATTRS = {
            whiteList: {
                value: [
                    'fk5020',
                    'fk5021'
                ],
                lazyAdd: false
            }
        };

        Y.extend( Fk5020EditorModel, SubEditorModel, {

                initializer: function Fk5020EditorModel_initializer() {
                    var
                        self = this;
                    self.initFk5020EditorModel();
                },
                destructor: function Fk5020EditorModel_destructor() {
                },
                initFk5020EditorModel: function Fk5020EditorModel_initFk5020EditorModel() {
                }
            },
            {
                NAME: 'Fk5020EditorModel'
            }
        );
        KoViewModel.registerConstructor( Fk5020EditorModel );

        /**
         * @class Fk5035EditorModel
         * @constructor
         * @extends SubEditorModel
         */
        function Fk5035EditorModel( config ) {
            Fk5035EditorModel.superclass.constructor.call( this, config );
        }

        Fk5035EditorModel.ATTRS = {
            whiteList: {
                value: [
                    'fk5035',
                    'fk5041',
                    'catalogEntry'
                ],
                lazyAdd: false
            }
        };

        Y.extend( Fk5035EditorModel, SubEditorModel, {

                initializer: function Fk5035EditorModel_initializer() {
                    var
                        self = this;
                    self.initFk5035EditorModel();
                },
                destructor: function Fk5035EditorModel_destructor() {
                },
                initFk5035EditorModel: function Fk5035EditorModel_initFk5035EditorModel() {
                    var self = this;

                    self.fk5035Select2 = {
                        data: ko.computed( {
                            read: function() {
                                var
                                    code = self.fk5035(),
                                    entry = peek( self.catalogEntry );

                                if( code ) {
                                    return {id: code, text: code, _data: entry, _custom: !entry};
                                }
                                else {
                                    return null;
                                }
                            },
                            write: function( $event ) {
                                var parent;
                                if( $event.added && true === $event.added._custom ) {
                                    parent = self.get( 'editorModelParent' );
                                    Y.doccirrus.DCSystemMessages.addMessage( {
                                        content: i18n( 'InCaseMojit.FkEditorModelsJS.INVALID_OPS_FOR_CODE', {
                                            data: {
                                                ops: $event.val,
                                                gnr: (peek( parent.code ) || 'n/a')
                                            }
                                        } ),
                                        messageId: 'invalidOpsCodeForCode',
                                        level: 'WARNING'
                                    } );
                                }
                                if( $event.added && $event.added._data ) {
                                    self.catalogEntry( $event.added && $event.added._data );
                                    self.fk5041( $event.added._data.seite ? $event.added._data.seite : null );
                                } else {
                                    self.catalogEntry( null );
                                    self.fk5041( null );
                                }
                                self.fk5035( $event.val );
                            }
                        } ),
                        select2: {
                            allowClear: true,
                            placeholder: '5-301.1',
                            data: function() {
                                var dataModelParent = self.get( 'editorModelParent' ),
                                    u_extra = peek( dataModelParent.u_extra ),
                                    begruendungen_liste = u_extra && u_extra.begruendungen_liste,
                                    ops_liste = begruendungen_liste && begruendungen_liste.ops_liste || [];

                                return {
                                    results: ops_liste.map( function( ops ) {
                                        return {
                                            id: ops.code,
                                            text: ops.code + ' (' + ops.name + ')',
                                            _data: ops,
                                            _custom: false
                                        };
                                    } )
                                };
                            },
                            createSearchChoice: function( item ) {
                                return {
                                    id: item,
                                    text: item,
                                    _custom: true
                                };
                            }
                        }
                    };
                }
            },
            {
                NAME: 'Fk5035EditorModel'
            }
        );
        KoViewModel.registerConstructor( Fk5035EditorModel );

        /**
         * @class Fk5035SurgeryEditorModel
         * @constructor
         * @extends SubEditorModel
         */
        function Fk5035SurgeryEditorModel( config ) {
            Fk5035SurgeryEditorModel.superclass.constructor.call( this, config );
        }

        Fk5035SurgeryEditorModel.ATTRS = {
            whiteList: {
                value: [
                    'fk5035',
                    'fk5041',
                    'catalogEntry',
                    'seqs'
                ],
                lazyAdd: false
            }
        };

        Y.extend( Fk5035SurgeryEditorModel, SubEditorModel, {

                initializer: function Fk5035EditorModel_initializer() {
                    var
                        self = this;
                    self.initFk5035SurgeryEditorModel();
                },
                destructor: function Fk5035SurgeryEditorModel_destructor() {
                },
                initFk5035SurgeryEditorModel: function Fk5035SurgeryEditorModel_initFk5035SurgeryEditorModel() {}
            },
            {
                NAME: 'Fk5035SurgeryEditorModel'
            }
        );
        KoViewModel.registerConstructor( Fk5035SurgeryEditorModel );




        /**
         * @class Fk5036EditorModel
         * @constructor
         * @extends SubEditorModel
         */
        function Fk5036EditorModel( config ) {
            Fk5036EditorModel.superclass.constructor.call( this, config );
        }

        Fk5036EditorModel.ATTRS = {
            whiteList: {
                value: ['fk5036'],
                lazyAdd: false
            }
        };

        Y.extend( Fk5036EditorModel, SubEditorModel, {

                initializer: function Fk5036EditorModel_initializer() {
                    var
                        self = this;
                    self.initFk5036EditorModel();
                },
                destructor: function Fk5036EditorModel_destructor() {
                },
                initFk5036EditorModel: function Fk5036EditorModel_initFk5036EditorModel() {
                    var
                        self = this;
                    self.initSelect2Fk5036();
                },

                /**
                 * @see ko.bindingHandlers.select2
                 * @type {Object}
                 * @private
                 */
                initSelect2Fk5036: function Fk5036EditorModel_initSelect2Fk5036() {
                    var

                        self = this;

                    self._fk5036CfgAutoComplete = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    fk5036 = self.fk5036();

                                if( fk5036 ) {
                                    return {id: fk5036, text: fk5036};
                                }
                                else {
                                    return null;
                                }
                            },
                            write: function( $event ) {
                                self.fk5036( $event.val );
                            }
                        } ) ),
                        placeholder: ko.observable( i18n( 'InCaseMojit.casefile_detail.placeholder.FK5036' ) ),
                        select2: {
                            minimumInputLength: 1,
                            allowClear: true,
                            dropdownAutoWidth: true,
                            dropdownCssClass: 'dc-select2-createActivityCodeAutoComplete',
                            query: function( query ) {

                                function done( data ) {
                                    var
                                        results = [].concat( data );

                                    if( 0 === results.length ) {
                                        results[0] = {seq: query.term, title: ''};
                                    }
                                    // map to select2
                                    results = results.map( function( item ) {
                                        return {id: item.seq, text: item.seq, _data: item};
                                    } );
                                    // publish results
                                    query.callback( {
                                        results: results
                                    } );
                                }

                                // handle not having a catalog
                                if( null === Y.doccirrus.catalogmap.getCatalogEBM() ) {
                                    done( [] );
                                }
                                else {
                                    jQuery
                                        .ajax( {
                                            type: 'GET', xhrFields: {withCredentials: true},
                                            url: Y.doccirrus.infras.getPrivateURL( '/r/catsearch/' ),
                                            data: {
                                                action: 'catsearch',
                                                catalog: Y.doccirrus.catalogmap.getCatalogEBM().filename,
                                                itemsPerPage: 10,
                                                term: query.term
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
                                    select2formatResult = [];

                                window.Select2.util.markMatch( result.text, query.term, select2formatResult, escapeMarkup );
                                select2formatResult = select2formatResult.join( '' );

                                if( result._data.title ) {
                                    return select2formatResult + ' (' + result._data.title + ')';
                                }
                                else {
                                    return select2formatResult;
                                }

                            }
                        }
                    };
                }
            },
            {
                NAME: 'Fk5036EditorModel'
            }
        );
        KoViewModel.registerConstructor( Fk5036EditorModel );

        /**
         * @class Fk5042EditorModel
         * @constructor
         * @extends SubEditorModel
         */
        function Fk5042EditorModel( config ) {
            Fk5042EditorModel.superclass.constructor.call( this, config );
        }

        Fk5042EditorModel.ATTRS = {
            whiteList: {
                value: [
                    'fk5042',
                    'fk5043'
                ],
                lazyAdd: false
            }
        };

        Y.extend( Fk5042EditorModel, SubEditorModel, {

                initializer: function Fk5042EditorModel_initializer() {
                    var
                        self = this;
                    self.initFk5042EditorModel();
                },
                destructor: function Fk5042EditorModel_destructor() {
                },
                initFk5042EditorModel: function Fk5042EditorModel_initFk5042EditorModel() {
                }
            },
            {
                NAME: 'Fk5042EditorModel'
            }
        );
        KoViewModel.registerConstructor( Fk5042EditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SubEditorModel',
            'catalog-schema',
            'dcinfrastructs',
            'activity-schema',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'dckbvutils'
        ]
    }
)
;

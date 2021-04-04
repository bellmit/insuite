/**
 * User: pi
 * Date: 13/08/15  11:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, _ */

'use strict';

YUI.add( 'TaskTemplateModel', function( Y/*, NAME */ ) {
        /**
         * @module TaskTemplateModel
         */

        var
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel,
            peek = ko.utils.peekObservable,
            userLang = Y.doccirrus.comctl.getUserLang();

        /**
         * @class TaskTemplateModel
         * @constructor
         * @extends KoViewModel
         */
        function TaskTemplateModel( config ) {
            TaskTemplateModel.superclass.constructor.call( this, config );
        }

        TaskTemplateModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            type: {
                value: null,
                lazyAdd: false
            }
        };

        function map2Form( form ) {
            return {
                id: form._id,
                text: form.title[userLang] + ' v' + form.version
            };
        }

        Y.extend( TaskTemplateModel, KoViewModel.getBase(), {
                initializer: function TaskTemplateModel_initializer( config ) {
                    var self = this;
                    self.RuleSetEditor = config.ruleSetEditor;
                    self.initTaskTemplate( config && config.data );
                },
                destructor: function TaskTemplateModel_destructor() {
                },
                /**
                 * Saves or updates current task
                 * @method save
                 */
                save: function() {
                    return false;
                },
                /**
                 * initializes task model
                 * @method initTask
                 * @param {Object} data
                 */
                initTaskTemplate: function TaskTemplateModel_initTask() {
                    var
                        self = this,
                        tp = self.get( 'type' );

                    self.locationList = ko.observableArray();

                    self.caseFolderCaption = i18n( 'TaskTemplateModel.text.SELECT_CASEFOLDER' );
                    self.caseFolderList = Y.doccirrus.schemas.casefolder.types.Additional_E.list;
                    self.caseFolderTypeList = Y.doccirrus.schemas.person.types.Insurance_E.list;
                    self.diagnosisCertList = Y.doccirrus.schemas.activity.types.DiagnosisCert_E.list;

                    var xmlValues = Y.doccirrus.ruleutils.makeAttributeList( 'MEASUREMENT' ),
                        xmlValuesObj = {}, key, path, xmlValuesList;

                    (xmlValues.list || []).filter( function( el ){
                        return (el.path || '').startsWith( 'd_extra.');
                    } ).forEach( function( el ){
                        key = (el.path || '').split( '.' ) || [];
                        key.pop();
                        path = key.join( '.' );
                        if(path && !xmlValuesObj[path]){
                            key.shift();
                            xmlValuesObj[path] = { path: path, i18n: key.join( ' ' ) };
                        }
                    } );
                    xmlValuesList = _.values( xmlValuesObj ) || [];
                    xmlValuesList.unshift( { path: null, i18n: '' } );
                    self.arrayFieldList = ko.observableArray( xmlValuesList );

                    self.taskTypeObj = ko.observable();
                    self.candidatesObj = ko.observableArray([]);
                    self.changedTaskType = ko.observable( false );

                    self.initCandidates();
                    self.initTaskType();
                    self.initSelect2Role();
                    self.initSelect2Form();
                    self.initSelect2Activity();
                    self.initSelect2Markers();

                    self.formId.hasError = ko.pureComputed( function() {

                        var type = ko.unwrap( tp ),
                            formId = ko.unwrap( self.formId );
                        return type === 'TASK_WITH_FORM' && !formId;
                    } );

                    self.isValid = ko.pureComputed( function() {
                        var valid = true,
                            type = ko.unwrap( self.get( 'type' ) );

                        if( 'ACTIVITY' === type ) {
                            if (!self.actTypeAutocomplete.val() ){
                                return false; // actType should be selected
                            }

                            if( 'TREATMENT' === self.actTypeAutocomplete.val() || 'DIAGNOSIS' === self.actTypeAutocomplete.val() ){
                                if (!self.codeAutocomplete.val() ){
                                    return false; // code should be selected
                                }

                                if ( 'DIAGNOSIS' === self.actTypeAutocomplete.val() && !self.diagnosisCert() ){
                                    return false;
                                }

                                valid = _.includes( self.RuleSetEditor.caseFolderType(), 'CASEFOLDER' ) || _.includes( self.RuleSetEditor.caseFolderType(), self.caseFolderAutocomplete.val() );
                            }

                            if( self.linkActivities() && _.includes( self.RuleSetEditor.caseFolderType(), 'CASEFOLDER' ) ) {
                                return false;
                            }
                        } else {
                            valid = self._isValid() && !self.formId.hasError(); // TASK & TASK_WITH_FORM
                        }

                        return valid;
                    } );

                    self.addDisposable( ko.computed( function() {
                        var
                            candidatesObj = self.candidatesObj();
                        self.candidates( candidatesObj.map( function( candidate ) {
                            return candidate.id;
                        } ) );
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var
                            taskTypeObj = self.taskTypeObj(),
                            changedTaskType =  peek( self.changedTaskType );

                        if( changedTaskType ) {
                            self.title( taskTypeObj.title || '' );
                            self.details( taskTypeObj.details || '' );
                            self.urgency( taskTypeObj.urgency || '' );
                            self.candidates( taskTypeObj.candidates || [] );
                            self.candidatesObj( taskTypeObj.candidatesObj && taskTypeObj.candidatesObj.map( function( employee ) {
                                    return {
                                        id: employee._id,
                                        text: Y.doccirrus.schemas.person.personDisplay( employee )
                                    };
                                } ) || [] );
                            self.roles( taskTypeObj.roles || [] );
                            self.days( taskTypeObj.days || '' );
                            self.hours( taskTypeObj.hours || '' );
                            self.minutes( taskTypeObj.minutes || '' );
                        }
                    } ) );

                },

                /**
                 * Coverts employee object to selec2 object
                 * @method personToSelect2Object
                 * @param {String} text
                 * @returns {Object}
                 */
                personToSelect2Object: function( person ) {
                    if( !person ) {
                        return person;
                    }
                    return {
                        id: person._id,
                        text: Y.doccirrus.schemas.person.personDisplay( person )
                    };
                },

                initCandidates: function() {
                    var
                        self = this;
                        var employees = ko.unwrap( self.RuleSetEditor.employees ),
                        candidates = ko.unwrap( self.candidates );
                    employees.forEach( function( employee ) {
                        if( -1 !== candidates.indexOf( employee.id ) ) {
                            self.candidatesObj.push( employee );
                        }
                    });
                    self.initSelect2Employee();
                },

                initTaskType: function() {
                    var
                        self = this,
                        taskTypes = ko.unwrap( self.RuleSetEditor.taskTypes ),
                        taskType = ko.unwrap( self.taskType );
                    if( taskType ) {
                        taskTypes.forEach( function( item ) {
                            if( item.id === taskType ) {
                                self.taskTypeObj( item );
                                self.taskType( item.id );
                            }
                        });
                    }
                    self.initSelect2TaskType();
                },

                initSelect2Form: function() {
                    var
                        self = this,
                        //formCats = Y.dcforms.getCategories( true, true, true, true, true, true, true ),
                        formCats = Y.dcforms.getCategories( {
                            'withArchiv': true,
                            'withGHD': true,
                            'withInSight2': true,
                            'withEDMP': true,
                            'withEnvelopes': true,
                            'withTelekardio': true,
                            'withDOQUVIDE': true,
                            'withInGyn': true
                        } );

                    function compareAlphabetical( a, b ) {
                        if( a.title[userLang] < b.title[userLang] ) {
                            return -1;
                        }
                        if( a.title[userLang] > b.title[userLang] ) {
                            return 1;
                        }
                        return 0;
                    }

                    function createSelect2Form( data, placeholder ) {
                        return {
                            val: self.addDisposable( ko.computed( {
                                read: function() {
                                    var
                                        formId = ko.unwrap( self.formId );
                                    return formId;
                                },
                                write: function( $event ) {
                                    self.formId( $event.val );
                                }
                            } ) ),
                            select2: {
                                allowClear: true,
                                placeholder: placeholder,
                                width: '100%',
                                data: data
                            }
                        };
                    }

                    Y.dcforms.getFormList( '', false, function( err, result ) {

                        var
                            dataGroupedDC = {},
                            dataGroupedUser = {},
                            data = result.map( function( dt ) {
                                var cat = formCats.filter( function( cat ) {
                                    return cat.canonical === dt.category;
                                } );

                                cat = cat.length > 0 ? cat[0] : null;

                                dt.category = cat ? cat[userLang] : dt.category;
                                return dt;
                            } );

                        if( !err ) {

                            data.forEach( function( dt ) {
                                var
                                    dataGrouped = dt.isReadOnly ? dataGroupedDC : dataGroupedUser;

                                if( dataGrouped[dt.category] ) {
                                    dataGrouped[dt.category].push( dt );
                                } else {
                                    dataGrouped[dt.category] = [dt];
                                }
                            } );

                            Object.keys( dataGroupedDC ).forEach( function( key ) {
                                dataGroupedDC[key].sort( compareAlphabetical );
                            } );

                            dataGroupedDC = Object.keys( dataGroupedDC ).sort().map( function( key ) {
                                return {
                                    text: key,
                                    children: dataGroupedDC[key].map( map2Form )
                                };
                            } );

                            dataGroupedUser = Object.keys( dataGroupedUser ).map( function( key ) {
                                return {
                                    text: key,
                                    children: dataGroupedUser[key].map( map2Form )
                                };
                            } );
                        }

                        self.select2FormDC = createSelect2Form( dataGroupedDC, 'Doc Cirrus Formulare' );
                        self.select2FormPRAC = createSelect2Form( dataGroupedUser, 'Praxis Formulare' );
                    } );

                },

                initSelect2Employee: function() {

                    var
                        self = this;

                    self.select2Candidates = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                return ko.unwrap( self.candidatesObj );
                            },
                            write: function( $event ) {
                                if( Y.Object.owns( $event, 'added' ) ) {
                                    self.candidatesObj.push( $event.added );
                                    self.candidates.push( $event.added.id );
                                }
                                if( Y.Object.owns( $event, 'removed' ) ) {
                                    self.candidates.remove( $event.removed.id );
                                    self.candidatesObj.remove( function( candidate ) {
                                        return candidate.id === $event.removed.id;
                                    } );
                                }
                            }
                        } ) ),
                        select2: {
                            multiple: true,
                            width: '100%',
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.employee.getEmployeeByName( {
                                    query: {
                                        term: query.term
                                    }
                                } ).done( function( response ) {
                                        var
                                            data = response.data;
                                        query.callback( {
                                            results: data.map( function( employee ) {
                                                return {
                                                    id: employee._id,
                                                    text: Y.doccirrus.schemas.person.personDisplay( employee )
                                                };
                                            } )
                                        } );
                                    }
                                ).fail( function() {
                                    query.callback( {
                                        results: []
                                    } );
                                } );
                            }
                        }
                    };

                    Promise.resolve( Y.doccirrus.jsonrpc.api.location
                        .read()
                        .then( function( response ) {
                            var currentUserEmployeeId = Y.doccirrus.auth.getUserEmployeeId();
                            var locations = response && response.data || [];
                            self.locationList( locations );
                            if( self.isNew() ) {
                                self.locations( locations.filter( function( entry ) {
                                    return entry.employees.some( function( employee ) {
                                        return employee._id === currentUserEmployeeId;
                                    } );
                                } ).map( function( entry ) {
                                    return {_id: entry._id, locname: entry.locname};
                                } ) );
                            }
                            self.select2Locations.select2.data = locations.map( function( entry ) {
                                return {id: entry._id, text: entry.locname};
                            } );
                        } ) );

                    self.select2Locations = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    value = self.locations();

                                return value.map( function( location ) {

                                    return {
                                        id: peek( location._id ),
                                        text: peek( location.locname )
                                    };
                                } );

                            },
                            write: function( $event ) {
                                var
                                    value = $event.val;

                                self.locations( peek( self.locationList ).filter( function( location ) {
                                    return value.indexOf( peek( location._id ) ) > -1;
                                } ) );
                            }
                        } ) ),
                        select2: {
                            placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                            width: '100%',
                            multiple: true,
                            data: []
                        }
                    };

                },

                /**
                 * Initializes select2 for role
                 * @method initSelect2Role
                 */
                initSelect2Role: function() {
                    var
                        self = this;

                    self.select2Role = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    roles = ko.unwrap( self.roles );
                                roles = roles.map( function( roleValue ) {
                                    return { id: roleValue, text: roleValue };
                                } );
                                return roles;
                            },
                            write: function( $event ) {
                                if( Y.Object.owns( $event, 'added' ) ) {
                                    self.roles.push( $event.added.text );
                                }
                                if( Y.Object.owns( $event, 'removed' ) ) {
                                    self.roles.remove( $event.removed.text );
                                }
                            }
                        } ) ),
                        select2: {
                            multiple: true,
                            width: '100%',
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.role.get( {
                                    query: {
                                        value: { $regex: query.term, $options: 'i' }
                                    }
                                } ).done( function( response ) {
                                        var
                                            data = response.data;
                                        query.callback( {
                                            results: data.map( function( role ) {
                                                if( !role ) {
                                                    return role;
                                                }
                                                return {
                                                    id: role.value,
                                                    text: role.value
                                                };
                                            } )
                                        } );
                                    }
                                ).fail( function() {
                                    query.callback( {
                                        results: []
                                    } );
                                } );
                            },
                            formatResult: function( obj ) {
                                return obj.text;
                            }
                        }
                    };

                },

                /**
                 * Initializes select2 for role
                 * @method initSelect2Activity
                 */
                initSelect2Activity: function() {
                    var
                        self = this;

                    function getCatalogShortFilter( catalogShorts ) {
                        if( !Array.isArray( catalogShorts ) ) {
                            return function() {
                                return true;
                            };
                        }
                        return function( entry ) {
                            return -1 !== catalogShorts.indexOf( entry.short );
                        };
                    }

                    function catalogShortMapper( entry ) {
                        return { id: entry.short, text: entry.short };
                    }

                    self.actTypeAutocomplete = {
                        val: ko.computed( {
                            read: function() {
                                var
                                    actType = ko.unwrap( self.actType );
                                return actType;
                            },
                            write: function( $event ) {
                                self.actType( $event.val );
                            }
                        } ),
                        select2: {
                            placeholder: 'Aktivität',
                            allowClear: false,
                            data: Y.doccirrus.ruleutils.getActTypeList( ['sd1','sd3','sd4'] )
                        }
                    };

                    self.caseFolderAutocomplete = {
                        val: ko.computed( {
                            read: function() {
                                return self.caseFolderType();
                            },
                            write: function( $event ) {
                                self.caseFolderType( $event.val );
                            }
                        } ),
                        select2: {
                            placeholder: 'Fall',
                            data: self.caseFolderTypeList.map( function( entry ) {
                                return { id: entry.val, text: entry.i18n };
                            } )
                        }
                    };

                    self.catalogShortAutocomplete = {
                        val: ko.computed( {
                            read: function() {
                                return self.catalogShort();
                            },
                            write: function( $event ) {
                                self.catalogShort( $event.val );
                            }
                        } ),
                        select2: {
                            placeholder: 'Katalog',
                            allowClear: true,
                            query: function( query ) {
                                var insuranceType = self.caseFolderType(),
                                    actType = self.actType(),
                                    catalogShorts, criteria, allowedTreatmentCodes;
                                if( actType ) {
                                    criteria = { actType: actType };
                                }

                                if( 'TREATMENT' === actType ) {
                                    allowedTreatmentCodes = Y.doccirrus.schemas.catalog.getShortNameByInsuranceType(
                                        Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[insuranceType || 'ANY'],
                                        insuranceType
                                    );
                                }

                                catalogShorts = Y.doccirrus.catalogmap.getCatalogs( criteria );

                                query.callback( { results: (catalogShorts || []).filter( getCatalogShortFilter( allowedTreatmentCodes ) ).map( catalogShortMapper ) } );
                            },
                            initSelection: function( element, callback ) {
                                var catalogShort = self.catalogShort();
                                if( !catalogShort ) {
                                    return callback( null );
                                }
                                callback( { id: catalogShort, text: catalogShort } );
                            }

                        }
                    };

                    self.actType.subscribe( function() {
                        self.caseFolderType( null );
                        self.explanations( null );
                    } );
                    self.caseFolderType.subscribe( function() {
                        self.catalogShort( null );
                    } );
                    self.catalogShort.subscribe( function() {
                        self.code( null );
                    } );

                    function fail( response ) {
                        var
                            errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

                        if( errors.length ) {
                            Y.Array.invoke( errors, 'display' );
                        }
                    }

                    function catalogCodeMapper( entry ) {
                        if( entry.messages && !entry.title ) {
                            entry.title = Y.doccirrus.schemas.catalog.getMessageInLanguage( entry.messages, Y.config.lang );
                        }

                        return { id: entry.seq, text: entry.title, _data: entry };
                    }

                    self.codeAutocomplete = {
                        val: ko.computed( {
                            read: function() {
                                return self.code();
                            },
                            write: function( $event ) {
                                self.code( $event.val );
                            }
                        } ),
                        select2: {
                            placeholder: 'Code',
                            allowClear: true,
                            dropdownAutoWidth: true,
                            minimumInputLength: 1,
                            dropdownCssClass: 'dc-select2-createActivityCodeAutoComplete',
                            formatSelection: function format( result ) {
                                return self.catalogShort() === 'BIOTRONIK' ? result.text : result.id;
                            },
                            createSearchChoice: function( term ) {
                                return {id: term, text: term};
                            },
                            formatResult: function( result, container, query, escapeMarkup ) {
                                var
                                    term = query.term,
                                    code = result.id,
                                    text = result.text,
                                    select2formatCode = [],
                                    select2formatText = [],
                                    catalogShort = self.catalogShort();

                                window.Select2.util.markMatch( code, term, select2formatCode, escapeMarkup );
                                select2formatCode = select2formatCode.join( '' );
                                window.Select2.util.markMatch( text, term, select2formatText, escapeMarkup );
                                select2formatText = select2formatText.join( '' );

                                if('BIOTRONIK' !== catalogShort) {
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
                                } else {
                                    return Y.Lang.sub( [
                                        '<div class="dc-select2-createActivityCodeAutoComplete-formatResult" title="{select2formatText}">',
                                        '<span class="dc-select2-createActivityCodeAutoComplete-formatResult-text">{select2formatText}</span>',
                                        '</div>'
                                    ].join( '' ), { select2formatText: select2formatText } );
                                }

                            },
                            formatResultCssClass: function( result ) {
                                var
                                    type = 'textform-homecatalog';

                                if( result._data && !result._data.count && 0 !== result._data.count  ) { //catalogEntry
                                    type = 'textform-originalcatalog';
                                }

                                return type;
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
                                        locationId: { $exists: true },
                                        tags: []
                                    },
                                    data: {
                                        _includeCatalogText: true
                                    }
                                } ).done( function( response ) {
                                    var resultData = _.uniq(response.data || [], 'seq');
                                    query.callback( { results: resultData.map( catalogCodeMapper ) } );
                                } ).fail( fail );
                            },
                            initSelection: function( element, callback ) {
                                var code = self.code();
                                callback( {id: code, text: code} );
                            }
                        }
                    };
                },

                initSelect2Markers: function() {
                    var
                        self = this,
                        severity = ko.unwrap( self.RuleSetEditor.severities ),
                        markers = ko.unwrap( self.RuleSetEditor.markers );
                    function format( selected ) {
                        return '<i class="'+ selected.icon +'" aria-hidden="true" style="color: ' + (severity[selected.severity] || 'black') + '"></i>&nbsp' + selected.text;
                    }

                    self.markersAutocomplete = {
                        val: ko.computed( {
                            read: function() {
                                var
                                    value = self.markers() || null;
                                return value;
                            },
                            write: function( $event ) {
                                var
                                    value = $event.val;

                                self.markers( value );
                            }
                        } ),
                        select2: {
                            allowClear: true,
                            width: '100%',
                            multiple: true,
                            data: markers,
                            maximumSelectionSize: 10,
                            formatResult: format,
                            formatSelection: format

                        }
                    };
                },

                initSelect2TaskType: function() {
                    var
                        self = this;

                    self.select2TaskType = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    taskTypeObj = ko.unwrap( self.taskTypeObj ) || null;
                                return taskTypeObj;
                            },
                            write: function( $event ) {
                                self.changedTaskType( true );
                                self.taskTypeObj( $event.added );
                                self.taskType( $event.val );
                                if( $event.added && $event.added.type && Y.doccirrus.schemas.tasktype.taskTypes.DEFAULT === $event.added.type ) {
                                    self.type( '' );
                                } else {
                                    self.type( $event.added && $event.added.type );
                                }
                            }
                        } ) ),
                        select2: {
                            width: '100%',
                            allowClear: true,
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.tasktype.getForTypeTable( {
                                    query: {
                                        name: {
                                            $regex: query.term,
                                            $options: 'i'
                                        },
                                        _id: { $ne: "000000000000000000000001" }
                                    },
                                    options: {
                                        itemsPerPage: 15
                                    },
                                    fields: [ 'name' ]
                                } ).done( function( response ) {
                                        var
                                            data = response && response.data || [];
                                        query.callback( {
                                            results: data.map( function( tasktype ) {
                                                return self.select2TaskTypeMapper( tasktype );
                                            } )
                                        } );
                                    }
                                ).fail( function() {
                                    query.callback( {
                                        results: []
                                    } );
                                } );
                            },
                            formatResult: function( obj ) {
                                return obj.text;
                            }
                        }
                    };
                },
                select2TaskTypeMapper: function( tasktype ) {
                    return {
                        id: tasktype._id,
                        text: tasktype.name,
                        type: tasktype.type,
                        title: tasktype.title,
                        urgency: tasktype.urgency,
                        days: tasktype.days,
                        minutes: tasktype.minutes,
                        hours: tasktype.hours,
                        details: tasktype.details,
                        roles: tasktype.roles,
                        candidates: tasktype.candidates,
                        candidatesNames: tasktype.candidatesNames,
                        candidatesObj: tasktype.candidatesObj
                    };
                },

                /**
                 * Removes current task
                 * @method remove
                 */
                remove: function() {
                    return false;
                }
            },
            {
                schemaName: 'tasktemplate',
                NAME: 'TaskTemplateModel'
            }
        )
        ;
        KoViewModel.registerConstructor( TaskTemplateModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'casefolder-schema',
            'tasktemplate-schema',
            'tasktype-schema',
            'dcforms-utils',
            'person-schema',
            'dcrequestchangesmodal',
            'dcgenerateidmirrorpatient'
        ]
    }
)
;
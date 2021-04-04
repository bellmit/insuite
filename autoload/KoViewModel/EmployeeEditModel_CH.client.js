/**
 * User: oliversieweke
 * Date: 15.01.19  14:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, ko, jQuery*/

YUI.add( 'EmployeeEditModel_CH', function( Y/*, NAME */ ) {
        'use strict';
        var KoViewModel = Y.doccirrus.KoViewModel;
        var i18n = Y.doccirrus.i18n,
            LANR_ALTERNATIVE_VALUE = '999999900';

        // WARNING: This model is written to have the look and feel of a stand-alone model, it should however only be used as an extension to the base EmployeeEditModel.

        function EmployeeEditModel_CH( config ) {
            EmployeeEditModel_CH.superclass.constructor.call( this, config );
        }

        Y.extend( EmployeeEditModel_CH, Y.Base, {
                initializer: function EmployeeEditModel_CH_initializer() {
                    var self = this;

                    self.placeholderGlnNumberI18n = i18n( 'physician-schema.Physician_T.glnNumber.i18n' );
                    self.placeholderZsrNumberI18n = i18n( 'physician-schema.Physician_T.zsrNumber.i18n' );
                    self.placeholderKNumberI18n = i18n( 'physician-schema.Physician_T.kNumber.i18n' );
                    self.qualiDignitiesI18n = i18n( 'employee-schema.Employee_CH_T.qualiDignities.i18n' );
                    self.quantiDignitiesI18n = i18n( 'employee-schema.Employee_CH_T.quantiDignities.i18n' );
                    self.switzerlandTitleI18n = i18n( 'employee-schema.Employee_CH_T.switzerlandTitle.i18n' );

                    // jobStatus is required value, set value to allow save it
                    if( self.jobStatus && !self.jobStatus() ) {
                        self.jobStatus( 'EMPLOYEE' );
                        self.setNotModified();
                    }


                    self.initSelect2Dignities( 'quali' );
                    self.initSelect2Dignities( 'quanti' );
                    self.initValidationSubscriptions();
                },
                destructor: function EmployeeEditModel_CH_destructor() {},
                initSelect2OfficialNo: function EmployeeEditModel_D_initSelect2OfficialNo() {
                    var
                        self = this;

                    self.select2OfficialNo = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    officialNo = self.officialNo();

                                if( officialNo ) {
                                    return {id: officialNo, text: officialNo};
                                }
                                else {
                                    return null;
                                }
                            },
                            write: function( $event ) {
                                self.officialNo( $event.val );
                            }
                        } ) ),
                        select2: {
                            minimumInputLength: 1,
                            allowClear: true,
                            placeholder: i18n( 'EmployeeModel.officialNo.placeholder' ),
                            query: function( query ) {

                                function done( data ) {
                                    var
                                        results = [].concat( data );

                                    // reject existing "Ersatzwert"
                                    results = Y.Array.filter( results, function( item ) {
                                        return item.lanr !== LANR_ALTERNATIVE_VALUE;
                                    } );
                                    // allow entries not in list
                                    if( 0 === data.length ) {
                                        results.unshift( {
                                            "lanr": query.term,
                                            "parentBsnr": "",
                                            "bsnrList": [],
                                            "lanrList": []
                                        } );
                                    }
                                    // first entry "Ersatzwert"
                                    results.unshift( {
                                        "lanr": LANR_ALTERNATIVE_VALUE,
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
                                    alternativeValueText = i18n( 'EmployeeModel.officialNo.alternativeValueText' ),
                                    postFix = '',
                                    classNames = [];

                                window.Select2.util.markMatch( result.text, query.term, select2formatResult, escapeMarkup );
                                select2formatResult = select2formatResult.join( '' );
                                if( result._data.lanr === LANR_ALTERNATIVE_VALUE ) {
                                    postFix = ' <span class="select2-match">(' + alternativeValueText + ')</span>';
                                }
                                return Y.Lang.sub( '<span class="{classNames}">{text}{postFix}</span>', {
                                    text: select2formatResult,
                                    classNames: classNames.join( ' ' ),
                                    postFix: postFix
                                } );
                            },
                            formatResultCssClass: function( result ) {
                                if( LANR_ALTERNATIVE_VALUE === result.id ) {
                                    return 'dc-select2-result-replacementValue';
                                } else {
                                    return '';
                                }
                            }
                        },
                        init: function( element ) {

                            jQuery( element ).on( 'select2-selected', function( $event ) {
                                var
                                    officalNo = $event.val,
                                    isAsvPseudoNo = self._isAsvPseudoNo( officalNo );

                                if( !Y.doccirrus.validations.common._lanr( officalNo ) || LANR_ALTERNATIVE_VALUE === officalNo ) {
                                    return;
                                }

                                if( isAsvPseudoNo ) {
                                    self.showAsvPseudoNoDialog();
                                    return;
                                }

                                Y.doccirrus.jsonrpc.api.kbv.checkLanr( {query: {lanr: officalNo}} ).done( function( result ) {
                                    var exists = result && result.data && result.data && result.data.exists;

                                    if( exists ) {
                                        return;
                                    }

                                    self.showCheckLanrDialog();

                                } );

                            } );
                        }
                    };
                },
                initSelect2Dignities: function initSelect2Dignities( type ) {
                    // Initially the texts corresponding to the dignity codes are searched.
                    // When selecting new dignities the codes and texts are fetched together, the code is saved to the
                    // dignity field, in addition the text is saved to the ko observable 'dignitiesWithTextObservableName'
                    // which is only used for the display

                    var self = this;
                    var searchDignityTextPromises;
                    var dignitiesObservableName = type + 'Dignities'; // qualiDignities || quantiDignities
                    var dignitiesWithTextObservableName = type + 'DignitiesWithText'; // qualiDignitiesWithText || quantiDignitiesWithText
                    var select2DignitiesVariableName = 'select2' + type.charAt( 0 ).toUpperCase() + type.slice( 1 ) + 'Dignities'; // select2QualiDignities || select2QuantiDignities
                    self[dignitiesWithTextObservableName] = ko.observableArray(); // Used for the text display (the 'qualiDignities' and 'quantiDignities' fields only contain codes)

                    // Getting texts for initial dignity codes:
                    searchDignityTextPromises = ko.unwrap( self[dignitiesObservableName] ).map( function( code ) {
                        return Promise.resolve( Y.doccirrus.jsonrpc.api.catalog.getTarmedDignities( {
                            type: type,
                            query: {code: code},
                            options: {limit: 1}
                        } ) ).then( function( response ) {
                            var entry = response && response.data && response.data[0];
                            var text = entry && entry.text || code;

                            self[dignitiesWithTextObservableName].push( {
                                id: code,
                                text: text
                            } );

                            if( !entry || !entry.text ) { // No text was found (text defaulted to the code)
                                throw new Y.doccirrus.commonerrors.DCError( 'dignity_01_' + type ); // dignity_01_quali || dignity_01)quanti;
                            }
                        } )
                            .catch( function( err ) {
                                self[dignitiesWithTextObservableName].push( {
                                    id: code,
                                    text: code // default text to code
                                } );

                                throw err;
                            } );
                    } );

                    Promise.all( searchDignityTextPromises ) // This is to handle possible errors only once for all requests
                        .catch( function( err ) {
                            return Y.doccirrus.DCWindow.notice( {
                                message: Y.doccirrus.errorTable.getMessage( err )
                            } );
                        } );

                    self[select2DignitiesVariableName] = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                return ko.unwrap( self[dignitiesWithTextObservableName] );
                            },
                            write: function( $event ) {
                                self[dignitiesObservableName]( $event.val );
                                if( $event.added ) {
                                    self[dignitiesWithTextObservableName].push( $event.added );
                                }
                                if( $event.removed ) {
                                    self[dignitiesWithTextObservableName].remove( function( item ) {
                                        return item.id === $event.removed.id;
                                    } );
                                }
                            }
                        } ) ),
                        select2: {
                            multiple: true,
                            allowClear: true,
                            placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                            query: select2QualiDignityQuery,
                            formatSelection: function( result ) {
                                return result.text;
                            }
                        }
                    };

                    function select2QualiDignityQuery( search ) {
                        Promise.resolve( Y.doccirrus.jsonrpc.api.catalog.getTarmedDignities( {
                            type: type,
                            searchTerm: search.term
                        } ) )
                            .then( function( response ) {
                                var data,
                                    results = [];
                                if( 'select2QualiDignities' === select2DignitiesVariableName ) {
                                    data = [
                                        {
                                            text: i18n( 'employee-schema.Employee_CH_T.groups.specialisationAndTitles' ),
                                            children: []
                                        },
                                        {
                                            text: i18n( 'employee-schema.Employee_CH_T.groups.ProcedureLicenses' ),
                                            children: []
                                        }];
                                    response.data.sort(function(a, b) {
                                        var value1 = a.text.replace("FA", "").trim().toUpperCase();
                                        var value2 = b.text.replace("FA", "").trim().toUpperCase();
                                        if( value1 < value2 ) { return -1; }
                                        if( value1 > value2 ) { return 1; }
                                        return 0;
                                    }).map( function( entry ) {
                                        var checkEntry = -1 !== entry.text.indexOf('FA'),
                                            text = entry.text.replace("FA", "").trim();
                                        text = text.charAt(0).toUpperCase() + text.slice(1);
                                        if( checkEntry && "0" === entry.fmh ) {
                                            data[1].children.push( {id: entry.code, text: text } );
                                        } else {
                                            data[0].children.push( {id: entry.code, text: text } );
                                        }
                                    } );
                                    data.forEach( function( item ) {
                                        if( 0 <  item.children.length ) {
                                            results.push( item );
                                        }
                                    });
                                } else {
                                    results = response.data.map( function( item ) {
                                        return {
                                            id: item.code,
                                            text: item.text
                                        };
                                    } );
                                }
                                search.callback( {results: results} );
                            } )
                            .catch( function( err ) {
                                return Y.doccirrus.DCWindow.notice( {
                                    message: Y.doccirrus.errorTable.getMessage( err )
                                } );
                            } );
                    }
                },

                initValidationSubscriptions: function initValidationSubscriptions() {
                    var self = this,
                        glnValidationRequired = self.glnNumber.validationFunction.find(function( proxyValidator ) {
                            return proxyValidator.validator.name === "mandatoryGlnNumber_CH";
                        }),
                        kNumberValidationRequired  = self.kNumber.validationFunction.find(function( proxyValidator ) {
                            return proxyValidator.validator.name === "mandatoryIfNotOwnZsrNumber_CH";
                        });

                    toggleGLNAndKNumValidation(ko.unwrap(self.type));

                    self.type.subscribe(function( type ) {
                        toggleGLNAndKNumValidation(type);
                    });

                    self.ownZsrNumber.subscribe( function( val ) {
                        if( val ) {
                            self.kNumber( "" );
                        } else {
                            self.zsrNumber( "" );
                        }

                        self.zsrNumber.validate();
                        self.glnNumber.validate();
                        self.kNumber.validate();
                    } );

                    function toggleGLNAndKNumValidation( type ) {
                        var glnValidatorIndex = self.glnNumber.validationFunction.indexOf( glnValidationRequired ),
                            kNumValidatorIndex = self.kNumber.validationFunction.indexOf( kNumberValidationRequired );

                        if( type === "PHYSICIAN" ) {
                            if( glnValidatorIndex === -1 ) {
                                self.glnNumber.validationFunction.push( glnValidationRequired );
                            }
                            if( kNumValidatorIndex === -1 ) {
                                self.kNumber.validationFunction.push( kNumberValidationRequired );
                            }
                        } else {
                            if( glnValidatorIndex !== -1 ) {
                                self.glnNumber.validationFunction.splice( glnValidatorIndex, 1 );
                            }
                            if( kNumValidatorIndex !== -1 ) {
                                self.kNumber.validationFunction.splice( kNumValidatorIndex, 1 );
                            }
                        }
                        self.glnNumber.validate();
                        self.kNumber.validate();
                    }

                    self.glnNumber.subscribe( function( value ) {
                        //Prevent to send empty value to API
                        if( value === "" ) {
                            self.glnNumber( undefined );
                        }
                    } );

                    self.kNumber.subscribe( function( value ) {
                        //Prevent to send empty value to API
                        if( value === "" ) {
                            self.kNumber( undefined );
                        }
                    } );
                }
            },
            {
                NAME: 'EmployeeEditModel_CH'
            } );

        KoViewModel.registerConstructor( EmployeeEditModel_CH );
    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel'
        ]
    }
);
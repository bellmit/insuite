/*
 @author: mp
 @date: 2013/11/10
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

'use strict';

YUI.add( 'dcinsurancestatusmodel', function( Y ) {

        var
            i18n = Y.doccirrus.i18n,
            InsuranceStatusModel;

        /**
         * Read a physician employee by _id
         * @param {String} employeeId
         * @return {Object}
         * @async
         */
        function readPhysicianEmployeeById( employeeId ) {
            return Y.doccirrus.jsonrpc.api.employee
                .read( {query: {_id: employeeId, type: 'PHYSICIAN'}} )
                .then( function( response ) {
                    return response && response.data && response.data[0] || null;
                } );
        }

        /**
         * Read the physician employees of a location _id
         * @param {String} locationId
         * @return {Object}
         * @async
         */
        function readPhysicianEmployeesInLocationId( locationId ) {
            return Y.doccirrus.jsonrpc.api.employee
                .read( {query: {"locations._id": locationId, type: 'PHYSICIAN'}} )
                .then( function( response ) {
                    return response && response.data || [];
                } );
        }

        /**
         * Check that a physician employee _id is in a location _id
         * @param {String} employeeId
         * @param {String} locationId
         * @return {Boolean}
         * @async
         */
        function checkPhysicianEmployeeIdIsInLocationId( employeeId, locationId ) {
            return Y.doccirrus.jsonrpc.api.employee
                .read( {query: {_id: employeeId, "locations._id": locationId, type: 'PHYSICIAN'}} )
                .then( function( response ) {
                    var
                        results = response && response.data || [];

                    return Boolean( results.length );
                } );
        }

        function daleUvInsuranceSearchMapper( entry ) {
            return {id: entry.iknr, text: entry.name + (entry.iknr ? ' (' + entry.iknr + ')' : ''), _data: entry};
        }

        InsuranceStatusModel = function InsuranceStatusModel( insurance ) {
            var
                self = this;
            self._modelName = 'InsuranceStatusModel';
            Y.doccirrus.uam.ViewModel.call( self );
            Y.doccirrus.uam.SubViewModel.call( self, insurance );

            self._runBoilerplate( insurance );

            // FIXME: this must be pulled out into the DB (lightweight catalog) at some point
            // NOTE: obsolete, because unused
            self._insuranceId = [
                {
                    val: "000", de: "keine eigene Versicherung"
                },
                {
                    val: "001", de: "Pensionsversicherungsanstalt"
                },
                {
                    val: "002", de: "Pensionsversicherungsanstalt "
                },
                {
                    val: "005", de: "Versicherungsanstalt für Eisenbahnen und Bergbau"
                },
                {
                    val: "007", de: "Versicherungsanstalt öffentlich Bediensteter "
                },
                {
                    val: "008", de: "Allgemeine Unfallversicherungsanstalt "
                },
                {
                    val: "011", de: "Wiener Gebietskrankenkasse"
                },
                {
                    val: "012", de: "Niederösterreichische Gebietskrankenkasse "
                },
                {
                    val: "013", de: "Burgenländische Gebietskrankenkasse"
                },
                {
                    val: "014", de: "Oberösterreichische Gebietskrankenkasse "
                },
                {
                    val: "015", de: "Steiermärkische Gebietskrankenkasse"
                },
                {
                    val: "016", de: "Kärntner Gebietskrankenkasse "
                },
                {
                    val: "017", de: "Salzburger Gebietskrankenkasse "
                },
                {
                    val: "018", de: "Tiroler Gebietskrankenkasse"
                },
                {
                    val: "019", de: "Vorarlberger Gebietskrankenkasse "
                },
                {
                    val: "021", de: "Betriebskrankenkasse Austria Tabak"
                },
                {
                    val: "022", de: "Betriebskrankenkasse der Wiener Verkehrsbetriebe"
                },
                {
                    val: "024", de: "Betriebskrankenkasse Mondi"
                },
                {
                    val: "025", de: "Betriebskrankenkasse voestalpine Bahnsysteme"
                },
                {
                    val: "026", de: "Betriebskrankenkasse Zeltweg "
                },
                {
                    val: "028", de: "Betriebskrankenkasse Böhler"
                },
                {
                    val: "040", de: "Sozialversicherungsanstalt der gewerblichen Wirtschaft (SVA) "
                },
                {
                    val: "041", de: "SVA, Landesstelle Wien"
                },
                {
                    val: "042", de: "SVA, Landesstelle Niederösterreich"
                },
                {
                    val: "043", de: "SVA, Landesstelle Burgenland "
                },
                {
                    val: "044", de: "SVA, Landesstelle Oberösterreich"
                },
                {
                    val: "045", de: "SVA, Landesstelle Steiermark "
                },
                {
                    val: "046", de: "SVA, Landesstelle Kärnten"
                },
                {
                    val: "047", de: "SVA, Landesstelle Salzburg"
                },
                {
                    val: "048", de: "SVA, Landesstelle Tirol"
                },
                {
                    val: "049", de: "SVA, Landesstelle Vorarlberg"
                },
                {
                    val: "050", de: "Sozialversicherungsanstalt der Bauern "
                },
                {
                    val: "01A", de: "Krankenfürsorgeanstalt der Bediensteten der Stadt Wien "
                },
                {
                    val: "02A", de: "Krankenfürsorgeanstalt der Beamten der Stadtgemeinde Baden "
                },
                {
                    val: "04A", de: "Krankenfürsorge für die Beamten der Landeshauptstadt Linz "
                },
                {
                    val: "04B", de: "Kranken- und Unfallfürsorge für oberösterreichische Gemeindebeamte"
                },
                {
                    val: "04C", de: "Krankenfürsorgeanstalt für oberösterreichische Landesbeamte "
                },
                {
                    val: "04D", de: "Oberösterreichische Lehrer-Kranken- und Unfallfürsorge "
                },
                {
                    val: "04E", de: "Krankenfürsorge für die Beamten des Magistrates Steyr "
                },
                {
                    val: "04F", de: "Krankenfürsorge für oberösterreichische Beamten der Stadt Wels "
                },
                {
                    val: "05A", de: "Krankenfürsorgeanstalt für die Beamten der Landeshauptstadt Graz "
                },
                {
                    val: "05B", de: "Krankenfürsorgeanstalt der Stadtgemeinde Mürzzuschlag "
                },
                {
                    val: "06A", de: "Krankenfürsorgeanstalt für die Beamten der Stadt Villach "
                },
                {
                    val: "07A", de: "Krankenfürsorgeanstalt der Magistratsbeamten der Landeshauptstadt Salzburg"
                },
                {
                    val: "07B", de: "Krankenversicherungsfonds der Beamten der Gemeinde Badgastein "
                },
                {
                    val: "07C", de: "Krankenfürsorgeeinrichtung der Beamten der Stadtgemeinde Hallein"
                },
                {
                    val: "08A", de: "Kranken- und Unfallfürsorge der städtischen Beamten der Landeshauptstadt Innsbruck"
                },
                {
                    val: "08B", de: "Kranken- und Unfallfürsorge der Tiroler Gemeindebeamten "
                },
                {
                    val: "08C", de: "Kranken- und Unfallfürsorge der Tiroler Landesbeamten"
                },
                {
                    val: "08D", de: "Kranken- und Unfallfürsorge der Tiroler Landeslehrer "
                },
                {
                    val: "09A", de: "Krankenfürsorgeanstalt der Beamten der Landeshauptstadt Bregenz"
                }
            ];

            var
                // these are per browser settings a user sets up
                filter = Y.doccirrus.utils.getFilter();

            if( !self.locationId() ) {
                if( filter && filter.location ) {
                    insurance.locationId = filter.location;
                } else {
                    insurance.locationId = Y.doccirrus.schemas.location.getMainLocationId();
                }
                self.locationId( insurance.locationId );
            }
            
            self._locationList = Y.doccirrus.uam.ViewModel.createAsync( {
                cache: InsuranceStatusModel,
                initialValue: [],
                jsonrpc: Y.doccirrus.jsonrpc.api.location.read,
                converter: function( response ) {
                    return response.data;
                }
            } );

            // copied that pattern from activity-model ( MOJ-2434 )
            // NOTE: not needed, because now preloaded
            self._locationList.createAsync.deferred.done( function() {
                setTimeout( function() {
                    self.locationId( insurance.locationId ); // needs to be reset for the UI
                }, 1 );
            } );

            self._addDisposable( ko.computed( function() {
                var publicInsurance,
                    daleUvGkvCatalog = Y.doccirrus.catalogmap.getCatalogDALEUVKT();
                if( self._id ) {
                    return;
                }
                if( 'BG' !== self.type() ) {
                    return;
                }

                self._parent.insuranceStatus.peek().some( function( _insurance ) {
                    if( 'PUBLIC' === _insurance.type() ) {
                        publicInsurance = _insurance;
                        return;
                    }
                } );

                if( !publicInsurance || !publicInsurance.insuranceId.peek() ) {
                    return;
                }

                Y.doccirrus.jsonrpc.api.catalog.read( {
                    query: {
                        catalog: daleUvGkvCatalog.filename,
                        iknr: publicInsurance.insuranceId.peek()
                    },
                    options: {
                        itemsPerPage: 1
                    }
                } ).done( function( response ) {
                    var data = response && response.data;
                    if( Array.isArray( data ) && data.length ) {
                        self.daleUvInsuranceId( data[0].iknr );
                        self.daleUvInsuranceName( data[0].name );
                    }
                } );

            } ) );

            /**
             * check if view is the current panel to display
             * @param {String} panelType
             * @returns {Boolean}
             * @private
             */
            // NOTE: obsolete, because unused
            self._isVisiblePanelType = function( panelType ) {
                var type = self.type();
                return panelType === type;
            };

            /**
             * setting _abrechnungsbereiche will rebuild _costCarrierBillingSectionList
             * @type ko.observable
             */
            self._abrechnungsbereiche = ko.observable( insurance.abrechnungsbereiche );

            /**
             * maps abrechnungsbereiche Object to Array
             * @param {Object} object
             * @return {Array}
             * @private
             */
            self._abrechnungsbereicheMapper = function( object ) {
                var abrechnungsbereicheObject = ko.unwrap( object ),
                    abrechnungsbereicheArray = Y.Array.map( Y.Object.keys( abrechnungsbereicheObject ), function( key ) {
                        return {
                            ktab: key,
                            abrechnungsbereich: abrechnungsbereicheObject[key]
                        };
                    } );
                abrechnungsbereicheArray.sort( function( a, b ) {
                    return a.ktab - b.ktab;
                } );
                return abrechnungsbereicheArray;
            };

            /**
             * @property _costCarrierBillingSectionList
             * @type ko.computed
             * @returns {Array}
             * @private
             */
            self._costCarrierBillingSectionList = Y.doccirrus.uam.ViewModel.createAsync( {
                cache: InsuranceStatusModel,
                initialValue: [],
                jsonrpc: {
                    fn: Y.doccirrus.jsonrpc.api.catalog.catsearch,
                    params: self._addDisposable( ko.computed( function() {
                        var iknr = ko.unwrap( self.insuranceId ),
                            vknr = ko.unwrap( self.insuranceGrpId ),
                            valid = (Boolean( iknr ) && Boolean( vknr )),
                            catalog = Y.doccirrus.catalogmap.getCatalogSDKT();
                        if( valid && catalog ) {
                            return {
                                catalog: catalog.filename,
                                disableOnlyInvoiceIK: true,
                                query: { vknr: vknr },
                                sort: 'ktab,1'
                            };
                        }
                        return null;
                    } ) )
                },
                converter: function( response ) {
                    var
                        data = response.data;
                    if( data[0] ) {
                        return self._abrechnungsbereicheMapper( data[0].abrechnungsbereiche );
                    } else {
                        return [];
                    }
                }
            } );
            // on "_abrechnungsbereiche" change rebuild the _costCarrierBillingSectionList
            self._addDisposable( ko.computed( function() {
                var _abrechnungsbereiche = self._abrechnungsbereiche();
                if( !Y.Lang.isUndefined( _abrechnungsbereiche ) ) {
                    if( self._costCarrierBillingSectionList.inProgress && self._costCarrierBillingSectionList.inProgress() ) {
                        // while loading we have to destroy the async (there is no access to resolve)
                        self._costCarrierBillingSectionList = ko.observableArray( self._abrechnungsbereicheMapper( _abrechnungsbereiche ) );
                    } else {
                        self._costCarrierBillingSectionList( self._abrechnungsbereicheMapper( _abrechnungsbereiche ) );
                    }
                }
            } ) );

            /**
             * @type ko.computed
             * @returns {Array}
             * @private
             */
            self._feeScheduleList = Y.doccirrus.uam.ViewModel.createAsync( {
                cache: InsuranceStatusModel,
                initialValue: [],
                jsonrpc: Y.doccirrus.jsonrpc.api.kbv.gebuehrenordnung,
                converter: function( response ) {
                    var data = response.data;
                    if( data[0] && data[0].kvValue ) {
                        data = data[0].kvValue;
                    }
                    // no 'Einheitlicher Bewertungsmaßstab' should be in list
                    return Y.Array.filter( data, function( item ) {
                        return '0' !== item.key;
                    } );
                }
            } );

            /**
             * allows _resetPayer to reset
             * @type {boolean}
             * @private
             */
            self._resetAllowed = true;
            /**
             * resets payer values to their default values
             * if _resetAllowed = true
             * @private
             */
            self._resetPayer = function() {
                if( self._resetAllowed ) {
                    self.insuranceId( '' );
                    self.insuranceName( '' );
                    self.daleUvInsuranceId( '' );
                    self.daleUvInsuranceName( '' );
                    self._costCarrierBillingSectionList( [] );
                    self.costCarrierBillingGroup( '00' );
                    self.costCarrierBillingSection( '00' );
                    self.insuranceKind( '' );
                    self.insuranceGrpId( '' );
                    self.originalInsuranceId( '' );
                    self.originalInsuranceGrpId( '' );
                    self.originalCostCarrierBillingSection( '' );
                    switch( self.type() ) {
                        case 'PUBLIC':
                            self.feeSchedule( '1' );
                            break;
                        case 'PRIVATE':
                            self.feeSchedule( '3' );
                            break;
                    }
                }
                return self._resetAllowed;
            };

            /**
             * choose a payer via UI
             * @param model
             * @private
             */
            self._selectPayer = function( model ) {
                var sortQuery = 'name,1,ktab,1',
                    insuranceType = ko.unwrap( model.type ),
                    catalogForInsuranceType = Y.doccirrus.catalogmap.getCatalogForInsuranceType( insuranceType ),
                    createNodeForDatatableBecauseSelector = Y.Node.create( '<div></div>' ),
                    aDCWindow, aDatatable, aDatatableColumns;

                // create DatatableModel
                function KBVInsuranceDatatableModel() {

                    this._modelName = 'KBVInsuranceDatatableModel';

                    Y.doccirrus.uam.ViewModel.apply( this );

                    this._dataUrl = '/r/catsearch/?action=catsearch&locationId=' + ko.unwrap( model.locationId ) + '&catalog=' + encodeURIComponent(catalogForInsuranceType.filename);
                    this._dataQuery = ['catalog' , encodeURIComponent( catalogForInsuranceType.filename )];
                    this._dataSrc = Y.doccirrus.uam.loadhelper.PRC_SRC;
                    this._isPaged = true;
                    this._isDtTbl = true;
                    this._arrayOf = 'KBVInsuranceModel';
                }

                function checkKT( iknr, vknr, ktab, callback ) {
                    var ctlg = Y.doccirrus.catalogmap.getCatalogSDKT();

                    // handle not having a catalog
                    if( null === ctlg ) {
                        callback( new Error( 'Error verifying KT: no catalog' ) );
                    }
                    else {
                        Y.doccirrus.jsonrpc.api.catalog.verifyKT( {
                            ik: iknr,
                            ktab: ktab,
                            vk: vknr,
                            catalog: ctlg.filename
                        } ).done( function( response ) {
                            callback( null, response.data );
                        } ).fail( function() {
                            callback( new Error( 'Error verifiing KT' ) );
                        } );
                    }

                }

                function regionalizeKT( patient, locationId, iknr, vknr, ktab, callback ) {
                    Y.doccirrus.jsonrpc.api.catalog.getRegionalKT( {
                        patient: patient._serializeToJS(),
                        locationId: locationId,
                        iknr: iknr,
                        ktab: ktab,
                        vknr: vknr
                    } ).done( function( response ) {
                        callback( null, response.data );
                    } ).fail( function() {
                        callback( new Error( 'Error regionalizing KT' ) );
                    } );
                }

                if( 'PRIVATE' === insuranceType ) {
                    aDatatableColumns = [
                        { name: 'suchname', title: 'Suchname' },
                        { name: 'iknr', title: 'IKNR' },
                        { name: 'abrechnungsbereich', title: 'Abrechnungsbereich' }
                    ];
                } else if( 'BG' === insuranceType ) {
                    sortQuery = 'name,1';
                    aDatatableColumns = [
                        { name: 'name', title: 'Suchname' },
                        { name: 'iknr', title: 'IKNR' },
                        { name: 'addresses.street', dataBind: 'text: _getAddress("street")', title: 'Straße', filterable: true, filterType: 'in' },
                        { name: 'addresses.zip', dataBind: 'text: _getAddress("zip")', title: 'PLZ', filterable: true, filterType: 'in' },
                        { name: 'addresses.city', dataBind: 'text: _getAddress("city")', title: 'Stadt', filterable: true, filterType: 'in' }
                    ];
                } else {
                    aDatatableColumns = [
                        //{ name: 'name', title: 'name', filterType: 'regex' },
                        { name: 'suchname', title: 'Suchname' },
                        { name: 'vknr', title: 'VKNR' },
                        { name: 'iknr', title: 'IKNR' },
                        //{ name: 'ktab', title: 'ktab' },
                        { name: 'abrechnungsbereich', title: 'Abrechnungsbereich' }
                    ];
                }

                // create Datatable
                createNodeForDatatableBecauseSelector.set( 'id', createNodeForDatatableBecauseSelector._yuid );
                createNodeForDatatableBecauseSelector.hide().appendTo( 'body' );
                aDatatable = new Y.doccirrus.uam.datatable( {
                    selector: '#' + createNodeForDatatableBecauseSelector.get( 'id' ),
                    selectMode: 'single',
                    arrayModel: KBVInsuranceDatatableModel,
                    sort: sortQuery,
                    limit: 10,
                    columns: aDatatableColumns,
                    scrollIntoViewPaging: true
                } );

                // create Window
                aDCWindow = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-SelectInsurancePayer',
                    bodyContent: createNodeForDatatableBecauseSelector,
                    title: 'Kostenträger auswählen',
                    icon: Y.doccirrus.DCWindow.ICON_SEARCH,
                    width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    height: 400,
                    minHeight: 400,
                    minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close', 'maximize'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'SELECT', {
                                isDefault: true,
                                action: function( e ) {
                                    var data,
                                        isFused = false,
                                        originalIknr;

                                    function setPublicData() {
                                        model.insuranceGrpId( ko.unwrap( data.vknr ) );
                                        self._abrechnungsbereiche( ko.unwrap( data.abrechnungsbereiche ) );
                                        model.kv( ko.unwrap( data.kv ) );
                                        model.costCarrierBillingGroup( ko.unwrap( data.kostentraegergruppeId ) );
                                        model.unzkv( ko.unwrap( data.unzkv || [] ) ); //P2-265

                                        model.insuranceId( ko.unwrap( data.iknr ) );
                                        model.insuranceName( ko.unwrap( data.name ) );
                                        model.costCarrierBillingSection( ko.unwrap( data.ktab ) );
                                        model.insurancePrintName( ko.unwrap( data.abrechnungsbereich ) );
                                        model.feeSchedule( ko.unwrap( data.gebuehrenordnung ) );
                                        model.address1( Y.doccirrus.commonutils.buildInsuranceAddressPart( data, 1 ) );
                                        model.address2( Y.doccirrus.commonutils.buildInsuranceAddressPart( data, 2 ) );

                                        aDCWindow.close();
                                    }

                                    function ktVerifiedCb( err, result ) {

                                        if( err ) {
                                            Y.log( 'error verifing KT' + err, 'debug' );
                                        }
                                        if( 1 === result.code && result.data && result.data[0] && result.ktIsFused ) {
                                            data = result.data[0];
                                            isFused = true;
                                            originalIknr = data.iknr;
                                        }

                                        // "Ersatzkassen" must be regionalized
                                        if( '2' === ko.unwrap( data.gebuehrenordnung ) && !Y.doccirrus.kbvcommonutils.checkSerialNo( ko.unwrap( data.vknr ) ) ) {
                                            model.originalInsuranceId( ko.unwrap( data.iknr ) );
                                            model.originalInsuranceGrpId( ko.unwrap( data.vknr ) );
                                            model.originalCostCarrierBillingSection( ko.unwrap( data.ktab ) );
                                            regionalizeKT( model._parent, ko.unwrap( model.locationId ), ko.unwrap( data.iknr ), ko.unwrap( data.vknr ), ko.unwrap( data.ktab ), regionalizedKTCB );
                                            return;
                                        }
                                        setPublicData();
                                    }

                                    function regionalizedKTCB( err, result ) {
                                        if( err ) {
                                            Y.log( 'error regionalizing KT' + err, 'debug' );
                                        }

                                        if( result && Object.keys( result ).length ) {
                                            data = result;
                                            if( isFused ) {
                                                data.iknr = originalIknr;
                                            }
                                        }
                                        setPublicData();
                                    }

                                    e.preventDefault();
                                    if( 1 !== aDatatable._getSelectedIds().length ) {
                                        Y.doccirrus.DCWindow.notice( {
                                            type: 'warn',
                                            message: 'Bitte prüfen Sie ihre Auswahl'
                                        } );
                                    } else {
                                        data = aDatatable.getSelected()[0];

                                        // if adding/removing fields also check "test kv validity and if invalid reset values"
                                        if( 'PUBLIC' === insuranceType ) {
                                            checkKT( ko.unwrap( data.iknr ), ko.unwrap( data.vknr ), ko.unwrap( data.ktab ), ktVerifiedCb );

                                        } else if( 'BG' === insuranceType ) {
                                            model.insuranceId( ko.unwrap( data.iknr ) );
                                            model.insuranceName( ko.unwrap( data.name ) );
                                            model.insurancePrintName( ko.unwrap( data.name ) );
                                            model.feeSchedule( '3' );
                                            model.address1( Y.doccirrus.commonutils.buildInsuranceAddressPart( data, 1 ) );
                                            model.address2( Y.doccirrus.commonutils.buildInsuranceAddressPart( data, 2 ) );
                                            aDCWindow.close();
                                        } else {
                                            model.insuranceId( ko.unwrap( data.iknr ) );
                                            model.insuranceName( ko.unwrap( data.name ) );
                                            model.costCarrierBillingSection( ko.unwrap( data.ktab ) );
                                            model.insurancePrintName( ko.unwrap( data.abrechnungsbereich ) );
                                            model.feeSchedule( ko.unwrap( data.gebuehrenordnung ) );
                                            model.address1( Y.doccirrus.commonutils.buildInsuranceAddressPart( data, 1 ) );
                                            model.address2( Y.doccirrus.commonutils.buildInsuranceAddressPart( data, 2 ) );
                                            aDCWindow.close();
                                        }
                                    }
                                }
                            } )
                        ]
                    }
                } );
                createNodeForDatatableBecauseSelector.show();
                // needed for patient version modal in schhein activities
                aDCWindow.bringToFront();
            };

            self._addDisposable( self.type.subscribe( function() {
                self._resetPayer();
                self._revalidate();
            } ) );

            /**
             * Computed to keep insurancePrintName in sync with the selected ktab
             */
            self._addDisposable( self.costCarrierBillingSection.subscribe( function( value ) {
                var list = self._costCarrierBillingSectionList(),
                    ktab;
                if( list.length ) {
                    ktab = Y.Array.find( list, function( item ) {
                        return value === item.ktab;
                    } );
                    if( ktab ) {
                        self.insurancePrintName( ktab.abrechnungsbereich );
                    } else {
                        Y.log( 'KTAB Not Found In List', 'warn' );
                    }
                }
            } ) );

            /**
             * throw a warning if fk4110 is out-of-date // MOJ-1413
             */
            self._addDisposable( self.fk4110.subscribe( function( value ) {
                if( !value || !moment( value ).isValid() ) {
                    return;
                }
                var
                    momentValue = moment( value ).startOf( 'day' ),
                    check = Y.doccirrus.commonutils.checkCardValidityDate( null, momentValue );

                if( null !== check ) {
                    Y.doccirrus.DCWindow.notice( {
                        message: check.message
                    } );
                }
            } ) );

            // possible contents for FK 4131 from 778, 779, 780, 781
            // (KVDT-Datensatzbeschreibung Kap. 3.5.1, S. 52)
            self._addDisposable( ko.computed( function() {
                self.costCarrierBillingSection();
                var
                    persGroup = self.persGroup();
                switch( persGroup ) {
                    case '4':
                    case '9':
                        self.costCarrierBillingSection( '00' );
                        break;
                    case '6':
                        self.costCarrierBillingSection( '02' );
                        break;
                    case '7':
                    case '8':
                        self.costCarrierBillingSection( '01' );
                        break;
                }
            } ) );

            self._addDisposable( self.persGroup.subscribe( function( val ) {
                var
                    incaseConfig = Y.doccirrus.uam.loadhelper.get( 'incaseConfig' ),
                    mid = 'persGroup9' + self._id;

                if( !incaseConfig.showPersGroup9Info ) {
                    return;
                }

                Y.doccirrus.DCSystemMessages.removeMessage( mid );
                if( '9' === val ) {
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: mid,
                        content: i18n( 'InCaseMojit.insurance-modelJS.messages.NOTICE_ASYLBLG' ),
                        level: 'INFO'
                    } );
                }
            } ) );

            /**
             * validate those dependencies
             */
            self._addDisposable( ko.computed( function() {
                self.paidFree();
                self.paidFreeTo();
                self.paidFreeTo.validate();
            } ).extend({ rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT }) );

            /**
             * every insurance type can only be used once
             */
            self._filteredTypeList = self._addDisposable( ko.computed( function() {
                var i, j,
                    type, found, insurance,
                    filteredTypes = [],
                    typeList = self._typeList,
                    insuranceStatus = self._parent.insuranceStatus();

                for( i = 0; i < typeList.length; i++ ) {
                    type = typeList[i];
                    found = false;
                    for( j = 0; j < insuranceStatus.length; j++ ) {
                        insurance = insuranceStatus[j];
                        if( insurance._cid === self._cid ) {
                            continue;
                        }
                        if( insurance.type.peek() === type.val ) {
                            found = true;
                        }
                    }
                    if( false === found ) {
                        filteredTypes.push( type );
                    }
                }

                return filteredTypes;
            } ) );

            /**
             * Select2 configuration for "employeeId"
             * @type {Object}
             */
            self._employeeIdSelect2Config = {
                _lastLocationId: null, // on change cache new results
                _lastResults: [], // used to cache results for current locationId
                val: self._addDisposable( ko.computed( {
                    read: function() {

                        return ko.unwrap( self.employeeId ) || '';
                    },
                    write: function( $event ) {

                        self.employeeId( $event.val );
                    }
                }, self ) ),
                select2: {
                    width: '100%',
                    allowClear: true,
                    placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                    query: function( query ) {
                        var
                            select2 = this,
                            config = self._employeeIdSelect2Config,
                            locationId = ko.unwrap( self.locationId );

                        if( !locationId ) {
                            config._lastLocationId = null;
                            query.callback( {
                                results: []
                            } );
                            return;
                        }

                        if( config._lastLocationId === locationId ) {
                            query.callback( {
                                results: Y.Array.filter( config._lastResults, function( item ) {
                                    return select2.matcher( query.term, item.text );
                                } )
                            } );
                            return;
                        }

                        readPhysicianEmployeesInLocationId( locationId )
                            .done( function( results ) {
                                results = results.map( function( employee ) {
                                    return {
                                        id: employee._id,
                                        text: Y.doccirrus.schemas.person.personDisplay( employee )
                                    };
                                } );
                                config._lastLocationId = locationId;
                                config._lastResults = results;
                                query.callback( {
                                    results: Y.Array.filter( results, function( item ) {
                                        return select2.matcher( query.term, item.text );
                                    } )
                                } );
                            } );

                    },
                    initSelection: function( element, callback ) {

                        readPhysicianEmployeeById( ko.unwrap( self.employeeId ) )
                            .done( function( employee ) {
                                if( employee ) {
                                    callback( {
                                        id: employee._id,
                                        text: Y.doccirrus.schemas.person.personDisplay( employee )
                                    } );
                                }
                            } );
                    }
                }
            };

            /**
             * Compute valid "employeeId" in "locationId", else unset "employeeId"
             */
            self._addDisposable( ko.computed( function() {
                var
                    locationId = ko.unwrap( self.locationId ),
                    employeeId = ko.unwrap( self.employeeId );

                if( !(locationId && employeeId) ) {
                    return;
                }

                if( employeeId && !locationId ) {
                    self.employeeId( '' );
                    return;
                }

                checkPhysicianEmployeeIdIsInLocationId( employeeId, locationId )
                    .done( function( isInLocation ) {
                        if( !isInLocation ) {
                            self.employeeId( '' );
                        }
                    } );

            } ) );

            self._searchResult = ko.observable();

            self._searchResult.subscribe( function( entry ) {
                self.daleUvInsuranceId(entry._data.iknr);
                self.daleUvInsuranceName(entry._data.name);
            });


            self._daleUvInsuranceSearch = {
                data: self._addDisposable( ko.computed( {
                    read: function() {
                        return self._searchResult();
                    },
                    write: function( $event ) {
                        if( Y.Object.owns( $event, 'added' ) ) {
                            self._searchResult( $event.added );
                        }
                    }
                } ) ),
                placeholder: '',
                select2: {
                    allowClear: true,
                    query: function( query ) {
                        var daleUvGkvCatalog = Y.doccirrus.catalogmap.getCatalogDALEUVKT();

                        Y.doccirrus.jsonrpc.api.catalog.read( {
                            query: {
                                catalog: daleUvGkvCatalog.filename,
                                $or: [
                                    {iknr: {$regex: query.term, $options: 'i'}}, {
                                        name: {
                                            $regex: query.term,
                                            $options: 'i'
                                        }
                                    }]
                            },
                            options: {
                                itemsPerPage: 20
                            }
                        } ).done( function( response ) {
                            var data = response && response.data || [];
                            query.callback( {
                                results: data.map( daleUvInsuranceSearchMapper )
                            } );
                        } );

                    }
                }
            };

        };

        Y.namespace( 'doccirrus.uam' ).InsuranceStatusModel = InsuranceStatusModel;
    },
    '0.0.1',
    {
        requires: [
            'doccirrus',
            'dcviewmodel',
            'dcsubviewmodel',
            'kbv-validations',
            'DCWindow',
            'DCSystemMessages',
            'dccommonutils',
            'dckbvutils'
        ]
    }
);
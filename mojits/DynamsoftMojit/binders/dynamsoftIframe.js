/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, $ */
YUI.add( 'dynamsoftIframe', function( Y, NAME ) {

    var
        i18n = Y.doccirrus.i18n,
        showScanDialogContainerId = 'dwtcontrolContainer';

    window.addEventListener( 'error', Y.doccirrus.errorhandler.handler );

    /**
     * Get localStorage data associated with 'showScanDialog'
     * @param {String} propertyName
     * @return {undefined|*}
     */
    function getLocalStorageValue( propertyName ) {
        var
            localValue = Y.doccirrus.utils.localValueGet( 'showScanDialog' );

        if( '' === localValue ) { // localValue seems to be unset
            return undefined;
        } else {
            localValue = JSON.parse( localValue );
        }
        return Y.doccirrus.commonutils.getObject( propertyName, localValue );
    }

    /**
     * Set localStorage data associated with 'showScanDialog'
     * @param {String} propertyName
     * @param {*} value
     */
    function setLocalStorageValue( propertyName, value ) {
        var
            localValue = Y.doccirrus.utils.localValueGet( 'showScanDialog' );

        if( '' === localValue ) { // localValue seems to be unset
            localValue = {};
        } else {
            localValue = JSON.parse( localValue );
        }
        Y.doccirrus.commonutils.setObject( propertyName, value, localValue );
        Y.doccirrus.utils.localValueSet( 'showScanDialog', localValue );
    }

    Y.namespace( 'mojito.binders' )[NAME] = {

        jqCache: {},

        init: function( mojitProxy ) {
            var
                self = this;

            self.mojitProxy = mojitProxy;

            if( window.frameElement ) {
                self.frameElement = window.frameElement;
                self.frameElement.getBinder = function() {
                    return self;
                };
            }

            self.events = new Y.EventTarget();

            self.events.publish( 'twainReady', {
                preventable: false,
                fireOnce: true,
                async: true
            } );

            self.events.publish( 'twainNotFound', {
                preventable: false,
                fireOnce: true,
                async: true
            } );

            self.events.publish( 'osNotSupported', {
                preventable: false,
                fireOnce: true,
                async: true
            } );

            self.events.publish( 'twainPreExecute', {
                preventable: false
            } );

            self.events.publish( 'twainPostExecute', {
                preventable: false
            } );

            self.events.publish( 'twainDocTypeChange', {
                preventable: false
            } );

            self.events.publish( 'twainDocTitleChange', {
                preventable: false
            } );

            self.jqCache.selDocType = $( '#selDocType' );
            self.jqCache.txtDocTitle = $( '#txtDocTitle' );
        },

        node: null,

        bind: function( node ) {
            var
                self = this;

            self.node = node;
            self.initBindings();
        },

        initBindings: function() {
            var
                self = this,
                bindingsDefaultResolution = 200,
                localValueResolution = getLocalStorageValue( 'Resolution' ),
                bindingsDefaultPixelType = "Farbe",
                localValuePixelType = getLocalStorageValue( 'PixelType' ),
                bindingsDefaultSourceIndex = 0,
                localValueSourceIndex = getLocalStorageValue( 'sourceIndex' ),
                bindingsDefaultDuplex = false,
                localValueDuplex = getLocalStorageValue( 'duplex' );

            /** handle some observable values from localStorage */
            if( !Y.Lang.isUndefined( localValuePixelType ) ) {
                bindingsDefaultPixelType = localValuePixelType;
            }
            if( !Y.Lang.isUndefined( localValueResolution ) ) {
                bindingsDefaultResolution = localValueResolution;
            }
            if( !Y.Lang.isUndefined( localValueSourceIndex ) ) {
                bindingsDefaultSourceIndex = localValueSourceIndex;
            }
            if( !Y.Lang.isUndefined( localValueDuplex ) ) {
                bindingsDefaultDuplex = localValueDuplex;
            }

            self.bindings = {
                uiState: ko.observable( 'pending' ),
                dynamsoftMessage: ko.observable( null ),
                PixelType: ko.observable( bindingsDefaultPixelType ),
                PixelTypeList: ["Farbe", "Graustufen"],
                Resolution: ko.observable( bindingsDefaultResolution ),
                ResolutionList: [150, 200, 300, 600],
                duplex: ko.observable( bindingsDefaultDuplex ),
                sourceIndex: ko.observable( bindingsDefaultSourceIndex ),
                docTypes: ko.observableArray(),
                docTitle: ko.observable( 'Andere' ),
                sourceList: ko.observableArray(),
                selectAllVisible: ko.observable( false ),
                selectAll: Y.bind( self.selectAll, self ),
                sourcesTemplateI18n: i18n( 'dcutils-dynamsoft.showScanDialog.template.sources.label' ),
                resolutionLabelI18n: i18n( 'dcutils-dynamsoft.showScanDialog.template.Resolution.label' ),
                duplexLabelI18n: i18n( 'dcutils-dynamsoft.showScanDialog.template.duplex.label' ),
                pixelTypeLabelI18n: i18n( 'dcutils-dynamsoft.showScanDialog.template.PixelType.label' ),
                doctypeLabelI18n: i18n( 'dcutils-dynamsoft.showScanDialog.template.doctype.label' ),
                titleLabelI18n: i18n( 'dcutils-dynamsoft.showScanDialog.template.title.label' ),
                selectAllLabelI18n: i18n( 'dcutils-dynamsoft.showScanDialog.template.selectAll.label' ),
                osNotSupportedI18n: i18n( 'dcutils-dynamsoft.showScanDialog.messages.osNotSupported' )
            };

            /** save some observable bindings into localStorage */
            ko.computed( function() {

                setLocalStorageValue( 'PixelType', ko.unwrap( self.bindings.PixelType ) );
                setLocalStorageValue( 'Resolution', ko.unwrap( self.bindings.Resolution ) );
                setLocalStorageValue( 'sourceIndex', ko.unwrap( self.bindings.sourceIndex ) );
                setLocalStorageValue( 'duplex', ko.unwrap( self.bindings.duplex ) );

            }, null, {disposeWhenNodeIsRemoved: self.node.getDOMNode()} );

            ko.applyBindings( self.bindings, self.node.getDOMNode() );

            //  Inform parent whe user changes doc type or title

            self.jqCache.selDocType.val( 'OTHER' );
            self.jqCache.selDocType.off( 'change.title' ).on( 'change.title', function() {
                var txt = $( '#selDocType option:selected' ).text();
                self.jqCache.txtDocTitle.val( txt );
                self.events.fire( 'twainDocTitleChange', {}, {'title': self.jqCache.txtDocTitle.val()} );
                self.events.fire( 'twainDocTypeChange', {}, {'type': self.jqCache.selDocType.val()} );
            } );

            self.jqCache.txtDocTitle.off( 'change.title' ).on( 'change.title', function() {
                self.events.fire( 'twainDocTitleChange', {}, {'title': self.jqCache.txtDocTitle.val()} );
                self.events.fire( 'twainDocTypeChange', {}, {'type': self.jqCache.selDocType.val()} );
            } );
        },

        twainReady: null,

        initDynamsoft: function( options ) {
            options = options || {
                settings: {}, callback: function() {
                }
            };
            window.Dynamsoft = window.Dynamsoft || {WebTwainEnv: {}};
            var
                self = this,
                settings = options.settings,
                callback = options.callback,
                Dynamsoft = window.Dynamsoft;

            Dynamsoft.WebTwainEnv.ResourcesPath = '/static/dcbaseapp/assets/lib/dynamsoft/webtwain/Resources';
            //Trial Key expires January 15th 2020
            Dynamsoft.WebTwainEnv.ProductKey = 't0068MgAAACxQfHMYH/NgWomFcK33LrGcVZxQGHMPQJs+612EZOyf9SHQumoHxJslEufrHyF/ml4J/kYoky3kzhCa94w2cU0=';
            Dynamsoft.WebTwainEnv.AutoLoad = true;
            Dynamsoft.WebTwainEnv.Trial = false;
            Dynamsoft.WebTwainEnv.ActiveXInstallWithCAB = false;
            Dynamsoft.WebTwainEnv.Debug = false;
            Dynamsoft.WebTwainEnv.ScanDirectly = false; // This is relevant for the OnWebTwainPreExecuteCallback/etc. events

            if( settings.productKey ) {
                Dynamsoft.WebTwainEnv.ProductKey = settings.productKey;
            }

            Dynamsoft.WebTwainEnv.Containers = [
                {
                    ContainerId: showScanDialogContainerId,
                    Width: 257,
                    Height: 333
                }
            ];

            function OnPreTransfer() {

                if( 0 === self.DWObject.HowManyImagesInBuffer ) {
                    self.DWObject.SetViewMode( 1, 1 );
                    self.bindings.selectAllVisible( false );
                } else {
                    self.DWObject.SetViewMode( 2, 2 );
                    self.bindings.selectAllVisible( true );
                }

            }

            window.Dynamsoft_OnReady = function() {
                self.twainReady = true;

                var
                    disallow = ['FORM', 'FORMPDF', 'FORMIMAGE'],
                    typeEnum = Y.doccirrus.schemas.document.types.DocType_E.list.filter( function( item ) {
                        return -1 === disallow.indexOf( item.val );
                    } ),
                    DWObject = window.Dynamsoft.WebTwainEnv.GetWebTwain( showScanDialogContainerId ),
                    sourceNames = [],
                    sourceCount = DWObject.SourceCount,
                    filteredDocTypes,
                    i;

                self.DWObject = DWObject;

                // "DWObject.GetSourceNames()" does not supply the same as :
                for( i = 0; i < sourceCount; i++ ) {
                    sourceNames.push( DWObject.GetSourceNameItems( i ) );
                }

                self.bindings.sourceList( sourceNames.map( function( text, index ) {
                    return {
                        text: text,
                        index: index
                    };
                } ) );

                filteredDocTypes = typeEnum.map( function( item, index ) {
                    return {
                        val: item.val,
                        text: item.i18n,
                        index: index
                    };
                } );

                filteredDocTypes = filteredDocTypes.filter( function( dT ) {
                    if( dT.val === 'FORM' ) {
                        return false;
                    }
                    return true;
                } );

                self.bindings.docTypes( filteredDocTypes );

                self.bindings.uiState( 'twainReady' );
                self.bindings.dynamsoftMessage( null );

                DWObject.RegisterEvent( 'OnPreTransfer', OnPreTransfer );

                self.events.fire( 'twainReady', {}, {
                    sourceNames: sourceNames,
                    DWObject: DWObject
                } );

                self.jqCache.selDocType.val( 'OTHER' );
                self.jqCache.txtDocTitle.val( 'Andere' );

                window.OnWebTwainPreExecuteCallback = function() {
                    self.events.fire( 'twainPreExecute', {}, {} );
                };

                window.OnWebTwainPostExecuteCallback = function() {

                    var
                        DWObject = self.DWObject,
                        numImages = 0;

                    if( DWObject && DWObject.SelectedImagesCount && DWObject.SelectedImagesCount > 0 ) {
                        numImages = DWObject.SelectedImagesCount;
                    }

                    // select all images after scan
                    if( 0 === self.DWObject.HowManyImagesInBuffer ) {
                        self.DWObject.SetViewMode( 1, 1 );
                        self.bindings.selectAllVisible( false );
                    } else {
                        self.DWObject.SetViewMode( 2, 2 );
                        self.bindings.selectAllVisible( true );
                    }

                    self.selectAll();

                    self.events.fire( 'twainPostExecute', {}, {'numImages': numImages} );
                };

            };

            function OnWebTwainNotFoundCallback( ProductName, InstallerUrl, bHTML5, bMac, bIE, bSafari, bSSL/*, strIEVersion*/ ) {

                if( self.DWObject ) {
                    self.DWObject.UnregisterEvent( 'OnPreTransfer', OnPreTransfer );
                }

                var ObjString = [
                    '<div class="dwt-box-title">',
                    ProductName,
                    ' ' + i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainNotFound.isNotInstalled' ) + '</div>',
                    '<div style="margin:20px;text-align:center"><a id="dwt-btn-install" target="_blank" href="',
                    InstallerUrl,
                    '" onclick="Dynamsoft_OnClickInstallButton()"><div class="dwt-button"></div></a>',
                    '<i>* ' + i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainNotFound.pleaseManuallyInstallIt' ) + '</i></div>'];

                if( bHTML5 ) {

                    if( bIE ) {
                        ObjString.push( '<div>' );
                        ObjString.push( i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainNotFound.ifYouStillSeeTheDialog' ) + '<br />' );
                        ObjString.push( '1. <a href="http://windows.microsoft.com/en-us/windows/security-zones-adding-removing-websites#1TC=windows-7">' + i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainNotFound.addTheCurrentWebsite' ) + '</a>.<br />' );
                        ObjString.push( '2. ' + i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainNotFound.refreshYourBrowser' ) );
                        ObjString.push( '</div>' );
                    } else {

                        if( bMac && bSafari && bSSL ) {
                            ObjString.push( '<div>' );
                            ObjString.push( i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainNotFound.afterTheInstallationYouAlsoNeed' ) + ' <br />' );
                            ObjString.push( '<a href="http://kb.dynamsoft.com/questions/901">' + i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainNotFound.thisArticle' ) + '</a> ' + i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainNotFound.toEnableTheScanPlugin' ) );
                            ObjString.push( '</div>' );
                        }

                        ObjString.push( '<div class="dwt-red" style="padding-top: 10px;">' + i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainNotFound.afterInstallationPleaseREFRESH' ) + '</div>' );
                    }

                } else {
                    if( bIE ) {
                        ObjString.push( '<div>' );
                        ObjString.push( i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainNotFound.afterTheInstallationPlease' ) + '<br />' );
                        ObjString.push( '1. ' + i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainNotFound.refreshTheBrowser' ) + '<br />' );
                        ObjString.push( '2. ' + i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainNotFound.allowDynamicWebTWAINAddOnToRunByRight' ) );
                        ObjString.push( '</div>' );
                    } else {
                        ObjString.push( '<p class="dwt-red" style="padding-top: 10px;">' + i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainNotFound.afterInstallationPleaseREFRESH' ) + '</p>' );
                    }
                }

                self.bindings.dynamsoftMessage( ObjString.join( '' ) );
                //Dynamsoft.WebTwainEnv.ShowDialog( 392, _height, ObjString.join( '' ) );
            }

            window.OnWebTwainNotFoundOnWindowsCallback = function( ProductName, InstallerUrl, bHTML5, bIE, bSafari, bSSL, strIEVersion ) {

                self.bindings.uiState( 'twainNotFound' );
                OnWebTwainNotFoundCallback( ProductName, InstallerUrl, bHTML5, false, bIE, bSafari, bSSL, strIEVersion );
                self.events.fire( 'twainNotFound', {}, {
                    mac: false,
                    windows: true,
                    ProductName: ProductName,
                    InstallerUrl: InstallerUrl,
                    bHTML5: bHTML5,
                    bIE: bIE,
                    bSafari: bSafari,
                    bSSL: bSSL,
                    strIEVersion: strIEVersion
                } );

            };

            window.OnWebTwainNotFoundOnMacCallback = function( ProductName, InstallerUrl, bHTML5, bIE, bSafari, bSSL, strIEVersion ) {

                self.bindings.uiState( 'twainNotFound' );
                OnWebTwainNotFoundCallback( ProductName, InstallerUrl, bHTML5, true, bIE, bSafari, bSSL, strIEVersion );
                self.events.fire( 'twainNotFound', {}, {
                    mac: true,
                    windows: false,
                    ProductName: ProductName,
                    InstallerUrl: InstallerUrl,
                    bHTML5: bHTML5,
                    bIE: bIE,
                    bSafari: bSafari,
                    bSSL: bSSL,
                    strIEVersion: strIEVersion
                } );

            };

            window.OnWebTwainOldPluginNotAllowedCallback = function( ProductName ) {
                var ObjString = [
                    '<div class="dwt-box-title">',
                    ProductName,
                    ' ' + i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainOldPluginNotAllowed.pluginIsNotAllowedToRun' ) + '</div>',
                    '<ul>',
                    '<li>' + i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainOldPluginNotAllowed.pleaseClick' ) + ' "<b>' + i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainOldPluginNotAllowed.alwaysRunOnThisSite' ) + '</b>" ' + i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainOldPluginNotAllowed.forThePrompt' ) + ' ',
                    i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainOldPluginNotAllowed.pluginNeedsYourPermission' ) + ' <a href="javascript:void(0);" style="color:blue" class="ClosetblCanNotScan">' + i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainOldPluginNotAllowed.close' ) + '</a> ' + i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainOldPluginNotAllowed.thisDialogOR' ) + '</li>',
                    '</ul>'];

                self.bindings.dynamsoftMessage( ObjString.join( '' ) );
                //Dynamsoft.WebTwainEnv.ShowDialog( 392, 227, ObjString.join( '' ) );
            };

            window.OnWebTwainNeedUpgradeCallback = function( ProductName, InstallerUrl, bHTML5, bMac, bIE/*, bSafari, bSSL, strIEVersion*/ ) {
                var ObjString = [
                    '<div class="dwt-box-title"></div>',
                    '<div style="font-size: 15px;">',
                    i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainNeedUpgrade.thisPageIsUsingANewerVersion' ),
                    '</div>',
                    '<a id="dwt-btn-install" target="_blank" href="',
                    InstallerUrl,
                    '" onclick="Dynamsoft_OnClickInstallButton()"><div class="dwt-button"></div></a>',
                    '<div style="text-align:center"><i>* ' + i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainNeedUpgrade.pleaseManuallyInstallIt' ) + '</i></div><p></p>'];

                if( bHTML5 ) {
                    ObjString.push( '<div class="dwt-red">' + i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainNeedUpgrade.pleaseREFRESHYourBrowserAfter' ) + '</div>' );
                } else {

                    if( bIE ) {
                        ObjString.push( '<div class="dwt-red">' );
                        ObjString.push( i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainNeedUpgrade.pleaseEXITInternetExplorer' ) );
                        ObjString.push( '</div>' );
                    } else {
                        ObjString.push( '<div class="dwt-red">' + i18n( 'dcutils-dynamsoft.showScanDialog.messages.dynamsoft.OnWebTwainNeedUpgrade.pleaseRESTARTYourBrowserAfter' ) + '</div>' );
                    }
                }

                self.bindings.dynamsoftMessage( ObjString.join( '' ) );
                //Dynamsoft.WebTwainEnv.ShowDialog( 392, _height, ObjString.join( '' ) );
            };

            callback();
        },

        run: function( settings ) {
            var
                self = this;

            if( ['windows', 'macintosh'].indexOf( Y.UA.os ) > -1 ) {
                self.initDynamsoft( {
                    settings: settings,
                    callback: function() {
                        var dynamsoftScript = document.createElement( 'script' );
                        dynamsoftScript.src = 'static/dcbaseapp/assets/lib/dynamsoft/webtwain/Resources/dynamsoft-webtwain-initiate.js';
                        self.node.getDOMNode().appendChild( dynamsoftScript );
                    }
                } );
            } else {
                self.bindings.uiState( 'osNotSupported' );
                self.events.fire( 'osNotSupported', {}, {} );
            }

        },

        DWObject: null,

        scan: function() {
            var
                self = this,
                bindings = self.bindings,
                DWObject = self.DWObject;

            var pixelTypes = {
                "Graustufen": 1,
                "Farbe": 2
            };

            if( !(DWObject && bindings) ) {
                return false;
            }

            DWObject.CancelAllPendingTransfers();

            /** scan */
            DWObject.SelectSourceByIndex( ko.utils.peekObservable( bindings.sourceIndex ) );
            //DWObject.ImageCaptureDriverType = 0;
            DWObject.CloseSource();
            DWObject.OpenSource();
            DWObject.PixelType = pixelTypes[ko.utils.peekObservable( bindings.PixelType )] || 2;
            DWObject.IfDuplexEnabled = ko.utils.peekObservable( bindings.duplex );
            DWObject.IfShowUI = false;
            DWObject.AcquireImage( {
                IfFeederEnabled: true,
                Resolution: ko.utils.peekObservable( bindings.Resolution )
            } );

            //  ensure parent has current doctype and title
            self.events.fire( 'twainDocTitleChange', {}, {'title': self.jqCache.txtDocTitle.val()} );
            self.events.fire( 'twainDocTypeChange', {}, {'type': self.jqCache.selDocType.val()} );

            return true;
        },

        getSelectedAsBase64: function() {
            var
                self = this,
                DWObject = self.DWObject;

            if( !DWObject ) {
                return false;
            }

            var
                images = [],
                imageSize,
                selectedIndexes = [].concat( DWObject._ImgManager.objImageIndexManager.arySelectedClientIndex );

            if( DWObject.SelectedImagesCount ) {

                /** get the base64 images */
                DWObject.SelectedImagesCount = 1; // … ?
                selectedIndexes.forEach( function( index ) {
                    DWObject.SetSelectedImageIndex( 0, index ); // select each image individual … "SaveSelectedImagesToBase64Binary" only supports current selected image
                    DWObject.GetSelectedImagesSize( window.EnumDWT_ImageType.IT_JPG ); // seems necessary to get something … (from examples)

                    imageSize = this.DWObject.GetSelectedImagesSize( window.EnumDWT_ImageType.IT_JPG );
                    Y.log( 'Selected image size reported by Dynamsoft web TWAIN component: ' + imageSize, 'debug', NAME );

                    images.push( DWObject.SaveSelectedImagesToBase64Binary() );
                } );

            }

            return images;

        },

        /**
         *  Get array of selected scans
         *  @returns {*}
         */

        getSelectedIndices: function() {
            if( !this.DWObject ) {
                return [];
            }
            return [].concat( this.DWObject._ImgManager.objImageIndexManager.arySelectedClientIndex );
        },

        /**
         *  Get a single image as base64 encoded JPEG given its index
         *
         *  @param  idx {Number}    From selected indices above
         */

        getAsBase64: function( idx ) {
            if( !this.DWObject ) {
                return false;
            }
            var imageSize;

            this.DWObject.SetSelectedImageIndex( 0, idx );
            imageSize = this.DWObject.GetSelectedImagesSize( window.EnumDWT_ImageType.IT_JPG );
            Y.log( 'Selected image size reported by Dynamsoft web TWAIN component: ' + imageSize, 'debug', NAME );

            return this.DWObject.SaveSelectedImagesToBase64Binary(); // careful, likes to not work
        },

        /**
         *  Pass selected images to server and compile into PDF
         *
         *  @param  ownerCollection {String}    Collection the PDF ill belong to
         *  @param  ownerId         {String}    Database _id of object PDF will belong to (usually an activity)
         *  @param  saveTo          {String}    ('db'|'cache') May be saved to media collection or cache directory
         *  @param  callback        {Function}  Of the fn(err, mediaId)
         */

        convertSelectedToPDF: function( ownerCollection, ownerId, saveTo, callback ) {

            if( !this.DWObject ) {
                return callback( new Error( "Web TWAIN plugin not available." ) );
            }

            var
                self = this,
                selectedIndices = [].concat( self.DWObject._ImgManager.objImageIndexManager.arySelectedClientIndex ),
                // images64 = this.getSelectedAsBase64(),
                imagesRef = [],
                idx = 0;

            //alert('selected: ' + JSON.stringify(selectedIndices));

            function storeNext() {
                if( 0 === selectedIndices.length ) {
                    Y.log( 'Stored all scanned pages, ' );
                    convertToPDF();
                    return;
                }

                var
                    nextImgIdx = selectedIndices.pop(),
                    nextImg64,
                    postArgs;

                self.DWObject.SetSelectedImageIndex( 0, nextImgIdx ); // select each image individual … "SaveSelectedImagesToBase64Binary" only supports current selected image
                self.DWObject.GetSelectedImagesSize( window.EnumDWT_ImageType.IT_JPG ); // seems necessary to get something … (from examples)
                nextImg64 = self.DWObject.SaveSelectedImagesToBase64Binary();

                postArgs = {'base64Image': 'data:image/jpeg;base64,' + nextImg64};

                idx = idx + 1;

                if( nextImg64 ) {
                    Y.log( 'Posting file ' + nextImgIdx + '/' + idx + ': ' + nextImg64.substr( 0, 80 ) + '... ' + nextImg64.length, 'debug', NAME );
                    Y.doccirrus.comctl.privatePost( '/1/media/:tempstore', postArgs, onImageStored );
                } else {
                    Y.log( 'Missing image in array of scanned documents: ' + nextImgIdx + '/' + idx + ': ' + JSON.stringify( nextImg64 ), 'warn', NAME );
                    Y.log( 'error code: ' + self.DWObject.ErrorCode, 'warn', NAME );
                    Y.log( 'error string: ' + self.DWObject.ErrorString, 'warn', NAME );
                    storeNext();
                }
            }

            function onImageStored( err, response ) {
                if( err ) {
                    callback( err );
                    return;
                }

                response = response.data ? response.data : response;
                response = response.tempFile ? response.tempFile : response;

                imagesRef.push( response );

                storeNext();
            }

            function convertToPDF() {
                var
                    title = $.trim( self.jqCache.txtDocTitle.val() ),
                    postArgs = {
                        'imageset': imagesRef,
                        'saveTo': saveTo,
                        'ownerCollection': ownerCollection,
                        'ownerId': ownerId,
                        'label': 'user',
                        'docType': self.jqCache.selDocType.val(),
                        'name': title + '.pdf'
                    }; // add resolution, etc here

                if( '' === title ) {
                    postArgs.name = 'scan.pdf';
                }

                Y.doccirrus.comctl.privatePost( '/1/media/:compilepdf', postArgs, onPdfCompiled );
            }

            function onPdfCompiled( err, response ) {
                if( err ) {
                    callback( err );
                    return;
                }

                Y.log( 'Created new temporary PDF: ' + JSON.stringify( response ) );

                response = response.data ? response.data : response;
                response = response.tempFile ? response.tempFile : response;

                callback( null, response );
            }

            if( 0 === selectedIndices.length ) {
                callback( new Error( 'No images selected' ) );
                return;
            }

            selectedIndices.reverse();
            storeNext();
        },

        selectAll: function() {
            var
                self = this,
                DWObject = self.DWObject;

            if( !DWObject ) {
                return false;
            }

            var
                index;

            if( DWObject.HowManyImagesInBuffer ) {

                DWObject.SelectedImagesCount = DWObject.HowManyImagesInBuffer; // … ?
                for( index = 0; index < DWObject.HowManyImagesInBuffer; index++ ) {
                    DWObject.SetSelectedImageIndex( index, index ); // select each image individual … "SaveSelectedImagesToBase64Binary" only supports current selected image
                }

            }

            return true;

        },

        IfSSL: function( bool ) {
            if( bool ) {
                this.DWObject.IfSSL = bool;
            }
            return this.DWObject.IfSSL;
        }

    };

}, '0.0.1', {
    requires: [
        'dcerrorhandler',
        'oop',
        'mojito-client',
        'doccirrus',
        'dcauth',
        'dcutils',
        'dcinfrastructs',
        'dc-comctl',
        'document-schema'
    ]
} );

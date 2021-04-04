/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'DCModalityMappingModal', function( Y ) {

    var
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        WorkListItemModel = KoViewModel.getConstructor( 'WorkListItemModel' );

    function validTransitionFn( activity ) {
        return Y.doccirrus.inCaseUtils.checkTransition( {
            currentActivity: activity,
            transition: 'validate'
        } );
    }

    function ModalityMappingModal() {
    }

    ModalityMappingModal.prototype.close = function() {
        if( this.dialogWindow ) {
            this.dialogWindow.close();
        }
    };
    function UnmappedDataViewModel() {
        UnmappedDataViewModel.superclass.constructor.call( this, arguments );
    }

    Y.extend( UnmappedDataViewModel, Y.doccirrus.KoViewModel.getDisposable(), {

        mappedDataArray: null,
        unMappedData: null,
        optionalUnMappedData: null,
        select2Device: null,

        initializer: function UnmappedDataViewModel_initializer() {
            this.mappedDataArray = ko.observableArray();
            this.unMappedData = ko.observableArray();
            this.optionalUnMappedData = ko.observableArray();

            this.initSelectToDevice();
        },

        /**
         * Builds select2 component for all the user defined dicom tag values
         * which were uploaded by CSV and marked as eingabe.
         *
         * Structure of optionalUnmappedDataArr:
         * optionalUnmappedDataArr = [
         *     mappedData: {
         *          dicomTag: string,
         *          content: string,
         *          comment: string,
         *          contentType: number
         *     },
         *     values: [
         *          {
         *              id: string,
         *              value: string,
         *              comment: string
         *          }
         *     ]
         * ]
         *
         * @param {Array} optionalUnmappedDataArr
         * @returns undefined
         */
        initOptionalUnmappedData: function( optionalUnmappedDataArr ) {
            var
                self = this;

            optionalUnmappedDataArr.forEach( function( unmappedDataObj ) {
                var
                    userOptionsObject = {},
                    initialContent = unmappedDataObj.mappedData.content(),
                    dicomCommentTagViewModel = unmappedDataObj.dicomCommentTagViewModel,
                    dropDownValues = unmappedDataObj.values.map( function( valueObj ) {
                                         return {
                                             id: valueObj.value,
                                             text: valueObj.comment
                                         };
                                     } );

                userOptionsObject.comment = unmappedDataObj.mappedData.comment;
                userOptionsObject.dicomTag = unmappedDataObj.mappedData.dicomTag;
                userOptionsObject.content = unmappedDataObj.mappedData.content;
                userOptionsObject.dicomCommentTag = dicomCommentTagViewModel && dicomCommentTagViewModel.content;

                userOptionsObject.select2Opts = {
                    data: ko.computed({
                        read: function() {
                            if( initialContent ) {
                                return {id: initialContent , text: initialContent};
                            }
                        },
                        write: function( $event ) {
                            var
                                dicomVal = $event.val,
                                dicomComment = $event.added && $event.added.text || "";

                            userOptionsObject.content( dicomVal );

                            if( userOptionsObject.dicomCommentTag && typeof userOptionsObject.dicomCommentTag === "function" ) {
                                userOptionsObject.dicomCommentTag( dicomComment );
                            }
                        }
                    }),
                    placeholder: ko.observable( i18n( 'general.message.PLEASE_SELECT' ) ),
                    select2: {
                        allowClear: true,
                        data: dropDownValues
                    }
                };

                self.optionalUnMappedData.push( userOptionsObject );
            } );
        },

        initSelectToDevice: function() {
            var
                self = this;

            self.select2Device = {
                data: ko.computed( {
                    read: function() {
                        var aetTitle = self.mappedDataArray().find( function( item ) {
                            return ko.unwrap( item.dicomTag() ) === '0040,0001';
                        } );
                        if( aetTitle ) {
                            /**
                             * This is required else in the pug file an exception will be thrown
                             * as it will try to read content().name
                             */
                            if( !aetTitle.content() ) {
                                aetTitle.content("");
                            }
                            return { id: aetTitle.content().name, text: aetTitle.content().name || "" };
                        }
                        else {
                            return null;
                        }
                    },
                    write: function( $event ) {
                        var aetTitle = self.mappedDataArray().find( function( item ) {
                            return ko.unwrap( item.dicomTag() ) === '0040,0001';
                        } );

                        if( aetTitle ) {
                            aetTitle.content( { name: $event.val } );
                        }

                        var stationName = self.mappedDataArray().find( function( item ) {
                            return ko.unwrap( item.dicomTag() ) === '0040,0010';
                        } );

                        if( stationName ) {
                            stationName.content( $event.val );
                        }
                    }
                } ),
                select2: {
                    query: function( query ) {
                        Y.doccirrus.jsonrpc.api.inpacsmodality.read( {
                            query: {
                                name: { $regex: query.term, $options: 'i' }
                            }
                        } ).done( function( response ) {
                            query.callback( {
                                results: (response && response.data && response.data.map( function( item ) {
                                    return {
                                        id: item.name,
                                        text: item.name,
                                        data: item
                                    };
                                } )) || []
                            } );
                        } );
                    }
                }
            };
        }
    } );

    ModalityMappingModal.prototype.showDialog = function( patient, activity, modality, activityDetailsVM ) {
        var
            self = this;

        return new Promise( function( resolve, reject ) {
            self.renderTemplate().then( function( template ) {

                var
                    bodyContent = Y.Node.create( template ),
                    viewModel = new UnmappedDataViewModel(),
                    studyId = null,
                    validTransition;

                function createWorkList( e ) {
                    return Y.doccirrus.jsonrpc.api.inpacsconfiguration.createWorkListTxt( {
                        data: {
                            mappedWorkListData: ko.unwrap( viewModel.mappedDataArray )
                        }
                    } ).done( function() {
                        resolve( studyId );
                        self.close();
                    } ).fail( function( err ) {
                        e.target.button.enable();
                        reject( err );
                    } );
                }

                self.dialogWindow = Y.doccirrus.DCWindow.create( {
                    className: 'DCWindow-modalityMappingDialog',
                    bodyContent: bodyContent,
                    title: i18n( 'InCaseMojit.modalityMappingDialog.TITLE' ),
                    icon: Y.doccirrus.DCWindow.ICON_LIST,
                    width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    height: Y.doccirrus.DCWindow.SIZE_LARGE,
                    minHeight: 400,
                    minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close', 'maximize'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                action: function() {
                                    resolve( null );
                                    this.close();
                                }
                            } ),
                            {
                                label: i18n( 'general.button.START' ),
                                name: 'START',
                                classNames: 'btn btn-primary',
                                isDefault: true,
                                action: function( e ) {
                                    e.target.button.disable();
                                    // activity.studyId( 'G -1334343' );
                                    activity.studyId( studyId.number.toString() );
                                    activity.subType( modality.type );
                                    activity.status( 'CREATED' );
                                    validTransition = validTransitionFn( activity );
                                    if( validTransition ) {
                                        if( typeof activity._id === "function" && activity._id() ) {
                                            Y.doccirrus.jsonrpc.api.activity
                                                .read( {
                                                    query: {
                                                        _id: activity._id()
                                                    }
                                                } )
                                                .done( function( response ) {
                                                    if( response && response.data && response.data[0] && response.data[0].studyId ) {
                                                        reject("RELOAD_ACTIVITY");
                                                    } else {
                                                        // Save first if not saved
                                                        activityDetailsVM.saveAttachmentsAndTransition( {
                                                            transitionDescription: validTransition
                                                        } ).then( function() {
                                                            createWorkList( e );
                                                        } ).catch( function( err ) {
                                                            e.target.button.enable();
                                                            reject( err );
                                                        } );
                                                    }
                                                } )
                                                .fail( reject );
                                        } else {
                                            // Save first if not saved
                                            activityDetailsVM.saveAttachmentsAndTransition( {
                                                transitionDescription: validTransition
                                            } ).then( function() {
                                                createWorkList( e );
                                            } ).catch( function( err ) {
                                                e.target.button.enable();
                                                reject( err );
                                            } );
                                        }
                                    } else {
                                        reject( 'Activity transition validation failed' );
                                    }
                                }
                            }
                        ]
                    },
                    after: {
                        visibleChange: function( yEvent ) {
                            if( !yEvent.newVal ) {
                                ko.cleanNode( bodyContent.getDOMNode() );
                            }
                        }
                    }
                } );
                Y.doccirrus.jsonrpc.api.inpacsconfiguration.getMappedData( {
                    data: {
                        patientId: ko.unwrap( patient._id ),
                        activity: ko.unwrap( activity ),
                        workListId: ko.unwrap( modality.workListId )
                    }
                } ).done( function( response ) {
                    /**
                     * Below is the complete structure of response object along with all
                     * possible optional values.
                     *
                     * response = {
                     *     data: {
                     *         inPacsNo: {
                     *             number: <string> ex: "JXOQQ5RC4R"
                     *         },
                     *         mappedData: [
                     *             {
                     *                 comment: <string>,
                     *                 content: <string>,
                     *                 contentType: <number>, //Possible values = 1 or 2 or 3 or 3
                     *                 dicomTag: <string>,  //ex: "0008,0040"
                     *                 name: <string>, //ex: "CS"
                     *                 order: <number>, //ex: 1 or 2 or 3...
                     *                 template: <string>,
                     *             },
                     *             ...
                     *         ],
                     *         optionalDicomTagToValues: {
                     *             "0008,0005": {  // EX: key can be any user input DICOM tag
                     *                 dicomCommentTag: <string>, //EX: "0040,0001"
                     *                 values: [
                     *                     {
                     *                         comment: <string>,
                     *                         id: <string>,
                     *                         value: <sring>
                     *                     },
                     *                     ...
                     *                 ]
                     *             }
                     *         },
                     *         optionalTags: [string,...] //ex: ["0008,0005", "0040,0001"]
                     *     }
                     * }
                     */
                    var
                        idx,
                        optionalTags = response && response.data && response.data.optionalTags || [],
                        optionalDicomTagToValues = response && response.data && response.data.optionalDicomTagToValues || {},
                        optionalDicomTagKeys = Object.keys( optionalDicomTagToValues ),
                        optionalDicomCommentTagKeys = [],
                        optionalDicomCommentTagToViewModel = {},
                        optionalUnmappedDataArr = [];

                    /**
                     * 1. Collect all the dicomCommentTag in array "optionalDicomCommentTagKeys" as below:
                     * optionalDicomCommentTagKeys.push( response.data.optionalDicomTagToValues[key1].dicomCommentTag )
                     * optionalDicomCommentTagKeys.push( response.data.optionalDicomTagToValues[key2].dicomCommentTag )
                     * ...
                     */
                    for( idx = 0; idx < optionalDicomTagKeys.length; idx++ ) {
                        if( optionalDicomTagToValues[optionalDicomTagKeys[idx]] && optionalDicomTagToValues[optionalDicomTagKeys[idx]].dicomCommentTag ) {
                            optionalDicomCommentTagKeys.push( optionalDicomTagToValues[optionalDicomTagKeys[idx]].dicomCommentTag );
                        }
                    }
                    // ---------------------------------------- 1. END ---------------------------------------------------------------


                    /**
                     * 2. Convert all records in "response.data.mappedData" array into "WorkListItemModel" ko view model objects
                     * Each record represents individual row of the mapped worklist table visible once the user clicks any available
                     * modality from the case file.
                     *
                     * Also populate object "optionalDicomCommentTagToViewModel" as below:
                     * a) If content of any of the "response.data.mappedData[idx].dicomTag" is set to "eingabe" by
                     * user while configuring worklist then one of the item in
                     * "optionalTags" array will be equal to "response.data.mappedData[idx].dicomTag"
                     * NOTE: "optionalTags" array is already build from the server side and before sending response object the serever will set
                     * response.data.mappedData[idx].content to '' if it was "eingabe" in the database.
                     *
                     * b) If case "a" is true and if "response.data.mappedData[idx].dicomTag" is also found in "optionalDicomCommentTagKeys"
                     * then populate "optionalDicomCommentTagToViewModel" hashmap as below:
                     *
                     * viewModel.mappedDataArray = [
                     *      new WorkListItemModel( response.data.mappedData[0] ),
                     *      new WorkListItemModel( response.data.mappedData[1] ),
                     *      ...
                     * ]
                     *
                     * If
                     *   "viewModel.mappedDataArray[somekey].dicomTag()" === "response.data.optionalDicomTagToValues[key].dicomCommentTag]"
                     * then
                     *   optionalDicomCommentTagToViewModel = {
                     *      [response.data.optionalDicomTagToValues[key].dicomCommentTag]: viewModel.mappedDataArray[somekey], // Reference to one of the item in viewModel.mappedDataArray
                     *      ...
                     *   }
                     */
                    studyId = response.data.inPacsNo;
                    viewModel.mappedDataArray( response.data.mappedData.map( function( dataItem ) {
                        var mappedDataModel =  new WorkListItemModel( {
                                                  data: dataItem
                                               } );

                        if( optionalDicomCommentTagKeys.indexOf( mappedDataModel.dicomTag() ) !== -1 ) {
                            optionalDicomCommentTagToViewModel[mappedDataModel.dicomTag()] = mappedDataModel;
                        }

                        return mappedDataModel;
                    } ) );
                    // ----------------------------------------------------- 2. END --------------------------------------------------------


                    /**
                     * 3. for all items in "viewModel.mappedDataArray()" do below:
                     * if
                     *   the current mapped dicom object is key in object "optionalDicomCommentTagToViewModel" then skip it
                     *   as it will be referenced later when response.data.optionalDicomTagToValues[ viewModel.mappedDataArray[key].dicomTag() ]
                     * else if
                     *   response.data.optionalDicomTagToValues[ viewModel.mappedDataArray[key].dicomTag() ] then populate "optionalUnmappedDataArr" and
                     *   its "optionalUnmappedDataArr[index].dicomCommentTagViewModel" literally means give me the viewModel of the comment tag row
                     *   so that if user selects value of values[ind].value then values[ind].comment will be set in dicomCommentTagViewModel.content()
                     *   and will be visible to user on UI
                     * else if
                     *   no user configured options DICOM found then show text box with editable text.
                     */
                    viewModel.mappedDataArray().forEach( function( mappedData ) {
                        if( optionalDicomCommentTagToViewModel[mappedData.dicomTag()] ) {
                            return;
                        } else if( optionalDicomTagToValues[mappedData.dicomTag()] ) {
                            optionalUnmappedDataArr.push( {
                                mappedData: mappedData,
                                values: optionalDicomTagToValues[mappedData.dicomTag()].values,
                                dicomCommentTagViewModel: optionalDicomCommentTagToViewModel[optionalDicomTagToValues[mappedData.dicomTag()].dicomCommentTag]
                            } );
                        } else if( 2 === mappedData.contentType() || optionalTags.indexOf(mappedData.dicomTag()) !== -1  ) {
                            viewModel.unMappedData.push( mappedData );
                        }
                    } );

                    if( optionalUnmappedDataArr.length ) {
                        viewModel.initOptionalUnmappedData( optionalUnmappedDataArr );
                    }
                    // ----------------------------------------------------- 3. END --------------------------------------------------------------------

                } ).fail( reject );
                viewModel.tableTitleI18n = i18n( 'InPacsAdminMojit.table.title' );
                viewModel.dicomTagI18n = i18n( 'InPacsAdminMojit.table.dicomTag' );
                viewModel.tableNameI18n = i18n( 'InPacsAdminMojit.table.name' );
                viewModel.tableContentI18n = i18n( 'InPacsAdminMojit.table.content' );
                viewModel.tableCommentI18n = i18n( 'InPacsAdminMojit.table.comment' );

                self.dialogWindow.set( 'focusOn', [] );
                ko.applyBindings( viewModel, bodyContent.getDOMNode() );
            } );
        } );
    };

    ModalityMappingModal.prototype.renderTemplate = function() {
        return Y.doccirrus.jsonrpc.api.jade
            .renderFile( { path: 'InCaseMojit/views/modalitymapping-modal' } )
            .then( function( response ) {
                return response && response.data;
            } );
    };

    Y.namespace( 'doccirrus.modals' ).modalityMappingModal = new ModalityMappingModal();

}, '0.0.1', {
    requires: [
        'DCWindow',
        'dcvalidations',
        'KoViewModel',
        'InPacsWorkListViewModel'
    ]
} );
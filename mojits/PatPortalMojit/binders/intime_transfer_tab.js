/**
 * User: pi
 * Date: 12/11/15   13:10
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global $, fun: true */
//TRANSLATION INCOMPLETE!! MOJ-3201
fun = function _fn( Y ) {
    'use strict';

    return {
        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node   NB: The node MUST have an id attribute.
         */
        registerNode: function( node ) {

            var
                tanField,
                sourcePracBox,
                targetPracBox,
                transferBtn,
                sourceTable,
                targetTable,
                tanForm,
                tanModal;

            /**
             * Fill or instantiate a table based on its name id
             * @param activities
             * @param tableName
             */
            function loadTable( activities, tableName ) {
                var
                    currTable;

                if( 'sourceTable' === tableName ) {
                    currTable = sourceTable;
                } else if( 'targetTable' === tableName ) {
                    Y.use();
                    currTable = targetTable;
                }

                // create each table for the first time, reload with new data afterwards
                function initOrFill( _Y ) {

                    if( !currTable ) {
                        var cols = [
                            {   key: 'select',
                                allowHTML: true, // to avoid HTML escaping
                                label: '<input type="checkbox" class="protocol-select-all" title="Toggle ALL records"/>',
                                formatter: function( fCfg ) {
                                    return '<input type="checkbox" ' + (fCfg.value ? 'checked="checked"' : '') + ' />';
                                },
                                emptyCellValue: '<input type="checkbox"/>'
                            },
                            { key: "_id", label: "Datum", sortable: true,
                                formatter: function( o ) {
                                    var format = '%d.%m.%Y';
                                    return _Y.Date.format( Y.doccirrus.commonutils.dateFromObjectId( o.value ), { format: format } );
                                }},
                            { key: "actType", label: "Typ", sortable: true, formatter: function( o ) {

                                return  Y.doccirrus.schemaloader.translateEnumValue( '-de', o.value, Y.doccirrus.schemas.activity.types.Activity_E.list, 'Unsupported' );
                            }},
                            { key: "content", label: "Inhalt", sortable: false }
                            //                            { key: "description", label: "Description", sortable: false }
                        ];

                        if( 'targetTable' === tableName ) {
                            cols.splice( 0, 1 ); // target table doesn't need checkboxes
                        }

                        currTable = new _Y.DataTable( {
                            columns: cols,
                            scrollable: 'y',
                            sortBy: { _id: -1 },
                            highlightMode: 'row',
                            selectionMode: 'row',
                            highlightRows: true,
                            selectionMulti: true
                        } );

                        currTable.render( "#" + tableName );

                        // Define a listener on the DT first column for each record's checkbox,
                        //   to set the value of `select` to the checkbox setting

                        currTable.delegate( "click", function( e ) {
                            // undefined to trigger the emptyCellValue
                            var checked = e.target.get( 'checked' ) || undefined;

                            this.getRecord( e.target ).set( 'select', checked );

                            // Uncheck the header checkbox
                            this.get( 'contentBox' )
                                .one( '.protocol-select-all' ).set( 'checked', false );
                        }, ".yui3-datatable-data .yui3-datatable-col-select input", currTable );

                        // Also define a listener on the single TH checkbox to
                        //   toggle all of the checkboxes
                        currTable.delegate( 'click', function( e ) {
                            // undefined to trigger the emptyCellValue
                            var checked = e.target.get( 'checked' ) || undefined;

                            // Set the selected attribute in all records in the ModelList silently
                            // to avoid each update triggering a table update
                            this.data.invoke( 'set', 'select', checked, { silent: true } );

                            // Update the table now that all records have been updated
                            this.syncUI();
                        }, '.protocol-select-all', currTable );
                    }

                    if( 'sourceTable' === tableName ) {
                        sourceTable = currTable;
                        sourceTable.set( 'data', activities ); // reload with new data
                    } else if( 'targetTable' === tableName ) {
                        targetTable = currTable;
                        targetTable.set( 'data', activities ); // reload with new data
                    }
                } // initOrFill

                /**
                 * set up a YUI datatable and some buttons
                 *
                 */
                YUI( {
                    filter: 'raw', combine: true, skin: 'sam'
                    //,gallery: 'gallery-2012.12.12-21-11'     // gallery is overwritten in application.json!
                } ).use(
                    'datatype-date-format',
                    'datatable-sort',
                    'datatable-scroll',
                    'datatable-mutable',
                    'cssfonts',
                    'model-sync-rest',
                    'gallery-datatable-paginator',
                    'gallery-paginator-view',
                    initOrFill );

                        //initOrFill();
            }

            // disable target list and clear target table
            function resetTarget( disable ) {
                if( disable ) {
                    targetPracBox.prop( 'disabled', true );
                } else {
                    targetPracBox.prop( 'disabled', false );
                }
                targetPracBox.val( '' );
                transferBtn.addClass( 'disabled' );
                if( targetTable ) {
                    targetTable.data.reset();
                }
            }

            function showTanForm() {
                Y.use( 'DCWindow', function() {
                    tanModal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-TANForm',
                        bodyContent: tanForm,
                        title: 'Legitimation',
                        width: 400,
                        height: 250,
                        centered: true,
                        modal: true,
                        render: document.body,
                        visible: true,
                        buttons: {
                            header: ['close'],
                            footer: [
                                {
                                    label: 'OK',
                                    name: 'submitTan',
                                    value: 'submitTan',
                                    action: sendConfirmRrequest
                                }
                            ]
                        }
                    } );
                } );

                tanForm.removeClass( 'hidden' );
            }

            // loads only the table whose selected practice was just changed
            function showActivities( event ) {

                var selectedList = $( event.target ),
                    selectedPracId = selectedList.val(),
                    listName = selectedList.attr( 'name' );

                if( !selectedPracId ) {
                    if( 'sourcePractices' === listName ) {
                        sourceTable.data.reset();
                        resetTarget( true );
                    }
                    transferBtn.addClass( 'disabled' );
                    return;
                }

                Y.doccirrus.ajax.send( {
                    type: 'get',
                    url: '/r/p_patientactivities/?action=p_patientactivities&practiceId=' + selectedPracId,
                    success: function( response ) {
                        var activities = response;

                        // load the relevant table
                        if( 'sourcePractices' === listName ) {
                            loadTable( activities, 'sourceTable' );
                            targetPracBox.find( 'option' ).prop( 'disabled', false ); // make sure all options are enabled
                            targetPracBox.find( 'option[value=' + selectedPracId + ']' ).prop( 'disabled', true ); // disable the practice that was selected as source
                            resetTarget( false );

                        } else if( 'targetPractices' === listName ) {
                            loadTable( activities, 'targetTable' );
                            transferBtn.removeClass( 'disabled' );
                        }
                    },
                    error: function() {
                        Y.doccirrus.utils.loadingDialog( 'error', 'Es konnte nicht auf Ihre Dokumente zugegriffen werden.' );
                        resetTarget( true );
                    }
                } );

            }

            function getOptionHtml( practice ) {
                return '<option value="' + practice.customerIdPrac + '">' + practice.coname + '</option>';
            }

            // load the two combo boxes with practices
            function loadPracCombos() {
                var
                    postUrl = '/r/p_getPracticeInfo/?action=p_getPracticeInfo&checkTransfer=true';

                Y.doccirrus.ajax.send( {
                    type: 'get',
                    url: postUrl,
                    success: function( response ) {
                        var practices = response.data;
                        for( var i = 0; i < practices.length; i++ ) {
                            $( '#sourcePractices' ).append( getOptionHtml( practices[i] ) );
                            $( '#targetPractices' ).append( getOptionHtml( practices[i] ) );
                        }

                    },
                    error: function() {
                        Y.doccirrus.utils.loadingDialog( 'error', 'Die Liste Ihrer Praxen konnte nicht geladen werden. Bitte versuchen Sie es später erneut.' );
                    }
                } );

                sourcePracBox.on( 'change', showActivities );
                targetPracBox.on( 'change', showActivities );
            }

            /**
             * send a request for transfer and a new TAN
             */
            function sendInitialRequest() {
                var
                    postData = {
                        eTAN: '',
                        activityIds: []
                    },
                    sourceOption = $( '#sourcePractices' ).find( ':selected' ),
                    targetOption = $( '#targetPractices' ).find( ':selected' );

                var rowData;
                sourceTable.data.each( function( item ) {   // collect selected activities
                    rowData = item.getAttrs( ['select', '_id'] );
                    if( rowData.select ) {
                        postData.activityIds.push( rowData._id );
                    }
                } );

                if( 0 === postData.activityIds.length ) {
                    Y.doccirrus.utils.loadingDialog( 'error', 'Bitte wählen Sie zunächst die zu übertragenden Dokumente aus.' );
                    return;
                }
                postData.sourceData = {practiceId: sourceOption.val(), practiceName: sourceOption.text()};
                postData.targetData = {practiceId: targetOption.val(), practiceName: targetOption.text()};

                Y.doccirrus.ajax.send( {
                    type: 'post',
                    url: '/r/p_requesttransfer?action=p_requesttransfer',
                    data: postData,
                    success: function( data ) {

                        if( 'eTAN' === data.status ) { // first stage: got a TAN
                            node.patientId = data.patientId; // will need it to regenerate eTAN2
                            showTanForm();

                        }
                    },
                    error: function( xhr ) {
                        tanForm.addClass( 'hidden' );
                        if( 401 === xhr.status ) {
                            Y.doccirrus.DCWindow.notice( {
                                type: 'error',
                                message: Y.doccirrus.errorTable.getMessage( {
                                    code: 1401,
                                    data: {$pracNAme: targetOption.text() }
                                } )
                            } );
                        } else {
                            Y.doccirrus.DCWindow.notice( {
                                type: 'error',
                                message: 'Die Anforderung einer TAN für Ihren Transfer ist fehlgeschlagen. Bitte versuchen Sie es später erneut.',
                                callback: function() {
                                    tanForm.removeClass( 'hidden' );
                                    tanField.val( '' );
                                    tanModal.close();
                                }
                            } );
                        }
                    }
                } );

                tanForm.addClass( 'hidden' ); // it's done, hide the form
            }

            /**
             * confirm the TAN and trigger the execution of the request (already registered on source PRC)
             */
            function sendConfirmRrequest() {
                var
                    tan = tanField.val(),
                    postData = {
                        eTAN: ''
                    },
                    targetOption = $( '#targetPractices' ).find( ':selected' );

                if( tan && 6 === tan.length ) { // send the eTAN to PUC to check against the eTAN stored in patientreg
                    var patientPin = new Y.doccirrus.authpub.PatientPin( tan, node.patientId );
                    postData.eTAN = Y.doccirrus.authpub.getPortalPin( patientPin ); // hash combination of TAN and patientId

                } else if( tan ) {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: 'Diese TAN ist ungültig. Bitte versuchen Sie es erneut.'
                    } );
                    return;

                } else {
                    tanField.fadeOut( 200 ).fadeIn( 200 );
                    return;
                }

                // two different requests are handled here separately.
                Y.doccirrus.ajax.send( {
                    type: 'post',
                    url: '/r/p_confirmtransfer?action=p_confirmtransfer',
                    data: postData,
                    success: function() {
                        tanField.val( '' );
                        Y.doccirrus.DCWindow.notice( {
                            type: 'success',
                            title: 'Transfer',
                            message: 'Ihr Transfer-Auftrag wurde erfolgreich ausgeführt.'
                        } );
                        tanForm.addClass( 'hidden' );
                        tanModal.close();
                    },
                    error: function( xhr ) {
                        if( 409 === xhr.status ) {
                            Y.doccirrus.DCWindow.notice( {
                                type: 'error',
                                message: 'The TAN is not valid, please try again.',
                                callback: function() {
                                    tanForm.removeClass( 'hidden' ); // to let the user to try again
                                }
                            } );
                        } else if( 401 === xhr.status ) {
                            Y.doccirrus.DCWindow.notice( {
                                type: 'error',
                                message: Y.doccirrus.errorTable.getMessage( {
                                    code: 1401,
                                    data: {$pracNAme: targetOption.text() }
                                } )
                            } );
                            tanField.val( '' ); // reset the state
                            tanForm.addClass( 'hidden' );
                            tanModal.close();

                        } else {
                            tanForm.addClass( 'hidden' );
                            Y.doccirrus.DCWindow.notice( {
                                type: 'error',
                                message: 'Der Transfer war nicht erfolgreich. Bitte versuchen Sie es erneut.',
                                callback: function() {
                                    tanForm.removeClass( 'hidden' );
                                    tanField.val( '' );
                                    tanModal.close();
                                }
                            } );
                        }
                    }
                } );

                tanForm.addClass( 'hidden' ); // it's done, hide the form
            }

            tanForm = node.one( '#tanForm' );
            tanField = $( '#tan' );
            transferBtn = $( '#btnTransfer' );
            sourcePracBox = $( '#sourcePractices' );
            targetPracBox = $( '#targetPractices' );
            transferBtn.on( 'click', sendInitialRequest );

            loadPracCombos();
            loadTable( null, 'sourceTable' );
            loadTable( null, 'targetTable' );
            resetTarget( true ); // initially no target selection should be allowed

        },
        deregisterNode: function() {
            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            //node.destroy();
        }
    };
};
/*
 @user: jm
 @date: 2015-07-28
 */

/**
 * reader of incoming dicom bytes into an abstract dicom json.
 */

/*global YUI */



YUI.add( 'dicom-message-reader', function( Y, NAME ) {
        var DicomMsgReader = function() {

            /**
             * Created by jm on 2014-11-12.
             */

            var dicomMsgReader = this;
            var tools = Y.doccirrus.api.dicom.tools;
            var bop   = Y.doccirrus.api.bop;

            var logHandlers = false;


            function logh(msg) {
                if (logHandlers) {Y.log(msg, "log", NAME);}
            }
            
            /* example dicom message after association is done. searches for any patients; split up into logical chunks of the original byte stream with added meta information above and the corresponding characters below (the characters might be garbage outside of actual strings)
             
            

             - COMMAND DATA -

             Buffer: 04 00 00 00 00 5e 00 00 00 5a 01 03 00 00 00 00 04 00 00 00 4c 00 00 00 00 00 02 00 1c 00 00 00 31 2e 32 2e 38 34 30 2e 31 30 30 30 38 2e 35 2e 31 2e 34 2e 31 2e 32 2e 32 2e 31 00 00 00 00 01 02 00 00 00 20 00 00 00 10 01 02 00 00 00 03 00 00 00 00 07 02 00 00 00 00 00 00 00 00 08 02 00 00 00 02 01
             Explanation:

                 P_DATA_TF
                 04 00 00 00 00 5e 
                 EOTNULNULNULNUL ^ 
    
                 len, command, last
                 00 00 00 5a 01 03 
                 NULNULNUL Z SOHETX
    
                 CommandGroupLength, 76
                 00 00 00 00 04 00 00 00 4c 00 00 00 
                 NULNULNULNULEOTNULNULNUL L NULNULNUL
    
                 AffectedSOPClassUID, 1.2.840.10008.5.1.4.1.2.2.1
                 00 00 02 00 1c 00 00 00 31 2e 32 2e 38 34 30 2e 31 30 30 30 38 2e 35 2e 31 2e 34 2e 31 2e 32 2e 32 2e 31 00 
                 NULNULSTXNULFS NULNULNUL 1  .  2  .  8  4  0  .  1  0  0  0  8  .  5  .  1  .  4  .  1  .  2  .  2  .  1 NUL
    
                 CommandField, C_FIND_RQ
                 00 00 00 01 02 00 00 00 20 00 
                 NULNULNULSOHSTXNULNULNUL   NUL
    
                 MessageID, 3
                 00 00 10 01 02 00 00 00 03 00 
                 NULNULDLESOHSTXNULNULNULETXNUL
    
                 Priority, medium
                 00 00 00 07 02 00 00 00 00 00 
                 NULNULNULBELSTXNULNULNULNULNUL
    
                 CommandDataSetType, has data
                 00 00 00 08 02 00 00 00 02 01
                 NULNULNULBS STXNULNULNULSTXSOH



             - VALUE DATA -

             Buffer: 04 00 00 00 00 98 00 00 00 94 01 02 08 00 00 00 04 00 00 00 2e 00 00 00 08 00 20 00 00 00 00 00 08 00 30 00 00 00 00 00 08 00 50 00 00 00 00 00 08 00 52 00 06 00 00 00 53 54 55 44 59 20 08 00 30 10 00 00 00 00 10 00 10 00 00 00 00 00 10 00 10 00 00 00 00 00 10 00 20 00 00 00 00 00 10 00 30 00 00 00 00 00 10 00 40 00 00 00 00 00 20 00 00 00 04 00 00 00 20 00 00 00 20 00 0d 00 00 00 00 00 20 00 10 00 00 00 00 00 20 00 06 12 00 00 00 00 20 00 08 12 00 00 00 00
             Explanation:
    
                 P_DATA_TF
                 04 00 00 00 00 98 
                 EOTNULNULNULNUL ÿ 
    
                 len, data, last
                 00 00 00 94 01 02 
                 NULNULNUL ö SOHSTX
    
                 baseFieldsLength, 46
                 08 00 00 00 04 00 00 00 2e 00 00 00 
                 BS NULNULNULEOTNULNULNUL . NULNULNUL
    
                 StudyDate, []
                 08 00 20 00 00 00 00 00 
                 BS NUL   NULNULNULNULNUL
    
                 StudyTime, []
                 08 00 30 00 00 00 00 00 
                 BS NUL 0 NULNULNULNULNUL
    
                 AccessionNumber, []
                 08 00 50 00 00 00 00 00 
                 BS NUL P NULNULNULNULNUL
    
                 QueryRetrieveLevel, STUDY
                 08 00 52 00 06 00 00 00 53 54 55 44 59 20 
                 BS NUL R NULACKNULNULNUL S  T  U  D  Y    
    
                 StudyTime, []
                 08 00 30 10 00 00 00 00 
                 BS NUL 0 DLENULNULNULNUL
    
                 PatientFieldsLength. 32
                 10 00 00 00 04 00 00 00 20 00 00 00 
                 DLENULNULNULEOTNULNULNUL   NULNULNUL
    
                 PatientName, []
                 10 00 10 00 00 00 00 00 
                 DLENULDLENULNULNULNULNUL
    
                 PatientID, []
                 10 00 20 00 00 00 00 00 
                 DLENUL   NULNULNULNULNUL
    
                 PatientBirthDate, []
                 10 00 30 00 00 00 00 00 
                 DLENUL 0 NULNULNULNULNUL
    
                 PatientSex, []
                 10 00 40 00 00 00 00 00 
                 DLENUL @ NULNULNULNULNUL
    
                 SpecificFieldsLength, 32
                 20 00 00 00 04 00 00 00 20 00 00 00 
                 NULNULNULEOTNULNULNUL   NULNULNUL
    
                 StudyInstanceUID, []
                 20 00 0d 00 00 00 00 00 
                 NULCR NULNULNULNULNUL
    
                 StudyID, []
                 20 00 10 00 00 00 00 00 
                 NULDLENULNULNULNULNUL
    
                 NumberOfStudyRelatedSeries, []
                 20 00 06 12 00 00 00 00 
                 NULACKDC2NULNULNULNUL
    
                 NumberOfStudyRelatedInstances, []
                 20 00 08 12 00 00 00 00
                 NULBS DC2NULNULNULNUL

             */
            

            /**
             * checks the first byte for its tag and reroutes the stream to the appropriate handlers
             * @method inputHandler
             * @param {Buffer} buffer input buffer
             * @param {Object} [client] object with state machines attached to it. onlyrelevant for state machine testing
             *
             * @return {Object}
             */
            dicomMsgReader.inputHandler = function(buffer, client) {//TODO
                logh("inputHandler");
                var ret = {
                    type: "",
                    attributes: {},
                    value: [],
                    errors: []
                };


                var stm, pstm;
                if (client) {
                    stm = client.stm;
                    pstm = client.pstm;
                } else {
                    stm = {event: function(){}};
                    pstm = {event: function(){}};
                }

                if(!stm){stm={event:function(){},state:function(){}};} //fill the gap

                Y.log(bop.buff2hex(buffer), "log", NAME);
                Y.log(bop.buff2char(buffer), "log", NAME);

                //split up to handlers
                switch(buffer[0]) {
                    case tools.messageTypeTags.A_ASSOCIATE_RQ : stm.event("RECV_A_ASSOCIATE_RQ"); dicomMsgReader.A_ASSOCIATE_RQ_Handler(buffer, ret); break;
                    case tools.messageTypeTags.A_ASSOCIATE_AC : pstm.event("RECV_A_ASSOCIATE_RQ"); stm.event("RECV_A_ASSOCIATE_AC"); dicomMsgReader.A_ASSOCIATE_AC_Handler(buffer, ret); break;
                    case tools.messageTypeTags.A_ASSOCIATE_RJ : pstm.event("RECV_A_ASSOCIATE_RQ", 2); stm.event("RECV_A_ASSOCIATE_RJ"); dicomMsgReader.A_ASSOCIATE_RJ_Handler(buffer, ret); break;
                    case tools.messageTypeTags.P_DATA_TF      : stm.event("RECV_P_DATA"); dicomMsgReader.P_DATA_TF_Handler(buffer, ret); break;
                    case tools.messageTypeTags.A_RELEASE_RQ   : stm.event("RECV_A_RELEASE_RQ"); dicomMsgReader.A_RELEASE_XX_Handler(buffer, ret); break;
                    case tools.messageTypeTags.A_RELEASE_RP   : stm.event("RECV_A_RELEASE_RP"); dicomMsgReader.A_RELEASE_XX_Handler(buffer, ret); break;
                    case tools.messageTypeTags.A_ABORT        : pstm.event("SEND_A_ABORT"); stm.event("RECV_A_ABORT"); dicomMsgReader.A_ABORT_Handler(buffer, ret); /*client.destroy();*/ pstm.event("RECV_CONNECTION_CLOSED"); break;
                    default: Y.log("unknown tag: 0x"+(buffer[0]).toString(16), "log", NAME);
                }

                return ret;
            };

            /**
             * reads separate submessages from a list and reroutes them to their respective handlers
             * @method bodyHandler
             * @param {Buffer} buffer input buffer
             * @param {Object} ret current object or subobject to attach everything to
             */
            dicomMsgReader.bodyHandler = function(buffer, ret) {
                logh("bodyHandler");
                for (var i = 0; i < buffer.length; i++) {
                    var tag = buffer[i];
                    var len = tools.byteArrayToLongB(buffer.slice(i+2,i+4));
                    var block = buffer.slice(i, i+len+4);
                    logh("tag: 0x"+ tag.toString(16) + " len: "+len);

                    switch(tag) {
                        case tools.messageTypeTags.presentation_context          : dicomMsgReader.presentation_context_item_Handler(block, ret); break;
                        case tools.messageTypeTags.presentation_context_response : dicomMsgReader.presentation_context_response_item_Handler(block, ret); break;
                        case tools.messageTypeTags.maximum_length                : dicomMsgReader.maximum_length_item_Handler(block, ret); break;
                        case tools.messageTypeTags.user_info                     : dicomMsgReader.std_obj_Handler(block, ret); break;
                        case tools.messageTypeTags.abstract_syntax               : dicomMsgReader.abstract_syntax_Handler(block, ret); break;
                        case tools.messageTypeTags.transfer_syntax               : dicomMsgReader.transfer_syntax_Handler(block, ret); break;
                        case tools.messageTypeTags.application_context           :
                        case tools.messageTypeTags.implementation_class_uid      :
                        case tools.messageTypeTags.implementation_version_name   : dicomMsgReader.std_str_Handler(block, ret); break;
                        default: Y.log("unknown tag: 0x"+tag.toString(16), "log", NAME);
                    }
                    i += len+3;
                }
            };

            /**
             * creates objects from presentation data
             * @method presentationDataHandler
             * @param {Buffer} buffer input buffer
             * @param {Object} ret current object or subobject to attach everything to
             */
            dicomMsgReader.presentationDataHandler = function(buffer, ret) {
                logh("presentationDataHandler");

                for (var i = 0; i < buffer.length; i++) {
                    var len = tools.byteArrayToLongB(buffer.slice(i+2,i+4));
                    var id = buffer[i+4];
                    var command = !!(buffer[i+5]&0x01); //jshint ignore:line
                    var last = !!(buffer[i+5]&0x02); //jshint ignore:line
                    ret.push({
                        attributes: {
                            len: len,
                            id: id,
                            command: command,
                            last: last
                        },
                        value: []
                    });
                    dicomMsgReader.dicomMessageHandler(buffer.slice(i+6, i+4+len), ret[ret.length-1].value, command);
                    i += len+3;
                }
            };

            /**
             * reads out all the specific tags of A-ASSOCIATE-AC and leaves the rest to the bodyHandler
             * @method A_ASSOCIATE_AC_Handler
             * @param {Buffer} buffer input buffer
             * @param {Object} ret current object or subobject to attach everything to
             */
            dicomMsgReader.A_ASSOCIATE_AC_Handler = function(buffer, ret) {
                logh("A_ASSOCIATE_AC_Handler");
                ret.type = "A_ASSOCIATE_AC";
                ret.attributes.len = tools.byteArrayToLongB(buffer.slice(2,6));
                ret.attributes.ver = tools.byteArrayToLongB(buffer.slice(6,8));
                ret.attributes.Called_entity_title = (buffer.slice(10,26)).toString().trim();
                ret.attributes.Calling_entity_title = (buffer.slice(26,42)).toString().trim();

                if (buffer.length-6 !== ret.attributes.len) {
                    ret.errors.push("length is supposed to be "+ret.attributes.len+" but is "+(buffer.length-6));
                }

                var body = buffer.slice(74, buffer.length);
                dicomMsgReader.bodyHandler(body, ret.value);
            };

            /**
             * reads out all the specific tags of A-ASSOCIATE-RQ and leaves the rest to the bodyHandler
             * @method A_ASSOCIATE_RQ_Handler
             * @param {Buffer} buffer input buffer
             * @param {Object} ret current object or subobject to attach everything to
             */
            dicomMsgReader.A_ASSOCIATE_RQ_Handler = function(buffer, ret) {
                logh("A_ASSOCIATE_RQ_Handler");
                ret.type = "A_ASSOCIATE_RQ";
                ret.attributes.len = tools.byteArrayToLongB(buffer.slice(2,6));
                ret.attributes.ver = tools.byteArrayToLongB(buffer.slice(6,8));
                ret.attributes.Called_entity_title = (buffer.slice(10,26)).toString().trim();
                ret.attributes.Calling_entity_title = (buffer.slice(26,42)).toString().trim();

                if (buffer.length-6 !== ret.attributes.len) {
                    ret.errors.push("length is supposed to be "+ret.attributes.len+" but is "+(buffer.length-6));
                }

                var body = buffer.slice(74, buffer.length);
                dicomMsgReader.bodyHandler(body, ret.value);
            };

            /**
             * reads out all the specific tags of A-ASSOCIATE-RJ and leaves the rest to the bodyHandler
             * @method A_ASSOCIATE_RJ_Handler
             * @param {Buffer} buffer input buffer
             * @param {Object} ret current object or subobject to attach everything to
             */
            dicomMsgReader.A_ASSOCIATE_RJ_Handler = function(buffer, ret) {//TODO
                logh("A_ASSOCIATE_RJ_Handler");
                ret.type = "A_ASSOCIATE_RJ";
                ret.attributes.len = tools.byteArrayToLongB(buffer.slice(2,6));
                ret.attributes.result = tools.byteArrayToLongB(buffer.slice(7,8));
                ret.attributes.source = tools.byteArrayToLongB(buffer.slice(8,9));
                ret.attributes.reason_diag = tools.byteArrayToLongB(buffer.slice(9,10));
                if (buffer.length-6 !== ret.attributes.len) {
                    ret.errors.push("length is supposed to be "+ret.attributes.len+" but is "+(buffer.length-6));
                }
            };

            /**
             * reads out all the specific tags of A-PDATA-TF and leaves the rest to the presentationDataHandler for dicom messages
             * @method P_DATA_TF_Handler
             * @param {Buffer} buffer input buffer
             * @param {Object} ret current object or subobject to attach everything to
             */
            dicomMsgReader.P_DATA_TF_Handler = function(buffer, ret) {//TODO
                logh("P_DATA_TF_Handler");
                ret.type = "P_DATA_TF";
                ret.attributes.len = tools.byteArrayToLongB(buffer.slice(2,6));

                if (buffer.length-6 !== ret.attributes.len) {
                    ret.errors.push("length is supposed to be "+ret.attributes.len+" but is "+(buffer.length-6));
                }

                var body = buffer.slice(6, buffer.length);
                dicomMsgReader.presentationDataHandler(body, ret.value);
            };

            /**
             * reads out all the specific tags of A-RELEASE-type messages
             * @method A_RELEASE_XX_Handler
             * @param {Buffer} buffer input buffer
             * @param {Object} ret current object or subobject to attach everything to
             */
            dicomMsgReader.A_RELEASE_XX_Handler = function(buffer, ret) {
                logh("A_RELEASE_XX_Handler");
                var type = buffer[0].toString(16);
                for(var propertyName in tools.messageTypeTags) {
                    if(tools.messageTypeTags.hasOwnProperty(propertyName)) {
                        if (tools.messageTypeTags[propertyName] === buffer[0]) {
                            type = propertyName;
                        }
                    }
                }
                ret.type = type;
                ret.attributes.len = tools.byteArrayToLongB(buffer.slice(2,6));

                if (buffer.length-6 !== ret.attributes.len) {
                    ret.errors.push("length is supposed to be "+ret.attributes.len+" but is "+(buffer.length-6));
                }
            };

            /**
             * reads out all the specific tags of A-ABORT messages
             * @method A_ABORT_Handler
             * @param {Buffer} buffer input buffer
             * @param {Object} ret current object or subobject to attach everything to
             */
            dicomMsgReader.A_ABORT_Handler = function(buffer, ret) {
                logh("A_ABORT_Handler");
                ret.type = "A_ABORT";
                ret.attributes.len = tools.byteArrayToLongB(buffer.slice(2,6));
                ret.attributes.source = tools.ABORT_source[tools.byteArrayToLongB(buffer.slice(8,9))];
                ret.attributes.reason_diag = tools.ABORT_diag[tools.byteArrayToLongB(buffer.slice(9,10))];

                if (buffer.length-6 !== ret.attributes.len) {
                    ret.errors.push("length is supposed to be "+ret.attributes.len+" but is "+(buffer.length-6));
                }
            };

            /**
             * standard string handler - checks type, len, and associated value
             * @method std_str_Handler
             * @param {Buffer} buffer input buffer
             * @param {Object} ret current object or subobject to attach everything to
             */
            dicomMsgReader.std_str_Handler = function(buffer, ret) {
                logh("application_context_item_Handler");

                var type = buffer[0].toString(16);

                for(var propertyName in tools.messageTypeTags) {
                    if(tools.messageTypeTags.hasOwnProperty(propertyName)) {
                        if (tools.messageTypeTags[propertyName] === buffer[0]) {
                            type = propertyName;
                        }
                    }
                }

                ret.push({
                    type: type,
                    attributes: {
                        len: tools.byteArrayToLongB(buffer.slice(2,4))
                    },
                    value: buffer.slice(4,buffer.length).toString()
                });
            };

            /**
             * standard object handler - checks attributes and leaves everything after that to the bodyHandler
             * @method std_obj_Handler
             * @param {Buffer} buffer input buffer
             * @param {Object} ret current object or subobject to attach everything to
             */
            dicomMsgReader.std_obj_Handler = function(buffer, ret) {
                logh("user_info_item_Handler");

                var type = buffer[0].toString(16);

                for(var propertyName in tools.messageTypeTags) {
                    if(tools.messageTypeTags.hasOwnProperty(propertyName)) {
                        if (tools.messageTypeTags[propertyName] === buffer[0]) {
                            type = propertyName;
                        }
                    }
                }

                ret.push({
                    type: type,
                    attributes: {
                        len: tools.byteArrayToLongB(buffer.slice(2, 4))
                    },
                    value: []
                });

                dicomMsgReader.bodyHandler(buffer.slice(4, buffer.length), ret[ret.length-1].value);
            };

            /**
             * reads out all the specific tags and data of presentation context items
             * @method presentation_context_item_Handler
             * @param {Buffer} buffer input buffer
             * @param {Object} ret current object or subobject to attach everything to
             */
            dicomMsgReader.presentation_context_item_Handler = function(buffer, ret) {
                logh("presentation_context_item_Handler");

                ret.push({
                    type: "presentation_context_item",
                    attributes: {
                        len: tools.byteArrayToLongB(buffer.slice(2, 4)),
                        presentation_context_id: tools.byteArrayToLongB(buffer.slice(4, 5))
                    },
                    value: []
                });

                dicomMsgReader.bodyHandler(buffer.slice(8, buffer.length), ret[ret.length-1].value);
            };

            /**
             * reads out all the specific tags and data of presentation context response items
             * @method presentation_context_item_Handler
             * @param {Buffer} buffer input buffer
             * @param {Object} ret current object or subobject to attach everything to
             */
            dicomMsgReader.presentation_context_response_item_Handler = function(buffer, ret) {
                logh("presentation_context_response_item_Handler");

                ret.push({
                    type: "presentation_context_response",
                    attributes: {
                        len: tools.byteArrayToLongB(buffer.slice(2, 4)),
                        presentation_context_id: tools.byteArrayToLongB(buffer.slice(4, 5)),
                        result_reason: tools.ASSAC_presentation_resultreason[tools.byteArrayToLongB(buffer.slice(6, 7))]
                    },
                    value: []
                });

                dicomMsgReader.bodyHandler(buffer.slice(8, buffer.length), ret[ret.length-1].value);
            };

            /**
             * reads out all the specific tags and data of max len items
             * @method maximum_length_item_Handler
             * @param {Buffer} buffer input buffer
             * @param {Object} ret current object or subobject to attach everything to
             */
            dicomMsgReader.maximum_length_item_Handler = function(buffer, ret) {
                logh("maximum_length_item_Handler");

                ret.push({
                    type: "maximum_length_item",
                    attributes: {
                        len: tools.byteArrayToLongB(buffer.slice(2, 4))
                    },
                    value: tools.byteArrayToLongB(buffer.slice(4,buffer.length))
                });
            };

            /**
             * reads out all the specific tags and data of presentation data value items
             * @method presentation_data_value_item_Handler
             * @param {Buffer} buffer input buffer
             * @param {Object} ret current object or subobject to attach everything to
             */
            dicomMsgReader.presentation_data_value_item_Handler = function(buffer, ret) {//TODO
                logh("presentation_data_value_item_Handler");

                ret.push({
                    type: "maximum_length_item",
                    attributes: {
                        len: tools.byteArrayToLongB(buffer.slice(2, 4))
                    },
                    value: tools.byteArrayToLongB(buffer.slice(4,buffer.length))
                });
            };

            /**
             * reads out all the specific tags and data of abstract syntax items
             * @method abstract_syntax_Handler
             * @param {Buffer} buffer input buffer
             * @param {Object} ret current object or subobject to attach everything to
             */
            dicomMsgReader.abstract_syntax_Handler = function(buffer, ret) {
                logh("abstract_syntax_Handler");

                var type = tools.getAttribute(tools.messageTypeTags, buffer[0]);
                if (!type) {type = buffer[0].toString(16);}

                var valBuffer = buffer.slice(4,buffer.length);
                var valArray = [];
                for (var i = 0; i < valBuffer.length; i++) {valArray.push(valBuffer[i]);}

                var val = tools.getAttribute(tools.serviceClasses, valArray);
                if (!val) {val = valBuffer.toString();}

                logh("result: "+val);

                ret.push({
                    type: type,
                    attributes: {
                        len: tools.byteArrayToLongB(buffer.slice(2,4))
                    },
                    value: val
                });
            };

            /**
             * reads out all the specific tags and data of transfer syntax items
             * @method transfer_syntax_Handler
             * @param {Buffer} buffer input buffer
             * @param {Object} ret current object or subobject to attach everything to
             */
            dicomMsgReader.transfer_syntax_Handler = function(buffer, ret) {
                logh("transfer_syntax_Handler");

                var type = tools.getAttribute(tools.messageTypeTags, buffer[0]);
                if (!type) {type = buffer[0].toString(16);}

                var valBuffer = buffer.slice(4,buffer.length);
                var valArray = [];
                for (var i = 0; i < valBuffer.length; i++) {valArray.push(valBuffer[i]);}

                var val = tools.getAttribute(tools.transferSyntax, valArray);
                if (!val) {val = valBuffer.toString();}

                logh("result: "+val);

                ret.push({
                    type: type,
                    attributes: {
                        len: tools.byteArrayToLongB(buffer.slice(2,4))
                    },
                    value: val
                });
            };

            /**
             * reads the second layer dicom messages
             * @method dicomMessageHandler
             * @param {Buffer} buffer input buffer
             * @param {Object} ret current object or subobject to attach everything to
             * @param {Boolean} command if the given entry is a command block - if not, it's data
             */
            dicomMsgReader.dicomMessageHandler = function(buffer, ret, command) {
                logh("dicomMessageHandler");

                for (var i = 0; i < buffer.length; i++) {
                    var len = tools.byteArrayToLongL(buffer.slice(i+4,i+8));

                    var typeBuffer = buffer.slice(i,i+4);
                    var typeArray = [];
                    for (var j = 0; j < typeBuffer.length; j++) {typeArray.push(typeBuffer[j]);}
                    var type = tools.getAttribute(command?tools.commands:tools.dataFields, typeArray, "tag");
                    if (!type) {type = typeBuffer;}

                    var val = buffer.slice(i+8,i+8+len);
                    if (0 === val.length) {
                        val = [];
                    }

                    if (val) {
                        switch(type) {
                            case "MessageID":
                            case "CommandGroupLength": val = tools.byteArrayToLongL(val); break;
                            case "AffectedSOPClassUID": val=val.toString().replace(/\u0000/g,""); var tv=tools.getAttribute(tools.serviceClasses,tools.string2Arr(val)); if(tv){val=tv;} break;
                            case "CommandField": var cfa=[]; for(var k=0;k<val.length;k++){cfa.push(val[k]);} var cf=tools.getAttribute(tools.commandFIeldTags,cfa); if(cf){val=cf;} break;
                            case "Priority": var pa=[]; for(var l=0;l<val.length;l++){pa.push(val[l]);} var p=tools.getAttribute(tools.priority,pa); if(p){val=p;} break;
                            case "CommandDataSetType": val=(0x01===val[0]&&0x01===val[1])?"hasNoDataSet":"hasDataSet"; break;
                            case "Status": val=tools.statusCodesString(val); break;
                        }
                    }

                    ret.push({
                        type: type,
                        attributes: {
                            len: len
                        },
                        value: val
                    });

                    i += len+7;
                }

            };


        };
        
        Y.namespace( 'doccirrus.api.dicom' ).messageReader = new DicomMsgReader();

    },
    '0.0.1', {requires: []}
);

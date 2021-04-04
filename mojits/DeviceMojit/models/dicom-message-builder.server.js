/*
 @user: jm
 @date: 2015-07-28
 */

/**
 * dicom message builder based on minimal args. Incompatible with abstract dicom json from the reader for now.
 */

/*global YUI */



YUI.add( 'dicom-message-builder', function( Y, NAME ) {
        var DicomMsgBuilder = function() {

            /**
             * Created by jm on 2014-11-12.
             */

            var dicomMsgBuilder = this;
            var tools = Y.doccirrus.api.dicom.tools;

            /**
             * builds an A-ASSOCIATE-RQ integer array (for ease of use) that can be used with new Buffer()
             * @method A_ASSOCIATE_RQ
             * @param {Object} args
             * @param {String} args.from                  AET (name) of the sender
             * @param {String} args.to                    AET of receiver
             * @param {[Number]} [args.ac_name]           UID for the application context item
             * @param {Array} args.presentation_contexts  list of contexts
             * 
             * @param {Number} args.presentation_contexts.contextId   self-defined tag
             * @param {[Number]} args.presentation_contexts.class     UID from serviceClasses list
             * @param {[[Number]]} args.presentation_contexts.syntax  Array of UIDs from transferSyntax list. only one of those will be accepted from the dicom server.
             *
             * @return {Array}
             */
            dicomMsgBuilder.A_ASSOCIATE_RQ = function(args) {
                // stage 1: assemble body

                // trim/pad entity names
                if (args.from.length > 16) {
                    args.from = args.from.substring(0,16);
                }
                if (args.to.length > 16) {
                    args.from = args.from.substring(0,16);
                }
                while (args.from.length < 16) {
                    args.from+=" ";
                }
                while (args.to.length < 16) {
                    args.to+=" ";
                }

                var protocol_version = [0,1]; //hardcoded
                var Called_entity_title = tools.string2Arr(args.to); //pad
                var Calling_entity_title = tools.string2Arr(args.from); //pad
                var variable_field = dicomMsgBuilder.application_context_item(args.ac_name);

                for (var i = 0; i < args.presentation_contexts.length; i++) {
                    variable_field = variable_field.concat(dicomMsgBuilder.presentation_context_item(args.presentation_contexts[i]));
                }

                variable_field = variable_field.concat(dicomMsgBuilder.user_info_item());


                var body = []
                    .concat(protocol_version) // 2
                    .concat([0,0])
                    .concat(Called_entity_title) // 16
                    .concat(Calling_entity_title) // 16
                    .concat([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])
                    .concat(variable_field);

                // stage 2: assemble head
                var pdu_type = [tools.messageTypeTags.A_ASSOCIATE_RQ];
                //tools.even(body);
                var pdu_length = tools.intToByteArrayB(body.length);

                // stage 3: return
                return []
                    .concat(pdu_type) // 1
                    .concat([0])
                    .concat(pdu_length) // 4
                    .concat(body);
            };

            /**
             * builds an A-ASSOCIATE-AC integer array
             * @method A_ASSOCIATE_AC
             *
             * @return {Array}
             */
            dicomMsgBuilder.A_ASSOCIATE_AC = function() { //TODO
                return [];
            };

            /**
             * builds an A-ASSOCIATE-RJ integer array
             * @method A_ASSOCIATE_RJ
             *
             * @return {Array}
             */
            dicomMsgBuilder.A_ASSOCIATE_RJ = function () { //TODO
                return [];
            };

            /**
             * builds an P-DATA-TF integer array on a basic level. further abstraction needed.
             * @method P_DATA_TF
             * @param {[Object]} args           array of presentation data obj
             * @param {Number} args.contextId   references the context/ID created in the A-ASSOCIATE-RQ request
             * @param {Boolean} args.command    if the given entry is a command.
             * @param {Boolean} args.last       if the given entry is the last in the current block.
             * @param {[Object]} args.messages  array of dicom objects/messages to be sent.
             * 
             * @param {[Number]} args.messages.type   Tag from commands.*.tag or dataFields.*.tag, depending on if it's a command or data set 
             * @param {[Number]} args.messages.value  value depending on tab. Can be arbitrary integer array, serviceClasses, commandFIeldTags, priority, etc.
             *
             * @return {Array}
             */
            dicomMsgBuilder.P_DATA_TF = function (args) { //TODO
                // stage 1: assemble body

                var variable_field = [];

                for (var i = 0; i < args.presentation_data.length; i++) {
                    var submsg = dicomMsgBuilder.presentation_data_value_item(args.presentation_data[i]);
                    variable_field = variable_field.concat(submsg);
                }

                // stage 2: assemble head
                var pdu_type = [tools.messageTypeTags.P_DATA_TF];
                variable_field = tools.arrEven(variable_field);
                var pdu_length = tools.intToByteArrayB(variable_field.length);

                Y.log("P_DATA_TF_LEN: "+variable_field.length, "log", NAME);

                // stage 3: return
                return []
                    .concat(pdu_type) // 1
                    .concat([0])
                    .concat(pdu_length) // 4
                    .concat(variable_field);
            };

            /**
             * builds an A-RELEASE-RQ integer array.
             * @method A_RELEASE_RQ
             * @return {Array}
             */
            dicomMsgBuilder.A_RELEASE_RQ = function () { //TODO
                return [];
            };

            /**
             * builds an A-RELEASE-RP integer array.
             * @method A_RELEASE_RP
             * @return {Array}
             */
            dicomMsgBuilder.A_RELEASE_RP = function () { //TODO
                return [];
            };

            /**
             * builds an A-ABORT integer array.
             * @method A_ABORT
             * @return {Array}
             */
            dicomMsgBuilder.A_ABORT = function () { //TODO
                return [];
            };

            /**
             * builds an application context item integer array.
             * @method application_context_item
             * @param {[Number]} name UID of the application context. Is usually "1.2.840.10008.3.1.1.1" (as int array)
             * @return {Array}
             */
            dicomMsgBuilder.application_context_item = function (name) {//unique
                // stage 1: assemble body
                if (!name) {
                    name = tools.defaults.application_context_name;
                }

                var application_context_name = name;

                // stage 2: assemble head
                var item_type = [tools.messageTypeTags.application_context];
                //tools.even(application_context_name);
                var item_length = tools.shortToByteArrayB(name.length);

                // stage 3: return
                return []
                    .concat(item_type) // 1
                    .concat([0])
                    .concat(item_length) // 2
                    .concat(application_context_name); // <=64
            };

            /**
             * builds a presentation context item integer array.
             * @method presentation_context_item
             * @param {Object} serviceDescription a single object from the presentation_contexts array

             * @param {Number} serviceDescription.contextId   self-defined tag
             * @param {[Number]} serviceDescription.class     UID from serviceClasses list
             * @param {[[Number]]} serviceDescription.syntax  Array of UIDs from transferSyntax list. only one of those will be accepted from the dicom server.
             *
             * @return {Array}
             */
            dicomMsgBuilder.presentation_context_item = function (serviceDescription) {//multiple
                // stage 1: assemble body
                var presentation_context_id = serviceDescription.contextId||[Math.floor(Math.random()*256)]; // arbitrary
                //var result_reason = [0];
                var variable_field = []
                    .concat(dicomMsgBuilder.abstract_syntax_item(serviceDescription.class));

                for (var i = 0; i < serviceDescription.syntax.length; i++) {
                    variable_field = variable_field.concat(dicomMsgBuilder.transfer_syntax_item(serviceDescription.syntax[i]));
                }

                var body = []
                    .concat(presentation_context_id) // 1
                    .concat([0])
                    .concat([0])
                    .concat([0])
                    .concat(variable_field);

                // stage 2: assemble head
                var item_type = [tools.messageTypeTags.presentation_context];
                //tools.even(body);
                var item_length = tools.shortToByteArrayB(body.length);

                // stage 3: return
                return []
                    .concat(item_type) // 1
                    .concat([0])
                    .concat(item_length) // 2
                    .concat(body);
            };

            /**
             * builds a abstract syntax item integer array.
             * @method abstract_syntax_item
             * @param {[Number]} serviceClass value used
             *
             * @return {Array}
             */
            dicomMsgBuilder.abstract_syntax_item = function (serviceClass) {//unique in RC, none in AC
                // stage 1: assemble body
                var variable_field = serviceClass;// len = <=64

                // stage 2: assemble head
                var item_type = [tools.messageTypeTags.abstract_syntax];
                //tools.even(variable_field);
                var item_length = tools.shortToByteArrayB(variable_field.length);

                // stage 3: return
                return []
                    .concat(item_type) // 1
                    .concat([0])
                    .concat(item_length) // 2
                    .concat(variable_field); // <=64
            };

            /**
             * builds a transfer syntax item integer array.
             * @method transfer_syntax_item
             * @param {[Number]} transferSyntax value used
             *
             * @return {Array}
             */
            dicomMsgBuilder.transfer_syntax_item = function (transferSyntax) {//multiple in RQ, unique in AC
                // stage 1: assemble body
                var variable_field = transferSyntax;// len = <=64

                // stage 2: assemble head
                var item_type = [tools.messageTypeTags.transfer_syntax];
                //tools.even(variable_field);
                var item_length = tools.shortToByteArrayB(variable_field.length);

                // stage 3: return
                return []
                    .concat(item_type) // 1
                    .concat([0])
                    .concat(item_length) // 2
                    .concat(variable_field); // <=64
            };

            /**
             * builds a user info item integer array.
             * @method user_info_item
             *
             * @return {Array}
             */
            dicomMsgBuilder.user_info_item = function () {//unique
                // stage 1: assemble body
                var variable_field = dicomMsgBuilder.maximum_length_item();

                // stage 2: assemble head
                var item_type = [tools.messageTypeTags.user_info];
                variable_field = tools.arrEven(variable_field);
                var item_length = tools.shortToByteArrayB(variable_field.length);

                // stage 3: return
                return []
                    .concat(item_type) // 1
                    .concat([0])
                    .concat(item_length) // 2
                    .concat(variable_field);
            };

            /**
             * builds a max length item integer array for the user info item. 0 for now, which means there is no limit
             * @method maximum_length_item
             *
             * @return {Array}
             */
            dicomMsgBuilder.maximum_length_item = function () {//unique
                // stage 1: assemble body
                var max_length_received = [0,0,0,0];

                // stage 2: assemble head
                var item_type = [tools.messageTypeTags.maximum_length];
                max_length_received = tools.arrEven(max_length_received);
                var item_length = tools.shortToByteArrayB(max_length_received.length);

                // stage 3: return
                return []
                    .concat(item_type) // 1
                    .concat([0])
                    .concat(item_length) // 2
                    .concat(max_length_received);
            };

            /**
             * builds a presentation data value item integer array.
             * @method presentation_data_value_item
             * @param {Object} presentation_data
             * @param {Number} presentation_data.contextId   references the context/ID created in the A-ASSOCIATE-RQ request
             * @param {Boolean} presentation_data.command    if the given entry is a command.
             * @param {Boolean} presentation_data.last       if the given entry is the last in the current block.
             * @param {[Object]} presentation_data.messages  array of dicom objects/messages to be sent.
             *
             * @param {[Number]} presentation_data.messages.type   Tag from commands.*.tag or dataFields.*.tag, depending on if it's a command or data set
             * @param {[Number]} presentation_data.messages.value  value depending on tab. Can be arbitrary integer array, serviceClasses, commandFIeldTags, priority, etc.
             *
             * @return {Array}
             */
            dicomMsgBuilder.presentation_data_value_item = function (presentation_data) {

                // DICOM Message = Command Fragments + Data Fragments
                // only one command or one data fragment per PDV, preceded by Message Control Header
                // same context for every fragment of the same message

                // stage 1: assemble body

                //header indicates: type (command/data) and if last fragment

                var command = 0x00;
                if (presentation_data.command) {command = 0x01;}
                var last = 0x00;
                if (presentation_data.last) {last = 0x02;}

                var message_control_header = 0x00|command|last; //jshint ignore:line

                var presentation_data_value = [presentation_data.contextId]
                    .concat(message_control_header);

                for (var i = 0; i < presentation_data.messages.length; i++) {
                    var messageData = presentation_data.messages[i];
                    var submsg = dicomMsgBuilder.dicom_message({
                        type: messageData.type.tag,
                        value: messageData.value
                    });
                    presentation_data_value = presentation_data_value.concat(submsg);
                }


                // stage 2: assemble head
                presentation_data_value = tools.arrEven(presentation_data_value);
                var item_length = tools.intToByteArrayB(presentation_data_value.length);


                // stage 3: return
                return []
                    .concat(item_length) // 4
                    .concat(presentation_data_value);
            };

            /**
             * builds a presentation data value item integer array.
             * @method dicom_message
             * @param {Object} dicom_msg
             * @param {[Number]} dicom_msg.type   Tag from commands.*.tag or dataFields.*.tag, depending on if it's a command or data set
             * @param {[Number]} dicom_msg.value  value depending on tab. Can be arbitrary integer array, serviceClasses, commandFIeldTags, priority, etc.
             *
             * @return {Array}
             */
            dicomMsgBuilder.dicom_message = function (dicom_msg) {//TODO
                //console.log("object: "+util.inspect(dicom_msg));

                // stage 1: assemble body

                var value = dicom_msg.value;

                // stage 2: assemble head
                var item_tag = dicom_msg.type;
                value = tools.arrEven(value);
                var item_length = tools.intToByteArrayL(value.length);

                // stage 3: return
                var ret = []
                    .concat(item_tag) // 4
                    .concat(item_length) // 4
                    .concat(value);

                //console.log("ret:");
                //console.log(ret);
                return ret;
            };



        };
        
        Y.namespace( 'doccirrus.api.dicom' ).messageBuilder = new DicomMsgBuilder();

    },
    '0.0.1', {requires: []}
);

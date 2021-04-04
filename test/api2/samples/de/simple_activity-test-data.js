'use strict';
var
    history = {
        "actType": "HISTORY",
        "timestamp": "2017-06-20T21:14:33.173Z",
        "patientId": "594a429c396bdc130bd43e9a",
        "employeeId": "",
        "locationId": "000000000000000000000001",
        "caseFolderId": "594a58fb396bdc130bd43ed2",
        "userContent": "Description:my short history",
        "content": "my short history",
        "status": "VALID"
    },
    putParams = {
        data: history
    };

module.exports = {
    getData: function() {
        return history;
    },
    putParams: putParams
};
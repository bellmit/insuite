/**
 * User: nazar krania
 * Date: 1/24/19  12:39 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */



const meddata = {
        "_id" : "5c49cff5e6d6cb498a76767b",
        "actType" : "MEDDATA",
        "attachments" : [],
        "subType" : "",
        "userContent" : "",
        "partnerInfo" : "",
        "explanations" : "",
        "status" : "VALID",
        "apkState" : "IN_PROGRESS",
        "attachedMedia" : [],
        "timestamp" : "2019-01-24T14:47:07.044Z",
        "patientId": "54be764fc404c1d77a286d4d",
        "employeeId": "56f5382c37644678aa923d92",
        //"locationId": "000000000000000000000001",
        "locationId": "54eb41b878382da863181d3b",
        "caseFolderId":"",
        "editor": "",
        "employeeInitials": "",
        "employeeName": "",
        "medData" : [
            {
                "_id" : "5c49cff5e6d6cb498a76767c",
                "type" : "BMI",
                "value" : 1,
                "textValue" : "f",
                "unit" : "kg/m2"
            }
        ],
        "content" : "BMI: 1 kg/m2 f"
    },
    putParams = { data: meddata };

module.exports = {
    getData: () => JSON.parse( JSON.stringify( meddata ) ),
    getPostResult: () => JSON.parse( JSON.stringify( meddata ) ),
    getDeleteResult: () => JSON.parse( JSON.stringify( meddata ) ),
    putParams
};
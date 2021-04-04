let calmap = {}; db.calendars.find({_id:{$lt:ObjectId("5ef9f9e0705d4f9be7e88c11")}},{name:1}).forEach(c=>{calmap[c.name]=c._id;})
let mapping=
    [
        ["RV_Arztzimmer6","","AZ1 - Coaching","AZ1","5e32b219e526ad2d7b24a226","Coaching","5e317fa126c72a2d79419bb1"],
        ["xLI_Labor_05","","Lindau Labor  - Labor","Lindau Labor ","5e382099d1ade15afb841819","Labor","5eec49027de4b734921b8a8b"],
        ["xLI_Labor_05_Kreuzblut","","Lindau Labor  - Labor","Lindau Labor ","5e382099d1ade15afb841819","Labor","5eec49027de4b734921b8a8b"],
        ["xLI_Labor_10_Punktion","","Lindau Labor  - Labor","Lindau Labor ","5e382099d1ade15afb841819","Labor","5eec49027de4b734921b8a8b"],
        ["xLI_Labor_20_Studien","","Lindau Labor  - Labor","Lindau Labor ","5e382099d1ade15afb841819","Labor","5eec49027de4b734921b8a8b"],
        ["xLI_NO_SP10","","Dr.Nonnenbroich Lindau - Standard 10","Dr.Nonnenbroich Lindau","5def86f551145e96e1be34b7","Standard 10","51b732232e837550c90851fb"],
        ["xLI_NO_SP20","","Dr.Nonnenbroich Lindau - Neu Abklärung 20","Dr.Nonnenbroich Lindau","5def86f551145e96e1be34b7","Neu Abklärung 20","5dee99ac51145e96e1bde931"],
        ["xLI_NO_SP30","","Dr.Nonnenbroich Lindau - Neu Tumor 30","Dr.Nonnenbroich Lindau","5def86f551145e96e1be34b7","Neu Tumor 30","5dee99d0fed73096dbaa1bbe"],
        ["xRV_BI_SP10","","Dr.Birtel - Standard 10","Dr.Birtel","5df095b3fed73096dbaa735e","Standard 10","51b732232e837550c90851fb"],
        ["xRV_BI_SP20","","Dr.Birtel - Neu Abklärung 20","Dr.Birtel","5df095b3fed73096dbaa735e","Neu Abklärung 20","5dee99ac51145e96e1bde931"],
        ["xRV_BI_SP30","","Dr.Birtel - Neu Tumor 30","Dr.Birtel","5df095b3fed73096dbaa735e","Neu Tumor 30","5dee99d0fed73096dbaa1bbe"],
        ["xRV_BIC_SP10","","Dr.Bichler - Standard 10","Dr.Bichler","5df09631c04e9696d34ce6ef","Standard 10","51b732232e837550c90851fb"],
        ["xRV_BIC_SP20","","Dr.Bichler - Neu Abklärung 20","Dr.Bichler","5df09631c04e9696d34ce6ef","Neu Abklärung 20","5dee99ac51145e96e1bde931"],
        ["xRV_BIC_SP30","","Dr.Bichler - Neu Tumor 30","Dr.Bichler","5df09631c04e9696d34ce6ef","Neu Tumor 30","5dee99d0fed73096dbaa1bbe"],
        ["xRV_DW_SP10","","Prof.Dechow - Standard 10","Prof.Dechow","5def7a3c51145e96e1be3158","Standard 10","51b732232e837550c90851fb"],
        ["xRV_DW_SP20","","Prof.Dechow - Neu Abklärung 20","Prof.Dechow","5def7a3c51145e96e1be3158","Neu Abklärung 20","5dee99ac51145e96e1bde931"],
        ["xRV_DW_SP30","","Prof.Dechow - Neu Tumor 30","Prof.Dechow","5def7a3c51145e96e1be3158","Neu Tumor 30","5dee99d0fed73096dbaa1bbe"],
        ["xRV_FI_SP10","","Dr.Fischer - Standard 10","Dr.Fischer","5def766d51145e96e1be3120","Standard 10","51b732232e837550c90851fb"],
        ["xRV_FI_SP20","","Dr.Fischer - Neu Abklärung 20","Dr.Fischer","5def766d51145e96e1be3120","Neu Abklärung 20","5dee99ac51145e96e1bde931"],
        ["xRV_FI_SP30","","Dr.Fischer - Neu Tumor 30","Dr.Fischer","5def766d51145e96e1be3120","Neu Tumor 30","5dee99d0fed73096dbaa1bbe"],
        ["xRV_NO_SP10","","Dr.Nonnenbroich - Standard 10","Dr.Nonnenbroich","5def86a5fed73096dbaa6754","Standard 10","51b732232e837550c90851fb"],
        ["xRV_NO_SP20","","Dr.Nonnenbroich - Neu Abklärung 20","Dr.Nonnenbroich","5def86a5fed73096dbaa6754","Neu Abklärung 20","5dee99ac51145e96e1bde931"],
        ["xRV_NO_SP30","","Dr.Nonnenbroich - Neu Tumor 30","Dr.Nonnenbroich","5def86a5fed73096dbaa6754","Neu Tumor 30","5dee99d0fed73096dbaa1bbe"],
        ["xRV_TD_SP10","","Prof.Decker - Standard 10","Prof.Decker","5def84af7e757996d2ad87ed","Standard 10","51b732232e837550c90851fb"],
        ["xRV_TD_SP20","","Prof.Decker - Neu Abklärung 20","Prof.Decker","5def84af7e757996d2ad87ed","Neu Abklärung 20","5dee99ac51145e96e1bde931"],
        ["xRV_TD_SP30","","Prof.Decker - Neu Tumor 30","Prof.Decker","5def84af7e757996d2ad87ed","Neu Tumor 30","5dee99d0fed73096dbaa1bbe"],
        ["xWA_BIC_SP10","","Dr.Bichler WANGEN - Standard 10","Dr.Bichler WANGEN","5df096c07e757996d2ad9478","Standard 10","51b732232e837550c90851fb"],
        ["xWA_BIC_SP20","","Dr.Bichler WANGEN - Neu Abklärung 20","Dr.Bichler WANGEN","5df096c07e757996d2ad9478","Neu Abklärung 20","5dee99ac51145e96e1bde931"],
        ["xWA_BIC_SP30","","Dr.Bichler WANGEN - Neu Tumor 30","Dr.Bichler WANGEN","5df096c07e757996d2ad9478","Neu Tumor 30","5dee99d0fed73096dbaa1bbe"],
        ["xWA_DW_SP10","","Prof. Dechow WANGEN - Standard 10","Prof. Dechow WANGEN","5def843b51145e96e1be33fc","Standard 10","51b732232e837550c90851fb"],
        ["xWA_DW_SP20","","Prof. Dechow WANGEN - Neu Abklärung 20","Prof. Dechow WANGEN","5def843b51145e96e1be33fc","Neu Abklärung 20","5dee99ac51145e96e1bde931"],
        ["xWA_DW_SP30","","Prof. Dechow WANGEN - Neu Tumor 30","Prof. Dechow WANGEN","5def843b51145e96e1be33fc","Neu Tumor 30","5dee99d0fed73096dbaa1bbe"],
        ["xWA_NO_SP10","","Dr.Nonnenbroich Wangen - Standard 10","Dr.Nonnenbroich Wangen","5def8731fed73096dbaa677d","Standard 10","51b732232e837550c90851fb"],
        ["xWA_NO_SP20","","Dr.Nonnenbroich Wangen - Neu Abklärung 20","Dr.Nonnenbroich Wangen","5def8731fed73096dbaa677d","Neu Abklärung 20","5dee99ac51145e96e1bde931"],
        ["xWA_NO_SP30","","Dr.Nonnenbroich Wangen - Neu Tumor 30","Dr.Nonnenbroich Wangen","5def8731fed73096dbaa677d","Neu Tumor 30","5dee99d0fed73096dbaa1bbe"],
        ["xWA_TD_SP10","","Prof.Decker WANGEN - Standard 10","Prof.Decker WANGEN","5def859efed73096dbaa670c","Standard 10","51b732232e837550c90851fb"],
        ["xWA_TD_SP20","","Prof.Decker WANGEN - Neu Abklärung 20","Prof.Decker WANGEN","5def859efed73096dbaa670c","Neu Abklärung 20","5dee99ac51145e96e1bde931"],
        ["xWA_TD_SP30","","Prof.Decker WANGEN - Neu Tumor 30","Prof.Decker WANGEN","5def859efed73096dbaa670c","Neu Tumor 30","5dee99d0fed73096dbaa1bbe"],
        ["xxRV_Coa_NP30_1","","AZ1 - Coaching","AZ1","5e32b219e526ad2d7b24a226","Coaching","5e317fa126c72a2d79419bb1"],
        ["xxRV_Coa_SP10_1","","AZ1 - Coaching","AZ1","5e32b219e526ad2d7b24a226","Coaching","5e317fa126c72a2d79419bb1"],
        ["xxRV_Coa_SP20_1","","AZ1 - Coaching","AZ1","5e32b219e526ad2d7b24a226","Coaching","5e317fa126c72a2d79419bb1"],
        ["xxRV_DW_SP10","","Prof. Dechow - Standard 10","Prof. Dechow","5def7a3c51145e96e1be3158","Standard 10","51b732232e837550c90851fb"],
        ["xxRV_EKG-Raum_Aufklärung_30","","EKG - EKG","EKG","5ede0577b1cbb3697c7ee682","EKG","5ede05ddb1cbb3697c7ee689"],
        ["xxRV_EKG-Raum_EKG_15","","EKG - EKG","EKG","5ede0577b1cbb3697c7ee682","EKG","5ede05ddb1cbb3697c7ee689"],
        ["xxRV_EKG-Raum_Punktion_60","","EKG - EKG","EKG","5ede0577b1cbb3697c7ee682","EKG","5ede05ddb1cbb3697c7ee689"],
        ["xxRV_Labor_05_Kreuzblut","","Labor - Labor","Labor","5e3191bb26c72a2d79419bcc","Labor","5eec49027de4b734921b8a8b"],
        ["xxRV_Labor_10","","Labor - Labor","Labor","5e3191bb26c72a2d79419bcc","Labor","5eec49027de4b734921b8a8b"],
        ["xxRV_Labor_10_Punktion","","Labor - Labor","Labor","5e3191bb26c72a2d79419bcc","Labor","5eec49027de4b734921b8a8b"],
        ["xxRV_Labor_20_Studien","","Labor - Labor","Labor","5e3191bb26c72a2d79419bcc","Labor","5eec49027de4b734921b8a8b"],
        ["xxRV_NO_SP05","","Dr.Nonnenbroich - Standard 10","Dr.Nonnenbroich","5def86a5fed73096dbaa6754","Standard 10","51b732232e837550c90851fb"],
        ["xxRV_NO_SP20","","Dr.Nonnenbroich - Neu Abklärung 20","Dr.Nonnenbroich","5def86a5fed73096dbaa6754","Neu Abklärung 20","5dee99ac51145e96e1bde931"],
        ["xxWA_Labor_05","","WA -Labor - Labor","WA -Labor","5e381ff620e55c5b02546125","Labor","5eec49027de4b734921b8a8b"],
        ["xxWA_Labor_05_Kreuzblut","","WA -Labor - Labor","WA -Labor","5e381ff620e55c5b02546125","Labor","5eec49027de4b734921b8a8b"],
        ["xxWA_Labor_10_Punktion","","WA -Labor - Labor","WA -Labor","5e381ff620e55c5b02546125","Labor","5eec49027de4b734921b8a8b"],
        ["xxWA_Labor_15_EKG","","WA -Labor - Labor","WA -Labor","5e381ff620e55c5b02546125","Labor","5eec49027de4b734921b8a8b"],
        ["xxWA_Labor_20_Studien","","WA -Labor - Labor","WA -Labor","5e381ff620e55c5b02546125","Labor","5eec49027de4b734921b8a8b"]];

/* check they are all there, they are! */
mapping.map(a=>calmap[a[0]]);
mapping.map(a=>a[4]);
mapping.map(a=>a[6]);

mapping.forEach( m => {
    let oldCalId = calmap[m[0]];
    let newCalId = ObjectId(m[4]);
    let newSTId = m[6];
    /*print(`db.schedules.update(calendar:${oldCalId} ,  set: calendar: ${newCalId} ,scheduletype: ${newSTId}     multi:true});`)*/
    let result = db.schedules.update({calendar:oldCalId},{$set:{calendar:newCalId,scheduletype:newSTId}},{multi:true});
    printjson(result);
});

/* result!!!!
{ "nMatched" : 780, "nUpserted" : 0, "nModified" : 780 }
{ "nMatched" : 871, "nUpserted" : 0, "nModified" : 871 }
{ "nMatched" : 0, "nUpserted" : 0, "nModified" : 0 }
{ "nMatched" : 0, "nUpserted" : 0, "nModified" : 0 }
{ "nMatched" : 1, "nUpserted" : 0, "nModified" : 1 }
{ "nMatched" : 1215, "nUpserted" : 0, "nModified" : 1215 }
{ "nMatched" : 26, "nUpserted" : 0, "nModified" : 26 }
{ "nMatched" : 42, "nUpserted" : 0, "nModified" : 42 }
{ "nMatched" : 6230, "nUpserted" : 0, "nModified" : 6230 }
{ "nMatched" : 284, "nUpserted" : 0, "nModified" : 284 }
{ "nMatched" : 199, "nUpserted" : 0, "nModified" : 199 }
{ "nMatched" : 3153, "nUpserted" : 0, "nModified" : 3153 }
{ "nMatched" : 184, "nUpserted" : 0, "nModified" : 184 }
{ "nMatched" : 228, "nUpserted" : 0, "nModified" : 228 }
{ "nMatched" : 9234, "nUpserted" : 0, "nModified" : 9234 }
{ "nMatched" : 137, "nUpserted" : 0, "nModified" : 137 }
{ "nMatched" : 189, "nUpserted" : 0, "nModified" : 189 }
{ "nMatched" : 4652, "nUpserted" : 0, "nModified" : 4652 }
{ "nMatched" : 76, "nUpserted" : 0, "nModified" : 76 }
{ "nMatched" : 105, "nUpserted" : 0, "nModified" : 105 }
{ "nMatched" : 8110, "nUpserted" : 0, "nModified" : 8110 }
{ "nMatched" : 157, "nUpserted" : 0, "nModified" : 157 }
{ "nMatched" : 180, "nUpserted" : 0, "nModified" : 180 }
{ "nMatched" : 8609, "nUpserted" : 0, "nModified" : 8609 }
{ "nMatched" : 167, "nUpserted" : 0, "nModified" : 167 }
{ "nMatched" : 246, "nUpserted" : 0, "nModified" : 246 }
{ "nMatched" : 3409, "nUpserted" : 0, "nModified" : 3409 }
{ "nMatched" : 166, "nUpserted" : 0, "nModified" : 166 }
{ "nMatched" : 180, "nUpserted" : 0, "nModified" : 180 }
{ "nMatched" : 3786, "nUpserted" : 0, "nModified" : 3786 }
{ "nMatched" : 46, "nUpserted" : 0, "nModified" : 46 }
{ "nMatched" : 55, "nUpserted" : 0, "nModified" : 55 }
{ "nMatched" : 3550, "nUpserted" : 0, "nModified" : 3550 }
{ "nMatched" : 47, "nUpserted" : 0, "nModified" : 47 }
{ "nMatched" : 17, "nUpserted" : 0, "nModified" : 17 }
{ "nMatched" : 4517, "nUpserted" : 0, "nModified" : 4517 }
{ "nMatched" : 84, "nUpserted" : 0, "nModified" : 84 }
{ "nMatched" : 77, "nUpserted" : 0, "nModified" : 77 }
{ "nMatched" : 0, "nUpserted" : 0, "nModified" : 0 }
{ "nMatched" : 2551, "nUpserted" : 0, "nModified" : 2551 }
{ "nMatched" : 0, "nUpserted" : 0, "nModified" : 0 }
{ "nMatched" : 0, "nUpserted" : 0, "nModified" : 0 }
{ "nMatched" : 1591, "nUpserted" : 0, "nModified" : 1591 }
{ "nMatched" : 340, "nUpserted" : 0, "nModified" : 340 }
{ "nMatched" : 31, "nUpserted" : 0, "nModified" : 31 }
{ "nMatched" : 965, "nUpserted" : 0, "nModified" : 965 }
{ "nMatched" : 24471, "nUpserted" : 0, "nModified" : 24471 }
{ "nMatched" : 0, "nUpserted" : 0, "nModified" : 0 }
{ "nMatched" : 888, "nUpserted" : 0, "nModified" : 888 }
{ "nMatched" : 1, "nUpserted" : 0, "nModified" : 1 }
{ "nMatched" : 0, "nUpserted" : 0, "nModified" : 0 }
{ "nMatched" : 9058, "nUpserted" : 0, "nModified" : 9058 }
{ "nMatched" : 53, "nUpserted" : 0, "nModified" : 53 }
{ "nMatched" : 2, "nUpserted" : 0, "nModified" : 2 }
{ "nMatched" : 30, "nUpserted" : 0, "nModified" : 30 }
{ "nMatched" : 284, "nUpserted" : 0, "nModified" : 284 }*/
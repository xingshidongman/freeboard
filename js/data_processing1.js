/**
 var jsonObj="{";
                    for(var i=0;i<data1.length;i++){
                        var jsonArryStr=JSON.stringify(data1[i]);// json数组转为字符串
                        jsonArryStr=jsonArryStr.replace("{","");
                        jsonArryStr=jsonArryStr.replace("}","");
                        jsonObj=jsonObj+jsonArryStr+",";
                    }
                    jsonObj=jsonObj.substring(0,jsonObj.length - 1);
                    jsonObj=jsonObj+"}";
 jsonObj=JSON.parse(jsonObj);
 data=jsonObj;
 */

//第一张图 右中图  返回数据
var gCount=[
    {
        "snmp":48,
        "vm":44,
        "vtlStorage":2,
        "host":72,
        "VMHost":5,
        "middleware":14,
        "StorageLine":2,
        "cabinet":2,
        "daStorage":26,
        "line":27,
        "citrix":11,
        "VMVirtaulMachine":19,
        "bsmBusiness":3,
        "machineroom":5,
        "network":236,
        "database":20,
        "service":14,
        "fcsStorage":2,
        "ping":1,
        "rac":1
    }
];
function ManageCount(gComunt){
    var MOCount=[];
    for(var key in obj){
        if(key=="host"){
            MOCount.push({
                "name": "主机",
                "value": obj[key]
            })
        }
        alert(key+':'+obj[key]);
    }
    MOCount.push({
        "name": "主机",
        "value": 32
    })
}



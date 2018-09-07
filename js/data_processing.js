//场景一
var gldx=[
    {
        "name": "数据库1",
        "localName": "192.168.1.1",
        "qualifiers": [],
        "properties": [],
        "children": [],
        "className": "Oracle",
        "alias": "",
        "cimid": ""
    },
    {
        "name": "数据库2",
        "localName": "192.168.1.2",
        "qualifiers": [],
        "properties": [],
        "children": [],
        "className": "mysql",
        "alias": "",
        "cimid": ""
    },
    {
        "name": "数据库3",
        "localName": "192.168.1.1",
        "qualifiers": [],
        "properties": [],
        "children": [],
        "className": "Oracle",
        "alias": "",
        "cimid": ""
    },
    {
        "name": "数据库4",
        "localName": "192.168.1.1",
        "qualifiers": [],
        "properties": [],
        "children": [],
        "className": "Oracle",
        "alias": "",
        "cimid": ""
    }

]
function arrCheck(gldx) {
    var jsonObj = JSON.parse(gldx);//将json字符串转换为json对象
    var newArr = [];
    for (var i = 0; i < jsonObj.length; i++) {
        var temp = (jsonObj[i].className); //取json中的值
        if (temp == -1) {
            Break;
        }
        var count = 0;
        for (var j = 0; j < jsonObj.length; j++) {
            if (jsonObj[j].className == temp) {
                count++;
                jsonObj[j].className = -1;//记下这个className已经统计过了     
            }
        }
        if (temp != -1) {
            newArr.push(temp + ":" + count)
        }
    }
    return newArr
}

function arrToJson(newArr){
    var result = [];
    jsonstr="[{";
    for(var i=0;i<newArr.length;i++)
    {
        var obj=[];
        var name=newArr[i].split(":")[0];//oracle
        var value=newArr[i].split(":")[1];//22
        obj.push('"name":name');
        Obj.push('"value":value');
        result .push(obj);
    }
}
A = ['oracle:22','mysql:45','sqlserver:21']
//场景二
    [
    {
        "value": {
            "value": 3
        },
        "timestamp": 1460476018900,
        "metrics": "Metrics.moPath=\"LinuxServer.uuid=\\\"00700009\\\",domain=\\\"defaultEngine\\\"\",name=\"OSCPU_CPU_Load\"",
        "error": null
    }
    ]
//场景三
    [
    {
        "value": {
            "value": 18
        },
        "timestamp": 1460566918094,
        "metrics": "Metrics.moPath=\"WinDisk.id=\\\"C:\\\",name=\\\"C:\\\",uuid=\\\"00300024\\\"\",name=\"UsedPer\"",
        "error": null
    },
        {
            "value": {
                "value": 7573
            },
            "timestamp": 1460566566123,
            "metrics": "Metrics.moPath=\"WinDisk.id=\\\"C:\\\",name=\\\"C:\\\",uuid=\\\"00300024\\\"\",name=\"Used\"",
            "error": null
        },
        {
            "value": {
                "value": 25
            },
            "timestamp": 1460566918077,
            "metrics": "Metrics.moPath=\"WinDisk.id=\\\"D:\\\",name=\\\"D:\\\",uuid=\\\"00300024\\\"\",name=\"UsedPer\"",
            "error": null
        },
        {
            "value": {
                "value": 10518
            },
            "timestamp": 1460566624019,
            "metrics": "Metrics.moPath=\"WinDisk.id=\\\"D:\\\",name=\\\"D:\\\",uuid=\\\"00300024\\\"\",name=\"Used\"",
            "error": null
        }
    ]
var ratio=
    [
        {
            "value": {
                "value": 80
            },
            "timestamp": 1460566918094,
            "metrics": "Metrics.moPath=\"Line1.id=\\\"1\\\",name=\\\"1M\\\",uuid=\\\"00300024\\\"\",name=\"ifPercent\"",
            "error": null
        },
        {
            "value": {
                "value": 90
            },
            "timestamp": 1460566566123,
            "metrics": "Metrics.moPath=\"Line2.id=\\\"1\\\",name=\\\"1M\\\",uuid=\\\"00300024\\\"\",name=\"ifPercent\"",
            "error": null
        },
        {
            "value": {
                "value": 25
            },
            "timestamp": 1460566918077,
            "metrics": "Metrics.moPath=\"Line1.id=\\\"2\\\",name=\\\"2M\\\",uuid=\\\"00300024\\\"\",name=\"ifPercent\"",
            "error": null
        },
        {
            "value": {
                "value": 30
            },
            "timestamp": 1460566624019,
            "metrics": "Metrics.moPath=\"Line2.id=\\\"2\\\",name=\\\"2M\\\",uuid=\\\"00300024\\\"\",name=\"ifPercent\"",
            "error": null
        },
        {
            "value": {
                "value": 25
            },
            "timestamp": 1460566918077,
            "metrics": "Metrics.moPath=\"Line1.id=\\\"3\\\",name=\\\"3M\\\",uuid=\\\"00300024\\\"\",name=\"ifPercent\"",
            "error": null
        },
        {
            "value": {
                "value": 30
            },
            "timestamp": 1460566624019,
            "metrics": "Metrics.moPath=\"Line2.id=\\\"3\\\",name=\\\"3M\\\",uuid=\\\"00300024\\\"\",name=\"ifPercent\"",
            "error": null
        },
        {
            "value": {
                "value": 25
            },
            "timestamp": 1460566918077,
            "metrics": "Metrics.moPath=\"Line1.id=\\\"4\\\",name=\\\"4M\\\",uuid=\\\"00300024\\\"\",name=\"ifPercent\"",
            "error": null
        },
        {
            "value": {
                "value": 30
            },
            "timestamp": 1460566624019,
            "metrics": "Metrics.moPath=\"Line2.id=\\\"4\\\",name=\\\"4M\\\",uuid=\\\"00300024\\\"\",name=\"ifPercent\"",
            "error": null
        },
        {
            "value": {
                "value": 25
            },
            "timestamp": 1460566918077,
            "metrics": "Metrics.moPath=\"Line1.id=\\\"5\\\",name=\\\"5M\\\",uuid=\\\"00300024\\\"\",name=\"ifPercent\"",
            "error": null
        },
        {
            "value": {
                "value": 30
            },
            "timestamp": 1460566624019,
            "metrics": "Metrics.moPath=\"Line2.id=\\\"5\\\",name=\\\"5M\\\",uuid=\\\"00300024\\\"\",name=\"ifPercent\"",
            "error": null
        }
    ]
function ifPercent(ratio) {
    var jsonObj = JSON.parse(ratio);//将json字符串转换为json对象
    var newArr1 = [];
    var newArr2 = [];
    var temp1;
    var temp2;
    for (var i = 0; i < jsonObj.length; i++) {
        var ifPercent = (jsonObj[i].metrics); //取json中metrics的值
        var metrics=ifPercent.split("\"");


        for(var j=0;j<metrics.length;j++){
            if(metrucs[j]="name"){
                if(metrics[j+1]==temp1){
                    newArr1.push(jsonObj.value.value+","+temp);
                }
                temp2=metrics[j+1];
            }
        }
    }
    return newArr
}

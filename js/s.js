FreeboardModel
/**
 var jsonArry = [
 {"wd": "27"},
 {"high": "32"},
 {"low": "21"}
 ];
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
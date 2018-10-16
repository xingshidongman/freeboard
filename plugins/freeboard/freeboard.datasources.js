// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ F R E E B O A R D                                                  │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Copyright © 2013 Jim Heising (https://github.com/jheising)         │ \\
// │ Copyright © 2013 Bug Labs, Inc. (http://buglabs.net)               │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT license.                                    │ \\
// └────────────────────────────────────────────────────────────────────┘ \\
// ###数据源实施
//
// -------------------
//这里我们实现了实际的数据源插件。我们传入设置和updateCallback。
(function () {
    //json格式的数据源(原始的)
    var jsonDatasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;

        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }

            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }

        updateRefresh(currentSettings.refresh * 1000);

        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }

            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }

            var body = currentSettings.body;

            // Can the body be converted to JSON?
            // 将请求body转换为json格式
            if (body) {
                try {
                    body = JSON.parse(body);
                }
                catch (e) {
                }
            }

            $.ajax({
                url: requestURL,
                dataType: (errorStage == 1) ? "JSONP" : "JSON",
                type: currentSettings.method || "GET",
                data: body,
                beforeSend: function (xhr) {
                    try {
                        _.each(currentSettings.headers, function (header) {
                            var name = header.name;
                            var value = header.value;

                            if (!_.isUndefined(name) && !_.isUndefined(value)) {
                                xhr.setRequestHeader(name, value);
                            }
                        });
                    }
                    catch (e) {
                    }
                },
                success: function (data) {
                    lockErrorStage = true;

                    updateCallback(data);//回调函数
                },
                error: function (xhr, status, error) {
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "JSON",
        settings: [
            {
                name: "url",
                display_name: "URL",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "Try thingproxy",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: 'A direct JSON connection will be tried first, if that fails, a JSONP connection will be tried. If that fails, you can use thingproxy, which can solve many connection problems to APIs. <a href="https://github.com/Freeboard/thingproxy" target="_blank">More information</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "Refresh Every",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "Method",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "Body",
                type: "text",
                description: "The body of the request. Normally only used if method is POST"
            },
            {
                name: "headers",
                display_name: "Headers",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new jsonDatasource(settings, updateCallback));
        }
    });




    //json格式的数据源 （自定的  用于发送两次ajax请求  请求数据和返回数据都为json格式）
    var json2Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;

        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }

        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;
            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }
            var requestURL2 = currentSettings.url2;
            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL2 = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
                requestURL2 = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url2);
            }
            var body = currentSettings.body;
            // Can the body be converted to JSON?
            // 将请求body转换为json格式
            if (body) {
                try {
                    body = JSON.parse(body);
                }
                catch (e) {
                }
            }
            var resdata;
            $.ajax({
                async: false,
                url: requestURL,
                dataType: (errorStage == 1) ? "JSONP" : "JSON",
                type: currentSettings.method || "GET",
                data: body,
                beforeSend: function (xhr) {
                    try {
                        _.each(currentSettings.headers, function (header) {
                            var name = header.name;
                            var value = header.value;
                            if (!_.isUndefined(name) && !_.isUndefined(value)) {
                                xhr.setRequestHeader(name, value);
                            }
                        });
                    }
                    catch (e) {
                    }
                },
                success: function (data1) {
                    lockErrorStage = true;
                    resdata = data1;
                    //updateCallback(data);
                    req();
                },
                error: function (xhr, status, error) {
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });

            //定义第二次发送的ajax请求
            function req() {
                $.ajax({
                    url: requestURL2,
                    dataType: (errorStage == 1) ? "JSONP" : "JSON",
                    type: currentSettings.method || "GET",
                    data: body,
                    beforeSend: function (xhr) {
                        try {
                            _.each(currentSettings.headers, function (header) {
                                var name = header.name;
                                var value = header.value;

                                if (!_.isUndefined(name) && !_.isUndefined(value)) {
                                    xhr.setRequestHeader(name, value);
                                }
                            });
                        }
                        catch (e) {
                        }
                    },
                    success: function (data2) {
                        lockErrorStage = true;
                        //在此处应该对两次请求返回的数据进行处理 因还不清楚返回的数据都有什么 所以还未做处理
                        //updateCallback(resdata);
                        //resdata=data2;
                        updateCallback(resdata);
                    },
                    error: function (xhr, status, error) {
                        if (!lockErrorStage) {
                            // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                            errorStage++;
                            self.updateNow();
                        }
                    }
                });
            }
        }
        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }
        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "JSON1",
        display_name: "JSON1",
        settings: [
            {
                name: "url",
                display_name: "URL",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                name: "url2",
                display_name: "URL2",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "Try thingproxy",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: 'A direct JSON connection will be tried first, if that fails, a JSONP connection will be tried. If that fails, you can use thingproxy, which can solve many connection problems to APIs. <a href="https://github.com/Freeboard/thingproxy" target="_blank">More information</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "Refresh Every",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "Method",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "Body",
                type: "text",
                description: "The body of the request. Normally only used if method is POST"
            },
            {
                name: "headers",
                display_name: "Headers",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json2Datasource(settings, updateCallback));
        }
    });

    //json格式的数据源 （测试2 第一张图 左下 基于场景三的测试 两次ajax请求）
    var json21Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;
            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }
            var requestURL2 = currentSettings.url2;
            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL2 = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
                requestURL2 = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url2);
            }
            // Can the body be converted to JSON?
            // 将请求body转换为json格式
            $.ajax({
                async: false,
                url: "http://localhost:3100/DataSource2.json",
                //http://121.43.229.26:8082/query/mo/WinDisk?where=uuid='00300024'
                dataType: "JSON",
                type:"GET",
                success: function (data) {
                    lockErrorStage = true;
                    //在此处对第一次请求到的数据做处理 （问题1：指标的参数在哪里接收 在这里是定死的 指标为cpu使用率 问题2：需要指定具体的uuid 在哪里接收 在这里是定死的 uuid为0030008c）
                    var jsonArry=data;
                    var  propertie;
                    var resultOne=[];
                    for(var i=0;i<jsonArry.length;i++){
                        propertie=jsonArry[i].properties;
                        var jsonStr='{';
                        $.each(propertie, function (i, item) {
                            if(item.name=="id"){
                                jsonStr=jsonStr+'\"id\":'+'\"'+item.value.value+'\"';
                            }
                            else if(item.name=="name"){
                                jsonStr=jsonStr+","+'\"name\":'+'\"'+item.value.value+'\"';
                            }
                            else if(item.name=="uuid"){
                                jsonStr=jsonStr+","+'\"uuid\":'+'\"'+item.value.value+'\"';
                            }
                        });
                        jsonStr=jsonStr+"}";
                        jsonStr=JSON.parse(jsonStr);
                        resultOne.push(jsonStr);
                    }
                    //console.log(resultOne);
                    //updateCallback(data);
                    req(resultOne);
                },
                error: function (xhr, status, error) {
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
            //定义第二次发送的ajax请求
            function req(resultOne) {
                var objectType="WinDisk";
                var indexType="UsedPer";
                var body = [];
                var result1=resultOne;
                for(var i=0;i<result1.length;i++){
                    var jsonStr= {
                        "name": "Metrics",
                        "localName": "",
                        "properties": [
                            {
                                "name": "moPath",
                                "localName": "moPath",
                                "originClass": "Metrics",
                                "overridingProperty": null,
                                "key": true,
                                "propagated": true,
                                "type": {
                                    "type": 8,
                                    "refClassName": null
                                },
                                "value": {
                                    "value":"WinDisk.id=\""+result1[i].id+"\",name=\""+result1[i].name+"\",uuid=\""+result1[i].uuid+"\""
                                }
                            },
                            {
                                "name": "name",
                                "localName": "name",
                                "originClass": "Metrics",
                                "overridingProperty": null,
                                "key": true,
                                "propagated": true,
                                "type": {
                                    "type": 8,
                                    "refClassName": null
                                },
                                "value": {
                                    "value":""+indexType+""
                                }
                            },
                            {
                                "name": "definition",
                                "localName": "definition",
                                "originClass": "Metrics",
                                "overridingProperty": null,
                                "key": false,
                                "propagated": true,
                                "type": {
                                    "type": 8,
                                    "refClassName": null
                                },
                                "value": {
                                    "value": "MetricsDefinition.mo=\""+objectType+"\",name=\""+indexType+"\""
                                }
                            }
                        ],
                        "children": [],
                        "className": "Metrics",
                        "alias": "",
                        "cimid": null
                    }

                    body.push(jsonStr);
                }
                // console.log(body);
                $.ajax({
                    url:"http://localhost:3100/DataSource3.json",
                    //http://121.43.229.26:8082/batch/metrics?fresh=1860
                    dataType:  "JSON",
                    type:"get",
                    data: body,
                    success: function (data) {
                        lockErrorStage = true;
                        console.log(data);
                        //此处对第二次请求的结果进行处理

                        //resdata=data2;
                        updateCallback(resdata);
                    },
                    error: function (xhr, status, error) {
                        if (!lockErrorStage) {
                            // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                            errorStage++;
                            self.updateNow();
                        }
                    }
                });
            }
        }
        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }
        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "JSON21",
        display_name: "JSON21",
        settings: [
            {
                name: "url",
                display_name: "URL",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                name: "url2",
                display_name: "URL2",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "Try thingproxy",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: 'A direct JSON connection will be tried first, if that fails, a JSONP connection will be tried. If that fails, you can use thingproxy, which can solve many connection problems to APIs. <a href="https://github.com/Freeboard/thingproxy" target="_blank">More information</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "Refresh Every",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "Method",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "Body",
                type: "text",
                description: "The body of the request. Normally only used if method is POST"
            },
            {
                name: "headers",
                display_name: "Headers",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json21Datasource(settings, updateCallback));
        }
    });


    //json连接自己后台的测试(问题部分)
    var json3Datasource = function (settings, updateCallback) {

        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }
            //获取所有allcookies
            var allcookies = document.cookie;
            var arr=new Array();
            var access_token="";
            arr=allcookies.split(";");
            for(var i=0;i<arr.length;i++){
                //获取access_token 用于发送ajax请求头
                if(arr[i].indexOf("access_token"+"=")!=-1){
                    console.log("access_token的值为："+arr[i].replace("access_token=",""));
                    access_token=arr[i].replace("access_token=","");
                }
            }
            $.ajax({
                async:false,
                url: "http://localhost:8181/camel/rest/bar/singleBar",
                dataType: "text",
                type: "get" ,
                //headers: {'access_token' : access_token },
                beforeSend: function(request) {
                    request.setRequestHeader('access_token', access_token);
                    //request.setRequestHeader("access_token", access_token);
                },
                //xhrFields: {
                //    withCredentials: true
                //},
                //crossDomain: true,
                success: function (data) {
                    console.log("请求成功");
                    var data1 = eval('(' + data + ')');
                    var obj=JSON.parse(data1);
                    console.log(obj);
                    lockErrorStage = true;
                    // data=JSON.stringify(data);
                    //console.log(data);
                    updateCallback(obj);//回调函数
                },
                error: function (xhr, status, error) {
                    console.log("请求失败");
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "JSON3",
        settings: [
            {
                name: "url",
                display_name: "URL",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "Try thingproxy",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: 'A direct JSON connection will be tried first, if that fails, a JSONP connection will be tried. If that fails, you can use thingproxy, which can solve many connection problems to APIs. <a href="https://github.com/Freeboard/thingproxy" target="_blank">More information</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "Refresh Every",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "Method",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "Body",
                type: "text",
                description: "The body of the request. Normally only used if method is POST"
            },
            {
                name: "headers",
                display_name: "Headers",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json3Datasource(settings, updateCallback));
        }
    });







    //json连接实验楼后台的测试
    var json4Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }
            //获取所有allcookies
            var allcookies = document.cookie;
            var arr=new Array();
            var access_token="";
            arr=allcookies.split(";");
            for(var i=0;i<arr.length;i++){
                //获取access_token 用于发送ajax请求头
                if(arr[i].indexOf("access_token"+"=")!=-1){
                    console.log("access_token的值为："+arr[i].replace("access_token=",""));
                    access_token=arr[i].replace("access_token=","");
                }
            }
            $.ajax({
                async:false,
                url: "http://localhost:8181/camel/rest/ksh/summarys",
                dataType: "JSON",
                type: "GET" ,
                //headers: {'access_token' : access_token },
                beforeSend: function(request) {
                    request.setRequestHeader('access_token', access_token);
                    //request.setRequestHeader("access_token", access_token);
                    //console.log(data);
                },

                //xhrFields: {
                //    withCredentials: true
                //},
                //crossDomain: true,
                //console.log();
                success: function (data) {
                    console.log("请求成功");
                    //var data1 = eval('(' + data + ')');
                    //var obj=JSON.parse(data1);
                    lockErrorStage = true;
                    // data=JSON.stringify(data);
                    //console.log(data);

                    updateCallback(data);//回调函数
                },
                error: function (xhr, status, error) {
                    console.log("请求失败");
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "JSON4",
        settings: [
            {
                name: "url",
                display_name: "URL",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "Try thingproxy",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: 'A direct JSON connection will be tried first, if that fails, a JSONP connection will be tried. If that fails, you can use thingproxy, which can solve many connection problems to APIs. <a href="https://github.com/Freeboard/thingproxy" target="_blank">More information</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "Refresh Every",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "Method",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "Body",
                type: "text",
                description: "The body of the request. Normally only used if method is POST"
            },
            {
                name: "headers",
                display_name: "Headers",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json4Datasource(settings, updateCallback));
        }
    });







    //json折线图连接后台的测试
    var json5Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }
            //获取所有allcookies
            var allcookies = document.cookie;
            var arr=new Array();
            var access_token="";
            arr=allcookies.split(";");
            for(var i=0;i<arr.length;i++){
                //获取access_token 用于发送ajax请求头
                if(arr[i].indexOf("access_token"+"=")!=-1){
                    console.log("access_token的值为："+arr[i].replace("access_token=",""));
                    access_token=arr[i].replace("access_token=","");
                }
            }
            var resdata;
            $.ajax({
                async:false,
                url: "http://localhost:8181/camel/rest/ksh/linecharttitle",
                dataType: "JSON",
                type: "GET" ,
                //headers: {'access_token' : access_token },
                beforeSend: function(request) {
                    request.setRequestHeader('access_token', access_token);
                    //request.setRequestHeader("access_token", access_token);
                    //console.log(data);
                },
                //xhrFields: {
                //    withCredentials: true
                //},
                //crossDomain: true,
                //console.log();
                success: function (data) {
                    console.log("第一次请求请求成功");
                    console.log(data);
                    lockErrorStage = true;
                    var  values=[];
                    var title;
                    var axisname;
                    for(var key in data){
                        if(key=="data"){
                            var data1=data[key];
                            var data2=data1[0];
                            for(var value in data2){
                                if(value =="title"){
                                    console.log(data2[value]);
                                    title=data2[value];
                                }else if(value =="axisname"){
                                    console.log(data2[value]);
                                    axisname=data2[value];
                                }
                            }
                        }
                    }
                    values.push(title);
                    values.push(axisname);
                    //updateCallback(data);
                    req(values);
                },
                error: function (xhr, status, error) {
                    console.log("请求失败");
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
            //定义第二次发送的ajax请求
            function req(values) {
                $.ajax({
                    async:false,
                    url: "http://localhost:8181/camel/rest/ksh/columnrecord",
                    dataType: "JSON",
                    type: "GET",
                    // data: body,
                    beforeSend: function(request) {
                        request.setRequestHeader('access_token', access_token);
                        //request.setRequestHeader("access_token", access_token);
                        //console.log(data);
                    },
                    success: function (data2) {
                        console.log("第二次请求成功");
                        console.log(data2);
                        /*
                        var dataList={};
                        for(var key in data2){
                            if(key=="data"){
                                var data1=data[key];
                                for(var i=0;i<data1.length;i++){
                                    var values=data1[i];
                                    for(var key in values){
                                        if(key==value){

                                        }
                                    }
                                    dataList={
                                        "0":[45,39,10,42,39,80,36],
                                        "1":[60,31,84,35,30,66,31],
                                        "2":[50,25,69,28,23,60,26],
                                        "3":[45,21,61,14,57,24,36],
                                        "4":[90,10,70,70,57,24,36]
                                    }
                                }
                            }
                        }
                        */
                        lockErrorStage = true;
                        data2={
                            "pList":["线1","线2","线3","线4","线5"],
                            "dataList":{
                                "0":[45],
                                "1":[45,31],
                                "2":[45,31,69],
                                "3":[45,31,69,14],
                                "4":[45,31,69,14,57]
                            },
                            "dataList2":{
                                "0":[12],
                                "1":[12,12],
                                "2":[12,12,22],
                                "3":[12,12,22,12],
                                "4":[12,12,22,12,12]
                            },
                            "xAxisData": [ "1","2","3","4","5"],
                            "yAxis": {
                                "name": "占用比",
                                "max": 100
                            },
                            "lValue": ["专线1","专线2"],
                            "xAxisName":"线路",
                            "titleData":["线路带宽占用比","线路带宽占用比","线路带宽占用比","线路带宽占用比","线路带宽占用比"]
                        }
                        var titleData=[values[0],values[0],values[0],values[0],values[0]];
                        data2.titleData=titleData;
                        data2.yAxis={"name":values[1]};
                        console.log(data2);
                        //在此处应该对两次请求返回的数据进行处理 因还不清楚返回的数据都有什么 所以还未做处理
                        //updateCallback(resdata);
                        //resdata=data2;

                        updateCallback(data2);
                    },
                    error: function (xhr, status, error) {
                        if (!lockErrorStage) {
                            // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                            errorStage++;
                            self.updateNow();
                        }
                    }
                });
            }
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "JSON5",
        settings: [
            {
                name: "url",
                display_name: "URL",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "Try thingproxy",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: 'A direct JSON connection will be tried first, if that fails, a JSONP connection will be tried. If that fails, you can use thingproxy, which can solve many connection problems to APIs. <a href="https://github.com/Freeboard/thingproxy" target="_blank">More information</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "Refresh Every",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "Method",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "Body",
                type: "text",
                description: "The body of the request. Normally only used if method is POST"
            },
            {
                name: "headers",
                display_name: "Headers",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json5Datasource(settings, updateCallback));
        }
    });








    //json折线图连接对方接口的测试
    var json51Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }
            //获取所有allcookies
            var allcookies = document.cookie;
            var arr=new Array();
            var access_token="";
            arr=allcookies.split(";");
            for(var i=0;i<arr.length;i++){
                //获取access_token 用于发送ajax请求头
                if(arr[i].indexOf("access_token"+"=")!=-1){
                    console.log("access_token的值为："+arr[i].replace("access_token=",""));
                    access_token=arr[i].replace("access_token=","");
                }
            }
            var resdata;
            $.ajax({
                async:false,
                url: "http://localhost:8181/camel/rest/ksh/linecharttitle",
                dataType: "JSON",
                type: "GET" ,
                //headers: {'access_token' : access_token },
                beforeSend: function(request) {
                    request.setRequestHeader('access_token', access_token);
                    //request.setRequestHeader("access_token", access_token);
                    //console.log(data);
                },

                //xhrFields: {
                //    withCredentials: true
                //},
                //crossDomain: true,
                //console.log();
                success: function (data) {
                    console.log("第一次请求请求成功");
                    console.log(data);
                    lockErrorStage = true;
                    var  values=[];
                    var title;
                    var axisname;
                    for(var key in data){
                        if(key=="data"){
                            var data1=data[key];
                            var data2=data1[0];
                            for(var value in data2){
                                if(value =="title"){
                                    console.log(data2[value]);
                                    title=data2[value];
                                }else if(value === "axisname"){
                                    console.log(data2[value]);
                                    axisname=data2[value];
                                }
                            }
                        }
                    }
                    values.push(title);
                    values.push(axisname);
                    //updateCallback(data);
                    req(values);
                },
                error: function (xhr, status, error) {
                    console.log("请求失败");
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
            //定义第二次发送的ajax请求
            function req(values) {
                $.ajax({
                    async:false,
                    url: "http://localhost:8181/camel/rest/ksh/columnrecord",
                    dataType: "JSON",
                    type: "GET",
                    // data: body,
                    beforeSend: function(request) {
                        request.setRequestHeader('access_token', access_token);
                        //request.setRequestHeader("access_token", access_token);
                        //console.log(data);
                    },
                    success: function (data2) {
                        console.log("第二次请求成功");
                        console.log(data2);
                        /*
                        var dataList={};
                        for(var key in data2){
                            if(key=="data"){
                                var data1=data[key];
                                for(var i=0;i<data1.length;i++){
                                    var values=data1[i];
                                    for(var key in values){
                                        if(key==value){

                                        }
                                    }
                                    dataList={
                                        "0":[45,39,10,42,39,80,36],
                                        "1":[60,31,84,35,30,66,31],
                                        "2":[50,25,69,28,23,60,26],
                                        "3":[45,21,61,14,57,24,36],
                                        "4":[90,10,70,70,57,24,36]
                                    }
                                }
                            }
                        }
                        */
                        lockErrorStage = true;
                        data2={
                            "pList":["线1","线2","线3","线4","线5"],
                            "dataList":{
                                "0":[45],
                                "1":[45,31],
                                "2":[45,31,69],
                                "3":[45,31,69,14],
                                "4":[45,31,69,14,57]
                            },
                            "dataList2":{
                                "0":[12],
                                "1":[12,12],
                                "2":[12,12,22],
                                "3":[12,12,22,12],
                                "4":[12,12,22,12,12]
                            },
                            "xAxisData": [ "1","2","3","4","5"],
                            "yAxis": {
                                "name": "占用比",
                                "max": 100
                            },
                            "lValue": ["专线1","专线2"],
                            "xAxisName":"线路",
                            "titleData":["线路带宽占用比","线路带宽占用比","线路带宽占用比","线路带宽占用比","线路带宽占用比"]
                        }
                        var titleData=[values[0],values[0],values[0],values[0],values[0]];
                        data2.titleData=titleData;
                        data2.yAxis={"name":values[1]};
                        console.log(data2);
                        //在此处应该对两次请求返回的数据进行处理 因还不清楚返回的数据都有什么 所以还未做处理
                        //updateCallback(resdata);
                        //resdata=data2;

                        updateCallback(data2);
                    },
                    error: function (xhr, status, error) {
                        if (!lockErrorStage) {
                            // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                            errorStage++;
                            self.updateNow();
                        }
                    }
                });
            }
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "JSON51",
        settings: [
            {
                name: "url",
                display_name: "URL",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "Try thingproxy",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: 'A direct JSON connection will be tried first, if that fails, a JSONP connection will be tried. If that fails, you can use thingproxy, which can solve many connection problems to APIs. <a href="https://github.com/Freeboard/thingproxy" target="_blank">More information</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "Refresh Every",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "Method",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "Body",
                type: "text",
                description: "The body of the request. Normally only used if method is POST"
            },
            {
                name: "headers",
                display_name: "Headers",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json51Datasource(settings, updateCallback));
        }
    });







    //json柱状图连接后台的测试
    var json6Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }
            //获取所有allcookies
            var allcookies = document.cookie;
            var arr=new Array();
            var access_token="";
            arr=allcookies.split(";");
            for(var i=0;i<arr.length;i++){
                //获取access_token 用于发送ajax请求头
                if(arr[i].indexOf("access_token"+"=")!=-1){
                    console.log("access_token的值为："+arr[i].replace("access_token=",""));
                    access_token=arr[i].replace("access_token=","");
                }
            }
            $.ajax({
                async:false,
                url: "http://localhost:8181/camel/rest/ksh/histogramtitle",
                dataType: "JSON",
                type: "GET" ,
                //headers: {'access_token' : access_token },
                beforeSend: function(request) {
                    request.setRequestHeader('access_token', access_token);
                    //request.setRequestHeader("access_token", access_token);
                    //console.log(data);
                },

                //xhrFields: {
                //    withCredentials: true
                //},
                //crossDomain: true,
                //console.log();
                success: function (data) {
                    console.log("第一次请求请求成功");
                    console.log(data);
                    lockErrorStage = true;
                    var  values=[];
                    var title;
                    var axisname;
                    for(var key in data){
                        if(key=="data"){
                            var data1=data[key];
                            var data2=data1[0];
                            for(var value in data2){
                                if(value =="title"){
                                    console.log(data2[value]);
                                    title=data2[value];
                                }else if(value =="axisname"){
                                    console.log(data2[value]);
                                    axisname=data2[value];
                                }
                            }
                        }
                    }
                    values.push(title);
                    values.push(axisname);
                    //updateCallback(data);
                    req(values);
                    //updateCallback(data);//回调函数
                },
                error: function (xhr, status, error) {
                    console.log("第一次请求失败");
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
            //定义第二次发送的ajax请求
            function req(ajax1) {
                $.ajax({
                    async:false,
                    url: "http://localhost:8181/camel/rest/ksh/columnrecord",
                    dataType: "JSON",
                    type: "GET",
                    // data: body,
                    beforeSend: function(request) {
                        request.setRequestHeader('access_token', access_token);
                        //request.setRequestHeader("access_token", access_token);
                        //console.log(data);
                    },
                    success: function (data) {
                        lockErrorStage = true;
                        console.log("第二次请求成功");
                        console.log(data.data);
                        var pList=[];
                        var xAxisData=[];
                        var dataList={
                            "0":[],
                            "1":[],
                            "2":[],
                            "3":[],
                            "4":[]
                        };
                        for(var i=0;i<data.data.length;i++){
                            var values=data.data[i];
                            for(var key in values){
                                if(key=="name"){
                                    pList.push(values[key]);
                                    if(i%2==1){
                                        xAxisData.push(values[key]);
                                    }else{
                                        xAxisData.push("\n"+values[key]);
                                    }
                                }else if(key=="data"){
                                    var value=values[key];
                                    for(var j=0;j<value.length;j++){
                                        dataList[j].push(value[j].value);
                                        //dataList.j.push(value[j].value);
                                        console.log("线路"+i+"的第"+j+"的值为");
                                        console.log(value[j].value);
                                        console.log(value[j].creationDate);
                                    }
                                }
                            }
                        }
                        console.log("datalist的值为");
                        console.log(dataList);

                        var body={
                            "pList":pList,
                            "dataList":dataList,
                            "xAxisData": xAxisData,
                            "xAxisName":"线路",
                        }
                        var titleData=[ajax1[0],ajax1[0],ajax1[0],ajax1[0],ajax1[0]];
                        body.titleData=titleData;
                        body.yAxis={"name":ajax1[1]};
                        console.log(body);
                        //在此处应该对两次请求返回的数据进行处理 因还不清楚返回的数据都有什么 所以还未做处理
                        //updateCallback(resdata);
                        //resdata=data2;

                        updateCallback(body);
                    },
                    error: function (xhr, status, error) {
                        console.log("第二次请求失败");
                        if (!lockErrorStage) {
                            // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                            errorStage++;
                            self.updateNow();
                        }
                    }
                });
            }
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "JSON6",
        settings: [
            {
                name: "url",
                display_name: "URL",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "Try thingproxy",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: 'A direct JSON connection will be tried first, if that fails, a JSONP connection will be tried. If that fails, you can use thingproxy, which can solve many connection problems to APIs. <a href="https://github.com/Freeboard/thingproxy" target="_blank">More information</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "Refresh Every",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "Method",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "Body",
                type: "text",
                description: "The body of the request. Normally only used if method is POST"
            },
            {
                name: "headers",
                display_name: "Headers",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json6Datasource(settings, updateCallback));
        }
    });





    //json柱状图连接对方接口的测试
    var json61Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }
            //获取所有allcookies
            var allcookies = document.cookie;
            var arr=new Array();
            var access_token="";
            arr=allcookies.split(";");
            for(var i=0;i<arr.length;i++){
                //获取access_token 用于发送ajax请求头
                if(arr[i].indexOf("access_token"+"=")!=-1){
                    console.log("access_token的值为："+arr[i].replace("access_token=",""));
                    access_token=arr[i].replace("access_token=","");
                }
            }
            $.ajax({
                async:false,
                url: "http://localhost:8181/camel/rest/ksh/histogramtitle",
                dataType: "JSON",
                type: "GET" ,
                //headers: {'access_token' : access_token },
                beforeSend: function(request) {
                    request.setRequestHeader('access_token', access_token);
                    //request.setRequestHeader("access_token", access_token);
                    //console.log(data);
                },

                //xhrFields: {
                //    withCredentials: true
                //},
                //crossDomain: true,
                //console.log();
                success: function (data) {
                    console.log("第一次请求请求成功");
                    console.log(data);
                    lockErrorStage = true;
                    var  values=[];
                    var title;
                    var axisname;
                    for(var key in data){
                        if(key=="data"){
                            var data1=data[key];
                            var data2=data1[0];
                            for(var value in data2){
                                if(value =="title"){
                                    console.log(data2[value]);
                                    title=data2[value];
                                }else if(value =="axisname"){
                                    console.log(data2[value]);
                                    axisname=data2[value];
                                }
                            }
                        }
                    }
                    values.push(title);
                    values.push(axisname);
                    //updateCallback(data);
                    req(values);
                    //updateCallback(data);//回调函数
                },
                error: function (xhr, status, error) {
                    console.log("第一次请求失败");
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
            //定义第二次发送的ajax请求
            function req(ajax1) {
                $.ajax({
                    async:false,
                    url: "http://localhost:8181/camel/rest/ksh/histogramrequest",
                    dataType: "JSON",
                    type: "GET",
                    // data: body,
                    beforeSend: function(request) {
                        request.setRequestHeader('access_token', access_token);
                    },
                    success: function (data) {
                        lockErrorStage = true;
                        console.log("第二次请求成功");
                        console.log(data);
                        var datas=data.data;
                        for(var i=0;i<datas.length;i++){
                            var uuid= datas[i].uuid;
                            var field=datas[i].field;
                            console.log(uuid);
                            console.log(field);
                            $.ajax({
                                async:false,
                                url:  "http://121.43.229.26:8082/metrics/Metrics.moPath=Line.domain=defaultEngine,uuid="+uuid+",name="+field+"?fresh=1860",
                                dataType: "JSON",
                                type: "GET",
                                // data: body,
                                success: function (data) {
                                    lockErrorStage = true;
                                    console.log("请求接口数据成功");
                                    console.log(data);
                                },
                                error: function (xhr, status, error) {
                                    console.log("请求接口失败");
                                    if (!lockErrorStage) {
                                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                                        errorStage++;
                                        self.updateNow();
                                    }
                                }
                            });

                        }

                        updateCallback();
                    },
                    error: function (xhr, status, error) {
                        console.log("第二次请求失败");
                        if (!lockErrorStage) {
                            // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                            errorStage++;
                            self.updateNow();
                        }
                    }
                });
            }
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "JSON61",
        settings: [
            {
                name: "url",
                display_name: "URL",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "Try thingproxy",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: 'A direct JSON connection will be tried first, if that fails, a JSONP connection will be tried. If that fails, you can use thingproxy, which can solve many connection problems to APIs. <a href="https://github.com/Freeboard/thingproxy" target="_blank">More information</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "Refresh Every",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "Method",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "Body",
                type: "text",
                description: "The body of the request. Normally only used if method is POST"
            },
            {
                name: "headers",
                display_name: "Headers",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json61Datasource(settings, updateCallback));
        }
    });




    //json  pie+bar连接后台的测试 (右上一)
    var json7Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }
            //获取所有allcookies
            var allcookies = document.cookie;
            var arr=new Array();
            var access_token="";
            arr=allcookies.split(";");
            for(var i=0;i<arr.length;i++){
                //获取access_token 用于发送ajax请求头
                if(arr[i].indexOf("access_token"+"=")!=-1){
                    console.log("access_token的值为："+arr[i].replace("access_token=",""));
                    access_token=arr[i].replace("access_token=","");
                }
            }
            $.ajax({
                async:false,
                url: "http://localhost:8181/camel/rest/ksh/warninginfrecord",
                dataType: "JSON",
                type: "GET" ,
                //headers: {'access_token' : access_token },
                beforeSend: function(request) {
                    request.setRequestHeader('access_token', access_token);
                },
                success: function (data) {
                    console.log("请求成功");
                    lockErrorStage = true;
                    //console.log(data);
                    var body= [];
                    var warningnum;
                    var handlenum;
                    var unhandlenum;
                    for(var key in data){

                        if(key=="data"){

                            var values=data[key][0];
                            for(var value in values){
                                if(value=="warningnum") {
                                    warningnum=values[value];
                                }else if(value=="handlenum"){
                                    handlenum=values[value];
                                    unhandlenum=warningnum-handlenum;
                                }
                            }
                        }
                    }

                    var num=((handlenum/warningnum).toPrecision(2))*100;
                    body.push(
                        {
                            "smallCircle": [
                                {
                                    "value": unhandlenum,
                                    "name": "未处理数"
                                },
                                {
                                    "value": handlenum,
                                    "label": {
                                        "normal": {
                                            "show": false
                                        }
                                    },
                                    "labelLine": {
                                        "normal": {
                                            "show": false
                                        }
                                    },
                                    "itemStyle": {
                                        "normal": {
                                            "color": "rgba(0,0,0,0)"
                                        }
                                    }
                                }
                            ]
                        },
                        {
                            "bigCircle": [
                                {
                                    "value": unhandlenum,
                                    "itemStyle": {
                                        "normal": {
                                            "color": "white"
                                        }
                                    },
                                    "label": {
                                        "normal": {
                                            "show": false
                                        }
                                    },
                                    "labelLine": {
                                        "normal": {
                                            "show": false
                                        }
                                    }
                                },
                                {
                                    "value": handlenum,
                                    "name": "已处理数",
                                    "itemStyle": {
                                        "normal": {
                                            "color": "#1b414e"
                                        }
                                    }
                                }
                            ]
                        },
                        {
                            "barName": [
                                "未处理数",
                                "已处理数",
                                "设备警报占比"
                            ]
                        },
                        {
                            "barValue": [
                                unhandlenum,
                                handlenum,
                                num
                            ]
                        },
                        {
                            "title1": "警告信息",
                            "title2": "处理率\n"+num+"%"
                        });
                    console.log(body);
                    updateCallback(body);//回调函数
                },
                error: function (xhr, status, error) {
                    console.log("请求失败");
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "JSON7",
        settings: [
            {
                name: "url",
                display_name: "URL",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "Try thingproxy",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: 'A direct JSON connection will be tried first, if that fails, a JSONP connection will be tried. If that fails, you can use thingproxy, which can solve many connection problems to APIs. <a href="https://github.com/Freeboard/thingproxy" target="_blank">More information</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "Refresh Every",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "Method",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "Body",
                type: "text",
                description: "The body of the request. Normally only used if method is POST"
            },
            {
                name: "headers",
                display_name: "Headers",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json7Datasource(settings, updateCallback));
        }
    });




    //json  pie+bar连接对方接口的测试（右上一）
    var json71Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }
            //获取所有allcookies
            var allcookies = document.cookie;
            var arr=new Array();
            var access_token="";
            arr=allcookies.split(";");
            for(var i=0;i<arr.length;i++){
                //获取access_token 用于发送ajax请求头
                if(arr[i].indexOf("access_token"+"=")!=-1){
                    console.log("access_token的值为："+arr[i].replace("access_token=",""));
                    access_token=arr[i].replace("access_token=","");
                }
            }
            $.ajax({
                async:false,
                url: "http://localhost:8181/camel/rest/ksh/warninginfrecord",
                dataType: "JSON",
                type: "GET" ,
                //headers: {'access_token' : access_token },
                beforeSend: function(request) {
                    request.setRequestHeader('access_token', access_token);
                },
                success: function (data) {
                    console.log("请求成功");
                    lockErrorStage = true;
                    //console.log(data);
                    var body= [];
                    var warningnum;
                    var handlenum;
                    var unhandlenum;
                    for(var key in data){

                        if(key === "data"){

                            var values=data[key][0];
                            for(var value in values){
                                if(value === "warningnum") {
                                    warningnum=values[value];
                                }else if(value === "handlenum"){
                                    handlenum=values[value];
                                    unhandlenum=warningnum-handlenum;
                                }
                            }
                        }
                    }

                    var num=((handlenum/warningnum).toPrecision(2))*100;
                    body.push(
                        {
                            "smallCircle": [
                                {
                                    "value": unhandlenum,
                                    "name": "未处理数"
                                },
                                {
                                    "value": handlenum,
                                    "label": {
                                        "normal": {
                                            "show": false
                                        }
                                    },
                                    "labelLine": {
                                        "normal": {
                                            "show": false
                                        }
                                    },
                                    "itemStyle": {
                                        "normal": {
                                            "color": "rgba(0,0,0,0)"
                                        }
                                    }
                                }
                            ]
                        },
                        {
                            "bigCircle": [
                                {
                                    "value": unhandlenum,
                                    "itemStyle": {
                                        "normal": {
                                            "color": "white"
                                        }
                                    },
                                    "label": {
                                        "normal": {
                                            "show": false
                                        }
                                    },
                                    "labelLine": {
                                        "normal": {
                                            "show": false
                                        }
                                    }
                                },
                                {
                                    "value": handlenum,
                                    "name": "已处理数",
                                    "itemStyle": {
                                        "normal": {
                                            "color": "#1b414e"
                                        }
                                    }
                                }
                            ]
                        },
                        {
                            "barName": [
                                "未处理数",
                                "已处理数",
                                "设备警报占比"
                            ]
                        },
                        {
                            "barValue": [
                                unhandlenum,
                                handlenum,
                                num
                            ]
                        },
                        {
                            "title1": "警告信息",
                            "title2": "处理率\n"+num+"%"
                        });
                    console.log(body);
                    updateCallback(body);//回调函数
                },
                error: function (xhr, status, error) {
                    console.log("请求失败");
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "JSON71",
        settings: [
            {
                name: "url",
                display_name: "URL",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "Try thingproxy",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: 'A direct JSON connection will be tried first, if that fails, a JSONP connection will be tried. If that fails, you can use thingproxy, which can solve many connection problems to APIs. <a href="https://github.com/Freeboard/thingproxy" target="_blank">More information</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "Refresh Every",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "Method",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "Body",
                type: "text",
                description: "The body of the request. Normally only used if method is POST"
            },
            {
                name: "headers",
                display_name: "Headers",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json71Datasource(settings, updateCallback));
        }
    });





    //json 面积图连接后台的测试（测试1 第一张图 右中）
    var json8Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);

        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }

            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }

            var body = currentSettings.body;

            // Can the body be converted to JSON?
            // 将请求body转换为json格式
            if (body) {
                try {
                    body = JSON.parse(body);
                }
                catch (e) {
                }
            }
            //获取所有allcookies
            var allcookies = document.cookie;
            var arr=new Array();
            var access_token="";
            arr=allcookies.split(";");
            for(var i=0;i<arr.length;i++){
                //获取access_token 用于发送ajax请求头
                if(arr[i].indexOf("access_token"+"=")!=-1){
                    console.log("access_token的值为："+arr[i].replace("access_token=",""));
                    access_token=arr[i].replace("access_token=","");
                }
            }
            $.ajax({
                url: "http://localhost:8181/camel/rest/ksh/managementobjectrecord",
                dataType: "JSON",
                type:"GET",
                //data: body,


                beforeSend: function(request) {
                    request.setRequestHeader('access_token', access_token);
                    //request.setRequestHeader("access_token", access_token);
                    //console.log(data);
                },
                success: function (data) {
                    /*                    console.log("0000",data);
                                        lockErrorStage = true;

                                        for(var key in data) {
                                            console.log("0000",data);
                                            if (key == "data") {
                                                console.log("11111111111111111111");
                                                var datas=data[key];
                                                var gCount = datas;
                                                var MOCount = [];
                                                for (var key in gCount[0]) {
                                                    console.log("进入data的对象里了");
                                                    if (key == "host") {
                                                        MOCount.push({
                                                            "name": "主机",
                                                            "value": gCount[0][key],
                                                            "itemStyle": {
                                                                "normal": {
                                                                    "color": "#00fefc"
                                                                }
                                                            }
                                                        })
                                                    } else if (key == "database") {
                                                        MOCount.push({
                                                            "name": "数据库",
                                                            "value": gCount[0][key],
                                                            "itemStyle": {
                                                                "normal": {
                                                                    "color": "#48bec8"
                                                                }
                                                            }
                                                        })
                                                    } else if (key === "network") {
                                                        MOCount.push({
                                                            "name": "网络",
                                                            "value": gCount[0][key],
                                                            "itemStyle": {
                                                                "normal": {
                                                                    "color": "#1b5f71"
                                                                }
                                                            }

                                                        })
                                                    } else if (key === "service") {
                                                        MOCount.push({
                                                            "name": "标准应用",
                                                            "value": gCount[0][key],
                                                            "itemStyle": {
                                                                "normal": {
                                                                    "color": "#ffffff"
                                                                }
                                                            }
                                                        })
                                                    }

                                                }
                                            }
                                        }

                                        updateCallback(MOCount);//回调函数*/
                    var obj = JSON.parse(data);
                    var gCount =obj;
                    var MOCount = [];
                    for ( var key in gCount[0]) {
                        if (key == "host") {

                            MOCount.push({
                                "name" : "主机",
                                "value" : gCount[0][key],
                                "itemStyle": {
                                    "normal": {
                                        "color": "#00fefc"
                                    }
                                }
                            })

                        } else if (key == "database") {
                            MOCount.push({
                                "name" : "数据库",
                                "value" : gCount[0][key],
                                "itemStyle": {
                                    "normal": {
                                        "color": "#48bec8"
                                    }
                                }
                            })
                        } else if (key == "network") {
                            MOCount.push({
                                "name" : "网络",
                                "value" : gCount[0][key],
                                "itemStyle": {
                                    "normal": {
                                        "color": "#1b5f71"
                                    }
                                }

                            })
                        } else if (key == "service") {
                            MOCount.push({
                                "name" : "标准应用",
                                "value" : gCount[0][key],
                                "itemStyle": {
                                    "normal": {
                                        "color": "#ffffff"
                                    }
                                }
                            })
                        }

                    }
                    updateCallback(MOCount);//回调函数
                },
                error: function (xhr, status, error) {
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "JSON8",
        settings: [
            {
                name: "url",
                display_name: "URL",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "Try thingproxy",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: 'A direct JSON connection will be tried first, if that fails, a JSONP connection will be tried. If that fails, you can use thingproxy, which can solve many connection problems to APIs. <a href="https://github.com/Freeboard/thingproxy" target="_blank">More information</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "Refresh Every",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "Method",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "Body",
                type: "text",
                description: "The body of the request. Normally only used if method is POST"
            },
            {
                name: "headers",
                display_name: "Headers",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json8Datasource(settings, updateCallback));
        }
    });






    //json 面积图连接对方接口的测试（测试1 第一张图 右中）
    var json81Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);

        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }

            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }

            var body = currentSettings.body;

            // Can the body be converted to JSON?
            // 将请求body转换为json格式
            if (body) {
                try {
                    body = JSON.parse(body);
                }
                catch (e) {
                }
            }

            $.ajax({
                url: requestURL,
                dataType: (errorStage == 1) ? "JSONP" : "JSON",
                type: currentSettings.method || "GET",
                data: body,
                beforeSend: function (xhr) {
                    try {
                        _.each(currentSettings.headers, function (header) {
                            var name = header.name;
                            var value = header.value;

                            if (!_.isUndefined(name) && !_.isUndefined(value)) {
                                xhr.setRequestHeader(name, value);
                            }
                        });
                    }
                    catch (e) {
                    }
                },
                success: function (data) {
                    lockErrorStage = true;
                    var gCount =data;
                    console.log("11111",data);
                    var MOCount = [];
                    for ( var key in gCount[0]) {
                        console.log("11111",key);
                        if (key == "host") {
                            MOCount.push({
                                "name" : "主机",
                                "value" : gCount[0][key],
                                "itemStyle": {
                                    "normal": {
                                        "color": "#00fefc"
                                    }
                                }
                            })
                        } else if (key == "database") {
                            MOCount.push({
                                "name" : "数据库",
                                "value" : gCount[0][key],
                                "itemStyle": {
                                    "normal": {
                                        "color": "#48bec8"
                                    }
                                }
                            })
                        } else if (key == "network") {
                            MOCount.push({
                                "name" : "网络",
                                "value" : gCount[0][key],
                                "itemStyle": {
                                    "normal": {
                                        "color": "#1b5f71"
                                    }
                                }

                            })
                        } else if (key == "service") {
                            MOCount.push({
                                "name" : "标准应用",
                                "value" : gCount[0][key],
                                "itemStyle": {
                                    "normal": {
                                        "color": "#ffffff"
                                    }
                                }
                            })
                        }

                    }
                    updateCallback(MOCount);//回调函数
                },
                error: function (xhr, status, error) {
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "JSON81",
        settings: [
            {
                name: "url",
                display_name: "URL",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "Try thingproxy",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: 'A direct JSON connection will be tried first, if that fails, a JSONP connection will be tried. If that fails, you can use thingproxy, which can solve many connection problems to APIs. <a href="https://github.com/Freeboard/thingproxy" target="_blank">More information</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "Refresh Every",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "Method",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "Body",
                type: "text",
                description: "The body of the request. Normally only used if method is POST"
            },
            {
                name: "headers",
                display_name: "Headers",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json81Datasource(settings, updateCallback));
        }
    });






    //未完
    var json9Datasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;
        var errorStage = 0; 	// 0 =尝试标准请求
        // 1 =尝试JSONP
        // 2 =尝试thingproxy.freeboard.io
        var lockErrorStage = false;
        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }
            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }
        updateRefresh(currentSettings.refresh * 1000);
        this.updateNow = function () {
            if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
            {
                return; // TODO: Report an error
            }
            var requestURL = currentSettings.url;

            if (errorStage == 2 && currentSettings.use_thingproxy) {
                requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
            }
            //获取所有allcookies
            var allcookies = document.cookie;
            var arr=new Array();
            var access_token="";
            arr=allcookies.split(";");
            for(var i=0;i<arr.length;i++){
                //获取access_token 用于发送ajax请求头
                if(arr[i].indexOf("access_token"+"=")!=-1){
                    console.log("access_token的值为："+arr[i].replace("access_token=",""));
                    access_token=arr[i].replace("access_token=","");
                }
            }
            $.ajax({
                async:false,
                url: "http://localhost:8181/camel/rest/ksh/managementobjectrecord",
                dataType: "JSON",
                type: "GET" ,
                //headers: {'access_token' : access_token },
                beforeSend: function(request) {
                    request.setRequestHeader('access_token', access_token);
                },
                success: function (data) {
                    console.log("请求成功");
                    lockErrorStage = true;
                    //console.log(data);
                    var body= [];
                    var warningnum;
                    var handlenum;
                    var unhandlenum;
                    for(var key in data){
                        if(key=="data"){
                            var values=data[key][0];
                            for(var value in values){
                                if(value=="warningnum") {
                                    warningnum=values[value];
                                }else if(value=="handlenum"){
                                    handlenum=values[value];
                                    unhandlenum=warningnum-handlenum;
                                }
                            }
                        }
                    }

                    var num=((handlenum/warningnum).toPrecision(2))*100;
                    body.push(
                        {
                            "smallCircle": [
                                {
                                    "value": unhandlenum,
                                    "name": "未处理数"
                                },
                                {
                                    "value": handlenum,
                                    "label": {
                                        "normal": {
                                            "show": false
                                        }
                                    },
                                    "labelLine": {
                                        "normal": {
                                            "show": false
                                        }
                                    },
                                    "itemStyle": {
                                        "normal": {
                                            "color": "rgba(0,0,0,0)"
                                        }
                                    }
                                }
                            ]
                        },
                        {
                            "bigCircle": [
                                {
                                    "value": unhandlenum,
                                    "itemStyle": {
                                        "normal": {
                                            "color": "white"
                                        }
                                    },
                                    "label": {
                                        "normal": {
                                            "show": false
                                        }
                                    },
                                    "labelLine": {
                                        "normal": {
                                            "show": false
                                        }
                                    }
                                },
                                {
                                    "value": handlenum,
                                    "name": "已处理数",
                                    "itemStyle": {
                                        "normal": {
                                            "color": "#1b414e"
                                        }
                                    }
                                }
                            ]
                        },
                        {
                            "barName": [
                                "未处理数",
                                "已处理数",
                                "设备警报占比"
                            ]
                        },
                        {
                            "barValue": [
                                unhandlenum,
                                handlenum,
                                num
                            ]
                        },
                        {
                            "title1": "警告信息",
                            "title2": "处理率\n"+num+"%"
                        });
                    console.log(body);
                    updateCallback(body);//回调函数
                },
                error: function (xhr, status, error) {
                    console.log("请求失败");
                    if (!lockErrorStage) {
                        // TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
                        errorStage++;
                        self.updateNow();
                    }
                }
            });
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            lockErrorStage = false;
            errorStage = 0;

            currentSettings = newSettings;
            updateRefresh(currentSettings.refresh * 1000);
            self.updateNow();
        }
    };
    //加载数据源插件
    freeboard.loadDatasourcePlugin({
        // ** type_name **（必填）：此插件的唯一名称。此名称应尽可能唯一，以避免与其他插件发生冲突，并应遵循javascript变量和函数声明的命名约定。
        type_name: "JSON9",
        settings: [
            {
                name: "url",
                display_name: "URL",
                // ** type **（必需）：此设置的预期输入类型。“text”将显示单个文本框输入。本文档中将包含其他类型的示例。
                type: "text"
            },
            {
                // ** name **（必填）：设置的名称。此值将在您的代码中用于检索用户指定的值。这应该遵循javascript变量和函数声明的命名约定。
                name: "use_thingproxy",
                // ** display_name **：调整此设置时将向用户显示的漂亮名称。
                display_name: "Try thingproxy",
                // ** description **：将在设置下方显示的文本，为用户提供任何额外信息。
                description: 'A direct JSON connection will be tried first, if that fails, a JSONP connection will be tried. If that fails, you can use thingproxy, which can solve many connection problems to APIs. <a href="https://github.com/Freeboard/thingproxy" target="_blank">More information</a>.',
                // ** type **（必需）：此设置的预期输入类型
                type: "boolean",
                // ** default_value **：此设置的默认值。
                default_value: true
            },
            {
                name: "refresh",
                display_name: "Refresh Every",
                type: "number",
                // ** suffix **：后缀。
                suffix: "seconds",
                default_value: 5
            },
            {
                name: "method",
                display_name: "Method",
                // ** type **（必需）：option代表这是一个下拉选
                type: "option",
                options: [
                    {
                        name: "GET",
                        value: "GET"
                    },
                    {
                        name: "POST",
                        value: "POST"
                    },
                    {
                        name: "PUT",
                        value: "PUT"
                    },
                    {
                        name: "DELETE",
                        value: "DELETE"
                    }
                ]
            },
            {
                name: "body",
                display_name: "Body",
                type: "text",
                description: "The body of the request. Normally only used if method is POST"
            },
            {
                name: "headers",
                display_name: "Headers",
                // ** type **（必需）：array代表这是一个数组
                type: "array",
                settings: [
                    {
                        name: "name",
                        display_name: "Name",
                        type: "text"
                    },
                    {
                        name: "value",
                        display_name: "Value",
                        type: "text"
                    }
                ]
            }
        ],
        // ** newInstance（settings，newInstanceCallback，updateCallback）**（必需）：在请求此插件的新实例时将调用的函数。
        // * ** settings **：具有用户设置的初始设置的javascript对象。对象中属性的名称将对应于上面定义的设置名称。
        // * ** newInstanceCallback **：当插件的新实例准备就绪时您将调用的回调函数。此函数需要一个参数，它是插件对象的新实例。
        // * ** updateCallback **：一个回调函数，如果您的数据源具有重新计算的干舷更新，您将调用该函数。此函数需要单个参数，该参数是具有新的更新数据的javascript对象。你应该坚持这个参考，并在需要时调用它。
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new json9Datasource(settings, updateCallback));
        }
    });





























    // Open Weather Map Api格式的数据源
    var openWeatherMapDatasource = function (settings, updateCallback) {
        var self = this;
        var updateTimer = null;
        var currentSettings = settings;

        function updateRefresh(refreshTime) {
            if (updateTimer) {
                clearInterval(updateTimer);
            }

            updateTimer = setInterval(function () {
                self.updateNow();
            }, refreshTime);
        }

        function toTitleCase(str) {
            return str.replace(/\w\S*/g, function (txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
        }

        updateRefresh(currentSettings.refresh * 1000);

        this.updateNow = function () {
            $.ajax({
                url: "http://api.openweathermap.org/data/2.5/weather?APPID=" + currentSettings.api_key + "&q=" + encodeURIComponent(currentSettings.location) + "&units=" + currentSettings.units,
                dataType: "JSONP",
                success: function (data) {
                    // Rejigger our data into something easier to understand
                    var newData = {
                        place_name: data.name,
                        sunrise: (new Date(data.sys.sunrise * 1000)).toLocaleTimeString(),
                        sunset: (new Date(data.sys.sunset * 1000)).toLocaleTimeString(),
                        conditions: toTitleCase(data.weather[0].description),
                        current_temp: data.main.temp,
                        high_temp: data.main.temp_max,
                        low_temp: data.main.temp_min,
                        pressure: data.main.pressure,
                        humidity: data.main.humidity,
                        wind_speed: data.wind.speed,
                        wind_direction: data.wind.deg
                    };

                    updateCallback(newData);
                },
                error: function (xhr, status, error) {
                }
            });
        }

        this.onDispose = function () {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            self.updateNow();
            updateRefresh(currentSettings.refresh * 1000);
        }
    };

    //加载数据源（这个加载的是Open Weather Map API）
    freeboard.loadDatasourcePlugin({
        type_name: "openweathermap",
        display_name: "Open Weather Map API",
        settings: [
            {
                name: "api_key",
                display_name: "API Key",
                type: "text",
                description: "Your personal API Key from Open Weather Map"
            },
            {
                name: "location",
                display_name: "Location",
                type: "text",
                description: "Example: London, UK"
            },
            {
                name: "units",
                display_name: "Units",
                type: "option",
                default: "imperial",
                options: [
                    {
                        name: "Imperial",
                        value: "imperial"
                    },
                    {
                        name: "Metric",
                        value: "metric"
                    }
                ]
            },
            {
                name: "refresh",
                display_name: "Refresh Every",
                type: "number",
                suffix: "seconds",
                default_value: 5
            }
        ],
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new openWeatherMapDatasource(settings, updateCallback));
        }
    });

    //dweet.io格式的数据源
    var dweetioDatasource = function (settings, updateCallback) {
        var self = this;
        var currentSettings = settings;

        function onNewDweet(dweet) {
            updateCallback(dweet);
        }

        this.updateNow = function () {
            dweetio.get_latest_dweet_for(currentSettings.thing_id, function (err, dweet) {
                if (err) {
                    //onNewDweet({});
                }
                else {
                    onNewDweet(dweet[0].content);
                }
            });
        }

        this.onDispose = function () {

        }

        this.onSettingsChanged = function (newSettings) {
            dweetio.stop_listening_for(currentSettings.thing_id);

            currentSettings = newSettings;

            dweetio.listen_for(currentSettings.thing_id, function (dweet) {
                onNewDweet(dweet.content);
            });
        }

        self.onSettingsChanged(settings);
    };
    //加载数据源（这加载的是Dweet.io）
    freeboard.loadDatasourcePlugin({
        "type_name": "dweet_io",
        "display_name": "Dweet.io",
        "external_scripts": [
            "http://dweet.io/client/dweet.io.min.js"
        ],
        "settings": [
            {
                name: "thing_id",
                display_name: "Thing Name",
                "description": "Example: salty-dog-1",
                type: "text"
            }
        ],
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new dweetioDatasource(settings, updateCallback));
        }
    });

    //Playback格式的数据源
    var playbackDatasource = function (settings, updateCallback) {
        var self = this;
        var currentSettings = settings;
        var currentDataset = [];
        var currentIndex = 0;
        var currentTimeout;

        function moveNext() {
            if (currentDataset.length > 0) {
                if (currentIndex < currentDataset.length) {
                    updateCallback(currentDataset[currentIndex]);
                    currentIndex++;
                }

                if (currentIndex >= currentDataset.length && currentSettings.loop) {
                    currentIndex = 0;
                }

                if (currentIndex < currentDataset.length) {
                    currentTimeout = setTimeout(moveNext, currentSettings.refresh * 1000);
                }
            }
            else {
                updateCallback({});
            }
        }

        function stopTimeout() {
            currentDataset = [];
            currentIndex = 0;

            if (currentTimeout) {
                clearTimeout(currentTimeout);
                currentTimeout = null;
            }
        }

        this.updateNow = function () {
            stopTimeout();

            $.ajax({
                url: currentSettings.datafile,
                dataType: (currentSettings.is_jsonp) ? "JSONP" : "JSON",
                success: function (data) {
                    if (_.isArray(data)) {
                        currentDataset = data;
                    }
                    else {
                        currentDataset = [];
                    }

                    currentIndex = 0;

                    moveNext();
                },
                error: function (xhr, status, error) {
                }
            });
        }

        this.onDispose = function () {
            stopTimeout();
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            self.updateNow();
        }
    };
    //加载
    freeboard.loadDatasourcePlugin({
        "type_name": "playback",
        "display_name": "Playback",
        "settings": [
            {
                "name": "datafile",
                "display_name": "Data File URL",
                "type": "text",
                "description": "A link to a JSON array of data."
            },
            {
                name: "is_jsonp",
                display_name: "Is JSONP",
                type: "boolean"
            },
            {
                "name": "loop",
                "display_name": "Loop",
                "type": "boolean",
                "description": "Rewind and loop when finished"
            },
            {
                "name": "refresh",
                "display_name": "Refresh Every",
                "type": "number",
                "suffix": "seconds",
                "default_value": 5
            }
        ],
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new playbackDatasource(settings, updateCallback));
        }
    });

    //clock格式的数据源
    var clockDatasource = function (settings, updateCallback) {
        var self = this;
        var currentSettings = settings;
        var timer;

        function stopTimer() {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        }

        function updateTimer() {
            stopTimer();
            timer = setInterval(self.updateNow, currentSettings.refresh * 1000);
        }

        this.updateNow = function () {
            var date = new Date();

            var data = {
                numeric_value: date.getTime(),
                full_string_value: date.toLocaleString(),
                date_string_value: date.toLocaleDateString(),
                time_string_value: date.toLocaleTimeString(),
                date_object: date
            };

            updateCallback(data);
        }

        this.onDispose = function () {
            stopTimer();
        }

        this.onSettingsChanged = function (newSettings) {
            currentSettings = newSettings;
            updateTimer();
        }

        updateTimer();
    };
    //加载
    freeboard.loadDatasourcePlugin({
        "type_name": "clock",
        "display_name": "Clock",
        "settings": [
            {
                "name": "refresh",
                "display_name": "Refresh Every",
                "type": "number",
                "suffix": "seconds",
                "default_value": 1
            }
        ],
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            newInstanceCallback(new clockDatasource(settings, updateCallback));
        }
    });


    //这个是样例没有删应该
    freeboard.loadDatasourcePlugin({
        // **type_name** (required) : A unique name for this plugin. This name should be as unique as possible to avoid collisions with other plugins, and should follow naming conventions for javascript variable and function declarations.
        "type_name": "meshblu",
        // **display_name** : The pretty name that will be used for display purposes for this plugin. If the name is not defined, type_name will be used instead.
        "display_name": "Octoblu",
        // **description** : A description of the plugin. This description will be displayed when the plugin is selected or within search results (in the future). The description may contain HTML if needed.
        "description": "app.octoblu.com",
        // **external_scripts** : Any external scripts that should be loaded before the plugin instance is created.
        "external_scripts": [
            "http://meshblu.octoblu.com/js/meshblu.js"
        ],
        // **settings** : An array of settings that will be displayed for this plugin when the user adds it.
        "settings": [
            {
                // **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
                "name": "uuid",
                // **display_name** : The pretty name that will be shown to the user when they adjust this setting.
                "display_name": "UUID",
                // **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
                "type": "text",
                // **default_value** : A default value for this setting.
                "default_value": "device uuid",
                // **description** : Text that will be displayed below the setting to give the user any extra information.
                "description": "your device UUID",
                // **required** : Set to true if this setting is required for the datasource to be created.
                "required": true
            },
            {
                // **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
                "name": "token",
                // **display_name** : The pretty name that will be shown to the user when they adjust this setting.
                "display_name": "Token",
                // **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
                "type": "text",
                // **default_value** : A default value for this setting.
                "default_value": "device token",
                // **description** : Text that will be displayed below the setting to give the user any extra information.
                "description": "your device TOKEN",
                // **required** : Set to true if this setting is required for the datasource to be created.
                "required": true
            },
            {
                // **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
                "name": "server",
                // **display_name** : The pretty name that will be shown to the user when they adjust this setting.
                "display_name": "Server",
                // **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
                "type": "text",
                // **default_value** : A default value for this setting.
                "default_value": "meshblu.octoblu.com",
                // **description** : Text that will be displayed below the setting to give the user any extra information.
                "description": "your server",
                // **required** : Set to true if this setting is required for the datasource to be created.
                "required": true
            },
            {
                // **name** (required) : The name of the setting. This value will be used in your code to retrieve the value specified by the user. This should follow naming conventions for javascript variable and function declarations.
                "name": "port",
                // **display_name** : The pretty name that will be shown to the user when they adjust this setting.
                "display_name": "Port",
                // **type** (required) : The type of input expected for this setting. "text" will display a single text box input. Examples of other types will follow in this documentation.
                "type": "number",
                // **default_value** : A default value for this setting.
                "default_value": 80,
                // **description** : Text that will be displayed below the setting to give the user any extra information.
                "description": "server port",
                // **required** : Set to true if this setting is required for the datasource to be created.
                "required": true
            }

        ],
        // **newInstance(settings, newInstanceCallback, updateCallback)** (required) : A function that will be called when a new instance of this plugin is requested.
        // * **settings** : A javascript object with the initial settings set by the user. The names of the properties in the object will correspond to the setting names defined above.
        // * **newInstanceCallback** : A callback function that you'll call when the new instance of the plugin is ready. This function expects a single argument, which is the new instance of your plugin object.
        // * **updateCallback** : A callback function that you'll call if and when your datasource has an update for freeboard to recalculate. This function expects a single parameter which is a javascript object with the new, updated data. You should hold on to this reference and call it when needed.
        newInstance: function (settings, newInstanceCallback, updateCallback) {
            // myDatasourcePlugin is defined below.
            newInstanceCallback(new meshbluSource(settings, updateCallback));
        }
    });
    // ### Datasource Implementation
    //
    // -------------------
    // Here we implement the actual datasource plugin. We pass in the settings and updateCallback.
    var meshbluSource = function (settings, updateCallback) {
        // Always a good idea...
        var self = this;
        // Good idea to create a variable to hold on to our settings, because they might change in the future. See below.
        var currentSettings = settings;
        /* This is some function where I'll get my data from somewhere */
        function getData() {
            var conn = skynet.createConnection({
                "uuid": currentSettings.uuid,
                "token": currentSettings.token,
                "server": currentSettings.server,
                "port": currentSettings.port
            });
            conn.on('ready', function (data) {
                conn.on('message', function (message) {
                    var newData = message;
                    updateCallback(newData);
                });
            });
        }
        // **onSettingsChanged(newSettings)** (required) : A public function we must implement that will be called when a user makes a change to the settings.
        self.onSettingsChanged = function (newSettings) {
            // Here we update our current settings with the variable that is passed in.
            currentSettings = newSettings;
        }
        // **updateNow()** (required) : A public function we must implement that will be called when the user wants to manually refresh the datasource
        self.updateNow = function () {
            // Most likely I'll just call getData() here.
            getData();
        }
        // **onDispose()** (required) : A public function we must implement that will be called when this instance of this plugin is no longer needed. Do anything you need to cleanup after yourself here.
        self.onDispose = function () {
            //conn.close();
        }
        // Here we call createRefreshTimer with our current settings, to kick things off, initially. Notice how we make use of one of the user defined settings that we setup earlier.
        //	createRefreshTimer(currentSettings.refresh_time);
    }
}());
